## ADDED Requirements

### Requirement: Pool choice before face and song games
The player SHALL choose the pool before Who Is This? (Mix, Korean, Not Korean) and Guess
the Song (Mix, Korean, Pop; All, 80s-90s, 2000s, 2010s-now), see how many items it holds,
and find the last choice selected next time.

#### Scenario: Korean 2000s songs
- **WHEN** Sara picks Korean and 2000s and taps Start
- **THEN** every song in the round is a Korean song that was a hit in 2000-2009

### Requirement: Familiar faces only
Faces marked `rare` SHALL never be drawn into a round.

#### Scenario: Rare face
- **WHEN** a round is built
- **THEN** it contains no face marked `rare`
