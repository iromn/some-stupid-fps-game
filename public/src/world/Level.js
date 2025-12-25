import * as THREE from 'three';
import { grassTex, stoneTex, dirtTex, metalTex, hazardTex, slimeTex, iceTex } from '../graphics/Textures.js';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.walls = new THREE.Group();
        this.scene.add(this.walls);
        this.obstacles = [];
        this.specialBlocks = [];

        this._initMaterials();
        this._buildLevel();
    }

    _initMaterials() {
        this.matScrub = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1.0 });
        this.matScrub.map.repeat.set(10, 10); // Increase repeat for large floor

        this.matAssembly = new THREE.MeshStandardMaterial({ map: metalTex, roughness: 0.6, metalness: 0.5 });
        this.matAssembly.map.repeat.set(2, 2);

        this.matPrinter = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xeeeeee, roughness: 0.2 });
        this.matWall = new THREE.MeshStandardMaterial({ map: metalTex, color: 0x555555, roughness: 0.7 });
        this.matGlitch = new THREE.MeshStandardMaterial({ map: hazardTex, emissive: 0xff0000, emissiveIntensity: 0.2 });
        this.matSlime = new THREE.MeshStandardMaterial({ map: slimeTex, transparent: true, opacity: 0.9, emissive: 0x00ff00, emissiveIntensity: 0.3 });
        this.matIce = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.0, metalness: 0.1 });
    }

    _buildLevel() {
        this._buildTier1_Scrap();
        this._buildTier2_Assembly();
        this._buildTier3_Printer();
        this._buildMinimalHub(); // Replaces Glitch Core
        this._buildBounds();
    }

    _buildTier1_Scrap() {
        // SCALED UP: 300x300 Floor
        const floorGeo = new THREE.PlaneGeometry(300, 300);
        const floor = new THREE.Mesh(floorGeo, this.matScrub);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor;

        // Pillars - Taller now
        this._createBlock(40, 12, 40, 8, 24, 8, this.matWall);
        this._createBlock(-40, 12, 40, 8, 24, 8, this.matWall);
        this._createBlock(40, 12, -40, 8, 24, 8, this.matWall);
        this._createBlock(-40, 12, -40, 8, 24, 8, this.matWall);

        // Slime pads - Moved to +/- 45 to be clear of Tier 2 overhang (starts at +/- 60)
        this._createSpecialBlock('slime', 45, 0.5, 0, 6, 1, 6);
        this._createSpecialBlock('slime', -45, 0.5, 0, 6, 1, 6);

        // DYNAMIC OBSTACLES: "Piston Fields" & "Moving Platforms"
        this.dynamicActors = [];

        // 1. Fixed Piston Clusters (Deterministic)
        // Placed at 60-degree intervals at Radius 110
        const angles = [0, 60, 120, 180, 240, 300];
        for (const deg of angles) {
            const angle = deg * (Math.PI / 180);
            const dist = 110;
            const cx = Math.cos(angle) * dist;
            const cz = Math.sin(angle) * dist;

            // Create cluster (Seed the internal randomness or keep it? 
            // Internal pistons use Math.random(). If clients desync on *that*, the pillars will move differently?
            // Yes. Ideally we seed that too. BUT, for now, position is the main "stuck" issue.
            // Let's at least fix the CLUSTER position.)
            this._createRandomPistons(cx, cz, 15, 10);
        }

        // 2. Rotating Blast Walls (Replaced with nothing as per request)
        // User asked to remove floating platforms.
    }

    _createRandomPistons(cx, cz, radius, count) {
        for (let i = 0; i < count; i++) {
            // Random position in circle
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * radius;
            const x = cx + Math.cos(angle) * r;
            const z = cz + Math.sin(angle) * r;

            const maxHeight = 4 + Math.random() * 6; // Height 4 to 10

            // Start at random state
            const startUp = Math.random() > 0.5;
            const startY = startUp ? maxHeight : 0.5;

            // Create block
            const mesh = this._createBlock(x, 0, z, 6, maxHeight, 6, this.matAssembly, true, true);

            // Set vertical position based on "exposed top" logic
            // CenterY = topY - (maxHeight/2)
            mesh.position.y = startY - (maxHeight / 2);

            this.dynamicActors.push({
                type: 'piston',
                mesh: mesh,
                maxHeight: maxHeight, // Geometry height
                minTopY: 0.5,         // Flush with ground
                maxTopY: maxHeight,   // Fully extended

                // State Machine: 'WAIT', 'MOVE'
                state: 'WAIT',
                // Increased wait time: 8s to 12s
                timer: 8.0 + Math.random() * 4.0,

                targetTopY: startY,
                currentTopY: startY,
                startTopY: startY,

                moveDuration: 0,
                moveProgress: 0
            });
        }
    }
    _buildTier2_Assembly() {
        // Raised to Y=25. Continuous Ring.
        const thickness = 2;
        const y = 25 - thickness / 2;

        // Main Cross Sections (Ice)
        this._createBlock(0, y, -80, 120, thickness, 40, this.matIce); // North
        this._createBlock(0, y, 80, 120, thickness, 40, this.matIce);  // South
        this._createBlock(80, y, 0, 40, thickness, 120, this.matIce);  // East
        this._createBlock(-80, y, 0, 40, thickness, 120, this.matIce); // West

        // Fill Corners to make it a connected square/ring (Ice)
        this._createBlock(80, y, -80, 40, thickness, 40, this.matIce); // NE
        this._createBlock(-80, y, -80, 40, thickness, 40, this.matIce); // NW
        this._createBlock(80, y, 80, 40, thickness, 40, this.matIce);  // SE
        this._createBlock(-80, y, 80, 40, thickness, 40, this.matIce); // SW

        // Ramps connecting Tier 1 to Tier 2 (Y=0 to Y=25)
        // Length 50 for shallower slope (~26 deg)
        this._createRamp(0, 0, 50, 20, 25, 50, 'north');
        this._createRamp(0, 0, -50, 20, 25, 50, 'south');

        // Removed individual ice patches as the whole floor is now ice
    }

    _buildTier3_Printer() {
        // Tier 2 North ends at Z=-100, Y=25 (top)
        // Tier 3 should be further back with ramp bridging the gap

        // NORTH: Platform from Z=-130 to Z=-150 (touching boundary)
        // Ramp goes from Z=-100 (Tier 2 edge) to Z=-130 (Tier 3 edge)
        const t3Depth = 20;
        const t3CenterN = -140;  // Center of Tier 3 North

        this._createBlock(-25, 45, t3CenterN, 30, 2, t3Depth, this.matPrinter); // Left
        this._createBlock(25, 45, t3CenterN, 30, 2, t3Depth, this.matPrinter);  // Right
        // Center Landing (Fills the gap and overlaps ramp)
        // Ramp ends at -130. Block extends -129 to -151 (Depth 22). 1 unit overlap.
        this._createBlock(0, 45, -140, 20, 2, 22, this.matPrinter);

        // Ramp: Start at Z=-100 (Tier 2 edge), Y=25
        // End at Z=-130 (Tier 3 edge), Y=46
        // Length = 30, Rise = 21
        this._createRamp(0, 25, -100, 16, 21, 30, 'north');

        // SOUTH: Mirror of north
        const t3CenterS = 140;
        this._createBlock(-25, 45, t3CenterS, 30, 2, t3Depth, this.matPrinter); // Left
        this._createBlock(25, 45, t3CenterS, 30, 2, t3Depth, this.matPrinter);  // Right
        // Center Landing (Fills the gap and overlaps ramp)
        // Ramp ends at 130. Block extends 129 to 151.
        this._createBlock(0, 45, 140, 20, 2, 22, this.matPrinter);

        // Ramp from Z=+100 to Z=+130
        this._createRamp(0, 25, 100, 16, 21, 30, 'south');

        // Cover blocks
        this._createBlock(30, 46.5, t3CenterN, 6, 3, 6, this.matWall);
        this._createBlock(-30, 46.5, t3CenterN, 6, 3, 6, this.matWall);
        this._createBlock(30, 46.5, t3CenterS, 6, 3, 6, this.matWall);
        this._createBlock(-30, 46.5, t3CenterS, 6, 3, 6, this.matWall);
    }

    _buildMinimalHub() {
        this._buildTransformerTable();
    }

    _buildTransformerTable() {
        // "Transformer Table": Ground level, expandable structure.
        // Two halves sliding apart to reveal a gap.

        this.transformerParts = [];

        // Dimensions
        const width = 24;  // Total Width (X)
        const depth = 12;  // Depth of each half (Z) so total depth closed = 24
        const height = 2;  // Table height
        const yPos = 1;    // Center Y (sitting on Y=0 floor leads to center 1)

        // 1. Static Base / Frame (Optional, maybe just the sliding parts?)
        // Let's create a frame at ground level that stays.
        this._createBlock(14, 0.5, 0, 4, 1, 24, this.matAssembly); // East Rail
        this._createBlock(-14, 0.5, 0, 4, 1, 24, this.matAssembly); // West Rail

        // 2. Sliding Panels
        // North Panel (Starts at Z = -6)
        const northPanel = this._createBlock(0, 2, -6, 24, 2, 12, this.matAssembly, true, true);
        this.transformerParts.push({
            mesh: northPanel,
            baseZ: -6,
            direction: -1 // Moves Negative Z to open
        });

        // South Panel (Starts at Z = 6)
        const southPanel = this._createBlock(0, 2, 6, 24, 2, 12, this.matAssembly, true, true);
        this.transformerParts.push({
            mesh: southPanel,
            baseZ: 6,
            direction: 1 // Moves Positive Z to open
        });

        // Center Gap is currently empty as requested.
    }

    update(delta, time) {
        if (!this.transformerParts) return;

        // Animation: Open... Wait... Close... Wait.
        // Cycle Period: 8 seconds
        // 0-2: Opening
        // 2-4: Open Wait
        // 4-6: Closing
        // 6-8: Closed Wait

        const cycleDuration = 12.0;
        const t = time % cycleDuration;

        let expansion = 0; // 0 to 1
        let velocityScale = 0; // Derivative for physics

        const moveTime = 3.0; // Time to open/close
        const waitTime = 3.0; // Time to stay open/closed

        if (t < moveTime) {
            // Opening (0 to 1)
            const p = t / moveTime;
            // Smooth easing: .5 - .5 * cos(pi * p)
            expansion = 0.5 - 0.5 * Math.cos(Math.PI * p);
            // Derivative: 0.5 * pi * sin(pi * p) / moveTime
            velocityScale = (0.5 * Math.PI * Math.sin(Math.PI * p)) / moveTime;
        } else if (t < moveTime + waitTime) {
            // Open Wait (1)
            expansion = 1;
            velocityScale = 0;
        } else if (t < moveTime * 2 + waitTime) {
            // Closing (1 to 0)
            const p = (t - (moveTime + waitTime)) / moveTime;
            // Reverse curve
            expansion = 0.5 + 0.5 * Math.cos(Math.PI * p);
            // Derivative: -0.5 * pi * sin(pi * p) / moveTime
            velocityScale = -(0.5 * Math.PI * Math.sin(Math.PI * p)) / moveTime;
        } else {
            // Closed Wait (0)
            expansion = 0;
            velocityScale = 0;
        }

        const maxOffset = 8; // How far they slide out

        for (const part of this.transformerParts) {
            const currentZ = part.baseZ + (part.direction * expansion * maxOffset);

            // Velocity = direction * velocityScale * maxOffset
            // NOTE: We need Vector3 for physics
            const vZ = part.direction * velocityScale * maxOffset;

            part.mesh.position.z = currentZ;
            part.mesh.userData.velocity = new THREE.Vector3(0, 0, vZ);
        }

        // Animate Dynamic Obstacles (Pistons / Rotators)
        if (this.dynamicActors) {
            for (const actor of this.dynamicActors) {
                if (actor.type === 'piston') {
                    // DETERMINISTIC MOVEMENT based on Time
                    // Cycle: 4s up, 2s wait, 4s down, 2s wait = 12s period
                    const period = 8.0; 
                    // Add phase offset based on position to keep "random" look but deterministic
                    const phase = (actor.mesh.position.x * 0.1 + actor.mesh.position.z * 0.1) * 2.0;
                    
                    const t = (time + phase) % period;
                    
                    let yOffset = 0;
                    
                    // Simple Sine Wave approach for smoothness:
                    // value = (sin(time) + 1) / 2 * range
                    // But user wants "Piston" feel (Up... Wait... Down...)
                    // Let's use a smoother step function
                    
                    // 0-3: Move Up
                    // 3-5: Stay Up
                    // 5-8: Move Down
                    // 8-10: Stay Down
                    
                    // Let's use Math.sin for easiest sync
                    // factor: 0 to 1
                    const rawSin = Math.sin((time + phase) * 0.5); // Slow pulse
                    // Map -1..1 to 0..1
                    let factor = (rawSin + 1) / 2;
                    
                    // Sharpen the curve to make it "snap" more like hydraulic pistons
                    // Power function
                    factor = Math.pow(factor, 3); 
                    
                    const minH = actor.minTopY;
                    const maxH = actor.maxTopY;
                    const currentTop = minH + (maxH - minH) * factor;

                    // Update Y
                    const h = actor.maxHeight;
                    const newY = currentTop - (h / 2);
                    
                    // Calculate velocity for physics (approximate derivative)
                    const oldY = actor.mesh.position.y;
                    const vY = (newY - oldY) / delta;
                    
                    actor.mesh.position.y = newY;
                    actor.mesh.userData.velocity = new THREE.Vector3(0, vY, 0);
                }
            }
        }
    }

    _createCluster(cx, cy, cz) {
        // Create a random arrangement of crates/walls around a point
        this._createBlock(cx + 5, cy + 2, cz + 5, 4, 4, 4, this.matWall);
        this._createBlock(cx - 5, cy + 1.5, cz - 2, 3, 3, 3, this.matWall);
        // Replaced GlitchWall with Static Block
        this._createBlock(cx, cy + 2, cz + 6, 6, 4, 1, this.matWall);
    }

    _buildBounds() {
        // Outer walls scaled to 300
        const h = 50;
        this._createBlock(0, h / 2, -150, 300, h, 2, this.matWall); // North
        this._createBlock(0, h / 2, 150, 300, h, 2, this.matWall);  // South
        this._createBlock(-150, h / 2, 0, 2, h, 300, this.matWall); // West
        this._createBlock(150, h / 2, 0, 2, h, 300, this.matWall);  // East
    }

    _createBlock(x, y, z, w, h, d, material, isObstacle = true, returnMesh = false) {
        const geo = new THREE.BoxGeometry(w, h, d);
        if (material.map) {
            // Clone material to handle different UVs possibly? 
            // Simplification: Just use same material, UV scaling relies on repeat.
        }
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Auto-tag special materials for Physics
        if (material === this.matIce) mesh.userData.type = 'ice';
        if (material === this.matSlime) mesh.userData.type = 'slime';

        if (isObstacle) {
            this.obstacles.push(mesh);
            this.scene.add(mesh);
        } else {
            this.walls.add(mesh);
        }

        if (returnMesh) return mesh;
    }

    _createSpecialBlock(type, x, y, z, w, h, d) {
        const mat = type === 'slime' ? this.matSlime : this.matIce;
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.type = type;

        this.obstacles.push(mesh);
        this.specialBlocks.push({ type, mesh });
        this.scene.add(mesh);
    }

    // _createGlitchWall removed as per cleanup request

    _createRamp(startX, startY, startZ, width, height, length, direction) {
        // Create a slope using a rotated box
        // Math: A box of size (width, thickness, hypotenuse) rotated
        const rise = height;
        const run = length;
        const hyp = Math.sqrt(rise * rise + run * run);
        const angle = Math.atan2(rise, run);

        const geo = new THREE.BoxGeometry(width, 1, hyp); // Thickness 1
        const mesh = new THREE.Mesh(geo, this.matWall);

        let cx = startX;
        let cz = startZ;
        let cy = startY + height / 2;

        mesh.receiveShadow = true;
        mesh.castShadow = true;

        if (direction === 'north') {
            cz -= length / 2;
            mesh.rotation.x = angle;
        } else if (direction === 'south') {
            cz += length / 2;
            mesh.rotation.x = -angle;
        } else if (direction === 'east') {
            cx += length / 2;
            mesh.rotation.z = -angle;
            mesh.rotation.y = Math.PI / 2; // Rotate to face East
            // Wait, Box geometry default is width(x), height(y), depth(z).
            // If we rotate Y, Local Z becomes world X?
            // Simpler: Just Swap Width/Depth dimensions in geometry or reuse logic?
            // Let's stick to simple axis rotation
            mesh.rotation.x = 0;
            mesh.rotation.z = -angle; // Slope up X
            mesh.rotation.y = 0;
            // Re-orient geometry for East/West?
            // Current geo is W=Width(Fixed axis?), H=1, D=Hyp(Slope axis).
            // North: cz change, rotate X. Correct.
            // East: cx change, slope is along X.
            // Rotate Y 90?
            mesh.rotation.y = -Math.PI / 2;
            mesh.rotation.x = angle; // Apply slope after Y-rotation?
        } else if (direction === 'west') {
            cx -= length / 2;
            mesh.rotation.y = Math.PI / 2;
            mesh.rotation.x = angle;
        }

        mesh.position.set(cx, cy, cz);

        // IMPORTANT: Ramps should be walkable. 
        // Logic: Raycast ground check works on meshes. 
        // Horizontal collision (AABB) might block "walls". 
        // We need to flag this as "ramp" so Physics.js ignores its AABB (or treats it differently) 
        // BUT Player.js Raycast sees it as ground.
        mesh.userData.type = 'ramp';

        this.obstacles.push(mesh);
        this.scene.add(mesh);
    }

    getObstacles() {
        return this.obstacles;
    }
}
