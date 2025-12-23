import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

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

        // Weapon
        this._initWeapon();

        // Events
        this._initInputEvents();
    }

    _initWeapon() {
        this.weapon = new THREE.Group();
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
        barrel.position.z = -0.3;
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
        handle.position.set(0, -0.2, 0);
        handle.rotation.x = Math.PI / 6;
        this.weapon.add(barrel);
        this.weapon.add(handle);
        this.weapon.position.set(0.3, -0.25, -0.5);
        this.camera.add(this.weapon);
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

        // Shooting
        document.addEventListener('mousedown', () => {
            if (!this.controls.isLocked) return;
            this.shoot();
        });
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
        const speed = 600.0 * delta; // accel * delta? No, accel is 600.
        // Original: 
        // if (moveForward) velocity.z -= 600.0 * delta; 

        // Decay
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        this.velocity.y -= 9.8 * 100.0 * delta; // Gravity

        this.direction.z = Number(this.input.moveForward) - Number(this.input.moveBackward);
        this.direction.x = Number(this.input.moveLeft) - Number(this.input.moveRight);
        this.direction.normalize();

        if (this.input.moveForward || this.input.moveBackward) this.velocity.z -= this.direction.z * 600.0 * delta;
        if (this.input.moveLeft || this.input.moveRight) this.velocity.x -= this.direction.x * 600.0 * delta;

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

        // Vertical Movement
        controlObj.position.y += this.velocity.y * delta;

        // Ground Check
        if (controlObj.position.y < 1.6) {
            this.velocity.y = 0;
            controlObj.position.y = 1.6;
            this.canJump = true;
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
        // Visual
        const weaponPos = new THREE.Vector3();
        this.weapon.getWorldPosition(weaponPos);
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        weaponPos.addScaledVector(dir, 0.5);

        this.audio.playShoot();

        // Logic
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        if (this.onShootRequest) {
            this.onShootRequest(this.raycaster, weaponPos, dir);
        }
    }
}
