import { WeaponPickup } from './WeaponPickup.js';

export class PickupManager {
    constructor(scene, network) {
        this.scene = scene;
        this.network = network;
        this.pickups = {};  // id -> WeaponPickup
        this.lastPickupAttempt = 0;
        this.pickupCooldown = 500;  // ms between pickup attempts
    }

    // Add a pickup to the scene
    addPickup(pickupData) {
        // Don't add if already exists
        if (this.pickups[pickupData.id]) return;

        const pickup = new WeaponPickup(this.scene, pickupData);
        this.pickups[pickupData.id] = pickup;
    }

    // Remove a pickup from the scene
    removePickup(pickupId) {
        const pickup = this.pickups[pickupId];
        if (pickup) {
            pickup.remove();
            delete this.pickups[pickupId];
        }
    }

    // Update all pickups (animations)
    update(delta) {
        const time = performance.now() / 1000;

        Object.values(this.pickups).forEach(pickup => {
            pickup.update(delta, time);
        });
    }

    // Check if player is near any pickup
    checkProximity(playerPosition, range = 2.0) {
        // Removed cooldown check to allow continuous UI prompt

        for (const pickup of Object.values(this.pickups)) {
            if (pickup.isActive && pickup.isInRange(playerPosition, range)) {
                return pickup;
            }
        }
        return null;
    }

    // Get a pickup by id
    getPickup(pickupId) {
        return this.pickups[pickupId];
    }

    // Clear all pickups
    clear() {
        Object.values(this.pickups).forEach(pickup => pickup.remove());
        this.pickups = {};
    }

    // Get count of active pickups
    getActiveCount() {
        return Object.values(this.pickups).filter(p => p.isActive).length;
    }
}
