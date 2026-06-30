// Local-first storage. Everything lives in the browser for now; this is the
// single seam we'll later swap for Supabase without touching the screens.

const KEY = 'bready.v1'

const EMPTY = { bakeries: [], wantToTry: [], country: 'FR' }

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch (e) {
    /* corrupt or unavailable storage -> fall back to empty */
  }
  return { ...EMPTY }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    /* private mode / quota -> silently skip; app still works in-memory */
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
