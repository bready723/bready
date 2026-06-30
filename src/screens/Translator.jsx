import { useRef, useState } from 'react'
import { COUNTRIES, countryByCode, PHRASES, GLOSSARY } from '../lib/phrasebook.js'
import {
  speak,
  translateText,
  detectSource,
  speechRecognitionSupported,
  startListening,
} from '../lib/translate.js'

export default function Translator({ country, onCountry }) {
  const dest = countryByCode(country)
  const [sub, setSub] = useState('translate')
  const [inputLang, setInputLang] = useState('en') // what Sara speaks/types
  const [text, setText] = useState('')
  const [output, setOutput] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const reqRef = useRef(0) // guards against out-of-order translation responses

  const voiceOk = !!speechRecognitionSupported()

  async function doTranslate(value) {
    const phrase = (value ?? text).trim()
    if (!phrase) return
    const myReq = ++reqRef.current
    setStatus('loading')
    setOutput('')
    try {
      // Auto-detect Korean vs English from the text itself, so a wrong toggle
      // setting can't silently mistranslate (the input toggle now only drives
      // which language the mic listens for).
      const out = await translateText(phrase, dest.lang)
      if (myReq !== reqRef.current) return // a newer request already superseded this
      setOutput(out)
      setStatus('done')
      speak(out, dest.bcp)
    } catch (e) {
      if (myReq !== reqRef.current) return
      setStatus('error')
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current && recRef.current.stop()
      setListening(false)
      return
    }
    setListening(true)
    recRef.current = startListening({
      lang: inputLang === 'ko' ? 'ko-KR' : 'en-US',
      onResult: (said) => {
        setText(said)
        doTranslate(said)
      },
      onError: () => {
        setListening(false)
        setStatus('idle')
      },
      onEnd: () => setListening(false),
    })
  }

  return (
    <main className="screen">
      <h1 className="title">Translator 🌍</h1>
      <p className="subtitle">Order bread with confidence — anywhere.</p>

      {/* country / target language picker */}
      <div className="chips" style={{ marginBottom: 16, flexWrap: 'nowrap', overflowX: 'auto' }}>
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            className={`chip ${c.code === country ? 'on' : ''}`}
            style={{ flex: '0 0 auto' }}
            onClick={() => onCountry(c.code)}
          >
            {c.flag} {c.name}
          </button>
        ))}
      </div>

      {/* sub-tabs */}
      <div className="chips" style={{ marginBottom: 16 }}>
        {[
          ['translate', '💬 Translate'],
          ['phrases', '📖 Phrasebook'],
          ['words', '🥐 Bread words'],
        ].map(([k, label]) => (
          <button key={k} className={`chip ${sub === k ? 'on' : ''}`} onClick={() => setSub(k)}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------- TRANSLATE ---------- */}
      {sub === 'translate' && (
        <div>
          <div className="chips" style={{ marginBottom: 10 }}>
            <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>
              I'll say it in:
            </span>
            <button className={`chip ${inputLang === 'en' ? 'on' : ''}`} onClick={() => setInputLang('en')}>
              English
            </button>
            <button className={`chip ${inputLang === 'ko' ? 'on' : ''}`} onClick={() => setInputLang('ko')}>
              한국어
            </button>
          </div>

          <textarea
            className="input"
            style={{ minHeight: 84 }}
            placeholder={inputLang === 'ko' ? '예: 사워도우 한 덩어리 주세요' : 'e.g. One sourdough loaf, please'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button className="btn" onClick={() => doTranslate()} disabled={!text.trim() || status === 'loading'}>
              {status === 'loading' ? 'Translating…' : `Translate → ${dest.flag}`}
            </button>
            {voiceOk && (
              <button
                className="btn ghost"
                style={{ width: 64, fontSize: 22, color: listening ? '#e0218a' : undefined }}
                onClick={toggleMic}
                title="Speak"
              >
                {listening ? '🔴' : '🎤'}
              </button>
            )}
          </div>
          {!voiceOk && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              🎤 Voice input isn’t available in this browser — typing works perfectly.
            </p>
          )}

          {status === 'done' && output && (
            <div className="phrase" style={{ marginTop: 16 }}>
              <div className="txt">
                <div className="src">{text}</div>
                <div className="dst">{output}</div>
              </div>
              <button className="speak" onClick={() => speak(output, dest.bcp)}>
                🔊
              </button>
            </div>
          )}
          {status === 'error' && (
            <div className="card" style={{ marginTop: 16 }}>
              <strong>Couldn’t reach the translator.</strong>
              <p className="muted" style={{ margin: '6px 0 0' }}>
                No internet? Try the <strong>Phrasebook</strong> tab — those work offline.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ---------- PHRASEBOOK ---------- */}
      {sub === 'phrases' && (
        <div>
          {PHRASES.map((p, i) => {
            const dst = p.t[dest.lang] || p.en
            return (
              <div key={i} className="phrase">
                <div className="txt">
                  <div className="src">
                    {p.en} · {p.ko}
                  </div>
                  <div className="dst">{dst}</div>
                </div>
                <button className="speak" onClick={() => speak(dst, dest.bcp)}>
                  🔊
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- BREAD WORDS ---------- */}
      {sub === 'words' && (
        <div>
          {GLOSSARY.map((w, i) => {
            const dst = w.t[dest.lang] || w.en
            return (
              <div key={i} className="phrase">
                <div className="txt">
                  <div className="src">
                    {w.emoji} {w.en}
                  </div>
                  <div className="dst">{dst}</div>
                </div>
                <button className="speak" onClick={() => speak(dst, dest.bcp)}>
                  🔊
                </button>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
