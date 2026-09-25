// Helper utility for dynamic date, week, and roster calculations

export function getCurrentWeekScheduleDays() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Distance to Monday: if Sun (0), -6; else (1 - currentDay)
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayKeys = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return dayKeys.map((dayKey, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dayNum = d.getDate();
    const monthStr = monthsShort[d.getMonth()];
    const dateStr = `${dayNum} ${monthStr}`;
    const isToday = d.toDateString() === now.toDateString();

    let timing = '10–7';
    let type = 'work';
    if (dayKey === 'FRI' || dayKey === 'SAT') {
      timing = '12–9';
    } else if (dayKey === 'SUN') {
      timing = 'Week Off';
      type = 'off';
    }

    return {
      dayKey,
      dayName: dayNames[idx],
      dateStr,
      fullDate: d.toISOString().split('T')[0],
      type,
      timing,
      ...(isToday ? { isToday: true } : {})
    };
  });
}

export function getWeekRangeString() {
  const days = getCurrentWeekScheduleDays();
  const first = days[0];
  const last = days[days.length - 1];
  const year = new Date().getFullYear();
  return `${first.dateStr}–${last.dateStr} ${year}`;
}

export function getCurrentMonthYear() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function getCurrentMonthName() {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short' });
}
