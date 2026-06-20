class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.player = null;
        this.boss = null;
        this.world = null;
        this.vfx = null;
        this.keys = {};
        this.mouse = { left: false, right: false };
        this.gameState = 'menu';
        this.lastTime = 0;
        this.cameraAngle = 0;
        this.cameraHeight = CONFIG.camera.height;
        this.cameraDistance = CONFIG.camera.distance;
        this.currentLevel = 0;
        this.bossDefeated = false;
        this.lootItems = [];
        this._lastLoot = null;
        this.isPaused = false;

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(CONFIG.world.fogColor, CONFIG.world.fogNear, CONFIG.world.fogFar);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        this.world = new World(this.scene);
        this.world.init(LEVELS[0].world);

        this.player = new Player(this.scene);
        this.boss = new Boss(this.scene, LEVELS[0].boss);
        this.vfx = new VFXManager(this.scene, this.camera);
        this.boss.setVFX(this.vfx);
        this.boss.onPhaseChange = (phase) => {
            this.showPhaseText(LEVELS[this.currentLevel].boss.phaseNames[phase]);
        };

        this.bindEvents();
        this.animate();
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('controls-btn').addEventListener('click', () => {
            document.getElementById('controls-screen').style.display = 'flex';
        });
        document.getElementById('controls-back').addEventListener('click', () => {
            document.getElementById('controls-screen').style.display = 'none';
        });
        document.getElementById('credits-btn').addEventListener('click', () => {
            document.getElementById('credits-screen').style.display = 'flex';
        });
        document.getElementById('credits-back').addEventListener('click', () => {
            document.getElementById('credits-screen').style.display = 'none';
        });
        document.getElementById('story-continue').addEventListener('click', () => {
            if (this._storyCallback) {
                const cb = this._storyCallback;
                this._storyCallback = null;
                cb();
            }
        });
        document.getElementById('game-over').addEventListener('click', () => this.restart());
        document.getElementById('victory-screen').addEventListener('click', () => this.nextLevel());
        document.getElementById('ending-screen').addEventListener('click', () => this.restart());
        document.getElementById('pause-resume').addEventListener('click', () => this.resume());

        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (e.key === 'Escape') {
                if (this.gameState === 'playing') {
                    if (this.isPaused) this.resume();
                    else this.pause();
                }
                return;
            }
            if (this.gameState !== 'playing' || this.isPaused) return;
            if (e.key.toLowerCase() === 'q') this.playerUseUltimate();
            if (e.key.toLowerCase() === 'e') this.playerUseCharm();
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === document.body) {
                this.cameraAngle -= e.movementX * 0.003;
                this.cameraHeight = Math.max(2, Math.min(15, this.cameraHeight + e.movementY * 0.02));
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;
            if (document.pointerLockElement !== document.body) {
                document.body.requestPointerLock();
                return;
            }
            if (e.button === 0) { this.mouse.left = true; this.playerAttack(); }
            if (e.button === 2) { this.mouse.right = true; this.playerUseSkill(); }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.left = false;
            if (e.button === 2) this.mouse.right = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());

        document.addEventListener('pointerlockchange', () => {
            if (this.isPaused) return;
            const hint = document.getElementById('lock-hint');
            if (this.gameState === 'playing') {
                hint.style.display = document.pointerLockElement ? 'none' : 'block';
            }
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    startGame() {
        document.getElementById('start-screen').style.display = 'none';
        this.currentLevel = 0;
        audio.init();
        try { audio.playBGM('prologue'); } catch(e) {}
        try {
            this.showStoryScreen(PROLOGUE, () => {
                audio.stopBGM();
                this.showStoryScreen(LEVELS[0].story.intro, () => this.beginLevel());
            });
        } catch(e) {
            this.beginLevel();
        }
    }

    showStoryScreen(texts, callback) {
        this.gameState = 'story';
        const screen = document.getElementById('story-screen');
        const textEl = document.getElementById('story-text');
        const continueBtn = document.getElementById('story-continue');
        screen.style.display = 'flex';
        textEl.innerHTML = '';
        continueBtn.style.display = 'none';

        if (this._typeTimer) clearInterval(this._typeTimer);
        if (this._typeTimeout) clearTimeout(this._typeTimeout);

        let lineIndex = 0;
        const showLine = () => {
            if (lineIndex >= texts.length) {
                document.getElementById('story-continue').style.display = 'block';
                this._storyCallback = callback;
                return;
            }
            const p = document.createElement('p');
            p.className = 'story-line';
            textEl.appendChild(p);

            let charIndex = 0;
            const text = texts[lineIndex];
            const typeTimer = setInterval(() => {
                if (charIndex < text.length) {
                    p.textContent += text[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeTimer);
                    lineIndex++;
                    this._typeTimeout = setTimeout(showLine, 600);
                }
            }, 50);
            this._typeTimer = typeTimer;
        };
        showLine();
    }

    beginLevel() {
        document.getElementById('story-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        document.getElementById('controls').style.display = 'block';
        document.getElementById('controls').style.opacity = '1';
        document.getElementById('controls').style.transition = 'none';
        document.getElementById('skills-bar').style.display = 'flex';
        document.getElementById('poem').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('lock-hint').style.display = 'block';

        audio.init();
        const bgmThemes = ['level1', 'level2', 'level3'];
        audio.playBGM(bgmThemes[this.currentLevel] || 'level1');
        document.body.requestPointerLock();

        this.gameState = 'playing';
        this.lastTime = Date.now();
        this.bossDefeated = false;
        this.player.isInvincible = true;
        setTimeout(() => { this.player.isInvincible = false; }, 1500);

        const level = LEVELS[this.currentLevel];
        document.getElementById('boss-name').textContent = level.boss.displayName;
        document.getElementById('level-text').textContent = level.subtitle + ' · ' + level.name;
        document.getElementById('level-text').style.display = 'block';

        const intro = document.getElementById('boss-intro');
        intro.textContent = '战 斗 开 始';
        intro.style.opacity = '1';
        document.getElementById('boss-hud').style.display = 'block';
        setTimeout(() => { intro.style.opacity = '0'; }, 1500);
        setTimeout(() => {
            intro.textContent = level.boss.displayName;
            intro.style.opacity = '1';
            this.vfx.triggerScreenShake(0.6, 600);
            this.vfx.createUltimateEffect(this.boss.position.clone());
            if (this.boss.aura) this.boss.aura.scale.set(3, 3, 3);
            setTimeout(() => { intro.style.opacity = '0'; }, 2500);
            setTimeout(() => this.showPhaseText(level.boss.phaseNames[0]), 3000);
            const shrinkAura = () => {
                if (this.boss.aura && this.boss.aura.scale.x > 1.05) {
                    this.boss.aura.scale.multiplyScalar(0.95);
                    requestAnimationFrame(shrinkAura);
                }
            };
            shrinkAura();
        }, 1800);
    }

    showPhaseText(text) {
        const el = document.getElementById('phase-text');
        el.textContent = text;
        el.style.opacity = '1';
        if (this._phaseTextTimer) clearTimeout(this._phaseTextTimer);
        this._phaseTextTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.isPaused) return;
        const now = Date.now();
        const delta = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (this.gameState === 'playing') {
            this.update(delta);
        }
        this.render();
    }

    update(delta) {
        this.player.update(delta, this.keys, this.cameraAngle);

        // 角色面朝远离相机方向（十字准星方向）
        if (!document.pointerLockElement) {
            const toBoss = this.player.getDirectionTo(this.boss.position);
            this.player.mesh.rotation.y = Math.atan2(-toBoss.x, -toBoss.z);
        } else {
            this.player.mesh.rotation.y = this.cameraAngle + Math.PI;
        }

        if (this.boss.hp > 0) {
            const bossAttack = this.boss.update(delta, this.player.position);
            if (bossAttack) this.processBossAttack(bossAttack);
        }

        this.world.update(delta);
        this.vfx.update(delta);

        this.checkProjectileHits();
        this.updateCamera(delta);
        this.updateHUD();
        this.updateSkillCooldowns();

        if (this.player.mp < CONFIG.player.maxMp) {
            this.player.mp += 8 * delta;
        }

        if (this.player.hp <= 0 && this.gameState === 'playing') {
            this.gameState = 'dying';
            setTimeout(() => this.gameOver(), 1200);
        }
    }

    updateCamera(delta) {
        const target = this.player.position.clone();
        target.y += 2;
        const offset = new THREE.Vector3(
            Math.sin(this.cameraAngle) * this.cameraDistance,
            this.cameraHeight,
            Math.cos(this.cameraAngle) * this.cameraDistance
        );
        const camPos = target.clone().add(offset);
        this.camera.position.lerp(camPos, 0.08);
        this.camera.lookAt(target);

        const shake = this.vfx.getShakeOffset();
        this.camera.position.x += shake.x;
        this.camera.position.y += shake.y;
    }

    playerAttack() {
        const attack = this.player.attack();
        if (attack) {
            const attackPos = this.player.position.clone();
            attackPos.y += 1.2;
            attack.position = attackPos;
            // 攻击朝十字准星方向（远离相机）
            const dir = this.player.getDirection();
            attack.direction = dir;
            this.vfx.createAttackEffect(attackPos, dir, attack.type);
            this.vfx.triggerScreenShake(0.15, 100);
            this.checkPlayerHit(attack);
        }
    }

    playerUseSkill() {
        const skill = this.player.useSkill();
        if (skill) {
            const skillPos = this.player.position.clone();
            skillPos.y += 1.2;
            skill.position = skillPos;
            const dir = this.player.getDirection();
            skill.direction = dir;
            this.vfx.createSkillEffect(skillPos, skill.range);
            this.checkPlayerHit(skill);
        }
    }

    playerUseUltimate() {
        const ultimate = this.player.useUltimate();
        if (ultimate) {
            const ultPos = this.player.position.clone();
            ultPos.y += 1;
            ultimate.position = ultPos;
            this.vfx.createUltimateEffect(ultPos);
            this.vfx.triggerScreenShake(0.3, 300);
            this.checkPlayerHit(ultimate);
        }
    }

    playerUseCharm() {
        const charm = this.player.useCharm();
        if (charm) {
            const charmPos = this.player.position.clone();
            charmPos.y += 1;
            charm.position = charmPos;
            this.vfx.createHealEffect(charmPos);
            this.vfx.createCharmEffect(charmPos);
            this.vfx.createDamageNumber(
                charmPos.clone().add(new THREE.Vector3(0, 2, 0)),
                SKILLS.charm.healAmount, 'heal'
            );
            this.boss.stun(SKILLS.charm.stunDuration);
        }
    }

    checkPlayerHit(attack) {
        if (this.boss.hp <= 0) return;
        const dist = this.player.position.distanceTo(this.boss.position);
        if (dist <= attack.range) {
            const killed = this.boss.takeDamage(attack.damage);
            this.vfx.createDamageDecal(this.boss.position);
            this.vfx.createDamageNumber(
                this.boss.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                attack.damage, attack.type === 'ultimate' ? 'crit' : 'normal'
            );
            this.vfx.triggerScreenShake(attack.type === 'ultimate' ? 0.3 : 0.1, attack.type === 'ultimate' ? 250 : 100);

            this.player.combo++;
            this.player.comboTimer = 2;
            this.updateCombo();

            if (killed && !this.bossDefeated) {
                this.bossDefeated = true;
                this.spawnLoot(this.boss.position.clone());
                this.showLootToast();
                setTimeout(() => this.levelComplete(), 2500);
            }
        }
    }

    processBossAttack(attack) {
        if (attack.type === 'melee') {
            const dist = this.player.position.distanceTo(this.boss.position);
            if (dist <= attack.range + 1) {
                this.player.takeDamage(attack.damage);
                this.vfx.createDamageNumber(
                    this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    attack.damage, 'boss'
                );
                this.vfx.triggerScreenShake(0.2, 150);
            }
        } else if (attack.type === 'charge') {
            this.player.takeDamage(attack.damage);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                attack.damage, 'boss'
            );
            this.vfx.triggerScreenShake(0.4, 300);
        }
    }

    checkProjectileHits() {
        if (this.boss.hp <= 0 || this.player.hp <= 0) return;
        const dmg = this.vfx.checkProjectileCollision(this.player.position, 1.5);
        if (dmg > 0) {
            this.player.takeDamage(dmg);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                dmg, 'boss'
            );
            this.vfx.triggerScreenShake(0.15, 120);
        }
    }

    levelComplete() {
        this.gameState = 'levelComplete';
        audio.stopBGM();
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('hud').style.display = 'none';
        document.getElementById('boss-hud').style.display = 'none';
        document.getElementById('skills-bar').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('level-text').style.display = 'none';
        document.getElementById('poem').style.display = 'none';
        document.getElementById('lock-hint').style.display = 'none';
        this.clearLoot();

        const level = LEVELS[this.currentLevel];
        const isLastLevel = this.currentLevel >= LEVELS.length - 1;

        this.showStoryScreen(level.story.victory, () => {
            if (isLastLevel) {
                this.showEnding();
            } else {
                this.showVictoryScreen();
            }
        });
    }

    showVictoryScreen() {
        this.showLootList();
        const screen = document.getElementById('victory-screen');
        document.getElementById('victory-boss-name').textContent = LEVELS[this.currentLevel].boss.name + ' 已被降服';
        document.getElementById('victory-level').textContent = LEVELS[this.currentLevel].subtitle + ' · 完';
        screen.style.display = 'flex';
        this.gameState = 'victory';
    }

    showEnding() {
        this.gameState = 'ending';
        audio.playBGM('ending');
        const screen = document.getElementById('ending-screen');
        screen.style.display = 'flex';
    }

    nextLevel() {
        document.getElementById('victory-screen').style.display = 'none';
        document.getElementById('ending-screen').style.display = 'none';

        this.currentLevel++;

        if (this.currentLevel >= LEVELS.length) {
            this.currentLevel = 0;
            this.restartFull();
            return;
        }

        const level = LEVELS[this.currentLevel];
        this.boss.reconfigure(level.boss);
        this.boss.setVFX(this.vfx);
        this.boss.onPhaseChange = (phase) => {
            this.showPhaseText(level.boss.phaseNames[phase]);
        };

        this.world.clear();
        this.world.init(level.world);

        this.vfx.clear();
        this.clearLoot();

        this.player.respawn();
        this.bossDefeated = false;
        this.cameraAngle = 0;

        this.scene.fog = new THREE.Fog(level.world.fogColor, CONFIG.world.fogNear, CONFIG.world.fogFar);

        audio.playBGM('prologue');
        this.showStoryScreen(level.story.intro, () => {
            audio.stopBGM();
            this.beginLevel();
        });
    }

    gameOver() {
        this.gameState = 'gameover';
        this.isPaused = false;
        audio.stopBGM();
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('hud').style.display = 'none';
        document.getElementById('boss-hud').style.display = 'none';
        document.getElementById('skills-bar').style.display = 'none';
        document.getElementById('controls').style.display = 'none';
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('level-text').style.display = 'none';
        document.getElementById('poem').style.display = 'none';
        document.getElementById('lock-hint').style.display = 'none';
        document.getElementById('game-over').style.display = 'flex';
    }

    pause() {
        if (this.gameState !== 'playing' || this.isPaused) return;
        this.isPaused = true;
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('pause-screen').style.display = 'flex';
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.lastTime = Date.now();
        document.getElementById('pause-screen').style.display = 'none';
        document.body.requestPointerLock();
    }

    updateHUD() {
        const hp = Math.round(this.player.hp);
        const maxHp = CONFIG.player.maxHp;
        const mp = Math.round(this.player.mp);
        const maxMp = CONFIG.player.maxMp;
        document.getElementById('hp-fill').style.width = (hp / maxHp * 100) + '%';
        document.getElementById('mp-fill').style.width = (mp / maxMp * 100) + '%';
        document.getElementById('hp-text').textContent = hp + ' / ' + maxHp;
        document.getElementById('mp-text').textContent = mp + ' / ' + maxMp;

        const lowHpEl = document.getElementById('low-hp-overlay');
        const heartbeatRing = document.getElementById('hp-heartbeat-ring');
        if (hp < maxHp * 0.3 && hp > 0) {
            lowHpEl.classList.add('active');
            heartbeatRing.classList.add('active');
        } else {
            lowHpEl.classList.remove('active');
            heartbeatRing.classList.remove('active');
        }

        if (this.boss.hp > 0) {
            document.getElementById('boss-hp-fill').style.width = (this.boss.hp / this.boss.maxHp * 100) + '%';
            document.getElementById('boss-hp-text').textContent = Math.round(this.boss.hp) + ' / ' + this.boss.maxHp;
        }
    }

    updateSkillCooldowns() {
        this.updateSingleCD('cd-q', this.player.cooldowns.ultimate, SKILLS.ultimate.cooldown, 'skill-q');
        this.updateSingleCD('cd-e', this.player.cooldowns.charm, SKILLS.charm.cooldown, 'skill-e');
    }

    updateSingleCD(cdId, current, max, slotId) {
        const el = document.getElementById(cdId);
        const slot = document.getElementById(slotId);
        if (!el || !slot) return;
        if (current > 0) {
            el.style.height = (current / max * 100) + '%';
            slot.classList.add('on-cd');
            const flash = Math.abs(Math.sin(Date.now() * 0.008)) * 0.8;
            slot.style.boxShadow = `0 0 ${6 + flash * 10}px rgba(255,${Math.round(60 + flash * 60)},${Math.round(60 + flash * 60)},${0.5 + flash * 0.5})`;
            slot.style.borderColor = `rgba(255,${Math.round(80 + flash * 80)},${Math.round(80 + flash * 80)},${0.6 + flash * 0.4})`;
        } else {
            el.style.height = '0%';
            slot.classList.remove('on-cd');
            slot.style.boxShadow = '';
            slot.style.borderColor = '';
        }
    }

    updateCombo() {
        const el = document.getElementById('combo');
        if (this.player.combo > 1) {
            el.textContent = this.player.combo + ' COMBO!';
            el.classList.add('show');
            const t = Math.min(this.player.combo / 30, 1);
            const r = Math.round(255);
            const g = Math.round(68 * (1 - t) + 217 * t);
            const b = Math.round(68 * (1 - t) * (1 - t));
            const color = `rgb(${r},${g},${b})`;
            const size = 24 + this.player.combo * 2;
            el.style.fontSize = Math.min(size, 72) + 'px';
            el.style.color = color;
            el.style.textShadow = `0 0 ${8 + this.player.combo}px ${color}`;
            clearTimeout(this._comboTimeout);
            this._comboTimeout = setTimeout(() => el.classList.remove('show'), 1200);
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    showLootList() {
        const level = LEVELS[this.currentLevel];
        const shuffled = this._lastLoot || [...level.loot].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
        const listEl = document.getElementById('loot-list');
        if (listEl) {
            listEl.innerHTML = shuffled.map(l =>
                `<div class="loot-item"><span class="loot-dot" style="background:${l.color}"></span><b>${l.name}</b><br><span style="color:#999;font-size:0.8rem">${l.desc || ''}</span></div>`
            ).join('');
        }
    }

    showLootToast() {
        const toast = document.getElementById('loot-toast');
        const items = document.getElementById('toast-items');
        if (!toast || !items) return;
        const level = LEVELS[this.currentLevel];
        const shuffled = [...level.loot].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 3));
        this._lastLoot = shuffled;
        items.innerHTML = shuffled.map(l =>
            `<div class="toast-item" style="color:${l.color}">✦ ${l.name}</div>`
        ).join('');
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }

    spawnLoot(position) {
        const colors = [0x87ceeb, 0xffb6c1, 0xffd93d, 0x4ecdc4, 0xe94560];
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const r = 1.5 + Math.random();
            const lootPos = position.clone().add(new THREE.Vector3(Math.cos(angle) * r, 3, Math.sin(angle) * r));

            const geo = new THREE.OctahedronGeometry(0.3, 0);
            const mat = new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.9 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(lootPos);
            this.scene.add(mesh);

            const light = new THREE.PointLight(colors[i], 0.8, 4);
            light.position.copy(lootPos);
            this.scene.add(light);

            this.lootItems.push({ mesh, light });

            const startY = 3;
            const endY = 0.5 + Math.random() * 0.5;
            const startTime = Date.now();
            const fallDur = 800 + i * 200;
            const animateLoot = () => {
                const p = Math.min(1, (Date.now() - startTime) / fallDur);
                const eased = 1 - Math.pow(1 - p, 3);
                mesh.position.y = startY + (endY - startY) * eased;
                light.position.y = mesh.position.y;
                if (p < 1) {
                    requestAnimationFrame(animateLoot);
                } else {
                    const floatAnim = () => {
                        mesh.position.y = endY + Math.sin(Date.now() * 0.003 + i) * 0.15;
                        light.position.y = mesh.position.y;
                        mesh.rotation.y += 0.02;
                        requestAnimationFrame(floatAnim);
                    };
                    floatAnim();
                }
            };
            animateLoot();
        }
    }

    clearLoot() {
        this.lootItems.forEach(item => {
            this.scene.remove(item.mesh);
            this.scene.remove(item.light);
        });
        this.lootItems = [];
    }

    restart() {
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('victory-screen').style.display = 'none';
        document.getElementById('ending-screen').style.display = 'none';
        this.restartFull();
    }

    restartFull() {
        audio.stopBGM();
        this.currentLevel = 0;
        this.isPaused = false;
        this.cameraAngle = 0;
        this.cameraHeight = CONFIG.camera.height;
        this.cameraDistance = CONFIG.camera.distance;
        const level = LEVELS[0];

        this.boss.reconfigure(level.boss);
        this.boss.setVFX(this.vfx);
        this.boss.onPhaseChange = (phase) => {
            this.showPhaseText(level.boss.phaseNames[phase]);
        };

        this.world.clear();
        this.world.init(level.world);
        this.vfx.clear();
        this.clearLoot();
        this.player.respawn();
        this.bossDefeated = false;
        this.scene.fog = new THREE.Fog(level.world.fogColor, CONFIG.world.fogNear, CONFIG.world.fogFar);

        audio.playBGM('prologue');
        this.showStoryScreen(level.story.intro, () => {
            audio.stopBGM();
            this.beginLevel();
        });
    }
}

window.addEventListener('load', () => { new Game(); });
