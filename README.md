# bready 🥐

A "Beli for bakeries" — log bakeries, rank them with quick better-or-worse comparisons,
and get a personal score out of 10. Plus a bakery **Translator** for ordering bread anywhere.

Personal project. v1 is local-only (data lives in your browser); cloud sync + deploy come next.

## Run it locally

```bash
npm install      # first time only
npm run dev      # open the printed http://localhost:5173 (or 5181) on your phone/desktop
```

Then in Safari on your iPhone: open the URL → Share → **Add to Home Screen** → you get the bready icon.

## Test the ranking math

```bash
npm test
```

## What's inside

- **My Rankings** — your bakery leaderboard, filterable by 🥐🥖🥯
- **Log a visit (+)** — name → breads → gut tier → 2-3 comparisons → score
- **Want to try** — wishlist; tap "I went" to rank it
- **Translator** — country picker, offline phrasebook + bread-word glossary, type/voice translate with play-aloud

## How the score works

You pick a gut tier (Loved 8–10 / Fine 5–7.9 / Didn't like 0–4.9), then a binary-search
comparison places the bakery exactly. Scores are spread evenly inside each tier band.
Engine + tests live in `src/lib/ranking.js`.

## Next steps (not built yet)

- Supabase cloud save + login (so data is backed up and synced)
- Deploy to Vercel for a live URL
- Map view, friends/social feed, public "best of" pages
