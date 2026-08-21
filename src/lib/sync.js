// Offline-first sync between the app's local state and the cloud.
//
// Everything here is pure. The network lives behind an `adapter` the caller
// supplies, so the awkward parts — a write made on a plane, the same bakery
// edited on two devices, a delete that must not come back — are testable
// without a server.
//
// Three ideas carry the whole thing:
//   outbox      every local change is appended as an intent, and replayed later
//   updated_at  when two versions disagree, the later one wins
//   deleted_at  deletes are rows too, so a device that missed one still learns

export const ENTITIES = ['bakeries', 'visits', 'want_to_try', 'notes', 'prefs']

// ---------------------------------------------------------------- outbox --

export function emptyOutbox() {
  return []
}

/**
 * Append an intent. Repeated edits to the same row collapse to the latest one:
 * Sara renaming a bakery five times should send one row, not five. A delete
 * supersedes any pending upsert for that row.
 */
export function enqueue(outbox, change) {
  const { entity, id, op } = change
  if (!ENTITIES.includes(entity)) throw new Error(`unknown entity: ${entity}`)
  if (op !== 'upsert' && op !== 'delete') throw new Error(`unknown op: ${op}`)
  const kept = outbox.filter((c) => !(c.entity === entity && c.id === id))
  return [...kept, change]
}

/** Intents still waiting to be sent, oldest first. */
export function pending(outbox) {
  return outbox.slice()
}

/**
 * Send the outbox through `adapter`, oldest first, stopping at the first
 * failure so ordering is never broken. Returns what got through and what is
 * still owed. Safe to call again: the server upserts by primary key, so a
 * change that already landed simply lands again with the same result.
 */
export async function flush(outbox, adapter) {
  const remaining = outbox.slice()
  const sent = []
  while (remaining.length) {
    const change = remaining[0]
    try {
      if (change.op === 'upsert') await adapter.upsert(change.entity, change.row)
      else await adapter.remove(change.entity, change.id, change.at)
    } catch (e) {
      return { sent, outbox: remaining, error: e?.message || String(e) }
    }
    remaining.shift()
    sent.push(change)
  }
  return { sent, outbox: remaining, error: null }
}

// ----------------------------------------------------------------- merge --

const stamp = (row) => (row && row.updated_at) || ''

/**
 * Reconcile one row. Later `updated_at` wins; a tie keeps the local copy so a
 * pull can never silently undo an edit the user is looking at.
 */
export function mergeRow(local, remote) {
  if (!local) return remote
  if (!remote) return local
  return stamp(remote) > stamp(local) ? remote : local
}

/**
 * Reconcile a whole collection, keyed by id. Rows carrying `deleted_at` are
 * dropped from the result but still win the merge, which is what stops a device
 * that never heard about a delete from resurrecting the row on its next push.
 */
export function mergeCollections(localRows = [], remoteRows = []) {
  const byId = new Map()
  for (const row of localRows) byId.set(row.id, row)
  for (const row of remoteRows) byId.set(row.id, mergeRow(byId.get(row.id), row))
  return [...byId.values()].filter((r) => !r.deleted_at)
}

// --------------------------------------------------------------- mapping --

/**
 * Visits live inside their bakery and have never needed ids. The server needs
 * one per row, so mint them once and hand back a state that carries them —
 * stable ids are what make re-running a migration a no-op instead of a
 * duplicate.
 */
export function ensureVisitIds(state, makeId) {
  let changed = false
  const bakeries = (state.bakeries || []).map((b) => {
    const visits = (b.visits || []).map((v) => {
      if (v.id) return v
      changed = true
      return { ...v, id: makeId() }
    })
    return changed ? { ...b, visits } : b
  })
  return changed ? { ...state, bakeries } : state
}

/** Local app state -> the rows the database expects. */
export function toRows(state, userId, updatedAt) {
  const bakeries = (state.bakeries || []).map((b, index) => ({
    id: b.id,
    user_id: userId,
    name: b.name,
    area: b.area ?? null,
    city: b.city ?? null,
    tier: b.tier ?? null,
    score: b.score ?? null,
    rank_index: index, // position in the full ranked list — the list order IS the ranking
    breads: b.breads || [],
    other_label: b.otherLabel ?? null,
    photo_url: b.photo ?? null,
    lat: b.lat ?? null,
    lng: b.lng ?? null,
    seeded: Boolean(b.seeded),
    last_visit: b.lastVisit ?? null,
    created_at: b.createdAt ?? null,
    updated_at: updatedAt,
    deleted_at: null,
  }))

  const visits = (state.bakeries || []).flatMap((b) =>
    (b.visits || []).map((v) => ({
      id: v.id,
      user_id: userId,
      bakery_id: b.id,
      visit_date: v.date,
      breads: v.breads || [],
      other_label: v.otherLabel ?? null,
      freshness_time: v.freshnessTime ?? null,
      notes: v.notes ?? null,
      updated_at: updatedAt,
      deleted_at: null,
    })),
  )

  const want_to_try = (state.wantToTry || []).map((w) => ({
    id: w.id,
    user_id: userId,
    name: w.name,
    area: w.area ?? null,
    city: w.city ?? null,
    photo_url: w.photo ?? null,
    lat: w.lat ?? null,
    lng: w.lng ?? null,
    updated_at: updatedAt,
    deleted_at: null,
  }))

  const notes = (state.notes || []).map((n) => ({
    id: n.id,
    user_id: userId,
    text: n.text,
    ts: n.ts ?? null,
    updated_at: updatedAt,
    deleted_at: null,
  }))

  const prefs = {
    user_id: userId,
    country: state.country || 'FR',
    fx_currency: state.fxCurrency || 'USD',
    updated_at: updatedAt,
  }

  return { bakeries, visits, want_to_try, notes, prefs }
}

/** Database rows -> the shape the screens already render. */
export function toLocal(rows) {
  const visitsByBakery = new Map()
  for (const v of rows.visits || []) {
    if (v.deleted_at) continue
    const list = visitsByBakery.get(v.bakery_id) || []
    list.push({
      id: v.id,
      date: v.visit_date,
      breads: v.breads || [],
      otherLabel: v.other_label ?? undefined,
      freshnessTime: v.freshness_time ?? null,
      notes: v.notes ?? null,
    })
    visitsByBakery.set(v.bakery_id, list)
  }

  const bakeries = (rows.bakeries || [])
    .filter((b) => !b.deleted_at)
    .slice()
    .sort((a, c) => (a.rank_index ?? 0) - (c.rank_index ?? 0))
    .map((b) => ({
      id: b.id,
      name: b.name,
      area: b.area ?? undefined,
      city: b.city ?? undefined,
      tier: b.tier ?? undefined,
      score: b.score ?? undefined,
      breads: b.breads || [],
      otherLabel: b.other_label ?? undefined,
      photo: b.photo_url ?? undefined,
      lat: b.lat ?? undefined,
      lng: b.lng ?? undefined,
      seeded: Boolean(b.seeded),
      lastVisit: b.last_visit ?? undefined,
      createdAt: b.created_at ?? undefined,
      visits: visitsByBakery.get(b.id) || [],
    }))

  return {
    bakeries,
    wantToTry: (rows.want_to_try || [])
      .filter((w) => !w.deleted_at)
      .map((w) => ({
        id: w.id,
        name: w.name,
        area: w.area ?? undefined,
        city: w.city ?? undefined,
        photo: w.photo_url ?? undefined,
        lat: w.lat ?? undefined,
        lng: w.lng ?? undefined,
      })),
    notes: (rows.notes || [])
      .filter((n) => !n.deleted_at)
      .map((n) => ({ id: n.id, text: n.text, ts: n.ts ?? undefined })),
    country: rows.prefs?.country || 'FR',
    fxCurrency: rows.prefs?.fx_currency || 'USD',
  }
}

// ------------------------------------------------------------- migration --

export const MIGRATED_KEY = 'bready.migrated.v1'

/**
 * Turn whatever this browser is holding into an outbox aimed at `userId`.
 * Nothing is deleted locally: the local copy stays until the server has
 * confirmed, because this runs against Sara's only copy of her data.
 */
export function planMigration(state, userId, updatedAt) {
  const rows = toRows(state, userId, updatedAt)
  let outbox = emptyOutbox()
  for (const entity of ['bakeries', 'visits', 'want_to_try', 'notes']) {
    for (const row of rows[entity]) {
      outbox = enqueue(outbox, { entity, id: row.id, op: 'upsert', row, at: updatedAt })
    }
  }
  outbox = enqueue(outbox, {
    entity: 'prefs',
    id: userId,
    op: 'upsert',
    row: rows.prefs,
    at: updatedAt,
  })
  return outbox
}

/** Has this browser already pushed its pre-account data for this user? */
export function isMigrated(store, userId) {
  try {
    return store.getItem(MIGRATED_KEY) === userId
  } catch (e) {
    return false
  }
}

export function markMigrated(store, userId) {
  try {
    store.setItem(MIGRATED_KEY, userId)
    return true
  } catch (e) {
    return false
  }
}
