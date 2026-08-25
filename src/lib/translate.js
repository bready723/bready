// Browser-native speech + a free translation API. No keys, no cost.
import { lookupSetPhrase } from './phrasebook.js'

// Voices load asynchronously — getVoices() is often empty on the first call,
// so we warm a cache up front and refresh it when the browser fires the event.
// Without this, the very first phrase plays in the default (usually English)
// voice instead of the target language.
let _voices = []
function loadVoices() {
  try {
    _voices = window.speechSynthesis.getVoices() || []
  } catch (e) {
    _voices = []
  }
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}

// --- Play a phrase aloud (well supported, even on iPhone Safari) ---
export function speak(text, bcpLang) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return false
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = bcpLang
    u.rate = 0.92
    // Prefer a voice that matches the language if one is installed. Match the
    // FULL tag first (e.g. zh-HK → Cantonese/Sinji), then fall back to the
    // 2-letter prefix — otherwise "zh-HK" grabbed the first "zh" (Mandarin) voice
    // and Cantonese always came out sounding like Mandarin.
    const voices = _voices.length ? _voices : synth.getVoices()
    const want = bcpLang.toLowerCase()
    const prefix = want.slice(0, 2)
    const match =
      voices.find((v) => v.lang && v.lang.toLowerCase() === want) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(prefix))
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

// Map an app language code — a plain code ('zh', 'ja') OR a BCP tag ('zh-HK',
// 'ja-JP') — to the code each provider wants.
//
// Cantonese is its own language, not Chinese in a different script. This used
// to send zh-HK as zh-TW, which returns Mandarin written in traditional
// characters: "這個麵包多少錢?" — correct Chinese, and not something a Hong
// Konger would say. The real thing is `yue`: "呢個麵包幾錢?" — 呢個 not 這個,
// 幾錢 not 多少錢. Sara spotted it; the old comment here confidently explained
// the wrong behaviour as a fix.
//
// MyMemory has no Cantonese at all, so the fallback can only offer traditional
// Chinese. It is a fallback, and it says so.
export function targetCodes(code) {
  const t = (code || '').toLowerCase()
  if (t === 'zh-hk' || t === 'yue') return { google: 'yue', mymemory: 'zh-TW' }
  if (t === 'zh-tw') return { google: 'zh-TW', mymemory: 'zh-TW' }
  if (t === 'zh-cn' || t === 'zh') return { google: 'zh-CN', mymemory: 'zh-CN' }
  const two = t.slice(0, 2)
  return { google: two, mymemory: two }
}

// Pull the translation AND its pronunciation out of a gtx response.
//
// Shape observed against the live endpoint (not guessed): data[0] is a list of
// chunks. A normal chunk is [translated, original, …]. When `dt=rm` is asked
// for, one extra chunk rides at the end with both of those slots null:
//   [null, null, "<how the TRANSLATION sounds>", "<how the SOURCE sounds>"]
// A target written in Latin script (French, Spanish) has no such chunk at all,
// which is why `reading` has to be allowed to come back empty.
export function parseGoogle(data) {
  const chunks = (data && data[0]) || []
  let text = ''
  let reading = ''
  for (const seg of chunks) {
    if (!Array.isArray(seg)) continue
    if (seg[0] == null && seg[1] == null) {
      if (typeof seg[2] === 'string') reading = seg[2]
    } else if (typeof seg[0] === 'string') {
      text += seg[0]
    }
  }
  return { text, reading }
}

// Google's keyless "gtx" endpoint — far more reliable than MyMemory and
// CORS-open (access-control-allow-origin: *), so it works from the browser.
async function googleTranslate(text, tl, sl) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    encodeURIComponent(sl) +
    '&tl=' +
    encodeURIComponent(tl) +
    '&dt=t&dt=rm&q=' +
    encodeURIComponent(text)
  const res = await fetch(url)
  if (!res.ok) throw new Error('google http')
  const parsed = parseGoogle(await res.json())
  if (!parsed.text) throw new Error('google empty')
  return parsed
}

// MyMemory fallback (also keyless). On quota/failure it silently ECHOES the
// input, so a warning marker or an unchanged echo counts as a failure — that's
// the root cause of "Korean came back unchanged": MyMemory was rate-limited.
async function myMemoryTranslate(text, tl, sl) {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text) +
    '&langpair=' +
    encodeURIComponent(`${sl}|${tl}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error('mymemory http')
  const data = await res.json()
  const status = Number(data?.responseStatus)
  const out = data?.responseData?.translatedText
  if (status && status !== 200) throw new Error('mymemory status')
  if (!out || /MYMEMORY WARNING|INVALID|PLEASE SELECT/i.test(out)) {
    throw new Error('mymemory warning')
  }
  // MyMemory has no transliteration, so a fallback answer simply has no
  // pronunciation line. Better than showing a wrong one.
  return { text: out, reading: '' }
}

// --- Free translation: Google gtx first, MyMemory as backup. No API keys. ---
//
// Returns { text, reading }. `reading` is how to SAY the translation — the one
// thing a printed script cannot give you when the answer is in an alphabet you
// cannot read. Empty whenever the target is already in Latin script, or when
// the fallback provider answered.
export async function translateDetailed(text, targetLang, sourceLang) {
  if (!text.trim()) return { text: '', reading: '' }
  const src = sourceLang || detectSource(text)
  const sl = src.slice(0, 2)
  const { google, mymemory } = targetCodes(targetLang)
  // A Korean set phrase is answered from the hand-checked table, not the
  // machine — 잘 먹었습니다 comes back from Google as "Well done!". Only the
  // phrases in that table are diverted; everything else carries on as before.
  if (sl === 'ko') {
    const known = lookupSetPhrase(text, targetLang)
    if (known) return { ...known, source: 'phrasebook' }
  }
  // Same language in and out — nothing to do. zh and yue are excluded: zh→zh
  // still switches script, and zh→yue is a real translation.
  if (sl === google.slice(0, 2) && !/^zh/.test(google) && google !== 'yue') {
    return { text, reading: '' }
  }
  try {
    return await googleTranslate(text, google, sl)
  } catch (e) {
    return await myMemoryTranslate(text, mymemory, src)
  }
}

// The plain-string form every other caller already uses.
export async function translateText(text, targetLang, sourceLang) {
  const { text: out } = await translateDetailed(text, targetLang, sourceLang)
  return out
}

// --- Voice input (best-effort; unreliable on iOS, so callers must fall back) ---
export function speechRecognitionSupported() {
  return typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
}

// Human-readable reason for a recognition failure, so the UI can guide the user
// instead of silently doing nothing (the #1 "the mic doesn't work" complaint).
// We surface the RAW SpeechRecognition error code in every message so we can tell
// what's really happening instead of guessing — the codes look alike from outside.
export function micErrorMessage(err) {
  const code = (err && (err.error || err.message)) || 'unknown'
  const tag = ` (${code})` // the real reason, so we're never guessing again
  switch (code) {
    case 'not-allowed':
      // The SITE's own mic permission was denied/dismissed for THIS page.
      return `Mic access was denied for this page. On iPhone: tap "aA" in Safari's address bar → Website Settings → Microphone → Allow, then reload.${tag}`
    case 'service-not-allowed':
      // iOS Safari's in-app Web Speech API is broken — it throws this even when
      // system Dictation is ON. The reliable path is the KEYBOARD's own mic key
      // (native iOS Dictation), which bypasses the web API entirely.
      return `iPhone's in-app voice isn't available (an iOS Safari limit). Tap the text box, then the 🎤 on your keyboard to speak — it needs iOS Dictation on — or just type.${tag}`
    case 'no-speech':
      return `Didn't catch anything — try again, or just type it below.${tag}`
    case 'audio-capture':
      return `No microphone found on this device.${tag}`
    case 'network':
      return `Voice needs an internet connection. Type it instead.${tag}`
    case 'aborted':
      return `Voice input stopped. Tap the mic to try again, or type below.${tag}`
    case 'voice not supported':
      return `This browser's voice input is unavailable — typing always works.${tag}`
    default:
      return `Voice didn't work here — no problem, typing always works.${tag}`
  }
}

export function startListening({ lang = 'en-US', onResult, onError, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) {
    onError && onError(new Error('voice not supported'))
    return null
  }
  const rec = new Ctor()
  rec.lang = lang
  rec.continuous = false
  rec.interimResults = false
  rec.maxAlternatives = 1
  let got = false
  rec.onresult = (e) => {
    got = true
    const said = e.results?.[0]?.[0]?.transcript || ''
    onResult && onResult(said)
  }
  rec.onnomatch = () => onError && onError(new Error('no-speech'))
  rec.onerror = (e) => onError && onError(e)
  rec.onend = () => {
    if (!got) onEnd && onEnd(false) // ended without hearing anything
    else onEnd && onEnd(true)
  }
  try {
    rec.start()
  } catch (e) {
    onError && onError(e)
  }
  return rec
}
