import { createPlayerMesh } from './Character.js';
import { updateNameTag } from '../ui/NameTag.js';

export class RemotePlayer {
    constructor(scene, data) {
        this.scene = scene;
        this.id = data.playerId;
        this.mesh = createPlayerMesh(data.playerId, data.x, data.y, data.z, data.color, data.name);
        this.mesh.userData.playerName = data.name;

        if (data.health !== undefined) {
            updateNameTag(this.mesh, data.name, data.health);
        }

        this.scene.add(this.mesh);

        // Interpolation State
        this.targetPosition = new THREE.Vector3(data.x, data.y, data.z);
        this.targetRotation = data.rotation;
    }

    update(data) {
        // Network Update: Set Target
        if (data.x !== undefined) this.targetPosition.set(data.x, data.y, data.z);
        if (data.rotation !== undefined) this.targetRotation = data.rotation;

        // Update Name/Health immediate
        if (data.health !== undefined) {
            import('../ui/NameTag.js').then(m => m.updateNameTag(this.mesh, data.name || this.mesh.userData.playerName, data.health));
        }
    }

    tick(delta) {
        if (!this.mesh) return;

        // Interpolate Position
        // Lerp factor: Adjust for smoothness vs lag. 10.0 * delta is decent.
        const lerpFactor = 10.0 * delta;

        this.mesh.position.lerp(this.targetPosition, lerpFactor);

        // Interpolate Rotation (Y-axis only)
        // Shortest path interpolation for angles
        let diff = this.targetRotation - this.mesh.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.mesh.rotation.y += diff * lerpFactor;

        // Goofy Animation Logic (Visuals only)
        // Only animate if moving?
        const speed = this.mesh.position.distanceTo(this.targetPosition);
        const time = performance.now() / 100;

        // Bounce relative to ground (target Y)
        // If we interpolate Y, the "bounce" might fight the lerp?
        // Let's add bounce to the MESH VISUAL (a child?), or just modify Y after Lerp?
        // If we modify Y here, next Lerp will try to pull it back to target.
        // Solution: Apply bounce as an offset or modify the logic.
        // The original code set Y to (targetY - 1.6) + bounce.
        // Now mesh.position IS the interpolated world position.
        // Let's just add bounce to the existing Y?
        // No, that accumulates.
        // We need 'base Y' vs 'visual Y'.
        // For simplicity: We Lerp to Target (Base).
        // Then we add bounce offset?
        // But if we modify `mesh.position`, the next frame's start point is wrong.
        // Correct way: Only animate limbs.
        // But original had "bounce". 
        // Let's keep the limbs part and skip body bounce for now to avoid jitter, 
        // OR add a "Body Mesh" child that bounces.
        // The current mesh IS the group.
        // Let's just animate limbs.

        // this.mesh.rotation.z = Math.cos(time) * 0.2; // Tilt
        if (speed > 0.1) {
            this.mesh.rotation.z = Math.cos(time) * 0.2 * Math.min(speed * 10, 1);
        } else {
            this.mesh.rotation.z = this.mesh.rotation.z * (1 - lerpFactor); // Return to 0
        }

        if (this.mesh.userData.limbs) {
            const isMoving = speed > 0.05; // Threshold
            const limbAmp = isMoving ? 1.4 : 0.1; // Idle breath?

            // If moving, animate fast. If idle, slow.
            // Using global time is simplest.

            this.mesh.userData.limbs.leftLeg.rotation.x = Math.sin(time) * limbAmp;
            this.mesh.userData.limbs.rightLeg.rotation.x = Math.sin(time + Math.PI) * limbAmp;

            this.mesh.userData.limbs.leftArm.rotation.x = Math.sin(time + Math.PI) * limbAmp;
            this.mesh.userData.limbs.rightArm.rotation.x = Math.sin(time) * limbAmp;

            this.mesh.userData.limbs.leftArm.rotation.z = 0.5 + Math.abs(Math.sin(time)) * (isMoving ? 0.3 : 0.05);
            this.mesh.userData.limbs.rightArm.rotation.z = -0.5 - Math.abs(Math.sin(time)) * (isMoving ? 0.3 : 0.05);
        }
    }

    remove() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            // Cleanup geometries/materials if needed, but Three.js handles simple removal okay-ish
            // Ideally explicit dispose, but keeping it simple as per original
        }
    }
}
