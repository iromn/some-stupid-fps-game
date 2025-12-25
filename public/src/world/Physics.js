import * as THREE from 'three';

export class Physics {
    constructor(level) {
        this.level = level;
        // Optimization: Cached Vectors to reduce GC
        this._tempStart = new THREE.Vector3();
        this._tempEnd = new THREE.Vector3();
        this._tempDir = new THREE.Vector3();
        this._tempNormal = new THREE.Vector3();
        this._tempImpact = new THREE.Vector3();

        // Spatial Partitioning Cache
        this._largeObstacles = [];
        this._smallObstacles = [];
        this._initSpatialCache();
    }

    _initSpatialCache() {
        const all = this.level.getObstacles();
        for (const obs of all) {
            // Determine size
            let size = 0;
            if (obs.geometry && obs.geometry.parameters) {
                const p = obs.geometry.parameters;
                size = Math.max(p.width || 0, p.depth || 0, p.height || 0);
            } else {
                // Compute bounding sphere if needed
                if (!obs.geometry.boundingSphere) obs.geometry.computeBoundingSphere();
                size = obs.geometry.boundingSphere.radius * 2;
            }

            // Threshold: 15 units. 
            // Pistons are 6x6 -> Small. 
            // Walls are 300 -> Large.
            // Tier 2 blocks are 120, 40 etc -> Large.
            if (size > 20) {
                this._largeObstacles.push(obs);
            } else {
                this._smallObstacles.push(obs);
            }
        }
    }

    getNearbyObstacles(position, radius = 20) {
        // Always include large/global structure
        // Filter small props by distance
        // Note: Returns a NEW array. We could reuse a cached array if specific about capacity, 
        // but 'concat' or 'push' is fast enough for ~50 items.
        // Optimization: Reuse a single array and clear it?
        // But consumer might expect input array.

        // Let's simpler: Just return a merged list.
        const res = [...this._largeObstacles]; // Start with large

        const r2 = radius * radius;
        for (const obs of this._smallObstacles) {
            // Fast dist check (Center to Center)
            const d2 = position.distanceToSquared(obs.position);
            // Add buffer for object radius (approx 5) + player radius(0.5)
            // If obs is size 6, radius ~4. 
            // Safe dist: radius + 5 + 1?
            // Let's use generous radius.
            if (d2 < r2) {
                res.push(obs);
            }
        }
        return res;
    }

    checkCollision(position, candidates = null) {
        const playerRadius = 0.5;
        const playerHeight = 1.8;

        // Use provided candidates or fallback (fallback shouldn't happen in optimized path)
        const obstacles = candidates || this.level.getObstacles();

        for (const obs of obstacles) {
            // Ignore ramps and slime for horizontal AABB check (handled by ground raycast)
            if (obs.userData && (obs.userData.type === 'ramp' || obs.userData.type === 'slime')) continue;

            // Get dimensions
            // Optimization: Cache dimensions onUserData? Or assume BoxGeometry?
            // Most are Box.
            let w = 4, h = 4, d = 4;
            if (obs.geometry && obs.geometry.parameters) {
                w = obs.geometry.parameters.width;
                h = obs.geometry.parameters.height;
                d = obs.geometry.parameters.depth;
            }

            // AABB Check
            const minX = obs.position.x - w / 2 - playerRadius;
            const maxX = obs.position.x + w / 2 + playerRadius;

            // Adjust Obs Y bounds for Player Height relative to Camera
            // Player Position is Camera (Eye Level) ~ 1.6m
            // Feet = pos.y - 1.6
            // Head = pos.y + 0.2
            // So obstacle must overlap [pos.y - 1.6, pos.y + 0.2]

            // Invert logic:
            // pMinY = position.y - 1.6
            // pMaxY = position.y + 0.2

            // Obs MinY must be < pMaxY (Head)
            // Obs MaxY must be > pMinY (Feet)

            const minY = obs.position.y - h / 2;
            const maxY = obs.position.y + h / 2;

            const pMinX = position.x - playerRadius;
            const pMaxX = position.x + playerRadius;

            // Vertical Bounds relative to Camera Position
            const pMinY = position.y - 1.6;
            const pMaxY = position.y + 0.2;

            const pMinZ = position.z - playerRadius;
            const pMaxZ = position.z + playerRadius;

            const oMinX = obs.position.x - w / 2;
            const oMaxX = obs.position.x + w / 2;
            const oMinY = obs.position.y - h / 2;
            const oMaxY = obs.position.y + h / 2;
            const oMinZ = obs.position.z - d / 2;
            const oMaxZ = obs.position.z + d / 2;

            if (pMinX < oMaxX && pMaxX > oMinX &&
                pMinY < oMaxY && pMaxY > oMinY &&
                pMinZ < oMaxZ && pMaxZ > oMinZ) {

                // Return expanded bounds for resolution?
                // resolveOverlap uses minX as "Obs Min". 
                // It expands bounds by radius? No, checkCollision logic uses:
                // minX = obs.x - w/2 - radius.
                // Wait, checkCollision calculates minX/maxX LOCALLY and returns them?
                // Yes at line 115: return { ..., minX: oMinX ... }
                // Wait, logic at lines 93/94:
                // const minX = obs.x - w/2 - radius;
                // These were used for "Point vs Expanded Box" check mentally?
                // But the overlap logic uses `oMinX` (raw box).
                // Let's ensure return values match what resolveOverlap expects.
                // resolveOverlap expects "Collision Box" bounds to push against.
                // It pushes `position` (Player Center) out of `Collision Box`.
                // Player is point?
                // If Player is Radius 0.5, we should push Center out of [ObsMin - R, ObsMax + R].
                // resolveOverlap line 87: dLeft = position.x - collision.minX
                // If collision.minX is raw obs min... then dLeft is large?
                // Wait.
                // If Rect A intersects Rect B.
                // Overlap is (A.max - B.min).

                // If resolveOverlap treats Box as [minX, maxX] and pushes Position OUT...
                // It assumes Position is a POINT.
                // So minX/maxX MUST be expanded by Player Radius.

                // Line 115 returns oMinX (Raw).
                // Line 87: dLeft = pos.x - oMinX.
                // If pos.x is inside raw box, need to push out.
                // If pos.x is outside raw box but inside radius... 
                // We need to push out to Radius boundary.

                // Fix: Return EXPANDED bounds.
                // oMinX_Effective = oMinX - playerRadius.
                // oMaxX_Effective = oMaxX + playerRadius.

                return {
                    hit: true,
                    object: obs,
                    minX: oMinX - playerRadius,
                    maxX: oMaxX + playerRadius,
                    minZ: oMinZ - playerRadius,
                    maxZ: oMaxZ + playerRadius,
                    // Vertical is different. Player is not a sphere.
                    // Vertical: Pushes Head (pos + 0.2) or Feet (pos - 1.6)?
                    // Logic expects "Point" position?
                    // "Push Out" adjusts `position` (Camera).
                    // If we want Camera Y to be valid...
                    // Valid Y range: [ObsMax + 1.6, ObsMin - 0.2] ? 
                    // (Feet above ObsMax => Y > ObsMax + 1.6)
                    // (Head below ObsMin => Y + 0.2 < ObsMin => Y < ObsMin - 0.2)

                    // So "Forbidden Zone" for Y is [ObsMin - 0.2, ObsMax + 1.6].
                    // Return bounds:
                    minY: oMinY - 0.2, // ? No.
                    // If we push out, we want position.y to be OUTSIDE [minY, maxY].
                    // So minY should be "Bottom Limit" and maxY "Top Limit" of collision volume relative to pivot.

                    // Actually, resolveOverlap logic:
                    // positions.x = minX - 0.001.
                    // This sets Pos to Left Edge.

                    // If we need Pos > Top (Feet on top):
                    // Pos.y = MaxY_Effective + epsilon.
                    // MaxY_Effective = oMaxY + 1.6.  (Floor level for camera)
                    // MinY_Effective = oMinY - 0.2.  (Ceiling level for camera)

                    // Wait, current logic for collision detection used [pMinY, pMaxY] (AABB).
                    // But resolveOverlap needs "Effective Box" for Point Resolution.
                    // Correct.

                    // Let's implement this correction too for robustness.
                    // For now, let's keep it simple to fix the immediate vertical offset bug.
                    // Just return Correct Vertical Bounds for 'resolveOverlap' to use?
                    // Existing code didn't use Y for push out?
                    // Line 92: min(dLeft, dRight, dBack, dFront). 
                    // IT ONLY RESOLVES X/Z!
                    // Physics.js DOES NOT RESOLVE VERTICAL PENETRATION?
                    // Lines 104-107: Update x/z.
                    // Good. That means vertical intersection is IGNORED by "Push Out".
                    // So why does the user say "push out code on the player"?
                    // maybe "dFront" (Z) is small?
                    // If I jump into ceiling, `pMinY < oMaxY` etc triggers `hit: true`.
                    // `resolveOverlap` takes the hit.
                    // Finds shortest axis in X/Z.
                    // Pushes player SIDEWAYS out of the ceiling block.
                    // That feels like a stutter/slide.

                    // Ideally, we ignore vertical collision in "Push Out"?
                    // Or we resolve vertically? (Head hits ceiling -> Push Down).
                    // But Physics engine usually delegates vertical to "Ceiling/Ground Check".
                    // Here, resolveOverlap is purely horizontal?
                    // Yes.

                    // Fixing the AABB offset means:
                    // If I am just walking around, Feet [Y-1.6] check obstacles.
                    // If I jump, Head [Y+0.2] checks ceiling.

                    // Tier 2 Platform: Y=24 to 26 (thickness 2, center 25).
                    // Player jumps. Head reaches 23.8.
                    // AABB Top: 23.8 + 0.2 = 24.0.
                    // AABB Bottom: 23.8 - 1.6 = 22.2.
                    // Collision with Platform [24, 26]?
                    // Just touching.
                    // Player snaps to 23.8 (Ceiling Check).
                    // AABB touches [24].
                    // Logic might say HIT.
                    // Push Out tries to push sideways.
                    // Result: Jitter.

                    // Fix: Ensure CheckCollision margin is slightly smaller than Raycast Snap?
                    // Or Snap is safer.
                    // Player.js snaps to `hit.point.y - 0.2 - 0.01` = 23.99.
                    // Head Top: 23.99 + 0.2 = 23.99.
                    // Platform Bottom: 24.
                    // Gap: 0.01.
                    // Proper AABB check (pMaxY < oMinY) -> 23.99 < 24.
                    // NO HIT.

                    // So, simply FIXING the pMinY/pMaxY definition in checkCollision solves it.
                    // Previously:
                    // pMinY = 23.99.
                    // pMaxY = 23.99 + 1.8 = 25.79.
                    // 25.79 > 24. HIT!
                    // Push Out -> Sideways slide.

                };
            }

        }

        if (position.x < -150 || position.x > 150 || position.z < -150 || position.z > 150) {
            return { hit: true, isWorldBound: true };
        }
        return { hit: false };
    }

    resolveOverlap(position) {
        // Use optimized candidate list
        // Overlap only cares about current position, so radius ~5 is enough?
        // Let's use consistent radius 25 to cover movement potential.
        const candidates = this.getNearbyObstacles(position, 25);

        // "Push Out" mechanic
        const collision = this.checkCollision(position, candidates);
        if (!collision.hit || collision.isWorldBound) return position;

        const obs = collision.object;
        if (!obs) return position;

        // Calculate overlap depth for each face
        // Note: collision.minX etc are the OBSTACLE'S boundaries (expanded by player radius?)
        // Wait, checkCollision calculates minX = obs.x - w/2 - radius.
        // So if (p < maxX), we are left of the RIGHT combined edge.
        // Overlap amount = Distance to that edge.

        // P is inside [minX, maxX].
        // Dist to Left Edge (minX) = P.x - minX
        // Dist to Right Edge (maxX) = maxX - P.x

        const dLeft = position.x - collision.minX;
        const dRight = collision.maxX - position.x;
        const dBack = position.z - collision.minZ;
        const dFront = collision.maxZ - position.z;

        const min = Math.min(dLeft, dRight, dBack, dFront);

        const correction = new THREE.Vector3();

        // Push OUT towards the closest edge
        // If dLeft is small, we are close to Left edge. We should push Left (Negative X).
        // Wait, minX is (Center - Width/2 - Radius).
        // If we are at minX, we are exactly touching the "radius shell".
        // If we are deeper (larger dLeft), we are inside.
        // So we want to reduce dLeft to 0? i.e. move to minX.
        // New Pos X = minX.

        if (min === dLeft) position.x = collision.minX - 0.001;
        else if (min === dRight) position.x = collision.maxX + 0.001;
        else if (min === dBack) position.z = collision.minZ - 0.001;
        else if (min === dFront) position.z = collision.maxZ + 0.001;

        return position;
    }

    resolveMovement(startPos, intendedMove) {
        // Optimization: Fetch candidates ONCE for the whole frame logic
        // Radius: 30 (Covers move + slide). 
        const candidates = this.getNearbyObstacles(startPos, 30);

        // Step 0: Depenetrate (Push Out)
        // Note: resolveOverlap modifies currentPos IN PLACE if we pass a clone.
        // We want to return a NEW position, but we can reuse a temp.

        // We'll treat 'currentPos' as our working vector.
        // Initialize it with startPos
        const currentPos = startPos.clone(); // Clone once

        // Push Out
        this.resolveOverlap(currentPos);

        let currentMove = intendedMove.clone(); // Clone once needed to track velocity

        const maxSlides = 3;

        for (let i = 0; i < maxSlides; i++) {
            const dist = currentMove.length();
            if (dist < 0.0001) break;

            let toi = 1.0;
            let hitNormal = null;

            // 1. Check full move
            // _tempEnd = currentPos + currentMove
            this._tempEnd.copy(currentPos).add(currentMove);

            const fullCheck = this.checkCollision(this._tempEnd, candidates);

            if (!fullCheck.hit) {
                // Free to move
                currentPos.copy(this._tempEnd);
                break;
            }

            // 2. Bisection
            let tMin = 0.0;
            let tMax = 1.0;
            let iterations = 4; // Reduced to 4 for performance (still accurate enough)

            for (let j = 0; j < iterations; j++) {
                const tMid = (tMin + tMax) * 0.5;
                // Test pos = currentPos + move * tMid
                this._tempStart.copy(currentMove).multiplyScalar(tMid).add(currentPos);

                const check = this.checkCollision(this._tempStart, candidates);

                if (check.hit) {
                    tMax = tMid;
                } else {
                    tMin = tMid;
                }
            }

            toi = tMin;

            // Calculate Hit Normal
            // impactPos = currentPos + move * tMax
            this._tempImpact.copy(currentMove).multiplyScalar(tMax).add(currentPos);
            const impactCheck = this.checkCollision(this._tempImpact, candidates);

            if (impactCheck.hit) {
                // Need to clone the result normal from calculateNormal? 
                // calculateNormal returns new Vector3 currently. 
                // Let's assume it does.
                hitNormal = this.calculateNormal(this._tempImpact, impactCheck);
            } else {
                hitNormal = new THREE.Vector3(0, 1, 0);
            }

            // Move to safe spot (toi)
            // currentPos += move * toi
            this._tempDir.copy(currentMove).multiplyScalar(toi);
            currentPos.add(this._tempDir);

            // 3. Slide
            const remaining = 1.0 - toi;
            if (remaining <= 0.001) break;

            // remainingVec = move * remaining
            // Slide logic
            this._tempDir.copy(currentMove).multiplyScalar(remaining);
            const dot = this._tempDir.dot(hitNormal);

            if (dot < 0) {
                // slideVec = remainingVec - normal * dot
                this._tempNormal.copy(hitNormal).multiplyScalar(dot);
                this._tempDir.sub(this._tempNormal);
                currentMove.copy(this._tempDir);
            } else {
                currentMove.copy(this._tempDir);
            }
        }

        return { pos: currentPos, hitNormal: null };
    }

    calculateNormal(pos, collision) {
        if (collision.isWorldBound) {
            if (pos.x < -150) return new THREE.Vector3(1, 0, 0);
            if (pos.x > 150) return new THREE.Vector3(-1, 0, 0);
            if (pos.z < -150) return new THREE.Vector3(0, 0, 1);
            if (pos.z > 150) return new THREE.Vector3(0, 0, -1);
            return new THREE.Vector3(0, 1, 0);
        }

        if (collision.object) {
            // Refined Normal Calculation:
            const obs = collision.object;
            const w = (collision.maxX - collision.minX);
            const d = (collision.maxZ - collision.minZ);

            // We want direction from Center of Box to Player
            // But 'collision.minX' is the BOUNDS of the box.
            // Box Center X = (minX + maxX) / 2? No, checkCollision logic implies minX is left edge.
            const cx = (collision.minX + collision.maxX) / 2;
            const cz = (collision.minZ + collision.maxZ) / 2;

            const dx = pos.x - cx;
            const dz = pos.z - cz;

            // Normalize by dimensions (box shape)
            const px = dx / (w / 2);
            const pz = dz / (d / 2);

            if (Math.abs(px) > Math.abs(pz)) {
                return new THREE.Vector3(Math.sign(px), 0, 0);
            } else {
                return new THREE.Vector3(0, 0, Math.sign(pz));
            }
        }
        return new THREE.Vector3(0, 1, 0);
    }
}
