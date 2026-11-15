import { useEffect, useRef, useState } from 'react'
import { cleanName, DEFAULT_NAME, NAME_MAX } from '../lib/quiz.js'

// End of game: tap who played. The game is saved already, so skipping this is fine.
export function NameCard({ current, names, onPick }) {
  const known = current !== DEFAULT_NAME
  // fixed for the life of the card, so switching names never drops one from the list
  const [picks, setPicks] = useState(() => (known ? [current, ...names.filter((n) => n !== current)] : names).slice(0, 5))
  const [typing, setTyping] = useState(!known && !names.length)
  const [draft, setDraft] = useState('')
  const input = useRef(null)
  // focus only after "+ New name" is tapped; focusing on arrival would pop the
  // phone keyboard over the score
  const asked = useRef(false)
  useEffect(() => { if (typing && asked.current) input.current?.focus() }, [typing])
  const submit = (e) => {
    e.preventDefault()
    if (!draft.trim()) return
    const name = cleanName(draft)
    setPicks((list) => [name, ...list.filter((n) => n !== name)].slice(0, 5))
    onPick(name)
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
            aria-label="Your name"
            enterKeyHint="done"
            autoComplete="off"
          />
          <button className="q-btn save" type="submit" disabled={!draft.trim()}>Save</button>
          {picks.length > 0 && (
            <button className="q-name-cancel" type="button" onClick={() => setTyping(false)}>Cancel</button>
          )}
        </form>
      ) : (
        <div className="q-name-picks" role="group" aria-label="Who played?">
          {picks.map((n) => (
            <button key={n} type="button" className={`q-name-chip${n === current ? ' on' : ''}`} aria-pressed={n === current} onClick={() => n !== current && onPick(n)}>
              {n === current && <span aria-hidden="true">✓ </span>}{n}
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
