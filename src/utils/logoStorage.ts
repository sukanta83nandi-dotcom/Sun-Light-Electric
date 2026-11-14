/**
 * Custom Logo Storage & Client-Side Compression Utility
 * Manages user-uploaded brand logos with localStorage persistence (`sunlight_custom_logo`),
 * HTML5 Canvas resizing/compression (<150KB), and live cross-component synchronization.
 */

export const DEFAULT_COMPANY_LOGO = '/assets/aistudio/logo.png';
export const LOGO_STORAGE_KEY = 'sunlight_custom_logo';
const LEGACY_LOGO_STORAGE_KEY = 'sunlight_custom_brand_logo';
const LOGO_CHANGE_EVENT = 'sunlight_logo_changed';

const MAX_DIMENSION = 400; // Max width or height in px
const MAX_BYTES = 150 * 1024; // 150KB limit for lightweight localStorage persistence

export const getCustomLogo = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const primary = localStorage.getItem(LOGO_STORAGE_KEY);
    if (primary) return primary;

    // Migrate legacy key if present
    const legacy = localStorage.getItem(LEGACY_LOGO_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(LOGO_STORAGE_KEY, legacy);
      localStorage.removeItem(LEGACY_LOGO_STORAGE_KEY);
      return legacy;
    }
    return null;
  } catch (e) {
    console.warn('Failed to read custom logo from localStorage', e);
    return null;
  }
};

export const setCustomLogo = (dataUrl: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    localStorage.removeItem(LEGACY_LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LOGO_CHANGE_EVENT, { detail: dataUrl }));
  } catch (e) {
    console.warn('Failed to save custom logo to localStorage', e);
    throw new Error('Browser storage limit reached while saving logo. Please try a smaller image.');
  }
};

export const removeCustomLogo = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    localStorage.removeItem(LEGACY_LOGO_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(LOGO_CHANGE_EVENT, { detail: null }));
  } catch (e) {
    console.warn('Failed to remove custom logo from localStorage', e);
  }
};

export const subscribeToLogoChange = (callback: (logoUrl: string | null) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<string | null>;
    callback(customEvent.detail ?? null);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LOGO_STORAGE_KEY || e.key === LEGACY_LOGO_STORAGE_KEY) {
      callback(e.newValue);
    }
  };

  window.addEventListener(LOGO_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(LOGO_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const base64Length = dataUrl.length - (commaIdx + 1);
  return Math.ceil(base64Length * 0.75);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading selected file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode selected image file.'));
    img.src = src;
  });
}

function drawResizedToCanvas(
  img: HTMLImageElement,
  maxDim: number
): HTMLCanvasElement {
  const srcWidth = img.naturalWidth || img.width || maxDim;
  const srcHeight = img.naturalHeight || img.height || maxDim;

  const scale = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
  const targetWidth = Math.max(1, Math.round(srcWidth * scale));
  const targetHeight = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Resizes and compresses a user-selected image (PNG, JPEG, SVG, WebP)
 * via HTML5 Canvas to max 400x400px, preserving aspect ratio & transparency,
 * and keeping output lightweight (<150KB) for localStorage & jsPDF compatibility.
 */
export async function processAndCompressLogo(file: File): Promise<string> {
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml',
    'image/webp',
  ];
  const lowerName = file.name.toLowerCase();
  const isAllowedExt = /\.(png|jpe?g|svg|webp)$/i.test(lowerName);

  if (!allowedTypes.includes(file.type) && !isAllowedExt) {
    throw new Error('Please upload a PNG, JPEG, SVG, or WebP logo file.');
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  // 1. Try crisp PNG at max 400px (preserves full alpha transparency + jsPDF PNG support)
  const dimensionSteps = [MAX_DIMENSION, 320, 256, 200];
  for (const dim of dimensionSteps) {
    const canvas = drawResizedToCanvas(img, dim);
    const pngDataUrl = canvas.toDataURL('image/png');
    if (estimateDataUrlBytes(pngDataUrl) <= MAX_BYTES) {
      return pngDataUrl;
    }
  }

  // 2. If still >150KB (e.g. dense photographic raster), use adaptive WebP (keeps alpha) or JPEG
  const fallbackCanvas = drawResizedToCanvas(img, 360);
  for (const quality of [0.85, 0.72, 0.58]) {
    const webpUrl = fallbackCanvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp') && estimateDataUrlBytes(webpUrl) <= MAX_BYTES) {
      return webpUrl;
    }
  }

  // 3. Final compact PNG fallback at 180px
  const compactCanvas = drawResizedToCanvas(img, 180);
  return compactCanvas.toDataURL('image/png');
}
