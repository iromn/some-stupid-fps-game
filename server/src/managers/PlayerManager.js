class PlayerManager {
    constructor() {
        this.players = {};
    }

    addPlayer(id, room, name, color) {
        // Safe Spawn Logic:
        // Piston Clusters are at 0, 60, 120, 180, 240, 330 (Radius 110)
        // Move spawn OUTSIDE the piston ring to avoid getting stuck in them
        // Ring is ~110. Let's spawn at 130 +/- 10.
        // Bounds are 150. 120-140 is safe.
        const safeAngles = [30, 90, 150, 210, 270, 330];
        const degrees = safeAngles[Math.floor(Math.random() * safeAngles.length)];
        const baseAngle = degrees * (Math.PI / 180);

        // Add jitter: +/- 10 degrees (reduced from ~28)
        const angle = baseAngle + (Math.random() * 0.35 - 0.175);

        // Radius: 125 to 140 (Outside piston ring)
        const radius = 125 + Math.random() * 15;

        this.players[id] = {
            playerId: id,
            room: room,
            name: name || `Player ${id.substr(0, 4)}`,
            color: color,
            x: Math.cos(angle) * radius,
            y: 5, // Spawn in air to prevent floor clipping
            z: Math.sin(angle) * radius,
            rotation: 0,
            health: 100,
            kills: 0,
            isDead: false
        };
        return this.players[id];
    }

    revivePlayer(id) {
        const p = this.players[id];
        if (p) {
            p.health = 100;
            p.isDead = false;
        }
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
