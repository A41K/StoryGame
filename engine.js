class TileEngine {
  constructor(ctx, tileSize = 64) {
    this.ctx = ctx;
    this.tileSize = tileSize;
    this.tiles = {};
    this.maps = {};
    this.npcs = {};
    this.currentMapId = null;
  }

  async registerTile(id, src, solid = false) {
    if (this.tiles[id]) return;
    const img = new Image();
    img.src = src;
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(`Failed to load ${src}`);
    });
    this.tiles[id] = { image: img, solid };
  }

  defineWorld(worldMaps) {
    for (const [pos, map] of Object.entries(worldMaps)) {
      const [x, y] = pos.split(",").map(Number);
      const id = `map_${x}_${y}`;
      let maxWidth = Math.max(...map.map((row) => row.length));
      this.maps[id] = {
        data: map,
        width: maxWidth,
        height: map.length,
        connections: {},
      };
    }
    // auto links
    for (const [pos] of Object.entries(worldMaps)) {
      const [x, y] = pos.split(",").map(Number);
      const id = `map_${x}_${y}`;
      const map = this.maps[id];
      if (!map) continue;
      map.connections.up = this.maps[`map_${x}_${y - 1}`] ? `map_${x}_${y - 1}` : null;
      map.connections.down = this.maps[`map_${x}_${y + 1}`] ? `map_${x}_${y + 1}` : null;
      map.connections.left = this.maps[`map_${x - 1}_${y}`] ? `map_${x - 1}_${y}` : null;
      map.connections.right = this.maps[`map_${x + 1}_${y}`] ? `map_${x + 1}_${y}` : null;
    }
    if (!this.currentMapId) {
      const [x, y] = Object.keys(worldMaps)[0].split(",").map(Number);
      this.currentMapId = `map_${x}_${y}`;
    }
  }

  setMap(id) {
    if (this.maps[id]) this.currentMapId = id;
  }
  getCurrentMap() {
    return this.maps[this.currentMapId];
  }

  getWorldSize() {
    const map = this.getCurrentMap();
    return {
      worldWidth: map.width * this.tileSize,
      worldHeight: map.height * this.tileSize,
    };
  }

  drawMap(offsetX = 0, offsetY = 0) {
    const map = this.getCurrentMap();
    if (!map) return;
    for (let r = 0; r < map.height; r++) {
      const row = map.data[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const t = row[c];
        if (!t) continue;
        const tile = this.tiles[t];
        if (!tile) continue;
        this.ctx.drawImage(
          tile.image,
          c * this.tileSize - offsetX,
          r * this.tileSize - offsetY,
          this.tileSize,
          this.tileSize
        );
      }
    }
  }

  /* ===== NPC system ===== */
  addNpc(mapId, npc) {
    if (!this.npcs[mapId]) this.npcs[mapId] = [];
    this.npcs[mapId].push(npc);
  }
  drawNpcs(offsetX = 0, offsetY = 0) {
    const list = this.npcs[this.currentMapId];
    if (!list) return;
    for (const npc of list) {
      this.ctx.drawImage(
        npc.image,
        npc.x - offsetX,
        npc.y - offsetY,
        npc.width,
        npc.height
      );
    }
  }
  checkNpcCollision(x, y, w, h) {
    const list = this.npcs[this.currentMapId];
    if (!list) return false;
    for (const npc of list) {
      if (!npc.solid) continue;
      if (
        x < npc.x + npc.width &&
        x + w > npc.x &&
        y < npc.y + npc.height &&
        y + h > npc.y
      ) {
        return true;
      }
    }
    return false;
  }

  isSolidTile(col, row) {
    const map = this.getCurrentMap();
    const rowData = map.data[row];
    if (!rowData || col < 0 || col >= rowData.length) return true;
    const tileId = rowData[col];
    return tileId && this.tiles[tileId]?.solid;
  }

  checkCollision(x, y, w, h) {
    const startCol = Math.floor(x / this.tileSize);
    const endCol = Math.floor((x + w - 1) / this.tileSize);
    const startRow = Math.floor(y / this.tileSize);
    const endRow = Math.floor((y + h - 1) / this.tileSize);

    for (let row = startRow; row <= endRow; row++) {
      const rowData = this.getCurrentMap().data[row];
      if (!rowData) return true;
      for (let col = startCol; col <= endCol; col++) {
        if (this.isSolidTile(col, row)) return true;
      }
    }
    if (this.checkNpcCollision(x, y, w, h)) return true;
    return false;
  }

  // simplified transition just for demo – add your full version later!
  tryMapSwitch(player) {
    const map = this.getCurrentMap();
    const { worldWidth, worldHeight } = this.getWorldSize();
    const th = this.tileSize;

    // DOWN
    if (player.y + player.height > worldHeight) {
      const next = map.connections.down;
      if (next) {
        this.setMap(next);
        player.y = 0;
      } else {
        player.y = worldHeight - player.height - 5;
      }
    }
    // UP
    if (player.y < 0) {
      const next = map.connections.up;
      if (next) {
        this.setMap(next);
        const newMap = this.getCurrentMap();
        player.y = newMap.height * th - player.height - 2;
      } else {
        player.y = 5;
      }
    }
    // LEFT
    if (player.x < 0) {
      const next = map.connections.left;
      if (next) {
        this.setMap(next);
        const newMap = this.getCurrentMap();
        player.x = newMap.width * th - player.width - 2;
      } else {
        player.x = 5;
      }
    }
    // RIGHT
    if (player.x + player.width > worldWidth) {
      const next = map.connections.right;
      if (next) {
        this.setMap(next);
        player.x = 2;
      } else {
        player.x = worldWidth - player.width - 5;
      }
    }
  }
}