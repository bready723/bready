## 1. Shared game
- [x] 1.1 `quizReducer` clock per game (`seconds`), `pickMixed` (half Korean), `subLine`, remote pictures in `photoUrl`, Apple / TMDB credit lines (tested)
- [x] 1.2 `FaceGame` `kind` / `pick` / `seconds`; song clip playback with the unlock-on-tap audio element, Tap to play fallback, spinning record
## 2. Hub
- [x] 2.1 Six tiles, 3 rows of 2; cover and poster stacks; credits link "Credits"
## 3. Pools
- [x] 3.1 Songs: playlist (300) + US/KR top 100 + all-time list (218, both spellings for Korean names) → `songs.json`: 626 songs, 367 Korean / 259 global; 75 explicit left out; every favourite checked against the right artist (8 not in Apple's catalogue as a clean original)
- [ ] 3.2 Movies: TMDB textless posters → `movies.json` (needs Sara's TMDB key in `.env`)
## 4. Verify
- [x] 4.1 Songs: tests, build; hub at 390×844 and 320×640 (smaller type on small phones); full song round played: clip starts on the tile tap, next clip starts by itself, stops at the end; clips are 30 s stereo AAC ~256 kbps
- [ ] 4.2 Movies: build, review posters, full round; Sara checks sound on her iPhone
## 5. Space for six tiles
- [x] 5.1 No "Syncing…" / plain "Synced." banner under the header (the header pill already shows it); banners stay for real news (items backed up or loaded, errors)
