import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createPlayerMesh } from './Character.js';
import { updateNameTag } from '../ui/NameTag.js';
import { WEAPONS, DEFAULT_WEAPON } from '../weapons/WeaponDefinitions.js';

// Shared model cache across all remote players
const weaponModelCache = {};
const loader = new GLTFLoader();

export class RemotePlayer {
    constructor(scene, data) {
        this.scene = scene;
        this.id = data.playerId;
        this.mesh = createPlayerMesh(data.playerId, data.x, data.y, data.z, data.color, data.name);
        this.mesh.userData.playerName = data.name;

        if (data.health !== undefined) {
            updateNameTag(this.mesh, data.name, data.health);
        }

        // Weapon state
        this.currentWeaponType = data.weaponType || DEFAULT_WEAPON;
        this.weaponMesh = null;

        // Load and attach weapon
        this._loadWeapon(this.currentWeaponType);

        this.scene.add(this.mesh);
    }

    // Load weapon model and attach to character's hand
    _loadWeapon(weaponType) {
        const weaponDef = WEAPONS[weaponType];
        if (!weaponDef) return;

        // Check cache first
        if (weaponModelCache[weaponType]) {
            this._attachWeapon(weaponModelCache[weaponType].clone(), weaponType);
            return;
        }

        // Load the model
        loader.load(
            weaponDef.modelPath,
            (gltf) => {
                const model = gltf.scene;
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                weaponModelCache[weaponType] = model;
                this._attachWeapon(model.clone(), weaponType);
            },
            undefined,
            () => {
                // Fallback: create simple box weapon
                const fallback = this._createFallbackWeapon(weaponType);
                weaponModelCache[weaponType] = fallback;
                this._attachWeapon(fallback.clone(), weaponType);
            }
        );
    }

    // Create fallback primitive weapon
    _createFallbackWeapon(weaponType) {
        const group = new THREE.Group();
        let barrelLength = 0.4;
        let color = 0x555555;

        switch (weaponType) {
            case 'ak47': barrelLength = 0.6; color = 0x4a3728; break;
            case 'sniper': barrelLength = 0.8; color = 0x2a2a2a; break;
            case 'slingshot': barrelLength = 0.2; color = 0x8b4513; break;
        }

        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.1, barrelLength),
            new THREE.MeshStandardMaterial({ color })
        );
        barrel.position.z = barrelLength / 2;
        group.add(barrel);

        return group;
    }

    // Attach weapon model to character's right arm
    _attachWeapon(model, weaponType) {
        // Remove existing weapon
        if (this.weaponMesh) {
            const attachPoint = this.mesh.userData.limbs?.rightArm?.userData?.weaponAttach;
            if (attachPoint) {
                attachPoint.remove(this.weaponMesh);
            }
        }

        // Get weapon definition for scaling
        const weaponDef = WEAPONS[weaponType];
        const scale = weaponDef ? weaponDef.scale.x * 0.6 : 0.08;  // Smaller for third-person

        model.scale.setScalar(scale);
        model.rotation.set(0, Math.PI / 2, 0);  // Point forward

        // Attach to right arm
        const attachPoint = this.mesh.userData.limbs?.rightArm?.userData?.weaponAttach;
        if (attachPoint) {
            attachPoint.add(model);
            this.weaponMesh = model;
        }
    }

    // Update weapon when player picks up a new one
    updateWeapon(weaponType) {
        if (weaponType !== this.currentWeaponType) {
            this.currentWeaponType = weaponType;
            this._loadWeapon(weaponType);
        }
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
