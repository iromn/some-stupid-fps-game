const { DEFAULT_WEAPON } = require('../utils/WeaponConfig.js');

class PlayerManager {
    constructor() {
        this.players = {};
    }

    addPlayer(id, room, name, color) {
        // Safe Spawn Logic:
        // Piston Clusters are at 0, 60, 120, 180, 240, 300 (Radius 110)
        // We spawn in the GAPS: 30, 90, 150, 210, 270, 330
        const safeAngles = [30, 90, 150, 210, 270, 330];
        const degrees = safeAngles[Math.floor(Math.random() * safeAngles.length)];
        const baseAngle = degrees * (Math.PI / 180);

        // Add jitter: +/- 15 degrees
        const angle = baseAngle + (Math.random() * 0.5 - 0.25);

        // Radius: 100 to 120 (Center of the ring roughly)
        const radius = 100 + Math.random() * 20;

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
            isDead: false,
            weaponType: DEFAULT_WEAPON,
            lastFireTime: 0
        };
        return this.players[id];
    }

    revivePlayer(id) {
        const p = this.players[id];
        if (p) {
            p.health = 100;
            p.isDead = false;
            p.weaponType = DEFAULT_WEAPON;  // Reset to pistol on respawn
        }
    }

    updateWeapon(id, weaponType) {
        const p = this.players[id];
        if (p) {
            p.weaponType = weaponType;
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
