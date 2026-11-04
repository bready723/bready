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

// phase: idle → loading (photo on its way) → countdown → revealed → … → done
export const initialState = { phase: 'idle', round: [], index: 0, secondsLeft: SECONDS, answers: [] }

const question = (state, index) => ({ ...state, phase: 'loading', index, secondsLeft: SECONDS })

export function quizReducer(state, action) {
  switch (action.type) {
    case 'start':
    case 'replay':
      return question({ ...initialState, round: action.round }, 0)
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

export function photoUrl(person, base = '/') {
  return `${base.replace(/\/$/, '')}/quiz/${person.file}`
}

// CC BY / BY-SA ask for credit where the photo is shown.
export function creditLine(person) {
  if (person.source !== 'commons') return ''
  return `Photo: ${person.credit || 'Wikimedia Commons'} · ${person.license}`
}

// ---- score history: finished games, newest first, kept on this phone ----
export const HISTORY_KEY = 'bready.quiz.v1'
export const HISTORY_MAX = 50

const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null)
const isRow = (r) => r && Number.isFinite(r.at) && Number.isFinite(r.score) && Number.isFinite(r.correct) && Number.isFinite(r.total)

export function loadHistory(store = defaultStore()) {
  try {
    const list = JSON.parse(store?.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(list) ? list.filter(isRow) : []
  } catch {
    return []
  }
}

export function addResult(history, { score, correct, total }, at = Date.now()) {
  return [{ at, score, correct, total }, ...history].slice(0, HISTORY_MAX)
}

export function saveHistory(history, store = defaultStore()) {
  try {
    if (!store) return false
    store.setItem(HISTORY_KEY, JSON.stringify(history))
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
