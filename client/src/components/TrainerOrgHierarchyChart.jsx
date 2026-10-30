import React, { useState, useEffect } from 'react';
import { User, Sparkles, Briefcase, Users, GraduationCap, Crown, AlertCircle, Building2 } from 'lucide-react';
import { getTrainerCredentials, getTrainerSettings } from '../services/api';

export default function TrainerOrgHierarchyChart({
  head: headProp,
  managers: managersProp,
  teamLeads: teamLeadsProp,
  faculty: facultyProp,
  onSelectNode
}) {
  const [loading, setLoading] = useState(!managersProp && !teamLeadsProp);
  const [dbData, setDbData] = useState({
    head: [],
    managers: [],
    teamLeads: [],
    faculty: []
  });

  useEffect(() => {
    // If props are passed, use them
    if (managersProp || teamLeadsProp) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    Promise.all([
      getTrainerCredentials().catch(() => ({ head: [], managers: [], teamLeads: [], faculty: [] })),
      getTrainerSettings().catch(() => [])
    ])
      .then(([creds, roster]) => {
        if (!isMounted) return;
        const rosterFaculty = Array.isArray(roster) ? roster : [];
        const mergedFaculty = [...(creds?.faculty || [])];
        rosterFaculty.forEach((rf) => {
          const rId = rf.trainerId || rf.id;
          const rName = rf.trainerName || rf.name;
          if (!mergedFaculty.some((f) => f.id === rId || (rName && f.name?.toLowerCase() === rName.toLowerCase()))) {
            mergedFaculty.push({
              id: rId,
              name: rName,
              role: rf.role || 'Trainer',
              branch: rf.branchName || rf.branch,
              managerId: rf.managerId,
              teamLeadId: rf.teamLeadId
            });
          }
        });

        setDbData({
          head: creds?.head || [],
          managers: creds?.managers || [],
          teamLeads: creds?.teamLeads || [],
          faculty: mergedFaculty
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [managersProp, teamLeadsProp]);

  const headList = managersProp || teamLeadsProp ? (headProp || []) : dbData.head;
  const managersList = managersProp || dbData.managers || [];
  const teamLeadsList = teamLeadsProp || dbData.teamLeads || [];
  const facultyList = facultyProp || dbData.faculty || [];

  const primaryHead = headList[0] || {
    id: 'head',
    name: 'Department Head of Training',
    role: 'Department Head of Training',
    branch: 'Pan-India Operations'
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs overflow-x-auto select-none">
      {/* Header with Thoughtflows Academy Branding */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl px-2 py-1 shadow-xs border border-slate-100">
            <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-8 w-auto object-contain" />
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-[#00897b] uppercase">NO:1 MEDICAL CODING ACADEMY</div>
            <div className="text-base font-extrabold text-slate-900 tracking-tight">Training Department Organization Hierarchy</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Dynamic Live Organization Tree
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 font-semibold text-sm">
          Loading Training Organization Hierarchy...
        </div>
      ) : (
        <div className="min-w-[960px] flex flex-col items-center">
          {/* Level 1: Head of Training Department */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => onSelectNode && onSelectNode({ roleType: 'head', id: primaryHead.id, name: primaryHead.name })}
              className="group relative flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[#005a9c] hover:bg-[#004b82] text-white shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="text-lg font-black tracking-tight leading-tight group-hover:text-blue-100">
                  {primaryHead.name}
                </div>
                <div className="text-xs text-blue-100/90 font-medium">
                  {primaryHead.role || 'Head of Training Department'} · {primaryHead.branch || 'Pan-India Command'}
                </div>
              </div>
            </button>

            {/* Stem line down */}
            {(managersList.length > 0 || teamLeadsList.length > 0) && (
              <div className="w-0.5 h-7 bg-slate-300"></div>
            )}
          </div>

          {/* Empty State: No Managers or TLs created yet */}
          {managersList.length === 0 && teamLeadsList.length === 0 && (
            <div className="mt-8 p-6 max-w-lg bg-amber-50/70 border border-amber-200 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
              <h4 className="text-sm font-bold text-amber-900">No Regional Managers or Team Leads Configured</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Admins can create users with the roles <strong className="font-semibold">&quot;TRAINING TEAM MANAGER&quot;</strong> and <strong className="font-semibold">&quot;TRAINING TEAM LEAD&quot;</strong> in the Admin Management dashboard. Once created, they will automatically appear here.
              </p>
            </div>
          )}

          {/* Level 2: Managers Tier */}
          {managersList.length > 0 && (
            <div className="w-full flex flex-col items-center">
              {/* Horizontal crossbar connecting managers */}
              {managersList.length > 1 && (
                <div className="w-[70%] h-0.5 bg-slate-300 relative">
                  <div className="absolute left-0 top-0 w-0.5 h-6 bg-slate-300"></div>
                  <div className="absolute right-0 top-0 w-0.5 h-6 bg-slate-300"></div>
                </div>
              )}

              <div
                className={`w-full grid gap-8 mt-6 ${
                  managersList.length === 1
                    ? 'grid-cols-1 max-w-[420px]'
                    : managersList.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-3'
                }`}
              >
                {managersList.map((m) => {
                  const mId = m.id || m.leaderId;
                  const mBranches = (m.branches?.length ? m.branches : (m.branch ? [m.branch] : [])).map((b) => String(b).toLowerCase());

                  // Find TLs reporting to this manager
                  const reportingTLs = teamLeadsList.filter((tl) => {
                    const tlId = tl.id || tl.leaderId;
                    if (tl.managerId && (tl.managerId === mId || tl.managerId === m.name)) return true;
                    if (mBranches.length > 0 && tl.branches) {
                      return tl.branches.some((tb) => mBranches.includes(String(tb).toLowerCase()));
                    }
                    return false;
                  });

                  // If no specific TLs matched and only 1 manager exists, assign all TLs
                  const assignedTLs = reportingTLs.length > 0 ? reportingTLs : (managersList.length === 1 ? teamLeadsList : []);

                  return (
                    <div key={mId} className="flex flex-col items-center">
                      <button
                        onClick={() => onSelectNode && onSelectNode({ roleType: 'manager', id: mId, name: m.name, zone: m.zone })}
                        className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#00828a] hover:bg-[#006f76] text-white shadow-md transition-all hover:-translate-y-0.5 cursor-pointer w-full max-w-[320px]"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left truncate">
                          <div className="text-base font-extrabold leading-tight truncate">{m.name}</div>
                          <div className="text-[11px] text-teal-100 font-medium truncate">
                            {m.role || 'Training Manager'} {m.zone ? `(${m.zone})` : ''}
                          </div>
                        </div>
                      </button>

                      {/* Stem line down */}
                      {assignedTLs.length > 0 && <div className="w-0.5 h-6 bg-slate-300"></div>}

                      {/* Level 3: TLs under this Manager */}
                      {assignedTLs.length > 0 && (
                        <div
                          className={`w-full grid gap-4 ${
                            assignedTLs.length === 1 ? 'grid-cols-1 max-w-[280px]' : 'grid-cols-1 sm:grid-cols-2'
                          }`}
                        >
                          {assignedTLs.map((tl) => {
                            const tlId = tl.id || tl.leaderId;
                            const tlBranches = (tl.branches?.length ? tl.branches : (tl.branch ? [tl.branch] : [])).map((b) => String(b).toLowerCase());

                            // Find trainers under this TL
                            const squadTrainers = facultyList.filter((f) => {
                              const fTLId = f.teamLeadId || f.reportingTLId;
                              if (fTLId && (fTLId === tlId || fTLId === tl.name)) return true;
                              if (tlBranches.length > 0) {
                                const fb = String(f.branchName || f.branch || '').toLowerCase();
                                return tlBranches.some((tb) => fb.includes(tb));
                              }
                              return false;
                            });

                            return (
                              <div key={tlId} className="flex flex-col items-center">
                                <button
                                  onClick={() => onSelectNode && onSelectNode({ roleType: 'tl', id: tlId, name: tl.name, zone: tl.zone })}
                                  className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#2e7d32] hover:bg-[#256628] text-white shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer w-full justify-center"
                                >
                                  <Users className="w-4 h-4 text-white" />
                                  <div className="text-left truncate">
                                    <div className="text-sm font-extrabold leading-tight truncate">{tl.name}</div>
                                    <div className="text-[10.5px] text-emerald-100 font-medium truncate">
                                      {tl.role || 'Team Lead'} {tl.zone ? `(${tl.zone})` : ''}
                                    </div>
                                  </div>
                                </button>

                                <div className="w-0.5 h-4 bg-slate-300"></div>

                                {/* Faculty squad list */}
                                <div className="w-full bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-2xl p-3 shadow-xs">
                                  <div className="w-full py-1 rounded-full bg-[#2e7d32] text-white text-[11px] font-black text-center uppercase tracking-wider mb-2.5 shadow-xs">
                                    {squadTrainers.length} {squadTrainers.length === 1 ? 'Trainer' : 'Trainers'}
                                  </div>
                                  {squadTrainers.length === 0 ? (
                                    <div className="py-2 text-center text-slate-400 text-[11px] italic">
                                      Assigned Pod Squad
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                      {squadTrainers.map((t, idx) => {
                                        const tId = t.id || t.trainerId;
                                        const tName = t.name || t.trainerName;
                                        return (
                                          <div
                                            key={tId || idx}
                                            onClick={() => onSelectNode && onSelectNode({ roleType: 'trainer', id: tId, name: tName })}
                                            className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800"
                                          >
                                            <span className="w-4 h-4 rounded-full bg-[#2e7d32] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                              {idx + 1}
                                            </span>
                                            <span className="truncate">{tName}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Level 2 fallback: If TLs exist without any Manager */}
          {managersList.length === 0 && teamLeadsList.length > 0 && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
              {teamLeadsList.map((tl) => {
                const tlId = tl.id || tl.leaderId;
                const tlBranches = (tl.branches?.length ? tl.branches : (tl.branch ? [tl.branch] : [])).map((b) => String(b).toLowerCase());

                const squadTrainers = facultyList.filter((f) => {
                  const fTLId = f.teamLeadId || f.reportingTLId;
                  if (fTLId && (fTLId === tlId || fTLId === tl.name)) return true;
                  if (tlBranches.length > 0) {
                    const fb = String(f.branchName || f.branch || '').toLowerCase();
                    return tlBranches.some((tb) => fb.includes(tb));
                  }
                  return false;
                });

                return (
                  <div key={tlId} className="flex flex-col items-center">
                    <button
                      onClick={() => onSelectNode && onSelectNode({ roleType: 'tl', id: tlId, name: tl.name, zone: tl.zone })}
                      className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#2e7d32] hover:bg-[#256628] text-white shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer w-full justify-center"
                    >
                      <Users className="w-4 h-4 text-white" />
                      <div className="text-left truncate">
                        <div className="text-sm font-extrabold leading-tight truncate">{tl.name}</div>
                        <div className="text-[10.5px] text-emerald-100 font-medium truncate">
                          {tl.role || 'Team Lead'} {tl.zone ? `(${tl.zone})` : ''}
                        </div>
                      </div>
                    </button>

                    <div className="w-0.5 h-4 bg-slate-300"></div>

                    <div className="w-full bg-[#f0fdf4] border-2 border-[#bbf7d0] rounded-2xl p-3 shadow-xs">
                      <div className="w-full py-1 rounded-full bg-[#2e7d32] text-white text-[11px] font-black text-center uppercase tracking-wider mb-2.5 shadow-xs">
                        {squadTrainers.length} {squadTrainers.length === 1 ? 'Trainer' : 'Trainers'}
                      </div>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {squadTrainers.map((t, idx) => {
                          const tId = t.id || t.trainerId;
                          const tName = t.name || t.trainerName;
                          return (
                            <div
                              key={tId || idx}
                              onClick={() => onSelectNode && onSelectNode({ roleType: 'trainer', id: tId, name: tName })}
                              className="flex items-center gap-2 py-1 px-1.5 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer text-xs font-semibold text-slate-800"
                            >
                              <span className="w-4 h-4 rounded-full bg-[#2e7d32] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="truncate">{tName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
