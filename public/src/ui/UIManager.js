export class UIManager {
    constructor() {
        this.menuDiv = document.getElementById('main-menu');
        this.nameInput = document.getElementById('player-name');
        this.roomInput = document.getElementById('room-code');
        this.playBtn = document.getElementById('play-btn');
        this.blocker = document.getElementById('blocker');
        this.lobbyDisplay = document.getElementById('lobby-display');
        this.healthText = document.getElementById('health-text');
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.hitMarker = document.getElementById('hit-marker');
        this.damageOverlay = document.getElementById('damage-overlay');

        // Volume Slider
        // We initialize it here but logic might be connected to Audio elsewhere
        // For now, we just expose the element
        this.volumeSlider = document.getElementById('volume-slider');
    }

    _createHitMarker() {
        // Since index.html has it, this might be redundant if we enforce index.html changes.
        // But the original code created these dynamically in JS sometimes. 
        // Let's assume index.html has them as per the read file, 
        // BUT the read file showed they were created in JS in the original game.js? 
        // Wait, reading game.js (Step 58):
        // "const hitMarker = document.createElement('div'); ... document.body.appendChild(hitMarker);"
        // So they ARE created in JS. I must recreate that logic here.

        const div = document.createElement('div');
        div.id = 'hit-marker';
        Object.assign(div.style, {
            position: 'absolute', top: '50%', left: '50%',
            width: '40px', height: '40px',
            border: '2px solid transparent',
            transform: 'translate(-50%, -50%) rotate(45deg)',
            pointerEvents: 'none',
            zIndex: '15',
            display: 'none'
        });
        div.innerHTML = `
        <div style="position:absolute; top:50%; left:0; width:100%; height:4px; background:red; transform:translateY(-50%);"></div>
        <div style="position:absolute; left:50%; top:0; width:4px; height:100%; background:red; transform:translateX(-50%);"></div>
        `;
        document.body.appendChild(div);
        return div;
    }

    _createDamageOverlay() {
        const div = document.createElement('div');
        div.id = 'damage-overlay';
        Object.assign(div.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'red',
            opacity: '0',
            pointerEvents: 'none',
            zIndex: '10',
            transition: 'opacity 0.1s'
        });
        document.body.appendChild(div);
        return div;
    }

    onPlay(callback) {
        this.playBtn.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) { alert("Please enter a name!"); return; }
            let room = this.roomInput.value.trim();
            if (!room) room = Math.floor(100000 + Math.random() * 900000).toString();

            this.playBtn.innerText = "Joining...";
            callback(name, room);
        });
    }

    showGameUI(roomCode) {
        this.menuDiv.style.display = 'none';
        this.blocker.style.display = 'flex';
        this.lobbyDisplay.innerText = `Lobby: ${roomCode}`;
    }

    resetMenu(msg) {
        if (msg) alert(msg);
        this.playBtn.innerText = "JOIN GAME";
        this.menuDiv.style.display = 'flex';
        this.blocker.style.display = 'none';
    }

    togglePauseMenu(show) {
        this.blocker.style.display = show ? 'flex' : 'none';
    }

    updateHealth(hp) {
        this.healthText.innerText = Math.max(0, hp);
        this.healthBarFill.style.width = `${Math.max(0, hp)}%`;
    }

    showHitMarker() {
        this.hitMarker.style.display = 'block';
        setTimeout(() => this.hitMarker.style.display = 'none', 100);
    }

    flashDamage() {
        this.damageOverlay.style.opacity = '0.3';
        setTimeout(() => this.damageOverlay.style.opacity = '0', 100);
    }
}
