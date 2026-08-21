Staged so each phase leaves the app working. 🙋 marks a step only Sara can do.

## 1. Project setup
- [ ] 1.1 🙋 Create the Supabase project, hand over the URL + **anon** key (never the service role key).
- [ ] 1.2 Add `.env` (gitignored) and `.env.example`; wire `src/lib/supabase.js`.
- [ ] 1.3 Confirm the client reaches the project from the browser.

## 2. Schema
- [ ] 2.1 Tables `bakeries`, `visits`, `want_to_try`, `notes`, `prefs`, each with `user_id`, `updated_at`, `deleted_at`.
- [ ] 2.2 Row-level security: a user reads and writes only their own rows. Verify a signed-out client can read nothing.
- [ ] 2.3 Storage bucket `photos`, one folder per user, same policy.
- [ ] 2.4 Keep the SQL in `sql/` so the schema is reproducible, not clicked-in-a-panel-once.

## 3. Sign-in
- [ ] 3.1 `SignIn.jsx`: email field, "check your inbox" state, error state.
- [ ] 3.2 Handle the magic-link return and persist the session.
- [ ] 3.3 Sign out, and a signed-out mode that still works locally.

## 4. Sync engine (the part worth testing hardest)
- [ ] 4.1 `src/lib/sync.js`: an append-only outbox of local changes.
- [ ] 4.2 Replay the outbox on reconnect, in order, idempotently.
- [ ] 4.3 Pull server changes and merge; last-write-wins on `updated_at`.
- [ ] 4.4 Soft deletes, so a delete on one device does not resurrect from another.
- [ ] 4.5 Unit tests: queue, replay, duplicate suppression, conflict, offline→online.

## 5. Photos
- [ ] 5.1 Upload on pick; store the URL on the bakery row.
- [ ] 5.2 Queue the upload when offline; retry on reconnect.
- [ ] 5.3 Migrate existing data-URL photos up, then drop them from local state.

## 6. Migration
- [ ] 6.1 On first sign-in, push existing local data; mark the browser migrated.
- [ ] 6.2 Idempotent — signing in again creates nothing new.
- [ ] 6.3 Keep the local copy until the server confirms.

## 7. Verify
- [ ] 7.1 `npm test` passes.
- [ ] 7.2 Two-browser test: rank in one, sign in on the other, same data and photos.
- [ ] 7.3 Offline test: log with the network cut, reconnect, confirm it lands once.
- [ ] 7.4 🙋 Sara confirms on her phone before this is called done.
