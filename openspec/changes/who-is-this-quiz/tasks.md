## 1. Pool
- [x] 1.1 Re-read the deck via the Slides API and save the JSON; `scripts/quiz/import-deck.py`
      downloads, fixes spellings, resizes to 640 px / q82 → `public/quiz/NNN.jpg` + deck entries.
- [x] 1.2 `scripts/quiz/new-people.csv` from Appendix A; `scripts/quiz/fetch-commons.py`
      resolves Wikidata → Commons, filters licences, resizes, writes entries + `CREDITS.md`
      + a contact sheet. Drop weak photos by hand. Target ≈ 50 added. Result: 60 added; deck photos swapped for Commons where free (279 of 302 people); 391 faces total.
- [x] 1.3 Merge into `src/lib/people.json`; check counts, no duplicate ids, every file exists.

## 2. Implementation
- [x] 2.1 `src/lib/quiz.js`: `shuffle`, `pickRound`, `scoreOf`, `quizReducer`, `initialState`, `ROUND_SIZE`, `SECONDS`.
- [x] 2.2 `src/screens/Quiz.jsx`: start / question / end views, interval, image preload + onLoad, pointer tilt.
- [x] 2.3 `src/components/Icons.jsx`: `IconQuiz`.
- [x] 2.4 `src/App.jsx`: `quiz` colour, tab button (last), `tab === 'quiz' && <Quiz />`.
- [x] 2.5 `src/styles.css`: `.quiz` backdrop + blobs, `.quiz .glass`, `.quiz .hero`, pills, ring, reveal, end screen, reduced-motion.
- [x] 2.6 `vite.config.js`: workbox `runtimeCaching` for `/quiz/`; coverage threshold for `src/lib/quiz.js`.

## 3. Tests
- [x] 3.1 `src/lib/quiz.test.js`: pickRound (size, no repeats, small pool), scoreOf (0, 20, 17 → 85),
      reducer walk-through (start → loaded → ticks → reveal at 0, early reveal, answer advances,
      20th answer ends, replay, stop), tick ignored outside countdown.
- [x] 3.2 `npm run test:coverage` passes the gate.

## 4. Verify
- [x] 4.1 `npm test`, `npm run build`; `dist/quiz/` holds the photos; `sw.js` has the runtime rule.
- [x] 4.2 Headless Chrome against `vite preview` at 390×844: start screen, a question mid-countdown,
      the reveal, the end screen; screenshots saved to the scratchpad and looked at.
- [x] 4.3 Commit on `ai-dev-trial`; push (auto-deploys); open `https://bready723.github.io/bready/`
      and play one full game.
- [ ] 4.4 On the phone (Sara): add-to-home-screen app shows the Quiz tab; glass renders; tilt on press.

## 5. Follow-ups (2026-11-04)
- [x] 5.1 Pool to 500: 162 more Commons candidates, 53 dropped on review (hard-to-guess photo or least known).
- [x] 5.2 Scoreboard: history in `quiz.js` (load/add/save/summarize/isNewBest/playedLabel, tested), end-screen card, Best chip on Start.

## 6. Follow-ups (2026-11-07)
- [x] 6.1 Player names: `cleanName/recentNames/renameLast/bestRow/loadName/saveName` in `quiz.js` (tested), "Who played?" card on the end screen, names on scoreboard rows.
- [x] 6.2 Pool to 1000 at the same mix (331 Korean): 939 more Commons candidates, 343 cut as least known (DROP_1000), 38 cut on the contact-sheet review (DROP_PHOTO). Photo cache maxEntries 1000.
