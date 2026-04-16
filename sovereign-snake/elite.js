/* ═══════════════════════════════════════════════════════════════════
   Sovereign Snake Elite — AAA Build
   VERITAS Gold-and-Obsidian Aesthetic
   ═══════════════════════════════════════════════════════════════════ */

const {
  createGame, startGame, togglePause,
  queueDirection, stepGame, getTickInterval, getLevel, pickFoodPosition
} = window.SovereignSnakeLogic;

/* ── Constants ─────────────────────────────────────────────── */
const GRID_SIZE = 18;
const BEST_SCORE_KEY = 'SOVEREIGN_SNAKE_BEST_SCORE';
const STATS_KEY = 'SOVEREIGN_SNAKE_STATS';
const ACHIEVEMENTS_KEY = 'SOVEREIGN_SNAKE_ACHIEVEMENTS';
const CELL_GAP = 2;
const COMBO_WINDOW_MS = 3000;
const POWERUP_DURATION_MS = 8000;
const OBSTACLE_START_LEVEL = 3;
const MULTI_FOOD_LEVEL = 5;

/* ── DOM References ────────────────────────────────────────── */
const boardCanvas = document.getElementById('boardCanvas');
const ctx = boardCanvas.getContext('2d');
const bgCanvas = document.getElementById('bgCanvas');
const bg = bgCanvas.getContext('2d');
const boardShell = document.getElementById('boardShell');
const scoreValue = document.getElementById('scoreValue');
const bestValue = document.getElementById('bestValue');
const levelValue = document.getElementById('levelValue');
const speedValue = document.getElementById('speedValue');
const lengthValue = document.getElementById('lengthValue');
const objectiveValue = document.getElementById('objectiveValue');
const statePill = document.getElementById('statePill');
const progressLabel = document.getElementById('progressLabel');
const progressFill = document.getElementById('progressFill');
const eventLog = document.getElementById('eventLog');
const primaryButton = document.getElementById('primaryButton');
const restartButton = document.getElementById('restartButton');
const overlay = document.getElementById('overlay');
const overlayKicker = document.getElementById('overlayKicker');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayButton = document.getElementById('overlayButton');
const controls = document.querySelectorAll('[data-direction]');

/* ── Level Color Themes ────────────────────────────────────── */
const LEVEL_THEMES = [
  { head: '255,215,0',   body: '255,165,28',  grid: '255,215,0',   name: 'Gold Protocol' },
  { head: '61,226,255',  body: '0,180,220',   grid: '61,226,255',  name: 'Cyan Shift' },
  { head: '168,85,247',  body: '128,50,200',  grid: '168,85,247',  name: 'Ultraviolet' },
  { head: '0,255,136',   body: '0,200,100',   grid: '0,255,136',   name: 'Emerald Matrix' },
  { head: '255,95,67',   body: '220,60,30',   grid: '255,95,67',   name: 'Inferno Core' },
  { head: '255,215,0',   body: '255,255,255', grid: '255,255,255', name: 'White Sovereign' },
];

/* ── Food Types ────────────────────────────────────────────── */
const FOOD_TYPES = [
  { color: '255,95,67',   glow: 14, value: 1, name: 'Signal Fruit',   shape: 'circle' },
  { color: '61,226,255',  glow: 18, value: 2, name: 'Quantum Orb',    shape: 'diamond' },
  { color: '168,85,247',  glow: 16, value: 3, name: 'Void Crystal',   shape: 'star' },
  { color: '0,255,136',   glow: 12, value: 1, name: 'Matrix Fragment', shape: 'circle' },
];

/* ── Power-Up Definitions ──────────────────────────────────── */
const POWERUP_TYPES = [
  { id: 'shield', color: '61,226,255',  icon: '🛡️', name: 'Shield' },
  { id: 'magnet', color: '168,85,247',  icon: '🧲', name: 'Magnet' },
  { id: 'slow',   color: '0,255,136',   icon: '⏳', name: 'Time Slow' },
];

/* ── Achievement Definitions ───────────────────────────────── */
const ACHIEVEMENT_DEFS = [
  { id: 'first_blood',   name: 'First Blood',     desc: 'Score your first point', check: s => s.totalFood >= 1 },
  { id: 'deca_chain',    name: 'Deca Chain',       desc: 'Reach score 10',        check: s => s.bestScore >= 10 },
  { id: 'speed_demon',   name: 'Speed Demon',      desc: 'Reach Level 5',         check: s => s.bestLevel >= 5 },
  { id: 'combo_master',  name: 'Combo Master',     desc: '5x combo streak',       check: s => s.bestCombo >= 5 },
  { id: 'century',       name: 'Century Run',      desc: 'Score 100 in one run',  check: s => s.bestScore >= 100 },
  { id: 'veteran',       name: 'Veteran Protocol', desc: 'Play 50 games',         check: s => s.gamesPlayed >= 50 },
  { id: 'untouchable',   name: 'Untouchable',      desc: 'Score 20 without dying',check: s => s.bestScore >= 20 },
  { id: 'powerup_addict',name: 'Power Addict',     desc: 'Collect 10 power-ups',  check: s => s.totalPowerups >= 10 },
];

/* ── State ─────────────────────────────────────────────────── */
const stars = [];
const bursts = [];
const events = [];
const trailBuffer = [];
const deathParticles = [];
const achievementQueue = [];
const foodSpawnAnims = [];

let gameState;
let frameId = 0;
let previousFrame = 0;
let tickAccumulator = 0;
let pulseTime = 0;
let screenShake = 0;
let levelFlash = 0;
let audioContext = null;
let swipeStart = null;

// Combo system
let comboCount = 0;
let comboMultiplier = 1;
let lastEatTime = 0;
let comboDisplayTimer = 0;

// Power-ups
let activePowerups = []; // { type, expiresAt }
let powerupItem = null;  // { x, y, typeIndex }
let powerupSpawnTimer = 0;

// Obstacles
let obstacles = [];

// Multi-food
let bonusFood = null; // { x, y, typeIndex }
let bonusFoodTimer = 0;

// Current food type
let currentFoodType = 0;

// Run stats
let runStats = { foodEaten: 0, ticksAlive: 0, bestCombo: 0, powerupsUsed: 0 };

// Persistent stats
let persistentStats = loadStats();
let unlockedAchievements = loadAchievements();

// Achievement toast
let activeToast = null; // { text, timer }

/* ── Persistence ───────────────────────────────────────────── */
function loadBestScore() {
  const raw = Number(localStorage.getItem(BEST_SCORE_KEY) || '0');
  return Number.isFinite(raw) ? raw : 0;
}
function saveBestScore(s) { localStorage.setItem(BEST_SCORE_KEY, String(s)); }

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    return {
      gamesPlayed: raw.gamesPlayed || 0,
      totalFood: raw.totalFood || 0,
      bestScore: raw.bestScore || 0,
      bestCombo: raw.bestCombo || 0,
      bestLevel: raw.bestLevel || 0,
      totalPowerups: raw.totalPowerups || 0,
    };
  } catch { return { gamesPlayed: 0, totalFood: 0, bestScore: 0, bestCombo: 0, bestLevel: 0, totalPowerups: 0 }; }
}
function saveStats() { localStorage.setItem(STATS_KEY, JSON.stringify(persistentStats)); }

function loadAchievements() {
  try { return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '[]'); }
  catch { return []; }
}
function saveAchievements() { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlockedAchievements)); }

/* ── Theme ─────────────────────────────────────────────────── */
function currentTheme() {
  const idx = gameState ? (gameState.level - 1) % LEVEL_THEMES.length : 0;
  return LEVEL_THEMES[idx];
}

/* ── Audio ─────────────────────────────────────────────────── */
function ensureAudio() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playTone(frequency, duration, type) {
  const context = ensureAudio();
  if (!context) return;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start();
  osc.stop(context.currentTime + duration + 0.02);
}

function playComboTone(combo) {
  const base = 440 + combo * 60;
  playTone(base, 0.06, 'triangle');
  playTone(base * 1.5, 0.04, 'sine');
}

function playPowerupTone() {
  playTone(660, 0.1, 'sine');
  playTone(880, 0.08, 'triangle');
  playTone(1100, 0.06, 'sine');
}

/* ── Background ────────────────────────────────────────────── */
function initializeBackground() {
  if (stars.length) return;
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random(), y: Math.random(),
      size: Math.random() * 2.2 + 0.6,
      speed: Math.random() * 0.08 + 0.02,
      alpha: Math.random() * 0.7 + 0.1,
    });
  }
}

/* ── Canvas Sizing ─────────────────────────────────────────── */
function resizeCanvases() {
  const rect = boardShell.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width - 32, rect.height - 32));
  boardCanvas.width = size;
  boardCanvas.height = size;
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

function cellSize() { return boardCanvas.width / GRID_SIZE; }

function boardPoint(segment) {
  const size = cellSize();
  return { x: segment.x * size, y: segment.y * size, size };
}

function centerPoint(segment) {
  const p = boardPoint(segment);
  return { x: p.x + p.size / 2, y: p.y + p.size / 2 };
}

/* ── Events Log ────────────────────────────────────────────── */
function pushEvent(message) {
  events.unshift(message);
  events.length = Math.min(events.length, 4);
  eventLog.innerHTML = events.map(item => `<div class="event-item">${item}</div>`).join('');
}

/* ── Particles ─────────────────────────────────────────────── */
function spawnBurst(x, y, color, count, spread) {
  for (let i = 0; i < count; i++) {
    bursts.push({
      x, y,
      vx: (Math.random() - 0.5) * spread,
      vy: (Math.random() - 0.5) * spread,
      life: 1,
      decay: Math.random() * 0.02 + 0.015,
      radius: Math.random() * 5 + 2,
      color,
    });
  }
}

function updateBursts() {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const p = bursts[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04; // slight gravity
    p.life -= p.decay;
    p.radius *= 0.985;
    if (p.life <= 0) bursts.splice(i, 1);
  }
}

/* ── V3: Food Spawn Animation ──────────────────────────────── */
function easeOutElastic(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
}

function startFoodSpawnAnim(x, y, color) {
  foodSpawnAnims.push({ x, y, color, frame: 0, totalFrames: 24 });
  spawnBurst(x, y, color, 8, 2.0);
}

/* ── V4: Chain Dissolve Death ──────────────────────────────── */
function triggerChainDissolve() {
  deathParticles.length = 0;
  const theme = currentTheme();
  gameState.snake.forEach((seg, i) => {
    const center = centerPoint(seg);
    const delay = i * 3;
    for (let j = 0; j < 4; j++) {
      deathParticles.push({
        x: center.x + (Math.random() - 0.5) * 8,
        y: center.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3 - 1.5,
        life: 1,
        decay: Math.random() * 0.008 + 0.006,
        radius: Math.random() * 4 + 3,
        color: i === 0 ? theme.head : theme.body,
        delay,
      });
    }
  });
}

function updateDeathParticles() {
  for (let i = deathParticles.length - 1; i >= 0; i--) {
    const p = deathParticles[i];
    if (p.delay > 0) { p.delay--; continue; }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.vx *= 0.98;
    p.life -= p.decay;
    p.radius *= 0.992;
    if (p.life <= 0) deathParticles.splice(i, 1);
  }
}

/* ── Obstacle System ───────────────────────────────────────── */
function generateObstacles(level) {
  obstacles = [];
  if (level < OBSTACLE_START_LEVEL) return;
  const count = Math.min(level - OBSTACLE_START_LEVEL + 2, 12);
  const occupied = new Set(gameState.snake.map(s => `${s.x},${s.y}`));
  if (gameState.food) occupied.add(`${gameState.food.x},${gameState.food.y}`);
  // Keep center clear
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      occupied.add(`${Math.floor(GRID_SIZE/2)+dx},${Math.floor(GRID_SIZE/2)+dy}`);
    }
  }
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        obstacles.push({ x, y });
        occupied.add(key);
        break;
      }
      attempts++;
    }
  }
}

function isObstacle(x, y) {
  return obstacles.some(o => o.x === x && o.y === y);
}

/* ── Power-Up System ───────────────────────────────────────── */
function spawnPowerup() {
  if (powerupItem) return;
  const typeIndex = Math.floor(Math.random() * POWERUP_TYPES.length);
  const occupied = new Set(gameState.snake.map(s => `${s.x},${s.y}`));
  if (gameState.food) occupied.add(`${gameState.food.x},${gameState.food.y}`);
  if (bonusFood) occupied.add(`${bonusFood.x},${bonusFood.y}`);
  obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
  let attempts = 0;
  while (attempts < 50) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!occupied.has(`${x},${y}`)) {
      powerupItem = { x, y, typeIndex };
      break;
    }
    attempts++;
  }
}

function hasPowerup(id) {
  return activePowerups.some(p => p.type === id && p.expiresAt > Date.now());
}

function cleanExpiredPowerups() {
  activePowerups = activePowerups.filter(p => p.expiresAt > Date.now());
}

/* ── Bonus Food ────────────────────────────────────────────── */
function spawnBonusFood() {
  if (bonusFood || !gameState || gameState.level < MULTI_FOOD_LEVEL) return;
  if (Math.random() > 0.3) return;
  const typeIndex = 1 + Math.floor(Math.random() * (FOOD_TYPES.length - 1));
  const occupied = new Set(gameState.snake.map(s => `${s.x},${s.y}`));
  if (gameState.food) occupied.add(`${gameState.food.x},${gameState.food.y}`);
  if (powerupItem) occupied.add(`${powerupItem.x},${powerupItem.y}`);
  obstacles.forEach(o => occupied.add(`${o.x},${o.y}`));
  let attempts = 0;
  while (attempts < 50) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    if (!occupied.has(`${x},${y}`)) {
      bonusFood = { x, y, typeIndex };
      bonusFoodTimer = 200; // ticks before it disappears
      const fc = centerPoint({ x, y });
      startFoodSpawnAnim(fc.x, fc.y, FOOD_TYPES[typeIndex].color);
      break;
    }
    attempts++;
  }
}

/* ── Achievements ──────────────────────────────────────────── */
function checkAchievements() {
  ACHIEVEMENT_DEFS.forEach(def => {
    if (!unlockedAchievements.includes(def.id) && def.check(persistentStats)) {
      unlockedAchievements.push(def.id);
      saveAchievements();
      achievementQueue.push(def);
    }
  });
}

function processAchievementToasts(delta) {
  if (activeToast) {
    activeToast.timer -= delta;
    if (activeToast.timer <= 0) activeToast = null;
  }
  if (!activeToast && achievementQueue.length > 0) {
    const def = achievementQueue.shift();
    activeToast = { text: `🏆 ${def.name}: ${def.desc}`, timer: 4000 };
    playTone(880, 0.12, 'sine');
    playTone(1320, 0.08, 'triangle');
    pushEvent(`Achievement unlocked: ${def.name}`);
  }
}

/* ── HUD ───────────────────────────────────────────────────── */
function describeState(state) {
  if (state.status === 'ready') return 'Standby';
  if (state.status === 'paused') return 'Paused';
  if (state.status === 'gameover') {
    if (state.outcome === 'wall') return 'Boundary Breach';
    if (state.outcome === 'self') return 'Hull Collision';
    return 'Grid Dominated';
  }
  return 'Live';
}

function objectiveText(state) {
  if (state.status === 'gameover') {
    return state.outcome === 'cleared' ? 'Arena saturated. Restart to run it again.' : 'Run collapsed. Reinitialize the chain.';
  }
  if (state.status === 'paused') return 'Run suspended. Resume when ready.';
  return 'Acquire next signal fruit';
}

function progressState(score) {
  const current = score % 5;
  return { current, target: 5, percent: current / 5 * 100 };
}

function syncHud() {
  const tickMs = getTickInterval(gameState.score);
  const progress = progressState(gameState.score);
  scoreValue.textContent = String(gameState.score).padStart(2, '0');
  bestValue.textContent = String(gameState.bestScore).padStart(2, '0');
  levelValue.textContent = String(gameState.level).padStart(2, '0');
  speedValue.textContent = `${tickMs}ms`;
  lengthValue.textContent = `Length ${gameState.snake.length}`;
  objectiveValue.textContent = objectiveText(gameState);
  statePill.textContent = describeState(gameState);
  progressLabel.textContent = `${progress.current} / ${progress.target}`;
  progressFill.style.width = `${progress.percent}%`;

  if (gameState.status === 'ready') {
    primaryButton.textContent = 'Start';
    overlayKicker.textContent = 'Elite Protocol';
    overlayTitle.textContent = 'Sovereign Snake';
    overlayText.textContent = 'Use arrow keys, WASD, or swipe to begin the loop.';
    overlayButton.textContent = 'Start Run';
    overlay.classList.remove('hidden');
    return;
  }
  if (gameState.status === 'paused') {
    primaryButton.textContent = 'Resume';
    overlayKicker.textContent = 'Run Suspended';
    overlayTitle.textContent = 'Paused';
    overlayText.textContent = 'The chain is holding position. Resume when ready.';
    overlayButton.textContent = 'Resume';
    overlay.classList.remove('hidden');
    return;
  }
  if (gameState.status === 'gameover') {
    primaryButton.textContent = 'Start';
    overlayKicker.textContent = gameState.outcome === 'self' ? 'Self Collision' : 'Run Failed';
    overlayTitle.textContent = 'Game Over';
    // U4: Enhanced game-over stats
    const stats = `Score: ${gameState.score} | Combo: ${runStats.bestCombo}x | Food: ${runStats.foodEaten} | Power-ups: ${runStats.powerupsUsed}`;
    overlayText.textContent = stats;
    overlayButton.textContent = 'Restart';
    overlay.classList.remove('hidden');
    return;
  }
  primaryButton.textContent = 'Pause';
  overlay.classList.add('hidden');
}

/* ── Game Control ──────────────────────────────────────────── */
function resetGame(logReady) {
  gameState = createGame({ cols: GRID_SIZE, rows: GRID_SIZE, bestScore: loadBestScore() });
  tickAccumulator = 0;
  screenShake = 0;
  levelFlash = 0;
  comboCount = 0;
  comboMultiplier = 1;
  lastEatTime = 0;
  comboDisplayTimer = 0;
  activePowerups = [];
  powerupItem = null;
  powerupSpawnTimer = 0;
  obstacles = [];
  bonusFood = null;
  bonusFoodTimer = 0;
  currentFoodType = 0;
  deathParticles.length = 0;
  trailBuffer.length = 0;
  foodSpawnAnims.length = 0;
  runStats = { foodEaten: 0, ticksAlive: 0, bestCombo: 0, powerupsUsed: 0 };
  if (logReady !== false) pushEvent('System ready. Awaiting launch command.');
  syncHud();
}

function startRun() {
  if (gameState.status === 'gameover') resetGame(false);
  gameState = startGame(gameState);
  generateObstacles(gameState.level);
  pushEvent('Run launched. Maintain vector discipline.');
  playTone(340, 0.08, 'triangle');
  syncHud();
}

function pauseOrResume() {
  gameState = togglePause(gameState);
  pushEvent(gameState.status === 'paused' ? 'Run paused.' : 'Run resumed.');
  playTone(gameState.status === 'paused' ? 220 : 320, 0.06, 'square');
  syncHud();
}

function handleDirection(direction) {
  const before = gameState.queuedDirection;
  gameState = queueDirection(gameState, direction);
  if (gameState.status === 'ready') startRun();
  if (before !== gameState.queuedDirection) playTone(260, 0.025, 'triangle');
}

/* ── Game Tick ──────────────────────────────────────────────── */
function processTick() {
  const prevScore = gameState.score;
  const prevLevel = gameState.level;
  const prevFood = gameState.food;

  // V2: Trail buffer — store head position before move
  if (gameState.snake.length > 0) {
    trailBuffer.unshift({ ...gameState.snake[0] });
    if (trailBuffer.length > 6) trailBuffer.pop();
  }

  runStats.ticksAlive++;

  // Check obstacle collision BEFORE step
  const activeDir = gameState.queuedDirection || gameState.direction;
  const vec = window.SovereignSnakeLogic.DIRECTION_VECTORS[activeDir];
  const head = gameState.snake[0];
  const nextX = head.x + vec.x;
  const nextY = head.y + vec.y;

  if (isObstacle(nextX, nextY)) {
    if (hasPowerup('shield')) {
      // Shield absorbs hit
      activePowerups = activePowerups.filter(p => p.type !== 'shield');
      pushEvent('Shield absorbed obstacle impact!');
      playTone(300, 0.1, 'square');
      // Remove that obstacle
      obstacles = obstacles.filter(o => !(o.x === nextX && o.y === nextY));
    } else {
      // Death by obstacle
      gameState = {
        ...gameState,
        status: 'gameover',
        outcome: 'wall',
        bestScore: Math.max(gameState.bestScore, gameState.score),
      };
      saveBestScore(gameState.bestScore);
      triggerChainDissolve();
      screenShake = 14;
      playTone(180, 0.18, 'sawtooth');
      pushEvent('Obstacle collision! Run terminated.');
      onGameOver();
      syncHud();
      return;
    }
  }

  gameState = stepGame(gameState);
  saveBestScore(gameState.bestScore);

  // Check power-up collision
  if (powerupItem && gameState.snake[0].x === powerupItem.x && gameState.snake[0].y === powerupItem.y) {
    const pType = POWERUP_TYPES[powerupItem.typeIndex];
    activePowerups.push({ type: pType.id, expiresAt: Date.now() + POWERUP_DURATION_MS });
    const pc = centerPoint(powerupItem);
    spawnBurst(pc.x, pc.y, pType.color, 20, 4);
    playPowerupTone();
    pushEvent(`Power-up acquired: ${pType.name}`);
    powerupItem = null;
    runStats.powerupsUsed++;
    persistentStats.totalPowerups++;
  }

  // Check bonus food collision
  if (bonusFood && gameState.snake[0].x === bonusFood.x && gameState.snake[0].y === bonusFood.y) {
    const ft = FOOD_TYPES[bonusFood.typeIndex];
    const bonusPoints = ft.value * comboMultiplier;
    gameState = { ...gameState, score: gameState.score + bonusPoints - 1, level: getLevel(gameState.score + bonusPoints - 1) };
    const bc = centerPoint(bonusFood);
    spawnBurst(bc.x, bc.y, ft.color, 22, 4);
    playTone(550, 0.08, 'triangle');
    pushEvent(`Bonus ${ft.name} acquired! +${bonusPoints}`);
    bonusFood = null;
    runStats.foodEaten++;
  }

  // Decrement bonus food timer
  if (bonusFood) {
    bonusFoodTimer--;
    if (bonusFoodTimer <= 0) {
      bonusFood = null;
      pushEvent('Bonus food expired.');
    }
  }

  // Food eaten
  if (gameState.score > prevScore && prevFood) {
    const center = centerPoint(prevFood);
    const ft = FOOD_TYPES[currentFoodType];
    spawnBurst(center.x, center.y, ft.color, 18, 3.8);

    // M1: Combo system
    const now = Date.now();
    if (now - lastEatTime < COMBO_WINDOW_MS && lastEatTime > 0) {
      comboCount++;
      comboMultiplier = Math.min(comboCount + 1, 8);
      const bonusScore = comboCount;
      gameState = { ...gameState, score: gameState.score + bonusScore };
      comboDisplayTimer = 1500;
      playComboTone(comboCount);
      pushEvent(`Combo x${comboMultiplier}! +${bonusScore} bonus`);
    } else {
      comboCount = 0;
      comboMultiplier = 1;
      playTone(440, 0.09, 'triangle');
    }
    lastEatTime = now;
    runStats.foodEaten++;
    runStats.bestCombo = Math.max(runStats.bestCombo, comboCount);

    // Update persistent stats
    persistentStats.totalFood++;
    persistentStats.bestCombo = Math.max(persistentStats.bestCombo, comboCount);

    // Randomize next food type
    currentFoodType = Math.floor(Math.random() * FOOD_TYPES.length);

    // V3: Food spawn animation
    if (gameState.food) {
      const nc = centerPoint(gameState.food);
      startFoodSpawnAnim(nc.x, nc.y, FOOD_TYPES[currentFoodType].color);
    }

    // Try spawn bonus food
    spawnBonusFood();

    pushEvent(`Signal acquired. Score ${gameState.score}.`);
  }

  // Level up
  if (gameState.level > prevLevel) {
    spawnBurst(boardCanvas.width / 2, boardCanvas.height / 2, currentTheme().head, 30, 5);
    playTone(520, 0.08, 'square');
    playTone(780, 0.11, 'triangle');
    levelFlash = 1.0; // U5: Level flash
    generateObstacles(gameState.level);
    pushEvent(`Level ${gameState.level} — ${currentTheme().name} protocol engaged.`);
  }

  // Power-up spawn timer
  powerupSpawnTimer++;
  if (powerupSpawnTimer > 40 && !powerupItem && Math.random() > 0.92) {
    spawnPowerup();
    powerupSpawnTimer = 0;
  }

  // Magnet effect — pull food toward head
  if (hasPowerup('magnet') && gameState.food) {
    const head = gameState.snake[0];
    const dx = head.x - gameState.food.x;
    const dy = head.y - gameState.food.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1 && dist < 5) {
      const moveX = Math.sign(dx);
      const moveY = Math.sign(dy);
      const newFx = gameState.food.x + moveX;
      const newFy = gameState.food.y + moveY;
      if (newFx >= 0 && newFx < GRID_SIZE && newFy >= 0 && newFy < GRID_SIZE) {
        gameState = { ...gameState, food: { x: newFx, y: newFy } };
      }
    }
  }

  // Game over
  if (gameState.status === 'gameover') {
    triggerChainDissolve();
    screenShake = 14;
    playTone(180, 0.18, 'sawtooth');
    pushEvent(gameState.outcome === 'self' ? 'Hull collision.' : 'Boundary breach.');
    onGameOver();
  }

  cleanExpiredPowerups();
  syncHud();
}

function onGameOver() {
  persistentStats.gamesPlayed++;
  persistentStats.bestScore = Math.max(persistentStats.bestScore, gameState.score);
  persistentStats.bestLevel = Math.max(persistentStats.bestLevel, gameState.level);
  saveStats();
  checkAchievements();
}

/* ── Rendering ─────────────────────────────────────────────── */
function roundedCell(x, y, size, fill, glow) {
  const radius = Math.max(5, size * 0.24);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + size, y, x + size, y + size, radius);
  ctx.arcTo(x + size, y + size, x, y + size, radius);
  ctx.arcTo(x, y + size, x, y, radius);
  ctx.arcTo(x, y, x + size, y, radius);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowBlur = glow || 0;
  ctx.shadowColor = fill;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawDiamond(cx, cy, r, fill, glow) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowBlur = glow;
  ctx.shadowColor = fill;
  ctx.fill();
  ctx.restore();
}

function drawStar(cx, cy, r, fill, glow) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.shadowBlur = glow;
  ctx.shadowColor = fill;
  ctx.fill();
  ctx.restore();
}

function renderBoard() {
  const width = boardCanvas.width;
  const height = boardCanvas.height;
  const size = cellSize();
  const theme = currentTheme();

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);

  // U5: Level flash overlay
  if (levelFlash > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${levelFlash * 0.3})`;
    ctx.fillRect(0, 0, width, height);
  }

  // Grid with theme colors
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `rgba(${theme.grid},0.03)`);
  gradient.addColorStop(1, 'rgba(255,255,255,0.01)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * size + CELL_GAP;
      const y = row * size + CELL_GAP;
      const cell = size - CELL_GAP * 2;
      const alpha = 0.03 + ((row + col) % 2) * 0.012;
      roundedCell(x, y, cell, `rgba(${theme.grid},${alpha})`, 0);
    }
  }

  // Render obstacles
  obstacles.forEach(ob => {
    const p = boardPoint(ob);
    roundedCell(p.x + 3, p.y + 3, p.size - 6, 'rgba(80,80,100,0.7)', 6);
    // Hazard cross
    ctx.strokeStyle = 'rgba(255,60,60,0.5)';
    ctx.lineWidth = 2;
    const cx = p.x + p.size / 2;
    const cy = p.y + p.size / 2;
    const r = p.size * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
    ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
    ctx.stroke();
  });

  // Render power-up item
  if (powerupItem) {
    const pp = boardPoint(powerupItem);
    const pt = POWERUP_TYPES[powerupItem.typeIndex];
    const pulse = 0.7 + Math.sin(pulseTime * 0.012) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    drawDiamond(
      pp.x + pp.size / 2, pp.y + pp.size / 2,
      pp.size * 0.35, `rgba(${pt.color},1)`, 20
    );
    ctx.restore();
  }

  // Render bonus food
  if (bonusFood) {
    const bp = boardPoint(bonusFood);
    const bt = FOOD_TYPES[bonusFood.typeIndex];
    const pulse = 0.75 + Math.sin(pulseTime * 0.01) * 0.2;
    if (bt.shape === 'diamond') {
      drawDiamond(bp.x + bp.size / 2, bp.y + bp.size / 2, bp.size * 0.3, `rgba(${bt.color},${pulse})`, bt.glow);
    } else if (bt.shape === 'star') {
      drawStar(bp.x + bp.size / 2, bp.y + bp.size / 2, bp.size * 0.3, `rgba(${bt.color},${pulse})`, bt.glow);
    } else {
      roundedCell(bp.x + 6, bp.y + 6, bp.size - 12, `rgba(${bt.color},${pulse})`, bt.glow);
    }
  }

  // Render main food with type-based shape
  if (gameState.food) {
    const fp = boardPoint(gameState.food);
    const ft = FOOD_TYPES[currentFoodType];
    const pulse = 0.82 + Math.sin(pulseTime * 0.008) * 0.12;

    // V3: Spawn animation
    const spawnAnim = foodSpawnAnims.find(a => a.x === centerPoint(gameState.food).x && a.y === centerPoint(gameState.food).y);
    let scale = 1;
    if (spawnAnim) {
      const t = spawnAnim.frame / spawnAnim.totalFrames;
      scale = easeOutElastic(t);
    }

    ctx.save();
    const fcx = fp.x + fp.size / 2;
    const fcy = fp.y + fp.size / 2;
    ctx.translate(fcx, fcy);
    ctx.scale(scale, scale);
    ctx.translate(-fcx, -fcy);

    if (ft.shape === 'diamond') {
      drawDiamond(fcx, fcy, (fp.size - 12) * 0.5, `rgba(${ft.color},${pulse})`, ft.glow);
    } else if (ft.shape === 'star') {
      drawStar(fcx, fcy, (fp.size - 12) * 0.5, `rgba(${ft.color},${pulse})`, ft.glow);
    } else {
      roundedCell(fp.x + 6, fp.y + 6, fp.size - 12, `rgba(${ft.color},${pulse})`, ft.glow);
    }
    ctx.restore();
  }

  // V2: Motion trail (ghost afterimages)
  if (gameState.status === 'running') {
    trailBuffer.forEach((seg, i) => {
      const tp = boardPoint(seg);
      const alpha = Math.max(0.05, 0.25 - i * 0.04);
      roundedCell(tp.x + 7, tp.y + 7, tp.size - 14, `rgba(${theme.head},${alpha})`, 4);
    });
  }

  // V1: Snake with dynamic neon glow
  const snakeReversed = gameState.snake.slice().reverse();
  snakeReversed.forEach((segment, reverseIndex) => {
    const index = gameState.snake.length - 1 - reverseIndex;
    const point = boardPoint(segment);
    const inset = index === 0 ? 4 : 6;
    const alpha = Math.max(0.25, 0.95 - index * 0.04);
    const isHead = index === 0;
    const fill = isHead ? `rgba(${theme.head},${alpha})` : `rgba(${theme.body},${alpha})`;
    const glowIntensity = isHead ? 22 + Math.sin(pulseTime * 0.006) * 8 : 10 + Math.sin(pulseTime * 0.004 + index * 0.5) * 4;

    // Shield visual — wrap head in cyan aura
    if (isHead && hasPowerup('shield')) {
      roundedCell(point.x + 2, point.y + 2, point.size - 4, 'rgba(61,226,255,0.15)', 28);
    }

    roundedCell(point.x + inset, point.y + inset, point.size - inset * 2, fill, glowIntensity);

    // Segment inner highlight
    if (isHead) {
      const ir = point.size * 0.12;
      ctx.fillStyle = `rgba(255,255,255,0.25)`;
      ctx.beginPath();
      ctx.arc(point.x + point.size * 0.4, point.y + point.size * 0.4, ir, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // V4: Death particles
  if (deathParticles.length > 0) {
    updateDeathParticles();
    deathParticles.forEach(p => {
      if (p.delay > 0) return;
      ctx.fillStyle = `rgba(${p.color},${p.life})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `rgba(${p.color},0.5)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // Regular particles
  updateBursts();
  bursts.forEach(p => {
    ctx.fillStyle = `rgba(${p.color},${p.life})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // V3: Food spawn animations
  for (let i = foodSpawnAnims.length - 1; i >= 0; i--) {
    foodSpawnAnims[i].frame++;
    if (foodSpawnAnims[i].frame >= foodSpawnAnims[i].totalFrames) {
      foodSpawnAnims.splice(i, 1);
    }
  }

  // V5: CRT scanlines + vignette
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let scan = 0; scan < height; scan += 4) {
    ctx.fillRect(0, scan, width, 1);
  }
  // Vignette
  const vignette = ctx.createRadialGradient(width / 2, height / 2, width * 0.3, width / 2, height / 2, width * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // U1: Combo counter on canvas
  if (comboDisplayTimer > 0 && comboCount > 0) {
    const head = gameState.snake[0];
    const hp = centerPoint(head);
    const comboAlpha = Math.min(1, comboDisplayTimer / 500);
    const comboScale = 1 + comboCount * 0.15;
    ctx.save();
    ctx.font = `bold ${Math.floor(14 * comboScale)}px Inter`;
    ctx.fillStyle = `rgba(${theme.head},${comboAlpha})`;
    ctx.shadowBlur = 12;
    ctx.shadowColor = `rgba(${theme.head},0.6)`;
    ctx.textAlign = 'center';
    ctx.fillText(`x${comboMultiplier}`, hp.x, hp.y - size * 0.6);
    ctx.restore();
  }

  // U2: Active power-up indicators (top-right of canvas)
  cleanExpiredPowerups();
  activePowerups.forEach((pu, i) => {
    const def = POWERUP_TYPES.find(t => t.id === pu.type);
    if (!def) return;
    const remaining = (pu.expiresAt - Date.now()) / POWERUP_DURATION_MS;
    const px = width - 50 - i * 55;
    const py = 12;
    // Background
    ctx.fillStyle = `rgba(${def.color},0.15)`;
    ctx.beginPath();
    ctx.arc(px, py + 16, 18, 0, Math.PI * 2);
    ctx.fill();
    // Icon
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.icon, px, py + 21);
    // Timer bar
    ctx.fillStyle = `rgba(${def.color},0.6)`;
    ctx.fillRect(px - 16, py + 36, 32 * remaining, 3);
  });

  // U3: Achievement toast
  if (activeToast) {
    const toastAlpha = Math.min(1, activeToast.timer / 500);
    ctx.save();
    ctx.font = 'bold 13px Inter';
    ctx.fillStyle = `rgba(255,215,0,${toastAlpha})`;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255,215,0,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(activeToast.text, width / 2, 30);
    ctx.restore();
  }

  ctx.restore();
}

function renderBackground(delta) {
  bg.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
  const theme = currentTheme();
  const glow = bg.createRadialGradient(
    bgCanvas.width * 0.7, bgCanvas.height * 0.12, 20,
    bgCanvas.width * 0.7, bgCanvas.height * 0.12, bgCanvas.width * 0.5
  );
  glow.addColorStop(0, `rgba(${theme.grid},0.14)`);
  glow.addColorStop(1, `rgba(${theme.grid},0)`);
  bg.fillStyle = glow;
  bg.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
  stars.forEach(star => {
    star.y += star.speed * delta * 0.06;
    if (star.y > 1.05) { star.y = -0.05; star.x = Math.random(); }
    bg.fillStyle = `rgba(255,255,255,${star.alpha})`;
    bg.beginPath();
    bg.arc(star.x * bgCanvas.width, star.y * bgCanvas.height, star.size, 0, Math.PI * 2);
    bg.fill();
  });
}

/* ── Main Loop ─────────────────────────────────────────────── */
function loop(timestamp) {
  if (!previousFrame) previousFrame = timestamp;
  const delta = timestamp - previousFrame;
  previousFrame = timestamp;
  pulseTime += delta;
  tickAccumulator += delta;
  screenShake *= 0.88;
  if (levelFlash > 0) levelFlash *= 0.92;
  comboDisplayTimer = Math.max(0, comboDisplayTimer - delta);

  processAchievementToasts(delta);

  if (gameState.status === 'running') {
    const speedMult = hasPowerup('slow') ? 1.6 : 1.0;
    const interval = getTickInterval(gameState.score) * speedMult;
    while (tickAccumulator >= interval) {
      processTick();
      tickAccumulator -= interval;
    }
  } else {
    tickAccumulator = 0;
  }

  renderBackground(delta);
  renderBoard();
  frameId = requestAnimationFrame(loop);
}

/* ── Input Handlers ────────────────────────────────────────── */
function handleKeydown(event) {
  const key = event.key.toLowerCase();
  const map = {
    arrowup: 'up', w: 'up',
    arrowright: 'right', d: 'right',
    arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left',
  };
  if (map[key]) { event.preventDefault(); handleDirection(map[key]); return; }
  if (key === ' ' || key === 'p') {
    event.preventDefault();
    if (gameState.status === 'running' || gameState.status === 'paused') pauseOrResume();
    else startRun();
    return;
  }
  if (key === 'r') { event.preventDefault(); resetGame(false); startRun(); }
}

function primaryAction() {
  if (gameState.status === 'running' || gameState.status === 'paused') { pauseOrResume(); return; }
  startRun();
}

function restart() { resetGame(false); startRun(); }

function beginSwipe(event) {
  const touch = event.touches ? event.touches[0] : event;
  swipeStart = { x: touch.clientX, y: touch.clientY };
}

function moveSwipe(event) {
  if (!swipeStart) return;
  const touch = event.changedTouches ? event.changedTouches[0] : event;
  const dx = touch.clientX - swipeStart.x;
  const dy = touch.clientY - swipeStart.y;
  const threshold = 18;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
  if (Math.abs(dx) > Math.abs(dy)) handleDirection(dx > 0 ? 'right' : 'left');
  else handleDirection(dy > 0 ? 'down' : 'up');
  swipeStart = null;
}

function endSwipe() { swipeStart = null; }

/* ── Init ──────────────────────────────────────────────────── */
initializeBackground();
resizeCanvases();
resetGame(true);
pushEvent('Consume fruit to build score and raise level.');
pushEvent('Swipe or use directional keys to steer the chain.');
frameId = requestAnimationFrame(loop);

window.addEventListener('resize', resizeCanvases);
window.addEventListener('keydown', handleKeydown);
window.addEventListener('beforeunload', () => cancelAnimationFrame(frameId));
primaryButton.addEventListener('click', primaryAction);
restartButton.addEventListener('click', restart);
overlayButton.addEventListener('click', () => {
  if (gameState.status === 'gameover') { restart(); return; }
  primaryAction();
});
controls.forEach(button => button.addEventListener('click', () => handleDirection(button.dataset.direction)));
boardCanvas.addEventListener('touchstart', beginSwipe, { passive: true });
boardCanvas.addEventListener('touchmove', moveSwipe, { passive: true });
boardCanvas.addEventListener('touchend', endSwipe, { passive: true });
boardCanvas.addEventListener('mousedown', beginSwipe);
boardCanvas.addEventListener('mouseup', moveSwipe);
boardCanvas.addEventListener('mouseleave', endSwipe);
