// Live captioning for the Translator's Live tab — the mic stays open and text
// streams in as it is spoken, unlike the one-shot mic in translate.js.
//
// The engine underneath (Chrome's SpeechRecognition) ends a session on its own
// whenever the room goes quiet. That is normal during a call — the other side
// is listening, not talking — so we restart it every time it ends until the
// user presses Stop. The seam between sessions can drop a word; the UI says so.

// Errors that mean "restarting will not help" — stop and tell the user.
const FATAL = new Set(['not-allowed', 'service-not-allowed', 'audio-capture'])

// If a session dies with an error this many times in a row without hearing a
// single word, the restarts are a tight loop (e.g. no network) — give up.
const MAX_DEAD_RESTARTS = 6

export function startLiveListening({ lang = 'en-US', onFinal, onInterim, onError, onState, Ctor, track } = {}) {
  const Rec =
    Ctor ||
    (typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition))
  if (!Rec) {
    onError && onError(new Error('voice not supported'))
    return null
  }

  let active = true
  let rec = null
  let erroredThisSession = false
  let deadRestarts = 0
  let toldStopped = false // onState(false) must fire exactly once

  const stopped = () => {
    if (toldStopped) return
    toldStopped = true
    onState && onState(false)
  }
  const halt = (err) => {
    active = false
    stopped()
    if (err) onError && onError(err)
  }

  function spin() {
    rec = new Rec()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    erroredThisSession = false

    rec.onresult = (e) => {
      deadRestarts = 0 // it heard something — the mic path works
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i]
        const said = (r[0] && r[0].transcript) || ''
        if (r.isFinal) {
          const line = said.trim()
          if (line) onFinal && onFinal(line)
        } else {
          interim += said
        }
      }
      onInterim && onInterim(interim)
    }

    rec.onerror = (err) => {
      erroredThisSession = true
      const code = err && err.error
      if (FATAL.has(code)) halt(err)
      // Everything else (no-speech, network blips, aborted) falls through to
      // onend, where the restart-or-give-up decision lives.
    }

    rec.onend = () => {
      onInterim && onInterim('') // a session's interim text dies with it
      if (!active) {
        stopped()
        return
      }
      if (erroredThisSession) {
        deadRestarts += 1
        if (deadRestarts >= MAX_DEAD_RESTARTS) {
          halt(new Error('network'))
          return
        }
      }
      try {
        spin()
      } catch (e) {
        halt(e)
      }
    }

    // Chrome 139+ can transcribe a MediaStreamTrack instead of the mic —
    // that is how Zoom's remote voices get captioned while wearing earphones.
    if (track) rec.start(track)
    else rec.start()
  }

  // If the shared-audio track dies (she clicked "Stop sharing"), stop cleanly.
  if (track) {
    track.addEventListener('ended', () => {
      active = false
      try {
        rec && rec.stop()
      } catch (e) {
        /* already stopped */
      }
    })
  }

  try {
    spin()
  } catch (e) {
    active = false
    onError && onError(e)
    return null
  }
  onState && onState(true)

  return {
    stop() {
      active = false
      try {
        rec && rec.stop()
      } catch (e) {
        /* already stopped */
      }
    },
  }
}

// True where the always-on-top mini window (Document Picture-in-Picture) can
// open — Chrome on a computer. Safari and phones do not have it.
export function pipSupported() {
  return typeof window !== 'undefined' && 'documentPictureInPicture' in window
}

// True where a screen share can carry system audio — the beta path that
// captions the OTHER side of a call even with earphones in.
export function systemCaptureSupported() {
  return (
    typeof navigator !== 'undefined' &&
    !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
  )
}

// Ask Chrome for a screen share that includes system audio. The user must pick
// "Entire Screen" and switch on "Also share system audio" — a window or tab
// share on macOS carries no audio, which we surface as 'no-system-audio'.
export async function getSystemAudioTrack(md) {
  const dev = md || navigator.mediaDevices
  const stream = await dev.getDisplayMedia({
    video: true,
    audio: { suppressLocalAudioPlayback: false },
    systemAudio: 'include',
    monitorTypeSurfaces: 'include',
    selfBrowserSurface: 'exclude',
  })
  const track = stream.getAudioTracks()[0]
  if (!track) {
    stream.getTracks().forEach((t) => t.stop())
    const err = new Error('no-system-audio')
    err.error = 'no-system-audio'
    throw err
  }
  return { track, stream }
}
