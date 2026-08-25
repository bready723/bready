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
