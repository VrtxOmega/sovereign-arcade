const {
  createGame,
  startGame,
  togglePause,
  queueDirection,
  stepGame,
} = window.SovereignSnakeLogic;

const GRID_SIZE = 18;
const TICK_MS = 140;
const BEST_SCORE_KEY = 'SOVEREIGN_SNAKE_BEST_SCORE';

const board = document.getElementById('board');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const stateValue = document.getElementById('stateValue');
const primaryButton = document.getElementById('primaryButton');
const restartButton = document.getElementById('restartButton');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayButton = document.getElementById('overlayButton');
const controls = document.querySelectorAll('[data-direction]');

const cells = [];
let gameState;
let tickHandle = null;

function loadBestScore() {
  const raw = Number(localStorage.getItem(BEST_SCORE_KEY) || '0');
  return Number.isFinite(raw) ? raw : 0;
}

function saveBestScore(bestScore) {
  localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
}

function createCellGrid() {
  board.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      board.appendChild(cell);
      cells.push(cell);
    }
  }
}

function setOverlay(title, text, buttonLabel, hidden) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlayButton.textContent = buttonLabel;
  overlay.classList.toggle('hidden', hidden);
}

function describeState(state) {
  if (state.status === 'ready') {
    return 'Standby';
  }

  if (state.status === 'paused') {
    return 'Paused';
  }

  if (state.status === 'gameover') {
    if (state.outcome === 'wall') {
      return 'Boundary Breach';
    }

    if (state.outcome === 'self') {
      return 'Hull Collision';
    }

    return 'Grid Cleared';
  }

  return 'Live';
}

function paintBoard(state) {
  const snakeMap = new Map();
  state.snake.forEach((segment, index) => {
    snakeMap.set(`${segment.x},${segment.y}`, index);
  });

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      const cell = cells[y * state.cols + x];
      const snakeIndex = snakeMap.get(`${x},${y}`);
      const isFood = state.food && state.food.x === x && state.food.y === y;

      cell.className = 'cell';

      if (snakeIndex === 0) {
        cell.classList.add('snake-head');
      } else if (typeof snakeIndex === 'number') {
        cell.classList.add('snake-body');
      } else if (isFood) {
        cell.classList.add('food');
      }
    }
  }
}

function render() {
  scoreValue.textContent = String(gameState.score).padStart(2, '0');
  bestValue.textContent = String(gameState.bestScore).padStart(2, '0');
  stateValue.textContent = describeState(gameState);
  paintBoard(gameState);

  if (gameState.status === 'ready') {
    primaryButton.textContent = 'Start';
    setOverlay('Sovereign Snake', 'Use arrow keys or WASD to begin the loop.', 'Start Run', false);
    return;
  }

  if (gameState.status === 'paused') {
    primaryButton.textContent = 'Resume';
    setOverlay('Paused', 'Press P, Space, or Resume to continue.', 'Resume', false);
    return;
  }

  if (gameState.status === 'gameover') {
    primaryButton.textContent = 'Start';
    const text = gameState.outcome === 'cleared'
      ? 'Every sector is occupied. Restart to run it again.'
      : 'Press restart to launch a fresh run.';
    setOverlay('Game Over', text, 'Restart', false);
    return;
  }

  primaryButton.textContent = 'Pause';
  setOverlay('', '', '', true);
}

function resetGame() {
  gameState = createGame({
    cols: GRID_SIZE,
    rows: GRID_SIZE,
    bestScore: loadBestScore(),
  });
  render();
}

function advanceGame() {
  const nextState = stepGame(gameState);
  gameState = nextState;
  saveBestScore(gameState.bestScore);
  render();
}

function startTicker() {
  if (tickHandle !== null) {
    return;
  }

  tickHandle = window.setInterval(() => {
    if (gameState.status === 'running') {
      advanceGame();
    }
  }, TICK_MS);
}

function handlePrimaryAction() {
  if (gameState.status === 'running' || gameState.status === 'paused') {
    gameState = togglePause(gameState);
    render();
    return;
  }

  if (gameState.status === 'gameover') {
    resetGame();
  }

  gameState = startGame(gameState);
  render();
}

function handleRestart() {
  resetGame();
  gameState = startGame(gameState);
  render();
}

function handleDirection(direction) {
  gameState = queueDirection(gameState, direction);

  if (gameState.status === 'ready') {
    gameState = startGame(gameState);
  }

  render();
}

function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const directionByKey = {
    arrowup: 'up',
    w: 'up',
    arrowright: 'right',
    d: 'right',
    arrowdown: 'down',
    s: 'down',
    arrowleft: 'left',
    a: 'left',
  };

  if (directionByKey[key]) {
    event.preventDefault();
    handleDirection(directionByKey[key]);
    return;
  }

  if (key === ' ' || key === 'p') {
    event.preventDefault();
    handlePrimaryAction();
  }

  if (key === 'r') {
    event.preventDefault();
    handleRestart();
  }
}

createCellGrid();
resetGame();
startTicker();

primaryButton.addEventListener('click', handlePrimaryAction);
restartButton.addEventListener('click', handleRestart);
overlayButton.addEventListener('click', () => {
  if (gameState.status === 'gameover') {
    handleRestart();
    return;
  }

  handlePrimaryAction();
});

controls.forEach((button) => {
  button.addEventListener('click', () => handleDirection(button.dataset.direction));
});

window.addEventListener('keydown', handleKeydown);
window.addEventListener('beforeunload', () => {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
  }
});
