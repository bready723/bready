## ADDED Requirements

### Requirement: Current-entry display
The calculator SHALL show the number currently being entered on the big line, and the operation in progress on the small line. It SHALL NOT show the result of an unfinished expression on the big line.

#### Scenario: Typing the second operand
- **WHEN** the user presses `6 4 0 + 4 0 0`
- **THEN** the big line reads `400`
- **AND** the small line reads `640 + 400`

#### Scenario: Completing the operation
- **WHEN** the user then presses `=`
- **THEN** the big line reads `1,040`

### Requirement: Correcting a mistake
The calculator SHALL let the user delete the last entered digit without clearing the whole calculation.

#### Scenario: Backspace during entry
- **WHEN** the display reads `4102` and the user presses `⌫`
- **THEN** the display reads `410`

#### Scenario: Backspace to empty
- **WHEN** the display reads `4` and the user presses `⌫`
- **THEN** the display reads `0`

#### Scenario: Clear entry versus clear all
- **WHEN** the user has entered a pending operation and then digits
- **THEN** the clear key is labelled `C` and clears only the current entry, leaving the pending operation intact
- **WHEN** there is no current entry
- **THEN** the clear key is labelled `AC` and resets the calculator

### Requirement: Operator chaining
The calculator SHALL evaluate immediately on each operator press, so a chain of operations accumulates left to right.

#### Scenario: Chained addition
- **WHEN** the user presses `2 + 3 + 4`
- **THEN** the small line shows the running total `5` as the left operand before `4` is entered
- **WHEN** the user presses `=`
- **THEN** the display reads `9`

#### Scenario: Changing your mind about the operator
- **WHEN** the user presses `+` and then `×` without entering a number between
- **THEN** the pending operator becomes `×` and no extra operation is performed

### Requirement: Repeat equals
The calculator SHALL repeat the last operation and operand when `=` is pressed again.

#### Scenario: Repeating an addition
- **WHEN** the user presses `5 + 3 = =`
- **THEN** the display reads `11`

### Requirement: Percent and sign
The calculator SHALL provide `%` and `+/−` keys with iOS semantics.

#### Scenario: Percent of a pending addition
- **WHEN** the user presses `200 + 10 %`
- **THEN** the current entry becomes `20`, being 10% of 200

#### Scenario: Standalone percent
- **WHEN** the user presses `50 %` with no pending addition or subtraction
- **THEN** the display reads `0.5`

#### Scenario: Negating the entry
- **WHEN** the display reads `7` and the user presses `+/−`
- **THEN** the display reads `-7`

### Requirement: Division by zero
The calculator SHALL show `Error` rather than a blank or infinite display when dividing by zero, and SHALL recover on the next key press.

#### Scenario: Dividing by zero
- **WHEN** the user presses `5 ÷ 0 =`
- **THEN** the display reads `Error`
- **WHEN** the user then presses any digit
- **THEN** the calculator resets and shows that digit
