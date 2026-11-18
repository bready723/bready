## MODIFIED Requirements

### Requirement: Quiz hub
The Quiz tab SHALL open on six picture tiles, two per row, on one screen.

#### Scenario: Opening the tab
- **WHEN** the user opens the Quiz tab
- **THEN** tiles for Who Is This?, Country → Capital, Flag → Country, Logo Quiz, Guess the Song and Guess the Movie are shown without scrolling on a phone
- **AND** each tile shows pictures from its quiz, its title, and "Best N" or "New"

## ADDED Requirements

### Requirement: Guess the Song
Guess the Song SHALL play 20 song clips per game, half Korean and half global, with a 10-second timer.

#### Scenario: Playing a song
- **WHEN** a question starts
- **THEN** the clip plays and the timer starts once sound is playing, while a spinning record hides the cover
- **AND** Show answer (or the timer running out) shows the cover, title, artist and year, and a link to Apple Music

#### Scenario: Sound blocked
- **WHEN** the phone does not let the clip start by itself
- **THEN** a "Tap to play" button starts it

#### Scenario: Clip unavailable
- **WHEN** a clip cannot be loaded
- **THEN** the answer is shown so the game can go on

### Requirement: Guess the Movie
Guess the Movie SHALL show a movie picture with no title text, with a 5-second timer.

#### Scenario: Playing a movie
- **WHEN** a question starts
- **THEN** a textless poster or film still is shown
- **AND** the reveal shows the title and year, and TMDB is credited

### Requirement: Streamed media, separate scoreboards
Song clips, covers and movie pictures SHALL be loaded from Apple or TMDB at play time and not stored in the app; each game SHALL keep its own scoreboard.
