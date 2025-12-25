export class Audio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5;
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    playTone(freq, type, duration, vol = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        const finalVol = vol * this.masterVolume;
        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playShoot() {
        this.playTone(600, 'square', 0.1, 0.05);
    }

    playHit() {
        this.playTone(100, 'sawtooth', 0.1, 0.05);
    }

    playDie() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const finalVol = 0.1 * this.masterVolume;

        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1);

        gain.gain.setValueAtTime(finalVol, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 1);
    }

    playPickup() {
        // Two-tone ascending sound for pickup
        this.playTone(800, 'sine', 0.1, 0.08);
        setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.06), 100);
    }

    resume() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
}
