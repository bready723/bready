// A calculator modelled on the iOS one — including its order of operations.
//
// The first version kept a single accumulator and a single pending operator,
// which is how a cheap pocket calculator works: it evaluates strictly left to
// right, so 2 + 3 × 4 came out as 20. The iPhone does not do that. It applies
// × and ÷ before + and −, giving 14, and that is what Sara is comparing
// against. Hence two levels of pending state rather than one:
//
//   acc  addOp   the sum so far, and the + or − waiting on it
//   mulAcc mulOp the product so far, and the × or ÷ waiting on it
//
// A × or ÷ only ever touches the inner pair. A + or − first collapses the
// inner pair into the outer one, which is precedence, expressed as two slots
// instead of a parser.
//
// Pure functions only — no React in here, so every rule below is unit-testable.

const MAX_DIGITS = 12
export const ERROR = 'Error'

export const OPS = ['+', '-', '*', '/']
export const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' }

const isMul = (op) => op === '*' || op === '/'

export function initialState() {
  return {
    entry: '0',      // the digits on the big line, as typed
    acc: null,       // the running sum, once a + or − is pending
    addOp: null,     // pending + or −
    mulAcc: null,    // the running product, once a × or ÷ is pending
    mulOp: null,     // pending × or ÷
    overwrite: true, // next digit replaces `entry` instead of appending
    lastOp: null,    // for repeat-equals
    lastRhs: null,
    lastExpr: null,  // the sum just completed, written out in full
    done: false,     // an "=" has just produced this entry
    error: false,
  }
}

/** The operator currently lit on the keypad: the most recent one typed. */
export function pendingOp(s) {
  return s.mulOp || s.addOp || null
}

const num = (s) => parseFloat(s === '' || s === '-' ? '0' : s)

function apply(a, b, op) {
  switch (op) {
    case '+': return a + b
    case '-': return a - b
    case '*': return a * b
    case '/': return b === 0 ? null : a / b
    default: return b
  }
}

// A computed result becomes the new entry string. Keep full precision in the
// number, trim the float noise that 0.1+0.2 style arithmetic leaves behind.
function toEntry(n) {
  if (n === null || n === undefined || !isFinite(n)) return null
  const r = parseFloat(n.toPrecision(12))
  return String(r)
}

const errorState = (s) => ({ ...initialState(), lastOp: s.lastOp, lastRhs: s.lastRhs, entry: ERROR, error: true })

/** Collapse the inner (× ÷) pair around `v`. Null means divide by zero. */
function foldMul(s, v) {
  return s.mulOp ? apply(s.mulAcc, v, s.mulOp) : v
}

/** Collapse everything pending around `v`. Null means divide by zero. */
function foldAll(s, v) {
  const t = foldMul(s, v)
  if (t === null) return null
  return s.addOp ? apply(s.acc, t, s.addOp) : t
}

/** The sum in progress, as "2 + 3 ×" — everything typed but the operand. */
function pendingParts(s) {
  const parts = []
  if (s.addOp) parts.push(fmt(s.acc), OP_SYMBOL[s.addOp])
  if (s.mulOp) parts.push(fmt(s.mulAcc), OP_SYMBOL[s.mulOp])
  return parts
}

function pressDigit(s, d) {
  if (s.overwrite || s.done) return { ...s, entry: d, overwrite: false, done: false }
  if (s.entry.replace(/[-.]/g, '').length >= MAX_DIGITS) return s
  if (s.entry === '0') return { ...s, entry: d }
  if (s.entry === '-0') return { ...s, entry: '-' + d }
  return { ...s, entry: s.entry + d }
}

function pressDot(s) {
  if (s.overwrite || s.done) return { ...s, entry: '0.', overwrite: false, done: false }
  if (s.entry.includes('.')) return s
  return { ...s, entry: s.entry + '.' }
}

// Two operators in a row swaps which one is pending, rather than inventing an
// operand out of thin air.
function swapOp(s, op) {
  if (s.mulOp) {
    if (isMul(op)) return { ...s, mulOp: op }
    // × giving way to +: the inner pair collapses to the operand it was
    // holding, which then joins the sum. "2 + 3 × +" behaves as "2 + 3 +".
    const total = s.addOp ? apply(s.acc, s.mulAcc, s.addOp) : s.mulAcc
    const e = toEntry(total)
    if (e === null) return errorState(s)
    return { ...s, acc: total, addOp: op, mulAcc: null, mulOp: null, entry: e, overwrite: true }
  }
  if (isMul(op)) {
    // "2 + ×" becomes "2 ×" — the abandoned + takes its operand with it.
    const e = toEntry(s.acc)
    if (e === null) return errorState(s)
    return { ...s, mulAcc: s.acc, mulOp: op, acc: null, addOp: null, entry: e, overwrite: true }
  }
  return { ...s, addOp: op }
}

function pressOp(s, op) {
  if (pendingOp(s) && s.overwrite) return swapOp(s, op)
  const v = num(s.entry)

  if (isMul(op)) {
    // × and ÷ never disturb the sum they sit inside.
    const left = foldMul(s, v)
    const e = toEntry(left)
    if (e === null) return errorState(s)
    return { ...s, mulAcc: left, mulOp: op, entry: e, overwrite: true, done: false }
  }

  // + and − mean everything to their left is now settled, so the big line
  // shows the running total — the same thing the iPhone does.
  const total = foldAll(s, v)
  const e = toEntry(total)
  if (e === null) return errorState(s)
  return { ...s, acc: total, addOp: op, mulAcc: null, mulOp: null, entry: e, overwrite: true, done: false }
}

function pressEquals(s) {
  if (pendingOp(s)) {
    const rhs = num(s.entry)
    const total = foldAll(s, rhs)
    const e = toEntry(total)
    if (e === null) return errorState(s)
    // Repeat-equals replays the innermost operation — the last one typed —
    // because that is the one whose operand is still on the big line.
    return {
      ...s,
      entry: e,
      acc: null, addOp: null, mulAcc: null, mulOp: null,
      overwrite: true, done: true,
      lastOp: pendingOp(s), lastRhs: rhs,
      // Written out here, while the operands still exist. The small line used
      // to be rebuilt afterwards from lastOp alone, which is why a finished
      // "78 × 56 =" showed up as "× 56 =" with the first number missing.
      lastExpr: `${pendingParts(s).join(' ')} ${displayValue(s)} =`,
    }
  }
  // Bare "=" repeats whatever was done last, the way every calculator does.
  if (s.lastOp != null) {
    const r = apply(num(s.entry), s.lastRhs, s.lastOp)
    const e = toEntry(r)
    if (e === null) return errorState(s)
    const lastExpr = `${displayValue(s)} ${OP_SYMBOL[s.lastOp]} ${fmt(s.lastRhs)} =`
    return { ...s, entry: e, overwrite: true, done: true, lastExpr }
  }
  return { ...s, overwrite: true, done: true }
}

// iOS semantics: inside a pending + or −, "%" means "that percent OF the sum so
// far", so 200 + 10% is 200 + 20. Inside a × or ÷, and on its own, it is just a
// division by 100.
function pressPercent(s) {
  const v = num(s.entry)
  const ofSum = s.addOp && !s.mulOp
  const pct = ofSum ? (s.acc ?? 0) * (v / 100) : v / 100
  const e = toEntry(pct)
  if (e === null) return errorState(s)
  return { ...s, entry: e, overwrite: false, done: false }
}

function pressSign(s) {
  if (s.entry === '0' || s.entry === ERROR) return s
  const entry = s.entry.startsWith('-') ? s.entry.slice(1) : '-' + s.entry
  return { ...s, entry }
}

function pressDelete(s) {
  if (s.done) return { ...s, entry: '0', overwrite: true, done: false }
  const stripped = s.entry.slice(0, -1)
  const entry = stripped === '' || stripped === '-' ? '0' : stripped
  return { ...s, entry, overwrite: entry === '0' && stripped === '' }
}

// "AC" wipes everything; "C" only clears what you are typing, so a pending
// operation survives a mistyped operand.
function pressClear(s) {
  if (isAllClear(s)) return initialState()
  return { ...s, entry: '0', overwrite: true, done: false }
}

/** True when the clear key should read "AC" rather than "C". */
export function isAllClear(s) {
  if (s.error) return false
  return s.done || (s.overwrite && s.entry === '0')
}

export function press(state, key) {
  const s = state.error ? initialState() : state
  if (/^[0-9]$/.test(key)) return pressDigit(s, key)
  if (key === '.') return pressDot(s)
  if (OPS.includes(key)) return pressOp(s, key)
  if (key === '=') return pressEquals(s)
  if (key === '%') return pressPercent(s)
  if (key === '+/-') return pressSign(s)
  if (key === 'del') return pressDelete(s)
  if (key === 'AC') return pressClear(s)
  return s
}

/** Format a bare number the way the big line would show it. */
function fmt(n) {
  const e = toEntry(n)
  return e === null ? '0' : displayValue({ entry: e, error: false })
}

/** The big line: the entry, with thousands separators. */
export function displayValue(s) {
  if (s.error) return ERROR
  const neg = s.entry.startsWith('-')
  const body = neg ? s.entry.slice(1) : s.entry
  const [int, dec] = body.split('.')
  const grouped = Number(int || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })
  const out = dec !== undefined ? `${grouped}.${dec}` : grouped
  return (neg ? '-' : '') + out
}

/**
 * The small line: the whole operation in progress, so a mixed sum is visible
 * as "2 + 3 ×" rather than leaving Sara to guess what the machine is holding.
 */
export function displayExpression(s) {
  if (s.error) return ''
  const parts = pendingParts(s)
  if (parts.length) {
    if (!s.overwrite) parts.push(displayValue(s))
    return parts.join(' ')
  }
  if (s.done && s.lastExpr) return s.lastExpr
  return ''
}

/**
 * How big the big line can be before it stops fitting a phone.
 *
 * The CSS used to let a long total wrap with `word-break: break-all`, which
 * split it mid-number — a total reading "1,234,5" above "67,890". iOS shrinks
 * the digits instead of breaking them, so this does too. The thresholds are
 * measured against a 390px-wide screen, not guessed.
 */
export function bigFontSize(text) {
  const n = String(text).length
  if (n <= 9) return 44
  if (n <= 11) return 38
  if (n <= 13) return 32
  if (n <= 16) return 27
  return 23
}
