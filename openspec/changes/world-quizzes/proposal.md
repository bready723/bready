## Why

Sara plays Meta Muse's daily "world challenge" every day: 20 country → capital and 20
flag → country questions, four choices each, and the ones she misses come back the
next day. She likes these two quizzes the most and wants to play them in bready
whenever she likes, not only once a day. She supplied both question banks
(190 countries, tiered easy / medium / hard).

## What Changes

- The **Quiz tab becomes a hub** of three cards with only a title and a Start button:
  Who Is This?, Country → Capital, Flag → Country. The old Who Is This start text
  (description, chips, How to play) is removed (Sara, 2026-11-15). Who Is This
  gameplay is unchanged.
- **Country → Capital** and **Flag → Country**: 20 questions, 4 choices, no timer,
  Muse's mix of 2 easy + 4 medium + 14 hard. Wrong answers come from the same region
  so they look alike. A tap shows green / red and moves on after about a second.
- **Misses return**: missed countries open the next round of the same quiz until
  answered right.
- **End screen**: score ring (15/20), verdict, "N questions return…", Review list of
  misses with "Your answer", the shared "Who played?" card and a per-quiz scoreboard.
- 190 flag SVGs from flag-icons (MIT) under `public/flags/`, cached offline as shown.

## Impact

- New: `src/lib/world.js`, `src/lib/world-bank.json`, `src/screens/WorldQuiz.jsx`,
  `src/components/QuizParts.jsx`, `public/flags/`.
- Changed: `src/screens/Quiz.jsx` (hub), `src/lib/quiz.js` (history helpers take a
  storage key; Who Is This keeps `bready.quiz.v1`), `src/styles.css`, `vite.config.js`,
  credits page.
- Storage (this phone only): `bready.world.{capital,flag}.v1` and `.missed`.
