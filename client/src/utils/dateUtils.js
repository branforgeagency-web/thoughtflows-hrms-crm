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

// Local (IST) calendar date as YYYY-MM-DD. toISOString() is UTC and rolls back
// to "yesterday" between 00:00 and 05:30 IST.
export function localDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMonthDays(year, monthIndex) {
  const targetYear = typeof year === 'number' ? year : new Date().getFullYear();
  const targetMonth = typeof monthIndex === 'number' ? monthIndex : new Date().getMonth();
  const date = new Date(targetYear, targetMonth, 1);
  const days = [];
  const nowKey = localDateKey();
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayKeys = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  while (date.getMonth() === targetMonth) {
    const dKey = localDateKey(date);
    const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon ...
    const dayKey = dayKeys[dayOfWeek];
    const isToday = dKey === nowKey;
    const dayNum = date.getDate();
    const monthStr = monthsShort[targetMonth];
    const dateStr = `${dayNum} ${monthStr}`;

    let timing = '10–7';
    let type = 'work';
    if (dayKey === 'SUN') {
      timing = 'Week Off';
      type = 'off';
    } else if (dayKey === 'FRI' || dayKey === 'SAT') {
      timing = '12–9';
    }

    days.push({
      dayKey,
      dayName: dayNames[dayOfWeek],
      dayNum,
      dateStr,
      fullDate: dKey,
      dayOfWeek,
      type,
      timing,
      isOff: type === 'off',
      ...(isToday ? { isToday: true } : {})
    });
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export function getMonthWeeks(year, monthIndex) {
  const days = getMonthDays(year, monthIndex);
  const weeks = [];
  let currentWeek = [];
  days.forEach((d) => {
    currentWeek.push(d);
    // Break week on Sunday
    if (d.dayOfWeek === 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  return weeks;
}
