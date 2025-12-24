---
name: some-stupid-fps-game-development
description: Development guidelines and coding standards for "Some Stupid FPS Game". Use this when an AI agent needs to add features, fix bugs, refactor code, or make any modifications to the game codebase. This skill defines the coding patterns, architectural decisions, and quality standards that must be followed when working on this multiplayer FPS game built with Three.js and Socket.io.
version: 0.1
---

# Agent Development Guide for Some Stupid FPS Game

> **Purpose**: This document instructs AI agents (LLMs) on how to properly code, develop, and contribute to this project.  
> **Audience**: Claude, GPT, or any AI assistant working on the codebase  
> **Priority**: Follow these guidelines for ALL code changes

---

## Table of Contents
- [Critical Principles](#critical-principles)
- [Before Writing Any Code](#before-writing-any-code)
- [Coding Standards](#coding-standards)
- [Architecture Patterns to Follow](#architecture-patterns-to-follow)
- [Development Workflows](#development-workflows)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)

---

## Critical Principles

### 1. Always Read Documentation First

**MANDATORY FIRST STEP**: Before making ANY code changes, read the relevant documentation:

```bash
# For understanding systems
Read: SYSTEMS.md

# For understanding architecture
Read: ARCHITECTURE.md

# For implementation examples
Read: DEVELOPER_GUIDE.md

# For this file's patterns
Read: AGENTS.md (this file)
```

**Why**: These docs contain hard-earned lessons, existing patterns, and architectural decisions. Ignoring them leads to:
- ❌ Duplicate code
- ❌ Breaking existing systems
- ❌ Inconsistent patterns
- ❌ Technical debt

### 2. Evolutionary Development (The Project is Growing)

**Current State**: Initial Phase (v0.1)  
**Future State**: Will expand significantly

**This means:**
- ✅ Write code that's easy to extend
- ✅ Use patterns that scale
- ✅ Document WHY, not just WHAT
- ✅ Keep systems modular and decoupled
- ❌ Don't over-engineer (no premature optimization)
- ❌ Don't hard-code values that will change

### 3. Server-Authoritative, Client-Predicted

**Golden Rule**: The server is the source of truth for ALL game state.

```javascript
// ✅ CORRECT: Server decides, client displays
// server.js
target.health -= 10;
io.to(room).emit('playerHit', { id: targetId, health: target.health });

// game.js
socket.on('playerHit', (data) => {
  updateHealthUI(data.health); // Just display what server says
});

// ❌ WRONG: Client decides health
// game.js
socket.on('playerHit', (data) => {
  myHealth -= 10; // Client decides its own health
  socket.emit('updateHealth', myHealth);
});
```

**Why**: Prevents cheating. Clients can be modified. Server can't.

### 4. Progressive Complexity

When adding features, follow this order:

1. **Basic Implementation** - Get it working
2. **Error Handling** - Make it robust
3. **Optimization** - Make it fast
4. **Polish** - Make it pretty

**Example:**
```javascript
// Phase 1: Basic (Get it working)
function shootWeapon() {
  socket.emit('shoot', { targetId: 'abc' });
}

// Phase 2: Error Handling (Make it robust)
function shootWeapon() {
  if (!targetId) {
    console.error('No target selected');
    return;
  }
  socket.emit('shoot', { targetId });
}

// Phase 3: Optimization (Make it fast)
const lastShot = 0;
function shootWeapon() {
  const now = Date.now();
  if (now - lastShot < 100) return; // Rate limit
  if (!targetId) return;
  
  lastShot = now;
  socket.emit('shoot', { targetId });
}

// Phase 4: Polish (Make it pretty)
function shootWeapon() {
  const weapon = WEAPONS[currentWeapon];
  const now = Date.now();
  
  // Validation
  if (now - lastShot < weapon.fireRate) return;
  if (!targetId) return;
  if (currentAmmo <= 0) {
    playEmptySound();
    return;
  }
  
  // Execute
  lastShot = now;
  currentAmmo--;
  socket.emit('shoot', { targetId, weaponType: currentWeapon });
  
  // Feedback
  playShootSound(weapon);
  updateAmmoUI();
}
```

---

## Before Writing Any Code

### Pre-Flight Checklist

**For EVERY code change, ask yourself:**

1. ✅ Have I read SYSTEMS.md for affected systems?
2. ✅ Have I read ARCHITECTURE.md for patterns to follow?
3. ✅ Have I checked DEVELOPER_GUIDE.md for examples?
4. ✅ Do I understand WHY the existing code works the way it does?
5. ✅ Will my change break existing features?
6. ✅ Am I following established patterns?
7. ✅ Will I document my changes?

**If you answered NO to any question, STOP and read first.**

### Understanding the Existing Code

**Step 1: Map the System**

Before changing a system, understand its boundaries:

```javascript
// Example: Adding ammo system to weapons

// 1. Where is shooting handled?
//    - Client: game.js mousedown event
//    - Server: server.js 'shoot' event

// 2. What data flows through?
//    - Client → Server: { targetId }
//    - Server → Clients: { id, health, attackerId }

// 3. What systems interact?
//    - Input system (mouse)
//    - Network system (socket.emit)
//    - Combat system (hit detection)
//    - Audio system (shoot sound)
//    - UI system (hit marker)

// 4. What needs to change?
//    - Add ammo state to client
//    - Add ammo validation before shoot
//    - Add ammo UI
//    - Add reload mechanic
```

**Step 2: Find Related Code**

```bash
# Search for related functions
grep -n "shoot" public/game.js
grep -n "shoot" server.js

# Find where a variable is used
grep -n "health" public/game.js

# Find event handlers
grep -n "socket.on" public/game.js
```

**Step 3: Trace Data Flow**

```javascript
// Example: How does health update work?

// 1. Client shoots (game.js line ~450)
document.addEventListener('mousedown', () => {
  socket.emit('shoot', { targetId: bestTarget });
});

// 2. Server receives (server.js line ~85)
socket.on('shoot', (shootData) => {
  target.health -= 10;
  io.to(p.room).emit('playerHit', { id, health, attackerId });
});

// 3. Clients receive (game.js line ~550)
socket.on('playerHit', (data) => {
  if (id === socket.id) {
    updateHealthUI(health);
  }
});

// NOW I understand the flow and can add features safely
```

---

## Coding Standards

### JavaScript Style Guide

#### 1. Naming Conventions

**ALWAYS use these exact patterns:**

```javascript
// Constants: UPPER_SNAKE_CASE
const MAX_PLAYERS = 6;
const PLAYER_COLORS = [...];
const WEAPON_TYPES = {...};

// Configuration objects: UPPER_SNAKE_CASE
const GAME_CONFIG = {
  maxHealth: 100,
  gravity: 980
};

// Variables: camelCase
let currentWeapon = 'pistol';
let isReloading = false;
const playerVelocity = new THREE.Vector3();

// Functions: camelCase (verb-first)
function createPlayerMesh() { }
function updateHealthUI() { }
function checkCollision() { }

// Classes: PascalCase
class PowerUp { }
class WeaponSystem { }
class AudioManager { }

// Private/Internal: _prefix
function _calculateDamage() { }
const _internalCache = new Map();

// Three.js objects: descriptive names
const floorMesh = new THREE.Mesh(...);
const playerGroup = new THREE.Group();
const bulletMaterial = new THREE.MeshBasicMaterial(...);

// Socket.io events: camelCase strings
socket.emit('playerMoved', data);
socket.on('gameJoined', (data) => { });

// DOM elements: use IDs from HTML
const healthText = document.getElementById('health-text');
const menuDiv = document.getElementById('main-menu');
```

#### 2. Code Organization

**File Structure Pattern:**

```javascript
// === SECTION: Imports ===
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/...';

// === SECTION: Constants ===
const MAX_PLAYERS = 6;
const PLAYER_COLORS = [...];

// === SECTION: Configuration ===
const GAME_CONFIG = {
  physics: { ... },
  weapons: { ... }
};

// === SECTION: State ===
let currentWeapon = 'pistol';
let isGameJoined = false;

// === SECTION: Helper Functions ===
function createPixelTexture(type) { ... }
function createRobotCharacter(color) { ... }

// === SECTION: Core Systems ===
class AudioSystem { ... }
class PhysicsSystem { ... }

// === SECTION: Scene Setup ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(...);

// === SECTION: Network ===
const socket = io();
socket.on('event', (data) => { ... });

// === SECTION: Game Loop ===
function animate() { ... }
animate();
```

**Always group related code with section comments.**

#### 3. Function Guidelines

**Single Responsibility Principle:**

```javascript
// ❌ BAD: Function does too much
function handleShoot() {
  // Check ammo
  if (currentAmmo <= 0) return;
  
  // Play sound
  sfx.playShoot();
  
  // Raycast
  raycaster.setFromCamera(...);
  const hit = raycaster.intersectObjects(...);
  
  // Magnetism
  Object.keys(otherPlayers).forEach(...);
  
  // Network
  socket.emit('shoot', ...);
  
  // UI
  showHitMarker();
  updateAmmoUI();
}

// ✅ GOOD: Each function has one job
function handleShoot() {
  if (!canShoot()) return;
  
  const target = findShootTarget();
  if (target) {
    executeShoot(target);
  }
}

function canShoot() {
  return currentAmmo > 0 && !isReloading;
}

function findShootTarget() {
  const directHit = checkDirectHit();
  if (directHit) return directHit;
  
  return checkMagnetismHit();
}

function executeShoot(target) {
  consumeAmmo();
  playShootEffects();
  sendShootEvent(target);
}
```

**Function Size**: Aim for < 50 lines. If longer, split into smaller functions.

**Early Returns**: Use them to reduce nesting.

```javascript
// ❌ BAD: Nested if statements
function processHit(data) {
  if (data) {
    if (data.health !== undefined) {
      if (data.id === socket.id) {
        updateHealthUI(data.health);
      }
    }
  }
}

// ✅ GOOD: Early returns
function processHit(data) {
  if (!data) return;
  if (data.health === undefined) return;
  if (data.id !== socket.id) return;
  
  updateHealthUI(data.health);
}
```

#### 4. Comments

**When to Comment:**

```javascript
// ✅ GOOD: Explain WHY (non-obvious decisions)
// Use exponential fog instead of linear for better depth perception
scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);

// Magnetism radius of 2.0 balances skill and accessibility
const MAGNET_RADIUS = 2.0;

// Server sees player positions 50-100ms in the past due to latency
// TODO: Implement lag compensation in Phase 3

// ✅ GOOD: Explain complex algorithms
// Project intended movement onto slide plane to prevent sticking
// Formula: V_slide = V - (V · N) * N where N is surface normal
const dot = intendedMove.dot(normal);
const slideMove = intendedMove.clone().sub(normal.multiplyScalar(dot));

// ❌ BAD: Obvious comments
let x = 10; // Set x to 10
health -= 10; // Reduce health by 10
```

**TODO Comments:**

```javascript
// TODO: Add rate limiting (fire rate cap)
// TODO(Phase 2): Implement weapon switching
// FIXME: Hit detection fails at long range
// HACK: Temporary workaround for spawn collision, remove in v0.2
```

#### 5. Error Handling

**ALWAYS validate inputs:**

```javascript
// ✅ Socket event handlers
socket.on('joinGame', (data) => {
  // Validate data exists
  if (!data) {
    socket.emit('gameError', 'Invalid request');
    return;
  }
  
  // Validate required fields
  if (!data.name || !data.roomCode) {
    socket.emit('gameError', 'Missing name or room code');
    return;
  }
  
  // Validate types and ranges
  if (typeof data.name !== 'string' || data.name.length > 12) {
    socket.emit('gameError', 'Invalid name');
    return;
  }
  
  // Process valid data
  handleJoinGame(data);
});

// ✅ Function parameters
function updateNameTag(mesh, name, health) {
  // Guard clauses
  if (!mesh || !mesh.children) {
    console.error('[updateNameTag] Invalid mesh');
    return;
  }
  
  if (typeof name !== 'string' || name.length === 0) {
    console.warn('[updateNameTag] Invalid name, using default');
    name = 'Player';
  }
  
  if (typeof health !== 'number' || health < 0 || health > 100) {
    console.warn('[updateNameTag] Invalid health, clamping');
    health = Math.max(0, Math.min(100, health));
  }
  
  // Safe to proceed
  // ...
}
```

**Use try-catch for risky operations:**

```javascript
// File operations
try {
  const data = JSON.parse(localStorage.getItem('settings'));
  applySettings(data);
} catch (error) {
  console.error('Failed to load settings:', error);
  applyDefaultSettings();
}

// Network operations
socket.on('gameData', (data) => {
  try {
    processGameData(data);
  } catch (error) {
    console.error('Failed to process game data:', error);
    // Don't crash the game, just log it
  }
});
```

---

## Architecture Patterns to Follow

### 1. Three.js Patterns

#### Object Hierarchy

**ALWAYS use Groups for complex objects:**

```javascript
// ✅ GOOD: Hierarchical structure
function createPlayer(color) {
  const group = new THREE.Group();
  
  const body = createBody(color);
  const head = createHead();
  const weapon = createWeapon();
  
  group.add(body);
  group.add(head);
  group.add(weapon);
  
  group.userData.components = { body, head, weapon };
  
  return group;
}

// ❌ BAD: Flat structure
function createPlayer(color) {
  const body = new THREE.Mesh(...);
  const head = new THREE.Mesh(...);
  // How do we move them together?
  // How do we store references?
}
```

#### Material Reuse

**ALWAYS share materials when possible:**

```javascript
// ✅ GOOD: Shared materials
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex });

walls.forEach(wallData => {
  const mesh = new THREE.Mesh(wallGeo, stoneMat); // Reuse material
  scene.add(mesh);
});

// ❌ BAD: Create new material each time
walls.forEach(wallData => {
  const mat = new THREE.MeshStandardMaterial({ map: stoneTex }); // Wasteful!
  const mesh = new THREE.Mesh(wallGeo, mat);
  scene.add(mesh);
});
```

#### Disposal Pattern

**ALWAYS dispose when removing objects:**

```javascript
// ✅ GOOD: Proper cleanup
function removePlayer(id) {
  const mesh = otherPlayers[id];
  if (!mesh) return;
  
  // Traverse and dispose
  mesh.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(mat => {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      } else {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
    }
  });
  
  scene.remove(mesh);
  delete otherPlayers[id];
}
```

#### Vector Reuse

**AVOID creating vectors in loops:**

```javascript
// ❌ BAD: Creates vector every frame
function animate() {
  const direction = new THREE.Vector3(); // Created 60 times per second!
  camera.getWorldDirection(direction);
}

// ✅ GOOD: Reuse vector
const _tempDirection = new THREE.Vector3(); // Created once

function animate() {
  camera.getWorldDirection(_tempDirection); // Reused
}
```

### 2. Socket.io Patterns

#### Event Naming

**Use consistent event naming:**

```javascript
// Pattern: <noun><Verb> or <verb><Noun>

// ✅ GOOD: Clear, consistent
socket.emit('playerMoved', data);     // Past tense for broadcasts
socket.emit('joinGame', data);        // Imperative for requests
socket.on('gameJoined', callback);    // Past tense for confirmations
socket.on('playerHit', callback);     // Past tense for events

// ❌ BAD: Inconsistent
socket.emit('move', data);
socket.emit('join-game', data);
socket.on('game_joined', callback);
socket.on('hit_player', callback);
```

#### Event Data Structure

**Use consistent payload structure:**

```javascript
// ✅ GOOD: Structured data
socket.emit('playerAction', {
  type: 'shoot',
  targetId: 'abc123',
  timestamp: Date.now()
});

socket.emit('stateUpdate', {
  playerId: socket.id,
  health: 90,
  position: { x, y, z }
});

// ❌ BAD: Inconsistent payloads
socket.emit('shoot', targetId); // Just a string
socket.emit('move', x, y, z);   // Multiple arguments
```

#### Room Isolation

**ALWAYS verify room membership:**

```javascript
// ✅ GOOD: Room validation
socket.on('shoot', (data) => {
  const shooter = players[socket.id];
  const target = players[data.targetId];
  
  // Validate both are in same room
  if (!shooter || !target || shooter.room !== target.room) {
    return; // Silently ignore invalid shots
  }
  
  // Process valid shot
  handleShot(shooter, target);
});

// ❌ BAD: No room check
socket.on('shoot', (data) => {
  const target = players[data.targetId];
  target.health -= 10; // Can shoot players in other rooms!
});
```

### 3. State Management Patterns

#### Client State

**Separate authoritative vs predicted state:**

```javascript
// ✅ GOOD: Clear separation
const clientState = {
  // Authoritative (from server)
  health: 100,
  score: 0,
  team: 'red',
  
  // Predicted (local simulation)
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  
  // UI state (local only)
  isReloading: false,
  currentWeapon: 'pistol'
};

// ❌ BAD: Mixed state
let health = 100; // Who owns this?
let position = new THREE.Vector3(); // Server or client?
```

#### Server State

**Centralize player state:**

```javascript
// ✅ GOOD: Single player object
players[socketId] = {
  playerId: socketId,
  room: roomCode,
  name: name,
  color: color,
  
  // Game state
  x: 0, y: 2, z: 0,
  rotation: 0,
  health: 100,
  
  // Session state
  kills: 0,
  deaths: 0,
  joinedAt: Date.now()
};

// ❌ BAD: Scattered state
const playerPositions = {};
const playerHealth = {};
const playerRooms = {};
// Hard to keep in sync!
```

### 4. Procedural Generation Patterns

**Make it deterministic when needed:**

```javascript
// ✅ GOOD: Deterministic (same seed = same output)
function createTexture(type, seed = 12345) {
  const rng = new SeededRandom(seed);
  
  for (let i = 0; i < 100; i++) {
    const x = rng.next() * 64;
    const y = rng.next() * 64;
    // Draw at (x, y)
  }
}

// Clients can generate identical textures
const tex1 = createTexture('grass', 12345);
const tex2 = createTexture('grass', 12345); // Identical!

// ❌ BAD: Non-deterministic
function createTexture(type) {
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 64; // Different every time
    const y = Math.random() * 64;
  }
}
```

**Keep generation code pure:**

```javascript
// ✅ GOOD: Pure function (no side effects)
function generateMap(width, height, seed) {
  const tiles = [];
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      tiles.push(generateTile(x, y, seed));
    }
  }
  
  return tiles; // Just returns data
}

// Use the data separately
const mapData = generateMap(50, 50, seed);
mapData.forEach(tile => scene.add(tile.mesh));

// ❌ BAD: Side effects
function generateMap(width, height, seed) {
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const tile = generateTile(x, y, seed);
      scene.add(tile.mesh); // Side effect! Can't reuse function
    }
  }
}
```

---

## Development Workflows

### Workflow 1: Adding a New Feature

**Follow this exact sequence:**

#### Step 1: Plan & Document
```markdown
1. What is the feature?
   - "Add weapon switching (3 weapons: pistol, rifle, shotgun)"

2. What systems does it affect?
   - Input system (1/2/3 keys)
   - Weapon rendering (gun model)
   - Combat system (different damage values)
   - UI system (weapon name, ammo display)
   - Network (send weapon type with shoot event)

3. What needs to change?
   - Client: Add WEAPONS config, currentWeapon state, switchWeapon(), updateAmmoUI()
   - Server: Accept weaponType in shoot event, validate damage values
   - UI: Add weapon-ui div to HTML

4. What are the risks?
   - Breaking existing shooting
   - Desyncing weapon state between client/server
   - UI layout issues
```

#### Step 2: Implement in Phases

**Phase 1: Data Structure**
```javascript
// Add config (top of file)
const WEAPONS = {
  pistol: { damage: 10, fireRate: 100 },
  rifle: { damage: 8, fireRate: 80 },
  shotgun: { damage: 15, fireRate: 800 }
};

let currentWeapon = 'pistol';
```

**Phase 2: Core Logic**
```javascript
function switchWeapon(weaponName) {
  if (!WEAPONS[weaponName]) {
    console.error('Invalid weapon:', weaponName);
    return;
  }
  
  currentWeapon = weaponName;
  console.log('Switched to:', weaponName);
}

// Test it
switchWeapon('rifle');
```

**Phase 3: Integration**
```javascript
// Hook up to input
document.addEventListener('keydown', (e) => {
  if (e.code === 'Digit1') switchWeapon('pistol');
  if (e.code === 'Digit2') switchWeapon('rifle');
  if (e.code === 'Digit3') switchWeapon('shotgun');
});

// Update shoot logic
socket.emit('shoot', { 
  targetId: target,
  weaponType: currentWeapon // Send weapon type
});
```

**Phase 4: Server Sync**
```javascript
// server.js
socket.on('shoot', (data) => {
  const weaponType = data.weaponType || 'pistol';
  
  // Validate weapon type (anti-cheat)
  const validWeapons = ['pistol', 'rifle', 'shotgun'];
  if (!validWeapons.includes(weaponType)) {
    console.warn('Invalid weapon from', socket.id);
    return;
  }
  
  // Use weapon-specific damage
  const damage = WEAPON_DAMAGE[weaponType];
  target.health -= damage;
});
```

**Phase 5: Visual Feedback**
```javascript
// Update UI
function switchWeapon(weaponName) {
  currentWeapon = weaponName;
  document.getElementById('weapon-name').innerText = WEAPONS[weaponName].name;
}

// Update weapon model color
weapon.children[0].material.color.setHex(
  weaponName === 'pistol' ? 0x555555 :
  weaponName === 'rifle' ? 0x333333 : 0x222222
);
```

**Phase 6: Polish**
- Add sounds per weapon
- Add muzzle flash effects
- Add recoil animation
- Add weapon icons

#### Step 3: Test

```markdown
✅ Test each weapon switch (1, 2, 3 keys)
✅ Test shooting with each weapon
✅ Test damage values (check server logs)
✅ Test with 2+ players
✅ Test invalid weapon type (modify client, send 'invalid')
✅ Test rapid switching
✅ Test UI updates correctly
```

#### Step 4: Document

```markdown
Update SYSTEMS.md:
- Add "Weapon System" section
- Document WEAPONS config
- Document switchWeapon() function
- Add to "Network Events" table

Update this file (AGENTS.md):
- Add weapon switching to examples (if pattern is reusable)
```

### Workflow 2: Fixing a Bug

**Step 1: Reproduce**

```javascript
// Document reproduction steps
/*
BUG: Players can shoot through walls

Reproduction:
1. Player A stands behind stone wall
2. Player B aims at wall where Player A is behind
3. Player B shoots
4. Player A takes damage (should not!)

Expected: Wall blocks shot
Actual: Shot hits player through wall
*/
```

**Step 2: Locate**

```javascript
// Find the relevant code
// Search for: "shoot", "raycast", "intersect"

// Found in game.js line 450:
document.addEventListener('mousedown', () => {
  // ... raycast logic
  const intersects = raycaster.intersectObjects(playerMeshes); // BUG HERE!
  // Only checks players, not walls!
});
```

**Step 3: Understand**

```javascript
// Why does it happen?
// raycaster.intersectObjects(playerMeshes) only checks players
// Should check [walls, obstacles, players] to find closest hit

// Why was it written this way?
// Original implementation was simple: just find players
// Didn't consider occlusion
```

**Step 4: Fix**

```javascript
// ✅ CORRECT FIX: Check all objects, prioritize closest
document.addEventListener('mousedown', () => {
  const allObjects = [
    ...walls.children,
    ...obstacles,
    ...Object.values(otherPlayers)
  ];
  
  const intersects = raycaster.intersectObjects(allObjects, true);
  if (intersects.length === 0) return;
  
  const hit = intersects[0]; // Closest hit
  
  // Is it a player?
  let targetPlayer = null;
  let curr = hit.object;
  while (curr) {
    const pid = Object.keys(otherPlayers).find(k => otherPlayers[k] === curr);
    if (pid) {
      targetPlayer = pid;
      break;
    }
    curr = curr.parent;
  }
  
  if (targetPlayer) {
    socket.emit('shoot', { targetId: targetPlayer });
  }
});
```

**Step 5: Test**

```markdown
✅ Test original bug (should be fixed)
✅ Test can still shoot players normally
✅ Test can't shoot through floors
✅ Test can't shoot through obstacles
✅ Test edge cases (shooting at wall with no player behind)
```

**Step 6: Document**

```javascript
// Add comment explaining the fix
// Check all objects in scene, not just players, to prevent shooting through walls
const allObjects = [...walls.children, ...obstacles, ...Object.values(otherPlayers)];
```

### Workflow 3: Refactoring

**When to Refactor:**
- Code is duplicated 3+ times
- Function is > 100 lines
- Logic is hard to understand
- Performance bottleneck identified

**How to Refactor:**

**Step 1: Identify Pattern**

```javascript
// BEFORE: Duplicated code
function updatePlayer1Health(hp) {
  const text = document.getElementById('p1-health');
  text.innerText = hp;
  text.style.color = hp > 50 ? 'green' : hp > 20 ? 'yellow' : 'red';
}

function updatePlayer2Health(hp) {
  const text = document.getElementById('p2-health');
  text.innerText = hp;
  text.style.color = hp > 50 ? 'green' : hp > 20 ? 'yellow' : 'red';
}

// Same logic, different elements!
```

**Step 2: Extract Common Logic**

```javascript
// AFTER: Unified function
function updateHealthDisplay(elementId, hp) {
  const text = document.getElementById(elementId);
  if (!text) return;
  
  text.innerText = hp;
  text.style.color = hp > 50 ? 'green' : hp > 20 ? 'yellow' : 'red';
}

// Usage
updateHealthDisplay('p1-health', 90);
updateHealthDisplay('p2-health', 45);
```

**Step 3: Test**

```markdown
✅ Test all previous call sites still work
✅ Test edge cases (missing element, invalid HP)
✅ Verify no regressions
```

---

## Testing Requirements

### Manual Testing Checklist

**For EVERY feature, test:**

```markdown
## Core Functionality
- [ ] Feature works as intended in solo mode
- [ ] Feature works with 2 players
- [ ] Feature works with 6 players (max)
- [ ] Feature handles edge cases (empty input, max values, etc.)

## Network
- [ ] Server receives correct events
- [ ] Other clients receive broadcasts
- [ ] Works with high latency (throttle network in DevTools)
- [ ] Recovers from disconnect/reconnect

## UI
- [ ] UI updates correctly
- [ ] No visual glitches
- [ ] Works on different screen sizes
- [ ] Accessible (keyboard navigation if applicable)

## Error Handling
- [ ] Gracefully handles invalid input
- [ ] Doesn't crash on errors
- [ ] Logs errors to console
- [ ] Shows user-friendly error messages

## Performance
- [ ] Maintains 60 FPS
- [ ] No memory leaks (check DevTools Memory profiler)
- [ ] Network bandwidth acceptable (check DevTools Network tab)
```

### Console Logging for Testing

**Add logging during development:**

```javascript
// Temporary debug logs
function handleShoot(targetId) {
  console.log('[SHOOT] Target:', targetId);
  console.log('[SHOOT] Current weapon:', currentWeapon);
  console.log('[SHOOT] Ammo:', currentAmmo);
  
  // ... shoot logic
  
  console.log('[SHOOT] Shot successful');
}

// Remove before committing (or guard with DEBUG flag)
const DEBUG = false;

function handleShoot(targetId) {
  if (DEBUG) {
    console.log('[SHOOT] Target:', targetId);
  }
  // ... logic
}
```

---

## Documentation Requirements

### When to Update Documentation

**ALWAYS update docs when:**

1. ✅ Adding a new system
2. ✅ Changing existing behavior
3. ✅ Adding new constants/config
4. ✅ Changing network events
5. ✅ Adding new dependencies

### What to Update

**After adding a feature:**

```markdown
1. SYSTEMS.md
   - Add to appropriate section
   - Document new functions/classes
   - Update constants table
   - Add to network events (if applicable)

2. ARCHITECTURE.md
   - Update diagrams if architecture changed
   - Add to scaling considerations if relevant
   - Update technology stack if new libs added

3. DEVELOPER_GUIDE.md
   - Add example if pattern is reusable
   - Update common tasks if applicable
   - Add to troubleshooting if new issues found

4. This file (AGENTS.md)
   - Add new patterns to follow
   - Update workflows if needed
```

### Documentation Style

**Use this format for documenting systems:**

```markdown
## System Name

**Purpose**: One-sentence description

**Location**: Where the code lives (file:line)

**Dependencies**: What it requires
- Three.js (scene, camera)
- Socket.io (for network sync)

**Key Functions**:
- `functionName(params)` - Description

**Constants**:
```javascript
const CONFIG = {
  value: 123
};
```

**Usage Example**:
```javascript
// Simple usage
const result = functionName(param);

// Advanced usage
const result = functionName({
  option1: value1,
  option2: value2
});
```

**Edge Cases**:
- Handles null input by returning default
- Validates ranges (0-100)

**TODO**:
- [ ] Add feature X
- [ ] Optimize performance
```

---

## Quality Checklist

**Before committing ANY code, verify:**

### Code Quality
- [ ] Follows naming conventions
- [ ] Functions are < 50 lines
- [ ] No duplicate code
- [ ] Comments explain WHY, not WHAT
- [ ] Error handling for all inputs
- [ ] No console.log (except DEBUG-guarded)

### Architecture
- [ ] Follows established patterns
- [ ] Server is authoritative
- [ ] Client predicts locally
- [ ] State management is clear
- [ ] Systems are decoupled

### Performance
- [ ] No objects created in game loop
- [ ] Materials/geometries reused
- [ ] Resources disposed properly
- [ ] Network throttled if needed

### Testing
- [ ] Manually tested all features
- [ ] Tested with multiple players
- [ ] Tested error cases
- [ ] Checked console for errors
- [ ] Verified FPS > 50

### Documentation
- [ ] SYSTEMS.md updated
- [ ] Comments added to complex code
- [ ] TODOs added for future work
- [ ] README updated if needed

---

## Anti-Patterns to Avoid

### ❌ Don't Do These

**1. Global State Pollution**
```javascript
// ❌ BAD: Globals everywhere
window.currentWeapon = 'pistol';
window.playerHealth = 100;

// ✅ GOOD: Scoped state
const gameState = {
  currentWeapon: 'pistol',
  playerHealth: 100
};
```

**2. Magic Numbers**
```javascript
// ❌ BAD: What do these numbers mean?
if (health < 30) {
  velocity.y += 400;
}

// ✅ GOOD: Named constants
const LOW_HEALTH_THRESHOLD = 30;
const JUMP_BOOST_VELOCITY = 400;

if (health < LOW_HEALTH_THRESHOLD) {
  velocity.y += JUMP_BOOST_VELOCITY;
}
```

**3. God Objects**
```javascript
// ❌ BAD: Object does everything
class Game {
  render() { ... }
  handleInput() { ... }
  updatePhysics() { ... }
  networkSync() { ... }
  playAudio() { ... }
  updateUI() { ... }
  // 500+ lines...
}

// ✅ GOOD: Separation of concerns
class Renderer { render() { ... } }
class InputHandler { handleInput() { ... } }
class PhysicsEngine { update() { ... } }
class NetworkManager { sync() { ... } }
```

**4. Callback Hell**
```javascript
// ❌ BAD: Nested callbacks
socket.on('event1', () => {
  socket.on('event2', () => {
    socket.on('event3', () => {
      // ...
    });
  });
});

// ✅ GOOD: Separate handlers
socket.on('event1', handleEvent1);
socket.on('event2', handleEvent2);
socket.on('event3', handleEvent3);
```

**5. Ignoring Errors**
```javascript
// ❌ BAD: Silent failures
try {
  dangerousOperation();
} catch (e) {
  // Nothing...
}

// ✅ GOOD: Handle or log
try {
  dangerousOperation();
} catch (e) {
  console.error('Operation failed:', e);
  fallbackOperation();
}
```

---

## Version Control Guidelines

### Commit Messages

**Format:**
```
<type>: <short description>

<optional longer description>

<optional footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code restructuring (no functionality change)
- `docs:` Documentation only
- `perf:` Performance improvement
- `test:` Adding tests
- `chore:` Maintenance (dependencies, config)

**Examples:**
```bash
feat: Add weapon switching system

- Added WEAPONS config with 3 weapon types
- Implemented switchWeapon() function
- Updated shoot event to send weapon type
- Added weapon UI display

Closes #15

---

fix: Prevent shooting through walls

Raycast now checks all objects (walls, obstacles, players)
to find closest hit before determining target.

Fixes #23

---

refactor: Extract health display logic

Unified updatePlayer1Health and updatePlayer2Health into
single updateHealthDisplay function to reduce duplication.
```

### Branching Strategy

**For now (initial phase):**
```bash
main - Production code
```

**Future (when team grows):**
```bash
main - Production
develop - Integration branch
feature/weapon-system - Feature branches
fix/wall-shooting - Bug fix branches
```

---

## Final Reminders

### The Golden Rules

1. **Read First, Code Second**
   - SYSTEMS.md, ARCHITECTURE.md, DEVELOPER_GUIDE.md are your friends

2. **Server is Truth**
   - All game state is authoritative on server
   - Client predicts, server validates

3. **Evolve, Don't Revolutionize**
   - Follow existing patterns
   - Extend, don't replace
   - Keep it modular

4. **Document Everything**
   - Future you will thank present you
   - Other developers will thank you
   - AI agents will thank you

5. **Test Thoroughly**
   - Solo, duo, full room
   - Happy path, sad path, edge cases
   - Check console, check network, check FPS

### When in Doubt

```markdown
1. Check SYSTEMS.md for how it currently works
2. Check ARCHITECTURE.md for the pattern to follow
3. Check DEVELOPER_GUIDE.md for examples
4. Ask yourself: "Will this scale?"
5. Ask yourself: "Can I explain this to someone else?"
6. If still unsure, add a TODO and move on
```

---

**Document Version**: 0.1  
**Last Updated**: December 2024  
**Maintainer**: Project Team

**Remember**: You're not just writing code for now. You're building a foundation for the future. Make it count. 🎮