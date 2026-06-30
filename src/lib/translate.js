// Browser-native speech + a free translation API. No keys, no cost.

// --- Play a phrase aloud (well supported, even on iPhone Safari) ---
export function speak(text, bcpLang) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return false
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = bcpLang
    u.rate = 0.92
    // Prefer a voice that matches the language if one is installed.
    const voices = synth.getVoices()
    const match = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(bcpLang.slice(0, 2)))
    if (match) u.voice = match
    synth.speak(u)
    return true
  } catch (e) {
    return false
  }
}

// Detect whether the typed/spoken input is Korean or English.
export function detectSource(text) {
  return /[가-힣]/.test(text) ? 'ko' : 'en'
}

// --- Free translation via MyMemory (no API key) ---
export async function translateText(text, targetLang, sourceLang) {
  const src = sourceLang || detectSource(text)
  if (!text.trim()) return ''
  if (src === targetLang) return text
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(`${src}|${targetLang}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error('translation service unavailable')
  const data = await res.json()
  const out = data?.responseData?.translatedText
  if (!out) throw new Error('no translation returned')
  return out
}

// --- Voice input (best-effort; unreliable on iOS, so callers must fall back) ---
export function speechRecognitionSupported() {
  return typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function startListening({ lang = 'en-US', onResult, onError, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) {
    onError && onError(new Error('voice not supported'))
    return null
  }
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.maxAlternatives = 1
  rec.onresult = (e) => {
    const said = e.results?.[0]?.[0]?.transcript || ''
    onResult && onResult(said)
  }
  rec.onerror = (e) => onError && onError(e)
  rec.onend = () => onEnd && onEnd()
  try {
    rec.start()
  } catch (e) {
    onError && onError(e)
  }
  return rec
}
