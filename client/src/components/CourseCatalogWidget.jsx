import React, { useState, useMemo } from 'react';
import { Lightbulb, Search, X, Star, Phone, Briefcase } from 'lucide-react';

// Canonical course codes match GenerateStudentIdModal's COURSE_MAP (AB, AI, AA, C, F)
// so this catalog stays consistent with the rest of the app.
const COURSES = [
  {
    code: 'AB',
    track: 'AMCT TRACK',
    icon: '🌱',
    title: 'AMCT Beginner',
    oldFee: 20000,
    newFee: 19000,
    discount: 1000,
    days: 45,
    eligibility: 'Freshers / non-science (passed 2022+)',
    tag: 'No exam — foundation course',
    examFeeNote: 'No exam — foundation course',
    salaryPotential: '₹15–20k as fresher',
    syllabus: 'Anatomy, Physiology, ICD full, CPT & HCPCS intro',
    starred: false
  },
  {
    code: 'AI',
    track: 'AMCT TRACK',
    icon: '⭐',
    title: 'AMCT Intermediate',
    oldFee: 30000,
    newFee: 28000,
    discount: 2000,
    days: 60,
    eligibility: 'Most preferred course',
    tag: 'Full CPT/ICD/HCPCS + CPC package',
    examFeeNote: 'AAPC CPC exam included in package',
    salaryPotential: '₹20–25k as fresher',
    syllabus: 'Full CPT, ICD-10-CM & HCPCS Level II + CPC certification package',
    starred: false
  },
  {
    code: 'AA',
    track: 'AMCT TRACK',
    icon: '🚀',
    title: 'AMCT Advanced',
    oldFee: 45000,
    newFee: 42000,
    discount: 3000,
    days: 90,
    eligibility: 'Includes 1 specialty + CPC',
    tag: 'CPC + chosen specialty',
    examFeeNote: 'AAPC CPC + specialty certification included',
    salaryPotential: '₹25–32k as fresher',
    syllabus: 'CPC core curriculum + one chosen specialty track (CIC / CRC / CPMA / COC)',
    starred: false
  },
  {
    code: 'C',
    track: 'CORE TRACK',
    icon: '🎯',
    title: 'CPC – Certified Professional Coder',
    oldFee: 25000,
    newFee: 15000,
    discount: 10000,
    days: 45,
    eligibility: 'Needs prior medical/coding knowledge',
    tag: 'AAPC CPC · ₹830 + ₹1,000 (2 attempts)',
    examFeeNote: 'AAPC CPC exam fee ₹830 + ₹1,000 retake allowance (2 attempts)',
    salaryPotential: '₹22–28k with certification',
    syllabus: 'Anatomy, ICD-10-CM, CPT Surgery & Modifiers, HCPCS Level II',
    starred: true
  },
  {
    code: 'F',
    track: 'CORE TRACK',
    icon: '⚡',
    title: 'CPC Crash Course',
    oldFee: 18000,
    newFee: 15000,
    discount: 3000,
    days: 30,
    eligibility: 'Already studied medical coding',
    tag: 'Fast-track AAPC CPC exam prep',
    examFeeNote: 'AAPC CPC exam fee ₹830 (charged separately)',
    salaryPotential: '₹22–28k with certification',
    syllabus: 'Rapid revision of ICD-10-CM, CPT & HCPCS + mock exams',
    starred: false
  }
];

const formatINR = (n) => `₹${n.toLocaleString('en-IN')}`;

export default function CourseCatalogWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedCode, setExpandedCode] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COURSES;
    return COURSES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.eligibility.toLowerCase().includes(q)
    );
  }, [query]);

  const tracks = useMemo(() => {
    const order = [];
    const byTrack = {};
    filtered.forEach((c) => {
      if (!byTrack[c.track]) {
        byTrack[c.track] = [];
        order.push(c.track);
      }
      byTrack[c.track].push(c);
    });
    return order.map((track) => ({ track, courses: byTrack[track] }));
  }, [filtered]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setExpandedCode(null);
  };

  return (
    <>
      {/* Floating "Course Catalog" pill — mounted once at the app root, so it
          follows the person to every dashboard / tab instead of living
          inside one specific screen. */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 z-[70] flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs py-2.5 px-4 rounded-full shadow-lg transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Course Catalog</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="font-extrabold text-slate-900 text-base flex-1">Course Catalog</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-32 sm:w-40 bg-slate-50 border border-slate-200 rounded-full pl-7 pr-2.5 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#0e6977] transition-all"
                />
              </div>
              <button
                onClick={close}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Call-script banner */}
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
              <Phone className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Use this while on calls — fee script order: <strong>Old → New → Discount → Exam fee</strong>
              </span>
            </div>

            {/* Scrollable course list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {tracks.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No course matches "{query}"</div>
              )}

              {tracks.map(({ track, courses }) => (
                <div key={track} className="space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-1">
                    {track}
                  </div>

                  {courses.map((c) => {
                    const isExpanded = expandedCode === c.code;
                    return (
                      <div
                        key={c.code}
                        onClick={() => setExpandedCode(isExpanded ? null : c.code)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isExpanded
                            ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-teal-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.icon}</span>
                            <span className="font-extrabold text-slate-900 text-[13px] truncate">{c.title}</span>
                            {c.starred && <Star className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                            {c.days}d
                          </span>
                        </div>

                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-[11px] text-slate-400 line-through">{formatINR(c.oldFee)}</span>
                          <span className="text-sm font-black text-slate-900">{formatINR(c.newFee)}</span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5">{c.eligibility}</div>

                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-1.5 py-0.5">
                          📄 <span>{c.tag}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-rose-700 uppercase tracking-wide">
                                <Phone className="w-3 h-3" />
                                <span>Fee Script (in this order)</span>
                              </div>
                              <div className="mt-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100 divide-y divide-emerald-100/80 text-[11.5px]">
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">1. Old fee:</span>
                                  <span className="font-bold text-slate-900">{formatINR(c.oldFee)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">2. New fee:</span>
                                  <span className="font-bold text-emerald-700">{formatINR(c.newFee)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">3. Discount:</span>
                                  <span className="font-bold text-amber-700">{formatINR(c.discount)} off</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5 gap-2">
                                  <span className="text-slate-600 shrink-0">4. Exam fee:</span>
                                  <span className="font-bold text-slate-900 text-right">{c.examFeeNote}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-emerald-700 uppercase tracking-wide">
                                <Briefcase className="w-3 h-3" />
                                <span>Salary Potential</span>
                              </div>
                              <div className="mt-1 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[12px] font-bold text-slate-800">
                                {c.salaryPotential}
                              </div>
                            </div>

                            <div className="text-[10.5px] text-slate-500 italic leading-snug">
                              💡 {c.syllabus}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
