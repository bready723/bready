import { describe, it, expect } from 'vitest'
import { krwPerUnit, fmt, groupDigits, fieldFontSize} from './fx.js'

describe('krwPerUnit', () => {
  it('inverts units-per-KRW into KRW-per-unit', () => {
    // 1 KRW = 0.00067 USD  →  1 USD ≈ 1492.5 KRW
    expect(krwPerUnit('USD', { usd: 0.00067 })).toBeCloseTo(1492.537, 2)
  })
  it('is case-insensitive and null-safe', () => {
    expect(krwPerUnit('JPY', { jpy: 0.109 })).toBeCloseTo(9.174, 2)
    expect(krwPerUnit('USD', {})).toBeNull()
    expect(krwPerUnit('USD', { usd: 0 })).toBeNull()
  })
})

describe('fmt', () => {
  it('adds thousands separators and trims decimals', () => {
    expect(fmt(1484)).toBe('1,484')
    expect(fmt(13.5)).toBe('13.5')
    expect(fmt(null)).toBe('')
  })
})

describe('groupDigits', () => {
  it('makes a long amount readable', () => {
    expect(groupDigits('13815880')).toBe('13,815,880')
    expect(groupDigits('1000')).toBe('1,000')
    expect(groupDigits('999')).toBe('999')
  })

  it('leaves a half-typed amount alone', () => {
    expect(groupDigits('12.')).toBe('12.')
    expect(groupDigits('1234.5')).toBe('1,234.5')
    expect(groupDigits('')).toBe('')
    expect(groupDigits(null)).toBe('')
  })

  it('does not touch the decimals', () => {
    expect(groupDigits('1234567.891')).toBe('1,234,567.891')
  })
})

describe('fieldFontSize', () => {
  it('shrinks as the amount grows, so it stays inside the box', () => {
    expect(fieldFontSize('100')).toBe(44)
    expect(fieldFontSize('1,000,000')).toBe(37)
    expect(fieldFontSize('13,815,880')).toBe(31)
    expect(fieldFontSize('1,381,588,000')).toBe(25)
  })

  it('never returns something unreadable, whatever it is given', () => {
    for (const s of ['', '0', '9'.repeat(40), null, undefined]) {
      const size = fieldFontSize(s)
      expect(size).toBeGreaterThan(12)
      expect(size).toBeLessThanOrEqual(44)
    }
  })
})
