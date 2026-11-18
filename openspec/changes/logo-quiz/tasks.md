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
- [x] 5.3 More cars / food & drink / retail (2026-11-18, Sara asked for 300, few Korean brands). 554 new candidates; `logo-search.py` LOGO_SEARCH=cat lists each brand's Commons "<brand> logos" category (existence checked 50 at a time). 1,193 files reviewed by eye; only symbol-only, free-licence files kept. +32: Honda, Subaru, Chevrolet, Cadillac, Chrysler, Lamborghini, Rivian, Polestar, Harley-Davidson, Yamaha, Kawasaki, Jack in the Box, Whataburger, Gatorade, General Mills, Sapporo, Nespresso, Evian, Skechers, Publix, Sam's Club, USPS, State Farm, MetLife, Valero, Citgo, Petronas, Chili's, Volcom, Kmart, Circle K, Square. Pool 183 → 215. Most food / retail logos are wordmarks (the name is the logo) and many famous symbols (Ferrari, BMW roundel, Starbucks) have no free file, so 300 was not reachable with the symbol-only rule.
- [x] 5.4 Pool to 300 (2026-11-18, Sara's choice: "1 and 2 only with tech and media"). (1) Name-hidden logos: 67 famous wordmark logos shown as a zoomed-in piece (colours, type and a letter or two, never the whole name) — e.g. Coca-Cola, Heinz, Lay's, Oreo, Kit Kat, Burger King, KFC, IKEA, Costco, FedEx, Ford, Jeep, Castrol; crop boxes chosen by eye on a 10% grid and every piece checked (CVS and Ducati dropped: piece too vague). Picks marked `#part` in `logo-picks.csv`. (2) +18 tech / media symbols from the Commons "<brand> logos" categories: YouTube, TikTok, LinkedIn, Twitch, Paramount+, Peacock, Uber, PayPal, Firefox, Safari, Finder (Mac), Xbox, Atari, Roblox, Pokémon, Adobe, HP, Cisco. Pool 215 → 300.
