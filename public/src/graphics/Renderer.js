import * as THREE from 'three';

export class Renderer {
    constructor() {
        this.scene = new THREE.Scene();
        // Battlefield aesthetic: Dark, gritty, industrial
        this.scene.background = new THREE.Color(0x0d1117); // Deep charcoal
        this.scene.fog = new THREE.Fog(0x0d1117, 50, 300); // Atmospheric depth fog

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6;

        this.renderer = new THREE.WebGLRenderer({ antialias: true }); // Enable antialiasing
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Better quality
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic look
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        this._initLights();

        window.addEventListener('resize', () => this._onWindowResize());
    }

    _initLights() {
        // Ambient: Cool blue undertone for battlefield feel
        const ambientLight = new THREE.AmbientLight(0x4a5568, 0.4);
        this.scene.add(ambientLight);

        // Hemisphere: Sky/Ground contrast
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d3748, 0.5);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // Main Directional: Warm sunlight cutting through
        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5);
        dirLight.position.set(80, 120, 60);
        dirLight.castShadow = true;

        dirLight.shadow.mapSize.width = 4096; // Higher quality shadows
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -150;
        dirLight.shadow.camera.right = 150;
        dirLight.shadow.camera.top = 150;
        dirLight.shadow.camera.bottom = -150;
        dirLight.shadow.bias = -0.0001;
        dirLight.shadow.normalBias = 0.02;

        this.scene.add(dirLight);

        // Accent Light: Orange glow from "explosions" area
        const accentLight = new THREE.PointLight(0xff6b35, 0.8, 100);
        accentLight.position.set(0, 10, 0);
        this.scene.add(accentLight);
    }

    _onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
