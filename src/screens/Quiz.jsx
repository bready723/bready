import { useCallback, useMemo, useRef, useState } from 'react'
import people from '../lib/people.json'
import logos from '../lib/logos.json'
import bank from '../lib/world-bank.json'
import { HISTORY_KEY, LOGO_HISTORY_KEY, loadHistory, bestLabel, sampleArt, photoUrl } from '../lib/quiz.js'
import { historyKey, flagUrl } from '../lib/world.js'
import { Backdrop } from '../components/QuizParts.jsx'
import FaceGame, { useFitHeight, useTilt } from './FaceGame.jsx'
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
  const [open, setOpen] = useState(null) // 'face' | 'logo' | 'capital' | 'flag'
  const back = useCallback(() => setOpen(null), [])
  const root = useRef(null)
  const hub = useRef(null)
  useTilt(root)
  useFitHeight(hub, open === null) // the four tiles fill the screen down to the tab bar

  // a fresh picture stack every time the hub shows
  const art = useMemo(() => ({
    face: sampleArt(people).map((p) => photoUrl(p, BASE)),
    logo: sampleArt(logos).map((p) => photoUrl(p, BASE, 'logos')),
    flag: sampleArt(bank).map((c) => flagUrl(c, BASE)),
  }), [open]) // eslint-disable-line react-hooks/exhaustive-deps

  if (open === 'face') return <FaceGame pool={people} storeKey={HISTORY_KEY} onExit={back} />
  if (open === 'logo') return <FaceGame pool={logos} dir="logos" storeKey={LOGO_HISTORY_KEY} logo onExit={back} />
  if (open === 'capital' || open === 'flag') return <WorldQuiz kind={open} onExit={back} />

  const tiles = [
    { id: 'face', title: 'Who Is This?', key: HISTORY_KEY, off: !people.length, art: <Stack srcs={art.face} kind="face" /> },
    { id: 'capital', title: <>Country <i>→</i> Capital</>, label: 'Country to Capital', key: historyKey('capital'), art: <GlobeArt /> },
    { id: 'flag', title: <>Flag <i>→</i> Country</>, label: 'Flag to Country', key: historyKey('flag'), art: <Stack srcs={art.flag} kind="flag" /> },
    { id: 'logo', title: 'Logo Quiz', key: LOGO_HISTORY_KEY, off: !logos.length, art: <Stack srcs={art.logo} kind="logo" /> },
  ]

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
                onClick={() => setOpen(t.id)}
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
          Photo, flag &amp; logo credits
        </a>
      </section>
    </main>
  )
}
