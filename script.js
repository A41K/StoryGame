const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const keys = {};
window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// Player with hitbox
const player = {
  x: 0,
  y: 0,
  width: 64, // actual sprite size
  height: 64,
  speed: 350,
  image: new Image(),
  // hitbox is smaller than the sprite -> feels better
  hitbox: {
    offsetX: 16,
    offsetY: 32,
    width: 32,
    height: 32,
  },
};
player.image.src = "character.png";

const tileEngine = new TileEngine(ctx, 64);

// Map
const worldMap = [
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
];

async function loadGameAssets() {
  // grass = walkable, water + stone = solid
  await tileEngine.registerTile(1, "grass.png", false);
  await tileEngine.registerTile(2, "water.png", true);  // solid
  await tileEngine.registerTile(3, "stone.png", true); // solid

  tileEngine.defineMap("map1", worldMap);

  // Center player in world
  const { worldWidth, worldHeight } = tileEngine.getCenteredOffset("map1");
  player.x = worldWidth / 2 - player.width / 2;
  player.y = worldHeight / 2 - player.height / 2;
}

// Get absolute hitbox rectangle
function getHitboxRect() {
  return {
    x: player.x + player.hitbox.offsetX,
    y: player.y + player.hitbox.offsetY,
    width: player.hitbox.width,
    height: player.hitbox.height,
  };
}

function updatePlayerMovement(deltaTime) {
  let dx = 0,
    dy = 0;

  // Arrow keys + WASD
  if (keys["ArrowUp"] || keys["KeyW"]) dy -= 1;
  if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
  if (keys["ArrowLeft"] || keys["KeyA"]) dx -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy); // diagonal normalization
    dx /= len;
    dy /= len;
  }

  const hitbox = getHitboxRect();

  // Predict future hitbox position
  const nextX = hitbox.x + dx * player.speed * deltaTime;
  const nextY = hitbox.y + dy * player.speed * deltaTime;

  // Check collision with solid tiles
  if (
    !tileEngine.checkCollision(
      "map1",
      nextX,
      hitbox.y,
      hitbox.width,
      hitbox.height
    )
  ) {
    player.x += dx * player.speed * deltaTime;
  }
  if (
    !tileEngine.checkCollision(
      "map1",
      hitbox.x,
      nextY,
      hitbox.width,
      hitbox.height
    )
  ) {
    player.y += dy * player.speed * deltaTime;
  }

  // Clamp inside map
  const { worldWidth, worldHeight } = tileEngine.getCenteredOffset("map1");
  player.x = Math.max(0, Math.min(player.x, worldWidth - player.width));
  player.y = Math.max(0, Math.min(player.y, worldHeight - player.height));
}

let lastTime = performance.now();
function gameLoop(now = performance.now()) {
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  updatePlayerMovement(deltaTime);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { offsetX, offsetY } = tileEngine.getCenteredOffset("map1");
  tileEngine.drawMap("map1", -offsetX, -offsetY);

  // Draw player
  ctx.drawImage(
    player.image,
    player.x + offsetX,
    player.y + offsetY,
    player.width,
    player.height
  );

  // 🔹 DEBUG: Draw hitbox outline (optional)
  const hb = getHitboxRect();
  ctx.strokeStyle = "red";
  ctx.strokeRect(hb.x + offsetX, hb.y + offsetY, hb.width, hb.height);

  requestAnimationFrame(gameLoop);
}

Promise.all([
  new Promise((res) => (player.image.onload = res)),
  loadGameAssets(),
]).then(() => gameLoop());