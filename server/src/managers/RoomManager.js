const { PLAYER_COLORS } = require('../utils/Constants.js');
const playerManager = require('./PlayerManager.js');

class RoomManager {
    constructor() {
        this.rooms = {}; // roomCode -> [playerId]
    }

    joinRoom(socket, roomCode, name) {
        // 1. Validation or Creation
        if (!this.rooms[roomCode]) {
            this.rooms[roomCode] = [];
        }

        if (this.rooms[roomCode].length >= 6) {
            socket.emit('gameError', 'Room is full (Max 6 players).');
            return null;
        }

        // 2. Assign Color
        const colorIndex = this.rooms[roomCode].length;
        const assignedColor = PLAYER_COLORS[colorIndex];

        // 3. Join Socket Room
        socket.join(roomCode);
        this.rooms[roomCode].push(socket.id);

        // 4. Create Player State
        const player = playerManager.addPlayer(socket.id, roomCode, name, assignedColor);

        return player;
    }

    leaveRoom(socket) {
        const p = playerManager.getPlayer(socket.id);
        if (p) {
            const roomCode = p.room;
            if (this.rooms[roomCode]) {
                this.rooms[roomCode] = this.rooms[roomCode].filter(id => id !== socket.id);
                if (this.rooms[roomCode].length === 0) {
                    delete this.rooms[roomCode];
                }
            }
            playerManager.removePlayer(socket.id);
            return roomCode;
        }
        return null;
    }

    getRoomPlayers(roomCode) {
        const ids = this.rooms[roomCode] || [];
        const players = {};
        ids.forEach(id => {
            players[id] = playerManager.getPlayer(id);
        });
        return players;
    }
}

module.exports = new RoomManager();
