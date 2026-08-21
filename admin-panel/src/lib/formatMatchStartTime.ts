const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// matchStartTime is a datetime-local value ("YYYY-MM-DDTHH:mm") that always
// represents IST wall-clock time, so we format it from the raw digits
// instead of going through Date (which would apply the browser's timezone).
export function formatMatchStartTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const h = Number(hour);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}, ${displayHour}:${minute} ${period} IST`;
}
