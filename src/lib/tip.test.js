import { describe, it, expect } from 'vitest'
import {
  TIP_PERCENTS, DEFAULT_PERCENT, parseAmount, computeTip, formatMoney,
  symbolFor, decimalsFor,
} from './tip.js'

describe('the percentages Sara picks between', () => {
  it('is 18 / 20 / 22 / 25, with 20 to start', () => {
    expect(TIP_PERCENTS).toEqual([18, 20, 22, 25])
    expect(TIP_PERCENTS).toContain(DEFAULT_PERCENT)
  })
})

describe('parseAmount', () => {
  it('reads what people actually type and paste', () => {
    expect(parseAmount('531.42')).toBe(531.42)
    expect(parseAmount('$1,234.50')).toBe(1234.5)
    expect(parseAmount(' 42 ')).toBe(42)
    expect(parseAmount('12.')).toBe(12)   // mid-entry, before the cents
    expect(parseAmount('.5')).toBe(0.5)
  })

  it('keeps the first dot, the way a keypad would', () => {
    expect(parseAmount('1.2.3')).toBe(1.23)
  })

  it('says no rather than NaN', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('.')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
    expect(parseAmount(null)).toBeNull()
  })
})

describe('computeTip', () => {
  // The bill from Sara's own screenshot: the Shortcut said the tip was $106.28
  // and the total $637.70. Anything else here is a regression against the thing
  // this is replacing.
  it('matches the Shortcut on the real bill', () => {
    const { tip, total } = computeTip('531.42', 20)
    expect(tip).toBe(106.28)
    expect(total).toBe(637.7)
  })

  it('gets the other three percentages right', () => {
    expect(computeTip('531.42', 18)).toMatchObject({ tip: 95.66, total: 627.08 })
    expect(computeTip('531.42', 22)).toMatchObject({ tip: 116.91, total: 648.33 })
    expect(computeTip('531.42', 25)).toMatchObject({ tip: 132.86, total: 664.28 })
  })

  it('rounds the half-cent up, which a plain float does not', () => {
    // 25% of 531.42 is exactly 132.855. As a binary float it is 132.85499…,
    // and rounding that gives 132.85. Whole cents avoid it.
    expect(computeTip('531.42', 25).tip).toBe(132.86)
    expect(computeTip('10.10', 25).tip).toBe(2.53)  // 2.525 -> 2.53
  })

  it('always shows numbers that add up', () => {
    for (let cents = 1; cents <= 4000; cents += 7) {
      const bill = cents / 100
      for (const percent of TIP_PERCENTS) {
        const r = computeTip(String(bill), percent)
        expect(Math.round(r.total * 100)).toBe(Math.round(r.bill * 100) + Math.round(r.tip * 100))
      }
    }
  })

  it('is a no-op on an empty bill rather than showing NaN', () => {
    expect(computeTip('', 20)).toEqual({ valid: false, bill: 0, tip: 0, total: 0 })
    expect(computeTip('abc', 20).valid).toBe(false)
  })

  it('does not invent fractional yen', () => {
    expect(computeTip('5000', 18, 'JPY')).toMatchObject({ tip: 900, total: 5900 })
    expect(computeTip('4321', 22, 'JPY').tip).toBe(951) // 950.62 -> 951
    expect(decimalsFor('JPY')).toBe(0)
    expect(decimalsFor('USD')).toBe(2)
  })
})

describe('how it reads', () => {
  it('groups thousands and keeps the cents', () => {
    expect(formatMoney(637.7)).toBe('637.70')
    expect(formatMoney(1234.5)).toBe('1,234.50')
    expect(formatMoney(0)).toBe('0.00')
    expect(formatMoney(6000, 'JPY')).toBe('6,000')
  })

  it('knows the sign to put in front', () => {
    expect(symbolFor('USD')).toBe('$')
    expect(symbolFor('KRW')).toBe('₩')
    expect(symbolFor('JPY')).toBe('¥')
    expect(symbolFor('ZZZ')).toBe('ZZZ') // never blank
    expect(symbolFor(undefined)).toBe('')
  })
})
