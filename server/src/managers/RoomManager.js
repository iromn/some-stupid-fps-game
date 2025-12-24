const { PLAYER_COLORS } = require('../utils/Constants.js');
const playerManager = require('./PlayerManager.js');

class RoomManager {
    constructor() {
        this.rooms = {}; // roomCode -> [playerId]
        this.roomStates = {}; // roomCode -> 'waiting' | 'countdown' | 'playing'
        this.roomHosts = {}; // roomCode -> hostSocketId
    }

    joinRoom(socket, roomCode, name) {
        // 1. Validation or Creation
        const isNewRoom = !this.rooms[roomCode];
        if (isNewRoom) {
            this.rooms[roomCode] = [];
            this.roomStates[roomCode] = 'waiting';
            this.roomHosts[roomCode] = socket.id; // First joiner is host
        }

        // Check State - Only join if waiting
        if (this.roomStates[roomCode] !== 'waiting') {
            socket.emit('gameError', 'Game already in progress.');
            return null;
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

                // If room empty, delete
                if (this.rooms[roomCode].length === 0) {
                    delete this.rooms[roomCode];
                    delete this.roomStates[roomCode];
                    delete this.roomHosts[roomCode];
                } else {
                    // Transfer host if leaving player was host
                    if (this.roomHosts[roomCode] === socket.id) {
                        this.roomHosts[roomCode] = this.rooms[roomCode][0]; // Next player becomes host
                    }
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

    getHost(roomCode) {
        return this.roomHosts[roomCode] || null;
    }

    isHost(roomCode, socketId) {
        return this.roomHosts[roomCode] === socketId;
    }

    // Phase 8: State Management (Host-Only)
    startGame(roomCode, socketId) {
        if (!this.isHost(roomCode, socketId)) {
            return { success: false, error: 'Only the host can start the game.' };
        }
        if (this.rooms[roomCode] && this.roomStates[roomCode] === 'waiting') {
            this.roomStates[roomCode] = 'countdown';
            return { success: true };
        }
        return { success: false, error: 'Game cannot be started.' };
    }

    setPlaying(roomCode) {
        if (this.rooms[roomCode]) {
            this.roomStates[roomCode] = 'playing';
        }
    }
}

module.exports = new RoomManager();
