// The Supabase client, or null when the app has not been configured.
//
// bready has to keep working without a backend: it shipped as a local-only PWA
// and signed-out use stays supported, so nothing here may throw at import time.
// Callers ask `isCloudConfigured()` first and fall back to local storage.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/** True when both the project URL and the anon key are present. */
export function isCloudConfigured() {
  return Boolean(url && anonKey)
}

// A single shared client. `persistSession` keeps Sara signed in across launches;
// `detectSessionInUrl` is what completes the magic-link round trip.
export const supabase = isCloudConfigured()
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

/** Round-trips the project to prove the URL and key actually work. */
export async function pingCloud() {
  if (!supabase) return { ok: false, reason: 'not-configured' }
  try {
    const { error } = await supabase.auth.getSession()
    if (error) return { ok: false, reason: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e?.message || 'unreachable' }
  }
}
