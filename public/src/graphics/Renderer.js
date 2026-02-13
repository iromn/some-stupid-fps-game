import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class Renderer {
    constructor() {
        this.scene = new THREE.Scene();
        // Battlefield aesthetic: Dark, gritty, industrial
        this.scene.background = new THREE.Color(0x0d1117); // Deep charcoal
        this.scene.fog = new THREE.Fog(0x0d1117, 50, 300); // Atmospheric depth fog

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.y = 1.6;

        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: "high-performance" // Hint to browser
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Optimization: Cap pixel ratio to 1.5 (Retina screens usually 2 or 3, killing FPS)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        document.body.appendChild(this.renderer.domElement);

        this._initLights();
        this._initPostProcessing();

        window.addEventListener('resize', () => this._onWindowResize());
    }

    _initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Optimization: Half-resolution bloom for better performance
        const bloomVec = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);

        // Resolution, Strength, Radius, Threshold
        const bloomPass = new UnrealBloomPass(
            bloomVec,
            1.5,  // Strength
            0.4,  // Radius
            0.85  // Threshold
        );
        this.composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
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

        // Optimization: Reduced from 4096 to 2048
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
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
        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
