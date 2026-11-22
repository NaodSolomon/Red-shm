const addisClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Addis_Ababa', calendar: 'gregory', numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const dateLabel = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', calendar: 'gregory', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
});

export function addisNow(now = new Date()) {
  const parts = Object.fromEntries(addisClock.formatToParts(now).map(({ type, value }) => [type, value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export function friendlyDay(day: string) {
  return validDay(day) ? dateLabel.format(new Date(`${day}T00:00:00Z`)) : day;
}

export function normalizeTime(input: string) {
  const time = input.trim();
  const clock = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(time);
  if (clock) return `${String(Number(clock[1]) % 12 + (clock[3].toUpperCase() === 'PM' ? 12 : 0)).padStart(2, '0')}:${clock[2]}`;
  const military = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time);
  return military ? `${military[1].padStart(2, '0')}:${military[2]}` : undefined;
}

export function friendlyTime(time: string) {
  const normalized = normalizeTime(time);
  if (!normalized) return time;
  const hour = Number(normalized.slice(0, 2));
  return `${hour % 12 || 12}:${normalized.slice(3)} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function scheduleError(day: string, time: string, now = new Date()) {
  if (!validDay(day)) return 'Choose a valid calendar date.';
  const normalized = normalizeTime(time);
  if (!normalized) return 'Choose a valid time.';
  const current = addisNow(now);
  if (day < current.day) return 'Choose today or a future date in Addis Ababa.';
  if (day === current.day && normalized < current.time) return 'Choose a time that has not passed in Addis Ababa.';
}

export function quickDates(now = new Date()) {
  const today = new Date(`${addisNow(now).day}T00:00:00Z`);
  const weekday = today.getUTCDay();
  const next = (day: number) => (day - weekday + 7) % 7 || 7;
  return [
    { label: 'Tomorrow', offset: 1 },
    { label: 'Day after tomorrow', offset: 2 },
    { label: 'Coming Saturday', offset: next(6) },
    { label: 'Coming Sunday', offset: next(0) },
  ].map(({ label, offset }) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + offset);
    return { label, day: date.toISOString().slice(0, 10) };
  });
}
