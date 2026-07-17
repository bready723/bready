import { describe, it, expect } from 'vitest'
import { evalExpression, krwPerUnit, fmt } from './fx.js'

describe('evalExpression', () => {
  it('evaluates a plain number', () => {
    expect(evalExpression('100')).toBe(100)
    expect(evalExpression('4.5')).toBe(4.5)
  })
  it('honors × ÷ precedence over + −', () => {
    expect(evalExpression('3*4.5')).toBe(13.5)
    expect(evalExpression('2+3*4')).toBe(14)
    expect(evalExpression('10-2*3')).toBe(4)
  })
  it('returns null for an incomplete or invalid expression', () => {
    expect(evalExpression('3*')).toBeNull()
    expect(evalExpression('')).toBeNull()
    expect(evalExpression('5/0')).toBeNull()
  })
})

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
