import { Game } from './core/Game.js';

window.addEventListener('load', () => {
    const game = new Game();
    // Expose for debugging if needed
    window.game = game;
});
