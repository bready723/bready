import { useEffect, useRef, useState } from 'react'
import {
  CURRENCIES,
  currencyMeta,
  fetchLatest,
  fetchHistory,
  krwPerUnit,
  evalExpression,
  fmt,
} from '../lib/fx.js'

const MAGENTA = '#e0218a'
// A gradient hairline border (bready brand) around a card of `bg`.
const gradBorder = (bg) => ({
  border: '2px solid transparent',
  borderRadius: 20,
  background: `linear-gradient(${bg},${bg}) padding-box, var(--brand-gradient) border-box`,
})

const PERIODS = [
  { key: 7, label: '1W' },
  { key: 30, label: '1M' },
  { key: 90, label: '3M' },
  { key: 180, label: '6M' },
]

const KEYS = [
  { k: 'AC', kind: 'mag' }, { k: 'del', kind: 'mag', label: '⌫' },
  { k: '/', kind: 'op', label: '÷' }, { k: '*', kind: 'op', label: '×' },
  { k: '7', kind: 'num' }, { k: '8', kind: 'num' }, { k: '9', kind: 'num' }, { k: '-', kind: 'op', label: '−' },
  { k: '4', kind: 'num' }, { k: '5', kind: 'num' }, { k: '6', kind: 'num' }, { k: '+', kind: 'op' },
  { k: '1', kind: 'num' }, { k: '2', kind: 'num' }, { k: '3', kind: 'num' },
  { k: '=', kind: 'eq', style: { gridColumn: 4, gridRow: '4 / span 2' } },
  { k: '0', kind: 'num', style: { gridColumn: '1 / span 2' } },
  { k: '.', kind: 'dot', style: { gridColumn: 3, gridRow: 5 } },
]

function niceDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch (e) {
    return iso
  }
}

// Map a [{rate}] series to an SVG polyline points string.
function sparkPoints(hist, w, h, pad = 6) {
  if (!hist || hist.length < 2) return ''
  const rates = hist.map((p) => p.rate)
  const min = Math.min(...rates)
  const span = Math.max(...rates) - min || 1
  const n = hist.length
  return hist
    .map((p, i) => {
      const x = pad + (i / (n - 1)) * (w - 2 * pad)
      const y = pad + (1 - (p.rate - min) / span) * (h - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function FX({ currency, onCurrency }) {
  const [krwMap, setKrwMap] = useState(null)
  const [rateDate, setRateDate] = useState('')
  const [loadErr, setLoadErr] = useState(false)
  const [expr, setExpr] = useState('100')
  const [dir, setDir] = useState('fx') // which side the keypad drives: 'fx' | 'krw'
  const [period, setPeriod] = useState(30)
  const [history, setHistory] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const histReq = useRef(0)

  // Load live rates once.
  useEffect(() => {
    let cancelled = false
    fetchLatest()
      .then((d) => {
        if (cancelled) return
        setKrwMap(d.krw)
        setRateDate(d.date)
      })
      .catch(() => !cancelled && setLoadErr(true))
    return () => {
      cancelled = true
    }
  }, [])

  // Load the trend series whenever the currency or period changes.
  useEffect(() => {
    const my = ++histReq.current
    setHistLoading(true)
    setHistory([])
    fetchHistory(currency, period, 7)
      .then((h) => {
        if (my === histReq.current) setHistory(h)
      })
      .catch(() => {})
      .finally(() => {
        if (my === histReq.current) setHistLoading(false)
      })
  }, [currency, period])

  const rate = krwMap ? krwPerUnit(currency, krwMap) : null // KRW per 1 unit
  const val = evalExpression(expr)
  let foreign, krw
  if (dir === 'fx') {
    foreign = val
    krw = val != null && rate != null ? Math.round(val * rate) : null
  } else {
    krw = val
    foreign = val != null && rate != null ? val / rate : null
  }
  const meta = currencyMeta(currency)

  function setDirection(nd) {
    if (nd === dir) return
    const v = evalExpression(expr)
    if (v != null && rate != null) {
      const conv = nd === 'krw' ? Math.round(v * rate) : Number((v / rate).toFixed(2))
      setExpr(String(conv))
    }
    setDir(nd)
  }

  function pressKey(k) {
    setExpr((e) => {
      if (k === 'AC') return ''
      if (k === 'del') return e.slice(0, -1)
      if (k === '=') {
        const v = evalExpression(e)
        return v == null ? e : String(v)
      }
      if ('+-*/'.includes(k)) {
        if (!e) return k === '-' ? '-' : e
        if ('+-*/'.includes(e.slice(-1))) return e.slice(0, -1) + k // replace trailing op
        return e + k
      }
      if (k === '.') {
        const tail = e.split(/[+\-*/]/).pop()
        if (tail.includes('.')) return e
        if (e === '' || '+-*/'.includes(e.slice(-1))) return e + '0.'
        return e + '.'
      }
      return e + k // digit
    })
  }

  const fromNum = foreign != null ? fmt(foreign, foreign >= 1000 ? 0 : 2) : dir === 'fx' ? expr || '0' : '—'
  const toNum = krw != null ? fmt(krw, 0) : dir === 'krw' ? expr || '0' : '—'
  const hasMath = /[+\-*/]/.test(expr.slice(1))
  const keypadBig = val != null ? fmt(val, val >= 1000 ? 0 : 2) : expr || '0'

  const pct =
    history.length >= 2 ? ((history[history.length - 1].rate - history[0].rate) / history[0].rate) * 100 : null
  const up = pct != null && pct >= 0

  return (
    <main className="screen fx-screen">
      <div className="fx-head">
        <h1 className="title" style={{ margin: 0 }}>Currency</h1>
        <span className="fx-meta">
          {loadErr ? 'offline' : rateDate ? `mid-market · ${niceDate(rateDate)}` : 'loading…'}
        </span>
      </div>
      <p className="subtitle" style={{ marginTop: 2 }}>Won ⇄ the world, live.</p>

      {/* ---------- FROM (foreign) ---------- */}
      <div
        className={`fx-card ${dir === 'fx' ? 'on' : ''}`}
        style={gradBorder('var(--surface)')}
        onClick={() => setDirection('fx')}
      >
        <div className="fx-label">From</div>
        <div className="fx-row">
          <div className="fx-num">{fromNum}</div>
          <select
            className="fx-cur"
            value={currency}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onCurrency(e.target.value)}
            aria-label="Currency"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------- SWAP ---------- */}
      <div className="fx-swapwrap">
        <button
          className="fx-swap"
          onClick={() => setDirection(dir === 'fx' ? 'krw' : 'fx')}
          aria-label="Swap direction"
          title="Swap"
        >
          ⇅
        </button>
      </div>

      {/* ---------- TO (KRW) ---------- */}
      <div
        className={`fx-card fx-to ${dir === 'krw' ? 'on' : ''}`}
        onClick={() => setDirection('krw')}
      >
        <div className="fx-label" style={{ color: 'rgba(255,255,255,0.72)' }}>To</div>
        <div className="fx-row">
          <div className="fx-num" style={{ color: '#fff' }}>{toNum}</div>
          <div className="fx-krw">🇰🇷 KRW</div>
        </div>
      </div>

      {/* ---------- TREND ---------- */}
      <div className="fx-card" style={{ ...gradBorder('var(--surface)'), marginTop: 22 }}>
        <div className="fx-trend-head">
          <span className="fx-label" style={{ margin: 0 }}>Trend</span>
          {pct != null && (
            <span className="fx-pct" style={{ color: up ? MAGENTA : '#ef6b45', background: up ? '#fbe3f0' : '#fce6de' }}>
              {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="fx-periods">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={period === p.key ? 'on' : ''}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="fx-chart">
          {histLoading ? (
            <span className="fx-chart-msg">Loading trend…</span>
          ) : history.length >= 2 ? (
            <svg viewBox="0 0 300 88" width="100%" height="88" preserveAspectRatio="none">
              <polyline
                points={sparkPoints(history, 300, 88)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="fx-chart-msg">Trend unavailable right now.</span>
          )}
        </div>
        <div className="fx-rateline">
          {rate != null
            ? `1 ${currency} = ${fmt(rate, 2)} KRW${rateDate ? ` · ${niceDate(rateDate)}` : ''}`
            : loadErr
              ? 'Could not load rates — check your connection.'
              : 'Loading live rate…'}
        </div>
      </div>

      {/* ---------- KEYPAD ---------- */}
      <div className="fx-card" style={{ ...gradBorder('var(--canvas)'), padding: 14, marginTop: 22 }}>
        <div className="fx-display">
          <div className="fx-display-expr">{hasMath ? expr : `${dir === 'fx' ? meta.flag + ' ' + currency : '🇰🇷 KRW'}`}</div>
          <div className="fx-display-big">{keypadBig}</div>
        </div>
        <div className="fx-keys">
          {KEYS.map((key) => (
            <button
              key={key.k}
              className={`fx-key ${key.kind}`}
              style={key.style}
              onClick={() => pressKey(key.k)}
            >
              {key.label || key.k}
            </button>
          ))}
        </div>
      </div>

      <p className="fx-foot">Live mid-market rates · updates daily · a rough guide, not the till price.</p>
    </main>
  )
}
