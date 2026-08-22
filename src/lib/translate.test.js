import { describe, it, expect } from 'vitest'
import { micErrorMessage, targetCodes} from './translate.js'

// The whole point of the iPhone mic fix: every message must carry the raw
// SpeechRecognition code so we can see what's really happening, and the two
// look-alike "blocked" codes must give DIFFERENT guidance (site mic vs iOS
// system Dictation).
describe('micErrorMessage', () => {
  it('always appends the raw error code', () => {
    expect(micErrorMessage({ error: 'not-allowed' })).toContain('(not-allowed)')
    expect(micErrorMessage({ error: 'network' })).toContain('(network)')
    expect(micErrorMessage({})).toContain('(unknown)')
  })

  it('distinguishes site-permission (not-allowed) from iOS dictation (service-not-allowed)', () => {
    const notAllowed = micErrorMessage({ error: 'not-allowed' })
    const serviceNot = micErrorMessage({ error: 'service-not-allowed' })
    expect(notAllowed).not.toEqual(serviceNot)
    expect(serviceNot).toMatch(/dictation/i) // iOS culprit called out by name
    expect(notAllowed).toMatch(/website settings|address bar/i)
  })

  it('reads the code from either .error or .message', () => {
    expect(micErrorMessage({ message: 'voice not supported' })).toMatch(/typing always works/i)
  })
})

describe('Cantonese is a language, not a font', () => {
  // Sara: "Cantonese is not even real Cantonese". It was being sent as zh-TW,
  // which returns Mandarin in traditional characters — correct Chinese, and
  // not what anyone in Hong Kong says. Verified against the live endpoint:
  //   zh-TW  這個麵包多少錢?   (Mandarin, traditional script)
  //   yue    呢個麵包幾錢?     (Cantonese)
  it('asks for yue, not traditional Chinese', () => {
    expect(targetCodes('zh-HK').google).toBe('yue')
    expect(targetCodes('zh-hk').google).toBe('yue')
    expect(targetCodes('yue').google).toBe('yue')
  })

  it('still tells Mandarin and Taiwan apart', () => {
    expect(targetCodes('zh-CN').google).toBe('zh-CN')
    expect(targetCodes('zh').google).toBe('zh-CN')
    expect(targetCodes('zh-TW').google).toBe('zh-TW')
  })

  it('leaves every other language as its plain two-letter code', () => {
    for (const [tag, code] of [['ja-JP', 'ja'], ['fr-FR', 'fr'], ['ko-KR', 'ko'], ['th-TH', 'th']]) {
      expect(targetCodes(tag).google).toBe(code)
    }
  })

  it('falls back to traditional Chinese, since MyMemory has no Cantonese', () => {
    expect(targetCodes('zh-HK').mymemory).toBe('zh-TW')
  })
})
