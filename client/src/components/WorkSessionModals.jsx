import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  LogOut, 
  Play, 
  FileText, 
  Calendar, 
  User, 
  Building2,
  ArrowRight
} from 'lucide-react';

/**
 * Modal 1: Confirmation popup asking “Are you ready to start today’s work?”
 * Options: Start Work / Cancel
 */
export function StartWorkConfirmationModal({
  isOpen,
  onClose,
  onConfirmStart,
  loading = false,
  userName = '',
  branchName = ''
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-scaleUp">
        {/* Top Accent Strip */}
        <div className="h-2.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-[#0e6977]" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-700 shadow-xs">
                <Clock className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                  Shift Attendance
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Start Today&apos;s Work
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Confirmation Prompt */}
          <div className="bg-teal-50/70 border border-teal-100/90 rounded-2xl p-4 text-center space-y-1">
            <p className="text-base font-extrabold text-[#073734]">
              &ldquo;Are you ready to start today&apos;s work?&rdquo;
            </p>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed pt-1">
              Clicking <strong>Start Work</strong> will officially record your work login timestamp in the HR attendance system and initiate your daily working hours timer.
            </p>
          </div>

          {/* Time & User Info Card */}
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs">
            <div>
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                Staff Name
              </div>
              <div className="font-extrabold text-slate-800 mt-0.5 truncate">
                {userName || 'HR Staff'}
              </div>
              <div className="text-[10.5px] text-slate-500 truncate mt-0.5">
                {branchName || 'HR Department'}
              </div>
            </div>

            <div className="text-right border-l border-slate-200/70 pl-3">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                Current Time
              </div>
              <div className="font-mono text-sm font-extrabold text-teal-700 mt-0.5">
                {currentTime || '--:--'}
              </div>
              <div className="text-[10px] text-slate-400">
                IST (Official check-in)
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            If you click Cancel, your work login time will not be recorded and your session remains Not Started.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmStart}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#0e6977] hover:bg-[#094c56] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording Start...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                  <span>Start Work</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal 2: Confirmation popup asking “Are you sure you want to close today’s work?”
 * Options: Yes, Close Work / Cancel
 * Includes total working duration calculation, start & end time, and EOD report status/entry.
 */
export function CloseWorkConfirmationModal({
  isOpen,
  onClose,
  onConfirmClose,
  loading = false,
  userName = '',
  workStartTime = null,
  workStartTimeFormatted = '',
  workingDurationText = '',
  closureSubmitted = false,
  closureSubmittedAt = '',
  eodSummary = '',
  onEodSummaryChange = null,
  onOpenEodTab = null
}) {
  const [closeTime, setCloseTime] = useState('');
  const [localSummary, setLocalSummary] = useState(eodSummary || '');
  const [showSummaryField, setShowSummaryField] = useState(!closureSubmitted);

  useEffect(() => {
    setLocalSummary(eodSummary || '');
  }, [eodSummary]);

  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    setCloseTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onEodSummaryChange && localSummary !== eodSummary) {
      onEodSummaryChange(localSummary);
    }
    onConfirmClose(localSummary);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-left animate-scaleUp max-h-[90vh] overflow-y-auto">
        {/* Top Accent Strip */}
        <div className="h-2.5 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600" />

        <div className="p-6 sm:p-7 space-y-5">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-xs">
                <LogOut className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  End Work Session
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  Close Today&apos;s Work
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Confirmation Question */}
          <div className="bg-rose-50/70 border border-rose-100/90 rounded-2xl p-4 text-center space-y-1">
            <p className="text-base font-extrabold text-rose-950">
              &ldquo;Are you sure you want to close today&apos;s work?&rdquo;
            </p>
            <p className="text-xs text-rose-800 max-w-md mx-auto leading-relaxed pt-0.5">
              Confirming will record your official logout time, compute your total working hours, and close today&apos;s shift session.
            </p>
          </div>

          {/* Session Details Calculation Card */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              Shift Summary &amp; Duration Calculation
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Work Start Time</div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1">
                  {workStartTimeFormatted || 'Not Recorded'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 shadow-2xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Work End Time</div>
                <div className="text-xs sm:text-sm font-extrabold text-rose-700 mt-1">
                  {closeTime || 'Now'}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-teal-200 shadow-2xs">
                <div className="text-[10px] font-bold text-teal-700 uppercase">Total Duration</div>
                <div className="text-xs sm:text-sm font-extrabold text-teal-800 mt-1 font-mono">
                  {workingDurationText || 'Calculated on submit'}
                </div>
              </div>
            </div>
          </div>

          {/* EOD Report Status Notice & Optional Summary Field */}
          <div className="space-y-2">
            {closureSubmitted ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  EOD Report already submitted to HR Head {closureSubmittedAt ? `(${closureSubmittedAt})` : ''} ✓
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>EOD Report has not been submitted yet</span>
                  </div>
                  {onOpenEodTab && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEodTab();
                      }}
                      className="text-[11px] font-bold text-[#0e6977] hover:underline"
                    >
                      Open EOD Section →
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Enter EOD Summary before closing (Optional):
                  </label>
                  <textarea
                    value={localSummary}
                    onChange={(e) => setLocalSummary(e.target.value)}
                    placeholder="Briefly summarize your day's work completed to submit to the HR Head upon closing..."
                    rows={3}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-600 focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 italic text-center">
            Clicking Cancel keeps your work session active and does not record the logout time.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel (Keep Working)
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Closing Work...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Yes, Close Work</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
