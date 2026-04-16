const assert = require('node:assert/strict');

const {
  createGame,
  queueDirection,
  startGame,
  stepGame,
  pickFoodPosition,
  getLevel,
  getTickInterval,
} = require('./snake-logic.js');

function fixedRng(value) {
  return () => value;
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest('snake moves one cell in the current direction', () => {
  let state = createGame({ cols: 8, rows: 8, rng: fixedRng(0) });
  state = startGame(state);
  state = stepGame(state, { rng: fixedRng(0) });

  assert.deepEqual(state.snake[0], { x: 5, y: 4 });
  assert.equal(state.snake.length, 3);
});

runTest('snake grows and score increments when food is eaten', () => {
  let state = createGame({ cols: 8, rows: 8, rng: fixedRng(0) });
  state = {
    ...state,
    food: { x: 5, y: 4 },
  };
  state = startGame(state);
  state = stepGame(state, { rng: fixedRng(0) });

  assert.equal(state.score, 1);
  assert.equal(state.snake.length, 4);
  assert.notDeepEqual(state.food, { x: 5, y: 4 });
});

runTest('wall collision ends the game', () => {
  let state = createGame({ cols: 4, rows: 4, rng: fixedRng(0) });
  state = {
    ...state,
    snake: [
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ],
    direction: 'right',
    queuedDirection: 'right',
  };
  state = startGame(state);
  state = stepGame(state, { rng: fixedRng(0) });

  assert.equal(state.status, 'gameover');
  assert.equal(state.outcome, 'wall');
});

runTest('self collision ends the game', () => {
  let state = createGame({ cols: 6, rows: 6, rng: fixedRng(0) });
  state = {
    ...state,
    snake: [
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 3, y: 1 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ],
    direction: 'left',
    queuedDirection: 'down',
  };
  state = startGame(state);
  state = stepGame(state, { rng: fixedRng(0) });

  assert.equal(state.status, 'gameover');
  assert.equal(state.outcome, 'self');
});

runTest('food placement skips occupied cells deterministically', () => {
  const food = pickFoodPosition(
    3,
    2,
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ],
    fixedRng(0),
  );

  assert.deepEqual(food, { x: 1, y: 1 });
});

runTest('reverse direction input is ignored', () => {
  const state = createGame({ cols: 8, rows: 8, rng: fixedRng(0) });
  const queued = queueDirection(state, 'left');

  assert.equal(queued.queuedDirection, 'right');
});

runTest('level and pace ramp with score', () => {
  assert.equal(getLevel(0), 1);
  assert.equal(getLevel(5), 2);
  assert.equal(getTickInterval(0), 140);
  assert.equal(getTickInterval(10), 120);
});

console.log('All snake logic tests passed.');
