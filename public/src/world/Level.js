import * as THREE from 'three';
import { grassTex, stoneTex, dirtTex } from '../graphics/Textures.js';

export class Level {
    constructor(scene) {
        this.scene = scene;
        this.walls = new THREE.Group();
        this.scene.add(this.walls);
        this.obstacles = [];

        this._initMaterials();
        this._buildLevel();
    }

    _initMaterials() {
        this.floorMat = new THREE.MeshStandardMaterial({
            map: grassTex,
            color: 0x88ff88,
            roughness: 1.0,
            metalness: 0.0
        });
        this.floorMat.map.repeat.set(50, 50);

        this.wallMat = new THREE.MeshStandardMaterial({
            map: stoneTex,
            roughness: 0.9,
            metalness: 0.1
        });

        this.obsMat = new THREE.MeshStandardMaterial({
            map: dirtTex,
            roughness: 1.0,
            metalness: 0.0
        });
    }

    _buildLevel() {
        // Floor
        const floorGeo = new THREE.PlaneGeometry(200, 200);
        const floor = new THREE.Mesh(floorGeo, this.floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);
        this.floor = floor; // Store for collision if needed

        // Walls
        this._createWall(0, 5, -50, 100, 10, 2);
        this._createWall(0, 5, 50, 100, 10, 2);
        this._createWall(-50, 5, 0, 2, 10, 100);
        this._createWall(50, 5, 0, 2, 10, 100);

        // Obstacles
        this._createObstacle(10, 10);
        this._createObstacle(-15, -20);
        this._createObstacle(25, -5);
        this._createObstacle(-5, 25);
    }

    _createWall(x, y, z, w, h, d) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, this.wallMat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.walls.add(mesh);
    }

    _createObstacle(x, z) {
        const geo = new THREE.BoxGeometry(4, 4, 4);
        const mesh = new THREE.Mesh(geo, this.obsMat);
        mesh.position.set(x, 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const topGeo = new THREE.PlaneGeometry(4, 4);
        const topMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0x88ff88 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.rotation.x = -Math.PI / 2;
        top.position.y = 2.01;
        top.receiveShadow = true;
        mesh.add(top);

        this.scene.add(mesh);
        this.obstacles.push(mesh);
    }

    getObstacles() {
        return this.obstacles;
    }
}
