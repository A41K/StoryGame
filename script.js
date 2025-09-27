import TileEngine from "./engine.js";

// ================== SETUP ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileEngine = new TileEngine(ctx, 64);
let lastTime = performance.now();

let currentMap = "map1";

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

  if (e.key.toLowerCase() === "e") {
    if (currentDialogNPC) {
      if (!dialogActive) {
        dialogActive = true;
        dialogIndex = 0;
      } else {
        dialogIndex++;
        if (dialogIndex >= currentDialogNPC.dialog.length) {
          dialogActive = false;
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
    this.dialog = dialog;
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

// ================== MAP-BASED NPC SYSTEM ==================
// Store NPCs per map
const mapNPCs = {};

// Adds an NPC to a specific map
function addNPC(mapId, col, row, spritePath, dialog = []) {
  const pos = tileEngine.gridToPixel(col, row);
  if (!mapNPCs[mapId]) mapNPCs[mapId] = [];
  const npc = new NPC(pos.x, pos.y, spritePath, dialog);
  mapNPCs[mapId].push(npc);
  return npc;
}

// ================== COLLISION ==================
function isSolidTile(tileId) {
  return tileId === 2 || tileId === 3 || tileId === 100 || tileId === 101 || tileId === 5 || tileId === 6 || tileId === 10;
}

function canMoveTo(newX, newY) {
  if (dialogActive) return false;

  const hitbox = getPlayerHitbox(newX, newY);
  const corners = [
    { x: hitbox.left, y: hitbox.top },
    { x: hitbox.right, y: hitbox.top },
    { x: hitbox.left, y: hitbox.bottom },
    { x: hitbox.right, y: hitbox.bottom },
  ];

  for (const c of corners) {
    const tileId = tileEngine.getTileAt(currentMap, c.x, c.y);
    if (isSolidTile(tileId)) return false;
  }

  for (const npc of mapNPCs[currentMap] || []) {
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

  checkWaypointTrigger();
}

// ================== DIALOG STATE ==================
let dialogActive = false;
let currentDialogNPC = null;
let dialogIndex = 0;

// ================== WAYPOINT SYSTEM ==================
const waypoints = [
  {
    fromMap: "map1",
    tile: { col: 9, row: 2 },
    to: { map: "map_house", col: 5, row: 6},
  },
  {
    fromMap: "map_house",
    tile: { col: 5, row: 7 },
    to: { map: "map1", col: 9, row: 3 },
  },
    {
    fromMap: "map1",
    tile: { col: 6, row: 9 },
    to: { map: "map2", col: 6, row: 2  },
  },
      {
    fromMap: "map2",
    tile: { col: 6, row: 1 },
    to: { map: "map1", col: 6, row: 8  },
  },
];

function checkWaypointTrigger() {
  const hb = getPlayerHitbox(player.x, player.y);
  const centerX = (hb.left + hb.right) / 2;
  const centerY = (hb.top + hb.bottom) / 2;
  const { col, row } = tileEngine.pixelToGrid(centerX, centerY);

  for (const wp of waypoints) {
    if (wp.fromMap === currentMap) {
      if (wp.tile.col === col && wp.tile.row === row) {
        currentMap = wp.to.map;
        setPlayerSpawn(wp.to.col, wp.to.row);
        break;
      }
    }
  }
}

// ================== GAME LOOP ==================
function gameLoop(now = performance.now()) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  updatePlayerMovement(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const offsetX = player.x - canvas.width / 2 + player.width / 2;
  const offsetY = player.y - canvas.height / 2 + player.height / 2;
  tileEngine.drawMap(currentMap, offsetX, offsetY);
if (mapNPCs[currentMap]) {
  mapNPCs[currentMap].forEach((npc) => npc.draw(ctx, offsetX, offsetY));
}
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

  for (const npc of mapNPCs[currentMap] || []) {
    const hb = npc.getHitbox();
    const distX =
      Math.abs(
        (playerHb.left + playerHb.right) / 2 -
        (hb.left + hb.right) / 2
      );
    const distY =
      Math.abs(
        (playerHb.top + playerHb.bottom) / 2 -
        (hb.top + hb.bottom) / 2
      );

    if (distX < 60 && distY < 60) { 
      currentDialogNPC = npc;
    }
  }

  if (currentDialogNPC) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(canvas.width / 2 - 60, canvas.height / 2 - 100, 120, 30);
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Press E to talk", canvas.width / 2, canvas.height / 2 - 80);
  }
}

if (dialogActive && currentDialogNPC) {
  const text = currentDialogNPC.dialog[dialogIndex] || "";

  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(50, canvas.height - 150, canvas.width - 100, 100);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, canvas.height - 150, canvas.width - 100, 100);

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.textAlign = "left";

  wrapText(ctx, text, 70, canvas.height - 120, canvas.width - 140, 22);
}
  requestAnimationFrame(gameLoop);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;
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

// ================== INITIALIZE ==================
async function loadTiles() {
  const promises = [];
  const register = (id, path) => promises.push(tileEngine.registerTile(id, path));

  // Main tiles
  register(1, "textures/grass.png");
  register(2, "textures/water.png");
  register(3, "textures/stone.png");
  register(4, "textures/path2.png");
  register(5, "textures/wood.png");
  register(6, "textures/tree.png");
  register(7, "textures/bush.png");
  register(8, "textures/rug-bottom.png");
  register(9, "textures/rug-top.png");
  register(10, "textures/desk.png");
  register(11, "textures/bed-bottom.png");
  register(12, "textures/bed-top.png");

  // Misc
  register(20, "textures/grass.png");
  register(30, "textures/teleport.jpg");
  register(31, "textures/door-bottom.png");
  register(32, "textures/door-top.png");
  register(33, "textures/house-inside.png");
  register(34, "textures/door-left.png");
  register(35, "textures/door-right.png");
  register(36, "textures/door-right-green.png");
  register(37, "textures/door-top-path.png");

  // Debug
  register(100, "textures/DebugWall.png");
  register(101, "textures/InvWall.png");
  register(102, "textures/NoCollisonInv.png");

  // Wait for ALL images at once
  await Promise.all(promises);

  // Map 1
  const map1 = [
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
    [100, 1, 1, 1, 1, 7, 1, 1, 5, 5, 5, 100],
    [100, 1, 6, 1, 1, 1, 6, 1, 5, 37, 5, 100],
    [100, 1, 1, 7, 1, 1, 1, 1, 6, 4, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 7, 1, 4, 1, 100],
    [100, 20, 4, 4, 4, 4, 4, 4, 4, 4, 1, 100],
    [100, 1, 1, 1, 1, 4, 7, 1, 1, 1, 1, 100],
    [100, 1, 1, 6, 1, 4, 4, 1, 1, 1, 6, 100],
    [100, 1, 7, 1, 1, 7, 4, 6, 1, 1, 1, 100],
    [100, 1, 6, 1, 1, 1, 4, 1, 1, 7, 1, 100],
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
  ];
  tileEngine.defineMap("map1", map1);

  // Map 2 (simple room)
  const map2 = [
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
    [100, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
  ];
  tileEngine.defineMap("map2", map2);

  // House interior
  const map_house = [
    [101, 100, 100, 100, 100, 100, 100, 100, 100, 100, 101],
    [100, 5, 5, 5, 5, 5, 5, 5, 5, 5, 100],
    [100, 5, 33, 10, 33, 33, 33, 33, 12, 5, 100],
    [100, 5, 8, 33, 33, 33, 33, 33, 11, 5, 100],
    [100, 5, 9, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 33, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 33, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 5, 5, 5, 32, 5, 5, 5, 5, 100],
  ];
  tileEngine.defineMap("map_house", map_house);


// NPC on map_house
addNPC("map_house", 3, 2, "textures/House-NPC.png", [
  "Hello Traveler!",
  "I was just working. What brings you here?",
]);
gameLoop();
}

setPlayerSpawn(2, 5);

player.image.onload = () => loadTiles();
player.image.src = "textures/player.png";