// Who Is This? — a face-recall game. Pure logic only: the screen owns the
// one-second interval and the photo element, and feeds this reducer actions.

export const ROUND_SIZE = 20
export const SECONDS = 5

// Fisher–Yates on a copy. `rng` is injectable so tests are deterministic.
export function shuffle(list, rng = Math.random) {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Distinct people for one game; the whole pool when it is smaller than a round.
export function pickRound(pool, n = ROUND_SIZE, rng = Math.random) {
  return shuffle(pool, rng).slice(0, n)
}

// Honour-system score scaled to 100 (20 questions → 5 points each).
export function scoreOf(answers, total) {
  const correct = answers.filter(Boolean).length
  return { correct, total, score: total > 0 ? Math.round((correct * 100) / total) : 0 }
}

// Guess the Song: half Korean songs, half global, shuffled together. When one
// side runs short the other fills the round.
export function pickMixed(pool, n = ROUND_SIZE, rng = Math.random) {
  const kr = shuffle(pool.filter((x) => x.kr), rng)
  const world = shuffle(pool.filter((x) => !x.kr), rng)
  const half = Math.ceil(n / 2)
  const a = kr.slice(0, Math.max(half, n - world.length))
  const b = world.slice(0, n - a.length)
  return shuffle([...a, ...b], rng).slice(0, n)
}

// phase: idle → loading (photo on its way) → countdown → revealed → … → done
// seconds: the clock for each question (5 for pictures, longer for songs)
export const initialState = { phase: 'idle', round: [], index: 0, seconds: SECONDS, secondsLeft: SECONDS, answers: [] }

const question = (state, index) => ({ ...state, phase: 'loading', index, secondsLeft: state.seconds })

export function quizReducer(state, action) {
  switch (action.type) {
    case 'start':
    case 'replay':
      return question({ ...initialState, round: action.round, seconds: action.seconds || state.seconds || SECONDS }, 0)
    case 'loaded':
      // The clock starts only once the photo is on screen, so a slow network
      // never eats the five seconds.
      return state.phase === 'loading' ? { ...state, phase: 'countdown' } : state
    case 'tick': {
      if (state.phase !== 'countdown') return state
      const secondsLeft = state.secondsLeft - 1
      return secondsLeft <= 0 ? { ...state, secondsLeft: 0, phase: 'revealed' } : { ...state, secondsLeft }
    }
    case 'reveal':
      return state.phase === 'countdown' || state.phase === 'loading' ? { ...state, phase: 'revealed' } : state
    case 'answer': {
      if (state.phase !== 'revealed') return state
      const answers = [...state.answers, !!action.right]
      const next = state.index + 1
      return next >= state.round.length ? { ...state, answers, phase: 'done' } : question({ ...state, answers }, next)
    }
    case 'stop':
      return initialState
    default:
      return state
  }
}

// `dir`: 'quiz' for faces, 'logos' for the Logo Quiz. Songs and movies carry
// their own picture address (Apple / TMDB), streamed at play time.
export function photoUrl(person, base = '/', dir = 'quiz') {
  if (person.art) return person.art
  return `${base.replace(/\/$/, '')}/${dir}/${person.file}`
}

// CC BY / BY-SA ask for credit where the photo is shown.
export function creditLine(person, label = 'Photo') {
  if (person.preview) return 'Preview: Apple Music'
  if (person.source === 'tmdb') return 'Image: TMDB'
  if (person.source !== 'commons') return ''
  return `${label}: ${person.credit || 'Wikimedia Commons'} · ${person.license}`
}

// the small line under a revealed song or movie: "Artist · 2019"; under a K-pop face: its group
export function subLine(item) {
  if (item.group) return item.group
  const who = item.artist && item.altArtist ? `${item.artist} (${item.altArtist})` : item.artist
  return [who, item.year].filter(Boolean).join(' · ')
}

// ---- score history: finished games, newest first, kept on this phone ----
export const HISTORY_KEY = 'bready.quiz.v1'
export const LOGO_HISTORY_KEY = 'bready.logo.v1'
export const SONG_HISTORY_KEY = 'bready.song.v1'
export const MOVIE_HISTORY_KEY = 'bready.movie.v1'
export const SONG_SECONDS = 10
export const HISTORY_MAX = 50

const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null)
const isRow = (r) => r && Number.isFinite(r.at) && Number.isFinite(r.score) && Number.isFinite(r.correct) && Number.isFinite(r.total)

export function loadHistory(store = defaultStore(), key = HISTORY_KEY) {
  try {
    const list = JSON.parse(store?.getItem(key) || '[]')
    return Array.isArray(list) ? list.filter(isRow) : []
  } catch {
    return []
  }
}

export function addResult(history, { score, correct, total }, at = Date.now(), name = DEFAULT_NAME) {
  return [{ at, score, correct, total, name: cleanName(name) }, ...history].slice(0, HISTORY_MAX)
}

// player names: family shares one phone, so each game is tagged with who played
export const NAME_KEY = 'bready.quiz.name'
export const NAME_MAX = 12
export const DEFAULT_NAME = 'Player'

export function cleanName(name) {
  const s = String(name ?? '').replace(/\s+/g, ' ').trim()
  return [...s].slice(0, NAME_MAX).join('').trim() || DEFAULT_NAME
}

export const nameOf = (row) => cleanName(row?.name)

// distinct names, newest first; the "Player" fallback is not offered as a pick
export function recentNames(history, n = 5) {
  const out = []
  for (const row of history) {
    const name = nameOf(row)
    if (name !== DEFAULT_NAME && !out.includes(name)) out.push(name)
    if (out.length === n) break
  }
  return out
}

// the game just played is history[0]; Save renames it instead of adding a row
export function renameLast(history, name) {
  if (!history.length) return history
  return [{ ...history[0], name: cleanName(name) }, ...history.slice(1)]
}

// fixing a typo'd name: every game saved under it on this scoreboard takes the new one
export function renameAll(history, from, to) {
  const old = cleanName(from), name = cleanName(to)
  if (old === name) return history
  return history.map((row) => (nameOf(row) === old ? { ...row, name } : row))
}

export function bestRow(history) {
  return history.reduce((top, row) => (top && top.score >= row.score ? top : row), null)
}

export function loadName(store = defaultStore()) {
  try {
    const v = store?.getItem(NAME_KEY)
    return v ? cleanName(v) : ''
  } catch {
    return ''
  }
}

export function saveName(name, store = defaultStore()) {
  try {
    if (!store) return false
    store.setItem(NAME_KEY, cleanName(name))
    return true
  } catch {
    return false
  }
}

export function saveHistory(history, store = defaultStore(), key = HISTORY_KEY) {
  try {
    if (!store) return false
    store.setItem(key, JSON.stringify(history))
    return true
  } catch {
    return false
  }
}

export function summarize(history) {
  if (!history.length) return { games: 0, best: null, average: null }
  const scores = history.map((h) => h.score)
  return { games: scores.length, best: Math.max(...scores), average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }
}

// hub tile chip: best score so far, or "New" before the first game
export function bestLabel(history) {
  const { best } = summarize(history || [])
  return best === null ? 'New' : `Best ${best}`
}

// a few random items for a hub tile's picture stack
export function sampleArt(pool, n = 3, rng = Math.random) {
  return pickRound(pool || [], n, rng)
}

// history[0] is the game just played
export function isNewBest(history) {
  if (history.length < 2) return false
  return history[0].score > Math.max(...history.slice(1).map((h) => h.score))
}

export function playedLabel(at, now = new Date()) {
  const d = new Date(at)
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 86400000)
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (diff === 0) return `Today ${time}`
  if (diff === 1) return `Yesterday ${time}`
  const opts = { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) }
  return d.toLocaleDateString('en-US', opts)
}

// ---- choosing the pool (Sara, 2026-11-22) ----
// Who Is This? and Guess the Song can be played as a mix, Korean only, or not Korean;
// songs can also be narrowed to the period they were a hit.
export const GROUPS = ['mix', 'kr', 'world']
export const ERAS = ['all', '80s', '00s', '10s']

export function eraOf(year) {
  const y = parseInt(year, 10)
  if (!y) return null
  if (y < 1980) return 'old'
  if (y < 2000) return '80s'
  if (y < 2010) return '00s'
  return '10s'
}

// `rare` marks faces too little known for the game (kept in the file, never drawn)
export function choosePool(pool, { group = 'mix', era = 'all' } = {}) {
  return pool.filter((x) => !x.rare
    && (group === 'mix' || (group === 'kr') === !!x.kr)
    && (era === 'all' || eraOf(x.year) === era))
}

// a mix is half Korean, half not; a single group is drawn plainly
export const pickerFor = (group) => (group === 'mix' ? pickMixed : pickRound)

const poolKey = (kind) => `bready.quiz.pool.${kind}`
export function loadPoolChoice(kind, store = defaultStore()) {
  try {
    const v = JSON.parse(store?.getItem(poolKey(kind)) || '{}')
    return { group: GROUPS.includes(v.group) ? v.group : 'mix', era: ERAS.includes(v.era) ? v.era : 'all' }
  } catch {
    return { group: 'mix', era: 'all' }
  }
}
export function savePoolChoice(kind, choice, store = defaultStore()) {
  try {
    if (!store) return false
    store.setItem(poolKey(kind), JSON.stringify(choice))
    return true
  } catch {
    return false
  }
}
