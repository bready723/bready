import { describe, it, expect } from 'vitest'
import {
  keepStored,
  parseChapters,
  chapterAt,
  parseName,
  titleFor,
  sortTracks,
  nextTrack,
  prevTrack,
  nextSpeed,
  SPEEDS,
  formatTime,
  formatSize,
  isAudioFile,
  loadPositions,
  savePosition,
  clearPosition,
  RESUME_MIN,
} from './listen.js'

const fakeStore = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }
}

describe('names', () => {
  it('reads a numeric prefix and humanises the rest', () => {
    expect(parseName('01-sourdough.m4a')).toEqual({ n: 1, title: 'Sourdough' })
    expect(parseName('12_morning_bake_notes.mp3')).toEqual({ n: 12, title: 'Morning bake notes' })
    expect(parseName('3. croissant run.m4b')).toEqual({ n: 3, title: 'Croissant run' })
  })
  it('falls back to the bare name', () => {
    expect(parseName('notes.mp3')).toEqual({ n: null, title: 'Notes' })
    expect(parseName('')).toEqual({ n: null, title: '' })
  })
  it('titleFor joins number and title', () => {
    expect(titleFor('02-baguette.m4a')).toBe('2 · Baguette')
    expect(titleFor('intro.m4a')).toBe('Intro')
  })
})

describe('ordering', () => {
  const t = (id, name) => ({ id, name })
  it('numbered first by number, then the rest by name', () => {
    const list = [t('a', 'zebra.mp3'), t('b', '10-ten.m4a'), t('c', '2-two.m4a'), t('d', 'apple.mp3')]
    expect(sortTracks(list).map((x) => x.id)).toEqual(['c', 'b', 'd', 'a'])
  })
  it('does not mutate its input', () => {
    const list = [t('b', '2-b.m4a'), t('a', '1-a.m4a')]
    sortTracks(list)
    expect(list[0].id).toBe('b')
  })
})

describe('next and previous', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('walks forward and stops at the end', () => {
    expect(nextTrack(list, 'a')).toEqual({ id: 'b' })
    expect(nextTrack(list, 'c')).toBeNull()
  })
  it('wraps when repeat is on', () => {
    expect(nextTrack(list, 'c', { repeat: true })).toEqual({ id: 'a' })
  })
  it('starts from the top for an unknown or empty selection', () => {
    expect(nextTrack(list, null)).toEqual({ id: 'a' })
    expect(nextTrack([], 'a')).toBeNull()
  })
  it('previous never leaves the list', () => {
    expect(prevTrack(list, 'c')).toEqual({ id: 'b' })
    expect(prevTrack(list, 'a')).toEqual({ id: 'a' })
    expect(prevTrack(list, 'zzz')).toEqual({ id: 'a' })
    expect(prevTrack([], 'a')).toBeNull()
  })
  it('speed cycles through the fixed steps', () => {
    expect(nextSpeed(1)).toBe(1.25)
    expect(nextSpeed(SPEEDS[SPEEDS.length - 1])).toBe(1)
    expect(nextSpeed(999)).toBe(1)
  })
})

describe('formatting', () => {
  it('formats seconds like a player', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(65.9)).toBe('1:05')
    expect(formatTime(3600 + 5 * 60 + 7)).toBe('1:05:07')
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(-3)).toBe('0:00')
  })
  it('formats sizes coarsely', () => {
    expect(formatSize(0)).toBe('')
    expect(formatSize(500)).toBe('1 KB')
    expect(formatSize(3.2 * 1024 * 1024)).toBe('3.2 MB')
    expect(formatSize(24 * 1024 * 1024)).toBe('24 MB')
  })
})

describe('file filter', () => {
  it('accepts audio by type or by extension', () => {
    expect(isAudioFile({ name: 'x.m4a', type: '' })).toBe(true)
    expect(isAudioFile({ name: 'x', type: 'audio/mpeg' })).toBe(true)
    expect(isAudioFile({ name: 'x.pdf', type: 'application/pdf' })).toBe(false)
    expect(isAudioFile(null)).toBe(false)
  })
})

describe('positions', () => {
  it('round-trips and drops positions near the start', () => {
    const store = fakeStore()
    expect(loadPositions(store)).toEqual({})
    savePosition('a', 125.7, store)
    savePosition('b', RESUME_MIN - 1, store)
    expect(loadPositions(store)).toEqual({ a: 125 })
    clearPosition('a', store)
    expect(loadPositions(store)).toEqual({})
  })
  it('survives corrupt storage', () => {
    const store = fakeStore()
    store.setItem('bready.listen.v1', '{not json')
    expect(loadPositions(store)).toEqual({})
    expect(savePosition('a', 30, store)).toEqual({ a: 30 })
  })
  it('ignores a store that throws', () => {
    const bad = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadPositions(bad)).toEqual({})
    expect(savePosition('a', 30, bad)).toEqual({ a: 30 })
  })
})

describe('keepStored', () => {
  const withNavigator = async (storage, fn) => {
    const had = 'navigator' in globalThis
    const prev = had ? globalThis.navigator : undefined
    Object.defineProperty(globalThis, 'navigator', { value: { storage }, configurable: true })
    try {
      return await fn()
    } finally {
      if (had) Object.defineProperty(globalThis, 'navigator', { value: prev, configurable: true })
      else delete globalThis.navigator
    }
  }

  it('is a no-op success where the API is missing', async () => {
    expect(await withNavigator(undefined, keepStored)).toBe(true)
    expect(await withNavigator({}, keepStored)).toBe(true)
  })
  it('does not re-ask once already persisted', async () => {
    let asked = 0
    const r = await withNavigator(
      { persisted: async () => true, persist: async () => { asked++; return false } },
      keepStored,
    )
    expect(r).toBe(true)
    expect(asked).toBe(0)
  })
  it('reports the browser answer when it asks', async () => {
    expect(await withNavigator({ persisted: async () => false, persist: async () => true }, keepStored)).toBe(true)
    expect(await withNavigator({ persisted: async () => false, persist: async () => false }, keepStored)).toBe(false)
  })
  it('never throws out to the caller', async () => {
    expect(await withNavigator({ persisted: async () => { throw new Error('x') } }, keepStored)).toBe(true)
  })
})

// A minimal `chpl` atom, built the way ffmpeg writes one.
function chpl(marks) {
  const enc = new TextEncoder()
  const titles = marks.map((m) => enc.encode(m.title))
  const size = 9 + titles.reduce((n, t) => n + 9 + t.length, 0)
  const b = new Uint8Array(4 + size)
  b.set(enc.encode('chpl'), 0)
  const v = new DataView(b.buffer)
  v.setUint32(4, 0x01000000)
  v.setUint32(8, 0)
  b[12] = marks.length
  let p = 13
  marks.forEach((m, i) => {
    v.setBigUint64(p, BigInt(Math.round(m.start * 10_000_000)))
    p += 8
    b[p] = titles[i].length
    p += 1
    b.set(titles[i], p)
    p += titles[i].length
  })
  return b.buffer
}

describe('chapters inside one file', () => {
  const marks = [
    { start: 0, title: '1. The opening' },
    { start: 289.1, title: '2. The middle' },
    { start: 2705.4, title: '3. The end' },
  ]

  it('reads a chpl atom back', () => {
    const got = parseChapters(chpl(marks))
    expect(got.map((c) => c.title)).toEqual(['1. The opening', '2. The middle', '3. The end'])
    expect(got[1].start).toBeCloseTo(289.1, 3)
    expect(got[2].start).toBeCloseTo(2705.4, 3)
  })
  it('keeps non-ASCII titles intact', () => {
    expect(parseChapters(chpl([{ start: 0, title: 'Café · 크루아상' }]))[0].title).toBe('Café · 크루아상')
  })
  it('returns nothing rather than throwing on junk', () => {
    expect(parseChapters(new Uint8Array([1, 2, 3, 4]).buffer)).toEqual([])
    expect(parseChapters(new ArrayBuffer(0))).toEqual([])
    // a chpl header that claims more chapters than the bytes hold
    const truncated = chpl(marks).slice(0, 20)
    expect(Array.isArray(parseChapters(truncated))).toBe(true)
  })

  it('locates the chapter a moment belongs to', () => {
    expect(chapterAt(marks, 0)).toBe(0)
    expect(chapterAt(marks, 288)).toBe(0)
    expect(chapterAt(marks, 289.1)).toBe(1)
    expect(chapterAt(marks, 1000)).toBe(1)
    expect(chapterAt(marks, 99999)).toBe(2)
  })
  it('is -1 when a file has no chapters', () => {
    expect(chapterAt([], 10)).toBe(-1)
    expect(chapterAt(null, 10)).toBe(-1)
  })
})
