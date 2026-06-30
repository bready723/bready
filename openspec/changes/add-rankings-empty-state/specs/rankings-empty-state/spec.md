## ADDED Requirements

### Requirement: Rankings empty state
The Rankings screen SHALL display a guidance empty state whenever there are zero ranked bakeries, instead of a blank list.

#### Scenario: No bakeries logged yet
- **WHEN** the Rankings screen renders and the ranked bakery count is 0
- **THEN** an empty-state message is shown explaining no bakeries are ranked yet
- **AND** a "Log a visit" action is shown that navigates to the Log Visit screen

#### Scenario: At least one bakery exists
- **WHEN** the Rankings screen renders and the ranked bakery count is greater than 0
- **THEN** the normal ranked list is shown and the empty state is NOT rendered
