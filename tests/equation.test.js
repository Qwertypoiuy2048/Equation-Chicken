const test = require('node:test');
const assert = require('node:assert/strict');
const EquationParser = require('../equation.js');

test('evaluates a basic linear equation', () => {
  const graph = EquationParser.compile('y = 2x + 3');
  assert.equal(graph.evaluate(0), 3);
  assert.equal(graph.evaluate(4), 11);
});

test('evaluates a line with an implicit coefficient of one', () => {
  const graph = EquationParser.compile('y = x');
  assert.equal(graph.evaluate(-5), -5);
  assert.equal(graph.evaluate(7), 7);
});

test('evaluates exponent expressions', () => {
  const graph = EquationParser.compile('y = 2x^2 + 3');
  assert.equal(graph.evaluate(0), 3);
  assert.equal(graph.evaluate(2), 11);
  assert.equal(graph.evaluate(-2), 11);
});

test('supports parentheses and explicit multiplication', () => {
  const graph = EquationParser.compile('y = 2*(x + 1)^2');
  assert.equal(graph.evaluate(0), 2);
  assert.equal(graph.evaluate(2), 18);
});

test('ignores spaces while tokenizing and evaluating equations', () => {
  const spaced = EquationParser.compile(' y = 2 x ^ 1 / 2 ');
  const compact = EquationParser.compile('y=2x^1/2');
  assert.equal(spaced.evaluate(6), compact.evaluate(6));
  assert.deepEqual(
    EquationParser.tokenize(' 2 x ^ 1 / 2 ').map(token => token.value),
    [2, 'x', '^', 1, '/', 2, null]
  );
});

test('supports pi and e constants', () => {
  const graph = EquationParser.compile('y = pi + e');
  assert.equal(graph.evaluate(0), Math.PI + Math.E);
});

test('tokenizes all supported relation operators', () => {
  for (const relation of ['=', '<', '>', '<=', '>=']) {
    const parsed = EquationParser.parseEquation(`x ${relation} y`);
    assert.equal(parsed.relation, relation);
  }
});

test('supports constants with implicit multiplication and parentheses', () => {
  const graph = EquationParser.compile('y = (x + 1)pi');
  assert.equal(graph.evaluate(0), Math.PI);
  assert.equal(graph.evaluate(1), 2 * Math.PI);
});

test('rejects equations outside the current function-graph scope', () => {
  assert.equal(EquationParser.tryCompile('x = y'), null);
  assert.equal(EquationParser.tryCompile('y = sin(x)'), null);
  assert.equal(EquationParser.tryCompile('y = x +'), null);
  assert.equal(EquationParser.tryCompile('y = abs(x)'), null);
});

test('counts one-token replacements, additions, and deletions', () => {
  assert.equal(EquationParser.countTokenEdits('y = x', 'y = 2x'), 1);
  assert.equal(EquationParser.countTokenEdits('y = x', 'y = y'), 1);
  assert.equal(EquationParser.countTokenEdits('y = 2x', 'y = x'), 1);
});

test('ignores whitespace when counting token edits', () => {
  assert.equal(EquationParser.countTokenEdits('y = x', ' y = x '), 0);
});

test('counts multiple token changes instead of accepting a compound edit', () => {
  assert.equal(EquationParser.countTokenEdits('y = x', 'y = 2x + 3'), 3);
  assert.equal(EquationParser.countTokenEdits('y = x', 'y = x^2'), 2);
});

test('allows exactly one relation in an edited equation', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y < x').valid, true);
  assert.equal(EquationParser.validateEdit('y = x', 'y < x = 2').valid, false);
});

test('allows adding one operator and one atom together', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y = x+2').kind, 'operator-and-atom');
  assert.equal(EquationParser.validateEdit('y = x', 'y = 2*x').kind, 'operator-and-atom');
  assert.equal(EquationParser.validateEdit('y = x', 'y = x^2').kind, 'operator-and-atom');
});

test('allows adding one opening and one closing parenthesis together', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y = (x)').kind, 'parenthesis-pair');
});

test('allows repositioning one existing parenthesis pair as its own option', () => {
  const validation = EquationParser.validateEdit('y = x(9)', 'y = (x9)');
  assert.equal(validation.valid, true);
  assert.equal(validation.kind, 'parenthesis-reposition');
});

test('rejects unsupported compound additions', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y = 2x + 3').valid, false);
  assert.equal(EquationParser.validateEdit('y = x', 'y = ((x))').valid, false);
  assert.equal(EquationParser.validateEdit('y = x', 'y = abs(x)').valid, false);
});

test('tracks token issues for rejected edits', () => {
  const validation = EquationParser.validateEdit('y = x', 'y = 2x + 3');
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.length > 0);
  assert.ok(validation.issues.some(issue => issue.kind === 'added' || issue.kind === 'changed'));
});

test('annotates candidate tokens identified by validation issues', () => {
  const validation = EquationParser.validateEdit('y = x', 'y = 2x + 3');
  const tokens = EquationParser.annotateTokens('y = 2x + 3', validation.issues);
  assert.ok(tokens.some(token => token.problematic));
  assert.equal(tokens.filter(token => token.problematic).length, validation.issues.filter(issue => Number.isInteger(issue.candidateIndex)).length);
});

test('marks tokens as valid for a successful verification preview', () => {
  const validation = EquationParser.validateEdit('y = x', 'y = x + 2');
  const tokens = EquationParser.annotateTokens('y = x + 2', [], 'valid', validation.changes);
  assert.deepEqual(tokens.filter(token => token.valid).map(token => token.value), ['+', 2]);
  assert.ok(tokens.filter(token => !token.valid).length > 0);
});
