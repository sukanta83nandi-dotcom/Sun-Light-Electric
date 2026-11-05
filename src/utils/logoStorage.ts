/**
 * Custom Logo Storage Utility
 * Manages user-uploaded brand logos with localStorage persistence
 * and live cross-component synchronization.
 */

const LOGO_STORAGE_KEY = 'sunlight_custom_brand_logo';
const LOGO_CHANGE_EVENT = 'sunlight_logo_changed';

export const getCustomLogo = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to read custom logo from localStorage', e);
    return null;
  }
};

export const setCustomLogo = (dataUrl: string): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new CustomEvent(LOGO_CHANGE_EVENT, { detail: dataUrl }));
  } catch (e) {
    console.warn('Failed to save custom logo to localStorage', e);
  }
};

export const removeCustomLogo = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
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
    if (e.key === LOGO_STORAGE_KEY) {
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
