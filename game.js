
// ============================================
// ASTEROIDS: GALACTIC WARFARE - ULTIMATE EDITION
// REBALANCED VERSION
// ============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const $ = id => document.getElementById(id);

let W = 900, H = 600;
let running = false, paused = false, gameOver = false;
let score = 0, gold = 500, round = 1, lives = 7;
let nextShopScore = 1000;
let lastTime = 0;
let keys = {};

let asteroids = [];
let bullets = [];
let enemies = [];
let enemyBullets = [];
let particles = [];
let drops = [];
let helpers = [];
let drones = [];
let boss = null;

let waveSpawned = false;
let waveTimer = 0;
let shootTimer = 0;
let enemyTimer = 0;
let eventTimer = 0;
let ultimateCharge = 0;
let ultimateReady = false;
let invincibleTimer = 0;

const saved = JSON.parse(localStorage.getItem("galacticWarfareSave") || "{}");

let highScore = saved.highScore || 0;
let highestRound = saved.highestRound || 1;
let achievements = saved.achievements || [];

const ship = {
  x: 450, y: 300,
  angle: -Math.PI / 2,
  vx: 0, vy: 0,
  radius: 15,
  thrust: 260,
  rotation: 4.2,
  health: 100,
  shield: 0,
  damage: 1,
  speed: 1,
  alive: true
};

const upgrades = [
  { id: "shield", name: "Regenerating Shield", description: "Protects your ship and regenerates.", cost: 250, level: 0 },
  { id: "laser", name: "Laser Cannon", description: "Adds extra powerful laser beams.", cost: 300, level: 0 },
  { id: "helpers", name: "Helper Squadron", description: "Companion ships automatically attack.", cost: 400, level: 0 },
  { id: "spread", name: "Plasma Spread", description: "Fires multiple plasma projectiles.", cost: 350, level: 0 },
  { id: "emp", name: "EMP Pulse", description: "Damages nearby enemies. Press Q.", cost: 450, level: 0 },
  { id: "missiles", name: "Homing Missiles", description: "Automatically fires tracking missiles.", cost: 500, level: 0 },
  { id: "overdrive", name: "Overdrive", description: "Improves ship speed.", cost: 300, level: 0 },
  { id: "drones", name: "Orbital Drones", description: "Drones orbit and damage asteroids.", cost: 450, level: 0 },
  { id: "nova", name: "Nova Explosion", description: "Powerful explosion. Press R.", cost: 600, level: 0 },
  { id: "magnet", name: "Gold Magnet", description: "Attracts gold from farther away.", cost: 300, level: 0 },
  { id: "heavy", name: "Heavy Cannon", description: "Fires stronger projectiles.", cost: 450, level: 0 },
  { id: "phase", name: "Phase Shift", description: "Chance to avoid incoming damage.", cost: 500, level: 0 },
  { id: "repair", name: "Nano Repair", description: "Repairs your ship and adds lives.", cost: 550, level: 0 },
  { id: "berserker", name: "Berserker Mode", description: "Increases weapon damage.", cost: 650, level: 0 }
];

const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  size: Math.random() * 1.8 + 0.3,
  brightness: Math.random()
}));

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = rect.width;
  H = rect.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!running) {
    ship.x = W / 2;
    ship.y = H / 2;
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function saveGame() {
  localStorage.setItem("galacticWarfareSave", JSON.stringify({
    highScore,
    highestRound,
    achievements
  }));
}

function updateHUD() {
  $("score").textContent = score.toLocaleString();
  $("gold").textContent = gold.toLocaleString();
  $("round").textContent = `${round} / 500`;
  $("lives").textContent = lives;
  $("highScore").textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function level(id) {
  return upgrades.find(u => u.id === id)?.level || 0;
}

function showMessage(message) {
  $("status").textContent = message;
}

function addScore(amount) {
  score += amount;

  if (score > highScore) highScore = score;

  if (score >= nextShopScore && running && !gameOver) {
    nextShopScore += 1000;
    openShop();
  }

  checkAchievements();
  updateHUD();
}

function checkAchievements() {
  const checks = [
    ["firstKill", score >= 100],
    ["score10000", score >= 10000],
    ["gold5000", gold >= 5000],
    ["round10", highestRound >= 10],
    ["round50", highestRound >= 50],
    ["round100", highestRound >= 100],
    ["round500", round >= 500]
  ];

  checks.forEach(([id, condition]) => {
    if (condition && !achievements.includes(id)) {
      achievements.push(id);
      saveGame();
      showMessage("NEW ACHIEVEMENT UNLOCKED!");
    }
  });
}

function randomEdgePosition() {
  const side = Math.floor(Math.random() * 4);
  if (side === 0) return { x: Math.random() * W, y: -30 };
  if (side === 1) return { x: W + 30, y: Math.random() * H };
  if (side === 2) return { x: Math.random() * W, y: H + 30 };
  return { x: -30, y: Math.random() * H };
}

function wrap(obj, margin = 30) {
  if (obj.x < -margin) obj.x = W + margin;
  if (obj.x > W + margin) obj.x = -margin;
  if (obj.y < -margin) obj.y = H + margin;
  if (obj.y > H + margin) obj.y = -margin;
}

function createParticles(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 180;

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.7,
      maxLife: 1.2,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

// Larger rocks have more health and split into two smaller rocks.
function createAsteroid(x, y, size, isGolden = false) {
  const settings = {
    3: { radius: 30, health: 5 },
    2: { radius: 20, health: 3 },
    1: { radius: 12, health: 2 }
  };

  const config = settings[size];
  const sides = 9 + Math.floor(Math.random() * 4);

  asteroids.push({
    x, y,
    size,
    radius: config.radius,
    health: config.health,
    maxHealth: config.health,
    vx: (Math.random() - 0.5) * (75 + round * 1.5),
    vy: (Math.random() - 0.5) * (75 + round * 1.5),
    rotation: Math.random() * 5,
    spin: (Math.random() - 0.5) * 2,
    shape: Array.from({ length: sides }, () => 0.75 + Math.random() * 0.4),
    golden: isGolden
  });
}

function spawnWave() {
  if (waveSpawned || asteroids.length || enemies.length || boss) return;

  waveSpawned = true;

  if (round > 500) {
    victory();
    return;
  }

  if (round % 5 === 0) {
    spawnBoss();
    return;
  }

  // More asteroids, with more large rocks.
  const count = Math.min(8 + round * 2, 35);

  for (let i = 0; i < count; i++) {
    const pos = randomEdgePosition();
    const roll = Math.random();

    const size = roll < 0.30 ? 3 :
      roll < 0.70 ? 2 : 1;

    createAsteroid(pos.x, pos.y, size, Math.random() < 0.10);
  }

  // Add enemy ships in later rounds.
  if (round >= 3) {
    const enemyCount = Math.min(1 + Math.floor(round / 5), 6);

    for (let i = 0; i < enemyCount; i++) {
      const pos = randomEdgePosition();

      enemies.push({
        x: pos.x,
        y: pos.y,
        health: 4 + round,
        speed: 55 + Math.min(round * 1.5, 90),
        timer: 2,
        elite: round % 10 === 0
      });
    }
  }

  showMessage(`ROUND ${round}: ASTEROID WAVE`);
}

// Split rocks into smaller rocks when destroyed.
function splitAsteroid(a) {
  createParticles(a.x, a.y, a.golden ? "#ffd166" : "#a8b7d4", 20);

  addScore(a.size === 3 ? 100 : a.size === 2 ? 60 : 30);

  if (a.golden) {
    const amount = a.size === 3 ? 30 + Math.floor(Math.random() * 21) :
      a.size === 2 ? 15 + Math.floor(Math.random() * 11) :
      5 + Math.floor(Math.random() * 6);

    drops.push({
      x: a.x,
      y: a.y,
      value: amount,
      vx: 0,
      vy: 0
    });
  }

  if (a.size > 1) {
    const smallerSize = a.size - 1;

    // Each rock creates two smaller rocks.
    for (let i = 0; i < 2; i++) {
      const child = createAsteroid;
      child(
        a.x + (Math.random() - 0.5) * 25,
        a.y + (Math.random() - 0.5) * 25,
        smallerSize,
        a.golden && Math.random() < 0.5
      );
    }

    showMessage("ASTEROID SPLIT!");
  } else {
    // Small rocks break into visible fragments.
    createParticles(a.x, a.y, "#c5d5eb", 12);
  }
}

function spawnBoss() {
  const legendary = round % 25 === 0;

  // Bosses have much less health than before.
  const health = 100 + round * 12 + (legendary ? 250 : 0);

  boss = {
    x: W / 2,
    y: 100,
    radius: legendary ? 58 : 43,
    health,
    maxHealth: health,
    vx: 65,
    attackTimer: 2.5,
    legendary
  };

  $("bossName").textContent = legendary
    ? "LEGENDARY GALACTIC OVERLORD"
    : `ROUND ${round} BOSS`;

  $("bossHealth").style.width = "100%";
  $("bossBar").classList.remove("hidden");
  showMessage(legendary ? "LEGENDARY BOSS INCOMING!" : "BOSS BATTLE!");
}

function updateBossBar() {
  if (!boss) return;
  $("bossHealth").style.width =
    `${Math.max(0, boss.health / boss.maxHealth * 100)}%`;
}

function fireBullet() {
  const laser = level("laser");
  const spread = level("spread");
  const heavy = level("heavy");
  const damage = ship.damage + level("berserker") * 2 + heavy * 2;

  function shot(angle, type = "normal") {
    bullets.push({
      x: ship.x + Math.cos(angle) * 20,
      y: ship.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * 520,
      vy: Math.sin(angle) * 520,
      damage,
      life: 1.5,
      type,
      piercing: laser >= 3
    });
  }

  if (spread > 0) {
    const count = 3 + spread * 2;
    const width = 0.65 + spread * 0.08;

    for (let i = 0; i < count; i++) {
      shot(ship.angle + (i / (count - 1) - 0.5) * width, "plasma");
    }
  } else {
    shot(ship.angle);
  }

  if (laser > 0) {
    shot(ship.angle - 0.14, "laser");
    shot(ship.angle + 0.14, "laser");
  }

  if (heavy > 0) {
    shot(ship.angle, "heavy");
  }
}

function fireMissile() {
  if (!level("missiles")) return;

  const targets = [...asteroids, ...enemies, ...(boss ? [boss] : [])];
  if (!targets.length) return;

  const target = targets.reduce((best, current) =>
    distance(ship, current) < distance(ship, best) ? current : best
  );

  const angle = Math.atan2(target.y - ship.y, target.x - ship.x);

  bullets.push({
    x: ship.x,
    y: ship.y,
    vx: Math.cos(angle) * 300,
    vy: Math.sin(angle) * 300,
    damage: 5 + level("missiles") * 3,
    life: 3,
    type: "missile",
    target
  });
}

function useEMP() {
  const power = level("emp");
  if (!power) return;

  const radius = 150 + power * 35;
  createParticles(ship.x, ship.y, "#39e8ff", 40);

  asteroids.forEach(a => {
    if (distance(ship, a) < radius) a.health -= 3 + power * 3;
  });

  enemies.forEach(e => {
    if (distance(ship, e) < radius) e.health -= 8 + power * 5;
  });

  if (boss && distance(ship, boss) < radius) {
    boss.health -= 12 + power * 10;
    updateBossBar();
  }

  showMessage("EMP PULSE RELEASED");
}

function useNova() {
  const power = level("nova");
  if (!power) return;

  const radius = 180 + power * 35;
  createParticles(ship.x, ship.y, "#c17aff", 60);

  asteroids.forEach(a => {
    if (distance(ship, a) < radius) a.health -= 12 + power * 6;
  });

  enemies.forEach(e => {
    if (distance(ship, e) < radius) e.health -= 20 + power * 10;
  });

  if (boss && distance(ship, boss) < radius) {
    boss.health -= 30 + power * 20;
    updateBossBar();
  }

  showMessage("NOVA DETONATED");
}

function useUltimate() {
  if (!ultimateReady) return;

  ultimateReady = false;
  ultimateCharge = 0;

  createParticles(ship.x, ship.y, "#ffffff", 100);
  asteroids.forEach(a => a.health -= 100);
  enemies.forEach(e => e.health -= 100);

  if (boss) {
    boss.health -= 100 + round * 3;
    updateBossBar();
  }

  showMessage("ULTIMATE ATTACK!");
}

function createHelper() {
  helpers.push({ angle: Math.random() * Math.PI * 2, timer: 0 });
}

function createDrone() {
  drones.push({ angle: Math.random() * Math.PI * 2 });
}

function buyUpgrade(id) {
  const u = upgrades.find(item => item.id === id);
  if (!u) return;

  const price = Math.floor(u.cost * Math.pow(1.55, u.level));

  if (gold < price) {
    showMessage("NOT ENOUGH GOLD");
    return;
  }

  gold -= price;
  u.level++;

  if (id === "helpers") createHelper();
  if (id === "drones") createDrone();

  if (id === "shield") ship.shield = 100;
  if (id === "overdrive") ship.speed = 1 + u.level * 0.25;
  if (id === "laser") ship.damage += 1;
  if (id === "berserker") ship.damage += 2;

  if (id === "repair") {
    ship.health = 100;
    lives++;
  }

  updateHUD();
  renderShop();
  showMessage(`${u.name} UPGRADED!`);
}

function renderShop() {
  $("shopGold").textContent = gold.toLocaleString();
  $("shopItems").innerHTML = "";

  upgrades.forEach(u => {
    const price = Math.floor(u.cost * Math.pow(1.55, u.level));
    const card = document.createElement("div");

    card.className = "shop-item";
    card.innerHTML = `
      <h3>${u.name}</h3>
      <p>${u.description}</p>
      <p>Level ${u.level}</p>
      <button ${gold < price ? "disabled" : ""}>
        BUY / EVOLVE — ${price} GOLD
      </button>
    `;

    card.querySelector("button").addEventListener("click", () => {
      buyUpgrade(u.id);
    });

    $("shopItems").appendChild(card);
  });
}

function openShop() {
  if (!running || gameOver || !shop.classList.contains("hidden")) return;

  paused = true;
  $("shop").classList.remove("hidden");
  renderShop();
  showMessage("COMMAND SHOP OPEN");
}

function closeShop() {
  $("shop").classList.add("hidden");
  paused = false;
  lastTime = performance.now();
  showMessage("MISSION RESUMED");
}

function damageShip() {
  if (invincibleTimer > 0 || !ship.alive) return;

  if (level("shield") > 0 && ship.shield > 0) {
    ship.shield -= 35;
    if (ship.shield < 0) ship.shield = 0;
    createParticles(ship.x, ship.y, "#39e8ff", 12);
    invincibleTimer = 1;
    return;
  }

  if (level("phase") > 0 &&
      Math.random() < 0.25 + level("phase") * 0.1) {
    invincibleTimer = 1.5;
    showMessage("PHASE SHIFT!");
    return;
  }

  lives--;
  invincibleTimer = 2;

  createParticles(ship.x, ship.y, "#ff536d", 30);
  ship.x = W / 2;
  ship.y = H / 2;
  ship.vx = 0;
  ship.vy = 0;

  updateHUD();

  if (lives <= 0) endGame();
}

function endGame() {
  running = false;
  gameOver = true;
  $("bossBar").classList.add("hidden");
  $("overlay").classList.remove("hidden");
  $("overlayTitle").innerHTML = "MISSION<br><span>FAILED</span>";
  $("overlayText").textContent =
    `You reached Round ${round} and scored ${score.toLocaleString()} points.`;
  $("startButton").textContent = "TRY AGAIN";
  saveGame();
}

function victory() {
  running = false;
  gameOver = true;
  $("overlay").classList.remove("hidden");
  $("overlayTitle").innerHTML = "GALAXY<br><span>SAVED!</span>";
  $("overlayText").textContent =
    `You survived all 500 rounds! Final score: ${score.toLocaleString()}.`;
  $("startButton").textContent = "PLAY AGAIN";
  saveGame();
}

function resetGame() {
  score = 0;
  gold = 500;
  round = 1;
  lives = 7;
  nextShopScore = 1000;

  asteroids = [];
  bullets = [];
  enemies = [];
  enemyBullets = [];
  particles = [];
  drops = [];
  helpers = [];
  drones = [];
  boss = null;

  waveSpawned = false;
  waveTimer = 0;
  shootTimer = 0;
  enemyTimer = 0;
  eventTimer = 0;
  ultimateCharge = 0;
  ultimateReady = false;
  invincibleTimer = 0;

  upgrades.forEach(u => u.level = 0);

  ship.x = W / 2;
  ship.y = H / 2;
  ship.vx = 0;
  ship.vy = 0;
  ship.angle = -Math.PI / 2;
  ship.health = 100;
  ship.shield = 0;
  ship.damage = 1;
  ship.speed = 1;
  ship.alive = true;

  gameOver = false;
  paused = false;
  running = true;

  $("overlay").classList.add("hidden");
  $("shop").classList.add("hidden");
  $("pauseScreen").classList.add("hidden");
  $("bossBar").classList.add("hidden");

  updateHUD();
  showMessage("MISSION STARTED");
  lastTime = performance.now();

  requestAnimationFrame(gameLoop);
}

// ============================================
// DRAWING
// ============================================

function drawBackground() {
  ctx.fillStyle = "#030713";
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    ctx.globalAlpha = 0.3 + s.brightness * 0.7;
    ctx.fillStyle = "#b9eaff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  ctx.globalAlpha = 1;
}

function drawShip() {
  if (!ship.alive) return;
  if (invincibleTimer > 0 &&
      Math.floor(invincibleTimer * 10) % 2 === 0) return;

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);

  if (keys.w || keys.ArrowUp) {
    ctx.beginPath();
    ctx.moveTo(-13, -7);
    ctx.lineTo(-30 - Math.random() * 12, 0);
    ctx.lineTo(-13, 7);
    ctx.fillStyle = "#ff9c43";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff6b2b";
    ctx.fill();
  }

  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(-13, -12);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-13, 12);
  ctx.closePath();

  ctx.fillStyle = "#d5f5ff";
  ctx.strokeStyle = "#39e8ff";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#39e8ff";
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (level("shield") > 0 && ship.shield > 0) {
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 27, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(57,232,255,0.7)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawAsteroids() {
  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rotation);

    ctx.beginPath();

    a.shape.forEach((v, i) => {
      const angle = i / a.shape.length * Math.PI * 2;
      const x = Math.cos(angle) * a.radius * v;
      const y = Math.sin(angle) * a.radius * v;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.closePath();
    ctx.fillStyle = a.golden ? "#9d7425" : "#414c65";
    ctx.strokeStyle = a.golden ? "#ffd166" : "#a6b6d0";
    ctx.lineWidth = 2;
    ctx.shadowBlur = a.golden ? 16 : 0;
    ctx.shadowColor = "#ffd166";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.atan2(ship.y - e.y, ship.x - e.x));

    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();

    ctx.fillStyle = e.elite ? "#ff9c43" : "#d84d70";
    ctx.strokeStyle = "#ffb2c3";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

function drawBoss() {
  if (!boss) return;

  ctx.save();
  ctx.translate(boss.x, boss.y);

  ctx.beginPath();
  ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
  ctx.fillStyle = boss.legendary ? "#6b237e" : "#702b49";
  ctx.strokeStyle = boss.legendary ? "#f4a2ff" : "#ff668e";
  ctx.lineWidth = 4;
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#ff315d";
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-15, -7, 7, 0, Math.PI * 2);
  ctx.arc(15, -7, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawProjectiles() {
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.type === "heavy" ? 6 : 3, 0, Math.PI * 2);

    ctx.fillStyle = b.type === "missile" ? "#ff9d45" :
      b.type === "laser" ? "#39e8ff" :
      b.type === "heavy" ? "#ffcc55" :
      b.type === "plasma" ? "#b879ff" : "#ffffff";

    ctx.shadowBlur = 12;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  enemyBullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5579";
    ctx.fill();
  });
}

function drawHelpers() {
  helpers.forEach(h => {
    const x = ship.x + Math.cos(h.angle) * 48;
    const y = ship.y + Math.sin(h.angle) * 48;

    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#54dfff";
    ctx.fill();
  });

  drones.forEach(d => {
    const x = ship.x + Math.cos(d.angle) * 65;
    const y = ship.y + Math.sin(d.angle) * 65;

    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#d17cff";
    ctx.fill();
  });
}

function drawDrops() {
  drops.forEach(d => {
    ctx.beginPath();
    ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ffd166";
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  ctx.globalAlpha = 1;
}

function render() {
  drawBackground();
  drawDrops();
  drawAsteroids();
  drawEnemies();
  drawBoss();
  drawProjectiles();
  drawHelpers();
  drawParticles();
  drawShip();

  ctx.fillStyle = ultimateReady ? "#ffffff" : "#39e8ff";
  ctx.font = "12px Orbitron";

  ctx.fillText(
    ultimateReady
      ? "ULTIMATE READY — PRESS E"
      : `ULTIMATE: ${Math.floor(ultimateCharge)}%`,
    20,
    H - 22
  );
}

// ============================================
// GAME UPDATE
// ============================================

function update(dt) {
  if (!running || paused || gameOver) return;

  if (invincibleTimer > 0) invincibleTimer -= dt;

  if (keys.a || keys.ArrowLeft) ship.angle -= ship.rotation * dt;
  if (keys.d || keys.ArrowRight) ship.angle += ship.rotation * dt;

  if (keys.w || keys.ArrowUp) {
    const thrust = ship.thrust * ship.speed;
    ship.vx += Math.cos(ship.angle) * thrust * dt;
    ship.vy += Math.sin(ship.angle) * thrust * dt;
  }

  const speed = Math.hypot(ship.vx, ship.vy);
  const maxSpeed = 350 * ship.speed;

  if (speed > maxSpeed) {
    ship.vx = ship.vx / speed * maxSpeed;
    ship.vy = ship.vy / speed * maxSpeed;
  }

  ship.vx *= 0.99;
  ship.vy *= 0.99;
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);

  if (keys[" "] && shootTimer <= 0) {
    fireBullet();
    shootTimer = Math.max(0.09, 0.35 - level("laser") * 0.035);
  }

  shootTimer -= dt;

  if (level("missiles") > 0) {
    enemyTimer -= dt;

    if (enemyTimer <= 0) {
      fireMissile();
      enemyTimer = Math.max(0.4, 2 - level("missiles") * 0.25);
    }
  }

  if (keys.e) {
    useUltimate();
    keys.e = false;
  }

  if (keys.q) {
    useEMP();
    keys.q = false;
  }

  if (keys.r) {
    useNova();
    keys.r = false;
  }

  ultimateCharge = Math.min(100, ultimateCharge + dt * 3);
  if (ultimateCharge >= 100) ultimateReady = true;

  if (level("shield") > 0) {
    ship.shield = Math.min(100,
      ship.shield + dt * (3 + level("shield") * 2));
  }

  if (level("repair") > 0) {
    ship.health = Math.min(100,
      ship.health + dt * level("repair"));
  }

  // Asteroid movement and collisions
  asteroids.forEach(a => {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rotation += a.spin * dt;
    wrap(a);

    if (distance(ship, a) < ship.radius + a.radius * 0.7) {
      damageShip();
      a.health -= 1;
    }

    drones.forEach(d => {
      const dx = ship.x + Math.cos(d.angle) * 65;
      const dy = ship.y + Math.sin(d.angle) * 65;

      if (distance({ x: dx, y: dy }, a) < a.radius + 10) {
        a.health -= dt * 3;
      }
    });
  });

  const destroyed = asteroids.filter(a => a.health <= 0);
  asteroids = asteroids.filter(a => a.health > 0);
  destroyed.forEach(splitAsteroid);

  // Player projectiles
  bullets.forEach(b => {
    if (b.type === "missile" && b.target) {
      const angle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
      b.vx += (Math.cos(angle) * 340 - b.vx) * dt * 2;
      b.vy += (Math.sin(angle) * 340 - b.vy) * dt * 2;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });

  bullets = bullets.filter(b => {
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
      return false;
    }

    for (const a of asteroids) {
      if (distance(b, a) < a.radius) {
        a.health -= b.damage;
        if (b.type === "missile") {
          createParticles(b.x, b.y, "#ff9c43", 12);
        }
        return b.piercing;
      }
    }

    for (const e of enemies) {
      if (distance(b, e) < 18) {
        e.health -= b.damage;
        return b.piercing;
      }
    }

    if (boss && distance(b, boss) < boss.radius) {
      boss.health -= b.damage;
      updateBossBar();
      return b.piercing;
    }

    return true;
  });

  // Enemy movement and shooting
  enemies.forEach(e => {
    const angle = Math.atan2(ship.y - e.y, ship.x - e.x);

    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
    e.timer -= dt;

    if (e.timer <= 0) {
      enemyBullets.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * 190,
        vy: Math.sin(angle) * 190,
        life: 3
      });

      e.timer = 2.5;
    }

    if (distance(ship, e) < 24) damageShip();
  });

  const defeatedEnemies = enemies.filter(e => e.health <= 0);
  enemies = enemies.filter(e => e.health > 0);

  defeatedEnemies.forEach(e => {
    addScore(e.elite ? 250 : 100);
    createParticles(e.x, e.y, "#ff668e", 18);
  });

  enemyBullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (distance(ship, b) < 20) {
      damageShip();
      b.life = 0;
    }
  });

  enemyBullets = enemyBullets.filter(b => b.life > 0);

  // Boss
  if (boss) {
    boss.x += boss.vx * dt;

    if (boss.x < boss.radius || boss.x > W - boss.radius) {
      boss.vx *= -1;
    }

    boss.attackTimer -= dt;

    if (boss.attackTimer <= 0) {
      const angle = Math.atan2(ship.y - boss.y, ship.x - boss.x);

      for (let i = -1; i <= 1; i++) {
        enemyBullets.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle + i * 0.3) * 190,
          vy: Math.sin(angle + i * 0.3) * 190,
          life: 4
        });
      }

      // Slower boss attacks give you more time to dodge.
      boss.attackTimer = boss.legendary ? 1.5 : 2.5;
    }

    if (distance(ship, boss) < boss.radius + 15) damageShip();

    if (boss.health <= 0) {
      createParticles(boss.x, boss.y, "#ffca70", 80);
      gold += boss.legendary ? 500 : 200;
      addScore(boss.legendary ? 3000 : 1000);
      boss = null;
      $("bossBar").classList.add("hidden");
      showMessage("BOSS DEFEATED! GOLD REWARDED!");
    }
  }

  // Helper ships
  helpers.forEach(h => {
    h.angle += dt * 1.5;
    h.timer -= dt;

    if (h.timer <= 0) {
      const target = asteroids[0] || enemies[0] || boss;

      if (target) {
        const angle = Math.atan2(target.y - ship.y, target.x - ship.x);

        bullets.push({
          x: ship.x + Math.cos(h.angle) * 48,
          y: ship.y + Math.sin(h.angle) * 48,
          vx: Math.cos(angle) * 450,
          vy: Math.sin(angle) * 450,
          damage: 3,
          life: 1.5,
          type: "laser",
          piercing: false
        });
      }

      h.timer = 0.7;
    }
  });

  drones.forEach(d => d.angle += dt * 2.5);

  // Gold collection
  drops.forEach(d => {
    const magnetRange = 70 + level("magnet") * 90;

    if (distance(ship, d) < magnetRange) {
      const angle = Math.atan2(ship.y - d.y, ship.x - d.x);
      d.vx += Math.cos(angle) * 400 * dt;
      d.vy += Math.sin(angle) * 400 * dt;
    }

    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= 0.98;
    d.vy *= 0.98;

    if (distance(ship, d) < 20) {
      gold += d.value;
      d.collected = true;
      updateHUD();
      checkAchievements();
    }
  });

  drops = drops.filter(d => !d.collected);

  // Particles
  particles.forEach(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  });

  particles = particles.filter(p => p.life > 0);

  // Random events
  eventTimer += dt;

  if (eventTimer > 45) {
    eventTimer = 0;
    const event = Math.floor(Math.random() * 3);

    if (event === 0) {
      showMessage("METEOR STORM!");
      for (let i = 0; i < 7; i++) {
        const pos = randomEdgePosition();
        createAsteroid(pos.x, pos.y, 1);
      }
    } else if (event === 1) {
      showMessage("GOLDEN ASTEROID SHOWER!");
      for (let i = 0; i < 5; i++) {
        const pos = randomEdgePosition();
        createAsteroid(pos.x, pos.y, 2, true);
      }
    } else {
      showMessage("ENEMY INVASION!");
      for (let i = 0; i < 3; i++) {
        const pos = randomEdgePosition();
        enemies.push({
          x: pos.x,
          y: pos.y,
          health: 5 + round,
          speed: 65 + round,
          timer: 2,
          elite: round % 10 === 0
        });
      }
    }
  }

  // Next round begins only when the wave is cleared.
  if (waveSpawned && asteroids.length === 0 &&
      enemies.length === 0 && !boss) {
    waveTimer += dt;

    if (waveTimer >= 2) {
      waveTimer = 0;
      round++;
      highestRound = Math.max(highestRound, round);
      saveGame();

      if (round > 500) {
        victory();
      } else {
        waveSpawned = false;
        updateHUD();
        spawnWave();
      }
    }
  } else {
    waveTimer = 0;
  }

  if (!waveSpawned) spawnWave();

  updateHUD();
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
  lastTime = timestamp;

  if (!paused) update(dt);

  render();

  if (running) requestAnimationFrame(gameLoop);
}

// ============================================
// CONTROLS
// ============================================

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([" ", "arrowup", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
  keys[event.key] = true;

  if (key === "p" && running && !gameOver &&
      $("shop").classList.contains("hidden")) {
    paused = !paused;
    $("pauseScreen").classList.toggle("hidden", !paused);

    if (!paused) lastTime = performance.now();
  }
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
  keys[event.key] = false;
});

window.addEventListener("blur", () => {
  if (running && !paused && $("shop").classList.contains("hidden")) {
    paused = true;
    $("pauseScreen").classList.remove("hidden");
  }
});

// ============================================
// BUTTONS
// ============================================

$("startButton").addEventListener("click", resetGame);
$("continueButton").addEventListener("click", closeShop);

$("resumeButton").addEventListener("click", () => {
  paused = false;
  $("pauseScreen").classList.add("hidden");
  lastTime = performance.now();
});

updateHUD();
$("highScore").textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
showMessage("SYSTEM READY");
