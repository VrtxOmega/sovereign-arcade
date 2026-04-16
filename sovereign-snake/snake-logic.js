(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SovereignSnakeLogic = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
  };

  const OPPOSITES = {
    up: 'down',
    right: 'left',
    down: 'up',
    left: 'right',
  };

  function cloneSegment(segment) {
    return { x: segment.x, y: segment.y };
  }

  function buildInitialSnake(cols, rows) {
    const centerX = Math.floor(cols / 2);
    const centerY = Math.floor(rows / 2);
    return [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY },
    ];
  }

  function pickFoodPosition(cols, rows, snake, rng) {
    const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
    const openCells = [];

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          openCells.push({ x, y });
        }
      }
    }

    if (openCells.length === 0) {
      return null;
    }

    const index = Math.min(openCells.length - 1, Math.floor(rng() * openCells.length));
    return openCells[index];
  }

  function createGame(config) {
    const options = config || {};
    const cols = options.cols || 18;
    const rows = options.rows || 18;
    const rng = options.rng || Math.random;
    const bestScore = options.bestScore || 0;
    const snake = buildInitialSnake(cols, rows);

    return {
      cols,
      rows,
      snake,
      direction: 'right',
      queuedDirection: 'right',
      food: pickFoodPosition(cols, rows, snake, rng),
      score: 0,
      level: 1,
      bestScore,
      status: 'ready',
      outcome: null,
    };
  }

  function getLevel(score) {
    return Math.floor(score / 5) + 1;
  }

  function getTickInterval(score) {
    return Math.max(62, 140 - (getLevel(score) - 1) * 10);
  }

  function withBestScore(state, score) {
    return Math.max(state.bestScore || 0, score);
  }

  function startGame(state) {
    if (!state || state.status === 'gameover') {
      return state;
    }

    return {
      ...state,
      status: 'running',
    };
  }

  function togglePause(state) {
    if (!state) {
      return state;
    }

    if (state.status === 'running') {
      return { ...state, status: 'paused' };
    }

    if (state.status === 'paused' || state.status === 'ready') {
      return { ...state, status: 'running' };
    }

    return state;
  }

  function queueDirection(state, nextDirection) {
    if (!state || !DIRECTION_VECTORS[nextDirection]) {
      return state;
    }

    const currentDirection = state.direction;
    if (state.snake.length > 1 && OPPOSITES[currentDirection] === nextDirection) {
      return state;
    }

    return {
      ...state,
      queuedDirection: nextDirection,
    };
  }

  function isInsideBoard(cols, rows, point) {
    return point.x >= 0 && point.x < cols && point.y >= 0 && point.y < rows;
  }

  function hitSnake(point, snake) {
    return snake.some((segment) => segment.x === point.x && segment.y === point.y);
  }

  function stepGame(state, config) {
    if (!state || state.status !== 'running') {
      return state;
    }

    const options = config || {};
    const rng = options.rng || Math.random;
    const activeDirection = state.queuedDirection || state.direction;
    const vector = DIRECTION_VECTORS[activeDirection];
    const head = state.snake[0];
    const nextHead = {
      x: head.x + vector.x,
      y: head.y + vector.y,
    };

    if (!isInsideBoard(state.cols, state.rows, nextHead)) {
      return {
        ...state,
        direction: activeDirection,
        status: 'gameover',
        outcome: 'wall',
        bestScore: withBestScore(state, state.score),
      };
    }

    const ateFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
    const nextTail = ateFood ? state.snake : state.snake.slice(0, -1);

    if (hitSnake(nextHead, nextTail)) {
      return {
        ...state,
        direction: activeDirection,
        status: 'gameover',
        outcome: 'self',
        bestScore: withBestScore(state, state.score),
      };
    }

    const snake = [nextHead].concat(nextTail.map(cloneSegment));
    const score = ateFood ? state.score + 1 : state.score;
    const level = getLevel(score);
    const bestScore = withBestScore(state, score);
    const food = ateFood ? pickFoodPosition(state.cols, state.rows, snake, rng) : state.food;
    const filledBoard = !food;

    return {
      ...state,
      snake,
      direction: activeDirection,
      queuedDirection: activeDirection,
      food,
      score,
      level,
      bestScore,
      status: filledBoard ? 'gameover' : state.status,
      outcome: filledBoard ? 'cleared' : null,
    };
  }

  return {
    DIRECTION_VECTORS,
    createGame,
    startGame,
    togglePause,
    queueDirection,
    stepGame,
    pickFoodPosition,
    getLevel,
    getTickInterval,
  };
});
