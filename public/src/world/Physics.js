import * as THREE from 'three';

export class Physics {
    constructor(level) {
        this.level = level;
    }

    checkCollision(position) {
        const playerRadius = 1.0;
        const obstacles = this.level.getObstacles();

        for (const obs of obstacles) {
            const dx = Math.abs(position.x - obs.position.x);
            const dz = Math.abs(position.z - obs.position.z);
            if (dx < (2 + playerRadius) && dz < (2 + playerRadius)) {
                return { hit: true, object: obs };
            }
        }

        if (position.x < -48 || position.x > 48 || position.z < -48 || position.z > 48) {
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
            if (endPos.x < -48) normal.set(1, 0, 0);
            else if (endPos.x > 48) normal.set(-1, 0, 0);
            else if (endPos.z < -48) normal.set(0, 0, 1);
            else if (endPos.z > 48) normal.set(0, 0, -1);
        } else if (collision.object) {
            const obs = collision.object;
            const dx = endPos.x - obs.position.x;
            const dz = endPos.z - obs.position.z;
            if (Math.abs(dx) > Math.abs(dz)) {
                normal.set(Math.sign(dx), 0, 0);
            } else {
                normal.set(0, 0, Math.sign(dz));
            }
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
