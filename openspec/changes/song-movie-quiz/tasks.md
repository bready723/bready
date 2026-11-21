## 1. Shared game
- [x] 1.1 `quizReducer` clock per game (`seconds`), `pickMixed` (half Korean), `subLine`, remote pictures in `photoUrl`, Apple / TMDB credit lines (tested)
- [x] 1.2 `FaceGame` `kind` / `pick` / `seconds`; song clip playback with the unlock-on-tap audio element, Tap to play fallback, spinning record
## 2. Hub
- [x] 2.1 Six tiles, 3 rows of 2; cover and poster stacks; credits link "Credits"
## 3. Pools
- [x] 3.1 Songs: playlist (300) + US/KR top 100 + all-time list (218, both spellings for Korean names) → `songs.json`: 626 songs, 367 Korean / 259 global; 75 explicit left out; every favourite checked against the right artist (8 not in Apple's catalogue as a clean original)
- [x] 3.2 Movies: TMDB textless posters → `movies.json`: 345 movies (335 posters, 10 film stills): best-known English-language, Korean, animated and 2023+ films. All 348 pictures checked by eye on contact sheets: 4 still showed a title (Divergent, The Flu, Badland Hunters, Five Nights at Freddy's) → next textless picture; 3 too adult for a family game (3-Iron, Thirst, The Substance) → left out (`NEXT_PICTURE` / `LEAVE_OUT` in `movies.py`)
## 4. Verify
- [x] 4.1 Songs: tests, build; hub at 390×844 and 320×640 (smaller type on small phones); full song round played: clip starts on the tile tap, next clip starts by itself, stops at the end; clips are 30 s stereo AAC ~256 kbps
- [x] 4.2 Movies: six-tile hub at 390×844 and 320×640; full round played (poster, 5 s ring, title + year + Korean title, TMDB credit, missed posters)
- [x] 4.3 Sara checked sound on her iPhone (2026-11-18): "sounds okay"
## 5. Space for six tiles
- [x] 5.1 No "Syncing…" / plain "Synced." banner under the header (the header pill already shows it); banners stay for real news (items backed up or loaded, errors)
## 6. Bigger pools (2026-11-19, Sara asked for 700 songs / 500 movies)
- [x] 6.1 Songs 626 → 713: 105 more favourites in `songs-classics.csv` (46 global, 59 Korean). Fixed Korean tagging: a song on Korea's chart no longer counts as Korean by itself (Bieber, Ariana Grande, Wham! had been tagged Korean); "Revisited" versions skipped. Split now 393 Korean / 320 global.
- [x] 6.2 Movies 345 → 512: bigger groups (English 300, Korean 90, animated 90, 2023+ 50). All 177 new posters checked by eye; left out American History X, American Psycho, Fifty Shades of Grey, Pieta (not family-friendly), Memoir of a Murderer (every picture shows a title) and five concert / making-of films.
## 7. Older favourites (2026-11-21, Sara: "a bit older, not the most recent", later than 1990; no country; movies more Hollywood, no more Korean)
- [x] 7.1 Songs 713 → 975: +286 global hits from 1990–2015 in `songs-classics.csv`. No country music: tracks the store files under Country, plus country acts filed elsewhere (`COUNTRY_ARTISTS`), are left out — 22 country songs removed (Morgan Wallen, Zach Bryan, Ella Langley …); Taylor Swift's crossover hits stay (`POP_OK`). Remix / dub / acoustic / re-recorded versions skipped so the original plays; trailing "[...]" notes stripped from titles. 26 classics not in the store without explicit lyrics (e.g. Celine Dion, Green Day) are listed by the script.
- [x] 7.2 Movies 512 → 730: new group of English-language, non-animated films released 1990–2015 (top 420 by votes) → +218 Hollywood films, no new Korean ones. All 223 new posters checked by eye: 3 got the next textless picture, 4 left out (every picture shows the title), Eyes Wide Shut left out (not family-friendly).
