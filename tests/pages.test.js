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
  assert.match(browserScript, /editor\.value = state\.equation/);
  assert.match(html, /data-equation-history/);
  assert.match(browserScript, /setText\('\[data-equation-history\]', state\.history\.join/);
});

test('the turn page exposes verify and revert equation controls', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(html, /id="equation-editor"/);
  assert.match(html, /data-action="verify-equation"/);
  assert.match(html, /data-action="accept-equation"/);
  assert.match(html, /data-action="revert-equation"/);
  assert.match(browserScript, /EquationParser\.tryCompile\(candidate\)/);
  assert.match(browserScript, /Game\.updateEquation\(state, verifiedEquation\)/);
  assert.match(browserScript, /Game\.revertEquation\(state\)/);
});

test('the result page contains final judgment choices', () => {
  const html = fs.readFileSync(path.join(root, 'result.html'), 'utf8');
  assert.match(html, /id="final-judgment"/);
  assert.match(html, /data-action="award-player" data-winner="1"/);
  assert.match(html, /data-action="award-player" data-winner="2"/);
  assert.match(html, /data-action="resolve-draw"/);
  assert.match(html, /id="final-reference-canvas"/);
  assert.match(html, /id="final-drawing-canvas"/);
});

test('the challenge page contains the drawing and challenge controls', () => {
  const html = fs.readFileSync(path.join(root, 'challenge.html'), 'utf8');
  for (const action of ['clear-drawing', 'submit-drawing', 'accept-drawing', 'reject-drawing', 'accept-loss', 'counter-challenge', 'forfeit']) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /id="drawing-canvas"/);
  assert.match(html, /id="reference-canvas"/);
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

test('reference graph is generated from the equation on a separate canvas', () => {
  const browserScript = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
  assert.match(browserScript, /function drawReferenceGraph\(canvas, equation\)/);
  assert.match(browserScript, /const graph = EquationParser\.tryCompile\(equation\)/);
  assert.match(browserScript, /graph\.evaluate\(x\)/);
  assert.match(browserScript, /drawReferenceGraph\(referenceCanvas, state\.equation\)/);
});
