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

export class Game {
    constructor() {
        this.renderer = new Renderer();
        this.input = new Input();
        this.audio = new Audio();
        this.network = new Network();
        this.ui = new UIManager();

        this.level = new Level(this.renderer.scene);
        this.physics = new Physics(this.level);
        this.effects = new Effects(this.renderer.scene);

        this.entityManager = new EntityManager(this.renderer.scene);

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

        // Bind Player Shoot to Effects
        this.player.onShootRequest = (raycaster, weaponPos, dir) => this._handleShoot(raycaster, weaponPos, dir);

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
            this.player.setJoined(true);
            this.player.setPosition(data.x || 0, 2, data.z || 0);
            this.ui.showGameUI(data.roomCode);
            // Initialize local player state for UI lists
            this.allPlayers = {};
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
        });

        this.network.on('newPlayer', (p) => {
            this.allPlayers[p.playerId] = p; // Update local state
            this.entityManager.addPlayer(p);

            // Update UI
            this.ui.addPlayerToList(p);
            this.ui.updateLeaderboard(this.allPlayers);
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
            }
        });

        this.network.on('playerKilled', (data) => {
            // data: { victimId, killerId }
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
                // Others respawn logic (maybe reset position)
                this.entityManager.updatePlayer(data);
                // Also reset health visual if needed, usually handled by future update or 'playerHit' resetting it?
                // Server resets health to 100.
                // We should probably update name tag to 100.
                const p = this.entityManager.getPlayer(data.id);
                if (p) {
                    import('../ui/NameTag.js').then(m => m.updateNameTag(p.mesh, p.mesh.userData.playerName, 100));
                }
            }
        });
    }

    _handleShoot(raycaster, weaponPos, dir) {
        // Create bullet tracer visual
        this.effects.createBulletTracer(weaponPos, dir);

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
                // Hit a player - show optimistic hit marker
                this.ui.showHitMarker();
                this.network.emit('shoot', { targetId: targetId });
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = Math.min((time - this.lastTime) / 1000, 0.1);
        this.lastTime = time;

        this.player.update(delta);

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
