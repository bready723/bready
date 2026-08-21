// An immediate-execution calculator, modelled on the iOS calculator.
//
// The old version kept the whole keyed-in expression as a string and re-parsed
// it on every press, which is why the big display showed the answer to a sum you
// hadn't finished typing and why backspace ate the result after "=". This one
// keeps the two things a pocket calculator actually holds: an accumulator plus a
// pending operator, and the digits you are typing right now.
//
// Pure functions only — no React in here, so every rule below is unit-testable.

const MAX_DIGITS = 12
export const ERROR = 'Error'

export const OPS = ['+', '-', '*', '/']
export const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' }

export function initialState() {
  return {
    entry: '0',      // the digits on the big line, as typed
    acc: null,       // left-hand value, once an operator is pending
    op: null,        // pending operator, one of OPS
    overwrite: true, // next digit replaces `entry` instead of appending
    lastOp: null,    // for repeat-equals
    lastRhs: null,
    done: false,     // an "=" has just produced this entry
    error: false,
  }
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
  if (n === null || !isFinite(n)) return null
  const r = parseFloat(n.toPrecision(12))
  return String(r)
}

const errorState = (s) => ({ ...initialState(), lastOp: s.lastOp, lastRhs: s.lastRhs, entry: ERROR, error: true })

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

function pressOp(s, op) {
  // Two operators in a row just swaps which one is pending — no phantom maths.
  if (s.op && s.overwrite) return { ...s, op }
  if (s.op) {
    const r = apply(s.acc, num(s.entry), s.op)
    const e = toEntry(r)
    if (e === null) return errorState(s)
    return { ...s, acc: r, entry: e, op, overwrite: true, done: false }
  }
  return { ...s, acc: num(s.entry), op, overwrite: true, done: false }
}

function pressEquals(s) {
  if (s.op) {
    const rhs = num(s.entry)
    const r = apply(s.acc, rhs, s.op)
    const e = toEntry(r)
    if (e === null) return errorState(s)
    return { ...s, entry: e, acc: null, op: null, overwrite: true, done: true, lastOp: s.op, lastRhs: rhs }
  }
  // Bare "=" repeats whatever was done last, the way every calculator does.
  if (s.lastOp != null) {
    const r = apply(num(s.entry), s.lastRhs, s.lastOp)
    const e = toEntry(r)
    if (e === null) return errorState(s)
    return { ...s, entry: e, overwrite: true, done: true }
  }
  return { ...s, overwrite: true, done: true }
}

// iOS semantics: inside a pending + or −, "%" means "that percent OF the left
// operand", so 200 + 10% is 200 + 20. Anywhere else it just divides by 100.
function pressPercent(s) {
  const v = num(s.entry)
  const pct = s.op === '+' || s.op === '-' ? (s.acc ?? 0) * (v / 100) : v / 100
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

/** The small line: the operation in progress, or the sum just completed. */
export function displayExpression(s) {
  if (s.error) return ''
  if (s.op) {
    const left = displayValue({ ...s, entry: toEntry(s.acc) ?? '0', error: false })
    return `${left} ${OP_SYMBOL[s.op]}${s.overwrite ? '' : ' ' + displayValue(s)}`
  }
  if (s.done && s.lastOp) {
    const rhs = displayValue({ ...s, entry: toEntry(s.lastRhs) ?? '0', error: false })
    return `${OP_SYMBOL[s.lastOp]} ${rhs} =`
  }
  return ''
}
