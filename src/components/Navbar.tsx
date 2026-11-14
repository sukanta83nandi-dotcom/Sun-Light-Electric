import React, { useRef } from 'react';
import {
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  KeyRound,
  Contrast,
  Camera,
  RotateCcw,
} from 'lucide-react';
import { Language, AppThemeMode } from '../types';
import { translations } from '../data/translations';
import { CompanyLogo } from './CompanyLogo';
import { useCompanyLogo } from '../context/CompanyBrandContext';

interface NavbarProps {
  lang?: Language;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentTheme?: AppThemeMode;
  onThemeChange?: (theme: AppThemeMode) => void;
  userProfile?: { name: string; email: string; role: string } | null;
  onToggleAuthPortal?: () => void;
  onLogout?: () => void;
  isAuthenticated?: boolean;
  activeTab?: string;
  onSelectTab?: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang = 'en',
  isDarkMode,
  toggleDarkMode,
  currentTheme = 'auto',
  onThemeChange,
  userProfile,
  onToggleAuthPortal,
  onLogout,
  isAuthenticated,
}) => {
  const t = translations[lang];
  const { isCustomLogo, isUploading, updateLogoFromFile, resetLogo } = useCompanyLogo();
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await updateLogoFromFile(file);
  };

  // Navbar Header Styling based on active theme
  const navbarStyles = {
    auto: 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-700/80 shadow-md shadow-amber-950/30 text-amber-100',
    light: 'bg-sky-950 text-white border-b border-sky-800/80 shadow-md shadow-sky-950/30',
    dark: 'bg-[#060a12] text-slate-100 border-b border-slate-800 shadow-md shadow-cyan-950/40',
  };

  const navClass = navbarStyles[currentTheme] || navbarStyles.auto;

  return (
    <header className={`${navClass} sticky top-0 z-50 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-3">
          
          {/* Brand & Interactive Logo Uploader */}
          <div className="flex items-center space-x-2 sm:space-x-3.5 shrink-0 min-w-0">
            {/* Interactive Top-Left Logo Box */}
            <div className="relative group/logo shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleLogoFileSelect}
                className="hidden"
                aria-label="Upload company logo"
              />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  logoInputRef.current?.click();
                }}
                title="Click to Change Logo"
                className="relative flex items-center justify-center h-9 sm:h-11 min-w-[44px] max-w-[116px] px-1.5 py-1 rounded-xl bg-black/25 hover:bg-black/40 border border-white/15 hover:border-amber-400/60 transition-all cursor-pointer overflow-hidden shadow-inner"
              >
                <CompanyLogo
                  className="h-7 sm:h-9 w-auto max-w-[104px] object-contain drop-shadow-md"
                  allowUpload={false}
                  showUploadTrigger={false}
                />

                {/* Subtle Hover Overlay with Camera Icon */}
                <span
                  className={`absolute inset-0 bg-slate-950/70 backdrop-blur-[1px] flex flex-col items-center justify-center transition-opacity duration-150 ${
                    isUploading ? 'opacity-100' : 'opacity-0 group-hover/logo:opacity-100'
                  }`}
                >
                  {isUploading ? (
                    <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-[8px] font-bold text-white leading-none mt-0.5 tracking-tight">
                        Change
                      </span>
                    </>
                  )}
                </span>
              </button>

              {/* Tiny Reset Option (visible on hover when a custom logo is active) */}
              {isCustomLogo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetLogo();
                  }}
                  title="Reset to default Sun Light Electric logo"
                  className="opacity-0 group-hover/logo:opacity-100 focus:opacity-100 transition-opacity duration-150 absolute -bottom-2.5 -right-2 bg-slate-900 hover:bg-rose-700 text-white border border-white/25 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 shadow-lg cursor-pointer z-20"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div
              className="min-w-0 cursor-pointer"
              onClick={onToggleAuthPortal}
            >
              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-nowrap">
                <span className="font-bold whitespace-nowrap text-sm sm:text-base md:text-xl tracking-tight text-white">
                  {t.companyName}
                </span>
                <span className="hidden xs:inline-block text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs uppercase whitespace-nowrap shrink-0">
                  Solar SaaS
                </span>
              </div>
            </div>
          </div>

          {/* Right Utilities: Theme Selector Pill, Language Switcher & User Indicator */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            
            {/* 3-Theme Switcher Button Pill */}
            <div className="flex items-center bg-black/30 border border-white/15 p-1 rounded-2xl gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => onThemeChange ? onThemeChange('auto') : toggleDarkMode()}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTheme === 'auto'
                    ? 'bg-amber-400 text-amber-950 shadow-sm'
                    : 'text-amber-200/80 hover:text-white'
                }`}
                title="Solar Gold Theme"
              >
                <Sun className="w-3 h-3" />
                <span className="hidden md:inline">Auto</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange ? onThemeChange('light') : toggleDarkMode()}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTheme === 'light'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-sky-200/80 hover:text-white'
                }`}
                title="Sky Blue Light Theme"
              >
                <Contrast className="w-3 h-3" />
                <span className="hidden md:inline">Light</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange ? onThemeChange('dark') : toggleDarkMode()}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                  currentTheme === 'dark'
                    ? 'bg-teal-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Midnight Obsidian Dark Theme"
              >
                <Moon className="w-3 h-3" />
                <span className="hidden md:inline">Dark</span>
              </button>
            </div>

            {isAuthenticated && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center space-x-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                title="Sign Out to Landing Page"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}

            {!isAuthenticated && onToggleAuthPortal && (
              <button
                type="button"
                onClick={onToggleAuthPortal}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 border border-amber-300 font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow-xs cursor-pointer"
                title="Sign In Portal"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-950" />
                <span>Sign In</span>
              </button>
            )}

            <div className="hidden md:flex items-center space-x-2 text-xs text-sky-200 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>User: <strong className="text-white">{userProfile?.name || 'Haradhan Patra'}</strong></span>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

