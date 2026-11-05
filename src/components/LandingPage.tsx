import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  SunMedium, 
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Contrast
} from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { AppThemeMode } from '../types';

interface LandingPageProps {
  onLoginSuccess: (userProfile: { name: string; email: string; role: string }) => void;
  onThemeChange?: (theme: AppThemeMode) => void;
  currentTheme?: AppThemeMode;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginSuccess,
  onThemeChange,
  currentTheme = 'auto',
}) => {
  const [activeTheme, setActiveTheme] = useState<AppThemeMode>(currentTheme);
  const [email, setEmail] = useState('haradhan@sunlightelectric.in');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleInternalThemeChange = (newTheme: AppThemeMode) => {
    setActiveTheme(newTheme);
    if (onThemeChange) {
      onThemeChange(newTheme);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate authentication
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: 'Haradhan Patra',
        email: email || 'sunlightelectric.1984@gmail.com',
        role: 'Founder / Managing Director'
      });
    }, 600);
  };

  const featurePills = [
    'Quotes',
    'Billing',
    'Inventory',
    'Customers',
    'Field Ops',
    'Reports'
  ];

  // Distinct Color Features for Each of the 3 Themes
  const themeConfigs = {
    // 1. AUTO: Solar Daylight Gold & Warm Amber Theme
    auto: {
      canvasBg: 'bg-[#faf6ed]',
      cardBorder: 'border-amber-300/80 shadow-2xl shadow-amber-950/15',
      leftGradient: 'bg-gradient-to-br from-[#78350f] via-[#92400e] to-[#451a03]',
      leftGlow1: 'bg-amber-400/25',
      leftGlow2: 'bg-yellow-500/20',
      logoBoxBg: 'bg-[#451a03] border-amber-400/50',
      logoIconColor: 'text-amber-300',
      badgeBg: 'bg-amber-400 text-amber-950 font-black',
      subTitleColor: 'text-amber-200/90',
      headlineGradient: 'from-amber-100 via-yellow-200 to-amber-300',
      pillBg: 'bg-amber-400 text-amber-950 border-amber-300 shadow-md hover:bg-amber-300 font-bold',
      dotColor: 'bg-amber-950',
      rightCardBg: 'bg-[#fffdf8]',
      rightTitle: 'text-amber-950',
      rightSub: 'text-amber-800/80',
      secureBadge: 'bg-amber-100 border-amber-300 text-amber-900',
      ctaButton: 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 hover:from-amber-500 hover:to-amber-800 text-white font-extrabold shadow-amber-950/20',
      inputBg: 'bg-amber-50/60 border-amber-200 text-amber-950 placeholder-amber-400 focus:ring-amber-500',
      themeBanner: 'bg-amber-500/15 text-amber-900 border-amber-300/80',
      themeLabel: 'Solar Gold Theme Active',
    },
    // 2. LIGHT: Clean Sky Blue & Deep Ocean Teal Theme
    light: {
      canvasBg: 'bg-[#f0f6fc]',
      cardBorder: 'border-slate-200/80 shadow-2xl shadow-sky-950/15',
      leftGradient: 'bg-gradient-to-br from-[#043e4f] via-[#025368] to-[#012f3d]',
      leftGlow1: 'bg-sky-400/15',
      leftGlow2: 'bg-teal-400/15',
      logoBoxBg: 'bg-[#092b35] border-amber-500/30',
      logoIconColor: 'text-amber-400',
      badgeBg: 'bg-amber-400 text-amber-950 font-bold',
      subTitleColor: 'text-sky-200/80',
      headlineGradient: 'from-white via-sky-100 to-amber-200',
      pillBg: 'bg-white/15 text-white border-white/20 hover:bg-white/25 font-bold',
      dotColor: 'bg-amber-400',
      rightCardBg: 'bg-white',
      rightTitle: 'text-slate-900',
      rightSub: 'text-slate-500',
      secureBadge: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      ctaButton: 'bg-gradient-to-r from-[#02495c] to-[#013542] hover:from-[#035b73] hover:to-[#024454] text-white font-bold shadow-sky-950/20',
      inputBg: 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-[#025368]',
      themeBanner: 'bg-sky-50 text-sky-800 border-sky-200',
      themeLabel: 'Sky Blue Light Theme Active',
    },
    // 3. DARK: Midnight Obsidian & Cyber Emerald Theme
    dark: {
      canvasBg: 'bg-[#070a12]',
      cardBorder: 'border-slate-800/90 shadow-2xl shadow-cyan-950/40',
      leftGradient: 'bg-gradient-to-br from-[#021f28] via-[#04323f] to-[#011219]',
      leftGlow1: 'bg-cyan-500/20',
      leftGlow2: 'bg-teal-500/20',
      logoBoxBg: 'bg-[#01171f] border-teal-400/40',
      logoIconColor: 'text-cyan-300',
      badgeBg: 'bg-teal-400 text-slate-950 font-extrabold',
      subTitleColor: 'text-cyan-200/90',
      headlineGradient: 'from-cyan-100 via-teal-100 to-emerald-300',
      pillBg: 'bg-slate-800/90 text-teal-300 border-teal-500/40 hover:bg-slate-800 font-bold shadow-lg shadow-teal-950/50',
      dotColor: 'bg-teal-400',
      rightCardBg: 'bg-slate-900',
      rightTitle: 'text-white',
      rightSub: 'text-slate-400',
      secureBadge: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
      ctaButton: 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] hover:from-[#14b8a6] hover:to-[#115e59] text-white font-bold shadow-teal-950/40',
      inputBg: 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:ring-teal-500',
      themeBanner: 'bg-teal-950/80 text-teal-300 border-teal-800/80',
      themeLabel: 'Midnight Obsidian Theme Active',
    }
  };

  const t = themeConfigs[activeTheme] || themeConfigs.auto;

  return (
    <div className={`w-full transition-colors duration-300 ${t.canvasBg} flex flex-col items-center justify-center p-3 sm:p-5 lg:p-8 font-sans selection:bg-amber-400 selection:text-amber-950`}>
      
      {/* Theme Indicator Banner */}
      <div className="mb-3">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-bold transition-all shadow-xs ${t.themeBanner}`}>
          {activeTheme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-teal-400" />
          ) : activeTheme === 'light' ? (
            <Contrast className="w-3.5 h-3.5 text-sky-600" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          )}
          <span>{t.themeLabel}</span>
        </div>
      </div>

      {/* Outer Dual-Card Canvas - Expanded size */}
      <div className={`w-full max-w-7xl rounded-[32px] ${t.rightCardBg} ${t.cardBorder} border overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[700px] lg:min-h-[740px] transition-colors duration-300`}>
        
        {/* LEFT COLUMN: Distinct Brand Showcase for Active Theme (7 Cols) */}
        <div className={`lg:col-span-7 ${t.leftGradient} p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white transition-colors duration-300`}>
          
          {/* Ambient Radial Glows */}
          <div className={`absolute -right-24 -top-24 w-96 h-96 ${t.leftGlow1} rounded-full blur-3xl pointer-events-none`} />
          <div className={`absolute -left-20 -bottom-20 w-80 h-80 ${t.leftGlow2} rounded-full blur-3xl pointer-events-none`} />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl ${t.logoBoxBg} p-2 flex items-center justify-center shadow-inner`}>
                <SunMedium className={`w-7 h-7 ${t.logoIconColor} stroke-[2.2]`}/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    Sun Light Electric
                  </h1>
                  <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${t.badgeBg}`}>
                    Solar SaaS
                  </span>
                </div>
                <p className={`text-xs ${t.subTitleColor} font-medium`}>
                  Domestic &amp; Commercial Solar Setup Solutions
                </p>
              </div>
            </div>
          </div>

          {/* Center Value Proposition */}
          <div className="my-10 lg:my-0 relative z-10 max-w-lg">
            <span className={`text-[11px] font-bold tracking-widest uppercase ${t.subTitleColor} block mb-3`}>
              Solar Business Management
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold leading-[1.15] tracking-tight text-white mb-4">
              One platform. <br />
              <span className={`text-transparent bg-clip-text bg-gradient-to-r ${t.headlineGradient}`}>
                Brighter business control.
              </span>
            </h2>
            <p className="text-sm text-sky-100/80 leading-relaxed mb-8 max-w-md">
              Securely manage solar quotes, billing, stock, customers, and field operations through your integrated workspace.
            </p>

            {/* 2x3 Feature Pills Grid */}
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {featurePills.map((pill) => (
                <div
                  key={pill}
                  className={`flex items-center justify-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full border backdrop-blur-md transition-all text-sm sm:text-base ${t.pillBg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${t.dotColor} shrink-0 animate-pulse`} />
                  <span className="tracking-wide">{pill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Footer Tagline */}
          <div className={`relative z-10 flex items-center gap-2 text-xs ${t.subTitleColor} pt-4`}>
            <Sparkles className="w-4 h-4 text-amber-400"/>
            <span>Powering smarter solar operations</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Modern Login Portal Adapting to Active Theme (5 Cols) */}
        <div className={`lg:col-span-5 ${t.rightCardBg} p-8 sm:p-12 flex flex-col justify-center relative transition-colors duration-300`}>
          
          <div className="w-full max-w-sm mx-auto space-y-6">
            
            {/* Top Secure Badge */}
            <div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold ${t.secureBadge}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500"/>
                <span>SECURE ACCESS PORTAL</span>
              </div>

              <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${t.rightTitle} mt-3`}>
                Welcome back
              </h2>
              <p className={`text-xs ${t.rightSub} mt-1`}>
                Sign in to continue to your Sun Light Electric workspace.
              </p>
            </div>

            {/* Google One-Tap SSO Button */}
            <button
              type="button"
              onClick={handleFormSubmit}
              className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border ${t.inputBg} hover:opacity-90 text-xs font-semibold shadow-xs transition-all cursor-pointer`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            {/* Separator */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className={`px-3 text-[10px] uppercase font-medium ${t.rightSub} absolute ${t.rightCardBg}`}>
                or use your existing password
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              
              {/* Email Field */}
              <div>
                <label className={`block text-xs font-semibold ${t.rightTitle} mb-1.5`}>
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@sunlightelectric.in"
                    className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${t.inputBg}`}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className={`block text-xs font-semibold ${t.rightTitle} mb-1.5`}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${t.inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs">
                <label className={`flex items-center gap-2 cursor-pointer ${t.rightSub}`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-[#025368] focus:ring-[#025368]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="font-medium text-[#025368] dark:text-sky-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer ${t.ctaButton}`}
              >
                <span>{isLoading ? 'Authenticating...' : 'Sign in securely'}</span>
                <ArrowRight className="w-4 h-4"/>
              </button>
            </form>

            {/* Bottom Security Note */}
            <div className="pt-2 text-center">
              <p className={`text-[11px] flex items-center justify-center gap-1.5 font-medium ${t.rightSub}`}>
                <span className="text-amber-500">⚡</span>
                <span>Authorized users only • Your session is protected</span>
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Forgot Password Reset Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        defaultEmail={email}
        onPasswordResetSuccess={(updatedPass) => {
          setPassword(updatedPass);
          localStorage.setItem('sle_saved_password', updatedPass);
        }}
      />
    </div>
  );
};
