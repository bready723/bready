import { useEffect, useRef, useState } from 'react'
import { COUNTRIES, countryByCode, CURATED_LANGS, PHRASES, GLOSSARY } from '../lib/phrasebook.js'
import {
  speak,
  translateText,
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
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [listening, setListening] = useState(false)
  const [auto, setAuto] = useState(loadAuto)
  const [autoLoading, setAutoLoading] = useState(false)
  const [micMsg, setMicMsg] = useState('')
  const recRef = useRef(null)
  const micTimer = useRef(null)
  const reqRef = useRef(0)

  const isCurated = CURATED_LANGS.has(dest.lang)
  const fromLabel = inputLang === 'ko' ? '한국어' : 'English'

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

  async function doTranslate(value) {
    const phrase = (value ?? text).trim()
    if (!phrase) return
    const myReq = ++reqRef.current
    setStatus('loading')
    setOutput('')
    try {
      const out = await translateText(phrase, dest.lang)
      if (myReq !== reqRef.current) return
      setOutput(out)
      setStatus('done')
      speak(out, dest.bcp)
    } catch (e) {
      if (myReq !== reqRef.current) return
      setStatus('error')
    }
  }

  function stopMicTimer() {
    if (micTimer.current) {
      clearTimeout(micTimer.current)
      micTimer.current = null
    }
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
      lang: inputLang === 'ko' ? 'ko-KR' : 'en-US',
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
    micTimer.current = setTimeout(() => {
      recRef.current && recRef.current.stop()
    }, 8000)
  }

  const anyDdOpen = fromOpen || toOpen
  const closeDd = () => {
    setFromOpen(false)
    setToOpen(false)
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
          <div className="label" style={{ margin: '0 0 8px' }}>From</div>
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
              <div className="dd-menu">
                {[['en', 'English'], ['ko', '한국어']].map(([v, label]) => (
                  <button
                    key={v}
                    className="dd-item"
                    onClick={() => {
                      setInputLang(v)
                      setFromOpen(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="tr-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16M14 6l6 6-6 6" />
          </svg>
        </div>

        <div>
          <div className="label" style={{ margin: '0 0 8px' }}>To</div>
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

      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className={`subtab ${sub === 'translate' ? 'on' : ''}`} onClick={() => setSub('translate')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17V6a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2H9l-5 4z" /></svg>
          Translate
        </button>
        <button className={`subtab ${sub === 'phrases' ? 'on' : ''}`} onClick={() => setSub('phrases')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
          Phrasebook
        </button>
        <button className={`subtab ${sub === 'words' ? 'on' : ''}`} onClick={() => setSub('words')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15a8 7 0 0116 0v3H4v-3z" /><path d="M9 11.2l-1.2 1.8M13.2 10.6L12 12.4M17 11.6l-1.2 1.8" /></svg>
          Bread words
        </button>
      </div>

      {/* ---------- TRANSLATE ---------- */}
      {sub === 'translate' && (
        <div>
          <textarea
            className="input"
            style={{ marginTop: 18 }}
            placeholder={inputLang === 'ko' ? '예: 사워도우 한 덩어리 주세요' : 'e.g. One sourdough loaf, please'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              className="btn"
              style={{ flex: 1 }}
              onClick={() => doTranslate()}
              disabled={!text.trim() || status === 'loading'}
            >
              {status === 'loading' ? 'Translating…' : `Translate → ${dest.flag}`}
            </button>
            {voiceOk && (
              <button
                onClick={toggleMic}
                title="Speak"
                style={{
                  width: 48,
                  borderRadius: 10,
                  border: `1px solid ${listening ? 'var(--accent)' : 'var(--line-2)'}`,
                  background: listening ? 'var(--accent-tint)' : 'var(--surface)',
                  color: listening ? 'var(--accent)' : 'var(--soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0" /><path d="M12 18v3" /></svg>
              </button>
            )}
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

          {status === 'done' && output && (
            <div className="phrase" style={{ marginTop: 16 }}>
              <div className="txt">
                <div className="src">{text}</div>
                <div className="dst">{output}</div>
              </div>
              <Speak onClick={() => speak(output, dest.bcp)} color="#1D5BCE" />
            </div>
          )}
          {status === 'error' && (
            <p className="muted" style={{ fontSize: 12.5, lineHeight: 1.55, margin: '14px 2px 0' }}>
              Couldn’t reach the translator — no internet? Try the <strong>Phrasebook</strong> tab; those work offline.
            </p>
          )}
        </div>
      )}

      {/* auto-translation note for non-curated languages */}
      {!isCurated && sub !== 'translate' && (
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
    </main>
  )
}
