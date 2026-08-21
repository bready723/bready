## Why

Everything bready knows lives in one browser's localStorage. Open the app in a
different browser and it is a stranger: no bakeries, no rankings, and — the thing
Sara actually hit — no photos, so she re-adds the same restaurant pictures every
time. That is not a bug to patch; the app has no concept of "her data" at all,
only "this browser's data".

Two further consequences of the same root cause:

- Photos are data URLs inside a ~5MB per-origin budget, which a few dozen photos
  exhaust. A stopgap warning now says so out loud, but the ceiling is real.
- Nothing is backed up. A cleared browser, a lost phone, or Safari evicting site
  data for a PWA it considers stale takes the lot.

## What Changes

Move the source of truth to Supabase (Postgres + Storage + Auth), keeping the
local copy as an offline cache rather than the original.

- **Sign-in**: email magic link. No password to store, reset, or forget.
- **Data**: `bakeries`, `visits`, `want_to_try`, `notes`, `prefs`, each row owned
  by a user id and fenced off by row-level security.
- **Photos**: uploaded to a Storage bucket; rows keep a URL, not a data URL. This
  is what takes photos off the 5MB budget and makes them appear on every device.
- **Offline-first**: the app keeps writing to localStorage immediately and
  reconciles with the server when a connection returns, so logging a bakery abroad
  with no data still works.
- **Migration**: on first sign-in, whatever is already in this browser is pushed
  up, so Sara's existing rankings and photos survive the move.

## Non-goals

- No friends, sharing, or public pages. Single-user, as decided.
- No paid photo APIs. Auto-fetching photos for arbitrary bakeries is a separate
  question from making the photos she adds herself persist.
- No move off GitHub Pages. Supabase is reachable from a static host.

## Capabilities

### New Capabilities
- `cloud-sync`: account, sync, conflict and offline behaviour.
- `photo-storage`: where a bakery photo lives and how it is addressed.

### Modified Capabilities
- `local-storage`: demoted from source of truth to offline cache.

## Impact

- Code: new `src/lib/supabase.js` (client), `src/lib/sync.js` (queue and
  reconcile), `src/screens/SignIn.jsx`. `src/lib/storage.js` keeps its shape —
  it was written as "the single seam we'll later swap", and that is now cashed in.
  `BakeryDetail.jsx` uploads instead of embedding.
- Config: `.env` gains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  (gitignored). The anon key is safe in a browser bundle; the service role key
  must never appear in this repo.
- Risk: this is the first change that can lose Sara's real data. Migration runs
  once, is idempotent, and keeps the local copy intact until the server confirms.
- Tests: sync logic (queue, replay, conflict resolution) is pure and unit-tested;
  Supabase calls sit behind a thin adapter that tests fake.
