// World quizzes: country → capital and flag → country.
// Pure logic only; the screen lives in src/screens/WorldQuiz.jsx.
import { shuffle } from './quiz.js'

export const WORLD_ROUND = 20
// Meta Muse's mix: 2 easy, 4 medium, 14 hard (tier 1/2/3)
export const TIER_MIX = { 1: 2, 2: 4, 3: 14 }
export const KINDS = ['capital', 'flag']

export const historyKey = (kind) => `bready.world.${kind}.v1`
export const missedKey = (kind) => `bready.world.${kind}.missed`

// what the four buttons say
export const answerOf = (item, kind) => (kind === 'capital' ? item.capital : item.country)

export function flagUrl(item, base = '/') {
  return `${base.replace(/\/$/, '')}/flags/${item.code}.svg`
}

// Missed questions come back first (up to a full round). The rest follow the
// tier mix; when misses take seats, hard questions give theirs up first.
export function buildRound(bank, missed = [], rng = Math.random, size = WORLD_ROUND) {
  const byCountry = new Map(bank.map((x) => [x.country, x]))
  const back = [...new Set(missed)].map((c) => byCountry.get(c)).filter(Boolean).slice(0, size)
  const taken = new Set(back.map((x) => x.country))
  const free = size - back.length
  const quota = { ...TIER_MIX }
  let over = Object.values(quota).reduce((a, b) => a + b, 0) - free
  for (const t of [3, 2, 1]) {
    const cut = Math.max(0, Math.min(quota[t], over))
    quota[t] -= cut
    over -= cut
  }
  const fresh = []
  for (const t of [1, 2, 3]) {
    const pool = shuffle(bank.filter((x) => x.tier === t && !taken.has(x.country)), rng)
    fresh.push(...pool.slice(0, quota[t]))
  }
  // a small bank can run short on one tier; top up from anything unused
  if (fresh.length + back.length < size) {
    const used = new Set([...taken, ...fresh.map((x) => x.country)])
    fresh.push(...shuffle(bank.filter((x) => !used.has(x.country)), rng).slice(0, size - back.length - fresh.length))
  }
  return shuffle([...back, ...fresh], rng)
}

// Three wrong answers from the same region where possible, so they look alike.
export function choicesFor(item, bank, kind, rng = Math.random) {
  const right = answerOf(item, kind)
  const others = bank.filter((x) => x.country !== item.country)
  const near = shuffle(others.filter((x) => x.region === item.region), rng)
  const far = shuffle(others.filter((x) => x.region !== item.region), rng)
  const wrong = [...near, ...far].slice(0, 3).map((x) => answerOf(x, kind))
  return shuffle([right, ...wrong], rng)
}

export function makeRound(bank, kind, missed = [], rng = Math.random) {
  return buildRound(bank, missed, rng).map((item) => ({ item, choices: choicesFor(item, bank, kind, rng) }))
}

// ---- game state ----
export const worldInitial = { phase: 'play', round: [], index: 0, picks: [] }

export function worldReducer(state, action) {
  switch (action.type) {
    case 'start':
      return { phase: 'play', round: action.round, index: 0, picks: [] }
    case 'pick':
      if (state.phase !== 'play' || state.picks[state.index] !== undefined) return state
      return { ...state, picks: [...state.picks.slice(0, state.index), action.choice] }
    case 'next': {
      if (state.phase !== 'play' || state.picks[state.index] === undefined) return state
      const index = state.index + 1
      return index >= state.round.length ? { ...state, phase: 'done' } : { ...state, index }
    }
    default:
      return state
  }
}

export const isRight = (q, pick, kind) => pick === answerOf(q.item, kind)

export function tally(round, picks, kind) {
  const correct = round.filter((q, i) => isRight(q, picks[i], kind)).length
  const total = round.length
  return { correct, total, score: total ? Math.round((correct / total) * 100) : 0 }
}

// misses from earlier rounds stay until answered right; new misses join them
export function nextMissed(missed, round, picks, kind) {
  const right = new Set(round.filter((q, i) => isRight(q, picks[i], kind)).map((q) => q.item.country))
  const wrong = round.filter((q, i) => !isRight(q, picks[i], kind)).map((q) => q.item.country)
  return [...new Set([...wrong, ...missed.filter((c) => !right.has(c))])]
}

export function verdict(correct, total) {
  const r = total ? correct / total : 0
  if (r === 1) return 'Perfect round.'
  if (r >= 0.85) return 'Strong recall.'
  if (r >= 0.65) return 'Good ground covered.'
  if (r >= 0.4) return 'Getting there.'
  return 'Fresh start.'
}

const defaultStore = () => (typeof localStorage !== 'undefined' ? localStorage : null)

export function loadMissed(kind, store = defaultStore()) {
  try {
    const v = JSON.parse(store?.getItem(missedKey(kind)) || '[]')
    return Array.isArray(v) ? v.filter((c) => typeof c === 'string') : []
  } catch {
    return []
  }
}

export function saveMissed(kind, list, store = defaultStore()) {
  try {
    if (!store) return false
    store.setItem(missedKey(kind), JSON.stringify(list))
    return true
  } catch {
    return false
  }
}
