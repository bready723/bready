// Free, keyless currency data via @fawazahmed0/currency-api on the jsdelivr CDN.
// The endpoint returns KRW → every currency: `data.krw[code]` = units of that
// currency per 1 KRW. So 1 unit of `code` = 1 / data.krw[code] KRW. jsdelivr is
// used deliberately — it's a CDN, CORS-open, and works from a static host.
//
// These are LIVE MID-MARKET reference rates (updated ~daily), not what any card
// or shop will actually charge — good enough for "roughly how much is this bread."

export const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro' },
  { code: 'GBP', flag: '🇬🇧', name: 'British Pound' },
  { code: 'JPY', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'AUD', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'CAD', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'HKD', flag: '🇭🇰', name: 'Hong Kong Dollar' },
  { code: 'SGD', flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'THB', flag: '🇹🇭', name: 'Thai Baht' },
  { code: 'VND', flag: '🇻🇳', name: 'Vietnamese Dong' },
  { code: 'IDR', flag: '🇮🇩', name: 'Indonesian Rupiah' },
  { code: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'ARS', flag: '🇦🇷', name: 'Argentine Peso' },
  { code: 'ILS', flag: '🇮🇱', name: 'Israeli Shekel' },
  { code: 'NZD', flag: '🇳🇿', name: 'New Zealand Dollar' },
  { code: 'RUB', flag: '🇷🇺', name: 'Russian Ruble' },
]

export const currencyMeta = (code) =>
  CURRENCIES.find((c) => c.code === code) || { code, flag: '🏳️', name: code }

const HOSTS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api',
  'https://latest.currency-api.pages.dev', // official fallback host
]

// Fetch the krw.json for a version ('latest' or an ISO date), trying the CDN then
// its fallback host.
async function fetchKrw(version) {
  let lastErr
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}@${version}/v1/currencies/krw.json`)
      if (!res.ok) throw new Error('fx http ' + res.status)
      return await res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || new Error('fx unavailable')
}

// Latest snapshot: { date, krw: { usd: 0.00067, … } }  (units per 1 KRW).
export async function fetchLatest() {
  const data = await fetchKrw('latest')
  return { date: data.date || '', krw: data.krw || {} }
}

// KRW per 1 unit of `code`, from a units-per-KRW map. null if unavailable.
export function krwPerUnit(code, krwMap) {
  const v = krwMap && krwMap[code.toLowerCase()]
  return v && v > 0 ? 1 / v : null
}

// Build N calendar dates (ISO, oldest→newest) spanning the last `days`.
function seriesDates(days, points) {
  const now = Date.now()
  const dates = []
  for (let i = points - 1; i >= 0; i--) {
    const t = now - Math.round((days * i) / (points - 1)) * 86400000
    dates.push(new Date(t).toISOString().slice(0, 10))
  }
  return dates
}

// Historical KRW-per-unit series for the sparkline. Fetches a handful of dated
// snapshots in parallel and returns [{date, rate}] oldest→newest. Cached per
// code+days so re-selecting is instant. Missing days are simply skipped.
const histCache = {}
export async function fetchHistory(code, days, points = 7) {
  const key = `${code}|${days}`
  if (histCache[key]) return histCache[key]
  const dates = seriesDates(days, points)
  const snaps = await Promise.all(
    dates.map((dt) =>
      fetchKrw(dt)
        .then((d) => ({ date: dt, rate: krwPerUnit(code, d.krw || {}) }))
        .catch(() => null),
    ),
  )
  const out = snaps.filter((s) => s && s.rate != null)
  if (out.length >= 2) histCache[key] = out
  return out
}

// --- Safe calculator: evaluate a +−×÷ expression with no eval() ---
// Supports decimals and operator precedence (× ÷ before + −). Returns a finite
// number, or null for an incomplete/invalid expression (e.g. a trailing "3×").
export function evalExpression(str) {
  if (!str) return null
  const tokens = String(str).match(/\d+\.?\d*|\.\d+|[+\-*/]/g)
  if (!tokens) return null
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2 }
  const output = []
  const ops = []
  for (const t of tokens) {
    if (t.length === 1 && prec[t]) {
      while (ops.length && prec[ops[ops.length - 1]] >= prec[t]) output.push(ops.pop())
      ops.push(t)
    } else {
      const n = parseFloat(t)
      if (isNaN(n)) return null
      output.push(n)
    }
  }
  while (ops.length) output.push(ops.pop())
  const st = []
  for (const t of output) {
    if (typeof t === 'number') {
      st.push(t)
    } else {
      const b = st.pop()
      const a = st.pop()
      if (a === undefined || b === undefined) return null
      if (t === '/' && b === 0) return null
      st.push(t === '+' ? a + b : t === '-' ? a - b : t === '*' ? a * b : a / b)
    }
  }
  const r = st.pop()
  return st.length === 0 && typeof r === 'number' && isFinite(r) ? r : null
}

// Format a number with thousands separators and up to `dp` decimals (trailing
// zeros trimmed). Used for both the big displays and the rate line.
export function fmt(n, dp = 2) {
  if (n == null || !isFinite(n)) return ''
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp })
}
