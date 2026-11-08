import { describe, it, expect } from 'vitest'
import {
  ROUND_SIZE, SECONDS, shuffle, pickRound, scoreOf, initialState, quizReducer, photoUrl, creditLine,
  HISTORY_KEY, HISTORY_MAX, loadHistory, addResult, saveHistory, summarize, isNewBest, playedLabel,
  NAME_MAX, DEFAULT_NAME, cleanName, nameOf, recentNames, renameLast, bestRow, loadName, saveName,
} from './quiz.js'

// a tiny deterministic random source: cycles through the given values
const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length] }
const people = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Person ${i}`, file: `p${i}.jpg` }))

describe('shuffle', () => {
  it('keeps every item and does not touch the input', () => {
    const list = [1, 2, 3, 4, 5]
    const out = shuffle(list, seq(0.9, 0.1, 0.5, 0.3))
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
    expect(list).toEqual([1, 2, 3, 4, 5])
  })
  it('is deterministic for the same random source', () => {
    expect(shuffle([1, 2, 3, 4], seq(0.2, 0.7))).toEqual(shuffle([1, 2, 3, 4], seq(0.2, 0.7)))
  })
})

describe('pickRound', () => {
  it('picks twenty distinct people from a big pool', () => {
    const round = pickRound(people(300), ROUND_SIZE, Math.random)
    expect(round).toHaveLength(20)
    expect(new Set(round.map((p) => p.id)).size).toBe(20)
  })
  it('uses the whole pool when it is smaller than a round', () => {
    expect(pickRound(people(7), 20, Math.random)).toHaveLength(7)
  })
  it('defaults to twenty', () => {
    expect(pickRound(people(50))).toHaveLength(20)
  })
})

describe('scoreOf', () => {
  it('scores out of 100', () => {
    expect(scoreOf([], 20)).toEqual({ correct: 0, total: 20, score: 0 })
    expect(scoreOf(Array(20).fill(true), 20).score).toBe(100)
    const a = [...Array(17).fill(true), ...Array(3).fill(false)]
    expect(scoreOf(a, 20)).toEqual({ correct: 17, total: 20, score: 85 })
  })
  it('scales a short round to 100 and rounds', () => {
    expect(scoreOf([true, false, false], 3).score).toBe(33)
    expect(scoreOf([true, true], 0).score).toBe(0)
  })
})

describe('quizReducer', () => {
  const round = people(20)
  const started = () => quizReducer(initialState, { type: 'start', round })

  it('starts on question 1, waiting for the photo', () => {
    const s = started()
    expect(s).toMatchObject({ phase: 'loading', index: 0, secondsLeft: SECONDS, answers: [] })
    expect(s.round).toBe(round)
  })

  it('only counts down once the photo has loaded', () => {
    let s = started()
    s = quizReducer(s, { type: 'tick' })
    expect(s.phase).toBe('loading')
    expect(s.secondsLeft).toBe(5)
    s = quizReducer(s, { type: 'loaded' })
    expect(s.phase).toBe('countdown')
    s = quizReducer(s, { type: 'tick' })
    expect(s.secondsLeft).toBe(4)
  })

  it('reveals by itself when the timer reaches zero', () => {
    let s = quizReducer(started(), { type: 'loaded' })
    for (let i = 0; i < 4; i++) s = quizReducer(s, { type: 'tick' })
    expect(s).toMatchObject({ phase: 'countdown', secondsLeft: 1 })
    s = quizReducer(s, { type: 'tick' })
    expect(s).toMatchObject({ phase: 'revealed', secondsLeft: 0 })
    expect(quizReducer(s, { type: 'tick' })).toBe(s)
  })

  it('reveals early and freezes the timer', () => {
    let s = quizReducer(started(), { type: 'loaded' })
    s = quizReducer(s, { type: 'tick' })
    s = quizReducer(s, { type: 'reveal' })
    expect(s).toMatchObject({ phase: 'revealed', secondsLeft: 4 })
    expect(quizReducer(s, { type: 'reveal' })).toBe(s)
  })

  it('ignores loaded and answer at the wrong moment', () => {
    const s = quizReducer(started(), { type: 'loaded' })
    expect(quizReducer(s, { type: 'loaded' })).toBe(s)
    expect(quizReducer(s, { type: 'answer', right: true })).toBe(s)
    expect(quizReducer(initialState, { type: 'reveal' })).toBe(initialState)
  })

  it('records an answer and moves to the next photo', () => {
    let s = quizReducer(quizReducer(started(), { type: 'loaded' }), { type: 'reveal' })
    s = quizReducer(s, { type: 'answer', right: true })
    expect(s).toMatchObject({ phase: 'loading', index: 1, secondsLeft: 5, answers: [true] })
  })

  it('ends after the twentieth answer', () => {
    let s = started()
    for (let i = 0; i < 20; i++) {
      s = quizReducer(s, { type: 'loaded' })
      s = quizReducer(s, { type: 'reveal' })
      s = quizReducer(s, { type: 'answer', right: i % 2 === 0 })
    }
    expect(s.phase).toBe('done')
    expect(s.answers).toHaveLength(20)
    expect(scoreOf(s.answers, s.round.length).score).toBe(50)
  })

  it('replay starts a fresh round, stop goes back to the start', () => {
    const other = people(20).map((p) => ({ ...p, id: 'x' + p.id }))
    const s = quizReducer(started(), { type: 'replay', round: other })
    expect(s).toMatchObject({ phase: 'loading', index: 0, answers: [] })
    expect(s.round).toBe(other)
    expect(quizReducer(s, { type: 'stop' })).toEqual(initialState)
  })

  it('leaves state alone for unknown actions', () => {
    expect(quizReducer(initialState, { type: 'nope' })).toBe(initialState)
  })
})

describe('photoUrl and creditLine', () => {
  it('builds a path under the app base', () => {
    expect(photoUrl({ file: 'a.jpg' }, '/bready/')).toBe('/bready/quiz/a.jpg')
    expect(photoUrl({ file: 'a.jpg' }, '/bready')).toBe('/bready/quiz/a.jpg')
  })
  it('credits Commons photos only', () => {
    expect(creditLine({ source: 'commons', credit: 'Raph_PH', license: 'CC BY 2.0' })).toBe('Photo: Raph_PH · CC BY 2.0')
    expect(creditLine({ source: 'commons', license: 'CC0' })).toBe('Photo: Wikimedia Commons · CC0')
    expect(creditLine({ source: 'deck' })).toBe('')
  })
})

describe('score history', () => {
  const memStore = (init) => { const m = new Map(init ? [[HISTORY_KEY, init]] : []); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }

  it('starts empty, and survives missing or corrupt storage', () => {
    expect(loadHistory(memStore())).toEqual([])
    expect(loadHistory(memStore('{not json'))).toEqual([])
    expect(loadHistory(memStore('{"a":1}'))).toEqual([])
    expect(loadHistory(null)).toEqual([])
    expect(loadHistory({ getItem: () => { throw new Error('blocked') } })).toEqual([])
  })

  it('drops malformed rows it cannot show', () => {
    const raw = JSON.stringify([{ at: 1, score: 80, correct: 16, total: 20 }, { at: 'x' }, null])
    expect(loadHistory(memStore(raw))).toEqual([{ at: 1, score: 80, correct: 16, total: 20 }])
  })

  it('adds the newest game first and keeps at most HISTORY_MAX', () => {
    let h = []
    for (let i = 0; i < HISTORY_MAX + 5; i++) h = addResult(h, { score: i, correct: i, total: 20 }, 1000 + i)
    expect(h).toHaveLength(HISTORY_MAX)
    expect(h[0]).toEqual({ at: 1000 + HISTORY_MAX + 4, score: HISTORY_MAX + 4, correct: HISTORY_MAX + 4, total: 20, name: 'Player' })
  })

  it('round-trips through storage, and reports a blocked save', () => {
    const store = memStore()
    const h = addResult([], { score: 75, correct: 15, total: 20 }, 5)
    expect(saveHistory(h, store)).toBe(true)
    expect(loadHistory(store)).toEqual(h)
    expect(saveHistory(h, { setItem: () => { throw new Error('full') } })).toBe(false)
    expect(saveHistory(h, null)).toBe(false)
  })

  it('summarises best, games and average', () => {
    expect(summarize([])).toEqual({ games: 0, best: null, average: null })
    const h = [{ score: 70 }, { score: 90 }, { score: 81 }]
    expect(summarize(h)).toEqual({ games: 3, best: 90, average: 80 })
  })

  it('flags a new best only when it beats an earlier game', () => {
    expect(isNewBest([{ score: 90 }])).toBe(false)
    expect(isNewBest([{ score: 90 }, { score: 85 }])).toBe(true)
    expect(isNewBest([{ score: 85 }, { score: 85 }])).toBe(false)
    expect(isNewBest([])).toBe(false)
  })

  it('labels when a game was played', () => {
    const now = new Date(2026, 10, 4, 18, 0)
    expect(playedLabel(new Date(2026, 10, 4, 17, 32).getTime(), now)).toMatch(/^Today 5:32\sPM$/)
    expect(playedLabel(new Date(2026, 10, 3, 21, 5).getTime(), now)).toMatch(/^Yesterday 9:05\sPM$/)
    expect(playedLabel(new Date(2026, 9, 28, 9, 0).getTime(), now)).toBe('Oct 28')
    expect(playedLabel(new Date(2025, 9, 28, 9, 0).getTime(), now)).toBe('Oct 28, 2025')
  })
})

describe('player names', () => {
  const memStore = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }

  it('trims, collapses spaces, caps the length and falls back to Player', () => {
    expect(cleanName('  Sara  ')).toBe('Sara')
    expect(cleanName('Big   Bro')).toBe('Big Bro')
    expect(cleanName('Abcdefghijklmnop')).toBe('Abcdefghijkl')
    expect(cleanName('엄마')).toBe('엄마')
    expect(cleanName('')).toBe(DEFAULT_NAME)
    expect(cleanName('   ')).toBe(DEFAULT_NAME)
    expect(cleanName(undefined)).toBe(DEFAULT_NAME)
    expect([...cleanName('😀'.repeat(20))]).toHaveLength(NAME_MAX)
  })

  it('tags each game with a name; old rows without one read as Player', () => {
    const h = addResult([{ at: 1, score: 60, correct: 12, total: 20 }], { score: 80, correct: 16, total: 20 }, 2, ' Mom ')
    expect(h[0].name).toBe('Mom')
    expect(nameOf(h[1])).toBe(DEFAULT_NAME)
    expect(nameOf(null)).toBe(DEFAULT_NAME)
  })

  it('lists distinct recent names, newest first, without the fallback', () => {
    const h = [{ name: 'Sara' }, { name: 'Mom' }, {}, { name: 'Sara' }, { name: 'Dad' }, { name: 'Kai' }, { name: 'Jin' }, { name: 'Zed' }]
    expect(recentNames(h)).toEqual(['Sara', 'Mom', 'Dad', 'Kai', 'Jin'])
    expect(recentNames(h, 2)).toEqual(['Sara', 'Mom'])
    expect(recentNames([])).toEqual([])
  })

  it('renames the game just played without adding a row', () => {
    const h = [{ at: 2, score: 80, name: 'Player' }, { at: 1, score: 60, name: 'Mom' }]
    const r = renameLast(h, 'Sara')
    expect(r).toHaveLength(2)
    expect(r[0]).toEqual({ at: 2, score: 80, name: 'Sara' })
    expect(r[1]).toBe(h[1])
    expect(renameLast([], 'Sara')).toEqual([])
  })

  it('finds the best game, keeping the newest on a tie', () => {
    expect(bestRow([])).toBe(null)
    expect(bestRow([{ at: 3, score: 70 }, { at: 2, score: 90 }, { at: 1, score: 90 }])).toEqual({ at: 2, score: 90 })
  })

  it('remembers the last name, and survives blocked storage', () => {
    const store = memStore()
    expect(loadName(store)).toBe('')
    expect(saveName('  Sara ', store)).toBe(true)
    expect(loadName(store)).toBe('Sara')
    expect(saveName('x', null)).toBe(false)
    expect(saveName('x', { setItem: () => { throw new Error('full') } })).toBe(false)
    expect(loadName({ getItem: () => { throw new Error('blocked') } })).toBe('')
    expect(loadName(null)).toBe('')
  })
})
