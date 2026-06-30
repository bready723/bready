import { useState } from 'react'
import { BREADS, breadEmoji } from '../lib/breads.js'

export default function Rankings({ bakeries, onOpen, onLog }) {
  const [filter, setFilter] = useState('all')

  const list =
    filter === 'all' ? bakeries : bakeries.filter((b) => (b.breads || []).includes(filter))

  return (
    <main className="screen">
      <h1 className="title">My rankings</h1>
      <p className="subtitle">Your personal bakery leaderboard.</p>

      {bakeries.length === 0 ? (
        <div className="empty">
          <div className="big">🥐</div>
          <p>
            No bakeries yet.
            <br />
            Tap the <strong>+</strong> to log your first one.
          </p>
          <button className="btn" style={{ maxWidth: 220, margin: '14px auto 0' }} onClick={onLog}>
            Log a bakery
          </button>
        </div>
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 16 }}>
            <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
              All
            </button>
            {BREADS.map((b) => (
              <button
                key={b.key}
                className={`chip ${filter === b.key ? 'on' : ''}`}
                onClick={() => setFilter(b.key)}
              >
                {b.emoji} {b.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
              No bakeries logged for {breadEmoji(filter)} {filter} yet.
            </p>
          ) : (
            list.map((b, i) => (
              <div key={b.id} className="rank-row" onClick={() => onOpen(b.id)}>
                <div className="num">{i + 1}</div>
                <div className="meta">
                  <div className="name">{b.name}</div>
                  <div className="tags">
                    {b.area ? `${b.area} · ` : ''}
                    {(b.breads || []).map((k) => breadEmoji(k)).join(' ') || '—'}
                  </div>
                </div>
                <div className="score-pill">{b.score.toFixed(1)}</div>
              </div>
            ))
          )}
        </>
      )}
    </main>
  )
}
