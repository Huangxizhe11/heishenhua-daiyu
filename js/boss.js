class Boss {
    constructor(scene, config) {
        this.scene = scene;
        this.mesh = null;
        this.config = config || LEVELS[0].boss;
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
        this.phaseDialogues = config.phaseDialogues || [
            '尔等蝼蚁，岂能撼动本座！',
            '既然执迷不悟，便让你见识真正的力量！',
            '玉石俱焚，也在所不惜！'
        ];
        this.position.set(0, 1.0, -15);
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.createModel();
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createModel() {
        const c = this.config;
        const group = new THREE.Group();

        // 脚下光环效果
        const groundRingGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 32);
        const groundRingMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.5 });
        this.groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        this.groundRing.position.y = 0.05;
        this.groundRing.rotation.x = Math.PI / 2;
        group.add(this.groundRing);

        // 脚下光环 - 第二层
        const groundRing2Geo = new THREE.TorusGeometry(1.0, 0.05, 8, 32);
        const groundRing2Mat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.3 });
        this.groundRing2 = new THREE.Mesh(groundRing2Geo, groundRing2Mat);
        this.groundRing2.position.y = 0.05;
        this.groundRing2.rotation.x = Math.PI / 2;
        group.add(this.groundRing2);

        // 护身光环 - 大且显眼
        const auraGeo = new THREE.TorusGeometry(1.8, 0.15, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.4 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 1.2;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // 第二层光环
        const aura2Geo = new THREE.TorusGeometry(2.2, 0.08, 8, 32);
        const aura2Mat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.2 });
        this.aura2 = new THREE.Mesh(aura2Geo, aura2Mat);
        this.aura2.position.y = 1.6;
        this.aura2.rotation.x = Math.PI / 2;
        group.add(this.aura2);

        // 身体 - 更高大 (总高2.5+)
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.65, 2.0, 12);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: c.bodyColor, roughness: 0.3, metalness: 0.7,
            emissive: c.bodyColor, emissiveIntensity: 0.15
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.0;
        body.castShadow = true;
        group.add(body);
        this.body = body;

        // 华服下摆 - 多层飘逸
        const skirtDefs = [
            { r: 0.55, h: 1.4, color: c.skirtColor, opacity: 0.9 },
            { r: 0.72, h: 1.1, color: c.skirtColor, opacity: 0.55 },
            { r: 0.88, h: 0.85, color: c.auraColor, opacity: 0.3 },
            { r: 1.0, h: 0.65, color: c.auraColor, opacity: 0.15 }
        ];
        this.bossSkirts = [];
        skirtDefs.forEach((def, i) => {
            const geo = new THREE.ConeGeometry(def.r, def.h, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: def.color, roughness: 0.4, metalness: 0.4,
                emissive: def.color, emissiveIntensity: 0.08,
                transparent: true, opacity: def.opacity, side: THREE.DoubleSide
            });
            const skirt = new THREE.Mesh(geo, mat);
            skirt.position.y = 0.5 - i * 0.05;
            skirt.rotation.x = Math.PI;
            skirt.castShadow = i === 0;
            this.bossSkirts.push(skirt);
            group.add(skirt);
        });

        // 肩甲
        for (let i = 0; i < 2; i++) {
            const shoulderGeo = new THREE.SphereGeometry(0.2, 10, 10);
            const shoulderMat = new THREE.MeshStandardMaterial({
                color: c.weaponColor, roughness: 0.2, metalness: 0.85,
                emissive: c.weaponColor, emissiveIntensity: 0.3
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

        // 发髻 - 更精致
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7, metalness: 0.15 });
        const hairGeo = new THREE.SphereGeometry(0.38, 16, 16);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 2.58, -0.06);
        hair.scale.set(1, 0.85, 1.15);
        group.add(hair);

        // 高发髻
        const topBunGeo = new THREE.SphereGeometry(0.15, 12, 12);
        const topBun = new THREE.Mesh(topBunGeo, hairMat);
        topBun.position.set(0, 2.85, 0);
        topBun.scale.set(1.1, 0.9, 1);
        group.add(topBun);

        // 长发飘带 - 更长更多
        this.bossHairStrands = [];
        for (let i = 0; i < 4; i++) {
            const strandGeo = new THREE.CylinderGeometry(0.035, 0.012, 1.4 + i * 0.2, 8);
            const strand = new THREE.Mesh(strandGeo, hairMat);
            strand.position.set(-0.15 + i * 0.1, 1.6, -0.35);
            strand.rotation.x = 0.5 + i * 0.08;
            strand.rotation.z = (i - 1.5) * 0.2;
            this.bossHairStrands.push(strand);
            group.add(strand);
        }

        // 飘带飘纱 - 多个半透明平面围绕身体旋转
        this.floatingVeils = [];
        for (let i = 0; i < 6; i++) {
            const veilGeo = new THREE.PlaneGeometry(0.6, 1.2);
            const veilMat = new THREE.MeshStandardMaterial({
                color: c.auraColor, roughness: 0.3, metalness: 0.1,
                transparent: true, opacity: 0.12, side: THREE.DoubleSide
            });
            const veil = new THREE.Mesh(veilGeo, veilMat);
            const angle = (i / 6) * Math.PI * 2;
            veil.position.set(
                Math.sin(angle) * 1.2,
                1.5 + Math.sin(i) * 0.3,
                Math.cos(angle) * 1.2
            );
            veil.lookAt(0, 1.5, 0);
            veil._angle = angle;
            veil._baseY = veil.position.y;
            this.floatingVeils.push(veil);
            group.add(veil);
        }

        // 金钗/头饰
        const pinGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.5, 8);
        const pinMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.2, metalness: 0.9,
            emissive: c.weaponColor, emissiveIntensity: 0.5
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(0, 3.05, 0);
        pin.rotation.z = Math.PI / 4;
        group.add(pin);

        // 武器
        this.weapon = this.createWeapon(c);
        this.weapon.position.set(0.9, 1.3, 0);
        group.add(this.weapon);

        // 眼睛 - 大且发光
        const eyeGeo = new THREE.SphereGeometry(0.07, 12, 12);
        const eyeMat = new THREE.MeshBasicMaterial({ color: c.auraColor });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.13, 2.48, 0.31);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.13, 2.48, 0.31);
        group.add(rightEye);

        // 眼睛白色高光
        const hlGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const hlL = new THREE.Mesh(hlGeo, hlMat);
        hlL.position.set(-0.11, 2.5, 0.37);
        group.add(hlL);
        const hlR = new THREE.Mesh(hlGeo, hlMat);
        hlR.position.set(0.15, 2.5, 0.37);
        group.add(hlR);

        // 眼睛点光源
        this.eyeLight = new THREE.PointLight(c.auraColor, 0.5, 3);
        this.eyeLight.position.set(0, 2.48, 0.4);
        group.add(this.eyeLight);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createWeapon(c) {
        const group = new THREE.Group();

        // 金锁/武器主体 - 更大更复杂
        const lockGeo = new THREE.BoxGeometry(0.55, 0.7, 0.18);
        const lockMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.15, metalness: 0.92,
            emissive: c.weaponColor, emissiveIntensity: 0.55
        });
        const lock = new THREE.Mesh(lockGeo, lockMat);
        group.add(lock);

        // 金锁边框装饰
        const frameGeo = new THREE.BoxGeometry(0.62, 0.78, 0.12);
        const frameMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.1, metalness: 0.95,
            emissive: c.weaponColor, emissiveIntensity: 0.7
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.z = -0.02;
        group.add(frame);

        // 上方提环
        const ringGeo = new THREE.TorusGeometry(0.22, 0.03, 8, 16);
        const ringMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.15, metalness: 0.9,
            emissive: c.weaponColor, emissiveIntensity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 0.48;
        group.add(ring);

        // 侧边飘纱
        for (let i = 0; i < 2; i++) {
            const ribbonGeo = new THREE.PlaneGeometry(0.15, 0.8);
            const ribbonMat = new THREE.MeshStandardMaterial({
                color: c.auraColor, roughness: 0.3, metalness: 0.1,
                transparent: true, opacity: 0.3, side: THREE.DoubleSide
            });
            const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
            ribbon.position.set(-0.35 + i * 0.7, -0.1, 0);
            ribbon.rotation.z = (i === 0 ? 0.3 : -0.3);
            group.add(ribbon);
        }

        // 武器表面花纹装饰
        const crossGeo = new THREE.BoxGeometry(0.35, 0.03, 0.2);
        const crossMat = new THREE.MeshStandardMaterial({
            color: 0xffd700, roughness: 0.1, metalness: 0.95,
            emissive: 0xffd700, emissiveIntensity: 0.4
        });
        const cross1 = new THREE.Mesh(crossGeo, crossMat);
        cross1.position.z = 0.1;
        group.add(cross1);
        const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.2), crossMat);
        cross2.position.z = 0.1;
        group.add(cross2);

        return group;
    }

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

        // 悬浮浮动效果 - Boss上下轻微浮动
        if (!this.isStunned) {
            this.position.y = 1.0 + Math.sin(Date.now() * 0.0015) * 0.25;
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

        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= this.config.phases[2].hpThreshold) this.phase = 2;
        else if (hpPercent <= this.config.phases[1].hpThreshold) this.phase = 1;

        if (this.phase !== this.lastPhase) {
            this.lastPhase = this.phase;
            audio.playPhaseChange();
            if (this.vfx) {
                this.vfx.createUltimateEffect(this.position.clone());
                this.vfx.createPhaseRing(this.position.clone(), this.config.auraColor);
            }
            if (this.onPhaseChange) this.onPhaseChange(this.phase);
            if (this.vfx && this.phaseDialogues[this.phase]) {
                this.vfx.createFloatingDialogue(
                    this.position.clone(),
                    this.phaseDialogues[this.phase],
                    this.config.auraColor
                );
            }
        }

        if (playerPosition) {
            const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
            dir.y = 0;
            this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }

        if (this.aura) {
            const phaseColors = [this.config.auraColor, 0xff8800, 0xff4444];
            this.aura.material.color.set(phaseColors[this.phase]);
            this.aura.rotation.z += delta * (2 + this.phase);
            const s = 1 + Math.sin(Date.now() * 0.003) * 0.1;
            this.aura.scale.set(s, s, 1);
        }

        // 脚下光环旋转
        if (this.groundRing) {
            this.groundRing.rotation.z += delta * 0.8;
            const gr = 1 + Math.sin(Date.now() * 0.002) * 0.15;
            this.groundRing.scale.set(gr, gr, 1);
        }
        if (this.groundRing2) {
            this.groundRing2.rotation.z -= delta * 1.2;
        }

        // 飘纱旋转
        if (this.floatingVeils) {
            this.floatingVeils.forEach((veil) => {
                veil._angle += delta * 0.6;
                veil.position.x = Math.sin(veil._angle) * 1.2;
                veil.position.z = Math.cos(veil._angle) * 1.2;
                veil.position.y = veil._baseY + Math.sin(Date.now() * 0.002 + veil._angle) * 0.15;
                veil.lookAt(0, 1.5, 0);
            });
        }

        // 华服裙摆飘动
        if (this.bossSkirts) {
            this.bossSkirts.forEach((skirt, i) => {
                skirt.rotation.y += delta * (0.2 + i * 0.1);
                const sway = Math.sin(Date.now() * 0.0015 + i * 0.6) * 0.04 * (i + 1);
                skirt.rotation.x = Math.PI + sway;
            });
        }

        // 长发飘动
        if (this.bossHairStrands) {
            this.bossHairStrands.forEach((strand, i) => {
                strand.rotation.x = 0.5 + Math.sin(Date.now() * 0.0025 + i * 0.8) * 0.12;
                strand.rotation.z = (i - 1.5) * 0.2 + Math.sin(Date.now() * 0.002 + i * 0.6) * 0.1;
            });
        }

        // 眼睛光源脉动
        if (this.eyeLight) {
            this.eyeLight.intensity = 0.4 + Math.sin(Date.now() * 0.004) * 0.2;
        }

        if (this.body) {
            if (hpPercent <= 0.3) {
                this._hpPulseTime += delta;
                const pulse = 0.3 + Math.sin(this._hpPulseTime * 8) * 0.3;
                this.body.material.emissive.set(0xff0000);
                this.body.material.emissiveIntensity = pulse;
            } else {
                this.body.material.emissive.set(this.config.bodyColor);
                this.body.material.emissiveIntensity = 0.15;
            }
        }

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

        if (playerPosition && !this.isAttacking) {
            const dist = this.position.distanceTo(playerPosition);
            const chaseSpeed = (3 + this.phase * 2) * 0.5;
            if (dist > this.config.attackRange * 0.8) {
                const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
                dir.y = 0;
                dir.normalize();
                this.position.x += dir.x * chaseSpeed * delta;
                this.position.z += dir.z * chaseSpeed * delta;
            }
        }

        let attack = null;
        if (!this.isAttacking && this.attackCooldown <= 0) {
            attack = this.decideAction(playerPosition);
        }

        this.mesh.position.copy(this.position);
        return attack;
    }

    decideAction(playerPosition) {
        if (!playerPosition) return null;
        const distance = this.position.distanceTo(playerPosition);
        const aggro = 0.5 + this.phase * 0.15;

        if (distance < 5) {
            return Math.random() < (1 - aggro * 0.3) ? this.meleeAttack() : this.chargeAttack(playerPosition);
        } else if (distance < 15) {
            return Math.random() < aggro ? this.chargeAttack(playerPosition) : this.projectileAttack(playerPosition);
        } else {
            return this.projectileAttack(playerPosition);
        }
    }

    meleeAttack() {
        this.isAttacking = true;
        this.attackCooldown = 1.5 - this.phase * 0.3;
        audio.playBossAttack();

        this.createGroundWarning(this.position.clone(), this.config.attackRange);

        this.weapon.rotation.z = -Math.PI / 2;
        setTimeout(() => {
            this.weapon.rotation.z = 0;
            this.isAttacking = false;
        }, 300);

        return {
            type: 'melee',
            damage: this.config.attackDamage * (1 + this.phase * 0.3),
            range: this.config.attackRange
        };
    }

    chargeAttack(playerPosition) {
        if (this.isCharging) return null;
        this.isCharging = true;
        this.attackCooldown = 3 - this.phase * 0.5;
        this.chargeDir = new THREE.Vector3().subVectors(playerPosition, this.position);
        this.chargeDir.y = 0;
        this.chargeDir.normalize();
        this.chargeTimer = 0.8;
        audio.playChargeWarning();

        this.createGroundWarning(this.position.clone(), 2.5);

        if (this.vfx) {
            this.vfx.createChargeWarning(this.position.clone(), this.chargeDir.clone());
        }

        return null;
    }

    projectileAttack(playerPosition) {
        this.attackCooldown = 2 - this.phase * 0.3;
        audio.playBossProjectile();

        const dir = new THREE.Vector3().subVectors(playerPosition, this.position);
        dir.y = 0;
        dir.normalize();

        if (this.vfx) {
            const projPos = this.position.clone();
            projPos.y += 1;
            const projDmg = this.config.projectileBaseDmg * (1 + this.phase * 0.3);
            this.vfx.createProjectile(projPos, dir, this.config.auraColor, projDmg);
        }

        return null;
    }

    takeDamage(damage) {
        if (this.hp <= 0) return false;
        this.hp -= damage;

        if (Math.random() < 0.2 && !this.isCharging && !this.isStunned) {
            const jumpDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
            jumpDir.y = 0;
            jumpDir.normalize().multiplyScalar(3);
            this.position.add(jumpDir);
            this.mesh.position.copy(this.position);
        }

        this.mesh.children.forEach(child => {
            if (child.material && child.material.color) {
                const orig = child.material.color.clone();
                child.material.color.set(0xffffff);
                setTimeout(() => { child.material.color.copy(orig); }, 80);
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
        this.mesh.position.copy(this.position);
        this.mesh.rotation.set(0, 0, 0);
        this.mesh.scale.set(1, 1, 1);
        this.scene.add(this.mesh);
    }
}
