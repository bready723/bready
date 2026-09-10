// Listen — audio Sara adds on the phone, kept in this browser and nowhere else.
// The code is a player; the recordings are hers. Nothing here goes to the
// repo, to localStorage (too small for audio) or to Supabase.

import { uid } from './storage.js'

const POS_KEY = 'bready.listen.v1'
const AUDIO_EXT = /\.(m4a|m4b|mp3|aac|wav|ogg|oga|opus|flac|caf|aif|aiff)$/i

export const SPEEDS = [1, 1.25, 1.5]
export const SKIP_SECONDS = 15
// Below this a "resume" would land where the track starts anyway.
export const RESUME_MIN = 5

export function isAudioFile(file) {
  if (!file) return false
  if (typeof file.type === 'string' && file.type.startsWith('audio/')) return true
  return AUDIO_EXT.test(file.name || '')
}

// "01-sourdough.m4a" -> { n: 1, title: "Sourdough" }; "notes.mp3" -> { n: null, title: "Notes" }
export function parseName(name) {
  const stem = String(name || '').replace(/\.[^.]+$/, '')
  const m = stem.match(/^(\d+)[\s._-]+(.+)$/)
  if (m) return { n: parseInt(m[1], 10), title: humanize(m[2]) }
  return { n: null, title: humanize(stem) }
}

function humanize(s) {
  const t = s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return t ? t[0].toUpperCase() + t.slice(1) : ''
}

export function titleFor(name) {
  const { n, title } = parseName(name)
  return n == null ? title : `${n} · ${title}`
}

// Numbered files first, in number order; the rest by name.
export function sortTracks(tracks) {
  return [...tracks].sort((a, b) => {
    const pa = parseName(a.name)
    const pb = parseName(b.name)
    if (pa.n != null && pb.n != null && pa.n !== pb.n) return pa.n - pb.n
    if (pa.n != null && pb.n == null) return -1
    if (pa.n == null && pb.n != null) return 1
    return String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
  })
}

export function nextTrack(tracks, id, { repeat = false } = {}) {
  if (!tracks.length) return null
  const i = tracks.findIndex((t) => t.id === id)
  if (i === -1) return tracks[0]
  if (i + 1 < tracks.length) return tracks[i + 1]
  return repeat ? tracks[0] : null
}

export function prevTrack(tracks, id) {
  if (!tracks.length) return null
  const i = tracks.findIndex((t) => t.id === id)
  return tracks[i <= 0 ? 0 : i - 1]
}

export function nextSpeed(current) {
  const i = SPEEDS.indexOf(current)
  return SPEEDS[(i + 1) % SPEEDS.length]
}

export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`
}

export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

// ---- resume positions: { [trackId]: seconds } in localStorage ----
const memory = new Map()
const memStore = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
}
function defaultStore() {
  return typeof localStorage !== 'undefined' ? localStorage : memStore
}

export function loadPositions(store = defaultStore()) {
  try {
    const raw = store.getItem(POS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch (e) {
    /* corrupt or blocked storage -> start empty */
  }
  return {}
}

export function savePosition(id, sec, store = defaultStore()) {
  const p = loadPositions(store)
  if (!Number.isFinite(sec) || sec < RESUME_MIN) delete p[id]
  else p[id] = Math.floor(sec)
  try {
    store.setItem(POS_KEY, JSON.stringify(p))
  } catch (e) {
    /* a lost position is not worth an error */
  }
  return p
}

export function clearPosition(id, store = defaultStore()) {
  return savePosition(id, 0, store)
}

// ---- IndexedDB: the recordings themselves ----
// Two stores: `meta` (small rows the list renders from) and `blob` (the files,
// keyed by the same id), so listing never loads every recording into memory.
const DB_NAME = 'bready-listen'
const DB_VERSION = 1

export function hasIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

// Safari clears script-writable storage for a site not visited in 7 days, which
// would take the recordings with it. A Home Screen install is exempt; for a
// browser tab this asks for the same exemption. Best effort: browsers may say no
// or not implement it, and the answer is what the UI tells the user.
export async function keepStored() {
  try {
    const sm = typeof navigator !== 'undefined' && navigator.storage
    if (!sm || !sm.persist) return true
    if (sm.persisted && (await sm.persisted())) return true
    return await sm.persist()
  } catch (e) {
    return true
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('blob')) db.createObjectStore('blob')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function listTracks() {
  const db = await openDb()
  try {
    const tx = db.transaction('meta', 'readonly')
    return await request(tx.objectStore('meta').getAll())
  } finally {
    db.close()
  }
}

// Returns the metadata rows that were stored (non-audio files are skipped).
export async function addTracks(files) {
  const picked = Array.from(files || []).filter(isAudioFile)
  if (!picked.length) return []
  const db = await openDb()
  try {
    const tx = db.transaction(['meta', 'blob'], 'readwrite')
    const rows = picked.map((file) => ({
      id: uid(),
      name: file.name,
      type: file.type || '',
      size: file.size || 0,
      addedAt: Date.now(),
    }))
    rows.forEach((row, i) => {
      tx.objectStore('meta').put(row)
      tx.objectStore('blob').put(picked[i], row.id)
    })
    await done(tx)
    return rows
  } finally {
    db.close()
  }
}

export async function getBlob(id) {
  const db = await openDb()
  try {
    const tx = db.transaction('blob', 'readonly')
    return await request(tx.objectStore('blob').get(id))
  } finally {
    db.close()
  }
}

export async function removeTrack(id) {
  const db = await openDb()
  try {
    const tx = db.transaction(['meta', 'blob'], 'readwrite')
    tx.objectStore('meta').delete(id)
    tx.objectStore('blob').delete(id)
    await done(tx)
  } finally {
    db.close()
  }
}
