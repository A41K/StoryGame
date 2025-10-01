import TileEngine from "./engine.js";

// ================== SETUP ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileEngine = new TileEngine(ctx, 64);
let lastTime = performance.now();

let currentMap = "tutorialMap";

const player = {
  images: {
    idle: new Image(),
    left: new Image(),
    right: new Image(),
  },
  currentImg: null,
  x: 200,
  y: 200,
  width: 64,
  height: 64,
  name: "",
};

// load images
player.images.idle.src = "textures/player.png";
player.images.left.src = "textures/player-left.png";
player.images.right.src = "textures/player-right.png";

// default sprite
player.images.idle.onload = () => loadTiles();

// Prompt for name
player.name = prompt("Enter your name:", "Player") || "Player";

// ================== INVENTORY ==================
let inventory = new Array(27).fill(null); 
// null = empty slot, length 27 = 9x3
let inventoryOpen = false;

// ================== DRAGGING STATE ==================
let draggingItem = null;
let draggingIndex = -1;
let draggingOffsetX = 0;
let draggingOffsetY = 0;

// ================== PLAYER HELPERS ==================
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

const itemIcons = {};
function registerItem(name, path) {
  const img = new Image();
  img.src = path;
  itemIcons[name] = img;
}

// ================== ONE-TIME ITEM TRACKER ==================
const obtainedItems = new Set(); // keeps track of unique rewards

function giveItem(name, count = 1, once = false) {
  if (once && obtainedItems.has(name)) {
    console.log(`Item ${name} already obtained. Skipping.`);
    return;
  }

  console.log("Giving item:", name, "x", count);

  let existing = inventory.find((i) => i && i.name === name);
  if (existing) {
    existing.count += count;
  } else {
    let emptyIdx = inventory.findIndex((i) => i === null);
    if (emptyIdx !== -1) {
      inventory[emptyIdx] = {
        name,
        icon: itemIcons[name],
        count,
      };
    }
  }

  if (once) {
    obtainedItems.add(name);
  }
}

// Register example items BEFORE gameLoop starts
registerItem("Potion", "textures/Potion.png");
registerItem("Bed Leg", "textures/Bed-Leg.png");
registerItem("Mouse", "textures/mouse.png")

// ================== TOOLTIP ==================
function drawTooltip(ctx, text, x, y) {
  ctx.font = "16px Mojangles"; // funny mojangles font
  ctx.textAlign = "left";
  const padding = 6;
  const textWidth = ctx.measureText(text).width;

  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.fillRect(x, y - 28, textWidth + padding * 2, 32);

  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y - 28, textWidth + padding * 2, 32);

  ctx.fillStyle = "white";
  ctx.fillText(text, x + padding, y - 8);
}


// ================== MOUSE TRACKING ==================
let mouseX = 0,
  mouseY = 0;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

// ================== DRAGGING EVENTS ==================
canvas.addEventListener("mousedown", (e) => {
  if (!inventoryOpen) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const cols = 9,
    rows = 3;
  const slotSize = 40,
    padding = 6;
  const boxWidth = cols * (slotSize + padding) + padding;
  const boxHeight = rows * (slotSize + padding) + padding + 40;
  const startX = (canvas.width - boxWidth) / 2;
  const startY = (canvas.height - boxHeight) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const slotX = startX + padding + col * (slotSize + padding);
      const slotY = startY + 40 + row * (slotSize + padding);

      if (
        clickX >= slotX &&
        clickX <= slotX + slotSize &&
        clickY >= slotY &&
        clickY <= slotY + slotSize
      ) {
        if (inventory[index]) {
          draggingItem = inventory[index];
          draggingIndex = index;
          draggingOffsetX = clickX - slotX;
          draggingOffsetY = clickY - slotY;
          inventory[index] = null;
          return;
        }
      }
    }
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (!inventoryOpen || !draggingItem) return;

  const rect = canvas.getBoundingClientRect();
  const releaseX = e.clientX - rect.left;
  const releaseY = e.clientY - rect.top;

  const cols = 9,
    rows = 3;
  const slotSize = 40,
    padding = 6;
  const boxWidth = cols * (slotSize + padding) + padding;
  const boxHeight = rows * (slotSize + padding) + padding + 40;
  const startX = (canvas.width - boxWidth) / 2;
  const startY = (canvas.height - boxHeight) / 2;

  let placed = false;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col;
      const slotX = startX + padding + col * (slotSize + padding);
      const slotY = startY + 40 + row * (slotSize + padding);

      if (
        releaseX >= slotX &&
        releaseX <= slotX + slotSize &&
        releaseY >= slotY &&
        releaseY <= slotY + slotSize
      ) {
        if (inventory[index]) {
          // stack if same type
          if (inventory[index].name === draggingItem.name) {
            inventory[index].count += draggingItem.count;
          } else {
            // swap
            const temp = inventory[index];
            inventory[index] = draggingItem;
            inventory[draggingIndex] = temp;
          }
        } else {
          inventory[index] = draggingItem;
        }
        placed = true;
        break;
      }
    }
  }

  if (!placed) {
    inventory[draggingIndex] = draggingItem;
  }

  draggingItem = null;
  draggingIndex = -1;
});

// ================== CONTROLS ==================
const keys = {};
let debugMode = false;

window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (key === "h") debugMode = !debugMode;

  // Toggle inventory
  if (key === "i" && !dialogActive) {
    inventoryOpen = !inventoryOpen;
  }

  if (key === "e") {
    if (inventoryOpen) return;

    // Starting conversation
    if (!dialogActive) {
      if (currentDialogNPC && typeof currentDialogNPC.getDialogCopy === "function") {
        dialogActive = true;
        activeDialog = currentDialogNPC.getDialogCopy();
        dialogIndex = 0;
        currentChoices = null;
      }
      return; // if no NPC => do nothing
    }

    // Continuing conversation
    if (!currentDialogNPC || !activeDialog) {
      dialogActive = false;
      return;
    }

    const currentLine = activeDialog[dialogIndex];

    // ✅ guard: if dialogIndex points past array, end dialog
    if (!currentLine) {
      dialogActive = false;
      currentChoices = null;
      activeDialog = null;
      return;
    }

    if (typeof currentLine === "object" && currentLine.choices) {
      const chosen = currentLine.choices[selectedChoice];
      let outcome = [...chosen.outcome];

      // Split into funcs and others
      const funcs = outcome.filter(e => typeof e === "function");
      const others = outcome.filter(e => typeof e !== "function");

      // Run all functions immediately
      funcs.forEach(fn => fn());

      // Insert others (strings, nested choices) into dialog
      if (others.length > 0) {
        activeDialog.splice(dialogIndex + 1, 0, ...others);
      }

      dialogIndex++;
      currentChoices = null;
    } else {
      // Normal line: if it's a function, RUN it here too
      if (typeof currentLine === "function") {
        currentLine();   // ✅ this now executes Bed NPC giveItem
      }
      dialogIndex++;
    }

    // ✅ close if end
    if (dialogIndex >= activeDialog.length) {
      dialogActive = false;
      currentChoices = null;
      activeDialog = null;
    }
  }
  // Choice navigation
  if (currentChoices) {
    if (key === "w" || key === "arrowup") {
      selectedChoice =
        (selectedChoice - 1 + currentChoices.length) % currentChoices.length;
    }
    if (key === "s" || key === "arrowdown") {
      selectedChoice = (selectedChoice + 1) % currentChoices.length;
    }
  }
});

window.addEventListener(
  "keyup",
  (e) => (keys[e.key.toLowerCase()] = false)
);

// ================== NPC SYSTEM ==================
class NPC {
  constructor(x, y, spritePath, dialog = []) {
    this.image = new Image();
    this.image.src = spritePath;
    this.x = x;
    this.y = y;
    this.width = 64;
    this.height = 64;

    // 🚨 FIX: store original dialog without JSON.stringify
    this.originalDialog = dialog;
  }

  getDialogCopy() {
    return this.originalDialog.map(item => {
      if (typeof item === "object" && item !== null) {
        return {
          ...item,
          choices: item.choices ? [...item.choices] : null,
        };
      }
      return item; // includes functions + strings
    });
  }

  draw(ctx, offsetX, offsetY) {
    ctx.drawImage(this.image,
      this.x - offsetX,
      this.y - offsetY,
      this.width,
      this.height);
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
const mapNPCs = {};

function addNPC(mapId, col, row, spritePath, dialog = []) {
  const pos = tileEngine.gridToPixel(col, row);
  if (!mapNPCs[mapId]) mapNPCs[mapId] = [];
  const npc = new NPC(pos.x, pos.y, spritePath, dialog);
  mapNPCs[mapId].push(npc);
  return npc;
}



// ================== COLLISION ==================
function isSolidTile(tileId) {
  return (
    tileId === 2 ||
    tileId === 3 ||
    tileId === 100 ||
    tileId === 101 ||
    tileId === 5 ||
    tileId === 6 ||
    tileId === 10 ||
    tileId === 38
  );
}

function canMoveTo(newX, newY) {
  if (dialogActive || inventoryOpen) return false;

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
  if (keys["a"]) {
    dx -= 1;
    player.currentImg = player.images.left;  // ◀️ use left
  }
  if (keys["d"]) {
    dx += 1;
    player.currentImg = player.images.right; // ▶️ use right
  }

  if (dx === 0 && dy === 0) {
    // if no movement, fall back to idle sprite
    player.currentImg = player.images.idle;
  }

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
let currentChoices = null;
let selectedChoice = 0;
let activeDialog = null; // <- runtime copy

// ================== WAYPOINT SYSTEM ==================
const waypoints = [
  {
    fromMap: "map1",
    tile: { col: 9, row: 2 },
    to: { map: "map_house", col: 5, row: 6 },
  },
  {
    fromMap: "map1",
    tile: { col: 2, row: 9 },
    to: { map: "Secret1", col: 2, row: 2 },
  },
  {
    fromMap: "Secret1",
    tile: { col: 3, row: 2 },
    to: { map: "map1", col: 2, row: 8 },
  },
  {
    fromMap: "map_house",
    tile: { col: 5, row: 7 },
    to: { map: "map1", col: 9, row: 3 },
  },
  {
    fromMap: "map1",
    tile: { col: 6, row: 10 },
    to: { map: "map2", col: 6, row: 1 },
  },
  {
    fromMap: "map2",
    tile: { col: 6, row: 0 },
    to: { map: "map1", col: 6, row: 9 },
  },
  {
    fromMap: "tutorialMap",
    tile: { col: 8, row: 2 },
    to: { map: "map1", col: 1, row: 5 },
  },
  {
    fromMap: "map2",
    tile: { col: 9, row: 5 },
    to: { map: "Cavemap", col: 2, row: 5 },
  },
  {
    fromMap: "Cavemap",
    tile: { col: 1, row: 5 },
    to: { map: "map2", col: 8, row: 5 },
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

// ================== TEXT HELPERS ==================
function drawColoredText(ctx, line, x, y) {
  const parts = line.split(/(\{player\})/gi);
  let offsetX = 0;
  for (const part of parts) {
    if (part.toLowerCase() === "{player}") {
      ctx.fillStyle = "gold";
      ctx.fillText(player.name, x + offsetX, y);
      offsetX += ctx.measureText(player.name + " ").width;
    } else {
      ctx.fillStyle = "white";
      ctx.fillText(part, x + offsetX, y);
      offsetX += ctx.measureText(part + " ").width;
    }
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && n > 0) {
      drawColoredText(ctx, line.trim(), x, y);
      line = words[n] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  drawColoredText(ctx, line.trim(), x, y);
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

  // ✅ declare hoveredItem here
  let hoveredItem = null;

  // Player sprite
  ctx.drawImage(
    player.currentImg,
    canvas.width / 2 - player.width / 2,
    canvas.height / 2 - player.height / 2,
    player.width,
    player.height
  );

  // Player name tag background
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  const nameWidth = ctx.measureText(player.name).width;
  const nameX = canvas.width / 2;
  const nameY = canvas.height / 2 - player.height / 2 - 10;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(nameX - nameWidth / 2 - 6, nameY - 16, nameWidth + 12, 30);

  ctx.fillStyle = "white";
  ctx.fillText(player.name, nameX, nameY + 4);

  // DEBUG
  if (debugMode) {
    const hb = getPlayerHitbox(player.x, player.y);
    const centerX = (hb.left + hb.right) / 2;
    const centerY = (hb.top + hb.bottom) / 2;
    const { col, row } = tileEngine.pixelToGrid(centerX, centerY);

    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(10, 10, 320, 40);
    ctx.fillStyle = "lime";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Map: ${currentMap} | Col: ${col}, Row: ${row}`, 20, 35);
  }

  // NPC interaction + dialog
  if (!dialogActive && !inventoryOpen) {
    currentDialogNPC = null;
    const playerHb = getPlayerHitbox(player.x, player.y);
    for (const npc of mapNPCs[currentMap] || []) {
      const hb = npc.getHitbox();
      const distX = Math.abs(
        (playerHb.left + playerHb.right) / 2 - (hb.left + hb.right) / 2
      );
      const distY = Math.abs(
        (playerHb.top + playerHb.bottom) / 2 - (hb.top + hb.bottom) / 2
      );
      if (distX < 60 && distY < 60) currentDialogNPC = npc;
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

    if (dialogActive && activeDialog) {
      const line = activeDialog[dialogIndex] || "";

      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(50, canvas.height - 150, canvas.width - 100, 100);
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.strokeRect(50, canvas.height - 150, canvas.width - 100, 100);

      ctx.font = "18px Arial";
      ctx.textAlign = "left";

      if (typeof line === "string") {
        wrapText(ctx, line, 70, canvas.height - 120, canvas.width - 140, 22);
      } else if (line.choices) {
        ctx.fillStyle = "white";
        ctx.fillText(line.text, 70, canvas.height - 120);
        currentChoices = line.choices;
        line.choices.forEach((choice, i) => {
          ctx.fillStyle = i === selectedChoice ? "yellow" : "white";
          ctx.fillText(choice.option, 90, canvas.height - 90 + i * 22);
        });
      }
    }
  

      // INVENTORY screen
      if (inventoryOpen) {
        const cols = 9;
        const rows = 3;
        const slotSize = 40;
        const padding = 6;

        const boxWidth = cols * (slotSize + padding) + padding;
        const boxHeight = rows * (slotSize + padding) + padding + 40;
        const startX = (canvas.width - boxWidth) / 2;
        const startY = (canvas.height - boxHeight) / 2;

        ctx.fillStyle = "rgba(20,20,20,0.95)";
        ctx.fillRect(startX, startY, boxWidth, boxHeight);

        ctx.strokeStyle = "white";
        ctx.strokeRect(startX, startY, boxWidth, boxHeight);

        ctx.fillStyle = "white";
        ctx.font = "18px Mojangles";
        ctx.textAlign = "center";
        ctx.fillText("Inventory", startX + boxWidth / 2, startY + 28);

        let hoveredItem = null;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            const slotX = startX + padding + col * (slotSize + padding);
            const slotY = startY + 40 + row * (slotSize + padding);

            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(slotX, slotY, slotSize, slotSize);
            ctx.strokeStyle = "white";
            ctx.strokeRect(slotX, slotY, slotSize, slotSize);

            const item = inventory[index];
            if (item) {
              ctx.drawImage(
                item.icon,
                slotX + 4,
                slotY + 4,
                slotSize - 8,
                slotSize - 8
              );
              if (item.count > 1) {
                ctx.fillStyle = "white";
                ctx.font = "12px Mojangles";
                ctx.textAlign = "right";
                ctx.fillText(item.count, slotX + slotSize - 2, slotY + slotSize - 2);
              }

              if (
                mouseX >= slotX &&
                mouseX <= slotX + slotSize &&
                mouseY >= slotY &&
                mouseY <= slotY + slotSize
              ) {
                hoveredItem = item;
              }
            }
          }
        }

        if (hoveredItem) {
          drawTooltip(ctx, hoveredItem.name, mouseX + 10, mouseY);
        }

        if (draggingItem) {
          ctx.globalAlpha = 0.8;
          ctx.drawImage(
            draggingItem.icon,
            mouseX - draggingOffsetX,
            mouseY - draggingOffsetY,
            slotSize - 8,
            slotSize - 8
          );
          if (draggingItem.count > 1) {
            ctx.fillStyle = "white";
            ctx.font = "12px Mojangles";
            ctx.textAlign = "right";
            ctx.fillText(
              draggingItem.count,
              mouseX - draggingOffsetX + slotSize - 12,
              mouseY - draggingOffsetY + slotSize - 12
            );
          }
          ctx.globalAlpha = 1.0;
        }
      }

      requestAnimationFrame(gameLoop);
    }

// ================== INITIALIZE ==================
async function loadTiles() {
  const promises = [];
  const register = (id, path) =>
    promises.push(tileEngine.registerTile(id, path));
  // --- Register tiles here (same as your existing code) ---
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

  register(20, "textures/grass.png");
  register(30, "textures/teleport.jpg");
  register(31, "textures/door-bottom.png");
  register(32, "textures/door-top.png");
  register(33, "textures/house-inside.png");
  register(34, "textures/door-left.png");
  register(35, "textures/door-right.png");
  register(36, "textures/door-right-green.png");
  register(37, "textures/door-top-path.png");
  register(38, "textures/painting.png");
  register(39, "textures/House-Teleport.png");
  register(40, "textures/door-bottom-wood.png");
  register(41, "textures/stone-path.png");
  register(42, "textures/tree.png");
  register(50, "textures/cave-inside.png");

  register(100, "textures/DebugWall.png");
  register(101, "textures/InvWall.png");
  register(102, "textures/NoCollisonInv.png");
  register(103, "textures/DebugWall.png")

  await Promise.all(promises);

  const tutorialMap = [
    [100, 100, 100, 100, 100, 100, 100, 100, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 1, 4],
    [100, 1, 1, 1, 1, 1, 1, 1, 100],
     [100, 100, 100, 100, 100, 100, 100, 100, 100],
  ];
  tileEngine.defineMap("tutorialMap", tutorialMap);

  const map1 = [
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
    [100, 1, 1, 1, 1, 7, 1, 1, 1, 1, 1, 100],
    [100, 1, 6, 1, 1, 1, 6, 1, 1, 39, 1, 100],
    [100, 1, 1, 7, 1, 1, 1, 1, 6, 4, 1, 100],
    [100, 1, 1, 1, 1, 1, 1, 7, 1, 4, 1, 100],
    [100, 4, 4, 4, 4, 4, 4, 4, 4, 4, 1, 100],
    [100, 1, 1, 1, 1, 4, 7, 1, 1, 1, 1, 100],
    [100, 1, 1, 6, 1, 4, 4, 1, 1, 1, 6, 100],
    [100, 1, 7, 1, 1, 7, 4, 6, 1, 1, 1, 100],
    [100, 1, 42, 1, 1, 1, 4, 1, 1, 7, 1, 100],
    [100, 100, 100, 100, 100, 100, 4, 100, 100, 100, 100 ,100],
  ];
  tileEngine.defineMap("map1", map1);

  // Map 2 (simple room for now)
  const map2 = [
    [100, 100, 100, 100, 100, 100, 4, 100, 100, 100, 100 ,100],
    [100, 1, 6, 1, 1, 1, 4, 6, 1, 7, 1, 100],
    [100, 1, 1, 1, 6, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 7, 1, 1, 4, 1, 1, 1, 1, 100],
    [100, 1, 1, 1, 1, 1, 4, 7, 1, 3, 3, 100],
    [100, 1, 1, 1, 6, 4, 4, 4, 4, 41, 3, 100],
    [100, 1, 7, 1, 1, 4, 1, 1, 1, 3, 3, 100],
    [100, 1, 1, 4, 4, 4, 1, 6, 1, 1, 1, 100],
    [100, 1, 6, 4, 1, 1, 1, 1, 1, 7, 1, 100],
    [100, 1, 1, 4, 1, 1, 7, 1, 1, 1, 1, 100],
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
  ];
  tileEngine.defineMap("map2", map2);

  const Secret1 =[
    [100, 100, 100, 100, 100],
    [100, 1, 1, 1, 100],
    [100, 1, 1, 4, 100],
    [100, 1, 1, 1, 100],
    [100, 100, 100, 100, 100],
  ];
  tileEngine.defineMap("Secret1", Secret1)

  // Cavemap (simple room for now)
  const Cavemap = [
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
    [100, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 4, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 50, 50, 50, 50, 50, 50, 50, 50, 3, 100],
    [100, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 100],
    [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100 ,100],
  ];
  tileEngine.defineMap("Cavemap", Cavemap);

  // House interior
  const map_house = [
    [101, 100, 100, 100, 100, 100, 100, 100, 100, 100, 101],
    [100, 5, 5, 5, 5, 5, 38, 5, 5, 5, 100],
    [100, 5, 33, 10, 33, 33, 33, 33, 12, 5, 100],
    [100, 5, 8, 33, 33, 33, 33, 33, 11, 5, 100],
    [100, 5, 9, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 33, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 33, 33, 33, 33, 33, 33, 33, 5, 100],
    [100, 5, 5, 5, 5, 40, 5, 5, 5, 5, 100],
  ];
  tileEngine.defineMap("map_house", map_house);

  // Example NPC that gives items
  addNPC("map_house", 3, 2, "textures/House-NPC.png", [
    "Hello {player}!",
    "I was just working. What brings you here?",
    {
      text: "Choose your response:",
      choices: [
        {
          option: "I'm just exploring.",
          outcome: ["Ah, enjoy your time here, {player}!"],
        },
        {
          option: "I need your help.",
          outcome: [
            "Of course, {player}! What do you need?",
            {
              text: "Tell me what you want:",
              choices: [
                {
                  option: "Can you guide me?",
                  outcome: ["Sure, {player}! Follow the path outside the house. There will be a big cave to the north. Be careful!"],
                },
                {
                  option: "Can you give me something?",
                  outcome: [
                    () => giveItem("Potion", 1, true),
                    "Here, {player}, take this potion.",
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    "Safe travels, {player}.",
  ]);


  // Painting NPC
  addNPC("map_house", 6, 1, "textures/InvWall.png", [
    "Dude I'm just painting.",
    "What do you want?",
    {
      text: "Choose your response:",
      choices: [
        {
          option: "Just y'know looking around.",
          outcome: ["Then carry on and let me... be a painting?"],
        },
        {
          option: "What can you give me?",
          outcome: ["Nothin' {player}, I'm still just painting."],
        },
      ],
    },
    "Good traveling {player}.",
  ]);

  // Bed NPC
  addNPC("map_house", 8, 2, "textures/InvWall.png", [
    "Bed",
    "Bed, Bed Bed BED!",
    "Zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    "*Snore* *Snore* *Beding*",
    "*Creacking*, Bed leg tore off",
    () => giveItem("Bed Leg", 1, true),            // ✅ function first
    "You Just got a Bed Leg!",
  ]);

    // Bed NPC
  addNPC("tutorialMap", 1, 2, "textures/NPC.png", [
    "Welcome to the tutorial map, {player}!",
    "Use WASD to move around.",
    "Press 'I' to open your inventory.",
    "Press 'E' to interact with NPCs.",
    "Behind you is a teleport tile to take you to the main map.",
    "Enjoy your adventure!",
  ]);

  addNPC("Secret1", 2, 3, "textures/chest.png", [
    "You Opened the chest and got a ...",
    "Mouse???",
    () => giveItem("Mouse", 1, true),
  ]);

  gameLoop();
}

setPlayerSpawn(4, 2);
player.image.onload = () => loadTiles();
player.image.src = "textures/player.png";