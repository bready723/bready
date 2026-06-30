// bready ranking engine
// --------------------------------------------------------------------------
// The Beli-style trick: you never type a number. You pick a gut "tier", then
// answer a few better-or-worse questions. A binary search turns ~2-3 taps into
// an exact slot, and scores are spread evenly inside each tier band.

export const TIERS = {
  loved:    { key: 'loved',    label: 'Loved it',       emoji: '😍', min: 8.0, max: 10.0 },
  fine:     { key: 'fine',     label: 'It was fine',    emoji: '🙂', min: 5.0, max: 7.9 },
  disliked: { key: 'disliked', label: "Didn't like it", emoji: '😕', min: 0.0, max: 4.9 },
}

// Best tier first — this is also the order bakeries appear in the ranked list.
export const TIER_ORDER = ['loved', 'fine', 'disliked']

// Items already logged in a given tier, kept in ranked (best -> worst) order.
export function tierItems(ranked, tierKey) {
  return ranked.filter((x) => x.tier === tierKey)
}

// Interactive binary-search insertion. The UI calls next() to get the bakery
// to compare against, then choose(newIsBetter) with the user's answer. When
// `done` is true, `index` is where the new bakery slots in within its tier.
export function createInsertion(tierItems) {
  let lo = 0
  let hi = tierItems.length // candidate insertion index in [lo, hi]
  let pending = null

  return {
    next() {
      if (lo >= hi) return null
      const mid = Math.floor((lo + hi) / 2)
      pending = mid
      return tierItems[mid]
    },
    choose(newIsBetter) {
      if (pending == null) return
      if (newIsBetter) hi = pending // new ranks above mid -> search upper half
      else lo = pending + 1 // new ranks below mid -> search lower half
      pending = null
    },
    get done() {
      return lo >= hi
    },
    get index() {
      return lo
    },
    // How many comparisons are still possible (for a progress hint).
    get comparisonsLeft() {
      return hi - lo <= 0 ? 0 : Math.ceil(Math.log2(hi - lo + 1))
    },
  }
}

// Re-spread every bakery's score evenly inside its tier band. Centering each
// item at (k + 0.5)/n keeps scores off the ugly exact bounds (no flat 10.0s).
export function rebuildScores(ranked) {
  const out = ranked.map((x) => ({ ...x }))
  for (const tierKey of TIER_ORDER) {
    const idxs = []
    out.forEach((x, i) => {
      if (x.tier === tierKey) idxs.push(i)
    })
    const n = idxs.length
    if (n === 0) continue
    const { min, max } = TIERS[tierKey]
    idxs.forEach((idx, k) => {
      const score = max - (max - min) * ((k + 0.5) / n)
      out[idx].score = Math.round(score * 10) / 10
    })
  }
  return out
}

// Splice a new bakery into the full ranked list at the right tier block and
// position, then recompute all scores. Keeps tier blocks contiguous.
export function insertAtTier(ranked, newItem, tierKey, indexWithinTier) {
  const blockStart = ranked.findIndex((x) => x.tier === tierKey)
  let insertPos
  if (blockStart === -1) {
    // First bakery in this tier: drop it just below all higher tiers.
    const higher = TIER_ORDER.slice(0, TIER_ORDER.indexOf(tierKey))
    insertPos = ranked.filter((x) => higher.includes(x.tier)).length
  } else {
    insertPos = blockStart + indexWithinTier
  }
  const copy = ranked.slice()
  copy.splice(insertPos, 0, { ...newItem, tier: tierKey })
  return rebuildScores(copy)
}

// Non-interactive helper (used by tests and any batch logic): run the whole
// insertion using a synchronous comparator isBetter(newItem, candidate).
export function addBakery(ranked, newItem, tierKey, isBetter) {
  const items = tierItems(ranked, tierKey)
  const ins = createInsertion(items)
  let candidate
  while ((candidate = ins.next()) !== null) {
    ins.choose(isBetter(newItem, candidate))
  }
  return insertAtTier(ranked, newItem, tierKey, ins.index)
}
