import React, { useCallback, useEffect, useState } from 'react';
import TeamRosterBoard from './TeamRosterBoard';
import { getTeam, onDataUpdate } from '../services/api';

// HR weekly roster editor, shown inside "My Schedule" for the HR Department Head
// (every HR, TL & manager) and the Branch Head (their own branch only).
// Everyone else just sees their own week in My Schedule.
const norm = (v) => String(v || '').trim().toLowerCase();
const isManagerRole = (role) => /branch\s*(manager|head)|regional\s*manager|operational\s*head/i.test(role || '');
const branchShort = (v) => norm(v).replace(/\s*(branch|\(.*\)|hq)\b/g, '').trim();

export default function HrWeeklyRoster({ canEdit = false, scopeKind = 'all', scopeNames = null, branch = '' }) {
  const [members, setMembers] = useState([]);

  const load = useCallback(async () => {
    const [hr, lead] = await Promise.all([
      getTeam({ departmentCode: 'DEP-HR-001' }).catch(() => []),
      getTeam({ departmentCode: 'LEAD' }).catch(() => [])
    ]);
    let rows = [
      ...(Array.isArray(hr) ? hr : []),
      ...(Array.isArray(lead) ? lead : []).filter((m) => isManagerRole(m.role))
    ];
    if (scopeKind === 'team' && Array.isArray(scopeNames)) {
      const allow = new Set(scopeNames.map(norm));
      rows = rows.filter((m) => allow.has(norm(m.name)));
    } else if (scopeKind === 'branch' && branch) {
      const b = branchShort(branch);
      rows = rows.filter((m) => branchShort(m.branchName).includes(b) || b.includes(branchShort(m.branchName)));
    }
    setMembers(rows.map((m) => ({
      id: m._id || m.id,
      name: m.name,
      role: m.role || 'Staff',
      branchName: m.branchName || '',
      assignedCount: m.assigned || 0,
      pendingCount: m.pending || 0,
      status: m.available !== false ? 'Available' : 'On Leave',
      shift: m.shift || 'General Shift',
      weeklySchedule: m.weeklySchedule || null
    })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKind, branch, (scopeNames || []).join('|')]);

  useEffect(() => {
    load();
    const off = onDataUpdate((e) => { if (e === 'team') load(); });
    return off;
  }, [load]);

  return (
    <TeamRosterBoard
      customMembers={members}
      onRosterChange={load}
      departmentCode="DEP-HR-001"
      managerLabel={scopeKind === 'branch' ? 'Branch Head' : 'HR Department Head'}
      readOnly={!canEdit}
      readOnlyTitle="HR Weekly Roster & Shifts"
      readOnlyNotice="The HR weekly roster is set by the HR Department Head and Branch Heads."
      editorRole="head"
      staffLabel="HR Counsellors"
      editorLabel="HR Department Head or Branch Head"
      showRoleFilter
    />
  );
}
