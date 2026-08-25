import { describe, it, expect } from 'vitest'
import { flipLangs, lookupSetPhrase, KO_SET_PHRASES } from './phrasebook.js'

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

// The point of this table is that a machine cannot do ritual speech. Sara typed
// "잘 먹었습니다!" and Google answered "Well done!" — measured, not assumed.
describe('Korean set phrases', () => {
  it('answers the phrase that started this', () => {
    expect(lookupSetPhrase('잘 먹었습니다', 'ja-JP')).toEqual({
      text: 'ごちそうさまでした',
      reading: 'Gochisōsama deshita',
    })
    expect(lookupSetPhrase('잘 먹었습니다', 'en-US').text).toBe('Thank you, that was delicious.')
  })

  it('ignores the punctuation and spacing people actually type', () => {
    const want = lookupSetPhrase('포장해 주세요', 'fr-FR')
    for (const typed of ['포장해주세요', '포장해 주세요!', '포장해  주세요.', ' 포장해 주세요 ']) {
      expect(lookupSetPhrase(typed, 'fr-FR')).toEqual(want)
    }
  })

  it('accepts the casual wording too', () => {
    expect(lookupSetPhrase('잘 먹었어요', 'ja-JP').text).toBe('ごちそうさまでした')
    expect(lookupSetPhrase('포장이요', 'ja-JP').text).toBe('持ち帰りでお願いします')
    expect(lookupSetPhrase('저기요', 'de-DE').text).toBe('Entschuldigung.')
  })

  it('replaces rather than translates where there is nothing to translate', () => {
    // お疲れさまです is what you say to a colleague, never to a shop.
    expect(lookupSetPhrase('수고하세요', 'ja-JP').text).toBe('ありがとうございました')
    expect(lookupSetPhrase('수고하세요', 'fr-FR').text).toBe('Bonne journée !')
  })

  it('carries a pronunciation only where the script needs one', () => {
    expect(lookupSetPhrase('실례합니다', 'ja-JP').reading).toBe('Sumimasen')
    expect(lookupSetPhrase('실례합니다', 'zh-CN').reading).toBe('Bù hǎoyìsi')
    expect(lookupSetPhrase('실례합니다', 'fr-FR').reading).toBe('')
    expect(lookupSetPhrase('실례합니다', 'en-US').reading).toBe('')
  })

  it('gives Cantonese the Mandarin line for now, rather than nothing', () => {
    expect(lookupSetPhrase('포장해 주세요', 'zh-HK').text).toBe('打包，谢谢。')
    expect(lookupSetPhrase('포장해 주세요', 'zh-HK')).toEqual(
      lookupSetPhrase('포장해 주세요', 'zh-CN'),
    )
  })

  it('stays out of the way of everything else', () => {
    expect(lookupSetPhrase('이 빵 얼마예요?', 'ja-JP')).toBe(null)
    expect(lookupSetPhrase('', 'ja-JP')).toBe(null)
    expect(lookupSetPhrase('잘 먹었습니다', 'xx-XX')).toBe(null)
  })

  it('covers every curated language for every phrase', () => {
    for (const entry of KO_SET_PHRASES) {
      for (const lang of ['en', 'ja', 'fr', 'it', 'es', 'de', 'zh']) {
        expect(entry.t[lang], `${entry.ko} → ${lang}`).toBeTruthy()
      }
      // A non-Latin script without a pronunciation line is a phrase Sara
      // cannot say out loud — the whole point of the feature.
      for (const lang of ['ja', 'zh']) {
        expect(entry.r?.[lang], `${entry.ko} → ${lang} reading`).toBeTruthy()
      }
    }
  })
})
