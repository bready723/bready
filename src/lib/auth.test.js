import { describe, it, expect } from 'vitest'
import { tokenFromLink } from './auth.js'

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
