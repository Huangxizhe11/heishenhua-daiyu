class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.hp = CONFIG.player.maxHp;
        this.mp = CONFIG.player.maxMp;
        this.position = new THREE.Vector3(0, CONFIG.player.height / 2, 8);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.isDashing = false;
        this.isInvincible = false;
        this.canDash = true;
        this.cooldowns = { attack: 0, skill: 0, ultimate: 0, charm: 0 };
        this.combo = 0;
        this.comboTimer = 0;
        this.slowTimer = 0;   // 减速状态（冷香寒气）
        this.rootTimer = 0;   // 禁锢状态（牡丹绽放）
        this.createModel();
    }

    createModel() {
        const group = new THREE.Group();

        // 淡淡发光光环 - 腰部
        const auraGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: 0xc4a8ff, transparent: true, opacity: 0.35 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 0.5;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // 第二层光环 - 更大更淡
        const aura2Geo = new THREE.TorusGeometry(0.7, 0.02, 8, 32);
        const aura2Mat = new THREE.MeshBasicMaterial({ color: 0xffb6c1, transparent: true, opacity: 0.2 });
        this.aura2 = new THREE.Mesh(aura2Geo, aura2Mat);
        this.aura2.position.y = 0.3;
        this.aura2.rotation.x = Math.PI / 2;
        group.add(this.aura2);

        // 汉服裙摆 - 多层半透明飘逸cone
        const skirtLayers = [
            { r: 0.25, h: 0.9, color: 0x8b5cf6, opacity: 0.9 },
            { r: 0.38, h: 0.75, color: 0x9370db, opacity: 0.6 },
            { r: 0.50, h: 0.60, color: 0xb19cd9, opacity: 0.4 },
            { r: 0.58, h: 0.48, color: 0xdda0dd, opacity: 0.25 }
        ];
        this.skirtLayers = [];
        skirtLayers.forEach((layer, i) => {
            const geo = new THREE.ConeGeometry(layer.r, layer.h, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: layer.color, roughness: 0.5, metalness: 0.15,
                transparent: true, opacity: layer.opacity, side: THREE.DoubleSide
            });
            const skirt = new THREE.Mesh(geo, mat);
            skirt.position.y = 0.12 - i * 0.04;
            skirt.rotation.x = Math.PI;
            skirt.castShadow = i === 0;
            this.skirtLayers.push(skirt);
            group.add(skirt);
        });

        // 身体 - 汉服上衣
        const bodyGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.6, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9370db, roughness: 0.5, metalness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // 腰带
        const beltGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.06, 12);
        const beltMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.position.y = 0.27;
        group.add(belt);

        // 肩部/衣领
        const collarGeo = new THREE.BoxGeometry(0.52, 0.08, 0.28);
        const collarMat = new THREE.MeshStandardMaterial({ color: 0xb088f9, roughness: 0.5, metalness: 0.15 });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.position.y = 0.88;
        group.add(collar);

        // 手臂 - 两只
        for (let i = 0; i < 2; i++) {
            const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.5, 8);
            const armMat = new THREE.MeshStandardMaterial({ color: 0x9370db, roughness: 0.5, metalness: 0.15 });
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.position.set(-0.3 + i * 0.6, 0.55, 0);
            arm.rotation.z = (i === 0 ? 1 : -1) * 0.3;
            group.add(arm);
        }

        // 头部 - 头身比 1:6, 总身高约1.35, 头半径0.225
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.35, metalness: 0.05 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.15;
        head.castShadow = true;
        group.add(head);

        // 头发 - 大量发束, 头顶发髻
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.15 });
        const hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), hairMat);
        hairBase.position.set(0, 1.2, -0.04);
        hairBase.scale.set(1, 0.9, 1.15);
        group.add(hairBase);

        // 发髻
        const bunGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const bun = new THREE.Mesh(bunGeo, hairMat);
        bun.position.set(0, 1.42, 0);
        bun.scale.set(1.2, 0.8, 1);
        group.add(bun);

        // 长发 - 多条弯曲cylinder飘动感
        this.hairStrands = [];
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 0.6 - Math.PI * 0.3;
            const strandGeo = new THREE.CylinderGeometry(0.02, 0.008, 0.8 + i * 0.1, 6);
            const strand = new THREE.Mesh(strandGeo, hairMat);
            strand.position.set(
                Math.sin(angle) * 0.12,
                0.8 - i * 0.05,
                -0.2 - i * 0.03
            );
            strand.rotation.x = 0.5 + i * 0.08;
            strand.rotation.z = Math.sin(angle) * 0.3;
            this.hairStrands.push(strand);
            group.add(strand);
        }

        // 两条飘带 - 腰后
        this.ribbons = [];
        for (let i = 0; i < 2; i++) {
            const ribbonGeo = new THREE.CylinderGeometry(0.025, 0.01, 1.0, 6);
            const ribbonMat = new THREE.MeshStandardMaterial({
                color: 0xdda0dd, roughness: 0.4, metalness: 0.1,
                transparent: true, opacity: 0.7
            });
            const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
            ribbon.position.set(-0.1 + i * 0.2, 0.3, -0.35);
            ribbon.rotation.x = 0.6;
            ribbon.rotation.z = (i - 0.5) * 0.35;
            this.ribbons.push(ribbon);
            group.add(ribbon);
        }

        // 眼睛 - 大眼 + 白色高光
        const eyeGeo = new THREE.SphereGeometry(0.05, 12, 12);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.17, 0.19);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.17, 0.19);
        group.add(rightEye);

        // 眼睛白色高光
        const hlGeo = new THREE.SphereGeometry(0.018, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const hlL = new THREE.Mesh(hlGeo, hlMat);
        hlL.position.set(-0.065, 1.185, 0.23);
        group.add(hlL);
        const hlR = new THREE.Mesh(hlGeo, hlMat);
        hlR.position.set(0.095, 1.185, 0.23);
        group.add(hlR);

        // 眉毛 - 愁眉
        const browGeo = new THREE.BoxGeometry(0.09, 0.015, 0.02);
        const browMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-0.08, 1.25, 0.2);
        leftBrow.rotation.z = 0.25;
        group.add(leftBrow);
        const rightBrow = new THREE.Mesh(browGeo, browMat);
        rightBrow.position.set(0.08, 1.25, 0.2);
        rightBrow.rotation.z = -0.25;
        group.add(rightBrow);

        // 嘴巴
        const mouthGeo = new THREE.BoxGeometry(0.05, 0.012, 0.01);
        const mouthMat = new THREE.MeshBasicMaterial({ color: 0xcc6666 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 1.1, 0.21);
        group.add(mouth);

        // 花锄 (武器)
        this.weapon = this.createWeapon();
        this.weapon.position.set(0.5, 0.55, 0);
        group.add(this.weapon);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createWeapon() {
        const group = new THREE.Group();

        // 木质手柄 - 竹节纹理
        const handleGeo = new THREE.CylinderGeometry(0.025, 0.03, 1.8, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7, metalness: 0.25 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = Math.PI / 4;
        group.add(handle);

        // 竹节装饰环
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.035, 0.006, 6, 12);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0x6b3410, roughness: 0.6, metalness: 0.3 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(0, -0.4 + i * 0.4, 0);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        }

        // 刃部 - 弧形锄刃
        const bladeGeo = new THREE.BoxGeometry(0.4, 0.3, 0.04);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.primary, roughness: 0.15, metalness: 0.85,
            emissive: CONFIG.colors.primary, emissiveIntensity: 0.3
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(-0.3, 0.8, 0);
        blade.rotation.z = -Math.PI / 4;
        group.add(blade);

        // 刃口光泽边缘 - 更亮的金属边
        const edgeGeo = new THREE.BoxGeometry(0.42, 0.02, 0.05);
        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0xff6680, roughness: 0.05, metalness: 0.95,
            emissive: 0xff6680, emissiveIntensity: 0.6
        });
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.position.set(-0.3, 0.96, 0);
        edge.rotation.z = -Math.PI / 4;
        group.add(edge);

        // 花朵装饰 - 刃部顶端
        const petalMat = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.petal, roughness: 0.4, metalness: 0.1,
            emissive: CONFIG.colors.petal, emissiveIntensity: 0.2, transparent: true, opacity: 0.85
        });
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petalGeo = new THREE.SphereGeometry(0.04, 8, 8);
            const petal = new THREE.Mesh(petalGeo, petalMat);
            petal.position.set(
                -0.3 + Math.cos(angle) * 0.08,
                0.8 + Math.sin(angle) * 0.08,
                0.03
            );
            petal.scale.set(1, 0.5, 0.3);
            group.add(petal);
        }
        // 花蕊
        const coreGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.3, metalness: 0.7,
            emissive: 0xffd700, emissiveIntensity: 0.4
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.set(-0.3, 0.8, 0.04);
        group.add(core);

        return group;
    }

    update(delta, keys, cameraAngle) {
        if (this.hp <= 0) return;

        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) this.cooldowns[key] -= delta;
        });

        // 状态效果计时
        if (this.slowTimer > 0) this.slowTimer -= delta;
        if (this.rootTimer > 0) this.rootTimer -= delta;

        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        // 相机方向向量
        const forward = new THREE.Vector3(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
        const right = new THREE.Vector3(Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));

        // 输入方向
        const inputDir = new THREE.Vector3();
        if (keys['w'] || keys['arrowup']) inputDir.add(forward);
        if (keys['s'] || keys['arrowdown']) inputDir.sub(forward);
        if (keys['a'] || keys['arrowleft']) inputDir.sub(right);
        if (keys['d'] || keys['arrowright']) inputDir.add(right);

        // 禁锢状态：无法移动
        const isRooted = this.rootTimer > 0;
        // 减速状态：移速减半
        const speedMul = this.slowTimer > 0 ? 0.45 : 1;

        if (this.isDashing) {
            // 翻滚中不处理移动
        } else if (isRooted) {
            // 禁锢：速度归零
            this.velocity.x *= 0.5;
            this.velocity.z *= 0.5;
        } else if (inputDir.lengthSq() > 0) {
            // 有输入 → 加速
            inputDir.normalize();
            const targetSpeed = CONFIG.player.moveSpeed * speedMul;
            this.velocity.x += (inputDir.x * targetSpeed - this.velocity.x) * Math.min(1, delta * 12);
            this.velocity.z += (inputDir.z * targetSpeed - this.velocity.z) * Math.min(1, delta * 12);
        } else {
            // 无输入 → 减速（摩擦力）
            this.velocity.x *= Math.max(0, 1 - delta * 10);
            this.velocity.z *= Math.max(0, 1 - delta * 10);
            if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
            if (Math.abs(this.velocity.z) < 0.1) this.velocity.z = 0;
        }

        // 应用速度
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;

        // 边界限制
        const limit = CONFIG.world.size * 0.45;
        this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
        this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

        // 翻滚
        if (keys[' '] && this.canDash && !this.isDashing) {
            const dashDir = inputDir.lengthSq() > 0 ? inputDir.normalize() : forward.clone();
            this.dash(dashDir);
        }

        // 位置更新
        this.mesh.position.x = this.position.x;
        this.mesh.position.z = this.position.z;

        // 移动动画
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (speed > 0.5 && !this.isDashing) {
            // 走路 - 身体前倾 + 上下摆动
            const walkCycle = Date.now() * 0.008;
            this.mesh.position.y = CONFIG.player.height / 2 + Math.abs(Math.sin(walkCycle)) * 0.06;
            // 身体微微前倾
            const tiltAmount = Math.min(speed / CONFIG.player.moveSpeed, 1) * 0.08;
            this.mesh.rotation.x = -tiltAmount * Math.cos(cameraAngle);
            this.mesh.rotation.z = Math.sin(walkCycle) * 0.03;
        } else if (!this.isDashing) {
            // 站立 - 呼吸浮动
            this.mesh.position.y = CONFIG.player.height / 2 + Math.sin(Date.now() * 0.002) * 0.02;
            this.mesh.rotation.x *= 0.9;
            this.mesh.rotation.z *= 0.9;
        }

        // 武器动画 - 只在攻击冷却时才旋转，否则轻轻晃动
        if (this.weapon) {
            if (this.cooldowns.attack < 0.1 && this.cooldowns.skill < 0.1) {
                // 站立/走路时武器轻微晃动
                this.weapon.rotation.z = Math.sin(Date.now() * 0.003) * 0.1;
            }
        }

        return inputDir;
    }

    setInvincibleVisual(on) {
        if (!this.mesh) return;
        this.mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                try {
                    if (on) {
                        child.material._oe = child.material.emissive.getHex();
                        child.material._oei = child.material.emissiveIntensity;
                        child.material.emissive.setHex(0xffffff);
                        child.material.emissiveIntensity = 0.8;
                    } else {
                        child.material.emissive.setHex(child.material._oe || 0);
                        child.material.emissiveIntensity = child.material._oei || 0;
                    }
                } catch(e) {}
            }
        });
    }

    dash(direction) {
        if (!this.canDash || this.mp < 20) return;
        this.isDashing = true;
        this.isInvincible = true;
        this.canDash = false;
        this.mp -= 20;

        this.setInvincibleVisual(true);
        const dashDir = direction.clone().normalize();
        const startPos = this.position.clone();
        const startTime = Date.now();
        const dashDur = CONFIG.player.dashDuration * 1000;

        audio.playDash();

        const dashAnim = () => {
            const progress = Math.min(1, (Date.now() - startTime) / dashDur);
            const eased = 1 - Math.pow(1 - progress, 2);
            this.position.x = startPos.x + dashDir.x * CONFIG.player.dashSpeed * CONFIG.player.dashDuration * eased;
            this.position.z = startPos.z + dashDir.z * CONFIG.player.dashSpeed * CONFIG.player.dashDuration * eased;
            this.mesh.rotation.x = progress * Math.PI * 2;

            if (progress < 1) {
                requestAnimationFrame(dashAnim);
            } else {
                this.isDashing = false;
                this.mesh.rotation.x = 0;
                this.velocity.x = dashDir.x * CONFIG.player.moveSpeed * 0.5;
                this.velocity.z = dashDir.z * CONFIG.player.moveSpeed * 0.5;
                setTimeout(() => {
                    this.isInvincible = false;
                    this.setInvincibleVisual(false);
                }, CONFIG.player.invincibleDuration * 1000);
                setTimeout(() => { this.canDash = true; }, CONFIG.player.dashCooldown * 1000);
            }
        };
        dashAnim();
    }

    attack() {
        if (this.cooldowns.attack > 0 || this.hp <= 0) return null;
        this.cooldowns.attack = SKILLS.normal.cooldown;
        this.combo++;
        this.comboTimer = 2;

        audio.playAttack();
        this.weapon.rotation.z = -Math.PI / 2;
        setTimeout(() => { this.weapon.rotation.z = 0; }, 200);

        return {
            type: 'normal',
            damage: SKILLS.normal.damage * (1 + this.combo * 0.1),
            range: SKILLS.normal.range,
            position: this.position.clone(),
            direction: this.getDirection()
        };
    }

    useSkill() {
        if (this.cooldowns.skill > 0 || this.mp < SKILLS.skill.mpCost || this.hp <= 0) return null;
        this.cooldowns.skill = SKILLS.skill.cooldown;
        this.mp -= SKILLS.skill.mpCost;
        audio.playSkill();

        return {
            type: 'skill',
            damage: SKILLS.skill.damage,
            range: SKILLS.skill.range,
            position: this.position.clone(),
            direction: this.getDirection()
        };
    }

    useUltimate() {
        if (this.cooldowns.ultimate > 0 || this.mp < SKILLS.ultimate.mpCost || this.hp <= 0) return null;
        this.cooldowns.ultimate = SKILLS.ultimate.cooldown;
        this.mp -= SKILLS.ultimate.mpCost;
        audio.playUltimate();

        return {
            type: 'ultimate',
            damage: SKILLS.ultimate.damage,
            range: SKILLS.ultimate.range,
            position: this.position.clone()
        };
    }

    useCharm() {
        if (this.cooldowns.charm > 0 || this.hp <= 0) return null;
        this.cooldowns.charm = SKILLS.charm.cooldown;

        this.heal(SKILLS.charm.healAmount);
        this.restoreMp(SKILLS.charm.mpRestore);
        audio.playCharm();

        return {
            type: 'charm',
            position: this.position.clone()
        };
    }

    getDirection() {
        // 返回角色面朝的方向（远离相机 = 十字准星方向）
        return new THREE.Vector3(
            Math.sin(this.mesh.rotation.y),
            0,
            Math.cos(this.mesh.rotation.y)
        ).normalize();
    }

    getDirectionTo(target) {
        return new THREE.Vector3().subVectors(target, this.position).normalize();
    }

    takeDamage(damage) {
        if (this.isInvincible || this.hp <= 0) return;
        this.hp -= damage;
        this.isInvincible = true;
        audio.playHit();

        this.mesh.position.y += 0.5;
        setTimeout(() => { this.mesh.position.y = CONFIG.player.height / 2; }, 200);

        this.mesh.children.forEach(child => {
            if (child.material && child.material.color) {
                const orig = child.material.color.clone();
                child.material.color.set(0xff2222);
                setTimeout(() => { child.material.color.copy(orig); }, 150);
            }
        });

        setTimeout(() => { this.isInvincible = false; }, CONFIG.player.invincibleDuration * 1000);

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        audio.playDefeat();
        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.y = 0.3;
    }

    respawn() {
        this.hp = CONFIG.player.maxHp;
        this.mp = CONFIG.player.maxMp;
        this.position.set(0, CONFIG.player.height / 2, 8);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(0, 0, 0);
        this.cooldowns = { attack: 0, skill: 0, ultimate: 0, charm: 0 };
        this.combo = 0;
        this.isDashing = false;
        this.canDash = true;
        this.isInvincible = false;
        this.slowTimer = 0;
        this.rootTimer = 0;
    }

    heal(amount) { this.hp = Math.min(CONFIG.player.maxHp, this.hp + amount); }
    restoreMp(amount) { this.mp = Math.min(CONFIG.player.maxMp, this.mp + amount); }

    // 减速（冷香寒气）
    applySlow(duration) { this.slowTimer = Math.max(this.slowTimer, duration); }
    // 禁锢（牡丹绽放）
    applyRoot(duration) { this.rootTimer = Math.max(this.rootTimer, duration); }

    isSlowed() { return this.slowTimer > 0; }
    isRooted() { return this.rootTimer > 0; }
}
