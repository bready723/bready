// Auth, wrapped so the rest of the app never has to care whether the cloud is
// configured. Every function is safe to call in a local-only build.
import { supabase, isCloudConfigured } from './supabase.js'

export { isCloudConfigured }

/**
 * Where the magic link should land: the app's own address, clean. Using
 * `location.href` would carry whatever query string happened to be on screen,
 * which then has to match Supabase's redirect allow-list exactly — a cache
 * buster in the URL was enough to fall back to the project's default.
 */
export function appUrl() {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base}`
}

/**
 * Send a sign-in link. Returns { ok } or { ok: false, error } — the caller
 * shows the message, so no throwing into a click handler.
 */
export async function sendSignInLink(email, redirectTo) {
  const address = String(email || '').trim()
  if (!address) return { ok: false, error: 'Enter your email address.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return { ok: false, error: "That doesn't look like an email address." }
  if (!supabase) return { ok: false, error: 'Cloud sync is not set up in this build.' }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectTo || appUrl() },
    })
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not reach the server.' }
  }
}

/**
 * Pull the one-time token out of a Supabase sign-in link.
 *
 * iOS always opens a link from Mail in Safari, never in a home-screen web app,
 * so tapping the link signs in the wrong "browser" and the installed app stays
 * empty. Copying the link and pasting it here signs in where Sara actually is.
 * Returns null if this is not a sign-in link.
 */
export function tokenFromLink(link) {
  const text = String(link || '').trim()
  if (!text) return null
  try {
    const url = new URL(text)
    // Supabase puts it in the query as ?token=; some clients rewrite the link
    // and leave it in the fragment instead.
    const fromQuery = url.searchParams.get('token') || url.searchParams.get('token_hash')
    if (fromQuery) return fromQuery
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
    return hash.get('token') || hash.get('token_hash') || null
  } catch (e) {
    return null
  }
}

/**
 * Sign in from a pasted sign-in link. The link is single use — if it was
 * already opened somewhere else, Supabase rejects it and we say so.
 */
export async function signInWithLink(link) {
  const token_hash = tokenFromLink(link)
  if (!token_hash) {
    return { ok: false, error: "That doesn't look like a sign-in link. Copy the whole link from the email." }
  }
  if (!supabase) return { ok: false, error: 'Cloud sync is not set up in this build.' }
  try {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' })
    if (!error) return { ok: true }
    return {
      ok: false,
      error: /expired|invalid|not found/i.test(error.message)
        ? 'That link has already been used or has expired. Send yourself a new one.'
        : error.message,
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not reach the server.' }
  }
}

export async function signOut() {
  if (!supabase) return { ok: true }
  try {
    const { error } = await supabase.auth.signOut()
    return error ? { ok: false, error: error.message } : { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'Sign out failed.' }
  }
}

/** The signed-in user, or null. */
export async function currentUser() {
  if (!supabase) return null
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user || null
  } catch (e) {
    return null
  }
}

/**
 * Subscribe to sign-in / sign-out. Fires once with the current user so callers
 * do not need a separate initial fetch. Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  if (!supabase) {
    callback(null)
    return () => {}
  }
  currentUser().then(callback)
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return () => data?.subscription?.unsubscribe?.()
}
