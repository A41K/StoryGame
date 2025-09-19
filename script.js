const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const keys = {};
window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// --- Player (sprite + hitbox) ---
const player = {
  x: 0,
  y: 0,
  width: 64,
  height: 64,
  speed: 300,
  image: new Image(),
  hitbox: {
    offsetX: 16,
    offsetY: 32,
    width: 32,
    height: 32,
  },
};
player.image.src = "character.png";

// --- Engine ---
const engine = new TileEngine(ctx, 64);

// --- World definition ---
const worldMaps = {
  "0,0": [
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  "0,1": [
    [1,1,1,1,1,1,1,1,1],
    [1,1,3,3,3,3,3,1,1],
    [1,1,3,1,1,1,3,1,1],
    [1,1,3,1,2,1,3,1,1],
    [1,1,3,1,1,1,3,1,1],
    [1,1,3,3,3,3,3,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  "0,-1": [
    [1,1,2,2,2,1,1,1,1],
    [1,1,2,1,2,1,1,1,1],
    [1,1,2,1,2,1,1,1,1],
    [1,1,2,1,2,1,1,1,1],
    [1,1,2,1,2,1,1,1,1],
    [1,1,2,1,2,1,1,1,1],
    [1,1,2,2,2,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  "-1,0": [
    [1,1,1,3,3,3,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [3,3,3,3,3,3,3,3,3],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,3,3,3,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
  "1,0": [
    [1,1,1,3,3,3,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [3,3,3,3,3,3,3,3,3],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,1,3,1,1,1,1],
    [1,1,1,3,3,3,1,1,1],
    [1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1],
  ],
};

// --- Init game world ---
async function loadGame() {
  await engine.registerTile(1, "grass.png", false);
  await engine.registerTile(2, "water.png", true);
  await engine.registerTile(3, "stone.png", true);

  engine.defineWorld(worldMaps);

  // ✅ Create NPC image
  const npcImg = new Image();
  npcImg.src = "npc.png";
  await new Promise((res) => (npcImg.onload = res));

  // ✅ Add NPC to starter map (map_0_0)
  engine.addNpc("map_0_0", {
    x: 4 * 64,
    y: 2 * 64,
    width: 64,
    height: 64,
    image: npcImg,
    solid: true, // collide with player
  });

  // Place player in map center
  const { worldWidth, worldHeight } = engine.getWorldSize();
  player.x = worldWidth / 2 - player.width / 2;
  player.y = worldHeight / 2 - player.height / 2;
}

// --- Hitbox rect ---
function getHitboxRect(x = player.x, y = player.y) {
  return {
    x: x + player.hitbox.offsetX,
    y: y + player.hitbox.offsetY,
    width: player.hitbox.width,
    height: player.hitbox.height,
  };
}

// --- Movement + Map Switching ---
function update(deltaTime) {
  let dx = 0, dy = 0;
  if (keys["ArrowUp"] || keys["KeyW"]) dy -= 1;
  if (keys["ArrowDown"] || keys["KeyS"]) dy += 1;
  if (keys["ArrowLeft"] || keys["KeyA"]) dx -= 1;
  if (keys["ArrowRight"] || keys["KeyD"]) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len; dy /= len;
  }

  const hb = getHitboxRect();
  const nextX = hb.x + dx * player.speed * deltaTime;
  const nextY = hb.y + dy * player.speed * deltaTime;

  if (!engine.checkCollision(nextX, hb.y, hb.width, hb.height))
    player.x += dx * player.speed * deltaTime;
  if (!engine.checkCollision(hb.x, nextY, hb.width, hb.height))
    player.y += dy * player.speed * deltaTime;

  engine.tryMapSwitch(player);
}

// --- Game Loop ---
let last = performance.now();
function loop(now = performance.now()) {
  const dt = (now - last) / 1000;
  last = now;
  update(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Center map in canvas
  const { worldWidth, worldHeight } = engine.getWorldSize();
  const offsetX = (canvas.width - worldWidth) / 2;
  const offsetY = (canvas.height - worldHeight) / 2;

  engine.drawMap(-offsetX, -offsetY);
  engine.drawNpcs(-offsetX, -offsetY); // ✅ draw NPCs ABOVE tiles

  // Draw player
  ctx.drawImage(
    player.image,
    player.x + offsetX,
    player.y + offsetY,
    player.width,
    player.height
  );

  // Debug hitbox
  const hb = getHitboxRect();
  ctx.strokeStyle = "red";
  ctx.strokeRect(hb.x + offsetX, hb.y + offsetY, hb.width, hb.height);

  // HUD
  const text = `Map: ${engine.currentMapId}`;
  ctx.font = "20px Arial";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  const padding = 6;
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(canvas.width - textWidth - padding * 2 - 10, 10,
               textWidth + padding * 2, 26);
  ctx.fillStyle = "white";
  ctx.fillText(text, canvas.width - 10, 10);

  requestAnimationFrame(loop);
}

// --- Start ---
Promise.all([
  new Promise((res) => (player.image.onload = res)),
  loadGame(),
]).then(() => loop());

window.TileEngine = TileEngine;