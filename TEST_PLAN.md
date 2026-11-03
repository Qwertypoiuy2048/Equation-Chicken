# Equation Chicken test plan

This project has two kinds of behavior to protect:

1. **Game rules**, which should be deterministic and easy to test without a browser.
2. **Interaction flow**, including p5.js drawing input and screen transitions.

The initial automated suite is now available under `tests/` and runs with:

```text
npm test
```

It currently covers the game-state transitions, scoring/reset behavior, graph-bound state, required page assets and controls, and the shared browser-script/p5 sketch contract.

Equation editing also has separate coverage for verify-without-save, accept-and-history, and revert-to-turn-start behavior.

## Recommended framework

The current suite uses Node’s built-in `node:test` runner. Add Playwright later for a small number of browser smoke tests; the existing source-level tests should remain fast and independent of canvas pixels.

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

- A new game starts with `y = x`, default bounds `-10…10` on both axes, Player 1 active, and zero points.
- A legal alteration changes the equation and passes the turn to the other player.
- A legal bounds alteration changes exactly one of the four boundary values and passes the turn to the other player.
- A bounds alteration with zero or multiple changed values is rejected.
- A challenge ends alteration turns and enters graphing for the challenged player.
- A forfeit awards the point to the challenger and enters the result state.
- Accepting a drawing awards the point to the drawer and reveals the reference graph.
- Submitting a drawing freezes the graphing area and reveals judgment options on the same screen.
- Rejecting a drawing replaces the judgment options with accept-loss or counter-challenge options.
- A counter-challenge swaps the drawer and keeps the same equation.
- After both players draw, final judgment can award Player 1, award Player 2, or record both failures with no point.
- Starting-player rules choose the previous loser, lower-score player after a draw, or Player 1 on a tie.
- Match reset restores `y = x` and clears banned tokens while preserving scores and used removals.

### Equation rules

- `y = x`, `y = 2x + 3`, `y = ln(x)`, `y = sqrt(x)`, `y = sin(x)`, `y = cos(x)`, `y = tan(x)`, `y = ceil(x)`, `y = floor(x)`, and `y = abs(x)` are accepted as graphable examples.
- Relations may be tokenized, but the current compiler rejects graph forms outside `y = expression`.
- Invalid syntax is rejected without changing state.
- Implicit multiplication works for `2x`, `xy`, `3(x)`, and `(x)y`.
- Absolute-value bars, `%` remainder, and `//` integer division evaluate correctly.
- Grouped functions such as `abs()` are recognized by the parser.
- Token removal and bans are future-feature coverage, not current V0.1 coverage.

### Browser smoke tests

- The turn screen exposes the equation, active player, score, graph bounds, equation history, and three main actions.
- Navigating between the three pages preserves the shared game state.
- Challenge → graphing → submit → frozen judgment → result completes without a page reload.
- Draw, Point, Line, and Plotter input create drawings; Undo and Clear remove drawings; Submit prevents further drawing.
- The reference graph stays hidden during drawing and appears after the drawing is accepted.
- Rejecting a drawing reveals accept-loss/counter-challenge options in place.
- Counter-challenge returns to the same graphing screen with Player 1 as the drawer.
- After the counter-challenge drawing is submitted, the result page offers the three final-judgment choices.
- Final judgment displays both stored player drawings together with the computer reference graph.
- Both-failed leaves scores unchanged and selects the next starting player from the current score.
- A completed result increments exactly one player's score, and Next match preserves scores while advancing the match and starting player.
- Forfeit reaches the result screen.
- The p5 graph accepts pointer input, supports all four drawing tools, can undo/clear, and can be submitted.
- The reference graph is not visible during the drawing phase.

## V0.1 verification gaps

The automated tests cover state transitions and page/source contracts. Browser-level Playwright coverage is still a future improvement, particularly for real pointer input, p5 rendering, resizing, and visual verification of tick labels.
