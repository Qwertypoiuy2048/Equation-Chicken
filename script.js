const STORAGE_KEY = 'equation-chicken-state';
const canvasControllers = new WeakMap();
const Game = typeof EquationChicken === 'object' ? EquationChicken : null;
const DEFAULT_STATE = Game ? Game.DEFAULT_STATE : {};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? Game.createState(saved) : Game.createState();
  } catch {
    return Game.createState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function playerName(player) {
  return `Player ${player}`;
}

function otherPlayer(player) {
  return Game.otherPlayer(player);
}

function setText(selector, value) {
  document.querySelectorAll(selector).forEach(element => { element.textContent = value; });
}

function updateSharedText(state) {
  setText('[data-score-player="1"]', state.scores[1]);
  setText('[data-score-player="2"]', state.scores[2]);
  setText('[data-current-player-name]', playerName(state.currentPlayer));
  setText('[data-match-number]', state.match);
  setText('[data-winner-name]', playerName(state.winner || state.currentPlayer));
  setText('[data-next-player-name]', playerName(state.nextStartingPlayer));
}

function navigate(url) {
  window.location.href = url;
}

function startChallenge(state) {
  Game.startChallenge(state);
  saveState(state);
}

function finishMatch(state, winner, result) {
  Game.finishMatch(state, winner, result);
  saveState(state);
  navigate('result.html');
}

function resetForNextMatch(state) {
  saveState(Game.nextMatch(state));
}

function setupCanvas(canvas) {
  if (!canvas) return null;
  if (canvasControllers.has(canvas)) return canvasControllers.get(canvas);
  const context = canvas.getContext('2d');
  let drawing = false;

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#244b74';
  }

  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  canvas.addEventListener('pointerdown', event => {
    if (canvas.dataset.frozen === 'true') return;
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const position = point(event);
    context.beginPath();
    context.moveTo(position.x, position.y);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing || canvas.dataset.frozen === 'true') return;
    const position = point(event);
    context.lineTo(position.x, position.y);
    context.stroke();
  });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });
  window.addEventListener('resize', resize);
  resize();

  const controller = {
    clear() { context.clearRect(0, 0, canvas.width, canvas.height); },
    freeze() { canvas.dataset.frozen = 'true'; },
    unfreeze() { canvas.dataset.frozen = 'false'; },
    setStrokeColor(color) { context.strokeStyle = color; }
  };
  canvasControllers.set(canvas, controller);
  return controller;
}

function drawReferenceGraph(canvas, equation) {
  if (!canvas || typeof EquationParser !== 'object') return;
  const graph = EquationParser.tryCompile(equation);
  if (!graph) return;
  const context = canvas.getContext('2d');
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const scale = 32;
  const axisX = bounds.width * 0.44;
  const axisY = bounds.height * 0.58;
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.strokeStyle = '#2a8f52';
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.beginPath();

  const minimumX = -axisX / scale;
  const maximumX = (bounds.width - axisX) / scale;
  for (let x = minimumX; x <= maximumX; x += 0.05) {
    const y = graph.evaluate(x);
    const pixelX = axisX + x * scale;
    const pixelY = axisY - y * scale;
    if (!Number.isFinite(y)) { context.beginPath(); continue; }
    if (x === minimumX) context.moveTo(pixelX, pixelY);
    else context.lineTo(pixelX, pixelY);
  }
  context.stroke();
}

function renderTurnPage(state) {
  updateSharedText(state);
  const challengeLink = document.querySelector('[data-action="start-challenge"]');
  if (challengeLink) challengeLink.textContent = `Challenge ${playerName(otherPlayer(state.currentPlayer))}`;
}

function renderChallengePage(state) {
  const canvas = document.querySelector('#drawing-canvas');
  const board = document.querySelector('#drawing-board');
  const drawActions = document.querySelector('#draw-actions');
  const judgeActions = document.querySelector('#judge-actions');
  const rejectActions = document.querySelector('#reject-actions');
  const acceptedActions = document.querySelector('#accepted-actions');
  const frozenLabel = document.querySelector('#frozen-label');
  const referenceCanvas = document.querySelector('#reference-canvas');
  const title = document.querySelector('#challenge-title');
  const status = document.querySelector('#challenge-status');
  const hint = document.querySelector('#graph-hint');
  const drawing = setupCanvas(canvas);

  if (!state.challengedPlayer) startChallenge(state);
  const drawer = state.drawer || state.challengedPlayer;
  const ui = Game.getChallengeUi(state.phase);
  drawing.setStrokeColor(drawer === state.challengedPlayer ? '#244b74' : '#b86b1f');
  updateSharedText(state);
  title.innerHTML = `${playerName(drawer)} must graph: <code>${state.equation}</code>`;
  status.textContent = state.drawingSubmitted ? 'Judgment phase' : (drawer !== state.challengedPlayer ? 'Counter-challenge' : 'Challenge phase');

  drawActions.hidden = !ui.drawActions;
  judgeActions.hidden = !ui.judgeActions;
  rejectActions.hidden = !ui.rejectActions;
  acceptedActions.hidden = !ui.acceptedActions;
  referenceCanvas.hidden = !ui.referenceVisible;
  if (ui.referenceVisible) drawReferenceGraph(referenceCanvas, state.equation);

  if (ui.frozen) {
    board.classList.add('is-frozen');
    drawing.freeze();
    frozenLabel.hidden = false;
    hint.textContent = state.phase === 'accepted' ? 'Reference graph is green. Both player drawings remain visible.' : 'Drawing is frozen. The reference graph remains hidden until accepted.';
  } else {
    board.classList.remove('is-frozen');
    drawing.unfreeze();
    frozenLabel.hidden = true;
    hint.textContent = 'Reference graph is hidden until judgment.';
  }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const state = loadState();

  if (target.dataset.action === 'start-challenge') {
    event.preventDefault();
    startChallenge(state);
    navigate('challenge.html');
    return;
  }

  if (target.dataset.action === 'next-match') {
    event.preventDefault();
    resetForNextMatch(state);
    navigate('index.html');
    return;
  }

  if (target.dataset.action === 'complete-accepted') {
    event.preventDefault();
    finishMatch(state, state.drawer, 'accepted-drawing');
    return;
  }

  const canvas = document.querySelector('#drawing-canvas');
  const board = document.querySelector('#drawing-board');
  const drawing = setupCanvas(canvas);

  if (target.dataset.action === 'clear-drawing' && drawing) drawing.clear();

  if (target.dataset.action === 'submit-drawing' && drawing) {
    Game.submitDrawing(state);
    saveState(state);
    renderChallengePage(state);
  }

  if (target.dataset.action === 'accept-drawing') {
    Game.acceptDrawing(state);
    saveState(state);
    renderChallengePage(state);
  }

  if (target.dataset.action === 'reject-drawing') {
    Game.rejectDrawing(state);
    saveState(state);
    renderChallengePage(state);
  }

  if (target.dataset.action === 'accept-loss' || target.dataset.action === 'forfeit') {
    finishMatch(state, state.challenger, target.dataset.action === 'forfeit' ? 'forfeit' : 'accepted-loss');
  }

  if (target.dataset.action === 'counter-challenge') {
    Game.counterChallenge(state);
    saveState(state);
    renderChallengePage(state);
  }
});

const state = loadState();
if (document.querySelector('#drawing-board')) renderChallengePage(state);
if (document.querySelector('[data-current-player-name]')) renderTurnPage(state);
if (document.querySelector('[data-winner-name]')) renderResultPage(state);

function renderResultPage(currentState) {
  updateSharedText(currentState);
}
