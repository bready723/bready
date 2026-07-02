import { useState } from 'react'
import { BREADS, breadEmoji, breadLabel } from '../lib/breads.js'
import MapView from './MapView.jsx'

export default function Rankings({ bakeries, onOpen, onLog, onUpdateBakery }) {
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('list') // list | map

  const list =
    filter === 'all' ? bakeries : bakeries.filter((b) => (b.breads || []).includes(filter))

  return (
    <main className="screen">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h1 className="title">My rankings</h1>
          <p className="subtitle">Every bakery, in order.</p>
        </div>
        {bakeries.length > 0 && (
          <div className="segment">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
              List
            </button>
            <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>
              Map
            </button>
          </div>
        )}
      </div>

      {bakeries.length === 0 && (
        <div className="empty">
          <div className="head">Nothing ranked yet.</div>
          <p>Your first croissant awaits.</p>
          <button className="btn" style={{ maxWidth: 200, margin: '20px auto 0' }} onClick={onLog}>
            Log a bakery
          </button>
        </div>
      )}

      {bakeries.length > 0 && view === 'map' && (
        <div style={{ marginTop: 18 }}>
          <MapView bakeries={bakeries} onOpen={onOpen} onGeocode={onUpdateBakery} />
        </div>
      )}

      {bakeries.length > 0 && view === 'list' && (
        <>
          <div className="filter-row">
            <button
              className={`filter-chip ${filter === 'all' ? 'on' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {BREADS.map((b) => (
              <button
                key={b.key}
                className={`filter-chip ${filter === b.key ? 'on' : ''}`}
                onClick={() => setFilter(b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13.5, padding: '36px 0' }}>
              No {breadLabel(filter).toLowerCase()} logged yet.
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
                  <div className="score">{b.score.toFixed(1)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
