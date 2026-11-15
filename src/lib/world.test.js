import { describe, it, expect } from 'vitest'
import bank from './world-bank.json'
import { loadHistory, saveHistory, HISTORY_KEY } from './quiz.js'
import {
  WORLD_ROUND, TIER_MIX, KINDS, historyKey, missedKey, answerOf, flagUrl, buildRound, choicesFor, makeRound,
  worldInitial, worldReducer, isRight, tally, nextMissed, verdict, loadMissed, saveMissed,
} from './world.js'

const memStore = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }
}
const tiers = (round) => round.reduce((c, x) => ({ ...c, [x.tier]: (c[x.tier] || 0) + 1 }), {})

describe('world bank', () => {
  it('has 190 countries, each with capital, flag code, tier and region', () => {
    expect(bank).toHaveLength(190)
    for (const x of bank) {
      expect(x.country && x.capital && x.code && x.region).toBeTruthy()
      expect([1, 2, 3]).toContain(x.tier)
    }
    expect(new Set(bank.map((x) => x.country)).size).toBe(190)
    expect(new Set(bank.map((x) => x.capital)).size).toBe(190)
  })
  it('every region has enough countries for three look-alike answers', () => {
    const regions = new Set(bank.map((x) => x.region))
    for (const r of regions) expect(bank.filter((x) => x.region === r).length).toBeGreaterThanOrEqual(4)
  })
})

describe('buildRound', () => {
  it('gives 20 distinct questions in the Muse mix: 2 easy, 4 medium, 14 hard', () => {
    const round = buildRound(bank)
    expect(round).toHaveLength(WORLD_ROUND)
    expect(new Set(round.map((x) => x.country)).size).toBe(20)
    expect(tiers(round)).toEqual(TIER_MIX)
  })
  it('brings missed questions back, taking seats from hard first', () => {
    const missed = ['France', 'Japan', 'Palau']
    const round = buildRound(bank, missed)
    expect(round).toHaveLength(20)
    for (const c of missed) expect(round.map((x) => x.country)).toContain(c)
    expect(new Set(round.map((x) => x.country)).size).toBe(20)
  })
  it('caps returning misses at a full round and ignores unknown names', () => {
    const many = bank.slice(0, 30).map((x) => x.country)
    const round = buildRound(bank, ['Atlantis', ...many])
    expect(round).toHaveLength(20)
    expect(round.every((x) => many.includes(x.country))).toBe(true)
  })
  it('tops up from any tier when a small bank runs short', () => {
    const small = bank.filter((x) => x.tier === 1).slice(0, 25)
    const round = buildRound(small)
    expect(round).toHaveLength(20)
    expect(new Set(round.map((x) => x.country)).size).toBe(20)
  })
})

describe('choicesFor', () => {
  it('has four different answers including the right one, for both kinds', () => {
    for (const kind of KINDS) {
      for (const item of bank) {
        const c = choicesFor(item, bank, kind)
        expect(c).toHaveLength(4)
        expect(new Set(c).size).toBe(4)
        expect(c).toContain(answerOf(item, kind))
      }
    }
  })
  it('wrong answers come from the same region', () => {
    const belize = bank.find((x) => x.country === 'Belize')
    const c = choicesFor(belize, bank, 'capital')
    const region = (cap) => bank.find((x) => x.capital === cap).region
    expect(c.every((cap) => region(cap) === 'Americas')).toBe(true)
  })
  it('falls back to other regions when one is too small', () => {
    const tiny = [
      { country: 'A', capital: 'a', region: 'X' },
      { country: 'B', capital: 'b', region: 'Y' },
      { country: 'C', capital: 'c', region: 'Y' },
      { country: 'D', capital: 'd', region: 'Y' },
    ]
    expect([...choicesFor(tiny[0], tiny, 'capital')].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('labels and keys', () => {
  it('answers, flags and storage keys', () => {
    const fr = bank.find((x) => x.country === 'France')
    expect(answerOf(fr, 'capital')).toBe('Paris')
    expect(answerOf(fr, 'flag')).toBe('France')
    expect(flagUrl(fr, '/bready/')).toBe('/bready/flags/fr.svg')
    expect(flagUrl(fr)).toBe('/flags/fr.svg')
    expect(historyKey('flag')).toBe('bready.world.flag.v1')
    expect(missedKey('capital')).toBe('bready.world.capital.missed')
  })
})

describe('worldReducer', () => {
  const round = makeRound(bank, 'capital').slice(0, 2)
  it('a pick locks in once; next only after a pick; done after the last', () => {
    let s = worldReducer(worldInitial, { type: 'start', round })
    expect(s).toMatchObject({ phase: 'play', index: 0, picks: [] })
    expect(worldReducer(s, { type: 'next' })).toBe(s)
    s = worldReducer(s, { type: 'pick', choice: 'X' })
    expect(worldReducer(s, { type: 'pick', choice: 'Y' })).toBe(s)
    s = worldReducer(s, { type: 'next' })
    expect(s.index).toBe(1)
    s = worldReducer(worldReducer(s, { type: 'pick', choice: 'Z' }), { type: 'next' })
    expect(s.phase).toBe('done')
    expect(s.picks).toEqual(['X', 'Z'])
    expect(worldReducer(s, { type: 'pick', choice: 'Q' })).toBe(s)
    expect(worldReducer(s, { type: 'next' })).toBe(s)
    expect(worldReducer(s, { type: 'nope' })).toBe(s)
  })
})

describe('scoring and misses', () => {
  const round = makeRound(bank, 'flag')
  const picks = round.map((q, i) => (i < 15 ? q.item.country : 'wrong'))
  it('tallies right answers', () => {
    expect(isRight(round[0], round[0].item.country, 'flag')).toBe(true)
    expect(tally(round, picks, 'flag')).toEqual({ correct: 15, total: 20, score: 75 })
    expect(tally([], [], 'flag')).toEqual({ correct: 0, total: 0, score: 0 })
  })
  it('new misses join old ones; a right answer clears a miss', () => {
    const old = [round[0].item.country, 'Elsewhere']
    const next = nextMissed(old, round, picks, 'flag')
    expect(next).not.toContain(round[0].item.country)
    expect(next).toContain('Elsewhere')
    expect(next).toHaveLength(6)
  })
  it('verdicts', () => {
    expect(verdict(20, 20)).toBe('Perfect round.')
    expect(verdict(17, 20)).toBe('Strong recall.')
    expect(verdict(15, 20)).toBe('Good ground covered.')
    expect(verdict(9, 20)).toBe('Getting there.')
    expect(verdict(2, 20)).toBe('Fresh start.')
    expect(verdict(0, 0)).toBe('Fresh start.')
  })
})

describe('storage', () => {
  it('missed lists round-trip per quiz and survive bad data', () => {
    const st = memStore()
    expect(loadMissed('flag', st)).toEqual([])
    expect(saveMissed('flag', ['Chad'], st)).toBe(true)
    expect(loadMissed('flag', st)).toEqual(['Chad'])
    expect(loadMissed('capital', st)).toEqual([])
    st.setItem(missedKey('capital'), '{bad')
    expect(loadMissed('capital', st)).toEqual([])
    st.setItem(missedKey('capital'), '{"a":1}')
    expect(loadMissed('capital', st)).toEqual([])
    expect(saveMissed('flag', [], null)).toBe(false)
    expect(saveMissed('flag', [], { setItem: () => { throw new Error('full') } })).toBe(false)
  })
  it('each quiz keeps its own scoreboard; Who Is This keeps its old key', () => {
    const st = memStore()
    const row = { at: 1, score: 75, correct: 15, total: 20, name: 'Sara' }
    saveHistory([row], st, historyKey('capital'))
    expect(loadHistory(st, historyKey('capital'))).toEqual([row])
    expect(loadHistory(st, historyKey('flag'))).toEqual([])
    expect(loadHistory(st)).toEqual([])
    saveHistory([row], st)
    expect(st.m.has(HISTORY_KEY)).toBe(true)
  })
})
