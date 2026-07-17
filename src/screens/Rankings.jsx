import { useState } from 'react'
import { BREADS, breadEmoji, breadLabel } from '../lib/breads.js'
import { IconSearch } from '../components/Icons.jsx'

export default function Rankings({ bakeries, filter, onFilter, onOpen, onLog }) {
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const list = bakeries
    .filter((b) => filter === 'all' || (b.breads || []).includes(filter))
    .filter((b) => {
      if (!query) return true
      const hay = `${b.name} ${b.area || ''} ${(b.breads || []).map(breadLabel).join(' ')}`.toLowerCase()
      return hay.includes(query)
    })

  return (
    <main className="screen">
      <h1 className="title">My rankings</h1>
      <p className="subtitle">Every bakery, in order.</p>

      {bakeries.length === 0 && (
        <div className="empty">
          <div className="head">Nothing ranked yet.</div>
          <p>Your first croissant awaits.</p>
          <button className="btn" style={{ maxWidth: 200, margin: '20px auto 0' }} onClick={onLog}>
            Log a bakery
          </button>
        </div>
      )}

      {bakeries.length > 0 && (
        <>
          <div className="searchbar">
            <IconSearch width={16} height={16} />
            <input
              placeholder="Search your bakeries…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button className="clear" onClick={() => setQ('')} title="Clear">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          <div className="filter-row">
            <button
              className={`filter-chip ${filter === 'all' ? 'on' : ''}`}
              onClick={() => onFilter('all')}
            >
              All
            </button>
            {BREADS.map((b) => (
              <button
                key={b.key}
                className={`filter-chip ${filter === b.key ? 'on' : ''}`}
                onClick={() => onFilter(b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13.5, padding: '36px 0' }}>
              {query ? `No match for “${q}”.` : `No ${breadLabel(filter).toLowerCase()} logged yet.`}
            </p>
          ) : (
            <div>
              {list.map((b, i) => (
                <div key={b.id} className="rank-row" onClick={() => onOpen(b.id)}>
                  <div className="num">{i + 1}</div>
                  {b.photo ? (
                    <img className="thumb" src={b.photo} alt="" />
                  ) : (
                    <div
                      className="thumb"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                      }}
                    >
                      {breadEmoji((b.breads || [])[0])}
                    </div>
                  )}
                  <div className="meta">
                    <div className="name">{b.name}</div>
                    <div className="tags">
                      {b.area ? `${b.area} · ` : ''}
                      {(b.breads || []).map((k) => breadLabel(k)).join(', ') || '—'}
                    </div>
                  </div>
                  <div className="score-circle">{b.score.toFixed(1)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating add button — log a visit from where your bakeries live.
          Anchored to the app column's bottom-right, above the tab bar. */}
      <div className="fab-anchor">
        <button className="fab-float" onClick={onLog} aria-label="Log a visit" title="Log a visit">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </main>
  )
}
