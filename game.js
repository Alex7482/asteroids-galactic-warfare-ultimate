
// ============================================
// ASTEROIDS: GALACTIC WARFARE - ULTIMATE EDITION
// ============================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const scoreDisplay = $("score");
const goldDisplay = $("gold");
const roundDisplay = $("round");
const livesDisplay = $("lives");
const overlay = $("overlay");
const shop = $("shop");
const pauseScreen = $("pauseScreen");
const bossBar = $("bossBar");

let W = 900;
let H = 600;
let running = false;
let paused = false;
let gameOver = false;
let score = 0;
let gold = 0;
let round = 1;
let lives = 3;
let nextShopScore = 5000;
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
let ultimateCharge = 0;
let ultimateReady = false;
let eventTimer = 0;
let currentEvent = "";
let invincibleTimer = 0;
let lastScore = 0;

const saved = JSON.parse(localStorage.getItem("galacticWarfareSave") || "{}");

let highScore = saved.highScore || 0;
let highestRound = saved.highestRound || 1;
let achievements = saved.achievements || [];
let unlockedShips = saved.unlockedShips || ["default"];

const ship = {
  x: 450,
  y: 300,
  angle: -Math.PI / 2,
  vx: 0,
  vy: 0,
  radius: 15,
  thrust: 260,
  rotation: 4.2,
  health: 100,
  shield: 0,
  fireRate: 0.35,
  damage: 1,
  speed: 1,
  alive: true
};

const upgrades = [
  { id: "shield", name: "Regenerating Shield", description: "Protects your ship and regenerates over time.", cost: 250, level: 0, max: 5 },
  { id: "laser", name: "Laser Cannon", description: "Adds powerful piercing laser beams.", cost: 300, level: 0, max: 5 },
  { id: "helpers", name: "Helper Squadron", description: "Companion ships automatically attack enemies.", cost: 400, level: 0, max: 5 },
  { id: "spread", name: "Plasma Spread", description: "Fires multiple plasma projectiles.", cost: 350, level: 0, max: 5 },
  { id: "emp", name: "EMP Pulse", description: "Electric shockwaves damage nearby enemies.", cost: 450, level: 0, max: 5 },
  { id: "missiles", name: "Homing Missiles", description: "Missiles automatically chase targets.", cost: 500, level: 0, max: 5 },
  { id: "overdrive", name: "Overdrive", description: "Improves speed and acceleration.", cost: 300, level: 0, max: 5 },
  { id: "drones", name: "Orbital Drones", description: "Drones orbit and damage nearby asteroids.", cost: 450, level: 0, max: 5 },
  { id: "nova", name: "Nova Explosion", description: "Unleashes a damaging explosion around you.", cost: 600, level: 0, max: 5 },
  { id: "magnet", name: "Gold Magnet", description: "Attracts gold from a greater distance.", cost: 300, level: 0, max: 5 },
  { id: "heavy", name: "Heavy Cannon", description: "Fires slower but much stronger shots.", cost: 450, level: 0, max: 5 },
  { id: "phase", name: "Phase Shift", description: "Grants temporary protection.", cost: 500, level: 0, max: 5 },
  { id: "repair", name: "Nano Repair", description: "Repairs your ship and restores lives.", cost: 550, level: 0, max: 5 },
  { id: "berserker", name: "Berserker Mode", description: "Boosts damage and weapon strength.", cost: 650, level: 0, max: 5 }
];

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

// Background stars
const stars = Array.from({ length: 150 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  size: Math.random() * 1.8 + 0.3,
  brightness: Math.random()
}));

function saveGame() {
  localStorage.setItem("galacticWarfareSave", JSON.stringify({
    highScore,
    highestRound,
    achievements,
    unlockedShips
  }));
}

function updateHUD() {
  scoreDisplay.textContent = score.toLocaleString();
  goldDisplay.textContent = gold.toLocaleString();
  roundDisplay.textContent = `${round} / 500`;
  livesDisplay.textContent = lives;
  $("highScore").textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
}

function randomEdgePosition() {
  const side = Math.floor(Math.random() * 4);

  if (side === 0) return { x: Math.random() * W, y: -30 };
  if (side === 1) return { x: W + 30, y: Math.random() * H };
  if (side === 2) return { x: Math.random() * W, y: H + 30 };

  return { x: -30, y: Math.random() * H };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getUpgrade(id) {
  return upgrades.find(u => u.id === id)?.level || 0;
}

function addScore(amount) {
  score += amount;

  if (score > highScore) {
    highScore = score;
  }

  if (score >= nextShopScore && running && !gameOver) {
    nextShopScore += 5000;
    openShop();
  }

  updateHUD();
  checkAchievements();
}

function checkAchievements() {
  const checks = [
    ["firstKill", score >= 100, "First Steps"],
    ["score10000", score >= 10000, "Space Millionaire"],
    ["gold5000", gold >= 5000, "Gold Collector"],
    ["round10", highestRound >= 10, "Survivor"],
    ["round50", highestRound >= 50, "Galaxy Veteran"],
    ["round100", highestRound >= 100, "Legend"],
    ["round500", round >= 500, "Galaxy Savior"]
  ];

  checks.forEach(([id, condition, name]) => {
    if (condition && !achievements.includes(id)) {
      achievements.push(id);
      showMessage(`ACHIEVEMENT: ${name}`);
      saveGame();
    }
  });
}

function showMessage(message) {
  $("status").textContent = message;
}

function createParticles(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 180 + 30;

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.6,
      maxLife: 1.1,
      color,
      size: Math.random() * 3 + 1
    });
  }
}

function createAsteroid(x, y, size, isGolden = false) {
  const health = size === 4 ? 12 : size === 3 ? 7 : size === 2 ? 4 : 2;
  const sides = Math.floor(Math.random() * 4) + 8;
  const shape = Array.from({ length: sides }, () => 0.75 + Math.random() * 0.4);

  asteroids.push({
    x, y,
    size,
    radius: size * 12,
    health,
    maxHealth: health,
    vx: (Math.random() - 0.5) * (65 + round * 2),
    vy: (Math.random() - 0.5) * (65 + round * 2),
    rotation: Math.random() * 5,
    spin: (Math.random() - 0.5) * 2,
    shape,
    golden: isGolden
  });
}

function spawnWave() {
  if (waveSpawned || asteroids.length > 0 || enemies.length > 0 || boss) return;

  waveSpawned = true;

  if (round > 500) {
    victory();
    return;
  }

  if (round % 5 === 0) {
    spawnBoss();
    return;
  }

  const count = Math.min(3 + round, 18);

  for (let i = 0; i < count; i++) {
    const pos = randomEdgePosition();
    const size = Math.random() < 0.12 ? 4 :
      Math.random() < 0.35 ? 3 :
      Math.random() < 0.65 ? 2 : 1;

    createAsteroid(pos.x, pos.y, size, Math.random() < 0.08);
  }

  showMessage(`ROUND ${round}: ASTEROID WAVE`);
}

function splitAsteroid(a) {
  createParticles(a.x, a.y, a.golden ? "#ffd166" : "#a8b7d4", 18);

  const reward = a.size === 4 ? 100 : a.size === 3 ? 60 : a.size === 2 ? 30 : 15;
  addScore(reward);

  if (a.golden) {
    const amount = a.size === 4 ? 60 + Math.floor(Math.random() * 41) :
      a.size === 3 ? 30 + Math.floor(Math.random() * 21) :
      a.size === 2 ? 15 + Math.floor(Math.random() * 11) :
      5 + Math.floor(Math.random() * 6);

    drops.push({
      x: a.x,
      y: a.y,
      value: amount,
      type: "gold",
      vx: 0,
      vy: 0
    });
  }

  if (a.size > 1) {
    const childSize = a.size - 1;

    for (let i = 0; i < 2; i++) {
      createAsteroid(
        a.x + (Math.random() - 0.5) * 20,
        a.y + (Math.random() - 0.5) * 20,
        childSize,
        a.golden && Math.random() < 0.5
      );
    }
  }
}

function spawnBoss() {
  const legendary = round % 25 === 0;
  const health = 100 + round * 35 + (legendary ? 600 : 0);

  boss = {
    x: W / 2,
    y: 100,
    radius: legendary ? 65 : 48,
    health,
    maxHealth: health,
    vx: 100,
    attackTimer: 1,
    legendary
  };

  $("bossName").textContent = legendary ? "LEGENDARY GALACTIC OVERLORD" : `ROUND ${round} BOSS`;
  bossBar.classList.remove("hidden");
  updateBossBar();
  showMessage(legendary ? "LEGENDARY BOSS INCOMING!" : "BOSS BATTLE!");
}

function updateBossBar() {
  if (!boss) return;

  $("bossHealth").style.width = `${Math.max(0, boss.health / boss.maxHealth * 100)}%`;
}

function fireBullet() {
  const level = getUpgrade("laser");
  const spread = getUpgrade("spread");
  const heavy = getUpgrade("heavy");
  const berserker = getUpgrade("berserker");

  const damage = ship.damage + heavy * 2 + berserker * 2;

  function addShot(angle, type = "normal") {
    bullets.push({
      x: ship.x + Math.cos(angle) * 20,
      y: ship.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * 520,
      vy: Math.sin(angle) * 520,
      damage,
      life: 1.5,
      type,
      piercing: level >= 3
    });
  }

  if (spread > 0) {
    const count = Math.min(3 + spread * 2, 11);
    const width = 0.7 + spread * 0.08;

    for (let i = 0; i < count; i++) {
      const angle = ship.angle + (i / (count - 1) - 0.5) * width;
      addShot(angle, "plasma");
    }
  } else {
    addShot(ship.angle);
  }

  if (level >= 1) {
    const offset = 0.14;
    addShot(ship.angle - offset, "laser");
    addShot(ship.angle + offset, "laser");
  }

  if (heavy > 0) {
    bullets.push({
      x: ship.x,
      y: ship.y,
      vx: Math.cos(ship.angle) * 400,
      vy: Math.sin(ship.angle) * 400,
      damage: 5 + heavy * 4,
      life: 1.5,
      type: "heavy",
      piercing: true
    });
  }
}

function fireMissile() {
  if (getUpgrade("missiles") === 0) return;

  const targets = [...asteroids, ...enemies, ...(boss ? [boss] : [])];

  if (!targets.length) return;

  const target = targets.reduce((best, current) =>
    distance(ship, current) < distance(ship, best) ? current : best
  );

  const angle = Math.atan2(target.y - ship.y, target.x - ship.x);

  bullets.push({
    x: ship.x,
    y: ship.y,
    vx: Math.cos(angle) * 320,
    vy: Math.sin(angle) * 320,
    damage: 5 + getUpgrade("missiles") * 3,
    life: 3,
    type: "missile",
    target
  });
}

function useEMP() {
  const level = getUpgrade("emp");
  if (!level) return;

  const radius = 140 + level * 45;

  createParticles(ship.x, ship.y, "#39e8ff", 45);

  asteroids.forEach(a => {
    if (distance(ship, a) < radius) {
      a.health -= 2 + level * 3;
    }
  });

  enemies.forEach(e => {
    if (distance(ship, e) < radius) {
      e.health -= 5 + level * 5;
    }
  });

  if (boss && distance(ship, boss) < radius) {
    boss.health -= 8 + level * 7;
    updateBossBar();
  }

  showMessage("EMP PULSE RELEASED");
}

function useNova() {
  const level = getUpgrade("nova");
  if (!level) return;

  const radius = 160 + level * 45;

  createParticles(ship.x, ship.y, "#c17aff", 65);

  asteroids.forEach(a => {
    if (distance(ship, a) < radius) a.health -= 10 + level * 6;
  });

  enemies.forEach(e => {
    if (distance(ship, e) < radius) e.health -= 20 + level * 10;
  });

  if (boss && distance(ship, boss) < radius) {
    boss.health -= 30 + level * 20;
    updateBossBar();
  }

  showMessage("NOVA DETONATED");
}

function useUltimate() {
  if (!ultimateReady) return;

  ultimateReady = false;
  ultimateCharge = 0;

  createParticles(ship.x, ship.y, "#ffffff", 120);

  asteroids.forEach(a => a.health -= 100);
  enemies.forEach(e => e.health -= 100);

  if (boss) {
    boss.health -= 100 + round * 3;
    updateBossBar();
  }

  showMessage("ULTIMATE WEAPON RELEASED!");
}

function buyUpgrade(id) {
  const upgrade = upgrades.find(u => u.id === id);
  if (!upgrade) return;

  const price = Math.floor(upgrade.cost * Math.pow(1.7, upgrade.level));

  if (gold < price) {
    showMessage("NOT ENOUGH GOLD");
    return;
  }

  gold -= price;
  upgrade.level++;

  if (id === "helpers") createHelper();
  if (id === "drones") createDrone();
  if (id === "repair") {
    lives += upgrade.level % 2 === 1 ? 1 : 0;
    ship.health = Math.min(100, ship.health + 50);
  }

  if (id === "shield") ship.shield = 100;
  if (id === "overdrive") ship.speed = 1 + upgrade.level * 0.25;
  if (id === "laser") ship.damage += 1;
  if (id === "berserker") ship.damage += 2;

  updateHUD();
  renderShop();
}

function createHelper() {
  helpers.push({
    angle: Math.random() * Math.PI * 2,
    timer: 0
  });
}

function createDrone() {
  drones.push({
    angle: Math.random() * Math.PI * 2
  });
}

function renderShop() {
  $("shopGold").textContent = gold.toLocaleString();

  $("shopItems").innerHTML = "";

  upgrades.forEach(u => {
    const price = Math.floor(u.cost * Math.pow(1.7, u.level));

    const card = document.createElement("div");
    card.className = "shop-item";

    const levelText = u.level >= 5
      ? `Evolution Level ${u.level}`
      : `Level ${u.level} / 5`;

    card.innerHTML = `
      <h3>${u.name}</h3>
      <p>${u.description}</p>
      <p>${levelText}</p>
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
  if (!running || gameOver) return;

  paused = true;
  shop.classList.remove("hidden");
  renderShop();
  showMessage("COMMAND SHOP OPEN");
}

function closeShop() {
  shop.classList.add("hidden");
  paused = false;
  lastTime = performance.now();
  showMessage("MISSION RESUMED");
}

function damageShip() {
  if (invincibleTimer > 0 || !ship.alive) return;

  if (getUpgrade("shield") > 0 && ship.shield > 0) {
    ship.shield -= 35;

    if (ship.shield <= 0) {
      ship.shield = 0;
      createParticles(ship.x, ship.y, "#39e8ff", 30);
    }

    invincibleTimer = 0.7;
    return;
  }

  if (getUpgrade("phase") > 0 && Math.random() < 0.25 + getUpgrade("phase") * 0.1) {
    invincibleTimer = 1;
    showMessage("PHASE SHIFT!");
    return;
  }

  lives--;
  invincibleTimer = 2;
  createParticles(ship.x, ship.y, "#ff536d", 35);

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
  bossBar.classList.add("hidden");
  overlay.classList.remove("hidden");

  $("overlayTitle").innerHTML = "MISSION<br><span>FAILED</span>";
  $("overlayText").textContent = `You reached Round ${round} and scored ${score.toLocaleString()} points.`;
  $("startButton").textContent = "TRY AGAIN";

  saveGame();
}

function victory() {
  running = false;
  gameOver = true;
  overlay.classList.remove("hidden");
  $("overlayTitle").innerHTML = "GALAXY<br><span>SAVED!</span>";
  $("overlayText").textContent = `You survived all 500 rounds! Final score: ${score.toLocaleString()}.`;
  $("startButton").textContent = "PLAY AGAIN";
  saveGame();
}

function resetGame() {
  score = 0;
  gold = 0;
  round = 1;
  lives = 3;
  nextShopScore = 5000;

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
  ultimateCharge = 0;
  ultimateReady = false;
  eventTimer = 0;
  currentEvent = "";
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

  overlay.classList.add("hidden");
  shop.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  bossBar.classList.add("hidden");

  updateHUD();
  showMessage("MISSION STARTED");
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

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
  if (invincibleTimer > 0 && Math.floor(invincibleTimer * 10) % 2 === 0) return;

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

  if (getUpgrade("shield") > 0 && ship.shield > 0) {
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, 27, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(57,232,255,0.7)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#39e8ff";
    ctx.stroke();
    ctx.shadowBlur = 0;
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
  ctx.shadowColor = boss.legendary ? "#c75bff" : "#ff315d";
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
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#39e8ff";
    ctx.fill();
    ctx.shadowBlur = 0;
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

function wrap(object, margin = 30) {
  if (object.x < -margin) object.x = W + margin;
  if (object.x > W + margin) object.x = -margin;
  if (object.y < -margin) object.y = H + margin;
  if (object.y > H + margin) object.y = -margin;
}

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

  const maxSpeed = 350 * ship.speed;
  const speed = Math.hypot(ship.vx, ship.vy);

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
    shootTimer = Math.max(0.09, 0.35 - getUpgrade("laser") * 0.035);
  }

  shootTimer -= dt;

  if (getUpgrade("missiles") > 0) {
    enemyTimer -= dt;

    if (enemyTimer <= 0) {
      fireMissile();
      enemyTimer = Math.max(0.35, 2 - getUpgrade("missiles") * 0.25);
    }
  }

  if (keys.e) {
    useUltimate();
    keys.e = false;
  }

  ultimateCharge = Math.min(100, ultimateCharge + dt * 2);

  if (ultimateCharge >= 100) ultimateReady = true;

  if (getUpgrade("shield") > 0) {
    ship.shield = Math.min(100, ship.shield + dt * (3 + getUpgrade("shield") * 2));
  }

  if (getUpgrade("repair") > 0) {
    ship.health = Math.min(100, ship.health + dt * getUpgrade("repair"));
  }

  if (keys.q) {
    useEMP();
    keys.q = false;
  }

  if (keys.r) {
    useNova();
    keys.r = false;
  }

  // Asteroids
  asteroids.forEach(a => {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rotation += a.spin * dt;
    wrap(a);

    if (distance(ship, a) < ship.radius + a.radius * 0.75) {
      damageShip();
      a.health -= 3;
    }

    if (getUpgrade("drones") > 0) {
      drones.forEach(d => {
        if (distance({
          x: ship.x + Math.cos(d.angle) * 65,
          y: ship.y + Math.sin(d.angle) * 65
        }, a) < a.radius + 12) {
          a.health -= dt * 3;
        }
      });
    }
  });

  asteroids = asteroids.filter(a => {
    if (a.health <= 0) {
      splitAsteroid(a);
      return false;
    }
    return true;
  });

  // Player bullets
  bullets.forEach(b => {
    if (b.type === "missile" && b.target) {
      const angle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
      const speed = 340;
      b.vx += (Math.cos(angle) * speed - b.vx) * dt * 2;
      b.vy += (Math.sin(angle) * speed - b.vy) * dt * 2;
    }

    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
  });

  bullets = bullets.filter(b => {
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) return false;

    for (const a of asteroids) {
      if (distance(b, a) < a.radius) {
        a.health -= b.damage;

        if (!b.piercing) b.life = 0;

        if (b.type === "missile") {
          createParticles(b.x, b.y, "#ff9c43", 15);
        }

        return b.piercing;
      }
    }

    for (const e of enemies) {
      if (distance(b, e) < 18) {
        e.health -= b.damage;
        if (!b.piercing) b.life = 0;
        return b.piercing;
      }
    }

    if (boss && distance(b, boss) < boss.radius) {
      boss.health -= b.damage;
      updateBossBar();

      if (!b.piercing) b.life = 0;
      return b.piercing;
    }

    return true;
  });

  // Enemy movement and attacks
  enemies.forEach(e => {
    const angle = Math.atan2(ship.y - e.y, ship.x - e.x);
    e.x += Math.cos(angle) * e.speed * dt;
    e.y += Math.sin(angle) * e.speed * dt;
    e.timer -= dt;

    if (e.timer <= 0) {
      enemyBullets.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(angle) * 240,
        vy: Math.sin(angle) * 240,
        life: 3
      });
      e.timer = 1.5;
    }

    if (distance(ship, e) < 24) damageShip();
  });

  enemies = enemies.filter(e => {
    if (e.health <= 0) {
      addScore(e.elite ? 250 : 100);
      createParticles(e.x, e.y, "#ff668e", 18);
      return false;
    }
    return true;
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

  // Boss movement and attacks
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
          vx: Math.cos(angle + i * 0.3) * 260,
          vy: Math.sin(angle + i * 0.3) * 260,
          life: 4
        });
      }

      boss.attackTimer = boss.legendary ? 0.65 : 1.2;
    }

    if (distance(ship, boss) < boss.radius + 15) damageShip();

    if (boss.health <= 0) {
      createParticles(boss.x, boss.y, "#ffca70", 90);
      gold += boss.legendary ? 500 : 150;
      addScore(boss.legendary ? 3000 : 1000);
      boss = null;
      bossBar.classList.add("hidden");
      showMessage("BOSS DEFEATED!");
    }
  }

  // Helper ships
  helpers.forEach(h => {
    h.angle += dt * 1.5;
    h.timer -= dt;

    if (h.timer <= 0) {
      const target = asteroids[0] || enemies[0] || boss;

      if (target) {
        bullets.push({
          x: ship.x + Math.cos(h.angle) * 48,
          y: ship.y + Math.sin(h.angle) * 48,
          vx: (target.x - ship.x) * 1.5,
          vy: (target.y - ship.y) * 1.5,
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

  // Gold drops and magnet
  drops.forEach(d => {
    const magnetRange = 70 + getUpgrade("magnet") * 90;

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

    const events = ["METEOR STORM", "GOLDEN ASTEROID SHOWER", "ENEMY INVASION"];
    currentEvent = events[Math.floor(Math.random() * events.length)];
    showMessage(currentEvent);

    if (currentEvent === "GOLDEN ASTEROID SHOWER") {
      for (let i = 0; i < 5; i++) {
        const pos = randomEdgePosition();
        createAsteroid(pos.x, pos.y, 2, true);
      }
    }

    if (currentEvent === "ENEMY INVASION") {
      for (let i = 0; i < 3; i++) {
        const pos = randomEdgePosition();
        enemies.push({
          x: pos.x,
          y: pos.y,
          health: 5 + round,
          speed: 70 + round * 2,
          timer: 1,
          elite: round % 10 === 0
        });
      }
    }

    if (currentEvent === "METEOR STORM") {
      for (let i = 0; i < 7; i++) {
        const pos = randomEdgePosition();
        createAsteroid(pos.x, pos.y, 1, false);
      }
    }
  }

  // Next round
  if (waveSpawned && asteroids.length === 0 && enemies.length === 0 && !boss) {
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
        spawnWave();
        updateHUD();
      }
    }
  } else {
    waveTimer = 0;
  }

  // Start a wave if needed
  if (!waveSpawned) spawnWave();

  updateHUD();
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

  if (ultimateReady && running && !paused) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px Orbitron";
    ctx.fillText("ULTIMATE READY — PRESS E", 20, H - 22);
  } else {
    ctx.fillStyle = "#39e8ff";
    ctx.font = "12px Orbitron";
    ctx.fillText(`ULTIMATE: ${Math.floor(ultimateCharge)}%`, 20, H - 22);
  }
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
  lastTime = timestamp;

  if (!paused) update(dt);

  render();

  if (running) requestAnimationFrame(gameLoop);
}

// Keyboard controls
window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ([" ", "arrowup", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  keys[key] = true;
  keys[event.key] = true;

  if (key === "p" && running && !gameOver && shop.classList.contains("hidden")) {
    paused = !paused;
    pauseScreen.classList.toggle("hidden", !paused);

    if (!paused) lastTime = performance.now();
  }
});

window.addEventListener("keyup", event => {
  keys[event.key.toLowerCase()] = false;
  keys[event.key] = false;
});

window.addEventListener("blur", () => {
  if (running && !paused && shop.classList.contains("hidden")) {
    paused = true;
    pauseScreen.classList.remove("hidden");
  }
});

// Buttons
$("startButton").addEventListener("click", resetGame);
$("continueButton").addEventListener("click", closeShop);

$("resumeButton").addEventListener("click", () => {
  paused = false;
  pauseScreen.classList.add("hidden");
  lastTime = performance.now();
});

updateHUD();
$("highScore").textContent = `HIGH SCORE: ${highScore.toLocaleString()}`;
showMessage("SYSTEM READY");
