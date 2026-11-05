/** The API sends UTC (ISO 8601); dates are shown in Argentina's local time. */
export const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const dateTime = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeOnly = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "4 nov 2026, 15:30" */
export function formatDateTime(iso: string): string {
  const date = parse(iso);
  return date ? dateTime.format(date) : '';
}

/** "4 de noviembre de 2026" */
export function formatDate(iso: string): string {
  const date = parse(iso);
  return date ? dateOnly.format(date) : '';
}

/** "15:30" */
export function formatTime(iso: string): string {
  const date = parse(iso);
  return date ? timeOnly.format(date) : '';
}
