## Why

Sara wants the Quiz tab to look more fun and inviting (picture tiles, not plain
Start buttons) and a fourth quiz for family play: guess the brand from its logo.
Logo apps mostly use typing or four choices; for a group shouting answers at one
phone, the Who Is This? flow (look, say it, reveal, mark yourself) works best and
reuses tested code.

## What Changes

- **Hub becomes a 2×2 grid of picture tiles**: Who Is This?, Country → Capital,
  Flag → Country, Logo Quiz. The whole tile is the button. Each tile shows three
  fanned real images from its quiz (faces, flags, logos; a globe with a pin for
  capitals), the title, and a chip with the best score or "New". Tiles still fill
  the screen down to the tab bar with no scrolling.
- **Logo Quiz**: same play as Who Is This? (20 logos, 5-second ring, Show answer,
  I got it right / wrong, scoreboard with player names, Missed list with names).
  Logos sit on a plain white card. Its own scoreboard (`bready.logo.v1`).
- **Logo pool**: brand logos from Wikimedia Commons (Wikidata P154) under free
  licences only, reviewed on contact sheets; logos that spell out the brand name
  are cut so the answer is not on screen. Korean brands show their Korean name.
- Credits page lists every logo; hub link reads "Photo, flag & logo credits".

## Impact

- New: `src/screens/FaceGame.jsx` (the shared timed game, moved out of Quiz.jsx),
  `src/lib/logos.json`, `public/logos/`, `scripts/quiz/logo-commons.py`,
  `scripts/quiz/logos-candidates.csv`, `scripts/quiz/add-logos.py`.
- Changed: `src/screens/Quiz.jsx` (hub only), `src/lib/quiz.js` (`photoUrl` dir,
  `creditLine` label, `LOGO_HISTORY_KEY`, `bestLabel`, `sampleArt`),
  `src/styles.css`, `vite.config.js` (`quiz-logos` runtime cache), credits pages.
- Who Is This? gameplay and its scoreboard key are unchanged.
