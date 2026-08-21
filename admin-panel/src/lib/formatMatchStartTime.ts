const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// matchStartTime stores a date-only value ("YYYY-MM-DD"). Older rows may still
// have a datetime-local value ("YYYY-MM-DDTHH:mm"); both are formatted as a date.
export function formatMatchStartTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
