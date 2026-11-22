import { useCallback, useMemo, useRef, useState } from 'react'
import people from '../lib/people.json'
import logos from '../lib/logos.json'
import songs from '../lib/songs.json'
import movies from '../lib/movies.json'
import bank from '../lib/world-bank.json'
import {
  HISTORY_KEY, LOGO_HISTORY_KEY, SONG_HISTORY_KEY, MOVIE_HISTORY_KEY, SONG_SECONDS,
  loadHistory, bestLabel, sampleArt, photoUrl, ROUND_SIZE,
  choosePool, pickerFor, loadPoolChoice, savePoolChoice,
} from '../lib/quiz.js'
import { historyKey, flagUrl } from '../lib/world.js'
import { Backdrop } from '../components/QuizParts.jsx'
import FaceGame, { useFitHeight, useTilt, unlockAudio } from './FaceGame.jsx'
import WorldQuiz from './WorldQuiz.jsx'

const BASE = import.meta.env.BASE_URL
const STORE = typeof localStorage !== 'undefined' ? localStorage : null

// Country → Capital has no pictures of its own: a small globe with a map pin
function GlobeArt() {
  return (
    <svg className="q-tile-globe" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <radialGradient id="q-globe-sea" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#bfe9ff" />
          <stop offset="60%" stopColor="#5fb6ee" />
          <stop offset="100%" stopColor="#3a7fd0" />
        </radialGradient>
        <linearGradient id="q-globe-pin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6fae" />
          <stop offset="100%" stopColor="#d81b78" />
        </linearGradient>
      </defs>
      <circle cx="58" cy="64" r="44" fill="url(#q-globe-sea)" />
      <path d="M30 46c8-6 18-4 22 2s-2 12 4 16 14-2 16 6-8 14-16 12-10 6-18 2-6-14-12-18-4-14 4-20z" fill="#8fd9a8" opacity=".95" />
      <path d="M70 30c8 0 18 6 22 14s-4 8-10 6-12 2-14-4 0-16 2-16z" fill="#8fd9a8" opacity=".95" />
      <path d="M74 84c6-2 14 0 14 6s-10 10-16 6-4-10 2-12z" fill="#8fd9a8" opacity=".95" />
      <ellipse cx="58" cy="64" rx="44" ry="16" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.5" />
      <ellipse cx="58" cy="64" rx="18" ry="44" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.5" />
      <circle cx="44" cy="44" r="16" fill="#fff" opacity=".25" />
      <g transform="translate(70 18)">
        <path d="M14 0C6 0 0 6 0 14c0 10 14 26 14 26s14-16 14-26C28 6 22 0 14 0z" fill="url(#q-globe-pin)" />
        <circle cx="14" cy="14" r="5.5" fill="#fff" />
      </g>
    </svg>
  )
}

// Before Who Is This? and Guess the Song: which faces / songs to play with
const GROUP_LABEL = { face: { mix: 'Mix', kr: 'Korean', world: 'Not Korean' }, song: { mix: 'Mix', kr: 'Korean', world: 'Pop' } }
const ERA_LABEL = { all: 'All', '80s': '80s–90s', '00s': '2000s', '10s': '2010s–now' }

function Seg({ label, options, value, onChange }) {
  return (
    <div className="q-seg-wrap">
      <p className="q-eyebrow">{label}</p>
      <div className="q-seg" role="radiogroup" aria-label={label}>
        {Object.entries(options).map(([k, text]) => (
          <button key={k} role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function PoolPicker({ kind, title, pool, onStart, onBack }) {
  const [choice, setChoice] = useState(() => loadPoolChoice(kind))
  const set = (patch) => setChoice((c) => { const next = { ...c, ...patch }; savePoolChoice(kind, next); return next })
  const n = choosePool(pool, kind === 'song' ? choice : { group: choice.group }).length
  const what = kind === 'song' ? 'songs' : 'faces'
  return (
    <main className="screen quiz">
      <Backdrop />
      <section className="glass q-pick" key="pick">
        <h2 className="q-pick-title">{title}</h2>
        <Seg label={kind === 'song' ? 'Songs' : 'Faces'} options={GROUP_LABEL[kind]} value={choice.group} onChange={(group) => set({ group })} />
        {kind === 'song' && <Seg label="Period" options={ERA_LABEL} value={choice.era} onChange={(era) => set({ era })} />}
        <p className="q-pick-count">{n.toLocaleString()} {what}{n > 0 && n < ROUND_SIZE ? ` · a short game of ${n}` : ''}</p>
        <div className="q-row">
          <button className="q-btn glassy" disabled={!n} onClick={() => onStart(choice)}>Start</button>
          <button className="q-btn stop" onClick={onBack}>Back</button>
        </div>
      </section>
    </main>
  )
}

function Stack({ srcs, kind }) {
  return (
    <div className={`q-tile-stack ${kind}`} aria-hidden="true">
      {srcs.map((src, i) => (
        <span key={src + i} className={`q-tile-card c${i}`}>
          <img src={src} alt="" loading="lazy" decoding="async" />
        </span>
      ))}
    </div>
  )
}

export default function Quiz() {
  const [open, setOpen] = useState(null) // 'face' | 'logo' | 'capital' | 'flag' | 'song' | 'movie' | 'pick-face' | 'pick-song'
  const [choice, setChoice] = useState(null) // the pool picked for Who Is This? / Guess the Song
  const back = useCallback(() => setOpen(null), [])
  const root = useRef(null)
  const hub = useRef(null)
  useTilt(root)
  useFitHeight(hub, open === null) // the six tiles fill the screen down to the tab bar

  // a fresh picture stack every time the hub shows
  const art = useMemo(() => ({
    face: sampleArt(choosePool(people)).map((p) => photoUrl(p, BASE)),
    logo: sampleArt(logos).map((p) => photoUrl(p, BASE, 'logos')),
    flag: sampleArt(bank).map((c) => flagUrl(c, BASE)),
    song: sampleArt(songs).map((x) => x.art),
    movie: sampleArt(movies).map((x) => x.art),
  }), [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (open === 'pick-face' || open === 'pick-song') {
    const kind = open.slice(5)
    return (
      <PoolPicker
        kind={kind} title={kind === 'face' ? 'Who Is This?' : 'Guess the Song'} pool={kind === 'face' ? people : songs}
        onStart={(c) => { if (kind === 'song') unlockAudio(); setChoice(c); setOpen(kind) }}
        onBack={back}
      />
    )
  }
  if (open === 'face') {
    const c = { group: choice?.group || 'mix' }
    return <FaceGame pool={choosePool(people, c)} pick={pickerFor(c.group)} storeKey={HISTORY_KEY} onExit={back} />
  }
  if (open === 'logo') return <FaceGame pool={logos} dir="logos" storeKey={LOGO_HISTORY_KEY} kind="logo" onExit={back} />
  if (open === 'song') {
    const c = choice || { group: 'mix', era: 'all' }
    return <FaceGame pool={choosePool(songs, c)} storeKey={SONG_HISTORY_KEY} kind="song" pick={pickerFor(c.group)} seconds={SONG_SECONDS} onExit={back} />
  }
  if (open === 'movie') return <FaceGame pool={movies} storeKey={MOVIE_HISTORY_KEY} kind="movie" onExit={back} />
  if (open === 'capital' || open === 'flag') return <WorldQuiz kind={open} onExit={back} />

  const tiles = [
    { id: 'face', title: 'Who Is This?', key: HISTORY_KEY, off: !people.length, art: <Stack srcs={art.face} kind="face" /> },
    { id: 'capital', title: <>Country <i>→</i> Capital</>, label: 'Country to Capital', key: historyKey('capital'), art: <GlobeArt /> },
    { id: 'flag', title: <>Flag <i>→</i> Country</>, label: 'Flag to Country', key: historyKey('flag'), art: <Stack srcs={art.flag} kind="flag" /> },
    { id: 'logo', title: 'Logo Quiz', key: LOGO_HISTORY_KEY, off: !logos.length, art: <Stack srcs={art.logo} kind="logo" /> },
    { id: 'song', title: 'Guess the Song', key: SONG_HISTORY_KEY, off: !songs.length, art: <Stack srcs={art.song} kind="cover" /> },
    { id: 'movie', title: 'Guess the Movie', key: MOVIE_HISTORY_KEY, off: !movies.length, art: <Stack srcs={art.movie} kind="poster" /> },
  ].filter((t) => t.id !== 'movie' || movies.length) // the movie tile appears once its list is built

  return (
    <main className="screen quiz" ref={root}>
      <Backdrop />
      <section className="q-hub" key="hub" ref={hub}>
        <div className="q-tiles">
          {tiles.map((t) => {
            const chip = bestLabel(loadHistory(STORE, t.key))
            return (
              <button
                key={t.id}
                className={`glass q-tile t-${t.id}`}
                onClick={() => { if (t.id === 'song') unlockAudio(); setOpen(t.id === 'face' || t.id === 'song' ? 'pick-' + t.id : t.id) }}
                disabled={t.off}
                aria-label={`${t.label || t.title}, ${chip}`}
              >
                <span className="q-tile-art">{t.art}</span>
                <span className="q-tile-foot">
                  <span className="q-tile-title">{t.title}</span>
                  <span className={`q-tile-chip${chip === 'New' ? ' new' : ''}`}>{chip}</span>
                </span>
              </button>
            )
          })}
        </div>
        <a className="q-credits" href={`${BASE}quiz/credits.html`}>
          Credits
        </a>
      </section>
    </main>
  )
}
