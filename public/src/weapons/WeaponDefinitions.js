// Client-side weapon definitions
// Matches server-side WeaponConfig.js but includes visual/audio properties

export const WEAPONS = {
    pistol: {
        id: 'pistol',
        name: 'Pistol',
        damage: 10,
        fireRate: 400,      // ms between shots
        range: 100,
        modelPath: '/assets/weapons/pistol.glb',
        // Valorant-style positioning - weapon angled toward crosshair
        position: { x: 0.02, y: -0.02, z: -0.18 },
        scale: { x: 1.5, y: 1.5, z: 1.5 },
        rotation: { x: 0.05, y: 0.1, z: 0 },
        handOffset: { x: 0.02, y: 0.03, z: -0.12 },
        muzzleOffset: 0.6, // Slightly in front
        // Custom Arm Positioning (Pistol needs to be higher/closer)
        armPosition: { x: 0.2, y: -0.15, z: -0.3 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 600, type: 'square', duration: 0.1 },
        maxAmmo: 30,
        visuals: {
            projectileType: 'tracer',
            color: 0xFFCC00, // Golden Orange
            flashColor: 0xFFCC00
        }
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
        muzzleOffset: 1.2, // Further out for long barrel
        // Standard "Good" Positioning
        armPosition: { x: 0.22, y: -0.22, z: -0.35 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 400, type: 'square', duration: 0.08 },
        maxAmmo: 20,
        visuals: {
            projectileType: 'tracer',
            color: 0xFF4500, // Orange Red
            flashColor: 0xFF4500
        }
    },
    sniper: {
        id: 'sniper',
        name: 'Sniper',
        damage: 100,
        fireRate: 1500,     // Slow but powerful
        range: 300,
        modelPath: '/assets/weapons/sniper.glb',
        position: { x: 0.04, y: 0, z: -0.28 },
        scale: { x: 1.4, y: 1.4, z: 1.4 },
        rotation: { x: 0.02, y: 0.06, z: 0 },
        handOffset: { x: 0.04, y: 0.05, z: -0.22 },
        muzzleOffset: 1.6, // Very long barrel
        // Similar to AK but slightly heavier feel (lower)
        armPosition: { x: 0.22, y: -0.24, z: -0.35 },
        armRotation: { x: 0.05, y: -0.1, z: 0.02 },
        sound: { freq: 200, type: 'sawtooth', duration: 0.2 },
        maxAmmo: 5,
        visuals: {
            projectileType: 'tracer',
            color: 0xFF0000, // Red
            flashColor: 0xFF0000
        }
    },
    slingshot: {
        id: 'slingshot',
        name: 'Slingshot',
        damage: 5,
        fireRate: 800,
        range: 60,
        modelPath: '/assets/weapons/slingshot.glb',
        position: { x: 0.02, y: -0.02, z: -0.12 },
        scale: { x: 1.2, y: 1.2, z: 1.2 },
        rotation: { x: 0.04, y: 0.1, z: 0 },
        handOffset: { x: 0.02, y: 0.03, z: -0.08 },
        muzzleOffset: 0.5,
        // Slingshot needs to be higher and more centered to see the fork, but simplified arm
        armPosition: { x: 0.25, y: -0.2, z: -0.3 },
        armRotation: { x: 0.1, y: -0.05, z: 0 },
        sound: { freq: 800, type: 'sine', duration: 0.15 },
        maxAmmo: null,
        visuals: {
            projectileType: 'rock',
            color: 0x888888,
            scale: 0.2
        }
    }
};

export const DEFAULT_WEAPON = 'slingshot';

// Helper to get weapon by id
export function getWeapon(id) {
    return WEAPONS[id] || WEAPONS[DEFAULT_WEAPON];
}
