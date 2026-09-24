import React, { useState } from 'react';
import { X, Check, Sparkles } from 'lucide-react';

export default function GenerateStudentIdModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  // Generator parameters matching screenshot defaults
  const [branch, setBranch] = useState('S');
  const [course, setCourse] = useState('C');
  const [courseType, setCourseType] = useState('O');
  const [month, setMonth] = useState('Y');
  const [year, setYear] = useState('6');
  const [serial, setSerial] = useState('025');

  const [toastMsg, setToastMsg] = useState(null);

  const BRANCH_MAP = {
    'S': 'Saravanampatti',
    'H': 'Hopes',
    'G': 'Gandhipuram',
    'C': 'Trichy',
    'M': 'Salem',
    'K': 'Kochi',
    'V': 'Trivandrum',
    'T': 'Tirupati',
    'D': 'Hyderabad Dilsukhnagar',
    'R': 'Hyderabad Ameerpet',
    'Z': 'Vizag',
    'P': 'Pune',
    'L': 'Kollapur',
    'N': 'Theni'
  };

  const COURSE_MAP = {
    'C': 'CPC',
    'A': 'AMCT',
    'AB': 'AMCT Beginner',
    'AI': 'AMCT Intermediate',
    'AA': 'AMCT Advanced',
    'F': 'CPC Crash Course',
    'D': 'ED Coding',
    'N': 'E/M Coding',
    'I': 'IPDRG',
    'S': 'CCS',
    'P': 'CPMA',
    'E': 'CIC',
    'R': 'CRC',
    'Y': 'Surgical',
    'T': 'CPT',
    'Z': 'ICD',
    'H': 'HCC',
    'O': 'Anatomy',
    'CN': 'CEMC',
    'B': 'COC'
  };

  const TYPE_MAP = {
    'O': 'Online',
    'C': 'Classroom',
    'H': 'Hybrid'
  };

  const MONTH_MAP = {
    'A': 'Jan',
    'B': 'Feb',
    'C': 'Mar',
    'D': 'Apr',
    'Y': 'May',
    'J': 'Jun',
    'L': 'Jul',
    'G': 'Aug',
    'S': 'Sep',
    'T': 'Oct',
    'N': 'Nov',
    'E': 'Dec'
  };

  const YEAR_MAP = {
    '2': '2022',
    '3': '2023',
    '4': '2024',
    '5': '2025',
    '6': '2026'
  };

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
        monthName: MONTH_MAP[month] || 'May',
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
                PICK BRANCH · COURSE · TYPE · MONTH · YEAR · AUTO-SERIAL
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
              <span className="text-cyan-500">{middleCode}</span>
              <span className="bg-amber-100/90 text-amber-500 px-2 py-0.5 rounded-lg ml-1">
                {serial}
              </span>
            </div>

            {/* Breakdown Subtitle with dot separators */}
            <div className="text-[11px] font-mono text-slate-500 pt-1 flex items-center justify-center flex-wrap gap-x-1.5 gap-y-0.5">
              <span>{companyPrefix}</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{BRANCH_MAP[branch] || branch}</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{COURSE_MAP[course] || course}</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{TYPE_MAP[courseType] || courseType}</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{MONTH_MAP[month] || month}</span>
              <span>·</span>
              <span className="text-teal-700 font-medium">{YEAR_MAP[year] || year}</span>
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
                  BRANCH
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="S">S - Saravanampatti</option>
                  <option value="H">H - Hopes</option>
                  <option value="G">G - Gandhipuram (GPM)</option>
                  <option value="C">C - Trichy</option>
                  <option value="M">M - Salem</option>
                  <option value="K">K - Kochi</option>
                  <option value="V">V - Trivandrum</option>
                  <option value="T">T - Tirupati</option>
                  <option value="D">D - Hyderabad Dilsukhnagar</option>
                  <option value="R">R - Hyderabad Ameerpet (DSNR)</option>
                  <option value="Z">Z - Vizag</option>
                  <option value="P">P - Pune</option>
                  <option value="L">L - Kollapur</option>
                  <option value="N">N - Theni</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  COURSE
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="C">C - CPC Intermediate</option>
                  <option value="A">A - AMCT</option>
                  <option value="AB">AB - AMCT Beginner</option>
                  <option value="AI">AI - AMCT Intermediate</option>
                  <option value="AA">AA - AMCT Advanced</option>
                  <option value="F">F - CPC Crash Course</option>
                  <option value="D">D - ED Coding</option>
                  <option value="N">N - E/M Coding</option>
                  <option value="I">I - IPDRG</option>
                  <option value="S">S - CCS</option>
                  <option value="P">P - CPMA</option>
                  <option value="E">E - CIC</option>
                  <option value="R">R - CRC</option>
                  <option value="Y">Y - Surgical</option>
                  <option value="T">T - CPT</option>
                  <option value="Z">Z - ICD</option>
                  <option value="H">H - HCC</option>
                  <option value="O">O - Anatomy</option>
                  <option value="CN">CN - CEMC</option>
                  <option value="B">B - COC</option>
                </select>
              </div>
            </div>

            {/* Row 2: Course Type & Month of Joining */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  COURSE TYPE
                </label>
                <select
                  value={courseType}
                  onChange={(e) => setCourseType(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="O">O - Online</option>
                  <option value="C">C - Classroom</option>
                  <option value="H">H - Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  MONTH OF JOINING
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all cursor-pointer font-sans"
                >
                  <option value="A">A - Jan</option>
                  <option value="B">B - Feb</option>
                  <option value="C">C - Mar</option>
                  <option value="D">D - Apr</option>
                  <option value="Y">Y - May</option>
                  <option value="J">J - Jun</option>
                  <option value="L">L - Jul</option>
                  <option value="G">G - Aug</option>
                  <option value="S">S - Sep</option>
                  <option value="T">T - Oct</option>
                  <option value="N">N - Nov</option>
                  <option value="E">E - Dec</option>
                </select>
              </div>
            </div>

            {/* Row 3: Year & Auto Serial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  YEAR
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
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-500 uppercase mb-1.5">
                  AUTO SERIAL (NEXT AVAILABLE)
                </label>
                <input
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-[#00897b] transition-all font-mono font-bold"
                  placeholder="025"
                />
              </div>
            </div>

            {/* Serial Info Tip */}
            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5 pt-1">
              <span>💡</span>
              <span>Serial auto-increments per branch + course + month combination</span>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="bg-[#00897b] hover:bg-[#00796b] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Confirm & Use this ID</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
