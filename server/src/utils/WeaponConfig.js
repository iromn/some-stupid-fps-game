// Weapon configuration for server-side validation and damage calculation

const WEAPONS = {
    pistol: {
        id: 'pistol',
        name: 'Pistol',
        damage: 10,
        fireRate: 400,      // ms between shots
        range: 100,         // max effective range
        maxAmmo: 30
    },
    ak47: {
        id: 'ak47',
        name: 'AK-47',
        damage: 20,
        fireRate: 150,      // Full auto
        range: 80,
        maxAmmo: 20
    },
    sniper: {
        id: 'sniper',
        name: 'Sniper',
        damage: 100,
        fireRate: 1500,     // Slow but powerful
        range: 300,         // Long range
        maxAmmo: 5
    },
    slingshot: {
        id: 'slingshot',
        name: 'Slingshot',
        damage: 5,
        fireRate: 800,
        range: 60,          // Short range
        maxAmmo: null       // Infinite
    }
};

const DEFAULT_WEAPON = 'slingshot';

const PICKUP_RESPAWN_TIME = 45000;  // 45 seconds

// Pickup spawn locations across the map
const PICKUP_LOCATIONS = [
    // Tier 1 (Ground Level Y=1.5)
    { x: 50, y: 1.5, z: 0, weaponType: 'ak47' },
    { x: -50, y: 1.5, z: 0, weaponType: 'pistol' },
    { x: 0, y: 1.5, z: 50, weaponType: 'ak47' },
    { x: 0, y: 1.5, z: -50, weaponType: 'pistol' },
    // Tier 2 (Ice Ring Y=26)
    { x: 80, y: 26.5, z: 0, weaponType: 'sniper' },
    { x: -80, y: 26.5, z: 0, weaponType: 'sniper' },
    // Tier 3 (Elevated Platforms Y=47)
    { x: 0, y: 47, z: -140, weaponType: 'sniper' },
    { x: 0, y: 47, z: 140, weaponType: 'sniper' },
    // Center area
    { x: 0, y: 3, z: 0, weaponType: 'ak47' }
];

module.exports = {
    WEAPONS,
    DEFAULT_WEAPON,
    PICKUP_RESPAWN_TIME,
    PICKUP_LOCATIONS
};
