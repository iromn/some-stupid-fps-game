import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPONS } from './WeaponDefinitions.js';

const loader = new GLTFLoader();
const modelCache = {};

export class WeaponPickup {
    constructor(scene, pickupData) {
        this.scene = scene;
        this.id = pickupData.id;
        this.weaponType = pickupData.weaponType;
        this.position = new THREE.Vector3(pickupData.x, pickupData.y, pickupData.z);
        this.isActive = true;

        // Container for the pickup (handles rotation/bobbing)
        this.container = new THREE.Group();
        this.container.position.copy(this.position);
        this.scene.add(this.container);

        // Mesh will be added after loading
        this.mesh = null;
        this.glowMesh = null;

        // Animation state
        this.bobOffset = Math.random() * Math.PI * 2;  // Random starting phase

        this._loadModel();
        this._createGlow();
    }

    _loadModel() {
        const weaponDef = WEAPONS[this.weaponType];
        if (!weaponDef) return;

        // Check cache
        if (modelCache[this.weaponType]) {
            this._attachModel(modelCache[this.weaponType].clone());
            return;
        }

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
                modelCache[this.weaponType] = model;
                this._attachModel(model.clone());
            },
            undefined,
            () => {
                // Fallback: create simple box
                const fallback = this._createFallbackModel();
                modelCache[this.weaponType] = fallback;
                this._attachModel(fallback.clone());
            }
        );
    }

    _createFallbackModel() {
        const group = new THREE.Group();
        let color = 0x555555;
        let size = 0.4;

        switch (this.weaponType) {
            case 'ak47': color = 0x4a3728; size = 0.6; break;
            case 'sniper': color = 0x2a2a2a; size = 0.7; break;
            case 'slingshot': color = 0x8b4513; size = 0.3; break;
            default: color = 0x555555; size = 0.4;
        }

        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, size),
            new THREE.MeshStandardMaterial({ color })
        );
        mesh.castShadow = true;
        group.add(mesh);

        return group;
    }

    _attachModel(model) {
        const weaponDef = WEAPONS[this.weaponType];
        const scale = weaponDef ? weaponDef.scale.x * 2 : 0.2;  // Larger for pickup visibility

        model.scale.setScalar(scale);
        model.rotation.set(0, 0, 0);  // Reset rotation, will be animated

        this.mesh = model;
        this.container.add(model);
    }

    _createGlow() {
        // Create a glowing sphere around the pickup
        const glowGeom = new THREE.SphereGeometry(0.8, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: this._getGlowColor(),
            transparent: true,
            opacity: 0.3
        });

        this.glowMesh = new THREE.Mesh(glowGeom, glowMat);
        this.container.add(this.glowMesh);
    }

    _getGlowColor() {
        switch (this.weaponType) {
            case 'pistol': return 0x00ffff;    // Cyan
            case 'ak47': return 0x00ff00;      // Green
            case 'sniper': return 0xff0000;    // Red
            case 'slingshot': return 0xff8800; // Orange
            default: return 0xffffff;
        }
    }

    update(delta, time) {
        if (!this.isActive) return;

        // Bobbing animation
        const bobHeight = Math.sin(time * 2 + this.bobOffset) * 0.2;
        this.container.position.y = this.position.y + bobHeight + 0.5;

        // Rotation animation
        this.container.rotation.y += delta * 2;

        // Glow pulsing
        if (this.glowMesh) {
            const pulse = 0.2 + Math.sin(time * 3 + this.bobOffset) * 0.1;
            this.glowMesh.material.opacity = pulse;
        }
    }

    // Check if player is close enough to pick up
    isInRange(playerPosition, range = 2.0) {
        return this.position.distanceTo(playerPosition) < range;
    }

    // Remove pickup from scene
    remove() {
        this.isActive = false;
        this.scene.remove(this.container);

        // Dispose resources
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        if (this.glowMesh) {
            this.glowMesh.geometry.dispose();
            this.glowMesh.material.dispose();
        }
    }
}
