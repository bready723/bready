// The thin layer between the pure sync engine and Supabase.
//
// The safety rule this file exists to enforce: signing in NEVER destroys local
// data. Sara's bakeries currently live in exactly one browser, so the only
// operations here are "push what we have" and "pull when we have nothing".
import { supabase } from './supabase.js'
import {
  ENTITIES, flush, planMigration, ensureVisitIds, toLocal,
  isMigrated, markMigrated, toRows, diffToOutbox, emptyOutbox, snapshot,
} from './sync.js'
import { uid } from './storage.js'
import {
  PHOTO_BUCKET, planPhotoUploads, applyUploads, unresolvedPhotos, applyResolved,
} from './photos.js'

// bakeries / visits / want_to_try are keyed on (user_id, id); prefs on user_id
// alone. PostgREST needs telling, or an upsert turns into a duplicate insert.
const CONFLICT = {
  bakeries: 'user_id,id',
  visits: 'user_id,id',
  want_to_try: 'user_id,id',
  notes: 'user_id,id',
  prefs: 'user_id',
}

export function makeAdapter(client = supabase) {
  return {
    async upsert(entity, row) {
      const { error } = await client.from(entity).upsert(row, { onConflict: CONFLICT[entity] })
      if (error) throw new Error(`${entity}: ${error.message}`)
    },
    async remove(entity, id, at) {
      const { error } = await client.from(entity).update({ deleted_at: at }).eq('id', id)
      if (error) throw new Error(`${entity}: ${error.message}`)
    },
  }
}

/** Everything this account holds, as raw rows. */
export async function pullAll(client = supabase) {
  const rows = {}
  for (const entity of ENTITIES) {
    const { data, error } = await client.from(entity).select('*')
    if (error) throw new Error(`${entity}: ${error.message}`)
    rows[entity] = data || []
  }
  rows.prefs = rows.prefs[0] || null
  return rows
}

// PostgREST checks a token's "issued at" against its OWN clock with no
// tolerance. Sign-in mints a token and this file uses it microseconds later, so
// a sub-second skew between two Supabase machines is enough to have the token
// rejected as issued in the future. Nothing is wrong with the account, the
// device or its clock — asking again a moment later is the entire fix.
const TRANSIENT = /issued at future|not yet valid|failed to fetch|load failed|networkerror|network request failed|timed? ?out/i

const nap = (ms) => new Promise((r) => setTimeout(r, ms))

export async function withRetry(run, options = {}) {
  const attempts = options.attempts || 3
  const sleep = options.sleep || nap
  const wait = options.wait || ((n) => 600 * 2 ** n)
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await run()
    } catch (e) {
      // A real refusal — wrong password, no permission, a missing table — must
      // surface immediately rather than being tried three times.
      if (i === attempts - 1 || !TRANSIENT.test(e?.message || '')) throw e
      await sleep(wait(i))
    }
  }
}

/** Plain words for the few failures worth explaining rather than quoting. */
export function explainCloudError(message) {
  const text = String(message || '')
  if (/issued at future/i.test(text)) {
    return 'the server’s clock was briefly out of step. Nothing was lost — try again in a moment.'
  }
  return text
}

const isEmpty = (state) =>
  (state.bakeries || []).length === 0 &&
  (state.wantToTry || []).length === 0 &&
  (state.notes || []).length === 0

/**
 * Run once whenever someone signs in.
 *
 * - This browser holds data the account has never seen -> push it up.
 * - This browser holds nothing and the account does -> bring it down.
 * - Both empty, or already reconciled -> nothing to do.
 *
 * Returns { action, state, error }. `state` is null when local should not
 * change, so a failure can never blank the screen.
 */
export async function reconcileOnSignIn(state, user, options = {}) {
  // `'client' in options` rather than `||`: passing null must mean "no cloud",
  // not "fall back to the real one" — otherwise the guard is untestable and a
  // local-only build would still try to talk to Supabase.
  const client = 'client' in options ? options.client : supabase
  const store = options.store || (typeof localStorage !== 'undefined' ? localStorage : null)
  const now = options.now || new Date().toISOString()
  const makeId = options.makeId || uid
  if (!client || !user) return { action: 'skipped', state: null, error: null }

  const alreadyPushed = store ? isMigrated(store, user.id) : false

  if (!isEmpty(state) && !alreadyPushed) {
    // Visits have never carried ids. Mint them BEFORE uploading and keep them
    // locally, so running this again matches rows instead of duplicating them.
    const withIds = ensureVisitIds(state, makeId)
    const result = await flush(planMigration(withIds, user.id, now), makeAdapter(client))
    if (result.error) return { action: 'upload-failed', state: withIds, error: result.error }
    if (store) markMigrated(store, user.id)
    return { action: 'uploaded', state: withIds, error: null, count: result.sent.length }
  }

  if (isEmpty(state)) {
    try {
      const rows = await withRetry(() => pullAll(client), { sleep: options.sleep })
      const downloaded = toLocal(rows)
      if (isEmpty(downloaded)) return { action: 'nothing-to-do', state: null, error: null }
      if (store) markMigrated(store, user.id)
      return {
        action: 'downloaded',
        state: { ...state, ...downloaded },
        error: null,
        count: downloaded.bakeries.length,
      }
    } catch (e) {
      return { action: 'download-failed', state: null, error: e?.message || String(e) }
    }
  }

  return { action: 'nothing-to-do', state: null, error: null }
}


// ------------------------------------------------------- continuous push --
//
// reconcileOnSignIn runs once, at sign-in. That left a real gap: a bakery added
// afterwards stayed in one browser until the next sign-in, which is exactly the
// "my photos are not there" problem the cloud was meant to end. pushChanges is
// meant to be called after every edit — so its first duty is to be cheap when
// nothing changed, and its second is to never lose a change it could not send.

export const OUTBOX_KEY = 'bready.outbox.v1'
export const SYNCED_KEY = 'bready.synced.v1'

function readJSON(store, key, userId) {
  if (!store) return null
  try {
    const parsed = JSON.parse(store.getItem(key) || 'null')
    // Tied to the account: another user's leftovers must not look like ours.
    return parsed && parsed.userId === userId ? parsed : null
  } catch (e) {
    return null
  }
}

function writeJSON(store, key, value) {
  if (!store) return
  try {
    store.setItem(key, JSON.stringify(value))
  } catch (e) {
    // Out of storage. The push still happened; we just lose the shortcut and
    // will re-send next time, which the server absorbs as an idempotent upsert.
  }
}

/**
 * Push whatever changed since the last successful push.
 *
 * Returns { ok, sent, pending, error }. `pending` is what is still owed —
 * non-zero means the connection dropped and the app should try again, not that
 * anything was lost.
 */
export async function pushChanges(state, user, options = {}) {
  const client = 'client' in options ? options.client : supabase
  const store = 'store' in options ? options.store : (typeof localStorage !== 'undefined' ? localStorage : null)
  const now = options.now || new Date().toISOString()
  if (!client || !user) return { ok: false, sent: 0, pending: 0, reason: 'not-signed-in' }

  // Visits are written by the UI without ids; mint them the same deterministic
  // way the sign-in upload does, so the two paths address the same rows.
  const withIds = ensureVisitIds(state)
  const rows = toRows(withIds, user.id, now)

  const savedPoint = readJSON(store, SYNCED_KEY, user.id)
  const savedOutbox = readJSON(store, OUTBOX_KEY, user.id)
  const { outbox, snapshot: next } = diffToOutbox(
    savedPoint?.snapshot || null,
    rows,
    now,
    savedOutbox?.outbox || emptyOutbox(),
  )

  if (!outbox.length) return { ok: true, sent: 0, pending: 0 }

  const result = await flush(outbox, options.adapter || makeAdapter(client))
  writeJSON(store, OUTBOX_KEY, { userId: user.id, outbox: result.outbox })
  // The snapshot is only trustworthy once everything in it actually landed.
  if (!result.error) writeJSON(store, SYNCED_KEY, { userId: user.id, snapshot: next })

  return {
    ok: !result.error,
    sent: result.sent.length,
    pending: result.outbox.length,
    error: result.error || undefined,
  }
}

/**
 * Record that local and server agree right now, without sending anything.
 *
 * Called straight after a sign-in reconcile: at that moment the two sides match
 * by definition, and without this the very next push would diff against nothing
 * and re-upload the whole account — including every photo — for no reason.
 */
export function markSynced(state, user, options = {}) {
  const store = 'store' in options ? options.store : (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!user) return
  const now = options.now || new Date().toISOString()
  const rows = toRows(ensureVisitIds(state), user.id, now)
  writeJSON(store, SYNCED_KEY, { userId: user.id, snapshot: snapshot(rows) })
  writeJSON(store, OUTBOX_KEY, { userId: user.id, outbox: emptyOutbox() })
}

// ------------------------------------------------------------- photos --
//
// A photo used to travel as a data: URL inside the bakery row — the whole JPEG
// in a database column, re-sent on every change. These two move it to the
// `photos` bucket and fetch it back, leaving the row holding a path.

export async function syncPhotos(state, user, options = {}) {
  const client = 'client' in options ? options.client : supabase
  if (!client || !user) return { state, uploaded: 0, error: null }
  const jobs = planPhotoUploads(state, user.id)
  if (!jobs.length) return { state, uploaded: 0, error: null }

  const done = []
  for (const job of jobs) {
    try {
      const body = new Blob([job.bytes], { type: job.contentType })
      const { error } = await client.storage
        .from(PHOTO_BUCKET)
        .upload(job.path, body, { contentType: job.contentType, upsert: true })
      if (error) throw new Error(error.message)
      done.push({ bakeryId: job.bakeryId, path: job.path })
    } catch (e) {
      // Stop at the first failure and keep what did land: the photos already
      // moved must not be uploaded a second time when this runs again.
      return { state: applyUploads(state, done), uploaded: done.length, error: e?.message || String(e) }
    }
  }
  return { state: applyUploads(state, done), uploaded: done.length, error: null }
}

/** Fetch a viewable link for every photo that lives in the bucket. */
export async function resolvePhotos(state, options = {}) {
  const client = 'client' in options ? options.client : supabase
  const wanted = unresolvedPhotos(state)
  if (!client || !wanted.length) return { state, resolved: 0 }
  const ttl = options.ttlSeconds || 60 * 60
  const found = []
  for (const item of wanted) {
    try {
      const { data, error } = await client.storage.from(PHOTO_BUCKET).createSignedUrl(item.path, ttl)
      found.push({ bakeryId: item.bakeryId, url: error ? null : data?.signedUrl || null })
    } catch (e) {
      found.push({ bakeryId: item.bakeryId, url: null })
    }
  }
  return { state: applyResolved(state, found), resolved: found.filter((f) => f.url).length }
}
