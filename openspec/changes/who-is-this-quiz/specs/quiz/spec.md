## ADDED Requirements

### Requirement: A game of twenty random faces
The Quiz tab SHALL draw 20 distinct people at random from the pool for each game.

#### Scenario: Starting a game
- **WHEN** the user taps Start (or Replay)
- **THEN** 20 people are chosen at random with no repeats within the game
- **AND** question 1 shows with the counter "1 / 20"

#### Scenario: Pool smaller than twenty
- **WHEN** the pool holds fewer than 20 people
- **THEN** the game uses the whole pool and the score is still scaled to 100

### Requirement: Five-second countdown that waits for the photo
Each question SHALL show the photo first and only then count down 5, 4, 3, 2, 1, 0 in one-second steps.

#### Scenario: Photo loads
- **WHEN** the photo for the current question has finished loading
- **THEN** the ring timer shows 5 and starts counting down

#### Scenario: Timer reaches zero
- **WHEN** the countdown reaches 0 and the user has not tapped Show answer
- **THEN** the name is revealed automatically

#### Scenario: Show answer early
- **WHEN** the user taps Show answer during the countdown
- **THEN** the countdown stops where it is and the name is revealed

### Requirement: Honour-system scoring
After the reveal the user SHALL mark the answer right or wrong; each right answer is worth 100 ÷ 20 points.

#### Scenario: Marking an answer
- **WHEN** the user taps "I got it right" or "I got it wrong"
- **THEN** the answer is recorded and the next question appears
- **AND** no running score is shown during play

#### Scenario: End of game
- **WHEN** the 20th answer is marked
- **THEN** the end screen shows the score out of 100 and "N of 20 right"
- **AND** offers Replay (a new random 20) and Stop (back to the start screen)

### Requirement: Pool with recent stars and credits
The pool SHALL hold the 331 faces from the deck plus new faces whose photos are CC-licensed from Wikimedia Commons.

#### Scenario: Commons photo
- **WHEN** a new person is imported from Wikimedia Commons
- **THEN** the entry records author, licence and source URL
- **AND** `public/quiz/CREDITS.md` lists them

#### Scenario: No usable photo
- **WHEN** a candidate has no Wikidata image or a non-free licence
- **THEN** they are skipped and reported, never added without a credit

### Requirement: Glass look, bready colours
The Quiz screen SHALL use translucent blurred cards with rim light, depth shadows, pointer sheen and tilt, over floating brand-coloured blobs, scoped to the Quiz tab only.

#### Scenario: Reduced motion
- **WHEN** the device asks for reduced motion
- **THEN** blobs do not float, cards do not tilt, and reveals appear without animation

#### Scenario: Other tabs unchanged
- **WHEN** the user opens any other tab
- **THEN** nothing about its look has changed

### Requirement: Photos cached as viewed
Photos SHALL be served from `/quiz/` and cached by the service worker on first view, not precached.

#### Scenario: Offline replay
- **WHEN** a photo was shown once while online and the phone is now offline
- **THEN** that photo still displays

### Requirement: Scoreboard of past games
Every finished game SHALL be saved on this phone (localStorage `bready.quiz.v1`, newest first, at most 50) and shown on the end screen.

#### Scenario: End of a game
- **WHEN** the 20th answer is marked
- **THEN** the game is saved once, and the end screen lists the last 10 games with when they were played and their score
- **AND** shows best, average and number of games; "New best!" appears only when the game beats every earlier one

#### Scenario: Quitting mid-game
- **WHEN** the user taps ✕ before the 20th answer
- **THEN** nothing is saved
