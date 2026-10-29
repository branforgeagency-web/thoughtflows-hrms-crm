import React, { useState, useEffect, useMemo } from 'react';
import { localDateKey } from '../utils/dateUtils';
import { 
  Plus, 
  Video, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  AlertCircle, 
  Sparkles, 
  UserCheck, 
  Users, 
  MapPin, 
  Link, 
  X,
  Phone,
  Copy,
  Share2,
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  Check,
  User,
  MessageSquare
} from 'lucide-react';
import BookNewDemoModal from './BookNewDemoModal';

import { getDemos, createDemo, updateDemo } from '../services/api';
import { isSpecialtyCourse } from '../constants/courses';
import { redirectToWhatsAppWeb } from '../utils/whatsapp';

/**
 * Stages of a Demo in its complete lifecycle:
 * 1. Pending Trainer Assignment (Booked by HR, moved to Trainer Head / Manager)
 * 2. Trainer Assigned (Assigned by Trainer Leadership, awaiting link / confirmation)
 * 3. Confirmed & Meeting Ready (Zoom link created / active, ready to share with candidate)
 * 4. Demo Attended (Conducted by trainer, feedback & notes logged)
 * 5. Moved to Fee Talk / Enrolled (HR counseling for fee and admission closure)
 * Branch: Missed / No-Show (Reschedule needed)
 */
export function getDemoStage(demo) {
  const status = String(demo?.status || '').toLowerCase();
  const hasTrainer = Boolean(demo?.trainer && demo.trainer !== 'Unassigned' && String(demo.trainer).trim() !== '');
  const hasLink = Boolean(demo?.link || demo?.zoomMeetingId);

  if (['missed', 'cancelled', 'no_show'].includes(status)) {
    return {
      step: 0,
      isMissed: true,
      key: 'missed',
      stageNumber: null,
      label: 'Missed / No-Show',
      stageTag: 'No-Show',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      stepClass: 'bg-rose-500 text-white',
      cardBorder: 'border-l-rose-500',
      description: demo?.missedReason || 'Candidate did not attend scheduled demo — click Re-Schedule below.',
      nextAction: 'Re-Schedule Demo'
    };
  }

  if (['fee', 'enrolled', 'admitted'].includes(status)) {
    return {
      step: 5,
      key: 'fee',
      stageNumber: 5,
      label: status === 'enrolled' ? 'Student Enrolled' : 'Stage 5: Moved to Fee Talk',
      stageTag: status === 'enrolled' ? 'Enrolled' : 'Fee Discussion',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      stepClass: 'bg-purple-600 text-white',
      cardBorder: 'border-l-purple-500',
      description: 'Demo attended & completed! Currently in fee counseling and admission closure.',
      nextAction: 'Complete Admission'
    };
  }

  if (['attended', 'completed'].includes(status)) {
    return {
      step: 4,
      key: 'attended',
      stageNumber: 4,
      label: 'Stage 4: Demo Attended',
      stageTag: 'Attended',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      stepClass: 'bg-emerald-600 text-white',
      cardBorder: 'border-l-emerald-500',
      description: demo?.trainerNotes
        ? `Faculty Note: "${demo.trainerNotes}"`
        : 'Candidate completed demo session with trainer. Ready to move to Fee Discussion.',
      nextAction: 'Move to Fee Talk'
    };
  }

  if (status === 'confirmed' || hasLink) {
    return {
      step: 3,
      key: 'confirmed',
      stageNumber: 3,
      label: hasLink ? 'Stage 3: Confirmed · Meeting Link Ready' : 'Stage 3: Confirmed with Trainer',
      stageTag: hasLink ? 'Link Ready' : 'Confirmed',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      stepClass: 'bg-cyan-600 text-white',
      cardBorder: 'border-l-cyan-500',
      description: hasLink
        ? 'Live meeting room generated. Share link with candidate via WhatsApp.'
        : `Confirmed with faculty (${demo.trainer}). Awaiting session link.`,
      nextAction: hasLink ? 'Share Link on WhatsApp' : 'Mark Attended'
    };
  }

  if (hasTrainer) {
    return {
      step: 2,
      key: 'assigned',
      stageNumber: 2,
      label: `Stage 2: Trainer Assigned (${demo.trainer})`,
      stageTag: 'Trainer Assigned',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      stepClass: 'bg-blue-600 text-white',
      cardBorder: 'border-l-blue-500',
      description: `Trainer ${demo.trainer} allocated by Trainer Head/Manager. Ready to confirm & generate session link.`,
      nextAction: 'Confirm & Link'
    };
  }

  // Stage 1: Just booked by HR, pending assignment by Trainer Head / Manager
  return {
    step: 1,
    key: 'pending_assignment',
    stageNumber: 1,
    label: 'Stage 1: Pending Trainer Assignment',
    stageTag: 'Awaiting Trainer',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    stepClass: 'bg-amber-500 text-white',
    cardBorder: 'border-l-amber-500',
    description: 'Demo booked by HR. Moved to Trainer Head & Trainer Manager to assign an available faculty.',
    nextAction: 'Awaiting Trainer Assignment'
  };
}

const STAGES = [
  { step: 1, label: 'Booked' },
  { step: 2, label: 'Faculty Assigned' },
  { step: 3, label: 'Link Ready' },
  { step: 4, label: 'Attended' },
  { step: 5, label: 'Fee Talk' }
];

export default function HrDemoDesk({ demos: propDemos, onRefreshDemos, onBookDemoClick, currentUser }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all, pending, assigned, confirmed, attended, fee, missed
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [demos, setDemos] = useState(propDemos || []);

  const branchShort = String(currentUser?.branch || '').replace(/\s*branch\b.*$/i, '').replace(/\s*\(.*\)\s*$/, '').trim();

  useEffect(() => {
    if (propDemos !== undefined) {
      setDemos(propDemos);
    } else {
      const params = currentUser?.name ? { counselor: currentUser.name } : undefined;
      getDemos(params)
        .then(res => {
          if (Array.isArray(res)) setDemos(res);
        })
        .catch(err => console.error('Error fetching demos:', err));
    }
  }, [propDemos, currentUser?.name, branchShort]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text, message = '✓ Copied to clipboard!') => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      showToast(message);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(message);
    }
  };

  const handleShareWhatsApp = (demo) => {
    const link = demo.link || demo.zoomJoinUrl || '';
    const dateStr = demo.preferredDate || 'Upcoming date';
    const timeStr = demo.timeSlot || demo.time || 'Scheduled time';
    const trainerStr = demo.trainer && demo.trainer !== 'Unassigned' ? demo.trainer : 'Senior Faculty';
    const msg = `Hello ${demo.candidateName},\n\nYour demo session for *${demo.course}* has been booked!\n\n📅 *Date:* ${dateStr}\n⏰ *Time:* ${timeStr}\n👨‍🏫 *Faculty:* ${trainerStr}\n📍 *Mode:* ${demo.mode || 'Online (Zoom Live)'}${link ? `\n🔗 *Join Link:* ${link}` : '\nℹ️ Your session link will be shared shortly.'}\n\nPlease join 5 minutes before the session starts. All the best!\n— ThoughtFlows Education Team`;
    redirectToWhatsAppWeb(demo.phone, msg);
    showToast(`✓ Opened WhatsApp to send demo details to ${demo.candidateName}`);
  };

  const updateStatus = async (id, newStatus, candidateName) => {
    try {
      await updateDemo(id, { status: newStatus });
      if (onRefreshDemos) onRefreshDemos();
    } catch (e) {
      console.warn('Backend update notice:', e);
    }
    setDemos(prev => prev.map(d => (d._id === id || d.id === id) ? { ...d, status: newStatus } : d));
    const labelMap = {
      confirmed: 'Confirmed & Link Ready',
      attended: 'Marked Attended by Faculty',
      fee: 'Moved to Fee Discussion',
      missed: 'Flagged as Missed / No-Show'
    };
    showToast(`✓ ${candidateName}: ${labelMap[newStatus] || newStatus}`);
  };

  // Status normaliser
  const st = (d) => String(d.status || '').toLowerCase();
  const todayKey = localDateKey();

  // Lifecycle stage metrics
  const stageMetrics = useMemo(() => {
    let pendingCount = 0;
    let assignedCount = 0;
    let confirmedCount = 0;
    let attendedCount = 0;
    let feeCount = 0;
    let missedCount = 0;
    let todayCount = 0;

    demos.forEach(d => {
      const stage = getDemoStage(d);
      if (stage.key === 'pending_assignment') pendingCount++;
      else if (stage.key === 'assigned') assignedCount++;
      else if (stage.key === 'confirmed') confirmedCount++;
      else if (stage.key === 'attended') attendedCount++;
      else if (stage.key === 'fee') feeCount++;
      else if (stage.key === 'missed') missedCount++;

      if (d.preferredDate === todayKey || String(d.time || '').toLowerCase().includes('today')) {
        todayCount++;
      }
    });

    return {
      total: demos.length,
      pendingCount,
      assignedCount,
      confirmedCount,
      attendedCount,
      feeCount,
      missedCount,
      todayCount
    };
  }, [demos, todayKey]);

  // Filtered demos based on stage tab & search query
  const filteredDemos = useMemo(() => {
    return demos.filter(d => {
      const stage = getDemoStage(d);

      if (activeFilter === 'pending' && stage.key !== 'pending_assignment') return false;
      if (activeFilter === 'assigned' && stage.key !== 'assigned') return false;
      if (activeFilter === 'confirmed' && stage.key !== 'confirmed') return false;
      if (activeFilter === 'attended' && stage.key !== 'attended') return false;
      if (activeFilter === 'fee' && stage.key !== 'fee') return false;
      if (activeFilter === 'missed' && stage.key !== 'missed') return false;
      if (activeFilter === 'today' && d.preferredDate !== todayKey && !String(d.time || '').toLowerCase().includes('today')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const cand = String(d.candidateName || '').toLowerCase();
        const ph = String(d.phone || '');
        const crs = String(d.course || '').toLowerCase();
        const trn = String(d.trainer || d.trainerMapping || '').toLowerCase();
        const loc = String(d.location || d.branch || '').toLowerCase();
        const cns = String(d.counselor || d.bookedBy || '').toLowerCase();
        if (!cand.includes(q) && !ph.includes(q) && !crs.includes(q) && !trn.includes(q) && !loc.includes(q) && !cns.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [demos, activeFilter, searchQuery, todayKey]);

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header: Title, Subtitle, Search & Book Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Demo Desk
            </h1>
            <span className="bg-[#e6f7f9] text-[#0e6977] font-extrabold text-xs px-2.5 py-0.5 rounded-full border border-teal-200">
              {demos.length} Total Demos
            </span>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
            Real-time demo stage tracker: Track bookings from HR submission, faculty assignment by Trainer Head/Manager, meeting conduction, through to fee counseling.
          </p>
        </div>

        {/* Action Button: + Book New Demo */}
        <button
          onClick={onBookDemoClick ? onBookDemoClick : () => setShowBookingModal(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 self-start md:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Book New Demo</span>
        </button>
      </div>

      {/* 4 Metric Cards in a Row: Showing Current Stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {/* Card 1: PENDING ASSIGNMENT */}
        <div 
          onClick={() => setActiveFilter('pending')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
            activeFilter === 'pending' ? 'ring-2 ring-amber-400 border-amber-300' : 'border-slate-200/90 hover:border-amber-300'
          } border-l-4 border-l-amber-500`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 font-mono">
              STAGE 1 • AWAITING FACULTY
            </div>
            <span className="text-xs">⏳</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-700 my-2">
            {stageMetrics.pendingCount}
          </div>
          <div className="text-xs text-amber-800 font-medium flex items-center justify-between">
            <span>With Trainer Head / Manager</span>
            <span className="text-[10px] underline">View →</span>
          </div>
        </div>

        {/* Card 2: TRAINER ASSIGNED & READY */}
        <div 
          onClick={() => setActiveFilter('assigned')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
            activeFilter === 'assigned' ? 'ring-2 ring-blue-400 border-blue-300' : 'border-slate-200/90 hover:border-blue-300'
          } border-l-4 border-l-blue-500`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800 font-mono">
              STAGE 2 • TRAINER ASSIGNED
            </div>
            <span className="text-xs">👨‍🏫</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-blue-700 my-2">
            {stageMetrics.assignedCount}
          </div>
          <div className="text-xs text-blue-800 font-medium flex items-center justify-between">
            <span>Faculty allocated</span>
            <span className="text-[10px] underline">View →</span>
          </div>
        </div>

        {/* Card 3: CONFIRMED & LINK READY */}
        <div 
          onClick={() => setActiveFilter('confirmed')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
            activeFilter === 'confirmed' ? 'ring-2 ring-cyan-400 border-cyan-300' : 'border-slate-200/90 hover:border-cyan-300'
          } border-l-4 border-l-cyan-500`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-800 font-mono">
              STAGE 3 • LINK READY
            </div>
            <span className="text-xs">🔗</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-cyan-700 my-2">
            {stageMetrics.confirmedCount}
          </div>
          <div className="text-xs text-cyan-800 font-medium flex items-center justify-between">
            <span>Ready for student call</span>
            <span className="text-[10px] underline">View →</span>
          </div>
        </div>

        {/* Card 4: ATTENDED & CONVERTING */}
        <div 
          onClick={() => setActiveFilter('attended')}
          className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs transition-all cursor-pointer flex flex-col justify-between ${
            activeFilter === 'attended' || activeFilter === 'fee' ? 'ring-2 ring-emerald-400 border-emerald-300' : 'border-slate-200/90 hover:border-emerald-300'
          } border-l-4 border-l-emerald-500`}
        >
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 font-mono">
              STAGE 4 &amp; 5 • ATTENDED / FEE
            </div>
            <span className="text-xs">🎉</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 my-2">
            {stageMetrics.attendedCount + stageMetrics.feeCount}
          </div>
          <div className="text-xs text-emerald-800 font-medium flex items-center justify-between">
            <span>{stageMetrics.attendedCount} Attended · {stageMetrics.feeCount} in Fee Talk</span>
            <span className="text-[10px] underline">View →</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#0e6977] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Demos ({demos.length})
          </button>

          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>⏳ Pending Assignment</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.pendingCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('assigned')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'assigned'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span>👨‍🏫 Trainer Assigned</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.assignedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'confirmed'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100'
            }`}
          >
            <span>🔗 Link Ready</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.confirmedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('attended')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'attended'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span>🎉 Attended</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.attendedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('fee')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'fee'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
            }`}
          >
            <span>💰 Fee Discussion</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.feeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('missed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilter === 'missed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span>⚠️ Missed / No-Show</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {stageMetrics.missedCount}
            </span>
          </button>
        </div>

        {/* Search & View Toggle Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate, phone, faculty..."
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-[#0e6977] w-48 sm:w-60 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              title="Card View"
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Pipeline Table View"
              className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Demos List Section */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>Demos Queue ({filteredDemos.length})</span>
            {activeFilter !== 'all' && (
              <span className="text-[11px] font-normal text-slate-400 lowercase">
                filtered by {activeFilter}
              </span>
            )}
          </div>
          {filteredDemos.length > 0 && (
            <span className="text-[11px] text-slate-400 font-medium">
              Showing all demo lifecycle stages
            </span>
          )}
        </div>

        {/* Empty state */}
        {filteredDemos.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 text-xl">
              🗓️
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">No demo sessions found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No demos match "${searchQuery}". Try clearing your search.`
                : activeFilter !== 'all'
                ? `No demos currently in the "${activeFilter}" stage.`
                : 'Click "+ Book New Demo" above to schedule candidate sessions.'}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                className="mt-3 text-xs font-bold text-[#0e6977] hover:underline cursor-pointer"
              >
                Clear filters to show all demos
              </button>
            )}
          </div>
        )}

        {/* ===================== 1. GRID VIEW ===================== */}
        {viewMode === 'grid' && filteredDemos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDemos.map((demo) => {
              const stage = getDemoStage(demo);
              const hasTrainer = Boolean(demo.trainer && demo.trainer !== 'Unassigned');
              const hasLink = Boolean(demo.link || demo.zoomMeetingId);

              return (
                <div
                  key={demo._id || demo.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 ${
                    stage.cardBorder || 'border-slate-200/90'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Candidate Info & Stage Tag */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-sm">{demo.candidateName}</h4>
                          {demo.outsideFixedTiming && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              ⏰ Custom Time
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                          <span>{demo.phone}</span>
                          {demo.email && <span className="text-slate-400 font-sans truncate max-w-[140px]">· {demo.email}</span>}
                        </div>
                      </div>

                      {/* Active Stage Badge */}
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border shrink-0 ${stage.badgeClass}`}>
                        {stage.stageTag}
                      </span>
                    </div>

                    {/* Course & Timing Info */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="text-xs text-slate-800 font-bold">
                        {demo.course}
                      </div>
                      {isSpecialtyCourse(demo.course) ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          🎯 Specialty Demo
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          ⚡ Fresher Demo
                        </span>
                      )}
                    </div>

                    {/* Date, Time Slot & Mode */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">
                          {[demo.preferredDate, demo.timeSlot].filter(Boolean).join(' ') || demo.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{demo.mode || 'Online (Zoom Live)'}</span>
                      </div>
                    </div>

                    {/* ================= STAGE PROGRESS TRACKER ================= */}
                    <div className="pt-1 pb-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                        <span className="uppercase tracking-wider">LIFECYCLE STAGE</span>
                        <span className="font-bold text-slate-800">{stage.label}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1 items-center">
                        {STAGES.map((s) => {
                          const isPast = !stage.isMissed && stage.step > s.step;
                          const isCurrent = !stage.isMissed && stage.step === s.step;
                          return (
                            <div key={s.step} className="flex flex-col items-center">
                              <div
                                className={`w-full h-1.5 rounded-full transition-all ${
                                  isPast
                                    ? 'bg-emerald-500'
                                    : isCurrent
                                    ? 'bg-[#0e6977] ring-2 ring-teal-300 animate-pulse'
                                    : 'bg-slate-200'
                                }`}
                              />
                              <span
                                className={`text-[9px] mt-1 text-center truncate max-w-full font-semibold ${
                                  isCurrent
                                    ? 'text-[#0e6977] font-black'
                                    : isPast
                                    ? 'text-emerald-700'
                                    : 'text-slate-400'
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stage Status Box & Explanation */}
                    <div className="text-[11px] p-2.5 rounded-xl border space-y-1.5 bg-slate-50/70 border-slate-200/80">
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs shrink-0 mt-0.5">
                          {stage.step === 1 ? '⏳' : stage.step === 2 ? '👨‍🏫' : stage.step === 3 ? '🔗' : stage.step >= 4 ? '🎉' : '⚠️'}
                        </span>
                        <div className="leading-tight">
                          <div className="font-bold text-slate-900">
                            {stage.description}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            {demo.language && <span>Language: <b>{demo.language}</b> · </span>}
                            {demo.location && <span>Branch: <b>{demo.location}</b> · </span>}
                            {demo.bookedBy && <span>Booked By: <b>{demo.bookedBy}</b></span>}
                          </div>
                        </div>
                      </div>

                      {/* Faculty Info Callout */}
                      <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10.5px]">
                        <span className="text-slate-500 font-medium">Faculty Assigned:</span>
                        {hasTrainer ? (
                          <span className="font-extrabold text-[#0e6977] flex items-center gap-1">
                            <span>{demo.trainer}</span>
                            {demo.trainerId && <span className="font-mono text-[9px] text-slate-400">({demo.trainerId})</span>}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Awaiting Trainer Head / Manager
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meeting Link & WhatsApp Share Box (When Available) */}
                    {hasLink ? (
                      <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-[10.5px] font-extrabold text-cyan-900 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 text-cyan-700" />
                            <span>Live Zoom / Session Room Ready</span>
                          </div>
                          <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-cyan-200 text-cyan-900">
                            Active
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={demo.link || demo.zoomJoinUrl || ''}
                            className="bg-white border border-cyan-200 text-[10px] rounded-lg px-2 py-1 w-full text-slate-600 font-mono truncate"
                          />
                          <button
                            type="button"
                            onClick={() => copyToClipboard(demo.link || demo.zoomJoinUrl, '✓ Zoom Link Copied!')}
                            title="Copy link"
                            className="p-1.5 rounded-lg bg-white hover:bg-cyan-100 border border-cyan-300 text-cyan-800 transition-colors shrink-0 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleShareWhatsApp(demo)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Share on WhatsApp</span>
                          </button>
                          <a
                            href={demo.link || demo.zoomJoinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-all shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2 text-center text-[10px] text-slate-400">
                        {hasTrainer 
                          ? 'Session link will be generated once trainer starts or schedules room' 
                          : 'Meeting link will be created once Trainer Head / Manager assigns faculty'}
                      </div>
                    )}

                    {demo.note && (
                      <div className="text-[10.5px] text-slate-500 italic px-1">
                        "{demo.note}"
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                    {st(demo) === 'booked' && (
                      <button
                        onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                        className="col-span-2 bg-[#0e6977] hover:bg-[#0a4f5a] text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Confirm &amp; Link</span>
                      </button>
                    )}

                    {st(demo) === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(demo._id || demo.id, 'attended', demo.candidateName)}
                        className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Mark Attended</span>
                      </button>
                    )}

                    {st(demo) === 'attended' && (
                      <button
                        onClick={() => updateStatus(demo._id || demo.id, 'fee', demo.candidateName)}
                        className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Move to Fee Talk</span>
                      </button>
                    )}

                    {(st(demo) === 'fee' || st(demo) === 'missed') && (
                      <button
                        onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                        className="col-span-2 bg-slate-800 hover:bg-slate-900 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Re-Schedule Demo</span>
                      </button>
                    )}

                    <button
                      onClick={() => updateStatus(demo._id || demo.id, 'missed', demo.candidateName)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <span>No-Show</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ===================== 2. TABLE VIEW ===================== */}
        {viewMode === 'table' && filteredDemos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5">Candidate</th>
                  <th className="py-3 px-3.5">Course &amp; Branch</th>
                  <th className="py-3 px-3.5">Date &amp; Slot</th>
                  <th className="py-3 px-3.5">Current Stage</th>
                  <th className="py-3 px-3.5">Assigned Faculty</th>
                  <th className="py-3 px-3.5">Meeting Link / WhatsApp</th>
                  <th className="py-3 px-3.5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDemos.map((demo) => {
                  const stage = getDemoStage(demo);
                  const hasTrainer = Boolean(demo.trainer && demo.trainer !== 'Unassigned');
                  const hasLink = Boolean(demo.link || demo.zoomMeetingId);

                  return (
                    <tr key={demo._id || demo.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Candidate */}
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        <div>{demo.candidateName}</div>
                        <div className="text-[11px] font-mono font-normal text-slate-400">{demo.phone}</div>
                      </td>

                      {/* Course */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{demo.course}</div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {demo.location || demo.branch || 'Headquarters'}
                          {demo.language && ` · ${demo.language}`}
                        </div>
                      </td>

                      {/* Slot */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800">{demo.preferredDate || 'TBD'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{demo.timeSlot || demo.time || 'General'}</div>
                      </td>

                      {/* Current Stage */}
                      <td className="py-3 px-3.5">
                        <span className={`inline-flex items-center gap-1 text-[10.5px] font-black uppercase px-2.5 py-1 rounded-lg border ${stage.badgeClass}`}>
                          <span>{stage.label}</span>
                        </span>
                        <div className="text-[9.5px] text-slate-400 mt-0.5 max-w-[200px] truncate">
                          {stage.description}
                        </div>
                      </td>

                      {/* Faculty */}
                      <td className="py-3 px-3.5">
                        {hasTrainer ? (
                          <div className="font-extrabold text-[#0e6977]">
                            {demo.trainer}
                            {demo.trainerId && <span className="block font-mono text-[10px] text-slate-400 font-normal">({demo.trainerId})</span>}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Awaiting Assignment
                          </span>
                        )}
                      </td>

                      {/* Meeting Link / WhatsApp */}
                      <td className="py-3 px-3.5">
                        {hasLink ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(demo)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Share session info on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(demo.link || demo.zoomJoinUrl, '✓ Zoom link copied!')}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Copy Zoom link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No link yet</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {st(demo) === 'booked' && (
                            <button
                              onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                              className="px-2.5 py-1 rounded-lg bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-[10.5px] cursor-pointer"
                            >
                              Confirm
                            </button>
                          )}
                          {st(demo) === 'confirmed' && (
                            <button
                              onClick={() => updateStatus(demo._id || demo.id, 'attended', demo.candidateName)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10.5px] cursor-pointer"
                            >
                              Attended
                            </button>
                          )}
                          {st(demo) === 'attended' && (
                            <button
                              onClick={() => updateStatus(demo._id || demo.id, 'fee', demo.candidateName)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10.5px] cursor-pointer"
                            >
                              Fee Talk
                            </button>
                          )}
                          {(st(demo) === 'fee' || st(demo) === 'missed') && (
                            <button
                              onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10.5px] cursor-pointer"
                            >
                              Reschedule
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book New Demo Modal */}
      <BookNewDemoModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        currentUser={currentUser}
        initialData={{
          studentName: '',
          mobile: '',
          course: 'CPC',
          mode: 'Online (Zoom Live)',
          timeSlot: '4:00–6:00 PM',
          language: 'Tamil',
          location: branchShort || 'Gandhipuram'
        }}
        onConfirm={async (demoData) => {
          try {
            const created = await createDemo({
              ...demoData,
              candidateName: demoData.studentName || demoData.candidateName,
              phone: demoData.mobile || demoData.phone,
              course: demoData.course,
              mode: demoData.mode,
              time: `${demoData.preferredDate || 'Today'} ${demoData.timeSlot}`,
              timeSlot: demoData.timeSlot,
              language: demoData.language,
              location: demoData.location,
              status: 'booked',
              bookedBy: currentUser?.name || currentUser?.userName || '',
              note: `Language: ${demoData.language} · Location: ${demoData.location}`
            });
            setDemos(prev => [created, ...prev]);
            if (onRefreshDemos) onRefreshDemos();
            showToast(`✓ Booked Demo for ${created.candidateName}! Moved to Trainer Head & Manager for trainer assignment.`);
          } catch (err) {
            console.error('Failed to book demo:', err);
            showToast(err?.response?.data?.error || 'Error saving demo to database');
          }
        }}
      />
    </div>
  );
}
