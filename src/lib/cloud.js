// The thin layer between the pure sync engine and Supabase.
//
// The safety rule this file exists to enforce: signing in NEVER destroys local
// data. Sara's bakeries currently live in exactly one browser, so the only
// operations here are "push what we have" and "pull when we have nothing".
import { supabase } from './supabase.js'
import {
  ENTITIES, flush, planMigration, ensureVisitIds, toLocal,
  isMigrated, markMigrated,
} from './sync.js'
import { uid } from './storage.js'

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
      const rows = await pullAll(client)
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
