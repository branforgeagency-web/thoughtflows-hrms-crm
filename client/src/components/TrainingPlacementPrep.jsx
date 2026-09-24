import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  UserCheck, 
  TrendingUp, 
  Send, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

import { updateStudent, getStudents } from '../services/api';

export default function TrainingPlacementPrep({
  currentUser = {},
  students: propStudents = null
}) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const initStudents = (rawList) => {
      return rawList.map(s => {
        const isWeak = s.statusGroup === 'on_hold' || (s.attendancePct != null && s.attendancePct < 80);
        const mockScore = typeof s.mockScore === 'number' ? s.mockScore : (typeof s.mockInterviewScore === 'number' ? s.mockInterviewScore : 0);
        const technicalScore = typeof s.technicalScore === 'number' ? s.technicalScore : 0;
        const assessmentScore = typeof s.assessmentScore === 'number' ? s.assessmentScore : (s.avgAssessmentScore || 0);

        const scoredComponents = [mockScore, technicalScore, assessmentScore].filter(v => v > 0);
        const computedReadiness = scoredComponents.length > 0 
          ? Math.round(scoredComponents.reduce((a, b) => a + b, 0) / scoredComponents.length)
          : (typeof s.readinessScore === 'number' ? s.readinessScore : 0);
        const readiness = s.readinessScore ?? computedReadiness;

        const currentStatus = s.placementStatus === 'Referred to CCCP' 
          ? 'Ready' 
          : (s.placementStatus?.includes('Placed') 
              ? 'Ready' 
              : (readiness >= 75 ? 'Ready' : (readiness > 0 || isWeak ? 'Needs Revision' : 'Pending Evaluation')));

        return {
          id: s.studentId || s._id,
          realId: s._id,
          name: s.name,
          isWeak,
          readiness,
          mockScore,
          technicalScore,
          assessmentScore,
          currentStatus,
          color: readiness >= 80 ? '#10b981' : readiness >= 60 ? '#f59e0b' : '#ef4444',
          batch: `${s.course || 'Medical Coding'} (${s.mode || 'Online'})`,
          notes: s.qualification ? `${s.qualification} · ${s.location || 'Coimbatore'}` : 'Under active placement mentorship'
        };
      });
    };

    if (propStudents && propStudents.length > 0) {
      setStudents(initStudents(propStudents));
    } else {
      getStudents().then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setStudents(initStudents(res));
        }
      }).catch(err => console.warn('Placement prep student fetch fallback', err));
    }
  }, [propStudents]);

  const [toastMessage, setToastMessage] = useState(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  // Handle recommendation change
  const handleSetRecommendation = (studentId, status) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return { ...s, currentStatus: status };
      }
      return s;
    }));

    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : 'Student';

    // Sync to backend MongoDB API
    if (student?.realId) {
      updateStudent(student.realId, {
        placementStatus: status === 'Ready' ? 'Referred to CCCP' : status
      }).catch(err => console.warn('updateStudent placement status err', err));
    }

    // Sync to TF_STORE in localStorage for CCCP Cell
    try {
      const existing = JSON.parse(localStorage.getItem('TF_STORE') || '{}');
      if (!existing.cccp_recommendations) existing.cccp_recommendations = {};
      existing.cccp_recommendations[studentId] = {
        studentName,
        status,
        readiness: student?.readiness,
        mockScore: student?.mockScore,
        updatedBy: currentUser?.name || currentUser?.userName || 'Faculty',
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('TF_STORE', JSON.stringify(existing));
    } catch (e) {
      console.warn('Failed to sync recommendation to TF_STORE', e);
    }

    setToastMessage(`Updated ${studentName}'s recommendation to "${status}" — Synced to CCCP Certification Cell!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800">
      
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f242d] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/30 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🧭</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Placement & Certification Recommendation
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Mark each student's readiness. This is what the CCCP Certification Cell pulls — they read it, they don't re-enter it.
        </p>
      </div>

      {/* INFO NOTICE BANNER */}
      <div className="p-4 rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] text-xs text-[#1e40af] flex items-start gap-2.5 shadow-xs leading-relaxed">
        <span className="text-sm shrink-0 mt-0.5">ℹ️</span>
        <div>
          Readiness % = average of Mock, Technical & Assessment scores. Your <span className="font-bold text-[#1e3a8a]">Ready / Needs Revision</span> call drives whether CCCP books their exam voucher.
        </div>
      </div>

      {/* 5 STUDENT RECOMMENDATION CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {students.map(student => {
          // Determine ring stroke color
          let ringColor = '#10b981'; // green
          if (student.readiness < 65) {
            ringColor = '#ef4444'; // red
          } else if (student.readiness < 80) {
            ringColor = '#f59e0b'; // amber
          }

          // SVG circle parameters
          const radius = 38;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (student.readiness / 100) * circumference;

          return (
            <div
              key={student.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Name + Weak badge + Student ID */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{student.name}</span>
                    {student.isWeak && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 text-[10px] font-bold">
                        weak
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {student.id}
                  </span>
                </div>

                {/* Center: Circular Gauge */}
                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      {/* Background circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke="#f1f5f9"
                        strokeWidth="7"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        stroke={ringColor}
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                        {student.readiness}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium mt-1">
                        readiness
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3 Metric Summary Boxes */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#f8fafc] rounded-xl p-2.5 text-center border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">Mock</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{student.mockScore}%</div>
                  </div>
                  <div className="bg-[#f8fafc] rounded-xl p-2.5 text-center border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">Technical</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{student.technicalScore}%</div>
                  </div>
                  <div className="bg-[#f8fafc] rounded-xl p-2.5 text-center border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-medium">Assessment</div>
                    <div className="text-xs font-black text-slate-900 mt-0.5">{student.assessmentScore}%</div>
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Status */}
              <div className="mt-5 space-y-3">
                {/* Current Status */}
                <div className="text-center text-xs">
                  <span className="text-slate-500 font-medium">Current: </span>
                  {student.currentStatus === 'Ready' && (
                    <span className="font-bold text-[#059669]">Ready</span>
                  )}
                  {student.currentStatus === 'Needs Revision' && (
                    <span className="font-bold text-[#f59e0b]">Needs Revision</span>
                  )}
                  {student.currentStatus === 'Not Ready' && (
                    <span className="font-bold text-[#ef4444]">Not Ready</span>
                  )}
                  {!student.currentStatus && (
                    <span className="font-medium text-slate-400">— not set —</span>
                  )}
                </div>

                {/* 3 Recommendation Buttons */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleSetRecommendation(student.id, 'Ready')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center ${
                      student.currentStatus === 'Ready'
                        ? 'bg-[#00897b] text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Ready
                  </button>

                  <button
                    onClick={() => handleSetRecommendation(student.id, 'Needs Revision')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center ${
                      student.currentStatus === 'Needs Revision'
                        ? 'bg-[#f59e0b] text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Needs Revision
                  </button>

                  <button
                    onClick={() => handleSetRecommendation(student.id, 'Not Ready')}
                    className={`py-2 px-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer text-center ${
                      student.currentStatus === 'Not Ready'
                        ? 'bg-[#ef4444] text-white shadow-xs font-bold'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Not Ready
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* BOTTOM SYNC CONFIRMATION BANNER */}
      <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs font-medium leading-relaxed">
        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
        <div>
          Set a recommendation and it flows straight to the CCCP Certification Cell as Exam Readiness, Mock Score & Trainer Recommendation — and to the Placement Movement Desk.
        </div>
      </div>

    </div>
  );
}
