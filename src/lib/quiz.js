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
