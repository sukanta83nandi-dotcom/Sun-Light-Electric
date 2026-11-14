import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  DEFAULT_COMPANY_LOGO,
  getCustomLogo,
  setCustomLogo,
  removeCustomLogo,
  subscribeToLogoChange,
  processAndCompressLogo,
} from '../utils/logoStorage';
import { X } from 'lucide-react';

interface CompanyBrandContextValue {
  logoUrl: string;
  isCustomLogo: boolean;
  isUploading: boolean;
  updateLogoFromFile: (file: File) => Promise<void>;
  updateLogoDataUrl: (dataUrl: string) => void;
  resetLogo: () => void;
}

const CompanyBrandContext = createContext<CompanyBrandContextValue | undefined>(undefined);

export const CompanyBrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customLogo, setCustomLogoState] = useState<string | null>(() => getCustomLogo());
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 4500);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToLogoChange((newLogo) => {
      setCustomLogoState(newLogo);
    });
    return () => {
      unsubscribe();
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const updateLogoFromFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const compressedDataUrl = await processAndCompressLogo(file);
        setCustomLogo(compressedDataUrl);
        setCustomLogoState(compressedDataUrl);
        showToast('✅ Company logo updated across all headers, documents, and watermarks.');
      } catch (err: any) {
        console.error('Logo upload failed:', err);
        showToast(err?.message || '⚠️ Failed to process logo image. Please try a PNG, JPG, SVG, or WebP file.');
      } finally {
        setIsUploading(false);
      }
    },
    [showToast]
  );

  const updateLogoDataUrl = useCallback(
    (dataUrl: string) => {
      setCustomLogo(dataUrl);
      setCustomLogoState(dataUrl);
      showToast('✅ Company logo updated across all headers, documents, and watermarks.');
    },
    [showToast]
  );

  const resetLogo = useCallback(() => {
    removeCustomLogo();
    setCustomLogoState(null);
    showToast('✅ Default Sun Light Electric logo restored across all headers and documents.');
  }, [showToast]);

  const logoUrl = customLogo || DEFAULT_COMPANY_LOGO;
  const isCustomLogo = Boolean(customLogo);

  return (
    <CompanyBrandContext.Provider
      value={{
        logoUrl,
        isCustomLogo,
        isUploading,
        updateLogoFromFile,
        updateLogoDataUrl,
        resetLogo,
      }}
    >
      {children}

      {/* Global Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[120] max-w-md bg-slate-900/95 dark:bg-slate-800/95 text-white border border-emerald-500/50 rounded-2xl px-4 py-3 shadow-2xl shadow-slate-950/40 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 no-print"
        >
          <span className="text-xs sm:text-sm font-semibold leading-snug text-emerald-50">
            {toastMessage}
          </span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </CompanyBrandContext.Provider>
  );
};

export function useCompanyLogo(): CompanyBrandContextValue {
  const ctx = useContext(CompanyBrandContext);
  if (!ctx) {
    // Graceful fallback if ever rendered outside Provider
    return {
      logoUrl: getCustomLogo() || DEFAULT_COMPANY_LOGO,
      isCustomLogo: Boolean(getCustomLogo()),
      isUploading: false,
      updateLogoFromFile: async (file: File) => {
        const compressed = await processAndCompressLogo(file);
        setCustomLogo(compressed);
      },
      updateLogoDataUrl: (dataUrl: string) => setCustomLogo(dataUrl),
      resetLogo: () => removeCustomLogo(),
    };
  }
  return ctx;
}
