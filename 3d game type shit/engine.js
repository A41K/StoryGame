class TileEngine3D {
  constructor(container) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);
    
    this.tileSize = 1; // 3D units instead of pixels
    this.tiles = {};
    this.maps = {};
    this.tileObjects = []; // 3D tile meshes
  }

  async registerTile(id, texturePath, solid = false, height = 0.1) {
    const loader = new THREE.TextureLoader();
    const texture = await new Promise((resolve, reject) => {
      loader.load(texturePath, resolve, undefined, reject);
    });
    
    const geometry = new THREE.BoxGeometry(this.tileSize, height, this.tileSize);
    const material = new THREE.MeshLambertMaterial({ map: texture });
    
    this.tiles[id] = { geometry, material, solid, height };
  }

  buildMap() {
    // Clear existing tiles
    this.tileObjects.forEach(obj => this.scene.remove(obj));
    this.tileObjects = [];
    
    const map = this.getCurrentMap();
    if (!map) return;
    
    for (let r = 0; r < map.height; r++) {
      const row = map.data[r];
      if (!row) continue;
      
      for (let c = 0; c < row.length; c++) {
        const tileId = row[c];
        if (!tileId) continue;
        
        const tile = this.tiles[tileId];
        if (!tile) continue;
        
        const mesh = new THREE.Mesh(tile.geometry, tile.material);
        mesh.position.set(c * this.tileSize, tile.height / 2, r * this.tileSize);
        mesh.userData = { tileId, solid: tile.solid };
        
        this.scene.add(mesh);
        this.tileObjects.push(mesh);
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}