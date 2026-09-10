## 1. Implementation
- [x] 1.1 `src/lib/listen.js`: parseName/titleFor, sortTracks, next/prevTrack, formatTime, formatSize, isAudioFile, positions (injectable store), IndexedDB adapter (listTracks, addTracks, getBlob, removeTrack).
- [x] 1.2 `src/screens/Listen.jsx`: file picker, list, single `<audio>`, transport, speed, repeat, resume, Media Session, two-tap remove.
- [x] 1.3 `src/App.jsx`: `listen` tab colour, tab button, keep the screen mounted (hidden) after first open.
- [x] 1.4 `src/components/Icons.jsx`: IconListen, IconPlay, IconPause, IconBack15, IconFwd15, IconPrev, IconNext.
- [x] 1.5 `src/styles.css`: `.listen-*` rules on the existing tokens.

- [x] 1.6 Read `chpl` chapter marks off a joined file; jump list, chapter-aware next/previous, chapter title on the lock screen.

## 2. Tests
- [x] 2.1 `src/lib/listen.test.js`: names, ordering, next/prev with repeat, time formatting, positions round-trip, file filter.
- [x] 2.2 Chapter parsing: real atom, non-ASCII titles, truncated/garbage input, chapterAt boundaries.
- [x] 2.3 Coverage gate (`npm run test:coverage`) passes.

## 3. Verify
- [x] 3.1 `npm test`, `npm run build`.
- [x] 3.2 Headless Chrome against `vite preview`: add a generated audio file through the input, play, seek, next, remove; screenshots at 390×844.
- [ ] 3.3 On the phone (Sara): Add audio → play → lock the screen → still playing; lock-screen controls work.
