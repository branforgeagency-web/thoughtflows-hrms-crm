import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Search, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  BellRing, 
  X, 
  Sparkles,
  Filter,
  ArrowUpDown,
  RefreshCw
} from 'lucide-react';

// Official HR Roster
const INITIAL_TEAM_MEMBERS = [];
const OLD_MOCK = []; /*
  {
    id: 'tp_01',
    name: 'A.Lokesh Babu',
    role: 'Head of HR /Digital Marketing',
    empId: 'TFBB559',
    doneCount: 11,
    totalCount: 13,
    pendingCount: 2,
    qualityScore: 87,
    status: 'Good',
    isOff: false,
    initial: 'A',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR Leadership',
    phone: '+91 98765 43210'
  },
  {
    id: 'tp_02',
    name: 'R Priyadharshini',
    role: 'Team Lead',
    empId: 'TFBB703',
    doneCount: 5,
    totalCount: 6,
    pendingCount: 1,
    qualityScore: 87,
    status: 'Good',
    isOff: false,
    initial: 'R',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43211'
  },
  {
    id: 'tp_03',
    name: 'Guru Vigneshwar S',
    role: 'Team Lead',
    empId: 'TFBB697',
    doneCount: 7,
    totalCount: 8,
    pendingCount: 1,
    qualityScore: 82,
    status: 'Good',
    isOff: false,
    initial: 'G',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43212'
  },
  {
    id: 'tp_04',
    name: 'Kalaiselvi C',
    role: 'Team Lead',
    empId: 'TFBB591',
    doneCount: 7,
    totalCount: 9,
    pendingCount: 2,
    qualityScore: 88,
    status: 'Good',
    isOff: true, // Red dot . off
    initial: 'K',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43213'
  },
  {
    id: 'tp_05',
    name: 'Punitha',
    role: 'Team Lead',
    empId: 'TFBB593',
    doneCount: 9,
    totalCount: 11,
    pendingCount: 2,
    qualityScore: 79,
    status: 'Average',
    isOff: false,
    initial: 'P',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43214'
  },
  {
    id: 'tp_06',
    name: 'Sindhuja Erothu',
    role: 'Team Lead',
    empId: 'TFBB637',
    doneCount: 6,
    totalCount: 7,
    pendingCount: 1,
    qualityScore: 80,
    status: 'Average',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43215'
  },
  {
    id: 'tp_07',
    name: 'Jasmin',
    role: 'Head of HR Department',
    empId: 'TFBB561',
    doneCount: 14,
    totalCount: 15,
    pendingCount: 1,
    qualityScore: 95,
    status: 'Excellent',
    isOff: false,
    initial: 'J',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR Leadership',
    phone: '+91 98765 43216'
  },
  {
    id: 'tp_08',
    name: 'Kartheeswari K',
    role: 'Operational Head',
    empId: 'TFBB501',
    doneCount: 18,
    totalCount: 19,
    pendingCount: 1,
    qualityScore: 96,
    status: 'Excellent',
    isOff: false,
    initial: 'K',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Leadership',
    phone: '+91 98765 43217'
  },
  {
    id: 'tp_09',
    name: 'Aswanth V K',
    role: 'Regional head',
    empId: 'TFBB683',
    doneCount: 12,
    totalCount: 13,
    pendingCount: 1,
    qualityScore: 92,
    status: 'Excellent',
    isOff: false,
    initial: 'A',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Leadership',
    phone: '+91 98765 43218'
  },
  {
    id: 'tp_10',
    name: 'Anakha Suresh M',
    role: 'Team Lead',
    empId: 'TFBB575',
    doneCount: 10,
    totalCount: 11,
    pendingCount: 1,
    qualityScore: 91,
    status: 'Excellent',
    isOff: false,
    initial: 'A',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43219'
  },
  {
    id: 'tp_11',
    name: 'Peemuthannagari Supraja',
    role: 'Team Lead',
    empId: 'TFBB643',
    doneCount: 11,
    totalCount: 12,
    pendingCount: 1,
    qualityScore: 90,
    status: 'Excellent',
    isOff: false,
    initial: 'P',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Team Leads',
    phone: '+91 98765 43220'
  },
  {
    id: 'tp_12',
    name: 'Gayathri B',
    role: 'Branch Manager Of SVM',
    empId: 'TFBB558',
    doneCount: 9,
    totalCount: 10,
    pendingCount: 1,
    qualityScore: 89,
    status: 'Good',
    isOff: false,
    initial: 'G',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Branch Management',
    phone: '+91 98765 43221'
  },
  {
    id: 'tp_13',
    name: 'Sindhu S',
    role: 'Process Coach / Branch Manager',
    empId: 'TFBB588',
    doneCount: 11,
    totalCount: 13,
    pendingCount: 2,
    qualityScore: 88,
    status: 'Good',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Branch Management',
    phone: '+91 98765 43222'
  },
  {
    id: 'tp_14',
    name: 'Sangavi',
    role: 'HR Executive',
    empId: 'TFBB711',
    doneCount: 14,
    totalCount: 16,
    pendingCount: 2,
    qualityScore: 87,
    status: 'Good',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43223'
  },
  {
    id: 'tp_15',
    name: 'Sruthi G',
    role: 'Branch Manager Of Hopes',
    empId: 'TFBB578',
    doneCount: 8,
    totalCount: 10,
    pendingCount: 2,
    qualityScore: 86,
    status: 'Good',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Branch Management',
    phone: '+91 98765 43224'
  },
  {
    id: 'tp_16',
    name: 'Nivetha P',
    role: 'Academic Counsellor',
    empId: 'TFBB715',
    doneCount: 12,
    totalCount: 13,
    pendingCount: 1,
    qualityScore: 93,
    status: 'Excellent',
    isOff: false,
    initial: 'N',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43225'
  },
  {
    id: 'tp_17',
    name: 'Reshma V Jenifer',
    role: 'HR Executive',
    empId: 'TFBB687',
    doneCount: 10,
    totalCount: 12,
    pendingCount: 2,
    qualityScore: 83,
    status: 'Good',
    isOff: false,
    initial: 'R',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43226'
  },
  {
    id: 'tp_18',
    name: 'Pavithra N',
    role: 'HR Executive',
    empId: 'TFBB678',
    doneCount: 8,
    totalCount: 10,
    pendingCount: 2,
    qualityScore: 81,
    status: 'Good',
    isOff: false,
    initial: 'P',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43227'
  },
  {
    id: 'tp_19',
    name: 'Prabhu M',
    role: 'HR Executive',
    empId: 'TFBB653',
    doneCount: 7,
    totalCount: 9,
    pendingCount: 2,
    qualityScore: 78,
    status: 'Average',
    isOff: false,
    initial: 'P',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43228'
  },
  {
    id: 'tp_20',
    name: 'Julie Arokiam',
    role: 'HR Executive',
    empId: 'TFBB702',
    doneCount: 6,
    totalCount: 8,
    pendingCount: 2,
    qualityScore: 77,
    status: 'Average',
    isOff: false,
    initial: 'J',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43229'
  },
  {
    id: 'tp_21',
    name: 'K.V.K.Kanchana',
    role: 'HR Executive',
    empId: 'TFBB685',
    doneCount: 9,
    totalCount: 12,
    pendingCount: 3,
    qualityScore: 76,
    status: 'Average',
    isOff: false,
    initial: 'K',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43230'
  },
  {
    id: 'tp_22',
    name: 'Dhivya S',
    role: 'HR Executive',
    empId: 'TFBB690',
    doneCount: 8,
    totalCount: 11,
    pendingCount: 3,
    qualityScore: 75,
    status: 'Average',
    isOff: true, // Red dot . off
    initial: 'D',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43231'
  },
  {
    id: 'tp_23',
    name: 'Deepthi G',
    role: 'HR Executive',
    empId: 'TFBB694',
    doneCount: 5,
    totalCount: 7,
    pendingCount: 2,
    qualityScore: 74,
    status: 'Average',
    isOff: false,
    initial: 'D',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43232'
  },
  {
    id: 'tp_24',
    name: 'Kavitha N',
    role: 'Senior Counsellor',
    empId: 'TFBB720',
    doneCount: 15,
    totalCount: 16,
    pendingCount: 1,
    qualityScore: 94,
    status: 'Excellent',
    isOff: false,
    initial: 'K',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43233'
  },
  {
    id: 'tp_25',
    name: 'Deepa R',
    role: 'Academic Counsellor',
    empId: 'TFBB722',
    doneCount: 11,
    totalCount: 12,
    pendingCount: 1,
    qualityScore: 91,
    status: 'Excellent',
    isOff: false,
    initial: 'D',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43234'
  },
  {
    id: 'tp_26',
    name: 'Suresh M',
    role: 'Academic Counsellor',
    empId: 'TFBB725',
    doneCount: 13,
    totalCount: 14,
    pendingCount: 1,
    qualityScore: 92,
    status: 'Excellent',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43235'
  },
  {
    id: 'tp_27',
    name: 'Meena K',
    role: 'Junior Counsellor',
    empId: 'TFBB729',
    doneCount: 7,
    totalCount: 9,
    pendingCount: 2,
    qualityScore: 84,
    status: 'Good',
    isOff: false,
    initial: 'M',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43236'
  },
  {
    id: 'tp_28',
    name: 'Priya V',
    role: 'Senior Counsellor',
    empId: 'TFBB733',
    doneCount: 10,
    totalCount: 11,
    pendingCount: 1,
    qualityScore: 89,
    status: 'Good',
    isOff: false,
    initial: 'P',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43237'
  },
  {
    id: 'tp_29',
    name: 'Saritha B',
    role: 'HR Specialist',
    empId: 'TFBB738',
    doneCount: 6,
    totalCount: 8,
    pendingCount: 2,
    qualityScore: 79,
    status: 'Average',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'HR — Counsellors',
    phone: '+91 98765 43238'
  },
  {
    id: 'tp_30',
    name: 'Venkatesh R',
    role: 'Placement Officer',
    empId: 'TFBB742',
    doneCount: 14,
    totalCount: 15,
    pendingCount: 1,
    qualityScore: 92,
    status: 'Excellent',
    isOff: false,
    initial: 'V',
    avatarBg: 'bg-[#7c3aed]',
    department: 'CCCP Cell',
    phone: '+91 98765 43239'
  },
  {
    id: 'tp_31',
    name: 'Swetha K',
    role: 'Training Lead',
    empId: 'TFBB748',
    doneCount: 11,
    totalCount: 12,
    pendingCount: 1,
    qualityScore: 90,
    status: 'Excellent',
    isOff: false,
    initial: 'S',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Training Department',
    phone: '+91 98765 43240'
  },
  {
    id: 'tp_32',
    name: 'Vignesh P',
    role: 'Lead Developer',
    empId: 'TFBB750',
    doneCount: 9,
    totalCount: 11,
    pendingCount: 2,
    qualityScore: 82,
    status: 'Good',
    isOff: true, // Red dot . off
    initial: 'V',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Tech & Development',
    phone: '+91 98765 43241'
  },
  {
    id: 'tp_33',
    name: 'Monika T',
    role: 'Digital Marketing Lead',
    empId: 'TFBB755',
    doneCount: 8,
    totalCount: 10,
    pendingCount: 2,
    qualityScore: 81,
    status: 'Good',
    isOff: false,
    initial: 'M',
    avatarBg: 'bg-[#7c3aed]',
    department: 'Marketing Department',
    phone: '+91 98765 43242'
  }
*/;

export default function TeamPerformanceBoard({ 
  customMembers = null, 
  title = "Team Performance",
  showSearch = true,
  onRemind = null 
}) {
  const [members, setMembers] = useState(customMembers || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [remindedIds, setRemindedIds] = useState({});
  const [remindModalMember, setRemindModalMember] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [customNote, setCustomNote] = useState('');

  // Auto-clear toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered & Sorted Members by Quality Score (descending)
  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        const matchSearch = 
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.empId.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (statusFilter === 'All') return matchSearch;
        if (statusFilter === 'Good') return matchSearch && m.status === 'Good';
        if (statusFilter === 'Average') return matchSearch && m.status === 'Average';
        if (statusFilter === 'Excellent') return matchSearch && m.status === 'Excellent';
        if (statusFilter === 'Off') return matchSearch && m.isOff;
        return matchSearch;
      })
      .sort((a, b) => b.qualityScore - a.qualityScore);
  }, [members, searchQuery, statusFilter]);

  const handleOpenRemindModal = (member) => {
    setRemindModalMember(member);
    setCustomNote(`Hi ${member.name}, you have ${member.pendingCount} pending task(s). Please complete them at your earliest convenience.`);
  };

  const handleSendReminder = (e) => {
    e?.preventDefault();
    if (!remindModalMember) return;

    setRemindedIds(prev => ({
      ...prev,
      [remindModalMember.id]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    if (onRemind) {
      onRemind(remindModalMember, customNote);
    }

    showToast(`Reminder sent successfully to ${remindModalMember.name} (${remindModalMember.empId})`);
    setRemindModalMember(null);
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Header Container matching Screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            {/* Custom Multi-color Bar Chart Icon matching exact design */}
            <div className="w-6 h-6 flex items-end justify-between gap-0.5 p-0.5 rounded bg-slate-100/80 border border-slate-200/60">
              <span className="w-1.5 h-3.5 bg-cyan-500 rounded-xs" />
              <span className="w-1.5 h-4.5 bg-purple-600 rounded-xs" />
              <span className="w-1.5 h-2.5 bg-amber-500 rounded-xs" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0f172a] tracking-tight">
              {title}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1 font-medium pl-0.5">
            {members.length} members &nbsp;&middot;&nbsp; sorted by quality score
          </p>
        </div>

        {/* Filter & Search Bar */}
        {showSearch && (
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member, role, ID..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-sans"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
              {['All', 'Good', 'Average', 'Excellent'].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                    statusFilter === f 
                      ? 'bg-white text-slate-900 shadow-2xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List of Team Performance Rows (Exact Screenshot Aesthetics) */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-500">No team members match the current search filter.</p>
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              className="mt-2 text-xs text-purple-600 hover:underline font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMembers.map((m) => {
            const isReminded = remindedIds[m.id];

            return (
              <div
                key={m.id}
                className="group bg-white border border-slate-200/90 hover:border-purple-200 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
              >
                {/* Left Section: Avatar + Name/Role/Stats */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  {/* Purple Circle Avatar with Initial */}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${m.avatarBg || 'bg-[#7c3aed]'} text-white font-extrabold text-sm sm:text-base flex items-center justify-center flex-shrink-0 shadow-2xs font-sans`}>
                    {m.initial || m.name[0]}
                  </div>

                  {/* Member Details */}
                  <div className="min-w-0 flex-1">
                    {/* Top Row: Name + Status Dot (. off / online) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-[#0f172a] tracking-tight group-hover:text-purple-900 transition-colors">
                        {m.name}
                      </h4>
                      {m.isOff && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" />
                          <span className="text-slate-400 font-mono text-[11px]">. off</span>
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Role & Employee ID */}
                    <div className="text-xs text-slate-400 font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>{m.role}</span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span className="font-mono text-slate-500">{m.empId}</span>
                    </div>

                    {/* Bottom Row: Done / Pending / Quality Stats */}
                    <div className="text-xs text-slate-500 font-medium mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="text-slate-800 font-semibold">
                        Done <span className="font-bold text-slate-900">{m.doneCount}/{m.totalCount}</span>
                      </span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>
                        Pending <span className="font-semibold text-slate-700">{m.pendingCount}</span>
                      </span>
                      <span className="text-slate-300 font-bold">&middot;</span>
                      <span>
                        Quality <span className="font-bold text-slate-900">{m.qualityScore}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Section: Status Pill + Remind Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Status Tag Pill matching exact screenshot colors */}
                  <div>
                    {m.status === 'Good' && (
                      <span className="inline-block bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Good
                      </span>
                    )}
                    {m.status === 'Average' && (
                      <span className="inline-block bg-[#fef3c7] text-[#d97706] border border-[#fde68a] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Average
                      </span>
                    )}
                    {m.status === 'Excellent' && (
                      <span className="inline-block bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] text-[11px] sm:text-xs font-semibold px-3 py-0.5 rounded-full tracking-wide">
                        Excellent
                      </span>
                    )}
                  </div>

                  {/* Remind Button */}
                  <button
                    onClick={() => handleOpenRemindModal(m)}
                    className={`border text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                      isReminded
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                        : 'border-slate-300/90 hover:border-slate-400 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isReminded ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sent ({isReminded})</span>
                      </>
                    ) : (
                      <>
                        <span>Remind</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Remind Modal */}
      {remindModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setRemindModalMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                {remindModalMember.initial}
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Send Task Reminder
                </h4>
                <p className="text-xs text-slate-500">
                  To {remindModalMember.name} &middot; {remindModalMember.empId}
                </p>
              </div>
            </div>

            <form onSubmit={handleSendReminder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pending Task Overview
                </label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div><strong>Pending Count:</strong> {remindModalMember.pendingCount} task(s)</div>
                  <div><strong>Current Quality:</strong> {remindModalMember.qualityScore}% ({remindModalMember.status})</div>
                  <div><strong>Execution Status:</strong> {remindModalMember.doneCount}/{remindModalMember.totalCount} completed</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Reminder Message
                </label>
                <textarea
                  rows={3}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemindModalMember(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reminder</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
