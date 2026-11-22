import { describe, it, expect } from 'vitest'
import {
  ROUND_SIZE, SECONDS, shuffle, pickRound, scoreOf, initialState, quizReducer, photoUrl, creditLine,
  HISTORY_KEY, LOGO_HISTORY_KEY, renameAll, bestLabel, sampleArt, HISTORY_MAX, loadHistory, addResult, saveHistory, summarize, isNewBest, playedLabel,
  NAME_MAX, DEFAULT_NAME, cleanName, nameOf, recentNames, renameLast, bestRow, loadName, saveName,
  pickMixed, subLine, SONG_HISTORY_KEY, MOVIE_HISTORY_KEY, SONG_SECONDS,
  eraOf, choosePool, pickerFor, loadPoolChoice, savePoolChoice,
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
  it('serves logos from their own folder', () => {
    expect(photoUrl({ file: 'l1.png' }, '/bready/', 'logos')).toBe('/bready/logos/l1.png')
  })
  it('labels logo credits as logos', () => {
    expect(creditLine({ source: 'commons', credit: 'Nike', license: 'Public domain' }, 'Logo')).toBe('Logo: Nike · Public domain')
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

describe('quiz hub tiles', () => {
  it('shows the best score, or New before the first game', () => {
    expect(bestLabel([])).toBe('New')
    expect(bestLabel(undefined)).toBe('New')
    expect(bestLabel([{ score: 40 }, { score: 85 }, { score: 70 }])).toBe('Best 85')
  })
  it('keeps the logo scoreboard apart from the faces one', () => {
    expect(LOGO_HISTORY_KEY).not.toBe(HISTORY_KEY)
  })
  it('picks distinct items for the picture stack, and copes with tiny or missing pools', () => {
    const art = sampleArt(people(10), 3, seq(0.1, 0.5, 0.9))
    expect(art).toHaveLength(3)
    expect(new Set(art.map((p) => p.id)).size).toBe(3)
    expect(sampleArt(people(2), 3)).toHaveLength(2)
    expect(sampleArt(undefined)).toEqual([])
  })
})

describe('renameAll', () => {
  const rows = [{ at: 3, score: 20, name: 's' }, { at: 2, score: 50, name: 'Mom' }, { at: 1, score: 40, name: 's' }]
  it('fixes a typo on every game saved under that name', () => {
    expect(renameAll(rows, 's', 'Sara').map((r) => r.name)).toEqual(['Sara', 'Mom', 'Sara'])
  })
  it('leaves other names and unchanged names alone', () => {
    expect(renameAll(rows, 'Mom', 'Mom')).toBe(rows)
    expect(renameAll(rows, 'Dad', 'Sara')).toEqual(rows)
  })
  it('cleans the new name like any other', () => {
    expect(renameAll(rows, 's', '  Sara   Kim  ')[0].name).toBe('Sara Kim')
  })
})

describe('Guess the Song / Guess the Movie', () => {
  const songs = (nk, nw) => [
    ...Array.from({ length: nk }, (_, i) => ({ id: `k${i}`, name: `K ${i}`, kr: true })),
    ...Array.from({ length: nw }, (_, i) => ({ id: `w${i}`, name: `W ${i}` })),
  ]

  it('draws half Korean, half global songs', () => {
    const r = pickMixed(songs(40, 40), 20)
    expect(r).toHaveLength(20)
    expect(r.filter((x) => x.kr)).toHaveLength(10)
    expect(new Set(r.map((x) => x.id)).size).toBe(20)
  })

  it('fills from the other side when one runs short', () => {
    expect(pickMixed(songs(3, 40), 20).filter((x) => x.kr)).toHaveLength(3)
    expect(pickMixed(songs(40, 4), 20).filter((x) => !x.kr)).toHaveLength(4)
    expect(pickMixed(songs(2, 3), 20)).toHaveLength(5)
    expect(pickMixed([], 20)).toEqual([])
  })

  it('songs get a longer clock, and replay keeps it', () => {
    const round = songs(1, 1)
    let s = quizReducer(initialState, { type: 'start', round, seconds: SONG_SECONDS })
    expect(s.secondsLeft).toBe(10)
    s = quizReducer(s, { type: 'loaded' })
    s = quizReducer(s, { type: 'reveal' })
    s = quizReducer(s, { type: 'answer', right: true })
    expect(s.secondsLeft).toBe(10)
    s = quizReducer(s, { type: 'replay', round })
    expect(s.seconds).toBe(10)
    expect(quizReducer(initialState, { type: 'start', round }).secondsLeft).toBe(SECONDS)
  })

  it('songs and movies load pictures from their own address and credit the source', () => {
    const song = { id: 's1', name: 'Gee', artist: 'Girls\' Generation', year: '2009', art: 'https://a/600x600bb.jpg', preview: 'https://p.m4a' }
    expect(photoUrl(song, '/bready/')).toBe('https://a/600x600bb.jpg')
    expect(creditLine(song)).toBe('Preview: Apple Music')
    expect(subLine(song)).toBe("Girls' Generation · 2009")
    const movie = { id: 'm1', name: 'Up', year: '2009', art: 'https://image.tmdb.org/x.jpg', source: 'tmdb' }
    expect(creditLine(movie)).toBe('Image: TMDB')
    expect(subLine(movie)).toBe('2009')
    expect(subLine({ name: 'x' })).toBe('')
    expect(subLine({ artist: '뉴진스', altArtist: 'NewJeans', year: '2023' })).toBe('뉴진스 (NewJeans) · 2023')
  })

  it('each game keeps its own scoreboard', () => {
    expect(new Set([HISTORY_KEY, LOGO_HISTORY_KEY, SONG_HISTORY_KEY, MOVIE_HISTORY_KEY]).size).toBe(4)
  })
})

describe('choosing the pool', () => {
  const pool = [
    { id: 'a', kr: true, year: '1995' }, { id: 'b', kr: true, year: '2005' }, { id: 'c', kr: true, year: '2019' },
    { id: 'd', year: '1984' }, { id: 'e', year: '2008' }, { id: 'f', year: '2015' }, { id: 'g', year: '1975' },
    { id: 'h', rare: true }, { id: 'i', kr: true, rare: true },
  ]
  const ids = (l) => l.map((x) => x.id).join('')
  it('puts a song in the period it was a hit', () => {
    expect([eraOf('1975'), eraOf('1980'), eraOf(1999), eraOf('2000'), eraOf('2009'), eraOf('2010'), eraOf('2025')])
      .toEqual(['old', '80s', '80s', '00s', '00s', '10s', '10s'])
    expect(eraOf('')).toBe(null)
    expect(eraOf(undefined)).toBe(null)
  })
  it('filters by Korean / not Korean and by period, never drawing rare faces', () => {
    expect(ids(choosePool(pool))).toBe('abcdefg')
    expect(ids(choosePool(pool, { group: 'kr' }))).toBe('abc')
    expect(ids(choosePool(pool, { group: 'world' }))).toBe('defg')
    expect(ids(choosePool(pool, { group: 'mix', era: '80s' }))).toBe('ad')
    expect(ids(choosePool(pool, { group: 'world', era: '00s' }))).toBe('e')
    expect(ids(choosePool(pool, { group: 'kr', era: '10s' }))).toBe('c')
  })
  it('a mix is drawn half and half; one group plainly', () => {
    expect(pickerFor('mix')).toBe(pickMixed)
    expect(pickerFor('kr')).toBe(pickRound)
    expect(pickerFor('world')).toBe(pickRound)
  })
  it('remembers the last choice per game and survives bad data', () => {
    const m = new Map()
    const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
    expect(loadPoolChoice('song', st)).toEqual({ group: 'mix', era: 'all' })
    expect(savePoolChoice('song', { group: 'kr', era: '00s' }, st)).toBe(true)
    expect(loadPoolChoice('song', st)).toEqual({ group: 'kr', era: '00s' })
    expect(loadPoolChoice('face', st)).toEqual({ group: 'mix', era: 'all' })
    st.setItem('bready.quiz.pool.face', '{"group":"martian","era":"1700s"}')
    expect(loadPoolChoice('face', st)).toEqual({ group: 'mix', era: 'all' })
    st.setItem('bready.quiz.pool.face', '{oops')
    expect(loadPoolChoice('face', st)).toEqual({ group: 'mix', era: 'all' })
    expect(savePoolChoice('face', {}, null)).toBe(false)
    expect(savePoolChoice('face', {}, { setItem: () => { throw new Error('full') } })).toBe(false)
  })
})

describe('subLine for K-pop faces', () => {
  it('shows the group under a member', () => {
    expect(subLine({ name: '제니', alt: 'Jennie', group: 'BLACKPINK' })).toBe('BLACKPINK')
    expect(subLine({ name: 'Someone' })).toBe('')
  })
})
