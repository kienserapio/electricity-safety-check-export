/**
 * Date helpers for the report.
 *
 * Every date on this form is a calendar date, never an instant, so they travel
 * as `YYYY-MM-DD` strings and are stored in Postgres `date` columns. Parsing
 * goes through UTC midnight so a user in Melbourne and a database in UTC agree
 * on which day a certificate was signed.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parses `YYYY-MM-DD` to a UTC-midnight Date, or null if it is not a real date. */
export function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const roundTripped =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  return roundTripped ? date : null
}

/** Formats a Date back to `YYYY-MM-DD` for date inputs. */
export function toDateOnly(date) {
  return date.toISOString().slice(0, 10)
}

/** Today as `YYYY-MM-DD` in the viewer's local calendar. */
export function todayDateOnly() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function addYears(value, years) {
  const date = parseDateOnly(value)
  if (!date) return ''
  date.setUTCFullYear(date.getUTCFullYear() + years)
  return toDateOnly(date)
}

/** Human-readable form used throughout the PDF and the register, e.g. 11 Feb 2026. */
export function formatDisplayDate(date) {
  if (!date) return '—'
  const parsed = typeof date === 'string' ? parseDateOnly(date) : date
  if (!parsed) return '—'
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

/**
 * The Residential Tenancies Regulations 2021 require an electrical safety check
 * every two years, and smoke alarms to be tested every twelve months.
 */
export const ELECTRICAL_CHECK_INTERVAL_YEARS = 2
export const SMOKE_ALARM_INTERVAL_YEARS = 1
