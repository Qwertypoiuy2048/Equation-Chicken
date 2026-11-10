# Equation Chicken

> A two-player graphing game where players alter an equation until one of them decides to challenge the other player to draw it.


## Core idea

The equation begins as:

```text
y = x
```

Players take turns changing the equation, changing one graph boundary, or challenging the other player. A challenge ends the current match and forces the challenged player to draw the graph.

The overall game is made up of multiple matches. Each match awards at most one point, then the equation resets to `y = x`.

## Rules

### Turns

On a turn, a player chooses exactly one action:

1. **Alter the equation** with one legal change.
2. **Alter graph bounds** by changing exactly one of x-min, x-max, y-min, or y-max.
3. **Challenge the other player.**

If the alteration produces a valid, graphable equation, the turn passes to the other player. This continues until someone challenges, which ends the alteration phase.

### Altering the equation

The equation must remain valid after every alteration. A legal alteration may:

- change one character;
- add one character;
- add a symbol together with one single-digit integer, such as `+3`;
- add both opening and closing parentheses together;
- add digits one at a time to create a multi-digit number.
- add a grouped function like `abs(` or `sin(`

Alterations may be placed anywhere on the right side of the equation.
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

The current graph compiler only accepts functions written as `y = expression`. 
Current graphable examples include:

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
5. If Player A accepts the drawing, the computer-generated graph is revealed for comparison, and Player B receives one point.
6. If Player A rejects the drawing, Player B chooses either to accept the loss or counter-challenge.
7. If Player B accepts the loss, Player A receives one point.
8. If Player B counter-challenges, Player A must draw the same equation.
9. If Player A succeeds at the counter-challenge, Player A receives one point.
10. If Player A fails, Player B receives one point.

When both players have drawn, the final result page can award the point to Player 1, award it to Player 2, or record that both drawings failed. A both-failed result awards no point.

The final judgment view displays both player drawings alongside the computer-generated reference graph for comparison.

### Graph bounds

Each match carries a shared graph view with x-min, x-max, y-min, and y-max values. A bounds turn may change exactly one of those four values.

The graph automatically chooses readable tick spacing based on the visible range and keeps grid cells approximately square. 

## Scoring and reset

- A match win awards one point.
- A draw awards no points.
- After every match, the equation resets to `y = x`.
- Players retain their remaining removal actions.

### Starting player

- Player 1 starts the first match by default.
- The loser of the previous match starts the next match.
- After a draw, the player with fewer points starts.
- If the score is tied, Player 1 starts by default.

## Wireframe

The V0.1 implementation is split into [index.html](index.html), [challenge.html](challenge.html), and [result.html](result.html), with shared behavior in [script.js](script.js), equation parsing in [equation.js](equation.js), graph rendering and pointer input in [graph-sketch.js](graph-sketch.js), and shared styling in [styles.css](styles.css). The original prototype remains available in [wireframe.html](wireframe.html). The testing strategy is tracked in [TEST_PLAN.md](TEST_PLAN.md).

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
- Sound effects and arcade style feedback.
- A single player practice mode.
- Accessibility settings for colors and line thickness.
- A match history view.
- A fit-equation view command for the reference graph, with safeguards for discontinuities and extreme values.
- Token removal and bans.
- Editable left hand variables and relation/region graphing.
