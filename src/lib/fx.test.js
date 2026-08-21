import { describe, it, expect } from 'vitest'
import { krwPerUnit, fmt } from './fx.js'

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
