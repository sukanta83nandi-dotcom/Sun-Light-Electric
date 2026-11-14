import React, { useState, useEffect, useRef } from 'react';
import { getCustomLogo, setCustomLogo, removeCustomLogo, subscribeToLogoChange } from '../utils/logoStorage';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export interface CompanyLogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'full' | 'icon' | 'watermark';
  transparentBg?: boolean;
  style?: React.CSSProperties;
  allowUpload?: boolean;
  showUploadTrigger?: boolean;
}

/**
 * CompanyLogo Component
 * Dynamically displays the user's custom brand logo.
 * If no new logo is uploaded yet:
 * - The obsolete old banner is completely removed.
 * - Displays an interactive "+ Upload New Logo" action or clean minimalist brand badge.
 * - Allows immediate one-click upload of any PNG, SVG, or JPG logo file from the user's computer.
 */
const DEFAULT_LOGO = '/assets/aistudio/logo.png';

export const CompanyLogo: React.FC<CompanyLogoProps> = React.memo(({
  className = 'h-14 sm:h-16 w-auto',
  iconOnly = false,
  variant = 'full',
  style,
  allowUpload = false,
  showUploadTrigger = false,
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(getCustomLogo() || DEFAULT_LOGO);
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Initial fetch
    const stored = getCustomLogo();
    setLogoUrl(stored || DEFAULT_LOGO);

    // Live subscribe to any logo changes across the app
    const unsubscribe = subscribeToLogoChange((newLogo) => {
      setLogoUrl(newLogo || DEFAULT_LOGO);
      setImgError(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomLogo(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Reset to default official company logo?')) {
      removeCustomLogo();
      setLogoUrl(DEFAULT_LOGO);
      setImgError(false);
    }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const isWatermark = variant === 'watermark';

  // 1. Watermark Mode
  if (isWatermark) {
    if (!logoUrl || imgError) {
      return (
        <div 
          className="flex flex-col items-center justify-center select-none pointer-events-none opacity-5 font-black text-slate-900 dark:text-white"
          style={style}
        >
          <span className="text-4xl tracking-widest uppercase">SUN LIGHT</span>
          <span className="text-2xl tracking-widest uppercase">ELECTRIC</span>
        </div>
      );
    }
    return (
      <img
        src={logoUrl}
        alt="Watermark"
        className={className}
        style={{ ...style, opacity: 0.08 }}
        crossOrigin="anonymous"
      />
    );
  }

  // 2. Icon Only Mode
  if (iconOnly || variant === 'icon') {
    return (
      <div 
        className={`flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 ${className}`}
        style={style}
        title="Sun Light Electric"
      >
        <span className="font-black text-sm">⚡</span>
      </div>
    );
  }

  // 3. Official Logo Display (Custom or Default /assets/aistudio/logo.png)
  const activeLogo = logoUrl || DEFAULT_LOGO;

  return (
    <div 
      className="relative inline-flex items-center group shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!imgError ? (
        <img
          src={activeLogo}
          alt="Sun Light Electric"
          className={`object-contain rounded-xl shadow-xs ${className}`}
          style={style}
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Graceful high-fidelity SVG fallback if image cannot be read */
        <div className={`flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black rounded-xl shadow-xs ${className}`}>
          <div className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 flex items-center justify-center text-xs">⚡</div>
          <span className="text-xs tracking-tight font-extrabold uppercase whitespace-nowrap">Sun Light Electric</span>
        </div>
      )}

      {/* Hidden File Input for optional upload */}
      {allowUpload && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      )}

      {/* Change / Remove Tooltip Actions (Visible ONLY when allowUpload=true and hovered) */}
      {allowUpload && showUploadTrigger && isHovered && (
        <div className="no-print absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl backdrop-blur-xs z-30 whitespace-nowrap border border-slate-700">
          <button
            type="button"
            onClick={triggerUpload}
            className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
            title="Upload a different logo"
          >
            <Upload className="w-3 h-3" />
            <span>Change</span>
          </button>
          {logoUrl !== DEFAULT_LOGO && (
            <>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                title="Reset to default logo"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default CompanyLogo;
