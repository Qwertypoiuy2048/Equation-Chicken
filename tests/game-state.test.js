const test = require('node:test');
const assert = require('node:assert/strict');
const Game = require('../game-state.js');

test('creates a new match with the expected defaults', () => {
  const state = Game.createState();
  assert.equal(state.match, 1);
  assert.equal(state.currentPlayer, 1);
  assert.equal(state.equation, 'y = 2x + 3');
  assert.deepEqual(state.scores, { 1: 0, 2: 0 });
  assert.equal(state.phase, 'turn');
});

test('starts a challenge with the other player drawing', () => {
  const state = Game.startChallenge(Game.createState({ currentPlayer: 1 }));
  assert.deepEqual({ challenger: state.challenger, challengedPlayer: state.challengedPlayer, drawer: state.drawer }, { challenger: 1, challengedPlayer: 2, drawer: 2 });
  assert.equal(state.phase, 'graphing');
  assert.equal(state.drawingSubmitted, false);
});

test('submission freezes the game into judgment', () => {
  const state = Game.submitDrawing(Game.startChallenge(Game.createState()));
  assert.equal(state.phase, 'judgment');
  assert.equal(state.drawingSubmitted, true);
});

test('rejection opens the counter-challenge decision', () => {
  const state = Game.rejectDrawing(Game.submitDrawing(Game.startChallenge(Game.createState())));
  assert.equal(state.phase, 'rejected');
  assert.equal(state.drawer, 2);
});

test('counter-challenge switches the drawer and unfreezes drawing', () => {
  const state = Game.counterChallenge(Game.rejectDrawing(Game.submitDrawing(Game.startChallenge(Game.createState()))));
  assert.equal(state.drawer, 1);
  assert.equal(state.phase, 'graphing');
  assert.equal(state.drawingSubmitted, false);
});

test('accepted drawing awards the drawer one point', () => {
  const state = Game.startChallenge(Game.createState());
  Game.acceptDrawing(state);
  Game.finishMatch(state, state.drawer, 'accepted-drawing');
  assert.deepEqual(state.scores, { 1: 0, 2: 1 });
  assert.equal(state.winner, 2);
  assert.equal(state.phase, 'result');
  assert.equal(state.nextStartingPlayer, 1);
});

test('forfeit or accepted loss awards the challenger', () => {
  const state = Game.startChallenge(Game.createState());
  Game.finishMatch(state, state.challenger, 'forfeit');
  assert.deepEqual(state.scores, { 1: 1, 2: 0 });
  assert.equal(state.lastResult, 'forfeit');
});

test('next match resets match state but preserves scores', () => {
  const state = Game.finishMatch(Game.startChallenge(Game.createState()), 1, 'accepted-loss');
  const next = Game.nextMatch(state);
  assert.equal(next.match, 2);
  assert.equal(next.currentPlayer, 2);
  assert.deepEqual(next.scores, { 1: 1, 2: 0 });
  assert.equal(next.phase, 'turn');
  assert.equal(next.equation, 'y = 2x + 3');
  assert.equal(next.challenger, null);
});

test('challenge UI shows only drawing actions during graphing', () => {
  assert.deepEqual(Game.getChallengeUi('graphing'), {
    drawActions: true,
    judgeActions: false,
    rejectActions: false,
    acceptedActions: false,
    frozen: false,
    referenceVisible: false
  });
});

test('challenge UI switches from drawing to judgment after submit', () => {
  const ui = Game.getChallengeUi('judgment');
  assert.equal(ui.drawActions, false);
  assert.equal(ui.judgeActions, true);
  assert.equal(ui.frozen, true);
  assert.equal(ui.referenceVisible, false);
});

test('rejection shows rejection actions while staying frozen', () => {
  const ui = Game.getChallengeUi('rejected');
  assert.equal(ui.judgeActions, false);
  assert.equal(ui.rejectActions, true);
  assert.equal(ui.drawActions, false);
  assert.equal(ui.frozen, true);
});

test('counter-challenge returns to drawing and hides follow-up actions', () => {
  const ui = Game.getChallengeUi('graphing');
  assert.equal(ui.drawActions, true);
  assert.equal(ui.judgeActions, false);
  assert.equal(ui.rejectActions, false);
  assert.equal(ui.frozen, false);
});
