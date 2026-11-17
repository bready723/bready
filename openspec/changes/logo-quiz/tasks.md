## 1. Hub
- [x] 1.1 `bestLabel`, `sampleArt` in `quiz.js` (tested)
- [x] 1.2 2×2 picture tiles in `Quiz.jsx`, styles in `styles.css`
## 2. Logo Quiz
- [x] 2.1 Shared timed game moved to `FaceGame.jsx`; Who Is This? uses it unchanged
- [x] 2.2 `photoUrl(dir)`, `creditLine(label)`, `LOGO_HISTORY_KEY` (tested)
- [x] 2.3 `quiz-logos` runtime cache
## 3. Logo pool
- [x] 3.1 Candidates (1,026 brands, `logos-candidates.csv`), Commons lookup (816 free logos), symbol cut away from wordmarks where possible, contact-sheet review: 155 kept (18 Korean); most free logos spell the brand name and were cut
- [x] 3.2 `logos.json`, `public/logos/` (4.6 MB), Logo credits section on the credits page (`add-logos.py`, picks in `logo-picks.csv`)
## 4. Verify
- [x] 4.1 Tests, coverage, build; hub checked at 320/375/390/430 px wide (no overlap, no clipping, no sideways scroll); full Logo Quiz and Who Is This? rounds played
## 5. Follow-ups (2026-11-17)
- [x] 5.1 Fix a player name: tap the ticked name on the end screen to edit it; the new name replaces it on every game of that scoreboard (`renameAll`, tested).
- [x] 5.2 More fashion / luxury / retail logos (Sara: weak on sports teams; sports kept as is). Second pass with `logo-search.py`: Wikidata icon properties (P8972, P2910) plus a Commons file search for 56 key brands, and symbols cut out of first-pass wordmark logos. +28: Louis Vuitton, Burberry, Valentino, Fendi, Versace, Givenchy, Lacoste, Hublot, Air Jordan, Timberland, Champion, Oakley, Columbia, ASICS, Umbro, Salomon, On, Carhartt, Jack Wolfskin, Walmart, Amazon, Walgreens, Macy's, Subway, Domino's, Pizza Hut, 네이버, 카카오T. Pool 155 → 183. Chanel, Hermès, Starbucks, Puma, Prada, Dior symbols have no free-licence file on Commons, so they are not included.
