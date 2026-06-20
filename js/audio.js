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

    // ===== BGM 系统 (真实MP3) =====
    stopBGM() {
        if (this.currentBGM) {
            this.currentBGM.pause();
            this.currentBGM.currentTime = 0;
            this.currentBGM = null;
        }
        this.bgmPlaying = false;
    }

    playBGM(theme) {
        this.stopBGM();
        const tracks = {
            prologue: 'bgm/prologue.mp3',
            level1: 'bgm/level1.mp3',
            level2: 'bgm/level2.mp3',
            level3: 'bgm/level3.mp3',
            ending: 'bgm/ending.mp3',
        };
        const src = tracks[theme] || tracks.level1;
        try {
            this.currentBGM = new Audio(src);
            this.currentBGM.loop = true;
            this.currentBGM.volume = 0.4;
            this.currentBGM.preload = 'auto';
            const playPromise = this.currentBGM.play();
            if (playPromise) {
                playPromise.then(() => {
                    this.bgmPlaying = true;
                }).catch(() => {
                    // 浏览器自动播放策略阻止，等用户交互后重试
                    this._pendingBGM = theme;
                });
            }
        } catch(e) {}
    }

    // 用户交互后重试播放被阻止的BGM
    retryBGM() {
        if (this._pendingBGM) {
            const theme = this._pendingBGM;
            this._pendingBGM = null;
            this.playBGM(theme);
        }
    }

    // ===== 音效 =====
    playAttack() {
        this.playTone(330, 0.08, 'triangle', 0.15);
        setTimeout(() => this.playTone(440, 0.06, 'triangle', 0.12), 40);
    }

    playAttackCombo2() {
        this.playTone(440, 0.1, 'triangle', 0.18);
        setTimeout(() => this.playTone(550, 0.08, 'triangle', 0.15), 50);
        setTimeout(() => this.playTone(660, 0.06, 'triangle', 0.12), 100);
    }

    playAttackCombo3() {
        this.playTone(330, 0.15, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(440, 0.12, 'sawtooth', 0.18), 60);
        setTimeout(() => this.playTone(660, 0.1, 'sawtooth', 0.15), 120);
        setTimeout(() => this.playTone(880, 0.08, 'sine', 0.12), 180);
    }

    playChargeStart() {
        this.playTone(200, 0.2, 'sine', 0.1);
    }

    playChargeFull() {
        this.playTone(880, 0.15, 'sine', 0.2);
        setTimeout(() => this.playTone(1100, 0.2, 'sine', 0.15), 80);
    }

    playChargeRelease() {
        this.playTone(330, 0.15, 'triangle', 0.2);
        setTimeout(() => this.playTone(440, 0.12, 'triangle', 0.15), 60);
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

    // 薛宝钗·冷香寒气：冰冷高频扫频
    playColdBreath() {
        this.playTone(1200, 0.3, 'sine', 0.18);
        setTimeout(() => this.playTone(900, 0.25, 'sine', 0.15), 100);
        setTimeout(() => this.playTone(1500, 0.2, 'triangle', 0.12), 200);
    }

    // 薛宝钗·牡丹绽放：金色钟铃
    playPeonyBloom() {
        this.playTone(659, 0.4, 'sine', 0.25);
        setTimeout(() => this.playTone(880, 0.35, 'sine', 0.2), 120);
        setTimeout(() => this.playTone(1175, 0.5, 'sine', 0.15), 240);
    }

    // 赵姨娘·利爪：尖锐短促
    playClawAttack() {
        this.playTone(800, 0.06, 'square', 0.2);
        setTimeout(() => this.playTone(600, 0.08, 'sawtooth', 0.18), 40);
        setTimeout(() => this.playTone(400, 0.1, 'sawtooth', 0.15), 80);
    }

    // 赵姨娘·纸人召唤：诡异颤音
    playPaperSummon() {
        this.playTone(330, 0.15, 'triangle', 0.2);
        setTimeout(() => this.playTone(370, 0.15, 'triangle', 0.18), 80);
        setTimeout(() => this.playTone(290, 0.2, 'triangle', 0.16), 160);
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
