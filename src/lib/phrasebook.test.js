import { describe, it, expect } from 'vitest'
import { flipLangs } from './phrasebook.js'

// The swap button lives or dies on the bcp match keeping Mandarin (zh-CN) and
// Cantonese (zh-HK) distinct — a plain lang:'zh' match would blur them.
describe('flipLangs', () => {
  it('swaps Korean → Cantonese into Cantonese → Korean (keeps Cantonese, not Mandarin)', () => {
    const { newFrom, newTo } = flipLangs('ko', 'HK')
    expect(newFrom.id).toBe('zh-HK') // Cantonese, not zh-CN
    expect(newTo.code).toBe('KR')
  })

  it('swaps English → Mandarin into Mandarin → English', () => {
    const { newFrom, newTo } = flipLangs('en', 'CN')
    expect(newFrom.id).toBe('zh-CN')
    expect(newTo.code).toBe('US')
  })

  it('swaps a Cantonese From back to an English To', () => {
    const { newFrom, newTo } = flipLangs('zh-HK', 'US')
    expect(newFrom.id).toBe('en')
    expect(newTo.code).toBe('HK') // From zh-HK → Cantonese country
  })

  it('returns null newFrom when the To language has no spoken-input entry', () => {
    const { newFrom } = flipLangs('ko', 'SA') // Arabic — not in INPUT_LANGS
    expect(newFrom).toBeNull()
  })
})
