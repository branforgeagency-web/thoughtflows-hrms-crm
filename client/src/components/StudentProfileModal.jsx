import React, { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function StudentProfileModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  const [activeTab, setActiveTab] = useState('Overview');

  // Format display name
  const rawName = student.name || 'Ajith Kumar A';
  const formattedName = rawName.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const avatarLetter = rawName.charAt(0).toUpperCase() || 'A';
  const studentId = student.id || 'TFHIOY6001';
  const courseName = student.course || 'IPDRG';
  const modeName = student.mode || 'Online';
  const degreeName = student.qualification ? student.qualification.split(' - ')[0] : 'BE Med Elec';

  const TABS = [
    'Overview',
    'Onboarding',
    'Course Progress',
    'Exam & Certification',
    'Placement'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Modal Container */}
      <div className="bg-white rounded-[28px] max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto text-left animate-in zoom-in-95">
        
        {/* TOP HEADER BANNER */}
        <div className="bg-gradient-to-r from-[#00b49f] via-[#00a896] to-[#028090] p-5 sm:p-6 text-white flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Initial Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 text-white font-black text-xl flex items-center justify-center shadow-xs flex-shrink-0">
              {avatarLetter}
            </div>

            {/* Name & Subtitle */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-tight">
                {formattedName}
              </h2>
              <div className="text-xs font-mono font-medium text-teal-100/90 mt-1 flex items-center gap-1.5 flex-wrap">
                <span>{studentId}</span>
                <span>·</span>
                <span>{courseName}</span>
                <span>·</span>
                <span>{modeName}</span>
                <span>·</span>
                <span>{degreeName}</span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ml-2"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HORIZONTAL TABS BAR */}
        <div className="border-b border-slate-200/90 bg-white px-5 sm:px-6 pt-1 flex items-center gap-4 sm:gap-8 overflow-x-auto scrollbar-none flex-shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-xs sm:text-sm whitespace-nowrap transition-all border-b-2 cursor-pointer font-semibold ${
                  isActive
                    ? 'border-[#00897b] text-[#00695c] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* TAB BODY (SCROLLABLE) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card 1: Identification */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🆔</span>
                  <span>Identification</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">STUDENT ID</span>
                    <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                      {studentId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">FULL NAME</span>
                    <span className="font-semibold text-slate-800">{formattedName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">GENDER</span>
                    <span className="text-slate-700">{student.gender || 'Male'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">DOB</span>
                    <span className="text-slate-700">{student.dob || '16-07-1999'} · 25 yrs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">MOBILE</span>
                    <span className="font-mono text-slate-700">{student.phone || '+91 98••• 12340'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">EMAIL</span>
                    <span className="font-mono text-slate-700 truncate max-w-[200px]">{student.email || 'student@thoughtflows.in'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">LOCATION</span>
                    <span className="text-slate-700">{student.location || 'Coimbatore'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Education */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🎓</span>
                  <span>Education</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">QUALIFICATION</span>
                    <span className="font-semibold text-slate-800">{degreeName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">YEAR OF PASSING</span>
                    <span className="text-slate-700">2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">STREAM</span>
                    <span className="text-slate-700">{student.qualTag === 'Life Sci' ? 'Life Science' : 'Engineering'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">COLLEGE</span>
                    <span className="text-slate-700 truncate max-w-[200px]">{student.collegeCompany || 'SRM College / PSG'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">PREVIOUS COMPANY</span>
                    <span className="text-slate-500">— None —</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Course Enrolled */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🗂️</span>
                  <span>Course Enrolled</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">COURSE</span>
                    <span className="font-semibold text-slate-800">{courseName} Intermediate</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">COURSE TYPE</span>
                    <span className="text-slate-700">{modeName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">BRANCH</span>
                    <span className="text-slate-700">Saravanampatti</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">MONTH OF JOINING</span>
                    <span className="text-slate-700">May 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">DATE OF JOINING</span>
                    <span className="text-slate-700">{student.batchDate || '3 May'} 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">BATCH TIMING</span>
                    <span className="text-slate-700">{student.batchTiming || '9 AM - 11 AM'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">BATCH TYPE</span>
                    <span className="text-slate-700">Weekends</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Lead Origin */}
              <div className="border border-slate-200/90 rounded-2xl p-4 sm:p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🎴</span>
                  <span>Lead Origin</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">MODE OF SOURCE</span>
                    <span className="text-slate-700">{student.source || 'Google Calls'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">MONTH OF ENQUIRY</span>
                    <span className="text-slate-700">{student.enqDate || 'April'} 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">HR COUNSELLOR</span>
                    <span className="text-slate-700">{student.hrName || 'Kavitha N.'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">CATEGORY</span>
                    <span className="text-slate-700">Fresh Graduate</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">FEE PAID</span>
                    <span className="font-bold text-[#00897b]">{student.feeAmount || '₹21,000'}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ONBOARDING */}
          {activeTab === 'Onboarding' && (
            <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-3.5 shadow-xs">
              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <span>📬</span>
                <span>Onboarding Checklist · {student.onboardStatus || '5/5 ✓'}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Welcome Mail sent · 3 May 9:30 AM</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Induction completed · 4 May 11 AM</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>FB ID linked · @{rawName.toLowerCase().replace(/\s+/g, '.')}.124</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Instagram linked · @{rawName.toLowerCase().replace(/\s+/g, '')}</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Telegram group joined · TF {courseName} May Batch</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold border-b border-slate-50 pb-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>Free Book given · CPC Code Set Vol 1</span>
                </div>
                <div className="flex items-center gap-2.5 text-emerald-800 font-semibold">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>ID Card issued · 6 May</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COURSE PROGRESS */}
          {activeTab === 'Course Progress' && (
            <div className="space-y-4">
              {/* Syllabus Tracking Card */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-3.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>📖</span>
                  <span>Syllabus Tracking</span>
                </div>

                <div className="space-y-2 text-xs font-semibold">
                  <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-950 px-4 py-2.5 rounded-xl flex items-center justify-between">
                    <span>Module 1 · Anatomy & Physiology</span>
                    <span className="font-mono text-emerald-700">Completed 12 May</span>
                  </div>

                  <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-950 px-4 py-2.5 rounded-xl flex items-center justify-between">
                    <span>Module 2 · Medical Terminology</span>
                    <span className="font-mono text-emerald-700">Completed 18 May</span>
                  </div>

                  <div className="bg-amber-50/80 border border-amber-200 text-amber-950 px-4 py-2.5 rounded-xl flex items-center justify-between">
                    <span>Module 3 · CPT Codes</span>
                    <span className="font-mono text-amber-700">In progress · 60% done</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-xl flex items-center justify-between font-normal">
                    <span>Module 4 · ICD-10 CM</span>
                    <span className="font-mono text-slate-400">Not started</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-xl flex items-center justify-between font-normal">
                    <span>Module 5 · HCPCS & Modifiers</span>
                    <span className="font-mono text-slate-400">Not started</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2.5 rounded-xl flex items-center justify-between font-normal">
                    <span>Module 6 · Mock Practice</span>
                    <span className="font-mono text-slate-400">Not started</span>
                  </div>
                </div>
              </div>

              {/* Mock Interview Card */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>🎤</span>
                  <span>Mock Interview</span>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">STATUS</span>
                    <span className="font-semibold text-slate-800">{student.mockInterview || 'Pending'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">SCHEDULED</span>
                    <span className="text-slate-700">10 June 2026</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXAM & CERTIFICATION */}
          {activeTab === 'Exam & Certification' && (
            <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-3.5 shadow-xs">
              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <span>🎯</span>
                <span>AAPC CPC Exam</span>
              </div>

              <div className="space-y-2.5 text-xs pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">EXAM SLOT PAID</span>
                  <span className="font-semibold text-slate-800">✓ ₹75,000 paid (consolidated AAPC fee)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">SLOT BOOKED</span>
                  <span className="text-slate-700">15 July 2026 · 10 AM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">EXAM COMPLETED</span>
                  <span className="text-slate-500">— Pending —</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">CERTIFICATION STATUS</span>
                  <span className="text-slate-500">— Pending exam —</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-400">EXAM RESULT POST</span>
                  <span className="bg-blue-600 text-white text-[10.5px] font-bold px-2.5 py-0.5 rounded">
                    Not done yet
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PLACEMENT */}
          {activeTab === 'Placement' && (
            <div className="space-y-4">
              {/* Placement Status Card */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>💼</span>
                  <span>Placement Status</span>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">PLACED</span>
                    <span className="font-semibold text-slate-800">{student.placementStatus || 'Not yet · in course'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">ELIGIBILITY</span>
                    <span className="text-slate-700">After certification (Jul 2026)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">REVIEW TAKEN</span>
                    <span className="text-slate-700">Not yet (post-placement)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">REFERRAL CARD ISSUED</span>
                    <span className="text-slate-700">Yes · 6 May</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">REFERENCES BROUGHT</span>
                    <span className="text-slate-700">2 leads</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400">HOLD DATE</span>
                    <span className="text-slate-500">— None —</span>
                  </div>
                </div>
              </div>

              {/* Remarks Card */}
              <div className="border border-slate-200/90 rounded-2xl p-5 bg-white space-y-2.5 shadow-xs">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span>📝</span>
                  <span>Remarks</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Strong fresher · self-motivated · attends every class · likely to clear AAPC in first attempt · ready for Apollo / Cognizant interview after cert.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
