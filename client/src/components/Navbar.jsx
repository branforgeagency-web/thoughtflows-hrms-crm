import React from 'react';
import { ArrowRight } from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';

export default function Navbar({ 
  onSignInClick, 
  onHomeClick, 
  currentUser, 
  onSignOut, 
  onSwitchDepartment,
  theme = 'clay',
  onToggleTheme 
}) {
  const isClay = theme === 'clay';

  return (
    <header className="relative z-30 w-full px-6 sm:px-10 md:px-14 lg:px-16 pt-7 pb-4 flex items-center justify-between">
      {/* Brand Logo */}
      <button 
        onClick={onHomeClick}
        className={`flex items-center group text-left focus:outline-none transition-all duration-200 ${
          isClay 
            ? 'p-2 rounded-2xl hover:clay-pill' 
            : 'hover:opacity-95'
        }`}
      >
        <img
          src={logoImg}
          alt="Thoughtflows - No. 1 Medical Coding Academy"
          className="h-10 sm:h-11 md:h-12 w-auto object-contain drop-shadow-sm"
          onError={(e) => {
            e.currentTarget.src = '/thoughtflows-logo.png';
          }}
        />
      </button>

      {/* Action / Auth & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Claymorphism Theme Toggle Pill */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            isClay
              ? 'clay-btn clay-btn-secondary text-[#0b6b66] border-teal-100/70 shadow-clay-pill'
              : 'bg-white/80 hover:bg-white text-teal-800 border border-teal-200 shadow-sm'
          }`}
          title="Toggle Claymorphism Theme"
        >
          <span className="text-sm leading-none">{isClay ? '🏺' : '✨'}</span>
          <span className="hidden sm:inline">{isClay ? 'Clay 3D' : 'Classic'}</span>
        </button>

        {/* Sign In Action Button */}
        <button
          onClick={onSignInClick}
          className={`group flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-[#083e3a] transition-all duration-200 ${
            isClay
              ? 'clay-btn clay-btn-secondary'
              : 'rounded-full bg-white hover:bg-slate-50 border border-teal-100/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.09)] hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 text-[#083e3a] transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </header>
  );
}
