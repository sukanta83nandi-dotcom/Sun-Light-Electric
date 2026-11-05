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
export const CompanyLogo: React.FC<CompanyLogoProps> = React.memo(({
  className = 'h-14 sm:h-16 w-auto',
  iconOnly = false,
  variant = 'full',
  style,
  allowUpload = true,
  showUploadTrigger = true,
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(getCustomLogo());
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Initial fetch
    setLogoUrl(getCustomLogo());

    // Live subscribe to any logo changes across the app
    const unsubscribe = subscribeToLogoChange((newLogo) => {
      setLogoUrl(newLogo);
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
    // Reset file input value
    e.target.value = '';
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove the current logo?')) {
      removeCustomLogo();
    }
  };

  const triggerUpload = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const isWatermark = variant === 'watermark';

  // 1. Watermark Mode
  if (isWatermark) {
    if (!logoUrl) {
      // Clean subtle text watermark when no custom logo is uploaded
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

  // 2. Custom Logo Already Uploaded
  if (logoUrl) {
    return (
      <div 
        className="relative inline-flex items-center group shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={logoUrl}
          alt="Sun Light Electric"
          className={`object-contain rounded-xl ${className}`}
          style={style}
          crossOrigin="anonymous"
        />

        {/* Hidden File Input for re-uploading */}
        {allowUpload && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        )}

        {/* Change / Remove Tooltip Actions (Visible on hover in interactive UI, hidden in print) */}
        {allowUpload && isHovered && (
          <div className="no-print absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-xl backdrop-blur-xs z-30 whitespace-nowrap border border-slate-700">
            <button
              type="button"
              onClick={triggerUpload}
              className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
              title="Upload a different logo"
            >
              <Upload className="w-3 h-3" />
              <span>Change</span>
            </button>
            <span className="text-slate-500">|</span>
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              title="Remove logo"
            >
              <X className="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. Icon Only Mode (when no custom logo uploaded)
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

  // 4. Default Mode when NO logo is uploaded yet:
  // Interactive "+ Add New Logo" upload button or clean brand badge
  return (
    <div className="inline-flex items-center shrink-0">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/svg+xml, image/webp"
        className="hidden"
      />

      {allowUpload && showUploadTrigger ? (
        <button
          type="button"
          onClick={triggerUpload}
          className="no-print flex items-center space-x-2 border-2 border-dashed border-amber-500/60 hover:border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-amber-600 dark:text-amber-400 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer group"
          title="Click to upload your new official Sun Light Electric logo (PNG, JPG, SVG)"
        >
          <div className="p-1 bg-amber-500/20 rounded-lg group-hover:bg-amber-500/30 text-amber-500">
            <Upload className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-left">
            <span className="block leading-tight text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
              + Add New Logo
            </span>
            <span className="block text-[9px] font-normal text-slate-500 dark:text-slate-400">
              Click to select image file
            </span>
          </div>
        </button>
      ) : (
        /* Minimalist fallback for print or non-interactive containers */
        <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-900 text-amber-400 rounded-xl border border-slate-700 font-black text-xs uppercase tracking-wide">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span>Sun Light Electric</span>
        </div>
      )}
    </div>
  );
});

export default CompanyLogo;
