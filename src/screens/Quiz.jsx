import { useEffect, useMemo, useReducer, useRef } from 'react'
import people from '../lib/people.json'
import { ROUND_SIZE, SECONDS, pickRound, scoreOf, initialState, quizReducer, photoUrl, creditLine } from '../lib/quiz.js'

const BASE = import.meta.env.BASE_URL
const RING_R = 42
const RING_C = 2 * Math.PI * RING_R

// 3D tilt + a sheen that follows the finger / pointer, as on the Goodlugg
// dashboard. Mouse: follows hover. Touch: tilts while pressed.
function useTilt(ref) {
  useEffect(() => {
    const root = ref.current
    if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let cur = null
    const clear = () => {
      if (!cur) return
      cur.classList.remove('tilt')
      for (const p of ['--rx', '--ry', '--mx', '--my']) cur.style.removeProperty(p)
      cur = null
    }
    const move = (e) => {
      const card = e.target.closest?.('.glass')
      if (cur && cur !== card) clear()
      cur = card
      if (!card) return
      const r = card.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
      const k = card.classList.contains('q-photo') ? 4 : 7
      card.style.setProperty('--ry', ((px - 0.5) * k).toFixed(2) + 'deg')
      card.style.setProperty('--rx', ((0.5 - py) * k).toFixed(2) + 'deg')
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%')
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%')
      card.classList.add('tilt')
    }
    const onMove = (e) => { if (e.pointerType === 'mouse') move(e) }
    const onDown = (e) => { if (e.pointerType !== 'mouse') move(e) }
    const onUp = (e) => { if (e.pointerType !== 'mouse') setTimeout(clear, 220) }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', clear)
    root.addEventListener('pointerleave', clear)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', clear)
      root.removeEventListener('pointerleave', clear)
    }
  }, [ref])
}

function Ring({ secondsLeft, running }) {
  const offset = RING_C * (1 - secondsLeft / SECONDS)
  return (
    <div className={`q-ring${secondsLeft <= 2 && running ? ' hot' : ''}${secondsLeft === 0 ? ' done' : ''}`} role="timer" aria-label={`${secondsLeft} seconds left`}>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="q-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1aa7e8" />
            <stop offset="55%" stopColor="#5b3fd6" />
            <stop offset="100%" stopColor="#e0218a" />
          </linearGradient>
        </defs>
        <circle className="track" cx="50" cy="50" r={RING_R} />
        <circle className="arc" cx="50" cy="50" r={RING_R} style={{ strokeDasharray: RING_C, strokeDashoffset: offset }} />
      </svg>
      <span className="q-ring-num">{secondsLeft}</span>
    </div>
  )
}

export default function Quiz() {
  const [s, dispatch] = useReducer(quizReducer, initialState)
  const root = useRef(null)
  useTilt(root)
  const person = s.round[s.index]

  // one tick per second, only while counting down
  useEffect(() => {
    if (s.phase !== 'countdown') return
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(t)
  }, [s.phase, s.index])

  // fetch the next photo while this one is on screen
  useEffect(() => {
    const next = s.round[s.index + 1]
    if (next && s.phase === 'countdown') new Image().src = photoUrl(next, BASE)
  }, [s.round, s.index, s.phase])

  const start = (type) => dispatch({ type, round: pickRound(people, ROUND_SIZE) })
  const result = useMemo(() => scoreOf(s.answers, s.round.length), [s.answers, s.round.length])

  if (s.phase === 'idle') {
    return (
      <main className="screen quiz" ref={root}>
        <Backdrop />
        <section className="q-start">
          <div className="glass q-hero">
            <p className="q-eyebrow">Face game</p>
            <h1 className="q-title">Who Is This?</h1>
            <p className="q-lede">A face appears. Say the name before the timer hits zero.</p>
            <div className="q-facts">
              <span className="q-chip">{people.length} faces</span>
              <span className="q-chip">{ROUND_SIZE} per game</span>
              <span className="q-chip">{SECONDS} seconds each</span>
            </div>
          </div>
          <div className="glass q-how">
            <p className="q-eyebrow">How to play</p>
            <ol>
              <li><b>1</b><span>A face fills the screen and the <strong>5-second</strong> timer starts.</span></li>
              <li><b>2</b><span>Say the name out loud, then tap <strong>Show answer</strong>, or wait for zero.</span></li>
              <li><b>3</b><span>Be honest: <strong>I got it right</strong> or <strong>I got it wrong</strong>. Each right answer is 5 points.</span></li>
            </ol>
          </div>
          <button className="q-btn primary big" onClick={() => start('start')} disabled={!people.length}>
            Start
          </button>
          <a className="q-credits" href={`${BASE}quiz/credits.html`} target="_blank" rel="noreferrer">
            Photo credits
          </a>
        </section>
      </main>
    )
  }

  if (s.phase === 'done') {
    return (
      <main className="screen quiz" ref={root}>
        <Backdrop />
        <section className="q-end">
          <div className="glass q-score">
            <p className="q-eyebrow light">Your score</p>
            <p className="q-score-num">
              {result.score}
              <span>/100</span>
            </p>
            <p className="q-score-sub">
              {result.correct} of {result.total} right
            </p>
            <div className="q-dots" aria-hidden="true">
              {s.answers.map((a, i) => (
                <i key={i} className={a ? 'ok' : 'no'} />
              ))}
            </div>
          </div>
          <div className="q-row">
            <button className="q-btn primary" onClick={() => start('replay')}>Replay</button>
            <button className="q-btn ghost" onClick={() => dispatch({ type: 'stop' })}>Stop</button>
          </div>
          {result.correct < result.total && (
            <div className="glass q-missed">
              <p className="q-eyebrow">Missed</p>
              <ul>
                {s.round.map((p, i) => (s.answers[i] ? null : (
                  <li key={p.id}>
                    <img src={photoUrl(p, BASE)} alt="" loading="lazy" />
                    <span>{p.name}</span>
                  </li>
                )))}
              </ul>
            </div>
          )}
        </section>
      </main>
    )
  }

  const revealed = s.phase === 'revealed'
  const credit = creditLine(person)
  return (
    <main className="screen quiz" ref={root}>
      <Backdrop />
      <section className="q-play">
        <div className="q-top">
          <span className="q-chip strong">{s.index + 1} / {s.round.length}</span>
          <div className="q-progress" aria-hidden="true">
            <i style={{ width: `${(s.index / s.round.length) * 100}%` }} />
          </div>
          <button className="q-quit" onClick={() => dispatch({ type: 'stop' })} aria-label="Quit game">✕</button>
        </div>

        <div className="glass q-photo">
          <div className="q-well">
            <img
              key={person.id}
              src={photoUrl(person, BASE)}
              alt={revealed ? person.name : 'Who is this?'}
              onLoad={() => dispatch({ type: 'loaded' })}
              onError={() => dispatch({ type: 'loaded' })}
              className={s.phase === 'loading' ? 'pending' : ''}
            />
          </div>
          <Ring secondsLeft={s.secondsLeft} running={s.phase === 'countdown'} />
        </div>

        {revealed ? (
          <div className="q-answer" key={'a' + s.index}>
            <div className="glass q-name">
              <p className="q-name-main">{person.name}</p>
              {person.alt && <p className="q-name-alt">{person.alt}</p>}
              {credit && <p className="q-credit">{credit}</p>}
            </div>
            <div className="q-row">
              <button className="q-btn ok" onClick={() => dispatch({ type: 'answer', right: true })}>I got it right</button>
              <button className="q-btn no" onClick={() => dispatch({ type: 'answer', right: false })}>I got it wrong</button>
            </div>
          </div>
        ) : (
          <button className="q-btn primary" onClick={() => dispatch({ type: 'reveal' })}>Show answer</button>
        )}
      </section>
    </main>
  )
}

function Backdrop() {
  return (
    <div className="q-bg" aria-hidden="true">
      <i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" />
    </div>
  )
}
