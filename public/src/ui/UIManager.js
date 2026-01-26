export class UIManager {
    constructor() {
        this.menuDiv = document.getElementById('main-menu');
        this.nameInput = document.getElementById('player-name');
        this.createLobbyBtn = document.getElementById('create-lobby-btn');
        this.joinLobbyBtn = document.getElementById('join-lobby-btn');
        this.joinModal = document.getElementById('join-modal');
        this.confirmJoinBtn = document.getElementById('confirm-join-btn');
        this.cancelJoinBtn = document.getElementById('cancel-join-btn');
        this.cancelJoinBtn = document.getElementById('cancel-join-btn');
        this.otpInputs = document.querySelectorAll('.otp-input');

        this.blocker = document.getElementById('blocker');
        this.crosshair = document.getElementById('crosshair');
        this.healthText = document.getElementById('health-text');
        this.healthBarFill = document.getElementById('health-bar-fill');
        this.hitMarker = document.getElementById('hit-marker');
        this.damageOverlay = document.getElementById('damage-overlay');
        this.volumeSlider = document.getElementById('volume-slider');

        // New pause menu elements
        this.sensitivitySlider = document.getElementById('sensitivity-slider');
        this.sensitivityValueDisplay = document.getElementById('sensitivity-value');
        this.pauseCloseBtn = document.getElementById('pause-close-btn');
        this.resumeGameBtn = document.getElementById('resume-game-btn');
        this.leaveGameBtn = document.getElementById('leave-game-btn');
        this.pickupPrompt = document.getElementById('pickup-prompt');
        this.pickupText = document.getElementById('pickup-text');
        this.ammoUI = document.getElementById('ammo-ui');
        this.ammoCount = document.getElementById('ammo-count');
        this.scopeOverlay = document.getElementById('scope-overlay');

        // Sensitivity value (default 1.0)
        this.sensitivity = 1.0;

        this._initOTPInputs();
        this._initPauseMenuEvents();
    }

    _initPauseMenuEvents() {
        // Sensitivity slider
        if (this.sensitivitySlider) {
            this.sensitivitySlider.addEventListener('input', (e) => {
                this.sensitivity = parseFloat(e.target.value);
                // Update the value display
                if (this.sensitivityValueDisplay) {
                    this.sensitivityValueDisplay.textContent = this.sensitivity.toFixed(1);
                }
                if (this.onSensitivityChange) {
                    this.onSensitivityChange(this.sensitivity);
                }
            });
        }

        // Close button (X)
        if (this.pauseCloseBtn) {
            this.pauseCloseBtn.addEventListener('click', () => {
                if (this.onResumeGame) this.onResumeGame();
            });
        }

        // Resume button
        if (this.resumeGameBtn) {
            this.resumeGameBtn.addEventListener('click', () => {
                if (this.onResumeGame) this.onResumeGame();
            });
        }

        // Leave lobby button
        if (this.leaveGameBtn) {
            this.leaveGameBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }

    // Set callback for resume game
    onResume(callback) {
        this.onResumeGame = callback;
    }

    // Set callback for sensitivity change
    onSensitivity(callback) {
        this.onSensitivityChange = callback;
    }

    // Get current sensitivity value
    getSensitivity() {
        return this.sensitivity;
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
        this.blocker.style.display = 'none'; // Fix: Hide Pause Menu/Blocker by default

        // Show game canvas and UI
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('health-ui').style.display = 'flex';
        document.getElementById('player-list').style.display = 'flex';
        document.getElementById('leaderboard').style.display = 'flex';

        // Show Timer
        this.toggleGameTimer(true);

        if (this.ammoUI) this.ammoUI.style.display = 'none'; // Default to hidden until weapon update
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

        if (this.ammoUI) this.ammoUI.style.display = 'none';
    }

    togglePauseMenu(show) {
        this.blocker.style.display = show ? 'flex' : 'none';
        // Hide crosshair when pause menu is visible
        if (this.crosshair) {
            this.crosshair.style.display = show ? 'none' : 'block';
        }
    }

    // Show the "Click to Play" overlay after countdown
    showClickToStart(onClickCallback) {
        const overlay = document.getElementById('click-to-start');
        if (overlay) {
            overlay.style.display = 'flex';

            // Store the callback and add click handler
            const handleClick = () => {
                overlay.removeEventListener('click', handleClick);
                if (onClickCallback) onClickCallback();
            };
            overlay.addEventListener('click', handleClick);
        }
    }

    // Hide the "Click to Play" overlay
    hideClickToStart() {
        const overlay = document.getElementById('click-to-start');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    updateHealth(hp) {
        this.healthText.innerText = Math.max(0, hp);
        this.healthBarFill.style.width = `${Math.max(0, hp)}%`;
    }

    updateAmmo(current, max) {
        if (!this.ammoUI) return;

        if (max === null || max === undefined) {
            // Infinite ammo
            this.ammoUI.style.display = 'flex';
            this.ammoCount.innerText = '∞';
            this.ammoCount.style.color = '#FFF';
        } else {
            this.ammoUI.style.display = 'flex';
            this.ammoCount.innerText = current;

            // Visual feedback for low ammo
            if (current <= 5) {
                this.ammoCount.style.color = '#FF0000';
            } else {
                this.ammoCount.style.color = '#FFF';
            }
        }
    }

    toggleScope(show) {
        if (!this.scopeOverlay) return;
        this.scopeOverlay.style.display = show ? 'block' : 'none';

        // Hide crosshair if scoped
        if (this.crosshair) {
            this.crosshair.style.display = show ? 'none' : 'block';
        }
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

        // Health text removed as per user request

        const leftSide = document.createElement('div');
        leftSide.style.display = 'flex';
        leftSide.style.alignItems = 'center';
        leftSide.appendChild(colorBlock);
        leftSide.appendChild(nameSpan);

        item.appendChild(leftSide);
        // item.appendChild(healthSpan); // Removed
        list.appendChild(item);
    }

    removePlayerFromList(id) {
        const item = document.getElementById(`player-list-${id}`);
        if (item) item.remove();
    }

    updatePlayerListHealth(id, health) {
        // Disabled
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

    showKillFeed(killerName, victimName, isSelfInvolved) {
        const feedContainer = document.getElementById('kill-feed');
        if (!feedContainer) return;

        const el = document.createElement('div');
        el.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            color: #FFF;
            padding: 5px 10px;
            border-left: 4px solid ${isSelfInvolved ? '#FFD700' : '#FFF'};
            animation: fadeIn 0.2s;
            font-size: 14px;
        `;

        // Highlight logic
        const killerHtml = `<span style="color: ${isSelfInvolved && killerName === 'YOU' ? '#00FF00' : '#FF4444'}">${killerName}</span>`;
        const victimHtml = `<span style="color: ${isSelfInvolved && victimName === 'YOU' ? '#FF0000' : '#FFFFFF'}">${victimName}</span>`;

        el.innerHTML = `${killerHtml} <span style="font-size:12px; color:#CCC;">🔫</span> ${victimHtml}`;

        feedContainer.appendChild(el);

        // Remove after 4 seconds
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s';
            setTimeout(() => el.remove(), 500);
        }, 4000);
    }

    // --- Weapon Pickup Notification ---

    showWeaponPickup(weaponType) {
        // Create temporary notification for weapon pickup
        const notification = document.createElement('div');
        notification.className = 'weapon-pickup-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 150px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 15px 30px;
            font-family: 'Courier New', monospace;
            font-size: 24px;
            font-weight: bold;
            border: 3px solid #00ff00;
            z-index: 1000;
            text-transform: uppercase;
            animation: weaponPickupFade 2s ease-out forwards;
        `;
        notification.textContent = `+ ${weaponType.toUpperCase()}`;

        // Add animation keyframes if not already present
        if (!document.getElementById('weapon-pickup-styles')) {
            const style = document.createElement('style');
            style.id = 'weapon-pickup-styles';
            style.textContent = `
                @keyframes weaponPickupFade {
                    0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    70% { opacity: 1; }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => notification.remove(), 2000);
    }

    // --- Pickup Prompt ---

    togglePickupPrompt(show, weaponName = 'WEAPON') {
        if (!this.pickupPrompt) return;
        this.pickupPrompt.style.display = show ? 'flex' : 'none';
        if (show && this.pickupText) {
            this.pickupText.innerText = `PICK UP ${weaponName.toUpperCase()}`;
        }
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

    showCountdown(startTime, onComplete) {
        if (!this.countdownOverlay) this._initWaitingRoom();

        this.waitingRoomDiv.style.display = 'none'; // Hide Lobby UI
        this.countdownOverlay.style.display = 'flex';

        const interval = setInterval(() => {
            const now = Date.now();
            const diff = startTime - now;

            if (diff <= 0) {
                clearInterval(interval);
                this.countdownText.innerText = "GO!";

                // Try to auto-lock controls (may fail due to browser security)
                if (onComplete) {
                    onComplete();
                }

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

    // --- Win Condition UI ---

    updateGameTimer(timeLeft) {
        const timerDiv = document.getElementById('game-timer');
        if (!timerDiv) return;

        if (timeLeft < 0) timeLeft = 0;
        const totalSeconds = Math.ceil(timeLeft / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerDiv.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (totalSeconds <= 10) {
            timerDiv.style.color = '#FF0000';
            timerDiv.style.textShadow = '0 0 10px #FF0000';
        } else {
            timerDiv.style.color = '#FFF';
            timerDiv.style.textShadow = '3px 3px 0 #000';
        }
    }

    toggleGameTimer(show) {
        const timerDiv = document.getElementById('game-timer');
        if (timerDiv) timerDiv.style.display = show ? 'block' : 'none';
    }

    showVictoryScreen(winner, leaderboard) {
        console.log("UIManager: Showing Victory Screen", winner);
        const screen = document.getElementById('victory-screen');
        const winnerDisplay = document.getElementById('winner-display');

        const winnerName = winner ? winner.name : "NO ONE";
        const winnerKills = winner ? winner.kills : 0;

        winnerDisplay.innerText = `WINNER:\n${winnerName}\n(${winnerKills} KILLS)`;
        winnerDisplay.style.whiteSpace = 'pre-wrap';
        winnerDisplay.style.textAlign = 'center';

        // Force hide everything else
        // Force hide everything else
        if (this.menuDiv) this.menuDiv.style.display = 'none';
        if (this.blocker) this.blocker.style.display = 'none';

        if (!this.waitingRoomDiv) this.waitingRoomDiv = document.getElementById('waiting-room');
        if (this.waitingRoomDiv) this.waitingRoomDiv.style.display = 'none';

        const gameUI = document.getElementById('game-ui');
        if (gameUI) gameUI.style.display = 'none';

        screen.style.display = 'flex';

        document.getElementById('health-ui').style.display = 'none';
        document.getElementById('ammo-ui').style.display = 'none';
        document.getElementById('player-list').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
        this.toggleGameTimer(false);
        this.toggleScope(false);
    }

    hideVictoryScreen() {
        document.getElementById('victory-screen').style.display = 'none';
        document.getElementById('blocker').style.display = 'none';
    }

    onContinue(callback) {
        const btn = document.getElementById('victory-continue-btn');
        if (btn) {
            // Remove old listener if any? Not easy without abort controller.
            // But Game.js usually is singleton?
            // Actually Game.js creates new UIManager? No, `this.ui = new UIManager`.
            // If Game reloads, it's fine.
            btn.onclick = callback; // safer than addEventListener for single callback
        }
    }

    onExitGame(callback) {
        const btn = document.getElementById('victory-exit-btn');
        if (btn) btn.onclick = callback;
    }
}
