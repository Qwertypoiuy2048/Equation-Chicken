const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pages = ['index.html', 'challenge.html', 'result.html'];

test('all primary pages load shared CSS, state, and browser scripts', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /styles\.css/);
    assert.match(html, /equation\.js/);
    assert.match(html, /game-state\.js/);
    assert.match(html, /script\.js/);
  }
});

test('the turn page binds its displayed equation to shared state', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(html, /id="equation-editor"/);
  assert.match(html, /class="equation-prefix"[^>]*>y =</);
  assert.match(html, /aria-label="Right side of equation"/);
  assert.match(html, /id="equation-preview"/);
  assert.match(browserScript, /editor\.value = equationExpression\(state\.equation\)/);
  assert.match(html, /data-equation-history/);
  assert.match(browserScript, /setText\('\[data-equation-history\]', state\.history\.join/);
});

test('the turn page exposes verify and revert equation controls', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(html, /id="equation-editor"/);
  assert.match(html, /id="turn-actions"/);
  assert.match(html, /data-action="start-edit"/);
  assert.match(html, /id="edit-actions"[^>]*hidden/);
  assert.match(html, /class="screen-instructions"/);
  assert.match(html, /data-action="verify-equation"/);
  assert.match(html, /data-action="accept-equation"/);
  assert.match(html, /data-action="accept-equation"/);
  assert.match(html, /data-action="revert-equation"/);
  assert.match(browserScript, /EquationParser\.validateEdit\(state\.equation, candidate\)/);
  assert.match(browserScript, /Game\.acceptTurnEquation\(state, verifiedEquation\)/);
  assert.match(browserScript, /navigate\('index\.html'\)/);
  assert.match(browserScript, /Game\.revertEquation\(state\)/);
  assert.match(browserScript, /function equationExpression\(equation\)/);
  assert.match(browserScript, /function makeEquation\(expression\)/);
  assert.match(browserScript, /accept\.classList\.add\('ready'\)/);
  assert.match(browserScript, /EquationParser\.annotateTokens/);
  assert.match(browserScript, /validation\.changes/);
});

test('inline problem tokens have dedicated styling', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(css, /\.problem-token\s*\{/);
  assert.match(css, /\.valid-token\s*\{/);
});

test('verified Accept has a distinct ready style and screens have instructions', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const challenge = fs.readFileSync(path.join(root, 'challenge.html'), 'utf8');
  const result = fs.readFileSync(path.join(root, 'result.html'), 'utf8');
  assert.match(css, /\.action\.ready\s*\{/);
  assert.match(challenge, /class="screen-instructions"/);
  assert.match(result, /class="screen-instructions"/);
});

test('the result page contains final judgment choices', () => {
  const html = fs.readFileSync(path.join(root, 'result.html'), 'utf8');
  assert.match(html, /id="final-judgment"/);
  assert.match(html, /data-action="award-player" data-winner="1"/);
  assert.match(html, /data-action="award-player" data-winner="2"/);
  assert.match(html, /data-action="resolve-draw"/);
  assert.match(html, /id="final-graph-sketch"/);
  assert.match(html, /data-final-equation/);
  assert.match(fs.readFileSync(path.join(root, 'script.js'), 'utf8'), /setText\('\[data-final-equation\]', currentState\.equation\)/);
});

test('the challenge page contains the drawing and challenge controls', () => {
  const html = fs.readFileSync(path.join(root, 'challenge.html'), 'utf8');
  for (const action of ['clear-drawing', 'submit-drawing', 'accept-drawing', 'reject-drawing', 'accept-loss', 'counter-challenge', 'forfeit']) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /id="graph-sketch"/);
  assert.match(html, /id="scratch-equation"/);
  assert.match(html, /Scratchpad only/);
});

test('browser script contains the shared state and interaction entry points', () => {
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(browserScript, /localStorage/);
  assert.match(browserScript, /renderChallengePage/);
  assert.match(browserScript, /finishMatch/);
  assert.match(browserScript, /data-action/);
});

test('shared CSS keeps hidden challenge sections hidden', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
});

test('drawings and reference use separate colors without clearing the counter drawing', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(css, /--counter-drawing:\s*#b86b1f/);
  assert.match(css, /--reference:\s*#2a8f52/);
  assert.match(browserScript, /setStrokeColor/);
  assert.doesNotMatch(browserScript, /if \(drawing\) drawing\.clear\(\);\s*renderChallengePage\(state\);/);
});

test('reference graph is generated from the equation by the shared p5 sketch', () => {
  const challenge = fs.readFileSync(path.join(root, 'challenge.html'), 'utf8');
  const result = fs.readFileSync(path.join(root, 'result.html'), 'utf8');
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  const graphSketch = fs.readFileSync(path.join(root, 'graph-sketch.js'), 'utf8');
  assert.match(challenge, /p5\.min\.js/);
  assert.match(challenge, /graph-sketch\.js/);
  assert.match(result, /p5\.min\.js/);
  assert.match(result, /graph-sketch\.js/);
  assert.match(browserScript, /EquationGraph\.createGraphSketch/);
  assert.match(browserScript, /referenceVisible: true/);
  assert.match(graphSketch, /EquationParser\.tryCompile\(options\.equation\)/);
  assert.match(graphSketch, /graph\.evaluate\(graphX\)/);
});
