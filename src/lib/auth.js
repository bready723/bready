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
 * A one-time code that moves this browser's session to another one.
 *
 * On iOS the sign-in link simply cannot reach the home-screen app. Tapping it
 * opens Safari. Copying it is worse: to draw its preview, Mail *loads* the
 * link, and a Supabase magic link is single use — so the token is spent by the
 * act of looking at it, which is the "already used" dead end. The fix is to
 * stop routing the credential through email at all. Safari is already signed
 * in; it hands its session over directly, and the clipboard is the courier.
 */
export const HANDOFF_PREFIX = 'bready-signin:v1:'

/** The code for a session, or null if there is nothing to hand over. */
export function makeHandoffCode(session) {
  const token = session?.refresh_token
  return token ? `${HANDOFF_PREFIX}${token}` : null
}

/**
 * Work out what got pasted: a handoff code, a sign-in link, or neither.
 * Both arrive through the same box, because Sara should not have to know
 * which kind of string she is holding.
 */
export function parsePasted(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  if (raw.startsWith(HANDOFF_PREFIX)) {
    // Mail and Notes both wrap long strings; the token itself has no spaces.
    const refreshToken = raw.slice(HANDOFF_PREFIX.length).replace(/\s+/g, '')
    return refreshToken ? { kind: 'handoff', refreshToken } : null
  }
  const token = tokenFromLink(raw)
  return token ? { kind: 'link', token } : null
}

/** Read the live session and turn it into a code to copy. */
export async function getHandoffCode(options = {}) {
  const client = 'client' in options ? options.client : supabase
  if (!client) return { ok: false, error: 'Cloud sync is not set up in this build.' }
  try {
    const { data } = await client.auth.getSession()
    const code = makeHandoffCode(data?.session)
    return code
      ? { ok: true, code }
      : { ok: false, error: 'Sign in here first, then copy the code.' }
  } catch (e) {
    return { ok: false, error: e?.message || 'Could not read this session.' }
  }
}

// Safari says only "Load failed" when a request dies, which told Sara nothing.
const NETWORK = /load failed|failed to fetch|networkerror|network request failed|timed? ?out/i

/**
 * Run one auth call, with a single silent retry if the connection drops. A
 * phone waking a home-screen app up regularly loses the first request.
 */
async function attempt(run) {
  for (let i = 0; i < 2; i += 1) {
    try {
      const { error } = await run()
      return { error: error || null }
    } catch (e) {
      if (i === 0 && NETWORK.test(e?.message || '')) continue
      return { thrown: e }
    }
  }
}

// Supabase's own wording, observed against the live endpoint rather than
// guessed: a dead refresh token comes back as "Refresh token is not valid",
// which matches none of the words you would expect.
const SPENT = /expired|invalid|not valid|not found|already used|revoked/i

function explain(message, kind) {
  if (SPENT.test(message)) {
    return kind === 'handoff'
      ? 'That code was already used. Tap Copy sign-in code in Safari again for a fresh one.'
      : 'That link has already been used or has expired. Send yourself a new one.'
  }
  return message
}

/**
 * Sign in from whatever was pasted — a handoff code or a sign-in link.
 * Never touches the send path, so it cannot burn the email rate limit.
 */
export async function signInWithPasted(text, options = {}) {
  const parsed = parsePasted(text)
  if (!parsed) {
    return { ok: false, error: "That is not a sign-in code or link. Copy the whole thing and try again." }
  }
  const client = 'client' in options ? options.client : supabase
  if (!client) return { ok: false, error: 'Cloud sync is not set up in this build.' }

  const result = parsed.kind === 'handoff'
    ? await attempt(() => client.auth.refreshSession({ refresh_token: parsed.refreshToken }))
    : await attempt(() => client.auth.verifyOtp({ token_hash: parsed.token, type: 'email' }))

  if (result.thrown) {
    const message = result.thrown?.message || ''
    return {
      ok: false,
      error: NETWORK.test(message)
        ? 'Could not reach the server. Check your connection and try again.'
        : message || 'Sign in failed.',
    }
  }
  if (!result.error) return { ok: true }
  return { ok: false, error: explain(result.error.message, parsed.kind) }
}

/** Kept for callers that only ever hold a link. */
export async function signInWithLink(link) {
  return signInWithPasted(link)
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
