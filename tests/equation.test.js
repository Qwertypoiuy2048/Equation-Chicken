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

test('rejects equations outside the current function-graph scope', () => {
  assert.equal(EquationParser.tryCompile('x = y'), null);
  assert.equal(EquationParser.tryCompile('y = sin(x)'), null);
  assert.equal(EquationParser.tryCompile('y = x +'), null);
});
