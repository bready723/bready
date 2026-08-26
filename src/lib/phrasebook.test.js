import { describe, it, expect } from 'vitest'
import {
  flipLangs,
  lookupSetPhrase,
  KO_SET_PHRASES,
  PHRASES,
  GLOSSARY,
  COUNTRIES,
  CURATED_LANGS,
} from './phrasebook.js'

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

  it('no longer hands Hong Kong the Mandarin line', () => {
    expect(lookupSetPhrase('포장해 주세요', 'zh-HK')).not.toEqual(
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

// Hong Kong used to be handed Mandarin because both countries shared one `zh`
// slot. It was right in writing and wrong out loud — 打包 for 外賣, 多少钱 for
// 幾錢, simplified characters on a Hong Kong counter.
describe('Cantonese is its own language', () => {
  // Simplified forms whose traditional counterpart is a different character.
  // None of them belongs in a line meant for Hong Kong.
  const SIMPLIFIED = [...'谢面点鲜无颂团贝钱这请给炉荐饱帮热见会来个吗样时动还开']

  const hk = COUNTRIES.find((c) => c.code === 'HK')
  const cn = COUNTRIES.find((c) => c.code === 'CN')

  it('has a language of its own, and keeps its own voice', () => {
    expect(hk.lang).toBe('yue')
    expect(cn.lang).toBe('zh')
    expect(hk.bcp).toBe('zh-HK') // the voice still needs the region tag
    expect(CURATED_LANGS.has('yue')).toBe(true)
  })

  // A handful of things genuinely are identical in both. Listing them keeps the
  // rule strict everywhere else instead of loosening it for all.
  const SAME_IN_BOTH = new Set(['你好！'])

  it('never repeats the Mandarin line, except where the two really agree', () => {
    for (const p of [...PHRASES, ...GLOSSARY]) {
      expect(p.t.yue, `${p.en} has no Cantonese`).toBeTruthy()
      if (SAME_IN_BOTH.has(p.t.yue)) continue
      expect(p.t.yue, `${p.en} is just the Mandarin`).not.toBe(p.t.zh)
    }
    for (const e of KO_SET_PHRASES) {
      expect(e.t.yue, `${e.ko} has no Cantonese`).toBeTruthy()
      expect(e.t.yue, `${e.ko} is just the Mandarin`).not.toBe(e.t.zh)
      expect(e.r.yue, `${e.ko} has no jyutping`).toBeTruthy()
      expect(e.r.yue, `${e.ko} reads as pinyin`).not.toBe(e.r.zh)
    }
  })

  it('is written in traditional characters', () => {
    const every = [
      ...PHRASES.map((p) => p.t.yue),
      ...GLOSSARY.map((g) => g.t.yue),
      ...KO_SET_PHRASES.map((e) => e.t.yue),
    ]
    for (const line of every) {
      for (const ch of SIMPLIFIED) {
        expect(line.includes(ch), `"${line}" contains the simplified ${ch}`).toBe(false)
      }
    }
  })

  it('routes zh-HK to Cantonese and everything else Chinese to Mandarin', () => {
    expect(lookupSetPhrase('포장해 주세요', 'zh-HK').text).toBe('外賣，唔該')
    expect(lookupSetPhrase('포장해 주세요', 'zh-CN').text).toBe('打包，谢谢。')
    expect(lookupSetPhrase('포장해 주세요', 'zh-TW').text).toBe('打包，谢谢。')
    expect(lookupSetPhrase('포장해 주세요', 'yue').text).toBe('外賣，唔該')
  })

  it('says the untranslatable one the way Hong Kong says it', () => {
    // Not 辛苦了 — that is the Mandarin move. On the way out of a shop you say
    // thanks.
    const out = lookupSetPhrase('수고하세요', 'zh-HK')
    expect(out.text).toBe('唔該晒，拜拜')
    expect(out.reading).toBe('m4 goi1 saai3, baai1 baai3')
  })
})
