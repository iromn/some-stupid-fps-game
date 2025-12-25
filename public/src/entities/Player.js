import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WeaponManager } from '../weapons/WeaponManager.js';
import { DEFAULT_WEAPON } from '../weapons/WeaponDefinitions.js';

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

        // Game state - tracks if player has started playing (first successful pointer lock)
        this.gameStarted = false;

        // Weapon
        this._initWeapon();

        // Events
        this._initInputEvents();
    }

    _initWeapon() {
        this.weaponManager = new WeaponManager(this.scene, this.camera, this.audio);
        this.currentWeaponType = DEFAULT_WEAPON;

        // Load weapons and equip default
        this.weaponManager.loadWeapons().then(() => {
            this.weaponManager.equipWeapon(DEFAULT_WEAPON);
        });
    }

    // Switch to a different weapon
    switchWeapon(weaponType) {
        if (this.weaponManager.isLoaded(weaponType)) {
            this.weaponManager.equipWeapon(weaponType);
            this.currentWeaponType = weaponType;
            this.network.emit('weaponSwitch', { weaponType });
        }
    }

    // Attempt to pick up a weapon (sends request to server)
    tryPickupWeapon(pickupId) {
        this.network.emit('pickupWeapon', { pickupId });
    }

    // Get current weapon type
    getCurrentWeapon() {
        return this.currentWeaponType;
    }

    _initInputEvents() {
        // Set up resume callback from UI
        this.ui.onResume(() => {
            this.controls.lock();
            this.audio.resume();
        });

        // Set up sensitivity callback from UI
        this.ui.onSensitivity((sensitivity) => {
            // PointerLockControls uses pointerSpeed property
            if (this.controls) {
                this.controls.pointerSpeed = sensitivity;
            }
        });

        // ESC and P key handlers for pause menu toggle
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.controls.isLocked) {
                    // Unlock controls (shows pause menu)
                    this.controls.unlock();
                } else if (this.isJoined) {
                    // Lock controls (hides pause menu)
                    this.controls.lock();
                    this.audio.resume();
                }
            }
        });

        this.controls.addEventListener('lock', () => {
            this.gameStarted = true;
            this.ui.hideClickToStart();
            this.ui.togglePauseMenu(false);
        });
        this.controls.addEventListener('unlock', () => {
            // Only show pause menu if game has actually started (player has played before)
            if (this.isJoined && this.gameStarted) {
                this.ui.togglePauseMenu(true);
            }
        });

        // Prevent clicks on blocker/pause menu from triggering pointer lock
        const blocker = document.getElementById('blocker');
        if (blocker) {
            blocker.addEventListener('mousedown', (e) => {
                // Only stop propagation if blocker is visible
                if (blocker.style.display !== 'none') {
                    e.stopPropagation();
                }
            });
            blocker.addEventListener('click', (e) => {
                if (blocker.style.display !== 'none') {
                    e.stopPropagation();
                }
            });
        }

        // Shooting
        document.addEventListener('mousedown', () => {
            if (!this.controls.isLocked) return;
            this.shoot();
        });
    }

    setJoined(val) {
        this.isJoined = val;
    }

    // Method to programmatically lock controls (for auto-start after countdown)
    lockControls() {
        // Try to lock - but this may fail if not triggered by user gesture
        this.controls.lock();
        this.audio.resume();

        // Show click-to-start overlay as fallback (will be hidden on successful lock)
        // Use a small delay to check if lock succeeded
        setTimeout(() => {
            if (!this.controls.isLocked && this.isJoined && !this.gameStarted) {
                this.ui.showClickToStart(() => {
                    this.controls.lock();
                    this.audio.resume();
                });
            }
        }, 100);
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
            const level = this.physics.level;
            const ceilingRay = new THREE.Raycaster(
                controlObj.position.clone(),
                new THREE.Vector3(0, 1, 0) // Cast upward
            );

            const candidates = level.getObstacles().filter(Boolean);
            const ceilingHits = ceilingRay.intersectObjects(candidates, false);

            // Check for ceiling within player height + movement distance
            const headClearance = 0.2; // Player head above eye level
            const maxCeilingDist = headClearance + Math.abs(verticalDelta);

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

        // Optimize: Only check level geometry (floor + obstacles)
        const level = this.physics.level;
        const candidates = [...level.getObstacles(), level.floor].filter(Boolean);

        const intersects = this.raycaster.intersectObjects(candidates, false);

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
        // Check fire rate
        if (!this.weaponManager.canFire()) return;

        // Get weapon position for visual effects
        const weaponPos = new THREE.Vector3();
        this.weaponManager.getWeaponWorldPosition(weaponPos);
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        weaponPos.addScaledVector(dir, 0.5);

        // Play weapon-specific sound
        this.weaponManager.playShootSound();
        this.weaponManager.recordFire();

        // Logic
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Pass to Game for handling effects/network (include weapon type)
        if (this.onShootRequest) {
            this.onShootRequest(this.raycaster, weaponPos, dir, this.currentWeaponType);
        }
    }
}
