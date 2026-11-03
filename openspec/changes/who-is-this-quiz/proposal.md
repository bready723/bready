## Why

Sara has a Google Slides deck, "Who Is This?" (332 slides: a title plus 331 celebrity
photos, each with the name underneath). She used to play it as a slideshow: a face
appears, you say the name, five seconds later the name shows. The slideshow has no
timer you can see, no score, no shuffle, and needs a laptop. She wants the same game
as something she can open on her phone like an app, keep score in, and replay with a
fresh random draw every time.

The bready app is already on her home screen and already works offline, so the game
lives there as a new tab.

## What Changes

A sixth tab, **Quiz**.

- **Start screen**: "Who Is This?", how many faces are in the pool, one Start button.
- **A question**: a random photo fills a glass card. A ring timer counts 5 → 0 beside
  a "7 / 20" progress pill. The player says the name out loud, then taps **Show
  answer** (which stops the timer) or waits for 0 (the name shows on its own). The
  name appears under the photo with two buttons: **I got it right** (left) and
  **I got it wrong** (right). Either one moves to the next photo.
- **A game**: 20 photos drawn at random from the whole pool, no repeats inside a game.
  Each right answer is 5 points, so the score is out of 100. No running score during
  play; only the counter.
- **End screen**: the score as a big number out of 100, how many of 20 were right, and
  two buttons, **Replay** (new random 20) and **Stop** (back to the start screen).
- **Pool**: the 331 faces from the deck, plus about 50 recent stars (2023–2026) across
  K-pop/K-drama, Hollywood and global music, sports, and politics/business. New
  photos come from Wikimedia Commons with the photographer credit and licence kept
  in the data file, since the repo is public.
- **Look**: the "glassy / 3D" treatment from the Goodlugg Daily Channel Sales
  dashboard (translucent white cards with blur, bright rim, stacked depth shadows,
  a sheen that follows the pointer, tilt on hover/press, floating colour blobs behind,
  raised pill buttons, a deep tinted hero tile for the score), recoloured to bready's
  blue → indigo → magenta palette.

## Non-goals

- No typed answers or auto-checking; scoring stays on the honour system, like the
  slideshow.
- No best-score history, no sharing, no cloud sync of results.
- No editing the pool inside the app; names and photos live in a data file and a
  folder, changed with the import scripts.
- No photo precaching in the service worker (20 MB); photos cache as they are viewed.

## Capabilities

### New Capabilities
- `quiz`: celebrity face-recall game with a 5-second timer, 20 questions, score out of 100.

## Impact

- Code: `src/lib/quiz.js` (pure game logic: draw, countdown reducer, scoring),
  `src/lib/quiz.test.js`, `src/lib/people.json` (generated pool), `src/screens/Quiz.jsx`,
  tab wiring in `src/App.jsx`, `IconQuiz` in `src/components/Icons.jsx`, `.quiz-*`
  and `.glass-*` rules in `src/styles.css`, a `runtimeCaching` rule in `vite.config.js`.
- Assets: `public/quiz/*.jpg` (about 380 photos at 640 px long side, ~15–20 MB total),
  `public/quiz/CREDITS.md` (generated).
- Scripts: `scripts/quiz/import-deck.py`, `scripts/quiz/fetch-commons.py`,
  `scripts/quiz/new-people.csv` (the wanted list). One-off, committed for reruns.
- Storage: nothing. The game holds no persistent state; `bready.v1` is untouched.
- Risk: the deck's image links from the Slides API expire in about 30 minutes, so the
  export must run right after fetching the deck. Celebrity photos in a public repo:
  the 331 deck photos are of unknown origin (Sara's call, accepted); the new ones are
  CC-licensed with credits.
