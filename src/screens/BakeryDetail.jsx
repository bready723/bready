import { TIERS } from '../lib/ranking.js'
import { breadEmoji, breadLabel } from '../lib/breads.js'

export default function BakeryDetail({ bakery, onClose }) {
  const tier = TIERS[bakery.tier]
  const visits = bakery.visits || []

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{bakery.name}</h2>
            {bakery.area && <div className="muted">{bakery.area}</div>}
          </div>
          <span
            className="score-pill"
            style={{ marginLeft: 'auto', fontSize: 22, padding: '10px 14px' }}
          >
            {bakery.score.toFixed(1)}
          </span>
        </div>

        {tier && (
          <p style={{ marginTop: 10 }}>
            {tier.emoji} <strong>{tier.label}</strong>
          </p>
        )}

        <div className="label">Breads you've had</div>
        <div className="chips">
          {(bakery.breads || []).length === 0 ? (
            <span className="muted">—</span>
          ) : (
            bakery.breads.map((k) => (
              <span key={k} className="chip on">
                {breadEmoji(k)} {breadLabel(k)}
              </span>
            ))
          )}
        </div>

        <div className="label">Visits</div>
        {visits.length === 0 ? (
          <p className="muted">No visit notes yet.</p>
        ) : (
          visits
            .slice()
            .reverse()
            .map((v, i) => (
              <div key={i} className="card" style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700 }}>
                  {v.date}
                  {v.freshnessTime ? ` · ⏰ ${v.freshnessTime}` : ''}
                </div>
                <div className="muted" style={{ marginTop: 2 }}>
                  {(v.breads || []).map((k) => breadEmoji(k)).join(' ')}
                </div>
                {v.notes && <div style={{ marginTop: 6 }}>{v.notes}</div>}
              </div>
            ))
        )}

        <button className="btn ghost" style={{ marginTop: 16 }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
