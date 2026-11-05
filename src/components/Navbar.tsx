import React from 'react';
import {
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  KeyRound,
  Contrast,
} from 'lucide-react';
import { Language, AppThemeMode } from '../types';
import { translations } from '../data/translations';
import { CompanyLogo } from './CompanyLogo';

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

  // Navbar Header Styling based on active theme
  const navbarStyles = {
    auto: 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-700/80 shadow-md shadow-amber-950/30 text-amber-100',
    light: 'bg-sky-950 text-white border-b border-sky-800/80 shadow-md shadow-sky-950/30',
    dark: 'bg-[#060a12] text-slate-100 border-b border-slate-800 shadow-md shadow-cyan-950/40',
  };

  const navClass = navbarStyles[currentTheme] || navbarStyles.auto;

  return (
    <header className={`${navClass} sticky top-0 z-50 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          
          {/* Brand & Logo */}
          <div className="flex items-center space-x-3.5 cursor-pointer" onClick={onToggleAuthPortal}>
            <div className="flex items-center justify-center">
              <CompanyLogo className="h-12 sm:h-14 w-auto drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  {t.companyName}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs uppercase">
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

