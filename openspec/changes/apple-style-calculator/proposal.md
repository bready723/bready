## Why

The FX tab's calculator is the part of bready Sara actually uses daily, and it
misbehaves. Four concrete problems, all traceable to one design choice — the
calculator stores a raw expression string and re-evaluates the whole thing on
every keypress:

- The big display shows the result of the *whole* expression while you are still
  typing, so it jumps to `1,040` halfway through entering `640+400`. A calculator
  should show the number you are currently entering.
- After `=`, the expression is replaced by the result string, so `⌫` chews digits
  off the answer instead of correcting the entry. Sara reported not knowing how
  to fix a mistyped number at all.
- Pressing `=` again does nothing. Every hardware and phone calculator repeats
  the last operation.
- `%` and `+/−` are missing, and the key layout does not match the iPhone
  calculator Sara compares it to (`=` spans two rows, operators sit in the wrong
  order).

There is also a real bug: a leading minus (`-5`) makes `evalExpression` return
null, so the display goes blank.

## What Changes

- Replace the expression-string calculator with a proper immediate-execution
  state machine, matching the iOS calculator's behaviour.
- Match the iOS key layout and key set: `⌫ AC % ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 + /
  +/− 0 . =`, with round keys and the pending operator highlighted.
- Keep bready's palette (blue operators, magenta accents) — Apple's *behaviour*
  and *layout*, not Apple's colours.
- Retire `evalExpression` from `src/lib/fx.js`; the currency converter never used
  it and nothing else does.

## Capabilities

### New Capabilities
- `fx-calculator`: how the FX tab's calculator responds to key presses.

### Modified Capabilities
<!-- none: the currency converter above the calculator is untouched -->

## Impact

- Code: new `src/lib/calculator.js` (pure state machine, no React).
  `src/screens/FX.jsx` calculator section re-rendered against it.
  `src/styles.css` `.fx-key*` / `.fx-display*` rules.
  `src/lib/fx.js` loses `evalExpression`.
- Data/logic: no storage change; the converter, rates and trend chart are untouched.
- Tests: new `src/lib/calculator.test.js` covering entry, editing, chaining,
  repeat-equals, percent, sign, and divide-by-zero. `fx.test.js` drops its
  `evalExpression` block. New coverage threshold for `calculator.js`.
