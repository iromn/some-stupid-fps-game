const { PICKUP_LOCATIONS, PICKUP_RESPAWN_TIME } = require('../utils/WeaponConfig.js');

class WeaponManager {
    constructor() {
        // Track active pickups per room: roomCode -> { pickupId -> pickupData }
        this.activePickups = {};
        this.pickupCounter = 0;
    }

    // Initialize all pickups for a room when game starts
    initializePickups(roomCode) {
        this.activePickups[roomCode] = {};

        PICKUP_LOCATIONS.forEach((location, index) => {
            const pickupId = `pickup_${roomCode}_${index}`;
            this.activePickups[roomCode][pickupId] = {
                id: pickupId,
                x: location.x,
                y: location.y,
                z: location.z,
                weaponType: location.weaponType,
                spawnIndex: index,
                isActive: true
            };
        });
    }

    // Get all active pickups for a room
    getActivePickups(roomCode) {
        const roomPickups = this.activePickups[roomCode];
        if (!roomPickups) return [];

        return Object.values(roomPickups).filter(p => p.isActive);
    }

    // Try to pick up a weapon (returns result object)
    tryPickup(playerId, pickupId, roomCode) {
        const roomPickups = this.activePickups[roomCode];
        if (!roomPickups) {
            return { success: false, reason: 'no_room' };
        }

        const pickup = roomPickups[pickupId];
        if (!pickup) {
            return { success: false, reason: 'not_found' };
        }

        if (!pickup.isActive) {
            return { success: false, reason: 'already_taken' };
        }

        // Mark as inactive
        pickup.isActive = false;

        return {
            success: true,
            weaponType: pickup.weaponType,
            pickupId: pickupId,
            spawnIndex: pickup.spawnIndex
        };
    }

    // Respawn a pickup at a specific spawn index
    respawnPickup(spawnIndex, roomCode) {
        const roomPickups = this.activePickups[roomCode];
        if (!roomPickups) return null;

        const location = PICKUP_LOCATIONS[spawnIndex];
        if (!location) return null;

        const pickupId = `pickup_${roomCode}_${spawnIndex}`;

        // Reactivate the pickup
        roomPickups[pickupId] = {
            id: pickupId,
            x: location.x,
            y: location.y,
            z: location.z,
            weaponType: location.weaponType,
            spawnIndex: spawnIndex,
            isActive: true
        };

        return roomPickups[pickupId];
    }

    // Clean up room pickups when room is destroyed
    cleanupRoom(roomCode) {
        delete this.activePickups[roomCode];
    }

    // Get respawn time constant
    getRespawnTime() {
        return PICKUP_RESPAWN_TIME;
    }
}

module.exports = new WeaponManager();
