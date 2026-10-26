import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles } from 'lucide-react';
import { getStudents } from '../services/api';
import {
  BRANCH_MAP,
  COURSE_MAP,
  TYPE_MAP,
  MONTH_MAP,
  YEAR_MAP,
  MONTH_INDEX_CODES
} from '../utils/studentIdGenerator';

export default function GenerateStudentIdModal({ isOpen, onClose, onConfirm, existingStudents }) {
  // Current month & year codes
  const curMonthCode = MONTH_INDEX_CODES[new Date().getMonth()] || 'N';
  const curYearCode = String(new Date().getFullYear()).slice(-1);

  // Generator parameters matching official ThoughtFlows spreadsheet specification
  const [branch, setBranch] = useState('S');
  const [course, setCourse] = useState('C');
  const [courseType, setCourseType] = useState('O');
  const [month, setMonth] = useState(curMonthCode);
  const [year, setYear] = useState(curYearCode);
  const [serial, setSerial] = useState('001');

  const [allStudents, setAllStudents] = useState(existingStudents || []);
  const [toastMsg, setToastMsg] = useState(null);

  // Fetch or sync students list when modal is open
  useEffect(() => {
    if (!isOpen) return;
    if (Array.isArray(existingStudents) && existingStudents.length > 0) {
      setAllStudents(existingStudents);
    } else {
      getStudents()
        .then((data) => {
          if (Array.isArray(data)) setAllStudents(data);
        })
        .catch((err) => console.error('Error fetching students for ID serial generator:', err));
    }
  }, [isOpen, existingStudents]);

  // Dynamically calculate next available 3-digit serial starting from 001 for current combination
  useEffect(() => {
    if (!isOpen) return;

    const companyPrefix = 'TF';
    const middleCode = `${branch}${course}${courseType}${month}${year}`;
    const targetPrefix = `${companyPrefix}${middleCode}`.toUpperCase();

    let maxSerial = 0;
    if (Array.isArray(allStudents) && allStudents.length > 0) {
      allStudents.forEach((st) => {
        const sId = (st.studentId || st.id || '').toString().trim().toUpperCase();
        if (sId.startsWith(targetPrefix)) {
          const suffix = sId.slice(targetPrefix.length);
          const match = suffix.match(/^(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSerial) {
              maxSerial = num;
            }
          }
        }
      });
    }

    const nextSerialNum = maxSerial + 1;
    const formattedSerial = String(nextSerialNum).padStart(3, '0');
    setSerial(formattedSerial);
  }, [branch, course, courseType, month, year, allStudents, isOpen]);

  if (!isOpen) return null;

  // Generated code components
  const companyPrefix = 'TF';
  const middleCode = `${branch}${course}${courseType}${month}${year}`;
  const fullId = `${companyPrefix}${middleCode}${serial}`;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirm = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullId).catch(() => {});
    }
    if (onConfirm) {
      onConfirm(fullId, {
        generatedId: fullId,
        branchCode: branch,
        branchName: BRANCH_MAP[branch] || 'Saravanampatti',
        courseCode: course,
        courseName: COURSE_MAP[course] || 'CPC',
        typeCode: courseType,
        typeName: TYPE_MAP[courseType] || 'Online',
        monthCode: month,
        monthName: MONTH_MAP[month] || 'November',
        yearCode: year,
        yearVal: YEAR_MAP[year] || '2026',
        serial
      });
    }
    showToast(`✓ Confirmed & copied ID: ${fullId}`);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Box */}
      <div className="bg-white rounded-[28px] max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 my-auto text-left">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#0b2545] via-[#133c55] to-[#134074] p-5 sm:p-6 text-white relative flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-md border border-indigo-400/40">
              ID
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                Generate Student ID
              </h2>
              <p className="text-[10px] font-mono font-bold tracking-widest text-slate-300/90 mt-0.5 uppercase">
                1.TF · 2.BRANCH · 3.COURSE · 4.TYPE · 5.MONTH · 6.YEAR · 7.SERIAL
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-7 space-y-6">
          
          {/* GENERATED STUDENT ID CARD */}
          <div className="bg-[#f0faf8]/80 border-2 border-teal-400/90 rounded-2xl sm:rounded-3xl p-5 text-center space-y-2">
            <div className="text-[10.5px] font-mono font-bold uppercase tracking-widest text-teal-700">
              GENERATED STUDENT ID
            </div>

            {/* Large Typography ID */}
            <div className="flex items-center justify-center font-mono font-black tracking-wider text-3xl sm:text-4xl">
              <span className="text-slate-900">{companyPrefix}</span>
              <span className="text-cyan-600">{middleCode}</span>
              <span className="bg-amber-100/90 text-amber-600 px-2 py-0.5 rounded-lg ml-1">
                {serial}
              </span>
            </div>

            {/* Breakdown Subtitle */}
            <div className="text-xs text-slate-500 font-mono flex items-center justify-center flex-wrap gap-1.5 pt-1">
              <strong className="text-slate-800">{companyPrefix}</strong>
              <span>·</span>
              <span className="text-teal-700 font-medium">{BRANCH_MAP[branch] || branch} ({branch})</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{COURSE_MAP[course] || course} ({course})</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{TYPE_MAP[courseType] || courseType} ({courseType})</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{MONTH_MAP[month] || month} ({month})</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{YEAR_MAP[year] || year} ({year})</span>
              <span>·</span>
              <span>Serial <strong className="text-slate-800 font-bold">{serial}</strong></span>
            </div>
          </div>

          {/* FORM GRID */}
          <div className="space-y-4 text-xs font-sans">
            {/* Row 1: Branch & Course */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  2. BRANCH NAME
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="S">S - Saravanampatti</option>
                  <option value="H">H - Hopes</option>
                  <option value="T">T - Tirupati</option>
                  <option value="V">V - Trivandrum</option>
                  <option value="D">D - Hyderabad</option>
                  <option value="C">C - Trichy</option>
                  <option value="K">K - Kochi</option>
                  <option value="M">M - Salem</option>
                  <option value="R">R - DSNR (Dilsukhnagar)</option>
                  <option value="Z">Z - VIZAG</option>
                  <option value="G">G - GPM (Gandhipuram)</option>
                  <option value="P">P - Pune</option>
                  <option value="L">L - Kollapur</option>
                  <option value="N">N - Theni</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  3. COURSE NAME
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <optgroup label="Official Specified Courses">
                    <option value="AB">AB - AMCT(Beginner)</option>
                    <option value="AI">AI - AMCT(Intermediate)</option>
                    <option value="AA">AA - AMCT(Advanced)</option>
                    <option value="A">A - AMCT</option>
                    <option value="C">C - CPC</option>
                    <option value="F">F - CPC crash course</option>
                    <option value="D">D - ED</option>
                    <option value="N">N - E/M</option>
                    <option value="I">I - IPDRG</option>
                    <option value="S">S - CCS</option>
                    <option value="P">P - CPMA</option>
                    <option value="E">E - CIC</option>
                    <option value="R">R - CRC</option>
                    <option value="Y">Y - SUR</option>
                    <option value="T">T - CPT</option>
                    <option value="Z">Z - ICD</option>
                    <option value="H">H - HCC</option>
                    <option value="O">O - ANATOMY</option>
                    <option value="CN">CN - CEMC</option>
                    <option value="R">R - RADIOLOGY</option>
                  </optgroup>

                  <optgroup label="Internship & Other Certifications">
                    <option value="IB">IB - Internship Beginner</option>
                    <option value="II">II - Internship Intermediate</option>
                    <option value="IA">IA - Internship Advanced</option>
                    <option value="B">B - COC</option>
                    <option value="PB">PB - CPB</option>
                    <option value="EDC">EDC - CEDC</option>
                    <option value="CDO">CDO - CDEO</option>
                    <option value="CDEI">CDEI - CDEI</option>
                    <option value="PPM">PPM - CPPM</option>
                    <option value="AN">AN - Anesthesia</option>
                    <option value="IVR">IVR - Interventional Radiology</option>
                    <option value="CDI">CDI - Clinical Documentation Improvement</option>
                    <option value="CSP">CSP - CCS-P</option>
                    <option value="RIA">RIA - RHIA</option>
                    <option value="RIT">RIT - RHIT</option>
                    <option value="CCC">CCC - CCC</option>
                    <option value="HIM">HIM - HIM</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Row 2: Course Type & Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  4. COURSE TYPE
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="O">O - ONLINE</option>
                  <option value="C">C - CLASSROOM / OFFLINE</option>
                  <option value="H">H - HYBRID</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  5. MONTH (OFFICIAL SPEC)
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="J">J - Jan</option>
                  <option value="F">F - Feb</option>
                  <option value="M">M - Mar</option>
                  <option value="A">A - Apri</option>
                  <option value="Y">Y - May</option>
                  <option value="E">E - June</option>
                  <option value="L">L - July</option>
                  <option value="U">U - August</option>
                  <option value="S">S - September</option>
                  <option value="O">O - October</option>
                  <option value="N">N - November</option>
                  <option value="D">D - December</option>
                </select>
              </div>
            </div>

            {/* Row 3: Year & Auto Serial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  6. YEAR
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="2">2 - 2022</option>
                  <option value="3">3 - 2023</option>
                  <option value="4">4 - 2024</option>
                  <option value="5">5 - 2025</option>
                  <option value="6">6 - 2026</option>
                  <option value="7">7 - 2027</option>
                  <option value="8">8 - 2028</option>
                  <option value="9">9 - 2029</option>
                  <option value="0">0 - 2030</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  7. SERIAL NUMBER (001, 002...)
                </label>
                <input
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="001"
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#00796b] text-white text-xs font-bold shadow-lg shadow-teal-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" /> Use Student ID ({fullId})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
