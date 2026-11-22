import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  ROUND_SIZE, pickRound, scoreOf, initialState, quizReducer, photoUrl, creditLine, subLine,
  loadHistory, addResult, saveHistory, summarize, isNewBest, playedLabel,
  DEFAULT_NAME, nameOf, recentNames, renameLast, renameAll, bestRow, loadName, saveName,
} from '../lib/quiz.js'
import { Backdrop, NameCard } from '../components/QuizParts.jsx'

// One timed "say it out loud" game, used by Who Is This? (faces), the Logo Quiz,
// Guess the Song and Guess the Movie.
// pool: [{id,name,file|art,...}]; dir: public folder of the images; storeKey: scoreboard key;
// kind: 'face' | 'logo' (white card, no blurred fill) | 'song' (plays the clip, cover
// hidden until the answer) | 'movie'; pick: how a round is drawn; seconds: clock per question.

// One audio element for the whole app. iOS only lets a page play sound that a tap
// started, and remembers that per element: the hub tile's tap "unlocks" this one
// (a tiny silent clip), so every song after that can start on its own.
const SILENT = 'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA'
let player = null
function songPlayer() {
  if (!player && typeof Audio !== 'undefined') player = new Audio()
  return player
}
export function unlockAudio() {
  const a = songPlayer()
  if (!a) return
  a.src = SILENT
  a.play().catch(() => {})
}

const BOARD_ROWS = 10
const BASE = import.meta.env.BASE_URL
const STORE = typeof localStorage !== 'undefined' ? localStorage : null
const RING_R = 42
const RING_C = 2 * Math.PI * RING_R

// 3D tilt + a sheen that follows the finger / pointer, as on the Goodlugg
// dashboard. Mouse: follows hover. Touch: tilts while pressed.
export function useTilt(ref) {
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

// The view must fit between whatever sits above it (app bar, a sync-error
// banner, the notch) and the tab bar, so the buttons never need a scroll.
// Measure the real space instead of guessing with 100dvh.
export function useFitHeight(ref, active) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const fit = () => {
      const bar = document.querySelector('.tabbar')
      const bottom = bar ? bar.getBoundingClientRect().top : window.innerHeight
      const top = el.getBoundingClientRect().top + window.scrollY - (document.scrollingElement?.scrollTop || 0)
      el.style.height = Math.max(320, Math.floor(bottom - top - 12)) + 'px'
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(document.body)
    const app = document.querySelector('.app')
    if (app) for (const c of app.children) ro.observe(c)
    const mo = new MutationObserver(fit)
    if (app) mo.observe(app, { childList: true })
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); mo.disconnect(); window.removeEventListener('resize', fit); el.style.height = '' }
  }, [ref, active])
}

function Ring({ secondsLeft, total, running, stopped }) {
  const offset = RING_C * (1 - secondsLeft / total)
  return (
    <div className={`q-ring${secondsLeft <= 2 && running ? ' hot' : ''}${secondsLeft === 0 ? ' done' : ''}${stopped ? ' stopped' : ''}`} role="timer" aria-label={`${secondsLeft} seconds left`}>
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

// the spinning record shown while a song plays (the cover would give it away)
function Disc({ spinning }) {
  return (
    <>
      <div className={`q-disc${spinning ? ' on' : ''}`} aria-hidden="true">
        <span className="q-disc-label">♪</span>
      </div>
      <span className={`q-eq${spinning ? ' on' : ''}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </>
  )
}

export default function FaceGame({ pool, dir = 'quiz', storeKey, kind = 'face', pick = pickRound, seconds, onExit }) {
  const logo = kind === 'logo', song = kind === 'song'
  const fresh = () => pick(pool, ROUND_SIZE)
  const [s, dispatch] = useReducer(quizReducer, initialState, () => quizReducer(initialState, { type: 'start', round: fresh(), seconds }))
  const root = useRef(null)
  const play = useRef(null)
  useTilt(root)
  const playing = s.phase === 'loading' || s.phase === 'countdown' || s.phase === 'revealed'
  useFitHeight(play, playing)
  const item = s.round[s.index]
  const url = (x) => photoUrl(x, BASE, dir)

  // "Stop" puts the reducer back to idle: that means back to the hub
  useEffect(() => { if (s.phase === 'idle') onExit() }, [s.phase, onExit])

  // one tick per second, only while counting down
  useEffect(() => {
    if (s.phase !== 'countdown') return
    const t = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(t)
  }, [s.phase, s.index])

  // fetch the next image while this one is on screen
  useEffect(() => {
    const next = s.round[s.index + 1]
    if (next && s.phase === 'countdown') new Image().src = url(next)
  }, [s.round, s.index, s.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // songs: start the clip; the clock starts once it is actually playing. If the phone
  // refuses to start sound by itself, a "Tap to play" button appears instead.
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    if (!song || s.phase !== 'loading') return
    const a = songPlayer()
    if (!a) return dispatch({ type: 'loaded' })
    const onPlaying = () => { setBlocked(false); dispatch({ type: 'loaded' }) }
    const onError = () => dispatch({ type: 'reveal' }) // clip gone: show the answer
    a.addEventListener('playing', onPlaying)
    a.addEventListener('error', onError)
    a.src = s.round[s.index].preview
    a.play().catch((e) => { if (e?.name === 'NotAllowedError') setBlocked(true) })
    return () => { a.removeEventListener('playing', onPlaying); a.removeEventListener('error', onError) }
  }, [song, s.phase, s.index, s.round])
  // silence when the game ends or the screen closes
  useEffect(() => { if (song && (s.phase === 'done' || s.phase === 'idle')) songPlayer()?.pause() }, [song, s.phase])
  useEffect(() => () => { if (song) songPlayer()?.pause() }, [song])

  const result = useMemo(() => scoreOf(s.answers, s.round.length), [s.answers, s.round.length])

  // scoreboard: every finished game is saved on this phone, once per round
  const [history, setHistory] = useState(() => loadHistory(STORE, storeKey))
  const savedRound = useRef(null)
  useEffect(() => {
    if (s.phase !== 'done' || savedRound.current === s.round) return
    savedRound.current = s.round
    setHistory((h) => {
      const next = addResult(h, scoreOf(s.answers, s.round.length), Date.now(), loadName() || DEFAULT_NAME)
      saveHistory(next, STORE, storeKey)
      return next
    })
  }, [s.phase, s.round, s.answers, storeKey])
  const board = summarize(history)
  const top = bestRow(history)
  // "who played?": the game is already saved under the last name; picking a name relabels it
  // a typo'd name, fixed: every game under it on this scoreboard takes the new name
  const fixName = (from, to) => {
    saveName(to)
    setHistory((h) => {
      const next = renameAll(h, from, to)
      saveHistory(next, STORE, storeKey)
      return next
    })
  }
  const setPlayer = (name) => {
    saveName(name)
    setHistory((h) => {
      const next = renameLast(h, name)
      saveHistory(next, STORE, storeKey)
      return next
    })
  }

  if (s.phase === 'idle') return null

  if (s.phase === 'done') {
    return (
      <main className="screen quiz" ref={root}>
        <Backdrop />
        <section className="q-end" key="end">
          <div className="glass q-score">
            <p className="q-eyebrow light">Your score</p>
            {isNewBest(history) && savedRound.current === s.round && <p className="q-newbest">New best!</p>}
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
          {savedRound.current === s.round && history.length > 0 && (
            <NameCard key={history[0].at} current={nameOf(history[0])} names={recentNames(history.slice(1))} onPick={setPlayer} onRename={fixName} />
          )}
          <div className="q-row">
            <button className="q-btn glassy" onClick={() => { if (song) unlockAudio(); dispatch({ type: 'replay', round: fresh(), seconds }) }}>Replay</button>
            <button className="q-btn stop" onClick={() => dispatch({ type: 'stop' })}>Stop</button>
          </div>
          {history.length > 0 && (
            <div className="glass q-board">
              <div className="q-board-head">
                <p className="q-eyebrow">Scoreboard</p>
                <p className="q-board-sum">
                  Best <b>{board.best}</b>{top && nameOf(top) !== DEFAULT_NAME ? <> by {nameOf(top)}</> : null} · Avg <b>{board.average}</b> · {board.games} {board.games === 1 ? 'game' : 'games'}
                </p>
              </div>
              <ol>
                {history.slice(0, BOARD_ROWS).map((h, i) => (
                  <li key={h.at} className={`${i === 0 && savedRound.current === s.round ? 'now' : ''}${h.score === board.best ? ' top' : ''}`}>
                    <span className="q-board-who">
                      <b>{nameOf(h)}</b>
                      <small>{i === 0 && savedRound.current === s.round ? 'This game' : playedLabel(h.at)}</small>
                    </span>
                    <span className="q-board-bar" aria-hidden="true"><i style={{ transform: `scaleX(${h.score / 100})` }} /></span>
                    <span className="q-board-score">{h.score}</span>
                  </li>
                ))}
              </ol>
              {history.length > BOARD_ROWS && <p className="q-board-more">Last {BOARD_ROWS} of {history.length} games</p>}
            </div>
          )}
          {result.correct < result.total && (
            <div className={`glass q-missed ${kind}`}>
              <p className="q-eyebrow">Missed</p>
              <ul>
                {s.round.map((p, i) => (s.answers[i] ? null : (
                  <li key={p.id}>
                    <img src={url(p)} alt="" loading="lazy" />
                    {kind !== 'face' && <span>{p.name}</span>}
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
  const credit = creditLine(item, logo ? 'Logo' : 'Photo')
  const sub = subLine(item)
  const ask = { face: 'Who is this?', logo: 'Which brand is this?', movie: 'Which movie is this?', song: 'Which song is this?' }[kind]
  return (
    <main className="screen quiz" ref={root}>
      <Backdrop />
      <section className="q-play" key="play" ref={play}>
        <div className="q-top">
          <span className="q-chip strong">{s.index + 1} / {s.round.length}</span>
          <div className="q-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${s.index / s.round.length})` }} />
          </div>
          <button className="q-quit" onClick={() => dispatch({ type: 'stop' })} aria-label="Quit game">✕</button>
        </div>

        <div className="glass q-photo">
          <div className={`q-well ${kind}`}>
            {song && !revealed && <Disc spinning={s.phase === 'countdown'} />}
            {song && blocked && s.phase === 'loading' && (
              <button className="q-btn glassy q-tapplay" onClick={() => songPlayer()?.play().catch(() => {})}>▶ Tap to play</button>
            )}
            {/* faces: the same photo, blurred and cropped to fill, so wide shots leave no empty bands */}
            {!logo && (!song || revealed) && (
              <div
                key={'bg' + item.id}
                className={`q-well-bg${s.phase === 'loading' ? ' pending' : ''}`}
                style={{ backgroundImage: `url(${url(item)})` }}
                aria-hidden="true"
              />
            )}
            {(!song || revealed) && (
              <img
                key={item.id}
                src={url(item)}
                alt={revealed ? item.name : ask}
                onLoad={() => { if (!song) dispatch({ type: 'loaded' }) }}
                onError={() => { if (!song) dispatch({ type: 'loaded' }) }}
                className={s.phase === 'loading' ? 'pending' : ''}
              />
            )}
            {revealed && (
              <div className="q-name" key={'n' + s.index}>
                <p className="q-name-main">{item.name}</p>
                {item.alt && <p className="q-name-alt">{item.alt}</p>}
                {(song || kind === 'movie' || item.group) && sub && <p className="q-name-sub">{sub}</p>}
              </div>
            )}
            {revealed && credit && (item.link
              ? <a className="q-credit" href={item.link} target="_blank" rel="noreferrer">{credit} ↗</a>
              : <p className="q-credit">{credit}</p>)}
          </div>
          <Ring secondsLeft={s.secondsLeft} total={s.seconds} running={s.phase === 'countdown'} stopped={revealed} />
        </div>

        {revealed ? (
          <div className="q-row q-answer" key={'a' + s.index}>
            <button className="q-btn ok" onClick={() => dispatch({ type: 'answer', right: true })}>I got it right</button>
            <button className="q-btn no" onClick={() => dispatch({ type: 'answer', right: false })}>I got it wrong</button>
          </div>
        ) : (
          <button className="q-btn glassy" onClick={() => dispatch({ type: 'reveal' })}>Show answer</button>
        )}
      </section>
    </main>
  )
}
