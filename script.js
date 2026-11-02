const STORAGE_KEY = 'equation-chicken-state';
const canvasControllers = new WeakMap();
let challengeGraphSketch = null;
let finalGraphSketch = null;
let activeDrawingTool = 'freehand';
let challengeBounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
let challengeViewInitialized = false;
const Game = typeof EquationChicken === 'object' ? EquationChicken : null;
const DEFAULT_STATE = Game ? Game.DEFAULT_STATE : {};
let verifiedEquation = null;
let verifiedTurnEdit = null;

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

function equationExpression(equation) {
  const match = equation.match(/^\s*y\s*=\s*(.*)$/i);
  return match ? match[1] : equation;
}

function makeEquation(expression) {
  return expression ? `y = ${expression}` : '';
}

function readGraphBounds() {
  const values = ['x-min', 'x-max', 'y-min', 'y-max'].map(id => Number(document.querySelector(`#${id}`)?.value));
  if (values.some(value => !Number.isFinite(value))) return { valid: false, reason: 'All graph bounds must be numbers.' };
  const [xMin, xMax, yMin, yMax] = values;
  if (xMin >= xMax || yMin >= yMax) return { valid: false, reason: 'Each minimum must be smaller than its maximum.' };
  return { valid: true, bounds: { xMin, xMax, yMin, yMax } };
}

function readTurnBounds() {
  const values = ['turn-x-min', 'turn-x-max', 'turn-y-min', 'turn-y-max'].map(id => Number(document.querySelector(`#${id}`)?.value));
  if (values.some(value => !Number.isFinite(value))) return { valid: false, reason: 'All graph boundaries must be numbers.' };
  const [xMin, xMax, yMin, yMax] = values;
  if (xMin >= xMax || yMin >= yMax) return { valid: false, reason: 'Each boundary minimum must be smaller than its maximum.' };
  return { valid: true, bounds: { xMin, xMax, yMin, yMax } };
}

function sameBounds(first, second) {
  return ['xMin', 'xMax', 'yMin', 'yMax'].every(key => first[key] === second[key]);
}

function changedBounds(first, second) {
  return ['xMin', 'xMax', 'yMin', 'yMax'].filter(key => first[key] !== second[key]);
}

function setTurnBounds(bounds) {
  ['turn-x-min', 'turn-x-max', 'turn-y-min', 'turn-y-max'].forEach((id, index) => {
    const input = document.querySelector(`#${id}`);
    if (input) input.value = [bounds.xMin, bounds.xMax, bounds.yMin, bounds.yMax][index];
  });
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
  setText('[data-equation]', state.equation);
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
  const host = document.querySelector('#final-graph-sketch');
  if (!host || typeof EquationGraph !== 'object') return;
  if (!finalGraphSketch) finalGraphSketch = EquationGraph.createGraphSketch(host, { mode: 'comparison' });
  finalGraphSketch.update({ equation: state.equation, drawings: state.drawings, bounds: state.bounds, referenceVisible: true, frozen: true, mode: 'comparison' });
}

function renderTurnPage(state) {
  updateSharedText(state);
  setTurnEditing(false);
  const editor = document.querySelector('#equation-editor');
  const accept = document.querySelector('[data-action="accept-equation"]');
  const boundsAccept = document.querySelector('[data-action="accept-bounds"]');
  if (editor) editor.value = equationExpression(state.equation);
  setTurnBounds(state.bounds);
  if (accept) accept.disabled = true;
  if (accept) accept.classList.remove('ready');
  if (boundsAccept) {
    boundsAccept.disabled = true;
    boundsAccept.classList.remove('ready');
  }
  verifiedEquation = null;
  verifiedTurnEdit = null;
  renderEquationPreview(state.equation);
}

function setTurnEditing(editing) {
  const turnActions = document.querySelector('#turn-actions');
  const editActions = document.querySelector('#edit-actions');
  const boundsActions = document.querySelector('#bounds-actions');
  if (turnActions) turnActions.hidden = Boolean(editing);
  if (editActions) editActions.hidden = editing !== 'equation';
  if (boundsActions) boundsActions.hidden = editing !== 'bounds';
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
  const board = document.querySelector('#drawing-board');
  const drawActions = document.querySelector('#draw-actions');
  const judgeActions = document.querySelector('#judge-actions');
  const rejectActions = document.querySelector('#reject-actions');
  const acceptedActions = document.querySelector('#accepted-actions');
  const frozenLabel = document.querySelector('#frozen-label');
  const graphHost = document.querySelector('#graph-sketch');
  const title = document.querySelector('#challenge-title');
  const status = document.querySelector('#challenge-status');
  const hint = document.querySelector('#graph-hint');
  const scratchEquation = document.querySelector('#scratch-equation');
  if (!challengeViewInitialized) {
    challengeBounds = { ...state.bounds };
    challengeViewInitialized = true;
  }
  if (!state.challengedPlayer) startChallenge(state);
  const drawer = state.drawer || state.challengedPlayer;
  const ui = Game.getChallengeUi(state.phase);
  if (scratchEquation && !scratchEquation.dataset.initialized) {
    scratchEquation.value = state.equation;
    scratchEquation.dataset.initialized = 'true';
  }
  ['x-min', 'x-max', 'y-min', 'y-max'].forEach((id, index) => {
    const input = document.querySelector(`#${id}`);
    if (input && document.activeElement !== input) input.value = [challengeBounds.xMin, challengeBounds.xMax, challengeBounds.yMin, challengeBounds.yMax][index];
  });
  if (graphHost && typeof EquationGraph === 'object') {
    if (!challengeGraphSketch) {
      challengeGraphSketch = EquationGraph.createGraphSketch(graphHost, {
        mode: 'drawing',
        onStroke(stroke) {
          if (stroke.tool !== 'plotter' || state.drawings[state.drawings.length - 1] !== stroke) state.drawings.push(stroke);
          saveState(state);
        },
        onClear(player) { state.drawings = state.drawings.filter(stroke => stroke.player !== player); saveState(state); },
        onUndo(player) {
          const index = state.drawings.map(stroke => stroke.player).lastIndexOf(player);
          if (index >= 0) state.drawings.splice(index, 1);
          saveState(state);
        }
      });
    }
    challengeGraphSketch.update({
      equation: state.equation,
      drawings: state.drawings,
      activePlayer: drawer,
      challengedPlayer: state.challengedPlayer,
      frozen: ui.frozen,
      referenceVisible: ui.referenceVisible,
      mode: 'drawing',
      tool: activeDrawingTool,
      bounds: challengeBounds,
      onStroke(stroke) {
        if (stroke.tool !== 'plotter' || state.drawings[state.drawings.length - 1] !== stroke) state.drawings.push(stroke);
        saveState(state);
      },
      onClear(player) {
        const remaining = state.drawings.filter(stroke => stroke.player !== player);
        state.drawings.splice(0, state.drawings.length, ...remaining);
        saveState(state);
      },
      onUndo(player) {
        const index = state.drawings.map(stroke => stroke.player).lastIndexOf(player);
        if (index >= 0) state.drawings.splice(index, 1);
        saveState(state);
      }
    });
  }
  updateSharedText(state);
  title.innerHTML = `${playerName(drawer)} must graph: <code>${state.equation}</code>`;
  status.textContent = state.drawingSubmitted ? 'Judgment phase' : (drawer !== state.challengedPlayer ? 'Counter-challenge' : 'Challenge phase');

  drawActions.hidden = !ui.drawActions;
  judgeActions.hidden = !ui.judgeActions;
  rejectActions.hidden = !ui.rejectActions;
  acceptedActions.hidden = !ui.acceptedActions;
  document.querySelectorAll('[data-tool]').forEach(button => {
    const selected = button.dataset.tool === activeDrawingTool;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  if (ui.frozen) {
    board.classList.add('is-frozen');
    frozenLabel.hidden = false;
    hint.textContent = state.phase === 'accepted' ? 'Reference graph is green. Both player drawings remain visible.' : 'Drawing is frozen. The reference graph remains hidden until accepted.';
  } else {
    board.classList.remove('is-frozen');
    frozenLabel.hidden = true;
    hint.textContent = 'Reference graph is hidden until judgment.';
  }
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-action], [data-tool]');
  if (!target) return;
  const state = loadState();

  if (target.dataset.action === 'start-challenge') {
    event.preventDefault();
    startChallenge(state);
    navigate('challenge.html');
    return;
  }

  if (target.dataset.action === 'apply-view') {
    const result = readGraphBounds();
    const message = document.querySelector('#view-message');
    if (!result.valid) {
      if (message) message.textContent = result.reason;
      return;
    }
    challengeBounds = result.bounds;
    if (message) message.textContent = `View: x ${challengeBounds.xMin}…${challengeBounds.xMax}, y ${challengeBounds.yMin}…${challengeBounds.yMax}`;
    renderChallengePage(state);
    return;
  }

  if (target.dataset.tool) {
    activeDrawingTool = target.dataset.tool;
    if (challengeGraphSketch) challengeGraphSketch.update({ tool: activeDrawingTool });
    document.querySelectorAll('[data-tool]').forEach(button => {
      const selected = button.dataset.tool === activeDrawingTool;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    return;
  }

  if (target.dataset.action === 'start-edit') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    setTurnEditing('equation');
    verifiedEquation = null;
    verifiedTurnEdit = null;
    editor.value = equationExpression(state.equation);
    message.textContent = '';
    message.classList.remove('error');
    renderEquationPreview(state.equation);
    editor.focus();
    return;
  }

  if (target.dataset.action === 'start-bounds') {
    const message = document.querySelector('#bounds-message');
    setTurnEditing('bounds');
    verifiedEquation = null;
    verifiedTurnEdit = null;
    setTurnBounds(state.bounds);
    message.textContent = '';
    message.classList.remove('error');
    return;
  }

  if (target.dataset.action === 'verify-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    const candidate = makeEquation(editor.value.trim());
    const equationChanged = candidate !== state.equation;
    const validation = equationChanged ? EquationParser.validateEdit(state.equation, candidate) : { valid: false, reason: 'Make one equation change before verifying.' };
    if (!validation.valid) {
      verifiedEquation = null;
      verifiedTurnEdit = null;
      const accept = document.querySelector('[data-action="accept-equation"]');
      accept.disabled = true;
      accept.classList.remove('ready');
      message.textContent = validation.reason;
      message.classList.add('error');
      renderEquationPreview(candidate, validation.issues);
      return;
    }
    verifiedEquation = candidate;
    verifiedTurnEdit = null;
    const accept = document.querySelector('[data-action="accept-equation"]');
    accept.disabled = false;
    accept.classList.add('ready');
    message.textContent = 'One-token edit verified. Accept it to save the change.';
    message.classList.remove('error');
    renderEquationPreview(candidate, [], 'valid', validation.changes);
    return;
  }

  if (target.dataset.action === 'verify-bounds') {
    const message = document.querySelector('#bounds-message');
    const validation = readTurnBounds();
    if (!validation.valid) {
      verifiedEquation = null;
      verifiedTurnEdit = null;
      const accept = document.querySelector('[data-action="accept-bounds"]');
      accept.disabled = true;
      accept.classList.remove('ready');
      message.textContent = validation.reason;
      message.classList.add('error');
      return;
    }
    const changed = changedBounds(validation.bounds, state.bounds);
    if (changed.length === 0) {
      verifiedEquation = null;
      verifiedTurnEdit = null;
      const accept = document.querySelector('[data-action="accept-bounds"]');
      accept.disabled = true;
      accept.classList.remove('ready');
      message.textContent = 'Change one graph boundary before verifying.';
      message.classList.add('error');
      return;
    }
    if (changed.length !== 1) {
      verifiedEquation = null;
      verifiedTurnEdit = null;
      const accept = document.querySelector('[data-action="accept-bounds"]');
      accept.disabled = true;
      accept.classList.remove('ready');
      message.textContent = 'Change exactly one graph boundary at a time.';
      message.classList.add('error');
      return;
    }
    verifiedEquation = null;
    verifiedTurnEdit = validation.bounds;
    const accept = document.querySelector('[data-action="accept-bounds"]');
    accept.disabled = false;
    accept.classList.add('ready');
    message.textContent = 'Graph boundary edit verified. Accept it to save the change.';
    message.classList.remove('error');
    return;
  }

  if (target.dataset.action === 'accept-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    if (!verifiedEquation || verifiedEquation !== makeEquation(editor.value.trim())) {
      message.textContent = 'Verify the equation before accepting it.';
      message.classList.add('error');
      return;
    }
    Game.acceptTurnEquation(state, verifiedEquation);
    saveState(state);
    verifiedEquation = null;
    verifiedTurnEdit = null;
    navigate('index.html');
    return;
  }

  if (target.dataset.action === 'accept-bounds') {
    const message = document.querySelector('#bounds-message');
    const currentBounds = readTurnBounds();
    if (!verifiedTurnEdit || !currentBounds.valid || !sameBounds(verifiedTurnEdit, currentBounds.bounds)) {
      message.textContent = 'Verify the boundary change before accepting it.';
      message.classList.add('error');
      return;
    }
    Game.acceptTurnBounds(state, verifiedTurnEdit);
    saveState(state);
    verifiedEquation = null;
    verifiedTurnEdit = null;
    navigate('index.html');
    return;
  }

  if (target.dataset.action === 'revert-equation') {
    const editor = document.querySelector('#equation-editor');
    const message = document.querySelector('#equation-message');
    Game.revertEquation(state);
    saveState(state);
    editor.value = equationExpression(state.equation);
    setTurnBounds(state.bounds);
    const accept = document.querySelector('[data-action="accept-equation"]');
    accept.disabled = true;
    accept.classList.remove('ready');
    verifiedEquation = null;
    verifiedTurnEdit = null;
    message.textContent = 'Equation reverted to the start of the turn.';
    message.classList.remove('error');
    renderEquationPreview(state.equation);
    setTurnEditing(false);
    return;
  }

  if (target.dataset.action === 'revert-bounds') {
    const message = document.querySelector('#bounds-message');
    Game.revertEquation(state);
    saveState(state);
    setTurnBounds(state.bounds);
    const accept = document.querySelector('[data-action="accept-bounds"]');
    accept.disabled = true;
    accept.classList.remove('ready');
    verifiedEquation = null;
    verifiedTurnEdit = null;
    message.textContent = 'Graph bounds reverted to the start of the turn.';
    message.classList.remove('error');
    setTurnEditing(false);
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

  if (target.dataset.action === 'clear-drawing' && challengeGraphSketch) challengeGraphSketch.clearCurrent();
  if (target.dataset.action === 'undo-drawing' && challengeGraphSketch) challengeGraphSketch.undoCurrent();

  if (target.dataset.action === 'submit-drawing') {
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
  if (event.target.id === 'equation-editor') {
    verifiedEquation = null;
    const accept = document.querySelector('[data-action="accept-equation"]');
    const message = document.querySelector('#equation-message');
    accept.disabled = true;
    accept.classList.remove('ready');
    message.textContent = '';
    message.classList.remove('error');
    renderEquationPreview(makeEquation(event.target.value));
  }
});

const state = loadState();
if (document.querySelector('#drawing-board')) renderChallengePage(state);
if (document.querySelector('[data-current-player-name]')) renderTurnPage(state);
if (document.querySelector('[data-winner-name]')) renderResultPage(state);

function renderResultPage(currentState) {
  updateSharedText(currentState);
  setText('[data-final-equation]', currentState.equation);
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
