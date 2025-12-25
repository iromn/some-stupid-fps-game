const playerManager = require('./PlayerManager.js');
const { WEAPONS, DEFAULT_WEAPON } = require('../utils/WeaponConfig.js');

class CombatManager {
    handleShoot(shooterId, targetId, weaponType = null) {
        const shooter = playerManager.getPlayer(shooterId);
        const target = playerManager.getPlayer(targetId);

        if (!shooter || !target) return null;
        if (shooter.room !== target.room) return null;
        if (target.isDead || target.health <= 0) return null; // Ignore shots on already dead players

        // Use weapon from parameter, or fall back to shooter's current weapon, or default
        const effectiveWeapon = weaponType || shooter.weaponType || DEFAULT_WEAPON;
        const weapon = WEAPONS[effectiveWeapon] || WEAPONS[DEFAULT_WEAPON];

        // Fire rate validation (server-side anti-cheat)
        const now = Date.now();
        if (shooter.lastFireTime && (now - shooter.lastFireTime) < weapon.fireRate) {
            return null; // Firing too fast, ignore shot
        }
        shooter.lastFireTime = now;

        // Apply weapon damage
        target.health -= weapon.damage;

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
            const angle = baseAngle + (Math.random() * 0.5 - 0.25); // +/- Jitter
            const radius = 100 + Math.random() * 20;

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
