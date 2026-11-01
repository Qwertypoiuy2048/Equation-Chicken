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
    assert.match(html, /game-state\.js/);
    assert.match(html, /script\.js/);
  }
});

test('the challenge page contains the drawing and challenge controls', () => {
  const html = fs.readFileSync(path.join(root, 'challenge.html'), 'utf8');
  for (const action of ['clear-drawing', 'submit-drawing', 'accept-drawing', 'reject-drawing', 'accept-loss', 'counter-challenge', 'forfeit']) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /id="drawing-canvas"/);
  assert.match(html, /id="reference-line"/);
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
