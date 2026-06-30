## 1. Implementation
- [ ] 1.1 In `src/screens/Rankings.jsx`, compute the ranked list and branch when length === 0.
- [ ] 1.2 Render an empty-state block (message + "Log a visit" button) for the 0 case.
- [ ] 1.3 Wire the button to navigate to the Log Visit screen using the existing nav pattern.

## 2. Tests
- [ ] 2.1 Add a render test: with zero data, the empty-state message and button appear.
- [ ] 2.2 Add a render test: with ≥1 bakery, the list renders and the empty state does not.
- [ ] 2.3 Ensure coverage stays above the pre-commit threshold.

## 3. Verify
- [ ] 3.1 `npm test` passes.
- [ ] 3.2 Manual check in `npm run dev`: fresh state shows empty state; after a logged visit it shows the list.
