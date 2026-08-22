import { describe, it, expect } from 'vitest'
import { initialState, press, displayValue, displayExpression, isAllClear, ERROR, bigFontSize} from './calculator.js'

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

  it('does × and ÷ before + and −, the way the iPhone does', () => {
    // This test used to assert 20 — the left-to-right answer a cheap pocket
    // calculator gives. The iPhone gives 14, and the iPhone is what Sara is
    // holding in her other hand, so 20 was the bug and the test was wrong too.
    expect(show(K('2 + 3 * 4 ='))).toBe('14')
    expect(show(K('1 + 2 * 3 - 4 ='))).toBe('3')
    expect(show(K('5 * 2 + 3 * 4 ='))).toBe('22')
    expect(show(K('1 0 0 - 5 0 / 2 ='))).toBe('75')
  })

  it('keeps + and − left to right among themselves', () => {
    expect(show(K('9 - 1 - 1 ='))).toBe('7')
    expect(show(K('1 + 2 + 3 ='))).toBe('6')
  })

  it('keeps × and ÷ left to right among themselves', () => {
    expect(show(K('8 / 2 / 2 ='))).toBe('2')
    expect(show(K('6 / 3 * 2 ='))).toBe('4')
  })

  it('shows the running sum when + or − settles what came before', () => {
    // 2 + 3 × 4 then "+" must show 14, not 2 and not 12.
    expect(show(K('2 + 3 * 4 +'))).toBe('14')
    // ...but × must not disturb the sum it sits inside: still showing 3.
    expect(show(K('2 + 3 *'))).toBe('3')
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
    // Was '+ 3 =' — the test agreed with the bug that dropped the first number.
    expect(expr(K('5 + 3 ='))).toBe('5 + 3 =')
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

// ---------------------------------------------------------------------------
// Differential test: 3,000 random sums, checked against a second calculator
// that shares no code with the first.
//
// The precedence bug survived 45 tests because the tests were written from the
// same wrong idea as the code. A reference implementation cannot make that
// mistake in sympathy: it is written from the rule (× and ÷ bind tighter),
// not from the machine.
// ---------------------------------------------------------------------------

// A deterministic RNG, so a failure is reproducible rather than a ghost.
function rng(seed) {
  return function next() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Evaluate [n, op, n, op, n...] by the rule, in two passes. */
function referenceEval(tokens) {
  const flat = [tokens[0]]
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i], v = tokens[i + 1]
    if (op === '*' || op === '/') {
      const a = flat[flat.length - 1]
      flat[flat.length - 1] = op === '*' ? a * v : a / v
    } else {
      flat.push(op, v)
    }
  }
  let acc = flat[0]
  for (let i = 1; i < flat.length; i += 2) {
    acc = flat[i] === '+' ? acc + flat[i + 1] : acc - flat[i + 1]
  }
  return acc
}

describe('checked against an independent calculator', () => {
  it('agrees on 3000 random sums', () => {
    const next = rng(20260822)
    const OPSET = ['+', '-', '*', '/']
    const mismatches = []

    for (let n = 0; n < 3000; n += 1) {
      const operands = 2 + Math.floor(next() * 5) // 2..6 numbers
      const tokens = []
      const presses = []
      for (let i = 0; i < operands; i += 1) {
        if (i > 0) {
          const op = OPSET[Math.floor(next() * 4)]
          tokens.push(op)
          presses.push(op)
        }
        // Never zero, so division by zero is out of scope here — it has its
        // own tests, and it resets the machine rather than producing a number.
        const digits = 1 + Math.floor(next() * 3)
        let text = String(1 + Math.floor(next() * 9))
        for (let d = 1; d < digits; d += 1) text += String(Math.floor(next() * 10))
        tokens.push(Number(text))
        presses.push(...text.split(''))
      }
      presses.push('=')

      let s = initialState()
      for (const key of presses) s = press(s, key)

      const want = referenceEval(tokens)
      const got = Number(s.entry)
      // Both round to 12 significant figures for display; compare there.
      const round = (x) => Number(x.toPrecision(12))
      if (s.error || round(got) !== round(want)) {
        mismatches.push({ keys: presses.join(' '), got: s.error ? 'Error' : got, want })
      }
    }

    expect(mismatches.slice(0, 5)).toEqual([])
    expect(mismatches).toHaveLength(0)
  })
})

describe('divide by zero', () => {
  it('says Error rather than Infinity', () => {
    expect(show(K('1 / 0 ='))).toBe('Error')
    expect(show(K('5 + 1 / 0 ='))).toBe('Error')
    expect(show(K('8 / 0 +'))).toBe('Error')
  })

  it('the next key starts a clean sum, not a poisoned one', () => {
    expect(show(K('1 / 0 = 7'))).toBe('7')
    expect(show(K('1 / 0 = 7 + 3 ='))).toBe('10')
  })
})

describe('bigFontSize', () => {
  it('shrinks as the total gets longer, measured against a 390px screen', () => {
    expect(bigFontSize('12,345')).toBe(44)
    expect(bigFontSize('123,456,789')).toBe(38)   // 11 chars
    expect(bigFontSize('1,234,567,890')).toBe(32) // 13 chars
    expect(bigFontSize('999,999,999,999')).toBe(27)
    expect(bigFontSize('-999,999,999,999')).toBe(27)
    expect(bigFontSize('-123,456.789012')).toBe(27)
  })

  it('never returns something unusable', () => {
    for (const s of ['', '0', 'Error', 'x'.repeat(40)]) {
      const n = bigFontSize(s)
      expect(n).toBeGreaterThan(15)
      expect(n).toBeLessThanOrEqual(44)
    }
  })
})

describe('the line above the number', () => {
  // Sara, looking at a finished 78 × 56: "why is the calculator process on top
  // still broken". The maths was right; the line read "× 56 =" because it was
  // rebuilt after the fact from the operator alone, first number long gone.
  it('writes out the whole finished sum, first number included', () => {
    expect(expr(K('7 8 * 5 6 ='))).toBe('78 × 56 =')
    expect(show(K('7 8 * 5 6 ='))).toBe('4,368')
  })

  it('writes out a mixed sum in the order it was typed', () => {
    expect(expr(K('2 + 3 * 4 ='))).toBe('2 + 3 × 4 =')
    expect(expr(K('1 0 0 - 5 0 / 2 ='))).toBe('100 − 50 ÷ 2 =')
  })

  it('follows along while typing', () => {
    expect(expr(K('2'))).toBe('')
    expect(expr(K('2 +'))).toBe('2 +')
    expect(expr(K('2 + 3'))).toBe('2 + 3')
    expect(expr(K('2 + 3 *'))).toBe('2 + 3 ×')
    expect(expr(K('2 + 3 * 4'))).toBe('2 + 3 × 4')
  })

  it('shows the repeat, not the sum before it', () => {
    expect(expr(K('7 8 * 5 6 = ='))).toBe('4,368 × 56 =')
  })

  it('groups thousands there too', () => {
    expect(expr(K('1 2 3 4 5 + 6 7 8 9 0 ='))).toBe('12,345 + 67,890 =')
  })

  it('is empty when there is nothing to say', () => {
    expect(expr([])).toBe('')
    expect(expr(K('5'))).toBe('')
    expect(expr(K('1 / 0 ='))).toBe('')
  })
})
