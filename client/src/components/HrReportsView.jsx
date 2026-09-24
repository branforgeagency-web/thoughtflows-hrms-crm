import React, { useMemo } from 'react';
import {
  Users,
  PhoneCall,
  Clock,
  GraduationCap,
  TrendingUp,
  Monitor,
  BarChart2,
  PhoneOutgoing
} from 'lucide-react';

// Same stage set + colors the backend uses when it groups /leads into a
// pipeline (server: routes/api.js GET /leads), kept in sync so the report
// reads the same stage taxonomy as the rest of the CRM.
const STAGES = [
  { key: 'new', label: 'New / Not Yet Contacted', color: '#0f172a' },
  { key: 'contacted', label: 'Contacted / Follow-up', color: '#0284c7' },
  { key: 'demo_booked', label: 'Demo Booked', color: '#7c3aed' },
  { key: 'demo_attended', label: 'Demo Attended', color: '#059669' },
  { key: 'fee_followup', label: 'Fee Discussion', color: '#ea580c' },
  { key: 'admitted', label: 'Admitted & Enrolled', color: '#10b981' },
  { key: 'closed', label: 'Closed / Lost', color: '#94a3b8' }
];

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export default function HrReportsView({ leads = [], students = [], demos = [], currentUser }) {
  const hrName = currentUser?.name || '';

  // Scope every number in this report to leads/admissions this HR actually
  // owns, so the report reflects real work done by the signed-in person
  // rather than the whole branch's pipeline.
  const myLeads = useMemo(
    () => leads.filter((l) => (l.counselorAssigned || '').trim() === hrName.trim()),
    [leads, hrName]
  );
  const myStudents = useMemo(
    () => students.filter((s) => (s.hrName || '').trim() === hrName.trim()),
    [students, hrName]
  );
  const myLeadPhones = useMemo(
    () => new Set(myLeads.map((l) => l.phone).filter(Boolean)),
    [myLeads]
  );
  const myDemos = useMemo(
    () => demos.filter((d) => myLeadPhones.has(d.phone)),
    [demos, myLeadPhones]
  );

  const totalLeads = myLeads.length;
  const contacted = myLeads.filter((l) => l.stage !== 'new').length;
  const notYetContacted = totalLeads - contacted;
  const pending = myLeads.filter((l) => l.stage !== 'admitted' && l.stage !== 'closed').length;
  const admitted = myStudents.length;
  const totalCalls = myLeads.reduce((acc, l) => acc + (l.callCount || 0), 0);
  const conversionRate = totalLeads > 0 ? ((admitted / totalLeads) * 100).toFixed(1) : '0.0';

  const stageBreakdown = useMemo(() => {
    return STAGES.map((s) => {
      const count = myLeads.filter((l) => l.stage === s.key).length;
      return { ...s, count, pct: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0 };
    });
  }, [myLeads, totalLeads]);

  // Oldest not-yet-contacted leads first — the most useful "what do I do
  // next" list this report can surface.
  const pendingFollowUps = useMemo(() => {
    return myLeads
      .filter((l) => l.stage !== 'admitted' && l.stage !== 'closed')
      .slice()
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
      .slice(0, 6);
  }, [myLeads]);

  const statCards = [
    { label: 'TOTAL LEADS', value: totalLeads, icon: Users, accent: 'border-l-slate-500', valueColor: 'text-slate-900' },
    { label: 'CONTACTED', value: contacted, icon: PhoneCall, accent: 'border-l-sky-500', valueColor: 'text-sky-600' },
    { label: 'PENDING (IN PIPELINE)', value: pending, icon: Clock, accent: 'border-l-amber-500', valueColor: 'text-amber-600' },
    { label: 'ADMITTED', value: admitted, icon: GraduationCap, accent: 'border-l-emerald-500', valueColor: 'text-emerald-600' }
  ];

  if (!hrName) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs max-w-xl mx-auto">
        <p className="text-sm text-slate-500">Sign in to view your personal lead report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Page Title */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          My <span className="text-[#0e6977]">Reports</span>
        </h1>
        <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
          Live lead &amp; conversion summary for <strong className="text-slate-700">{hrName}</strong> · {totalLeads} leads on file
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs border-l-4 ${card.accent} flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase">
                {card.label}
              </span>
              <div className="w-7 h-7 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center">
                <card.icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-3xl font-extrabold ${card.valueColor}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Stage Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0e6977]" />
            <h3 className="text-sm font-extrabold text-slate-900">Pipeline Stage Breakdown</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{totalLeads} total</span>
        </div>

        {totalLeads === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">No leads assigned to you yet.</p>
        ) : (
          <div className="space-y-3">
            {stageBreakdown.map((s) => (
              <div key={s.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{s.label}</span>
                  <span className="font-bold text-slate-900">{s.count} <span className="text-slate-400 font-medium">({s.pct}%)</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Summary + Pending Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Activity Summary */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#0e6977]" />
            Activity Summary
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <PhoneOutgoing className="w-3.5 h-3.5" /> Calls logged
              </span>
              <span className="font-extrabold text-slate-900">{totalCalls}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Monitor className="w-3.5 h-3.5" /> Demos booked
              </span>
              <span className="font-extrabold text-slate-900">{myDemos.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Clock className="w-3.5 h-3.5" /> Not yet contacted
              </span>
              <span className="font-extrabold text-amber-600">{notYetContacted}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Conversion rate</span>
              <span className="font-extrabold text-emerald-600">{conversionRate}%</span>
            </div>
          </div>
        </div>

        {/* Pending Follow-ups list */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Oldest Pending Follow-ups
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">{pending} in pipeline</span>
          </div>

          {pendingFollowUps.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No pending follow-ups — you're all caught up.</p>
          ) : (
            <div className="space-y-2">
              {pendingFollowUps.map((l) => {
                const age = daysAgo(l.createdAt);
                return (
                  <div
                    key={l._id || l.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{l.fullName || l.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {l.phone} · {l.sourceName || l.source || 'Direct'} · {l.course || 'CPC'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                        {(l.stage || 'new').replace('_', ' ')}
                      </span>
                      {age !== null && (
                        <span className="text-[10px] font-bold text-amber-600">{age}d</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
