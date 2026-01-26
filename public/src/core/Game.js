import * as THREE from 'three';
import { Renderer } from '../graphics/Renderer.js';
import { Input } from './Input.js';
import { Audio } from './Audio.js';
import { Network } from '../network/Network.js';
import { UIManager } from '../ui/UIManager.js';
import { Level } from '../world/Level.js';
import { Physics } from '../world/Physics.js';
import { Player } from '../entities/Player.js';
import { EntityManager } from '../entities/EntityManager.js';
import { Effects } from '../graphics/Effects.js';
import { PickupManager } from '../weapons/PickupManager.js';
import { WEAPONS } from '../weapons/WeaponDefinitions.js';

export class Game {
    constructor() {
        this.renderer = new Renderer();
        this.input = new Input();
        this.audio = new Audio();

        // Preload custom weapon sounds
        Object.values(WEAPONS).forEach(w => {
            if (w.soundPath) {
                this.audio.loadSound(w.id, w.soundPath);
            }
        });

        this.network = new Network();
        this.ui = new UIManager();

        this.level = new Level(this.renderer.scene);
        this.physics = new Physics(this.level);
        this.effects = new Effects(this.renderer.scene);

        this.entityManager = new EntityManager(this.renderer.scene);
        this.pickupManager = new PickupManager(this.renderer.scene, this.network);

        this.player = new Player(
            this.renderer.camera,
            this.renderer.renderer.domElement,
            this.renderer.scene,
            this.physics,
            this.input,
            this.network,
            this.audio,
            this.ui
        );

        // Bind Player Shoot to Effects (includes weapon type)
        this.player.onShootRequest = (raycaster, weaponPos, dir, weaponType) => this._handleShoot(raycaster, weaponPos, dir, weaponType);

        this._initNetworkEvents();
        this._initUIEvents();

        this.lastTime = performance.now();
        this.animate();
    }

    _initUIEvents() {
        this.ui.onCreateLobby((name, room) => {
            this.network.emit('joinGame', { roomCode: room, name: name });
        });

        this.ui.onJoinLobby((name, room) => {
            this.network.emit('joinGame', { roomCode: room, name: name });
        });

        // Phase 8: Waiting Room Events
        this.ui.onStartGame(() => {
            this.network.emit('startGame');
        });
        this.ui.onLeaveLobby(() => {
            location.reload(); // Simple leave
        });

        this.ui.onContinue(() => {
            this.gameActive = false;
            // Fix: Player doesn't have unlockControls
            if (this.player.controls) this.player.controls.unlock();

            this.ui.hideVictoryScreen();
            this.ui.showWaitingRoom(this.network.roomCode, this.allPlayers, this.currentHostId, this.network.socket.id);
        });

        this.ui.onExitGame(() => {
            location.reload();
        });
    }

    _initNetworkEvents() {
        this.network.on('connect', () => {
            console.log('Connected to server');
        });

        this.network.on('disconnect', () => {
            console.log('Disconnected');
        });

        this.network.on('gameError', (msg) => {
            alert(msg);
            this.ui.resetMenu();
        });

        this.network.on('gameJoined', (data) => {
            this.network.roomCode = data.roomCode; // Store for later (Continue button)
            this.player.setJoined(true);
            this.player.setPosition(data.x || 0, 2, data.z || 0);

            // Phase 8: Show Waiting Room instead of Game UI immediately
            this.currentHostId = data.hostId; // Store for later
            this.ui.showWaitingRoom(data.roomCode, {}, data.hostId, this.network.socket.id);

            // Initialize local player state for UI lists
            this.allPlayers = {};
            this.gameActive = false; // Lock controls
        });

        // Phase 8: Room Update
        this.network.on('roomUpdate', (data) => {
            if (data.hostId) this.currentHostId = data.hostId; // Update if host changed
            this.ui.updateWaitingRoom(data.players, data.hostId);
        });

        // Phase 8: Countdown
        this.network.on('countdownStart', (data) => {
            this.ui.showCountdown(data.startTime, () => {
                // Auto-lock controls when countdown ends so game starts immediately
                this.player.lockControls();
            });
        });

        // Phase 8: Game Start
        this.network.on('gameStart', (data) => {
            this.gameActive = true;
            this.gameEndTime = Date.now() + data.duration;

            // Sync Local Player Position
            if (data.players && data.players[this.network.socket.id]) {
                const p = data.players[this.network.socket.id];
                this.player.setPosition(p.x, p.y, p.z);
                // Also reset rotation if you want
            }

            this.ui.showGameUI(this.network.roomCode || "----");
        });

        this.network.on('gameFinished', (data) => {
            console.log("Game Ended!", data);

            this.gameActive = false;

            if (this.player.controls) {
                this.player.controls.unlock();
            }

            try {
                this.ui.showVictoryScreen(data.winner, data.leaderboard);
            } catch (e) {
                console.error("Victory Screen Error:", e);
            }
        });


        this.network.on('currentPlayers', (players) => {
            this.allPlayers = players; // Store for UI

            Object.values(players).forEach(p => {
                if (p.playerId !== this.network.socket.id) {
                    this.entityManager.addPlayer(p); // Add to game world
                }
            });

            // Update UI Lists
            this.ui.updatePlayerList(this.allPlayers);
            this.ui.updateLeaderboard(this.allPlayers);

            // Phase 8: Also update Waiting Room if we are in it (pass stored hostId)
            this.ui.updateWaitingRoom(this.allPlayers, this.currentHostId);
        });

        this.network.on('newPlayer', (p) => {
            this.allPlayers[p.playerId] = p; // Update local state
            this.entityManager.addPlayer(p);

            // Update UI
            this.ui.addPlayerToList(p);
            this.ui.updateLeaderboard(this.allPlayers);
            this.ui.updateWaitingRoom(this.allPlayers);
        });

        this.network.on('playerMoved', (p) => {
            this.entityManager.updatePlayer(p);
            if (this.allPlayers && this.allPlayers[p.playerId]) {
                // Update local state pos/rot/health if needed
                this.allPlayers[p.playerId].x = p.x;
                this.allPlayers[p.playerId].y = p.y;
                this.allPlayers[p.playerId].z = p.z;
                this.allPlayers[p.playerId].rotation = p.rotation;
            }
        });

        this.network.on('userDisconnected', (id) => {
            if (this.allPlayers) delete this.allPlayers[id];
            this.entityManager.removePlayer(id);

            // Update UI
            this.ui.removePlayerFromList(id);
            this.ui.updateLeaderboard(this.allPlayers || {});
        });

        this.network.on('playerHit', (data) => {
            // data: { id, health, attackerId }
            const target = this.entityManager.getPlayer(data.id);
            if (target) {
                import('../ui/NameTag.js').then(m => m.updateNameTag(target.mesh, target.mesh.userData.playerName, data.health));
            } else if (data.id === this.network.id) {
                // Self hit
                this.ui.updateHealth(data.health);
                this.ui.flashDamage();
                this.audio.playHit(); // Play hit sound for self being hit? Or distinct one?
                // Original logic: "playHit" was for hit marker sound maybe?
                // Original: socket.on('playerHit') -> if (id === socket.id) updateHealthUI
                // Wait, original game.js doesn't show playing sound when self is hit in 'playerHit' event?
                // It plays 'playHit' when SHOOTING (successful hit)?
                // Let's re-read game.js.
                // game.js Step 58 (near end):
                // socket.on('playerHit', ...
                // It doesn't seem to play sound there in the view I had.
                // But in `shoot` logic (Step 71-73?), it calls `sfx.playShoot()`.
                // Hit marker logic is client side confirmation?
                // Wait, I missed the response handling for shoot. 
                // Original game.js used client side hit detection for marker?
                // "if (pid) ... socket.emit('shoot' ... showHitMarker()"
                // The 'playerHit' event updates health.

                // So here:
                if (data.attackerId && data.attackerId !== this.network.id) {
                    this.audio.playHit(); // Being hit sound
                }
            } else if (data.attackerId === this.network.id) {
                // I hit someone
                this.audio.playHitMarker();
                this.ui.showHitMarker();
            }
        });

        this.network.on('playerKilled', (data) => {
            // data: { victimId, killerId, killerKills }

            // Update local kill count for leaderboard
            if (this.allPlayers && this.allPlayers[data.killerId]) {
                this.allPlayers[data.killerId].kills = data.killerKills;
                this.ui.updateLeaderboard(this.allPlayers);

                // Show Kill Feed
                const killerName = data.killerId === this.network.id ? 'YOU' : (this.allPlayers[data.killerId]?.name || 'Unknown');
                const victimName = data.victimId === this.network.id ? 'YOU' : (this.allPlayers[data.victimId]?.name || 'Unknown');
                this.ui.showKillFeed(killerName, victimName, (data.killerId === this.network.id || data.victimId === this.network.id));
            }

            if (data.victimId === this.network.id) {
                document.getElementById('death-screen').style.display = 'flex'; // UI Manager should handle this
                this.audio.playDie();
            }
        });

        this.network.on('playerRespawn', (data) => {
            if (data.id === this.network.id) {
                // Respawn self
                this.player.setPosition(data.x, 2, data.z);
                this.ui.updateHealth(100);
                document.getElementById('death-screen').style.display = 'none';
            } else {
                // Others respawn logic
                // Fix: EntityManager.updatePlayer expects 'playerId', but we have 'id'
                const updateData = { ...data, playerId: data.id };
                this.entityManager.updatePlayer(updateData);

                // Update NameTag health
                const p = this.entityManager.getPlayer(data.id);
                if (p) {
                    import('../ui/NameTag.js').then(m => m.updateNameTag(p.mesh, p.mesh.userData.playerName, 100));
                }
            }
        });

        this.network.on('obstacleDamaged', (data) => {
            const obstacles = this.level.getObstacles();
            const wall = obstacles.find(o => o.userData.id === data.id);
            if (wall) {
                // Flash red
                if (wall.material.emissive) {
                    const originalEmissive = wall.material.emissive.getHex();
                    wall.material.emissive.setHex(0xff0000);
                    setTimeout(() => {
                        wall.material.emissive.setHex(originalEmissive);
                    }, 100);
                }
            }
        });

        this.network.on('playerShot', (data) => {
            // data: { shooterId, origin, direction }
            // Don't render own shot again? (Should be filtered by server 'to' room, but safe to check)
            if (data.shooterId !== this.network.id) {
                // Convert simple objects back to Vector3 if needed, likely handled by ThreeJS methods or manual
                const origin = new THREE.Vector3(data.origin.x, data.origin.y, data.origin.z);
                const dir = new THREE.Vector3(data.direction.x, data.direction.y, data.direction.z);
                this.effects.createBulletTracer(origin, dir);
            }
        });

        // Weapon pickup events
        this.network.on('pickupsState', (pickups) => {
            console.log('[DEBUG] Received pickupsState:', pickups);
            // Initial pickups when game starts
            this.pickupManager.clear();
            pickups.forEach(p => this.pickupManager.addPickup(p));
        });

        this.network.on('pickupCollected', (data) => {
            // data: { pickupId, playerId, weaponType }
            this.pickupManager.removePickup(data.pickupId);

            if (data.playerId === this.network.id) {
                // Local player picked up weapon
                this.player.switchWeapon(data.weaponType);
                this.ui.showWeaponPickup(data.weaponType);
                this.audio.playPickup();
            } else {
                // Remote player picked up weapon
                const remotePlayer = this.entityManager.getPlayer(data.playerId);
                if (remotePlayer) {
                    remotePlayer.updateWeapon(data.weaponType);
                }
            }
        });

        this.network.on('pickupRespawned', (pickup) => {
            this.pickupManager.addPickup(pickup);
        });

        this.network.on('playerWeaponChanged', (data) => {
            // data: { playerId, weaponType }
            const remotePlayer = this.entityManager.getPlayer(data.playerId);
            if (remotePlayer) {
                remotePlayer.updateWeapon(data.weaponType);
            }
        });
    }

    _handleShoot(raycaster, weaponPos, dir, weaponType) {
        // Create bullet tracer visual locally
        this.effects.createBulletTracer(weaponPos, dir, weaponType);

        // Notify server of shot for visuals (Broadcast)
        this.network.emit('playerShoot', {
            origin: weaponPos,
            direction: dir,
            weaponType: weaponType
        });

        // Logic
        const playerMeshes = this.entityManager.getPlayerMeshes();
        const walls = this.level.walls.children;
        const obstacles = this.level.obstacles;

        const allObjects = [...playerMeshes, ...walls, ...obstacles, this.level.floor];

        const intersects = raycaster.intersectObjects(allObjects, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            let curr = hit.object;

            // Traverse up to find Player Mesh Root
            while (curr.parent && curr.parent.type !== 'Scene') {
                curr = curr.parent;
            }

            // Check if curr is a player
            const players = this.entityManager.players;
            const targetId = Object.keys(players).find(id => players[id].mesh === curr);

            if (targetId) {
                // Hit a player
                this.ui.showHitMarker();
                this.network.emit('shoot', { targetId: targetId, weaponType: weaponType });
            } else if (curr.userData.type === 'destructible') {
                // Hit a destructible wall
                this.ui.showHitMarker();
                this.network.emit('damageObstacle', { id: curr.userData.id, damage: 10 });
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        if (this.gameActive && this.gameEndTime) {
            this.ui.updateGameTimer(this.gameEndTime - Date.now());
        }

        this.level.update(delta, time / 1000); // Pass Time in seconds
        this.player.update(delta);

        // Update weapon pickups (animations)
        this.pickupManager.update(delta);

        // Check for nearby weapon pickups (only if game is active and controls locked)
        // Check for nearby weapon pickups (only if game is active and controls locked)
        if (this.gameActive && this.player.controls.isLocked) {
            const playerPos = this.player.controls.getObject().position;
            const nearbyPickup = this.pickupManager.checkProximity(playerPos, 2.5);

            if (nearbyPickup) {
                // Show Prompt
                this.ui.togglePickupPrompt(true, nearbyPickup.weaponType);

                // Check for 'F' Key interaction
                if (this.input.interact) {
                    this.player.tryPickupWeapon(nearbyPickup.id);
                    // Reset interact flag to prevent rapid firing multiple requests
                    this.input.interact = false;
                }
            } else {
                // Hide Prompt
                this.ui.togglePickupPrompt(false);
            }
        }

        // Update Remote Players?
        // RemotePlayer.update usually takes server data.
        // Do we need to update animation frame-by-frame (idle anim)?
        // Original code: `socket.on('playerMoved')` -> updates position/rotation.
        // But the waddle animation depends on `performance.now()` inside the update function?
        // Wait, `socket.on` calls `char.position.set(...)`.
        // The animation (waddle) was INSIDE the `socket.on('playerMoved')` handler.
        // So they only animate when they move?
        // Yes. "Goofy Waddle ... inside socket.on".
        // So no per-frame update needed for remote players unless we interpolate.
        // Current refactor parity maintains this.

        this.renderer.render();
    }
}
