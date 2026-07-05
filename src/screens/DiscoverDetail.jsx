import { platformLinks } from '../lib/platforms.js'

// A famous-bakery page opened from Discover. It has no personal score/visits
// (Sara hasn't ranked it) — instead it links out to each ratings platform and
// lets her add it to her list or rank it if she's been.
export default function DiscoverDetail({ bakery, added, onClose, onAdd, onWent }) {
  const links = platformLinks(bakery)
  // Free, keyless Google Maps preview (the classic ?output=embed iframe).
  const mapQuery = encodeURIComponent([bakery.name, bakery.area].filter(Boolean).join(' '))
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&z=15&output=embed`

  return (
    <div className="detail">
      <div style={{ position: 'relative' }}>
        {bakery.photo ? (
          <img className="hero" src={bakery.photo} alt={bakery.name} loading="lazy" />
        ) : (
          <iframe
            title={`Map of ${bakery.name}`}
            className="hero"
            style={{ border: 0 }}
            src={mapSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
        <button className="back" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 6l-6 6 6 6" />
          </svg>
        </button>
      </div>

      <div className="body">
        <h2>{bakery.name}</h2>
        {bakery.area && <div className="area">{bakery.area}</div>}

        <div className="actions" style={{ marginTop: 18 }}>
          {added ? (
            <span className="action-pill" style={{ color: 'var(--soft)', cursor: 'default' }}>✓ On your list</span>
          ) : (
            <button className="action-pill" onClick={() => onAdd(bakery)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add to list
            </button>
          )}
          <button className="action-pill" onClick={() => onWent(bakery)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 20v-9M12 20V4M19 20v-6" /></svg>
            Rank it
          </button>
        </div>

        <div className="divider" />

        <div className="label">Ratings &amp; reviews</div>
        <div className="platform-grid">
          {links.map((p) => (
            <a key={p.key} className="platform-btn" href={p.url} target="_blank" rel="noopener noreferrer">
              <span>{p.label}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </a>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.55, marginTop: 12 }}>
          Tap a platform to see its live rating. In-app star scores from every platform arrive with the cloud version.
        </p>
      </div>
    </div>
  )
}
