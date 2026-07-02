import { useState } from 'react'
import { breadLabel } from '../lib/breads.js'

// Searches across everything: ranked bakeries (tap → detail) and saved
// want-to-try places (tap → start a log). Matches name, area, or bread.
export default function Search({ bakeries, wantToTry, onOpen, onWent }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const matches = (text) => (text || '').toLowerCase().includes(query)

  const ranked = bakeries.filter(
    (b) =>
      matches(b.name) ||
      matches(b.area) ||
      (b.breads || []).some((k) => matches(breadLabel(k))),
  )
  const saved = wantToTry.filter((w) => matches(w.name) || matches(w.area))

  const showResults = query.length > 0
  const none = showResults && ranked.length === 0 && saved.length === 0

  return (
    <main className="screen">
      <h1 className="title">Search</h1>
      <p className="subtitle">Everything ranked or saved.</p>

      <div style={{ position: 'relative', marginTop: 18 }}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--soft)"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M16.8 16.8L21 21" />
        </svg>
        <input
          className="input"
          style={{ paddingLeft: 38 }}
          placeholder="Bakery, area, bread…"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {showResults && (
        <div style={{ marginTop: 8 }}>
          {ranked.map((b) => (
            <div key={b.id} className="rank-row" onClick={() => onOpen(b.id)}>
              <div className="meta">
                <div className="name">{b.name}</div>
                <div className="tags">
                  {b.area ? `${b.area} · ` : ''}
                  {(b.breads || []).map((k) => breadLabel(k)).join(', ') || '—'}
                </div>
              </div>
              <div className="score" style={{ fontSize: 20 }}>
                {b.score.toFixed(1)}
              </div>
            </div>
          ))}
          {saved.map((w) => (
            <div key={w.id} className="rank-row" onClick={() => onWent(w)}>
              <div className="meta">
                <div className="name">{w.name}</div>
                <div className="tags">{w.area || 'On your wishlist'}</div>
              </div>
              <span className="saved-badge">Saved</span>
            </div>
          ))}
        </div>
      )}

      {none && (
        <p className="muted" style={{ textAlign: 'center', fontSize: 13.5, padding: '36px 0' }}>
          Nothing matches “{q}”.
        </p>
      )}
    </main>
  )
}
