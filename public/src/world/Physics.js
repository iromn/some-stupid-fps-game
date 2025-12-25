import * as THREE from 'three';

export class Physics {
    constructor(level) {
        this.level = level;
    }

    checkCollision(position) {
        const playerRadius = 0.5; // Reduced from 1.0 for tighter fit
        const playerHeight = 1.8;
        const obstacles = this.level.getObstacles();

        for (const obs of obstacles) {
            // Ignore ramps for horizontal AABB check (handled by ground raycast)
            if (obs.userData && obs.userData.type === 'ramp') continue;

            // Get dimensions
            let w = 4, h = 4, d = 4;
            if (obs.geometry && obs.geometry.parameters) {
                w = obs.geometry.parameters.width;
                h = obs.geometry.parameters.height;
                d = obs.geometry.parameters.depth;
            }

            // AABB Check
            // Obs position is center
            const minX = obs.position.x - w / 2 - playerRadius;
            const maxX = obs.position.x + w / 2 + playerRadius;
            const minY = obs.position.y - h / 2 - playerHeight; // Check head/feet
            const maxY = obs.position.y + h / 2; // Feet check
            // Actually AABB vs Point(with radius)?
            // Player is a cylinder (x,z r=0.5) from y to y+1.8
            // Simple approach: Check if Player Box intersects Obs Box

            const pMinX = position.x - playerRadius;
            const pMaxX = position.x + playerRadius;
            const pMinY = position.y;
            const pMaxY = position.y + playerHeight;
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
                return { hit: true, object: obs, minX: oMinX, maxX: oMaxX, minZ: oMinZ, maxZ: oMaxZ };
            }
        }

        if (position.x < -150 || position.x > 150 || position.z < -150 || position.z > 150) { // Updated bounds for larger map
            return { hit: true, isWorldBound: true };
        }
        return { hit: false };
    }

    resolveMovement(startPos, intendedMove) {
        const endPos = startPos.clone().add(intendedMove);
        const collision = this.checkCollision(endPos);

        if (!collision.hit) {
            return { pos: endPos, vel: null };
        }

        let normal = new THREE.Vector3();

        if (collision.isWorldBound) {
            if (endPos.x < -150) normal.set(1, 0, 0);
            else if (endPos.x > 150) normal.set(-1, 0, 0);
            else if (endPos.z < -150) normal.set(0, 0, 1);
            else if (endPos.z > 150) normal.set(0, 0, -1);
        } else if (collision.object) {
            const obs = collision.object;
            // Determine side based on previous position (startPos) to avoid sticking
            // Or simple center-difference
            const dx = endPos.x - obs.position.x;
            const dz = endPos.z - obs.position.z;

            // Logic: Which face is closest?
            const distLeft = Math.abs(endPos.x - collision.minX);
            const distRight = Math.abs(endPos.x - collision.maxX);
            const distBack = Math.abs(endPos.z - collision.minZ);
            const distFront = Math.abs(endPos.z - collision.maxZ);

            const minDist = Math.min(distLeft, distRight, distBack, distFront);

            if (minDist === distLeft) normal.set(-1, 0, 0);
            else if (minDist === distRight) normal.set(1, 0, 0);
            else if (minDist === distBack) normal.set(0, 0, -1);
            else normal.set(0, 0, 1);
        }

        const dot = intendedMove.dot(normal);
        const slideMove = intendedMove.clone().sub(normal.multiplyScalar(dot));

        const slideEndPos = startPos.clone().add(slideMove);
        if (this.checkCollision(slideEndPos).hit) {
            return { pos: startPos, vel: new THREE.Vector3(0, 0, 0) };
        }

        return { pos: slideEndPos, hitNormal: normal };
    }
}
