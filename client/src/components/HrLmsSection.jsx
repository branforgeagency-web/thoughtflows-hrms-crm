import React, { useState } from 'react';
import {
  Home,
  User,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Briefcase,
  PhoneCall,
  CreditCard,
  Target,
  FileText,
  Monitor,
  Award,
  MessageSquare,
  Users,
  Smartphone,
  ClipboardCheck,
  Headphones,
  BarChart2,
  RotateCcw,
  Medal,
  ChevronRight,
  AlertTriangle,
  Play,
  CheckCircle2,
  Lock,
  X,
  FileCheck,
  Sparkles
} from 'lucide-react';

export default function HrLmsSection({ currentUser }) {
  const [activeNav, setActiveNav] = useState('Home');
  const [activeModuleModal, setActiveModuleModal] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const userName = currentUser?.name || 'Kavitha N.';
  const userFirstName = userName.split(' ')[0] || 'Kavitha';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Modules list
  const [modules, setModules] = useState([
    {
      id: 'm1',
      title: 'Lead Handling SOP',
      desc: '11 videos · 4 PDFs · Test',
      type: 'mandatory',
      progress: 92,
      badge: '92%',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300/60',
      actionText: 'Resume',
      iconColor: 'bg-amber-500',
      isCompleted: false,
      videos: 11,
      pdfs: 4,
      passingScore: '80%'
    },
    {
      id: 'm2',
      title: 'Placement Explanation (strict)',
      desc: 'Outline + Test · 85% to pass',
      type: 'mandatory',
      progress: 0,
      badge: 'NOT STARTED',
      badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
      actionText: 'Start',
      iconColor: 'bg-rose-500',
      isCompleted: false,
      videos: 5,
      pdfs: 2,
      passingScore: '85%'
    },
    {
      id: 'm3',
      title: 'Payment & Admission SOP',
      desc: '6 docs + quiz',
      type: 'mandatory',
      progress: 0,
      badge: 'NOT STARTED',
      badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
      actionText: 'Start',
      iconColor: 'bg-rose-500',
      isCompleted: false,
      videos: 6,
      pdfs: 3,
      passingScore: '80%'
    }
  ]);

  const handleCompleteModule = (modId) => {
    setModules(prev => prev.map(m => {
      if (m.id === modId) {
        return {
          ...m,
          progress: 100,
          badge: 'COMPLETED',
          badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
          actionText: 'Review',
          isCompleted: true
        };
      }
      return m;
    }));
    setActiveModuleModal(null);
    showToast('🎉 Module marked as completed! Course eligibility updated.');
  };

  const SIDEBAR_SECTIONS = [
    {
      title: 'LEARNING SYSTEM',
      items: [
        { name: 'Home', icon: Home },
        { name: 'My HR Profile', icon: User },
        { name: 'Course Eligibility', icon: GraduationCap },
        { name: 'My Learning', icon: BookOpen }
      ]
    },
    {
      title: 'MANDATORY MODULES',
      items: [
        { name: 'Brand Training', icon: ShieldCheck, hasArrow: true },
        { name: 'Courses Review', icon: Briefcase, hasArrow: true },
        { name: 'Lead Handling SOP', icon: PhoneCall, hasArrow: true },
        { name: 'Payment & Admission SOP', icon: CreditCard, hasArrow: true },
        { name: 'Placement Explanation', icon: Target }
      ]
    },
    {
      title: 'DETAILS',
      items: [
        { name: 'Course Recommendation', icon: FileText },
        { name: 'Demo Booking & Handover', icon: Monitor },
        { name: 'Certification Explanation', icon: Award, hasArrow: true }
      ]
    },
    {
      title: 'REFERENCE',
      items: [
        { name: 'Counselling Scripts', icon: MessageSquare },
        { name: 'Objection Handling', icon: Users },
        { name: 'WhatsApp Templates', icon: Smartphone }
      ]
    },
    {
      title: 'MY RECORD',
      items: [
        { name: 'HR Assessments', icon: ClipboardCheck },
        { name: 'Call Audit Feedback', icon: Headphones },
        { name: 'Performance Report', icon: BarChart2 },
        { name: 'Retraining', icon: RotateCcw },
        { name: 'Internal Certification', icon: Medal }
      ]
    }
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row items-start gap-4 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-4">
        {SIDEBAR_SECTIONS.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-0.5">
              {sec.title}
            </h4>
            <div className="space-y-0.5">
              {sec.items.map((item, iIdx) => {
                const isSelected = activeNav === item.name;
                const Icon = item.icon;
                return (
                  <button
                    key={iIdx}
                    onClick={() => {
                      setActiveNav(item.name);
                      if (item.name !== 'Home') {
                        showToast(`Opened: ${item.name}`);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? 'bg-[#b45309] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.hasArrow && (
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* RIGHT MAIN LMS CONTENT */}
      <main className="flex-1 w-full space-y-4 min-w-0">
        {/* Top Greeting Banner */}
        <div className="bg-[#005a54] text-white rounded-2xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Good afternoon, {userFirstName}
            </h1>
            <p className="text-xs sm:text-[13px] text-teal-100/85 mt-1 font-medium">
              CBE - Saravanampatti · Complete your modules to unlock more courses
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <div className="text-3xl sm:text-4xl font-black text-amber-300 leading-none">
              2
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest text-teal-200 mt-0.5">
              DEPT LEVEL
            </div>
          </div>
        </div>

        {/* 4 Metrics in a Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-teal-600 flex flex-col justify-between">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
              LMS COMPLETION
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              68%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              11 of 16 modules
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-amber-500 flex flex-col justify-between">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
              COURSE KNOWLEDGE
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
              82%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              avg test score
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-blue-600 flex flex-col justify-between">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
              CALL AUDIT
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
              91%
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              last review
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-emerald-600 flex flex-col justify-between">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
              CONVERSION
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 flex items-center">
              <span className="inline-block w-6 h-1 bg-emerald-500 rounded-full" />
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">
              this month
            </div>
          </div>
        </div>

        {/* Mandatory Pending Modules Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-black text-sm">⚠️</span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Mandatory Pending Modules
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Complete these — some leads are locked until you do
            </p>
          </div>

          <div className="space-y-3">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-teal-300/80 bg-slate-50/40 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl ${mod.iconColor} text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs`}>
                    {mod.isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : mod.progress > 0 ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {mod.title}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {mod.desc}
                    </div>

                    {/* Progress bar if ongoing */}
                    {mod.progress > 0 && !mod.isCompleted && (
                      <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${mod.badgeClass}`}>
                    {mod.badge}
                  </span>

                  <button
                    onClick={() => setActiveModuleModal(mod)}
                    className="bg-[#005a54] hover:bg-[#004742] text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all active:scale-95 shadow-xs"
                  >
                    {mod.actionText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Course Eligibility Summary Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">📋</span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Course Eligibility Summary
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              What you can counsel right now
            </p>
          </div>

          <div className="flex items-center gap-8 sm:gap-14 pt-1">
            <div>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">
                6
              </div>
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Courses you can counsel</span>
              </div>
            </div>

            <div>
              <div className="text-3xl sm:text-4xl font-black text-rose-600 leading-none">
                14
              </div>
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Locked — finish the modules first</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Interactive Module Player / Learning Modal */}
      {activeModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${activeModuleModal.iconColor} text-white flex items-center justify-center font-bold`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {activeModuleModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Passing score: {activeModuleModal.passingScore}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-xl text-teal-950">
                <div className="font-bold mb-1">Module Overview & Curriculum</div>
                <p className="text-teal-800 leading-relaxed">
                  Learn standard operating procedures for student intake, qualification, objection resolution, and CRM stage progression.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Curriculum Units
                </div>

                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-semibold text-slate-800">1. Student Intake Protocol (Video)</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Watched</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span className="font-semibold text-slate-800">2. Medical Coding Fee Structures & EMIs (PDF)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">Reviewed</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-semibold text-slate-800">3. Verification Assessment & Quiz</span>
                    </div>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">Ready</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModuleModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteModule(activeModuleModal.id)}
                  className="px-5 py-2 bg-[#005a54] hover:bg-[#004742] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                >
                  Mark as Complete ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
