import { useEffect, useState } from 'react'
import MapView from './MapView.jsx'
import { BREADS, breadEmoji, breadLabel } from '../lib/breads.js'
import { uid } from '../lib/storage.js'

// The Bready Kitchen banner. Rotates every 10s in RANDOM order, but always opens
// on "Every second counts." (The Bear) on first render. The set blends The Bear's
// kitchen ethos, Will Guidara's *Unreasonable Hospitality*, and bread/craft lines
// — all short, paraphrased, made-for-a-banner.
const INSPIRATION = [
  'Every second counts.', // The Bear — index 0, the opener
  // --- The Bear / kitchen ethos ---
  'Let it rip.',
  'Respect the craft.',
  'Yes, chef.',
  'Dial it in.',
  'Every plate matters.',
  'Cook with intention.',
  'Push yourself, then push again.',
  'Fear is the price of ambition.',
  'Do it right, or do it again.',
  'Consistency is the craft.',
  'Sharpen your knives, sharpen your focus.',
  'The kitchen is a team sport.',
  'Care is the ingredient you can taste.',
  'Clean as you go.',
  'Everything in its place.',
  'The rush reveals who you are.',
  'Excellence is a habit, not an accident.',
  'Repetition is where mastery hides.',
  'A calm kitchen is a confident kitchen.',
  // --- Unreasonable Hospitality (Will Guidara) ---
  'Be unreasonable in the pursuit of hospitality.',
  'Unreasonable hospitality.',
  'The pursuit of excellence.',
  'Make people feel seen.',
  'Give people more than they expect.',
  'Hospitality is a dialogue, not a monologue.',
  'The little things are the big things.',
  'Turn a transaction into a relationship.',
  'Create a sense of belonging.',
  'Be the reason someone feels welcome.',
  'Legacy is what you leave in people.',
  'Excellence lives in the details.',
  'Take care of each other.',
  'Be on the same side as your guest.',
  'The magic is in the unreasonable.',
  'Surprise and delight.',
  'Give people a story to tell.',
  'Presence is a gift.',
  'Generosity is a competitive advantage.',
  'Hospitality is a choice you make on purpose.',
  'Anticipate, then exceed.',
  'Make the ordinary unforgettable.',
  'Notice what others miss.',
  'Leave people better than you found them.',
  'The unreasonable becomes the unforgettable.',
  'Chase the “how did they know?”',
  'Give more than the recipe requires.',
  'Warmth scales.',
  // --- Bread & the bakery ---
  'A good loaf is a whole day’s patience.',
  'Chase the fresh-out-of-the-oven moment.',
  'Respect the crumb.',
  'Trust the slow rise.',
  'Flour, water, salt, time.',
  'Great bread can’t be rushed.',
  'The oven doesn’t lie.',
  'Patience is the secret ingredient.',
  'Feed the starter, feed the soul.',
  'The crust tells the story.',
  'Warm bread, warm heart.',
  'Bake like someone you love is waiting.',
  'The best crumb is honest.',
  'Let the dough tell you when.',
  'A blistered crust is earned.',
  'Simple ingredients, endless care.',
  'Every bake teaches you something.',
  'The loaf remembers your hands.',
  'Good things take time to rise.',
  'Sourdough rewards the patient.',
  'Butter is not optional.',
  'A great croissant is layers of patience.',
  'Steam, score, wait.',
  'Bread is love you can hold.',
  'The oven spring is the reward.',
  'Knead today, feast tomorrow.',
  'A bakery smells like morning.',
  'Break bread, build people.',
  'The first bite should feel like a secret.',
  'Nothing beats the heel of a warm baguette.',
  // --- Craft, in general ---
  'Make it worth the trip.',
  'Do small things with great care.',
  'Show up like it’s opening day.',
  'Standards are what you tolerate.',
  'Craft over speed, always.',
  'A little better, every day.',
  'Taste, adjust, repeat.',
  'The joy is in the making.',
]

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
  const [quoteIdx, setQuoteIdx] = useState(0) // always opens on "Every second counts."
  const [quoteShown, setQuoteShown] = useState(true) // drives the fade

  // Rotate the banner quote every 10s with a short cross-fade — RANDOM order,
  // never repeating the one currently on screen.
  useEffect(() => {
    const tick = setInterval(() => {
      setQuoteShown(false)
      setTimeout(() => {
        setQuoteIdx((i) => {
          if (INSPIRATION.length < 2) return i
          let n = i
          while (n === i) n = Math.floor(Math.random() * INSPIRATION.length)
          return n
        })
        setQuoteShown(true)
      }, 320)
    }, 10000)
    return () => clearInterval(tick)
  }, [])

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
        <span
          className="line"
          style={{ opacity: quoteShown ? 1 : 0, transition: 'opacity 0.32s ease' }}
        >
          {INSPIRATION[quoteIdx]}
        </span>
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
