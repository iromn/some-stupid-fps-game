class PlayerManager {
    constructor() {
        this.players = {};
    }

    addPlayer(id, room, name, color) {
        this.players[id] = {
            playerId: id,
            room: room,
            name: name || `Player ${id.substr(0, 4)}`,
            color: color,
            x: 0,
            y: 2,
            z: 0,
            rotation: 0,
            health: 100,
            kills: 0
        };
        return this.players[id];
    }

    removePlayer(id) {
        const p = this.players[id];
        if (p) {
            delete this.players[id];
        }
        return p;
    }

    getPlayer(id) {
        return this.players[id];
    }

    updatePlayer(id, data) {
        const p = this.players[id];
        if (p) {
            p.x = data.x;
            p.y = data.y;
            p.z = data.z;
            p.rotation = data.rotation;
        }
    }

    incrementKills(id) {
        const p = this.players[id];
        if (p) {
            p.kills++;
            return p.kills;
        }
        return 0;
    }
}

module.exports = new PlayerManager();
// Export Singleton for simplicity across managers in v0.1
