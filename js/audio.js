// audio.js - 音频系统
class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.bgmNodes = [];
        this.bgmPlaying = false;
        this.bgmVolume = 0.15;
    }

    init() {
        if (this.ctx && this.ctx.state === 'running') return;
        try {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.initialized = true;
        } catch (e) {
            console.warn('WebAudio not supported');
        }
    }

    ensureContext() {
        if (!this.ctx) return false;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx.state === 'running';
    }

    playTone(freq, duration, type = 'sine', volume = 0.3) {
        if (!this.ensureContext()) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.frequency.value = freq;
            osc.type = type;
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    }

    // ===== BGM 系统 =====
    stopBGM() {
        this.bgmNodes.forEach(n => {
            try { n.stop(); } catch(e) {}
        });
        this.bgmNodes = [];
        this.bgmPlaying = false;
    }

    playBGM(theme) {
        this.stopBGM();
        if (!this.ensureContext()) return;
        this.bgmPlaying = true;
        const now = this.ctx.currentTime;

        const themes = {
            prologue: { notes: [261, 329, 392, 329, 261, 220, 261, 329], tempo: 0.8, type: 'sine', vol: 0.12 },
            level1:   { notes: [220, 261, 329, 261, 220, 196, 220, 261, 329, 392, 329, 261], tempo: 0.5, type: 'triangle', vol: 0.1 },
            level2:   { notes: [196, 233, 293, 233, 196, 174, 196, 233, 293, 349, 293, 233], tempo: 0.35, type: 'sawtooth', vol: 0.08 },
            level3:   { notes: [277, 329, 415, 329, 277, 233, 277, 329, 415, 466, 415, 329], tempo: 0.6, type: 'sine', vol: 0.1 },
            ending:   { notes: [261, 329, 392, 523, 392, 329, 261, 329, 392, 523, 659, 523, 392, 329, 261], tempo: 0.7, type: 'sine', vol: 0.12 },
        };

        const t = themes[theme] || themes.level1;
        const loopLen = t.notes.length * t.tempo;

        const playLoop = () => {
            if (!this.bgmPlaying) return;
            t.notes.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.frequency.value = freq;
                osc.type = t.type;
                const start = this.ctx.currentTime + i * t.tempo;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(t.vol, start + 0.05);
                gain.gain.setValueAtTime(t.vol, start + t.tempo * 0.7);
                gain.gain.linearRampToValueAtTime(0, start + t.tempo * 0.95);
                osc.start(start);
                osc.stop(start + t.tempo);
                this.bgmNodes.push(osc);
            });

            // Pad / drone layer
            const padFreq = t.notes[0] * 0.5;
            const padOsc = this.ctx.createOscillator();
            const padGain = this.ctx.createGain();
            padOsc.connect(padGain);
            padGain.connect(this.ctx.destination);
            padOsc.frequency.value = padFreq;
            padOsc.type = 'sine';
            padGain.gain.setValueAtTime(t.vol * 0.3, this.ctx.currentTime);
            padOsc.start();
            padOsc.stop(this.ctx.currentTime + loopLen);
            this.bgmNodes.push(padOsc);

            setTimeout(playLoop, loopLen * 1000);
        };

        playLoop();
    }

    // ===== 音效 =====
    playAttack() {
        this.playTone(440, 0.08, 'sawtooth', 0.25);
        setTimeout(() => this.playTone(660, 0.08, 'sawtooth', 0.2), 40);
        setTimeout(() => this.playTone(880, 0.06, 'sine', 0.15), 70);
    }

    playSkill() {
        this.playTone(330, 0.3, 'sine', 0.3);
        setTimeout(() => this.playTone(440, 0.2, 'sine', 0.2), 100);
        setTimeout(() => this.playTone(550, 0.2, 'sine', 0.15), 200);
    }

    playUltimate() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => this.playTone(220 + i * 110, 0.4, 'triangle', 0.2), i * 100);
        }
    }

    playDash() { this.playTone(200, 0.15, 'sine', 0.15); }

    playHit() {
        this.playTone(150, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(100, 0.15, 'square', 0.15), 50);
    }

    playBossAttack() {
        this.playTone(220, 0.15, 'sawtooth', 0.35);
        setTimeout(() => this.playTone(165, 0.25, 'sawtooth', 0.3), 60);
        setTimeout(() => this.playTone(110, 0.35, 'sawtooth', 0.25), 120);
    }

    playBossProjectile() {
        this.playTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(400, 0.2, 'sine', 0.25), 50);
        setTimeout(() => this.playTone(250, 0.3, 'triangle', 0.3), 100);
    }

    playVictory() {
        [523, 659, 784, 1047].forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.5, 'sine', 0.3), i * 200);
        });
    }

    playDefeat() {
        this.playTone(200, 0.5, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(150, 0.5, 'sawtooth', 0.25), 300);
        setTimeout(() => this.playTone(100, 0.8, 'sawtooth', 0.2), 600);
    }

    playCharm() {
        this.playTone(880, 0.3, 'sine', 0.2);
        setTimeout(() => this.playTone(1100, 0.3, 'sine', 0.15), 100);
        setTimeout(() => this.playTone(1320, 0.5, 'sine', 0.1), 200);
    }

    playPhaseChange() {
        this.playTone(200, 0.8, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(400, 0.6, 'sawtooth', 0.25), 200);
        setTimeout(() => this.playTone(600, 0.4, 'triangle', 0.2), 400);
    }

    playChargeWarning() {
        this.playTone(300, 0.12, 'square', 0.25);
        setTimeout(() => this.playTone(500, 0.12, 'square', 0.3), 120);
        setTimeout(() => this.playTone(800, 0.15, 'square', 0.35), 240);
    }

    playFireAttack() {
        this.playTone(150, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.35), 80);
        setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.2), 150);
    }

    playMirrorShatter() {
        this.playTone(2000, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1500, 0.15, 'sine', 0.25), 50);
        setTimeout(() => this.playTone(1000, 0.2, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(500, 0.3, 'sine', 0.2), 200);
    }

    playEnding() {
        [523, 659, 784, 1047, 1318, 1568].forEach((n, i) => {
            setTimeout(() => this.playTone(n, 0.8, 'sine', 0.25), i * 300);
        });
    }
}

const audio = new AudioManager();
