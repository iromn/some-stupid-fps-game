// Client-side weapon definitions
// Matches server-side WeaponConfig.js but includes visual/audio properties

export const WEAPONS = {
    pistol: {
        id: 'pistol',
        name: 'Pistol',
        damage: 15,
        fireRate: 400,      // ms between shots
        range: 100,
        modelPath: '/assets/weapons/pistol.glb',
        // Valorant-style positioning - weapon angled toward crosshair
        position: { x: 0.02, y: -0.02, z: -0.18 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        rotation: { x: 0.05, y: 0.1, z: 0 },
        handOffset: { x: 0.02, y: 0.03, z: -0.12 },
        // Custom Arm Positioning (Pistol needs to be higher/closer)
        armPosition: { x: 0.2, y: -0.15, z: -0.3 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 600, type: 'square', duration: 0.1 }
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        damage: 20,
        fireRate: 150,      // Full auto
        range: 80,
        modelPath: '/assets/weapons/ak47.glb',
        position: { x: 0.03, y: -0.01, z: -0.22 },
        scale: { x: 1.3, y: 1.3, z: 1.3 },
        rotation: { x: 0.03, y: 0.08, z: 0 },
        handOffset: { x: 0.03, y: 0.04, z: -0.18 },
        // Standard "Good" Positioning
        armPosition: { x: 0.22, y: -0.22, z: -0.35 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 400, type: 'square', duration: 0.08 }
    },
    sniper: {
        id: 'sniper',
        name: 'Sniper',
        damage: 75,
        fireRate: 1500,     // Slow but powerful
        range: 300,
        modelPath: '/assets/weapons/sniper.glb',
        position: { x: 0.04, y: 0, z: -0.28 },
        scale: { x: 1.4, y: 1.4, z: 1.4 },
        rotation: { x: 0.02, y: 0.06, z: 0 },
        handOffset: { x: 0.04, y: 0.05, z: -0.22 },
        // Similar to AK but slightly heavier feel (lower)
        armPosition: { x: 0.22, y: -0.24, z: -0.35 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 200, type: 'sawtooth', duration: 0.2 }
    },
    slingshot: {
        id: 'slingshot',
        name: 'Slingshot',
        damage: 25,
        fireRate: 800,
        range: 60,
        modelPath: '/assets/weapons/slingshot.glb',
        position: { x: 0.02, y: -0.02, z: -0.12 },
        scale: { x: 1.2, y: 1.2, z: 1.2 },
        rotation: { x: 0.04, y: 0.1, z: 0 },
        handOffset: { x: 0.02, y: 0.03, z: -0.08 },
        // Slingshot needs to be higher and more centered to see the fork, but simplified arm
        armPosition: { x: 0.25, y: -0.2, z: -0.3 },
        armRotation: { x: 0.1, y: -0.05, z: 0 },
        sound: { freq: 800, type: 'sine', duration: 0.15 }
    }
};

export const DEFAULT_WEAPON = 'pistol';

// Helper to get weapon by id
export function getWeapon(id) {
    return WEAPONS[id] || WEAPONS[DEFAULT_WEAPON];
}
