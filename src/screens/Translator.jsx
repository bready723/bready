import { useEffect, useRef, useState } from 'react'
import {
  COUNTRIES,
  countryByCode,
  CURATED_LANGS,
  INPUT_LANGS,
  inputById,
  flipLangs,
  PHRASES,
  GLOSSARY,
} from '../lib/phrasebook.js'
import {
  speak,
  translateText,
  translateDetailed,
  speechRecognitionSupported,
  startListening,
  micErrorMessage,
} from '../lib/translate.js'
import { startLiveListening, pipSupported, systemCaptureSupported, getSystemAudioTrack } from '../lib/live.js'

const AUTO_KEY = 'bready.autoT.v1'
const loadAuto = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTO_KEY)) || {}
  } catch (e) {
    return {}
  }
}

// Persist every translation so nothing spoken/typed is lost — Sara can copy or
// download the whole script as a .txt file.
const SCRIPT_KEY = 'bready.script.v1'
const loadScript = () => {
  try {
    return JSON.parse(localStorage.getItem(SCRIPT_KEY)) || []
  } catch (e) {
    return []
  }
}
const saveScript = (list) => {
  try {
    localStorage.setItem(SCRIPT_KEY, JSON.stringify(list))
  } catch (e) {
    /* quota — keep in memory only */
  }
}

// Live captions (Zoom-meeting mode): every finished sentence lands here with a
// clock time, and survives a reload — a dropped call must not eat the notes.
const LIVE_KEY = 'bready.live.v1'
const loadLive = () => {
  try {
    return JSON.parse(localStorage.getItem(LIVE_KEY)) || []
  } catch (e) {
    return []
  }
}
const saveLive = (list) => {
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify(list))
  } catch (e) {
    /* quota — keep in memory only */
  }
}
const liveStamp = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    return ''
  }
}

// Small speak button with a per-section accent color.
function Speak({ onClick, color }) {
  return (
    <button
      className="speak"
      onClick={onClick}
      title="Speak"
      style={{ background: `${color}14`, borderColor: `${color}40`, color }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 010 7" />
      </svg>
    </button>
  )
}

// Held-up-to-a-stranger size. Measured on a 390px screen: 12 characters fill
// the width at 46px, so each step down buys roughly double the length.
function bigSize(text) {
  const n = String(text || '').length
  if (n <= 12) return 46
  if (n <= 24) return 38
  if (n <= 44) return 31
  if (n <= 80) return 25
  return 20
}

function Chevron() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export default function Translator({ country, onCountry }) {
  const dest = countryByCode(country)
  const [sub, setSub] = useState('translate')
  const [inputLang, setInputLang] = useState('en') // what Sara speaks/types (From)
  const [fromOpen, setFromOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState('') // the source we last translated (input clears after)
  const [output, setOutput] = useState('')
  const [reading, setReading] = useState('') // how to SAY the translation
  const [source, setSource] = useState('') // 'phrasebook' when hand-checked
  const [showBig, setShowBig] = useState(false)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [listening, setListening] = useState(false)
  const [auto, setAuto] = useState(loadAuto)
  const [autoLoading, setAutoLoading] = useState(false)
  const [micMsg, setMicMsg] = useState('')
  const [pasteMsg, setPasteMsg] = useState('')
  const [copyMsg, setCopyMsg] = useState('')
  const [script, setScript] = useState(loadScript)
  const [liveOn, setLiveOn] = useState(false)
  const [liveInterim, setLiveInterim] = useState('')
  const [liveLines, setLiveLines] = useState(loadLive)
  const [liveMsg, setLiveMsg] = useState('')
  const [pipOn, setPipOn] = useState(false)
  const liveRef = useRef(null)
  const liveBoxRef = useRef(null)
  const liveStreamRef = useRef(null) // the screen share carrying Zoom's audio
  const pipRef = useRef(null)
  const pipToggleRef = useRef(null) // what the mini window's button does right now
  const recRef = useRef(null)
  const micTimer = useRef(null)
  const reqRef = useRef(0)
  const textRef = useRef(null)

  const isCurated = CURATED_LANGS.has(dest.lang)
  const fromCur = inputById(inputLang)
  const fromLabel = `${fromCur.flag} ${fromCur.label}`

  function logScript(source, translated) {
    setScript((prev) => {
      const next = [
        { ts: Date.now(), fromLang: inputById(inputLang).label, toLang: dest.name, source, translated },
        ...prev,
      ].slice(0, 200)
      saveScript(next)
      return next
    })
  }

  function scriptToText() {
    return script
      .map((s) => {
        const when = (() => {
          try {
            return new Date(s.ts).toLocaleString()
          } catch (e) {
            return ''
          }
        })()
        return `[${when}] ${s.fromLang} → ${s.toLang}\n${s.source}\n${s.translated}\n`
      })
      .join('\n')
  }
  function copyScript() {
    if (navigator.clipboard) navigator.clipboard.writeText(scriptToText()).catch(() => {})
  }
  function downloadScript() {
    const blob = new Blob([scriptToText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bready-translation-script.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  function clearScript() {
    setScript([])
    saveScript([])
  }

  // ---- Live captions ----
  function startLive(track) {
    setLiveMsg('')
    liveRef.current = startLiveListening({
      lang: inputById(inputLang).bcp,
      track,
      onFinal: (line) => {
        setLiveLines((prev) => {
          const next = [...prev, { ts: Date.now(), text: line }].slice(-1000)
          saveLive(next)
          return next
        })
      },
      onInterim: setLiveInterim,
      onState: setLiveOn,
      onError: (e) => setLiveMsg(micErrorMessage(e)),
    })
  }
  function stopLive(opts) {
    liveRef.current && liveRef.current.stop()
    liveRef.current = null
    // The mini window pauses instead of hanging up: keeping the share alive
    // means its Start needs no new picker dialog (a picker can't be opened
    // from there anyway — Chrome wants the click in the main window).
    if (!(opts && opts.keepShare) && liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((t) => t.stop())
      liveStreamRef.current = null
    }
  }

  // The earphone path (beta): caption the call's own audio via a screen share,
  // so the other side is heard even when nothing reaches the mic.
  async function startZoomCapture() {
    setLiveMsg('')
    try {
      const { track, stream } = await getSystemAudioTrack()
      liveStreamRef.current = stream
      startLive(track)
      setLiveMsg('🎧 Captioning the call’s audio (beta) — earphones are fine in this mode.')
    } catch (e) {
      if ((e && e.error) === 'no-system-audio') {
        setLiveMsg('No audio came with the share — pick “Entire Screen” and switch ON “Also share system audio”, then try again.')
      } else if (e && /NotAllowed|Permission/i.test(e.name || '')) {
        setLiveMsg('Share was cancelled — nothing captured.')
      } else {
        setLiveMsg('Couldn’t capture the call’s audio here — use the speaker trick or macOS Live Captions instead.')
      }
    }
  }
  function liveToText() {
    return liveLines.map((l) => `[${liveStamp(l.ts)}] ${l.text}`).join('\n')
  }
  function copyLive() {
    if (navigator.clipboard) navigator.clipboard.writeText(liveToText()).catch(() => {})
  }
  function downloadLive() {
    const blob = new Blob([liveToText()], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bready-live-transcript.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  function clearLive() {
    setLiveLines([])
    saveLive([])
  }

  // The mini window's button: Stop pauses (share kept), Start resumes on the
  // kept share — or the mic when there is none.
  pipToggleRef.current = liveOn
    ? () => stopLive({ keepShare: true })
    : () => {
        const kept =
          liveStreamRef.current &&
          liveStreamRef.current.getAudioTracks().find((t) => t.readyState === 'live')
        startLive(kept || undefined)
      }

  // The always-on-top mini window (Chrome only). It wears the brand blue —
  // the same #1D5BCE as the buttons — so it reads as bready at a glance.
  async function openPip() {
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 440, height: 230 })
      pipRef.current = win
      const doc = win.document
      doc.title = 'bready · live'
      const style = doc.createElement('style')
      style.textContent = `
        html, body { margin: 0; height: 100%; background: #1D5BCE; color: #fff;
          font: 14px/1.5 -apple-system, 'Instrument Sans', system-ui, sans-serif; }
        body { display: flex; flex-direction: column; }
        .bar { flex: 0 0 auto; display: flex; align-items: center; gap: 7px;
          padding: 6px 8px 6px 12px; font-size: 11px; font-weight: 700; letter-spacing: .06em;
          text-transform: uppercase; color: rgba(255,255,255,0.75);
          border-bottom: 1px solid rgba(255,255,255,0.28); }
        #pipbtn { margin-left: auto; cursor: pointer; font: inherit; font-size: 11px;
          letter-spacing: .06em; text-transform: uppercase; color: #fff;
          background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.45);
          border-radius: 999px; padding: 4px 14px; }
        #pipbtn:active { background: rgba(255,255,255,0.3); }
        #dot { width: 8px; height: 8px; border-radius: 50%; background: #e04545; }
        #cap { flex: 1 1 auto; overflow-y: auto; padding: 10px 14px 12px; }
        #cap .f { font-size: 16.5px; line-height: 1.5; margin: 5px 0; }
        #cap .i { font-size: 16.5px; line-height: 1.5; margin: 5px 0; color: rgba(255,255,255,0.62); }
        #cap .empty { color: rgba(255,255,255,0.62); font-size: 13px; }`
      doc.head.appendChild(style)
      const bar = doc.createElement('div')
      bar.className = 'bar'
      const dot = doc.createElement('span')
      dot.id = 'dot'
      bar.appendChild(dot)
      bar.appendChild(doc.createTextNode('bready · live captions'))
      const pipBtn = doc.createElement('button')
      pipBtn.id = 'pipbtn'
      pipBtn.textContent = 'Start'
      pipBtn.addEventListener('click', () => {
        pipToggleRef.current && pipToggleRef.current()
      })
      bar.appendChild(pipBtn)
      const cap = doc.createElement('div')
      cap.id = 'cap'
      doc.body.appendChild(bar)
      doc.body.appendChild(cap)
      win.addEventListener('pagehide', () => {
        pipRef.current = null
        setPipOn(false)
      })
      setPipOn(true)
    } catch (e) {
      setLiveMsg('Couldn’t open the floating window in this browser.')
    }
  }

  // Newest caption stays in view.
  useEffect(() => {
    if (liveBoxRef.current) liveBoxRef.current.scrollTop = liveBoxRef.current.scrollHeight
  }, [liveLines, liveInterim])

  // Mirror the captions into the floating window whenever they change.
  useEffect(() => {
    const win = pipRef.current
    if (!win || win.closed) return
    const doc = win.document
    const cap = doc.getElementById('cap')
    if (!cap) return
    cap.textContent = ''
    if (liveLines.length === 0 && !liveInterim) {
      const d = doc.createElement('div')
      d.className = 'empty'
      d.textContent = liveOn ? 'Listening…' : 'Press Start in bready to begin.'
      cap.appendChild(d)
    }
    for (const l of liveLines.slice(-8)) {
      const d = doc.createElement('div')
      d.className = 'f'
      d.textContent = l.text
      cap.appendChild(d)
    }
    if (liveInterim) {
      const d = doc.createElement('div')
      d.className = 'i'
      d.textContent = liveInterim
      cap.appendChild(d)
    }
    const dot = doc.getElementById('dot')
    if (dot) dot.style.background = liveOn ? '#e04545' : 'rgba(255,255,255,0.35)'
    const pipBtn = doc.getElementById('pipbtn')
    if (pipBtn) pipBtn.textContent = liveOn ? 'Stop' : 'Start'
    cap.scrollTop = cap.scrollHeight
  }, [liveLines, liveInterim, liveOn, pipOn])

  // Leaving the Translator screen entirely: release the mic, close the window.
  useEffect(
    () => () => {
      liveRef.current && liveRef.current.stop()
      if (liveStreamRef.current) liveStreamRef.current.getTracks().forEach((t) => t.stop())
      if (pipRef.current && !pipRef.current.closed) pipRef.current.close()
    },
    [],
  )

  useEffect(() => {
    if (isCurated || auto[dest.lang]) return
    let cancelled = false
    setAutoLoading(true)
    const tr = (s) => translateText(s, dest.lang, 'en').catch(() => s)
    Promise.all([
      Promise.all(PHRASES.map((p) => tr(p.en))),
      Promise.all(GLOSSARY.map((w) => tr(w.en))),
    ])
      .then(([phrases, glossary]) => {
        if (cancelled) return
        setAuto((prev) => {
          const next = { ...prev, [dest.lang]: { phrases, glossary } }
          try {
            localStorage.setItem(AUTO_KEY, JSON.stringify(next))
          } catch (e) {
            /* quota - keep it in memory only */
          }
          return next
        })
      })
      .finally(() => !cancelled && setAutoLoading(false))
    return () => {
      cancelled = true
    }
  }, [dest.lang, isCurated]) // eslint-disable-line react-hooks/exhaustive-deps

  const phraseText = (p, i) =>
    isCurated ? p.t[dest.lang] || p.en : auto[dest.lang]?.phrases[i] ?? p.en
  const wordText = (w, i) =>
    isCurated ? w.t[dest.lang] || w.en : auto[dest.lang]?.glossary[i] ?? w.en

  const voiceOk = !!speechRecognitionSupported()
  // iPhone/iPad voice-to-text rides on iOS's system Dictation service, not the
  // per-site mic toggle — so we tell Sara upfront where the real switch lives.
  const isIOS =
    typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent)

  async function doTranslate(value) {
    const phrase = (value ?? text).trim()
    if (!phrase) return
    const myReq = ++reqRef.current
    setStatus('loading')
    try {
      // Pass dest.bcp (zh-HK/zh-CN/ja-JP…) so Cantonese maps to Traditional and
      // stays distinct from Mandarin; translateText normalizes per provider.
      const { text: out, reading: rom, source: src } = await translateDetailed(
        phrase,
        dest.bcp,
        inputById(inputLang).lang,
      )
      if (myReq !== reqRef.current) return
      setOutput(out)
      setReading(rom)
      setSource(src || '')
      setSubmitted(phrase)
      setStatus('done')
      // The box used to empty itself here, so you could never see what you had
      // just asked for, let alone fix a typo. Google Translate keeps it; so do
      // we. Speaking and logging moved to the 🔊 and Copy buttons: translation
      // now happens while you type, and a phone that talks at every pause is
      // unusable.
    } catch (e) {
      if (myReq !== reqRef.current) return
      setStatus('error')
    }
  }

  // Translate as it is typed, the way Google Translate does — no button to
  // find, no button to forget. 600ms is long enough that a normal typing speed
  // makes one request per phrase rather than one per keystroke.
  useEffect(() => {
    const phrase = text.trim()
    if (!phrase) {
      reqRef.current += 1 // abandon anything in flight
      setOutput('')
      setReading('')
      setSource('')
      setSubmitted('')
      setStatus('idle')
      return undefined
    }
    const timer = setTimeout(() => doTranslate(phrase), 600)
    return () => clearTimeout(timer)
    // dest.bcp and the From language are here on purpose: changing either
    // should re-translate what is already on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, dest.bcp, inputLang])

  // The clipboard needs a user gesture and can still be refused (iOS asks, and
  // a refusal is silent). Say what to do by hand rather than looking broken.
  async function paste() {
    try {
      const clip = await navigator.clipboard.readText()
      if (clip) setText(clip)
      else setPasteMsg('Clipboard is empty')
    } catch (e) {
      setPasteMsg('Press and hold the box to paste')
    }
    setTimeout(() => setPasteMsg(''), 2200)
  }

  async function copyOut() {
    try {
      await navigator.clipboard.writeText(output)
      setCopyMsg('Copied')
    } catch (e) {
      setCopyMsg('Press and hold the text to copy')
    }
    logScript(submitted, output)
    setTimeout(() => setCopyMsg(''), 1800)
  }

  // Saying it out loud or copying it is what makes a phrase worth keeping.
  // Logging every pause in typing would fill Script with half-typed fragments.
  function speakOut() {
    speak(output, dest.bcp)
    logScript(submitted, output)
  }

  // Flip From ⇄ To in one tap so Sara can hand the phone over for the reply.
  function swapLangs() {
    const { newFrom, newTo } = flipLangs(inputLang, country)
    if (!newFrom) {
      setMicMsg(`${countryByCode(country).name} isn’t a spoken-input language yet — you can still type it.`)
      return
    }
    setInputLang(newFrom.id)
    if (newTo) onCountry(newTo.code)
    // start the flipped direction clean
    setText('')
    setOutput('')
    setReading('')
    setSource('')
    setSubmitted('')
    setStatus('idle')
    setMicMsg('')
  }

  function stopMicTimer() {
    if (micTimer.current) {
      clearTimeout(micTimer.current)
      micTimer.current = null
    }
  }

  // iOS Safari's Web Speech API is broken (throws service-not-allowed even with
  // Dictation on), so on iPhone/iPad we skip it and hand off to the RELIABLE path:
  // focus the box so the keyboard appears, and point Sara at its built-in 🎤 key.
  function iosKeyboardMic() {
    setMicMsg('🎤 Tap the mic key on your keyboard (by the space bar) to speak — iOS types it in the box, then hit Translate.')
    textRef.current && textRef.current.focus()
  }

  function toggleMic() {
    if (listening) {
      recRef.current && recRef.current.stop()
      stopMicTimer()
      setListening(false)
      return
    }
    setMicMsg('🔴 Listening… speak now')
    setListening(true)
    recRef.current = startListening({
      lang: inputById(inputLang).bcp,
      onResult: (said) => {
        stopMicTimer()
        setListening(false)
        setMicMsg('')
        setText(said)
        doTranslate(said)
      },
      onError: (e) => {
        stopMicTimer()
        setListening(false)
        setMicMsg(micErrorMessage(e))
      },
      onEnd: (heard) => {
        stopMicTimer()
        setListening(false)
        if (!heard) setMicMsg((m) => m || "Didn't catch anything — try again, or type below.")
      },
    })
    stopMicTimer()
    // Safari caps a single utterance around a minute; give a generous window and
    // stop on a pause. Type-to-translate stays as the always-reliable fallback.
    micTimer.current = setTimeout(() => {
      recRef.current && recRef.current.stop()
    }, 45000)
  }

  const anyDdOpen = fromOpen || toOpen
  const closeDd = () => {
    setFromOpen(false)
    setToOpen(false)
  }

  if (showBig && output) {
    return (
      <div className="tr-big" onClick={() => setShowBig(false)}>
        <div className="dst" style={{ fontSize: bigSize(output) }}>{output}</div>
        {reading && <div className="rom">{reading}</div>}
        <div className="src">{submitted}</div>
        <div className="hint">Tap anywhere to go back</div>
      </div>
    )
  }

  return (
    <main className="screen">
      <h1 className="title">Translator</h1>
      <p className="subtitle">Order with confidence, anywhere.</p>

      {anyDdOpen && (
        <div onClick={closeDd} style={{ position: 'absolute', inset: 0, zIndex: 40 }} />
      )}

      {/* From / To picker */}
      <div className="tr-grid">
        <div>
          <div style={{ position: 'relative' }}>
            <button
              className="tr-select"
              onClick={() => {
                setToOpen(false)
                setFromOpen((v) => !v)
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fromLabel}
              </span>
              <Chevron />
            </button>
            {fromOpen && (
              <div className="dd-menu" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {INPUT_LANGS.map((l) => (
                  <button
                    key={l.id}
                    className="dd-item"
                    onClick={() => {
                      setInputLang(l.id)
                      setFromOpen(false)
                    }}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="tr-swap"
          onClick={swapLangs}
          title="Swap From ⇄ To"
          aria-label="Swap the From and To languages"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>

        <div>
          <div style={{ position: 'relative' }}>
            <button
              className="tr-select"
              onClick={() => {
                setFromOpen(false)
                setToOpen((v) => !v)
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dest.flag} {dest.name}
              </span>
              <Chevron />
            </button>
            {toOpen && (
              <div className="dd-menu" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    className="dd-item"
                    onClick={() => {
                      onCountry(c.code)
                      setToOpen(false)
                    }}
                  >
                    {c.flag} {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* sub-tabs — equal width, fit to phone */}
      <div className="subtab-row">
        <button className={`subtab ${sub === 'translate' ? 'on' : ''}`} onClick={() => setSub('translate')}>
          <span className="subtab-lbl">Translate</span>
        </button>
        <button className={`subtab ${sub === 'phrases' ? 'on' : ''}`} onClick={() => setSub('phrases')}>
          <span className="subtab-lbl">Phrases</span>
        </button>
        <button className={`subtab ${sub === 'words' ? 'on' : ''}`} onClick={() => setSub('words')}>
          <span className="subtab-lbl">Words</span>
        </button>
        <button className={`subtab ${sub === 'script' ? 'on' : ''}`} onClick={() => setSub('script')}>
          <span className="subtab-lbl">Script</span>
        </button>
        <button className={`subtab ${sub === 'live' ? 'on' : ''}`} onClick={() => setSub('live')}>
          <span className="subtab-lbl">Live{liveOn && <span className="live-dot" />}</span>
        </button>
      </div>

      {/* ---------- TRANSLATE ---------- */}
      {sub === 'translate' && (
        <div>
          <div className="tr-in">
            <textarea
              ref={textRef}
              rows={3}
              placeholder={inputById(inputLang).lang === 'ko' ? '예: 사워도우 한 덩어리 주세요' : 'e.g. One sourdough loaf, please'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="tr-in-foot">
              <span className="st">
                {pasteMsg ||
                  (status === 'loading'
                    ? 'Translating…'
                    : text.trim()
                      ? 'Translating as you type'
                      : '')}
              </span>
              <button className="tr-textbtn" onClick={paste}>Paste</button>
              {voiceOk && (
                <button
                  className={`tr-iconbtn${listening ? ' on' : ''}`}
                  onClick={isIOS ? iosKeyboardMic : toggleMic}
                  title={isIOS ? 'Use the keyboard mic' : 'Speak'}
                  aria-label="Speak instead of typing"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
                </button>
              )}
              {text && (
                <button className="tr-iconbtn" onClick={() => setText('')} aria-label="Clear">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              )}
            </div>
          </div>

          {!voiceOk && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Voice input isn’t available in this browser — typing works perfectly.
            </p>
          )}
          {voiceOk && micMsg && (
            <p style={{ fontSize: 12.5, fontWeight: 600, color: listening ? 'var(--accent)' : 'var(--soft)', margin: '10px 2px 0' }}>
              {micMsg}
            </p>
          )}
          {isIOS && !micMsg && !listening && (
            <p className="muted" style={{ fontSize: 12, lineHeight: 1.5, margin: '10px 2px 0' }}>
              📱 On iPhone, tap 🎤 to open the keyboard, then its <strong>mic key</strong> to speak.
              First switch the keyboard (🌐 globe key) to match your <strong>From</strong> language —
              dictation follows the keyboard, not the From box.
            </p>
          )}

          {output && (
            <div className="tr-out" style={{ opacity: status === 'loading' ? 0.55 : 1 }}>
              <div className="top">
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Say where it came from: this one was checked by hand, so
                      it is not the machine's guess at a ritual phrase. */}
                  {source === 'phrasebook' && <div className="tr-tag">Checked phrase</div>}
                  <div className="dst">{output}</div>
                  {/* The line that makes a translation usable out loud. Empty for
                      French or Spanish, which you can already read. */}
                  {reading && <div className="rom">{reading}</div>}
                </div>
                <button className="say" onClick={speakOut} aria-label="Play it aloud">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M17.5 8.5a5 5 0 010 7" /></svg>
                </button>
              </div>
              <div className="tr-out-btns">
                <button className="tr-out-btn" onClick={copyOut}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M15 5H6a2 2 0 00-2 2v9" /></svg>
                  {copyMsg || 'Copy'}
                </button>
                <button className="tr-out-btn" onClick={() => setShowBig(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" /></svg>
                  Show big
                </button>
              </div>
            </div>
          )}

          {/* MyMemory silently echoes the input when the From language is wrong —
              catch that (output === input across two different languages) and nudge. */}
          {status === 'done' && !source && output && output.trim() === submitted.trim() &&
            inputById(inputLang).lang !== dest.lang && (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '10px 2px 0' }}>
              ⚠️ Came back unchanged — check the <strong>From</strong> language matches what you typed
              (e.g. set From to 🇰🇷 한국어 for Korean).
            </p>
          )}
          {status === 'error' && (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '14px 2px 0' }}>
              Couldn’t reach the translator — no internet? Try the <strong>Phrasebook</strong> tab; those work offline.
            </p>
          )}
        </div>
      )}

      {/* auto-translation note for non-curated languages */}
      {!isCurated && (sub === 'phrases' || sub === 'words') && (
        <p className="muted" style={{ fontSize: 12, margin: '12px 2px 0' }}>
          {autoLoading
            ? `Auto-translating to ${dest.name}…`
            : auto[dest.lang]
              ? `✨ Auto-translated to ${dest.name} (saved offline)`
              : `Showing English — connect to translate to ${dest.name}.`}
        </p>
      )}

      {/* ---------- PHRASEBOOK ---------- */}
      {sub === 'phrases' && (
        <div style={{ marginTop: 8 }}>
          {PHRASES.map((p, i) => {
            const dst = phraseText(p, i)
            return (
              <div key={i} className="phrase">
                <div className="txt">
                  <div className="src">{p.en} · {p.ko}</div>
                  <div className="dst">{dst}</div>
                </div>
                <Speak onClick={() => speak(dst, dest.bcp)} color="#5B3FD6" />
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- BREAD WORDS ---------- */}
      {sub === 'words' && (
        <div style={{ marginTop: 8 }}>
          {GLOSSARY.map((w, i) => {
            const dst = wordText(w, i)
            return (
              <div key={i} className="phrase">
                <div className="txt">
                  <div className="src">{w.emoji} {w.en}</div>
                  <div className="dst">{dst}</div>
                </div>
                <Speak onClick={() => speak(dst, dest.bcp)} color="#E0218A" />
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- LIVE (meeting captions) ---------- */}
      {sub === 'live' && (
        <div style={{ marginTop: 14 }}>
          {!voiceOk || isIOS ? (
            <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: '4px 2px 0' }}>
              Live captions need a computer — open bready in <strong>Chrome on your Mac</strong>.
              (iPhone can’t keep the mic open for a whole call.)
            </p>
          ) : (
            <>
              <button className={`live-toggle${liveOn ? ' on' : ''}`} onClick={liveOn ? stopLive : () => startLive()}>
                {liveOn ? '■  Stop listening' : '●  Start listening'}
              </button>

              <div className="live-tools">
                {!liveOn && systemCaptureSupported() && (
                  <button className="btn outline row live-float" onClick={startZoomCapture}>
                    🎧 Caption Zoom audio (beta)
                  </button>
                )}
                {pipSupported() && (
                  <button className="btn outline row live-float" onClick={openPip} disabled={pipOn}>
                    {pipOn ? 'Floating window open' : 'Float over Zoom ↗'}
                  </button>
                )}
                {liveLines.length > 0 && (
                  <>
                    <button className="btn outline row" onClick={copyLive}>Copy all</button>
                    <button className="btn outline row" onClick={downloadLive}>Download .txt</button>
                    <button className="btn ghost row" onClick={clearLive}>Clear</button>
                  </>
                )}
              </div>

              {liveMsg && (
                <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--soft)', margin: '10px 2px 0', lineHeight: 1.5 }}>
                  {liveMsg}
                </p>
              )}

              <div className="live-box" ref={liveBoxRef}>
                {liveLines.length === 0 && !liveInterim && (
                  <p className="muted" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {liveOn
                      ? 'Listening… captions appear here as people speak.'
                      : 'Press Start, then everything the mic hears is written here — and kept, even through a reload.'}
                  </p>
                )}
                {liveLines.map((l, i) => (
                  <div key={i} className="live-line">
                    <span className="t">{liveStamp(l.ts)}</span>
                    {l.text}
                  </div>
                ))}
                {liveInterim && <div className="live-interim">{liveInterim}</div>}
              </div>

              <p className="muted" style={{ fontSize: 12, lineHeight: 1.6, margin: '12px 2px 0' }}>
                🔊 🎧 For a Zoom call, use <strong>Caption Zoom audio</strong> — it listens to the
                call itself, so earphones are fine. (<strong>Start listening</strong> uses the mic:
                good for in-person rooms and dictation.) Captions pause on long silences and restart
                on their own; a word can slip at the seam.
              </p>
            </>
          )}
        </div>
      )}

      {/* ---------- SCRIPT (saved translations) ---------- */}
      {sub === 'script' && (
        <div style={{ marginTop: 14 }}>
          {script.length === 0 ? (
            <p className="muted" style={{ fontSize: 13, margin: '8px 2px 0', lineHeight: 1.55 }}>
              Nothing saved yet. Every translation you make gets kept here — copy it or download the whole thing as a text file.
            </p>
          ) : (
            <>
              <div className="script-tools">
                <button className="btn outline row" onClick={copyScript}>Copy all</button>
                <button className="btn outline row" onClick={downloadScript}>Download .txt</button>
                <button className="btn ghost row" onClick={clearScript}>Clear</button>
              </div>
              {script.map((s, i) => (
                <div key={i} className="script-row">
                  <div className="langs">{s.fromLang} → {s.toLang}</div>
                  <div className="s">{s.source}</div>
                  <div className="t">{s.translated}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </main>
  )
}
