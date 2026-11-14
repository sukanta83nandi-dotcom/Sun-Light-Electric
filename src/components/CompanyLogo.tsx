import React, { useState, useEffect, useRef } from 'react';
import { useCompanyLogo } from '../context/CompanyBrandContext';
import { Upload, X } from 'lucide-react';

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
 * Dynamically reads `logoUrl` from global `CompanyBrandContext` so every
 * header, card, login screen, printable slip, and watermark syncs immediately.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = React.memo(({
  className = 'h-14 sm:h-16 w-auto',
  iconOnly = false,
  variant = 'full',
  style,
  allowUpload = false,
  showUploadTrigger = false,
}) => {
  const { logoUrl, isCustomLogo, updateLogoFromFile, resetLogo } = useCompanyLogo();
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await updateLogoFromFile(file);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetLogo();
    setImgError(false);
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const isWatermark = variant === 'watermark';

  // 1. Watermark Mode (Always renders the active company logo unless image fails)
  if (isWatermark) {
    if (!logoUrl || imgError) {
      return (
        <div
          className="flex flex-col items-center justify-center select-none pointer-events-none opacity-10 font-black text-slate-900 dark:text-white"
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
        alt="Sun Light Electric Watermark"
        className={`object-contain select-none pointer-events-none ${className}`}
        style={{ opacity: 0.09, ...style }}
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
      />
    );
  }

  // 2. Icon Only Mode (Displays active logo inside square/compact box with object-contain)
  if (iconOnly || variant === 'icon') {
    if (!logoUrl || imgError) {
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
    return (
      <img
        src={logoUrl}
        alt="Sun Light Electric"
        className={`object-contain rounded-xl ${className}`}
        style={style}
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
      />
    );
  }

  // 3. Official Full Logo Display (Custom or Default /assets/aistudio/logo.png)
  return (
    <div
      className="relative inline-flex items-center justify-center group shrink-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!imgError ? (
        <img
          src={logoUrl}
          alt="Sun Light Electric"
          className={`object-contain rounded-xl ${className}`}
          style={style}
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
        />
      ) : (
        /* Graceful fallback if image cannot be read */
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
          accept="image/png, image/jpeg, image/svg+xml, image/webp"
          className="hidden"
        />
      )}

      {/* Change / Reset Tooltip Actions (Visible ONLY when allowUpload=true and hovered) */}
      {allowUpload && showUploadTrigger && isHovered && (
        <div className="no-print absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl backdrop-blur-xs z-30 whitespace-nowrap border border-slate-700">
          <button
            type="button"
            onClick={triggerUpload}
            className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
            title="Click to Change Logo"
          >
            <Upload className="w-3 h-3" />
            <span>Change</span>
          </button>
          {isCustomLogo && (
            <>
              <span className="text-slate-500">|</span>
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                title="Reset to default Sun Light Electric logo"
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
