import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateInTimezone,
  formatDateTimeInTimezone,
  formatVnd,
} from './format'

describe('formatDate', () => {
  it('formats ISO dates consistently in the requested locale', () => {
    expect(formatDate('2026-11-02', 'en-GB')).toBe('02 Nov 2026')
  })

  it('returns an em dash for invalid values', () => {
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats currency using the requested locale and currency code', () => {
    expect(formatCurrency(12.5, 'EUR', 'de-DE')).toBe('12,50 €')
  })
})

describe('Phase 1B formatters', () => {
  it('formats UTC timestamps in the Vietnam display timezone', () => {
    expect(formatDateInTimezone('2026-01-01T18:30:00.000Z')).toContain('02 thg 1, 2026')
    expect(formatDateTimeInTimezone('2026-01-01T18:30:00.000Z')).toContain('01:30')
  })

  it('returns a placeholder for invalid timestamps and money values', () => {
    expect(formatDateInTimezone('not-a-date')).toBe('—')
    expect(formatDateTimeInTimezone('not-a-date')).toBe('—')
    expect(formatVnd('12.50')).toBe('—')
  })

  it('formats large decimal-safe VND integer strings and bigint', () => {
    expect(formatVnd('123456789012345678')).toBe('123.456.789.012.345.678 ₫')
    expect(formatVnd(9007199254740993n)).toBe('9.007.199.254.740.993 ₫')
  })
})
