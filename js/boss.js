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
        this.position.set(0, 1, -15);
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

        // 护身光环 - 大且显眼
        const auraGeo = new THREE.TorusGeometry(1.8, 0.15, 8, 32);
        const auraMat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.4 });
        this.aura = new THREE.Mesh(auraGeo, auraMat);
        this.aura.position.y = 0.5;
        this.aura.rotation.x = Math.PI / 2;
        group.add(this.aura);

        // 第二层光环
        const aura2Geo = new THREE.TorusGeometry(2.2, 0.08, 8, 32);
        const aura2Mat = new THREE.MeshBasicMaterial({ color: c.auraColor, transparent: true, opacity: 0.2 });
        this.aura2 = new THREE.Mesh(aura2Geo, aura2Mat);
        this.aura2.position.y = 1;
        this.aura2.rotation.x = Math.PI / 2;
        group.add(this.aura2);

        // 身体 - 更高大
        const bodyGeo = new THREE.CylinderGeometry(0.5, 0.6, 1.6, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: c.bodyColor, roughness: 0.3, metalness: 0.7,
            emissive: c.bodyColor, emissiveIntensity: 0.15
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        group.add(body);
        this.body = body;

        // 华服下摆 - 更宽大
        const skirtGeo = new THREE.ConeGeometry(0.8, 1.2, 8);
        const skirtMat = new THREE.MeshStandardMaterial({
            color: c.skirtColor, roughness: 0.4, metalness: 0.5,
            emissive: c.skirtColor, emissiveIntensity: 0.1
        });
        const skirt = new THREE.Mesh(skirtGeo, skirtMat);
        skirt.position.y = 0.4;
        skirt.rotation.x = Math.PI;
        skirt.castShadow = true;
        group.add(skirt);

        // 头部
        const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.4, metalness: 0.1 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.9;
        head.castShadow = true;
        group.add(head);

        // 发髻 - 更精致
        const hairGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 2, -0.06);
        hair.scale.set(1, 0.85, 1.15);
        group.add(hair);

        // 长发飘带
        for (let i = 0; i < 3; i++) {
            const ribbonGeo = new THREE.CylinderGeometry(0.04, 0.02, 1.2 + i * 0.3, 6);
            const ribbon = new THREE.Mesh(ribbonGeo, hairMat);
            ribbon.position.set(-0.2 + i * 0.2, 1.2, -0.3);
            ribbon.rotation.x = 0.4 + i * 0.1;
            ribbon.rotation.z = (i - 1) * 0.3;
            group.add(ribbon);
        }

        // 金钗/头饰
        const pinGeo = new THREE.CylinderGeometry(0.025, 0.015, 0.5, 8);
        const pinMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.2, metalness: 0.9,
            emissive: c.weaponColor, emissiveIntensity: 0.5
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(0, 2.2, 0);
        pin.rotation.z = Math.PI / 4;
        group.add(pin);

        // 眼睛 - 发光
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: c.auraColor });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 1.92, 0.28);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 1.92, 0.28);
        group.add(rightEye);

        // 武器
        this.weapon = this.createWeapon(c);
        this.weapon.position.set(0.7, 1, 0);
        group.add(this.weapon);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    createWeapon(c) {
        const group = new THREE.Group();
        // 金锁/武器主体 - 更大
        const lockGeo = new THREE.BoxGeometry(0.4, 0.5, 0.15);
        const lockMat = new THREE.MeshStandardMaterial({
            color: c.weaponColor, roughness: 0.2, metalness: 0.9,
            emissive: c.weaponColor, emissiveIntensity: 0.6
        });
        const lock = new THREE.Mesh(lockGeo, lockMat);
        group.add(lock);
        const ringGeo = new THREE.TorusGeometry(0.2, 0.025, 8, 16);
        const ring = new THREE.Mesh(ringGeo, lockMat);
        ring.position.y = 0.3;
        group.add(ring);
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
        this.position.set(0, 1, -15);
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
