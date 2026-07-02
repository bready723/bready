import { useRef } from 'react'
import { TIERS } from '../lib/ranking.js'
import { breadLabel } from '../lib/breads.js'
import { googleMapsUrl } from '../lib/maps.js'

// Downscale a picked image to a small data URL so it fits comfortably in
// localStorage (real cloud photo storage comes with the Supabase step).
function fileToThumb(file, onDone) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const max = 900
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      onDone(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}

export default function BakeryDetail({ bakery, onClose, onUpdateBakery }) {
  const tier = TIERS[bakery.tier]
  const visits = (bakery.visits || []).slice().reverse()
  const fileRef = useRef(null)

  const visitMeta =
    visits.length > 0
      ? `${visits.length} visit${visits.length > 1 ? 's' : ''} · last ${visits[0].date}`
      : 'No visits logged'

  function onPick(e) {
    const file = e.target.files && e.target.files[0]
    if (file) fileToThumb(file, (photo) => onUpdateBakery(bakery.id, { photo }))
    e.target.value = ''
  }

  return (
    <div className="detail">
      <div style={{ position: 'relative' }}>
        {bakery.photo ? (
          <img
            className="hero"
            src={bakery.photo}
            alt=""
            onClick={() => fileRef.current?.click()}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <div className="hero-empty" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
            Drop a photo — the storefront, the haul, the crumb
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
        <button className="back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div className="body">
        <h2>{bakery.name}</h2>
        {bakery.area && <div className="area">{bakery.area}</div>}

        <div className="score-block">
          <div className="score-big">{bakery.score.toFixed(1)}</div>
          <div className="tier-info">
            <div className="tier-name">{tier ? tier.label : '—'}</div>
            <div className="visit-meta">{visitMeta}</div>
          </div>
        </div>

        <a className="maps-link" href={googleMapsUrl(bakery)} target="_blank" rel="noopener noreferrer">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s-6-5.1-6-10a6 6 0 1112 0c0 4.9-6 10-6 10z" />
            <circle cx="12" cy="11" r="2.2" />
          </svg>
          View on Google Maps
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>

        <div className="divider" />

        <div className="label">Breads you've had</div>
        <div className="chips">
          {(bakery.breads || []).length === 0 ? (
            <span className="muted">—</span>
          ) : (
            bakery.breads.map((k) => (
              <span key={k} className="bread-tag">
                {breadLabel(k)}
              </span>
            ))
          )}
        </div>

        <div className="label">Visits</div>
        {visits.length === 0 ? (
          <p className="muted" style={{ fontSize: 13.5 }}>No visit notes yet.</p>
        ) : (
          visits.map((v, i) => (
            <div key={i} className="visit-row">
              <div className="head">
                {v.date}
                {v.freshnessTime ? ` · ${v.freshnessTime}` : ''}
              </div>
              <div className="b">{(v.breads || []).map((k) => breadLabel(k)).join(', ') || '—'}</div>
              {v.notes && <div className="notes">{v.notes}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
