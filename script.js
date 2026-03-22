const game = document.getElementById("game");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");

const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");
const restartBtn = document.getElementById("restartBtn");

/* ===== FORCE UI ===== */
overlay.style.display = "none";

/* ===== SETTINGS ===== */
const size = 360;
const rows = 12;
const cols = 12;
const cellSize = size / cols;

const ballSize = 18;
const goalSize = 16;

let grid = [],
  walls = [];
let ball, goal;

/* Physics */
let x = 0,
  y = 0;
let vx = 0,
  vy = 0;
let tiltX = 0,
  tiltY = 0;

let running = false;
let loopId = null;
let startTime = 0;
let hasMoved = false;

/* Physics tuning */
const friction = 0.98;
const accel = 0.25;
const maxSpeed = 6;

/* ===== BEST ===== */
let best = localStorage.getItem("best");
if (best) bestEl.innerText = best + "s";

/* ===== START ===== */
startBtn.onclick = async () => {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    const p = await DeviceOrientationEvent.requestPermission();
    if (p !== "granted") return;
  }

  window.addEventListener("deviceorientation", (e) => {
    tiltX = e.gamma || 0;
    tiltY = e.beta || 0;
  });

  startBtn.style.display = "none";
  startGame();
};
game.innerHTML = "";
walls = [];
createMaze();
/* ===== START GAME ===== */
function startGame() {
  overlay.style.display = "none";

  if (loopId) cancelAnimationFrame(loopId);

  running = false;
  hasMoved = false;

  vx = 0;
  vy = 0;

  createEntities();

  /* centered start */
  x = (cellSize - ballSize) / 2;
  y = (cellSize - ballSize) / 2;

  startTime = Date.now();
  running = true;

  loop();
}

/* ===== MAZE ===== */
function createMaze() {
  grid = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        visited: false,
        walls: { t: true, r: true, b: true, l: true },
      };
    }
  }

  generate(0, 0);

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      let px = c * cellSize;
      let py = r * cellSize;

      if (cell.walls.t) addWall(px, py, cellSize, 3);
      if (cell.walls.l) addWall(px, py, 3, cellSize);
      if (cell.walls.r) addWall(px + cellSize, py, 3, cellSize);
      if (cell.walls.b) addWall(px, py + cellSize, cellSize, 3);
    });
  });
}

function generate(r, c) {
  grid[r][c].visited = true;

  let dirs = shuffle([
    ["t", -1, 0],
    ["r", 0, 1],
    ["b", 1, 0],
    ["l", 0, -1],
  ]);

  for (let [d, dr, dc] of dirs) {
    let nr = r + dr,
      nc = c + dc;

    if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !grid[nr][nc].visited) {
      grid[r][c].walls[d] = false;

      if (d === "t") grid[nr][nc].walls.b = false;
      if (d === "r") grid[nr][nc].walls.l = false;
      if (d === "b") grid[nr][nc].walls.t = false;
      if (d === "l") grid[nr][nc].walls.r = false;

      generate(nr, nc);
    }
  }
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function addWall(x, y, w, h) {
  let d = document.createElement("div");
  d.className = "wall";
  d.style.left = x + "px";
  d.style.top = y + "px";
  d.style.width = w + "px";
  d.style.height = h + "px";
  game.appendChild(d);

  walls.push({ x, y, w, h });
}

/* ===== ENTITIES ===== */
function createEntities() {
  ball = document.createElement("div");
  ball.className = "ball";
  game.appendChild(ball);

  goal = document.createElement("div");
  goal.className = "goal";

  const gx = (cols - 1) * cellSize + (cellSize - goalSize) / 2;
  const gy = (rows - 1) * cellSize + (cellSize - goalSize) / 2;

  goal.style.left = gx + "px";
  goal.style.top = gy + "px";

  game.appendChild(goal);
}

/* ===== LOOP ===== */
function loop() {
  if (!running) return;

  update();
  render();
  updateTime();
  checkWin();

  loopId = requestAnimationFrame(loop);
}

/* ===== ADVANCED PHYSICS ===== */
function update() {
  let prevX = x;
  let prevY = y;

  /* acceleration */
  vx += tiltX * accel;
  vy += tiltY * accel;

  /* friction */
  vx *= friction;
  vy *= friction;

  /* cap speed */
  vx = Math.max(-maxSpeed, Math.min(maxSpeed, vx));
  vy = Math.max(-maxSpeed, Math.min(maxSpeed, vy));

  let nextX = x + vx;
  let nextY = y + vy;

  /* X movement */
  if (!collide(nextX, y)) {
    x = nextX;
  } else {
    vx = 0;
  }

  /* Y movement */
  if (!collide(x, nextY)) {
    y = nextY;
  } else {
    vy = 0;
  }

  /* bounds */
  x = Math.max(0, Math.min(size - ballSize, x));
  y = Math.max(0, Math.min(size - ballSize, y));

  /* movement detection */
  if (Math.abs(x - prevX) > 0.3 || Math.abs(y - prevY) > 0.3) {
    hasMoved = true;
  }
}

/* collision */
function collide(px, py) {
  return walls.some(
    (w) =>
      px < w.x + w.w &&
      px + ballSize > w.x &&
      py < w.y + w.h &&
      py + ballSize > w.y,
  );
}

/* ===== RENDER ===== */
function render() {
  ball.style.left = x + "px";
  ball.style.top = y + "px";
}

/* ===== TIMER ===== */
function updateTime() {
  let t = (Date.now() - startTime) / 1000;
  timeEl.innerText = t.toFixed(2);
}

/* ===== WIN ===== */
function checkWin() {
  if (!hasMoved) return;

  const gx = (cols - 1) * cellSize + (cellSize - goalSize) / 2;
  const gy = (rows - 1) * cellSize + (cellSize - goalSize) / 2;

  if (
    x < gx + goalSize &&
    x + ballSize > gx &&
    y < gy + goalSize &&
    y + ballSize > gy
  ) {
    running = false;

    let t = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!best || t < best) {
      best = t;
      localStorage.setItem("best", t);
      bestEl.innerText = t + "s";
    }

    overlay.style.display = "flex";
  }
}

/* ===== RESTART ===== */
restartBtn.onclick = () => {
  overlay.style.display = "none";
  running = false;

  setTimeout(() => {
    startGame();
  }, 50);
};
