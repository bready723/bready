## Why

When a new user opens the Rankings screen before logging any bakery visits, the list is blank with no guidance, which looks broken and gives no next step. A friendly empty state turns that dead end into an onboarding nudge.

## What Changes

- Add an empty state to the Rankings screen shown when there are zero ranked bakeries.
- The empty state shows a short message and a button that navigates to "Log a visit".
- No change to ranking logic, storage, or any populated-list behavior.

## Capabilities

### New Capabilities
- `rankings-empty-state`: how the Rankings screen behaves when there is no ranking data yet.

### Modified Capabilities
<!-- none — greenfield example, no existing specs change -->

## Impact

- Code: `src/screens/Rankings.jsx` (render branch), possibly a small reuse of existing nav to `LogVisit`.
- Data/logic: none (`src/lib/ranking.js` unchanged).
- Tests: add a unit/render test asserting the empty state appears with zero data.
