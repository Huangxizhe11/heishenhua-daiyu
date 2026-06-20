class Player {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.hp = CONFIG.player.maxHp;
        this.mp = CONFIG.player.maxMp;
        this.position = new THREE.Vector3(0, CONFIG.player.height / 2, 8);
        this.isDashing = false;
        this.isInvincible = false;
        this.canDash = true;
        this.cooldowns = { attack: 0, skill: 0, ultimate: 0, charm: 0 };
        this.combo = 0;
        this.comboTimer = 0;
        this.createModel();
    }

    createModel() {
        const group = new THREE.Group();

        // 身体 - 汉服风格
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.1, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9370db, roughness: 0.6, metalness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.55;
        body.castShadow = true;
        group.add(body);

        // 裙子 - 更飘逸
        const skirtGeo = new THREE.ConeGeometry(0.55, 0.9, 8);
        const skirtMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.5, metalness: 0.1 });
        const skirt = new THREE.Mesh(skirtGeo, skirtMat);
        skirt.position.y = 0.2;
        skirt.rotation.x = Math.PI;
        skirt.castShadow = true;
        group.add(skirt);

        // 头部
        const headGeo = new THREE.SphereGeometry(0.26, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, roughness: 0.4, metalness: 0.1 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.35;
        head.castShadow = true;
        group.add(head);

        // 头发 - 长发
        const hairGeo = new THREE.SphereGeometry(0.29, 16, 16);
        const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.4, -0.05);
        hair.scale.set(1, 0.85, 1.15);
        group.add(hair);

        // 飘带
        for (let i = 0; i < 2; i++) {
            const ribbonGeo = new THREE.CylinderGeometry(0.03, 0.015, 0.8, 6);
            const ribbon = new THREE.Mesh(ribbonGeo, hairMat);
            ribbon.position.set(-0.15 + i * 0.3, 1.0, -0.25);
            ribbon.rotation.x = 0.4;
            ribbon.rotation.z = (i - 0.5) * 0.4;
            group.add(ribbon);
        }

        // 眼睛
        const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.08, 1.37, 0.22);
        group.add(leftEye);
        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.08, 1.37, 0.22);
        group.add(rightEye);

        // 眉毛 - 愁眉
        const browGeo = new THREE.BoxGeometry(0.1, 0.02, 0.02);
        const browMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-0.08, 1.43, 0.23);
        leftBrow.rotation.z = 0.2;
        group.add(leftBrow);
        const rightBrow = new THREE.Mesh(browGeo, browMat);
        rightBrow.position.set(0.08, 1.43, 0.23);
        rightBrow.rotation.z = -0.2;
        group.add(rightBrow);

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
        const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8, metalness: 0.2 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.rotation.z = Math.PI / 4;
        group.add(handle);

        const bladeGeo = new THREE.BoxGeometry(0.45, 0.35, 0.06);
        const bladeMat = new THREE.MeshStandardMaterial({
            color: CONFIG.colors.primary, roughness: 0.3, metalness: 0.7,
            emissive: CONFIG.colors.primary, emissiveIntensity: 0.4
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(-0.35, 0.85, 0);
        blade.rotation.z = -Math.PI / 4;
        group.add(blade);
        return group;
    }

    update(delta, keys, cameraAngle) {
        if (this.hp <= 0) return;

        Object.keys(this.cooldowns).forEach(key => {
            if (this.cooldowns[key] > 0) this.cooldowns[key] -= delta;
        });

        if (this.combo > 0) {
            this.comboTimer -= delta;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        const forward = new THREE.Vector3(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
        const right = new THREE.Vector3(Math.cos(cameraAngle), 0, -Math.sin(cameraAngle));
        const moveDir = new THREE.Vector3();

        if (keys['w'] || keys['arrowup']) moveDir.add(forward);
        if (keys['s'] || keys['arrowdown']) moveDir.sub(forward);
        if (keys['a'] || keys['arrowleft']) moveDir.sub(right);
        if (keys['d'] || keys['arrowright']) moveDir.add(right);

        if (moveDir.lengthSq() > 0 && !this.isDashing) {
            moveDir.normalize();
            this.position.x += moveDir.x * CONFIG.player.moveSpeed * delta;
            this.position.z += moveDir.z * CONFIG.player.moveSpeed * delta;
        }

        const limit = CONFIG.world.size * 0.45;
        this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
        this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

        if (keys[' '] && this.canDash && !this.isDashing) {
            this.dash(moveDir.length() > 0 ? moveDir.normalize() : forward.clone());
        }

        this.mesh.position.copy(this.position);

        if (this.weapon) {
            this.weapon.rotation.z += delta * 2;
        }

        return moveDir;
    }

    dash(direction) {
        if (!this.canDash || this.mp < 20) return;
        this.isDashing = true;
        this.isInvincible = true;
        this.canDash = false;
        this.mp -= 20;

        const dashDir = direction.clone().normalize();
        const startPos = this.position.clone();
        const startTime = Date.now();

        audio.playDash();

        let lastGhostTime = 0;
        const ghostInterval = 50;

        const dashAnim = () => {
            const progress = Math.min(1, (Date.now() - startTime) / (CONFIG.player.dashDuration * 1000));
            this.position.x = startPos.x + dashDir.x * CONFIG.player.dashSpeed * CONFIG.player.dashDuration * progress;
            this.position.z = startPos.z + dashDir.z * CONFIG.player.dashSpeed * CONFIG.player.dashDuration * progress;
            this.mesh.rotation.x = progress * Math.PI * 2;

            const now = Date.now();
            if (now - lastGhostTime > ghostInterval && progress < 1) {
                lastGhostTime = now;
                this.spawnGhost(progress);
            }

            if (progress < 1) {
                requestAnimationFrame(dashAnim);
            } else {
                this.isDashing = false;
                this.mesh.rotation.x = 0;
                setTimeout(() => { this.isInvincible = false; }, CONFIG.player.invincibleDuration * 1000);
                setTimeout(() => { this.canDash = true; }, CONFIG.player.dashCooldown * 1000);
            }
        };
        dashAnim();
    }

    spawnGhost(progress) {
        const ghost = this.mesh.clone();
        ghost.position.copy(this.mesh.position);
        ghost.rotation.copy(this.mesh.rotation);
        ghost.traverse(child => {
            if (child.isMesh) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.material.opacity = 0.35 * (1 - progress);
                child.material.depthWrite = false;
            }
        });
        this.scene.add(ghost);

        const fadeStart = Date.now();
        const fadeDuration = 400;
        const fadeOut = () => {
            const t = Math.min(1, (Date.now() - fadeStart) / fadeDuration);
            ghost.traverse(child => {
                if (child.isMesh && child.material) {
                    child.material.opacity = 0.35 * (1 - progress) * (1 - t);
                }
            });
            if (t < 1) {
                requestAnimationFrame(fadeOut);
            } else {
                this.scene.remove(ghost);
            }
        };
        fadeOut();
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
    }

    heal(amount) { this.hp = Math.min(CONFIG.player.maxHp, this.hp + amount); }
    restoreMp(amount) { this.mp = Math.min(CONFIG.player.maxMp, this.mp + amount); }
}
