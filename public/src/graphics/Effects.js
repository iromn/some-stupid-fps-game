import * as THREE from 'three';
import { WEAPONS } from '../weapons/WeaponDefinitions.js';

export class Effects {
    constructor(scene) {
        this.scene = scene;
        // Cache Geometries
        this.rockGeo = new THREE.IcosahedronGeometry(0.15, 0);
        this.tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 0.3);

        // Cache Materials (Key for performance!)
        this.rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 });
        this.tracerMat = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Default, logic will clone/color
        this.tracerMats = {}; // Cache by color hex
    }

    getTracerMaterial(colorHex) {
        if (!this.tracerMats[colorHex]) {
            this.tracerMats[colorHex] = new THREE.MeshBasicMaterial({ color: colorHex });
        }
        return this.tracerMats[colorHex];
    }

    createBulletTracer(startPos, direction, weaponType) {
        const weaponDef = WEAPONS[weaponType];
        const visuals = weaponDef ? weaponDef.visuals : { projectileType: 'tracer', color: 0x00ffff };
        let bullet;

        // Visuals: Projectile
        if (startPos.x === undefined || isNaN(startPos.x)) {
            console.error('[EFFECTS] Invalid startPos:', startPos);
            return;
        }

        // Visuals: Projectile
        if (startPos.x === undefined || isNaN(startPos.x)) {
            console.error('[EFFECTS] Invalid startPos:', startPos);
            return;
        }

        if (visuals.projectileType === 'rock') {
            // SLINGSHOT ROCK
            bullet = new THREE.Mesh(this.rockGeo, this.rockMat);

            // Optional: Clone material if different colors needed, but rocks are usually grey
            // If we need custom rock color:
            if (visuals.color && visuals.color !== 0x888888) {
                // For now, shared grey is fine for performance
            }

        } else {
            // GUN TRACER
            const mat = this.getTracerMaterial(visuals.color || 0xffff00);
            bullet = new THREE.Mesh(this.tracerGeo, mat);

            // Use lookAt to orient cylinder/box along direction
            const lookTarget = startPos.clone().add(direction);
            bullet.lookAt(lookTarget);
        }

        bullet.position.copy(startPos);
        this.scene.add(bullet);

        // Visuals: Muzzle Flash
        if (visuals.flashColor) {
            this.createMuzzleFlash(startPos, visuals.flashColor);
        }

        const speed = visuals.projectileType === 'rock' ? 40 : 100; // Rocks act slower? Or same speed?
        // Game logic uses instant raycast, so visual speed is just effect. 
        // Sync roughly with raycast feeling.

        const start = performance.now();

        const update = () => {
            const delta = (performance.now() - start) / 1000;
            if (delta > 0.5) {
                this.scene.remove(bullet);
                if (bullet.geometry) bullet.geometry.dispose();
                if (bullet.material) bullet.material.dispose();
                return;
            }

            // Move bullet
            bullet.position.addScaledVector(direction, speed * 0.016);

            // Rotate rock for effect
            if (visuals.projectileType === 'rock') {
                bullet.rotation.x += 0.1;
                bullet.rotation.y += 0.1;
            }

            requestAnimationFrame(update);
        };
        update();
    }

    createMuzzleFlash(position, color) {
        const light = new THREE.PointLight(color, 2, 5); // Color, Intensity, Distance
        light.position.copy(position);
        this.scene.add(light);

        // Optional: Add a small sprite or mesh for the flash core?
        // Keeping it simple with PointLight for "flash" effect on surroundings

        setTimeout(() => {
            this.scene.remove(light);
            light.dispose();
        }, 50); // very short flash
    }
}
