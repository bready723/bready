## MODIFIED Requirements

### Requirement: Quiz hub
The Quiz tab SHALL open on four picture tiles in a 2×2 grid; tapping a tile starts that quiz.

#### Scenario: Opening the tab
- **WHEN** the user opens the Quiz tab
- **THEN** tiles for "Who Is This?", "Country → Capital", "Flag → Country" and "Logo Quiz" are shown two up and two down, without scrolling on a phone
- **AND** each tile shows pictures from its quiz, its title, and "Best N" or "New"
- **AND** a credits link sits below them

## ADDED Requirements

### Requirement: Logo Quiz
The Logo Quiz SHALL play like Who Is This?: 20 distinct logos, a 5-second timer, a reveal, and a self-marked right or wrong.

#### Scenario: Playing a round
- **WHEN** the user taps the Logo Quiz tile
- **THEN** a logo is shown on a white card with a 5-second ring
- **AND** Show answer (or the timer running out) reveals the brand name and the logo credit
- **AND** after 20 logos the score, the Who played? card, the logo scoreboard and the missed logos with names are shown

#### Scenario: Separate scoreboard
- **WHEN** a Logo Quiz game ends
- **THEN** it is saved under the logo scoreboard only, and the hub tile shows its best score

### Requirement: Free logo images
Every logo SHALL come from Wikimedia Commons under a free licence or public domain, and be listed with its credit on the credits page.
