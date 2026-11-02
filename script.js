const STORAGE_KEY = 'equation-chicken-state';
const canvasControllers = new WeakMap();
const Game = typeof EquationChicken === 'object' ? EquationChicken : null;
const DEFAULT_STATE = Game ? Game.DEFAULT_STATE : {};
let verifiedEquation = null;

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
  setText('[data-equation-history]', state.history.join(' → '));
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

function setupCanvas(canvas, initialState) {
  if (!canvas) return null;
  if (canvasControllers.has(canvas)) return canvasControllers.get(canvas);
  const context = canvas.getContext('2d');
  let drawing = false;
  let state = initialState;
  let strokeColor = '#244b74';

  function redraw() {
    const bounds = canvas.getBoundingClientRect();
    context.clearRect(0, 0, bounds.width, bounds.height);
    for (const stroke of state.drawings || []) {
      if (!stroke.points.length) continue;
      context.strokeStyle = stroke.color;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    }
    context.strokeStyle = strokeColor;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
    canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = strokeColor;
    redraw();
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
    state.drawings.push({ player: state.drawer, color: strokeColor, points: [position] });
    context.beginPath();
    context.moveTo(position.x, position.y);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drawing || canvas.dataset.frozen === 'true') return;
    const position = point(event);
    const stroke = state.drawings[state.drawings.length - 1];
    if (stroke) stroke.points.push(position);
    context.lineTo(position.x, position.y);
    context.stroke();
  });
  canvas.addEventListener('pointerup', () => { drawing = false; saveState(state); });
  canvas.addEventListener('pointercancel', () => { drawing = false; saveState(state); });
  window.addEventListener('resize', resize);
  resize();

  const controller = {
    clear() {
      state.drawings = state.drawings.filter(stroke => stroke.player !== state.drawer);
      saveState(state);
      redraw();
    },
    freeze() { canvas.dataset.frozen = 'true'; },
    unfreeze() { canvas.dataset.frozen = 'false'; },
    setStrokeColor(color) { strokeColor = color; context.strokeStyle = color; },
    setState(nextState) { state = nextState; redraw(); }
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

function drawPlayerStrokes(canvas, drawings) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const bounds = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  context.lineWidth = 4;
  context.lineCap = 'round';
  for (const stroke of drawings || []) {
    if (!stroke.points.length) continue;
    context.strokeStyle = stroke.color;
    context.beginPath();
    context.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke();
  }
}

function renderFinalJudgmentGraph(state) {
  const referenceCanvas = document.querySelector('#final-reference-canvas');
  const drawingCanvas = document.querySelector('#final-drawing-canvas');
  if (!referenceCanvas || !drawingCanvas) return;
  referenceCanvas.hidden = false;
  drawingCanvas.hidden = false;
  drawReferenceGraph(referenceCanvas, state.equation);
  drawPlayerStrokes(drawingCanvas, state.drawings);
}

function renderTurnPage(state) {
  updateSharedText(state);
  const editor = document.querySelector('#equation-editor');
  const accept = document.querySelector('[data-action="accept-equation"]');
  if (editor) editor.value = state.equation;
  if (accept) accept.disabled = true;
  verifiedEquation = null;
  renderEquationPreview(state.equation);
}

function renderEquationPreview(equation, issues = [], status = 'normal', changes = []) {
  const preview = document.querySelector('#equation-preview');
  if (!preview || typeof EquationParser !== 'object') return;
  preview.replaceChildren();
  for (const token of EquationParser.annotateTokens(equation, issues, status, changes)) {
    const span = document.createElement('span');
    span.textContent = token.value;
    if (token.problematic) span.className = 'problem-token';
    else if (token.valid) span.className = 'valid-token';
    preview.appendChild(span);
  }
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
  const drawing = setupCanvas(canvas, state);

  if (!state.challengedPlayer) startChallenge(state);
  const drawer = state.drawer || state.challengedPlayer;
  const ui = Game.getChallengeUi(state.phase);
  drawing.setState(state);
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

  if (target.dataset.action === 'verify-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    const candidate = editor.value.trim();
    const validation = candidate ? EquationParser.validateEdit(state.equation, candidate) : { valid: false, reason: 'Enter an equation before verifying.' };
    if (!validation.valid) {
      verifiedEquation = null;
      document.querySelector('[data-action="accept-equation"]').disabled = true;
      message.textContent = validation.reason;
      message.classList.add('error');
      renderEquationPreview(candidate, validation.issues);
      return;
    }
    verifiedEquation = candidate;
    document.querySelector('[data-action="accept-equation"]').disabled = false;
    message.textContent = 'One-token edit verified. Accept it to save the change.';
    message.classList.remove('error');
    renderEquationPreview(candidate, [], 'valid', validation.changes);
    return;
  }

  if (target.dataset.action === 'accept-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    if (!verifiedEquation || verifiedEquation !== editor.value.trim()) {
      message.textContent = 'Verify this equation before accepting it.';
      message.classList.add('error');
      return;
    }
    Game.updateEquation(state, verifiedEquation);
    saveState(state);
    target.disabled = true;
    verifiedEquation = null;
    message.textContent = 'Equation accepted and saved.';
    message.classList.remove('error');
    renderEquationPreview(state.equation, [], 'valid', []);
    return;
  }

  if (target.dataset.action === 'revert-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    Game.revertEquation(state);
    saveState(state);
    editor.value = state.equation;
    document.querySelector('[data-action="accept-equation"]').disabled = true;
    verifiedEquation = null;
    message.textContent = 'Equation reverted to the start of the turn.';
    message.classList.remove('error');
    renderEquationPreview(state.equation);
    return;
  }

  if (target.dataset.action === 'next-match') {
    event.preventDefault();
    resetForNextMatch(state);
    navigate('index.html');
    return;
  }

  if (target.dataset.action === 'award-player') {
    event.preventDefault();
    finishMatch(state, Number(target.dataset.winner), 'final-judgment');
    return;
  }

  if (target.dataset.action === 'resolve-draw') {
    event.preventDefault();
    Game.resolveDraw(state);
    saveState(state);
    renderResultPage(state);
    return;
  }

  if (target.dataset.action === 'complete-accepted') {
    event.preventDefault();
    finishMatch(state, state.drawer, 'accepted-drawing');
    return;
  }

  const canvas = document.querySelector('#drawing-canvas');
  const board = document.querySelector('#drawing-board');
  const drawing = setupCanvas(canvas, state);

  if (target.dataset.action === 'clear-drawing' && drawing) drawing.clear();

  if (target.dataset.action === 'submit-drawing' && drawing) {
    Game.submitDrawing(state);
    saveState(state);
    if (state.phase === 'final-judgment') {
      navigate('result.html');
      return;
    }
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

document.addEventListener('input', event => {
  if (event.target.id === 'equation-editor') renderEquationPreview(event.target.value);
});

const state = loadState();
if (document.querySelector('#drawing-board')) renderChallengePage(state);
if (document.querySelector('[data-current-player-name]')) renderTurnPage(state);
if (document.querySelector('[data-winner-name]')) renderResultPage(state);

function renderResultPage(currentState) {
  updateSharedText(currentState);
  const finalJudgment = document.querySelector('#final-judgment');
  const matchResult = document.querySelector('#match-result');
  if (!finalJudgment || !matchResult) return;
  const isChoosing = currentState.phase === 'final-judgment';
  finalJudgment.hidden = !isChoosing;
  matchResult.hidden = isChoosing;
  if (isChoosing) renderFinalJudgmentGraph(currentState);
  if (!isChoosing) {
    const title = matchResult.querySelector('[data-result-title]');
    const detail = matchResult.querySelector('[data-result-detail]');
    const next = matchResult.querySelector('[data-next-player-name]');
    title.textContent = currentState.lastResult === 'draw' ? 'Both players failed' : `${playerName(currentState.winner)} wins!`;
    detail.textContent = currentState.lastResult === 'draw' ? 'No point awarded.' : `Player 1 ${currentState.scores[1]} · Player 2 ${currentState.scores[2]}`;
    next.textContent = playerName(currentState.nextStartingPlayer);
  }
}
