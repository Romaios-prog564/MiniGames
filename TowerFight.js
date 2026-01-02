const menu = document.getElementById("menu");
const rules = document.getElementById("rules");
const rulesTimer = document.getElementById("rulesTimer");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID = 20;
const TILE = canvas.width / GRID;

let gameStarted = false;
let countdown = 15;

// ---------- MENU ----------
document.getElementById("soloBtn").addEventListener("click", () => {
  menu.style.display = "none";
  canvas.style.display = "block";
  startRules();
});

// ---------- RULES ----------
function startRules() {
  rules.style.display = "flex";
  countdown = 15;
  rulesTimer.textContent = countdown;

  const interval = setInterval(() => {
    countdown--;
    rulesTimer.textContent = countdown;
    if (countdown <= 0) {
      clearInterval(interval);
      rules.style.display = "none";
      startGame();
    }
  }, 1000);
}

// ---------- GAME OBJECTS ----------
const player = { x: 10, y: 18, hp: 200, alive: true };
const bot = { x: 10, y: 2, hp: 200, alive: true };
let bullets = [];

// ---------- BRIDGE ----------
let bridgeHP = 30;
let bridgeDestroyed = false;
const bridgeY = 10;

// ---------- CASTLES ----------
const castleWidth = 8;
const castleHeight = 3;

const playerCastle = { x: 6, y: 17, hp: 1500 };
const botCastle = { x: 6, y: 0, hp: 1500 };

// ---------- BOT ZONE ----------
const BOT_MIN_Y = botCastle.y + castleHeight;
const BOT_MAX_Y = bridgeY - 1;

// ---------- ENERGY GENERATORS ----------
function createGenerators(owner) {
  const y = owner === "player" ? GRID - 2 : 0;
  const hp = 300;
  if (owner === "player") {
    return [
      { x: 0, y, hp, alive: true, owner },
      { x: GRID - 2, y, hp, alive: true, owner }
    ];
  } else {
    return [
      { x: 0, y, hp, alive: true, owner },
      { x: GRID - 2, y, hp, alive: true, owner }
    ];
  }
}

const energyGenerators = {
  player: createGenerators("player"),
  bot: createGenerators("bot")
};

let playerCanShoot = true;
let playerCanHeal = true;
let botCanShoot = true;
let botCanHeal = true;

// ---------- START GAME ----------
function startGame() {
  gameStarted = true;
  chooseBotTarget();
  requestAnimationFrame(loop);

  setInterval(() => {
    if (gameStarted && bot.alive) botShoot();
  }, 300);
}

// ---------- SHOOT ----------
function shootPlayer() {
  if (!playerCanShoot) return;
  bullets.push({ x: player.x + 0.5, y: player.y, dx: 0, dy: -1, owner: "player" });
}

function botShoot() {
  if (!botCanShoot || !bot.alive) return;
  bullets.push({ x: bot.x + 0.5, y: bot.y + 1, dx: 0, dy: 1, owner: "bot" });
}

// ---------- INPUT ----------
document.addEventListener("keydown", e => {
  if (!gameStarted) return;
  if (e.key === "ArrowLeft") player.x--;
  if (e.key === "ArrowRight") player.x++;
  if (e.key === "ArrowUp") player.y--;
  if (e.key === "ArrowDown") player.y++;
  if (e.key.toLowerCase() === "f") shootPlayer();
  player.x = Math.max(0, Math.min(GRID - 1, player.x));
  player.y = Math.max(bridgeY + 1, Math.min(GRID - 1, player.y));
});

// ---------- HELPERS ----------
function rectHit(x, y, rect, w = castleWidth, h = castleHeight) {
  return x >= rect.x && x < rect.x + w && y >= rect.y && y < rect.y + h;
}

// ---------- UPDATE BULLETS ----------
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx * 0.25;
    b.y += b.dy * 0.25;
    const tx = Math.floor(b.x);
    const ty = Math.floor(b.y);

    if (b.y < 0 || b.y >= GRID) { bullets.splice(i, 1); continue; }

    // BRIDGE HIT
    if (!bridgeDestroyed && ty === bridgeY) {
      bridgeHP--;
      bullets.splice(i, 1);
      if (bridgeHP <= 0) bridgeDestroyed = true;
      continue;
    }

    // PLAYER HIT
    if (b.owner === "bot" && player.alive && tx === player.x && ty === player.y) {
      player.hp--;
      bullets.splice(i, 1);
      if (player.hp <= 0) respawnPlayer();
      continue;
    }

    // BOT HIT
    if (b.owner === "player" && bot.alive && tx === bot.x && ty === bot.y) {
      bot.hp--;
      bullets.splice(i, 1);
      if (bot.hp <= 0) despawnBot();
      continue;
    }

    // ENERGY GENERATORS HIT
    [...energyGenerators.player, ...energyGenerators.bot].forEach(g => {
      if (tx >= g.x && tx < g.x + 2 && ty >= g.y && ty < g.y + 2 && g.alive) {
        if ((b.owner === "player" && g.owner === "bot") || (b.owner === "bot" && g.owner === "player")) {
          g.hp -= 1; // урон за пулю
          bullets.splice(i, 1);

          if (g.hp <= 0) {
            g.alive = false;
            if (g.owner === "player") {
              alert("One of your generators is destroyed! Your shooting system is disabled for 10 seconds!");
              playerCanShoot = false;

              if (!energyGenerators.player.some(gen => gen.alive)) {
                playerCanHeal = false;
                alert("Your generators are destroyed!!! Your healing system is disabled!");
              }

              setTimeout(() => { playerCanShoot = true; }, 10000);
            } else {
              botCanShoot = false;
              if (!energyGenerators.bot.some(gen => gen.alive)) botCanHeal = false;
              setTimeout(() => { botCanShoot = true; }, 10000);
            }
          }
        }
      }
    });

    // CASTLE HIT
    if (b.owner === "player" && rectHit(tx, ty, botCastle)) {
      botCastle.hp--;
      bullets.splice(i, 1);
      if (botCastle.hp <= 0) { gameStarted = false; alert("YOU WIN!"); location.reload(); }
    }
    if (b.owner === "bot" && rectHit(tx, ty, playerCastle)) {
      playerCastle.hp--;
      bullets.splice(i, 1);
      if (playerCastle.hp <= 0) loseGame();
    }
  }
}

// ---------- BOT AI ----------
let botTarget = { x: bot.x, y: bot.y };
function chooseBotTarget() {
  if (!bot.alive) return;
  const rand = Math.random();
  if (rand < 0.5) {
    botTarget.x = player.x;
    botTarget.y = BOT_MIN_Y + Math.floor(Math.random() * (BOT_MAX_Y - BOT_MIN_Y + 1));
  } else if (rand < 0.7) {
    botTarget.x = playerCastle.x + Math.floor(Math.random() * castleWidth);
    botTarget.y = playerCastle.y - 1;
  } else {
    const aliveGenerators = energyGenerators.player.filter(g => g.alive);
    if (aliveGenerators.length > 0) {
      const g = aliveGenerators[Math.floor(Math.random() * aliveGenerators.length)];
      botTarget.x = g.x;
      botTarget.y = g.y;
    } else {
      botTarget.x = player.x;
      botTarget.y = BOT_MIN_Y + Math.floor(Math.random() * (BOT_MAX_Y - BOT_MIN_Y + 1));
    }
  }
}
setInterval(chooseBotTarget, 3000);
setInterval(moveBot, 300);

// ---------- RESPAWN & DESPAWN ----------
function despawnBot() {
  bot.alive = false;
  botCanShoot = false;
  botCanHeal = false;
  setTimeout(() => {
    bot.alive = true;
    bot.hp = 200;
    bot.x = 10;
    bot.y = 1;
    botCanShoot = true;
    botCanHeal = true;
    chooseBotTarget();
  }, 3000);
}

function respawnPlayer() {
  player.alive = false;
  player.hp = 200;
  playerCanShoot = false;
  playerCanHeal = false;
  setTimeout(() => {
    player.alive = true;
    player.x = playerCastle.x + Math.floor(castleWidth/2);
    player.y = playerCastle.y - 1;
    playerCanShoot = true;
    playerCanHeal = true;
  }, 3000);
}

// ---------- BOT MOVE ----------
function moveBot() {
  if (!bot.alive) return;
  const speed = 1;
  if (bot.x < botTarget.x) bot.x += speed;
  else if (bot.x > botTarget.x) bot.x -= speed;
  if (bot.y < BOT_MAX_Y && bot.y < botTarget.y) bot.y += speed;
  else if (bot.y > BOT_MIN_Y && bot.y > botTarget.y) bot.y -= speed;
  bot.x = Math.max(0, Math.min(GRID - 1, bot.x));
  bot.y = Math.max(BOT_MIN_Y, Math.min(BOT_MAX_Y, bot.y));
}

// ---------- LOSE ----------
function loseGame() { gameStarted = false; alert("YOU LOSE"); location.reload(); }

// ---------- DRAW ----------
function drawGenerators() {
  energyGenerators.player.forEach(g => drawGenerator(g));
  energyGenerators.bot.forEach(g => drawGenerator(g));
}

function drawGenerator(g) {
  ctx.fillStyle = g.alive ? "lime" : "darkred";
  ctx.fillRect(g.x * TILE, g.y * TILE, 2 * TILE, 2 * TILE);
  if (!g.alive) {
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(g.x * TILE, g.y * TILE);
    ctx.lineTo((g.x + 2) * TILE, (g.y + 2) * TILE);
    ctx.moveTo((g.x + 2) * TILE, g.y * TILE);
    ctx.lineTo(g.x * TILE, (g.y + 2) * TILE);
    ctx.stroke();
  }
  ctx.fillStyle = "white";
  ctx.font = "12px Arial";
  ctx.fillText(g.hp > 0 ? g.hp : 0, g.x * TILE + TILE/2, g.y * TILE + TILE);
}

function drawCastle(c) { ctx.fillRect(c.x * TILE, c.y * TILE, castleWidth * TILE, castleHeight * TILE); }

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGenerators();

  ctx.strokeStyle = "#222";
  for (let i = 0; i <= GRID; i++) {
    ctx.beginPath(); ctx.moveTo(i*TILE,0); ctx.lineTo(i*TILE,canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,i*TILE); ctx.lineTo(canvas.width,i*TILE); ctx.stroke();
  }

  if (!bridgeDestroyed) ctx.fillStyle = "gray", ctx.fillRect(0, bridgeY*TILE+6, canvas.width, TILE-12);

  ctx.fillStyle = "blue"; drawCastle(playerCastle);
  ctx.fillStyle = "darkred"; drawCastle(botCastle);

  if (player.alive) { ctx.fillStyle = "cyan"; ctx.fillRect(player.x*TILE, player.y*TILE, TILE, TILE); }
  if (bot.alive) { ctx.fillStyle = "red"; ctx.fillRect(bot.x*TILE, bot.y*TILE, TILE, TILE); }

  ctx.fillStyle = "white";
  bullets.forEach(b => ctx.fillRect(b.x*TILE-3, b.y*TILE-3, 6, 6));

  ctx.fillText("Player Castle: " + playerCastle.hp, 10, 20);
  ctx.fillText("Bot Castle: " + botCastle.hp, 10, 40);
  ctx.fillText("Bridge HP: " + bridgeHP, 10, 60);
  ctx.fillText("Player HP: " + player.hp.toFixed(0), 10, 80);
  ctx.fillText("Bot HP: " + bot.hp.toFixed(0), 10, 100);
}

// ---------- HEAL ----------
function playerHeal() {
  if (!playerCanHeal || !player.alive) return;
  if (player.x >= playerCastle.x && player.x < playerCastle.x + castleWidth &&
      player.y >= playerCastle.y && player.y < playerCastle.y + castleHeight) {
    if (energyGenerators.player.every(g => g.alive)) player.hp = Math.min(player.hp + 0.1, 200);
  }
}

function botHeal() {
  if (!botCanHeal || !bot.alive) return;
  if (bot.x >= botCastle.x && bot.x < botCastle.x + castleWidth &&
      bot.y >= botCastle.y && bot.y < botCastle.y + castleHeight) {
    if (energyGenerators.bot.every(g => g.alive)) bot.hp = Math.min(bot.hp + 0.1, 200);
  }
}

// ---------- LOOP ----------
function loop() {
  if (!gameStarted) return;
  updateBullets();
  playerHeal();
  botHeal();
  draw();
  requestAnimationFrame(loop);
}
