import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { io } from 'socket.io-client';

// --- Global State ---
let isGameJoined = false;
let isGameActive = false; // Phase 8: Controls locked until game starts

// --- UI Elements ---
const menuDiv = document.getElementById('main-menu');
const waitingRoomDiv = document.getElementById('waiting-room');
const lobbyTitle = document.getElementById('lobby-title');
const playerSlotsDiv = document.getElementById('player-slots');
const startBtn = document.getElementById('start-game-btn');
const leaveBtn = document.getElementById('leave-lobby-btn');
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownText = document.getElementById('countdown-text');

const nameInput = document.getElementById('player-name');
const roomInput = document.getElementById('room-code');
const playBtn = document.getElementById('play-btn');

// --- Main Menu Handlers ---
playBtn.addEventListener('click', () => {
    let name = nameInput.value.trim();
    if (!name) { alert("Please enter a name!"); return; }
    let room = roomInput.value.trim();
    if (!room) room = Math.floor(100000 + Math.random() * 900000).toString();

    socket.emit('joinGame', { roomCode: room, name: name });
    playBtn.innerText = "Joining...";
});

// --- Phase 8: Lobby Logic ---
startBtn.addEventListener('click', () => {
    socket.emit('startGame');
});
leaveBtn.addEventListener('click', () => {
    location.reload(); // Simple leave impl
});

function updateLobbyUI(players) {
    playerSlotsDiv.innerHTML = '';
    const playerList = Object.values(players);

    // Create 6 Slots
    for (let i = 0; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'player-slot';

        if (playerList[i]) {
            slot.classList.add('slot-filled');
            const p = playerList[i];
            const hexColor = '#' + p.color.toString(16).padStart(6, '0');
            slot.innerHTML = `
                <div><span class="color-dot" style="background-color: ${hexColor}"></span>${p.name}</div>
                ${p.playerId === socket.id ? '<small>(You)</small>' : ''}
            `;
        } else {
            slot.classList.add('slot-empty');
            slot.innerText = "Empty Slot";
        }
        playerSlotsDiv.appendChild(slot);
    }
}


// --- Audio System ---
class SimpleAudio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5;
    }
    setVolume(val) { this.masterVolume = Math.max(0, Math.min(1, val)); }
    playTone(freq, type, duration, vol = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        const finalVol = vol * this.masterVolume;
        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    playShoot() { this.playTone(600, 'square', 0.1, 0.05); }
    playHit() { this.playTone(100, 'sawtooth', 0.1, 0.05); }
    playDie() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const finalVol = 0.1 * this.masterVolume;
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

// --- Core Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 0, 100);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff);
dirLight.position.set(0, 20, 10);
scene.add(dirLight);

// Controls & Blocker
const controls = new PointerLockControls(camera, document.body);
const blocker = document.createElement('div');
blocker.id = 'blocker';
Object.assign(blocker.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
    display: 'none',
    flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    fontSize: '24px', fontFamily: 'monospace'
});
blocker.innerHTML = `
    <p style="font-size: 36px; margin-bottom: 20px;">Paused</p>
    <div style="font-size: 16px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;">
        <label for="volume-slider">Master Volume</label><br>
        <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="0.5" style="margin-top: 10px; cursor: pointer;">
    </div>
    <p id="lobby-display" style="margin-top:20px; color: #aaa;"></p>
`;
document.body.appendChild(blocker);

setTimeout(() => {
    const slider = document.getElementById('volume-slider');
    if (slider) {
        slider.addEventListener('input', e => sfx.setVolume(parseFloat(e.target.value)));
        slider.addEventListener('click', e => e.stopPropagation());
        slider.addEventListener('mousedown', e => e.stopPropagation());
    }
}, 100);

blocker.addEventListener('click', (e) => {
    // Only lock if we didn't click slider and if game is ACTIVE
    if (e.target.id !== 'volume-slider' && isGameActive) {
        controls.lock();
        sfx.ctx.resume();
    }
});
controls.addEventListener('lock', () => blocker.style.display = 'none');
controls.addEventListener('unlock', () => {
    if (isGameActive) blocker.style.display = 'flex';
});
scene.add(controls.getObject());

// --- Map & Environment ---
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshLambertMaterial({ color: 0x228b22 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const walls = new THREE.Group();
scene.add(walls);
const wallMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
function createWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, y, z);
    walls.add(mesh);
}
createWall(0, 2.5, -50, 100, 5, 2);
createWall(0, 2.5, 50, 100, 5, 2);
createWall(-50, 2.5, 0, 2, 5, 100);
createWall(50, 2.5, 0, 2, 5, 100);

const boxGeo = new THREE.BoxGeometry(4, 4, 4);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
const obstacles = [];
function createObstacle(x, z) {
    const mesh = new THREE.Mesh(boxGeo, boxMat);
    mesh.position.set(x, 2, z);
    scene.add(mesh);
    obstacles.push(mesh);
}
createObstacle(10, 10);
createObstacle(-15, -20);
createObstacle(25, -5);
createObstacle(-5, 25);

// --- Visuals ---
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
    const speed = 60;
    const start = performance.now();
    function update() {
        const delta = (performance.now() - start) / 1000;
        if (delta > 0.5) { scene.remove(bullet); return; }
        bullet.position.addScaledVector(direction, speed * 0.016);
        requestAnimationFrame(update);
    }
    update();
}

function createNameSprite(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    ctx.font = 'Bold 40px Arial';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 20, 256, 60);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 64);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 2, 1);
    return sprite;
}

// --- Logic ---
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
function checkCollision(position) {
    const playerRadius = 1.0;
    for (const obs of obstacles) {
        if (Math.abs(position.x - obs.position.x) < (2 + playerRadius) &&
            Math.abs(position.z - obs.position.z) < (2 + playerRadius)) return true;
    }
    if (position.x < -48 || position.x > 48 || position.z < -48 || position.z > 48) return true;
    return false;
}

// --- Multiplayer ---
const socket = io();
const otherPlayers = {};

function createPlayerMesh(id, x, y, z, color, name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: color || 0x0000ff }));
    mesh.position.set(x, y, z);

    // Store original color for damage flash
    mesh.userData.originalColor = color || 0x0000ff;

    const sprite = createNameSprite(name || "Player");
    sprite.position.y = 2.5;
    mesh.add(sprite);

    return mesh;
}

// Phase 6 & 8: Socket Logic
socket.on('disconnect', () => { console.log("Disconnected from server"); });
socket.on('gameError', (msg) => { alert(msg); playBtn.innerText = "JOIN GAME"; });

socket.on('gameJoined', (data) => {
    isGameJoined = true; // Connected but in waiting room
    menuDiv.style.display = 'none'; // Hide Main Menu
    waitingRoomDiv.style.display = 'flex'; // Show Waiting Room

    lobbyTitle.innerText = `Lobby: ${data.roomCode}`;
    document.getElementById('lobby-display').innerText = `Lobby: ${data.roomCode}`;

    controls.getObject().position.set(data.x || 0, 2, data.z || 0);
});

// Phase 8: Room Update (Slot Refresh)
socket.on('roomUpdate', (data) => {
    updateLobbyUI(data.players);
});

// Phase 8: Countdown & Game Start
socket.on('countdownStart', (data) => {
    waitingRoomDiv.style.display = 'none'; // Hide Lobby
    countdownOverlay.style.display = 'flex'; // Show Countdown

    const targetTime = data.startTime;

    const interval = setInterval(() => {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
            clearInterval(interval);
            countdownText.innerText = "GO!";
            setTimeout(() => { countdownOverlay.style.display = 'none'; }, 1000);
        } else {
            const seconds = Math.ceil(diff / 1000);
            countdownText.innerText = seconds;
        }
    }, 100);
});

socket.on('gameStart', () => {
    isGameActive = true;
    // Auto lock? Or let them click? 
    // Usually browser requires gesture. 
    // We can ask them to click or just let them click now.
    // For now, controls are unlocked LOGICALLY, but they need to click to lock cursor.
    // The "paused" menu might show up if they haven't clicked recently.
    // Actually, let's keep it simple: They are in the scene already.
});


socket.on('currentPlayers', (players) => {
    if (!isGameJoined) return;
    Object.keys(players).forEach((id) => {
        if (id === socket.id) return;
        if (!otherPlayers[id]) {
            const p = players[id];
            const mesh = createPlayerMesh(id, p.x, p.y, p.z, p.color, p.name);
            scene.add(mesh);
            otherPlayers[id] = mesh;
        }
    });
    // Also update UI if we get this msg in lobby
    updateLobbyUI(players);
});

socket.on('newPlayer', (p) => {
    if (!isGameJoined) return;
    // Add Mesh
    const mesh = createPlayerMesh(p.playerId, p.x, p.y, p.z, p.color, p.name);
    scene.add(mesh);
    otherPlayers[p.playerId] = mesh;
});

socket.on('playerMoved', (p) => {
    if (!isGameJoined) return;
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
    // Only shoot if Game Active AND Cursor Locked
    if (!isGameActive || !controls.isLocked) return;

    const weaponPos = new THREE.Vector3();
    weapon.getWorldPosition(weaponPos);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    weaponPos.addScaledVector(dir, 0.5);
    createBulletTracer(weaponPos, dir);
    sfx.playShoot();

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const meshes = Object.values(otherPlayers);
    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        const targetId = Object.keys(otherPlayers).find(key => otherPlayers[key] === hitObj);
        if (targetId) socket.emit('shoot', { targetId });
    }
});

// HUD
const healthText = document.getElementById('health-text');
const healthFill = document.getElementById('health-bar-fill');
const deathScreen = document.getElementById('death-screen');

function updateHealthUI(hp) {
    if (!healthText || !healthFill) return;
    healthText.innerText = hp;
    healthFill.style.width = hp + '%';
    if (hp > 50) healthFill.style.backgroundColor = '#00ff00';
    else if (hp > 20) healthFill.style.backgroundColor = '#ffff00';
    else healthFill.style.backgroundColor = '#ff0000';
}

socket.on('playerHit', (data) => {
    const { id, health } = data;
    if (otherPlayers[id]) {
        // Use stored original color
        const mesh = otherPlayers[id];
        mesh.material.color.setHex(0xff0000);
        setTimeout(() => {
            if (mesh && mesh.userData.originalColor) {
                mesh.material.color.setHex(mesh.userData.originalColor);
            }
        }, 100);
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
    }
});
socket.on('playerRespawn', (data) => {
    const { id, x, z } = data;
    if (otherPlayers[id]) otherPlayers[id].position.set(x, 2, z);
    if (id === socket.id) {
        deathScreen.style.display = 'none';
        updateHealthUI(100);
        controls.getObject().position.set(x, 2, z);
        velocity.set(0, 0, 0);
    }
});

// Animation
let prevTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    prevTime = time;

    // Only move if Game Active AND Locked
    if (controls.isLocked && isGameActive) {
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta;
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        const currentPos = controls.getObject().position.clone();
        controls.moveForward(-velocity.z * delta);
        if (checkCollision(controls.getObject().position)) {
            controls.getObject().position.copy(currentPos); velocity.z = 0;
        }
        currentPos.copy(controls.getObject().position);
        controls.moveRight(-velocity.x * delta);
        if (checkCollision(controls.getObject().position)) {
            controls.getObject().position.copy(currentPos); velocity.x = 0;
        }
        controls.getObject().position.y += (velocity.y * delta);
        if (controls.getObject().position.y < 1.6) {
            velocity.y = 0; controls.getObject().position.y = 1.6; canJump = true;
        }

        const pos = controls.getObject().position;
        if (isGameJoined) {
            socket.emit('playerMovement', { x: pos.x, y: pos.y, z: pos.z, rotation: controls.getObject().rotation.y });
        }
    }
    renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
animate();
