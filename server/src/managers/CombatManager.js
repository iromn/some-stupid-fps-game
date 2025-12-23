const playerManager = require('./PlayerManager.js');

class CombatManager {
    handleShoot(shooterId, targetId) {
        const shooter = playerManager.getPlayer(shooterId);
        const target = playerManager.getPlayer(targetId);

        if (!shooter || !target) return null;
        if (shooter.room !== target.room) return null;

        // Validation Passed
        target.health -= 10;

        const result = {
            type: 'hit',
            data: {
                id: targetId,
                health: target.health,
                attackerId: shooterId,
                room: shooter.room
            }
        };

        if (target.health <= 0) {
            // Kill
            const killResult = {
                type: 'kill',
                data: {
                    victimId: targetId,
                    killerId: shooterId,
                    room: shooter.room
                }
            };

            // Respawn Logic
            target.health = 100;
            target.x = (Math.random() - 0.5) * 20;
            target.z = (Math.random() - 0.5) * 20;

            const respawnResult = {
                type: 'respawn',
                data: {
                    id: targetId,
                    x: target.x,
                    z: target.z,
                    room: shooter.room
                }
            };

            return [result, killResult, respawnResult];
        }

        return [result];
    }
}

module.exports = new CombatManager();
