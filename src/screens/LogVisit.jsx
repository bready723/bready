import { useRef, useState } from 'react'
import { BREADS } from '../lib/breads.js'
import { uid, todayISO } from '../lib/storage.js'
import { TIERS, TIER_ORDER, createInsertion, insertAtTier, tierItems } from '../lib/ranking.js'

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
    // Treat it as a repeat visit only when BOTH name and area match — otherwise
    // two different "Boulangerie"s (Paris vs Lyon) would wrongly merge.
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
        {/* ---------- STEP 1: bakery + breads ---------- */}
        {step === 'info' && (
          <>
            <h2>Log a bakery</h2>
            <div className="label">Bakery name</div>
            <input
              className="input"
              placeholder="e.g. Bagel Nook"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            <div className="label">Area (optional)</div>
            <input
              className="input"
              placeholder="e.g. Princeton, NJ"
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
                  {b.emoji} {b.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 22 }}>
              <button className="btn" disabled={!name.trim()} onClick={onInfoNext}>
                Next
              </button>
              <button className="btn ghost" style={{ marginTop: 10 }} onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ---------- STEP 2: gut tier ---------- */}
        {step === 'tier' && (
          <>
            <h2>How was {name.trim()}?</h2>
            <p className="muted" style={{ marginTop: -6 }}>
              Go with your gut — you'll fine-tune next.
            </p>
            {TIER_ORDER.map((k) => (
              <button
                key={k}
                className="btn ghost"
                style={{ marginTop: 10, textAlign: 'left', fontSize: 17 }}
                onClick={() => pickTier(k)}
              >
                {TIERS[k].emoji} &nbsp;{TIERS[k].label}
              </button>
            ))}
          </>
        )}

        {/* ---------- STEP 3: comparisons ---------- */}
        {step === 'compare' && candidate && (
          <>
            <h2>Which did you prefer?</h2>
            <p className="muted" style={{ marginTop: -6 }}>
              Just a couple of quick taps.
            </p>
            <div className="versus">
              <button onClick={() => choose(true)}>{name.trim()}</button>
              <button onClick={() => choose(false)}>{candidate.name}</button>
            </div>
            <div className="vs-or">— or —</div>
            <button
              className="chip"
              style={{ display: 'block', margin: '0 auto' }}
              onClick={() => choose(Math.random() < 0.5)}
            >
              🤷 Too close to call
            </button>
          </>
        )}

        {/* ---------- STEP 4: result + optional details ---------- */}
        {step === 'result' && (
          <>
            <h2 style={{ textAlign: 'center' }}>
              {existing ? `Another visit to ${existing.name}` : name.trim()}
            </h2>
            <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
              <span
                className="score-pill"
                style={{ fontSize: 30, padding: '12px 20px', display: 'inline-block' }}
              >
                {(existing ? existing.score : result?.score ?? 0).toFixed(1)}
              </span>
            </div>
            <p className="muted" style={{ textAlign: 'center' }}>
              {existing
                ? "You've ranked this one before — saving today's visit."
                : 'out of 10 · added to your rankings'}
            </p>

            {!showDetails ? (
              <button
                className="btn ghost"
                style={{ marginTop: 14 }}
                onClick={() => setShowDetails(true)}
              >
                + Add details (photo notes, freshness)
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
                  A croissant at 7am ≠ 4pm — freshness matters. ⏰
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
