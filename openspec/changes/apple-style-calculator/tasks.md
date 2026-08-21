## 1. Logic
- [x] 1.1 Add `src/lib/calculator.js`: `initialState()` and `press(state, key)`, plus display helpers.
- [x] 1.2 Digit / decimal entry with an overwrite flag and a digit cap.
- [x] 1.3 Operator chaining with immediate execution (`2+3×4` evaluates left to right on each operator press).
- [x] 1.4 `=` computes, and a second `=` repeats the last operation and operand.
- [x] 1.5 `AC` / `C`, `⌫`, `%` (iOS semantics), `+/−`, divide-by-zero → `Error`.
- [x] 1.6 Remove `evalExpression` from `src/lib/fx.js`.

## 2. UI
- [x] 2.1 Re-lay the keypad in `FX.jsx` to the iOS order and key set, round keys.
- [x] 2.2 Small line = the running expression, big line = the current entry.
- [x] 2.3 Highlight the pending operator key; `AC` label flips to `C` after entry.

## 3. Tests
- [x] 3.1 `src/lib/calculator.test.js` covering every branch above.
- [x] 3.2 Drop the `evalExpression` block from `fx.test.js`.
- [x] 3.3 Add a `src/lib/calculator.js` coverage threshold in `vite.config.js`.

## 4. Verify
- [x] 4.1 `npm test` passes.
- [x] 4.2 Headless browser QA: drive the real keypad through many sequences and assert the display.
- [x] 4.3 Compare each sequence against the iPhone calculator's expected answer.
