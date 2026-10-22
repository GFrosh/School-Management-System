/**
 * Contract 7.1: "Dates (attendance, enrolment) are plain YYYY-MM-DD, because a
 * school day is a local calendar fact, not an instant."
 * So a date string is formatted from its own parts with a UTC clock — it is
 * never handed to `new Date(str)` alone, which would shift it by the browser's
 * timezone offset.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-12" -> "12 Oct 2026" (DD MMM YYYY, per the brief). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const month = MONTHS[Number(m) - 1];
    if (!month) return value;
    return `${Number(d)} ${month} ${y}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return `${parsed.getUTCDate()} ${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCFullYear()}`;
}

/** Instant (ISO 8601 UTC with Z) -> "12 Oct 2026, 10:14" for tooltips. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const hh = String(parsed.getUTCHours()).padStart(2, '0');
  const mm = String(parsed.getUTCMinutes()).padStart(2, '0');
  return `${formatDate(
    `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(
      parsed.getUTCDate(),
    ).padStart(2, '0')}`,
  )}, ${hh}:${mm}`;
}

/** Today as YYYY-MM-DD in the local calendar, for date inputs and defaults. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const STATUS_WORDS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  promoted: 'Promoted',
  repeated: 'Repeated',
  graduated: 'Graduated',
  transferred: 'Transferred',
  withdrawn: 'Withdrawn',
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  published: 'Published',
  correction_pending: 'Correction pending',
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
};

/** Status tokens are snake_case on the wire; the UI never shows an underscore. */
export function humaniseStatus(value: string): string {
  return STATUS_WORDS[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
