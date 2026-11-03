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

test('supports grouped math functions', () => {
  const cases = [
    ['ln(x)', 4, Math.log(4)],
    ['sqrt(x)', 9, 3],
    ['sin(x)', 1, Math.sin(1)],
    ['cos(x)', 1, Math.cos(1)],
    ['tan(x)', 1, Math.tan(1)],
    ['ceil(x)', 1.2, 2],
    ['floor(x)', 1.8, 1],
    ['abs(x)', -4, 4]
  ];
  for (const [functionName, input, expected] of cases) {
    const graph = EquationParser.compile(`y = ${functionName}`);
    assert.ok(Math.abs(graph.evaluate(input) - expected) < 1e-10);
  }
});

test('supports absolute-value bars, remainder, and integer division', () => {
  assert.equal(EquationParser.compile('y = |x - 5|').evaluate(2), 3);
  assert.equal(EquationParser.compile('y = 17 % 5').evaluate(0), 2);
  assert.equal(EquationParser.compile('y = 17 // 5').evaluate(0), 3);
  assert.equal(EquationParser.compile('y = -17 // 5').evaluate(0), -3);
  assert.equal(EquationParser.compile('y = 2 + 17 % 5').evaluate(0), 4);
});

test('tokenizes integer division as one operator', () => {
  assert.deepEqual(
    EquationParser.tokenize('17 // 5').map(token => token.value),
    [17, '//', 5, null]
  );
});

test('tokenizes grouped functions as named tokens', () => {
  assert.deepEqual(
    EquationParser.tokenize('sqrt(x)+ln(x)').map(token => token.value),
    ['sqrt', '(', 'x', ')', '+', 'ln', '(', 'x', ')', null]
  );
});

test('rejects equations outside the current function-graph scope', () => {
  assert.equal(EquationParser.tryCompile('x = y'), null);
  assert.equal(EquationParser.tryCompile('y = x +'), null);
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
  assert.equal(EquationParser.validateEdit('y = x', 'y = x%2').kind, 'operator-and-atom');
  assert.equal(EquationParser.validateEdit('y = x', 'y = x//2').kind, 'operator-and-atom');
});

test('allows adding one opening and one closing parenthesis together', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y = (x)').kind, 'parenthesis-pair');
});

test('treats function wrappers and absolute-value bars as one edit', () => {
  for (const candidate of ['y = abs(2x)', 'y = |2x|', 'y = sqrt(2x)']) {
    const validation = EquationParser.validateEdit('y = 2x', candidate);
    assert.equal(validation.valid, true);
    assert.equal(validation.kind, 'grouped-function');
    assert.equal(validation.edits, 1);
  }
});

test('highlights only the outer grouped wrapper tokens', () => {
  const candidate = 'y = sin(abs(sqrt(|x|))(1))';
  const validation = EquationParser.validateEdit('y = abs(sqrt(|x|))(1)', candidate);
  const tokens = EquationParser.annotateTokens(candidate, [], 'valid', validation.changes);
  assert.deepEqual(tokens.filter(token => token.valid).map(token => token.value), ['sin', '(', ')']);
});

test('treats a grouped function inserted inside an expression as one edit', () => {
  const current = 'y = sin(abs(sqrt(|x|))(1))';
  const candidate = 'y = sin(abs(tan(sqrt(|x|)))(1))';
  const validation = EquationParser.validateEdit(current, candidate);
  assert.equal(validation.valid, true);
  assert.equal(validation.kind, 'grouped-function');
  assert.equal(validation.edits, 1);
  const tokens = EquationParser.annotateTokens(candidate, [], 'valid', validation.changes);
  assert.deepEqual(tokens.filter(token => token.valid).map(token => token.value), ['tan', '(', ')']);
});

test('allows repositioning one existing parenthesis pair as its own option', () => {
  const validation = EquationParser.validateEdit('y = x(9)', 'y = (x9)');
  assert.equal(validation.valid, true);
  assert.equal(validation.kind, 'parenthesis-reposition');
});

test('rejects unsupported compound additions', () => {
  assert.equal(EquationParser.validateEdit('y = x', 'y = 2x + 3').valid, false);
  assert.equal(EquationParser.validateEdit('y = x', 'y = ((x))').valid, false);
  assert.equal(EquationParser.validateEdit('y = x', 'y = abs(x + 1)').valid, false);
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
