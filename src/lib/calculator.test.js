import { describe, it, expect } from 'vitest'
import { initialState, press, displayValue, displayExpression, isAllClear, ERROR } from './calculator.js'

// Drive the calculator the way a thumb does: a string of keys, one per token.
const run = (keys) => keys.reduce((s, k) => press(s, k), initialState())
const show = (keys) => displayValue(run(keys))
const expr = (keys) => displayExpression(run(keys))
const K = (str) => str.split(' ')

describe('entry', () => {
  it('starts at zero', () => {
    expect(show([])).toBe('0')
  })

  it('replaces the leading zero instead of appending to it', () => {
    expect(show(K('0 5'))).toBe('5')
    expect(show(K('7'))).toBe('7')
  })

  it('groups thousands on the big line', () => {
    expect(show(K('4 1 0 2 8'))).toBe('41,028')
    expect(show(K('1 2 3 4 5 6 7'))).toBe('1,234,567')
  })

  it('takes one decimal point only', () => {
    expect(show(K('1 . 5'))).toBe('1.5')
    expect(show(K('1 . 5 . 2'))).toBe('1.52')
  })

  it('starts a bare decimal with a zero', () => {
    expect(show(K('. 5'))).toBe('0.5')
  })

  it('keeps a trailing decimal point visible while typing', () => {
    expect(show(K('9 .'))).toBe('9.')
  })

  it('caps the number of digits', () => {
    expect(show(K('1 1 1 1 1 1 1 1 1 1 1 1 1 1 1'))).toBe('111,111,111,111')
  })
})

describe('the display shows the current entry, not the running answer', () => {
  it('shows the second operand while it is being typed', () => {
    expect(show(K('6 4 0 + 4 0 0'))).toBe('400')
  })

  it('puts the operation in progress on the small line', () => {
    expect(expr(K('6 4 0 + 4 0 0'))).toBe('640 + 400')
  })

  it('shows only the left operand and the operator before the second number', () => {
    expect(expr(K('6 4 0 +'))).toBe('640 +')
  })

  it('shows the answer once equals is pressed', () => {
    expect(show(K('6 4 0 + 4 0 0 ='))).toBe('1,040')
  })
})

describe('arithmetic', () => {
  it('adds, subtracts, multiplies and divides', () => {
    expect(show(K('2 + 3 ='))).toBe('5')
    expect(show(K('9 - 4 ='))).toBe('5')
    expect(show(K('6 * 7 ='))).toBe('42')
    expect(show(K('8 / 2 ='))).toBe('4')
  })

  it('handles decimals without float noise', () => {
    expect(show(K('0 . 1 + 0 . 2 ='))).toBe('0.3')
  })

  it('chains left to right, evaluating on each operator', () => {
    expect(show(K('2 + 3 + 4 ='))).toBe('9')
    expect(show(K('1 0 - 3 - 2 ='))).toBe('5')
  })

  it('evaluates as you chain, so the left operand is the running total', () => {
    expect(expr(K('2 + 3 +'))).toBe('5 +')
  })

  it('is immediate-execution: no operator precedence', () => {
    // A pocket calculator gives 20 here, not 14 — that is the intended behaviour.
    expect(show(K('2 + 3 * 4 ='))).toBe('20')
  })

  it('swaps the pending operator when two are pressed in a row', () => {
    expect(show(K('8 + * 2 ='))).toBe('16')
  })

  it('uses the shown number as both operands when equals follows an operator', () => {
    expect(show(K('5 + ='))).toBe('10')
  })
})

describe('repeat equals', () => {
  it('repeats the last operation and operand', () => {
    expect(show(K('5 + 3 = ='))).toBe('11')
    expect(show(K('5 + 3 = = ='))).toBe('14')
  })

  it('repeats multiplication too', () => {
    expect(show(K('2 * 3 = ='))).toBe('18')
  })

  it('does nothing when there is no previous operation', () => {
    expect(show(K('7 ='))).toBe('7')
  })

  it('starts a fresh number when a digit follows equals', () => {
    expect(show(K('5 + 3 = 9'))).toBe('9')
  })

  it('continues calculating from the answer when an operator follows equals', () => {
    expect(show(K('5 + 3 = + 2 ='))).toBe('10')
  })
})

describe('correcting mistakes', () => {
  it('deletes the last digit', () => {
    expect(show(K('4 1 0 2 del'))).toBe('410')
  })

  it('falls back to zero rather than an empty display', () => {
    expect(show(K('4 del'))).toBe('0')
  })

  it('deletes digits of a partly typed decimal', () => {
    expect(show(K('1 . 2 5 del del'))).toBe('1.')
  })

  it('clears the answer without touching the previous calculation', () => {
    expect(show(K('5 + 3 = del'))).toBe('0')
  })

  it('leaves a pending operation alone when C clears the entry', () => {
    expect(show(K('6 4 0 + 4 9 AC 4 0 0 ='))).toBe('1,040')
  })

  it('labels the clear key AC only when there is nothing to clear', () => {
    expect(isAllClear(run([]))).toBe(true)
    expect(isAllClear(run(K('5')))).toBe(false)
    expect(isAllClear(run(K('6 4 0 +')))).toBe(false)
    // C clears the entry, and then the key becomes AC for a full reset
    expect(isAllClear(run(K('6 4 0 + 4 AC')))).toBe(true)
    expect(isAllClear(run(K('6 4 0 + 4 AC AC')))).toBe(true)
  })

  it('resets everything on the second AC', () => {
    expect(show(K('6 4 0 + 4 AC AC 7'))).toBe('7')
    expect(expr(K('6 4 0 + 4 AC AC 7'))).toBe('')
  })
})

describe('percent', () => {
  it('takes the percentage of the left operand inside a pending + or -', () => {
    expect(show(K('2 0 0 + 1 0 %'))).toBe('20')
    expect(show(K('2 0 0 + 1 0 % ='))).toBe('220')
    expect(show(K('2 0 0 - 1 0 % ='))).toBe('180')
  })

  it('just divides by a hundred on its own', () => {
    expect(show(K('5 0 %'))).toBe('0.5')
  })

  it('divides by a hundred inside a pending multiply', () => {
    expect(show(K('4 0 0 * 5 0 % ='))).toBe('200')
  })
})

describe('sign', () => {
  it('negates and un-negates the entry', () => {
    expect(show(K('7 +/-'))).toBe('-7')
    expect(show(K('7 +/- +/-'))).toBe('7')
  })

  it('leaves a bare zero alone', () => {
    expect(show(K('+/-'))).toBe('0')
  })

  it('keeps typing onto a negative number', () => {
    expect(show(K('7 +/- 5'))).toBe('-75')
  })

  it('calculates with negative numbers', () => {
    // the leading-minus case that used to blank the old display
    expect(show(K('5 +/- + 3 ='))).toBe('-2')
    expect(show(K('5 +/- * 4 ='))).toBe('-20')
  })

  it('negates an answer', () => {
    expect(show(K('2 + 3 = +/-'))).toBe('-5')
  })
})

describe('divide by zero', () => {
  it('says Error instead of going blank or infinite', () => {
    expect(show(K('5 / 0 ='))).toBe(ERROR)
  })

  it('recovers on the next key', () => {
    expect(show(K('5 / 0 = 7'))).toBe('7')
    expect(show(K('5 / 0 = AC'))).toBe('0')
  })

  it('errors mid-chain too', () => {
    expect(show(K('5 / 0 +'))).toBe(ERROR)
  })
})

describe('the small line', () => {
  it('is empty before anything is entered', () => {
    expect(expr([])).toBe('')
  })

  it('shows the completed operation after equals', () => {
    expect(expr(K('5 + 3 ='))).toBe('+ 3 =')
  })

  it('is empty in the error state', () => {
    expect(expr(K('5 / 0 ='))).toBe('')
  })
})

describe('never breaks, whatever you press', () => {
  // The cases above pin down known answers. This one asks a different question:
  // can ANY sequence of taps leave the display in a state a user would call
  // broken — blank, NaN, Infinity, or an endless string of digits?
  const ALL = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','=','%','+/-','del','AC']

  it('survives 5000 random key sequences', () => {
    let seed = 20260820 // fixed seed: a failure here is reproducible
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const seen = new Set()

    for (let run = 0; run < 5000; run++) {
      let s = initialState()
      const seq = []
      const len = 4 + Math.floor(rnd() * 16)
      for (let i = 0; i < len; i++) {
        const k = ALL[Math.floor(rnd() * ALL.length)]
        seq.push(k)
        s = press(s, k)
        const big = displayValue(s)
        const small = displayExpression(s)
        const where = () => `after "${seq.join(' ')}" -> big=${JSON.stringify(big)} small=${JSON.stringify(small)}`
        expect(big, where()).not.toBe('')
        expect(big, where()).not.toMatch(/NaN|Infinity|undefined|null/)
        expect(small, where()).not.toMatch(/NaN|Infinity|undefined|null/)
        expect(big.length, where()).toBeLessThanOrEqual(24)
        seen.add(big)
      }
    }
    // sanity: the fuzzer really did move the display around
    expect(seen.size).toBeGreaterThan(500)
  })
})
