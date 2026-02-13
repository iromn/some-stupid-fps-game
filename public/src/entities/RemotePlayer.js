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
    }

    update(data) {
        if (!this.mesh) return;

        // Visual smoothing with simple interpolation could go here, 
        // but sticking to existing logic:
        // Goofy Animation Logic
        const time = performance.now() / 100;
        const bounce = Math.abs(Math.sin(time)) * 0.2;

        this.mesh.position.set(data.x, (data.y - 1.6) + bounce, data.z);
        this.mesh.rotation.y = data.rotation;

        this.mesh.rotation.z = Math.cos(time) * 0.2;

        if (this.mesh.userData.limbs) {
            const limbAmp = 1.4;
            this.mesh.userData.limbs.leftLeg.rotation.x = Math.sin(time) * limbAmp;
            this.mesh.userData.limbs.rightLeg.rotation.x = Math.sin(time + Math.PI) * limbAmp;

            this.mesh.userData.limbs.leftArm.rotation.x = Math.sin(time + Math.PI) * limbAmp;
            this.mesh.userData.limbs.rightArm.rotation.x = Math.sin(time) * limbAmp;

            this.mesh.userData.limbs.leftArm.rotation.z = 0.5 + Math.abs(Math.sin(time)) * 0.3;
            this.mesh.userData.limbs.rightArm.rotation.z = -0.5 - Math.abs(Math.sin(time)) * 0.3;
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
