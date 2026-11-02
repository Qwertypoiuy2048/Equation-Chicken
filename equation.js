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

  return { tokenize, parseEquation, compile, tryCompile };
});
