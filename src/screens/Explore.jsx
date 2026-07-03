import { useState } from 'react'
import MapView from './MapView.jsx'
import { BREADS, breadEmoji, breadLabel } from '../lib/breads.js'
import { uid } from '../lib/storage.js'

// A few "The Bear"-style lines — one shows at random each time you open Explore.
const INSPIRATION = [
  'Every second counts.',
  'A good loaf is a whole day’s patience.',
  'Respect the crumb.',
  'The best bakery is the one you haven’t found yet.',
  'Butter, flour, time. That’s the whole secret.',
  'Chase the fresh-out-of-the-oven moment.',
]

function pickInspiration() {
  return INSPIRATION[Math.floor(Math.random() * INSPIRATION.length)]
}

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch (e) {
    return ''
  }
}

// Roll up simple, honest stats from the ranked bakeries.
function computeStats(bakeries) {
  if (bakeries.length === 0) return null
  const breadTally = {}
  const cities = new Set()
  let best = bakeries[0]
  for (const b of bakeries) {
    if (b.area) cities.add(b.area.trim().toLowerCase())
    for (const k of b.breads || []) breadTally[k] = (breadTally[k] || 0) + 1
    if ((b.score ?? 0) > (best.score ?? 0)) best = b
  }
  const topKey = Object.keys(breadTally).sort((a, c) => breadTally[c] - breadTally[a])[0]
  return {
    count: bakeries.length,
    topBread: topKey ? `${breadEmoji(topKey)} ${breadLabel(topKey)}` : '—',
    cities: cities.size,
    best,
  }
}

export default function Explore({ bakeries, notes, onChangeNotes, onOpen, onUpdateBakery, onPickBread }) {
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [quote] = useState(pickInspiration)

  const stats = computeStats(bakeries)

  function addNote() {
    const text = draft.trim()
    if (!text) return
    onChangeNotes([{ id: uid(), ts: Date.now(), text }, ...notes])
    setDraft('')
  }
  function deleteNote(id) {
    onChangeNotes(notes.filter((n) => n.id !== id))
  }
  function saveEdit() {
    const text = editText.trim()
    onChangeNotes(
      notes.map((n) => (n.id === editingId ? { ...n, text: text || n.text } : n)),
    )
    setEditingId(null)
    setEditText('')
  }

  return (
    <main className="screen">
      <h1 className="title">Explore</h1>
      <p className="subtitle">Your bread world.</p>

      {/* ---------- INSPIRATION BANNER (The Bear frame) ---------- */}
      <div className="inspire-banner">
        <span className="eyebrow">bready kitchen</span>
        <span className="line">{quote}</span>
      </div>

      {/* ---------- QUICK NOTES ---------- */}
      <div className="explore-section-label">Quick notes</div>
      <div className="note-add">
        <input
          className="input"
          placeholder="Jot something down — at the bakery or on the road…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNote()}
        />
        <button className="btn" style={{ width: 'auto', padding: '0 18px' }} disabled={!draft.trim()} onClick={addNote}>
          Save
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, margin: '12px 2px 0' }}>
          No notes yet — capture a thought, a craving, a “go back for the kouign-amann.”
        </p>
      ) : (
        <div style={{ marginTop: 8 }}>
          {notes.map((n) => (
            <div key={n.id} className="note-row">
              <div className="body">
                {editingId === n.id ? (
                  <>
                    <textarea
                      className="input"
                      value={editText}
                      autoFocus
                      onChange={(e) => setEditText(e.target.value)}
                      style={{ minHeight: 60 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn row" onClick={saveEdit}>Save</button>
                      <button className="btn ghost row" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="text"
                      onClick={() => {
                        setEditingId(n.id)
                        setEditText(n.text)
                      }}
                    >
                      {n.text}
                    </div>
                    <div className="when">{fmtDate(n.ts)}</div>
                  </>
                )}
              </div>
              {editingId !== n.id && (
                <button className="x" title="Delete" onClick={() => deleteNote(n.id)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---------- STATS RECAP ---------- */}
      <div className="explore-section-label">Your bread stats</div>
      {stats ? (
        <div className="stat-card">
          <div className="big">You’ve ranked {stats.count} baker{stats.count === 1 ? 'y' : 'ies'}.</div>
          <div className="row">
            <div className="cell">
              <div className="k">Top bread</div>
              <div className="v">{stats.topBread}</div>
            </div>
            <div className="cell">
              <div className="k">Neighborhoods</div>
              <div className="v">{stats.cities || '—'}</div>
            </div>
            <div className="cell">
              <div className="k">Best</div>
              <div className="v">{(stats.best.score ?? 0).toFixed(1)} · {stats.best.name}</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 13, margin: '10px 2px 0' }}>
          Rank your first bakery and your stats appear here.
        </p>
      )}

      {/* ---------- MAP ---------- */}
      {bakeries.length > 0 && (
        <>
          <div className="explore-section-label">On the map</div>
          <MapView bakeries={bakeries} onOpen={onOpen} onGeocode={onUpdateBakery} />
        </>
      )}

      {/* ---------- BEST BY BREAD (tap to filter your rankings) ---------- */}
      <div className="explore-section-label">Best by bread</div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 2px 4px' }}>
        Tap a bread to see your top spots for it.
      </p>
      <div className="glossary-strip">
        {BREADS.map((b) => (
          <button key={b.key} className="gcard" onClick={() => onPickBread(b.key)}>
            <div className="emoji">{b.emoji}</div>
            <div className="lbl">{b.label}</div>
          </button>
        ))}
      </div>
    </main>
  )
}
