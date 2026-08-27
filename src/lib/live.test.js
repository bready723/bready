import { describe, it, expect } from 'vitest'
import { startLiveListening, getSystemAudioTrack } from './live.js'

// A stand-in for Chrome's SpeechRecognition that the test can puppet: fire
// results, errors, and ends on command, and count how many times it was built
// (each build = one session, so builds - 1 = restarts).
function fakeRecognition() {
  const built = []
  function Fake() {
    this.started = false
    this.start = () => {
      this.started = true
    }
    this.stop = () => {
      // Chrome fires onend after stop() — mirror that.
      this.onend && this.onend()
    }
    built.push(this)
  }
  return { Fake, built }
}

const result = (items) => ({
  resultIndex: 0,
  results: items.map(([text, isFinal]) => {
    const r = [{ transcript: text }]
    r.isFinal = isFinal
    return r
  }),
})

describe('startLiveListening', () => {
  it('separates finals from interims and trims finals', () => {
    const { Fake, built } = fakeRecognition()
    const finals = []
    const interims = []
    startLiveListening({
      Ctor: Fake,
      onFinal: (t) => finals.push(t),
      onInterim: (t) => interims.push(t),
    })
    built[0].onresult(result([[' Hello there. ', true], ['so far we', false]]))
    expect(finals).toEqual(['Hello there.'])
    expect(interims).toEqual(['so far we'])
  })

  it('drops finals that are only whitespace', () => {
    const { Fake, built } = fakeRecognition()
    const finals = []
    startLiveListening({ Ctor: Fake, onFinal: (t) => finals.push(t) })
    built[0].onresult(result([['   ', true]]))
    expect(finals).toEqual([])
  })

  it('restarts when Chrome ends on silence, and clears the interim line', () => {
    const { Fake, built } = fakeRecognition()
    const interims = []
    startLiveListening({ Ctor: Fake, onInterim: (t) => interims.push(t) })
    built[0].onresult(result([['half a sent', false]]))
    built[0].onend() // silence — Chrome gave up
    expect(built.length).toBe(2) // a fresh session was started
    expect(built[1].started).toBe(true)
    expect(interims[interims.length - 1]).toBe('') // stale interim wiped
  })

  it('does NOT restart after stop()', () => {
    const { Fake, built } = fakeRecognition()
    const states = []
    const handle = startLiveListening({ Ctor: Fake, onState: (s) => states.push(s) })
    expect(states).toEqual([true])
    handle.stop()
    expect(built.length).toBe(1) // no second session
    expect(states).toEqual([true, false])
  })

  it('halts on fatal errors (mic permission) instead of restarting', () => {
    const { Fake, built } = fakeRecognition()
    const errors = []
    const states = []
    startLiveListening({
      Ctor: Fake,
      onError: (e) => errors.push(e.error || e.message),
      onState: (s) => states.push(s),
    })
    built[0].onerror({ error: 'not-allowed' })
    built[0].onend()
    expect(built.length).toBe(1)
    expect(errors).toEqual(['not-allowed'])
    expect(states).toEqual([true, false])
  })

  it('keeps restarting through transient errors, but gives up on a dead loop', () => {
    const { Fake, built } = fakeRecognition()
    const errors = []
    startLiveListening({ Ctor: Fake, onError: (e) => errors.push(e.error || e.message) })
    // Session after session dies with a network error, never hearing a word.
    for (let i = 0; i < 10; i += 1) {
      const rec = built[built.length - 1]
      rec.onerror({ error: 'network' })
      rec.onend()
    }
    expect(built.length).toBeLessThan(10) // it stopped spinning
    expect(errors[errors.length - 1]).toBe('network')
  })

  it('a heard word resets the dead-loop counter', () => {
    const { Fake, built } = fakeRecognition()
    const errors = []
    startLiveListening({ Ctor: Fake, onError: (e) => errors.push(e.error || e.message) })
    // Errors keep happening, but every session hears something — a flaky
    // network mid-call must not kill the captions.
    for (let i = 0; i < 20; i += 1) {
      const rec = built[built.length - 1]
      rec.onresult(result([['still hearing you', false]]))
      rec.onerror({ error: 'network' })
      rec.onend()
    }
    expect(built.length).toBe(21) // restarted every single time
    expect(errors).toEqual([])
  })

  it('reports when speech recognition does not exist at all', () => {
    const errors = []
    const handle = startLiveListening({ Ctor: null, onError: (e) => errors.push(e.message) })
    expect(handle).toBeNull()
    expect(errors).toEqual(['voice not supported'])
  })

  it('hands a captured track to every session, restarts included', () => {
    const starts = []
    function Fake() {
      this.start = (arg) => starts.push(arg)
      this.stop = () => { this.onend && this.onend() }
      Fake.built.push(this)
    }
    Fake.built = []
    const listeners = {}
    const track = { addEventListener: (ev, fn) => { listeners[ev] = fn } }
    startLiveListening({ Ctor: Fake, track })
    Fake.built[0].onend() // silence — restart
    expect(starts).toEqual([track, track]) // the same share, both sessions
  })

  it('stops for good when the user ends the screen share', () => {
    const states = []
    function Fake() {
      this.start = () => {}
      this.stop = () => { this.onend && this.onend() }
      Fake.built.push(this)
    }
    Fake.built = []
    const listeners = {}
    const track = { addEventListener: (ev, fn) => { listeners[ev] = fn } }
    startLiveListening({ Ctor: Fake, track, onState: (v) => states.push(v) })
    listeners.ended() // "Stop sharing" clicked in Chrome's bar
    expect(Fake.built.length).toBe(1) // no restart on a dead source
    expect(states).toEqual([true, false])
  })

  it('reads from resultIndex so old finals are not re-emitted', () => {
    const { Fake, built } = fakeRecognition()
    const finals = []
    startLiveListening({ Ctor: Fake, onFinal: (t) => finals.push(t) })
    built[0].onresult(result([['first sentence.', true]]))
    // Chrome keeps earlier results in the list; resultIndex points past them.
    built[0].onresult({
      resultIndex: 1,
      results: [
        Object.assign([{ transcript: 'first sentence.' }], { isFinal: true }),
        Object.assign([{ transcript: 'second sentence.' }], { isFinal: true }),
      ],
    })
    expect(finals).toEqual(['first sentence.', 'second sentence.'])
  })
})

describe('getSystemAudioTrack', () => {
  const streamWith = (audioTracks) => ({
    stopped: [],
    getAudioTracks: () => audioTracks,
    getTracks() {
      return audioTracks.concat([{ stop: () => this.stopped.push('video') }])
    },
  })

  it('returns the share audio track', async () => {
    const track = { kind: 'audio' }
    const md = { getDisplayMedia: async () => streamWith([track]) }
    const got = await getSystemAudioTrack(md)
    expect(got.track).toBe(track)
  })

  it('rejects and releases everything when the share has no audio', async () => {
    const stream = streamWith([])
    const md = { getDisplayMedia: async () => stream }
    await expect(getSystemAudioTrack(md)).rejects.toMatchObject({ error: 'no-system-audio' })
    expect(stream.stopped).toEqual(['video']) // nothing left recording
  })
})
