import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { setTrainerRecommendation } from '../services/api';

// Placement readiness for the trainer's own students. Scores come from the
// student record (assessment average is computed from published test scores;
// mock & technical are entered here). A recommendation is saved on the student
// and notifies their HR; "Ready" refers the student to CCCP.
export default function TrainingPlacementPrep({ currentUser = {}, students = [], onStudentUpdated }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const flash = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3500); };
  const num = (v) => (typeof v === 'number' ? v : null);

  const handleSetRecommendation = async (student, status) => {
    const id = student._id || student.studentId;
    const d = drafts[id] || {};
    setSavingId(id);
    try {
      const updated = await setTrainerRecommendation(id, {
        status,
        trainerName: currentUser?.name || '',
        mockScore: d.mockScore,
        technicalScore: d.technicalScore
      });
      onStudentUpdated?.(updated);
      setDrafts(prev => ({ ...prev, [id]: {} }));
      flash(`${student.name}: "${status}" saved${status === 'Ready' ? ' · referred to CCCP' : ''} · ${student.hrName || 'HR'} notified`);
    } catch (e) {
      flash(`Could not save: ${e?.response?.data?.error || e.message}`);
    }
    setSavingId(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f242d] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/30 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🧭</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Placement & Certification Recommendation</h1>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Mark each student's readiness. CCCP and the student's HR read this directly from the student record.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] leading-relaxed">
        Readiness % = average of the Mock, Technical and Assessment scores that exist. Assessment comes from your published test scores; enter Mock and Technical below before setting a recommendation.
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-xs text-slate-500">No students allocated to you yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {students.map(student => {
            const id = student._id || student.studentId;
            const readiness = num(student.readinessScore);
            const ringColor = readiness === null ? '#cbd5e1' : readiness < 65 ? '#ef4444' : readiness < 80 ? '#f59e0b' : '#10b981';
            const radius = 38;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - ((readiness || 0) / 100) * circumference;
            const d = drafts[id] || {};
            const isWeak = (num(student.attendancePct) !== null && student.attendancePct < 80) || (num(student.assessmentScore) !== null && student.assessmentScore < 60);
            const scoreInput = (key, label) => (
              <div className="bg-[#f8fafc] rounded-xl p-2 text-center border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">{label}</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={d[key] ?? (num(student[key]) ?? '')}
                  placeholder="—"
                  onChange={(e) => setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [key]: e.target.value } }))}
                  className="w-full mt-0.5 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none"
                />
              </div>
            );
            return (
              <div key={id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{student.name}</span>
                      {isWeak && <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold">weak</span>}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{student.studentId}</span>
                  </div>

                  <div className="py-6 flex flex-col items-center justify-center">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r={radius} stroke="#f1f5f9" strokeWidth="7" fill="transparent" />
                        <circle cx="50" cy="50" r={radius} stroke={ringColor} strokeWidth="7" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" fill="transparent" className="transition-all duration-700 ease-out" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">{readiness === null ? '—' : `${readiness}%`}</span>
                        <span className="text-[10px] text-slate-500 font-medium mt-1">readiness</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {scoreInput('mockScore', 'Mock')}
                    {scoreInput('technicalScore', 'Technical')}
                    <div className="bg-[#f8fafc] rounded-xl p-2 text-center border border-slate-100">
                      <div className="text-[10px] text-slate-400 font-medium">Assessment</div>
                      <div className="text-xs font-black text-slate-900 mt-1">{num(student.assessmentScore) === null ? '—' : `${student.assessmentScore}%`}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="text-center text-xs">
                    <span className="text-slate-500 font-medium">Current: </span>
                    {student.trainerRecommendation === 'Ready' && <span className="font-bold text-[#059669]">Ready</span>}
                    {student.trainerRecommendation === 'Needs Revision' && <span className="font-bold text-[#f59e0b]">Needs Revision</span>}
                    {student.trainerRecommendation === 'Not Ready' && <span className="font-bold text-[#ef4444]">Not Ready</span>}
                    {!student.trainerRecommendation && <span className="font-medium text-slate-400">— not set —</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[['Ready', 'bg-[#00897b]'], ['Needs Revision', 'bg-[#f59e0b]'], ['Not Ready', 'bg-[#ef4444]']].map(([status, bg]) => (
                      <button
                        key={status}
                        disabled={savingId === id}
                        onClick={() => handleSetRecommendation(student, status)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center disabled:opacity-50 ${
                          student.trainerRecommendation === status ? `${bg} text-white shadow-xs font-bold` : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
