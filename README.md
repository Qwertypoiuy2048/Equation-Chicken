# Equation Chicken

> A two-player graphing game where players alter an equation until one of them decides to challenge the other player to draw it.

Equation Chicken is a Useful/Useless Hackathon project built with [p5.js](https://p5js.org/). It is useful because it practices graphing intuition and mathematical notation. It is useless because the main goal is to make the equation increasingly dangerous to graph before someone calls the other player's bluff.

## Core idea

The equation begins as:

```text
y = x
```

Players take turns changing the equation, changing one graph boundary, or challenging the other player. A challenge ends the current match and forces the challenged player to draw the graph using the p5.js drawing tools.

The overall game is made up of multiple matches. Each match awards at most one point, then the equation resets to `y = x`.

## Rules

### Turns

On a turn, a player chooses exactly one action:

1. **Alter the equation** with one legal change.
2. **Alter graph bounds** by changing exactly one of x-min, x-max, y-min, or y-max.
3. **Challenge the other player.**

If the alteration produces a valid, graphable equation, the turn passes to the other player. A challenge may happen at any time, including immediately when the equation is `y = x`.

A challenge ends the alteration phase regardless of the outcome.

### Altering the equation

The equation must remain valid after every alteration. A legal alteration may:

- change one character;
- add one character;
- add a symbol together with one single-digit integer, such as `+3`;
- add both opening and closing parentheses together;
- add digits one at a time to create a multi-digit number.

Characters and additions may be placed anywhere as long as the resulting expression is valid and graphable.

Examples:

```text
y = x       →  y = 2x
y = 2x      →  y = 2x + 3
y = 2x + 3  →  y = 2x^2 + 3
```

### Equation vocabulary

The first version supports:

- variables: `x`, `y`;
- digits: `0` through `9`;
- operators: `+`, `-`, `*`, `/`, `//`, `%`, `^`;
- relations: `=`, `<`, `>`, `<=`, `>=`;
- constants: `π` and `e`;
- parentheses;
- grouped functions: `abs()`, `ln()`, `sqrt()`, `sin()`, `cos()`, `tan()`, `ceil()`, and `floor()`.

Absolute value may also use bars, such as `|x - 3|`. `%` is remainder, and `//` is integer division truncated toward zero.

Other variables, such as `r` or `Θ`, may be added later.

Implicit multiplication is allowed:

```text
2x      means 2 * x
xy      means x * y
3(x)    means 3 * (x)
(x)y    means (x) * y
```

The tokenizer recognizes relations, but the current graph compiler only accepts functions written as `y = expression`. Editable left-hand variables, inequalities, and regions are future enhancements. Current graphable examples include:

```text
y = x
y = 2x + 3
y = abs(x)
```

### Token removal — future feature

Token removal is planned but is not part of the current V0.1 implementation. The intended rules are:

- A player may remove a token only when exactly one instance of that token appears in the current equation.
- The removed token is banned for the remainder of the current match.
- A banned token cannot be added or used again during that match.
- When the match resets, banned tokens become available again.
- Used removal actions do not reset. Players keep only their remaining removal actions.

Examples:

```text
Remove 4    →  no more 4s may be used this match
Remove ^    →  no more exponents may be used this match
Remove abs() →  absolute value may not be used this match
```

The implementation should treat grouped operators such as `abs()` as a single mathematical token.

## Challenge rules

The challenge sequence is:

1. Player A challenges Player B.
2. Player B may draw the graph or forfeit.
3. A forfeit immediately loses the match; Player A receives one point.
4. If Player B draws, Player A judges the drawing.
5. If Player A accepts the drawing, the computer-generated graph is revealed for comparison and Player B receives one point.
6. If Player A rejects the drawing, Player B chooses either to accept the loss or counter-challenge.
7. If Player B accepts the loss, Player A receives one point.
8. If Player B counter-challenges, Player A must draw the same equation.
9. If Player A succeeds at the counter-challenge, Player A receives one point.
10. If Player A fails, Player B receives one point.

When both players have drawn, the final result page can award the point to Player 1, award it to Player 2, or record that both drawings failed. A both-failed result awards no point.

The final judgment view displays both player drawings alongside the computer-generated reference graph for comparison.

For now, equation editing keeps the left side fixed as `y =` and only allows editing the right-hand expression. Supporting editable left-hand variables and relations is a future enhancement.

The computer graph is a reference tool. It should remain hidden until the current player has finished drawing so that the player must graph the equation independently.

### Graph bounds

Each match carries a shared graph view with x-min, x-max, y-min, and y-max values. A bounds turn may change exactly one of those four values, and the new view is passed to the challenge and final comparison screens. Bounds must be numeric and each minimum must be less than its maximum.

The graph automatically chooses readable tick spacing based on the visible range and keeps grid cells approximately square. The current version does not yet provide a fit-equation command.

## Scoring and reset

- A match win awards one point.
- A draw awards no points. A draw may be used for an unresolved or agreed-upon result if that rule is added later.
- After every match, the equation resets to `y = x`.
- Banned tokens become available again after the reset.
- Players retain their remaining removal actions.

### Starting player

- Player 1 starts the first match by default.
- The loser of the previous match starts the next match.
- After a draw, the player with fewer points starts.
- If the score is tied, Player 1 starts by default.

## Wireframe

The V0.1 implementation is split into [index.html](index.html), [challenge.html](challenge.html), and [result.html](result.html), with shared behavior in [script.js](script.js), equation parsing in [equation.js](equation.js), graph rendering and pointer input in [graph-sketch.js](graph-sketch.js), and shared styling in [styles.css](styles.css). The original prototype remains available in [wireframe.html](wireframe.html). The testing strategy is tracked in [TEST_PLAN.md](TEST_PLAN.md).

Run the automated checks with `npm test`.

The current interface uses three primary screens, with judgment embedded in the graphing screen.

### 1. Turn screen

```text
┌──────────────────────────────────────────────────────────────┐
│                       EQUATION CHICKEN                       │
├──────────────────────────────────────────────────────────────┤
│  Player 1's turn                         Match: 3             │
│  Score: P1 2       Score: P2 1       Removals: P1 2 / P2 1   │
│                                                              │
│                         y = 2x + 3                           │
│                                                              │
│  Banned this match:  4, ^                                   │
│                                                              │
│  [ Alter Equation ]                 [ Challenge Player 2 ]   │
│                                                              │
│  Equation history: y = x → y = 2x → y = 2x + 3              │
└──────────────────────────────────────────────────────────────┘
```

The turn screen makes the current player, equation, score, graph bounds, equation history, and available actions obvious.

### 2. Graphing screen

```text
┌──────────────────────────────────────────────────────────────┐
│  Player 2 must graph:  y = 2x + 3                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                 y                                             │
│                 ▲          /                                  │
│                 │        /                                    │
│                 │      /                                      │
│                 │    /                                        │
│      ───────────┼──────────────► x                            │
│                 │                                              │
│                                                              │
│  Draw on the graph. The reference graph is hidden.            │
│                                                              │
│  [ Clear ]                  [ Submit Drawing ]  [ Forfeit ]   │
└──────────────────────────────────────────────────────────────┘
```

The challenged player uses the mouse or touch input to draw directly on the p5.js graph canvas. There is no timer.

### 3. Judgment state within the graphing screen

After the drawing is submitted, the graphing area shrinks or freezes in place and the judgment controls appear below it. The reference graph remains hidden while Player 1 decides whether the drawing is good or bad.

```text
┌──────────────────────────────────────────────────────────────┐
│  Player 2 has submitted a graph.                             │
│                                                              │
│  [ Player 2's drawing is good ]   [ Player 2's drawing is bad ]│
└──────────────────────────────────────────────────────────────┘
```

If the drawing is accepted, the reference graph appears and Player 2 receives the point.

If the drawing is rejected:

```text
┌──────────────────────────────────────────────────────────────┐
│  Player 2 may accept the loss or counter-challenge.          │
│                                                              │
│  [ Accept Loss ]                         [ Counter-Challenge ] │
└──────────────────────────────────────────────────────────────┘
```

### 4. Result screen

```text
┌──────────────────────────────────────────────────────────────┐
│                         MATCH RESULT                         │
│                                                              │
│                    Player 1 wins!                           │
│                    Score: P1 3 — P2 1                       │
│                                                              │
│                    Next starting player: P2                 │
│                                                              │
│                         [ Next Match ]                       │
└──────────────────────────────────────────────────────────────┘
```

## Program structure

The p5.js implementation can be divided into these responsibilities:

- **Game state:** current player, match number, scores, removal counts, banned tokens, and screen state.
- **Equation editor:** applies one proposed alteration and checks whether the result is legal.
- **Tokenizer/parser:** recognizes numbers, variables, operators, relations, parentheses, constants, and grouped functions.
- **Graph renderer:** displays the computer-generated function graph for the current equation.
- **Drawing tools:** support freehand, point, straight-line, and connected plotter drawings, with Undo and Clear.
- **Drawing canvas:** records the challenged player’s freehand graph.
- **Challenge flow:** handles drawing, judgment, rejection, counter-challenge, and result states.
- **Reset logic:** resets the equation and graph bounds while preserving scores.

A simple state flow is:

```text
TURN
├── ALTER → VALIDATE → TURN (other player)
└── CHALLENGE → GRAPH DRAWING / JUDGMENT
                ├── FORFEIT → RESULT
                └── SUBMIT → FREEZE DRAWING → JUDGMENT
                              ├── ACCEPT → REVEAL → RESULT
                              └── REJECT → ACCEPT LOSS or COUNTER-CHALLENGE
                                                        └── GRAPH DRAWING → RESULT
```


## V0.1 status

The current version includes the three-page turn/challenge/result flow, shared equation and graph-bound state, one-edit equation validation, one-boundary validation, p5.js graphing, multiple drawing tools, challenge judgment, counter-challenge, final comparison, scoring, and automated tests.

## Future ideas

- Additional variables such as `r` and `Θ`.
- Additional mathematical functions beyond the current grouped-function set.
- Sound effects and arcade-style feedback.
- A single player practice mode.
- Accessibility settings for colors and line thickness.
- A match-history view.
- A fit-equation view command for the reference graph, with safeguards for discontinuities and extreme values.
- Token removal and bans.
- Editable left-hand variables and relation/region graphing.
