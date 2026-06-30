import { describe, it, expect } from 'vitest'
import {
  TIERS,
  TIER_ORDER,
  addBakery,
  createInsertion,
  rebuildScores,
} from './ranking.js'

// A "true quality" comparator: pretend each bakery has a hidden quality number,
// and the user always answers comparisons consistently with it.
const better = (a, b) => a.q > b.q

function buildList(seq) {
  let ranked = []
  for (const item of seq) {
    ranked = addBakery(ranked, { id: item.id, name: item.name, q: item.q }, item.tier, better)
  }
  return ranked
}

describe('ranking engine', () => {
  it('orders bakeries by tier, then by quality within a tier', () => {
    const ranked = buildList([
      { id: 1, name: 'Olive',   q: 9.5, tier: 'loved' },
      { id: 2, name: 'Crumb',   q: 7.0, tier: 'fine' },
      { id: 3, name: 'Terra',   q: 9.9, tier: 'loved' },
      { id: 4, name: 'Stale',   q: 2.0, tier: 'disliked' },
      { id: 5, name: 'Bagel Nook', q: 8.7, tier: 'loved' },
      { id: 6, name: 'Day Old', q: 6.1, tier: 'fine' },
    ])

    expect(ranked.map((b) => b.name)).toEqual([
      'Terra',       // loved, q 9.9
      'Olive',       // loved, q 9.5
      'Bagel Nook',  // loved, q 8.7
      'Crumb',       // fine, q 7.0
      'Day Old',     // fine, q 6.1
      'Stale',       // disliked, q 2.0
    ])
  })

  it('keeps every score inside its tier band and strictly descending', () => {
    const ranked = buildList([
      { id: 1, name: 'A', q: 9.5, tier: 'loved' },
      { id: 2, name: 'B', q: 8.2, tier: 'loved' },
      { id: 3, name: 'C', q: 7.5, tier: 'fine' },
      { id: 4, name: 'D', q: 5.5, tier: 'fine' },
      { id: 5, name: 'E', q: 3.0, tier: 'disliked' },
    ])

    for (const b of ranked) {
      const band = TIERS[b.tier]
      expect(b.score).toBeGreaterThanOrEqual(band.min)
      expect(b.score).toBeLessThanOrEqual(band.max)
    }
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThan(ranked[i].score)
    }
  })

  it('gives a lone bakery in a tier the middle of its band', () => {
    const ranked = buildList([{ id: 1, name: 'Solo', q: 9, tier: 'loved' }])
    expect(ranked[0].score).toBe(9) // midpoint of 8.0–10.0
  })

  it('insertion never asks more than ceil(log2(n+1)) comparisons', () => {
    // 7 existing items -> at most 3 comparisons to place the 8th.
    const items = Array.from({ length: 7 }, (_, i) => ({ id: i, score: 9 - i }))
    const ins = createInsertion(items)
    let asked = 0
    let cand
    while ((cand = ins.next()) !== null) {
      asked++
      ins.choose(asked % 2 === 0) // arbitrary but valid answers
    }
    expect(asked).toBeLessThanOrEqual(Math.ceil(Math.log2(7 + 1)))
    expect(ins.done).toBe(true)
  })

  it('rebuildScores is a pure recompute over the ordered list', () => {
    const ordered = [
      { id: 1, tier: 'loved' },
      { id: 2, tier: 'loved' },
      { id: 3, tier: 'fine' },
    ]
    const scored = rebuildScores(ordered)
    expect(scored[0].score).toBeGreaterThan(scored[1].score)
    expect(scored[1].score).toBeGreaterThan(scored[2].score)
    expect(TIER_ORDER).toContain(scored[2].tier)
  })
})
