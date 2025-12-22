import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { io } from 'socket.io-client';

// --- Phase 5: Audio System (Synth) ---
class SimpleAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5; // Default 50%
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Apply Master Volume
        const finalVol = vol * this.masterVolume;

        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() { this.playTone(600, 'square', 0.1, 0.05); }
    // Reduced base volume for Hit (0.1 -> 0.05)
    playHit() { this.playTone(100, 'sawtooth', 0.1, 0.05); }

    playDie() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Apply Master Volume
        const baseVol = 0.1; // Reduced from 0.2
        const finalVol = baseVol * this.masterVolume;

        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1);
        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    }
}
const sfx = new SimpleAudio();

// Volume Slider Listener
// Wait for DOM to be ready or just check if element exists
setTimeout(() => {
    const volSlider = document.getElementById('volume-slider');
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            sfx.setVolume(parseFloat(e.target.value));
        });
        // Set initial state
        volSlider.value = sfx.masterVolume;
    }
}, 100);


// --- Phase 1, 2, 3: Core Setup ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(0, 20, 10);
scene.add(dirLight);

// Controls
const controls = new PointerLockControls(camera, document.body);
const blocker = document.createElement('div');
Object.assign(blocker.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    fontSize: '24px', fontFamily: 'monospace'
});
blocker.innerHTML = `
    <p style="font-size: 36px; margin-bottom: 20px;">Click to Play</p>
    <div style="font-size: 16px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;">
        <label for="volume-slider">Master Volume</label><br>
        <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="0.5" style="margin-top: 10px; cursor: pointer;">
    </div>
`;
document.body.appendChild(blocker);

// Prevent slider clicks from locking the pointer immediately (stop propagation)
// We need to query the slider AFTER appending
const slider = blocker.querySelector('#volume-slider');
if (slider) {
    slider.addEventListener('click', (e) => e.stopPropagation());
    slider.addEventListener('mousedown', (e) => e.stopPropagation());
}

blocker.addEventListener('click', (e) => {
    // Only lock if we didn't click the slider (handled by stopPropagation, but good to be safe)
    if (e.target.id !== 'volume-slider') {
        controls.lock();
        sfx.ctx.resume();
    }
});
controls.addEventListener('lock', () => blocker.style.display = 'none');
controls.addEventListener('unlock', () => blocker.style.display = 'flex');
scene.add(controls.getObject());


// --- Phase 5: Map & Environment ---

// Floor
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Walls (Boundaries)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
const walls = new THREE.Group();
scene.add(walls);

function createWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, y, z);
    walls.add(mesh);
    return mesh; // Return for collision list logic if needed
}

// 4 Walls around the 100x100 area
createWall(0, 2.5, -50, 100, 5, 2); // North
createWall(0, 2.5, 50, 100, 5, 2);  // South
createWall(-50, 2.5, 0, 2, 5, 100); // West
createWall(50, 2.5, 0, 2, 5, 100);  // East

// Obstacles (Crates)
const boxGeo = new THREE.BoxGeometry(4, 4, 4);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
const obstacles = [];

function createObstacle(x, z) {
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.set(x, 2, z);
    scene.add(mesh);
    obstacles.push(mesh);
}

// Add some random crates
createObstacle(10, 10);
createObstacle(-15, -20);
createObstacle(25, -5);
createObstacle(-5, 25);


// --- Phase 4.5: Visuals (Gun & Bullets) ---

const weapon = new THREE.Group();
const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshLambertMaterial({ color: 0x333333 }));
barrel.position.z = -0.25;
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
handle.position.set(0, -0.15, 0);
handle.rotation.x = Math.PI / 4;
weapon.add(barrel);
weapon.add(handle);
weapon.position.set(0.3, -0.25, -0.5);
camera.add(weapon);

function createBulletTracer(startPos, direction) {
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    bullet.position.copy(startPos);
    scene.add(bullet);

    // Animate
    const speed = 60;
    const start = performance.now();

    function update() {
        const now = performance.now();
        const delta = (now - start) / 1000;
        if (delta > 0.5) {
            scene.remove(bullet);
            return;
        }
        bullet.position.addScaledVector(direction, speed * 0.016); // Approx tick
        requestAnimationFrame(update);
    }
    update();
}


// --- Logic: Movement & Collision ---

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false, canJump = false;

document.addEventListener('keydown', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += 350; canJump = false; break;
    }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyD': moveRight = false; break;
    }
});

// Collision Helper
function checkCollision(position) {
    // Check against obstacles (Simple AABB radius check)
    const playerRadius = 1.0;
    for (const obs of obstacles) {
        // Simple Box-Circle collision approximation
        const dx = Math.abs(position.x - obs.position.x);
        const dz = Math.abs(position.z - obs.position.z);
        // Box is 4x4, so half width is 2.
        if (dx < (2 + playerRadius) && dz < (2 + playerRadius)) {
            return true;
        }
    }
    // Check Walls (Boundaries 50)
    if (position.x < -48 || position.x > 48 || position.z < -48 || position.z > 48) return true;

    return false;
}


// --- Multiplayer & Shooting ---

const socket = io();
const otherPlayers = {};

function createPlayerMesh(id, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: 0x0000ff }));
    mesh.position.set(x, y, z);
    return mesh;
}

socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach((id) => {
        if (id === socket.id) return;
        const p = players[id];
        const mesh = createPlayerMesh(id, p.x, p.y, p.z);
        scene.add(mesh);
        otherPlayers[id] = mesh;
    });
});
socket.on('newPlayer', (p) => {
    const mesh = createPlayerMesh(p.playerId, p.x, p.y, p.z);
    scene.add(mesh);
    otherPlayers[p.playerId] = mesh;
});
socket.on('playerMoved', (p) => {
    if (otherPlayers[p.playerId]) {
        otherPlayers[p.playerId].position.set(p.x, p.y, p.z);
        otherPlayers[p.playerId].rotation.y = p.rotation;
    }
});
socket.on('userDisconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

// Shooting
const raycaster = new THREE.Raycaster();
document.addEventListener('mousedown', () => {
    if (!controls.isLocked) return;

    // Visuals
    const weaponPos = new THREE.Vector3();
    weapon.getWorldPosition(weaponPos);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    weaponPos.addScaledVector(dir, 0.5);
    createBulletTracer(weaponPos, dir);
    sfx.playShoot(); // Audio

    // Logic
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const meshes = Object.values(otherPlayers);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const targetId = Object.keys(otherPlayers).find(key => otherPlayers[key] === hitObj);
        if (targetId) socket.emit('shoot', { targetId });
    }
});

// Hit/Death Events
const healthText = document.getElementById('health-text');
const healthFill = document.getElementById('health-bar-fill');
const deathScreen = document.getElementById('death-screen');

function updateHealthUI(hp) {
    if (!healthText || !healthFill) return;
    healthText.innerText = hp;
    healthFill.style.width = hp + '%';

    // Color Change
    if (hp > 50) healthFill.style.backgroundColor = '#00ff00'; // Green
    else if (hp > 20) healthFill.style.backgroundColor = '#ffff00'; // Yellow
    else healthFill.style.backgroundColor = '#ff0000'; // Red
}

socket.on('playerHit', (data) => {
    const { id, health } = data;
    if (otherPlayers[id]) {
        otherPlayers[id].material.color.setHex(0xff0000); // Visual Flash
        setTimeout(() => otherPlayers[id].material.color.setHex(0x0000ff), 100);
    }
    if (id === socket.id) {
        sfx.playHit();
        updateHealthUI(health);
        document.body.style.backgroundColor = 'rgba(255,0,0,0.3)';
        setTimeout(() => document.body.style.backgroundColor = '', 100);
    }
});

socket.on('playerKilled', (data) => {
    if (data.victimId === socket.id) {
        sfx.playDie();
        deathScreen.style.display = 'flex';
        updateHealthUI(0);
        // "Respawn" logic is essentially handled by the server sending playerRespawn next
    }
});

socket.on('playerRespawn', (data) => {
    const { id, x, z } = data;
    if (otherPlayers[id]) {
        otherPlayers[id].position.set(x, 2, z); // Reset them
    }
    if (id === socket.id) {
        deathScreen.style.display = 'none';
        updateHealthUI(100);
        // Move player
        controls.getObject().position.set(x, 2, z);
        velocity.set(0, 0, 0);
    }
});


// Loop
let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    if (controls.isLocked) {
        // Friction
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta;

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        // Apply Movement & Collision
        const currentPos = controls.getObject().position.clone();

        // Forward/Back
        controls.moveForward(-velocity.z * delta);
        if (checkCollision(controls.getObject().position)) {
            controls.getObject().position.copy(currentPos); // Revert
            velocity.z = 0;
        }

        currentPos.copy(controls.getObject().position); // Update safe pos

        // Left/Right
        controls.moveRight(-velocity.x * delta);
        if (checkCollision(controls.getObject().position)) {
            controls.getObject().position.copy(currentPos); // Revert
            velocity.x = 0;
        }

        // Gravity
        controls.getObject().position.y += (velocity.y * delta);
        if (controls.getObject().position.y < 1.6) {
            velocity.y = 0;
            controls.getObject().position.y = 1.6;
            canJump = true;
        }

        // Network
        const pos = controls.getObject().position;
        socket.emit('playerMovement', { x: pos.x, y: pos.y, z: pos.z, rotation: controls.getObject().rotation.y });
    }

    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
animate();
