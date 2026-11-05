import React, { useState, useEffect } from 'react';
import { Language, AppThemeMode } from './types';
import { Navbar } from './components/Navbar';
import { DemoApp } from './components/DemoApp';
import { LandingPage } from './components/LandingPage';
import { Sun, ShieldCheck } from 'lucide-react';
import { CompanyLogo } from './components/CompanyLogo';

export default function App() {
  const [lang] = useState<Language>('en');
  const [appTheme, setAppTheme] = useState<AppThemeMode>('auto');

  // Default to false so Landing Page is always the default initial screen
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sle_authenticated') === 'true';
    }
    return false;
  });

  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    role: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('sle_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore
        }
      }
    }
    return {
      name: 'Haradhan Patra',
      email: 'haradhan@sunlightelectric.in',
      role: 'Founder / Managing Director',
    };
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleThemeChange = (themeMode: AppThemeMode) => {
    setAppTheme(themeMode);
    if (themeMode === 'dark') {
      setIsDarkMode(true);
    } else if (themeMode === 'light') {
      setIsDarkMode(false);
    } else {
      // Auto mode (Solar Gold Theme)
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
    }
  };

  // Handle successful login from Landing Page
  const handleLoginSuccess = (profile: { name: string; email: string; role: string }) => {
    setUserProfile(profile);
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sle_authenticated', 'true');
      localStorage.setItem('sle_user', JSON.stringify(profile));
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sle_authenticated');
      localStorage.removeItem('sle_user');
    }
  };

  // Theme-based canvas background for Post-Login Workspace
  const appBgStyles = {
    auto: 'bg-[#faf6ed] text-amber-950',
    light: 'bg-[#f0f6fc] text-slate-900',
    dark: 'bg-[#070a12] text-slate-100 dark'
  };

  const currentAppBg = appBgStyles[appTheme] || appBgStyles.auto;

  // Screen 1: Default Initial View (Landing Page)
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen font-sans antialiased flex flex-col justify-between transition-colors duration-300 ${currentAppBg}`}>
        <Navbar
          lang={lang}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          currentTheme={appTheme}
          onThemeChange={handleThemeChange}
          userProfile={userProfile}
          onToggleAuthPortal={() => setIsAuthenticated(false)}
          isAuthenticated={false}
        />
        <main className="flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 w-full max-w-7xl mx-auto">
          <LandingPage
            onLoginSuccess={handleLoginSuccess}
            currentTheme={appTheme}
            onThemeChange={handleThemeChange}
          />
        </main>
        <footer className="bg-sky-950 text-sky-200/90 border-t border-sky-800/80 text-xs py-4 text-center">
          <p className="text-sky-300/80 text-xs">
            © {new Date().getFullYear()} Sun Light Electric • Powered by Solar SaaS
          </p>
        </footer>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'inventory' | 'quotations' | 'invoices' | 'customers' | 'suppliers' | 'challans' | 'profit' | 'finance' | 'reports' | 'purchase_orders' | 'create_doc'
  >('dashboard');

  // Screen 2: Post-Login Application Workspace (Dashboard & Operations)
  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 transition-colors duration-300 ${currentAppBg}`}>
      
      {/* Top Fixed Navbar */}
      <Navbar
        lang={lang}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        currentTheme={appTheme}
        onThemeChange={handleThemeChange}
        userProfile={userProfile}
        onLogout={handleLogout}
        isAuthenticated={true}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      {/* Main Operations Command Center Workspace */}
      <main className="flex-1">
        <DemoApp
          lang={lang}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </main>

      {/* Footer */}
      <footer className="bg-sky-950 text-sky-200/90 border-t border-sky-800/80 text-xs py-6 mt-12 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <CompanyLogo className="h-8 w-auto inline-block drop-shadow-sm" />
            <span className="text-sky-300/80 hidden sm:inline">• Domestic &amp; Commercial Solar Panel Solutions</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-sky-200/90">
            <span className="flex items-center gap-1.5 font-medium text-sky-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Designed &amp; Developed by <strong className="animate-rainbow-text font-black tracking-wide text-xs">Sukanta Nandi</strong>
            </span>
            <span className="text-sky-700">|</span>
            <span>Client / Owner: <span className="text-white font-semibold">Haradhan Patra</span></span>
            <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Production Engine Active</span>
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

