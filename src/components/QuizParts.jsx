import { useEffect, useRef, useState } from 'react'
import { cleanName, DEFAULT_NAME, NAME_MAX } from '../lib/quiz.js'

// End of game: tap who played. The game is saved already, so skipping this is fine.
// Tapping the ticked name edits it (a typo'd name is fixed on every game saved under it).
export function NameCard({ current, names, onPick, onRename }) {
  const known = current !== DEFAULT_NAME
  // fixed for the life of the card, so switching names never drops one from the list
  const [picks, setPicks] = useState(() => (known ? [current, ...names.filter((n) => n !== current)] : names).slice(0, 5))
  const [typing, setTyping] = useState(!known && !names.length)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(null) // the name being fixed, or null when adding one
  const input = useRef(null)
  // focus only after "+ New name" is tapped; focusing on arrival would pop the
  // phone keyboard over the score
  const asked = useRef(false)
  useEffect(() => { if (typing && asked.current) input.current?.focus() }, [typing])
  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    const name = cleanName(draft)
    if (editing && onRename) {
      setPicks((list) => [...new Set(list.map((n) => (n === editing ? name : n)))])
      onRename(editing, name)
    } else {
      setPicks((list) => [name, ...list.filter((n) => n !== name)].slice(0, 5))
      onPick(name)
    }
    setEditing(null)
    setTyping(false)
  }
  return (
    <div className="glass q-namecard">
      <p className="q-eyebrow">Who played?</p>
      {typing ? (
        <form className="q-name-form" onSubmit={submit}>
          <input
            ref={input}
            className="q-name-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={NAME_MAX}
            placeholder="Your name"
            aria-label={editing ? `Fix the name ${editing}` : 'Your name'}
            enterKeyHint="done"
            autoComplete="off"
          />
          <button className="q-btn save" type="submit" disabled={!draft.trim()}>Save</button>
          {(picks.length > 0 || editing) && (
            <button className="q-name-cancel" type="button" onClick={() => { setEditing(null); setTyping(false) }}>Cancel</button>
          )}
        </form>
      ) : (
        <div className="q-name-picks" role="group" aria-label="Who played?">
          {picks.map((n) => (
            <button
              key={n}
              type="button"
              className={`q-name-chip${n === current ? ' on' : ''}`}
              aria-pressed={n === current}
              aria-label={n === current && onRename ? `${n}, tap to edit` : n}
              onClick={() => {
                if (n !== current) return onPick(n)
                if (!onRename) return
                asked.current = true; setEditing(n); setDraft(n); setTyping(true)
              }}
            >
              {n === current && <span aria-hidden="true">✓ </span>}{n}
              {n === current && onRename && <span className="q-name-edit" aria-hidden="true">✎</span>}
            </button>
          ))}
          <button type="button" className="q-name-chip add" onClick={() => { asked.current = true; setDraft(''); setTyping(true) }}>+ New name</button>
        </div>
      )}
    </div>
  )
}

export function Backdrop() {
  return (
    <div className="q-bg" aria-hidden="true">
      <i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" />
    </div>
  )
}
