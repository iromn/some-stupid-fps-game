import * as THREE from 'three';

export class Effects {
    constructor(scene) {
        this.scene = scene;
    }

    createBulletTracer(startPos, direction, type = 'bullet') {
        let mesh;
        let speed = 60; // default

        if (type === 'rock') {
            // Slingshot Rock
            mesh = new THREE.Mesh(
                new THREE.IcosahedronGeometry(0.1, 0), // Chunky rock
                new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 1.0 })
            );
            speed = 30; // Slower
        } else {
            // Gun Tracer (Orange/Red)
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, 0.05, 0.5),
                new THREE.MeshBasicMaterial({ color: 0xff4400 })
            );
            speed = 100; // Faster

            // Muzzle Flash (Only for guns)
            this.createMuzzleFlash(startPos);
        }

        mesh.position.copy(startPos);
        if (type !== 'rock') {
            mesh.lookAt(new THREE.Vector3().copy(startPos).add(direction));
        }

        this.scene.add(mesh);

        const start = performance.now();

        const update = () => {
            const delta = (performance.now() - start) / 1000;
            if (delta > (type === 'rock' ? 1.0 : 0.5)) {
                this.scene.remove(mesh);
                return;
            }
            mesh.position.addScaledVector(direction, speed * 0.016);

            // Rotate rock
            if (type === 'rock') {
                mesh.rotation.x += 0.1;
                mesh.rotation.y += 0.1;
            }

            requestAnimationFrame(update);
        };
        update();
    }

    createMuzzleFlash(pos) {
        // Flash Light
        const light = new THREE.PointLight(0xffaa00, 2, 3);
        light.position.copy(pos);
        this.scene.add(light);

        // Flash Mesh (Billboardish)
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 });
        const flash = new THREE.Mesh(geometry, material);
        flash.position.copy(pos);
        this.scene.add(flash);

        setTimeout(() => {
            this.scene.remove(light);
            this.scene.remove(flash);
        }, 50);
    }
}
