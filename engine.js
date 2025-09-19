// Engine.js
class TileEngine {
  constructor(canvasContext, tileSize = 64) {
    this.ctx = canvasContext;
    this.tileSize = tileSize;
    this.tiles = {}; // tiles[id] = { image, solid }
    this.maps = {};
    this.gridWidth = Math.ceil(this.ctx.canvas.width / this.tileSize);
    this.gridHeight = Math.ceil(this.ctx.canvas.height / this.tileSize);
  }

  // Register a tile with collision flag
  registerTile(tileId, imagePath, solid = false) {
    return new Promise((resolve, reject) => {
      if (this.tiles[tileId]) {
        resolve(this.tiles[tileId]);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.tiles[tileId] = { image: img, solid: solid };
        resolve(img);
      };
      img.onerror = () =>
        reject(new Error(`Failed to load tile image: ${imagePath}`));
      img.src = imagePath;
    });
  }

  defineMap(mapId, mapData) {
    if (!Array.isArray(mapData) || !Array.isArray(mapData[0])) {
      throw new Error("Map data must be a 2D array");
    }
    this.maps[mapId] = {
      data: mapData,
      width: mapData[0].length,
      height: mapData.length,
    };
  }

  drawMap(mapId, offsetX = 0, offsetY = 0) {
    const map = this.maps[mapId];
    if (!map) return;

    const startCol = Math.floor(offsetX / this.tileSize);
    const endCol = Math.min(startCol + this.gridWidth + 1, map.width);

    const startRow = Math.floor(offsetY / this.tileSize);
    const endRow = Math.min(startRow + this.gridHeight + 1, map.height);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (row < 0 || col < 0 || row >= map.height || col >= map.width) continue;

        const tileId = map.data[row][col];
        if (tileId && this.tiles[tileId]) {
          const { image } = this.tiles[tileId];
          const x = col * this.tileSize - offsetX;
          const y = row * this.tileSize - offsetY;
          this.ctx.drawImage(image, x, y, this.tileSize, this.tileSize);
        }
      }
    }
  }

  // ---- COLLISION CHECKS ----

  // Check if a tile is solid
  isSolidTile(mapId, col, row) {
    const map = this.maps[mapId];
    if (!map) return false;
    if (row < 0 || col < 0 || row >= map.height || col >= map.width) return true; // outside world = blocked

    const tileId = map.data[row][col];
    return tileId && this.tiles[tileId]?.solid;
  }

  // Check if a rectangle collides with any solid tile
  checkCollision(mapId, x, y, w, h) {
    const startCol = Math.floor(x / this.tileSize);
    const endCol = Math.floor((x + w - 1) / this.tileSize);
    const startRow = Math.floor(y / this.tileSize);
    const endRow = Math.floor((y + h - 1) / this.tileSize);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (this.isSolidTile(mapId, col, row)) {
          return true; // collision found
        }
      }
    }
    return false;
  }

  // Center map in canvas (return offsets for drawing)
  getCenteredOffset(mapId) {
    const map = this.maps[mapId];
    if (!map) return { offsetX: 0, offsetY: 0 };

    const worldWidth = map.width * this.tileSize;
    const worldHeight = map.height * this.tileSize;

    const offsetX = (this.ctx.canvas.width - worldWidth) / 2;
    const offsetY = (this.ctx.canvas.height - worldHeight) / 2;

    return { offsetX, offsetY, worldWidth, worldHeight };
  }
}

window.TileEngine = TileEngine;