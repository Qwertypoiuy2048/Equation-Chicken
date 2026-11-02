(function attachGameState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EquationChicken = api;
})(typeof globalThis === 'object' ? globalThis : this, function createGameStateApi() {
  const DEFAULT_STATE = {
    match: 1,
    currentPlayer: 1,
    equation: 'y = x',
    history: ['y = x'],
    turnStartEquation: 'y = x',
    turnStartHistory: ['y = x'],
    scores: { 1: 0, 2: 0 },
    phase: 'turn',
    challenger: null,
    challengedPlayer: null,
    drawer: null,
    counterChallengeActive: false,
    drawings: [],
    drawingSubmitted: false,
    winner: null,
    nextStartingPlayer: 1,
    lastResult: ''
  };

  function createState(overrides = {}) {
    const equation = overrides.equation || DEFAULT_STATE.equation;
    const history = [...(overrides.history || [equation])];
    return {
      ...DEFAULT_STATE,
      ...overrides,
      equation,
      history,
      turnStartEquation: overrides.turnStartEquation || equation,
      turnStartHistory: [...(overrides.turnStartHistory || history)],
      scores: { ...DEFAULT_STATE.scores, ...(overrides.scores || {}) },
      drawings: (overrides.drawings || DEFAULT_STATE.drawings).map(stroke => ({
        player: stroke.player,
        color: stroke.color,
        points: stroke.points.map(point => ({ x: point.x, y: point.y }))
      }))
    };
  }

  function otherPlayer(player) {
    return player === 1 ? 2 : 1;
  }

  function startChallenge(state) {
    state.challenger = state.currentPlayer;
    state.challengedPlayer = otherPlayer(state.currentPlayer);
    state.drawer = state.challengedPlayer;
    state.counterChallengeActive = false;
    state.drawings = [];
    state.phase = 'graphing';
    state.drawingSubmitted = false;
    state.winner = null;
    state.lastResult = '';
    return state;
  }

  function submitDrawing(state) {
    state.phase = state.counterChallengeActive ? 'final-judgment' : 'judgment';
    state.drawingSubmitted = true;
    return state;
  }

  function rejectDrawing(state) {
    state.phase = 'rejected';
    return state;
  }

  function acceptDrawing(state) {
    state.phase = 'accepted';
    state.drawingSubmitted = true;
    return state;
  }

  function counterChallenge(state) {
    state.drawer = state.challenger;
    state.counterChallengeActive = true;
    state.phase = 'graphing';
    state.drawingSubmitted = false;
    return state;
  }

  function updateEquation(state, equation) {
    if (state.equation !== equation) {
      state.equation = equation;
      state.history = [...state.history, equation];
    }
    return state;
  }

  function revertEquation(state) {
    state.equation = state.turnStartEquation;
    state.history = [...state.turnStartHistory];
    return state;
  }

  function acceptTurnEquation(state, equation) {
    updateEquation(state, equation);
    state.currentPlayer = otherPlayer(state.currentPlayer);
    state.turnStartEquation = state.equation;
    state.turnStartHistory = [...state.history];
    state.phase = 'turn';
    return state;
  }

  function finishMatch(state, winner, result) {
    state.winner = winner;
    state.scores[winner] += 1;
    state.nextStartingPlayer = otherPlayer(winner);
    state.phase = 'result';
    state.lastResult = result;
    return state;
  }

  function resolveDraw(state) {
    state.winner = null;
    state.nextStartingPlayer = state.scores[1] < state.scores[2] ? 1 : state.scores[2] < state.scores[1] ? 2 : 1;
    state.phase = 'result';
    state.lastResult = 'draw';
    return state;
  }

  function nextMatch(state) {
    return createState({
      match: state.match + 1,
      currentPlayer: state.nextStartingPlayer,
      scores: state.scores,
      nextStartingPlayer: state.nextStartingPlayer
    });
  }

  function getChallengeUi(phase) {
    return {
      drawActions: phase === 'graphing',
      judgeActions: phase === 'judgment',
      rejectActions: phase === 'rejected',
      acceptedActions: phase === 'accepted',
      frozen: phase !== 'graphing',
      referenceVisible: phase === 'accepted'
    };
  }

  return {
    DEFAULT_STATE,
    createState,
    otherPlayer,
    startChallenge,
    submitDrawing,
    rejectDrawing,
    acceptDrawing,
    counterChallenge,
    updateEquation,
    revertEquation,
    acceptTurnEquation,
    finishMatch,
    resolveDraw,
    nextMatch,
    getChallengeUi
  };
});
