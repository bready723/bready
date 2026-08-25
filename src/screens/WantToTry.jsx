import { useState } from 'react'
import { uid } from '../lib/storage.js'
import { SEED_CITIES } from '../lib/seed.js'
import { IconSearch } from '../components/Icons.jsx'

export default function WantToTry({ wantToTry, onChange, onWent, onOpenDiscover }) {
  const [mode, setMode] = useState('mine') // mine | discover
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [dq, setDq] = useState('')
  const [openCity, setOpenCity] = useState(SEED_CITIES[0]?.city || null)

  function add() {
    if (!name.trim()) return
    onChange([{ id: uid(), name: name.trim(), area: area.trim() }, ...wantToTry])
    setName('')
    setArea('')
  }

  const remove = (id) => onChange(wantToTry.filter((w) => w.id !== id))

  // Already-saved names (case-insensitive) so Discover can show "Added".
  const savedNames = new Set(wantToTry.map((w) => w.name.trim().toLowerCase()))
  const addFromDiscover = (b) => {
    if (savedNames.has(b.name.trim().toLowerCase())) return
    // Keep the curated photo/coords/city so they survive to the ranking step.
    onChange([
      { id: uid(), name: b.name, area: b.area, photo: b.photo, lat: b.lat, lng: b.lng, city: b.city },
      ...wantToTry,
    ])
  }

  const query = dq.trim().toLowerCase()
  const discoverCities = SEED_CITIES.map((c) => ({
    ...c,
    matches: c.bakeries.filter((b) =>
      !query ? true : `${b.name} ${b.area} ${c.city}`.toLowerCase().includes(query),
    ),
  })).filter((c) => c.matches.length > 0)

  return (
    <section>
      <div className="section-title">Want to try</div>
      <p className="subtitle" style={{ margin: '0 2px' }}>
        Your wishlist — and famous spots to discover.
      </p>

      <div className="segment" style={{ marginTop: 14, width: '100%' }}>
        <button
          className={mode === 'mine' ? 'on' : ''}
          style={{ flex: 1 }}
          onClick={() => setMode('mine')}
        >
          My list
        </button>
        <button
          className={mode === 'discover' ? 'on' : ''}
          style={{ flex: 1 }}
          onClick={() => setMode('discover')}
        >
          Discover
        </button>
      </div>

      {/* ---------- MY LIST ---------- */}
      {mode === 'mine' && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <input
              className="input"
              style={{ background: 'var(--surface-2)' }}
              placeholder="Bakery name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <input
              className="input"
              style={{ background: 'var(--surface-2)', marginTop: 10 }}
              placeholder="Area (optional)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn row" disabled={!name.trim()} onClick={add}>
                Add to list
              </button>
            </div>
          </div>

          {wantToTry.length === 0 ? (
            <div className="empty" style={{ paddingTop: 56 }}>
              <div className="head" style={{ fontSize: 21 }}>Nothing saved yet.</div>
              <p>Heard about a place? Keep it here — or tap Discover.</p>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              {wantToTry.map((w) => (
                <div
                  key={w.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '15px 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600 }}>{w.name}</div>
                    {w.area && (
                      <div style={{ fontSize: 12.5, color: 'var(--soft)', marginTop: 3 }}>{w.area}</div>
                    )}
                  </div>
                  <button className="btn outline row" onClick={() => onWent(w)}>
                    I went
                  </button>
                  <button
                    title="Remove"
                    onClick={() => remove(w.id)}
                    style={{
                      cursor: 'pointer',
                      background: 'none',
                      border: 0,
                      color: 'var(--faint)',
                      padding: 6,
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ---------- DISCOVER ---------- */}
      {mode === 'discover' && (
        <>
          <div className="searchbar">
            <IconSearch width={16} height={16} />
            <input
              placeholder="Search famous bakeries…"
              value={dq}
              onChange={(e) => setDq(e.target.value)}
            />
            {dq && (
              <button className="clear" onClick={() => setDq('')} title="Clear">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          {discoverCities.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', fontSize: 13.5, padding: '36px 0' }}>
              No match for “{dq}”.
            </p>
          )}

          {discoverCities.map((c) => {
            const open = query ? true : openCity === c.city
            return (
              <div key={c.city} className="discover-city">
                <div
                  className="city-head"
                  onClick={() => !query && setOpenCity(open ? null : c.city)}
                >
                  <span>{c.city}</span>
                  <span className="count">{c.matches.length} spots</span>
                </div>
                {open &&
                  c.matches.map((b) => {
                    const added = savedNames.has(b.name.trim().toLowerCase())
                    const withCity = { ...b, city: c.city }
                    return (
                      <div key={b.name} className="discover-row">
                        {b.photo && (
                          <img className="disc-thumb" src={b.photo} alt="" loading="lazy" />
                        )}
                        <div
                          className="info"
                          style={{ cursor: 'pointer' }}
                          onClick={() => onOpenDiscover(withCity)}
                        >
                          <div className="nm">{b.name}</div>
                          <div className="ar">{b.area}</div>
                        </div>
                        <div className="disc-btns">
                          {added ? (
                            <span className="added">✓ Added</span>
                          ) : (
                            <button className="btn outline row" onClick={() => addFromDiscover(b)}>
                              + Add
                            </button>
                          )}
                          <button className="btn row" onClick={() => onWent(withCity)}>
                            Rank it
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )
          })}

          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, margin: '22px 2px 0' }}>
            Curated from public “best bakery” lists — tap a pin to confirm on Google Maps.
          </p>
        </>
      )}
    </section>
  )
}
