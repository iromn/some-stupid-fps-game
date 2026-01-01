export class Audio {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5;
        this.buffers = {}; // Cache for audio buffers
    }

    setVolume(val) {
        this.masterVolume = Math.max(0, Math.min(1, val));
    }

    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            this.buffers[name] = audioBuffer;
            console.log(`[Audio] Loaded ${name} from ${url}`);
        } catch (e) {
            console.warn(`[Audio] Failed to load ${url}:`, e);
        }
    }

    playSound(name, vol = 0.5, pitch = 1.0) {
        if (!this.buffers[name]) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];

        // Pitch variation for realism
        source.playbackRate.value = pitch;

        const gain = this.ctx.createGain();
        gain.gain.value = vol * this.masterVolume;

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return true;
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

    playShoot(weaponType = 'pistol', weaponDef = null) {
        // Try to play custom sound first
        const played = this.playSound(weaponType, 0.4, 0.9 + Math.random() * 0.2);

        if (!played) {
            // Fallback to synth if file not loaded
            const soundDef = weaponDef?.sound || { freq: 600, type: 'square', duration: 0.1 };
            this.playTone(soundDef.freq, soundDef.type, soundDef.duration, 0.1);
        }
    }

    playHit() {
        this.playTone(100, 'sawtooth', 0.1, 0.05);
    }

    playHitMarker() {
        // Sharp, high-pitched tick
        this.playTone(2000, 'sine', 0.05, 0.1);
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
