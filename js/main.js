console.log('=== main.js loaded v2 ===');
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
        this.pointerLockFailed = false;  // 指针锁不可用（嵌入WebView等）→ 降级到拖拽模式
        this._dragging = false;          // 拖拽旋转视角

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
            this.onBossPhaseChange(phase, LEVELS[this.currentLevel]);
        };

        this.bindEvents();
        this.animate();
    }

    // 统一的指针锁请求：捕获异常，失败时标记降级
    lockPointer() {
        if (this.pointerLockFailed) return;
        try {
            const el = this.renderer.domElement;
            const p = el.requestPointerLock();
            if (p && typeof p.then === 'function') {
                p.catch(() => {
                    this.pointerLockFailed = true;
                    console.warn('Pointer lock 不可用，已降级为鼠标拖拽模式');
                });
            }
        } catch (e) {
            this.pointerLockFailed = true;
        }
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => { audio.retryBGM(); this.startGame(); });
        document.getElementById('level-select-btn').addEventListener('click', () => {
            document.getElementById('level-select-screen').style.display = 'flex';
        });
        document.getElementById('level-select-back').addEventListener('click', () => {
            document.getElementById('level-select-screen').style.display = 'none';
        });
        document.querySelectorAll('.level-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const level = parseInt(btn.dataset.level);
                document.getElementById('level-select-screen').style.display = 'none';
                document.getElementById('start-screen').style.display = 'none';
                this.currentLevel = level;
                audio.init();
                const levelData = LEVELS[level];
                audio.playBGM('prologue');
                this.showStoryScreen(levelData.story.intro, () => {
                    audio.playBGM('level' + (level + 1));
                    this.beginLevel();
                });
            });
        });
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
                // 先隐藏故事画面，避免 z-index:2000 盖住后续界面（胜利/结局/关卡）
                document.getElementById('story-screen').style.display = 'none';
                cb();
            }
        });
        document.getElementById('game-over').addEventListener('click', () => this.restart());
        document.getElementById('victory-screen').addEventListener('click', () => this.nextLevel());
        document.getElementById('ending-screen').addEventListener('click', () => this.restart());
        document.getElementById('pause-resume').addEventListener('click', () => this.resume());
        document.getElementById('pause-menu').addEventListener('click', () => this.backToMenu());
        document.getElementById('gameover-menu').addEventListener('click', (e) => { e.stopPropagation(); this.backToMenu(); });
        document.getElementById('victory-menu').addEventListener('click', (e) => { e.stopPropagation(); this.backToMenu(); });

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
            // 指针锁模式
            if (document.pointerLockElement === this.renderer.domElement) {
                this.cameraAngle -= e.movementX * 0.003;
                this.cameraHeight = Math.max(2, Math.min(15, this.cameraHeight + e.movementY * 0.02));
            } else if (this._dragging && this.pointerLockFailed) {
                // 降级：鼠标按住拖拽旋转视角
                this.cameraAngle -= e.movementX * 0.005;
                this.cameraHeight = Math.max(2, Math.min(15, this.cameraHeight + e.movementY * 0.03));
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.gameState !== 'playing') return;
            // 指针锁可用时：首次点击锁定，之后攻击
            if (!this.pointerLockFailed && document.pointerLockElement !== this.renderer.domElement) {
                this.lockPointer();
                return;
            }
            // 指针锁失败降级：左键拖拽旋转+松开攻击；右键直接放技能
            if (this.pointerLockFailed) {
                if (e.button === 0) { this._dragging = true; this.mouse.left = true; this.playerStartCharge(); return; }
                if (e.button === 2) { this.mouse.right = true; this.playerUseSkill(); return; }
            }
            if (e.button === 0) { this.mouse.left = true; this.playerStartCharge(); }
            if (e.button === 2) { this.mouse.right = true; this.playerUseSkill(); }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.left = false;
                this._dragging = false;
                if (this.player.isCharging) this.playerReleaseCharge();
            }
            if (e.button === 2) this.mouse.right = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());

        document.addEventListener('pointerlockchange', () => {
            if (this.isPaused) return;
            if (this.gameState === 'playing') {
                if (!document.pointerLockElement) {
                    this.keys = {};  // 指针锁丢失时清除按键残留
                    if (!this.pointerLockFailed) {
                        this.pause();
                    }
                }
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
                // 不停BGM，直接切到关卡BGM
                this.showStoryScreen(LEVELS[0].story.intro, () => {
                    audio.playBGM('level1');
                    this.beginLevel();
                });
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
        this.keys = {};  // 切换关卡时清除按键残留
        document.getElementById('hud').style.display = 'block';
        document.getElementById('controls').style.display = 'block';
        document.getElementById('controls').style.opacity = '1';
        document.getElementById('controls').style.transition = 'none';
        document.getElementById('skills-bar').style.display = 'flex';
        document.getElementById('poem').style.display = 'block';
        document.getElementById('crosshair').style.display = 'block';
        // 隐藏提示
        document.getElementById('lock-hint').style.display = 'none';
        document.getElementById('drag-hint').style.display = 'none';

        audio.init();
        const bgmThemes = ['level1', 'level2', 'level3'];
        audio.playBGM(bgmThemes[this.currentLevel] || 'level1');
        this.lockPointer();

        this.gameState = 'playing';
        this.lastTime = Date.now();
        this.bossDefeated = false;
        this.player.isInvincible = true;
        setTimeout(() => { this.player.isInvincible = false; }, 1500);

        const level = LEVELS[this.currentLevel];
        console.log('beginLevel: currentLevel=' + this.currentLevel + ' bossType=' + level.boss.type + ' bossName=' + level.boss.name);

        // 重新配置BOSS模型（不同关卡不同BOSS类型）
        this.boss.reconfigure(level.boss);
        this.boss.setVFX(this.vfx);
        this.boss.onPhaseChange = (phase) => {
            this.showPhaseText(level.boss.phaseNames[phase]);
        };

        // 重新配置场景（不同关卡不同环境）
        this.world.clear();
        this.world.init(level.world);
        this.vfx.clear();
        this.clearLoot();
        this.scene.fog = new THREE.Fog(level.world.fogColor, CONFIG.world.fogNear, CONFIG.world.fogFar);

        this.player.respawn();
        this.cameraAngle = 0;

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
        el.style.transform = 'translateX(-50%) scale(1.3)';
        if (this._phaseTextTimer) clearTimeout(this._phaseTextTimer);
        setTimeout(() => { el.style.transform = 'translateX(-50%) scale(1)'; }, 300);
        this._phaseTextTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
    }

    onBossPhaseChange(phase, level) {
        // 阶段转换环境变化
        const bossType = this.boss.bossType;

        // 环境颜色配置
        const phaseEnvs = {
            baochai: [
                { fog: 0x0f0a1a, ambient: 0x1a1a2e, ambientInt: 0.3, point: 0xe94560, pointInt: 0.5 },
                { fog: 0x1a0a05, ambient: 0x2e1a0a, ambientInt: 0.4, point: 0xff8800, pointInt: 0.8 },
                { fog: 0x1a0505, ambient: 0x2e0a0a, ambientInt: 0.5, point: 0xff2200, pointInt: 1.2 },
            ],
            zhaoyiniang: [
                { fog: 0x1a0505, ambient: 0x2e1a1a, ambientInt: 0.4, point: 0xff4400, pointInt: 0.5 },
                { fog: 0x200000, ambient: 0x3e0a0a, ambientInt: 0.5, point: 0xff2200, pointInt: 1.0 },
                { fog: 0x150000, ambient: 0x4a0000, ambientInt: 0.6, point: 0xff0000, pointInt: 1.5 },
            ],
            mirror: [
                { fog: 0x050510, ambient: 0x1a0a3e, ambientInt: 0.2, point: 0x9932cc, pointInt: 0.5 },
                { fog: 0x08031a, ambient: 0x200a4e, ambientInt: 0.3, point: 0x7700aa, pointInt: 0.8 },
                { fog: 0x030008, ambient: 0x2a0050, ambientInt: 0.4, point: 0xff44ff, pointInt: 1.2 },
            ],
        };

        const env = (phaseEnvs[bossType] || phaseEnvs.baochai)[phase];
        if (!env) return;

        // 平滑过渡雾气颜色
        this._transitionFog(env.fog, 2000);

        // 平滑过渡环境光
        this._transitionLight('ambient', env.ambient, env.ambientInt, 2000);
        this._transitionLight('pointLight', env.point, env.pointInt, 2000);

        // 阶段转换全屏闪烁效果
        this._flashScreen(bossType, phase);

        // 世界环境变化（花瓣、月亮、地面）
        if (this.world) this.world.setPhaseEnvironment(bossType, phase);

        // BOSS类型专属阶段转换特效
        if (this.vfx) this.vfx.createPhaseTransitionEffect(this.boss.position.clone(), bossType, phase);
    }

    _transitionFog(targetColor, duration) {
        const fog = this.scene.fog;
        if (!fog) return;
        const startColor = fog.color.clone();
        const endColor = new THREE.Color(targetColor);
        const startTime = Date.now();
        const animate = () => {
            const t = Math.min(1, (Date.now() - startTime) / duration);
            const eased = t * t * (3 - 2 * t); // smoothstep
            fog.color.lerpColors(startColor, endColor, eased);
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    _transitionLight(name, targetColor, targetIntensity, duration) {
        const light = this.scene.getObjectByName(name);
        if (!light) return;
        const startColor = light.color.clone();
        const endColor = new THREE.Color(targetColor);
        const startIntensity = light.intensity;
        const startTime = Date.now();
        const animate = () => {
            const t = Math.min(1, (Date.now() - startTime) / duration);
            const eased = t * t * (3 - 2 * t);
            light.color.lerpColors(startColor, endColor, eased);
            light.intensity = startIntensity + (targetIntensity - startIntensity) * eased;
            if (t < 1) requestAnimationFrame(animate);
        };
        animate();
    }

    _flashScreen(bossType, phase) {
        // 创建全屏闪烁overlay
        const flashColors = {
            baochai: [0xffd700, 0xff8800, 0xff2200],
            zhaoyiniang: [0xff4400, 0xff2200, 0xff0000],
            mirror: [0x9932cc, 0x7700aa, 0xff44ff],
        };
        const color = (flashColors[bossType] || flashColors.baochai)[phase];
        const hexColor = '#' + color.toString(16).padStart(6, '0');

        const flash = document.createElement('div');
        Object.assign(flash.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: hexColor, opacity: '0.4', pointerEvents: 'none',
            zIndex: '200', transition: 'opacity 1.5s ease-out'
        });
        document.body.appendChild(flash);
        requestAnimationFrame(() => { flash.style.opacity = '0'; });
        setTimeout(() => flash.remove(), 1600);
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
        // 指针锁激活 或 降级拖拽模式 → 按相机方向；否则朝向BOSS
        if (document.pointerLockElement || this.pointerLockFailed) {
            this.player.mesh.rotation.y = this.cameraAngle + Math.PI;
        } else {
            const toBoss = this.player.getDirectionTo(this.boss.position);
            this.player.mesh.rotation.y = Math.atan2(-toBoss.x, -toBoss.z);
        }

        if (this.boss.hp > 0) {
            const bossAttack = this.boss.update(delta, this.player.position);
            if (bossAttack) this.processBossAttack(bossAttack);
        }

        this.world.update(delta);
        this.vfx.update(delta);
        this.vfx.playerPosition = this.player.position;

        // 蓄力特效
        if (this.player.isCharging) {
            this.vfx.createChargeEffect(this.player.position.clone(), this.player.chargeTime / COMBAT.chargeMaxTime);
        } else {
            this.vfx.clearChargeEffect();
        }

        this.checkProjectileHits();
        this.checkFireTrailDamage(delta);
        this.updateCamera(delta);
        this.updateHUD();
        this.updateSkillCooldowns();
        this.updateComboStageUI();

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
        this.camera.position.lerp(camPos, 0.12);
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
            const dir = this.player.getDirection();
            attack.direction = dir;
            this.vfx.createComboEffect(attackPos, dir, attack.stage || 0);
            this.vfx.triggerScreenShake(0.1 + (attack.stage || 0) * 0.05, 100 + (attack.stage || 0) * 50);
            this.checkPlayerHit(attack);
        }
    }

    playerStartCharge() {
        if (this.player.startCharge()) {
            audio.playChargeStart();
        }
    }

    playerCancelCharge() {
        this.player.cancelCharge();
        this.vfx.clearChargeEffect();
    }

    playerReleaseCharge() {
        this.vfx.clearChargeEffect();
        const charge = this.player.releaseCharge();
        if (charge) {
            const chargePos = this.player.position.clone();
            chargePos.y += 1.2;
            charge.position = chargePos;
            const dir = this.player.getDirection();
            charge.direction = dir;
            this.vfx.createChargeReleaseEffect(chargePos, dir, charge.chargeRatio);
            this.vfx.triggerScreenShake(0.2 + charge.chargeRatio * 0.3, 200 + charge.chargeRatio * 200);
            this.checkPlayerHit(charge);
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
            // 薛宝钗金锁护体：阶段1+概率弹反普攻
            const cfg = this.boss.config;
            const canReflect = this.boss.bossType === 'baochai' && this.boss.phase >= 1
                && attack.type === 'normal' && cfg.reflectChance
                && Math.random() < cfg.reflectChance;

            if (canReflect) {
                // 弹反：BOSS仅受30%伤害，反弹50%伤害给玩家
                this.boss.takeDamage(attack.damage * 0.3);
                this.vfx.createDamageNumber(
                    this.boss.position.clone().add(new THREE.Vector3(0, 3, 0)),
                    '弹反!', 'crit'
                );
                const reflectDmg = attack.damage * 0.5;
                this.player.takeDamage(reflectDmg);
                this.vfx.createDamageNumber(
                    this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    reflectDmg, 'boss'
                );
                this.vfx.triggerScreenShake(0.3, 200);
                this.vfx.createPhaseRing(this.boss.position.clone(), 0xffd700);
                return;
            }

            // 薛宝钗金锁盾正面减伤：正面受击伤害减半
            let actualDamage = attack.damage;
            if (this.boss.bossType === 'baochai' && this.boss.isBlockingFront(this.player.position)) {
                actualDamage = attack.damage * 0.5;
                this.vfx.createDamageNumber(
                    this.boss.position.clone().add(new THREE.Vector3(0, 3, 0)),
                    '格挡!', 'crit'
                );
            }

            // 天魁星后范围扩大
            let actualRange = attack.range;
            if (this.player.skillBuff === 'ultimate') {
                actualRange *= COMBAT.ultimateBuffRangeMultiplier;
            }

            const killed = this.boss.takeDamage(actualDamage);
            this.vfx.createDamageDecal(this.boss.position);

            let dmgType = attack.type === 'ultimate' || attack.type === 'charge' ? 'crit' : 'normal';
            if (attack.stage === 2) dmgType = 'crit';
            this.vfx.createDamageNumber(
                this.boss.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                actualDamage, dmgType
            );

            let shakeIntensity = attack.type === 'ultimate' ? 0.3 : attack.type === 'charge' ? 0.2 + (attack.chargeRatio || 0) * 0.2 : 0.1;
            this.vfx.triggerScreenShake(shakeIntensity, 100 + (attack.stage || 0) * 50);

            // 泪雨后附带泪滴特效
            if (this.player.skillBuff === 'tear') {
                this.vfx.createTearHitEffect(this.boss.position.clone());
            }

            // 颦颦一笑后命中回血
            if (this.player.skillBuff === 'charm') {
                this.player.heal(COMBAT.charmBuffHealPerHit);
                this.vfx.createDamageNumber(
                    this.player.position.clone().add(new THREE.Vector3(0, 3, 0)),
                    COMBAT.charmBuffHealPerHit, 'heal'
                );
                this.player.skillBuffCount--;
                if (this.player.skillBuffCount <= 0) this.player.skillBuff = null;
            }

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
        // 完美闪避检测
        if (this.player.perfectDodgeActive) {
            this.player.triggerPerfectDodge();
            this.vfx.createPerfectDodgeEffect(this.player.position.clone());
            this.vfx.triggerScreenShake(0.3, 300);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 3, 0)),
                '完美闪避！', 'crit'
            );
            // 时停BOSS
            this.boss.stun(0.8);
            return;
        }
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
        } else if (attack.type === 'teleport') {
            // 镜中魔瞬移突袭
            const dist = this.player.position.distanceTo(this.boss.position);
            if (dist <= attack.range + 1) {
                this.player.takeDamage(attack.damage);
                this.vfx.createDamageNumber(
                    this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    attack.damage, 'crit'
                );
                this.vfx.triggerScreenShake(0.5, 350);
            }
        } else if (attack.type === 'aoe') {
            // 牡丹绽放 / 幻境碎裂
            const dist = this.player.position.distanceTo(this.boss.position);
            if (dist <= attack.range) {
                this.player.takeDamage(attack.damage);
                this.vfx.createDamageNumber(
                    this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                    attack.damage, 'crit'
                );
                this.vfx.triggerScreenShake(0.4, 300);
                // 牡丹绽放附带禁锢
                if (attack.root && attack.subtype === 'peony') {
                    this.player.applyRoot(attack.root);
                    this.vfx.createDamageNumber(
                        this.player.position.clone().add(new THREE.Vector3(0, 3, 0)),
                        '禁锢!', 'boss'
                    );
                }
            }
        } else if (attack.type === 'cone') {
            // 妒火吐息：前方扇形
            const toPlayer = new THREE.Vector3().subVectors(this.player.position, attack.position);
            toPlayer.y = 0;
            const dist = toPlayer.length();
            if (dist <= attack.range) {
                toPlayer.normalize();
                const dot = toPlayer.dot(attack.direction);
                if (dot > Math.cos(attack.angle)) {
                    this.player.takeDamage(attack.damage);
                    this.vfx.createDamageNumber(
                        this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                        attack.damage, 'boss'
                    );
                    this.vfx.triggerScreenShake(0.25, 200);
                }
            }
        }
    }

    checkProjectileHits() {
        if (this.boss.hp <= 0 || this.player.hp <= 0) return;
        const hit = this.vfx.checkProjectileCollision(this.player.position, 1.5);
        if (hit.damage > 0) {
            this.player.takeDamage(hit.damage);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                hit.damage, 'boss'
            );
            this.vfx.triggerScreenShake(0.15, 120);
        }
        // 冷香寒气命中减速
        if (hit.slow > 0) {
            this.player.applySlow(hit.slow);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 3, 0)),
                '减速!', 'boss'
            );
        }
    }

    // 赵姨娘火焰地面持续伤害
    checkFireTrailDamage(delta) {
        if (this.boss.hp <= 0 || this.player.hp <= 0) return;
        if (this.boss.bossType !== 'zhaoyiniang') return;
        this._fireTickTimer = (this._fireTickTimer || 0) - delta;
        if (this._fireTickTimer > 0) return;
        this._fireTickTimer = 0.5;
        const dmg = this.vfx.checkFireTrailDamage(this.player.position, 1.2);
        if (dmg > 0) {
            this.player.takeDamage(dmg);
            this.vfx.createDamageNumber(
                this.player.position.clone().add(new THREE.Vector3(0, 2.5, 0)),
                Math.round(dmg), 'boss'
            );
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
        document.getElementById('drag-hint').style.display = 'none';
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

        try {
            const level = LEVELS[this.currentLevel];
            this.boss.reconfigure(level.boss);
            this.boss.setVFX(this.vfx);
            this.boss.onPhaseChange = (phase) => {
                this.showPhaseText(level.boss.phaseNames[phase]);
                this.onBossPhaseChange(phase, level);
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
                audio.playBGM('level' + (this.currentLevel + 1));
                this.beginLevel();
            });
        } catch(e) {
            console.error('nextLevel error:', e);
            this.restartFull();
        }
    }

    gameOver() {
        this.gameState = 'gameover';
        this.isPaused = false;
        this.keys = {};  // 清除按键残留
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
        document.getElementById('drag-hint').style.display = 'none';
        document.getElementById('game-over').style.display = 'flex';
    }

    pause() {
        if (this.gameState !== 'playing' || this.isPaused) return;
        this.isPaused = true;
        this.keys = {};  // 清除按键残留
        if (document.pointerLockElement) document.exitPointerLock();
        document.getElementById('pause-screen').style.display = 'flex';
    }

    resume() {
        if (!this.isPaused) return;
        this.isPaused = false;
        this.lastTime = Date.now();
        document.getElementById('pause-screen').style.display = 'none';
        this.lockPointer();
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

    updateComboStageUI() {
        const stageEl = document.getElementById('combo-stage');
        const chargeEl = document.getElementById('charge-bar');
        const buffEl = document.getElementById('skill-buff');
        if (!stageEl || !chargeEl || !buffEl) return;
        // 连招阶段
        if (this.player.comboStageTimer > 0) {
            stageEl.style.display = 'block';
            stageEl.textContent = '连招 ' + (this.player.comboStage + 1) + '/3';
            stageEl.style.color = ['#ffb6c1', '#ff69b4', '#ff1493'][this.player.comboStage];
        } else {
            stageEl.style.display = 'none';
        }
        // 蓄力条
        if (this.player.isCharging) {
            chargeEl.style.display = 'block';
            const ratio = this.player.chargeTime / COMBAT.chargeMaxTime;
            chargeEl.querySelector('.charge-fill').style.width = (ratio * 100) + '%';
            chargeEl.querySelector('.charge-fill').style.background = ratio >= 0.8 ? '#ff1493' : '#ffb6c1';
        } else {
            chargeEl.style.display = 'none';
        }
        // 技能强化
        if (this.player.skillBuff) {
            buffEl.style.display = 'block';
            const names = { tear: '泪雨强化', ultimate: '天魁星强化', charm: '颦颦一笑强化' };
            buffEl.textContent = names[this.player.skillBuff] + ' x' + this.player.skillBuffCount;
            buffEl.style.color = { tear: '#87ceeb', ultimate: '#ffd700', charm: '#ffb6c1' }[this.player.skillBuff];
        } else {
            buffEl.style.display = 'none';
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

    backToMenu() {
        audio.stopBGM();
        this.isPaused = false;
        this.gameState = 'menu';
        if (document.pointerLockElement) document.exitPointerLock();

        // 隐藏所有游戏界面
        ['hud','boss-hud','skills-bar','controls','crosshair','level-text','poem',
         'lock-hint','drag-hint','game-over','victory-screen','ending-screen','pause-screen'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // 清理场景
        this.vfx.clear();
        this.clearLoot();

        // 显示主界面
        document.getElementById('start-screen').style.display = 'flex';
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
            this.onBossPhaseChange(phase, level);
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
