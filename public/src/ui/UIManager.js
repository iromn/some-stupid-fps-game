export class UIManager {
    constructor() {
        this.menuDiv = document.getElementById('main-menu');
        this.nameInput = document.getElementById('player-name');
        this.createLobbyBtn = document.getElementById('create-lobby-btn');
        this.joinLobbyBtn = document.getElementById('join-lobby-btn');
        this.joinModal = document.getElementById('join-modal');
        this.confirmJoinBtn = document.getElementById('confirm-join-btn');
        this.cancelJoinBtn = document.getElementById('cancel-join-btn');
        this.otpInputs = document.querySelectorAll('.otp-input');

        this.blocker = document.getElementById('blocker');
        this.lobbyDisplay = document.getElementById('lobby-display');
        this.healthText = document.getElementById('health-text');
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.hitMarker = document.getElementById('hit-marker');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.volumeSlider = document.getElementById('volume-slider');

        this._initOTPInputs();
    }

    _initOTPInputs() {
        // Auto-focus and auto-advance for OTP inputs
        this.otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;

                // Only allow numbers
                if (!/^\d*$/.test(value)) {
                    e.target.value = '';
                    return;
                }

                // Auto-advance to next input
                if (value && index < this.otpInputs.length - 1) {
                    this.otpInputs[index + 1].focus();
                }
            });

            // Handle backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    this.otpInputs[index - 1].focus();
                }
            });
        });
    }

    onCreateLobby(callback) {
        this.createLobbyBtn.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) {
                alert("Please enter a nickname!");
                return;
            }

            // Generate random 6-digit room code
            const room = Math.floor(100000 + Math.random() * 900000).toString();
            this.createLobbyBtn.innerText = "Creating...";
            callback(name, room);
        });
    }

    onJoinLobby(callback) {
        this.joinLobbyBtn.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            if (!name) {
                alert("Please enter a nickname!");
                return;
            }

            // Show join modal
            this.joinModal.style.display = 'flex';
            this.otpInputs[0].focus();
        });

        this.confirmJoinBtn.addEventListener('click', () => {
            const name = this.nameInput.value.trim();
            const code = Array.from(this.otpInputs).map(input => input.value).join('');

            if (code.length !== 6) {
                alert("Please enter a 6-digit lobby code!");
                return;
            }

            this.joinModal.style.display = 'none';
            this.joinLobbyBtn.innerText = "Joining...";
            callback(name, code);
        });

        this.cancelJoinBtn.addEventListener('click', () => {
            this.joinModal.style.display = 'none';
            // Clear OTP inputs
            this.otpInputs.forEach(input => input.value = '');
        });
    }

    showGameUI(roomCode) {
        this.menuDiv.style.display = 'none';
        this.blocker.style.display = 'flex';
        this.lobbyDisplay.innerText = `Lobby: ${roomCode}`;

        // Show game canvas and UI
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('health-ui').style.display = 'flex';
        document.getElementById('player-list').style.display = 'flex';
        document.getElementById('leaderboard').style.display = 'flex';
        document.getElementById('lobby-display').style.display = 'block';
    }

    resetMenu(msg) {
        if (msg) alert(msg);
        this.createLobbyBtn.innerText = "CREATE LOBBY";
        this.joinLobbyBtn.innerText = "JOIN LOBBY";
        this.menuDiv.style.display = 'flex';
        this.blocker.style.display = 'none';
        this.joinModal.style.display = 'none';
        this.otpInputs.forEach(input => input.value = '');

        // Hide game canvas and UI
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('health-ui').style.display = 'none';
        document.getElementById('player-list').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('lobby-display').style.display = 'none';
    }

    togglePauseMenu(show) {
        this.blocker.style.display = show ? 'flex' : 'none';
    }

    updateHealth(hp) {
        this.healthText.innerText = Math.max(0, hp);
        this.healthBarFill.style.width = `${Math.max(0, hp)}%`;
    }

    // --- Player List Methods ---

    updatePlayerList(players) {
        const list = document.getElementById('player-list-items');
        if (!list) return;
        list.innerHTML = '';

        Object.values(players).forEach(p => {
            this.addPlayerToList(p);
        });
    }

    addPlayerToList(player) {
        const list = document.getElementById('player-list-items');
        if (!list) return;

        // Prevent duplicates
        if (document.getElementById(`player-list-${player.playerId}`)) return;

        const item = document.createElement('div');
        item.className = 'list-item';
        item.id = `player-list-${player.playerId}`;

        // Create color indicator (small block)
        const colorBlock = document.createElement('span');
        colorBlock.style.display = 'inline-block';
        colorBlock.style.width = '12px';
        colorBlock.style.height = '12px';
        colorBlock.style.backgroundColor = '#' + player.color.toString(16).padStart(6, '0');
        colorBlock.style.border = '2px solid #000';
        colorBlock.style.marginRight = '8px';

        const nameSpan = document.createElement('span');
        nameSpan.innerText = player.name;

        // Health text in list
        const healthSpan = document.createElement('span');
        healthSpan.id = `player-list-hp-${player.playerId}`;
        healthSpan.style.fontSize = '12px';
        healthSpan.innerText = `${player.health}%`;

        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.appendChild(colorBlock);
        leftSide.appendChild(nameSpan);

        item.appendChild(leftSide);
        item.appendChild(healthSpan);
        list.appendChild(item);
    }

    removePlayerFromList(id) {
        const item = document.getElementById(`player-list-${id}`);
        if (item) item.remove();
    }

    updatePlayerListHealth(id, health) {
        const hpSpan = document.getElementById(`player-list-hp-${id}`);
        if (hpSpan) hpSpan.innerText = `${health}%`;
    }

    // --- Leaderboard Methods ---

    updateLeaderboard(players) {
        const list = document.getElementById('leaderboard-items');
        if (!list) return;
        list.innerHTML = '';

        // Convert to array and sort by kills (descending)
        const sortedPlayers = Object.values(players).sort((a, b) => (b.kills || 0) - (a.kills || 0));

        sortedPlayers.forEach(p => {
            const item = document.createElement('div');
            item.className = 'list-item';

            const nameSpan = document.createElement('span');
            nameSpan.innerText = p.name;

            const killsSpan = document.createElement('span');
            killsSpan.innerText = p.kills || 0;
            killsSpan.style.fontWeight = '900';

            item.appendChild(nameSpan);
            item.appendChild(killsSpan);
            list.appendChild(item);
        });
    }

    showHitMarker() {
        this.hitMarker.style.display = 'block';
        setTimeout(() => this.hitMarker.style.display = 'none', 100);
    }

    flashDamage() {
        this.damageOverlay.style.opacity = '0.3';
        setTimeout(() => this.damageOverlay.style.opacity = '0', 100);
    }

    // --- Phase 8: Waiting Room ---

    _initWaitingRoom() {
        this.waitingRoomDiv = document.getElementById('waiting-room');
        this.lobbyTitleText = document.getElementById('lobby-title-text');
        this.playerSlotsDiv = document.getElementById('player-slots');
        this.startGameBtn = document.getElementById('start-game-btn');
        this.leaveLobbyBtn = document.getElementById('leave-lobby-btn');
        this.countdownOverlay = document.getElementById('countdown-overlay');
        this.countdownText = document.getElementById('countdown-text');
        this.playerCountText = document.getElementById('player-count-text');
    }

    showWaitingRoom(roomCode, players, hostId, mySocketId) {
        this._initWaitingRoom();

        this.menuDiv.style.display = 'none';
        this.joinModal.style.display = 'none';
        this.waitingRoomDiv.style.display = 'flex';
        this.lobbyTitleText.innerText = `LOBBY: ${roomCode}`;

        // Store for later use
        this.currentHostId = hostId;
        this.mySocketId = mySocketId;

        // Show Canvas behind (optional, or hide it)
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.display = 'block';

        this.updateWaitingRoom(players, hostId);
    }

    updateWaitingRoom(players, hostId) {
        if (!this.playerSlotsDiv) this._initWaitingRoom();

        // Update host if provided
        if (hostId !== undefined) {
            this.currentHostId = hostId;
        }

        this.playerSlotsDiv.innerHTML = '';
        const playerList = Object.values(players);

        // Render 6 Slots
        for (let i = 0; i < 6; i++) {
            const p = playerList[i];
            const slot = document.createElement('div');
            // Voxel Style Slot
            slot.style.border = '4px solid #000';
            slot.style.padding = '15px';
            slot.style.textAlign = 'center';
            slot.style.fontWeight = 'bold';
            slot.style.minHeight = '60px';
            slot.style.display = 'flex';
            slot.style.flexDirection = 'column';
            slot.style.justifyContent = 'center';
            slot.style.alignItems = 'center';
            slot.style.fontFamily = "'Courier New', monospace"; // Ensure font

            if (p) {
                slot.style.background = '#FFF';
                slot.style.boxShadow = '5px 5px 0 rgba(0,0,0,0.2)';

                // Color Box
                const colorBox = document.createElement('div');
                colorBox.style.width = '20px';
                colorBox.style.height = '20px';
                colorBox.style.backgroundColor = '#' + p.color.toString(16).padStart(6, '0');
                colorBox.style.border = '2px solid #000';
                colorBox.style.marginBottom = '5px';

                const nameDiv = document.createElement('div');
                nameDiv.innerText = p.name;
                nameDiv.style.fontSize = '18px';

                // Mark host with a star
                if (p.playerId === this.currentHostId) {
                    nameDiv.innerText = '⭐ ' + p.name;
                }

                slot.appendChild(colorBox);
                slot.appendChild(nameDiv);
            } else {
                slot.style.background = '#E0E0E0';
                slot.style.color = '#888';
                slot.style.border = '4px dashed #999';
                slot.innerText = "EMPTY";
            }

            this.playerSlotsDiv.appendChild(slot);
        }

        this.playerCountText.innerText = `${playerList.length}/6 PLAYERS READY`;

        // Update START button visibility based on host status
        if (this.mySocketId && this.currentHostId) {
            if (this.mySocketId === this.currentHostId) {
                this.startGameBtn.disabled = false;
                this.startGameBtn.style.opacity = '1';
                this.startGameBtn.style.cursor = 'pointer';
            } else {
                this.startGameBtn.disabled = true;
                this.startGameBtn.style.opacity = '0.5';
                this.startGameBtn.style.cursor = 'not-allowed';
                this.startGameBtn.innerText = 'WAITING FOR HOST...';
            }
        }
    }

    showCountdown(startTime) {
        if (!this.countdownOverlay) this._initWaitingRoom();

        this.waitingRoomDiv.style.display = 'none'; // Hide Lobby UI
        this.countdownOverlay.style.display = 'flex';

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = startTime - now;

            if (diff <= 0) {
                clearInterval(interval);
                this.countdownText.innerText = "GO!";
                // Note: Game.js handles unlocking
                setTimeout(() => {
                    this.countdownOverlay.style.display = 'none';
                }, 1000);
            } else {
                const sec = Math.ceil(diff / 1000);
                this.countdownText.innerText = sec;
            }
        }, 50);
    }

    onStartGame(callback) {
        if (!this.startGameBtn) this._initWaitingRoom();
        this.startGameBtn.addEventListener('click', callback);
    }

    onLeaveLobby(callback) {
        if (!this.leaveLobbyBtn) this._initWaitingRoom();
        this.leaveLobbyBtn.addEventListener('click', callback);
    }
}
