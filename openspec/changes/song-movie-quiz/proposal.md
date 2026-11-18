## Why

Sara asked for a Guess the Song game built from Apple Music (her playlist plus
charts) and a Guess the Movie game that shows posters without the title, with all
six quizzes on one screen. Connecting her Apple Music account needs a paid Apple
Developer membership, so songs use Apple's free 30-second previews instead.

## What Changes

- **Hub: six tiles, 3 rows of 2**, still on one screen with no scrolling. New tiles:
  Guess the Song (album covers) and Guess the Movie (posters). Credits link reads "Credits".
- **Guess the Song**: the same look-say-reveal-mark play as Who Is This?. A 10-second
  clip plays while a record spins (the cover is hidden: it often shows the title);
  Show answer reveals cover, title, artist and year, with a link to the song on Apple
  Music. Each game is half Korean songs and half global songs. If the phone blocks sound
  from starting by itself, a "Tap to play" button appears. Own scoreboard (`bready.song.v1`).
- **Song pool** (`scripts/quiz/songs.py`): Sara's shared playlist, the US and Korea
  "most played" top 100s, and an all-time favourites list (`songs-classics.csv`);
  explicit tracks and songs without a preview are left out. Previews and covers are
  streamed from Apple at play time; only names and addresses are stored.
- **Guess the Movie**: a textless poster (or a still from the film when there is none),
  5-second ring, reveal title and year. Pool from TMDB (`scripts/quiz/movies.py`):
  best-known English-language, Korean, animated and recent movies. Images streamed from
  TMDB; TMDB credited as its terms require. Own scoreboard (`bready.movie.v1`).

## Impact

- New: `src/lib/songs.json`, `src/lib/movies.json`, `scripts/quiz/songs.py`,
  `scripts/quiz/songs-classics.csv`, `scripts/quiz/movies.py`.
- Changed: `src/screens/FaceGame.jsx` (`kind`, `pick`, `seconds`; song audio),
  `src/screens/Quiz.jsx`, `src/lib/quiz.js` (`pickMixed`, `subLine`, per-game clock,
  remote pictures), `src/styles.css`, credits pages.
- The TMDB key lives only in `.env` (not committed) and is used only when building the list.
