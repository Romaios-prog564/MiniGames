// LakeWars.js — bots + shooting integrated

// ====== MAPS DEFINITIONS ======
const maps = {
  easy: {
    tiles: [
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0]
    ],
    grassColor: "green",
    waterColor: "cyan"
  },

  medium: {
    tiles: [
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0],
      [0,0,0,0,2,2,0,0,0,0]
    ],
    grassColor: "purple",
    waterColor: "pink"
  },

  hard: {
    tiles: [
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0],
      [0,0,0,0,3,3,0,0,0,0]
    ],
    grassColor: "red",
    waterColor: "orange"
  }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let countdownNum = 15;
const countdownElem = document.getElementById("countdown");
const overlay = document.getElementById("overlay");
const levelSelect = document.getElementById("levelSelect");

let player = { x: 1, y: 1, color: "orange", lives: 3, lastDir: { x: 1, y: 0 } };
let currentLevel = null;
let gameActive = false;
let time = 0;
let timeInterval = null;
let countdownInterval = null;
let restartBtn = null;

const TILE_SIZE = 40;
const timeBox = document.getElementById("timeBox");
const livesBox = document.getElementById("livesBox");

let bots = [];      // array of bot objects
let bullets = [];   // array of bullets {x,y,dx,dy,owner,type,ttl}
let lastUpdate = performance.now();

// difficulty parameters (will be set on selectLevel)
let botMoveInterval = 1500;   // ms
let botShootInterval = 2000;  // ms
let botMoveTimer = 0;
let botShootTimer = 0;

// helper: random int
function randInt(max) { return Math.floor(Math.random() * max); }

// overlay countdown
function startOverlayCountdown() {
  countdownNum = 15;
  countdownElem.textContent = countdownNum;
  overlay.style.display = "flex";
  levelSelect.style.display = "none";
  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownNum--;
    countdownElem.textContent = countdownNum;
    if (countdownNum <= 0) {
      clearInterval(countdownInterval);
      overlay.style.display = "none";
      levelSelect.style.display = "flex";
    }
  }, 1000);
}
startOverlayCountdown();

// --- Level selection ---
document.getElementById("easyBtn").addEventListener("click", () => selectLevel("easy"));
document.getElementById("mediumBtn").addEventListener("click", () => selectLevel("medium"));
document.getElementById("hardBtn").addEventListener("click", () => selectLevel("hard"));
document.getElementById("backBtn").addEventListener("click", () => {
  // back to level select
  stopGame();
  currentLevel = null;
  levelSelect.style.display = "flex";
  ctx.clearRect(0,0,canvas.width,canvas.height);
  time = 0;
  timeBox.textContent = "Time: 0s";
});

// start level
function selectLevel(levelName) {
  currentLevel = maps[levelName];
  levelSelect.style.display = "none";
  gameActive = true;

  // reset player
  player.x = 1; player.y = 1;
  player.lives = 3;
  player.lastDir = { x: 1, y: 0 };
  player.color = (levelName === "hard") ? "blue" : "orange";
  updateLives();

  // set difficulty params
  if (levelName === "easy") {
    botMoveInterval = 1800;
    botShootInterval = 2200;
  } else if (levelName === "medium") {
    botMoveInterval = 1200;
    botShootInterval = 1600;
  } else { // hard
    botMoveInterval = 800;
    botShootInterval = 1100;
  }
  botMoveTimer = 0;
  botShootTimer = 0;

  // reset time
  time = 0;
  timeBox.textContent = "Time: 0s";
  clearInterval(timeInterval);
  timeInterval = setInterval(() => {
    if (gameActive) {
      time++; timeBox.textContent = "Time: " + time + "s";
    }
  }, 1000);

  // spawn some bots depending on difficulty
  spawnBotsForLevel(levelName);

  // clear bullets
  bullets = [];

  hideRestartButton();
  draw(); // initial draw
  lastUpdate = performance.now();
  requestAnimationFrame(loop);
}

// stop game timers
function stopGame() {
  gameActive = false;
  clearInterval(timeInterval);
  bots = [];
  bullets = [];
  hideRestartButton();
}

// spawn bots
function spawnBotsForLevel(levelName) {
  bots = [];
  let count = (levelName === "easy") ? 2 : (levelName === "medium") ? 3 : 4;
  for (let i = 0; i < count; i++) {
    let tries = 0;
    while (tries < 200) {
      const bx = randInt(5) + 5; // правая половина карты (противоположно игроку)
      const by = randInt(10);
      if (currentLevel.tiles[by][bx] === 0 && !isBotAt(bx,by)) {
        bots.push({
          x: bx,
          y: by,
          color: (levelName === "hard") ? "#8b2cff" : "red",
          hp: 3,
          lastMoveAt: 0
        });
        break;
      }
      tries++;
    }
  }
}

// update & loop
function loop(now) {
  if (!gameActive) return;
  const dt = now - lastUpdate;
  lastUpdate = now;

  botMoveTimer += dt;
  botShootTimer += dt;

  // bot movement
  if (botMoveTimer >= botMoveInterval) {
    botMoveTimer = 0;
    moveBots();
  }

  // bot shooting
  if (botShootTimer >= botShootInterval) {
    botShootTimer = 0;
    bots.forEach(bot => botShoot(bot));
  }

  // update bullets
  updateBullets(dt);

  // draw everything
  draw();

  // check win: if no bots -> win (we can show win overlay later)
  if (bots.length === 0) {
    // victory: stop game, show win and restart like Mini Mines (optional)
    gameActive = false;
    clearInterval(timeInterval);
    showRestartButton();
    setTimeout(()=> alert("You Win!"), 150);
    return;
  }

  requestAnimationFrame(loop);
}

// move bots: each bot attempts a random valid adjacent grass tile
function moveBots() {
  bots.forEach(bot => {
    // simple hard-mode smarter movement: try to approach player sometimes
    const isHard = (currentLevel === maps.hard);
    let options = [];
    const dirs = [ {x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1} ];
    dirs.forEach(d => {
      const nx = bot.x + d.x, ny = bot.y + d.y;
      if (nx>=0 && nx<10 && ny>=0 && ny<10 && currentLevel.tiles[ny][nx]===0 && !isBotAt(nx,ny) && !(nx===player.x && ny===player.y)) {
        options.push(d);
      }
    });
    if (options.length === 0) return; // no move
    let chosen;
    if (isHard && Math.random() < 0.6) {
      // approach player: pick direction that reduces Manhattan dist
      options.sort((a,b)=>{
        const da = Math.abs((bot.x+a.x)-player.x) + Math.abs((bot.y+a.y)-player.y);
        const db = Math.abs((bot.x+b.x)-player.x) + Math.abs((bot.y+b.y)-player.y);
        return da - db;
      });
      chosen = options[0];
    } else {
      chosen = options[randInt(options.length)];
    }
    bot.x += chosen.x;
    bot.y += chosen.y;
  });
}

// check if any bot occupies tile
function isBotAt(x,y){ return bots.some(b => b.x===x && b.y===y); }

function botShoot(bot) {
  if (!gameActive) return;

  // Бот стреляет ТОЛЬКО ВЛЕВО
  bullets.push({
    x: bot.x + 0.5 - 0.4, // вынос пули влево
    y: bot.y + 0.5,
    dx: -1,  // направление строго влево
    dy: 0,   // без вертикального движения
    speed: 4.0,
    owner: "bot",
    ttl: 3000
  });
}

function playerShoot() {
  if (!gameActive || !currentLevel) return;

  // стреляет ТОЛЬКО вправо
  const dir = { x: 1, y: 0 };

  bullets.push({
    x: player.x + 0.5 + 0.4, // сдвиг вперёд
    y: player.y + 0.5,
    dx: 1,
    dy: 0,
    speed: 8.0,
    owner: "player",
    ttl: 1500
  });
}

// update bullets (dt in ms)
function updateBullets(dt) {
  if (bullets.length === 0) return;
  const move = (b, dt) => {
    // move by (speed * dt/1000) tiles
    const step = b.speed * (dt/1000);
    b.x += b.dx * step;
    b.y += b.dy * step;
    b.ttl -= dt;
  };

  for (let i = bullets.length-1; i >= 0; i--) {
    const b = bullets[i];
    move(b, dt);

    // check ttl
    if (b.ttl <= 0) { bullets.splice(i,1); continue; }

    // check collision with map boundaries
    if (b.x < 0 || b.x > 10 || b.y < 0 || b.y > 10) { bullets.splice(i,1); continue; }

    // check tile under bullet
    const tx = Math.floor(b.x), ty = Math.floor(b.y);
    if (tx>=0 && tx<10 && ty>=0 && ty<10) {

      if (b.owner === "player") {
        // check bots hit
        for (let j = bots.length-1; j >= 0; j--) {
          const bot = bots[j];
          if (bot.x === tx && bot.y === ty) {
            bot.hp--;
            bullets.splice(i,1);
            if (bot.hp <= 0) {
              bots.splice(j,1);
            }
            break;
          }
        }
      } else if (b.owner === "bot") {
        // check if player hit
        if (player.x === tx && player.y === ty) {
          bullets.splice(i,1);
          onPlayerDied();
        }
      }
    }
  }
}

// draw function extended: draws bots and bullets
function draw() {
  if (!currentLevel) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const tile = currentLevel.tiles[y][x];
      ctx.fillStyle = tile === 0 ? currentLevel.grassColor : currentLevel.waterColor;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
    }
  }

  // draw bots
  bots.forEach(bot => {
    ctx.fillStyle = bot.color;
    ctx.fillRect(bot.x * TILE_SIZE + 5, bot.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    // draw HP small
    ctx.fillStyle = "#000";
    ctx.font = "12px Arial";
    ctx.fillText(bot.hp, bot.x * TILE_SIZE + 8, bot.y * TILE_SIZE + 18);
  });

  // draw bullets
  bullets.forEach(b => {
    if (b.owner === "player") ctx.fillStyle = "#fff"; // white bullets for player
    else ctx.fillStyle = "#ffd54d"; // yellow for bots
    // draw as small rect
    ctx.fillRect((b.x - 0.1) * TILE_SIZE, (b.y - 0.1) * TILE_SIZE, TILE_SIZE * 0.2, TILE_SIZE * 0.2);
  });

  // draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x * TILE_SIZE + 5, player.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
}

// life and death functions (reuse existing onPlayerDied)
function onPlayerDied() {
  player.lives--;
  updateLives();

  if (player.lives <= 0) {
    gameActive = false;
    clearInterval(timeInterval);
    showRestartButton();
    alert("Game Over!");
    return;
  }

  alert(`You died! ${player.lives} life${player.lives === 1 ? "" : "s"} left`);
  player.x = 1; player.y = 1;
  draw();
}

// lives UI
function updateLives() {
  const hearts = "❤️".repeat(Math.max(0, player.lives));
  livesBox.textContent = "Lives: " + hearts;
}

// Restart button management (same as before)
function showRestartButton() {
  if (!restartBtn) {
    restartBtn = document.createElement("button");
    restartBtn.id = "restartBtn";
    restartBtn.textContent = "Restart";
    restartBtn.style.marginTop = "8px";
    restartBtn.style.padding = "8px 12px";
    restartBtn.style.fontSize = "16px";
    restartBtn.style.cursor = "pointer";
    const bottomUI = document.getElementById("bottomUI");
    bottomUI.parentNode.insertBefore(restartBtn, bottomUI.nextSibling);
    restartBtn.addEventListener("click", () => {
      // restart current level
      player.lives = 3;
      updateLives();
      time = 0;
      timeBox.textContent = "Time: 0s";
      gameActive = true;
      clearInterval(timeInterval);
      timeInterval = setInterval(() => {
        if (gameActive) { time++; timeBox.textContent = "Time: " + time + "s"; }
      }, 1000);
      hideRestartButton();
      // respawn and respawn bots
      player.x = 1; player.y = 1;
      spawnBotsForLevel(currentLevel === maps.easy ? "easy" : currentLevel === maps.medium ? "medium" : "hard");
      bullets = [];
      draw();
      lastUpdate = performance.now();
      requestAnimationFrame(loop);
    });
  } else restartBtn.style.display = "inline-block";
}

function hideRestartButton() { if (restartBtn) restartBtn.style.display = "none"; }

// player movement & control + shoot F
document.addEventListener("keydown", (e) => {
  if (!gameActive || !currentLevel) return;

  let nx = player.x, ny = player.y;
  if (e.key === "ArrowUp") { ny--; player.lastDir = {x:0,y:-1}; }
  if (e.key === "ArrowDown") { ny++; player.lastDir = {x:0,y:1}; }
  if (e.key === "ArrowLeft") { nx--; player.lastDir = {x:-1,y:0}; }
  if (e.key === "ArrowRight") { nx++; player.lastDir = {x:1,y:0}; }

  if (e.key.toLowerCase() === "f") {
    // shoot
    playerShoot();
    return;
  }

  if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
    player.x = nx; player.y = ny;
    // if step on water -> die
    if (currentLevel.tiles[ny][nx] !== 0) { // всё, что не трава
  onPlayerDied();
}
    draw();
  }
});

// prevent default arrow keys scrolling
window.addEventListener("keydown", function(e) {
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.key) > -1) e.preventDefault();
}, false);

function playerShoot() {
  if (!gameActive || !currentLevel) return;

  // стреляет ТОЛЬКО вправо
  const dir = { x: 1, y: 0 };

  bullets.push({
    x: player.x + 0.5 + 0.4, // сдвиг вперёд
    y: player.y + 0.5,
    dx: 1,
    dy: 0,
    speed: 8.0,
    owner: "player",
    ttl: 1500
  });
}

// small safety: if bots array modified elsewhere, ensure hp default
function normalizeBotsHp() {
  bots.forEach(b => { if (typeof b.hp === "undefined") b.hp = 3; });
}

// initial draw if you want a preview
if (currentLevel) draw();
