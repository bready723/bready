import { describe, it, expect, beforeEach } from 'vitest'
import { reconcileOnSignIn, makeAdapter, pullAll, pushChanges, markSynced, withRetry, explainCloudError, OUTBOX_KEY, SYNCED_KEY } from './cloud.js'
import { MIGRATED_KEY } from './sync.js'

// A Supabase stand-in: `from(table)` with the handful of calls cloud.js makes.
function fakeClient({ failOn } = {}) {
  const tables = { bakeries: new Map(), visits: new Map(), want_to_try: new Map(), notes: new Map(), prefs: new Map() }
  return {
    tables,
    rows: (t) => [...tables[t].values()],
    from(table) {
      return {
        async upsert(row) {
          if (failOn === table) return { error: { message: 'permission denied' } }
          tables[table].set(row.id ?? row.user_id, { ...row })
          return { error: null }
        },
        select() {
          if (failOn === table) return Promise.resolve({ data: null, error: { message: 'permission denied' } })
          return Promise.resolve({ data: [...tables[table].values()], error: null })
        },
        update(patch) {
          return { eq: async (_col, id) => {
            const existing = tables[table].get(id) || { id }
            tables[table].set(id, { ...existing, ...patch })
            return { error: null }
          } }
        },
      }
    },
  }
}

const fakeStore = () => {
  const m = new Map()
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
}

const USER = { id: 'user-1', email: 'sara@example.com' }
const AT = '2026-08-21T04:00:00.000Z'

// Close to what Sara's Safari actually holds: ranked bakeries with photos.
const withData = () => ({
  bakeries: [
    { id: 'b1', name: 'Ess-a-Bagel', area: 'Midtown East', tier: 'loved', score: 9.8,
      photo: 'data:image/jpeg;base64,PHOTO1', breads: ['bagel'],
      visits: [{ date: '2026-08-01', breads: ['bagel'] }] },
    { id: 'b2', name: 'Gingered Peach', area: 'Princeton, NJ', tier: 'loved', score: 9.3,
      photo: 'data:image/jpeg;base64,PHOTO2', breads: ['croissant'], visits: [] },
  ],
  wantToTry: [{ id: 'w1', name: 'Maman' }],
  notes: [],
  country: 'FR',
  fxCurrency: 'USD',
})

const empty = () => ({ bakeries: [], wantToTry: [], notes: [], country: 'FR', fxCurrency: 'USD' })

const opts = (client, store, extra = {}) => {
  let n = 0
  return { client, store, now: AT, makeId: () => `v${++n}`, ...extra }
}

describe('signing in with data in this browser', () => {
  it('uploads it', async () => {
    const client = fakeClient(); const store = fakeStore()
    const r = await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(r.action).toBe('uploaded')
    expect(r.error).toBeNull()
    expect(client.rows('bakeries').map((b) => b.name)).toEqual(['Ess-a-Bagel', 'Gingered Peach'])
  })

  it('takes the photos with it — the whole reason Sara asked', async () => {
    const client = fakeClient(); const store = fakeStore()
    await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(client.rows('bakeries').map((b) => b.photo_url))
      .toEqual(['data:image/jpeg;base64,PHOTO1', 'data:image/jpeg;base64,PHOTO2'])
  })

  it('keeps the ranking order', async () => {
    const client = fakeClient(); const store = fakeStore()
    await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(client.rows('bakeries').map((b) => [b.name, b.rank_index]))
      .toEqual([['Ess-a-Bagel', 0], ['Gingered Peach', 1]])
  })

  it('gives visits ids and hands back a local state carrying them', async () => {
    const client = fakeClient(); const store = fakeStore()
    const r = await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(r.state.bakeries[0].visits[0].id).toBe('b1-v0')
    expect(client.rows('visits')).toHaveLength(1)
  })

  it('uploading twice cannot duplicate visits, even without the marker', async () => {
    // the exact failure that doubled Sara's visit history: two runs, no memory
    const client = fakeClient()
    await reconcileOnSignIn(withData(), USER, opts(client, fakeStore()))
    await reconcileOnSignIn(withData(), USER, opts(client, fakeStore()))
    expect(client.rows('visits')).toHaveLength(1)
    expect(client.rows('bakeries')).toHaveLength(2)
  })

  it('remembers it pushed, and does not push again', async () => {
    const client = fakeClient(); const store = fakeStore()
    await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(store.m.get(MIGRATED_KEY)).toBe(USER.id)
    const again = await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(again.action).toBe('nothing-to-do')
    expect(client.rows('bakeries')).toHaveLength(2)
  })

  it('does not mark itself done when the upload failed', async () => {
    const client = fakeClient({ failOn: 'bakeries' }); const store = fakeStore()
    const r = await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(r.action).toBe('upload-failed')
    expect(r.error).toMatch(/permission denied/)
    expect(store.m.get(MIGRATED_KEY)).toBeUndefined()
  })

  it('never blanks the local copy, even when the server refuses', async () => {
    const client = fakeClient({ failOn: 'bakeries' }); const store = fakeStore()
    const r = await reconcileOnSignIn(withData(), USER, opts(client, store))
    expect(r.state.bakeries).toHaveLength(2)
    expect(r.state.bakeries[0].photo).toBe('data:image/jpeg;base64,PHOTO1')
  })
})

describe('signing in on a browser that has nothing', () => {
  it('downloads the account, photos and order intact', async () => {
    const client = fakeClient(); const store = fakeStore()
    await reconcileOnSignIn(withData(), USER, opts(client, fakeStore())) // seed the account

    const r = await reconcileOnSignIn(empty(), USER, opts(client, store))
    expect(r.action).toBe('downloaded')
    expect(r.state.bakeries.map((b) => b.name)).toEqual(['Ess-a-Bagel', 'Gingered Peach'])
    expect(r.state.bakeries[0].photo).toBe('data:image/jpeg;base64,PHOTO1')
    expect(r.state.wantToTry[0].name).toBe('Maman')
  })

  it('does nothing when the account is empty too', async () => {
    const r = await reconcileOnSignIn(empty(), USER, opts(fakeClient(), fakeStore()))
    expect(r.action).toBe('nothing-to-do')
    expect(r.state).toBeNull()
  })

  it('leaves local alone when the download fails', async () => {
    const r = await reconcileOnSignIn(empty(), USER, opts(fakeClient({ failOn: 'visits' }), fakeStore()))
    expect(r.action).toBe('download-failed')
    expect(r.state).toBeNull()
  })
})

describe('the situation Sara is actually in', () => {
  it('Safari uploads, the home-screen app downloads, and the photos arrive', async () => {
    const account = fakeClient()

    // Safari: eight ranked bakeries with photos, never synced.
    const safariStore = fakeStore()
    const inSafari = await reconcileOnSignIn(withData(), USER, opts(account, safariStore))
    expect(inSafari.action).toBe('uploaded')

    // Home-screen app: separate storage, completely empty.
    const appStore = fakeStore()
    const inApp = await reconcileOnSignIn(empty(), USER, opts(account, appStore))
    expect(inApp.action).toBe('downloaded')
    expect(inApp.state.bakeries.map((b) => b.name)).toEqual(['Ess-a-Bagel', 'Gingered Peach'])
    expect(inApp.state.bakeries.map((b) => b.photo)).toEqual([
      'data:image/jpeg;base64,PHOTO1', 'data:image/jpeg;base64,PHOTO2',
    ])
    // and nothing was duplicated in the account
    expect(account.rows('bakeries')).toHaveLength(2)
  })
})

describe('guards', () => {
  it('does nothing without a signed-in user', async () => {
    const r = await reconcileOnSignIn(withData(), null, opts(fakeClient(), fakeStore()))
    expect(r.action).toBe('skipped')
  })

  it('does nothing without a client', async () => {
    const r = await reconcileOnSignIn(withData(), USER, { client: null, store: fakeStore() })
    expect(r.action).toBe('skipped')
  })

  it('upserts against the right conflict target for a composite key', async () => {
    const seen = []
    const client = { from: (t) => ({ upsert: async (row, opt) => { seen.push([t, opt?.onConflict]); return { error: null } } }) }
    const adapter = makeAdapter(client)
    await adapter.upsert('bakeries', { id: 'b1', user_id: 'u' })
    await adapter.upsert('prefs', { user_id: 'u' })
    expect(seen).toEqual([['bakeries', 'user_id,id'], ['prefs', 'user_id']])
  })

  it('surfaces a read failure rather than pretending the account is empty', async () => {
    await expect(pullAll(fakeClient({ failOn: 'notes' }))).rejects.toThrow(/notes: permission denied/)
  })
})

// ---------------------------------------------------------------------------
// Pushing changes as they happen.
//
// Until now sync only ran at sign-in, so a bakery added on Tuesday reached the
// cloud on whatever day Sara next signed in. These are the properties that make
// continuous pushing safe to run after every edit.
// ---------------------------------------------------------------------------

describe('pushChanges', () => {
  const counted = (opts) => {
    const client = fakeClient(opts)
    let upserts = 0, deletes = 0, selects = 0
    const inner = client.from.bind(client)
    client.from = (table) => {
      const t = inner(table)
      return {
        upsert: (...a) => { upserts += 1; return t.upsert(...a) },
        select: (...a) => { selects += 1; return t.select(...a) },
        update: (patch) => ({ eq: (...a) => { deletes += 1; return t.update(patch).eq(...a) } }),
      }
    }
    return { client, count: () => ({ upserts, deletes, selects }) }
  }

  it('does nothing, and touches no network, when signed out', async () => {
    const { client, count } = counted()
    const result = await pushChanges(withData(), null, { client, store: fakeStore(), now: AT })
    expect(result.ok).toBe(false)
    expect(count()).toEqual({ upserts: 0, deletes: 0, selects: 0 })
  })

  it('sends everything the first time and remembers what it sent', async () => {
    const { client } = counted()
    const store = fakeStore()
    const result = await pushChanges(withData(), USER, { client, store, now: AT })
    expect(result.ok).toBe(true)
    expect(result.sent).toBeGreaterThan(0)
    expect(client.rows('bakeries')).toHaveLength(2)
    expect(store.getItem(SYNCED_KEY)).toBeTruthy()
    expect(JSON.parse(store.getItem(OUTBOX_KEY)).outbox).toEqual([])
  })

  it('sends NOTHING on the next call when nothing changed', async () => {
    // The one that matters: this runs after every edit, so an unchanged state
    // must cost zero requests or the app hammers Supabase for free-tier fun.
    const store = fakeStore()
    const first = counted()
    await pushChanges(withData(), USER, { client: first.client, store, now: AT })
    const second = counted()
    const result = await pushChanges(withData(), USER, { client: second.client, store, now: '2026-08-21T05:00:00.000Z' })
    expect(result.ok).toBe(true)
    expect(result.sent).toBe(0)
    expect(second.count()).toEqual({ upserts: 0, deletes: 0, selects: 0 })
  })

  it('sends only the bakery that changed', async () => {
    const store = fakeStore()
    const first = counted()
    const state = withData()
    await pushChanges(state, USER, { client: first.client, store, now: AT })
    const edited = { ...state, bakeries: [{ ...state.bakeries[0], score: 9.9 }, state.bakeries[1]] }
    const second = counted()
    const result = await pushChanges(edited, USER, { client: second.client, store, now: '2026-08-21T05:00:00.000Z' })
    expect(result.sent).toBe(1)
    expect(second.count().upserts).toBe(1)
  })

  it('keeps a failed change and does not pretend it landed', async () => {
    const store = fakeStore()
    const result = await pushChanges(withData(), USER, { client: fakeClient({ failOn: 'bakeries' }), store, now: AT })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/permission denied/)
    // Nothing may be marked as synced, or the change is lost forever.
    expect(store.getItem(SYNCED_KEY)).toBeNull()
    expect(JSON.parse(store.getItem(OUTBOX_KEY)).outbox.length).toBeGreaterThan(0)
  })

  it('sends the held-back change when the connection comes back, exactly once', async () => {
    const store = fakeStore()
    await pushChanges(withData(), USER, { client: fakeClient({ failOn: 'bakeries' }), store, now: AT })
    const back = counted()
    const result = await pushChanges(withData(), USER, { client: back.client, store, now: '2026-08-21T05:00:00.000Z' })
    expect(result.ok).toBe(true)
    expect(back.client.rows('bakeries')).toHaveLength(2)
    const again = counted()
    await pushChanges(withData(), USER, { client: again.client, store, now: '2026-08-21T06:00:00.000Z' })
    expect(again.count()).toEqual({ upserts: 0, deletes: 0, selects: 0 })
  })

  it('marks a removed bakery deleted rather than leaving it on the server', async () => {
    const store = fakeStore()
    const client = fakeClient()
    const state = withData()
    await pushChanges(state, USER, { client, store, now: AT })
    await pushChanges({ ...state, bakeries: [state.bakeries[1]] }, USER, { client, store, now: '2026-08-21T05:00:00.000Z' })
    const gone = client.tables.bakeries.get(state.bakeries[0].id)
    expect(gone.deleted_at).toBe('2026-08-21T05:00:00.000Z')
  })

  it('still works with no storage at all, as in a private window', async () => {
    const { client } = counted()
    const result = await pushChanges(withData(), USER, { client, store: null, now: AT })
    expect(result.ok).toBe(true)
    expect(client.rows('bakeries')).toHaveLength(2)
  })

  it('gives visits ids before sending, so they cannot duplicate', async () => {
    const store = fakeStore()
    const client = fakeClient()
    const state = withData()
    state.bakeries[0].visits = [{ date: '2026-08-01', breads: ['bagel'] }] // no id, as the UI writes them
    await pushChanges(state, USER, { client, store, now: AT })
    const visits = client.rows('visits')
    expect(visits).toHaveLength(1)
    expect(visits[0].id).toBe('b1-v0')
    await pushChanges(state, USER, { client, store, now: '2026-08-21T05:00:00.000Z' })
    expect(client.rows('visits')).toHaveLength(1)
  })
})

describe('markSynced', () => {
  it('stops the first push after sign-in re-uploading everything', async () => {
    const store = fakeStore()
    const state = withData()
    markSynced(state, USER, { store, now: AT })
    const client = fakeClient()
    let upserts = 0
    const inner = client.from.bind(client)
    client.from = (t) => ({ ...inner(t), upsert: (...a) => { upserts += 1; return inner(t).upsert(...a) } })
    const result = await pushChanges(state, USER, { client, store, now: '2026-08-21T05:00:00.000Z' })
    expect(result.sent).toBe(0)
    expect(upserts).toBe(0)
  })

  it('still notices the next real edit', async () => {
    const store = fakeStore()
    const state = withData()
    markSynced(state, USER, { store, now: AT })
    const edited = { ...state, bakeries: [{ ...state.bakeries[0], name: 'Renamed' }, state.bakeries[1]] }
    const result = await pushChanges(edited, USER, { client: fakeClient(), store, now: '2026-08-21T05:00:00.000Z' })
    expect(result.sent).toBe(1)
  })
})

// Sara, on a Mac whose clock was exact to the second, got
//   "Could not load your account: bakeries: JWT issued at future"
// The token is minted by Supabase and used by pullAll microseconds later;
// PostgREST compares its "issued at" to its own clock with no tolerance, so a
// sub-second skew between two Supabase machines rejects a token that is fine a
// moment later.
describe('a token used the instant it was minted', () => {
  const slept = []
  const sleep = (ms) => { slept.push(ms); return Promise.resolve() }
  beforeEach(() => { slept.length = 0 })

  it('asks again instead of giving up', async () => {
    let calls = 0
    const run = async () => {
      calls += 1
      if (calls < 2) throw new Error('bakeries: JWT issued at future')
      return 'rows'
    }
    expect(await withRetry(run, { sleep })).toBe('rows')
    expect(calls).toBe(2)
    expect(slept).toEqual([600]) // waited once, briefly
  })

  it('waits longer each time, then reports the failure honestly', async () => {
    const run = async () => { throw new Error('bakeries: JWT issued at future') }
    await expect(withRetry(run, { sleep })).rejects.toThrow('JWT issued at future')
    expect(slept).toEqual([600, 1200])
  })

  it('never retries a real refusal', async () => {
    let calls = 0
    const run = async () => { calls += 1; throw new Error('bakeries: permission denied for table bakeries') }
    await expect(withRetry(run, { sleep })).rejects.toThrow('permission denied')
    expect(calls).toBe(1) // asking twice would not change the answer
    expect(slept).toEqual([])
  })

  it('rides out a dropped connection too', async () => {
    let calls = 0
    const run = async () => { calls += 1; if (calls < 3) throw new Error('Load failed'); return 'ok' }
    expect(await withRetry(run, { sleep })).toBe('ok')
  })

  it('says it in words, not in server jargon', () => {
    expect(explainCloudError('bakeries: JWT issued at future')).toMatch(/clock was briefly out of step/i)
    expect(explainCloudError('bakeries: JWT issued at future')).toMatch(/nothing was lost/i)
    // Anything else is quoted as-is rather than guessed at.
    expect(explainCloudError('permission denied')).toBe('permission denied')
    expect(explainCloudError('')).toBe('')
  })

  it('a failed download never tells the cloud to delete anything', async () => {
    // The screen goes empty when the pull fails, and the push that follows runs
    // against an empty local state. It must not read that as "she deleted it".
    const client = {
      from: () => ({ select: async () => ({ data: null, error: { message: 'JWT issued at future' } }) }),
    }
    const store = new Map()
    const fake = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
    const result = await reconcileOnSignIn(
      { bakeries: [], wantToTry: [], notes: [] },
      { id: 'u1' },
      { client, store: fake, sleep: () => Promise.resolve() },
    )
    expect(result.action).toBe('download-failed')
    // The "we are in sync" marker must NOT have been written, because that is
    // what a later push diffs against to decide what vanished.
    expect(store.get(SYNCED_KEY)).toBeUndefined()
  })
})
