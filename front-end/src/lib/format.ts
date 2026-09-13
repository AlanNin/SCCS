/**
 * Postgres timestamptz strings come back as e.g. "2026-09-12 17:21:38.981173+00"
 * - space-separated, up to microsecond precision, and a bare-hour offset.
 * None of that parses reliably with `new Date()`, so normalize to strict ISO 8601.
 */
function toDate(value: string): Date {
  const iso = value
    .replace(" ", "T")
    .replace(/(\.\d{3})\d+/, "$1")
    .replace(/([+-]\d{2})$/, "$1:00");
  return new Date(iso);
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(toDate(value));
}

export function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(toDate(value));
}
