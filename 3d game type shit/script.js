const container = document.body;

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB);
container.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

const keys = {};
let mouseX = 0, mouseY = 0;
let isPointerLocked = false;

// Input handling
window.addEventListener("keydown", (e) => (keys[e.code] = true));
window.addEventListener("keyup", (e) => (keys[e.code] = false));

// Mouse controls
document.addEventListener('click', () => {
  document.body.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === document.body;
});

document.addEventListener('mousemove', (e) => {
  if (isPointerLocked) {
    mouseX -= e.movementX * 0.002;
    mouseY -= e.movementY * 0.002;
    mouseY = Math.max(-Math.PI/2, Math.min(Math.PI/2, mouseY)); // Limit vertical look
  }
});

// 3D Player
const player = {
  x: 0, 
  y: 0.8, 
  z: 0,
  width: 0.8, 
  height: 1.6, 
  depth: 0.8,
  speed: 5,
  mesh: null,
  
  init() {
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(this.x, this.y, this.z);
    scene.add(this.mesh);
  },
  
  update() {
    this.mesh.position.set(this.x, this.y, this.z);
  }
};

// Camera controller
const cameraController = {
  offset: new THREE.Vector3(0, 2, 0), // First person height
  
  update() {
    // Position camera at player position + offset
    camera.position.set(
      player.x + this.offset.x,
      player.y + this.offset.y,
      player.z + this.offset.z
    );
    
    // Apply mouse rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = mouseX;
    camera.rotation.x = mouseY;
  }
};

// 3D Tile Engine (simplified - removed debug markers for clarity)
class TileEngine3D {
  constructor() {
    this.tileSize = 2;
    this.tiles = {};
    this.maps = {};
    this.currentMapId = null;
    this.tileObjects = [];
  }

  registerTile(id, color, solid = false, height = 0.2) {
    const geometry = new THREE.BoxGeometry(this.tileSize, height, this.tileSize);
    const material = new THREE.MeshLambertMaterial({ color: color });
    this.tiles[id] = { geometry, material, solid, height };
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
        connections: {}
      };
    }
    
    // Auto links
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

  getCurrentMap() {
    return this.maps[this.currentMapId];
  }

  setMap(id) {
    if (this.maps[id]) {
      console.log(`🔄 Switching to ${id}`);
      this.currentMapId = id;
      this.buildMap();
    }
  }

  buildMap() {
    this.tileObjects.forEach(obj => scene.remove(obj));
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
        
        scene.add(mesh);
        this.tileObjects.push(mesh);
      }
    }
  }

  checkCollision(x, z, width, depth) {
    const map = this.getCurrentMap();
    const startCol = Math.floor((x - width/2) / this.tileSize);
    const endCol = Math.floor((x + width/2) / this.tileSize);
    const startRow = Math.floor((z - depth/2) / this.tileSize);
    const endRow = Math.floor((z + depth/2) / this.tileSize);

    for (let row = startRow; row <= endRow; row++) {
      const rowData = map.data[row];
      if (!rowData) return true;
      for (let col = startCol; col <= endCol; col++) {
        const tileId = rowData[col];
        if (tileId && this.tiles[tileId]?.solid) return true;
      }
    }
    return false;
  }

  tryMapSwitch(player) {
    const map = this.getCurrentMap();
    const worldWidth = map.width * this.tileSize;
    const worldHeight = map.height * this.tileSize;
    const threshold = 1.5;

    if (player.z <= threshold && map.connections.up) {
      this.setMap(map.connections.up);
      player.z = (this.getCurrentMap().height * this.tileSize) - threshold;
    }
    else if (player.z >= worldHeight - threshold && map.connections.down) {
      this.setMap(map.connections.down);
      player.z = threshold;
    }
    else if (player.x <= threshold && map.connections.left) {
      this.setMap(map.connections.left);
      player.x = (this.getCurrentMap().width * this.tileSize) - threshold;
    }
    else if (player.x >= worldWidth - threshold && map.connections.right) {
      this.setMap(map.connections.right);
      player.x = threshold;
    }
    
    // Keep player in bounds
    player.x = Math.max(threshold, Math.min(worldWidth - threshold, player.x));
    player.z = Math.max(threshold, Math.min(worldHeight - threshold, player.z));
  }
}

const engine = new TileEngine3D();

// World maps
const worldMaps = {
  "0,0": [
    [1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ],
  "0,1": [
    [1,1,1,1,1,1,1,1,1],
    [1,0,3,3,3,3,3,0,1],
    [1,0,3,0,0,0,3,0,1],
    [1,0,3,0,2,0,3,0,1],
    [1,0,3,0,0,0,3,0,1],
    [1,0,3,3,3,3,3,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ],
  "0,-1": [
    [1,1,2,2,2,1,1,1,1],
    [1,0,2,0,2,0,0,0,1],
    [1,0,2,0,2,0,0,0,1],
    [1,0,2,0,2,0,0,0,1],
    [1,0,2,0,2,0,0,0,1],
    [1,0,2,0,2,0,0,0,1],
    [1,0,2,2,2,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ],
  "-1,0": [
    [1,1,1,3,3,3,1,1,1],
    [1,0,0,0,3,0,0,0,1],
    [1,0,0,0,3,0,0,0,1],
    [3,3,3,3,3,3,3,3,3],
    [1,0,0,0,3,0,0,0,1],
    [1,0,0,0,3,0,0,0,1],
    [1,1,1,3,3,3,1,1,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ],
  "1,0": [
    [1,1,1,3,3,3,1,1,1],
    [1,0,0,0,3,0,0,0,1],
    [1,0,0,0,3,0,0,0,1],
    [3,3,3,3,3,3,3,3,3],
    [1,0,0,0,3,0,0,0,1],
    [1,0,0,0,3,0,0,0,1],
    [1,1,1,3,3,3,1,1,1],
    [1,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1]
  ]
};

function init() {
  engine.registerTile(1, 0x228B22, true); 
  engine.registerTile(2, 0x1E90FF, true);  
  engine.registerTile(3, 0x808080, true); 

  engine.defineWorld(worldMaps);
  engine.buildMap();
  
  player.init();
  
  const map = engine.getCurrentMap();
  player.x = (map.width * engine.tileSize) / 2;
  player.z = (map.height * engine.tileSize) / 2;
  player.update();
}

// Game loop
let lastTime = performance.now();
function animate(currentTime = performance.now()) {
  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  
  // Movement relative to camera direction
  let forward = 0, strafe = 0;
  if (keys["KeyW"] || keys["ArrowUp"]) forward += 1;
  if (keys["KeyS"] || keys["ArrowDown"]) forward -= 1;
  if (keys["KeyA"] || keys["ArrowLeft"]) strafe -= 1;
  if (keys["KeyD"] || keys["ArrowRight"]) strafe += 1;
  
  // Calculate movement direction based on camera rotation
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0; // Keep movement horizontal
  direction.normalize();
  
  const right = new THREE.Vector3();
  right.crossVectors(direction, new THREE.Vector3(0, 1, 0));
  
  const movement = new THREE.Vector3();
  movement.addScaledVector(direction, forward);
  movement.addScaledVector(right, strafe);
  movement.normalize();
  
  const nextX = player.x + movement.x * player.speed * deltaTime;
  const nextZ = player.z + movement.z * player.speed * deltaTime;
  
  if (!engine.checkCollision(nextX, player.z, player.width, player.depth)) {
    player.x = nextX;
  }
  if (!engine.checkCollision(player.x, nextZ, player.width, player.depth)) {
    player.z = nextZ;
  }
  
  player.update();
  engine.tryMapSwitch(player);
  cameraController.update();
  
  document.title = `Map: ${engine.currentMapId} | ${isPointerLocked ? 'LOCKED' : 'Click to lock mouse'}`;
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

init();
animate();