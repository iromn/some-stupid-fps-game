# Game Systems Documentation

> **Status**: Initial Phase (v0.1)  
> **Last Updated**: December 2025
> **Note**: This is a living document that will evolve as the game develops.

---

## Table of Contents
- [Overview](#overview)
- [Core Systems](#core-systems)
- [Client Systems](#client-systems)
- [Server Systems](#server-systems)
- [Planned Systems](#planned-systems)

---

## Overview

**Some Stupid FPS Game** is a multiplayer voxel-style first-person shooter built with:
- **Frontend**: Three.js (3D rendering), Socket.io-client (networking)
- **Backend**: Node.js, Express, Socket.io
- **Style**: Minecraft-inspired pixel art aesthetic with procedural textures

### Current Feature Set (v0.1)
- ✅ Lobby system with room codes (up to 6 players)
- ✅ Voxel character models with procedural animation
- ✅ FPS movement with physics (WASD + Jump)
- ✅ Hitscan shooting with "thick bullet" magnetism
- ✅ Health system with visual feedback
- ✅ Death and respawn mechanics
- ✅ Procedurally generated textures (grass, stone, dirt)
- ✅ Basic audio system (shoot, hit, death sounds)

---

## Core Systems

### 1. Network Architecture (Socket.io)

**Event Flow Diagram:**
```
Client                          Server                          Other Clients
  |                               |                                    |
  |--[joinGame]------------------>|                                    |
  |<-[gameJoined]-----------------|                                    |
  |<-[currentPlayers]-------------|                                    |
  |                               |----[newPlayer]-------------------->|
  |                               |                                    |
  |--[playerMovement]------------>|                                    |
  |                               |----[playerMoved]------------------>|
  |                               |                                    |
  |--[shoot]--------------------->|                                    |
  |                               |----[playerHit]-------------------->|
  |                               |----[playerKilled] (if health ≤ 0)->|
  |                               |----[playerRespawn]---------------->|
```

#### Socket Events Reference

**Client → Server**
| Event | Data | Description |
|-------|------|-------------|
| `joinGame` | `{roomCode, name}` | Join or create a lobby |
| `playerMovement` | `{x, y, z, rotation}` | Position update (60fps) |
| `shoot` | `{targetId}` | Fire weapon at player |

**Server → Client**
| Event | Data | Description |
|-------|------|-------------|
| `gameJoined` | `{roomCode, assignedColor, x, z}` | Confirmation of lobby join |
| `currentPlayers` | `{playerId: playerData}` | All players in current room |
| `newPlayer` | `{playerId, x, y, z, color, name}` | New player joined room |
| `playerMoved` | `{playerId, x, y, z, rotation}` | Other player moved |
| `playerHit` | `{id, health, attackerId}` | Player took damage |
| `playerKilled` | `{victimId, killerId}` | Player died |
| `playerRespawn` | `{id, x, z}` | Player respawned |
| `userDisconnected` | `playerId` | Player left |
| `gameError` | `string` | Error message (room full, etc.) |

---

### 2. Player State Management

#### Client-Side Player Data
```javascript
// Local Player (controls.getObject().position)
{
  position: { x, y, z },    // Camera/body position
  rotation: y,               // Yaw rotation
  velocity: { x, y, z },     // Physics velocity
  health: 100,               // Current HP (0-100)
  canJump: boolean           // Grounded state
}
```

#### Server-Side Player Data
```javascript
players[socketId] = {
  playerId: string,          // Socket ID
  room: string,              // 6-digit room code
  name: string,              // Display name (max 12 chars)
  color: hex,                // Assigned from PLAYER_COLORS array
  x, y, z: number,           // World position
  rotation: number,          // Y-axis rotation
  health: number             // 0-100
}
```

#### Room Management
```javascript
rooms[roomCode] = [playerId1, playerId2, ...] // Max 6 players
```

**Color Assignment**: Players receive colors in order:
```javascript
const PLAYER_COLORS = [
  0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 
  0x00ffff, 0xff00ff, 0xff8000, 0x800080,
  0x008080, 0xffc0cb, 0x80ff00, 0x4b0082
];
```

---

## Client Systems

### 3. Rendering System (Three.js)

#### Scene Configuration
```javascript
scene.background = new THREE.Color(0x87CEEB); // Sky blue
scene.fog = new THREE.FogExp2(0x87CEEB, 0.01); // Exponential fog
```

**Lighting Setup:**
- `HemisphereLight`: 0xffffff sky, 0x444444 ground, intensity 0.8
- `DirectionalLight`: Sun at (50, 100, 50), intensity 1.2
  - Shadow map: 2048x2048
  - Shadow camera frustum: 100x100 area, depth 0.5-200

#### Camera Settings
```javascript
FOV: 75°
Aspect: window.innerWidth / window.innerHeight
Near: 0.1
Far: 1000
Position: (0, 1.6, 0) // Eye height
```

---

### 4. Procedural Texture System

**Function**: `createPixelTexture(type)`

Generates 64x64 low-res textures for Minecraft aesthetic.

**Texture Types:**
1. **Grass**: 
   - Base: `#5d4037` (dirt brown)
   - Top: `#388e3c` (Minecraft green)
   - Noise: Random grass blade variations

2. **Stone**:
   - Base: `#757575` (gray)
   - Pattern: Brick lines every 16px

3. **Dirt**:
   - Base: `#5d4037` (brown)
   - Heavy noise overlay

**Key Settings:**
```javascript
texture.magFilter = THREE.NearestFilter; // Pixelated look
texture.minFilter = THREE.NearestFilter;
texture.wrapS/T = THREE.RepeatWrapping;
```

---

### 5. Character Model System

**Function**: `createRobotCharacter(color)`

Procedurally generates voxel-style player models.

#### Model Structure
```
Group (pivot at feet, Y=0)
├── Head (0.5x0.5x0.5) @ Y=1.75 [Skin Color]
├── Torso (0.5x0.75x0.25) @ Y=1.125 [Shirt Color]
├── Left Arm (0.25x0.75x0.25) @ (-0.375, 1.5, 0) [Shirt Color]
├── Right Arm (0.25x0.75x0.25) @ (0.375, 1.5, 0) [Shirt Color]
├── Left Leg (0.25x0.75x0.25) @ (-0.125, 0.75, 0) [Pants Color]
└── Right Leg (0.25x0.75x0.25) @ (0.125, 0.75, 0) [Pants Color]
```

**Color Scheme:**
- Shirt: Player's assigned color
- Pants: 50% darker than shirt (`darker(hex)` function)
- Skin: `0xffccaa` (peachy)

#### Animation System
Characters have "goofy waddle" animation on movement:
- **Bounce**: Vertical oscillation based on `sin(time)`
- **Tilt**: Side-to-side rotation on Z-axis
- **Limb Swing**: Arms/legs rotate opposite to each other
- **Arm Flap**: Arms extend outward (Naruto run style)

```javascript
// Animation parameters (in playerMoved event)
const limbAmp = 1.4;  // Limb rotation amplitude
const bounce = Math.abs(Math.sin(time)) * 0.2;
```

---

### 6. Name Tag System

**Function**: `createNameSprite(text, health)`

Creates high-resolution 1024x256 canvas sprites for player names.

#### Visual Elements
1. **Player Name**:
   - Font: 80px "Comic Sans MS" (high-res)
   - Color: White with black outline (15px stroke)
   - Shadow: 8px blur

2. **Health Bar**:
   - Dimensions: 400x40px with 20px rounded corners
   - Border: White (6px outer border for "sticker" look)
   - Background: `#333` (dark)
   - Fill Color:
     - `#00fa9a` (green) if HP > 50%
     - `#ffd700` (gold) if HP 20-50%
     - `#ff4500` (orange-red) if HP < 20%

3. **Heart Icon**: Red ❤ at left of health bar

**Sprite Scale**: `(2.5, 0.625, 1)` world units  
**Position**: 3.0 units above character head

**Update Function**: `updateNameTag(mesh, name, health)`
- Removes old sprite and creates new one (canvas texture disposal)

---

### 7. Physics System

#### Movement Parameters
```javascript
const damping = 8.0;        // Friction coefficient
const accel = 600.0;        // Ground acceleration
const airControl = 0.3;     // Air strafe multiplier
const gravity = 9.8 * 100;  // Gravity force (mass = 100)
const jumpVelocity = 350;   // Upward velocity on jump
```

#### Collision Detection

**Function**: `checkCollision(position)`

Returns: `{hit: boolean, object?: Mesh, isWorldBound?: boolean}`

**Collision Types:**
1. **Obstacles**: AABB check with cylindrical player (radius 1.0)
   ```javascript
   if (dx < (2 + playerRadius) && dz < (2 + playerRadius)) 
   ```

2. **World Bounds**: `-48 ≤ X/Z ≤ 48`

#### Sliding Movement

**Function**: `resolveMovement(startPos, intendedMove)`

Implements wall-sliding physics:
1. Try full movement
2. If collision detected, calculate surface normal
3. Project movement vector onto slide plane: `V_slide = V - (V · N) * N`
4. Verify slide destination is collision-free

**Normal Determination:**
- World bounds: Cardinal direction normal
- Obstacles: Closest face normal (compare `|dx|` vs `|dz|`)

#### Ground Detection
```javascript
if (controls.getObject().position.y < 1.6) {
  velocity.y = 0;
  controls.getObject().position.y = 1.6;
  canJump = true;
}
```

---

### 8. Weapon System

#### Visual Model
```javascript
weapon = Group
├── Barrel: Box(0.1, 0.15, 0.6) [#555555 Iron]
└── Handle: Box(0.1, 0.3, 0.15) [#8b4513 Wood]

Position: (0.3, -0.25, -0.5) // Relative to camera
```

#### Shooting Mechanics

**Hit Detection Strategy**: "Thick Bullet" with magnetism

1. **Primary Ray**: Cast from camera center (crosshair)
2. **Direct Hit Check**: Raycast against all objects
3. **Magnetism Check** (if no direct hit):
   - Radius: 2.0 units around ray
   - Calculate closest point on ray to each player
   - Verify:
     - Distance to ray < `MAGNET_RADIUS` (2.0)
     - Distance from camera < wall occlusion distance
     - Line of sight clear (raycast from camera to player center)

**Damage**: 10 HP per hit (server-authoritative)

#### Visual Effects
- **Bullet Tracer**: 0.1x0.1x0.1 black cube, travels 60 units/sec for 0.5s
- **Hit Marker**: Red X overlay, displays for 100ms
- **Damage Flash**: Red screen overlay (opacity 0.3 for 100ms)

---

### 9. Audio System

**Class**: `SimpleAudio` (Web Audio API)

#### Sound Effects
```javascript
playShoot():  600Hz square wave, 0.1s duration
playHit():    100Hz sawtooth wave, 0.1s duration
playDie():    400Hz → 50Hz exponential sweep, 1s duration
```

**Master Volume**: 0.0 - 1.0 (default 0.5)  
**User Control**: Slider in pause menu

---

### 10. UI System

#### HUD Elements
1. **Crosshair**: 20px circle with 4px red center dot
2. **Health Display**:
   - Text: 32px bold Arial with shadow
   - Bar: 200x20px with color transitions
3. **Hit Marker**: 40x40px red X (rotated 45°)
4. **Damage Overlay**: Full-screen red flash
5. **Death Screen**: "YOU DIED" text with respawn message

#### Menu States
1. **Main Menu** (`#main-menu`):
   - Dark theme (#1a1a1a background)
   - Name input (max 12 chars)
   - Room code input (optional, 6-digit auto-generated)
   - Join button

2. **Pause Menu** (`#blocker`):
   - Click to resume
   - Volume slider
   - Lobby code display

**Control Flow:**
```
Main Menu → [JOIN] → Pause Menu → [CLICK] → Gameplay
                                     ↑
                              [ESC] ─┘
```

---

## Server Systems

### 11. Lobby Management

**Room Creation:**
- Auto-generated if empty room code provided
- Room codes are strings (6-digit numbers stored as strings)

**Player Limit**: 6 players per room

**Validation:**
```javascript
if (rooms[roomCode].length >= 6) {
  socket.emit('gameError', 'Room is full (Max 6 players).');
  return;
}
```

**Cleanup:** Rooms deleted when last player leaves

---

### 12. Combat System

**Hit Processing:**
```javascript
1. Receive shoot event from client
2. Validate: target exists && target.room === shooter.room
3. Apply damage: target.health -= 10
4. Broadcast playerHit to room
5. If health ≤ 0:
   - Emit playerKilled
   - Reset health to 100
   - Randomize spawn position
   - Emit playerRespawn
```

**Anti-Cheat Notes:**
- Room isolation: Players can only shoot others in same room
- Server-authoritative damage (client can't modify health)

**Current Limitations** (To Address Later):
- ❌ No rate limiting on shots
- ❌ No distance/range validation
- ❌ No ammo system
- ❌ Client-side hit detection (exploitable)

---

### 13. Spawn System

**Initial Spawn**: `(0, 2, 0)` on join

**Respawn Logic:**
```javascript
target.x = (Math.random() - 0.5) * 20;  // ±10 units
target.z = (Math.random() - 0.5) * 20;  // ±10 units
```

**Issues to Fix:**
- ⚠️ Can spawn inside obstacles
- ⚠️ No spawn protection
- ⚠️ No spawn point variety

---

## Planned Systems

### Phase 2 (Next Priority)
- [ ] **Weapon Variety**: Multiple guns with different stats
- [ ] **Ammo System**: Limited bullets, reload mechanic
- [ ] **Map System**: Multiple arenas, procedural generation
- [ ] **Power-ups**: Health packs, damage boosts, speed boosts

### Phase 3 (Future)
- [ ] **Game Modes**: Team Deathmatch, Capture the Flag, Battle Royale
- [ ] **Killstreaks**: Rewards for consecutive kills
- [ ] **Leaderboard**: Score tracking and display
- [ ] **Cosmetics**: Skins, hats, weapon skins

### Phase 4 (Advanced)
- [ ] **AI Bots**: PvE mode with NPC enemies
- [ ] **Voice Chat**: Proximity-based voice
- [ ] **Replay System**: Record and playback matches
- [ ] **Admin Tools**: Kick, ban, spectate

### Anti-Cheat Improvements Needed
- [ ] Server-side hit validation (raycast on server)
- [ ] Rate limiting (fire rate, movement speed)
- [ ] Position validation (detect teleporting)
- [ ] Health/damage verification

---

## System Constants & Configuration

### Game Balance
```javascript
// Combat
DAMAGE_PER_HIT = 10
MAX_HEALTH = 100
SHOOT_RATE = Unlimited (TODO: Add cooldown)
HIT_MAGNET_RADIUS = 2.0

// Movement
PLAYER_RADIUS = 1.0
EYE_HEIGHT = 1.6
MOVE_ACCEL = 600
AIR_CONTROL = 0.3
JUMP_VELOCITY = 350
GRAVITY = 980
DAMPING = 8.0

// World
WORLD_BOUNDS = 100x100 (±48 units from origin)
FLOOR_SIZE = 200x200
OBSTACLE_SIZE = 4x4x4
```

### Network
```javascript
SERVER_PORT = 3000
MAX_PLAYERS_PER_ROOM = 6
ROOM_CODE_LENGTH = 6
UPDATE_RATE = ~60fps (no throttling yet)
```

### Visual
```javascript
TEXTURE_RESOLUTION = 64x64
NAMETAG_RESOLUTION = 1024x256
SHADOW_MAP_SIZE = 2048x2048
FOG_DENSITY = 0.01
```

---

## Performance Notes

### Optimizations Implemented
- ✅ Nearest-neighbor texture filtering (fewer GPU operations)
- ✅ BasicShadowMap (hard shadows, cheaper than PCF)
- ✅ No antialiasing (pixel art style doesn't need it)
- ✅ Shared materials for obstacles/walls

### Known Performance Issues
- ⚠️ No network throttling (sends updates at 60fps)
- ⚠️ No culling (renders all players regardless of distance)
- ⚠️ Procedural animations every frame (could be optimized)

### Recommendations for Scaling
1. Implement network interpolation/prediction
2. Add frustum culling for distant players
3. Use object pooling for bullets/effects
4. Consider LOD system for player models
5. Throttle movement updates to 20-30fps

---

## Development Guidelines

### Adding New Systems
1. Document in this file under appropriate section
2. Update ARCHITECTURE.md if system changes overall design
3. Add usage examples to DEVELOPER_GUIDE.md
4. Update "Planned Systems" section

### Code Organization
```
public/
├── game.js         # Client systems (rendering, physics, UI)
├── index.html      # UI markup and styles
└── assets/         # (Future: textures, sounds, models)

server.js           # Server logic (lobby, combat, state)
package.json        # Dependencies
```

### Testing Checklist
- [ ] Test with 1 player (solo mode)
- [ ] Test with 2-6 players (multiplayer)
- [ ] Test room full scenario (7th player joins)
- [ ] Test disconnect/reconnect
- [ ] Test hit registration at various distances
- [ ] Test collision at corners/edges

---

**Document Version**: 0.1  
**Game Version**: Initial Phase  
**Contributors**: [Add names as team grows]