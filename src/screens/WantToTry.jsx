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
      <p className="subtitle">Your bakery wishlist. Went? Tap “I went” to rank it.</p>

      <div className="card">
        <input
          className="input"
          placeholder="Bakery name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          className="input"
          style={{ marginTop: 10 }}
          placeholder="Area (optional)"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button className="btn" style={{ marginTop: 12 }} disabled={!name.trim()} onClick={add}>
          Add to wishlist
        </button>
      </div>

      {wantToTry.length === 0 ? (
        <div className="empty">
          <div className="big">🔖</div>
          <p>Nothing saved yet.</p>
        </div>
      ) : (
        wantToTry.map((w) => (
          <div key={w.id} className="rank-row" style={{ cursor: 'default' }}>
            <div className="meta">
              <div className="name">{w.name}</div>
              {w.area && <div className="tags">{w.area}</div>}
            </div>
            <button className="btn row" onClick={() => onWent(w)}>
              I went
            </button>
            <button
              className="speak"
              title="Remove"
              style={{ marginLeft: 8 }}
              onClick={() => remove(w.id)}
            >
              ✕
            </button>
          </div>
        ))
      )}
    </main>
  )
}
