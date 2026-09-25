import React, { useState, useEffect } from 'react';
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
  Phone
} from 'lucide-react';
import BookNewDemoModal from './BookNewDemoModal';

import { getDemos, createDemo, updateDemo } from '../services/api';

export default function HrDemoDesk({ demos: propDemos, onRefreshDemos, onBookDemoClick, currentUser }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all, booked, confirmed, attended, missed, fee
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [demos, setDemos] = useState(propDemos || []);

  useEffect(() => {
    if (propDemos && propDemos.length > 0) {
      setDemos(propDemos);
    } else {
      getDemos()
        .then(res => {
          if (Array.isArray(res)) setDemos(res);
        })
        .catch(err => console.error('Error fetching demos:', err));
    }
  }, [propDemos]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDemo(id, { status: newStatus });
      setDemos(prev => prev.map(d => (d._id === id || d.id === id) ? { ...d, status: newStatus } : d));
      if (onRefreshDemos) onRefreshDemos();
      showToast(`✓ Demo marked as "${newStatus.toUpperCase()}"`);
    } catch (err) {
      console.error('Failed to update demo:', err);
      showToast('Error updating demo status');
    }
  };

  // Form state for booking new demo
  const [newDemo, setNewDemo] = useState({
    candidateName: '',
    phone: '',
    course: '',
    mode: 'Online (Zoom Live)',
    time: '',
    note: ''
  });

  const handleCreateDemo = async (e) => {
    e.preventDefault();
    if (!newDemo.candidateName || !newDemo.phone) {
      showToast('Please fill in candidate name and phone number');
      return;
    }

    try {
      const created = await createDemo({
        candidateName: newDemo.candidateName,
        phone: newDemo.phone,
        course: newDemo.course,
        mode: newDemo.mode,
        time: newDemo.time,
        status: 'booked',
        bookedBy: currentUser?.name || currentUser?.userName || '',
        note: newDemo.note
      });

      setDemos([created, ...demos]);
      if (onRefreshDemos) onRefreshDemos();
      setShowBookingModal(false);
      setNewDemo({
        candidateName: '',
        phone: '',
        course: '',
        mode: 'Online (Zoom Live)',
        time: '',
        note: ''
      });
      showToast(`✓ Booked Demo for ${created.candidateName}! Dispatched to course expert trainer.`);
    } catch (err) {
      console.error('Failed to create demo:', err);
      showToast('Error booking demo in database');
    }
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
      confirmed: 'Confirmed & Link Sent',
      attended: 'Marked Attended',
      fee: 'Moved to Fee Discussion',
      missed: 'Flagged as Missed / No-Show'
    };
    showToast(`${candidateName}: ${labelMap[newStatus] || newStatus}`);
  };

  // Metrics
  // Status is normalised to lowercase (older records may be "Attended" / "Missed")
  const st = (d) => String(d.status || '').toLowerCase();
  const todayKey = new Date().toISOString().split('T')[0];
  const demosToday = demos.filter(d => d.preferredDate === todayKey || String(d.time || '').toLowerCase().includes('today')).length;
  const attendedCount = demos.filter(d => st(d) === 'attended').length;
  const movedToFeeCount = demos.filter(d => st(d) === 'fee').length;
  const missedCount = demos.filter(d => st(d) === 'missed').length;

  const filteredDemos = demos.filter(d => {
    if (activeFilter === 'all') return true;
    return st(d) === activeFilter;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-cyan-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title & Subtitle */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Demo Desk
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 font-mono">
          Track every demo from booked → confirmed → attended → moved to fee discussion. Confirm today's demos so they show up.
        </p>
      </div>

      {/* Filter Pills Row & + Book New Demo Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'all'
                ? 'bg-[#0e6977] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setActiveFilter('booked')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'booked'
                ? 'bg-[#0e6977] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Booked
          </button>

          <button
            onClick={() => setActiveFilter('confirmed')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'confirmed'
                ? 'bg-[#0e6977] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Confirmed
          </button>

          <button
            onClick={() => setActiveFilter('attended')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'attended'
                ? 'bg-[#0e6977] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Attended
          </button>

          <button
            onClick={() => setActiveFilter('missed')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'missed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Missed / No-show
          </button>

          <button
            onClick={() => setActiveFilter('fee')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === 'fee'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Moved to Fee
          </button>
        </div>

        {/* Action Button: + Book New Demo */}
        <button
          onClick={() => setShowBookingModal(true)}
          className="flex-shrink-0 flex items-center gap-1.5 bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs px-4 py-2 rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Book New Demo</span>
        </button>
      </div>

      {/* 4 Metric Cards in a Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        {/* Card 1: DEMOS TODAY */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-cyan-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            DEMOS TODAY
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {demosToday}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            confirm + send links
          </div>
        </div>

        {/* Card 2: ATTENDED */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-teal-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ATTENDED
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 my-2">
            {attendedCount}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            awaiting fee talk
          </div>
        </div>

        {/* Card 3: MOVED TO FEE */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            MOVED TO FEE
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#15803d] my-2">
            {movedToFeeCount}
          </div>
          <div className="text-xs text-[#15803d] font-mono font-bold">
            converting
          </div>
        </div>

        {/* Card 4: MISSED / NO-SHOW */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            MISSED / NO-SHOW
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 my-2">
            {missedCount}
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            flagged by trainer · reschedule
          </div>
        </div>
      </div>

      {/* Scheduled Demos Queue */}
      <div className="pt-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>Scheduled Demos</span>
            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[11px]">
              {filteredDemos.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredDemos.map((demo) => {
            const statusConfig = {
              booked: { label: 'BOOKED', class: 'bg-blue-50 text-blue-700 border-blue-200' },
              confirmed: { label: 'CONFIRMED', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              attended: { label: 'ATTENDED', class: 'bg-teal-50 text-teal-700 border-teal-200' },
              fee: { label: 'MOVED TO FEE', class: 'bg-purple-50 text-purple-700 border-purple-200' },
              missed: { label: 'NO-SHOW', class: 'bg-rose-50 text-rose-700 border-rose-200' }
            }[st(demo)] || { label: demo.status, class: 'bg-slate-100 text-slate-700 border-slate-200' };

            return (
              <div
                key={demo._id || demo.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-all space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{demo.candidateName}</h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{demo.phone}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${statusConfig.class}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium">
                    {demo.course}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{[demo.preferredDate, demo.timeSlot].filter(Boolean).join(' ') || demo.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{demo.mode}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-700 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 flex items-start gap-1.5">
                    <span className="text-xs">🎯</span>
                    <div className="leading-tight">
                      <div>Trainer: <strong className="text-slate-900 font-bold">{demo.trainer || 'Unassigned'}</strong> {demo.trainerId && <span className="text-[10px] font-mono text-slate-500">({demo.trainerId})</span>}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">{demo.language || ''}{demo.language && demo.location ? ' · ' : ''}{demo.location || ''}</div>
                      <div className="text-[10px] font-semibold mt-0.5">
                        {demo.notificationRead
                          ? <span className="text-emerald-700">✓ Trainer accepted the slot</span>
                          : demo.notificationSent ? <span className="text-amber-700">Awaiting trainer acceptance</span> : null}
                      </div>
                    </div>
                  </div>

                  {/* Demo Booking Notification Requirement status */}
                  {demo.notificationSent === true ? (
                    <div className="text-[10.5px] text-emerald-900 bg-emerald-50/90 p-2 rounded-xl border border-emerald-200 space-y-0.5">
                      <div className="font-extrabold flex items-center gap-1 text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                          Notified {demo.notifiedTrainerNames?.length > 1 ? `${demo.notifiedTrainerNames.length} Trainers` : 'Trainer'}
                        </span>
                      </div>
                      <div className="text-[9.5px] text-emerald-700 font-semibold">
                        {demo.notifiedTrainerNames?.length ? demo.notifiedTrainerNames.join(', ') : demo.trainer}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10.5px] text-rose-900 bg-rose-50/90 p-2 rounded-xl border border-rose-200 space-y-0.5">
                      <div className="font-extrabold flex items-center gap-1 text-rose-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                        <span>Notification Suppressed</span>
                      </div>
                      <div className="text-[9.5px] text-rose-700 font-medium leading-tight">
                        {demo.notificationBlockReason || demo.noEligibleTrainerReason || 'No trainer matched this language, location & time slot.'}
                      </div>
                    </div>
                  )}

                  {demo.note && (
                    <div className="text-[10.5px] text-slate-500 italic">
                      "{demo.note}"
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 text-[10px] font-bold">
                  {st(demo) === 'booked' && (
                    <button
                      onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                      className="col-span-2 bg-[#0e6977] hover:bg-[#0a4f5a] text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Confirm & Link</span>
                    </button>
                  )}

                  {st(demo) === 'confirmed' && (
                    <button
                      onClick={() => updateStatus(demo._id || demo.id, 'attended', demo.candidateName)}
                      className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>Mark Attended</span>
                    </button>
                  )}

                  {st(demo) === 'attended' && (
                    <button
                      onClick={() => updateStatus(demo._id || demo.id, 'fee', demo.candidateName)}
                      className="col-span-2 bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Move to Fee Talk</span>
                    </button>
                  )}

                  {(st(demo) === 'fee' || st(demo) === 'missed') && (
                    <button
                      onClick={() => updateStatus(demo._id || demo.id, 'confirmed', demo.candidateName)}
                      className="col-span-2 bg-slate-800 hover:bg-slate-900 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Re-Schedule</span>
                    </button>
                  )}

                  <button
                    onClick={() => updateStatus(demo._id || demo.id, 'missed', demo.candidateName)}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <span>No-Show</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Book New Demo Modal */}
      <BookNewDemoModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        initialData={{
          studentName: '',
          mobile: '',
          course: 'CPC',
          mode: 'Online (Zoom Live)',
          timeSlot: '4:00–6:00 PM',
          language: 'Tamil'
        }}
        onConfirm={async (demoData) => {
          try {
            // The server is the single source of truth for trainer matching &
            // the notification decision (language + location + free time +
            // "Experienced in Demo" + active) — the modal only sends the
            // student's booking criteria.
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
            if (created.notificationSent) {
              const names = created.notifiedTrainerNames?.length ? created.notifiedTrainerNames.join(', ') : created.trainer;
              showToast(`✓ Booked Demo for ${created.candidateName}! Notification sent to ${names}.`);
            } else {
              showToast(`✓ Booked Demo for ${created.candidateName}. Notification not sent: ${created.notificationBlockReason || created.noEligibleTrainerReason || 'No matching trainer'}`);
            }
          } catch (err) {
            console.error('Failed to book demo:', err);
            showToast(err?.response?.data?.error || 'Error saving demo to database');
          }
        }}
      />
    </div>
  );
}
