import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import bank from '../lib/world-bank.json'
import {
  addResult, bestRow, DEFAULT_NAME, loadHistory, loadName, nameOf, playedLabel,
  recentNames, renameLast, saveHistory, saveName, summarize, isNewBest,
} from '../lib/quiz.js'
import {
  answerOf, flagUrl, historyKey, isRight, loadMissed, makeRound, nextMissed,
  saveMissed, tally, verdict, worldInitial, worldReducer,
} from '../lib/world.js'
import { Backdrop, NameCard } from '../components/QuizParts.jsx'

const BASE = import.meta.env.BASE_URL
const STORE = typeof localStorage !== 'undefined' ? localStorage : null
const BOARD_ROWS = 10
const NEXT_MS = 1100
const RING_R = 46
const RING_C = 2 * Math.PI * RING_R
const LABEL = { capital: 'capital', flag: 'flag' }

const freshRound = (kind) => makeRound(bank, kind, loadMissed(kind))

export default function WorldQuiz({ kind, onExit }) {
  const [s, dispatch] = useReducer(worldReducer, worldInitial, () => ({ ...worldInitial, round: freshRound(kind) }))
  const q = s.round[s.index]
  const pick = s.picks[s.index]
  const answered = pick !== undefined

  // after a tap, show right/wrong for a moment, then move on (a second tap skips the wait)
  useEffect(() => {
    if (s.phase !== 'play' || !answered) return
    const t = setTimeout(() => dispatch({ type: 'next' }), NEXT_MS)
    return () => clearTimeout(t)
  }, [s.phase, s.index, answered])

  // warm the next flag so it appears at once
  useEffect(() => {
    const next = s.round[s.index + 1]
    if (kind === 'flag' && next) new Image().src = flagUrl(next.item, BASE)
  }, [kind, s.round, s.index])

  const result = useMemo(() => tally(s.round, s.picks, kind), [s.round, s.picks, kind])
  const key = historyKey(kind)
  const [history, setHistory] = useState(() => loadHistory(STORE, key))
  const [returning, setReturning] = useState(0)
  const saved = useRef(null)
  useEffect(() => {
    if (s.phase !== 'done' || saved.current === s.round) return
    saved.current = s.round
    const missed = nextMissed(loadMissed(kind), s.round, s.picks, kind)
    saveMissed(kind, missed)
    setReturning(Math.min(missed.length, s.round.length))
    setHistory((h) => {
      const next = addResult(h, tally(s.round, s.picks, kind), Date.now(), loadName() || DEFAULT_NAME)
      saveHistory(next, STORE, key)
      return next
    })
  }, [s.phase, s.round, s.picks, kind, key])

  const setPlayer = (name) => {
    saveName(name)
    setHistory((h) => {
      const next = renameLast(h, name)
      saveHistory(next, STORE, key)
      return next
    })
  }
  const replay = () => dispatch({ type: 'start', round: freshRound(kind) })

  if (s.phase === 'done') {
    const misses = s.round.map((x, i) => [x, s.picks[i]]).filter(([x, p]) => !isRight(x, p, kind))
    const board = summarize(history)
    const top = bestRow(history)
    const thisGame = saved.current === s.round
    return (
      <main className="screen quiz">
        <Backdrop />
        <section className="q-end" key="end">
          <div className="glass w-score">
            {thisGame && isNewBest(history) && <p className="q-newbest">New best!</p>}
            <div className="w-ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r={RING_R} className="w-ring-track" />
                <circle cx="50" cy="50" r={RING_R} className="w-ring-fill" style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C * (1 - result.correct / result.total) }} />
              </svg>
              <p className="w-ring-num">{result.correct}<span>/{result.total}</span></p>
            </div>
            <p className="w-verdict">{verdict(result.correct, result.total)}</p>
            <p className="w-return">
              {returning ? `${returning} ${returning === 1 ? 'question returns' : 'questions return'} in your next ${LABEL[kind]} quiz.` : 'Nothing to revisit. Clean sweep!'}
            </p>
          </div>
          {thisGame && history.length > 0 && (
            <NameCard key={history[0].at} current={nameOf(history[0])} names={recentNames(history.slice(1))} onPick={setPlayer} />
          )}
          <div className="q-row">
            <button className="q-btn primary" onClick={replay}>Replay</button>
            <button className="q-btn stop" onClick={onExit}>Back</button>
          </div>
          {misses.length > 0 && (
            <div className="glass w-review">
              <div className="q-board-head">
                <p className="q-eyebrow">Review</p>
                <p className="q-board-sum">{misses.length} to revisit</p>
              </div>
              <ul>
                {misses.map(([x, p]) => (
                  <li key={x.item.country}>
                    {kind === 'flag'
                      ? <img className="w-flag-sm" src={flagUrl(x.item, BASE)} alt={x.item.country} loading="lazy" />
                      : <b className="w-review-q">{x.item.country}</b>}
                    <span>
                      <b>{answerOf(x.item, kind)}</b>
                      <small>Your answer: {p}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {history.length > 0 && (
            <div className="glass q-board w-board">
              <div className="q-board-head">
                <p className="q-eyebrow">Scoreboard</p>
                <p className="q-board-sum">
                  Best <b>{top.correct}/{top.total}</b>{nameOf(top) !== DEFAULT_NAME ? <> by {nameOf(top)}</> : null} · {board.games} {board.games === 1 ? 'game' : 'games'}
                </p>
              </div>
              <ol>
                {history.slice(0, BOARD_ROWS).map((h, i) => (
                  <li key={h.at} className={`${i === 0 && thisGame ? 'now' : ''}${h.score === board.best ? ' top' : ''}`}>
                    <span className="q-board-who">
                      <b>{nameOf(h)}</b>
                      <small>{i === 0 && thisGame ? 'This game' : playedLabel(h.at)}</small>
                    </span>
                    <span className="q-board-bar" aria-hidden="true"><i style={{ transform: `scaleX(${h.score / 100})` }} /></span>
                    <span className="q-board-score">{h.correct}/{h.total}</span>
                  </li>
                ))}
              </ol>
              {history.length > BOARD_ROWS && <p className="q-board-more">Last {BOARD_ROWS} of {history.length} games</p>}
            </div>
          )}
        </section>
      </main>
    )
  }

  const right = answerOf(q.item, kind)
  return (
    <main className="screen quiz">
      <Backdrop />
      <section className="w-play" key="play">
        <div className="q-top">
          <span className="q-chip strong">{s.index + 1} / {s.round.length}</span>
          <div className="q-progress" aria-hidden="true">
            <i style={{ transform: `scaleX(${s.index / s.round.length})` }} />
          </div>
          <button className="q-quit" onClick={onExit} aria-label="Quit game">✕</button>
        </div>

        <div className="glass w-ask" key={'q' + s.index}>
          {kind === 'flag' ? (
            <>
              <p className="q-eyebrow">Which country?</p>
              <img className="w-flag" src={flagUrl(q.item, BASE)} alt="Flag to name" />
            </>
          ) : (
            <>
              <p className="q-eyebrow">Capital of</p>
              <h2 className="w-country">{q.item.country}</h2>
            </>
          )}
        </div>

        <div className="w-choices" role="group" aria-label="Answers">
          {q.choices.map((c) => {
            const state = !answered ? '' : c === right ? ' right' : c === pick ? ' wrong' : ' dim'
            return (
              <button
                key={c}
                className={`w-choice${state}`}
                onClick={() => (answered ? dispatch({ type: 'next' }) : dispatch({ type: 'pick', choice: c }))}
              >
                {c}
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}
