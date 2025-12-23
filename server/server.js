const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const roomManager = require('./src/managers/RoomManager.js');
const playerManager = require('./src/managers/PlayerManager.js');
const combatManager = require('./src/managers/CombatManager.js');

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected: ' + socket.id);

  socket.on('joinGame', (data) => {
    const { roomCode, name } = data;
    const player = roomManager.joinRoom(socket, roomCode, name);

    if (player) {
      // Success
      const roomPlayers = roomManager.getRoomPlayers(roomCode);
      socket.emit('gameJoined', { roomCode, assignedColor: player.color, x: player.x, z: player.z });
      socket.emit('currentPlayers', roomPlayers);
      socket.to(roomCode).emit('newPlayer', player);
      console.log(`User ${name} joined room ${roomCode}`);
    }
  });

  socket.on('disconnect', () => {
    const roomCode = roomManager.leaveRoom(socket);
    if (roomCode) {
      io.to(roomCode).emit('userDisconnected', socket.id);
      console.log(`User disconnected from room ${roomCode}`);
    }
  });

  socket.on('playerMovement', (movementData) => {
    const p = playerManager.getPlayer(socket.id);
    if (p) {
      playerManager.updatePlayer(socket.id, movementData);
      socket.to(p.room).emit('playerMoved', p);
    }
  });

  socket.on('shoot', (shootData) => {
    const events = combatManager.handleShoot(socket.id, shootData.targetId);

    if (events) {
      events.forEach(event => {
        if (event.type === 'hit') {
          io.to(event.data.room).emit('playerHit', event.data);
        } else if (event.type === 'kill') {
          io.to(event.data.room).emit('playerKilled', event.data);
        } else if (event.type === 'respawn') {
          io.to(event.data.room).emit('playerRespawn', event.data);
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
