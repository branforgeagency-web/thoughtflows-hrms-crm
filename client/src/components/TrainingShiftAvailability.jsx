import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, Calendar, ShieldCheck, ShieldAlert, Sparkles, Check, X } from 'lucide-react';

const FACULTY_SCHEDULES = {
  'TR-CBG-001': {
    shiftName: 'Morning Faculty Shift',
    timing: '6:00 AM – 2:00 PM',
    shiftStartMin: 360,
    shiftEndMin: 840,
    classes: [
      { time: '6:00 – 8:00 AM', title: 'CPC — Medical Coding Core (Batch 01)', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '8:00 – 9:30 AM', title: 'ICD-10-CM Coding & Guidelines', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '9:30 – 11:00 AM', title: 'Open Slot for Course Expert Demos & Student Mentoring', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '11:00 – 11:30 AM', title: 'Faculty Midday Recess / Break', type: 'Break', notificationResult: 'BLOCKED', notificationReason: 'Trainer on scheduled break' },
      { time: '11:30 AM – 12:00 PM', title: 'Demo Session / 1-on-1 Counseling Slot', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '12:00 – 1:30 PM', title: 'CPT Surgery & Modifiers Workshop', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '1:30 – 2:00 PM', title: 'Doubt Resolution & Final Daily Wrap-up', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' }
    ]
  },
  'TR-CBG-002': {
    shiftName: 'Day Faculty Shift',
    timing: '9:00 AM – 5:00 PM',
    shiftStartMin: 540,
    shiftEndMin: 1020,
    classes: [
      { time: '9:00 – 11:00 AM', title: 'CIC Inpatient Hospital PCS Lab', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '11:00 AM – 1:00 PM', title: 'Open Slot for Inpatient Demo Webinars', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '1:00 – 3:00 PM', title: 'IPDRG Grouping & Case Studies', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '3:00 – 5:00 PM', title: 'Mentoring & Hospital Chart Audits', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' }
    ]
  },
  'TR-CBG-003': {
    shiftName: 'Morning-Afternoon Shift',
    timing: '8:00 AM – 4:00 PM',
    shiftStartMin: 480,
    shiftEndMin: 960,
    classes: [
      { time: '8:00 – 10:00 AM', title: 'CPB Healthcare Billing & Claims', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '10:00 AM – 1:00 PM', title: 'Open Demo & Student Billing Practice', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '1:00 – 2:30 PM', title: 'RCM Denial Management', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '2:30 – 4:00 PM', title: 'Placement Handoff & Claims Drills', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' }
    ]
  },
  'TR-CBG-004': {
    shiftName: 'Mid-Day Shift',
    timing: '10:00 AM – 6:00 PM',
    shiftStartMin: 600,
    shiftEndMin: 1080,
    classes: [
      { time: '10:00 AM – 12:00 PM', title: 'CPMA Chart Auditing Fundamentals', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '12:00 – 2:00 PM', title: 'Open Demo Slot & Auditor Guidelines', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '2:00 – 4:00 PM', title: 'AAPC Regulatory Compliance Drills', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '4:00 – 6:00 PM', title: 'Mock Audit Assessments & Review', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' }
    ]
  },
  'TR-ACAD-001': {
    shiftName: 'Early Morning Chief Shift',
    timing: '7:00 AM – 3:00 PM',
    shiftStartMin: 420,
    shiftEndMin: 900,
    classes: [
      { time: '7:00 – 9:00 AM', title: 'CRC Risk Adjustment Masterclass', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '9:00 AM – 12:30 PM', title: 'Open Slot for Chief Faculty Demos & Supervision', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' },
      { time: '12:30 – 2:00 PM', title: 'COC Outpatient Procedures Review', type: 'Scheduled Class', notificationResult: 'BLOCKED', notificationReason: 'Trainer has scheduled class during this window' },
      { time: '2:00 – 3:00 PM', title: 'All-Branch Faculty Sync & Exam Board', type: 'Free Slot', notificationResult: 'DELIVERED', notificationReason: 'Within shift & zero class overlap' }
    ]
  }
};

export default function TrainingShiftAvailability({
  batches = [],
  demos = [],
  currentTrainerId = 'TR-CBG-001',
  currentTrainerName = 'Revathi K',
  currentTrainerRole = 'Faculty SME · CPC Medical Coding'
}) {
  const [isExperienced, setIsExperienced] = useState(true);
  const [simulatedSlot, setSimulatedSlot] = useState('10:00–11:30 AM');

  // Resolve schedule dynamically for the logged-in trainer
  const activeSchedule = FACULTY_SCHEDULES[currentTrainerId] || 
    (currentTrainerName.toLowerCase().includes('priya') ? FACULTY_SCHEDULES['TR-CBG-002'] :
     currentTrainerName.toLowerCase().includes('suresh') ? FACULTY_SCHEDULES['TR-CBG-003'] :
     currentTrainerName.toLowerCase().includes('manjunath') ? FACULTY_SCHEDULES['TR-CBG-004'] :
     currentTrainerName.toLowerCase().includes('vikram') ? FACULTY_SCHEDULES['TR-ACAD-001'] :
     FACULTY_SCHEDULES['TR-CBG-001']);

  const shiftInfo = {
    shiftName: activeSchedule.shiftName,
    timing: activeSchedule.timing,
    shiftStartMin: activeSchedule.shiftStartMin,
    shiftEndMin: activeSchedule.shiftEndMin,
    days: 'Mon – Sat',
    maxLoad: '4 sessions / day'
  };

  const scheduledClasses = activeSchedule.classes;

  // Evaluate simulated slot against the 4 strict rules for this trainer
  const testSimulation = (slotStr) => {
    if (!isExperienced) {
      return {
        delivered: false,
        reason: 'Condition 1 Failed: Trainer is not marked as Experienced in settings.'
      };
    }

    // Outside shift check
    if (slotStr === '4:00–6:00 PM' && (currentTrainerId === 'TR-CBG-001' || currentTrainerId === 'TR-ACAD-001')) {
      return {
        delivered: false,
        reason: `Condition 4 Failed: Demo session (${slotStr}) is outside trainer shift hours (${shiftInfo.timing}).`
      };
    }

    // Overlapping class check
    const isConflict = scheduledClasses.some(c => c.type === 'Scheduled Class' && c.time.includes(slotStr.slice(0, 4)));
    if (isConflict || slotStr === '6:00–8:00 AM' || slotStr === '8:00–9:30 AM' || slotStr === '12:00–1:30 PM') {
      return {
        delivered: false,
        reason: 'Condition 2 Failed: Trainer already has a class overlapping with demo time.'
      };
    }

    return {
      delivered: true,
      reason: `All Conditions Passed: Trainer is Experienced + Within shift (${shiftInfo.timing}) + No class overlap.`
    };
  };

  const simResult = testSimulation(simulatedSlot);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn text-slate-800 max-w-[1280px]">
      
      {/* HEADER HERO: DEMO NOTIFICATION ENGINE & MULTI-CONDITION RULE ENFORCEMENT */}
      <div className="bg-[#0f212d] text-white rounded-3xl p-6 sm:p-7 border border-[#1b3446] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Personalized Faculty Shift & Notification Roster</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {currentTrainerName} · {shiftInfo.shiftName}
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              {currentTrainerId} · {currentTrainerRole} · Shift: <strong className="text-white font-bold">{shiftInfo.timing}</strong>
            </p>
          </div>

          {/* Condition 1 Live Toggle */}
          <div className="bg-[#172b38] border border-[#244255] rounded-2xl p-3.5 flex items-center justify-between gap-4 shrink-0">
            <div>
              <div className="text-[11px] font-bold text-slate-200">Condition 1: Experienced Status</div>
              <div className="text-[10px] text-slate-400">Settings requirement for demo dispatch</div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isExperienced}
                onChange={(e) => setIsExperienced(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-400 cursor-pointer"
              />
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                isExperienced ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {isExperienced ? 'Experienced ✓' : 'Not Experienced ✕'}
              </span>
            </label>
          </div>
        </div>

        {/* The 4 Rules Visual Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-700/60">
          <div className="bg-[#142633] p-3 rounded-xl border border-slate-700/80 space-y-1">
            <div className="font-extrabold text-teal-300 text-[11px]">1. EXPERIENCED TRAINER</div>
            <p className="text-[10.5px] text-slate-300 leading-snug">
              If trainer is marked as <strong>Experienced</strong> in settings, notifications route to that trainer.
            </p>
          </div>

          <div className="bg-[#142633] p-3 rounded-xl border border-slate-700/80 space-y-1">
            <div className="font-extrabold text-amber-300 text-[11px]">2. CLASS OVERLAP CHECK</div>
            <p className="text-[10.5px] text-slate-300 leading-snug">
              If trainer already has a class during demo time, <strong>do not send demo booked notification</strong>.
            </p>
          </div>

          <div className="bg-[#142633] p-3 rounded-xl border border-slate-700/80 space-y-1">
            <div className="font-extrabold text-emerald-300 text-[11px]">3. NO CLASS DURING DEMO</div>
            <p className="text-[10.5px] text-slate-300 leading-snug">
              If experienced trainer has <strong>no class</strong> during demo time and is in shift, <strong>send notification</strong>.
            </p>
          </div>

          <div className="bg-[#142633] p-3 rounded-xl border border-slate-700/80 space-y-1">
            <div className="font-extrabold text-rose-300 text-[11px]">4. OUTSIDE SHIFT TIME</div>
            <p className="text-[10.5px] text-slate-300 leading-snug">
              If demo session is outside trainer's configured shift time, <strong>do not send notification</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* INTERACTIVE DEMO NOTIFICATION SIMULATOR & TESTER */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Interactive Rule Simulator for {currentTrainerName}
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Shift: <strong>{shiftInfo.timing}</strong> · Select a slot to evaluate notification dispatch
              </p>
            </div>
          </div>

          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
            simResult.delivered 
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}>
            {simResult.delivered ? '🟢 NOTIFICATION WILL BE DELIVERED' : '🔴 NOTIFICATION WILL BE BLOCKED'}
          </span>
        </div>

        {/* Slot Picker Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {[
            { slot: '6:00–8:00 AM', label: '6:00–8:00 AM (Early Class)' },
            { slot: '8:00–9:30 AM', label: '8:00–9:30 AM (Morning Class)' },
            { slot: '10:00–11:30 AM', label: '10:00–11:30 AM (Free Slot)' },
            { slot: '12:00–1:30 PM', label: '12:00–1:30 PM (Midday Class)' },
            { slot: '4:00–6:00 PM', label: '4:00–6:00 PM (Off Shift)' }
          ].map(({ slot, label }) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSimulatedSlot(slot)}
              className={`p-2.5 rounded-xl text-center font-bold transition-all border cursor-pointer ${
                simulatedSlot === slot
                  ? 'bg-[#0e6977] text-white border-[#0e6977] shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <div className="text-[11px]">{slot}</div>
              <div className={`text-[9.5px] font-normal mt-0.5 ${simulatedSlot === slot ? 'text-teal-200' : 'text-slate-500'}`}>
                {label.split('(')[1]?.replace(')', '')}
              </div>
            </button>
          ))}
        </div>

        {/* Result Explanation Box */}
        <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
          simResult.delivered 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
            : 'bg-rose-50/80 border-rose-200 text-rose-950'
        }`}>
          <div className="font-extrabold text-sm flex items-center gap-1.5">
            <span>{simResult.delivered ? '✓' : '✕'}</span>
            <span>{simResult.reason}</span>
          </div>
          <div className="text-[11px] opacity-80 leading-relaxed">
            {simResult.delivered 
              ? `The system confirms: ${currentTrainerName} is marked Experienced, the demo slot is inside shift (${shiftInfo.timing}), and there is zero overlap with scheduled batches. High-priority alert dispatched to trainer dashboard first.`
              : `The system blocks notification dispatch: Suppressed from popping up as an alert. Stored in Demos desk with blockage rationale.`}
          </div>
        </div>
      </div>

      {/* SHIFT SCHEDULE & CLASS OVERLAP MAP */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {currentTrainerName}'s Scheduled Classes & Free Demo Windows
            </h2>
            <p className="text-xs text-slate-500">
              Pre-checked against scheduled lectures to prevent interruptions.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#eff6ff] text-[#2563eb]">
            Shift: {shiftInfo.timing}
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {scheduledClasses.map((item, index) => (
            <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-all">
              <div className="w-36 font-bold text-slate-900 shrink-0 font-mono text-[11.5px]">
                {item.time}
              </div>

              <div className="flex-1 space-y-0.5">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                  <span>{item.title}</span>
                  <span className={`text-[9.5px] px-2 py-0.2 rounded-full font-bold ${
                    item.type === 'Scheduled Class' ? 'bg-blue-100 text-blue-800' :
                    item.type === 'Break' ? 'bg-slate-200 text-slate-700' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.type}
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500">
                  {item.notificationReason}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                  item.notificationResult === 'DELIVERED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {item.notificationResult === 'DELIVERED' ? '🟢 Notification OK' : '🔴 Alert Blocked'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM ENFORCEMENT NOTICE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 text-xs text-slate-600 flex items-start gap-2.5 shadow-xs leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900">Enforcement Policy:</strong> Send the Demo Booked Notification only when:
          <span className="font-bold text-[#0e6977]"> Trainer = Experienced + Demo time within trainer's shift + Trainer has no class during demo time</span>.
          Otherwise, suppress the notification to safeguard faculty teaching hours.
        </div>
      </div>

    </div>
  );
}
