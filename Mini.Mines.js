const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const timerElem = document.getElementById('timer');
const minesElem = document.getElementById('minesCount');
const logoElem = document.getElementById('logo');
const winBox = document.getElementById('winBox');
const winRestart = document.getElementById('winRestart');

const TILE_SIZE = 40;
const ROWS = 10;
const COLS = 10;
let TOTAL_MINES = 15;

let tiles = [];
let player = {x:0, y:0};
let monsters = [];
let openCount = 0;
let gameOver = false;
let killEnergy = 0;
let deathTile = null;
let placingFlag = false;
let removingFlag = false;
let elapsedTime = 0;
let timerInterval;

// --- Инициализация игры ---
function initGame() {
  tiles = [];
  player = {x:0, y:0};
  monsters = [];
  openCount = 0;
  gameOver = false;
  killEnergy = 0;
  deathTile = null;
  placingFlag = false;
  removingFlag = false;
  elapsedTime = 0;

  clearInterval(timerInterval);
  timerInterval = setInterval(()=> {
    elapsedTime++;
    timerElem.textContent = "Time: "+elapsedTime+"s";
  },1000);

  for(let y=0; y<ROWS; y++){
    tiles[y] = [];
    for(let x=0; x<COLS; x++){
      tiles[y][x] = {bomb:false, open:false, wall:false, color:null, count:0, safeFlag:false};
    }
  }

  const safeCoords = [[0,0],[1,0],[0,1],[1,1],[0,2]];

  let minesPlaced = 0;
  while(minesPlaced<TOTAL_MINES){
    let rx = Math.floor(Math.random()*COLS);
    let ry = Math.floor(Math.random()*ROWS);
    if(!tiles[ry][rx].bomb && !safeCoords.some(([sx,sy])=>sx===rx && sy===ry)){
      const nearStart = safeCoords.some(([sx,sy])=>Math.abs(sx-rx)<=1 && Math.abs(sy-ry)<=1);
      if(nearStart) continue;
      tiles[ry][rx].bomb = true;
      minesPlaced++;
    }
  }

  for(let y=0; y<ROWS; y++){
    for(let x=0; x<COLS; x++){
      let count = 0;
      for(let dy=-1; dy<=1; dy++){
        for(let dx=-1; dx<=1; dx++){
          if(dx===0 && dy===0) continue;
          const nx = x+dx, ny = y+dy;
          if(nx>=0 && nx<COLS && ny>=0 && ny<ROWS && tiles[ny][nx].bomb) count++;
        }
      }
      tiles[y][x].count = count;
      if(count===0) tiles[y][x].color='gray';
      else if(count===1) tiles[y][x].color='blue';
      else if(count===2) tiles[y][x].color='yellow';
      else tiles[y][x].color='red';
    }
  }

  for(let i=0;i<safeCoords.length;i++){
    const [sx,sy] = safeCoords[i];
    tiles[sy][sx].open = true;
    tiles[sy][sx].color = 'gray';
    openCount++;
  }

  minesElem.textContent = "Mines: "+TOTAL_MINES;
  document.getElementById('restartBtn').style.display = 'none';
  winBox.style.display = 'none';
  logoElem.classList.remove('win-anim');
}

function checkWin(){
  let allSafeOpened = true;
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      const t = tiles[y][x];
      if(!t.bomb && !t.open){
        allSafeOpened = false;
        break;
      }
    }
    if(!allSafeOpened) break;
  }

  if(allSafeOpened){
    handleWin();
  }
}

function handleWin(){
  gameOver = true;
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(tiles[y][x].bomb){
        tiles[y][x].open = true;
        tiles[y][x].color = 'orange';
      }
    }
  }

  logoElem.classList.add('win-anim');

  setTimeout(()=>{
    winBox.style.display = 'block';
    document.getElementById('restartBtn').style.display = 'block';
  }, 900);
}

function openTile(x,y){
  const t = tiles[y][x];
  if(t.open || t.wall || t.safeFlag) return;
  t.open = true;
  openCount++;
  if(t.bomb){
    gameOver = true;
    deathTile = {x,y};
    for(let yy=0; yy<ROWS; yy++){
      for(let xx=0; xx<COLS; xx++){
        if(tiles[yy][xx].bomb){
          tiles[yy][xx].open = true;
          tiles[yy][xx].color = 'orange';
        }
      }
    }
    document.getElementById('restartBtn').style.display = 'block';
    return;
  }

  if(openCount % 10 === 0) spawnMonster();
  if(openCount % 20 === 0) killEnergy++;

  checkWin();
}

function spawnMonster(){ monsters.push({x:COLS-1, y:ROWS-1}); }

setInterval(()=>{
  if(gameOver) return;
  monsters.forEach(monster=>{
    let dx = player.x - monster.x;
    let dy = player.y - monster.y;
    if(Math.abs(dx) > Math.abs(dy)){
      let nx = monster.x + Math.sign(dx);
      if(nx>=0 && nx<COLS && !tiles[monster.y][nx].wall) monster.x = nx;
    } else {
      let ny = monster.y + Math.sign(dy);
      if(ny>=0 && ny<ROWS && !tiles[ny][monster.x].wall) monster.y = ny;
    }
    if(monster.x===player.x && monster.y===player.y){
      gameOver = true;
      for(let yy=0; yy<ROWS; yy++){
        for(let xx=0; xx<COLS; xx++){
          if(tiles[yy][xx].bomb){
            tiles[yy][xx].open = true;
            tiles[yy][xx].color = 'orange';
          }
        }
      }
      document.getElementById('restartBtn').style.display='block';
    }
  });
},5000);

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0; y<ROWS; y++){
    for(let x=0; x<COLS; x++){
      let t = tiles[y][x];
      let color = t.open ? t.color : 'black';
      if(t.wall) color='#555';
      if(deathTile && x===deathTile.x && y===deathTile.y) color='orange';
      if(t.safeFlag && !t.open) color='darkgray';
      ctx.fillStyle=color;
      ctx.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE-2, TILE_SIZE-2);

      if(t.safeFlag && !t.open){
        ctx.fillStyle = '#222';
        ctx.fillRect(x*TILE_SIZE+12, y*TILE_SIZE+8, 6, 12);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x*TILE_SIZE+16, y*TILE_SIZE+8, 10, 6);
      }
    }
  }

  ctx.fillStyle='purple';
  ctx.fillRect(player.x*TILE_SIZE+5, player.y*TILE_SIZE+5, TILE_SIZE-10, TILE_SIZE-10);

  ctx.fillStyle='green';
  monsters.forEach(monster=>{
    ctx.fillRect(monster.x*TILE_SIZE+5, monster.y*TILE_SIZE+5, TILE_SIZE-10, TILE_SIZE-10);
  });

  requestAnimationFrame(draw);
}

document.addEventListener('keydown', e=>{
  if(gameOver) return;

  if(e.key.toLowerCase() === 'f'){ placingFlag = true; return; }

  if(placingFlag){
    let fx = player.x;
    let fy = player.y;
    const k = e.key.toLowerCase();
    if(k === 'w') fy--;
    else if(k === 's') fy++;
    else if(k === 'a') fx--;
    else if(k === 'd') fx++;
    else return;

    if(fx>=0 && fx < COLS && fy>=0 && fy<ROWS){
      let t = tiles[fy][fx];
      if(!t.open && !t.wall) t.safeFlag = true;
    }
    placingFlag = false;
    return;
  }

  if(e.key.toLowerCase() === 'g'){ removingFlag = true; return; }

  if(removingFlag){
    let fx = player.x;
    let fy = player.y;
    const k = e.key.toLowerCase();
    if(k === 'w') fy--;
    else if(k === 's') fy++;
    else if(k === 'a') fx--;
    else if(k === 'd') fx++;
    else return;

    if(fx>=0 && fx < COLS && fy>=0 && fy<ROWS){
      tiles[fy][fx].safeFlag = false;
    }
    removingFlag = false;
    return;
  }

  let nx = player.x;
  let ny = player.y;
  if(e.key === 'ArrowUp') ny--;
  if(e.key === 'ArrowDown') ny++;
  if(e.key === 'ArrowLeft') nx--;
  if(e.key === 'ArrowRight') nx++;

  if(nx>=0 && nx<COLS && ny>=0 && ny<ROWS && !tiles[ny][nx].wall){
    player.x = nx;
    player.y = ny;
    if(!tiles[ny][nx].safeFlag){
      openTile(nx, ny);
    }
  }

  if(e.key.toLowerCase() === 'e'){
    if(killEnergy>0 && monsters.length>0){
      monsters.pop();
      killEnergy--;
    }
  }
});

document.getElementById('restartBtn').addEventListener('click', ()=>{
  initGame();
  draw();
});

winRestart.addEventListener('click', ()=>{
  winBox.style.display = 'none';
  initGame();
  draw();
});

let countdownNum=15;
const countdownElem=document.getElementById('countdown');
const countdownInterval=setInterval(()=>{
  countdownElem.textContent = countdownNum;
  countdownNum--;
  if(countdownNum<0){
    clearInterval(countdownInterval);
    document.getElementById('overlay').style.opacity=0;
    setTimeout(()=>{
      document.getElementById('overlay').style.display='none';
      canvas.style.opacity=1;
      initGame();
      draw();
    },1000);
  }
},1000);
