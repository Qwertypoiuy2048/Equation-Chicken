(function attachEquation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EquationParser = api;
})(typeof globalThis === 'object' ? globalThis : this, function createEquationApi() {
  const RELATIONS = ['<=', '>=', '=', '<', '>'];

  function tokenize(source) {
    source = source.replace(/\s+/g, '');
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const rest = source.slice(index);
      const relation = RELATIONS.find(value => rest.startsWith(value));
      if (relation) { tokens.push({ type: 'relation', value: relation }); index += relation.length; continue; }
      const number = rest.match(/^\d+(?:\.\d+)?/);
      if (number) { tokens.push({ type: 'number', value: Number(number[0]) }); index += number[0].length; continue; }
      const constant = rest.match(/^(pi|e)/i);
      if (constant) { tokens.push({ type: 'constant', value: constant[0].toLowerCase() }); index += constant[0].length; continue; }
      const variable = rest.match(/^[xy]/i);
      if (variable) { tokens.push({ type: 'variable', value: variable[0].toLowerCase() }); index += 1; continue; }
      if ('+-*/^()'.includes(rest[0])) { tokens.push({ type: rest[0], value: rest[0] }); index += 1; continue; }
      throw new Error(`Unsupported character: ${rest[0]}`);
    }
    tokens.push({ type: 'eof', value: null });
    return tokens;
  }

  function parseEquation(equation) {
    const tokens = tokenize(equation);
    let position = 0;
    const peek = () => tokens[position];
    const consume = type => {
      if (peek().type !== type) throw new Error(`Expected ${type}.`);
      return tokens[position++];
    };

    function primary() {
      if (peek().type === 'number') return { type: 'number', value: consume('number').value };
      if (peek().type === 'constant') return { type: 'constant', value: consume('constant').value };
      if (peek().type === 'variable') return { type: 'variable', value: consume('variable').value };
      if (peek().type === '(') { consume('('); const node = expression(); consume(')'); return node; }
      throw new Error('Expected a number, constant, variable, or parenthesized expression.');
    }

    function power() {
      const base = primary();
      if (peek().type === '^') { consume('^'); return { type: 'power', left: base, right: power() }; }
      return base;
    }

    function unary() {
      if (peek().type === '+') { consume('+'); return unary(); }
      if (peek().type === '-') { consume('-'); return { type: 'negate', value: unary() }; }
      return power();
    }

    function startsImplicitTerm() {
      return ['number', 'constant', 'variable', '('].includes(peek().type);
    }

    function term() {
      let node = unary();
      while (peek().type === '*' || peek().type === '/' || startsImplicitTerm()) {
        if (peek().type === '*') { consume('*'); node = { type: 'multiply', left: node, right: unary() }; }
        else if (peek().type === '/') { consume('/'); node = { type: 'divide', left: node, right: unary() }; }
        else node = { type: 'multiply', left: node, right: unary() };
      }
      return node;
    }

    function expression() {
      let node = term();
      while (peek().type === '+' || peek().type === '-') {
        if (peek().type === '+') { consume('+'); node = { type: 'add', left: node, right: term() }; }
        else { consume('-'); node = { type: 'subtract', left: node, right: term() }; }
      }
      return node;
    }

    const left = expression();
    if (peek().type !== 'relation') throw new Error('Expected an equation or relation.');
    const relation = consume('relation').value;
    const right = expression();
    if (peek().type !== 'eof') throw new Error('Unexpected token at the end of the equation.');
    return { left, relation, right };
  }

  function evaluate(node, x) {
    switch (node.type) {
      case 'number': return node.value;
      case 'constant': return node.value === 'pi' ? Math.PI : Math.E;
      case 'variable': return node.value === 'x' ? x : NaN;
      case 'negate': return -evaluate(node.value, x);
      case 'add': return evaluate(node.left, x) + evaluate(node.right, x);
      case 'subtract': return evaluate(node.left, x) - evaluate(node.right, x);
      case 'multiply': return evaluate(node.left, x) * evaluate(node.right, x);
      case 'divide': return evaluate(node.left, x) / evaluate(node.right, x);
      case 'power': return Math.pow(evaluate(node.left, x), evaluate(node.right, x));
      default: return NaN;
    }
  }

  function compile(equation) {
    const parsed = parseEquation(equation);
    if (parsed.relation !== '=' || parsed.left.type !== 'variable' || parsed.left.value !== 'y') {
      throw new Error('Only function graphs in the form y = expression can be rendered for now!');
    }
    return { equation, evaluate: x => evaluate(parsed.right, x) };
  }

  function tryCompile(equation) {
    try { return compile(equation); } catch { return null; }
  }

  function tokenSignature(token) {
    return `${token.type}:${token.value}`;
  }

  function countTokenEdits(first, second) {
    const left = meaningfulTokens(first).map(tokenSignature);
    const right = meaningfulTokens(second).map(tokenSignature);
    const distances = Array.from({ length: left.length + 1 }, (_, row) => Array(right.length + 1).fill(0));
    for (let row = 0; row <= left.length; row += 1) distances[row][0] = row;
    for (let column = 0; column <= right.length; column += 1) distances[0][column] = column;
    for (let row = 1; row <= left.length; row += 1) {
      for (let column = 1; column <= right.length; column += 1) {
        const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
        distances[row][column] = Math.min(
          distances[row - 1][column] + 1,
          distances[row][column - 1] + 1,
          distances[row - 1][column - 1] + substitution
        );
      }
    }
    return distances[left.length][right.length];
  }

  function meaningfulTokens(value) {
    return (Array.isArray(value) ? value : tokenize(value)).filter(token => token.type !== 'eof');
  }

  function sameTokens(left, right) {
    return left.length === right.length && left.every((token, index) => tokenSignature(token) === tokenSignature(right[index]));
  }

  function canAddPair(current, candidate, predicate) {
    if (candidate.length !== current.length + 2) return false;
    for (let first = 0; first < candidate.length; first += 1) {
      for (let second = first + 1; second < candidate.length; second += 1) {
        const added = [candidate[first], candidate[second]];
        const remaining = candidate.filter((_, index) => index !== first && index !== second);
        if (predicate(added) && sameTokens(current, remaining)) return true;
      }
    }
    return false;
  }

  function findAddedPair(current, candidate, predicate) {
    if (candidate.length !== current.length + 2) return null;
    for (let first = 0; first < candidate.length; first += 1) {
      for (let second = first + 1; second < candidate.length; second += 1) {
        const added = [candidate[first], candidate[second]];
        const remaining = candidate.filter((_, index) => index !== first && index !== second);
        if (predicate(added) && sameTokens(current, remaining)) return [first, second];
      }
    }
    return null;
  }

  function candidateChangeIndexes(current, candidate) {
    if (current.length === candidate.length) {
      return candidate.map((token, index) => tokenSignature(token) !== tokenSignature(current[index]) ? index : -1).filter(index => index >= 0);
    }
    if (candidate.length === current.length + 1) {
      for (let index = 0; index < candidate.length; index += 1) {
        if (sameTokens(current, candidate.filter((_, candidateIndex) => candidateIndex !== index))) return [index];
      }
    }
    if (candidate.length === current.length + 2) {
      for (let first = 0; first < candidate.length; first += 1) {
        for (let second = first + 1; second < candidate.length; second += 1) {
          if (sameTokens(current, candidate.filter((_, index) => index !== first && index !== second))) return [first, second];
        }
      }
    }
    return [];
  }

  function canRepositionParentheses(current, candidate) {
    const currentParentheses = current.filter(token => token.type === '(' || token.type === ')');
    const candidateParentheses = candidate.filter(token => token.type === '(' || token.type === ')');
    if (currentParentheses.length !== 2 || candidateParentheses.length !== 2) return false;
    if (currentParentheses.filter(token => token.type === '(').length !== 1 || candidateParentheses.filter(token => token.type === '(').length !== 1) return false;
    const currentContent = current.filter(token => token.type !== '(' && token.type !== ')');
    const candidateContent = candidate.filter(token => token.type !== '(' && token.type !== ')');
    return sameTokens(currentContent, candidateContent) && !sameTokens(current, candidate);
  }

  function describeDifferences(current, candidate) {
    const differences = [];
    const limit = Math.max(current.length, candidate.length);
    for (let index = 0; index < limit; index += 1) {
      const oldToken = current[index];
      const newToken = candidate[index];
      if (!oldToken) differences.push({ kind: 'added', candidateIndex: index, token: newToken.value });
      else if (!newToken) differences.push({ kind: 'removed', currentIndex: index, token: oldToken.value });
      else if (tokenSignature(oldToken) !== tokenSignature(newToken)) {
        differences.push({ kind: 'changed', currentIndex: index, candidateIndex: index, from: oldToken.value, to: newToken.value });
      }
    }
    return differences;
  }

  function validateEdit(currentEquation, candidateEquation) {
    let current;
    let candidate;
    try {
      current = meaningfulTokens(currentEquation);
      candidate = meaningfulTokens(candidateEquation);
      parseEquation(candidateEquation);
    } catch {
      return { valid: false, issues: [{ kind: 'syntax', message: 'The equation syntax is invalid.' }], reason: 'The equation syntax is invalid.' };
    }

    const relationCount = candidate.filter(token => token.type === 'relation').length;
    if (relationCount !== 1) return { valid: false, issues: [{ kind: 'relation-count', count: relationCount }], reason: 'An equation must contain exactly one relation.' };

    if (canRepositionParentheses(current, candidate)) return { valid: true, edits: 2, kind: 'parenthesis-reposition', issues: [], changes: candidate.map((token, index) => token.type === '(' || token.type === ')' ? index : -1).filter(index => index >= 0) };

    const edits = countTokenEdits(current, candidate);
    if (edits === 1) return { valid: true, edits, kind: 'single-token', issues: [], changes: candidateChangeIndexes(current, candidate) };

    const operatorAndAtom = canAddPair(current, candidate, added => {
      const operators = added.filter(token => ['+', '-', '*', '/', '^'].includes(token.type));
      const atoms = added.filter(token => ['number', 'constant', 'variable'].includes(token.type));
      return operators.length === 1 && atoms.length === 1;
    });
    if (operatorAndAtom) return { valid: true, edits, kind: 'operator-and-atom', issues: [], changes: candidateChangeIndexes(current, candidate) };

    const parenthesisPair = canAddPair(current, candidate, added => {
      return added.filter(token => token.type === '(').length === 1 && added.filter(token => token.type === ')').length === 1;
    });
    if (parenthesisPair) return { valid: true, edits, kind: 'parenthesis-pair', issues: [], changes: candidateChangeIndexes(current, candidate) };

    return {
      valid: false,
      edits,
      issues: describeDifferences(current, candidate),
      reason: 'Only one token, one operator plus one atom, one matching parenthesis pair, or one parenthesis reposition may be added.'
    };
  }

  function annotateTokens(equation, issues = [], status = 'normal', changes = []) {
    const highlighted = new Set();
    for (const issue of issues) {
      if (Number.isInteger(issue.candidateIndex)) highlighted.add(issue.candidateIndex);
    }
    return meaningfulTokens(equation).map((token, index) => ({
      ...token,
      problematic: highlighted.has(index),
      valid: status === 'valid' && changes.includes(index)
    }));
  }

  return { tokenize, parseEquation, compile, tryCompile, countTokenEdits, validateEdit, annotateTokens };
});
