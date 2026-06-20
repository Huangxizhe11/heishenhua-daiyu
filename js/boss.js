// boss.js - 三个差异化BOSS
// 薛宝钗(金锁·冷香·牡丹·防御反击) / 赵姨娘(妒火·魇魔·纸人·远程召唤) / 镜中魔(风月宝鉴·镜像·幻境·幻术高难)
class Boss {
    constructor(scene, config) {
        this.scene = scene;
        this.mesh = null;
        this.config = config || LEVELS[0].boss;
        this.bossType = this.config.type || 'baochai';
        this.hp = this.config.maxHp;
        this.maxHp = this.config.maxHp;
        this.position = new THREE.Vector3(0, 1, -15);
        this.phase = 0;
        this.isAttacking = false;
        this.isCharging = false;
        this.isStunned = false;
        this.stunTimer = 0;
        this.attackCooldown = 0;
        this.chargeDir = new THREE.Vector3();
        this.chargeTimer = 0;
        this.chargeSpeed = this.config.chargeSpeed;
        this.lastPhase = 0;
        this.vfx = null;
        this.onPhaseChange = null;
        this._hpPulseTime = 0;
        this._animTime = 0;
        this._teleportCooldown = 0;
        this._zigzagTimer = 0;
        this._zigzagAngle = 0;
        this._zigzagDir = 1;
        this._fireTrailTimer = 0;     // 赵姨娘火焰拖尾计时
        this._mirrorCloneTimer = 0;   // 镜中魔分身计时
        this._mirrorClones = [];      // 镜中魔分身列表
        this.damageResistance = 0;       // 伤害抗性（0~1）
        this.weaknessMultiplier = 1;     // 弱点倍率
        this._phaseTransitioning = false; // 阶段过渡中
        this._phaseVisualTimer = 0;      // 阶段视觉计时
        this.phaseDialogues = this.config.phaseDialogues || [
            '尔等蝼蚁，岂能撼动本座！',
            '既然执迷不悟，便让你见识真正的力量！',
            '玉石俱焚，也在所不惜！'
        ];
        this.createModel();
    }

    setVFX(vfx) { this.vfx = vfx; }

    reconfigure(config) {
        this.config = config;
        this.bossType = config.type || 'baochai';
        this.maxHp = config.maxHp;
        this.hp = config.maxHp;
        this.chargeSpeed = config.chargeSpeed;
        this.phase = 0;
        this.lastPhase = 0;
        this.isAttacking = false;
        this.isCharging = false;
        this.isStunned = false;
        this._dying = false;
        this.attackCooldown = 0;
        this._hpPulseTime = 0;
        this._animTime = 0;
        this._teleportCooldown = 0;
        this._zigzagTimer = 0;
        this._zigzagAngle = 0;
        this._fireTrailTimer = 0;
        this._mirrorCloneTimer = 0;
        this._mirrorClones = [];
        this.phaseDialogues = config.phaseDialogues || this.phaseDialogues;
        this.position.set(0, 1.0, -15);
        this.removeLockPillars();
        this.removeFireAltar();
        this.removeSceneMirrorShards();
        this.isWeakened = false;
        this.weakenTimer = 0;
        this._altarBurnTimer = 0;
        this._altarRespawnTimer = 0;
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.createModel();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
        this.createLockPillars();
        this.createFireAltar();
        this.createSceneMirrorShards();
    }

    // ===== 模型分发 =====
    createModel() {
        if (this.bossType === 'zhaoyiniang') return this.createZhaoModel();
        if (this.bossType === 'mirror') return this.createMirrorModel();
        return this.createBaochaiModel();
    }

    // ===== 薛宝钗：金锁·冷香·牡丹·冷美人（防御反击型）=====
    createBaochaiModel() {
        const c = this.config;
        const group = new THREE.Group();

        // 脚下金光环
        const groundRingGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32);
        const groundRingMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.5 });
        this.groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        this.groundRing.position.y = 0.05;
        this.groundRing.rotation.x = Math.PI / 2;
        group.add(this.groundRing);

        // 护身金锁光环
        const auraGeo = new THREE.TorusGeometry(1.8, 0.15, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.45 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 1.2;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // 金色华服身体
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.65, 2.0, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: c.bodyColor, roughness: 0.3, metalness: 0.7,
            emissive: c.bodyColor, emissiveIntensity: 0.15
        });
        this.body = new THREE.Mesh(bodyGeo, bodyMat);
        this.body.position.y = 1.0;
        this.body.castShadow = true;
        group.add(this.body);

        // 华服下摆 - 金色多层
        this.bossSkirts = [];
        const skirtDefs = [
            { r: 0.55, h: 1.4, color: c.skirtColor, opacity: 0.9 },
            { r: 0.72, h: 1.1, color: c.skirtColor, opacity: 0.55 },
            { r: 0.88, h: 0.85, color: c.auraColor, opacity: 0.3 },
        ];
        skirtDefs.forEach((def, i) => {
            const geo = new THREE.ConeGeometry(def.r, def.h, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: def.color, roughness: 0.4, metalness: 0.5,
                emissive: def.color, emissiveIntensity: 0.1,
                transparent: true, opacity: def.opacity, side: THREE.DoubleSide
            });
            const skirt = new THREE.Mesh(geo, mat);
            skirt.position.y = 0.5 - i * 0.05;
            skirt.rotation.x = Math.PI;
            skirt.castShadow = i === 0;
            this.bossSkirts.push(skirt);
            group.add(skirt);
        });

        // 肩甲 - 金色
        for (let i = 0; i < 2; i++) {
            const shoulderGeo = new THREE.SphereGeometry(0.2, 10, 10);
            const shoulderMat = new THREE.MeshStandardMaterial({
                color: c.weaponColor, roughness: 0.15, metalness: 0.9,
                emissive: c.weaponColor, emissiveIntensity: 0.35
            });
            const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulder.position.set(-0.65 + i * 1.3, 1.85, 0);
            shoulder.scale.set(1.2, 0.7, 1);
            group.add(shoulder);
        }

        // 头部
        const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.4, metalness: 0.1 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.45;
        head.castShadow = true;
        group.add(head);

        // 头发
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.15 });
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), hairMat);
        hair.position.set(0, 2.58, -0.06);
        hair.scale.set(1, 0.85, 1.15);
        group.add(hair);

        // 牡丹金冠 - 头顶牡丹花（宝钗群芳之冠意象）
        this.peonyCrown = new THREE.Group();
        const petalMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.2, metalness: 0.85,
            emissive: 0xffaa00, emissiveIntensity: 0.4
        });
        for (let layer = 0; layer < 2; layer++) {
            const count = 6 + layer * 2;
            const r = 0.12 + layer * 0.06;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const pGeo = new THREE.SphereGeometry(0.08 - layer * 0.02, 8, 8);
                const petal = new THREE.Mesh(pGeo, petalMat);
                petal.position.set(Math.cos(angle) * r, 2.78 + layer * 0.05, Math.sin(angle) * r);
                petal.scale.set(1, 0.4, 0.5);
                this.peonyCrown.add(petal);
            }
        }
        // 牡丹花蕊
        const coreGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.6 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 2.88;
        this.peonyCrown.add(core);
        group.add(this.peonyCrown);

        // 冷蓝眼睛（冷美人）
        const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x88ccff });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.13, 2.48, 0.31);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.13, 2.48, 0.31);
        group.add(rightEye);

        // 冷蓝眼眸点光
        this.eyeLight = new THREE.PointLight(0x88ccff, 0.5, 3);
        this.eyeLight.position.set(0, 2.48, 0.4);
        group.add(this.eyeLight);

        // 金锁武器（手持）
        this.weapon = this.createBaochaiWeapon(c);
        this.weapon.position.set(0.9, 1.3, 0);
        group.add(this.weapon);

        // 胸前大金锁挂饰（宝钗最标志性元素——"不离不弃，芳龄永继"）
        const chestLockGroup = new THREE.Group();
        const chestLockGeo = new THREE.BoxGeometry(0.35, 0.45, 0.12);
        const chestLockMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.1, metalness: 0.95,
            emissive: 0xffaa00, emissiveIntensity: 0.6
        });
        const chestLock = new THREE.Mesh(chestLockGeo, chestLockMat);
        chestLockGroup.add(chestLock);
        // 金锁边框
        const frameGeo = new THREE.BoxGeometry(0.42, 0.52, 0.06);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.08, metalness: 0.98,
            emissive: 0xffcc00, emissiveIntensity: 0.7
        });
        chestLockGroup.add(new THREE.Mesh(frameGeo, frameMat));
        // 金锁上方提环
        const chestRingGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 12);
        const chestRing = new THREE.Mesh(chestRingGeo, frameMat);
        chestRing.position.y = 0.32;
        chestLockGroup.add(chestRing);
        // 金锁铭文（十字纹）
        const inscriptionMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff6600, emissiveIntensity: 0.8 });
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.14), inscriptionMat);
        h.position.z = 0.07;
        chestLockGroup.add(h);
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.14), inscriptionMat);
        v.position.z = 0.07;
        chestLockGroup.add(v);
        chestLockGroup.position.set(0, 1.15, 0.35);
        this.chestLock = chestLockGroup;
        group.add(chestLockGroup);

        // 正面金锁护盾（旋转的金色光环，正面减伤被动）
        const shieldGeo = new THREE.TorusGeometry(1.0, 0.12, 8, 6);
        const shieldMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.1, metalness: 0.95,
            emissive: 0xffd700, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.6, flatShading: true
        });
        this.lockShield = new THREE.Mesh(shieldGeo, shieldMat);
        this.lockShield.position.set(0, 1.3, 0.8);
        group.add(this.lockShield);
        // 盾面锁纹
        const lockPatternMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const lockPattern = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), lockPatternMat);
        lockPattern.position.set(0, 1.3, 0.8);
        group.add(lockPattern);
        this.lockPattern = lockPattern;

        // 飘纱
        this.floatingVeils = [];
        for (let i = 0; i < 6; i++) {
            const veilGeo = new THREE.PlaneGeometry(0.6, 1.2);
            const veilMat = new THREE.MeshStandardMaterial({
                color: c.auraColor, roughness: 0.3, metalness: 0.1,
                transparent: true, opacity: 0.12, side: THREE.DoubleSide
            });
            const veil = new THREE.Mesh(veilGeo, veilMat);
            const angle = (i / 6) * Math.PI * 2;
            veil.position.set(Math.sin(angle) * 1.2, 1.5 + Math.sin(i) * 0.3, Math.cos(angle) * 1.2);
            veil.lookAt(0, 1.5, 0);
            veil._angle = angle;
            veil._baseY = veil.position.y;
            this.floatingVeils.push(veil);
            group.add(veil);
        }

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 金锁结界：场地四角金锁柱
        this.lockPillars = [];
        this.lockPillarPositions = [
            new THREE.Vector3(12, 0, -12),
            new THREE.Vector3(-12, 0, -12),
            new THREE.Vector3(12, 0, -18),
            new THREE.Vector3(-12, 0, -18),
        ];
    }

    createBaochaiWeapon(c) {
        const group = new THREE.Group();
        // 金锁主体
        const lockGeo = new THREE.BoxGeometry(0.55, 0.7, 0.18);
        const lockMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.15, metalness: 0.92,
            emissive: c.weaponColor, emissiveIntensity: 0.55
        });
        group.add(new THREE.Mesh(lockGeo, lockMat));
        // 提环
        const ringGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.15, metalness: 0.9,
            emissive: c.weaponColor, emissiveIntensity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.48;
        group.add(ring);
        // 金锁花纹
        const crossMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.1, metalness: 0.95, emissive: 0xffd700, emissiveIntensity: 0.4 });
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.2), crossMat).translateZ(0.1));
        group.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.2), crossMat).translateZ(0.1));
        return group;
    }

    // ===== 赵姨娘：妒火·魇魔·纸人·狂乱（远程召唤型）=====
    createZhaoModel() {
        const c = this.config;
        const group = new THREE.Group();

        // === 赵姨娘：驼背佝偻、四肢着地爬行的癫狂姿态 ===
        // 整体前倾45°，像被妒火吞噬的扭曲人形

        // 暗红火光地环
        const groundRingGeo = new THREE.TorusGeometry(1.4, 0.1, 8, 32);
        const groundRingMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.5 });
        this.groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        this.groundRing.position.y = 0.05;
        this.groundRing.rotation.x = Math.PI / 2;
        group.add(this.groundRing);

        // 火焰光环（低位，贴近地面）
        const auraGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.45 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 0.4;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // === 驼背躯干（前倾的椭球体，不是直立圆柱）===
        const torsoGeo = new THREE.SphereGeometry(0.55, 10, 8);
        const torsoMat = new THREE.MeshStandardMaterial({
            color: c.bodyColor, roughness: 0.85, metalness: 0.1,
            emissive: 0x661100, emissiveIntensity: 0.3
        });
        this.body = new THREE.Mesh(torsoGeo, torsoMat);
        this.body.scale.set(1, 0.7, 1.3); // 扁平拉长
        this.body.position.set(0, 0.9, -0.2); // 前倾偏移
        this.body.rotation.x = 0.5; // 前倾
        this.body.castShadow = true;
        group.add(this.body);

        // 驼背隆起（背部大肿块）
        const humpGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const humpMat = new THREE.MeshStandardMaterial({
            color: c.skirtColor, roughness: 0.9, metalness: 0.05,
            emissive: 0x440000, emissiveIntensity: 0.2
        });
        const hump = new THREE.Mesh(humpGeo, humpMat);
        hump.position.set(0, 1.2, -0.5);
        hump.scale.set(0.8, 0.6, 1);
        group.add(hump);

        // 破烂布条（从驼背垂下，替代裙摆）
        this.bossSkirts = [];
        for (let i = 0; i < 5; i++) {
            const ragGeo = new THREE.PlaneGeometry(0.3 + Math.random() * 0.2, 0.8 + Math.random() * 0.4);
            const ragMat = new THREE.MeshStandardMaterial({
                color: i % 2 === 0 ? c.skirtColor : 0x880000,
                roughness: 0.95, metalness: 0.0,
                emissive: 0x330000, emissiveIntensity: 0.15,
                transparent: true, opacity: 0.7, side: THREE.DoubleSide
            });
            const rag = new THREE.Mesh(ragGeo, ragMat);
            rag.position.set((Math.random() - 0.5) * 0.6, 0.5, -0.3 - i * 0.1);
            rag.rotation.x = -0.3 + Math.random() * 0.3;
            rag.rotation.y = (Math.random() - 0.5) * 0.5;
            rag._baseRotX = rag.rotation.x;
            rag._baseRotY = rag.rotation.y;
            this.bossSkirts.push(rag);
            group.add(rag);
        }

        // === 四肢着地（前臂+后腿，爬行姿态）===
        // 前臂（长而弯曲，像蜘蛛一样撑地）
        this.crawlArms = [];
        for (let side = 0; side < 2; side++) {
            const armGroup = new THREE.Group();
            // 上臂
            const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.7, 6);
            const armMat = new THREE.MeshStandardMaterial({
                color: 0xddb892, roughness: 0.6, metalness: 0.05,
                emissive: 0x661100, emissiveIntensity: 0.1
            });
            const upperArm = new THREE.Mesh(upperArmGeo, armMat);
            upperArm.position.y = -0.35;
            armGroup.add(upperArm);
            // 前臂（带利爪）
            const forearmGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.6, 6);
            const forearm = new THREE.Mesh(forearmGeo, armMat);
            forearm.position.set(0, -0.9, 0.2);
            forearm.rotation.x = -0.8;
            armGroup.add(forearm);
            // 利爪
            for (let f = 0; f < 4; f++) {
                const clawGeo = new THREE.ConeGeometry(0.035, 0.35, 5);
                const clawMat = new THREE.MeshStandardMaterial({
                    color: 0x1a1a1a, roughness: 0.3, metalness: 0.7,
                    emissive: 0xff4400, emissiveIntensity: 0.4
                });
                const claw = new THREE.Mesh(clawGeo, clawMat);
                claw.position.set((f - 1.5) * 0.05, -1.3, 0.35);
                claw.rotation.x = -0.5 + f * 0.08;
                armGroup.add(claw);
            }
            armGroup.position.set(-0.5 + side * 1.0, 1.0, 0.4);
            armGroup.rotation.z = side === 0 ? 0.6 : -0.6;
            armGroup.rotation.x = -0.3;
            this.crawlArms.push(armGroup);
            group.add(armGroup);
        }
        // 武器引用指向右爪，供attack动画
        this.weapon = this.crawlArms[1];

        // 后腿（蜷缩弯曲）
        this.crawlLegs = [];
        for (let side = 0; side < 2; side++) {
            const legGroup = new THREE.Group();
            const thighGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.5, 6);
            const legMat = new THREE.MeshStandardMaterial({
                color: c.skirtColor, roughness: 0.8, metalness: 0.05
            });
            const thigh = new THREE.Mesh(thighGeo, legMat);
            thigh.position.y = -0.25;
            legGroup.add(thigh);
            const shinGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.4, 6);
            const shin = new THREE.Mesh(shinGeo, legMat);
            shin.position.set(0, -0.6, -0.15);
            shin.rotation.x = 0.6;
            legGroup.add(shin);
            legGroup.position.set(-0.4 + side * 0.8, 0.7, -0.5);
            legGroup.rotation.z = side === 0 ? 0.4 : -0.4;
            this.crawlLegs.push(legGroup);
            group.add(legGroup);
        }

        // === 头部（低垂，癫狂表情）===
        const headGeo = new THREE.SphereGeometry(0.3, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xddb892, roughness: 0.6, metalness: 0.05 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.0, 0.5); // 头部低垂在前方
        head.rotation.x = 0.4; // 低头
        head.castShadow = true;
        group.add(head);

        // 狂乱散发（从低垂的头上散落）
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9, metalness: 0.05 });
        const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 10), hairMat);
        hairBase.position.set(0, 1.05, 0.45);
        hairBase.scale.set(1.1, 0.9, 1.1);
        group.add(hairBase);

        this.bossHairStrands = [];
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const len = 0.6 + Math.random() * 0.6;
            const strandGeo = new THREE.CylinderGeometry(0.025, 0.008, len, 5);
            const strand = new THREE.Mesh(strandGeo, hairMat);
            strand.position.set(Math.cos(angle) * 0.15, 0.8, 0.4 + Math.sin(angle) * 0.15);
            strand.rotation.x = 1.0 + Math.random() * 0.5; // 头发向前垂落
            strand.rotation.z = Math.cos(angle) * 0.4;
            strand._baseRotX = strand.rotation.x;
            strand._baseRotZ = strand.rotation.z;
            this.bossHairStrands.push(strand);
            group.add(strand);
        }

        // 歪斜凤钗
        const pinGeo = new THREE.CylinderGeometry(0.02, 0.015, 0.35, 6);
        const pinMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.3, metalness: 0.7, emissive: 0x8b0000, emissiveIntensity: 0.4 });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(0.12, 1.2, 0.55);
        pin.rotation.z = Math.PI / 3;
        group.add(pin);

        // 火焰眼睛（大而疯狂）
        const eyeGeo = new THREE.SphereGeometry(0.09, 10, 10);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 1.05, 0.72);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 1.05, 0.72);
        group.add(rightEye);

        this.eyeLight = new THREE.PointLight(0xff4400, 0.8, 4);
        this.eyeLight.position.set(0, 1.05, 0.8);
        group.add(this.eyeLight);

        // 环绕小纸人
        this.paperDolls = [];
        for (let i = 0; i < 5; i++) {
            const doll = this.createPaperDollMesh();
            const angle = (i / 5) * Math.PI * 2;
            doll.position.set(Math.cos(angle) * 1.4, 0.8 + Math.sin(i) * 0.2, Math.sin(angle) * 1.4);
            doll._angle = angle;
            doll._baseY = doll.position.y;
            this.paperDolls.push(doll);
            group.add(doll);
        }

        // 背后巨大纸人
        this.backPaperDoll = new THREE.Group();
        const bigPaperMat = new THREE.MeshBasicMaterial({ color: 0xddddcc, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
        const bigBody = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), bigPaperMat);
        bigBody.position.y = 1.2;
        this.backPaperDoll.add(bigBody);
        const bigArm = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.3), bigPaperMat);
        bigArm.position.y = 1.8;
        this.backPaperDoll.add(bigArm);
        const bigEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const bigEyeL = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), bigEyeMat);
        bigEyeL.position.set(-0.2, 2.2, 0.01);
        this.backPaperDoll.add(bigEyeL);
        const bigEyeR = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), bigEyeMat);
        bigEyeR.position.set(0.2, 2.2, 0.01);
        this.backPaperDoll.add(bigEyeR);
        const runeMat = new THREE.MeshBasicMaterial({ color: 0xcc0000, side: THREE.DoubleSide });
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), runeMat);
        rune.position.set(0, 1.0, 0.01);
        this.backPaperDoll.add(rune);
        this.backPaperDoll.position.set(0, 0, -0.8);
        group.add(this.backPaperDoll);

        // 火焰光源
        this.fireTrailLight = new THREE.PointLight(0xff4400, 1.2, 5);
        this.fireTrailLight.position.y = 0.3;
        group.add(this.fireTrailLight);

        // 整体前倾（驼背爬行姿态的关键）
        group.rotation.x = -0.15;

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 妒火祭坛
        this.fireAltar = null;
        this.fireAltarTimer = 0;
    }

    createPaperDollMesh() {
        const doll = new THREE.Group();
        // 纸人身躯（白色薄平面）
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        const bodyGeo = new THREE.PlaneGeometry(0.3, 0.6);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        doll.add(body);
        // 纸人手臂
        const armGeo = new THREE.PlaneGeometry(0.5, 0.1);
        const arm = new THREE.Mesh(armGeo, bodyMat);
        arm.position.y = 0.1;
        doll.add(arm);
        // 红色符文眼
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const eyeL = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), eyeMat);
        eyeL.position.set(-0.06, 0.18, 0.01);
        doll.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), eyeMat);
        eyeR.position.set(0.06, 0.18, 0.01);
        doll.add(eyeR);
        return doll;
    }

    // ===== 镜中魔：风月宝鉴·悬浮无腿虚幻形态 =====
    createMirrorModel() {
        const c = this.config;
        const group = new THREE.Group();

        // 镜光地环
        const groundRingGeo = new THREE.TorusGeometry(1.6, 0.06, 8, 32);
        const groundRingMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.5 });
        this.groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        this.groundRing.position.y = 0.05;
        this.groundRing.rotation.x = Math.PI / 2;
        group.add(this.groundRing);

        // 紫色镜光光环（高位，悬浮感）
        const auraGeo = new THREE.TorusGeometry(1.5, 0.12, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.4 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 1.8;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // === 悬浮上半身（镜面碎片拼成的虚幻人形）===
        this.body = new THREE.Group();
        this.mirrorShards = [];
        const shardMat = new THREE.MeshStandardMaterial({
            color: c.bodyColor, roughness: 0.05, metalness: 0.95,
            emissive: c.auraColor, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        // 胸腔（大碎片）
        const chestShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), shardMat);
        chestShard.position.set(0, 1.6, 0);
        chestShard._basePos = { x: 0, y: 1.6, z: 0 };
        chestShard._phase = 0;
        chestShard.castShadow = true;
        this.mirrorShards.push(chestShard);
        this.body.add(chestShard);
        // 肩部碎片
        for (let side = 0; side < 2; side++) {
            const shoulder = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), shardMat);
            shoulder.position.set(-0.5 + side * 1.0, 1.9, 0);
            shoulder._basePos = { x: shoulder.position.x, y: 1.9, z: 0 };
            shoulder._phase = (side + 1) * 0.8;
            this.mirrorShards.push(shoulder);
            this.body.add(shoulder);
        }
        // 腹部碎片
        const belly = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), shardMat);
        belly.position.set(0, 1.1, 0);
        belly._basePos = { x: 0, y: 1.1, z: 0 };
        belly._phase = 2.1;
        this.mirrorShards.push(belly);
        this.body.add(belly);
        group.add(this.body);

        // === 悬浮手臂（镜面碎片拼接，没有手掌）===
        this.mirrorArms = [];
        for (let side = 0; side < 2; side++) {
            const armGroup = new THREE.Group();
            // 上臂碎片
            const upperGeo = new THREE.OctahedronGeometry(0.18, 0);
            const upper = new THREE.Mesh(upperGeo, shardMat);
            upper.position.set(0, -0.3, 0);
            armGroup.add(upper);
            // 前臂碎片
            const lowerGeo = new THREE.OctahedronGeometry(0.14, 0);
            const lower = new THREE.Mesh(lowerGeo, shardMat);
            lower.position.set(0, -0.7, 0.15);
            armGroup.add(lower);
            // 镜刃（从前臂延伸）
            const bladeGeo = new THREE.BoxGeometry(0.06, 0.8, 0.3);
            const bladeMat = new THREE.MeshStandardMaterial({
                color: c.weaponColor, roughness: 0.02, metalness: 1.0,
                emissive: c.auraColor, emissiveIntensity: 0.5,
                transparent: true, opacity: 0.85, flatShading: true
            });
            const blade = new THREE.Mesh(bladeGeo, bladeMat);
            blade.position.set(0, -1.2, 0.2);
            armGroup.add(blade);

            armGroup.position.set(-0.7 + side * 1.4, 1.9, 0);
            armGroup.rotation.z = side === 0 ? 0.3 : -0.3;
            this.mirrorArms.push(armGroup);
            group.add(armGroup);
        }
        // 武器引用指向右臂，供attack动画
        this.weapon = this.mirrorArms[1];

        // === 下半身：散开的镜片（没有腿，碎片向下飘散消融）===
        this.legShards = [];
        const legShardMat = new THREE.MeshStandardMaterial({
            color: c.auraColor, roughness: 0.1, metalness: 0.9,
            emissive: c.auraColor, emissiveIntensity: 0.4,
            transparent: true, opacity: 0.6, side: THREE.DoubleSide
        });
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const size = 0.12 + Math.random() * 0.15;
            const shard = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), legShardMat);
            const radius = 0.3 + Math.random() * 0.4;
            const height = 0.3 + Math.random() * 0.5;
            shard.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
            shard._basePos = { x: shard.position.x, y: height, z: shard.position.z };
            shard._phase = i * 0.5;
            this.legShards.push(shard);
            group.add(shard);
        }

        // 头部 - 镜面八面体（风月宝鉴正反难辨）
        const headGeo = new THREE.OctahedronGeometry(0.4, 0);
        const headMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.02, metalness: 1.0,
            emissive: c.auraColor, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.9, flatShading: true
        });
        this.mirrorHead = new THREE.Mesh(headGeo, headMat);
        this.mirrorHead.position.y = 2.5;
        this.mirrorHead.castShadow = true;
        group.add(this.mirrorHead);

        // 镜面眼睛（紫光，悬浮在头部前方）
        const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xddaaff });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 2.55, 0.35);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 2.55, 0.35);
        group.add(rightEye);

        this.eyeLight = new THREE.PointLight(c.auraColor, 0.7, 5);
        this.eyeLight.position.set(0, 2.5, 0.5);
        group.add(this.eyeLight);

        // 悬浮镜框环绕（风月宝鉴意象）
        this.floatingMirrors = [];
        for (let i = 0; i < 5; i++) {
            const frameGeo = new THREE.TorusGeometry(0.35, 0.04, 6, 4);
            const frameMat = new THREE.MeshStandardMaterial({
                color: c.weaponColor, roughness: 0.1, metalness: 0.95,
                emissive: c.auraColor, emissiveIntensity: 0.5
            });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            const angle = (i / 5) * Math.PI * 2;
            frame.position.set(Math.cos(angle) * 1.8, 1.5 + Math.sin(i) * 0.4, Math.sin(angle) * 1.8);
            frame._angle = angle;
            frame._baseY = frame.position.y;
            this.floatingMirrors.push(frame);
            group.add(frame);
        }

        // 整体悬浮高度（比其他BOSS高，强调悬浮感）
        this.position.y = 1.5;

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);

        // 风月宝鉴碎片（场景交互）
        this.sceneMirrorShards = [];
        this.mirrorShardTimer = 0;
    }

    createMirrorWeapon(c) {
        const group = new THREE.Group();
        // 镜刃 - 薄而锋利的镜面
        const bladeGeo = new THREE.BoxGeometry(0.08, 1.4, 0.5);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.02, metalness: 1.0,
            emissive: c.auraColor, emissiveIntensity: 0.5,
            transparent: true, opacity: 0.9, flatShading: true
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.4;
        group.add(blade);
        // 镜柄
        const handleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x4a0080, roughness: 0.4, metalness: 0.6 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.y = -0.35;
        group.add(handle);
        return group;
    }

    // ===== 金锁结界 =====
    createLockPillars() {
        this.removeLockPillars();
        if (this.bossType !== 'baochai') return;
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.15, metalness: 0.9,
            emissive: 0xffd700, emissiveIntensity: 0.4
        });
        this.lockPillarPositions.forEach((pos, i) => {
            const group = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 8), pillarMat);
            body.position.y = 1.5;
            group.add(body);
            const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), pillarMat);
            top.position.y = 3.2;
            group.add(top);
            // 光柱连接效果
            const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 20, 4);
            const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.15 });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = 10;
            group.add(beam);
            group.position.copy(pos);
            group.userData = { hp: 200, maxHp: 200, alive: true, index: i };
            this.scene.add(group);
            this.lockPillars.push(group);
        });
    }

    removeLockPillars() {
        if (this.lockPillars) {
            this.lockPillars.forEach(p => this.scene.remove(p));
            this.lockPillars = [];
        }
    }

    damageLockPillar(damage) {
        if (!this.lockPillars || this.lockPillars.length === 0) return false;
        // 找最近的活着的柱子
        let closest = null;
        let minDist = Infinity;
        this.lockPillars.forEach(p => {
            if (!p.userData.alive) return;
            const d = p.position.distanceTo(this.position);
            if (d < minDist) { minDist = d; closest = p; }
        });
        if (closest && minDist < 15) {
            closest.userData.hp -= damage;
            // 受击闪光
            closest.children.forEach(c => {
                if (c.material) { const o = c.material.color.clone(); c.material.color.set(0xffffff); setTimeout(() => c.material.color.copy(o), 80); }
            });
            if (closest.userData.hp <= 0) {
                closest.userData.alive = false;
                this.scene.remove(closest);
                // 检查是否全部摧毁
                const allDead = this.lockPillars.every(p => !p.userData.alive);
                if (allDead) {
                    this.lockPillars = [];
                    // BOSS虚弱
                    this.isWeakened = true;
                    this.weakenTimer = 5;
                    if (this.vfx) {
                        this.vfx.createDamageNumber(this.position.clone().add(new THREE.Vector3(0, 3, 0)), '虚弱！', 'crit');
                        this.vfx.createPhaseRing(this.position.clone(), 0xff4444);
                    }
                }
                return true; // 柱子被摧毁
            }
        }
        return false;
    }

    getLockPillarDamageReduction() {
        if (!this.lockPillars) return 0;
        const alive = this.lockPillars.filter(p => p.userData.alive).length;
        return alive * 0.1; // 每根10%减伤
    }

    // ===== 妒火祭坛 =====
    createFireAltar() {
        this.removeFireAltar();
        if (this.bossType !== 'zhaoyiniang') return;
        const group = new THREE.Group();
        // 祭坛底座
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x4a0000, roughness: 0.8, metalness: 0.2 }));
        base.position.y = 0.25;
        group.add(base);
        // 祭坛火焰核心
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 }));
        core.position.y = 1.2;
        group.add(core);
        // 红色光环
        const ringGeo = new THREE.TorusGeometry(1, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.5 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.8;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        // 随机位置生成
        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 5;
        group.position.set(Math.cos(angle) * dist, 0, -15 + Math.sin(angle) * dist);
        group.userData = { hp: 999, alive: true, fireTimer: 0 };
        this.scene.add(group);
        this.fireAltar = group;
    }

    removeFireAltar() {
        if (this.fireAltar) { this.scene.remove(this.fireAltar); this.fireAltar = null; }
    }

    explodeFireAltar() {
        if (!this.fireAltar || !this.fireAltar.userData.alive) return;
        this.fireAltar.userData.alive = false;
        // 爆炸伤害
        const dmg = 500;
        this.takeDamage(dmg);
        // 灼烧DOT
        this._altarBurnTimer = 3;
        this._altarBurnDmg = 50;
        // 特效
        if (this.vfx) {
            this.vfx.createUltimateEffect(this.fireAltar.position.clone());
            this.vfx.createDamageNumber(this.position.clone().add(new THREE.Vector3(0, 3, 0)), dmg, 'crit');
            this.vfx.triggerScreenShake(0.5, 400);
        }
        this.scene.remove(this.fireAltar);
        this.fireAltar = null;
        // 15秒后重新生成
        this._altarRespawnTimer = 15;
    }

    // ===== 风月宝鉴碎片 =====
    createSceneMirrorShards() {
        this.removeSceneMirrorShards();
        if (this.bossType !== 'mirror') return;
        const shardMat = new THREE.MeshStandardMaterial({
            color: 0xbb77ff, roughness: 0.02, metalness: 1.0,
            emissive: 0x9932cc, emissiveIntensity: 0.3,
            transparent: true, opacity: 0.7
        });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 5 + Math.random() * 8;
            const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), shardMat.clone());
            shard.position.set(Math.cos(angle) * dist, 0.3, -15 + Math.sin(angle) * dist);
            shard.userData = { buffDuration: 3, type: 'small' };
            this.scene.add(shard);
            this.sceneMirrorShards.push(shard);
        }
    }

    removeSceneMirrorShards() {
        if (this.sceneMirrorShards) {
            this.sceneMirrorShards.forEach(s => this.scene.remove(s));
            this.sceneMirrorShards = [];
        }
    }

    // ===== 通用方法 =====
    stun(duration) {
        this.isStunned = true;
        this.stunTimer = duration;
        this.isCharging = false;
        this.isAttacking = false;
    }

    createGroundWarning(position, radius) {
        const ringGeo = new THREE.RingGeometry(radius * 0.3, radius, 32, 1);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(position.x, 0.15, position.z);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        let elapsed = 0;
        const duration = 800;
        const flashAnim = () => {
            elapsed += 16;
            const progress = elapsed / duration;
            ring.material.opacity = 0.6 * (1 - progress) * (0.5 + Math.sin(elapsed * 0.03) * 0.5);
            if (elapsed < duration) {
                requestAnimationFrame(flashAnim);
            } else {
                this.scene.remove(ring);
            }
        };
        flashAnim();
    }

    update(delta, playerPosition) {
        if (this.hp <= 0) return null;

        this._animTime += delta;
        // 虚弱状态计时
        if (this.isWeakened) {
            this.weakenTimer -= delta;
            if (this.weakenTimer <= 0) this.isWeakened = false;
        }
        // 灼烧DOT
        if (this._altarBurnTimer > 0) {
            this._altarBurnTimer -= delta;
            this._altarBurnTick = (this._altarBurnTick || 0) - delta;
            if (this._altarBurnTick <= 0) {
                this._altarBurnTick = 1; // 每秒扣一次
                this.takeDamage(this._altarBurnDmg || 50);
            }
        }
        // 祭坛重新生成
        if (this._altarRespawnTimer > 0) {
            this._altarRespawnTimer -= delta;
            if (this._altarRespawnTimer <= 0) this.createFireAltar();
        }
        if (!this.isStunned) {
            const baseY = this.bossType === 'mirror' ? 1.5 : 1.0;
            this.position.y = baseY + Math.sin(this._animTime * 1.5) * 0.25;
        }

        if (this.isStunned) {
            this.stunTimer -= delta;
            if (this.stunTimer <= 0) this.isStunned = false;
            this.mesh.position.copy(this.position);
            if (this.aura) {
                this.aura.material.color.set(0x87ceeb);
                this.aura.rotation.z += delta * 5;
            }
            return null;
        }

        if (this.attackCooldown > 0) this.attackCooldown -= delta;
        if (this._teleportCooldown > 0) this._teleportCooldown -= delta;

        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= this.config.phases[2].hpThreshold) this.phase = 2;
        else if (hpPercent <= this.config.phases[1].hpThreshold) this.phase = 1;

        if (this.phase !== this.lastPhase) {
            this.lastPhase = this.phase;
            this._phaseTransitioning = true;
            this._phaseVisualTimer = 0;

            // 阶段转换时短暂无敌+停止攻击
            this.isAttacking = false;
            this.isCharging = false;
            this.attackCooldown = 2.0; // 2秒转换期

            audio.playPhaseChange();
            if (this.vfx) {
                this.vfx.createUltimateEffect(this.position.clone());
                this.vfx.createPhaseRing(this.position.clone(), this.config.auraColor);
                this.vfx.triggerScreenShake(0.5, 800);
            }
            if (this.onPhaseChange) this.onPhaseChange(this.phase);
            if (this.vfx && this.phaseDialogues[this.phase]) {
                this.vfx.createFloatingDialogue(this.position.clone(), this.phaseDialogues[this.phase], this.config.auraColor);
            }

            // 应用阶段属性变化
            this.applyPhaseAttributes();
        }

        // 阶段过渡动画（2秒）
        if (this._phaseTransitioning) {
            this._phaseVisualTimer += delta;
            if (this._phaseVisualTimer >= 2.0) {
                this._phaseTransitioning = false;
            }
        }

        if (playerPosition) {
            const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
            dir.y = 0;
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }

        // 阶段视觉
        if (this.aura) {
            // 阶段颜色由 applyPhaseAttributes 控制，这里只做动画
            this.aura.rotation.z += delta * (2 + this.phase * 1.5);
            const pulseSpeed = [3, 4, 6][this.phase] || 3;
            const pulseAmp = [0.1, 0.15, 0.25][this.phase] || 0.1;
            const s = 1 + Math.sin(this._animTime * pulseSpeed) * pulseAmp;
            this.aura.scale.set(s, s, 1);
        }
        if (this.groundRing) this.groundRing.rotation.z += delta * 0.8;

        // 类型专属动画
        this.updateTypeAnim(delta);

        // 差异化被动机制
        this.updatePassives(delta, playerPosition);

        // 低血量脉冲
        if (this.body && this.bossType !== 'mirror') {
            if (hpPercent <= 0.3) {
                this._hpPulseTime += delta;
                const pulse = 0.3 + Math.sin(this._hpPulseTime * 8) * 0.3;
                if (this.body.material) {
                    this.body.material.emissive.set(0xff0000);
                    this.body.material.emissiveIntensity = pulse;
                }
            } else if (this.body.material) {
                this.body.material.emissive.set(this.config.bodyColor);
                this.body.material.emissiveIntensity = 0.15;
            }
        }

        // 冲锋状态（宝钗/赵姨娘通用）
        if (this.isCharging) {
            this.chargeTimer -= delta;
            this.position.x += this.chargeDir.x * this.chargeSpeed * delta;
            this.position.z += this.chargeDir.z * this.chargeSpeed * delta;

            if (playerPosition && this.position.distanceTo(playerPosition) < 2.5) {
                this.isCharging = false;
                this.mesh.position.copy(this.position);
                return { type: 'charge', damage: this.config.chargeDamage * (1 + this.phase * 0.3) };
            }
            if (this.chargeTimer <= 0) this.isCharging = false;
            this.mesh.position.copy(this.position);
            return null;
        }

        // === 差异化移动模式 ===
        if (playerPosition && !this.isAttacking) {
            if (this.bossType === 'baochai') {
                const dist = this.position.distanceTo(playerPosition);
                const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
                toPlayer.y = 0;
                toPlayer.normalize();

                if (this.phase === 0) {
                    // 冷香初绽：保持中距离风筝
                    const idealDist = 8;
                    const kiteSpeed = 2.5 * 0.6;
                    if (dist < idealDist - 2) {
                        this.position.x -= toPlayer.x * kiteSpeed * delta;
                        this.position.z -= toPlayer.z * kiteSpeed * delta;
                    } else if (dist > idealDist + 3) {
                        this.position.x += toPlayer.x * kiteSpeed * 0.5 * delta;
                        this.position.z += toPlayer.z * kiteSpeed * 0.5 * delta;
                    }
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const sideSign = Math.sin(this._animTime * 0.7) > 0 ? 1 : -1;
                    this.position.x += sideDir.x * sideSign * kiteSpeed * 0.4 * delta;
                    this.position.z += sideDir.z * sideSign * kiteSpeed * 0.4 * delta;
                } else if (this.phase === 1) {
                    // 牡丹怒放：中距离游走，偶尔逼近
                    const idealDist = 6;
                    const speed = 3.5 * 0.6;
                    if (dist < idealDist - 1) {
                        this.position.x -= toPlayer.x * speed * delta;
                        this.position.z -= toPlayer.z * speed * delta;
                    } else if (dist > idealDist + 2) {
                        this.position.x += toPlayer.x * speed * 0.7 * delta;
                        this.position.z += toPlayer.z * speed * 0.7 * delta;
                    }
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const sideSign = Math.sin(this._animTime * 1.2) > 0 ? 1 : -1;
                    this.position.x += sideDir.x * sideSign * speed * 0.5 * delta;
                    this.position.z += sideDir.z * sideSign * speed * 0.5 * delta;
                } else {
                    // 金锁将碎：疯狂逼近近身
                    const speed = 5 * 0.7;
                    if (dist > 3) {
                        this.position.x += toPlayer.x * speed * delta;
                        this.position.z += toPlayer.z * speed * delta;
                    }
                    // 快速侧移
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const sideSign = Math.sin(this._animTime * 2.5) > 0 ? 1 : -1;
                    this.position.x += sideDir.x * sideSign * speed * 0.3 * delta;
                    this.position.z += sideDir.z * sideSign * speed * 0.3 * delta;
                }
            } else if (this.bossType === 'zhaoyiniang') {
                const dist = this.position.distanceTo(playerPosition);
                const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
                toPlayer.y = 0;
                toPlayer.normalize();

                if (this.phase === 0) {
                    // 妒火初燃：Z字乱跑
                    const erraticSpeed = 3.5 * 0.7;
                    if (!this._zigzagTimer || this._zigzagTimer <= 0) {
                        this._zigzagDir = Math.random() < 0.5 ? 1 : -1;
                        this._zigzagTimer = 0.4 + Math.random() * 0.6;
                        this._zigzagAngle = this._zigzagDir * (0.3 + Math.random() * 0.4);
                    }
                    this._zigzagTimer -= delta;
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const moveDir = new THREE.Vector3(
                        toPlayer.x * Math.cos(this._zigzagAngle) + sideDir.x * Math.sin(this._zigzagAngle),
                        0,
                        toPlayer.z * Math.cos(this._zigzagAngle) + sideDir.z * Math.sin(this._zigzagAngle)
                    ).normalize();
                    if (dist > 3) {
                        this.position.x += moveDir.x * erraticSpeed * delta;
                        this.position.z += moveDir.z * erraticSpeed * delta;
                    }
                } else if (this.phase === 1) {
                    // 烈焰焚心：更快Z字+偶尔冲近
                    const erraticSpeed = 5.5 * 0.7;
                    if (!this._zigzagTimer || this._zigzagTimer <= 0) {
                        this._zigzagDir = Math.random() < 0.5 ? 1 : -1;
                        this._zigzagTimer = 0.2 + Math.random() * 0.4;
                        this._zigzagAngle = this._zigzagDir * (0.4 + Math.random() * 0.5);
                    }
                    this._zigzagTimer -= delta;
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const moveDir = new THREE.Vector3(
                        toPlayer.x * Math.cos(this._zigzagAngle) + sideDir.x * Math.sin(this._zigzagAngle),
                        0,
                        toPlayer.z * Math.cos(this._zigzagAngle) + sideDir.z * Math.sin(this._zigzagAngle)
                    ).normalize();
                    this.position.x += moveDir.x * erraticSpeed * delta;
                    this.position.z += moveDir.z * erraticSpeed * delta;
                } else {
                    // 灰飞烟灭：疯狂冲向玩家+极速变向
                    const berserkSpeed = 7 * 0.7;
                    if (!this._zigzagTimer || this._zigzagTimer <= 0) {
                        this._zigzagDir = Math.random() < 0.5 ? 1 : -1;
                        this._zigzagTimer = 0.15 + Math.random() * 0.2;
                        this._zigzagAngle = this._zigzagDir * (0.2 + Math.random() * 0.3);
                    }
                    this._zigzagTimer -= delta;
                    const sideDir = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x);
                    const moveDir = new THREE.Vector3(
                        toPlayer.x * Math.cos(this._zigzagAngle) + sideDir.x * Math.sin(this._zigzagAngle),
                        0,
                        toPlayer.z * Math.cos(this._zigzagAngle) + sideDir.z * Math.sin(this._zigzagAngle)
                    ).normalize();
                    if (dist > 2.5) {
                        this.position.x += moveDir.x * berserkSpeed * delta;
                        this.position.z += moveDir.z * berserkSpeed * delta;
                    }
                }
            }
            // 镜中魔：不行走，纯瞬移（teleportStrikeAttack 处理）
        }

        // 边界限制
        const limit = CONFIG.world.size * 0.42;
        this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
        this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

        let attack = null;
        if (!this.isAttacking && this.attackCooldown <= 0) {
            attack = this.decideAction(playerPosition);
        }

        this.mesh.position.copy(this.position);
        return attack;
    }

    // 类型专属动画
    updateTypeAnim(delta) {
        if (this.bossType === 'baochai') this.updateBaochaiAnim(delta);
        else if (this.bossType === 'zhaoyiniang') this.updateZhaoAnim(delta);
        else if (this.bossType === 'mirror') this.updateMirrorAnim(delta);
    }

    updateBaochaiAnim(delta) {
        if (this.peonyCrown) this.peonyCrown.rotation.y += delta * 1.2;
        // 胸前金锁微动
        if (this.chestLock) {
            this.chestLock.rotation.z = Math.sin(this._animTime * 2) * 0.05;
        }
        if (this.bossSkirts) this.bossSkirts.forEach((skirt, i) => {
            skirt.rotation.y += delta * (0.2 + i * 0.1);
            const sway = Math.sin(this._animTime * 1.5 + i * 0.6) * 0.04 * (i + 1);
            skirt.rotation.x = Math.PI + sway;
        });
        if (this.floatingVeils) this.floatingVeils.forEach((veil) => {
            veil._angle += delta * 0.6;
            veil.position.x = Math.sin(veil._angle) * 1.2;
            veil.position.z = Math.cos(veil._angle) * 1.2;
            veil.position.y = veil._baseY + Math.sin(this._animTime * 2 + veil._angle) * 0.15;
            veil.lookAt(0, 1.5, 0);
        });
        if (this.eyeLight) this.eyeLight.intensity = 0.4 + Math.sin(this._animTime * 4) * 0.2;
    }

    updateZhaoAnim(delta) {
        // 狂乱散发飘动
        if (this.bossHairStrands) this.bossHairStrands.forEach((strand, i) => {
            strand.rotation.x = strand._baseRotX + Math.sin(this._animTime * 3 + i) * 0.3;
            strand.rotation.z = strand._baseRotZ + Math.cos(this._animTime * 2.5 + i * 0.7) * 0.25;
        });
        // 纸人环绕飘动
        if (this.paperDolls) this.paperDolls.forEach((doll, i) => {
            doll._angle += delta * (1.5 + i * 0.2);
            doll.position.x = Math.cos(doll._angle) * 1.4;
            doll.position.z = Math.sin(doll._angle) * 1.4;
            doll.position.y = doll._baseY + Math.sin(this._animTime * 2 + i) * 0.2;
            doll.lookAt(this.mesh.position);
            doll.rotation.y += delta * 2;
        });
        // 背后大纸人飘动
        if (this.backPaperDoll) {
            this.backPaperDoll.rotation.y = Math.sin(this._animTime * 1.5) * 0.15;
            this.backPaperDoll.position.y = Math.sin(this._animTime * 2) * 0.1;
        }
        // 爬行四肢交替摆动（模拟爬行动作）
        if (this.crawlArms) this.crawlArms.forEach((arm, i) => {
            arm.rotation.x = -0.3 + Math.sin(this._animTime * 5 + i * Math.PI) * 0.2;
        });
        if (this.crawlLegs) this.crawlLegs.forEach((leg, i) => {
            leg.rotation.x = Math.sin(this._animTime * 5 + i * Math.PI + Math.PI / 2) * 0.15;
        });
        // 破烂布条飘动
        if (this.bossSkirts) this.bossSkirts.forEach((rag, i) => {
            rag.rotation.x = rag._baseRotX + Math.sin(this._animTime * 3 + i) * 0.15;
            rag.rotation.y = rag._baseRotY + Math.cos(this._animTime * 2 + i * 0.5) * 0.1;
        });
        if (this.eyeLight) this.eyeLight.intensity = 0.5 + Math.abs(Math.sin(this._animTime * 6)) * 0.5;
    }

    updateMirrorAnim(delta) {
        // 镜面碎片浮动旋转
        if (this.mirrorShards) this.mirrorShards.forEach((shard) => {
            shard.rotation.x += delta * 1.5;
            shard.rotation.y += delta * 2;
            shard.position.y = shard._basePos.y + Math.sin(this._animTime * 2 + shard._phase) * 0.08;
        });
        // 镜头自转
        if (this.mirrorHead) {
            this.mirrorHead.rotation.y += delta * 1.2;
            this.mirrorHead.rotation.x += delta * 0.4;
        }
        // 悬浮手臂微动
        if (this.mirrorArms) this.mirrorArms.forEach((arm, i) => {
            arm.rotation.z = (i === 0 ? 0.3 : -0.3) + Math.sin(this._animTime * 2 + i) * 0.1;
            arm.rotation.x = Math.sin(this._animTime * 1.5 + i * 0.5) * 0.08;
        });
        // 下半身碎片飘散旋转
        if (this.legShards) this.legShards.forEach((shard) => {
            shard.rotation.x += delta * 2;
            shard.rotation.y += delta * 1.5;
            shard.position.y = shard._basePos.y + Math.sin(this._animTime * 1.5 + shard._phase) * 0.15;
            // 缓慢向外飘散再收回
            const expandT = Math.sin(this._animTime * 0.8 + shard._phase) * 0.1;
            shard.position.x = shard._basePos.x * (1 + expandT);
            shard.position.z = shard._basePos.z * (1 + expandT);
        });
        // 悬浮镜框旋转
        if (this.floatingMirrors) this.floatingMirrors.forEach((frame, i) => {
            frame._angle += delta * (0.8 + i * 0.1);
            frame.position.x = Math.cos(frame._angle) * 1.8;
            frame.position.z = Math.sin(frame._angle) * 1.8;
            frame.position.y = frame._baseY + Math.sin(this._animTime * 1.5 + frame._angle) * 0.2;
            frame.lookAt(this.mesh.position);
        });
        if (this.eyeLight) this.eyeLight.intensity = 0.4 + Math.sin(this._animTime * 5) * 0.3;
    }

    // ===== 阶段属性应用 =====
    applyPhaseAttributes() {
        const phaseConfig = this.config.phases[this.phase];
        if (!phaseConfig) return;

        // 通用阶段属性
        this.damageResistance = phaseConfig.damageResistance || 0;
        this.weaknessMultiplier = phaseConfig.weaknessMultiplier || 1;

        // 类型专属阶段变化
        if (this.bossType === 'baochai') this.applyBaochaiPhase();
        else if (this.bossType === 'zhaoyiniang') this.applyZhaoPhase();
        else if (this.bossType === 'mirror') this.applyMirrorPhase();
    }

    // 薛宝钗阶段变化
    applyBaochaiPhase() {
        if (this.phase === 0) {
            // 冷香初绽：保持距离，金锁盾完整
            if (this.lockShield) {
                this.lockShield.material.opacity = 0.6;
                this.lockShield.material.emissiveIntensity = 0.5;
            }
            if (this.chestLock) this.chestLock.visible = true;
        } else if (this.phase === 1) {
            // 牡丹怒放：盾更亮，开始弹反
            if (this.lockShield) {
                this.lockShield.material.opacity = 0.8;
                this.lockShield.material.emissiveIntensity = 0.8;
                this.lockShield.material.emissive.set(0xff8800);
            }
            if (this.aura) this.aura.material.color.set(0xff8800);
            if (this.body && this.body.material) {
                this.body.material.emissiveIntensity = 0.3;
            }
            // 牡丹冠变红
            if (this.peonyCrown) this.peonyCrown.traverse(c => {
                if (c.isMesh && c.material && c.material.emissive) {
                    c.material.emissive.set(0xff4400);
                    c.material.emissiveIntensity = 0.6;
                }
            });
        } else if (this.phase === 2) {
            // 金锁将碎：盾碎裂效果，不再弹反但更凶猛
            if (this.lockShield) {
                this.lockShield.material.opacity = 0.3;
                this.lockShield.material.emissiveIntensity = 1.0;
                this.lockShield.material.emissive.set(0xff2200);
                // 盾面出现裂纹效果（通过flatShading变形模拟）
                this.lockShield.geometry = new THREE.TorusGeometry(1.0, 0.08, 4, 4);
            }
            if (this.chestLock) {
                // 金锁挂饰闪烁不稳
                this.chestLock.traverse(c => {
                    if (c.isMesh && c.material && c.material.emissive) {
                        c.material.emissive.set(0xff4400);
                    }
                });
            }
            if (this.aura) this.aura.material.color.set(0xff4444);
            if (this.eyeLight) this.eyeLight.color.set(0xff4444);
            // 飘纱变红
            if (this.floatingVeils) this.floatingVeils.forEach(v => {
                if (v.material) v.material.color.set(0xff4444);
            });
        }
    }

    // 赵姨娘阶段变化
    applyZhaoPhase() {
        if (this.phase === 0) {
            // 妒火初燃：正常移动
            if (this.aura) this.aura.material.color.set(0xff3300);
        } else if (this.phase === 1) {
            // 烈焰焚心：火焰更猛烈
            if (this.aura) {
                this.aura.material.color.set(0xff6600);
                this.aura.material.opacity = 0.6;
            }
            if (this.eyeLight) {
                this.eyeLight.color.set(0xff2200);
                this.eyeLight.intensity = 1.2;
            }
            if (this.fireTrailLight) this.fireTrailLight.intensity = 1.8;
            // 纸人变红
            if (this.paperDolls) this.paperDolls.forEach(d => {
                d.traverse(c => {
                    if (c.isMesh && c.material && c.material.color) {
                        if (c.material.color.getHex() === 0xeeeeee) {
                            c.material.color.set(0xffcccc);
                        }
                    }
                });
            });
            // 背后大纸人眼睛更红
            if (this.backPaperDoll) this.backPaperDoll.traverse(c => {
                if (c.isMesh && c.material && c.material.color && c.material.color.getHex() === 0xff0000) {
                    c.material.emissive = new THREE.Color(0xff0000);
                    c.material.emissiveIntensity = 1.0;
                }
            });
        } else if (this.phase === 2) {
            // 灰飞烟灭：全身暗红，癫狂
            if (this.aura) {
                this.aura.material.color.set(0xcc0000);
                this.aura.material.opacity = 0.7;
            }
            if (this.body && this.body.material) {
                this.body.material.emissive.set(0xff0000);
                this.body.material.emissiveIntensity = 0.6;
            }
            if (this.eyeLight) {
                this.eyeLight.color.set(0xff0000);
                this.eyeLight.intensity = 1.5;
            }
            if (this.fireTrailLight) this.fireTrailLight.intensity = 2.5;
            // 整体前倾加大
            if (this.mesh) this.mesh.rotation.x = -0.3;
        }
    }

    // 镜中魔阶段变化
    applyMirrorPhase() {
        if (this.phase === 0) {
            // 幻境初显：正常紫光
            if (this.aura) this.aura.material.color.set(0x9932cc);
        } else if (this.phase === 1) {
            // 幻境崩塌：深紫+分身
            if (this.aura) {
                this.aura.material.color.set(0x7700aa);
                this.aura.material.opacity = 0.55;
            }
            if (this.eyeLight) {
                this.eyeLight.color.set(0xcc44ff);
                this.eyeLight.intensity = 1.0;
            }
            // 镜面碎片变暗
            if (this.mirrorShards) this.mirrorShards.forEach(s => {
                if (s.material) {
                    s.material.emissiveIntensity = 0.5;
                }
            });
            // 下半身碎片更散
            if (this.legShards) this.legShards.forEach(s => {
                if (s.material) s.material.opacity = 0.4;
            });
        } else if (this.phase === 2) {
            // 心魔显形：深黑紫+疯狂
            if (this.aura) {
                this.aura.material.color.set(0x440066);
                this.aura.material.opacity = 0.65;
            }
            if (this.eyeLight) {
                this.eyeLight.color.set(0xff44ff);
                this.eyeLight.intensity = 1.5;
            }
            if (this.mirrorHead && this.mirrorHead.material) {
                this.mirrorHead.material.emissive.set(0xff00ff);
                this.mirrorHead.material.emissiveIntensity = 0.8;
            }
            // 镜框加速旋转
            if (this.floatingMirrors) this.floatingMirrors.forEach(f => {
                if (f.material) {
                    f.material.emissive.set(0xff44ff);
                    f.material.emissiveIntensity = 0.8;
                }
            });
        }
    }

    // ===== 差异化被动机制 =====
    updatePassives(delta, playerPosition) {
        if (this.bossType === 'baochai') this.updateBaochaiPassive(delta);
        else if (this.bossType === 'zhaoyiniang') this.updateZhaoPassive(delta, playerPosition);
        else if (this.bossType === 'mirror') this.updateMirrorPassive(delta, playerPosition);
    }

    // 宝钗：金锁盾旋转 + 正面减伤标记
    updateBaochaiPassive(delta) {
        if (this.lockShield) {
            const rotSpeed = [2, 3.5, 5][this.phase] || 2;
            this.lockShield.rotation.z += delta * rotSpeed;
            this.lockShield.rotation.y += delta * 1.5;
            if (this.phase >= 1) {
                this.lockShield.material.emissiveIntensity = 0.6 + Math.sin(this._animTime * 4) * 0.2;
            }
            // 阶段3盾闪烁不稳
            if (this.phase >= 2) {
                this.lockShield.material.opacity = 0.2 + Math.sin(this._animTime * 8) * 0.15;
            }
        }
        if (this.lockPattern) {
            this.lockPattern.rotation.z += delta * 0.5;
            if (this.phase >= 2) {
                this.lockPattern.material.opacity = 0.2 + Math.sin(this._animTime * 6) * 0.15;
            }
        }
    }

    // 宝钗正面减伤判定（供 main.js takeDamage 前调用）
    isBlockingFront(playerPosition) {
        if (this.phase !== 1) return false; // 仅阶段2触发正面减伤（阶段3盾碎不再减伤）
        if (!playerPosition) return false;
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        toPlayer.y = 0;
        toPlayer.normalize();
        // BOSS 朝向（mesh.rotation.y）
        const facing = new THREE.Vector3(Math.sin(this.mesh.rotation.y), 0, Math.cos(this.mesh.rotation.y));
        return toPlayer.dot(facing) > 0.5; // 玩家在BOSS正面120°范围内
    }

    // 赵姨娘：移动时留下火焰地面伤害区
    updateZhaoPassive(delta, playerPosition) {
        const trailInterval = [0.15, 0.08, 0.04][this.phase] || 0.15;
        this._fireTrailTimer -= delta;
        if (this._fireTrailTimer <= 0 && this.vfx && !this.isStunned) {
            this._fireTrailTimer = trailInterval;
            const trailDmg = [15, 22, 35][this.phase] || 15;
            if (this.vfx.createFireTrail) {
                this.vfx.createFireTrail(this.position.clone(), trailDmg);
            }
        }
        if (this.fireTrailLight) {
            const flickerIntensity = [0.8, 1.2, 2.0][this.phase] || 0.8;
            this.fireTrailLight.intensity = flickerIntensity + Math.sin(this._animTime * 8) * 0.4;
        }
    }

    // 镜中魔：阶段2+生成幻影分身
    updateMirrorPassive(delta, playerPosition) {
        if (this.phase < 1 || !this.vfx) return;
        const cloneInterval = [999, 3.0, 1.5][this.phase] || 999;
        const cloneDuration = [0, 2, 3][this.phase] || 2;
        this._mirrorCloneTimer -= delta;
        if (this._mirrorCloneTimer <= 0) {
            this._mirrorCloneTimer = cloneInterval;
            const cloneCount = [0, 1, 3][this.phase] || 1;
            for (let i = 0; i < cloneCount; i++) {
                const offset = new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8);
                const clonePos = this.position.clone().add(offset);
                clonePos.y = 1;
                if (this.vfx.createMirrorClone) {
                    this.vfx.createMirrorClone(clonePos, this.config.auraColor, cloneDuration);
                }
            }
        }
    }

    // ===== 攻击AI分发 =====
    decideAction(playerPosition) {
        if (!playerPosition) return null;
        if (this.bossType === 'zhaoyiniang') return this.decideZhaoAction(playerPosition);
        if (this.bossType === 'mirror') return this.decideMirrorAction(playerPosition);
        return this.decideBaochaiAction(playerPosition);
    }

    // 薛宝钗：金锁重击 + 冷香寒气 + 牡丹绽放 + 冲锋
    decideBaochaiAction(playerPosition) {
        const distance = this.position.distanceTo(playerPosition);
        const r = Math.random();

        if (this.phase === 0) {
            // 冷香初绽：风筝战术，保持距离，偶尔近身
            if (distance < 4.5) {
                if (r < 0.35) return this.meleeAttack();
                if (r < 0.65) return this.coldBreathAttack(playerPosition);
                return this.chargeAttack(playerPosition);
            } else if (distance < this.config.coldBreathRange) {
                if (r < 0.55) return this.coldBreathAttack(playerPosition);
                if (r < 0.8) return this.peonyBloomAttack();
                return this.chargeAttack(playerPosition);
            } else {
                return this.coldBreathAttack(playerPosition);
            }
        } else if (this.phase === 1) {
            // 牡丹怒放：更积极进攻，弹反+牡丹绽放+冷香连发
            if (distance < 5) {
                if (r < 0.3) return this.meleeAttack();
                if (r < 0.6) return this.peonyBloomAttack();
                return this.coldBreathAttack(playerPosition);
            } else if (distance < this.config.coldBreathRange) {
                if (r < 0.35) return this.coldBreathAttack(playerPosition);
                if (r < 0.65) return this.peonyBloomAttack();
                if (r < 0.85) return this.chargeAttack(playerPosition);
                return this.coldBreathAttack(playerPosition);
            } else {
                if (r < 0.5) return this.coldBreathAttack(playerPosition);
                return this.chargeAttack(playerPosition);
            }
        } else {
            // 金锁将碎：疯狂近身+双冷香+牡丹连发，不再保持距离
            if (distance < 5) {
                if (r < 0.3) return this.meleeAttack();
                if (r < 0.55) return this.peonyBloomAttack();
                if (r < 0.8) return this.coldBreathAttack(playerPosition);
                return this.chargeAttack(playerPosition);
            } else {
                // 远距离也冲过来
                if (r < 0.4) return this.chargeAttack(playerPosition);
                if (r < 0.7) return this.coldBreathAttack(playerPosition);
                // 双冷香：连续释放两发
                this.coldBreathAttack(playerPosition);
                return this.coldBreathAttack(playerPosition);
            }
        }
    }

    meleeAttack() {
        this.isAttacking = true;
        const cooldowns = {
            baochai: [1.5, 1.2, 0.8],
            zhaoyiniang: [1.3, 1.0, 0.6],
            mirror: [1.4, 1.1, 0.7]
        };
        this.attackCooldown = (cooldowns[this.bossType] || cooldowns.baochai)[this.phase] || 1.5;
        // 赵姨娘利爪声 vs 通用攻击声
        if (this.bossType === 'zhaoyiniang') audio.playClawAttack();
        else audio.playBossAttack();

        this.createGroundWarning(this.position.clone(), this.config.attackRange);

        if (this.bossType === 'zhaoyiniang' && this.crawlArms) {
            // 赵姨娘：右爪挥击
            const arm = this.crawlArms[1];
            arm.rotation.x = -0.8;
            setTimeout(() => { if (arm) arm.rotation.x = -0.3; this.isAttacking = false; }, 300);
        } else if (this.bossType === 'mirror' && this.mirrorArms) {
            // 镜中魔：右臂斩击
            const arm = this.mirrorArms[1];
            arm.rotation.x = -0.6;
            setTimeout(() => { if (arm) arm.rotation.x = 0; this.isAttacking = false; }, 300);
        } else if (this.weapon) {
            this.weapon.rotation.z = -Math.PI / 2;
            setTimeout(() => { if (this.weapon) this.weapon.rotation.z = 0; this.isAttacking = false; }, 300);
        } else {
            setTimeout(() => { this.isAttacking = false; }, 300);
        }

        return {
            type: 'melee',
            damage: this.config.attackDamage * (1 + this.phase * 0.3),
            range: this.config.attackRange
        };
    }

    coldBreathAttack(playerPosition) {
        this.attackCooldown = [2.2, 1.6, 1.0][this.phase] || 2.2;
        audio.playColdBreath();

        const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
        dir.y = 0;
        dir.normalize();

        if (this.vfx) {
            const projPos = this.position.clone();
            projPos.y += 1.2;
            this.vfx.createColdBreath(projPos, dir, this.config.coldBreathDmg * (1 + this.phase * 0.3));
        }

        return null;
    }

    peonyBloomAttack() {
        this.isAttacking = true;
        this.attackCooldown = [3.0, 2.2, 1.4][this.phase] || 3.0;
        audio.playPeonyBloom();

        this.createGroundWarning(this.position.clone(), this.config.peonyBloomRange);

        if (this.peonyCrown) {
            const origScale = this.peonyCrown.scale.x;
            this.peonyCrown.scale.set(1.5, 1.5, 1.5);
            setTimeout(() => { if (this.peonyCrown) this.peonyCrown.scale.set(origScale, origScale, origScale); }, 400);
        }

        if (this.vfx) this.vfx.createPeonyBloom(this.position.clone(), this.config.peonyBloomRange);

        setTimeout(() => { this.isAttacking = false; }, 500);

        return {
            type: 'aoe',
            subtype: 'peony',
            damage: this.config.peonyBloomDmg * (1 + this.phase * 0.3),
            range: this.config.peonyBloomRange,
            root: 0.8
        };
    }

    chargeAttack(playerPosition) {
        if (this.isCharging) return null;
        this.isCharging = true;
        this.attackCooldown = [3.0, 2.2, 1.5][this.phase] || 3.0;
        this.chargeDir = new THREE.Vector3().subVectors(playerPosition, this.position);
        this.chargeDir.y = 0;
        this.chargeDir.normalize();
        this.chargeTimer = 0.8;
        audio.playChargeWarning();
        this.createGroundWarning(this.position.clone(), 2.5);
        if (this.vfx) this.vfx.createChargeWarning(this.position.clone(), this.chargeDir.clone());
        return null;
    }

    // 赵姨娘：利爪 + 纸人召唤 + 妒火吐息 + 诅咒弹
    decideZhaoAction(playerPosition) {
        const distance = this.position.distanceTo(playerPosition);
        const r = Math.random();

        if (this.phase === 0) {
            // 妒火初燃：中距离作战，偶尔召唤纸人
            if (distance < 4) {
                if (r < 0.5) return this.meleeAttack();
                if (r < 0.8) return this.fireBreathAttack(playerPosition);
                return this.summonPaperDolls(playerPosition);
            } else if (distance < 10) {
                if (r < 0.35) return this.summonPaperDolls(playerPosition);
                if (r < 0.7) return this.fireBreathAttack(playerPosition);
                return this.curseAttack(playerPosition);
            } else {
                if (r < 0.6) return this.summonPaperDolls(playerPosition);
                return this.curseAttack(playerPosition);
            }
        } else if (this.phase === 1) {
            // 烈焰焚心：纸人数量翻倍，火焰更频繁
            if (distance < 5) {
                if (r < 0.35) return this.meleeAttack();
                if (r < 0.65) return this.fireBreathAttack(playerPosition);
                return this.summonPaperDolls(playerPosition);
            } else {
                if (r < 0.3) return this.summonPaperDolls(playerPosition);
                if (r < 0.55) return this.fireBreathAttack(playerPosition);
                if (r < 0.8) return this.curseAttack(playerPosition);
                // 连续双诅咒
                this.curseAttack(playerPosition);
                return this.curseAttack(playerPosition);
            }
        } else {
            // 灰飞烟灭：疯狂连招，纸人漫天+火焰+诅咒全开
            if (distance < 5) {
                if (r < 0.25) return this.meleeAttack();
                if (r < 0.5) return this.fireBreathAttack(playerPosition);
                if (r < 0.75) return this.summonPaperDolls(playerPosition);
                return this.chargeAttack(playerPosition);
            } else {
                // 远距离也疯狂输出
                this.summonPaperDolls(playerPosition);
                if (r < 0.4) return this.fireBreathAttack(playerPosition);
                if (r < 0.7) return this.curseAttack(playerPosition);
                return this.chargeAttack(playerPosition);
            }
        }
    }

    summonPaperDolls(playerPosition) {
        this.attackCooldown = [2.5, 1.8, 1.2][this.phase] || 2.5;
        audio.playPaperSummon();

        const count = this.config.paperDollCount + this.phase;
        if (this.vfx) {
            for (let i = 0; i < count; i++) {
                const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2);
                const spawnPos = this.position.clone().add(offset);
                spawnPos.y = 1.2;
                setTimeout(() => {
                    if (this.vfx && this.hp > 0) {
                        this.vfx.createPaperDollProjectile(spawnPos, this.config.paperDollDmg * (1 + this.phase * 0.3));
                    }
                }, i * 200);
            }
        }
        return null;
    }

    fireBreathAttack(playerPosition) {
        this.isAttacking = true;
        this.attackCooldown = [2.8, 2.0, 1.3][this.phase] || 2.8;
        audio.playFireAttack();

        const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
        dir.y = 0;
        dir.normalize();

        // 前方扇形预警
        this.createGroundWarning(this.position.clone().add(dir.clone().multiplyScalar(this.config.fireBreathRange / 2)), this.config.fireBreathRange / 2);

        if (this.vfx) {
            const breathPos = this.position.clone();
            breathPos.y += 1.2;
            this.vfx.createFireBreath(breathPos, dir, this.config.fireBreathRange);
        }

        setTimeout(() => { this.isAttacking = false; }, 600);

        return {
            type: 'cone',
            subtype: 'fire',
            damage: this.config.fireBreathDmg * (1 + this.phase * 0.3),
            range: this.config.fireBreathRange,
            direction: dir,
            angle: Math.PI / 3,
            position: this.position.clone()
        };
    }

    curseAttack(playerPosition) {
        this.attackCooldown = [2.0, 1.5, 0.9][this.phase] || 2.0;
        audio.playBossProjectile();

        const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
        dir.y = 0;
        dir.normalize();

        if (this.vfx) {
            const projPos = this.position.clone();
            projPos.y += 1.2;
            this.vfx.createCurseProjectile(projPos, dir, this.config.curseDmg * (1 + this.phase * 0.3));
        }
        return null;
    }

    // 镜中魔：镜刃斩 + 镜面弹幕 + 瞬移突袭 + 幻境碎裂
    decideMirrorAction(playerPosition) {
        const distance = this.position.distanceTo(playerPosition);
        const r = Math.random();

        if (this.phase === 0) {
            // 幻境初显：以弹幕为主，偶尔瞬移
            if (distance < 4) {
                if (r < 0.4) return this.meleeAttack();
                if (r < 0.7) return this.teleportStrikeAttack(playerPosition);
                return this.mirrorBarrageAttack();
            } else if (distance < 12) {
                if (r < 0.5) return this.mirrorBarrageAttack();
                if (r < 0.8) return this.teleportStrikeAttack(playerPosition);
                return this.meleeAttack();
            } else {
                if (r < 0.7) return this.mirrorBarrageAttack();
                return this.teleportStrikeAttack(playerPosition);
            }
        } else if (this.phase === 1) {
            // 幻境崩塌：频繁瞬移+弹幕，分身干扰
            if (distance < 5) {
                if (r < 0.3) return this.meleeAttack();
                if (r < 0.6) return this.teleportStrikeAttack(playerPosition);
                return this.mirrorBarrageAttack();
            } else {
                if (r < 0.35) return this.mirrorBarrageAttack();
                if (r < 0.65) return this.teleportStrikeAttack(playerPosition);
                if (r < 0.85) return this.mirrorBarrageAttack();
                return this.curseAttack(playerPosition);
            }
        } else {
            // 心魔显形：终极连招，弹幕+瞬移+碎裂全开
            if (r < 0.15 && this.attackCooldown <= 0) {
                return this.shatterAttack();
            }
            if (distance < 5) {
                if (r < 0.25) return this.meleeAttack();
                if (r < 0.5) return this.teleportStrikeAttack(playerPosition);
                if (r < 0.75) return this.mirrorBarrageAttack();
                return this.shatterAttack();
            } else {
                // 远距离疯狂弹幕+瞬移
                if (r < 0.3) return this.mirrorBarrageAttack();
                if (r < 0.55) return this.teleportStrikeAttack(playerPosition);
                if (r < 0.8) {
                    // 双弹幕
                    this.mirrorBarrageAttack();
                    return this.mirrorBarrageAttack();
                }
                return this.shatterAttack();
            }
        }
    }

    mirrorBarrageAttack() {
        this.isAttacking = true;
        this.attackCooldown = [2.5, 1.8, 1.0][this.phase] || 2.5;
        audio.playMirrorShatter();

        const count = this.config.mirrorBarrageCount + this.phase * 2;
        if (this.vfx) {
            const projPos = this.position.clone();
            projPos.y += 1.3;
            this.vfx.createMirrorBarrage(projPos, count, this.config.mirrorBarrageDmg * (1 + this.phase * 0.3), this.config.auraColor);
        }

        setTimeout(() => { this.isAttacking = false; }, 400);
        return null;
    }

    teleportStrikeAttack(playerPosition) {
        if (this._teleportCooldown > 0) return this.mirrorBarrageAttack();
        this._teleportCooldown = [4.0, 2.5, 1.5][this.phase] || 4.0;
        this.attackCooldown = [2.0, 1.5, 0.8][this.phase] || 2.0;
        audio.playMirrorShatter();

        // 瞬移前在原位留下镜片爆裂
        if (this.vfx) {
            this.vfx.createMirrorShatter(this.position.clone(), this.config.auraColor);
        }

        // 瞬移到玩家身后
        const behindDir = new THREE.Vector3().subVectors(this.position, playerPosition);
        behindDir.y = 0;
        behindDir.normalize();
        const targetPos = playerPosition.clone().add(behindDir.multiplyScalar(3));
        this.position.set(targetPos.x, 1.0, targetPos.z);

        if (this.vfx) {
            this.vfx.createMirrorShatter(this.position.clone(), this.config.auraColor);
            this.vfx.triggerScreenShake(0.3, 200);
        }

        this.isAttacking = true;
        setTimeout(() => { this.isAttacking = false; }, 300);

        return {
            type: 'teleport',
            damage: this.config.teleportDmg * (1 + this.phase * 0.3),
            range: 4
        };
    }

    shatterAttack() {
        this.isAttacking = true;
        this.attackCooldown = 5;
        audio.playMirrorShatter();
        audio.playPhaseChange();

        this.createGroundWarning(this.position.clone(), this.config.shatterRange);

        if (this.vfx) {
            this.vfx.createMirrorShatter(this.position.clone(), this.config.auraColor);
            this.vfx.createUltimateEffect(this.position.clone());
            this.vfx.triggerScreenShake(0.6, 600);
        }

        setTimeout(() => { this.isAttacking = false; }, 700);

        return {
            type: 'aoe',
            subtype: 'shatter',
            damage: this.config.shatterDmg,
            range: this.config.shatterRange
        };
    }

    takeDamage(damage) {
        if (this.hp <= 0) return false;
        const resistedDamage = damage * (1 - this.damageResistance) * this.weaknessMultiplier;
        let actualDmg = resistedDamage;
        // 虚弱状态：1.5倍伤害
        if (this.isWeakened) actualDmg *= 1.5;
        // 金锁柱减伤
        const reduction = this.getLockPillarDamageReduction ? this.getLockPillarDamageReduction() : 0;
        if (reduction > 0) actualDmg *= (1 - reduction);
        this.hp -= actualDmg;

        if (Math.random() < 0.2 && !this.isCharging && !this.isStunned) {
            const jumpDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            jumpDir.y = 0;
            jumpDir.normalize().multiplyScalar(3);
            this.position.add(jumpDir);
            this.mesh.position.copy(this.position);
        }

        this.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.color) {
                const orig = child.material.color.clone();
                child.material.color.set(0xffffff);
                setTimeout(() => { try { child.material.color.copy(orig); } catch(e) {} }, 80);
            }
        });

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return true;
        }
        return false;
    }

    die() {
        audio.playVictory();
        this._dying = true;
        const dieAnim = () => {
            if (!this._dying || !this.mesh) return;
            this.mesh.rotation.z += 0.1;
            this.mesh.position.y -= 0.1;
            this.mesh.scale.multiplyScalar(0.95);
            if (this.mesh.scale.x > 0.1) {
                requestAnimationFrame(dieAnim);
            } else {
                this.scene.remove(this.mesh);
            }
        };
        dieAnim();
    }

    respawn() {
        this.hp = this.maxHp;
        this.phase = 0;
        this.lastPhase = 0;
        this.position.set(0, 1.0, -15);
        this.isCharging = false;
        this.isAttacking = false;
        this.isStunned = false;
        this.attackCooldown = 0;
        this._teleportCooldown = 0;
        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        this.scene.add(this.mesh);
    }
}
