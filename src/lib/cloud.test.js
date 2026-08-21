import { describe, it, expect } from 'vitest'
import { reconcileOnSignIn, makeAdapter, pullAll } from './cloud.js'
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
    expect(r.state.bakeries[0].visits[0].id).toBe('v1')
    expect(client.rows('visits')).toHaveLength(1)
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
