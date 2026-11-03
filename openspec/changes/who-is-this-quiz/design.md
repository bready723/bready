## Context

bready is a React 18 + Vite 6 PWA with icon-only tabs (`src/App.jsx` `TAB_COLORS`,
`<nav className="tabbar">`), screens under `src/screens/`, pure logic under `src/lib/`
tested with Vitest in a node environment (no component tests; coverage counted only
for `src/lib/**`). Listen (commit `4c4e471`) is the pattern for adding a tab.

The source deck: Google Slides `173N4KrEgBiJeWQMYoxtDAnP87f84_t2wRloxN5lDOMM`,
332 slides, portrait 6×9 in. Every slide after the first holds exactly one image and
one text box (the name). Names are English for non-Koreans and Korean for Koreans
(e.g. `김연아`, `Charlize Theron`); a handful are characters (`Yoda`, `Simba`). The
API gives a `contentUrl` per image that works for ~30 minutes.

The look to copy: the Goodlugg dashboard artifact (`claude.ai/artifact/VuPP9VybBqsSnwNe7gTUVc`,
files/index.html v63, "glass v2" + "liquid glass" layers). Its recipe:
backdrop = light neutral gradient + 4 blurred colour blobs (`blur(48px) saturate(160%)`,
floating 18–27 s loops); surfaces = `linear-gradient(135deg, rgba(255,255,255,.72), .56, .48)`,
`backdrop-filter: blur(30px) saturate(190%)`, 1px rim `rgba(255,255,255,.45)` with
top/left at `.80`, depth = `0 1px 0 #fff.95 inset, 0 -1px 0 #fff.35 inset, 0 2px 3px
ink.10, 0 14px 28px -12px ink.45, 0 42px 70px -34px ink.60`; `::before` sheen =
radial white at `--mx/--my` + top gloss; tilt = `perspective(900px) rotateX(--rx)
rotateY(--ry) translateY(-3px)` driven by pointermove (mouse) / pointerdown (touch);
pills = raised with `inset 0 1px 0 #fff.35, inset 0 -2px 6px #000.35`; hero tile =
deep tinted gradient glass with a brighter top rim and a coloured inner glow; key
numbers = weight 760 with a 1px white text-shadow; rings = SVG arc with drop-shadow.

## Goals / Non-Goals

- Goal: the game exactly as proposed, on the phone, offline after first view of a photo.
- Goal: the glass look, recoloured to bready (blue `#1aa7e8`, indigo `#5b3fd6`,
  magenta `#e0218a`; ink `#211a11`; canvas `#faf9f6`). Respect `prefers-reduced-motion`.
- Non-goal: changing any other tab's look. Glass rules are scoped under `.quiz`.
- Non-goal: a generic design system; this is one screen.

## Decisions

- **Game logic is a pure reducer in `src/lib/quiz.js`**, tested in node. State:
  `{ phase: 'idle'|'loading'|'countdown'|'revealed'|'done', round: Person[], index,
  secondsLeft, answers: boolean[] }`. Actions: `start(round)`, `loaded` (photo decoded →
  countdown begins, so a slow network never eats the 5 seconds), `tick`, `reveal`,
  `answer(right)` (records and advances, or ends after the 20th), `replay(round)`, `stop`.
  Helpers: `shuffle(list, rng)`, `pickRound(people, n = 20, rng)` (no repeats),
  `scoreOf(answers, n)` → `{ correct, score }` with `score = correct * (100 / n)`.
  Every function takes `rng` so tests are deterministic. The 1-second interval lives
  in the component and only dispatches `tick`.
- **Timer = 5 seconds, integer ticks 5 → 0.** At 0 the reducer moves to `revealed`
  itself. "Show answer" dispatches `reveal` early and the interval is cleared.
- **Photos load before the clock starts.** `<img onLoad>` dispatches `loaded`. The
  next photo is pre-fetched (`new Image().src`) as soon as a question starts.
- **Pool data = `src/lib/people.json`**, one entry per face:
  `{ id, name, alt?, file, source: 'deck'|'commons', credit?, license?, url? }`.
  `name` is what the reveal shows (Korean for Korean stars, as in the deck); `alt` is
  the other-language name shown small under it when known. JSON is not counted in
  coverage, so the pool does not drag the gate.
- **Photos in `public/quiz/<id>.jpg`**, resized with Pillow to 640 px on the long
  side, JPEG quality 82, original aspect kept; shown `object-fit: contain` in a 2:3
  well. Served from `/bready/quiz/`. Not precached; `vite.config.js` gets a workbox
  `runtimeCaching` rule (`CacheFirst`, cache `quiz-photos`, max 400 entries) for
  `/quiz/` so a viewed photo works offline and SW updates stay small.
- **Deck import = `scripts/quiz/import-deck.py <slides.json> <out-dir>`**, run with
  `python3 -I`. Reads the Slides API JSON (saved from the MCP read right before the
  run), downloads each `contentUrl`, resizes, writes `NNN.jpg` and the `deck` entries.
  Names are kept verbatim except trimming; the deck's few misspellings are fixed in a
  small override map in the script (`Zandaya` → `Zendaya`, `Timothee Chamalet` →
  `Timothée Chalamet`, `Emenem` → `Eminem`, `Steven Cobert` → `Stephen Colbert`,
  `Jimmy Fellon` → `Jimmy Fallon`, `Mark Walberg` → `Mark Wahlberg`, `Rory Mcllroy` →
  `Rory McIlroy`, `Nicholas Cage` → `Nicolas Cage`, `Lil Naz X` → `Lil Nas X`,
  `The Weekend` → `The Weeknd`, `Golum` → `Gollum`, `Jodi Foster` → `Jodie Foster`,
  `Leonardo Dicaprio` → `Leonardo DiCaprio`, `Beyonce` → `Beyoncé`,
  `Anya Taylor - Joy` → `Anya Taylor-Joy`, `Conan O’Brien` → `Conan O'Brien`,
  `Lebron James` → `LeBron James`). Both `비` entries (the deck has two) become one.
- **Deck photos are replaced by Commons photos where a free one exists** (Sara, 2026-11-03).
  Each deck name is resolved to Wikidata (Wikipedia title lookup, redirects followed);
  if its P18 image is CC / public domain and at least 400 px on the short side, that
  photo is used with credit and the entry becomes `source: 'commons'`. Otherwise the
  deck photo stays (`source: 'deck'`). Characters always keep the deck image.
- **New stars = `scripts/quiz/new-people.csv`** (`display_name, wikidata_search, qid?`)
  → `scripts/quiz/fetch-commons.py`: Wikidata search (or the given QID) → `P18` image
  → Commons `imageinfo` (800 px thumb, `LicenseShortName`, `Artist`, file page URL) →
  resize → `commons` entries with credit. Anyone without a P18 image, or whose licence
  is not CC/public domain, is skipped and listed in the run log. Korean stars get the
  Wikidata `ko` label as `name` and the English label as `alt`; others the reverse.
  Target ≈ 50 after skips; the CSV starts with ~60 candidates (Appendix A), none
  already in the deck.
- **`public/quiz/CREDITS.md`** is generated from the `commons` entries: file, name,
  author, licence, source link.
- **Attribution is shown in the app, not only in the repo** (CC BY / BY-SA ask for
  credit where the photo is displayed). For a `commons` entry the reveal view shows a
  one-line muted credit under the name ("Photo: <author> · CC BY 2.0"), and the start
  screen carries a small "Photo credits" link to `/bready/quiz/CREDITS.md`. Deck
  entries show no credit line.
- **If fewer than ~50 candidates survive the Commons filter**, the builder tops the
  list up from the same four categories (same 2023–2026 "recent" bar, same licence
  rule) and reports the final added list and the skipped list at the end. Ambiguous
  Korean stage names (윈터, 하니, 해린, 카리나…) are pinned by Wikidata QID in the CSV.
- **Builder defaults** (object if wrong): `<img onError>` also dispatches `loaded` and
  shows a "photo unavailable" placeholder so the game never hangs; deck PNGs are
  flattened to RGB before JPEG; the duplicate 비 keeps the first slide; the contact
  sheet goes to the session scratchpad, not the repo; the ring arc eases between
  integer ticks; `-webkit-backdrop-filter` is set for iOS Safari.
- **Tab wiring**: key `quiz`, colour `#E0218A` (magenta end of the brand gradient;
  dim `rgba(224,33,138,0.55)`), icon `IconQuiz` = a circle with a `?`, placed last in
  the bar. Rendered `tab === 'quiz' && <Quiz />` (unmounts on leave; a game in
  progress is simply lost, which matches the slideshow).
- **Screen `src/screens/Quiz.jsx`** owns the interval, the pointer-tilt handler, and
  the three views (start / question / end). All visuals come from `src/styles.css`
  under `.quiz` with the recipe above, bready-coloured:
  blobs `#1aa7e8`, `#5b3fd6`, `#e0218a`, `#A9702E` (bread gold) at .18–.35;
  hero tile gradient `rgba(42,28,110,.96) → #5b3fd6 .92 → #e0218a .86` with a
  blue inner glow; "Show answer" pill dark indigo (`#5b3fd6 → #3a1c57`);
  "I got it right" green (`#3a9a52 → #2a7a3e`), "I got it wrong" red
  (`#cc4a4a → #a83232`); ring arc stroked with the brand gradient and a drop-shadow;
  the revealed name in `--ink`, weight 760, 1px white text-shadow, `gl-rise` entrance.
  Tilt only on mouse pointers; on touch, a press (pointerdown) tilts and release resets.
  Everything animated sits inside `@media (prefers-reduced-motion: no-preference)`.
- **Coverage gate**: add `'src/lib/quiz.js': { statements: 90, branches: 90,
  functions: 90, lines: 90 }` to `vite.config.js` thresholds.
- **Deploy**: pushes to `ai-dev-trial` auto-deploy to `https://bready723.github.io/bready/`
  via GitHub Actions. Local commit first; push after the headless-Chrome check passes.

## Risks / Trade-offs

- `backdrop-filter` with 30px blur over a large photo card is GPU-heavy on older
  phones. Mitigation: only three glass surfaces on screen at once; blobs are
  `will-change: transform` and few; reduced-motion disables the float and tilt.
- Wikimedia photos vary in quality (some are mid-sentence or far away). Mitigation:
  `fetch-commons.py` prints a contact sheet (`scratch/commons-sheet.jpg`) to eyeball
  before the entries are kept; weak ones are dropped by hand.
- 20 MB of binaries in git. Accepted; one-off, and GitHub Pages serves them fine.
- The deck's image URLs expire: run the import immediately after the Slides read; if
  a download 403s, re-read the deck and rerun (the script is idempotent by slide id).

## Appendix A — candidate new faces (before Commons filtering)

K-pop / K-drama: 카리나, 윈터, 하니, 해린, 로제, 리사, 정국, 뷔, 지민, 변우석,
김혜윤, 고윤정, 김지원, 박은빈, 이준호, 추영우, 정호연, 박성훈, 임시완, 황인엽,
이도현, 노윤서, 안효섭, 김선호.
Hollywood / global music: Sabrina Carpenter, Chappell Roan, Jenna Ortega, Pedro Pascal,
Mikey Madison, Jacob Elordi, Sydney Sweeney, Glen Powell, Paul Mescal, Ayo Edebiri,
Florence Pugh, Austin Butler, Cynthia Erivo, Nicola Coughlan, Tyla, Benson Boone,
Gracie Abrams, Tate McRae, Charli XCX, Doechii, Bad Bunny, Rosalía, Jeremy Allen White,
Walton Goggins, Rachel Zegler, Hailee Steinfeld.
Sports: Shohei Ohtani, Caitlin Clark, Carlos Alcaraz, Jannik Sinner, Coco Gauff,
Lamine Yamal, Simone Biles, Ilia Malinin, Jude Bellingham, Kylian Mbappé,
Victor Wembanyama, Patrick Mahomes, Travis Kelce, Iga Świątek, 이강인, 안세영.
Politics / business: Zohran Mamdani, Sam Altman, Jensen Huang, Elon Musk,
Mark Zuckerberg, 이재명, Pope Leo XIV, Donald Trump, JD Vance.
