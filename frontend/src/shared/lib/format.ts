export function formatDate(value: Date | string, locale = 'vi-VN'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const DISPLAY_TIME_ZONE = 'Asia/Ho_Chi_Minh'

function parseTimestamp(value: Date | string): Date | undefined {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDateInTimezone(
  value: Date | string,
  locale = 'vi-VN',
  timeZone = DISPLAY_TIME_ZONE,
): string {
  const date = parseTimestamp(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(date)
}

export function formatDateTimeInTimezone(
  value: Date | string,
  locale = 'vi-VN',
  timeZone = DISPLAY_TIME_ZONE,
): string {
  const date = parseTimestamp(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

export function formatCurrency(amount: number, currency: string, locale = 'vi-VN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Formats integer VND values without converting through an imprecise JS number. */
export function formatVnd(amount: string | bigint, locale = 'vi-VN'): string {
  const raw = typeof amount === 'bigint' ? amount.toString() : amount.trim()
  if (!/^-?\d+$/.test(raw)) return '—'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(BigInt(raw))
  } catch {
    return '—'
  }
}
