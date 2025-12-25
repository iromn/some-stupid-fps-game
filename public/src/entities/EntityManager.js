import { RemotePlayer } from './RemotePlayer.js';

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.players = {};
    }

    addPlayer(data) {
        if (this.players[data.playerId]) return;
        const player = new RemotePlayer(this.scene, data);
        this.players[data.playerId] = player;
    }

    removePlayer(id) {
        if (this.players[id]) {
            this.players[id].remove();
            delete this.players[id];
        }
    }

    updatePlayer(data) {
        if (this.players[data.playerId]) {
            this.players[data.playerId].update(data);
        }
    }

    getPlayerMeshes() {
        return Object.values(this.players).map(p => p.mesh);
    }

    getPlayer(id) {
        return this.players[id];
    }

    update(delta) {
        Object.values(this.players).forEach(p => p.tick(delta));
    }
}
