import React, { useState, useMemo } from 'react';
import { Lightbulb, Search, X, Phone, Star } from 'lucide-react';
import { COURSE_CATEGORIES } from '../constants/courses';

// Transform COURSE_CATEGORIES into a flat catalog list
const COURSES = COURSE_CATEGORIES.flatMap((cat) =>
  cat.courses.map((c) => ({
    code: c.code,
    track: cat.category,
    icon: cat.icon || '📚',
    title: c.name,
    oldFee: c.oldFee,
    newFeeNoDiscount: c.newFeeNoDiscount,
    courseFee: c.courseFee,
    duration: c.duration || '3 Months',
    examFeeText: c.examFeeText || 'NO EXAM',
    desc: c.desc || 'ThoughtFlows Accredited Medical Coding Track',
    starred: ['CPC', 'CIC', 'CCS', 'CPMA', 'COC', 'CRC'].includes(c.code)
  }))
);

const formatINR = (n) => (n ? `₹${Number(n).toLocaleString('en-IN')}` : '—');

export default function CourseCatalogWidget({ hidden = false }) {
  if (hidden) return null;

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
        c.track.toLowerCase().includes(q) ||
        c.examFeeText.toLowerCase().includes(q)
    );
  }, [query]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setExpandedCode(null);
  };

  return (
    <>
      {/* Popover Window floating directly above the bottom-left button */}
      {isOpen && (
        <div className="fixed bottom-[74px] left-5 z-[80] w-[360px] sm:w-[410px] h-[580px] max-h-[78vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 fade-in-95">
          {/* Top Header Bar */}
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base">💡</span>
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Course Catalog</h3>
            </div>

            <div className="relative flex-1 max-w-[170px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-slate-100/90 border border-slate-200/80 rounded-xl px-3 py-1 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-teal-600 transition-all"
              />
            </div>

            <button
              onClick={close}
              className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fee Script Notice Banner */}
          <div className="px-3.5 py-2.5 bg-[#fffbeb] border-b border-[#fef3c7] text-[11px] text-[#92400e] leading-snug flex items-start gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#b45309] shrink-0 mt-0.5" />
            <span>
              Use this while on calls — fee script order: <strong className="text-[#78350f]">Old → New → Discount → Exam fee</strong>
            </span>
          </div>

          {/* Scrollable Course Cards List */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/50">
            {filtered.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-16">No course matching "{query}"</div>
            )}

            {filtered.map((c) => {
              const isExpanded = expandedCode === c.code;
              return (
                <div
                  key={c.code}
                  onClick={() => setExpandedCode(isExpanded ? null : c.code)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all bg-white ${
                    isExpanded
                      ? 'border-teal-500 ring-1 ring-teal-400 shadow-sm'
                      : 'border-slate-200/90 hover:border-teal-300 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{c.icon}</span>
                      <span className="font-extrabold text-slate-900 text-xs sm:text-[13px] truncate">
                        {c.code} – {c.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0 border border-slate-200/70">
                      {c.duration}
                    </span>
                  </div>

                  {/* Fee Line */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xs text-slate-400 line-through font-medium">
                      {formatINR(c.oldFee)}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      {formatINR(c.courseFee)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                      Offer Fee
                    </span>
                  </div>

                  {/* Description / Eligibility */}
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{c.desc}</div>

                  {/* Tag Pill */}
                  <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200/70 rounded-md px-2 py-0.5">
                    📜 {c.track.split(' ')[0]} {c.code}
                  </div>

                  {/* Expanded Call Script Breakdown */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2.5 animate-in fade-in-50">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Old Fee:</span>
                          <span className="line-through text-slate-400">{formatINR(c.oldFee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">New Fee (w/o Disc):</span>
                          <span className="line-through text-rose-500 font-semibold">{formatINR(c.newFeeNoDiscount)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-slate-800">Discounted Course Fee:</span>
                          <span className="text-emerald-700 font-black">{formatINR(c.courseFee)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200/70 text-[10.5px]">
                          <span className="text-slate-500">Exam Fee Details:</span>
                          <span className="font-bold text-slate-900 text-right">{c.examFeeText}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Pill Button at Bottom-Left */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-5 z-[70] flex items-center gap-2 bg-[#d6ba7e] hover:bg-[#c9aa6c] text-[#3d2f16] font-bold text-xs py-2.5 px-4 rounded-2xl shadow-lg border border-[#c2a669] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
      >
        <span className="text-sm">💡</span>
        <span>Course Catalog</span>
      </button>
    </>
  );
}
