const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const CELL_SIZE = 22;
const MAP_COLS = 28;
const MAP_ROWS = 31;
canvas.width = MAP_COLS * CELL_SIZE;  // 616
canvas.height = MAP_ROWS * CELL_SIZE; // 682

// UI Elements
const uiScore = document.getElementById('ui-score');
const uiHiScore = document.getElementById('ui-hiscore');
const uiLevel = document.getElementById('ui-level');
const uiLives = document.getElementById('ui-lives');
const menuScreen = document.getElementById('screen-menu');
const gameWrap = document.getElementById('game-container-wrap');
const gameOverOverlay = document.getElementById('overlay-gameover');
const pauseOverlay = document.getElementById('overlay-pause');
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext('2d');

let hiscore = localStorage.getItem('VERITAS_VECTOR_HISCORE') || 0;
uiHiScore.textContent = hiscore;

// 0: Pellet, 1: Wall, 2: Empty, 3: PowerPellet, 4: GhostDoor, 5: GhostHouse
const templateMap = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,3,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,3,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,0,1,1,1,1,1,2,1,1,2,1,1,1,1,1,0,1,1,1,1,1,1],
  [2,2,2,2,2,1,0,1,1,1,1,1,2,1,1,2,1,1,1,1,1,0,1,2,2,2,2,2],
  [2,2,2,2,2,1,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,1,2,2,2,2,2],
  [2,2,2,2,2,1,0,1,1,2,1,1,1,4,4,1,1,1,2,1,1,0,1,2,2,2,2,2],
  [1,1,1,1,1,1,0,1,1,2,1,5,5,5,5,5,5,1,2,1,1,0,1,1,1,1,1,1],
  [2,2,2,2,2,2,0,2,2,2,1,5,5,5,5,5,5,1,2,2,2,0,2,2,2,2,2,2], // row 14 (wrap)
  [1,1,1,1,1,1,0,1,1,2,1,5,5,5,5,5,5,1,2,1,1,0,1,1,1,1,1,1],
  [2,2,2,2,2,1,0,1,1,2,1,1,1,1,1,1,1,1,2,1,1,0,1,2,2,2,2,2],
  [2,2,2,2,2,1,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1,0,1,2,2,2,2,2],
  [2,2,2,2,2,1,0,1,1,2,1,1,1,1,1,1,1,1,2,1,1,0,1,2,2,2,2,2],
  [1,1,1,1,1,1,0,1,1,2,1,1,1,1,1,1,1,1,2,1,1,0,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
  [1,3,0,0,1,1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1,1,0,0,3,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

let gameState = 'MENU';
let gameMap = [];
let score = 0;
let level = 1;
let lives = 3;
let particles = [];
let animationID;
let lastTime = 0;

// Enums
const DIRS = { NONE: 0, UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4 };

// Background particles for 2026 aesthetics
class BgParticle {
  constructor() {
    this.reset();
    this.y = Math.random() * bgCanvas.height;
  }
  reset() {
    this.x = Math.random() * bgCanvas.width;
    this.y = bgCanvas.height + Math.random() * 100;
    this.sz = Math.random() * 2 + 1;
    this.v = Math.random() * 0.5 + 0.2;
    this.a = Math.random() * 0.5 + 0.1;
  }
  update() {
    this.y -= this.v;
    if (this.y < -10) this.reset();
  }
  draw(c) {
    c.fillStyle = `rgba(255,215,0,${this.a})`;
    c.beginPath(); c.arc(this.x, this.y, this.sz, 0, Math.PI*2); c.fill();
  }
}
let bgParticles = [];

// Game Particles
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 8;
    this.vy = (Math.random() - 0.5) * 8;
    this.life = 1.0;
    this.decay = Math.random() * 0.05 + 0.02;
    this.color = color;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.life -= this.decay;
  }
  draw(c) {
    c.globalAlpha = Math.max(0, this.life);
    c.fillStyle = this.color;
    c.beginPath(); c.arc(this.x, this.y, 2, 0, Math.PI*2); c.fill();
    c.globalAlpha = 1.0;
  }
}

function spawnParticles(x, y, color, count=5) {
  for(let i=0; i<count; i++) particles.push(new Particle(x, y, color));
}

// Entities
class Character {
  constructor() {
    this.x = 0; this.y = 0;
    this.gridX = 0; this.gridY = 0;
    this.dir = DIRS.NONE;
    this.nextDir = DIRS.NONE;
    this.speed = 100; // pixels per second
  }

  isWall(x, y) {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return false;
    return gameMap[y][x] === 1 || gameMap[y][x] === 4;
  }

  getCenter() {
    return { x: this.gridX * CELL_SIZE + CELL_SIZE/2, y: this.gridY * CELL_SIZE + CELL_SIZE/2 };
  }

  updateMovement(dt) {
    const cx = this.gridX * CELL_SIZE + CELL_SIZE/2;
    const cy = this.gridY * CELL_SIZE + CELL_SIZE/2;

    // Check queued input at intersection
    if (this.nextDir !== DIRS.NONE && this.nextDir !== this.dir) {
      if (Math.abs(this.x - cx) < 2 && Math.abs(this.y - cy) < 2) {
        let canTurn = false;
        if (this.nextDir === DIRS.UP && !this.isWall(this.gridX, this.gridY-1)) canTurn = true;
        if (this.nextDir === DIRS.DOWN && !this.isWall(this.gridX, this.gridY+1)) canTurn = true;
        if (this.nextDir === DIRS.LEFT && !this.isWall(this.gridX-1, this.gridY)) canTurn = true;
        if (this.nextDir === DIRS.RIGHT && !this.isWall(this.gridX+1, this.gridY)) canTurn = true;

        if (canTurn || (this.dir === DIRS.UP && this.nextDir === DIRS.DOWN) || (this.dir === DIRS.DOWN && this.nextDir === DIRS.UP) || (this.dir === DIRS.LEFT && this.nextDir === DIRS.RIGHT) || (this.dir === DIRS.RIGHT && this.nextDir === DIRS.LEFT)) {
          this.x = cx; this.y = cy;
          this.dir = this.nextDir;
          this.nextDir = DIRS.NONE;
        }
      }
    }

    let moveAmount = this.speed * dt;
    let newX = this.x; let newY = this.y;

    if (this.dir === DIRS.UP) newY -= moveAmount;
    else if (this.dir === DIRS.DOWN) newY += moveAmount;
    else if (this.dir === DIRS.LEFT) newX -= moveAmount;
    else if (this.dir === DIRS.RIGHT) newX += moveAmount;

    // Wall collision
    this.gridX = Math.floor(newX / CELL_SIZE);
    this.gridY = Math.floor(newY / CELL_SIZE);

    if (this.dir === DIRS.UP && this.isWall(this.gridX, this.gridY)) {
      this.y = this.gridY * CELL_SIZE + CELL_SIZE + CELL_SIZE/2;
    } else if (this.dir === DIRS.DOWN && this.isWall(this.gridX, Math.floor((newY + CELL_SIZE/2)/CELL_SIZE))) {
      this.y = this.gridY * CELL_SIZE + CELL_SIZE/2;
    } else if (this.dir === DIRS.LEFT && this.isWall(this.gridX, this.gridY)) {
      this.x = this.gridX * CELL_SIZE + CELL_SIZE + CELL_SIZE/2;
    } else if (this.dir === DIRS.RIGHT && this.isWall(Math.floor((newX + CELL_SIZE/2)/CELL_SIZE), this.gridY)) {
      this.x = this.gridX * CELL_SIZE + CELL_SIZE/2;
    } else {
      this.x = newX; this.y = newY;
    }

    // Wrap around for row 14
    if (this.x < -CELL_SIZE/2) this.x = canvas.width + CELL_SIZE/2;
    if (this.x > canvas.width + CELL_SIZE/2) this.x = -CELL_SIZE/2;
    this.gridX = Math.floor(Math.max(0, Math.min(MAP_COLS-1, this.x / CELL_SIZE)));
  }
}

class Player extends Character {
  constructor() {
    super();
    this.reset();
  }
  reset() {
    this.gridX = 13; this.gridY = 23;
    this.x = 13.5 * CELL_SIZE; this.y = 23.5 * CELL_SIZE;
    this.dir = DIRS.LEFT;
    this.nextDir = DIRS.NONE;
    this.pulse = 0;
  }
  update(dt) {
    if (gameState !== 'PLAYING') return;
    this.updateMovement(dt);
    
    // Eat pellets
    if (this.gridX >= 0 && this.gridX < MAP_COLS && this.gridY >= 0 && this.gridY < MAP_ROWS) {
      if (gameMap[this.gridY][this.gridX] === 0) {
        gameMap[this.gridY][this.gridX] = 2;
        score += 10;
        uiScore.textContent = score;
        spawnParticles(this.x, this.y, '#FFD700', 3);
        checkLevelCleared();
      } else if (gameMap[this.gridY][this.gridX] === 3) {
        gameMap[this.gridY][this.gridX] = 2;
        score += 50;
        uiScore.textContent = score;
        activatePowerMode();
        spawnParticles(this.x, this.y, '#FFFFFF', 10);
        checkLevelCleared();
      }
    }
    
    this.pulse += dt * 10;
  }
  draw(c) {
    c.save();
    c.translate(this.x, this.y);
    let angle = 0;
    if (this.dir === DIRS.RIGHT) angle = 0;
    if (this.dir === DIRS.DOWN) angle = Math.PI/2;
    if (this.dir === DIRS.LEFT) angle = Math.PI;
    if (this.dir === DIRS.UP) angle = -Math.PI/2;
    c.rotate(angle);

    // Veritas Interceptor Wedge shape
    c.fillStyle = '#FFD700';
    c.shadowBlur = 15; c.shadowColor = '#FFD700';

    let chomp = Math.abs(Math.sin(this.pulse)) * 0.4;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, CELL_SIZE/1.5, chomp, Math.PI*2 - chomp);
    c.fill();
    c.restore();
  }
}

class Ghost extends Character {
  constructor(type, startX, startY, color) {
    super();
    this.type = type;
    this.startX = startX; this.startY = startY;
    this.color = color;
    this.reset();
  }
  reset() {
    this.gridX = this.startX; this.gridY = this.startY;
    this.x = (this.startX + 0.5) * CELL_SIZE; this.y = (this.startY + 0.5) * CELL_SIZE;
    this.dir = DIRS.UP;
    this.lastNode = null;
    this.mode = 'SCATTER'; // SCATTER, CHASE, FRIGHTENED, EATEN
    this.speed = 90;
  }
  update(dt) {
    if (gameState !== 'PLAYING') return;

    const cx = this.gridX * CELL_SIZE + CELL_SIZE/2;
    const cy = this.gridY * CELL_SIZE + CELL_SIZE/2;
    
    // Determine target based on mode and personality
    let targetX = 0, targetY = 0;
    if (this.mode === 'EATEN') {
      targetX = 13; targetY = 11; // Ghost house
      this.speed = 250;
      if (this.gridX === 13 && this.gridY === 11) { this.mode = 'CHASE'; this.speed = 90 + (level*5); }
    } else if (this.mode === 'FRIGHTENED') {
      targetX = Math.floor(Math.random()*MAP_COLS); targetY = Math.floor(Math.random()*MAP_ROWS);
      this.speed = 50;
    } else if (this.mode === 'SCATTER') {
      this.speed = 90 + (level*5);
      if (this.type === 'SHADOW') { targetX = 25; targetY = 0; }
      else if (this.type === 'SPEEDY') { targetX = 2; targetY = 0; }
      else if (this.type === 'BASHFUL') { targetX = 27; targetY = 30; }
      else { targetX = 0; targetY = 30; }
    } else { // CHASE
      this.speed = 95 + (level*5);
      if (this.type === 'SHADOW') { targetX = player.gridX; targetY = player.gridY; }
      else if (this.type === 'SPEEDY') { 
        targetX = player.gridX; targetY = player.gridY;
        if(player.dir===DIRS.UP) targetY-=4; else if(player.dir===DIRS.DOWN) targetY+=4;
        else if(player.dir===DIRS.LEFT) targetX-=4; else if(player.dir===DIRS.RIGHT) targetX+=4;
      }
      else if (this.type === 'BASHFUL') { targetX = player.gridX; targetY = player.gridY; } // Simplified
      else {
        let dist = Math.hypot(player.gridX - this.gridX, player.gridY - this.gridY);
        if (dist > 8) { targetX = player.gridX; targetY = player.gridY; }
        else { targetX = 0; targetY = 30; }
      }
    }

    let moveAmount = this.speed * dt;
    let dx = cx - this.x;
    let dy = cy - this.y;
    let distToCenter = Math.hypot(dx, dy);

    // At intersection, decide next turn
    if (distToCenter <= moveAmount && (!this.lastNode || this.lastNode.x !== this.gridX || this.lastNode.y !== this.gridY)) {
      this.lastNode = {x: this.gridX, y: this.gridY};
      let validDirs = [];
      let ops = { [DIRS.UP]: DIRS.DOWN, [DIRS.DOWN]: DIRS.UP, [DIRS.LEFT]: DIRS.RIGHT, [DIRS.RIGHT]: DIRS.LEFT };
      let back = ops[this.dir];
      
      const checkValid = (d, gx, gy) => {
        if (d === back && this.mode !== 'FRIGHTENED') return; // Can't reverse
        if (gx<0 || gx>=MAP_COLS || gy<0 || gy>=MAP_ROWS) return;
        if (gameMap[gy][gx] !== 1 && (gameMap[gy][gx] !== 4 || this.mode === 'EATEN' || this.mode === 'SCATTER' || this.gridY===11)) {
           // distance to target
           let dist = Math.pow(gx - targetX, 2) + Math.pow(gy - targetY, 2);
           validDirs.push({d, dist});
        }
      };

      checkValid(DIRS.UP, this.gridX, this.gridY-1);
      checkValid(DIRS.LEFT, this.gridX-1, this.gridY);
      checkValid(DIRS.DOWN, this.gridX, this.gridY+1);
      checkValid(DIRS.RIGHT, this.gridX+1, this.gridY);

      if (validDirs.length > 0) {
        if (this.mode === 'FRIGHTENED') {
          this.dir = validDirs[Math.floor(Math.random() * validDirs.length)].d;
        } else {
          validDirs.sort((a,b) => a.dist - b.dist);
          this.dir = validDirs[0].d;
        }
      }
      this.x = cx; this.y = cy;
    }

    // Move
    if (this.dir === DIRS.UP) this.y -= moveAmount;
    else if (this.dir === DIRS.DOWN) this.y += moveAmount;
    else if (this.dir === DIRS.LEFT) this.x -= moveAmount;
    else if (this.dir === DIRS.RIGHT) this.x += moveAmount;
    
    // Wrap
    if (this.x < -CELL_SIZE/2) this.x = canvas.width + CELL_SIZE/2;
    if (this.x > canvas.width + CELL_SIZE/2) this.x = -CELL_SIZE/2;

    this.gridX = Math.floor(Math.max(0, Math.min(MAP_COLS-1, this.x / CELL_SIZE)));
    this.gridY = Math.floor(this.y / CELL_SIZE);
  }
  draw(c) {
    c.save();
    c.translate(this.x, this.y);
    
    let renderColor = this.mode === 'FRIGHTENED' ? '#00D4FF' : this.color;
    if (this.mode === 'EATEN') renderColor = 'rgba(255,255,255,0.2)';

    c.fillStyle = renderColor;
    c.shadowBlur = 15; c.shadowColor = renderColor;
    
    // Modern ghost shape
    c.beginPath();
    c.arc(0, -2, CELL_SIZE/2, Math.PI, 0);
    c.lineTo(CELL_SIZE/2, CELL_SIZE/2);
    c.lineTo(CELL_SIZE/6, CELL_SIZE/3);
    c.lineTo(-CELL_SIZE/6, CELL_SIZE/3);
    c.lineTo(-CELL_SIZE/2, CELL_SIZE/2);
    c.closePath();
    c.fill();
    c.restore();
  }
}

// Global Variables
let player = new Player();
let ghosts = [];

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
  if(bgParticles.length === 0) {
    for(let i=0; i<50; i++) bgParticles.push(new BgParticle());
  }
}
window.addEventListener('resize', resizeBg);
resizeBg();

// Controls
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'w', 'W'].includes(e.key)) player.nextDir = DIRS.UP;
  else if (['ArrowDown', 's', 'S'].includes(e.key)) player.nextDir = DIRS.DOWN;
  else if (['ArrowLeft', 'a', 'A'].includes(e.key)) player.nextDir = DIRS.LEFT;
  else if (['ArrowRight', 'd', 'D'].includes(e.key)) player.nextDir = DIRS.RIGHT;
  else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') togglePause();
});

let modeTimer = 0;
let globalMode = 'SCATTER'; // Alternates between SCATTER and CHASE

function initLevel() {
  gameMap = templateMap.map(row => [...row]); // Deep copy
  player.reset();
  ghosts = [
    new Ghost('SHADOW', 13, 11, '#FFD700'),  // Gold
    new Ghost('SPEEDY', 14, 11, '#FFB000'),  // Dark Gold
    new Ghost('BASHFUL', 13, 13, '#FFF8E7'), // White Gold
    new Ghost('POKEY', 14, 13, '#B8860B')    // Dark Goldenrod
  ];
  player.speed = 100 + (level * 5);
  globalMode = 'SCATTER';
  modeTimer = 0;
}

function startGame() {
  score = 0; level = 1; lives = 3;
  uiScore.textContent = score; uiLevel.textContent = level; uiLives.textContent = lives;
  menuScreen.classList.add('hidden');
  gameWrap.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  initLevel();
  gameState = 'PLAYING';
  lastTime = performance.now();
  if(!animationID) requestAnimationFrame(loop);
}

function resetToMenu() {
  if (score > hiscore) { hiscore = score; localStorage.setItem('VERITAS_VECTOR_HISCORE', hiscore); uiHiScore.textContent = hiscore; }
  gameState = 'MENU';
  gameWrap.classList.add('hidden');
  menuScreen.classList.remove('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
}

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseOverlay.classList.remove('hidden');
  } else if (gameState === 'PAUSED') {
    gameState = 'PLAYING';
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }
}

function activatePowerMode() {
  ghosts.forEach(g => { if(g.mode !== 'EATEN') g.mode = 'FRIGHTENED'; });
  setTimeout(() => {
    ghosts.forEach(g => { if(g.mode === 'FRIGHTENED') g.mode = 'CHASE'; });
  }, 8000 - (level * 500));
}

function checkLevelCleared() {
  let left = 0;
  for(let y=0; y<MAP_ROWS; y++) {
    for(let x=0; x<MAP_COLS; x++) {
      if(gameMap[y][x] === 0 || gameMap[y][x] === 3) left++;
    }
  }
  if(left === 0) {
    level++; uiLevel.textContent = level;
    initLevel();
  }
}

function drawMap() {
  ctx.clearRect(0,0, canvas.width, canvas.height);

  // Draw 2026 aesthetics walls
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.35)'; // Premium Gold
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';

  for (let r=0; r<MAP_ROWS; r++) {
    for (let c=0; c<MAP_COLS; c++) {
      if (gameMap[r][c] === 1) {
        ctx.fillStyle = 'rgba(10, 8, 2, 0.8)'; // Obsidian
        ctx.strokeRect(c*CELL_SIZE + 2, r*CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        ctx.fillRect(c*CELL_SIZE + 2, r*CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else if (gameMap[r][c] === 0) {
        // Pellet
        ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.shadowBlur = 5; ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.beginPath(); ctx.arc(c*CELL_SIZE + CELL_SIZE/2, r*CELL_SIZE + CELL_SIZE/2, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (gameMap[r][c] === 3) {
        // Power Pellet
        let pulseStr = Math.abs(Math.sin(performance.now() * 0.005)) * 2 + 5;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 15; ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath(); ctx.arc(c*CELL_SIZE + CELL_SIZE/2, r*CELL_SIZE + CELL_SIZE/2, pulseStr, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (gameMap[r][c] === 4) {
        // Ghost door
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.fillRect(c*CELL_SIZE, r*CELL_SIZE + CELL_SIZE/2.5, CELL_SIZE, CELL_SIZE/5);
      }
    }
  }
}

function update(dt) {
  if (dt > 0.1) dt = 0.1; // Cap delta
  player.update(dt);
  ghosts.forEach(g => g.update(dt));
  
  for(let i=particles.length-1; i>=0; i--) {
    particles[i].update();
    if(particles[i].life <= 0) particles.splice(i, 1);
  }

  // Very basic ghost collision
  let hitGhost = ghosts.find(g => Math.abs(g.x - player.x) < CELL_SIZE/1.5 && Math.abs(g.y - player.y) < CELL_SIZE/1.5);
  if (hitGhost) {
    if (hitGhost.mode === 'FRIGHTENED') {
      hitGhost.mode = 'EATEN';
      score += 200; uiScore.textContent = score;
      spawnParticles(hitGhost.x, hitGhost.y, '#00D4FF', 20);
    } else if (hitGhost.mode !== 'EATEN') {
      lives--; uiLives.textContent = lives;
      spawnParticles(player.x, player.y, '#FFD700', 30);
      if (lives <= 0) {
        gameState = 'GAMEOVER';
        gameOverOverlay.classList.remove('hidden');
      } else {
        player.reset(); ghosts.forEach(g => g.reset());
      }
    }
  }

  // Handle Mode Cycle
  let allNormal = ghosts.every(g => g.mode !== 'FRIGHTENED');
  if (allNormal) {
    modeTimer += dt;
    if (globalMode === 'SCATTER' && modeTimer > 7) {
      globalMode = 'CHASE'; modeTimer = 0;
      ghosts.forEach(g => { if(g.mode !== 'EATEN') { g.mode = 'CHASE'; g.dir = {1:3,3:1,2:4,4:2}[g.dir]; } });
    } else if (globalMode === 'CHASE' && modeTimer > 20) {
      globalMode = 'SCATTER'; modeTimer = 0;
      ghosts.forEach(g => { if(g.mode !== 'EATEN') { g.mode = 'SCATTER'; g.dir = {1:3,3:1,2:4,4:2}[g.dir]; } });
    }
  }
}

function draw() {
  drawMap();
  particles.forEach(p => p.draw(ctx));
  ghosts.forEach(g => g.draw(ctx));
  player.draw(ctx);
}

function loop(timestamp) {
  bgCtx.clearRect(0,0, bgCanvas.width, bgCanvas.height);
  bgParticles.forEach(p => { p.update(); p.draw(bgCtx); });

  if (gameState === 'PLAYING') {
    let dt = (timestamp - lastTime) / 1000.0;
    update(dt);
    draw();
  }
  
  lastTime = timestamp;
  if(gameState !== 'PAUSED') {
    animationID = requestAnimationFrame(loop);
  }
}

requestAnimationFrame(loop);
