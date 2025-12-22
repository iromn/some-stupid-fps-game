const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

// --- Phase 3: Multiplayer State ---
const players = {};

io.on('connection', (socket) => {
  console.log('a user connected: ' + socket.id);

  // 1. Create a new player object
  players[socket.id] = {
    x: 0,
    y: 1.6,
    z: 0,
    rotation: 0,
    health: 100, // Phase 4: Health
    playerId: socket.id
  };

  // 2. Send the players object to the new player
  socket.emit('currentPlayers', players);

  // 3. Update all other players of the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // 4. Handle Disconnect
  socket.on('disconnect', () => {
    console.log('user disconnected: ' + socket.id);
    delete players[socket.id];
    io.emit('userDisconnected', socket.id);
  });

  // 5. Handle Movement
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].z = movementData.z;
      players[socket.id].rotation = movementData.rotation;

      // Broadcast to others (excluding sender)
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
    // 6. Handle Shooting (Phase 4)
    socket.on('shoot', (shootData) => {
      const targetId = shootData.targetId;
      if (players[targetId]) {
        players[targetId].health -= 10;
        console.log(`Player ${socket.id} hit ${targetId}. New Health: ${players[targetId].health}`);

        // Notify everyone about the hit
        io.emit('playerHit', { id: targetId, health: players[targetId].health });

        // Check for Death
        if (players[targetId].health <= 0) {
          io.emit('playerKilled', { victimId: targetId, killerId: socket.id });

          // Respawn Logic
          players[targetId].health = 100;
          players[targetId].x = (Math.random() - 0.5) * 10;
          players[targetId].z = (Math.random() - 0.5) * 10;

          io.emit('playerRespawn', {
            id: targetId,
            x: players[targetId].x,
            z: players[targetId].z
          });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
