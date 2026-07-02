import { useRef, useState } from 'react'
import { BREADS } from '../lib/breads.js'
import { uid, todayISO } from '../lib/storage.js'
import { TIERS, TIER_ORDER, createInsertion, insertAtTier, tierItems } from '../lib/ranking.js'

// Short subtitles for each gut tier (the score band, in plain terms).
const TIER_DESC = {
  loved: '8.0 and up',
  fine: '5.0 – 7.9',
  disliked: 'Below 5.0',
}

// Multi-step log flow: info -> tier -> compare -> result.
// Re-logging a place you've already ranked just appends a visit (no re-rank).
export default function LogVisit({ bakeries, prefill, onComplete, onCancel }) {
  const [step, setStep] = useState('info')
  const [name, setName] = useState(prefill?.name || '')
  const [area, setArea] = useState(prefill?.area || '')
  const [breads, setBreads] = useState([])
  const [tier, setTier] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [result, setResult] = useState(null) // { list, score }
  const [existing, setExisting] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [notes, setNotes] = useState('')
  const [freshness, setFreshness] = useState('')

  const insRef = useRef(null)
  const newId = useRef(uid())

  const toggleBread = (key) =>
    setBreads((b) => (b.includes(key) ? b.filter((x) => x !== key) : [...b, key]))

  function onInfoNext() {
    // Repeat visit only when BOTH name and area match — so two different
    // "Boulangerie"s (Paris vs Lyon) don't wrongly merge.
    const match = bakeries.find(
      (b) =>
        b.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        (b.area || '').trim().toLowerCase() === area.trim().toLowerCase(),
    )
    if (match) {
      setExisting(match)
      setStep('result')
    } else {
      setStep('tier')
    }
  }

  function pickTier(t) {
    setTier(t)
    const ins = createInsertion(tierItems(bakeries, t))
    insRef.current = ins
    const c = ins.next()
    if (c == null) {
      finalize(t, ins)
    } else {
      setCandidate(c)
      setStep('compare')
    }
  }

  function choose(newIsBetter) {
    const ins = insRef.current
    ins.choose(newIsBetter)
    const c = ins.next()
    if (c == null) finalize(tier, ins)
    else setCandidate(c)
  }

  function finalize(t, ins) {
    const newItem = { id: newId.current, name: name.trim(), area: area.trim(), breads }
    const list = insertAtTier(bakeries, newItem, t, ins.index)
    const placed = list.find((b) => b.id === newId.current)
    setResult({ list, score: placed.score })
    setStep('result')
  }

  function save() {
    const visit = {
      date: todayISO(),
      breads,
      freshnessTime: freshness || null,
      notes: notes || null,
    }
    if (existing) {
      const merged = Array.from(new Set([...(existing.breads || []), ...breads]))
      const list = bakeries.map((b) =>
        b.id === existing.id
          ? { ...b, breads: merged, lastVisit: visit.date, visits: [...(b.visits || []), visit] }
          : b,
      )
      onComplete({ bakeries: list, loggedName: name, wishlistId: prefill?.id || null })
      return
    }
    const list = result.list.map((b) =>
      b.id === newId.current
        ? { ...b, breads, lastVisit: visit.date, visits: [visit], createdAt: visit.date }
        : b,
    )
    onComplete({ bakeries: list, loggedName: name, wishlistId: prefill?.id || null })
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />

        {/* ---------- STEP 1: bakery + breads ---------- */}
        {step === 'info' && (
          <>
            <div className="step-eyebrow">LOG A VISIT · 1 OF 3</div>
            <h2>Where did you go?</h2>
            <div className="label">Bakery</div>
            <input
              className="input"
              placeholder="e.g. Bagel Nook"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <div className="label">
              Neighborhood <span className="opt">— optional</span>
            </div>
            <input
              className="input"
              placeholder="e.g. Palmer Square"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
            <div className="label">What did you have?</div>
            <div className="chips">
              {BREADS.map((b) => (
                <button
                  key={b.key}
                  className={`chip ${breads.includes(b.key) ? 'on' : ''}`}
                  onClick={() => toggleBread(b.key)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 26 }} disabled={!name.trim()} onClick={onInfoNext}>
              Next
            </button>
            <button className="btn ghost" onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {/* ---------- STEP 2: gut tier ---------- */}
        {step === 'tier' && (
          <>
            <div className="step-eyebrow">LOG A VISIT · 2 OF 3</div>
            <h2>How was {name.trim()}?</h2>
            <p className="hint">Gut call — you'll fine-tune next.</p>
            {TIER_ORDER.map((k) => (
              <button key={k} className="tier-row" onClick={() => pickTier(k)}>
                <span style={{ flex: 1 }}>
                  <span className="t-label">{TIERS[k].label}</span>
                  <span className="t-desc">{TIER_DESC[k]}</span>
                </span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            ))}
            <button className="btn ghost" onClick={() => setStep('info')}>
              Back
            </button>
          </>
        )}

        {/* ---------- STEP 3: comparisons ---------- */}
        {step === 'compare' && candidate && (
          <>
            <div className="step-eyebrow">LOG A VISIT · 3 OF 3</div>
            <h2>Which was better?</h2>
            <p className="hint">A couple of taps places it exactly.</p>
            <button className="versus-card" onClick={() => choose(true)}>
              <span className="vc-name">{name.trim()}</span>
              <span className="vc-sub">The one you just had</span>
            </button>
            <button className="versus-card" onClick={() => choose(false)}>
              <span className="vc-name">{candidate.name}</span>
              <span className="vc-sub">{candidate.area || 'Already ranked'}</span>
            </button>
            <div className="vs-or">or</div>
            <button
              className="btn ghost"
              style={{ marginTop: 0 }}
              onClick={() => choose(Math.random() < 0.5)}
            >
              Too close to call
            </button>
          </>
        )}

        {/* ---------- STEP 4: result + optional details ---------- */}
        {step === 'result' && (
          <>
            <div style={{ textAlign: 'center', marginTop: 22 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--soft)' }}>
                {existing ? `Another visit to ${existing.name}` : name.trim()}
              </div>
              <div
                style={{
                  fontFamily: 'var(--display)',
                  fontWeight: 'var(--disp-weight)',
                  fontSize: 60,
                  lineHeight: 1.1,
                  color: 'var(--ink)',
                  marginTop: 4,
                }}
              >
                {(existing ? existing.score : result?.score ?? 0).toFixed(1)}
              </div>
              <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>
                {existing ? "You've ranked this one before — saving today's visit." : 'out of 10 · added to your rankings'}
              </p>
            </div>

            {!showDetails ? (
              <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setShowDetails(true)}>
                + Add details (freshness, notes)
              </button>
            ) : (
              <>
                <div className="label">When did you go?</div>
                <input
                  className="input"
                  type="time"
                  value={freshness}
                  onChange={(e) => setFreshness(e.target.value)}
                />
                <p className="muted" style={{ fontSize: 12, margin: '6px 2px 0' }}>
                  A croissant at 7am ≠ 4pm — freshness matters.
                </p>
                <div className="label">Notes</div>
                <textarea
                  className="input"
                  placeholder="Shatteringly flaky, deep blistered crust…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            )}

            <button className="btn" style={{ marginTop: 18 }} onClick={save}>
              Save
            </button>
          </>
        )}
      </div>
    </div>
  )
}
