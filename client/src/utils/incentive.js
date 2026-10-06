import { useEffect, useState } from 'react';
import { getSetting, onDataUpdate } from '../services/api';

// Admin's incentive policy: { defaultTarget, bands: [{ id, label, upTo, rate }] }.
// Incentive is paid only on admissions PAST the monthly target; each admission
// is paid at the rate of the band it falls in (bands are cumulative "up to").
export function progressiveIncentive(closed, target, bands) {
  const pastTarget = Math.max(0, (Number(closed) || 0) - (Number(target) || 0));
  if (pastTarget <= 0 || !Array.isArray(bands) || bands.length === 0) return 0;
  let earned = 0;
  let prevUpTo = 0;
  for (const band of bands) {
    const upTo = Number(band.upTo) || 0;
    const capacity = upTo - prevUpTo;
    if (capacity <= 0) continue;
    if (pastTarget > prevUpTo) earned += Math.min(pastTarget - prevUpTo, capacity) * (Number(band.rate) || 0);
    prevUpTo = upTo;
  }
  return earned;
}

// Live policy from the server. undefined = loading, null = Admin hasn't set one.
export function useIncentivePolicy() {
  const [policy, setPolicy] = useState(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => getSetting('incentive_policy')
      .then((s) => { if (alive) setPolicy(s?.value && Array.isArray(s.value.bands) ? s.value : null); })
      .catch(() => { if (alive) setPolicy(null); });
    load();
    const off = onDataUpdate((entity) => { if (entity === 'settings') load(); });
    return () => { alive = false; off(); };
  }, []);
  return policy;
}
