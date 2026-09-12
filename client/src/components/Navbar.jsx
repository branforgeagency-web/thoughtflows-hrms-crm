import React from 'react';
import { ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';

export default function Navbar({ onSignInClick, onHomeClick, currentUser, onSignOut, onSwitchDepartment }) {
  return (
    <header className="relative z-30 w-full px-6 sm:px-10 md:px-14 lg:px-16 pt-7 pb-4 flex items-center justify-between">
      {/* Brand Logo - Clean, direct on light background matching the screenshot */}
      <button 
        onClick={onHomeClick}
        className="flex items-center group text-left focus:outline-none transition-transform duration-200 hover:opacity-95"
      >
        <img
          src={logoImg}
          alt="Thoughtflows - No. 1 Medical Coding Academy"
          className="h-10 sm:h-11 md:h-12 w-auto object-contain drop-shadow-sm"
        />
      </button>

      {/* Action / Auth */}
      <div>
        {currentUser ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Department Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-teal-100 shadow-sm text-xs">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: currentUser.color || '#0d9488' }}
              />
              <span className="font-bold text-[#073734]">
                {currentUser.departmentCode || currentUser.department?.toUpperCase()}
              </span>
              <span className="text-[#557b77]">• {currentUser.branch?.split('-')[0] || 'HQ'}</span>
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs text-[#073734] font-bold">{currentUser.name}</div>
              <div className="text-[10px] text-[#0d9488] font-medium truncate max-w-[160px]">{currentUser.role}</div>
            </div>

            {/* Switch Department */}
            <button
              onClick={onSwitchDepartment}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#083e3a] bg-teal-50 hover:bg-teal-100/70 border border-teal-200 shadow-sm transition-all"
              title="Switch Department Login"
            >
              <RefreshCw className="w-3 h-3 text-teal-700" />
              <span className="hidden sm:inline">Switch Dept</span>
            </button>

            {/* Sign Out */}
            <button
              onClick={onSignOut}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-100 shadow-sm transition-all"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={onSignInClick}
            className="group flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-[#083e3a] bg-white hover:bg-slate-50 border border-teal-100/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.09)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 text-[#083e3a] transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
    </header>
  );
}
