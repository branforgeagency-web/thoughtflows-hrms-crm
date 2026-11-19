// The Trainer department works only with students HR has handed over to
// training (or who already have a trainer). Students still with HR
// ("Pending Handover" / no handover yet) are not shown in trainer dashboards.
const HANDED_OVER_STATUSES = [
  'sent to training',
  'handed over to head of trainer',
  'handed over to department head of training'
];

export function isHandedOverToTraining(st) {
  if (!st) return false;
  if (st.trainerId || st.trainerName || st.allocatedTrainerAt || st.headOfTrainer) return true;
  return HANDED_OVER_STATUSES.includes(String(st.handoverStatus || '').trim().toLowerCase());
}

export const handedOverOnly = (list) => (Array.isArray(list) ? list : []).filter(isHandedOverToTraining);
