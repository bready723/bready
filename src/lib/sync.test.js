import { describe, it, expect } from 'vitest'
import {
  emptyOutbox, enqueue, pending, flush,
  mergeRow, mergeCollections,
  ensureVisitIds, toRows, toLocal,
  planMigration, isMigrated, markMigrated, MIGRATED_KEY,
} from './sync.js'

// A stand-in for Supabase: keyed by primary key, so an upsert that arrives
// twice lands once — the same property the real table has. It can be taken
// "offline" to reproduce the case this whole module exists for.
function fakeServer() {
  const tables = { bakeries: new Map(), visits: new Map(), want_to_try: new Map(), notes: new Map(), prefs: new Map() }
  let online = true
  let calls = 0
  return {
    tables,
    get calls() { return calls },
    goOffline() { online = false },
    goOnline() { online = true },
    rows(entity) { return [...tables[entity].values()] },
    adapter: {
      async upsert(entity, row) {
        calls++
        if (!online) throw new Error('offline')
        tables[entity].set(row.id ?? row.user_id, { ...row })
      },
      async remove(entity, id, at) {
        calls++
        if (!online) throw new Error('offline')
        const existing = tables[entity].get(id)
        tables[entity].set(id, { ...(existing || { id }), deleted_at: at })
      },
    },
  }
}

const AT = '2026-08-21T00:00:00.000Z'
const LATER = '2026-08-21T01:00:00.000Z'
const USER = 'user-1'

const localState = () => ({
  bakeries: [
    {
      id: 'b1', name: 'Levain Bakery', area: 'Upper West Side', city: 'New York',
      tier: 'loved', score: 9.5, breads: ['croissant'], lastVisit: '2026-08-01',
      createdAt: '2026-08-01', lat: 40.78, lng: -73.97, seeded: true,
      photo: 'data:image/jpeg;base64,AAAA',
      visits: [{ id: 'v1', date: '2026-08-01', breads: ['croissant'], freshnessTime: 'morning', notes: 'warm' }],
    },
    {
      id: 'b2', name: 'Balthazar', area: 'SoHo', tier: 'fine', score: 6.4,
      breads: ['baguette'], visits: [{ id: 'v2', date: '2026-08-10', breads: ['baguette'] }],
    },
  ],
  wantToTry: [{ id: 'w1', name: 'Maman', area: 'Tribeca', photo: 'data:image/jpeg;base64,BBBB' }],
  notes: [{ id: 'n1', text: 'try the kouign-amann', ts: 1755000000000 }],
  country: 'FR',
  fxCurrency: 'USD',
})

describe('outbox', () => {
  it('keeps intents in the order they were made', () => {
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1' }, at: AT })
    o = enqueue(o, { entity: 'notes', id: 'n1', op: 'upsert', row: { id: 'n1' }, at: AT })
    expect(pending(o).map((c) => c.id)).toEqual(['b1', 'n1'])
  })

  it('collapses repeated edits of one row to the latest', () => {
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'first' }, at: AT })
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'second' }, at: LATER })
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'third' }, at: LATER })
    expect(o).toHaveLength(1)
    expect(o[0].row.name).toBe('third')
  })

  it('lets a delete supersede a pending upsert of the same row', () => {
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1' }, at: AT })
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'delete', at: LATER })
    expect(o).toHaveLength(1)
    expect(o[0].op).toBe('delete')
  })

  it('does not collapse different rows together', () => {
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1' }, at: AT })
    o = enqueue(o, { entity: 'bakeries', id: 'b2', op: 'upsert', row: { id: 'b2' }, at: AT })
    expect(o).toHaveLength(2)
  })

  it('rejects nonsense rather than shipping it to the server', () => {
    expect(() => enqueue(emptyOutbox(), { entity: 'nope', id: 'x', op: 'upsert' })).toThrow(/unknown entity/)
    expect(() => enqueue(emptyOutbox(), { entity: 'notes', id: 'x', op: 'shrug' })).toThrow(/unknown op/)
  })
})

describe('flush', () => {
  it('sends everything and empties the outbox', async () => {
    const srv = fakeServer()
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'Levain' }, at: AT })
    o = enqueue(o, { entity: 'notes', id: 'n1', op: 'upsert', row: { id: 'n1', text: 'hi' }, at: AT })
    const r = await flush(o, srv.adapter)
    expect(r.error).toBeNull()
    expect(r.outbox).toEqual([])
    expect(srv.rows('bakeries')).toHaveLength(1)
    expect(srv.rows('notes')).toHaveLength(1)
  })

  it('keeps what it could not send, in order, and stops at the failure', async () => {
    const srv = fakeServer()
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1' }, at: AT })
    o = enqueue(o, { entity: 'bakeries', id: 'b2', op: 'upsert', row: { id: 'b2' }, at: AT })
    srv.goOffline()
    const r = await flush(o, srv.adapter)
    expect(r.error).toBe('offline')
    expect(r.sent).toEqual([])
    expect(r.outbox.map((c) => c.id)).toEqual(['b1', 'b2'])
  })

  it('picks up where it left off when the connection returns', async () => {
    const srv = fakeServer()
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'logged on a plane' }, at: AT })
    srv.goOffline()
    const first = await flush(o, srv.adapter)
    expect(first.outbox).toHaveLength(1)
    srv.goOnline()
    const second = await flush(first.outbox, srv.adapter)
    expect(second.error).toBeNull()
    expect(second.outbox).toEqual([])
    expect(srv.rows('bakeries')[0].name).toBe('logged on a plane')
  })

  it('is idempotent: replaying a flush does not duplicate rows', async () => {
    const srv = fakeServer()
    let o = emptyOutbox()
    o = enqueue(o, { entity: 'bakeries', id: 'b1', op: 'upsert', row: { id: 'b1', name: 'Levain' }, at: AT })
    await flush(o, srv.adapter)
    await flush(o, srv.adapter) // e.g. the response was lost and we retried
    expect(srv.rows('bakeries')).toHaveLength(1)
  })

  it('sends a delete as a tombstone, not a disappearance', async () => {
    const srv = fakeServer()
    let o = enqueue(emptyOutbox(), { entity: 'notes', id: 'n1', op: 'delete', at: LATER })
    await flush(o, srv.adapter)
    expect(srv.rows('notes')[0].deleted_at).toBe(LATER)
  })
})

describe('merge', () => {
  it('takes the newer version', () => {
    const local = { id: 'b1', name: 'old', updated_at: AT }
    const remote = { id: 'b1', name: 'new', updated_at: LATER }
    expect(mergeRow(local, remote).name).toBe('new')
    expect(mergeRow(remote, local).name).toBe('new')
  })

  it('keeps the local copy on a tie, so a pull never undoes what is on screen', () => {
    const local = { id: 'b1', name: 'mine', updated_at: AT }
    const remote = { id: 'b1', name: 'theirs', updated_at: AT }
    expect(mergeRow(local, remote).name).toBe('mine')
  })

  it('accepts a row the other side has never seen', () => {
    expect(mergeRow(null, { id: 'b1' }).id).toBe('b1')
    expect(mergeRow({ id: 'b1' }, null).id).toBe('b1')
  })

  it('unions two collections', () => {
    const local = [{ id: 'a', updated_at: AT }, { id: 'b', updated_at: AT }]
    const remote = [{ id: 'b', updated_at: LATER, name: 'newer' }, { id: 'c', updated_at: AT }]
    const merged = mergeCollections(local, remote)
    expect(merged.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
    expect(merged.find((r) => r.id === 'b').name).toBe('newer')
  })

  it('honours a delete made on another device', () => {
    const local = [{ id: 'a', updated_at: AT }]
    const remote = [{ id: 'a', updated_at: LATER, deleted_at: LATER }]
    expect(mergeCollections(local, remote)).toEqual([])
  })

  it('does not let a stale device resurrect a deleted row', () => {
    const localEdit = [{ id: 'a', updated_at: AT, name: 'still here' }]
    const remoteDelete = [{ id: 'a', updated_at: LATER, deleted_at: LATER }]
    expect(mergeCollections(localEdit, remoteDelete)).toEqual([])
  })

  it('lets a later edit win over an earlier delete', () => {
    const localEdit = [{ id: 'a', updated_at: LATER, name: 'brought back on purpose' }]
    const remoteDelete = [{ id: 'a', updated_at: AT, deleted_at: AT }]
    expect(mergeCollections(localEdit, remoteDelete)).toHaveLength(1)
  })
})

describe('visit ids', () => {
  it('derives an id for visits that never had one', () => {
    const state = { bakeries: [{ id: 'b1', visits: [{ date: '2026-08-01' }, { date: '2026-08-02' }] }] }
    const out = ensureVisitIds(state)
    expect(out.bakeries[0].visits.map((v) => v.id)).toEqual(['b1-v0', 'b1-v1'])
  })

  it('gives the same ids every time, so a second upload cannot duplicate', () => {
    const state = { bakeries: [{ id: 'b1', visits: [{ date: '2026-08-01' }, { date: '2026-08-02' }] }] }
    const first = ensureVisitIds(state)
    const second = ensureVisitIds(state)
    expect(second.bakeries[0].visits.map((v) => v.id)).toEqual(first.bakeries[0].visits.map((v) => v.id))
  })

  it('keeps ids unique across bakeries', () => {
    const state = { bakeries: [
      { id: 'b1', visits: [{ date: '2026-08-01' }] },
      { id: 'b2', visits: [{ date: '2026-08-01' }] },
    ] }
    const ids = ensureVisitIds(state).bakeries.flatMap((b) => b.visits.map((v) => v.id))
    expect(new Set(ids).size).toBe(2)
  })

  it('leaves existing ids alone and returns the same object when nothing changed', () => {
    const state = { bakeries: [{ id: 'b1', visits: [{ id: 'keep', date: '2026-08-01' }] }] }
    const out = ensureVisitIds(state, () => 'new')
    expect(out).toBe(state)
  })
})

describe('mapping local state to rows and back', () => {
  it('records the list order, because the list order is the ranking', () => {
    const rows = toRows(localState(), USER, AT)
    expect(rows.bakeries.map((b) => [b.id, b.rank_index])).toEqual([['b1', 0], ['b2', 1]])
  })

  it('lifts nested visits into their own rows, pointing back at the bakery', () => {
    const rows = toRows(localState(), USER, AT)
    expect(rows.visits).toHaveLength(2)
    expect(rows.visits[0]).toMatchObject({ id: 'v1', bakery_id: 'b1', visit_date: '2026-08-01', freshness_time: 'morning' })
  })

  it('carries photos through, under the name the app actually uses', () => {
    const rows = toRows(localState(), USER, AT)
    expect(rows.bakeries[0].photo_url).toBe('data:image/jpeg;base64,AAAA')
    expect(rows.want_to_try[0].photo_url).toBe('data:image/jpeg;base64,BBBB')
    const back = toLocal(rows)
    expect(back.bakeries[0].photo).toBe('data:image/jpeg;base64,AAAA')
    expect(back.wantToTry[0].photo).toBe('data:image/jpeg;base64,BBBB')
  })

  it('never invents a photo field the screens do not read', () => {
    const back = toLocal(toRows(localState(), USER, AT))
    expect(back.bakeries[0]).not.toHaveProperty('photoUrl')
    expect(back.wantToTry[0]).not.toHaveProperty('photoUrl')
  })

  it('stamps every row with the owner', () => {
    const rows = toRows(localState(), USER, AT)
    const all = [...rows.bakeries, ...rows.visits, ...rows.want_to_try, ...rows.notes, rows.prefs]
    expect(all.every((r) => r.user_id === USER)).toBe(true)
  })

  it('round-trips back into the shape the screens render', () => {
    const before = localState()
    const after = toLocal(toRows(before, USER, AT))
    expect(after.bakeries.map((b) => b.name)).toEqual(['Levain Bakery', 'Balthazar'])
    expect(after.bakeries[0].visits[0]).toMatchObject({ date: '2026-08-01', notes: 'warm' })
    expect(after.wantToTry[0].name).toBe('Maman')
    expect(after.notes[0].text).toBe('try the kouign-amann')
    expect(after.fxCurrency).toBe('USD')
  })

  it('restores the ranking even if the server hands rows back shuffled', () => {
    const rows = toRows(localState(), USER, AT)
    rows.bakeries.reverse()
    expect(toLocal(rows).bakeries.map((b) => b.id)).toEqual(['b1', 'b2'])
  })

  it('hides soft-deleted rows from the app', () => {
    const rows = toRows(localState(), USER, AT)
    rows.bakeries[1].deleted_at = LATER
    rows.notes[0].deleted_at = LATER
    const local = toLocal(rows)
    expect(local.bakeries.map((b) => b.id)).toEqual(['b1'])
    expect(local.notes).toEqual([])
  })

  it('copes with an empty account', () => {
    const local = toLocal({})
    expect(local.bakeries).toEqual([])
    expect(local.country).toBe('FR')
  })
})

describe('migration of pre-account data', () => {
  it('queues every local row plus preferences', () => {
    const o = planMigration(localState(), USER, AT)
    const counts = o.reduce((acc, c) => ({ ...acc, [c.entity]: (acc[c.entity] || 0) + 1 }), {})
    expect(counts).toEqual({ bakeries: 2, visits: 2, want_to_try: 1, notes: 1, prefs: 1 })
  })

  it('lands the data on the server', async () => {
    const srv = fakeServer()
    const r = await flush(planMigration(localState(), USER, AT), srv.adapter)
    expect(r.error).toBeNull()
    expect(srv.rows('bakeries').map((b) => b.name)).toEqual(['Levain Bakery', 'Balthazar'])
    expect(srv.rows('visits')).toHaveLength(2)
    expect(srv.rows('prefs')[0].fx_currency).toBe('USD')
  })

  it('creates nothing new when it runs a second time', async () => {
    const srv = fakeServer()
    await flush(planMigration(localState(), USER, AT), srv.adapter)
    await flush(planMigration(localState(), USER, LATER), srv.adapter)
    expect(srv.rows('bakeries')).toHaveLength(2)
    expect(srv.rows('visits')).toHaveLength(2)
    expect(srv.rows('want_to_try')).toHaveLength(1)
  })

  it('comes back through toLocal unchanged, which is the whole point', async () => {
    const srv = fakeServer()
    const before = localState()
    await flush(planMigration(before, USER, AT), srv.adapter)
    const restored = toLocal({
      bakeries: srv.rows('bakeries'),
      visits: srv.rows('visits'),
      want_to_try: srv.rows('want_to_try'),
      notes: srv.rows('notes'),
      prefs: srv.rows('prefs')[0],
    })
    expect(restored.bakeries.map((b) => b.name)).toEqual(before.bakeries.map((b) => b.name))
    expect(restored.bakeries[0].visits.map((v) => v.date)).toEqual(['2026-08-01'])
    expect(restored.notes[0].text).toBe(before.notes[0].text)
  })

  it('remembers that a browser has already migrated', () => {
    const store = new Map()
    const api = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
    expect(isMigrated(api, USER)).toBe(false)
    markMigrated(api, USER)
    expect(isMigrated(api, USER)).toBe(true)
    expect(isMigrated(api, 'somebody-else')).toBe(false)
    expect(store.get(MIGRATED_KEY)).toBe(USER)
  })

  it('does not crash when storage is unavailable', () => {
    const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(isMigrated(broken, USER)).toBe(false)
    expect(markMigrated(broken, USER)).toBe(false)
  })
})

describe('the journey this module exists for', () => {
  it('log on a plane, land, and find it on the other device exactly once', async () => {
    const srv = fakeServer()

    // Phone, no signal: Sara ranks a bakery.
    srv.goOffline()
    let outbox = enqueue(emptyOutbox(), {
      entity: 'bakeries', id: 'b9', op: 'upsert', at: AT,
      row: { id: 'b9', user_id: USER, name: 'Poilâne', rank_index: 0, updated_at: AT },
    })
    let attempt = await flush(outbox, srv.adapter)
    expect(attempt.outbox).toHaveLength(1) // still owed

    // Retries while still offline must not lose it.
    attempt = await flush(attempt.outbox, srv.adapter)
    expect(attempt.outbox).toHaveLength(1)

    // Wifi at the hotel.
    srv.goOnline()
    attempt = await flush(attempt.outbox, srv.adapter)
    expect(attempt.outbox).toEqual([])

    // Laptop pulls: one bakery, not three.
    const onLaptop = mergeCollections([], srv.rows('bakeries'))
    expect(onLaptop).toHaveLength(1)
    expect(toLocal({ bakeries: onLaptop }).bakeries[0].name).toBe('Poilâne')
  })

  it('an edit made on the laptop while the phone was offline wins if it is newer', async () => {
    const srv = fakeServer()
    await srv.adapter.upsert('bakeries', { id: 'b1', user_id: USER, name: 'renamed on laptop', updated_at: LATER, rank_index: 0 })
    const onPhone = [{ id: 'b1', user_id: USER, name: 'stale on phone', updated_at: AT, rank_index: 0 }]
    const merged = mergeCollections(onPhone, srv.rows('bakeries'))
    expect(merged[0].name).toBe('renamed on laptop')
  })
})
