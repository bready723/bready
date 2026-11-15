## ADDED Requirements

### Requirement: Quiz hub
The Quiz tab SHALL open on three cards, each showing only a title and a Start button.

#### Scenario: Opening the tab
- **WHEN** the user opens the Quiz tab
- **THEN** cards for "Who Is This?", "Country → Capital" and "Flag → Country" are shown, each with Start
- **AND** a credits link sits below them

### Requirement: Four-choice world rounds
Country → Capital and Flag → Country SHALL ask 20 distinct questions with 4 distinct choices and no timer.

#### Scenario: A fresh round
- **WHEN** no questions are waiting from earlier misses
- **THEN** the round holds 2 easy, 4 medium and 14 hard questions
- **AND** each question's three wrong choices come from the same region when it has enough countries

#### Scenario: Answering
- **WHEN** the user taps a choice
- **THEN** the right choice turns green, a wrong pick turns red, and the next question follows after about a second or on another tap

### Requirement: Misses return
Missed questions SHALL lead the next round of the same quiz until answered right.

#### Scenario: Replaying after misses
- **WHEN** a round ends with 5 misses
- **THEN** the end screen says "5 questions return in your next capital quiz"
- **AND** those 5 are in the next round, and are cleared once answered right

### Requirement: World end screen
The end screen SHALL show the score out of 20, a verdict, a review of misses with the player's answer, the "Who played?" card and the quiz's own scoreboard.
