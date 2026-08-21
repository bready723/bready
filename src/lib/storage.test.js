import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadState, saveState, storageUsage, isQuotaError, SAVE_OK, SAVE_FULL, SAVE_BLOCKED } from './storage.js'

// A stand-in for localStorage we can make fail on demand.
function fakeStore({ failWith } = {}) {
  const data = new Map()
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      if (failWith) throw failWith
      data.set(k, v)
    },
  }
}

const original = globalThis.localStorage
const useStore = (s) => Object.defineProperty(globalThis, 'localStorage', { value: s, configurable: true })
afterEach(() => Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true }))

describe('saveState reports failures instead of swallowing them', () => {
  it('reports success', () => {
    useStore(fakeStore())
    expect(saveState({ bakeries: [] })).toBe(SAVE_OK)
  })

  it('reports a full store, so the app can warn instead of losing data quietly', () => {
    const err = new Error('full')
    err.name = 'QuotaExceededError'
    useStore(fakeStore({ failWith: err }))
    expect(saveState({ bakeries: [] })).toBe(SAVE_FULL)
  })

  it('reports a blocked store separately from a full one', () => {
    useStore(fakeStore({ failWith: new Error('private mode') }))
    expect(saveState({ bakeries: [] })).toBe(SAVE_BLOCKED)
  })

  it('round-trips through loadState', () => {
    useStore(fakeStore())
    saveState({ bakeries: [{ id: 'a' }], notes: ['hi'] })
    const back = loadState()
    expect(back.bakeries).toEqual([{ id: 'a' }])
    expect(back.notes).toEqual(['hi'])
    expect(back.fxCurrency).toBe('USD') // defaults still filled in
  })

  it('falls back to an empty state when storage is unreadable', () => {
    useStore({ getItem: () => 'not json', setItem: () => {} })
    expect(loadState().bakeries).toEqual([])
  })
})

describe('isQuotaError', () => {
  it('recognises the name each browser uses', () => {
    for (const name of ['QuotaExceededError', 'QUOTA_EXCEEDED_ERR', 'NS_ERROR_DOM_QUOTA_REACHED']) {
      const e = new Error('x')
      e.name = name
      expect(isQuotaError(e), name).toBe(true)
    }
    const legacy = new Error('x')
    legacy.code = 22
    expect(isQuotaError(legacy)).toBe(true)
    expect(isQuotaError(new Error('something else'))).toBe(false)
    expect(isQuotaError(null)).toBe(false)
  })
})

describe('storageUsage', () => {
  it('measures the serialised size', () => {
    const u = storageUsage({ bakeries: [] })
    expect(u.bytes).toBeGreaterThan(0)
    expect(u.nearlyFull).toBe(false)
  })

  it('flags a store that is nearly full', () => {
    // one fake photo-sized blob per bakery, enough to cross 80% of 5MB
    const big = { bakeries: Array.from({ length: 30 }, () => ({ photo: 'x'.repeat(150_000) })) }
    expect(storageUsage(big).nearlyFull).toBe(true)
  })

  it('does not throw on unserialisable state', () => {
    const cyclic = {}
    cyclic.self = cyclic
    expect(() => storageUsage(cyclic)).not.toThrow()
    expect(storageUsage(cyclic).bytes).toBe(0)
  })
})
