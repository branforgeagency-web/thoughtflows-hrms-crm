import React, { useState } from 'react';
import {
  Shuffle,
  Users,
  GraduationCap,
  HeartHandshake,
  Megaphone,
  LifeBuoy,
  Check,
  Bell,
  ArrowRight
} from 'lucide-react';
import { sendStaffReminder } from '../services/api';

const DEPARTMENT_BLUEPRINTS = [
  {
    id: 'hr',
    code: 'DEP-HR-001',
    dashboard: 'hr',
    title: 'Head of HR',
    defaultRole: 'HR & Admissions Head',
    icon: Users,
    iconBg: '#581C87',
    iconColor: 'text-purple-100',
    matcher: (code) => /^(DEP-HR-001|HR|ADM)$/i.test(code || '')
  },
  {
    id: 'training',
    code: 'ACAD',
    dashboard: 'training',
    title: 'Head of Training',
    defaultRole: 'Faculty & Regional Heads',
    icon: GraduationCap,
    iconBg: '#2563EB',
    iconColor: 'text-blue-100',
    matcher: (code) => /^(ACAD|TRAIN|TRAINING)$/i.test(code || '')
  },
  {
    id: 'cccp',
    code: 'CCCP',
    dashboard: 'cccp',
    title: 'Head of CCCP / Placement',
    defaultRole: 'Corporate Relations & Placement',
    icon: HeartHandshake,
    iconBg: '#059669',
    iconColor: 'text-emerald-100',
    matcher: (code) => /^(CCCP|CORP|EXAM|PLACEMENT)$/i.test(code || '')
  },
  {
    id: 'marketing',
    code: 'MKT',
    dashboard: 'marketing',
    title: 'Head of Marketing',
    defaultRole: 'Growth & Campaigns Head',
    icon: Megaphone,
    iconBg: '#D97706',
    iconColor: 'text-amber-100',
    matcher: (code) => /^(MKT|MARKETING|GROWTH)$/i.test(code || '')
  },
  {
    id: 'student',
    code: 'DEP-STU-001',
    dashboard: 'student',
    title: 'Head of Student Support',
    defaultRole: 'Student Mentorship & Success',
    icon: LifeBuoy,
    iconBg: '#DB2777',
    iconColor: 'text-pink-100',
    matcher: (code) => /^(DEP-STU-001|STU|SUCC|STUDENT)$/i.test(code || '')
  }
];

export default function DepartmentCoordinationBoard({
  onSelectDept,
  onSwitchDepartment,
  departments = [],
  approvals = [],
  escalations = [],
  tasks = [],
  className = ''
}) {
  const [remindedMap, setRemindedMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const handleRemind = async (dept) => {
    setRemindedMap((prev) => ({ ...prev, [dept.id]: true }));
    const headName = dept.head || dept.title;

    try {
      await sendStaffReminder({
        name: headName,
        departmentCode: dept.code,
        message: `Operations Command Desk reminder: ${dept.approvalsCount} pending approvals, ${dept.escalationsCount} escalations requiring your review.`
      });
      setToastMessage(`Live notification sent to ${headName}`);
    } catch (err) {
      setToastMessage(`Reminder recorded for ${headName}`);
    }

    setTimeout(() => {
      setToastMessage(null);
    }, 3500);

    setTimeout(() => {
      setRemindedMap((prev) => ({ ...prev, [dept.id]: false }));
    }, 6000);
  };

  // Merge live database collections dynamically
  const liveCoordinationRows = DEPARTMENT_BLUEPRINTS.map((bp) => {
    const liveDept = (departments || []).find(
      (d) => bp.matcher(d.code) || d.dashboard === bp.dashboard || d.name?.toLowerCase().includes(bp.id)
    );

    const pendingApprovals = (approvals || []).filter(
      (a) => a.status === 'pending' && bp.matcher(a.departmentCode)
    ).length;

    const openEscalations = (escalations || []).filter(
      (e) => !['resolved', 'closed'].includes(e.status) && bp.matcher(e.departmentCode)
    ).length;

    const delayedWork = (tasks || []).filter(
      (t) => t.status === 'delayed' && bp.matcher(t.departmentCode)
    ).length;

    const assignedHead = liveDept?.head || (liveDept?.members?.find((m) => /head|lead|manager/i.test(m.role || ''))?.name) || bp.defaultRole;

    const isCritical = openEscalations > 0 || delayedWork > 0;
    const hasPending = pendingApprovals > 0;

    let statusText = 'On Track';
    let statusClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';

    if (isCritical) {
      statusText = 'Critical';
      statusClass = 'text-rose-500 bg-rose-50 border-rose-100';
    } else if (hasPending) {
      statusText = 'Action Needed';
      statusClass = 'text-amber-700 bg-amber-50 border-amber-200';
    }

    return {
      ...bp,
      head: assignedHead,
      approvalsCount: pendingApprovals,
      escalationsCount: openEscalations,
      delayedCount: delayedWork,
      status: statusText,
      statusClass,
      memberCount: liveDept?.memberCount || 0
    };
  });

  return (
    <div className={`relative bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-2xs space-y-5 ${className}`}>
      {/* Real-time Toast Feedback */}
      {toastMessage && (
        <div className="absolute top-4 right-6 z-20 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg animate-fadeIn">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <Shuffle className="w-4 h-4" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Department Coordination
          </h3>
        </div>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Daily status of every department · Live from system database
        </p>
      </div>

      {/* Dynamic Department Rows */}
      <div className="space-y-3">
        {liveCoordinationRows.map((dept) => {
          const Icon = dept.icon;
          const isReminded = remindedMap[dept.id];

          return (
            <div
              key={dept.id}
              onClick={() => onSelectDept && onSelectDept(dept.dashboard || dept.id)}
              className={`group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-center justify-between gap-4 transition-all ${
                onSelectDept ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
              }`}
            >
              {/* Left Column: Avatar + Texts */}
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: dept.iconBg }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate flex items-center gap-1.5">
                    <span>{dept.title}</span>
                    {onSelectDept && (
                      <ArrowRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    )}
                  </div>
                  <div className="text-xs text-slate-400 font-medium truncate mt-0.5">
                    {dept.head}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>{dept.approvalsCount} approvals</span>
                    <span className="text-slate-300">·</span>
                    <span>{dept.escalationsCount} escalations</span>
                    <span className="text-slate-300">·</span>
                    <span>{dept.delayedCount} delayed</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Status Badge + Remind Button */}
              <div className="flex flex-col items-end justify-center gap-2 flex-shrink-0">
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide font-mono border ${dept.statusClass}`}>
                  {dept.status}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemind(dept);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isReminded
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200/90'
                  }`}
                  title={`Send real-time reminder to ${dept.head}`}
                >
                  {isReminded ? (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Reminded</span>
                    </span>
                  ) : (
                    'Remind'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
