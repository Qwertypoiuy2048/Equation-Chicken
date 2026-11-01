const drawingBoard = document.querySelector('#drawing-board');
const drawActions = document.querySelector('#draw-actions');
const judgeActions = document.querySelector('#judge-actions');
const rejectActions = document.querySelector('#reject-actions');
const frozenLabel = document.querySelector('#frozen-label');
const challengeStatus = document.querySelector('#challenge-status');
const challengeTitle = document.querySelector('#challenge-title');
const graphHint = document.querySelector('#graph-hint');
const screens = [...document.querySelectorAll('.screen')];
const tabs = [...document.querySelectorAll('.tab')];

function showScreen(id) {
  screens.forEach(screen => {
    const active = screen.id === id;
    screen.classList.toggle('active', active);
    screen.hidden = !active;
  });
  tabs.forEach(tab => {
    tab.setAttribute('aria-selected', String(tab.dataset.screen === id));
  });
}

function resetChallenge(player = 'Player 2', counter = false) {
  drawingBoard.classList.remove('is-frozen');
  drawActions.hidden = false;
  judgeActions.hidden = true;
  rejectActions.hidden = true;
  frozenLabel.hidden = true;
  challengeStatus.textContent = counter ? 'Counter-challenge' : 'Challenge phase';
  challengeTitle.innerHTML = `${player} must graph: <code>y = 2x + 3</code>`;
  graphHint.textContent = 'Reference graph is hidden until judgment.';
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-screen], [data-go], [data-action]');
  if (!target) return;

  if (target.dataset.screen || target.dataset.go) {
    showScreen(target.dataset.screen || target.dataset.go);
  }

  if (!target.dataset.action || !drawingBoard) return;

  if (target.dataset.action === 'submit-drawing') {
    drawingBoard.classList.add('is-frozen');
    drawActions.hidden = true;
    frozenLabel.hidden = false;
    graphHint.textContent = 'Drawing is frozen. The reference graph remains hidden until a judgment is made.';
    judgeActions.hidden = false;
  }

  if (target.dataset.action === 'reject-drawing') {
    judgeActions.hidden = true;
    rejectActions.hidden = false;
  }

  if (target.dataset.action === 'counter-challenge') {
    resetChallenge('Player 1', true);
  }
});
