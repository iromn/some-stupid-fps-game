import * as THREE from 'three';
import { updateNameTag, createNameSprite } from '../ui/NameTag.js';

export function createRobotCharacter(color) {
    const group = new THREE.Group();

    const skinColor = 0xffccaa;

    const darker = (hex) => {
        const r = Math.floor(((hex >> 16) & 255) * 0.5);
        const g = Math.floor(((hex >> 8) & 255) * 0.5);
        const b = Math.floor((hex & 255) * 0.5);
        return (r << 16) | (g << 8) | b;
    };
    const pantsColor = darker(color);

    const shirtMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), shirtMat);
    torso.position.y = 1.125;
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.userData.origColor = color;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.y = 1.75;
    head.castShadow = true;
    head.userData.origColor = skinColor;
    group.add(head);

    function createLimb(x, y, z, w, h, d, material, name, col) {
        const limbGroup = new THREE.Group();
        limbGroup.position.set(x, y, z);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.y = -h / 2; // Pivot at top
        mesh.castShadow = true;
        mesh.userData.origColor = col;
        limbGroup.add(mesh);
        limbGroup.name = name;
        return limbGroup;
    }

    const leftArm = createLimb(-0.375, 1.5, 0, 0.25, 0.75, 0.25, shirtMat, 'leftArm', color);
    const rightArm = createLimb(0.375, 1.5, 0, 0.25, 0.75, 0.25, shirtMat, 'rightArm', color);

    // Add weapon attachment point to right arm (for third-person weapon display)
    const weaponAttach = new THREE.Group();
    weaponAttach.name = 'weaponAttach';
    weaponAttach.position.set(0, -0.5, 0.15);  // At hand level, in front
    rightArm.add(weaponAttach);
    rightArm.userData.weaponAttach = weaponAttach;

    group.add(leftArm);
    group.add(rightArm);

    const leftLeg = createLimb(-0.125, 0.75, 0, 0.25, 0.75, 0.25, pantsMat, 'leftLeg', pantsColor);
    const rightLeg = createLimb(0.125, 0.75, 0, 0.25, 0.75, 0.25, pantsMat, 'rightLeg', pantsColor);
    group.add(leftLeg);
    group.add(rightLeg);

    group.userData.limbs = { leftLeg, rightLeg, leftArm, rightArm };
    return group;
}

export function createPlayerMesh(id, x, y, z, color, name) {
    const mesh = createRobotCharacter(color || 0x00ff00);
    mesh.position.set(x, 0, z);

    mesh.userData.originalColor = color;

    // Name Tag
    const sprite = createNameSprite(name || "Player");
    sprite.position.y = 3.0;
    mesh.add(sprite);

    return mesh;
}
