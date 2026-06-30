## Context

`src/screens/Rankings.jsx` renders a ranked list from data produced by `src/lib/ranking.js`. With no logged visits the list is empty and nothing else renders.

## Goals / Non-Goals

- Goal: show a helpful empty state with a path to "Log a visit" when count is 0.
- Non-Goal: change ranking math, storage, sorting, or the populated-list UI.

## Decisions

- **Branch in the view layer, not the logic.** Keep `ranking.js` pure; decide empty-vs-list inside `Rankings.jsx` based on the computed list length. Rationale: smallest blast radius, no logic risk.
- **Reuse existing navigation** to the Log Visit screen (same mechanism other screens use) rather than introducing new routing.
- **Keep copy minimal** and consistent with the app's existing tone.

## Risks / Trade-offs

- Low risk: purely additive render branch. Main thing to verify is the count threshold (exactly 0 → empty state).

## Open Questions

- Final empty-state copy wording (placeholder acceptable for the proposal).
