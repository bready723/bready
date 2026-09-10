## ADDED Requirements

### Requirement: Local audio shelf
The Listen tab SHALL let the user add audio files from the device and SHALL keep them only in this browser's IndexedDB.

#### Scenario: Adding files
- **WHEN** the user picks one or more audio files with "Add audio"
- **THEN** each file is stored locally with its name, size and a stable id
- **AND** the list shows them ordered by numeric filename prefix, then by name

#### Scenario: Non-audio file picked
- **WHEN** a picked file is neither `audio/*` nor has an audio extension
- **THEN** it is skipped and the user is told how many were added

### Requirement: Player
The Listen tab SHALL play one stored track at a time with play/pause, ±15 s, previous/next, speed and repeat-all.

#### Scenario: Track ends
- **WHEN** the current track ends and another track follows in the list
- **THEN** the next track starts automatically
- **AND** when it was the last track and repeat-all is on, the first track starts; otherwise playback stops

#### Scenario: Resume
- **WHEN** a track that was stopped more than 5 seconds in is opened again
- **THEN** playback starts from the saved position

#### Scenario: Lock screen
- **WHEN** a track is loaded and the browser supports Media Session
- **THEN** the lock screen shows the track title and play/pause/seek/next/previous work from there

### Requirement: Removal without dialogs
Removing a track SHALL take two explicit taps in the row and SHALL NOT use `confirm()` or any browser dialog.

#### Scenario: Remove
- **WHEN** the user taps × on a row and then taps Remove within 4 seconds
- **THEN** the track and its saved position are deleted
- **AND** if it was playing, playback stops
