import * as THREE from 'three';

export function createPixelTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    function noise(amount) {
        for (let i = 0; i < 64; i += 4) {
            for (let j = 0; j < 64; j += 4) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = `rgba(0,0,0,${Math.random() * amount})`;
                    ctx.fillRect(i, j, 4, 4);
                } else {
                    ctx.fillStyle = `rgba(255,255,255,${Math.random() * amount})`;
                    ctx.fillRect(i, j, 4, 4);
                }
            }
        }
    }

    if (type === 'grass') {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.1);
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.05);
        for (let k = 0; k < 20; k++) {
            const x = Math.floor(Math.random() * 16) * 4;
            const y = Math.floor(Math.random() * 16) * 4;
            ctx.fillStyle = '#2e7d32';
            ctx.fillRect(x, y, 4, 4);
        }
    } else if (type === 'stone') {
        ctx.fillStyle = '#757575';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.15);
        ctx.strokeStyle = '#616161';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let y = 0; y < 64; y += 16) {
            ctx.moveTo(0, y); ctx.lineTo(64, y);
            for (let x = (y % 32 === 0 ? 0 : 8); x < 64; x += 16) {
                ctx.moveTo(x, y); ctx.lineTo(x, y + 16);
            }
        }
        ctx.stroke();
    } else if (type === 'dirt') {
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.2);
    } else if (type === 'metal') {
        ctx.fillStyle = '#b0bec5';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.05);
        ctx.strokeStyle = '#78909c';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 60, 60);
        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.lineTo(62, 62);
        ctx.stroke();
    } else if (type === 'hazard') {
        ctx.fillStyle = '#fdd835';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#212121';
        for (let i = -64; i < 64; i += 16) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + 8, 0);
            ctx.lineTo(i + 72, 64);
            ctx.lineTo(i + 64, 64);
            ctx.fill();
        }
        noise(0.1);
    } else if (type === 'slime') {
        ctx.fillStyle = '#76ff03';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let k = 0; k < 5; k++) {
            const x = Math.random() * 60;
            const y = Math.random() * 60;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (type === 'ice') {
        ctx.fillStyle = '#81d4fa';
        ctx.fillRect(0, 0, 64, 64);
        noise(0.05);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
            const x = Math.random() * 64;
            const y = Math.random() * 64;
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.random() * 10 - 5, y + Math.random() * 10 - 5);
        }
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export const grassTex = createPixelTexture('grass');
export const stoneTex = createPixelTexture('stone');
export const dirtTex = createPixelTexture('dirt');
export const metalTex = createPixelTexture('metal');
export const hazardTex = createPixelTexture('hazard');
export const slimeTex = createPixelTexture('slime');
export const iceTex = createPixelTexture('ice');
