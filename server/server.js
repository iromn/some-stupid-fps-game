const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// --- Phase 6: Lobby & State ---
const players = {}; // id -> { room, name, color, x, y, z, rot, health }
const rooms = {};   // roomCode -> [playerId1, playerId2, ...]

// Defined Colors for Max 6 Players
const PLAYER_COLORS = [
  0xff0000, // Red
  0x0000ff, // Blue
  0x00ff00, // Green
  0xffff00, // Yellow
  0x00ffff, // Cyan
  0xff00ff  // Magenta
];

io.on('connection', (socket) => {
  console.log('a user connected: ' + socket.id);

  // Phase 6: Join Game (Lobby)
  socket.on('joinGame', (data) => {
    const { roomCode, name } = data;

    // 1. Validation or Creation
    if (!rooms[roomCode]) {
      rooms[roomCode] = [];
    }

    if (rooms[roomCode].length >= 6) {
      socket.emit('gameError', 'Room is full (Max 6 players).');
      return;
    }

    // 2. Assign Color
    const colorIndex = rooms[roomCode].length;
    const assignedColor = PLAYER_COLORS[colorIndex];

    // 3. Join Socket Room
    socket.join(roomCode);
    rooms[roomCode].push(socket.id);

    // 4. Create Player State
    players[socket.id] = {
      playerId: socket.id,
      room: roomCode,
      name: name || `Player ${socket.id.substr(0, 4)}`,
      color: assignedColor,
      x: 0,
      y: 2, // Adjusted for new map height
      z: 0,
      rotation: 0,
      health: 100
    };

    // 5. Notify Client Success
    // Send ONLY players in this room to the new joiner
    const roomPlayers = {};
    rooms[roomCode].forEach(pid => {
      roomPlayers[pid] = players[pid];
    });
    socket.emit('gameJoined', { roomCode, assignedColor, x: 0, z: 0 });
    socket.emit('currentPlayers', roomPlayers);

    // 6. Notify Room
    socket.to(roomCode).emit('newPlayer', players[socket.id]);

    console.log(`User ${name} joined room ${roomCode}`);
  });

  // Handle Disconnect
  socket.on('disconnect', () => {
    const p = players[socket.id];
    if (p) {
      const roomCode = p.room;
      // Remove from room list
      if (rooms[roomCode]) {
        rooms[roomCode] = rooms[roomCode].filter(id => id !== socket.id);
        if (rooms[roomCode].length === 0) delete rooms[roomCode];
      }

      io.to(roomCode).emit('userDisconnected', socket.id);
      delete players[socket.id];
      console.log(`User disconnected from room ${roomCode}`);
    }
  });

  // Handle Movement
  socket.on('playerMovement', (movementData) => {
    const p = players[socket.id];
    if (p) {
      p.x = movementData.x;
      p.y = movementData.y;
      p.z = movementData.z;
      p.rotation = movementData.rotation;
      socket.to(p.room).emit('playerMoved', p);
    }
  });

  // Handle Shooting
  socket.on('shoot', (shootData) => {
    const p = players[socket.id];
    if (p) {
      const targetId = shootData.targetId;
      const target = players[targetId];

      // Anti-cheat/Validation: Ensure target is in same room
      if (target && target.room === p.room) {
        target.health -= 10;

        // Broadcast Hit in Room
        io.to(p.room).emit('playerHit', { id: targetId, health: target.health });

        // Death Logic
        if (target.health <= 0) {
          io.to(p.room).emit('playerKilled', { victimId: targetId, killerId: socket.id });

          // Respawn
          target.health = 100;
          target.x = (Math.random() - 0.5) * 20; // Random spawn in area
          target.z = (Math.random() - 0.5) * 20;

          io.to(p.room).emit('playerRespawn', {
            id: targetId,
            x: target.x,
            z: target.z
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
