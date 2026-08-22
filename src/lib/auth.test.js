import { describe, it, expect } from 'vitest'
import { tokenFromLink, parsePasted, makeHandoffCode, getHandoffCode, signInWithPasted, HANDOFF_PREFIX } from './auth.js'

describe('tokenFromLink', () => {
  const base = 'https://brqhcolbbbwacpclslvg.supabase.co/auth/v1/verify'

  it('reads the token Supabase puts in the query', () => {
    expect(tokenFromLink(`${base}?token=abc123&type=magiclink&redirect_to=https://x/`)).toBe('abc123')
  })

  it('accepts token_hash too', () => {
    expect(tokenFromLink(`${base}?token_hash=xyz789&type=email`)).toBe('xyz789')
  })

  it('falls back to the fragment, which some mail clients leave it in', () => {
    expect(tokenFromLink(`https://bready723.github.io/bready/#token=frag456&type=magiclink`)).toBe('frag456')
  })

  it('survives the whitespace a paste from Mail brings along', () => {
    expect(tokenFromLink(`  ${base}?token=abc123&type=magiclink  `)).toBe('abc123')
  })

  it('returns null for anything that is not a sign-in link', () => {
    expect(tokenFromLink('')).toBeNull()
    expect(tokenFromLink(null)).toBeNull()
    expect(tokenFromLink('hello there')).toBeNull()
    expect(tokenFromLink('https://bready723.github.io/bready/')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Handing a session from Safari to the home-screen app.
//
// Why this exists: on iOS the sign-in link cannot reach the installed app.
// Tapping it opens Safari. Long-pressing it to copy makes Mail *load* the link
// to draw its preview, which spends the single-use token before Sara can paste
// it — that is the "already used" she keeps hitting. So the credential stops
// travelling by email: Safari, already signed in, hands its session over.
// ---------------------------------------------------------------------------

function fakeClient(overrides = {}) {
  const calls = { refreshSession: [], verifyOtp: [], signInWithOtp: [], getSession: 0 }
  return {
    calls,
    auth: {
      async getSession() {
        calls.getSession += 1
        return { data: { session: overrides.session ?? null }, error: null }
      },
      async refreshSession(arg) {
        calls.refreshSession.push(arg)
        return overrides.refreshSession
          ? overrides.refreshSession(arg, calls.refreshSession.length)
          : { data: { session: { user: { id: 'u1' } } }, error: null }
      },
      async verifyOtp(arg) {
        calls.verifyOtp.push(arg)
        return overrides.verifyOtp
          ? overrides.verifyOtp(arg, calls.verifyOtp.length)
          : { data: {}, error: null }
      },
      async signInWithOtp(arg) {
        calls.signInWithOtp.push(arg)
        return { data: {}, error: null }
      },
    },
  }
}

describe('makeHandoffCode', () => {
  it('wraps the refresh token so the paste box can recognise it', () => {
    expect(makeHandoffCode({ refresh_token: 'rt-abc' })).toBe(`${HANDOFF_PREFIX}rt-abc`)
  })

  it('returns null when there is no session to hand over', () => {
    expect(makeHandoffCode(null)).toBeNull()
    expect(makeHandoffCode({})).toBeNull()
  })
})

describe('parsePasted', () => {
  const link = 'https://brqhcolbbbwacpclslvg.supabase.co/auth/v1/verify?token=abc123&type=magiclink'

  it('recognises a sign-in link', () => {
    expect(parsePasted(link)).toEqual({ kind: 'link', token: 'abc123' })
  })

  it('recognises a handoff code', () => {
    expect(parsePasted(`${HANDOFF_PREFIX}rt-abc`)).toEqual({ kind: 'handoff', refreshToken: 'rt-abc' })
  })

  it('survives what a real copy brings along: whitespace and wrapped newlines', () => {
    expect(parsePasted(`\n  ${HANDOFF_PREFIX}rt-abc \n`)).toEqual({ kind: 'handoff', refreshToken: 'rt-abc' })
  })

  it('returns null for anything else', () => {
    expect(parsePasted('')).toBeNull()
    expect(parsePasted('hello')).toBeNull()
    expect(parsePasted('https://bready723.github.io/bready/')).toBeNull()
    expect(parsePasted(HANDOFF_PREFIX)).toBeNull()
  })
})

describe('getHandoffCode', () => {
  it('reads the live session and never sends an email', async () => {
    const client = fakeClient({ session: { refresh_token: 'rt-live' } })
    expect(await getHandoffCode({ client })).toEqual({ ok: true, code: `${HANDOFF_PREFIX}rt-live` })
    expect(client.calls.signInWithOtp).toHaveLength(0)
  })

  it('says so when nobody is signed in here', async () => {
    const client = fakeClient({ session: null })
    const result = await getHandoffCode({ client })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/sign/i)
  })
})

describe('signInWithPasted', () => {
  it('signs in from a handoff code', async () => {
    const client = fakeClient()
    expect(await signInWithPasted(`${HANDOFF_PREFIX}rt-abc`, { client })).toEqual({ ok: true })
    expect(client.calls.refreshSession).toEqual([{ refresh_token: 'rt-abc' }])
    expect(client.calls.signInWithOtp).toHaveLength(0)
  })

  it('still signs in from a pasted link', async () => {
    const client = fakeClient()
    expect(await signInWithPasted('https://x.supabase.co/auth/v1/verify?token=abc123', { client })).toEqual({ ok: true })
    expect(client.calls.verifyOtp).toEqual([{ token_hash: 'abc123', type: 'email' }])
  })

  it('explains a spent handoff code in terms of the button that makes a new one', async () => {
    const client = fakeClient({
      refreshSession: () => ({ data: {}, error: { message: 'Invalid Refresh Token: Already Used' } }),
    })
    const result = await signInWithPasted(`${HANDOFF_PREFIX}rt-old`, { client })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Copy sign-in code/i)
  })

  it('explains a spent link as a link, not as a code', async () => {
    const client = fakeClient({ verifyOtp: () => ({ data: {}, error: { message: 'Token has expired or is invalid' } }) })
    const result = await signInWithPasted('https://x.supabase.co/auth/v1/verify?token=abc', { client })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/already been used|expired/i)
  })

  // "Load failed" is all Safari says when a fetch dies, and it told Sara
  // nothing. A dropped connection is worth one silent retry.
  it('retries once when the connection drops, and succeeds', async () => {
    const client = fakeClient({
      refreshSession: (_arg, n) => {
        if (n === 1) throw new TypeError('Load failed')
        return { data: { session: { user: { id: 'u1' } } }, error: null }
      },
    })
    expect(await signInWithPasted(`${HANDOFF_PREFIX}rt-abc`, { client })).toEqual({ ok: true })
    expect(client.calls.refreshSession).toHaveLength(2)
  })

  it('says what a dropped connection actually means when the retry fails too', async () => {
    const client = fakeClient({
      refreshSession: () => { throw new TypeError('Load failed') },
    })
    const result = await signInWithPasted(`${HANDOFF_PREFIX}rt-abc`, { client })
    expect(client.calls.refreshSession).toHaveLength(2)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/connection/i)
    expect(result.error).not.toMatch(/Load failed/)
  })

  it('rejects a paste that is neither, without calling the server', async () => {
    const client = fakeClient()
    const result = await signInWithPasted('hello there', { client })
    expect(result.ok).toBe(false)
    expect(client.calls.refreshSession).toHaveLength(0)
    expect(client.calls.verifyOtp).toHaveLength(0)
  })

  it('is safe in a build with no cloud configured', async () => {
    const result = await signInWithPasted(`${HANDOFF_PREFIX}rt-abc`, { client: null })
    expect(result.ok).toBe(false)
  })
})

describe('the wording Supabase actually uses', () => {
  // Captured from the live endpoint. Guessing these strings is how the raw
  // server message leaked to the screen the first time.
  const REAL = [
    'Refresh token is not valid',
    'Invalid Refresh Token: Already Used',
    'Token has expired or is invalid',
  ]
  it.each(REAL)('translates %s', async (message) => {
    const client = fakeClient({ refreshSession: () => ({ data: {}, error: { message } }) })
    const result = await signInWithPasted(`${HANDOFF_PREFIX}rt-old`, { client })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Copy sign-in code/i)
    expect(result.error).not.toMatch(/Refresh token|Invalid|expired or is invalid/)
  })
})
