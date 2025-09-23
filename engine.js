class TileEngine {
  constructor(canvasContext, tileSize = 64) {
    this.ctx = canvasContext;
    this.tileSize = tileSize;
    this.tiles = {}; // Store tile images by ID
    this.maps = {}; // Store different maps
    this.gridWidth = Math.ceil(this.ctx.canvas.width / this.tileSize);
    this.gridHeight = Math.ceil(this.ctx.canvas.height / this.tileSize);
  }

  registerTile(tileId, imagePath) {
    return new Promise((resolve, reject) => {
      if (this.tiles[tileId]) {
        resolve(this.tiles[tileId]);
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.tiles[tileId] = img;
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
      width: Math.max(...mapData.map(r => r.length)), // <- longest row
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
        // ✅ skip cols that don’t exist in shorter rows
        if (
          row < 0 ||
          row >= map.height ||
          col < 0 ||
          col >= (map.data[row]?.length || 0)
        ) {
          continue;
        }

        const tileId = map.data[row][col];
        if (tileId && this.tiles[tileId]) {
          const x = col * this.tileSize - offsetX;
          const y = row * this.tileSize - offsetY;
          this.ctx.drawImage(
            this.tiles[tileId],
            x,
            y,
            this.tileSize,
            this.tileSize
          );
        }
      }
    }
  }

  pixelToGrid(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize),
    };
  }

  gridToPixel(col, row) {
    return {
      x: col * this.tileSize,
      y: row * this.tileSize,
    };
  }

  getTileAt(mapId, x, y) {
    const map = this.maps[mapId];
    if (!map) return null;

    const { col, row } = this.pixelToGrid(x, y);
    if (row >= 0 && row < map.height && col >= 0 && col < map.width) {
      return map.data[row][col];
    }
    return null;
  }
}

export default TileEngine;