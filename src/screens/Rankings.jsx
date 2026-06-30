import { useState } from 'react'
import { BREADS, breadEmoji } from '../lib/breads.js'
import MapView from './MapView.jsx'

export default function Rankings({ bakeries, onOpen, onLog, onUpdateBakery }) {
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list') // list | map

  const list =
    filter === 'all' ? bakeries : bakeries.filter((b) => (b.breads || []).includes(filter))

  return (
    <main className="screen">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h1 className="title">My rankings</h1>
          <p className="subtitle">Your personal bakery leaderboard.</p>
        </div>
        {bakeries.length > 0 && (
          <div className="chips" style={{ flexWrap: 'nowrap' }}>
            <button className={`chip ${view === 'list' ? 'on' : ''}`} onClick={() => setView('list')}>
              List
            </button>
            <button className={`chip ${view === 'map' ? 'on' : ''}`} onClick={() => setView('map')}>
              🗺️ Map
            </button>
          </div>
        )}
      </div>

      {bakeries.length > 0 && view === 'map' && (
        <div style={{ marginTop: 8 }}>
          <MapView bakeries={bakeries} onOpen={onOpen} onGeocode={onUpdateBakery} />
        </div>
      )}

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
      ) : view === 'map' ? null : (
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
