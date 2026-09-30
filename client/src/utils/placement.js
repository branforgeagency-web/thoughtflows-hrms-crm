// Single source of truth for the 7-stage placement pipeline.
// Stages 1–3 are DERIVED from real data (never set by hand).
// Stages 4–7 are set by the placement team (HR / CCCP / Admin / Leadership),
// one step at a time, and only once the student is Talentera Synced.
// Mirror of server/src/constants/placement.js — keep both in step

export const ATTENDANCE_MIN = 80;
export const MOCK_PASS = 60;
export const PLACEMENT_EDITORS = ['hr', 'cccp', 'admin', 'leadership'];

export const STAGE_STATUS = {
  1: 'Talent Pool',
  2: 'Placement Ready',
  3: 'Talentera Synced',
  4: 'Company Mapped',
  5: 'Interview Scheduled',
  6: 'Offer Released',
  7: 'Placed & Joined'
};

const hasOffer = (st) => (st?.interviews || []).some((i) =>
  /offer|selected/i.test(i?.overallStatus || '') ||
  (i?.rounds || []).some((r) => /offer|selected/i.test(r?.status || ''))
);

// Each automatic stage's own condition
export function stageChecks(st = {}) {
  const s1 = Boolean(st.studentId) && st.handoverStatus === 'Sent to Training';
  const attendanceOk = typeof st.attendancePct === 'number' && st.attendancePct >= ATTENDANCE_MIN;
  const mockOk = (typeof st.mockScore === 'number' && st.mockScore >= MOCK_PASS) || st.trainerRecommendation === 'Ready';
  const s2 = attendanceOk && mockOk;
  const s3 = st.resumeStatus === 'Approved' && st.videoIntroStatus === 'Approved';
  return { 1: s1, 2: s2, 3: s3, attendanceOk, mockOk, hasInterview: (st.interviews || []).length > 0, hasOffer: hasOffer(st) };
}

// Highest consecutive automatic stage reached (0–3)
export function autoStage(st) {
  const c = stageChecks(st);
  if (!c[1]) return 0;
  if (!c[2]) return 1;
  if (!c[3]) return 2;
  return 3;
}

// Stored 4–7 = placement team's manual stage; below that, derived
export function effectiveStage(st) {
  const stored = Number(st?.placementStage) || 0;
  return stored >= 4 ? Math.min(7, stored) : autoStage(st);
}

// Why a manual move to `target` (4–7) is not allowed, or '' if it is
export function blockReason(st, target) {
  const c = stageChecks(st);
  const current = effectiveStage(st);
  if (target < 4 || target > 7) return 'Stages 1–3 update automatically from attendance, mock and resume/video reviews.';
  if (autoStage(st) < 3 && current < 4) {
    const missing = [];
    if (!c[1]) missing.push('handover to training');
    if (!c.attendanceOk) missing.push(`attendance ≥ ${ATTENDANCE_MIN}%`);
    if (!c.mockOk) missing.push(`mock cleared (≥ ${MOCK_PASS}) or trainer "Ready"`);
    if (!c[3]) missing.push('resume & video intro approved');
    return `Not Talentera Synced yet — pending: ${missing.join(', ')}.`;
  }
  if (target > current + 1) return `Can't skip stages — move to Stage ${current + 1} first.`;
  if (target >= 5 && !c.hasInterview) return 'Log at least one interview before Stage 5.';
  if (target >= 6 && !c.hasOffer) return 'Log an interview round with an offer before Stage 6.';
  return '';
}

// Fields to $set so placementStage / placementStatus / statusGroup agree
export function derivePlacementFields(st) {
  const stage = effectiveStage(st);
  const out = {};
  const stored = Number(st?.placementStage) || 0;
  if (stored !== stage) out.placementStage = stage;
  if (stage >= 1 && st.placementStatus !== STAGE_STATUS[stage]) out.placementStatus = STAGE_STATUS[stage];
  if (stage === 7 && st.statusGroup !== 'placed') out.statusGroup = 'placed';
  if (stage < 7 && st.statusGroup === 'placed') out.statusGroup = 'in_course';
  return out;
}
