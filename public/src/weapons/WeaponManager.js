import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { WEAPONS, DEFAULT_WEAPON, getWeapon } from './WeaponDefinitions.js';

export class WeaponManager {
    constructor(scene, camera, audio) {
        this.scene = scene;
        this.camera = camera;
        this.audio = audio;

        this.loader = new GLTFLoader();
        this.weaponModels = {};         // Cached loaded models
        this.currentWeaponType = null;
        this.weaponGroup = null;        // Current weapon attached to camera
        this.lastFireTime = 0;
        this.isLoading = false;

        // Create a group to hold the weapon and hand
        this.weaponContainer = new THREE.Group();
        this.camera.add(this.weaponContainer);

        // Create first-person hand/arm
        this.handGroup = this._createFirstPersonHand();
        this.weaponContainer.add(this.handGroup);
    }

    // Create a Voxel-style (blocky) low-poly hand model (Arm Only - No Hand/Thumb)
    _createFirstPersonHand() {
        const handGroup = new THREE.Group();
        // Create a dedicated group for the arm meshes so we can toggle them independently of the weapon
        const armMeshes = new THREE.Group();
        handGroup.add(armMeshes);

        // Expose this group for easy toggling later
        handGroup.armMeshes = armMeshes;

        // --- Materials ---
        const skinMat = new THREE.MeshStandardMaterial({
            color: 0xE0B090,
            roughness: 0.8,
            metalness: 0.0
        });

        const sleeveMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A1A,
            roughness: 0.9,
            metalness: 0.1
        });

        // --- Helper for Voxel Limbs ---
        const createBoxLimb = (w, h, d, material) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            geo.translate(0, h / 2, 0); // Pivot at bottom
            const mesh = new THREE.Mesh(geo, material);
            mesh.castShadow = true;
            return mesh;
        };

        // ================= RIGHT ARM (Weapon Grip) =================
        const rightArmGroup = new THREE.Group();

        // 1. Forearm (Sleeve) - Just the arm extending
        const forearmR = createBoxLimb(0.1, 0.55, 0.1, sleeveMat);
        forearmR.rotation.x = -Math.PI / 2;
        rightArmGroup.add(forearmR);

        // Position Right Arm Group (Default)
        rightArmGroup.position.set(0.15, -0.25, -0.1);
        rightArmGroup.rotation.set(-1.2, -0.2, 0.2);

        // Add to ARM MESHES group, not directly to handGroup
        armMeshes.add(rightArmGroup);


        // ================= LEFT ARM (Support) =================
        const leftArmGroup = new THREE.Group();

        // 1. Forearm (Sleeve)
        const forearmL = createBoxLimb(0.1, 0.55, 0.1, sleeveMat);
        leftArmGroup.add(forearmL);

        // Position Left Arm Group
        leftArmGroup.position.set(-0.15, -0.3, -0.2);
        leftArmGroup.rotation.set(-0.8, 0.5, -0.4);

        // Add to ARM MESHES group
        armMeshes.add(leftArmGroup);

        // Initial default position 
        handGroup.position.set(0.2, -0.2, -0.3);

        return handGroup;
    }

    // Load all weapon models
    async loadWeapons() {
        this.isLoading = true;
        const loadPromises = Object.keys(WEAPONS).map(weaponId => this._loadWeapon(weaponId));

        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.warn('Some weapon models failed to load, using fallbacks');
        }

        this.isLoading = false;
    }

    // Load a single weapon model
    async _loadWeapon(weaponId) {
        const weaponDef = WEAPONS[weaponId];
        if (!weaponDef) return;

        return new Promise((resolve) => {
            this.loader.load(
                weaponDef.modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.weaponModels[weaponId] = model;
                    resolve(model);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load weapon model: ${weaponId}`, error);
                    // Create fallback geometry
                    this.weaponModels[weaponId] = this._createFallbackWeapon(weaponId);
                    resolve(this.weaponModels[weaponId]);
                }
            );
        });
    }

    // Create fallback primitive weapon if GLB fails to load
    _createFallbackWeapon(weaponId) {
        const group = new THREE.Group();

        // Different fallback shapes based on weapon type
        let barrelLength = 0.6;
        let color = 0x555555;

        switch (weaponId) {
            case 'ak47':
                barrelLength = 0.8;
                color = 0x4a3728;
                break;
            case 'sniper':
                barrelLength = 1.0;
                color = 0x2a2a2a;
                break;
            case 'slingshot':
                barrelLength = 0.3;
                color = 0x8b4513;
                break;
            default: // pistol
                barrelLength = 0.4;
                color = 0x555555;
        }

        const barrel = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.15, barrelLength),
            new THREE.MeshStandardMaterial({ color })
        );
        barrel.position.z = -barrelLength / 2;

        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.3, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        handle.position.set(0, -0.2, 0);
        handle.rotation.x = Math.PI / 6;

        group.add(barrel);
        group.add(handle);

        return group;
    }

    // Equip a weapon (show in first-person view)
    equipWeapon(weaponId) {
        const weaponDef = getWeapon(weaponId);
        if (!weaponDef) return;

        // Remove current weapon from hand
        if (this.weaponGroup) {
            this.handGroup.remove(this.weaponGroup);
        }

        // Get or create weapon model
        let model = this.weaponModels[weaponId];
        if (!model) {
            model = this._createFallbackWeapon(weaponId);
            this.weaponModels[weaponId] = model;
        }

        // Clone the model for display
        this.weaponGroup = model.clone();

        // Position weapon relative to hand (so it looks gripped)
        // Weapon handle should be where the hand grips
        const handOffset = weaponDef.handOffset || { x: 0, y: 0.05, z: -0.15 };
        this.weaponGroup.position.set(
            handOffset.x,
            handOffset.y,
            handOffset.z
        );
        this.weaponGroup.scale.set(
            weaponDef.scale.x,
            weaponDef.scale.y,
            weaponDef.scale.z
        );
        this.weaponGroup.rotation.set(
            weaponDef.rotation.x,
            weaponDef.rotation.y,
            weaponDef.rotation.z
        );

        // Attach weapon to hand group
        this.handGroup.add(this.weaponGroup);
        this.currentWeaponType = weaponId;

        // --- Apply Per-Weapon Arm Positioning ---
        // Dynamically adjust the entire hand/arm group to frame the weapon correctly
        const armPos = weaponDef.armPosition || { x: 0.22, y: -0.22, z: -0.35 };
        const armRot = weaponDef.armRotation || { x: 0.05, y: -0.1, z: 0.02 };

        this.handGroup.position.set(armPos.x, armPos.y, armPos.z);
        this.handGroup.rotation.set(armRot.x, armRot.y, armRot.z);

        // Toggle arm visibility based on weapon
        // Hide arms for Slingshot only, but keep weapon visible
        if (this.handGroup.armMeshes) {
            this.handGroup.armMeshes.visible = (weaponId !== 'slingshot');
        }
    }

    // Check if weapon can fire (fire rate limiting)
    canFire() {
        if (!this.currentWeaponType) return false;

        const weaponDef = getWeapon(this.currentWeaponType);
        const now = performance.now();

        return (now - this.lastFireTime) >= weaponDef.fireRate;
    }

    // Record that weapon was fired
    recordFire() {
        this.lastFireTime = performance.now();
    }

    // Get current weapon's world position (for raycasting origin)
    getWeaponWorldPosition(targetVector) {
        if (this.weaponGroup) {
            this.weaponGroup.getWorldPosition(targetVector);
        } else {
            this.camera.getWorldPosition(targetVector);
        }
        return targetVector;
    }

    // Play weapon-specific shoot sound
    playShootSound() {
        if (!this.audio || !this.currentWeaponType) return;

        const weaponDef = getWeapon(this.currentWeaponType);
        if (weaponDef.sound) {
            this.audio.playTone(
                weaponDef.sound.freq,
                weaponDef.sound.type,
                weaponDef.sound.duration,
                0.05
            );
        }
    }

    // Get current weapon type
    getCurrentWeapon() {
        return this.currentWeaponType;
    }

    // Get current weapon definition
    getCurrentWeaponDef() {
        return getWeapon(this.currentWeaponType);
    }

    // Check if a weapon model is loaded
    isLoaded(weaponId) {
        return !!this.weaponModels[weaponId];
    }

    // Clean up resources
    dispose() {
        if (this.weaponGroup) {
            this.weaponContainer.remove(this.weaponGroup);
        }
        this.camera.remove(this.weaponContainer);

        // Dispose of cached models
        Object.values(this.weaponModels).forEach(model => {
            model.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });

        this.weaponModels = {};
    }
}
