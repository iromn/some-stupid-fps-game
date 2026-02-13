import * as THREE from 'three';

export function createNameSprite(text, health = 100) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;

    ctx.textAlign = 'center';

    ctx.font = 'bold 80px "Comic Sans MS", "Arial", sans-serif';

    ctx.shadowColor = 'black';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 15;
    ctx.strokeStyle = 'black';
    ctx.strokeText(text, 512, 100);

    ctx.fillStyle = '#BBBBBB'; // Dimmer white for text (Anti-Bloom)
    ctx.fillText(text, 512, 100);

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    const barW = 400;
    const barH = 40;
    const barX = (1024 - barW) / 2;
    const barY = 140;
    const radius = 20;

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    ctx.fillStyle = '#888888'; // Dimmer border
    roundRect(barX - 6, barY - 6, barW + 12, barH + 12, radius + 2);
    ctx.fill();

    ctx.fillStyle = '#222';
    roundRect(barX, barY, barW, barH, radius);
    ctx.fill();

    const healhPct = Math.max(0, health) / 100;

    // Use dimmer colors for health to avoid extreme bloom
    const col = healhPct > 0.5 ? '#00BB77' : (healhPct > 0.2 ? '#CCAA00' : '#CC3300');

    ctx.fillStyle = col;
    ctx.save();
    roundRect(barX, barY, barW, barH, radius);
    ctx.clip();
    ctx.fillRect(barX, barY, barW * healhPct, barH);
    ctx.restore();

    ctx.font = '60px Arial';
    ctx.fillStyle = '#BB2222';
    ctx.strokeStyle = '#AAAAAA';
    ctx.lineWidth = 4;
    ctx.strokeText('❤', barX - 50, barY + 40);
    ctx.fillText('❤', barX - 50, barY + 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(2.5, 0.625, 1);

    sprite.userData.isNameTag = true;

    return sprite;
}

export function updateNameTag(mesh, name, health) {
    const sprite = mesh.children.find(c => c.userData.isNameTag);
    if (sprite) {
        mesh.remove(sprite);
        sprite.material.map.dispose();
        sprite.material.dispose();
    }
    const newSprite = createNameSprite(name, health);
    newSprite.position.y = 3.0;
    mesh.add(newSprite);
}
