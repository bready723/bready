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
  { code: 'HK', flag: '🇭🇰', name: '廣東話 (Cantonese)', lang: 'yue', bcp: 'zh-HK' },
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
export const CURATED_LANGS = new Set(['fr', 'ja', 'it', 'es', 'de', 'zh', 'yue', 'ko', 'en'])

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
    t: { fr: 'Bonjour !', ja: 'こんにちは！', it: 'Buongiorno!', es: '¡Hola!', de: 'Hallo!', zh: '你好！', yue: '你好！', ko: '안녕하세요!', en: 'Hello!' },
  },
  {
    en: 'Do you have fresh croissants?',
    ko: '갓 구운 크루아상 있나요?',
    t: { fr: 'Avez-vous des croissants frais ?', ja: '焼きたてのクロワッサンはありますか？', it: 'Avete dei cornetti freschi?', es: '¿Tienen cruasanes frescos?', de: 'Haben Sie frische Croissants?', zh: '有新鲜的可颂吗？', yue: '有冇啱啱出爐嘅牛角包？', ko: '갓 구운 크루아상 있나요?', en: 'Do you have fresh croissants?' },
  },
  {
    en: 'One sourdough loaf, please.',
    ko: '사워도우 한 덩어리 주세요.',
    t: { fr: 'Un pain au levain, s’il vous plaît.', ja: 'サワードウのパンを一つください。', it: 'Una pagnotta a lievito madre, per favore.', es: 'Una hogaza de masa madre, por favor.', de: 'Ein Sauerteigbrot, bitte.', zh: '请给我一个酸面包。', yue: '唔該畀一個酸種包我。', ko: '사워도우 한 덩어리 주세요.', en: 'One sourdough loaf, please.' },
  },
  {
    en: 'What time is the next bake?',
    ko: '다음 빵은 몇 시에 나오나요?',
    t: { fr: 'À quelle heure est la prochaine fournée ?', ja: '次に焼き上がるのは何時ですか？', it: 'A che ora è la prossima infornata?', es: '¿A qué hora es la próxima horneada?', de: 'Wann kommt die nächste Charge aus dem Ofen?', zh: '下一炉几点出炉？', yue: '下一爐幾點出？', ko: '다음 빵은 몇 시에 나오나요?', en: 'What time is the next bake?' },
  },
  {
    en: 'What do you recommend?',
    ko: '무엇을 추천하시나요?',
    t: { fr: 'Que recommandez-vous ?', ja: 'おすすめは何ですか？', it: 'Cosa mi consiglia?', es: '¿Qué me recomienda?', de: 'Was empfehlen Sie?', zh: '你推荐什么？', yue: '你有咩推薦？', ko: '무엇을 추천하시나요?', en: 'What do you recommend?' },
  },
  {
    en: 'Is this baked fresh today?',
    ko: '오늘 구운 건가요?',
    t: { fr: 'Est-ce que c’est cuit du jour ?', ja: 'これは今日焼いたものですか？', it: 'È sfornato oggi?', es: '¿Esto es recién horneado hoy?', de: 'Ist das heute frisch gebacken?', zh: '这是今天新鲜烤的吗？', yue: '呢個係咪今日新鮮焗㗎？', ko: '오늘 구운 건가요?', en: 'Is this baked fresh today?' },
  },
  {
    en: 'How much is this?',
    ko: '이거 얼마예요?',
    t: { fr: 'Combien ça coûte ?', ja: 'これはいくらですか？', it: 'Quanto costa?', es: '¿Cuánto cuesta?', de: 'Was kostet das?', zh: '这个多少钱？', yue: '呢個幾錢？', ko: '이거 얼마예요?', en: 'How much is this?' },
  },
  {
    en: 'Thank you, it looks delicious!',
    ko: '감사합니다, 맛있어 보여요!',
    t: { fr: 'Merci, ça a l’air délicieux !', ja: 'ありがとう、美味しそう！', it: 'Grazie, sembra delizioso!', es: '¡Gracias, se ve delicioso!', de: 'Danke, das sieht köstlich aus!', zh: '谢谢，看起来很好吃！', yue: '多謝，睇落好好食！', ko: '감사합니다, 맛있어 보여요!', en: 'Thank you, it looks delicious!' },
  },
]

// Bread/baking words across languages — a quick reference glossary.
export const GLOSSARY = [
  { en: 'Croissant', emoji: '🥐', t: { fr: 'Croissant', ja: 'クロワッサン', it: 'Cornetto', es: 'Cruasán', de: 'Croissant', zh: '可颂', yue: '牛角包', ko: '크루아상', en: 'Croissant' } },
  { en: 'Sourdough', emoji: '🥖', t: { fr: 'Levain', ja: 'サワードウ', it: 'Lievito madre', es: 'Masa madre', de: 'Sauerteig', zh: '酸面团', yue: '酸種', ko: '사워도우', en: 'Sourdough' } },
  { en: 'Bagel', emoji: '🥯', t: { fr: 'Bagel', ja: 'ベーグル', it: 'Bagel', es: 'Bagel', de: 'Bagel', zh: '贝果', yue: '貝果', ko: '베이글', en: 'Bagel' } },
  { en: 'Bread', emoji: '🍞', t: { fr: 'Pain', ja: 'パン', it: 'Pane', es: 'Pan', de: 'Brot', zh: '面包', yue: '麵包', ko: '빵', en: 'Bread' } },
  { en: 'Pastry', emoji: '🧁', t: { fr: 'Viennoiserie', ja: 'ペストリー', it: 'Pasticceria', es: 'Bollería', de: 'Gebäck', zh: '糕点', yue: '糕點', ko: '페이스트리', en: 'Pastry' } },
  { en: 'Baguette', emoji: '🥖', t: { fr: 'Baguette', ja: 'バゲット', it: 'Baguette', es: 'Baguette', de: 'Baguette', zh: '法棍', yue: '法包', ko: '바게트', en: 'Baguette' } },
  { en: 'Fresh', emoji: '✨', t: { fr: 'Frais', ja: '焼きたて', it: 'Fresco', es: 'Fresco', de: 'Frisch', zh: '新鲜', yue: '新鮮', ko: '신선한', en: 'Fresh' } },
  { en: 'Gluten-free', emoji: '🌾', t: { fr: 'Sans gluten', ja: 'グルテンフリー', it: 'Senza glutine', es: 'Sin gluten', de: 'Glutenfrei', zh: '无麸质', yue: '無麩質', ko: '글루텐 프리', en: 'Gluten-free' } },
]

// ---------------------------------------------------------------------------
// Korean set phrases — the ones a machine cannot do.
//
// Sara typed "잘 먹었습니다!" and got back "Well done!". Verified against the
// live endpoint: the request was correct (ko→en, HTTP 200, one call, no
// fallback) and Google itself answered that. Korean→Japanese was no better:
// "よく食べました" — "I ate a lot" — instead of ごちそうさまでした.
//
// That is not a bug to fix, it is what word-level translation does to ritual
// speech. 수고하세요 has no meaning to carry across; it has a ROLE — the thing
// you say on the way out. So these are not translations, they are
// REPLACEMENTS: whatever a local actually says at that moment.
//
// `t` is what to show, `r` is how to say it (only where the script needs it).
// Anything not in this table still goes to the translator as before.
export const KO_SET_PHRASES = [
  {
    ko: '실례합니다',
    alt: ['저기요'],
    t: { en: 'Excuse me.', ja: 'すみません', fr: 'Excusez-moi.', it: 'Scusi.', es: 'Disculpe.', de: 'Entschuldigung.', zh: '不好意思。', yue: '唔該' },
    r: { ja: 'Sumimasen', zh: 'Bù hǎoyìsi', yue: 'm4 goi1' },
  },
  {
    ko: '하나씩 주세요',
    alt: ['각각 하나씩 주세요', '하나씩만 주세요'],
    t: { en: 'One of each, please.', ja: '一つずつください', fr: 'Un de chaque, s’il vous plaît.', it: 'Uno di ciascuno, per favore.', es: 'Uno de cada, por favor.', de: 'Von jedem eins, bitte.', zh: '每样来一个，谢谢。', yue: '每樣要一個，唔該' },
    r: { ja: 'Hitotsu zutsu kudasai', zh: 'Měi yàng lái yí ge, xièxie', yue: 'mui5 joeng6 jiu3 jat1 go3, m4 goi1' },
  },
  {
    ko: '데워 주실 수 있어요?',
    alt: ['데워주세요', '따뜻하게 해주세요', '데워 주세요'],
    t: { en: 'Could you warm it up?', ja: '温めてもらえますか', fr: 'Vous pouvez le réchauffer ?', it: 'Me lo può riscaldare?', es: '¿Me lo puede calentar?', de: 'Können Sie das aufwärmen?', zh: '可以帮我加热吗？', yue: '可唔可以幫我翻熱？' },
    r: { ja: 'Atatamete moraemasu ka', zh: 'Kěyǐ bāng wǒ jiārè ma', yue: 'ho2 m4 ho2 ji5 bong1 ngo5 faan1 jit6?' },
  },
  {
    // 봉투 comes back as "envelope" — the letter kind.
    ko: '봉투 하나 주세요',
    alt: ['봉투 주세요', '봉지 하나 주세요', '봉지 주세요'],
    t: { en: 'Could I have a bag?', ja: '袋を一つください', fr: 'Un sac, s’il vous plaît.', it: 'Un sacchetto, per favore.', es: 'Una bolsa, por favor.', de: 'Eine Tüte, bitte.', zh: '请给我一个袋子。', yue: '唔該畀個袋我' },
    r: { ja: 'Fukuro o hitotsu kudasai', zh: 'Qǐng gěi wǒ yí ge dàizi', yue: 'm4 goi1 bei2 go3 doi2 ngo5' },
  },
  {
    // Every country has a fixed counter word for this. None of them is "wrap".
    ko: '포장해 주세요',
    alt: ['포장이요', '포장해주세요', '테이크아웃이요', '가져갈게요'],
    t: { en: 'To go, please.', ja: '持ち帰りでお願いします', fr: 'À emporter, s’il vous plaît.', it: 'Da portare via, per favore.', es: 'Para llevar, por favor.', de: 'Zum Mitnehmen, bitte.', zh: '打包，谢谢。', yue: '外賣，唔該' },
    r: { ja: 'Mochikaeri de onegaishimasu', zh: 'Dǎbāo, xièxie', yue: 'ngoi6 maai6, m4 goi1' },
  },
  {
    ko: '여기서 먹을게요',
    alt: ['여기서 먹어요', '매장에서 먹을게요', '먹고 갈게요'],
    t: { en: 'For here, please.', ja: 'ここで食べます', fr: 'Sur place, s’il vous plaît.', it: 'Lo mangio qui, grazie.', es: 'Para tomar aquí.', de: 'Zum Hieressen, bitte.', zh: '在这里吃。', yue: '喺度食，唔該' },
    r: { ja: 'Koko de tabemasu', zh: 'Zài zhèlǐ chī', yue: 'hai2 dou6 sik6, m4 goi1' },
  },
  {
    // "It's okay" reads as YES in English. This one matters.
    ko: '괜찮아요',
    alt: ['아니요 괜찮아요', '괜찮습니다', '괜찮아요 감사합니다'],
    t: { en: 'No thank you, I’m fine.', ja: '大丈夫です、結構です', fr: 'Non merci, ça ira.', it: 'No grazie, va bene così.', es: 'No, gracias, así está bien.', de: 'Nein danke, das passt so.', zh: '不用了，谢谢。', yue: '唔使喇，多謝' },
    r: { ja: 'Daijōbu desu, kekkō desu', zh: 'Bú yòng le, xièxie', yue: 'm4 sai2 laa3, do1 ze6' },
  },
  {
    // English has no equivalent at all, so the English side is a stand-in.
    ko: '잘 먹겠습니다',
    alt: ['잘 먹을게요'],
    t: { en: 'Thank you, this looks great.', ja: 'いただきます', fr: 'Merci, ça a l’air délicieux.', it: 'Grazie, sembra ottimo.', es: 'Gracias, tiene muy buena pinta.', de: 'Danke, das sieht köstlich aus.', zh: '我开动了。', yue: '多謝，睇落好好食' },
    r: { ja: 'Itadakimasu', zh: 'Wǒ kāidòng le', yue: 'do1 ze6, tai2 lok6 hou2 hou2 sik6' },
  },
  {
    // The one that started this: measured as "Well done!" / よく食べました.
    ko: '잘 먹었습니다',
    alt: ['잘 먹었어요', '맛있게 잘 먹었습니다'],
    t: { en: 'Thank you, that was delicious.', ja: 'ごちそうさまでした', fr: 'C’était délicieux, merci.', it: 'Grazie, era buonissimo.', es: 'Gracias, estaba delicioso.', de: 'Danke, das war köstlich.', zh: '我吃饱了，谢谢。', yue: '多謝，好好食' },
    r: { ja: 'Gochisōsama deshita', zh: 'Wǒ chī bǎo le, xièxie', yue: 'do1 ze6, hou2 hou2 sik6' },
  },
  {
    ko: '정말 맛있어요!',
    alt: ['진짜 맛있어요', '너무 맛있어요', '정말 맛있어요'],
    t: { en: 'This is really good!', ja: 'とても美味しいです', fr: 'C’est vraiment délicieux !', it: 'È davvero buonissimo!', es: '¡Está riquísimo!', de: 'Das schmeckt richtig gut!', zh: '真好吃！', yue: '真係好好食！' },
    r: { ja: 'Totemo oishii desu', zh: 'Zhēn hǎochī', yue: 'zan1 hai6 hou2 hou2 sik6!' },
  },
  {
    ko: '맛있게 드세요',
    alt: ['맛있게 먹어요', '맛있게 드십시오'],
    t: { en: 'Enjoy!', ja: 'どうぞ召し上がってください', fr: 'Bon appétit !', it: 'Buon appetito!', es: '¡Buen provecho!', de: 'Guten Appetit!', zh: '请慢用。', yue: '慢慢食' },
    r: { ja: 'Dōzo meshiagatte kudasai', zh: 'Qǐng màn yòng', yue: 'maan6 maan6 sik6' },
  },
  {
    ko: '또 올게요',
    alt: ['다음에 또 올게요', '또 오겠습니다'],
    t: { en: 'I’ll be back!', ja: 'また来ます', fr: 'Je reviendrai !', it: 'Tornerò!', es: '¡Volveré!', de: 'Ich komme wieder!', zh: '我还会再来的。', yue: '我會再嚟' },
    r: { ja: 'Mata kimasu', zh: 'Wǒ hái huì zài lái de', yue: 'ngo5 wui5 zoi3 lai4' },
  },
  {
    // Untranslatable on purpose. お疲れさまです is what you say to a COLLEAGUE;
    // to a shop you say thank-you. Same role, different words.
    ko: '수고하세요',
    alt: ['수고하셨습니다', '수고하셨어요'],
    t: { en: 'Have a good one!', ja: 'ありがとうございました', fr: 'Bonne journée !', it: 'Buona giornata!', es: '¡Que vaya bien!', de: 'Schönen Tag noch!', zh: '辛苦了。', yue: '唔該晒，拜拜' },
    r: { ja: 'Arigatō gozaimashita', zh: 'Xīnkǔ le', yue: 'm4 goi1 saai3, baai1 baai3' },
  },
  {
    ko: '안녕히 계세요',
    alt: ['안녕히계세요', '들어가세요'],
    t: { en: 'Goodbye!', ja: '失礼します', fr: 'Au revoir !', it: 'Arrivederci!', es: '¡Hasta luego!', de: 'Auf Wiedersehen!', zh: '再见。', yue: '拜拜' },
    r: { ja: 'Shitsurei shimasu', zh: 'Zàijiàn', yue: 'baai1 baai3' },
  },
]

// Typed Korean never arrives clean: trailing !, a missing space, ~요 instead of
// ~습니다. Strip what does not change the meaning, keep what does.
function normalizeKo(text) {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[!?.,~ㅋㅎ…。！？]+$/g, '')
}

// Cantonese is its own language, not Chinese in a different font. Hong Kong
// says 外賣 where Beijing says 打包, 幾錢 where Beijing says 多少钱, and writes
// both in traditional characters. zh-HK therefore resolves to `yue`, and only
// the mainland/Taiwan tags fall back to `zh`.
function phraseLang(code) {
  const t = String(code || '').toLowerCase()
  if (t === 'yue' || t === 'zh-hk') return 'yue'
  if (t.startsWith('zh')) return 'zh'
  return t.slice(0, 2)
}

let _koIndex = null
function koIndex() {
  if (_koIndex) return _koIndex
  _koIndex = new Map()
  for (const entry of KO_SET_PHRASES) {
    for (const key of [entry.ko, ...(entry.alt || [])]) {
      _koIndex.set(normalizeKo(key), entry)
    }
  }
  return _koIndex
}

/**
 * A hand-checked answer for this Korean phrase, or null to let the translator
 * handle it. Returns the same { text, reading } shape the providers do.
 */
export function lookupSetPhrase(text, targetLang) {
  const entry = koIndex().get(normalizeKo(text))
  if (!entry) return null
  const lang = phraseLang(targetLang)
  const out = entry.t[lang]
  if (!out) return null
  return { text: out, reading: (entry.r && entry.r[lang]) || '' }
}
