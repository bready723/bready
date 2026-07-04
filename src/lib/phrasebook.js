// Countries bready supports (sets the target language). The first 8 have a
// hand-curated offline phrasebook; the rest auto-translate on first use and
// cache, so every language still works.
export const COUNTRIES = [
  { code: 'FR', flag: '🇫🇷', name: 'France', lang: 'fr', bcp: 'fr-FR' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', lang: 'ja', bcp: 'ja-JP' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', lang: 'it', bcp: 'it-IT' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', lang: 'es', bcp: 'es-ES' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', lang: 'de', bcp: 'de-DE' },
  // Chinese: same written characters, different spoken voice.
  { code: 'CN', flag: '🇨🇳', name: '中文 (Mandarin)', lang: 'zh', bcp: 'zh-CN' },
  { code: 'HK', flag: '🇭🇰', name: '廣東話 (Cantonese)', lang: 'zh', bcp: 'zh-HK' },
  { code: 'KR', flag: '🇰🇷', name: 'Korea', lang: 'ko', bcp: 'ko-KR' },
  { code: 'US', flag: '🇺🇸', name: 'USA', lang: 'en', bcp: 'en-US' },
  // --- auto-translated languages ---
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', lang: 'pt', bcp: 'pt-BR' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', lang: 'nl', bcp: 'nl-NL' },
  { code: 'TR', flag: '🇹🇷', name: 'Türkiye', lang: 'tr', bcp: 'tr-TR' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', lang: 'vi', bcp: 'vi-VN' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', lang: 'th', bcp: 'th-TH' },
  { code: 'SA', flag: '🇸🇦', name: 'Arabic', lang: 'ar', bcp: 'ar-SA' },
  { code: 'IN', flag: '🇮🇳', name: 'India', lang: 'hi', bcp: 'hi-IN' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', lang: 'pl', bcp: 'pl-PL' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', lang: 'sv', bcp: 'sv-SE' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece', lang: 'el', bcp: 'el-GR' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', lang: 'ru', bcp: 'ru-RU' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', lang: 'id', bcp: 'id-ID' },
  { code: 'DK', flag: '🇩🇰', name: 'Denmark', lang: 'da', bcp: 'da-DK' },
  { code: 'NO', flag: '🇳🇴', name: 'Norway', lang: 'no', bcp: 'nb-NO' },
  { code: 'FI', flag: '🇫🇮', name: 'Finland', lang: 'fi', bcp: 'fi-FI' },
  { code: 'CZ', flag: '🇨🇿', name: 'Czechia', lang: 'cs', bcp: 'cs-CZ' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraine', lang: 'uk', bcp: 'uk-UA' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', lang: 'tl', bcp: 'tl-PH' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', lang: 'ms', bcp: 'ms-MY' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', lang: 'pt', bcp: 'pt-PT' },
]

// Languages with a hand-curated offline phrasebook (the rest auto-translate).
export const CURATED_LANGS = new Set(['fr', 'ja', 'it', 'es', 'de', 'zh', 'ko', 'en'])

// Input ("From") languages — what Sara speaks/types. Kept balanced with the
// "To" list (both ≥10), each with a flag. `id` is unique (Mandarin vs Cantonese
// share lang 'zh' but differ by voice); `lang` is the translation source code;
// `bcp` drives the voice-input recognizer.
export const INPUT_LANGS = [
  { id: 'en', lang: 'en', label: 'English', flag: '🇺🇸', bcp: 'en-US' },
  { id: 'ko', lang: 'ko', label: '한국어', flag: '🇰🇷', bcp: 'ko-KR' },
  { id: 'ja', lang: 'ja', label: '日本語', flag: '🇯🇵', bcp: 'ja-JP' },
  { id: 'zh-CN', lang: 'zh', label: '中文 (Mandarin)', flag: '🇨🇳', bcp: 'zh-CN' },
  { id: 'zh-HK', lang: 'zh', label: '廣東話 (Cantonese)', flag: '🇭🇰', bcp: 'zh-HK' },
  { id: 'fr', lang: 'fr', label: 'Français', flag: '🇫🇷', bcp: 'fr-FR' },
  { id: 'es', lang: 'es', label: 'Español', flag: '🇪🇸', bcp: 'es-ES' },
  { id: 'it', lang: 'it', label: 'Italiano', flag: '🇮🇹', bcp: 'it-IT' },
  { id: 'de', lang: 'de', label: 'Deutsch', flag: '🇩🇪', bcp: 'de-DE' },
  { id: 'pt', lang: 'pt', label: 'Português', flag: '🇵🇹', bcp: 'pt-PT' },
  { id: 'vi', lang: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', bcp: 'vi-VN' },
  { id: 'th', lang: 'th', label: 'ไทย', flag: '🇹🇭', bcp: 'th-TH' },
  { id: 'ru', lang: 'ru', label: 'Русский', flag: '🇷🇺', bcp: 'ru-RU' },
]

export const inputById = (id) => INPUT_LANGS.find((l) => l.id === id) || INPUT_LANGS[0]

export const countryByCode = (code) => COUNTRIES.find((c) => c.code === code) || COUNTRIES[0]

// Flip From ⇄ To for the "swap" button. Match by `bcp` first so Mandarin
// (zh-CN) and Cantonese (zh-HK) don't collapse into each other, then fall back
// to `lang`. `newFrom` is null when the current To has no spoken-input entry
// (only the ~13 INPUT_LANGS can be a spoken From); `newTo` always resolves since
// every input language maps to a country.
export function flipLangs(fromId, toCode) {
  const fromCur = inputById(fromId)
  const toCur = countryByCode(toCode)
  const newFrom =
    INPUT_LANGS.find((l) => l.bcp === toCur.bcp) ||
    INPUT_LANGS.find((l) => l.lang === toCur.lang) ||
    null
  const newTo =
    COUNTRIES.find((c) => c.bcp === fromCur.bcp) ||
    COUNTRIES.find((c) => c.lang === fromCur.lang) ||
    null
  return { newFrom, newTo }
}

// Curated bakery phrases — work offline, no API needed. `ko` is shown as Sara's
// reference; `t[lang]` is what she shows/plays at the counter.
export const PHRASES = [
  {
    en: 'Hello!',
    ko: '안녕하세요!',
    t: { fr: 'Bonjour !', ja: 'こんにちは！', it: 'Buongiorno!', es: '¡Hola!', de: 'Hallo!', zh: '你好！', ko: '안녕하세요!', en: 'Hello!' },
  },
  {
    en: 'Do you have fresh croissants?',
    ko: '갓 구운 크루아상 있나요?',
    t: { fr: 'Avez-vous des croissants frais ?', ja: '焼きたてのクロワッサンはありますか？', it: 'Avete dei cornetti freschi?', es: '¿Tienen cruasanes frescos?', de: 'Haben Sie frische Croissants?', zh: '有新鲜的可颂吗？', ko: '갓 구운 크루아상 있나요?', en: 'Do you have fresh croissants?' },
  },
  {
    en: 'One sourdough loaf, please.',
    ko: '사워도우 한 덩어리 주세요.',
    t: { fr: 'Un pain au levain, s’il vous plaît.', ja: 'サワードウのパンを一つください。', it: 'Una pagnotta a lievito madre, per favore.', es: 'Una hogaza de masa madre, por favor.', de: 'Ein Sauerteigbrot, bitte.', zh: '请给我一个酸面包。', ko: '사워도우 한 덩어리 주세요.', en: 'One sourdough loaf, please.' },
  },
  {
    en: 'What time is the next bake?',
    ko: '다음 빵은 몇 시에 나오나요?',
    t: { fr: 'À quelle heure est la prochaine fournée ?', ja: '次に焼き上がるのは何時ですか？', it: 'A che ora è la prossima infornata?', es: '¿A qué hora es la próxima horneada?', de: 'Wann kommt die nächste Charge aus dem Ofen?', zh: '下一炉几点出炉？', ko: '다음 빵은 몇 시에 나오나요?', en: 'What time is the next bake?' },
  },
  {
    en: 'What do you recommend?',
    ko: '무엇을 추천하시나요?',
    t: { fr: 'Que recommandez-vous ?', ja: 'おすすめは何ですか？', it: 'Cosa mi consiglia?', es: '¿Qué me recomienda?', de: 'Was empfehlen Sie?', zh: '你推荐什么？', ko: '무엇을 추천하시나요?', en: 'What do you recommend?' },
  },
  {
    en: 'Is this baked fresh today?',
    ko: '오늘 구운 건가요?',
    t: { fr: 'Est-ce que c’est cuit du jour ?', ja: 'これは今日焼いたものですか？', it: 'È sfornato oggi?', es: '¿Esto es recién horneado hoy?', de: 'Ist das heute frisch gebacken?', zh: '这是今天新鲜烤的吗？', ko: '오늘 구운 건가요?', en: 'Is this baked fresh today?' },
  },
  {
    en: 'How much is this?',
    ko: '이거 얼마예요?',
    t: { fr: 'Combien ça coûte ?', ja: 'これはいくらですか？', it: 'Quanto costa?', es: '¿Cuánto cuesta?', de: 'Was kostet das?', zh: '这个多少钱？', ko: '이거 얼마예요?', en: 'How much is this?' },
  },
  {
    en: 'Thank you, it looks delicious!',
    ko: '감사합니다, 맛있어 보여요!',
    t: { fr: 'Merci, ça a l’air délicieux !', ja: 'ありがとう、美味しそう！', it: 'Grazie, sembra delizioso!', es: '¡Gracias, se ve delicioso!', de: 'Danke, das sieht köstlich aus!', zh: '谢谢，看起来很好吃！', ko: '감사합니다, 맛있어 보여요!', en: 'Thank you, it looks delicious!' },
  },
]

// Bread/baking words across languages — a quick reference glossary.
export const GLOSSARY = [
  { en: 'Croissant', emoji: '🥐', t: { fr: 'Croissant', ja: 'クロワッサン', it: 'Cornetto', es: 'Cruasán', de: 'Croissant', zh: '可颂', ko: '크루아상', en: 'Croissant' } },
  { en: 'Sourdough', emoji: '🥖', t: { fr: 'Levain', ja: 'サワードウ', it: 'Lievito madre', es: 'Masa madre', de: 'Sauerteig', zh: '酸面团', ko: '사워도우', en: 'Sourdough' } },
  { en: 'Bagel', emoji: '🥯', t: { fr: 'Bagel', ja: 'ベーグル', it: 'Bagel', es: 'Bagel', de: 'Bagel', zh: '贝果', ko: '베이글', en: 'Bagel' } },
  { en: 'Bread', emoji: '🍞', t: { fr: 'Pain', ja: 'パン', it: 'Pane', es: 'Pan', de: 'Brot', zh: '面包', ko: '빵', en: 'Bread' } },
  { en: 'Pastry', emoji: '🧁', t: { fr: 'Viennoiserie', ja: 'ペストリー', it: 'Pasticceria', es: 'Bollería', de: 'Gebäck', zh: '糕点', ko: '페이스트리', en: 'Pastry' } },
  { en: 'Baguette', emoji: '🥖', t: { fr: 'Baguette', ja: 'バゲット', it: 'Baguette', es: 'Baguette', de: 'Baguette', zh: '法棍', ko: '바게트', en: 'Baguette' } },
  { en: 'Fresh', emoji: '✨', t: { fr: 'Frais', ja: '焼きたて', it: 'Fresco', es: 'Fresco', de: 'Frisch', zh: '新鲜', ko: '신선한', en: 'Fresh' } },
  { en: 'Gluten-free', emoji: '🌾', t: { fr: 'Sans gluten', ja: 'グルテンフリー', it: 'Senza glutine', es: 'Sin gluten', de: 'Glutenfrei', zh: '无麸质', ko: '글루텐 프리', en: 'Gluten-free' } },
]
