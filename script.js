import TileEngine from "./engine.js";

// ================== SETUP ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileEngine = new TileEngine(ctx, 64);
let lastTime = performance.now();

// ================== PLAYER ==================
const player = {
  image: new Image(),
  x: 200,
  y: 200,
  width: 64,
  height: 64,
};

function setPlayerSpawn(col, row) {
  const pos = tileEngine.gridToPixel(col, row);
  player.x = pos.x;
  player.y = pos.y;
}

function getPlayerHitbox(px, py) {
  return {
    left: px + 15,
    right: px + player.width - 17,
    top: py + 13,
    bottom: py + 55,
  };
}

// ================== CONTROLS ==================
const keys = {};
let debugMode = false;

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  // toggle debug
  if (e.key.toLowerCase() === "h") debugMode = !debugMode;

  // handle talking
  if (e.key.toLowerCase() === "e") {
    if (currentDialogNPC) {
      if (!dialogActive) {
        // start dialog
        dialogActive = true;
        dialogIndex = 0;
      } else {
        // advance dialog
        dialogIndex++;
        if (dialogIndex >= currentDialogNPC.dialog.length) {
          dialogActive = false; // close dialog
        }
      }
    }
  }
});

window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

// ================== NPC SYSTEM ==================
class NPC {
  constructor(x, y, spritePath, dialog = []) {
    this.image = new Image();
    this.image.src = spritePath;
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;
    this.dialog = dialog; // array of strings
  }

  draw(ctx, offsetX, offsetY) {
    ctx.drawImage(
      this.image,
      this.x - offsetX,
      this.y - offsetY,
      this.width,
      this.height
    );
  }

  getHitbox() {
    return {
      left: this.x + 15,
      right: this.x + this.width - 17,
      top: this.y + 13,
      bottom: this.y + 55,
    };
  }
}

const npcs = [];
function addNPC(col, row, spritePath, dialog = []) {
  const pos = tileEngine.gridToPixel(col, row);
  const npc = new NPC(pos.x, pos.y, spritePath, dialog);
  npcs.push(npc);
  return npc;
}

// ================== COLLISION ==================
function isSolidTile(tileId) {
  return tileId === 2 || tileId === 3 || tileId === 10;
}

function canMoveTo(newX, newY) {
  if (dialogActive) return false; // prevent movement while dialog active

  const hitbox = getPlayerHitbox(newX, newY);
  const corners = [
    { x: hitbox.left, y: hitbox.top },
    { x: hitbox.right, y: hitbox.top },
    { x: hitbox.left, y: hitbox.bottom },
    { x: hitbox.right, y: hitbox.bottom },
  ];

  for (const c of corners) {
    const tileId = tileEngine.getTileAt("map1", c.x, c.y);
    if (isSolidTile(tileId)) return false;
  }

  for (const npc of npcs) {
    const hb = npc.getHitbox();
    if (
      hitbox.right > hb.left &&
      hitbox.left < hb.right &&
      hitbox.bottom > hb.top &&
      hitbox.top < hb.bottom
    ) {
      return false;
    }
  }

  return true;
}

// ================== GAME LOGIC ==================
function updatePlayerMovement(dt) {
  const speed = 250;
  let dx = 0;
  let dy = 0;

  if (keys["w"]) dy -= 1;
  if (keys["s"]) dy += 1;
  if (keys["a"]) dx -= 1;
  if (keys["d"]) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  const newX = player.x + dx * speed * dt;
  const newY = player.y + dy * speed * dt;

  if (canMoveTo(newX, player.y)) player.x = newX;
  if (canMoveTo(player.x, newY)) player.y = newY;
}

// ================== DIALOG STATE ==================
let dialogActive = false;
let currentDialogNPC = null;
let dialogIndex = 0;

// ================== GAME LOOP ==================
function gameLoop(now = performance.now()) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  updatePlayerMovement(dt);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Camera center
  const offsetX = player.x - canvas.width / 2 + player.width / 2;
  const offsetY = player.y - canvas.height / 2 + player.height / 2;

  // Draw map
  tileEngine.drawMap("map1", offsetX, offsetY);

  // Draw NPCs
  npcs.forEach((npc) => npc.draw(ctx, offsetX, offsetY));

  // Draw player
  ctx.drawImage(
    player.image,
    canvas.width / 2 - player.width / 2,
    canvas.height / 2 - player.height / 2,
    player.width,
    player.height
  );

  // ================== NPC Interaction check ==================
  if (!dialogActive) {
    currentDialogNPC = null;
    const playerHb = getPlayerHitbox(player.x, player.y);
    npcs.forEach((npc) => {
      const hb = npc.getHitbox();
      const distX = Math.abs(playerHb.left + (playerHb.right - playerHb.left)/2 - (hb.left + (hb.right - hb.left)/2));
      const distY = Math.abs(playerHb.top + (playerHb.bottom - playerHb.top)/2 - (hb.top + (hb.bottom - hb.top)/2));
      if (distX < 50 && distY < 50) {
        currentDialogNPC = npc;
      }
    });

    if (currentDialogNPC) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(canvas.width / 2 - 60, canvas.height / 2 - 100, 120, 30);
      ctx.fillStyle = "white";
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Press E to talk", canvas.width / 2, canvas.height / 2 - 80);
    }
  }

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let testLine = "";
  let testWidth = 0;

  for (let n = 0; n < words.length; n++) {
    testLine = line + words[n] + " ";
    testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}


// ================== DIALOG BOX ==================
  if (dialogActive && currentDialogNPC) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(50, canvas.height - 150, canvas.width - 100, 100);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, canvas.height - 150, canvas.width - 100, 100);

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";

    wrapText(
      ctx,
      currentDialogNPC.dialog[dialogIndex],
      70,
      canvas.height - 120,
      canvas.width - 140,
      22
    );
  }

  requestAnimationFrame(gameLoop);
}

// ================== INITIALIZE ==================
async function loadTiles() {
  await tileEngine.registerTile(1, "textures/grass.png");
  await tileEngine.registerTile(2, "textures/water.png");
  await tileEngine.registerTile(3, "textures/stone.png");
  await tileEngine.registerTile(4, "textures/path2.png");
  await tileEngine.registerTile(10, "textures/DebugWall.png");
  await tileEngine.registerTile(20, "textures/grass.png");

  const map = [
    [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 ,10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 10],
    [10, 20, 4, 4, 4, 4, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10],
    [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10 ,10 ],
  ];
  tileEngine.defineMap("map1", map);

  // Add NPC with custom dialog
  addNPC(5, 2, "textures/NPC.png", [
  "Good Night Traveler!",
  "I'm so happy it finally works",
  "*it only took 2 hours 😭*"
  ]);

  gameLoop();
}

setPlayerSpawn(2, 2);

player.image.onload = () => loadTiles();
player.image.src = "textures/player.png";