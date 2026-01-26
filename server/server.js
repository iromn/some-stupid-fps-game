const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const roomManager = require('./src/managers/RoomManager.js');
const playerManager = require('./src/managers/PlayerManager.js');
const combatManager = require('./src/managers/CombatManager.js');
const weaponManager = require('./src/managers/WeaponManager.js');

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('a user connected: ' + socket.id);

  socket.on('joinGame', (data) => {
    const { roomCode, name } = data;
    const player = roomManager.joinRoom(socket, roomCode, name);

    if (player) {
      // Success
      const roomPlayers = roomManager.getRoomPlayers(roomCode);
      const hostId = roomManager.getHost(roomCode);

      socket.emit('gameJoined', { roomCode, assignedColor: player.color, x: player.x, z: player.z, hostId });
      socket.emit('currentPlayers', roomPlayers);
      socket.emit('currentPlayers', roomPlayers);
      socket.to(roomCode).emit('newPlayer', player);

      // Send existing pickups state (Fix for visibility on rejoin/late join)
      const currentPickups = weaponManager.getActivePickups(roomCode);
      if (currentPickups.length > 0) {
        socket.emit('pickupsState', currentPickups);
      }

      // Phase 8: Update Waiting Room (include hostId)
      io.to(roomCode).emit('roomUpdate', { players: roomManager.getRoomPlayers(roomCode), hostId });

      console.log(`User ${name} joined room ${roomCode}`);
    }
  });

  socket.on('disconnect', () => {
    const roomCode = roomManager.leaveRoom(socket);
    if (roomCode) {
      io.to(roomCode).emit('userDisconnected', socket.id);

      // Phase 8: Update Waiting Room UI for others (with new host if changed)
      const roomPlayers = roomManager.getRoomPlayers(roomCode);
      const hostId = roomManager.getHost(roomCode);
      io.to(roomCode).emit('roomUpdate', { players: roomPlayers, hostId });

      console.log(`User disconnected from room ${roomCode}`);
    }
  });

  const GAME_DURATION = 150 * 1000; // 2.5 Minutes

  // Phase 8: Start Game (Host Only)
  socket.on('startGame', () => {
    const p = playerManager.getPlayer(socket.id);
    if (p) {
      const result = roomManager.startGame(p.room, socket.id);
      if (result.success) {
        // Reset Stats for New Game
        playerManager.resetStats(p.room);

        // Initialize weapon pickups for this room
        weaponManager.initializePickups(p.room);
        const pickups = weaponManager.getActivePickups(p.room);
        io.to(p.room).emit('pickupsState', pickups);

        // Broadcast Countdown
        const countdownTime = 3000; // 3 seconds
        const startTime = Date.now() + countdownTime + 500; // +500ms buffer

        io.to(p.room).emit('countdownStart', { startTime });

        // Server-side State Transition & Game Timer
        setTimeout(() => {
          roomManager.setPlaying(p.room);
          // Send duration so client calculates local end time (avoids clock sync issues)
          const currentPlayers = roomManager.getRoomPlayers(p.room);
          io.to(p.room).emit('gameStart', { duration: GAME_DURATION, players: currentPlayers }); // Unlock controls and sync pos

          // Schedule Game End
          setTimeout(() => {
            const roomPlayers = roomManager.getRoomPlayers(p.room);
            const playersList = Object.values(roomPlayers);

            // Determine Winner (Most Kills)
            // Sort by kills descending
            playersList.sort((a, b) => (b.kills || 0) - (a.kills || 0));

            const winner = playersList.length > 0 ? playersList[0] : null;

            console.log(`[DEBUG] Game End. Room: ${p.room}, Players: ${playersList.length}, Winner: ${winner ? winner.name : 'None'}`);

            io.to(p.room).emit('gameFinished', {
              winner: winner,
              leaderboard: playersList
            });

            // Fallback: Emit to host specifically
            socket.emit('gameFinished', {
              winner: winner,
              leaderboard: playersList
            });

            // Reset Room State
            roomManager.resetRoom(p.room);

          }, GAME_DURATION);

        }, countdownTime + 500);
      } else {
        socket.emit('gameError', result.error);
      }
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
    const events = combatManager.handleShoot(socket.id, shootData.targetId, shootData.weaponType);

    if (events) {
      events.forEach(event => {
        if (event.type === 'hit') {
          io.to(event.data.room).emit('playerHit', event.data);
        } else if (event.type === 'kill') {
          io.to(event.data.room).emit('playerKilled', event.data);
        } else if (event.type === 'respawn') {
          // Delay respawn by 3 seconds
          setTimeout(() => {
            playerManager.revivePlayer(event.data.id);
            io.to(event.data.room).emit('playerRespawn', event.data);
          }, 3000);
        }
      });
    }
  });

  // Visual Shot Event (Broadcast Only)
  socket.on('playerShoot', (data) => {
    // data: { origin, direction }
    const p = playerManager.getPlayer(socket.id);
    if (p) {
      socket.to(p.room).emit('playerShot', {
        shooterId: socket.id,
        origin: data.origin,
        direction: data.direction
      });
    }
  });

  socket.on('damageObstacle', (data) => {
    // data: { id, damage }
    // Ideally validate player is in same room
    const p = playerManager.getPlayer(socket.id);
    if (p) {
      // Broadcast to room
      io.to(p.room).emit('obstacleDamaged', {
        id: data.id,
        damage: data.damage,
        attackerId: socket.id
      });
    }
  });

  // Weapon pickup attempt
  socket.on('pickupWeapon', (data) => {
    const p = playerManager.getPlayer(socket.id);
    if (!p) return;

    const result = weaponManager.tryPickup(socket.id, data.pickupId, p.room);

    if (result.success) {
      // Update player's weapon
      playerManager.updateWeapon(socket.id, result.weaponType);

      // Notify all players in room
      io.to(p.room).emit('pickupCollected', {
        pickupId: result.pickupId,
        playerId: socket.id,
        weaponType: result.weaponType
      });

      // Schedule respawn
      const respawnTime = weaponManager.getRespawnTime();
      setTimeout(() => {
        const respawnedPickup = weaponManager.respawnPickup(result.spawnIndex, p.room);
        if (respawnedPickup) {
          io.to(p.room).emit('pickupRespawned', respawnedPickup);
        }
      }, respawnTime);
    }
  });

  // Weapon switch (player manually switches)
  socket.on('weaponSwitch', (data) => {
    const p = playerManager.getPlayer(socket.id);
    if (p) {
      playerManager.updateWeapon(socket.id, data.weaponType);
      socket.to(p.room).emit('playerWeaponChanged', {
        playerId: socket.id,
        weaponType: data.weaponType
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
