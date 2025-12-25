import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Player {
    constructor(camera, domElement, scene, physics, input, network, audio, ui) {
        this.camera = camera;
        this.scene = scene;
        this.physics = physics;
        this.input = input;
        this.network = network;
        this.audio = audio;
        this.ui = ui;

        this.controls = new PointerLockControls(camera, domElement);
        this.scene.add(this.controls.getObject());

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.canJump = false;

        this.raycaster = new THREE.Raycaster();

        // --- Weapon Config ---
        this.weaponConfig = {
            'slingshot': { ammo: Infinity, maxAmmo: Infinity, cooldown: 1.5, offset: new THREE.Vector3(0.2, -0.2, -0.3), scale: 1 },
            'pistol': { ammo: 30, maxAmmo: 30, cooldown: 0.2, offset: new THREE.Vector3(0.2, -0.2, -0.4), scale: 1 },
            'ak47': { ammo: 20, maxAmmo: 20, cooldown: 0.1, offset: new THREE.Vector3(0.2, -0.25, -0.5), scale: 0.8 },
            'sniper': { ammo: 5, maxAmmo: 5, cooldown: 2.0, offset: new THREE.Vector3(0.2, -0.25, -0.6), scale: 0.8 }
        };

        this.weapons = {}; // Loaded meshes
        this.currentWeaponName = 'slingshot';
        this.currentAmmo = Infinity;
        this.lastShotTime = 0;

        this._initWeapons();

        // Events
        this._initInputEvents();
    }

    _initWeapons() {
        this.weaponGroup = new THREE.Group();
        this.camera.add(this.weaponGroup);

        const loader = new GLTFLoader();
        const loadWeapon = (name, path) => {
            loader.load(path, (gltf) => {
                const mesh = gltf.scene;
                // Standardize orientation/scale if needed
                mesh.rotation.y = 0; // Face forward (-Z)
                // Generator handle was at 0,0,0.

                mesh.visible = false;
                this.weaponGroup.add(mesh);
                this.weapons[name] = mesh;

                // Equip if it's the current one
                if (name === this.currentWeaponName) {
                    this._equip(name);
                }
            }, undefined, (err) => console.error(`Failed to load ${name}`, err));
        };

        loadWeapon('slingshot', './assets/weapons/slingshot.glb');
        loadWeapon('pistol', './assets/weapons/pistol.glb');
        loadWeapon('ak47', './assets/weapons/ak47.glb');
        loadWeapon('sniper', './assets/weapons/sniper.glb');
    }

    _equip(name) {
        if (!this.weapons[name]) return;

        // Hide old
        if (this.weapons[this.currentWeaponName]) {
            this.weapons[this.currentWeaponName].visible = false;
        }

        this.currentWeaponName = name;
        const w = this.weapons[name];
        const config = this.weaponConfig[name];

        w.visible = true;
        w.position.copy(config.offset);
        w.scale.setScalar(config.scale);

        // Update Stats (Reset ammo on switch? Or persist? "Reset for now")
        // User said: "Pistol will have 30 ammo". Implies per-weapon pool or reset.
        // Let's implement PER WEAPON persistence if we want, or reset.
        // Request: "For now lets add a cooldown for reload and later we will tweak".
        // Let's just set Current Ammo to Max on equip (Simplest "refill") OR track separate pools.
        // Implementation Plan said: "Decrement ammo".
        // Let's check config.
        if (this.weaponConfig[name].currentAmmo === undefined) {
            this.weaponConfig[name].currentAmmo = this.weaponConfig[name].maxAmmo;
        }
        this.currentAmmo = this.weaponConfig[name].currentAmmo;

        // Reset Scope if active
        if (this.isScoped) {
            this.camera.fov = this.baseFov || 75;
            this.camera.updateProjectionMatrix();
            this.isScoped = false;
        }

        console.log(`Equipped ${name}. Ammo: ${this.currentAmmo}`);
    }

    _initInputEvents() {
        // Controls Locking
        const blocker = document.getElementById('blocker'); // Accessing direct DOM or via UI... 
        // Ideally UI handles this, but Controls needs the callback.
        // Let's rely on UI passing the event or standard DOM bubbling? 
        // The original code uses 'click' on blocker.

        blocker.addEventListener('click', (e) => {
            if (e.target.id !== 'volume-slider') {
                this.controls.lock();
                this.audio.resume();
            }
        });

        this.controls.addEventListener('lock', () => this.ui.togglePauseMenu(false));
        this.controls.addEventListener('unlock', () => {
            // Need to know if game joined
            if (this.isJoined) this.ui.togglePauseMenu(true);
        });

        // Mouse Actions
        document.addEventListener('mousedown', (e) => {
            if (!this.controls.isLocked) return;

            // Left Click (0) -> Shoot
            if (e.button === 0) {
                this.shoot();
            }

            // Right Click (2) -> Scope
            if (e.button === 2) {
                this._toggleScope();
            }
        });

        // Weapon Switching
        document.addEventListener('keydown', (e) => {
            if (!this.controls.isLocked) return;
            if (e.key === '1') this._equip('slingshot');
            if (e.key === '2') this._equip('pistol');
            if (e.key === '3') this._equip('ak47');
            if (e.key === '4') this._equip('sniper');
        });
    }

    _toggleScope() {
        if (this.currentWeaponName !== 'sniper') return;

        if (this.isScoped) {
            // Unscope
            this.camera.fov = this.baseFov || 75;
            this.isScoped = false;
        } else {
            // Scope
            this.baseFov = this.camera.fov;
            this.camera.fov = 20; // Zoomed
            this.isScoped = true;
        }
        this.camera.updateProjectionMatrix();
    }

    setJoined(val) {
        this.isJoined = val;
    }

    setPosition(x, y, z) {
        this.controls.getObject().position.set(x, y, z);
    }

    update(delta, obstacles) {
        if (!this.controls.isLocked) return;

        // Physics Constants
        const speed = 400.0 * delta; // Reduced from 600
        // Original: 
        // if (moveForward) velocity.z -= 600.0 * delta; 

        // Decay
        // Decay handled in ground check now for varying friction
        // this.velocity.x -= this.velocity.x * 10.0 * delta;
        // this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 100.0 * delta; // Gravity

        this.direction.z = Number(this.input.moveForward) - Number(this.input.moveBackward);
        this.direction.x = Number(this.input.moveLeft) - Number(this.input.moveRight);
        this.direction.normalize();

        let accel = 400.0;
        if (this.isOnGround === false) accel = 100.0; // Reduced Air Control (Fixes Bunny Hop)
        if (this.surfaceType === 'ice') accel = 50.0; // Hard to start/stop on ice

        if (this.input.moveForward || this.input.moveBackward) this.velocity.z -= this.direction.z * accel * delta;
        if (this.input.moveLeft || this.input.moveRight) this.velocity.x -= this.direction.x * accel * delta;

        // Clamp Horizontal Speed (Prevents runoff speed stacking)
        // Normal Max: 60.0. Ice Max: 180.0 (3x)
        const maxSpeed = this.surfaceType === 'ice' ? 180.0 : 60.0;
        const hVel = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (hVel > maxSpeed) {
            const factor = maxSpeed / hVel;
            this.velocity.x *= factor;
            this.velocity.z *= factor;
        }

        // Jump
        // Input class doesn't auto-reset jump or apply velocity. 
        // Original: if (canJump) velocity.y += 350; canJump = false;
        // Let's check Input state.
        // Only jump if grounded (checked below)
        // Wait, original code had Jump in "keydown", applying Impulse immediately.
        // My Input class has `canJump` flag but didn't expose the "Impulse". 
        // Let's check if we are grounded in Physics loop.

        // Actually, I put "Space" logic in Input.js but commented out the velocity change.
        // Let's handle it here:
        if (this.input.canJump && this.canJump) {
            this.velocity.y += 200; // Reduced from 350 for lower jump
            this.canJump = false;
            this.input.canJump = false;
        }

        // Apply Velocity to Position (Simulation)
        const controlObj = this.controls.getObject();

        // Do X/Z movement
        const intendedMove = new THREE.Vector3(
            this.velocity.x * delta,
            0,
            this.velocity.z * delta
        );

        // Transform direction to Camera alignment
        // The Velocity is relative to Camera Look? 
        // Controls.moveRight/Forward handles local transform.
        // Original code used velocity directly on object?
        // Wait, PointerLockControls has moveForward/moveRight methods which move relative to camera.
        // But original code manually calculated velocity and applied to position?
        // Let's re-read game.js (Step 58) Physics Loop?
        // It's missing in the snippet! It stops at resolveMovement helper.
        // I need to be careful.
        // PointerLockControls usually: controls.moveForward(distance).
        // If the original game manually set position, I must replicate that behavior.
        // Looking at `resolveMovement`, it takes `startPos` and `intendedMove`.
        // So yes, manual position update.

        // We need to convert Local Velocity (WASD) to World Movement.
        // this.velocity is Local if we use it with keys.
        // But we need to rotate it by Y.
        // Actually, let's use the provided `moveRight` / `moveForward` helpers from controls to get direction vectors?
        // Or manually rotate.

        // Let's assume the original `resolveMovement` logic implies we calculate a World Vector `intendedMove`.
        // How to get World Vector from Local Input?
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);

        const forward = new THREE.Vector3(0, 0, -1).applyEuler(euler);
        const right = new THREE.Vector3(1, 0, 0).applyEuler(euler);

        // Flatten
        forward.y = 0; forward.normalize();
        right.y = 0; right.normalize();

        const move = new THREE.Vector3();
        move.addScaledVector(forward, -this.velocity.z * delta); // Vel Z is negative for forward usually
        move.addScaledVector(right, this.velocity.x * delta);

        // Apply Physics Resolve
        const resolution = this.physics.resolveMovement(controlObj.position, move);
        controlObj.position.copy(resolution.pos);

        // Vertical Movement with Ceiling Check
        const verticalDelta = this.velocity.y * delta;

        // CEILING CHECK (when moving up)
        if (this.velocity.y > 0) {
            // Reuse main raycaster, set Upward
            this.raycaster.set(controlObj.position, new THREE.Vector3(0, 1, 0));

            // Optimize: Use nearby obstacles from Physics spatial cache
            const obstructions = this.physics.getNearbyObstacles(controlObj.position, 10);
            // 10 units radius is plenty for ceiling check (just above head)

            const ceilingHits = this.raycaster.intersectObjects(obstructions, false);

            // Check for ceiling within player height + movement distance
            const headClearance = 0.2; // Player head above eye level
            const maxCeilingDist = headClearance + Math.abs(verticalDelta);

            // Also check floor? No, floor is below.
            // But technically if we are under a platform, it's an obstacle.

            for (const hit of ceilingHits) {
                if (hit.distance < maxCeilingDist) {
                    // Hit ceiling! Stop upward movement
                    this.velocity.y = 0;
                    // Snap player just below ceiling
                    controlObj.position.y = hit.point.y - headClearance - 0.01;
                    break;
                }
            }
        }

        // Apply vertical movement (now potentially clamped)
        controlObj.position.y += this.velocity.y * delta;

        // VOID CHECK
        if (controlObj.position.y < -30) {
            // Respawn safe
            this.velocity.set(0, 0, 0);
            controlObj.position.set(0, 10, 0);
            this.audio.playDie(); // Optional feedback
        }

        // Ground Check (Raycast)
        // Raycast down from slightly higher to prevent tunneling if falling fast
        // Origin: position.y + 1.0 (Head/Center?), Cast Down.
        // If position is feet (approx), we want to cast from +0.5 to -Distance.
        // Let's assume controlObj.position is Eye Level ~ 1.6
        // Raycast from 1.6 down.
        // If we fall to 0.1, 1.6 -> 0.1 is 1.5 dist. Valid.
        // If we fall to -0.5, 1.6 -> -0.5 is 2.1 dist.
        // Range should be enough to catch it.
        // However, if we clip *through* geometry, correct origin matters.

        const rayOrigin = controlObj.position.clone();
        // rayOrigin.y += 0.0; // Already at eye level?

        this.raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

        // Optimize: Use Spatial Cache
        const level = this.physics.level;
        // Radius 30 to catch ground below if high up? 
        // Or if falling fast.
        const nearby = this.physics.getNearbyObstacles(controlObj.position, 40);

        let intersects = this.raycaster.intersectObjects(nearby, false);
        if (intersects.length === 0) {
            intersects = this.raycaster.intersectObject(level.floor, false);
        } else {
            const floorIntersects = this.raycaster.intersectObject(level.floor, false);
            if (floorIntersects.length > 0) {
                // Optimization: Manual merge/compare
                // If we have both, pick closest.
                // intersectObjects sorts by distance. 
                // intersects[0] is closest obstacle.

                const floorDist = floorIntersects[0].distance;
                const obsDist = intersects[0].distance;

                if (floorDist < obsDist) {
                    intersects = floorIntersects; // Floor is closer
                }
                // Else keep obstacles (already sorted)
            }
        }

        // Actually, cleaner fix:
        // Just let Raycast check `level.getObstacles()`.
        // And check `level.floor`.

        const obsHits = this.raycaster.intersectObjects(level.getObstacles(), false);
        const floorHits = this.raycaster.intersectObject(level.floor, false);

        // Combine hits manually/cheaply
        let closestHit = null;
        if (obsHits.length > 0) closestHit = obsHits[0];
        if (floorHits.length > 0) {
            if (!closestHit || floorHits[0].distance < closestHit.distance) {
                closestHit = floorHits[0];
            }
        }

        // Mock the array for the loop (only needs to contain closestHit if any)
        const candidates = closestHit ? [closestHit] : [];
        // intersects variable used below is just candidates
        intersects = candidates;

        let onGround = false;
        let groundY = 0;
        let surfaceType = 'normal';

        // Find closest ground below
        for (const hit of intersects) {
            // Distance Check:
            // Eye Height 1.6.
            // Tolerance +0.2 -> 1.8 max dist.
            // If delta Y is large, we might need more range?
            // Let's increase range to catch fast falls, but snap correctly.
            const maxGroundDist = 2.5; // Increased from 1.65 to catch fast falls/slopes

            if (hit.distance < maxGroundDist && this.velocity.y <= 0) {
                onGround = true;
                // Snap to exact floor height (hit.point.y + eyeHeight)
                groundY = hit.point.y + 1.6;

                // Check surface type
                if (hit.object.userData.type) {
                    surfaceType = hit.object.userData.type;
                } else if (hit.object === level.floor) {
                    surfaceType = 'normal';
                }

                // Moving Platform Logic
                if (hit.object.userData.velocity) {
                    controlObj.position.add(hit.object.userData.velocity.clone().multiplyScalar(delta));
                }

                break; // Closest hit is ground
            }
        }

        if (onGround) {
            this.isOnGround = true;
            this.surfaceType = surfaceType;

            // Landed
            if (surfaceType === 'slime') {
                this.velocity.y = 350;
                this.canJump = false;
                this.audio.playShoot();
            } else {
                this.velocity.y = 0;
                controlObj.position.y = groundY;
                this.canJump = true;

                // Ice Friction Logic
                // Friction = Damping factor. 
                // Normal=10.0 (Stops fast). Ice=0.5 (was 0.5, reduce to 0.2 for more slip)
                const friction = surfaceType === 'ice' ? 0.2 : 10.0;
                this.velocity.x -= this.velocity.x * friction * delta;
                this.velocity.z -= this.velocity.z * friction * delta;
            }
        } else {
            this.isOnGround = false;
            // Air resistance
            this.velocity.x -= this.velocity.x * 2.0 * delta;
            this.velocity.z -= this.velocity.z * 2.0 * delta;
        }

        // Send Update
        this.network.emit('playerMovement', {
            x: controlObj.position.x,
            y: controlObj.position.y,
            z: controlObj.position.z,
            rotation: controlObj.rotation.y
        });
    }

    shoot() {
        const now = performance.now() / 1000;

        // Cooldown Check
        const stats = this.weaponConfig[this.currentWeaponName];
        if (now - this.lastShotTime < stats.cooldown) {
            return; // Cooldown
        }

        // Ammo Check
        if (this.currentAmmo <= 0) {
            // Dry fire sound?
            return;
        }

        // Consume Ammo (if not infinite)
        if (stats.ammo !== Infinity) {
            this.currentAmmo--;
            this.weaponConfig[this.currentWeaponName].currentAmmo = this.currentAmmo; // Update persistent
            console.log(`Shot fired. Ammo: ${this.currentAmmo}`);
        }

        this.lastShotTime = now;

        // Visual
        const weaponPos = new THREE.Vector3();
        // Use the group or current weapon mesh?
        if (this.weapons[this.currentWeaponName]) {
            this.weapons[this.currentWeaponName].getWorldPosition(weaponPos);
        } else {
            // Fallback if not loaded
            this.camera.getWorldPosition(weaponPos);
        }

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        weaponPos.addScaledVector(dir, 1.0); // Start slightly ahead


        this.audio.playShoot();

        // Logic
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const visualType = this.currentWeaponName === 'slingshot' ? 'rock' : 'bullet';

        // Pass to Game for handling effects/network
        if (this.onShootRequest) {
            this.onShootRequest(this.raycaster, weaponPos, dir, visualType);
        }
    }
}
