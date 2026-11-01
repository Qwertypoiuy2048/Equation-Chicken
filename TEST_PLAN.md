# Equation Chicken test plan

This project has two kinds of behavior to protect:

1. **Game rules**, which should be deterministic and easy to test without a browser.
2. **Interaction flow**, including p5.js drawing input and screen transitions.

## Recommended framework

Use **Vitest** for the game engine, tokenizer/parser, equation alterations, scoring, and reset logic. Add **Playwright** once the first playable browser build exists for a small number of end-to-end smoke tests.

The p5.js sketch should be a thin rendering/input layer around a plain game-state module. That keeps most tests fast and avoids making the test suite depend on canvas pixels.

## Suggested structure

```text
src/
  game/       state machine, scoring, reset rules
  equation/   tokenizer, validator, legal alterations
  ui/         p5.js rendering and pointer input
tests/
  game/       Vitest unit tests
  equation/   Vitest unit tests
  ui/         focused browser smoke tests
```

## First test cases

### Game state

- A new game starts with `y = x`, Player 1 active, zero points, and three removals per player.
- A legal alteration changes the equation and passes the turn to the other player.
- A challenge ends alteration turns and enters graphing for the challenged player.
- A forfeit awards the point to the challenger and enters the result state.
- Accepting a drawing awards the point to the drawer and reveals the reference graph.
- Submitting a drawing freezes the graphing area and reveals judgment options on the same screen.
- Rejecting a drawing replaces the judgment options with accept-loss or counter-challenge options.
- A counter-challenge swaps the drawer and keeps the same equation.
- Starting-player rules choose the previous loser, lower-score player after a draw, or Player 1 on a tie.
- Match reset restores `y = x` and clears banned tokens while preserving scores and used removals.

### Equation rules

- `y = x`, `y = 2x + 3`, `x < y`, and `abs(x) = y` are accepted as graphable examples.
- Invalid syntax is rejected without changing state.
- Implicit multiplication works for `2x`, `xy`, `3(x)`, and `(x)y`.
- Grouped tokens such as `abs()` are treated as one removable token.
- A removal is allowed only when exactly one matching token exists.
- A removed token is unavailable for the rest of the match, then becomes available on reset.

### Browser smoke tests

- The turn screen exposes the equation, active player, score, removals, banned tokens, and two main actions.
- Challenge → graphing → submit → frozen judgment → result completes without a page reload.
- Rejecting a drawing reveals accept-loss/counter-challenge options in place.
- Counter-challenge returns to the same graphing screen with Player 1 as the drawer.
- Forfeit reaches the result screen.
- The drawing canvas accepts pointer input, can be cleared, and can be submitted.
- The reference graph is not visible during the drawing phase.

## Implementation order

1. Add a package manifest and choose the p5.js entry point.
2. Extract a pure `GameState` model with explicit event transitions.
3. Add Vitest and implement the game-state tests above.
4. Implement tokenizer/validator behavior behind a small interface and test it independently.
5. Connect the p5.js UI to the tested state model.
6. Add Playwright smoke coverage for the challenge flow.

The first useful milestone is not the full equation parser: it is a playable state machine using a small allowlist of known equations. That gives us a testable loop while the parser and graph renderer grow independently.
