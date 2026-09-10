## Why

Sara rehearses meeting scripts by ear — on a walk, with the phone in a pocket and
the screen locked. The scripts are private, so the recordings cannot live in this
repository (it is public) or on any public page. What she needs is a player that
is hers: the code can be public, the audio must never leave her phone.

The bready app is already on her home screen and already works offline, which
makes it the natural shelf for that player.

## What Changes

A fifth tab, **Listen**.

- **Add audio**: pick one or many files from the Files app. They are stored in
  this browser's IndexedDB and nowhere else — not localStorage (too small), not
  Supabase (they are not bakery data).
- **Play**: one track at a time, with play/pause, ±15 seconds, previous/next,
  speed 1× / 1.25× / 1.5×, and repeat-all. When a track ends the next one starts.
- **Resume**: each track remembers where it was stopped.
- **Lock screen**: the Media Session API exposes title and transport controls, so
  the phone's lock screen and earbuds control playback.
- **Remove**: two taps (× then Remove), no browser dialogs.
- The player stays mounted once opened, so switching tabs does not stop the audio.

## Non-goals

- No recording, no text-to-speech, no cloud sync of audio.
- No playlists beyond "the files, sorted by their numeric prefix".

## Capabilities

### New Capabilities
- `listen`: local audio shelf and player.

## Impact

- Code: `src/lib/listen.js` (pure helpers + IndexedDB adapter), `src/lib/listen.test.js`,
  `src/screens/Listen.jsx`, tab wiring in `src/App.jsx`, icons in `src/components/Icons.jsx`,
  `.listen-*` styles in `src/styles.css`.
- Storage: a new IndexedDB database `bready-listen`; positions in localStorage key
  `bready.listen.v1`. Nothing touches `bready.v1`.
- Risk: Safari clears site storage for a page not visited in 7 days (home-screen
  installs are exempt). The files themselves stay in the Files app, so re-adding is
  two taps.
