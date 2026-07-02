import { useState } from 'react'
import { uid } from '../lib/storage.js'

export default function WantToTry({ wantToTry, onChange, onWent }) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')

  function add() {
    if (!name.trim()) return
    onChange([{ id: uid(), name: name.trim(), area: area.trim() }, ...wantToTry])
    setName('')
    setArea('')
  }

  const remove = (id) => onChange(wantToTry.filter((w) => w.id !== id))

  return (
    <main className="screen">
      <h1 className="title">Want to try</h1>
      <p className="subtitle">The wishlist. Went? Rank it.</p>

      <div className="card" style={{ marginTop: 20 }}>
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
        <div className="empty" style={{ paddingTop: 64 }}>
          <div className="head" style={{ fontSize: 21 }}>Nothing saved yet.</div>
          <p>Heard about a place? Keep it here.</p>
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
    </main>
  )
}
