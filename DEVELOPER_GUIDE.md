# Developer Guide

> **Project**: Some Stupid FPS Game  
> **For**: Developers adding features or fixing bugs  
> **Last Updated**: December 2024

---

## Table of Contents
- [Getting Started](#getting-started)
- [Common Tasks](#common-tasks)
- [Adding New Features](#adding-new-features)
- [Debugging Guide](#debugging-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites
```bash
Node.js >= 14.x
npm >= 6.x
Modern browser (Chrome, Firefox, Edge)
```

### Initial Setup
```bash
# 1. Clone the repository
git clone https://github.com/iromn/some-stupid-fps-game.git
cd some-stupid-fps-game

# 2. Install dependencies
npm install

# 3. Start the server
node server/server.js

# 4. Open browser
# Navigate to http://localhost:3000
```

### Project Structure
```
some-stupid-fps-game/
├── server/
│   ├── server.js              # Server entry point
│   └── src/
│       ├── managers/
│       │   ├── RoomManager.js      # Room creation & joining
│       │   ├── PlayerManager.js    # Player state management
│       │   └── CombatManager.js    # Combat logic
│       └── utils/
│           └── Constants.js        # Shared constants
├── public/
│   ├── index.html             # Game UI and HTML structure
│   └── src/
│       ├── main.js            # Client entry point
│       ├── core/
│       │   ├── Game.js        # Main game orchestrator
│       │   ├── Input.js       # Keyboard input handling
│       │   └── Audio.js       # Sound effects
│       ├── graphics/
│       │   ├── Renderer.js    # Three.js scene setup
│       │   ├── Textures.js    # Procedural textures
│       │   └── Effects.js     # Visual effects
│       ├── world/
│       │   ├── Level.js       # Map & environment
│       │   └── Physics.js     # Collision detection
│       ├── entities/
│       │   ├── Player.js      # Local player
│       │   ├── RemotePlayer.js # Other players
│       │   ├── Character.js   # Character models
│       │   └── EntityManager.js # Entity tracking
│       ├── network/
│       │   └── Network.js     # Socket.io wrapper
│       └── ui/
│           ├── UIManager.js   # HUD & menus
│           └── NameTag.js     # Player name tags
├── package.json
└── Documentation (.md files)
```

### Understanding the Codebase

**Read in this order:**
1. `ARCHITECTURE.md` - High-level overview
2. `SYSTEMS.md` - Detailed system documentation
3. `server/server.js` - Server entry point (~70 lines)
4. `server/src/managers/` - Server logic modules
5. `public/src/main.js` - Client entry point
6. `public/src/core/Game.js` - Client orchestrator
7. `public/index.html` - UI markup

---

## Common Tasks

### Task 1: Adding a New Sound Effect

**Example: Add a reload sound**

**Step 1: Add the sound generator**
```javascript
// In public/src/core/Audio.js, inside Audio class

playReload() {
  if (this.ctx.state === 'suspended') this.ctx.resume();
  
  // Create metallic "click-clack" sound
  const osc1 = this.ctx.createOscillator();
  const osc2 = this.ctx.createOscillator();
  const gain = this.ctx.createGain();
  
  osc1.type = 'square';
  osc2.type = 'triangle';
  
  osc1.frequency.setValueAtTime(800, this.ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);
  
  osc2.frequency.setValueAtTime(200, this.ctx.currentTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);
  
  const finalVol = 0.08 * this.masterVolume;
  gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
  
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(this.ctx.destination);
  
  osc1.start();
  osc2.start(this.ctx.currentTime + 0.05);
  
  osc1.stop(this.ctx.currentTime + 0.2);
  osc2.stop(this.ctx.currentTime + 0.2);
}
```

**Step 2: Call it in Player.js**
```javascript
// In public/src/entities/Player.js, add to _initInputEvents()
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && canReload) {
    this.audio.playReload();
    // ... reload logic
  }
});
```

**Step 3: Test**
- Press R in-game
- Adjust frequencies/timings until it sounds right
- Update SYSTEMS.md to document the new sound

---

### Task 2: Creating a New Texture Type

**Example: Add a "wood" texture**

**Step 1: Add texture generator**
```javascript
// In public/src/graphics/Textures.js, inside createPixelTexture function

export function createPixelTexture(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // ... existing types ...

  else if (type === 'wood') {
    // Brown base
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 64, 64);
    
    // Wood grain (horizontal lines with noise)
    for (let y = 0; y < 64; y += 4) {
      const darkness = Math.random() * 0.3;
      ctx.fillStyle = `rgba(0,0,0,${darkness})`;
      ctx.fillRect(0, y, 64, 2);
      
      // Random vertical grain
      if (Math.random() > 0.7) {
        const x = Math.floor(Math.random() * 64);
        ctx.fillRect(x, y, 1, 8);
      }
    }
    
    // Add noise
    noise(0.1);
  }

  // ... rest of function
}

// Export the new texture
export const woodTex = createPixelTexture('wood');
```

**Step 2: Use it in Level.js**
```javascript
// In public/src/world/Level.js
import { grassTex, stoneTex, dirtTex, woodTex } from '../graphics/Textures.js';

// Create a wooden crate
const crateMat = new THREE.MeshStandardMaterial({ map: woodTex });
const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), crateMat);
crate.position.set(5, 1, 5);
this.scene.add(crate);
```

**Step 2: Create the texture**
```javascript
// At the top of game.js with other textures
const woodTex = createPixelTexture('wood');
```

**Step 3: Use it**
```javascript
// Create wooden obstacles
const woodMat = new THREE.MeshStandardMaterial({
  map: woodTex,
  roughness: 0.9,
  metalness: 0.0
});

function createWoodenCrate(x, z) {
  const geo = new THREE.BoxGeometry(3, 3, 3);
  const mesh = new THREE.Mesh(geo, woodMat);
  mesh.position.set(x, 1.5, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  obstacles.push(mesh);
}

createWoodenCrate(5, 5);
```

---

### Task 3: Adding a New Player Animation

**Example: Add a "victory dance" animation**

**Step 1: Create animation function**
```javascript
// In game.js
function playVictoryAnimation(characterGroup) {
  if (!characterGroup.userData.limbs) return;
  
  const limbs = characterGroup.userData.limbs;
  const duration = 2000; // 2 seconds
  const startTime = performance.now();
  
  function animate() {
    const elapsed = performance.now() - startTime;
    if (elapsed > duration) {
      // Reset to idle
      resetCharacterPose(characterGroup);
      return;
    }
    
    const t = elapsed / duration;
    const jump = Math.abs(Math.sin(t * Math.PI * 4)) * 0.5; // 4 jumps
    
    characterGroup.position.y = jump;
    characterGroup.rotation.y += 0.1; // Spin
    
    // Wave arms
    limbs.leftArm.rotation.z = Math.sin(t * Math.PI * 8) * 0.8;
    limbs.rightArm.rotation.z = -Math.sin(t * Math.PI * 8) * 0.8;
    limbs.leftArm.rotation.x = Math.PI / 4;
    limbs.rightArm.rotation.x = Math.PI / 4;
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

function resetCharacterPose(characterGroup) {
  if (!characterGroup.userData.limbs) return;
  const limbs = characterGroup.userData.limbs;
  
  limbs.leftArm.rotation.set(0, 0, 0);
  limbs.rightArm.rotation.set(0, 0, 0);
  limbs.leftLeg.rotation.set(0, 0, 0);
  limbs.rightLeg.rotation.set(0, 0, 0);
  characterGroup.rotation.set(0, 0, 0);
  characterGroup.position.y = 0;
}
```

**Step 2: Trigger it on an event**
```javascript
// Example: Play when player gets a kill
socket.on('playerKilled', (data) => {
  if (data.killerId === socket.id) {
    // I got a kill! Celebrate!
    // (You'd need to create a local character preview for this)
    // playVictoryAnimation(myCharacter);
  }
  
  // ... existing kill logic
});
```

---

### Task 4: Adding a New Obstacle Type

**Example: Add moving platforms**

**Step 1: Create the platform**
```javascript
// In game.js
const movingPlatforms = [];

function createMovingPlatform(x, z, endX, endZ, speed = 2.0) {
  const geo = new THREE.BoxGeometry(6, 0.5, 6);
  const mat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.8
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.25, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  // Store movement data
  mesh.userData.startPos = new THREE.Vector3(x, 0.25, z);
  mesh.userData.endPos = new THREE.Vector3(endX, 0.25, endZ);
  mesh.userData.speed = speed;
  mesh.userData.direction = 1; // 1 = toward end, -1 = toward start
  
  scene.add(mesh);
  movingPlatforms.push(mesh);
  obstacles.push(mesh); // Also add to collision array
  
  return mesh;
}

// Create some moving platforms
createMovingPlatform(-20, 0, 20, 0, 3.0); // Horizontal
createMovingPlatform(0, -20, 0, 20, 2.0); // Vertical
```

**Step 2: Update them in the game loop**
```javascript
// In animate() function
function animate() {
  // ... existing code ...
  
  if (controls.isLocked) {
    // Update moving platforms
    movingPlatforms.forEach(platform => {
      const { startPos, endPos, speed, direction } = platform.userData;
      
      // Calculate movement
      const currentPos = platform.position.clone();
      const target = direction === 1 ? endPos : startPos;
      const delta = target.clone().sub(currentPos);
      
      // Move toward target
      if (delta.length() > 0.1) {
        delta.normalize().multiplyScalar(speed * (1/60)); // Assuming 60fps
        platform.position.add(delta);
      } else {
        // Reached target, reverse direction
        platform.userData.direction *= -1;
      }
    });
    
    // ... rest of game loop
  }
}
```

**Step 3: Handle player riding platform (Advanced)**
```javascript
// This requires detecting if player is standing on platform
// and moving player with the platform. Implementation depends
// on your physics system. For now, platforms just push players.

// In collision check, detect vertical collision:
if (playerIsOnTopOf(platform)) {
  // Move player with platform
  controls.getObject().position.add(platform.userData.lastDelta);
}
```

---

## Adding New Features

### Feature: Weapon System

**Goal**: Allow players to switch between different weapons.

**Phase 1: Data Structure**

```javascript
// In game.js
const WEAPONS = {
  pistol: {
    name: "Pistol",
    damage: 10,
    fireRate: 100, // ms between shots
    magSize: 12,
    reloadTime: 1500,
    sound: 'square',
    soundFreq: 600
  },
  rifle: {
    name: "Rifle",
    damage: 8,
    fireRate: 80,
    magSize: 30,
    reloadTime: 2000,
    sound: 'sawtooth',
    soundFreq: 400
  },
  shotgun: {
    name: "Shotgun",
    damage: 5, // Per pellet
    pellets: 8,
    fireRate: 800,
    magSize: 6,
    reloadTime: 2500,
    sound: 'square',
    soundFreq: 200,
    spread: 0.1 // Degrees
  }
};

// Player state
let currentWeapon = 'pistol';
let currentAmmo = WEAPONS.pistol.magSize;
let lastShotTime = 0;
let isReloading = false;
```

**Phase 2: Weapon Switching**

```javascript
// Key bindings
document.addEventListener('keydown', (e) => {
  // ... existing code ...
  
  switch (e.code) {
    case 'Digit1':
      switchWeapon('pistol');
      break;
    case 'Digit2':
      switchWeapon('rifle');
      break;
    case 'Digit3':
      switchWeapon('shotgun');
      break;
    case 'KeyR':
      reloadWeapon();
      break;
  }
});

function switchWeapon(weaponName) {
  if (isReloading) return;
  
  currentWeapon = weaponName;
  currentAmmo = WEAPONS[weaponName].magSize;
  
  // Update visual model (future: load different 3D models)
  // For now, just change color
  weapon.children[0].material.color.setHex(
    weaponName === 'pistol' ? 0x555555 :
    weaponName === 'rifle' ? 0x333333 : 0x222222
  );
  
  // Update UI
  document.getElementById('weapon-name').innerText = WEAPONS[weaponName].name;
  updateAmmoUI();
}

function reloadWeapon() {
  if (isReloading) return;
  if (currentAmmo === WEAPONS[currentWeapon].magSize) return;
  
  isReloading = true;
  sfx.playReload();
  
  setTimeout(() => {
    currentAmmo = WEAPONS[currentWeapon].magSize;
    isReloading = false;
    updateAmmoUI();
  }, WEAPONS[currentWeapon].reloadTime);
}

function updateAmmoUI() {
  const ammoText = document.getElementById('ammo-text');
  ammoText.innerText = `${currentAmmo} / ${WEAPONS[currentWeapon].magSize}`;
}
```

**Phase 3: Updated Shooting Logic**

```javascript
// Replace mousedown event
document.addEventListener('mousedown', () => {
  if (!controls.isLocked) return;
  if (isReloading) return;
  if (currentAmmo <= 0) {
    // Play "empty" sound
    sfx.playTone(200, 'square', 0.05, 0.03);
    return;
  }
  
  const weapon = WEAPONS[currentWeapon];
  const now = performance.now();
  
  // Check fire rate
  if (now - lastShotTime < weapon.fireRate) return;
  lastShotTime = now;
  
  // Consume ammo
  currentAmmo--;
  updateAmmoUI();
  
  // Auto-reload if empty
  if (currentAmmo === 0) {
    setTimeout(() => reloadWeapon(), 500);
  }
  
  // Visual/Audio
  const weaponPos = new THREE.Vector3();
  weapon.getWorldPosition(weaponPos);
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  
  // Weapon-specific behavior
  if (currentWeapon === 'shotgun') {
    // Fire multiple pellets
    for (let i = 0; i < weapon.pellets; i++) {
      const spreadDir = dir.clone();
      // Add random spread
      spreadDir.x += (Math.random() - 0.5) * weapon.spread;
      spreadDir.y += (Math.random() - 0.5) * weapon.spread;
      spreadDir.normalize();
      
      createBulletTracer(weaponPos, spreadDir);
      checkHit(spreadDir, weapon.damage);
    }
  } else {
    // Single shot
    createBulletTracer(weaponPos, dir);
    checkHit(dir, weapon.damage);
  }
  
  // Play weapon-specific sound
  sfx.playTone(weapon.soundFreq, weapon.sound, 0.1, 0.05);
});

function checkHit(direction, damage) {
  // Extract hit detection logic from old shoot event
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  // ... magnetism logic ...
  
  if (bestTarget) {
    socket.emit('shoot', { 
      targetId: bestTarget,
      damage: damage // Send weapon damage
    });
  }
}
```

**Phase 4: Server Updates**

```javascript
// In server.js
socket.on('shoot', (shootData) => {
  const p = players[socket.id];
  if (p) {
    const targetId = shootData.targetId;
    const damage = shootData.damage || 10; // Default to 10
    
    // Validate damage is reasonable (anti-cheat)
    if (damage < 1 || damage > 50) return;
    
    const target = players[targetId];
    
    if (target && target.room === p.room) {
      target.health -= damage; // Use client-provided damage
      
      // ... rest of hit logic
    }
  }
});
```

**Phase 5: UI Updates**

```html
<!-- In index.html, add to HUD -->
<div id="weapon-ui" style="position: absolute; bottom: 60px; left: 20px; color: white; font-family: monospace;">
  <div id="weapon-name" style="font-size: 24px; font-weight: bold;">PISTOL</div>
  <div id="ammo-text" style="font-size: 32px; text-shadow: 2px 2px 0 #000;">12 / 12</div>
</div>
```

---

### Feature: Power-Ups

**Goal**: Add collectible power-ups (health pack, damage boost, speed boost).

**Step 1: Define power-up types**

```javascript
// In game.js
const POWERUP_TYPES = {
  health: {
    color: 0x00ff00,
    effect: (player) => {
      player.health = Math.min(100, player.health + 50);
      updateHealthUI(player.health);
    },
    icon: '❤️'
  },
  damage: {
    color: 0xff0000,
    effect: (player) => {
      player.damageMultiplier = 2.0;
      setTimeout(() => player.damageMultiplier = 1.0, 10000); // 10s
    },
    icon: '⚡',
    duration: 10000
  },
  speed: {
    color: 0x00ffff,
    effect: (player) => {
      player.speedMultiplier = 1.5;
      setTimeout(() => player.speedMultiplier = 1.0, 8000); // 8s
    },
    icon: '💨',
    duration: 8000
  }
};
```

**Step 2: Create visual power-up objects**

```javascript
class PowerUp {
  constructor(type, x, z) {
    this.type = type;
    this.config = POWERUP_TYPES[type];
    
    // Create visual (floating cube)
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: this.config.color,
      emissive: this.config.color,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(x, 1, z);
    this.mesh.castShadow = true;
    
    // Add icon sprite
    const sprite = createTextSprite(this.config.icon);
    sprite.position.y = 1.5;
    this.mesh.add(sprite);
    
    scene.add(this.mesh);
    
    // Animate (bobbing + rotation)
    this.startTime = performance.now();
  }
  
  update() {
    const t = (performance.now() - this.startTime) / 1000;
    this.mesh.position.y = 1 + Math.sin(t * 2) * 0.3; // Bob
    this.mesh.rotation.y += 0.02; // Spin
  }
  
  checkCollision(playerPos) {
    const dist = this.mesh.position.distanceTo(playerPos);
    return dist < 1.5; // Collection radius
  }
  
  collect() {
    // Play sound
    sfx.playTone(800, 'sine', 0.2, 0.1);
    
    // Remove from scene
    scene.remove(this.mesh);
    
    // Return type for server sync
    return this.type;
  }
}

// Spawn some power-ups
const powerUps = [];
powerUps.push(new PowerUp('health', 15, 15));
powerUps.push(new PowerUp('damage', -15, -15));
powerUps.push(new PowerUp('speed', 0, 20));
```

**Step 3: Collection logic**

```javascript
// In animate() loop
if (controls.isLocked) {
  const playerPos = controls.getObject().position;
  
  // Check power-up collisions
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    powerUp.update();
    
    if (powerUp.checkCollision(playerPos)) {
      const type = powerUp.collect();
      
      // Apply effect locally
      POWERUP_TYPES[type].effect({ 
        health: /* current health */, 
        damageMultiplier: 1.0, 
        speedMultiplier: 1.0 
      });
      
      // Notify server
      socket.emit('collectPowerUp', { type, id: i });
      
      // Remove from array
      powerUps.splice(i, 1);
    }
  }
}
```

**Step 4: Server synchronization**

```javascript
// In server.js
const powerUpSpawns = [
  { type: 'health', x: 15, z: 15, respawnTime: 30000 },
  { type: 'damage', x: -15, z: -15, respawnTime: 45000 },
  { type: 'speed', x: 0, z: 20, respawnTime: 30000 }
];

socket.on('collectPowerUp', (data) => {
  const p = players[socket.id];
  if (p) {
    // Notify all players in room to remove power-up
    io.to(p.room).emit('powerUpCollected', {
      id: data.id,
      playerId: socket.id
    });
    
    // Schedule respawn
    setTimeout(() => {
      io.to(p.room).emit('powerUpRespawned', { 
        id: data.id, 
        ...powerUpSpawns[data.id] 
      });
    }, powerUpSpawns[data.id].respawnTime);
  }
});
```

---

## Debugging Guide

### Client-Side Debugging

**1. Enable Debug Logging**
```javascript
// At top of game.js
const DEBUG = true;

function log(...args) {
  if (DEBUG) console.log('[GAME]', ...args);
}

// Use throughout code
socket.on('playerMoved', (p) => {
  log('Player moved:', p.playerId, p.x, p.z);
  // ... existing code
});
```

**2. Visualize Hit Detection**
```javascript
// Add debug ray visualization
function debugRaycast(origin, direction, length = 50) {
  const points = [];
  points.push(origin);
  points.push(origin.clone().addScaledVector(direction, length));
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const line = new THREE.Line(geometry, material);
  
  scene.add(line);
  setTimeout(() => scene.remove(line), 100); // Remove after 100ms
}

// Call in shoot logic
document.addEventListener('mousedown', () => {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  
  if (DEBUG) {
    debugRaycast(camera.position, dir);
  }
  
  // ... rest of shoot logic
});
```

**3. FPS Counter**
```javascript
// Add to game.js
let frameCount = 0;
let lastFpsTime = performance.now();

function updateFPS() {
  frameCount++;
  const now = performance.now();
  
  if (now - lastFpsTime >= 1000) {
    const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
    document.getElementById('fps-counter').innerText = `FPS: ${fps}`;
    frameCount = 0;
    lastFpsTime = now;
  }
}

// In animate()
function animate() {
  // ... existing code
  updateFPS();
}
```

```html
<!-- Add to index.html -->
<div id="fps-counter" style="position: absolute; top: 10px; right: 10px; color: white; font-family: monospace;"></div>
```

**4. Collision Visualization**
```javascript
// Visualize collision boxes
function debugCollisionBoxes() {
  obstacles.forEach(obs => {
    const helper = new THREE.BoxHelper(obs, 0xff0000);
    scene.add(helper);
  });
  
  // Player collision radius
  const geo = new THREE.SphereGeometry(1.0, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    wireframe: true,
    transparent: true,
    opacity: 0.3
  });
  const sphere = new THREE.Mesh(geo, mat);
  controls.getObject().add(sphere);
}

// Call once after scene setup
if (DEBUG) debugCollisionBoxes();
```

### Server-Side Debugging

**1. Log All Events**
```javascript
// In server.js
socket.onAny((eventName, ...args) => {
  console.log(`[${socket.id.substr(0, 5)}] ${eventName}:`, args);
});
```

**2. Monitor Room State**
```javascript
// Add periodic logging
setInterval(() => {
  console.log('\n=== SERVER STATE ===');
  console.log('Connected players:', Object.keys(players).length);
  console.log('Active rooms:', Object.keys(rooms).length);
  
  Object.keys(rooms).forEach(roomCode => {
    console.log(`  Room ${roomCode}: ${rooms[roomCode].length} players`);
  });
  
  console.log('===================\n');
}, 30000); // Every 30 seconds
```

**3. Validate Player State**
```javascript
function validatePlayerState(player) {
  const issues = [];
  
  if (Math.abs(player.x) > 100) issues.push('X out of bounds');
  if (Math.abs(player.z) > 100) issues.push('Z out of bounds');
  if (player.health < 0 || player.health > 100) issues.push('Invalid health');
  
  if (issues.length > 0) {
    console.warn(`Player ${player.playerId} validation failed:`, issues);
  }
  
  return issues.length === 0;
}

// Call in movement handler
socket.on('playerMovement', (movementData) => {
  const p = players[socket.id];
  if (p) {
    p.x = movementData.x;
    p.y = movementData.y;
    p.z = movementData.z;
    
    if (!validatePlayerState(p)) {
      // Reset to safe position
      p.x = 0;
      p.z = 0;
      socket.emit('forcePosition', { x: 0, z: 0 });
    }
    
    // ... rest of code
  }
});
```

### Common Issues & Solutions

**Issue: Players see each other in different positions**
- **Cause**: Latency, no interpolation
- **Debug**: Log `playerMoved` events, check timestamps
- **Fix**: Implement position buffering and interpolation

**Issue: Shots don't register**
- **Cause**: Raycast missing, hit validation broken
- **Debug**: Enable ray visualization, log shoot events
- **Fix**: Increase magnetism radius, verify LOS checks

**Issue: Players fall through floor**
- **Cause**: Position.y goes below 1.6 without correction
- **Debug**: Log position.y every frame, check collision
- **Fix**: Ensure ground check runs every frame

**Issue: Choppy movement**
- **Cause**: Low FPS, inefficient rendering
- **Debug**: Check FPS counter, profile with browser DevTools
- **Fix**: Reduce shadow quality, limit draw distance

---

## Best Practices

### Code Style

**1. Naming Conventions**
```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_PLAYERS = 6;
const PLAYER_COLORS = [...];

// Functions: camelCase
function createPlayerMesh() { }
function updateHealthUI() { }

// Classes: PascalCase
class PowerUp { }
class WeaponSystem { }

// Private/internal: prefix with _
function _internalHelper() { }
```

**2. Comments**
```javascript
// BAD: Obvious comment
let x = 10; // Set x to 10

// GOOD: Explain WHY
let playerRadius = 1.0; // Collision radius for cylindrical player model

// BETTER: Document complex logic
// Project intended movement onto slide plane to prevent sticking
// Formula: V_slide = V - (V · N) * N where N is surface normal
const slideMove = intendedMove.clone().sub(normal.multiplyScalar(dot));
```

**3. Error Handling**
```javascript
// Always validate socket data
socket.on('joinGame', (data) => {
  if (!data || !data.name || !data.roomCode) {
    socket.emit('gameError', 'Invalid join request');
    return;
  }
  
  // ... rest of logic
});

// Handle missing references
function updateNameTag(mesh, name, health) {
  if (!mesh || !mesh.children) {
    console.error('Invalid mesh passed to updateNameTag');
    return;
  }
  
  // ... rest of logic
}
```

### Performance Guidelines

**1. Avoid Creating Objects in Loops**
```javascript
// BAD
function animate() {
  const tempVec = new THREE.Vector3(); // Created every frame!
  // ...
}

// GOOD
const tempVec = new THREE.Vector3(); // Created once
function animate() {
  tempVec.set(0, 0, 0); // Reuse
  // ...
}
```

**2. Limit Network Updates**
```javascript
// BAD: Send every frame
function animate() {
  socket.emit('playerMovement', position);
}

// GOOD: Throttle to 20fps
let lastNetworkUpdate = 0;
function animate() {
  const now = performance.now();
  if (now - lastNetworkUpdate > 50) { // 20fps = 50ms
    socket.emit('playerMovement', position);
    lastNetworkUpdate = now;
  }
}
```

**3. Dispose Resources**
```javascript
// When removing objects from scene
function removePlayer(id) {
  const mesh = otherPlayers[id];
  if (mesh) {
    // Dispose geometries and materials
    mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    
    scene.remove(mesh);
    delete otherPlayers[id];
  }
}
```

### Security Checklist

**Before Committing:**
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] Validate all user input (name, room code, positions)
- [ ] Rate limit socket events (prevent spam)
- [ ] Sanitize HTML if displaying user content
- [ ] Use HTTPS in production
- [ ] Don't trust client-side hit detection (move to server)

---

## Troubleshooting

### "Cannot find module 'socket.io'"
```bash
# Install dependencies
npm install
```

### "Port 3000 already in use"
```bash
# Option 1: Kill the process
lsof -ti:3000 | xargs kill -9

# Option 2: Use different port
PORT=3001 node server.js
```

### "Three.js not loading"
- Check browser console for CDN errors
- Verify internet connection (uses unpkg.com)
- Try alternate CDN:
```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js"
    }
  }
</script>
```

### "Players not visible"
- Check `currentPlayers` event in browser console
- Verify `otherPlayers[id]` is being created
- Ensure mesh is added to scene: `scene.add(mesh)`
- Check camera position (might be inside/behind players)

### "Name tags not showing"
- Verify sprite is created: `mesh.children` should have sprite
- Check sprite scale: Too small = invisible
- Verify `userData.isNameTag = true`
- Check if culled (outside camera frustum)

### "Shots not registering"
- Enable debug ray visualization
- Check magnetism radius (try increasing to 3.0)
- Verify LOS raycast isn't hitting own objects
- Log `shoot` events on server (check if received)

---

## Quick Reference

### Useful Three.js Snippets

**Create a simple cube:**
```javascript
const geo = new THREE.BoxGeometry(w, h, d);
const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geo, mat);
mesh.position.set(x, y, z);
scene.add(mesh);
```

**Raycast from camera:**
```javascript
raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
const intersects = raycaster.intersectObjects(objects);
if (intersects.length > 0) {
  const hit = intersects[0];
  console.log('Hit:', hit.object, hit.point);
}
```

**Animate an object:**
```javascript
const startTime = performance.now();
function animate() {
  const t = (performance.now() - startTime) / 1000;
  object.position.y = Math.sin(t) * 2;
  object.rotation.y += 0.01;
  requestAnimationFrame(animate);
}
animate();
```

### Socket.io Cheat Sheet

**Emit to specific room:**
```javascript
io.to(roomCode).emit('eventName', data);
```

**Emit to everyone except sender:**
```javascript
socket.to(roomCode).emit('eventName', data);
```

**Join/leave rooms:**
```javascript
socket.join(roomCode);
socket.leave(roomCode);
```

**Get all sockets in room:**
```javascript
const sockets = await io.in(roomCode).fetchSockets();
console.log('Room has', sockets.length, 'players');
```

---

## Next Steps

**After completing initial phase:**
1. ✅ Read through all documentation
2. ✅ Set up development environment
3. ✅ Make a small change (add console.log somewhere)
4. ✅ Test change locally
5. ⏭️ Pick a feature from "Adding New Features"
6. ⏭️ Implement feature following patterns shown
7. ⏭️ Update SYSTEMS.md with your changes
8. ⏭️ Commit and push!

**Resources:**
- [Three.js Docs](https://threejs.org/docs/)
- [Socket.io Docs](https://socket.io/docs/v4/)
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- Project Docs: SYSTEMS.md, ARCHITECTURE.md

---

**Document Version**: 0.1  
**Happy Coding!** 🎮
