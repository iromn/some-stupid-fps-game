# Architecture Documentation

> **Project**: Some Stupid FPS Game  
> **Version**: 0.1 (Initial Phase)  
> **Last Updated**: December 2024

---

## Table of Contents
- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Data Flow](#data-flow)
- [Scaling Considerations](#scaling-considerations)
- [Future Architecture](#future-architecture)

---

## System Overview

**Some Stupid FPS Game** is a client-server multiplayer FPS built with real-time networking. The architecture follows a traditional authoritative server model with client-side prediction.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Three.js   │  │  Socket.io   │  │     UI       │      │
│  │   Renderer   │  │    Client    │  │   System     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Game Loop (requestAnimationFrame)         │    │
│  │  • Physics Update (60fps)                           │    │
│  │  • Network Send (Position, Input)                   │    │
│  │  • Rendering (Scene, Camera, Objects)               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                    WebSocket (Socket.io)
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      SERVER (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Socket.io   │  │    Game      │      │
│  │    Server    │  │    Server    │  │    State     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │              Event-Driven Game Logic                │    │
│  │  • Connection Management                            │    │
│  │  • Lobby/Room System                                │    │
│  │  • Combat Resolution (Authoritative)                │    │
│  │  • State Synchronization                            │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Stack
```javascript
{
  "rendering": "Three.js v0.160.0",
  "networking": "Socket.io-client v4.7.4",
  "controls": "PointerLockControls (Three.js addon)",
  "audio": "Web Audio API (native)",
  "ui": "Vanilla HTML/CSS/JS (no framework)"
}
```

**Why These Choices?**
- **Three.js**: Industry-standard WebGL wrapper, excellent documentation
- **Socket.io**: Simplifies WebSocket management, auto-reconnect
- **Vanilla JS**: Lightweight, no build step needed (uses ES6 modules)

### Backend Stack
```javascript
{
  "runtime": "Node.js",
  "framework": "Express.js",
  "networking": "Socket.io v4.x",
  "hosting": "Process agnostic (PORT env var)"
}
```

**Why These Choices?**
- **Node.js**: JavaScript everywhere, fast I/O for real-time games
- **Express**: Minimal, serves static files efficiently
- **Socket.io**: Bidirectional event-based communication

### Development Tools
```bash
# Current Setup
- No build process (native ES6 modules)
- No transpilation needed
- CDN-based dependencies (unpkg.com)

# Future Considerations
- Vite/Webpack for bundling
- TypeScript for type safety
- ESLint for code quality
```

---

## Architecture Patterns

### 1. Client-Server Model

**Authority Distribution:**

| System | Authority | Reason |
|--------|-----------|--------|
| Movement | Client (Predicted) | Reduces input lag |
| Physics | Client (Simulated) | Smooth local experience |
| Hit Detection | Client (Sent to server) | ⚠️ INSECURE - Needs server validation |
| Damage | Server (Authoritative) | ✅ Prevents health hacking |
| Spawn | Server (Controlled) | ✅ Prevents teleportation |
| Lobby | Server (Managed) | ✅ Single source of truth |

**Current Architecture Issue:**  
❌ **Hit detection is client-side**, meaning:
- Clients determine if they hit someone
- Server trusts client's `targetId` in shoot event
- **Exploitable**: Modified clients can auto-aim or hit through walls

**Planned Fix (Phase 3):**  
✅ Move raycast to server using player positions

---

### 2. State Synchronization Pattern

**Server → Client (Broadcast Pattern)**
```javascript
// Server maintains single source of truth
players[socketId] = { health, position, ... }

// Broadcast changes to relevant clients
io.to(roomCode).emit('playerHit', updatedState)

// Clients update local copies
otherPlayers[id].health = newHealth
```

**Client → Server (Update Pattern)**
```javascript
// Client sends frequent position updates
socket.emit('playerMovement', localPosition)

// Server stores and rebroadcasts
players[socketId] = newPosition
socket.to(room).emit('playerMoved', newPosition)
```

**Why This Pattern?**
- Simple to implement in initial phase
- Low latency for position updates
- Server has full visibility for future anti-cheat

**Limitations:**
- High network bandwidth (60fps updates)
- No interpolation (choppy for high ping players)
- No lag compensation

---

### 3. Entity-Component Pattern (Lightweight)

While not using a formal ECS, the code follows component-like patterns:

**Player Entity Structure:**
```javascript
PlayerMesh (Group)
├── Geometry Component (createRobotCharacter)
│   ├── Head, Torso, Arms, Legs
│   └── userData.limbs (animation references)
├── Visual Component (NameSprite)
│   └── userData.isNameTag = true
└── State Component
    ├── userData.playerName
    ├── userData.health
    └── userData.originalColor
```

**Benefits:**
- Easy to extend (add new components as children)
- Clean separation of concerns
- userData pattern allows arbitrary data attachment

---

### 4. Event-Driven Architecture

**Server Events:**
```javascript
// Connection Lifecycle
io.on('connection', (socket) => {
  
  socket.on('joinGame', handleJoin)
  socket.on('playerMovement', handleMove)
  socket.on('shoot', handleShoot)
  socket.on('disconnect', handleDisconnect)
  
})
```

**Benefits:**
- Decoupled systems
- Easy to add new event types
- Natural fit for Socket.io

**Drawbacks:**
- Can become "spaghetti code" without discipline
- Hard to trace complex event chains
- No type safety (consider TypeScript later)

---

### 5. Procedural Generation Pattern

**Texture Generation:**
```javascript
function createPixelTexture(type) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Procedural algorithm (noise, patterns, colors)
  // ...
  
  return new THREE.CanvasTexture(canvas)
}
```

**Character Generation:**
```javascript
function createRobotCharacter(color) {
  // Build hierarchy procedurally
  const group = new THREE.Group()
  
  // Create parts with math-based positioning
  // ...
  
  return group
}
```

**Advantages:**
- Zero asset files needed
- Infinite variety from code
- Small bundle size
- Moddable (just change functions)

---

## Data Flow

### Gameplay Loop Data Flow

```
┌─────────── FRAME N ───────────┐
│                                │
│  CLIENT                        │
│  ┌──────────────────────────┐ │
│  │ 1. Read Input (WASD)     │ │
│  └────────┬─────────────────┘ │
│           │                    │
│  ┌────────▼─────────────────┐ │
│  │ 2. Update Physics        │ │
│  │    • Apply velocity      │ │
│  │    • Collision check     │ │
│  │    • Resolve sliding     │ │
│  └────────┬─────────────────┘ │
│           │                    │
│  ┌────────▼─────────────────┐ │
│  │ 3. Send Position         │ │
│  │    to Server             │ │
│  └────────┬─────────────────┘ │
└───────────┼────────────────────┘
            │
      [WebSocket]
            │
┌───────────▼────────────────────┐
│  SERVER                        │
│  ┌──────────────────────────┐ │
│  │ 4. Receive Position      │ │
│  └────────┬─────────────────┘ │
│           │                    │
│  ┌────────▼─────────────────┐ │
│  │ 5. Store in State        │ │
│  │    players[id] = pos     │ │
│  └────────┬─────────────────┘ │
│           │                    │
│  ┌────────▼─────────────────┐ │
│  │ 6. Broadcast to Room     │ │
│  └────────┬─────────────────┘ │
└───────────┼────────────────────┘
            │
      [WebSocket]
            │
┌───────────▼────────────────────┐
│  OTHER CLIENTS                 │
│  ┌──────────────────────────┐ │
│  │ 7. Update otherPlayers   │ │
│  │    mesh.position = pos   │ │
│  └────────┬─────────────────┘ │
│           │                    │
│  ┌────────▼─────────────────┐ │
│  │ 8. Render Scene          │ │
│  │    • Animate characters  │ │
│  │    • Update name tags    │ │
│  └──────────────────────────┘ │
└────────────────────────────────┘
```

### Combat Flow

```
SHOOTER CLIENT                SERVER                  VICTIM CLIENT
      │                         │                           │
      │ [Click Mouse]           │                           │
      ├──────────────────────┐  │                           │
      │ Raycast locally      │  │                           │
      │ Determine targetId   │  │                           │
      └──────────────────────┘  │                           │
      │                         │                           │
      │ emit('shoot', {        │                           │
      │   targetId: 'abc123'   │                           │
      │ })                      │                           │
      ├────────────────────────>│                           │
      │                         │                           │
      │                         ├─────────────────────────┐ │
      │                         │ Validate:               │ │
      │                         │ • target exists?        │ │
      │                         │ • same room?            │ │
      │                         │ Apply damage:           │ │
      │                         │   health -= 10          │ │
      │                         └─────────────────────────┘ │
      │                         │                           │
      │                         │ emit('playerHit', {      │
      │                         │   id: 'abc123',          │
      │                         │   health: 90,            │
      │                         │   attackerId: 'xyz789'   │
      │                         │ })                        │
      │                         ├──────────────────────────>│
      │<────────────────────────┤                           │
      │                         │                           │
      ├──────────────────────┐  │                           ├──────────────────┐
      │ Show hit marker     │  │                           │ Flash red        │
      │ Play sound          │  │                           │ Update health UI │
      └──────────────────────┘  │                           │ Play hit sound   │
                                │                           └──────────────────┘
```

---

## Scaling Considerations

### Current Bottlenecks (v0.1)

1. **Network Bandwidth**
   - Issue: 60fps position updates per player
   - Math: 6 players × 60fps × ~100 bytes = ~36 KB/s per client
   - Solution: Throttle to 20-30fps, use delta compression

2. **Server CPU**
   - Issue: Broadcasting every movement to all room members
   - Current: O(n²) for n players in room
   - Solution: Spatial partitioning, only send nearby players

3. **Client Rendering**
   - Issue: No culling, all players render regardless of visibility
   - Solution: Frustum culling, distance-based LOD

### Horizontal Scaling Plan (Phase 4)

**Single Server Limit**: ~50-100 concurrent rooms (300-600 players)

**Multi-Server Architecture:**
```
┌──────────────────────────────────────────────────┐
│           Load Balancer (nginx/HAProxy)          │
└─────────┬────────────┬────────────┬──────────────┘
          │            │            │
┌─────────▼──────┐ ┌───▼──────┐ ┌──▼───────────┐
│  Game Server 1 │ │ Server 2 │ │  Server N    │
│  Rooms: 1-100  │ │ 101-200  │ │  ...         │
└────────┬───────┘ └────┬─────┘ └──────┬───────┘
         │              │               │
         └──────────────┴───────────────┘
                        │
              ┌─────────▼──────────┐
              │   Redis PubSub     │
              │ (Cross-server chat)│
              └────────────────────┘
```

**Challenges to Solve:**
- Room affinity (keep players on same server)
- Cross-server messaging (friend invites, etc.)
- Shared state (leaderboards, accounts)

---

## Future Architecture

### Phase 2: Enhanced Client Architecture

**Add Client-Side Prediction:**
```javascript
// Predict own movement immediately
localPlayer.position.add(velocity)

// Reconcile with server when update arrives
if (serverPosition.distanceTo(localPlayer) > threshold) {
  localPlayer.position.copy(serverPosition) // Correction
}
```

**Add Interpolation for Others:**
```javascript
// Buffer recent positions
otherPlayer.positionBuffer = [pos1, pos2, pos3]

// Render between buffered positions
const interpolated = lerp(buffer[0], buffer[1], t)
```

### Phase 3: Server-Side Hit Validation

**Move Raycast to Server:**
```javascript
// server.js
socket.on('shootRequest', (data) => {
  const { origin, direction } = data
  
  // Server performs raycast using stored positions
  const hit = performRaycast(origin, direction, players)
  
  if (hit) {
    applyDamage(hit.targetId)
    io.to(room).emit('confirmedHit', hit)
  }
})
```

**Benefits:**
- ✅ Prevents wallhacks
- ✅ Server can validate range/angle
- ✅ Fair for all players

**Challenges:**
- Latency: Server sees positions 50-100ms in the past
- Solution: Lag compensation (rewind player positions)

### Phase 4: Microservices Architecture

**Service Breakdown:**
```
┌────────────────┐
│  Auth Service  │ ← Login, accounts, sessions
└────────────────┘

┌────────────────┐
│  Game Service  │ ← Current server.js (rooms, combat)
└────────────────┘

┌────────────────┐
│ Match Service  │ ← Matchmaking, lobby browser
└────────────────┘

┌────────────────┐
│ Stats Service  │ ← Leaderboards, profiles, achievements
└────────────────┘

┌────────────────┐
│  Chat Service  │ ← Text/voice chat (cross-server)
└────────────────┘
```

**Database Layer:**
```
┌────────────────┐
│   PostgreSQL   │ ← Persistent data (accounts, stats)
└────────────────┘

┌────────────────┐
│     Redis      │ ← Session state, cache, pub/sub
└────────────────┘
```

---

## Security Architecture

### Current Security Posture

**Implemented:**
- ✅ Room isolation (can't shoot players in other rooms)
- ✅ Server-authoritative health/damage
- ✅ Server-controlled spawning

**Missing (CRITICAL):**
- ❌ Input validation (name length, position bounds)
- ❌ Rate limiting (spam shoot events)
- ❌ Hit validation (client raycast trusted)
- ❌ Authentication (anyone can join)

### Planned Security Layers

**Phase 2: Input Validation**
```javascript
// Sanitize all client inputs
const MAX_NAME_LENGTH = 12
const MAX_POSITION = 100
const MAX_VELOCITY = 50

function validateMovement(data) {
  if (Math.abs(data.x) > MAX_POSITION) return false
  if (Math.abs(data.z) > MAX_POSITION) return false
  // Check if movement is physically possible
  return true
}
```

**Phase 3: Rate Limiting**
```javascript
const shootCooldown = new Map() // playerId -> lastShotTime

socket.on('shoot', (data) => {
  const now = Date.now()
  const lastShot = shootCooldown.get(socket.id) || 0
  
  if (now - lastShot < 100) { // 10 shots/sec max
    return // Ignore rapid fire
  }
  
  shootCooldown.set(socket.id, now)
  // Process shot...
})
```

**Phase 4: Authentication**
```javascript
// JWT-based session tokens
socket.on('authenticate', (token) => {
  const decoded = jwt.verify(token, SECRET)
  socket.userId = decoded.userId
  // Load player data from database
})
```

---

## Performance Monitoring

### Metrics to Track

**Server Metrics:**
```javascript
// Add to server.js
setInterval(() => {
  console.log({
    connectedPlayers: Object.keys(players).length,
    activeRooms: Object.keys(rooms).length,
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime()
  })
}, 60000) // Every minute
```

**Client Metrics (Future):**
- FPS (requestAnimationFrame delta)
- Network latency (ping)
- Packet loss rate
- Memory usage (performance.memory)

### Telemetry System (Phase 3)

**Send metrics to analytics:**
```javascript
// Track gameplay events
trackEvent('player_killed', {
  killerId: shooter.id,
  victimId: victim.id,
  weapon: 'default',
  distance: calculateDistance(shooter, victim)
})

// Track performance
trackMetric('client_fps', averageFPS)
trackMetric('network_latency', pingTime)
```

---

## Development Workflow

### Current Workflow
```bash
# 1. Start server
node server.js

# 2. Open browser to localhost:3000

# 3. Test changes (manual refresh)

# 4. Commit to git
```

### Improved Workflow (Phase 2)

```bash
# Install nodemon for auto-restart
npm install --save-dev nodemon

# Add to package.json
"scripts": {
  "dev": "nodemon server.js",
  "start": "node server.js"
}

# Development
npm run dev
```

**Add Live Reload:**
```javascript
// In game.js (dev only)
if (location.hostname === 'localhost') {
  new EventSource('/esbuild').addEventListener('change', () => {
    location.reload()
  })
}
```

---

## Testing Strategy

### Current Testing
- ⚠️ Manual testing only
- No automated tests
- No CI/CD pipeline

### Planned Testing Pyramid

**Unit Tests (Phase 2):**
```javascript
// test/physics.test.js
describe('checkCollision', () => {
  it('should detect obstacle collision', () => {
    const pos = new THREE.Vector3(10, 0, 10)
    const obstacle = createObstacle(10, 10)
    const result = checkCollision(pos, [obstacle])
    expect(result.hit).toBe(true)
  })
})
```

**Integration Tests (Phase 3):**
```javascript
// test/server.test.js
describe('Combat System', () => {
  it('should reduce health on valid hit', async () => {
    const room = createTestRoom()
    const shooter = room.players[0]
    const victim = room.players[1]
    
    await shooter.shoot(victim.id)
    
    expect(victim.health).toBe(90)
  })
})
```

**End-to-End Tests (Phase 4):**
```javascript
// Use Playwright or Puppeteer
describe('Multiplayer Flow', () => {
  it('should allow two players to shoot each other', async () => {
    const browser1 = await launchBrowser()
    const browser2 = await launchBrowser()
    
    await browser1.joinRoom('TEST123')
    await browser2.joinRoom('TEST123')
    
    await browser1.shoot()
    
    const health = await browser2.getHealth()
    expect(health).toBe(90)
  })
})
```

---

## Documentation Maintenance

### Update Triggers
- 📝 Update SYSTEMS.md when: Adding/modifying game mechanics
- 📝 Update ARCHITECTURE.md when: Changing tech stack or patterns
- 📝 Update DEVELOPER_GUIDE.md when: Adding new workflows or tools

### Version Control
```
docs/
├── SYSTEMS.md (v0.1, v0.2, ...)
├── ARCHITECTURE.md (v0.1, v0.2, ...)
└── DEVELOPER_GUIDE.md (v0.1, v0.2, ...)

# Use git tags for major versions
git tag -a v0.1 -m "Initial release"
git tag -a v0.2 -m "Added weapon system"
```

---

## Glossary

**Terms:**
- **Authoritative**: Server makes final decision (prevents cheating)
- **Client Prediction**: Client assumes action succeeds before server confirms
- **Interpolation**: Smooth rendering between network updates
- **Lag Compensation**: Server rewinds time to validate client actions
- **Tick Rate**: Server update frequency (currently unlimited, should be 20-60Hz)

**Acronyms:**
- **FPS**: First-Person Shooter (or Frames Per Second)
- **ECS**: Entity-Component-System
- **LOD**: Level of Detail
- **CDN**: Content Delivery Network
- **JWT**: JSON Web Token

---

**Document Version**: 0.1  
**Next Review**: After Phase 2 implementation  
**Maintainer**: [Add name]