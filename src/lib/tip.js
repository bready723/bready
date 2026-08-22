// Tip maths, kept away from the screen so the arithmetic is testable.
//
// Modelled on the Shortcut Sara has been using: type the bill, pick a
// percentage, get the tip and the total. The percentages are the ones she
// actually chooses between, not the Shortcut's defaults.

export const TIP_PERCENTS = [18, 20, 22, 25]
export const DEFAULT_PERCENT = 20

// Zero-decimal currencies: a 5.5 yen tip is not a thing.
const WHOLE_UNIT = new Set(['JPY', 'VND', 'IDR', 'KRW'])

const SYMBOL = {
  USD: '$', EUR: '€', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$', HKD: 'HK$',
  SGD: 'S$', THB: '฿', VND: '₫', IDR: 'Rp', AED: 'AED', ARS: 'AR$', ILS: '₪',
  NZD: 'NZ$', RUB: '₽', KRW: '₩',
}

/** What to put in front of the number. Falls back to the code itself. */
export const symbolFor = (code) => SYMBOL[code] || code || ''

export const decimalsFor = (code) => (WHOLE_UNIT.has(code) ? 0 : 2)

/**
 * Read what was typed. People paste "$1,234.50" and type "12." mid-entry, so
 * be generous about the shape and strict about the result.
 */
export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/[^0-9.]/g, '')
  if (cleaned === '' || cleaned === '.') return null
  // "1.2.3" is not a number; keep the first dot only, like a keypad would.
  const parts = cleaned.split('.')
  const normalised = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
  const value = Number(normalised)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/**
 * The tip, and the total.
 *
 * Worked in whole cents rather than in decimals. 25% of 531.42 is exactly
 * 132.855, which should round up to 132.86 — but as a binary float it is
 * 132.85499999…, and rounding that gives 132.85. Integers do not have the
 * problem, so the arithmetic happens in the smallest unit and comes back out.
 *
 * The total is the bill plus the *rounded* tip, so the two numbers on screen
 * add up. A tip and a total that disagree by a cent is worse than either being
 * a cent off.
 */
export function computeTip(billText, percent, code = 'USD') {
  const bill = parseAmount(billText)
  if (bill === null) return { valid: false, bill: 0, tip: 0, total: 0 }
  const factor = 10 ** decimalsFor(code)
  const billMinor = Math.round(bill * factor)
  const tipMinor = Math.round((billMinor * percent) / 100)
  return {
    valid: true,
    bill: billMinor / factor,
    tip: tipMinor / factor,
    total: (billMinor + tipMinor) / factor,
  }
}

/** Money as it should read: grouped, with the right number of decimals. */
export function formatMoney(value, code = 'USD') {
  const decimals = decimalsFor(code)
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}
