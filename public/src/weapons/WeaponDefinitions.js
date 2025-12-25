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
        // First-person positioning - proper FPS style
        position: { x: 0, y: 0, z: -0.2 },
        scale: { x: 1.2, y: 1.2, z: 1.2 },
        rotation: { x: 0, y: 0, z: 0 },  // No rotation - model faces forward
        // Hand offset - where the weapon sits relative to the hand grip
        handOffset: { x: 0, y: 0, z: -0.15 },
        // Sound properties for procedural audio
        sound: { freq: 600, type: 'square', duration: 0.1 }
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        damage: 20,
        fireRate: 150,      // Full auto
        range: 80,
        modelPath: '/assets/weapons/ak47.glb',
        position: { x: 0, y: 0, z: -0.25 },
        scale: { x: 1.0, y: 1.0, z: 1.0 },
        rotation: { x: 0, y: 0, z: 0 },
        handOffset: { x: 0, y: 0, z: -0.2 },
        sound: { freq: 400, type: 'square', duration: 0.08 }
    },
    sniper: {
        id: 'sniper',
        name: 'Sniper',
        damage: 75,
        fireRate: 1500,     // Slow but powerful
        range: 300,
        modelPath: '/assets/weapons/sniper.glb',
        position: { x: 0, y: 0, z: -0.3 },
        scale: { x: 1.2, y: 1.2, z: 1.2 },
        rotation: { x: 0, y: 0, z: 0 },
        handOffset: { x: 0, y: 0, z: -0.25 },
        sound: { freq: 200, type: 'sawtooth', duration: 0.2 }
    },
    slingshot: {
        id: 'slingshot',
        name: 'Slingshot',
        damage: 25,
        fireRate: 800,
        range: 60,
        modelPath: '/assets/weapons/slingshot.glb',
        position: { x: 0, y: 0, z: -0.15 },
        scale: { x: 1.0, y: 1.0, z: 1.0 },
        rotation: { x: 0, y: 0, z: 0 },
        handOffset: { x: 0, y: 0, z: -0.1 },
        sound: { freq: 800, type: 'sine', duration: 0.15 }
    }
};

export const DEFAULT_WEAPON = 'pistol';

// Helper to get weapon by id
export function getWeapon(id) {
    return WEAPONS[id] || WEAPONS[DEFAULT_WEAPON];
}
