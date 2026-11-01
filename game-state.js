(function attachGameState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EquationChicken = api;
})(typeof globalThis === 'object' ? globalThis : this, function createGameStateApi() {
  const DEFAULT_STATE = {
    match: 1,
    currentPlayer: 1,
    equation: 'y = 2x + 3',
    scores: { 1: 0, 2: 0 },
    phase: 'turn',
    challenger: null,
    challengedPlayer: null,
    drawer: null,
    drawingSubmitted: false,
    winner: null,
    nextStartingPlayer: 1,
    lastResult: ''
  };

  function createState(overrides = {}) {
    return {
      ...DEFAULT_STATE,
      ...overrides,
      scores: { ...DEFAULT_STATE.scores, ...(overrides.scores || {}) }
    };
  }

  function otherPlayer(player) {
    return player === 1 ? 2 : 1;
  }

  function startChallenge(state) {
    state.challenger = state.currentPlayer;
    state.challengedPlayer = otherPlayer(state.currentPlayer);
    state.drawer = state.challengedPlayer;
    state.phase = 'graphing';
    state.drawingSubmitted = false;
    state.winner = null;
    state.lastResult = '';
    return state;
  }

  function submitDrawing(state) {
    state.phase = 'judgment';
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
    state.phase = 'graphing';
    state.drawingSubmitted = false;
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
    finishMatch,
    nextMatch,
    getChallengeUi
  };
});
