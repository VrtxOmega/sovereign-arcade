// Matter.js setup
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Composite = Matter.Composite,
      Composites = Matter.Composites,
      Constraint = Matter.Constraint,
      MouseConstraint = Matter.MouseConstraint,
      Mouse = Matter.Mouse,
      Events = Matter.Events,
      Body = Matter.Body,
      Bodies = Matter.Bodies;

let engine;
let render;
let runner;
let world;

let score = 0;
let ballsRemaining = 3;
let multiplier = 1;
let isPlaying = false;

// UI Elements
const uiScore = document.getElementById('uiScore');
const uiBalls = document.getElementById('uiBalls');
const uiMulti = document.getElementById('uiMulti');
const overlayStart = document.getElementById('startOverlay');
const overlayOver = document.getElementById('gameOverOverlay');
const finalScore = document.getElementById('finalScore');

// Globals for controls
let keys = {};
let leftFlipper, rightFlipper;
let plunger, plungerConstraint;

function init() {
  engine = Engine.create();
  world = engine.world;
  
  // High gravity for pinball feel
  engine.gravity.y = 1.6;

  render = Render.create({
    canvas: document.getElementById('gameCanvas'),
    engine: engine,
    options: {
      width: 500,
      height: 800,
      background: 'transparent',
      wireframes: false,
      hasBounds: false
    }
  });

  Render.run(render);
  runner = Runner.create();
  
  buildTable();
  setupControls();

  // Run the physics engine (but ball won't spawn until play)
  Runner.run(runner, engine);
}

function buildTable() {
  const tableElements = [];

  // ── EXTERNAL BOUNDS ──────
  const boundOpt = { isStatic: true, render: { fillStyle: 'transparent', strokeStyle: '#FFD700', lineWidth: 1 } };
  
  tableElements.push(
    // Bottom drain detector
    Bodies.rectangle(225, 820, 500, 20, { isStatic: true, label: 'drain', render: { visible: false } }),
    // Left bound
    Bodies.rectangle(0, 400, 10, 800, boundOpt),
    // Right bound
    Bodies.rectangle(500, 400, 10, 800, boundOpt),
    // Plunger divider
    Bodies.rectangle(450, 450, 10, 700, boundOpt),
    // Top arch
    Bodies.rectangle(250, 0, 500, 10, boundOpt)
  );

  // ── CORNER ARCHES (approximated with angled blocks) ──────
  tableElements.push(
    Bodies.rectangle(40, 40, 150, 10, { isStatic: true, angle: Math.PI/4, render: { fillStyle: '#0A0A0C', strokeStyle: '#FFD700', lineWidth: 1 } }),
    Bodies.rectangle(80, 20, 120, 10, { isStatic: true, angle: Math.PI/8, render: { visible: false } }),
    Bodies.rectangle(460, 40, 150, 10, { isStatic: true, angle: -Math.PI/4, render: { fillStyle: '#0A0A0C', strokeStyle: '#FFD700', lineWidth: 1 } })
  );

  // ── FUNNEL WALLS (Guide to flippers) ──────
  tableElements.push(
    Bodies.rectangle(70, 640, 160, 10, { isStatic: true, angle: Math.PI/5, render: { fillStyle: '#050300', strokeStyle: '#8C7400', lineWidth: 2 } }),
    Bodies.rectangle(380, 640, 160, 10, { isStatic: true, angle: -Math.PI/5, render: { fillStyle: '#050300', strokeStyle: '#8C7400', lineWidth: 2 } })
  );

  // ── SLINGSHOTS ──────
  tableElements.push(
    Bodies.circle(120, 595, 12, { isStatic: true, restitution: 2.2, label: 'slingshot', render: { fillStyle: '#00D4FF', strokeStyle: '#FFF', lineWidth: 1 } }),
    Bodies.circle(330, 595, 12, { isStatic: true, restitution: 2.2, label: 'slingshot', render: { fillStyle: '#00D4FF', strokeStyle: '#FFF', lineWidth: 1 } })
  );

  // ── BUMPERS (DATA CORES) ──────
  const bumperOpt = { isStatic: true, restitution: 1.8, label: 'bumper', render: { fillStyle: '#FFD700', strokeStyle: '#FFFFFF', lineWidth: 3 } };
  tableElements.push(
    Bodies.circle(225, 220, 28, bumperOpt),
    Bodies.circle(160, 310, 28, bumperOpt),
    Bodies.circle(290, 310, 28, bumperOpt)
  );

  // ── OMEGA TARGET (MIDDLE) ──────
  tableElements.push(
    Bodies.polygon(225, 450, 6, 20, { isStatic: true, restitution: 1.2, label: 'omega', render: { fillStyle: '#FF2D45', strokeStyle: '#FFD700', lineWidth: 2 }})
  );

  // ── PLUNGER ──────
  plunger = Bodies.rectangle(475, 750, 25, 60, {
    label: 'plunger',
    isStatic: false,
    density: 100, // Immovable by ball
    friction: 0,
    render: { fillStyle: '#FF9500', strokeStyle: '#FFF', lineWidth: 1 }
  });
  
  // Plunger track constraints (keep it X-locked safely)
  let plungerGuide1 = Bodies.rectangle(460, 750, 5, 200, { isStatic:true, render:{visible:false} });
  let plungerGuide2 = Bodies.rectangle(490, 750, 5, 200, { isStatic:true, render:{visible:false} });

  plungerConstraint = Constraint.create({
    pointA: { x: 475, y: 800 }, // Anchor at bottom
    bodyB: plunger,
    pointB: { x: 0, y: 0 },
    stiffness: 0.15,
    length: 50,
    render: { strokeStyle: '#FFD700', lineWidth: 2 }
  });

  tableElements.push(plunger, plungerGuide1, plungerGuide2, plungerConstraint);

  // ── FLIPPERS ──────
  const flipperDensity = 50;

  // Left Flipper
  leftFlipper = Bodies.rectangle(175, 725, 95, 18, {
    label: 'flipper_left', density: flipperDensity, friction: 0.1, restitution: 0.3,
    chamfer: { radius: 8 },
    render: { fillStyle: '#FFD700', strokeStyle: '#050300', lineWidth: 2 }
  });
  let leftHinge = Constraint.create({
    pointA: { x: 145, y: 720 }, bodyB: leftFlipper, pointB: { x: -35, y: 0 },
    stiffness: 1, length: 0, render: { visible: false }
  });
  let leftUpStopper = Bodies.circle(170, 680, 10, { isStatic: true, render: { visible: false } });
  let leftDownStopper = Bodies.circle(170, 765, 10, { isStatic: true, render: { visible: false } });

  // Right Flipper
  rightFlipper = Bodies.rectangle(275, 725, 95, 18, {
    label: 'flipper_right', density: flipperDensity, friction: 0.1, restitution: 0.3,
    chamfer: { radius: 8 },
    render: { fillStyle: '#FFD700', strokeStyle: '#050300', lineWidth: 2 }
  });
  let rightHinge = Constraint.create({
    pointA: { x: 305, y: 720 }, bodyB: rightFlipper, pointB: { x: 35, y: 0 },
    stiffness: 1, length: 0, render: { visible: false }
  });
  let rightUpStopper = Bodies.circle(280, 680, 10, { isStatic: true, render: { visible: false } });
  let rightDownStopper = Bodies.circle(280, 765, 10, { isStatic: true, render: { visible: false } });

  tableElements.push(leftFlipper, leftHinge, leftUpStopper, leftDownStopper);
  tableElements.push(rightFlipper, rightHinge, rightUpStopper, rightDownStopper);

  Composite.add(world, tableElements);
}

function spawnBall() {
  if (ballsRemaining <= 0) return;
  // Spawn in plunger lane
  let ball = Bodies.circle(475, 600, 11, {
    label: 'ball',
    restitution: 0.5,
    density: 5,
    friction: 0.001,
    render: { fillStyle: '#FFFFFF', strokeStyle: '#FFD700', lineWidth: 2 }
  });
  Composite.add(world, ball);
}

// ── INPUTS & UPDATES ──────
function setupControls() {
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  Events.on(engine, 'beforeUpdate', () => {
    // 1. Plunger Logic
    if (keys['ArrowDown']) {
      // Pull back
      if (plungerConstraint.length < 120) plungerConstraint.length += 3;
    } else {
      // Snap forward
      if (plungerConstraint.length > 50) plungerConstraint.length = 50;
    }

    // 2. Flipper Logic (Actuating as motors)
    if (keys['ArrowLeft']) {
      Body.setAngularVelocity(leftFlipper, -0.45);
    } else {
      Body.setAngularVelocity(leftFlipper, 0.15); // gravity fallback
    }

    if (keys['ArrowRight']) {
      Body.setAngularVelocity(rightFlipper, 0.45);
    } else {
      Body.setAngularVelocity(rightFlipper, -0.15);
    }
  });

  // ── COLLISION EVENTS (Scoring) ──────
  Events.on(engine, 'collisionStart', (e) => {
    e.pairs.forEach(pair => {
      let a = pair.bodyA;
      let b = pair.bodyB;
      
      // Determine if one is drain
      if (a.label === 'drain' || b.label === 'drain') {
        let ball = a.label === 'ball' ? a : (b.label === 'ball' ? b : null);
        if (ball) handleDrain(ball);
      }

      // Bumpers
      let isBumper = a.label === 'bumper' || b.label === 'bumper';
      if (isBumper) {
        addScore(100);
        let bumper = a.label === 'bumper' ? a : b;
        flashBody(bumper, '#FFFFFF');
      }

      // Slingshots
      let isSlingshot = a.label === 'slingshot' || b.label === 'slingshot';
      if (isSlingshot) {
        addScore(25);
      }

      // Omega Target
      let isOmega = a.label === 'omega' || b.label === 'omega';
      if (isOmega) {
        addScore(500);
        multiplier += 1;
        uiMulti.textContent = multiplier + 'x';
        let omg = a.label === 'omega' ? a : b;
        flashBody(omg, '#FF9500');
      }
    });
  });
}

function flashBody(body, color) {
  let oldFill = body.render.fillStyle;
  body.render.fillStyle = color;
  setTimeout(() => { body.render.fillStyle = oldFill; }, 100);
}

function addScore(pts) {
  score += pts * multiplier;
  uiScore.textContent = score;
}

function handleDrain(ball) {
  Composite.remove(world, ball);
  ballsRemaining--;
  uiBalls.textContent = ballsRemaining;
  multiplier = 1;
  uiMulti.textContent = '1x';
  
  if (ballsRemaining > 0) {
    setTimeout(spawnBall, 1000);
  } else {
    isPlaying = false;
    overlayOver.classList.remove('hidden');
    finalScore.textContent = score;
  }
}

// ── OVERLAY CONTROLS ──────
document.getElementById('btnStart').onclick = () => {
  overlayStart.classList.add('hidden');
  score = 0;
  ballsRemaining = 3;
  multiplier = 1;
  uiScore.textContent = score;
  uiBalls.textContent = ballsRemaining;
  uiMulti.textContent = '1x';
  isPlaying = true;
  spawnBall();
};

document.getElementById('btnRestart').onclick = () => {
  overlayOver.classList.add('hidden');
  score = 0;
  ballsRemaining = 3;
  multiplier = 1;
  uiScore.textContent = score;
  uiBalls.textContent = ballsRemaining;
  uiMulti.textContent = '1x';
  isPlaying = true;
  spawnBall();
};

window.onload = init;
