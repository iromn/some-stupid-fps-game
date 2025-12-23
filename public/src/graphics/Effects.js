import * as THREE from 'three';

export class Effects {
    constructor(scene) {
        this.scene = scene;
    }

    createBulletTracer(startPos, direction) {
        const bullet = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.1),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        bullet.position.copy(startPos);
        this.scene.add(bullet);

        const speed = 60;
        const start = performance.now();

        const update = () => {
            const delta = (performance.now() - start) / 1000;
            if (delta > 0.5) {
                this.scene.remove(bullet);
                return;
            }
            bullet.position.addScaledVector(direction, speed * 0.016);
            requestAnimationFrame(update);
        };
        update();
    }
}
