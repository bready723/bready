// Local-first storage. Everything lives in the browser for now; this is the
// single seam we'll later swap for Supabase without touching the screens.

const KEY = 'bready.v1'

const EMPTY = { bakeries: [], wantToTry: [], notes: [], country: 'FR', fxCurrency: 'USD' }

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch (e) {
    /* corrupt or unavailable storage -> fall back to empty */
  }
  return { ...EMPTY }
}

// Roughly what browsers give a single origin. Used only to warn early — the
// real limit varies, so this is a gauge, not a contract.
const BUDGET_BYTES = 5 * 1024 * 1024
const WARN_AT = 0.8

export const SAVE_OK = 'ok'
export const SAVE_FULL = 'full'
export const SAVE_BLOCKED = 'blocked'

// Safari, old WebKit and Firefox each name the out-of-space error differently.
export function isQuotaError(e) {
  if (!e) return false
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'QUOTA_EXCEEDED_ERR' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  )
}

// Returns SAVE_OK, or why the write failed. This used to swallow the error
// silently, which meant a full store looked exactly like a successful save:
// photos are ~100-200KB each as data URLs, so the 5MB budget runs out after a
// few dozen, and from then on every visit Sara logged was lost on reload with
// nothing on screen to say so. The caller is now expected to surface this.
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return SAVE_OK
  } catch (e) {
    return isQuotaError(e) ? SAVE_FULL : SAVE_BLOCKED
  }
}

/** How full the store is: { bytes, ratio, nearlyFull }. */
export function storageUsage(state) {
  let bytes = 0
  try {
    bytes = JSON.stringify(state).length
  } catch (e) {
    /* unserialisable state -> report nothing rather than crash the app */
  }
  const ratio = bytes / BUDGET_BYTES
  return { bytes, ratio, nearlyFull: ratio >= WARN_AT }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function todayISO() {
  // LOCAL calendar date (YYYY-MM-DD), not UTC. toISOString() is UTC, which in
  // negative-UTC zones (e.g. US Eastern in the evening) rolls the date forward a
  // day — so a visit logged tonight would be stamped tomorrow. Shift by the
  // timezone offset so the date matches the user's own clock.
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
