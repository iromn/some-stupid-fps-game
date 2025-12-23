import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
// Post-processing removed for Minecraft style efficiency/look
import { io } from 'socket.io-client';

let isGameJoined = false;

// --- Phase 6: UI & Menu Logic ---
const menuDiv = document.getElementById('main-menu');
const nameInput = document.getElementById('player-name');
const roomInput = document.getElementById('room-code');
const playBtn = document.getElementById('play-btn');

playBtn.addEventListener('click', () => {
    let name = nameInput.value.trim();
    if (!name) { alert("Please enter a name!"); return; }

    let room = roomInput.value.trim();
    if (!room) room = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit

    socket.emit('joinGame', { roomCode: room, name: name });
    playBtn.innerText = "Joining...";
});

// --- Phase 5: Audio System ---
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

// --- Visual Helpers ---
// --- Visual Helpers (Pixel Art Generator) ---
function createPixelTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; // Low res for "Pixel" look
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Helper for noise
    function noise(amount) {
        for (let i = 0; i < 64; i += 4) {
            for (let j = 0; j < 64; j += 4) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = `rgba(0,0,0,${Math.random() * amount})`;
                    ctx.fillRect(i, j, 4, 4);
                } else {
                    ctx.fillStyle = `rgba(255,255,255,${Math.random() * amount})`;
                    ctx.fillRect(i, j, 4, 4);
                }
            }
        }
    }

    if (type === 'grass') {
        // Dirt base
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.1);
        // Grass top
        ctx.fillStyle = '#388e3c'; // Minecraft Green
        ctx.fillRect(0, 0, 64, 64); // Full green for top face texture
        noise(0.05);
        // Add random "grass blades" variations
        for (let k = 0; k < 20; k++) {
            const x = Math.floor(Math.random() * 16) * 4;
            const y = Math.floor(Math.random() * 16) * 4;
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(x, y, 4, 4);
        }
    } else if (type === 'stone') {
        ctx.fillStyle = '#757575';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.15);
        // Stone Bricks pattern
        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = 0; y < 64; y += 16) {
            ctx.moveTo(0, y); ctx.lineTo(64, y);
            for (let x = (y % 32 === 0 ? 0 : 8); x < 64; x += 16) {
                ctx.moveTo(x, y); ctx.lineTo(x, y + 16);
            }
        }
        ctx.stroke();
    } else if (type === 'dirt') {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter; // Key for Minecraft look
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}
const grassTex = createPixelTexture('grass');
const stoneTex = createPixelTexture('stone');
const dirtTex = createPixelTexture('dirt');

// --- Core Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky Blue
// scene.fog = new THREE.Fog(0x87CEEB, 20, 100); // Standard fog
scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.y = 1.6;

const renderer = new THREE.WebGLRenderer({ antialias: false }); // Pixel look better without AA? Maybe.
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // Hard shadows for pixel art?
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8); // Bright Day
hemiLight.position.set(0, 50, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2); // Sun
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 200;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Controls & Blocker (Pause Menu)
const controls = new PointerLockControls(camera, document.body);
const blocker = document.createElement('div');
blocker.id = 'blocker'; // Use ID for easier selecting
Object.assign(blocker.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
    display: 'none', // HIDDEN BY DEFAULT (Main Menu is first)
    flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    fontSize: '24px', fontFamily: 'monospace'
});
blocker.innerHTML = `
    <p style="font-size: 36px; margin-bottom: 20px;">Click to Play</p>
    <div style="font-size: 16px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 8px;">
        <label for="volume-slider">Master Volume</label><br>
        <input type="range" id="volume-slider" min="0" max="1" step="0.1" value="0.5" style="margin-top: 10px; cursor: pointer;">
    </div>
    <p id="lobby-display" style="margin-top:20px; color: #aaa;"></p>
`;
document.body.appendChild(blocker);

// Hit Marker UI
const hitMarker = document.createElement('div');
Object.assign(hitMarker.style, {
    position: 'absolute', top: '50%', left: '50%',
    width: '40px', height: '40px',
    border: '2px solid transparent',
    transform: 'translate(-50%, -50%) rotate(45deg)',
    pointerEvents: 'none',
    zIndex: '15',
    display: 'none'
});
// Create X shape using borders maybe? Or just use characters.
// Simpler: use CSS pseudo elements for lines
hitMarker.innerHTML = `
<div style="position:absolute; top:50%; left:0; width:100%; height:4px; background:red; transform:translateY(-50%);"></div>
<div style="position:absolute; left:50%; top:0; width:4px; height:100%; background:red; transform:translateX(-50%);"></div>
`;
document.body.appendChild(hitMarker);

function showHitMarker() {
    hitMarker.style.display = 'block';
    setTimeout(() => hitMarker.style.display = 'none', 100);
}

// Damage Overlay (Self) - Fixes "No Indication"
const damageOverlay = document.createElement('div');
Object.assign(damageOverlay.style, {
    position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    backgroundColor: 'red',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '10',
    transition: 'opacity 0.1s'
});
document.body.appendChild(damageOverlay);

function flashDamage() {
    damageOverlay.style.opacity = '0.3';
    setTimeout(() => damageOverlay.style.opacity = '0', 100);
}

// Slider Logic
setTimeout(() => {
    const slider = document.getElementById('volume-slider');
    if (slider) {
        slider.addEventListener('input', e => sfx.setVolume(parseFloat(e.target.value)));
        slider.addEventListener('click', e => e.stopPropagation());
        slider.addEventListener('mousedown', e => e.stopPropagation());
    }
}, 100);

blocker.addEventListener('click', (e) => {
    if (e.target.id !== 'volume-slider') {
        controls.lock();
        sfx.ctx.resume();
    }
});
controls.addEventListener('lock', () => blocker.style.display = 'none');
controls.addEventListener('unlock', () => {
    // Only show pause menu if we are actually in a game
    if (isGameJoined) blocker.style.display = 'flex';
});
scene.add(controls.getObject());

// --- Map & Environment ---
// --- Map & Environment ---
const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({
    map: grassTex,
    color: 0x88ff88, // Tint green
    roughness: 1.0,
    metalness: 0.0
});
floorMat.map.repeat.set(50, 50);

const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const walls = new THREE.Group();
scene.add(walls);
const wallMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.9,
    metalness: 0.1
});
// Need to set repeat for walls based on size?
// We share one material, so standard repeat might stretch.
// For now, let's just let it stretch or use a helper to clone material per wall?
// Optimization: Just accept stretch or map repeat 1:1 if UVs match.
// BoxGeometry UVs are 1x1. `stoneTex` will cover whole wall.
// Better: update createWall to scale UVs.

const obsMat = new THREE.MeshStandardMaterial({
    map: dirtTex,
    roughness: 1.0,
    metalness: 0.0
});

function createWall(x, y, z, w, h, d) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    walls.add(mesh);
}
// Outer Walls
createWall(0, 5, -50, 100, 10, 2);
createWall(0, 5, 50, 100, 10, 2);
createWall(-50, 5, 0, 2, 10, 100);
createWall(50, 5, 0, 2, 10, 100);

const obstacles = [];
function createObstacle(x, z) {
    const geo = new THREE.BoxGeometry(4, 4, 4);
    const mesh = new THREE.Mesh(geo, obsMat);
    mesh.position.set(x, 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Tiny grass top to make it look like a Grass Block? Or just dirt.
    // obsMat is dirt.
    // Let's add a green top mesh.
    const topGeo = new THREE.PlaneGeometry(4, 4);
    const topMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0x88ff88 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 2.01; // Slightly above
    top.receiveShadow = true;
    mesh.add(top);

    scene.add(mesh);
    obstacles.push(mesh);
}
createObstacle(10, 10);
createObstacle(-15, -20);
createObstacle(25, -5);
createObstacle(-5, 25);

// --- Visuals: Gun, Bullets, Name Tags ---
const weapon = new THREE.Group();
const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0x555555 })); // Iron
barrel.position.z = -0.3;
const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x8b4513 })); // Wood
handle.position.set(0, -0.2, 0);
handle.rotation.x = Math.PI / 6;
weapon.add(barrel);
weapon.add(handle);
weapon.position.set(0.3, -0.25, -0.5);
camera.add(weapon);

function createBulletTracer(startPos, direction) {
    const bullet = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1), // Square pixel bullet
        new THREE.MeshBasicMaterial({ color: 0x000000 }) // Black bullet
    );
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

// Phase 6: Name Sprite Helper (Aesthetic & High Res)
function createNameSprite(text, health = 100) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    // High Res Canvas for Sharp Text (4x previous)
    canvas.width = 1024;
    canvas.height = 256;

    // Config
    ctx.textAlign = 'center';

    // Fun Font
    ctx.font = 'bold 80px "Comic Sans MS", "Arial", sans-serif'; // Larger font for high res

    // 1. Name with heavy outline
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'black';
    ctx.strokeText(text, 512, 100);

    ctx.fillStyle = 'white';
    ctx.fillText(text, 512, 100);

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // 2. Aesthetic Health Bar
    const barW = 400; // Wider
    const barH = 40;  // Thicker
    const barX = (1024 - barW) / 2;
    const barY = 140;
    const radius = 20; // Rounded

    // Helper for rounded rect
    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // Border (White border for "Sticker" look)
    ctx.fillStyle = 'white';
    roundRect(barX - 6, barY - 6, barW + 12, barH + 12, radius + 2);
    ctx.fill();

    // Background (Dark)
    ctx.fillStyle = '#333';
    roundRect(barX, barY, barW, barH, radius);
    ctx.fill();

    // Health Fill (Gradient)
    const healhPct = Math.max(0, health) / 100;

    // Fun Pastel Colors
    // High: MediumSpringGreen, Mid: Gold, Low: OrangeRed
    const col = healhPct > 0.5 ? '#00fa9a' : (healhPct > 0.2 ? '#ffd700' : '#ff4500');

    ctx.fillStyle = col;
    // Draw clipped rect for progress
    ctx.save();
    roundRect(barX, barY, barW, barH, radius);
    ctx.clip();
    ctx.fillRect(barX, barY, barW * healhPct, barH);
    ctx.restore();

    // Heart Icon
    ctx.font = '60px Arial';
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeText('❤', barX - 50, barY + 40);
    ctx.fillText('❤', barX - 50, barY + 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    // Scale: Small World Size, Huge Canvas
    // This makes pixels tiny -> Sharp.
    sprite.scale.set(2.5, 0.625, 1); // Slightly larger world scale for readability

    sprite.userData.isNameTag = true;

    return sprite;
}

// Helper to update existing sprite
function updateNameTag(mesh, name, health) {
    // Find the sprite child
    const sprite = mesh.children.find(c => c.userData.isNameTag);
    if (sprite) {
        mesh.remove(sprite);
        sprite.material.map.dispose();
        sprite.material.dispose();
    }
    const newSprite = createNameSprite(name, health);
    newSprite.position.y = 3.0;
    mesh.add(newSprite);
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
// --- Physics & Collision ---
function checkCollision(position) {
    const playerRadius = 1.0;
    for (const obs of obstacles) {
        // Simple AABB check for now, can be improved to Cylinder/Circle later
        // Expanding obstacle bounds by player radius
        const dx = Math.abs(position.x - obs.position.x);
        const dz = Math.abs(position.z - obs.position.z);
        // Box is 4x4, so half-width is 2.
        if (dx < (2 + playerRadius) && dz < (2 + playerRadius)) {
            return { hit: true, object: obs };
        }
    }
    // World Bounds
    if (position.x < -48 || position.x > 48 || position.z < -48 || position.z > 48) {
        return { hit: true, isWorldBound: true };
    }
    return { hit: false };
}

// Helper to resolve collision by sliding
function resolveMovement(startPos, intendedMove) {
    // Try full move
    const endPos = startPos.clone().add(intendedMove);
    const collision = checkCollision(endPos);

    if (!collision.hit) {
        return { pos: endPos, vel: null }; // No collision, move allowed
    }

    // Hit something. Logic: Slide along the surface.
    // Determine normal. 
    // For World Bounds, it's easy.
    // For Cubes, determine which face was hit.

    let normal = new THREE.Vector3();

    if (collision.isWorldBound) {
        if (endPos.x < -48) normal.set(1, 0, 0);
        else if (endPos.x > 48) normal.set(-1, 0, 0);
        else if (endPos.z < -48) normal.set(0, 0, 1);
        else if (endPos.z > 48) normal.set(0, 0, -1);
    } else if (collision.object) {
        // Determine closest face of the box
        const obs = collision.object;
        const dx = endPos.x - obs.position.x;
        const dz = endPos.z - obs.position.z;
        // Box extent is 2 (size 4).
        // Check overlap depth
        // This is a rough approximation for sliding
        if (Math.abs(dx) > Math.abs(dz)) {
            // Hit X face
            normal.set(Math.sign(dx), 0, 0);
        } else {
            // Hit Z face
            normal.set(0, 0, Math.sign(dz));
        }
    }

    // Project intended movement onto the slide plane (remove component along normal)
    // Formula: V_new = V - (V . N) * N
    // But we are working with position delta first.
    const dot = intendedMove.dot(normal);
    const slideMove = intendedMove.clone().sub(normal.multiplyScalar(dot));

    // Safety: check if slide move also collides (corner case)
    const slideEndPos = startPos.clone().add(slideMove);
    if (checkCollision(slideEndPos).hit) {
        return { pos: startPos, vel: new THREE.Vector3(0, 0, 0) }; // Stuck/Corner, stop.
    }

    return { pos: slideEndPos, hitNormal: normal };
}

// --- Multiplayer ---
const socket = io();
const otherPlayers = {};

// --- Character Model (Procedural Robot) ---
// --- Character Model (Procedural Voxel) ---
function createRobotCharacter(color) {
    const group = new THREE.Group();

    // Minecraft Style Colors: 
    // Shirt: Passed Color
    // Pants: Darker shade of Shirt Color
    const skinColor = 0xffccaa;

    // Helper to darken hex
    const darker = (hex) => {
        const r = Math.floor(((hex >> 16) & 255) * 0.5);
        const g = Math.floor(((hex >> 8) & 255) * 0.5);
        const b = Math.floor((hex & 255) * 0.5);
        return (r << 16) | (g << 8) | b;
    };
    const pantsColor = darker(color);

    const shirtMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });

    // 1. Torso (Shirt)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    torso.position.y = 1.125;
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.userData.origColor = color; // Store original
    group.add(torso);

    // 2. Head (Skin)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.y = 1.75;
    head.castShadow = true;
    head.userData.origColor = skinColor; // Store original
    group.add(head);

    // 3. Limbs Helper
    function createLimb(x, y, z, w, h, d, material, name, col) {
        const limbGroup = new THREE.Group();
        limbGroup.position.set(x, y, z);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.y = -h / 2; // Pivot at top
        mesh.castShadow = true;
        mesh.userData.origColor = col; // Store original
        limbGroup.add(mesh);
        limbGroup.name = name;
        return limbGroup;
    }

    // Arms (Shirt)
    const leftArm = createLimb(-0.375, 1.5, 0, 0.25, 0.75, 0.25, shirtMat, 'leftArm', color);
    const rightArm = createLimb(0.375, 1.5, 0, 0.25, 0.75, 0.25, shirtMat, 'rightArm', color);
    group.add(leftArm);
    group.add(rightArm);

    // Legs (Pants)
    const leftLeg = createLimb(-0.125, 0.75, 0, 0.25, 0.75, 0.25, pantsMat, 'leftLeg', pantsColor);
    const rightLeg = createLimb(0.125, 0.75, 0, 0.25, 0.75, 0.25, pantsMat, 'rightLeg', pantsColor);
    group.add(leftLeg);
    group.add(rightLeg);

    group.userData.limbs = { leftLeg, rightLeg, leftArm, rightArm };
    return group;
}

function createPlayerMesh(id, x, y, z, color, name) {
    // OLD: const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshLambertMaterial({ color: color || 0x0000ff }));
    // NEW:
    const mesh = createRobotCharacter(color || 0x00ff00);
    mesh.position.set(x, 0, z); // Robot group pivot is at 0,0,0 (feet at 0? No, we set positions inside. Let's adjust.)
    // Note: Y was passed as center? 
    // In server/game, Y is usually feet or center. Old code: mesh.position.set(x, y, z); box is height 2.
    // If Y is center (1.0), then feet are at 0.
    // My Robot parts are positioned assuming Y=0 is ground.
    // So if server sends Y ~ 2 (center of player controller?), we might be floating.
    // Logic: `controls.getObject().position.y` starts at 1.6 (eyes).
    // Let's assume passed Y is safely ignored for X/Z, but we need to match server y?
    // Actually, `playerMoved` sets Y.
    // Let's wrap the robot in a container that matches the expected origin behavior if needed.
    // But simplest is to just use the passed Y. If Y=2, robot is 2 units up.
    // Robot feet are at createLimb Y offset...
    // Let's reset Robot Group to be centered vertically? No, simpler to have Pivot at Feet.
    // The server/controls use Y=CameraHeight (1.6). 
    // If I lay the robot at (x, y-1.6, z), feet will be at Y-1.6.

    mesh.userData.originalColor = color; // For hit flash restoration

    // Name Tag
    const sprite = createNameSprite(name || "Player");
    sprite.position.y = 3.0; // Above head
    mesh.add(sprite);

    return mesh;
}

// Socket Events
socket.on('disconnect', () => {
    console.log("Disconnected from server");
});

socket.on('gameError', (msg) => {
    alert(msg);
    playBtn.innerText = "JOIN GAME";
});

// Phase 6: Join Success
socket.on('gameJoined', (data) => {
    isGameJoined = true;
    // Hide Main Menu
    menuDiv.style.display = 'none';

    // Show Pause Menu (Blocker)
    blocker.style.display = 'flex';
    document.getElementById('lobby-display').innerText = `Lobby: ${data.roomCode}`;

    // Set my start pos?
    controls.getObject().position.set(data.x || 0, 2, data.z || 0);

    // Maybe store assigned color for creating own mesh preview or similar? Not needed for FPS view.
});

socket.on('currentPlayers', (players) => {
    if (!isGameJoined) return;
    Object.keys(players).forEach((id) => {
        if (id === socket.id) return;
        if (!otherPlayers[id]) {
            const p = players[id];
            const mesh = createPlayerMesh(id, p.x, p.y, p.z, p.color, p.name);
            mesh.userData.playerName = p.name; // Store name for updates
            mesh.userData.health = p.health || 100; // Store health sync?
            // Actually server only sends health on hit. Let's assume 100 for fresh join?
            // Wait, currentPlayers sends full object. If they are hurt, 'p.health' exists.
            if (p.health !== undefined) updateNameTag(mesh, p.name, p.health);
            scene.add(mesh);
            otherPlayers[id] = mesh;
        }
    });
});

socket.on('newPlayer', (p) => {
    if (!isGameJoined) return;
    const mesh = createPlayerMesh(p.playerId, p.x, p.y, p.z, p.color, p.name);
    mesh.userData.playerName = p.name;
    scene.add(mesh);
    otherPlayers[p.playerId] = mesh;
});

// Update Player Animation
socket.on('playerMoved', (p) => {
    if (!isGameJoined) return;
    if (otherPlayers[p.playerId]) {
        const char = otherPlayers[p.playerId];

        // Goofy: Base Y with a bounce
        const time = performance.now() / 100; // Fast cycle
        const bounce = Math.abs(Math.sin(time)) * 0.2;

        char.position.set(p.x, (p.y - 1.6) + bounce, p.z);
        char.rotation.y = p.rotation;

        // Goofy Waddle
        char.rotation.z = Math.cos(time) * 0.2; // Tilt side to side

        if (char.userData.limbs) {
            // Huge steps
            const limbAmp = 1.4;
            char.userData.limbs.leftLeg.rotation.x = Math.sin(time) * limbAmp;
            char.userData.limbs.rightLeg.rotation.x = Math.sin(time + Math.PI) * limbAmp;

            // Flailing Arms
            char.userData.limbs.leftArm.rotation.x = Math.sin(time + Math.PI) * limbAmp;
            char.userData.limbs.rightArm.rotation.x = Math.sin(time) * limbAmp;

            // Flap arms out a bit (Chicken / Narutorun mix?)
            char.userData.limbs.leftArm.rotation.z = 0.5 + Math.abs(Math.sin(time)) * 0.3;
            char.userData.limbs.rightArm.rotation.z = -0.5 - Math.abs(Math.sin(time)) * 0.3;
        }
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
    // 1. Visuals
    const weaponPos = new THREE.Vector3();
    weapon.getWorldPosition(weaponPos);
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    weaponPos.addScaledVector(dir, 0.5);
    createBulletTracer(weaponPos, dir);
    sfx.playShoot();

    // 2. Logic: "Thick Bullet" / Magnetism
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const ray = raycaster.ray;

    // A. Check what we look at directly (Wall or Player?)
    const playerMeshes = Object.values(otherPlayers);
    const environment = [walls, ...obstacles, floor]; // Include floor to prevent shooting through ground
    const allObjects = [...playerMeshes, ...environment];

    // First, find exact intersection
    const intersects = raycaster.intersectObjects(allObjects, true);

    let hitDistance = Infinity;

    if (intersects.length > 0) {
        const hit = intersects[0];
        hitDistance = hit.distance;

        // Did we hit a player directly?
        let curr = hit.object;
        while (curr) {
            const pid = Object.keys(otherPlayers).find(k => otherPlayers[k] === curr);
            if (pid) {
                // Precise Hit!
                socket.emit('shoot', { targetId: pid });
                return;
            }
            curr = curr.parent;
        }
    }

    // B. Magnetism Check (if we didn't hit a player directly)
    // iterate players, check distance to Ray
    let bestTarget = null;
    let closestDist = Infinity;
    const MAGNET_RADIUS = 2.0; // "Thick" bullet radius

    Object.keys(otherPlayers).forEach(id => {
        const char = otherPlayers[id];
        // Approximate Center (Chest)
        const center = char.position.clone().add(new THREE.Vector3(0, 1.5, 0));

        // Project center onto the Ray
        const pointOnRay = new THREE.Vector3();
        ray.closestPointToPoint(center, pointOnRay);

        const distToRay = center.distanceTo(pointOnRay);
        const distFromCam = camera.position.distanceTo(pointOnRay);

        // Check 1: Inside Magnet Radius?
        // Check 2: Closer than whatever wall we looked at? (Occlusion by crosshair object)
        if (distToRay < MAGNET_RADIUS && distFromCam < hitDistance) {

            // Check 3: Line of Sight (Prevent shooting through side walls)
            // Raycast from Camera -> Enemy Center
            const toEnemy = center.clone().sub(camera.position).normalize();
            const losRay = new THREE.Raycaster(camera.position, toEnemy, 0, distFromCam);

            // Should touch nothing but maybe the enemy itself (or nothing if we exclude players)
            // intersecting environment
            const losIntersects = losRay.intersectObjects(environment, true);

            if (losIntersects.length === 0) {
                // Valid Target
                if (distFromCam < closestDist) {
                    closestDist = distFromCam;
                    bestTarget = id;
                }
            }
        }
    });

    if (bestTarget) {
        socket.emit('shoot', { targetId: bestTarget });
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
        const group = otherPlayers[id];
        // Flash Red
        group.traverse((child) => {
            if (child.isMesh && child.material) {
                // Use stored original color
                child.material.color.setHex(0xff0000);
            }
        });

        setTimeout(() => {
            group.traverse((child) => {
                // FIXED: Use the 'origColor' we stored at creation time
                if (child.isMesh && child.material && child.userData.origColor !== undefined) {
                    child.material.color.setHex(child.userData.origColor);
                }
            });
        }, 100);

        // Update Health Bar on Enemy
        // We need their name. We stored 'p.name' at creation inside 'otherPlayers' logic? 
        // We didn't store name on the mesh userData. Let's rely on finding it or just store it.
        // Actually we don't have the NAME in this event 'playerHit'.
        // We need to look up the name from somewhere or store it on the group.
        if (group.userData.playerName) {
            updateNameTag(group, group.userData.playerName, health);
        }
    }

    if (id === socket.id) {
        // I was hit
        sfx.playHit();
        updateHealthUI(health);
        flashDamage(); // New overlay flash
    } else if (data.attackerId === socket.id) {
        // I hit someone!
        // Play a distinct sound? re-use hit sound for now but maybe higher pitch?
        sfx.playHit(); // Feedback sound
        showHitMarker();
    }
});

// Update Player Mesh (Fix Restoration)
// Update Player Mesh (Fix Restoration)
function restoreColor(mesh) {
    // Deprecated by new playerHit logic traversal
}

// (Legacy comments removed)

socket.on('playerKilled', (data) => {
    if (data.victimId === socket.id) {
        sfx.playDie();
        deathScreen.style.display = 'flex';
        updateHealthUI(0);
    }
});
socket.on('playerRespawn', (data) => {
    const { id, x, z } = data;
    if (otherPlayers[id]) {
        otherPlayers[id].position.set(x, 2, z);
    }
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

    if (controls.isLocked) {
        // Tweak Physics Parameters
        const damping = 8.0; // Less slippery (was 10, but we want a bit more weighty feel)
        const accel = 600.0; // Snappier movement (was 400)
        const airControl = 0.3; // Reduce control in air

        const onGround = controls.getObject().position.y <= 1.6;

        velocity.x -= velocity.x * damping * delta;
        velocity.z -= velocity.z * damping * delta;

        // Gravity
        velocity.y -= 9.8 * 100.0 * delta; // Mass 100

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speedFactor = onGround ? 1.0 : airControl;

        if (moveForward || moveBackward) velocity.z -= direction.z * accel * speedFactor * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * accel * speedFactor * delta;

        // Apply Velocity to get Intended Move
        const moveX = -velocity.x * delta;
        const moveZ = -velocity.z * delta;

        // Horizontal Movement with Sliding
        const startPos = controls.getObject().position.clone();
        const intendedVector = new THREE.Vector3().setFromMatrixColumn(controls.getObject().matrix, 0).multiplyScalar(moveX); // Right-vector * moveX
        intendedVector.addScaledVector(new THREE.Vector3().setFromMatrixColumn(controls.getObject().matrix, 2), moveZ); // Forward-vector * moveZ (actually Z is backward in ThreeJS, but LookAt logic handles it)
        // Wait, PointerLockControls `moveRight` and `moveForward` handle local axis. 
        // We cannot easily decompose them without replicating their logic.
        // Let's use `moveRight` / `moveForward` but manually calculate the delta vector first?
        // Actually, simpler: Apply X and Z separately or together? 
        // Best approach for sliding: Work in World Space.

        // Convert local View velocity to World Velocity
        const v = new THREE.Vector3();
        v.copy(direction).applyQuaternion(controls.getObject().quaternion); // This is just input dir
        // We need the ACTUAL velocity vector in world space.
        // Controls.getObject().right is X local, .forward is -Z local.

        const tempVec = new THREE.Vector3();
        const right = new THREE.Vector3();
        const forward = new THREE.Vector3();
        controls.getObject().matrixWorld.extractBasis(right, new THREE.Vector3(), forward);
        forward.negate(); // Forward is -Z

        // Re-construct World Velocity from local velocity z/x storage
        // This codebase stores velocity in "Forward/Right" axes relative to view? 
        // Original: controls.moveForward(-velocity.z * delta);
        // Yes, velocity.z is forward/back speed, velocity.x is left/right speed.

        const worldMove = new THREE.Vector3();
        worldMove.addScaledVector(right, -velocity.x * delta);
        worldMove.addScaledVector(forward, -velocity.z * delta);

        const result = resolveMovement(startPos, worldMove);
        controls.getObject().position.copy(result.pos);

        if (result.hitNormal) {
            // Project Velocity onto the wall plane to prevent sticking / buildup
            // We need to project the underlying v.z and v.x ... this is tricky because they are local.
            // Simplified: Just kill the velocity components if we hit a wall?
            // Or better: If we hit a wall, we just accepted the slide.
            // But we should also modify `velocity` so it doesn't keep pushing into the wall?
            // Since we use damping, it's fine.
        }

        // Vertical Movement
        controls.getObject().position.y += (velocity.y * delta);

        // Ground Collision
        if (controls.getObject().position.y < 1.6) {
            velocity.y = 0;
            controls.getObject().position.y = 1.6;
            canJump = true;
        }

        const pos = controls.getObject().position;
        // Don't emit if not joined? 
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
    // composer.setSize(window.innerWidth, window.innerHeight);
});
animate();
