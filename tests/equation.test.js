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
