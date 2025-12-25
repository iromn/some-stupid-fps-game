const playerManager = require('./PlayerManager.js');

class CombatManager {
    handleShoot(shooterId, targetId) {
        const shooter = playerManager.getPlayer(shooterId);
        const target = playerManager.getPlayer(targetId);

        if (!shooter || !target) return null;
        if (shooter.room !== target.room) return null;
        if (target.isDead || target.health <= 0) return null; // Ignore shots on already dead players

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

        // Check if player died
        if (target.health <= 0) {
            // Increment attacker's kills
            const attackerKills = playerManager.incrementKills(shooterId);

            // Kill event with kill count
            const killResult = {
                type: 'kill',
                data: {
                    victimId: targetId,
                    killerId: shooterId,
                    killerKills: attackerKills,
                    room: shooter.room
                }
            };

            // Respawn Logic: Safe Angles (Gaps between piston clusters)
            const safeAngles = [30, 90, 150, 210, 270, 330];
            const degrees = safeAngles[Math.floor(Math.random() * safeAngles.length)];
            const baseAngle = degrees * (Math.PI / 180);
            const angle = baseAngle + (Math.random() * 0.35 - 0.175); // Reduced jitter
            const radius = 125 + Math.random() * 15; // OUTSIDE piston ring (was 100-120)

            target.isDead = true;
            target.health = 0;

            target.x = Math.cos(angle) * radius;
            target.y = 5;
            target.z = Math.sin(angle) * radius;

            const respawnResult = {
                type: 'respawn',
                data: {
                    id: targetId,
                    x: target.x,
                    y: target.y,
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
