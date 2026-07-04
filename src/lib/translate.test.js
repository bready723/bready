import { describe, it, expect } from 'vitest'
import { micErrorMessage } from './translate.js'

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
