class VFXManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.particles = [];
        this.projectiles = [];
        this.decals = [];
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        this.playerPosition = null; // 供追踪弹使用，由main每帧更新
    }

    triggerScreenShake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration / 1000;
        this.shakeTimer = this.shakeDuration;
    }

    getShakeOffset() {
        if (this.shakeTimer <= 0) return { x: 0, y: 0 };
        const t = this.shakeTimer / this.shakeDuration;
        const intensity = this.shakeIntensity * t;
        return {
            x: (Math.random() - 0.5) * intensity,
            y: (Math.random() - 0.5) * intensity
        };
    }

    createDamageNumber(worldPosition, damage, type = 'normal') {
        if (!this.camera) return;
        const vector = worldPosition.clone();
        vector.y += 2.5;
        vector.project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        if (x < -100 || x > window.innerWidth + 100 || y < -100 || y > window.innerHeight + 100) return;

        const el = document.createElement('div');
        el.className = 'dmg-num ' + type;
        el.textContent = type === 'heal' ? '+' + Math.round(damage) : Math.round(damage);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('damage-numbers').appendChild(el);
        setTimeout(() => el.remove(), 900);
    }

    createAttackEffect(position, direction, type = 'normal') {
        const color = type === 'ultimate' ? CONFIG.colors.accent : CONFIG.colors.primary;

        // 剑气本体 - 扁平椭圆波沿攻击方向飞出
        const waveCount = type === 'ultimate' ? 3 : type === 'skill' ? 2 : 1;
        for (let w = 0; w < waveCount; w++) {
            const waveGeo = new THREE.SphereGeometry(0.6 + w * 0.3, 8, 4);
            waveGeo.scale(1, 0.15, 2.5);
            const waveMat = new THREE.MeshBasicMaterial({
                color: 0xffffff, transparent: true, opacity: 0.9
            });
            const wave = new THREE.Mesh(waveGeo, waveMat);
            wave.position.copy(position).add(direction.clone().multiplyScalar(1.5 + w * 1.2));
            wave.rotation.y = -Math.atan2(direction.x, direction.z);
            this.scene.add(wave);
            this.particles.push({
                mesh: wave, velocity: direction.clone().multiplyScalar(12),
                life: 0.3, decay: 4
            });
        }

        // 白色能量拖尾 - 沿攻击线
        const trailGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 6);
        const trailMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.copy(position).add(direction.clone().multiplyScalar(2));
        trail.rotation.z = Math.PI / 2;
        trail.rotation.y = -Math.atan2(direction.x, direction.z);
        this.scene.add(trail);
        this.particles.push({
            mesh: trail, velocity: direction.clone().multiplyScalar(10),
            life: 0.2, decay: 5
        });

        // 红色剑气尾焰
        for (let i = 0; i < 6; i++) {
            const spark = this.createParticle(
                position.clone().add(direction.clone().multiplyScalar(0.5 + i * 0.5)),
                color, 0.25
            );
            spark.velocity = direction.clone().multiplyScalar(8 + Math.random() * 4);
            spark.velocity.y += (Math.random() - 0.5) * 2;
            spark.life = 0.4;
            this.particles.push(spark);
        }

        if (type === 'skill' || type === 'ultimate') {
            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const particle = this.createPetal(
                    position.clone().add(new THREE.Vector3(Math.cos(angle) * 1.5, 0.5, Math.sin(angle) * 1.5)),
                    CONFIG.colors.petal
                );
                particle.velocity = new THREE.Vector3(Math.cos(angle) * 2, 1 + Math.random(), Math.sin(angle) * 2);
                this.particles.push(particle);
            }
        }
    }

    createSkillEffect(position, range) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * range;
            const particle = this.createTear(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 8 + Math.random() * 5, Math.sin(angle) * radius))
            );
            particle.velocity = new THREE.Vector3(0, -12, 0);
            particle.life = 1.5;
            this.particles.push(particle);
        }

        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const particle = this.createParticle(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * range * 0.5, 0.5, Math.sin(angle) * range * 0.5)),
                CONFIG.colors.tears, 0.3
            );
            particle.velocity = new THREE.Vector3(Math.cos(angle) * 4, 2 + Math.random() * 3, Math.sin(angle) * 4);
            this.particles.push(particle);
        }
    }

    createUltimateEffect(position) {
        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2;
            const particle = this.createParticle(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * radius, Math.random() * 3, Math.sin(angle) * radius)),
                CONFIG.colors.accent, 0.6
            );
            particle.velocity = new THREE.Vector3(Math.cos(angle) * (8 + Math.random() * 8), 4 + Math.random() * 8, Math.sin(angle) * (8 + Math.random() * 8));
            particle.life = 1.5;
            this.particles.push(particle);
        }

        const ringGeo = new THREE.TorusGeometry(1, 0.3, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.accent, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 0.5;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);

        const expandRing = () => {
            ring.scale.multiplyScalar(1.08);
            ring.material.opacity -= 0.025;
            if (ring.material.opacity > 0) {
                requestAnimationFrame(expandRing);
            } else {
                this.scene.remove(ring);
            }
        };
        expandRing();
    }

    createCharmEffect(position) {
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const r = 1.5 + Math.random();
            const particle = this.createPetal(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * r, 0.5 + Math.random() * 2, Math.sin(angle) * r)),
                0xffb6c1
            );
            particle.velocity = new THREE.Vector3(Math.cos(angle) * 1, 2 + Math.random(), Math.sin(angle) * 1);
            particle.life = 2;
            this.particles.push(particle);
        }

        for (let i = 0; i < 10; i++) {
            const particle = this.createParticle(
                position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2)),
                0xffb6c1, 0.2
            );
            particle.velocity = new THREE.Vector3(0, 2 + Math.random() * 2, 0);
            particle.life = 1.5;
            this.particles.push(particle);
        }
    }

    createProjectile(position, direction, color, damage, options) {
        const group = new THREE.Group();
        const coreGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        const glowGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        group.add(glow);

        group.position.copy(position);
        this.scene.add(group);

        this.projectiles.push({
            mesh: group,
            velocity: direction.clone().multiplyScalar(options && options.speed ? options.speed : 12),
            life: options && options.life ? options.life : 3,
            damage: damage || 80,
            homing: options && options.homing ? options.homing : false,
            homingStrength: options && options.homingStrength ? options.homingStrength : 8,
            color: color
        });
    }

    // ===== 薛宝钗：冷香寒气（冰蓝色直线寒气弹）=====
    createColdBreath(position, direction, damage) {
        const group = new THREE.Group();
        // 冰晶核心
        const coreGeo = new THREE.OctahedronGeometry(0.25, 0);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.9 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);
        // 冰雾光晕
        const glowGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x66bbff, transparent: true, opacity: 0.35 });
        group.add(new THREE.Mesh(glowGeo, glowMat));
        // 冰晶碎片环绕
        for (let i = 0; i < 4; i++) {
            const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: 0xaaeeff, transparent: true, opacity: 0.8 }));
            shard.position.set(Math.cos(i) * 0.3, Math.sin(i) * 0.3, 0);
            shard._orbit = i;
            group.add(shard);
        }
        group.position.copy(position);
        this.scene.add(group);

        const proj = {
            mesh: group,
            velocity: direction.clone().multiplyScalar(14),
            life: 2.5,
            damage: damage,
            homing: false,
            color: 0x88ccff,
            slow: true,
            isCold: true
        };
        this.projectiles.push(proj);
    }

    // ===== 薛宝钗：牡丹绽放（金色AOE）=====
    createPeonyBloom(position, range) {
        // 金色扩散环
        for (let r = 0; r < 3; r++) {
            const ringGeo = new THREE.TorusGeometry(0.5, 0.12, 8, 24);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.8 - r * 0.2 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(position);
            ring.position.y = 0.5;
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);
            const delay = r * 120;
            const maxScale = range / 0.5;
            setTimeout(() => {
                let s = 1;
                const expand = () => {
                    s *= 1.08;
                    ring.scale.set(s, s, s);
                    ring.material.opacity -= 0.02;
                    if (s < maxScale && ring.material.opacity > 0) requestAnimationFrame(expand);
                    else this.scene.remove(ring);
                };
                expand();
            }, delay);
        }
        // 牡丹花瓣粒子
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const r = range * 0.6;
            const petal = this.createPetal(position.clone().add(new THREE.Vector3(Math.cos(angle) * r, 0.5, Math.sin(angle) * r)), 0xffd700);
            petal.velocity = new THREE.Vector3(Math.cos(angle) * 6, 3 + Math.random() * 3, Math.sin(angle) * 6);
            petal.life = 1.2;
            this.particles.push(petal);
        }
        // 金色光柱
        for (let i = 0; i < 15; i++) {
            const p = this.createParticle(position.clone().add(new THREE.Vector3((Math.random() - 0.5) * range, 0, (Math.random() - 0.5) * range)), 0xffd700, 0.4);
            p.velocity = new THREE.Vector3(0, 5 + Math.random() * 3, 0);
            p.life = 1;
            this.particles.push(p);
        }
    }

    // ===== 赵姨娘：纸人诅咒（追踪纸人弹）=====
    createPaperDollProjectile(position, damage) {
        const doll = new THREE.Group();
        const paperMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
        doll.add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), paperMat));
        const arm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), paperMat);
        arm.position.y = 0.1;
        doll.add(arm);
        // 红色符文眼（魇魔印记）
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
        const eyeL = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), eyeMat);
        eyeL.position.set(-0.06, 0.18, 0.01);
        doll.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), eyeMat);
        eyeR.position.set(0.06, 0.18, 0.01);
        doll.add(eyeR);

        doll.position.copy(position);
        this.scene.add(doll);

        this.projectiles.push({
            mesh: doll,
            velocity: new THREE.Vector3(0, 0, 0),
            life: 6,
            damage: damage,
            homing: true,
            homingStrength: 5,
            speed: 7,
            color: 0xff0000,
            isPaperDoll: true,
            _spin: 0
        });
    }

    // ===== 赵姨娘：妒火吐息（前方扇形持续火焰粒子）=====
    createFireBreath(position, direction, range) {
        const halfAngle = Math.PI / 6;
        for (let i = 0; i < 60; i++) {
            const spread = (Math.random() - 0.5) * halfAngle * 2;
            const dist = Math.random() * range;
            const dir = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
            const colors = [0xff4400, 0xff8800, 0xffaa00, 0xcc2200];
            const p = this.createParticle(
                position.clone().add(dir.clone().multiplyScalar(dist * 0.5)),
                colors[Math.floor(Math.random() * colors.length)],
                0.35
            );
            p.velocity = dir.clone().multiplyScalar(6 + Math.random() * 4);
            p.velocity.y += Math.random() * 2;
            p.life = 0.8;
            p.decay = 1.5;
            this.particles.push(p);
        }
        // 火焰核心光球
        const coreGeo = new THREE.SphereGeometry(0.6, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.6 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.copy(position);
        this.scene.add(core);
        this.particles.push({ mesh: core, velocity: new THREE.Vector3(), life: 0.5, decay: 3 });
    }

    // ===== 赵姨娘：魇魔诅咒弹（暗紫追踪）=====
    createCurseProjectile(position, direction, damage) {
        const group = new THREE.Group();
        const coreGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x9933cc, transparent: true, opacity: 0.95 });
        group.add(new THREE.Mesh(coreGeo, coreMat));
        const glowGeo = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x660099, transparent: true, opacity: 0.4 });
        group.add(new THREE.Mesh(glowGeo, glowMat));
        group.position.copy(position);
        this.scene.add(group);

        this.projectiles.push({
            mesh: group,
            velocity: direction.clone().multiplyScalar(10),
            life: 4,
            damage: damage,
            homing: true,
            homingStrength: 3,
            color: 0x9933cc,
            isCurse: true
        });
    }

    // ===== 镜中魔：镜面折射弹幕（多方向镜片）=====
    createMirrorBarrage(position, count, damage, color) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            const group = new THREE.Group();
            // 镜片
            const shardGeo = new THREE.OctahedronGeometry(0.22, 0);
            const shardMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
            group.add(new THREE.Mesh(shardGeo, shardMat));
            // 光晕
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xddaaff, transparent: true, opacity: 0.3 });
            group.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), glowMat));
            group.position.copy(position);
            this.scene.add(group);

            this.projectiles.push({
                mesh: group,
                velocity: dir.multiplyScalar(9),
                life: 3,
                damage: damage,
                homing: false,
                color: color,
                isMirror: true,
                _spin: angle
            });
        }
    }

    // ===== 镜中魔：幻境碎裂（镜片爆裂特效）=====
    createMirrorShatter(position, color) {
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elev = (Math.random() - 0.3) * Math.PI;
            const speed = 8 + Math.random() * 8;
            const shardGeo = new THREE.OctahedronGeometry(0.1 + Math.random() * 0.15, 0);
            const shardMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.9 });
            const shard = new THREE.Mesh(shardGeo, shardMat);
            shard.position.copy(position);
            shard.position.y += 1;
            this.scene.add(shard);
            this.particles.push({
                mesh: shard,
                velocity: new THREE.Vector3(Math.cos(angle) * Math.cos(elev) * speed, Math.sin(elev) * speed, Math.sin(angle) * Math.cos(elev) * speed),
                life: 1.2,
                decay: 1.2,
                rotationSpeed: (Math.random() - 0.5) * 10
            });
        }
        // 中心闪光环
        const ringGeo = new THREE.TorusGeometry(0.5, 0.2, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xddaaff, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(position);
        ring.position.y += 1;
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);
        const expand = () => {
            ring.scale.multiplyScalar(1.1);
            ring.material.opacity -= 0.04;
            if (ring.material.opacity > 0) requestAnimationFrame(expand);
            else this.scene.remove(ring);
        };
        expand();
    }

    // ===== 赵姨娘被动：火焰拖尾（移动留下火焰地面伤害区）=====
    createFireTrail(position, damage) {
        // 小火焰粒子
        const colors = [0xff4400, 0xff8800, 0xffaa00];
        for (let i = 0; i < 6; i++) {
            const p = this.createParticle(
                position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.1, (Math.random() - 0.5) * 0.8)),
                colors[Math.floor(Math.random() * colors.length)],
                0.25
            );
            p.velocity = new THREE.Vector3((Math.random() - 0.5) * 1, 1 + Math.random() * 2, (Math.random() - 0.5) * 1);
            p.life = 0.6;
            p.decay = 2;
            this.particles.push(p);
        }
        // 地面火焰伤害区（持续1秒）
        const fireGeo = new THREE.CircleGeometry(0.6, 12);
        const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.set(position.x, 0.12, position.z);
        fire.rotation.x = -Math.PI / 2;
        this.scene.add(fire);
        // 作为特殊 decal，带伤害判定
        this.decals.push({ mesh: fire, life: 1, decay: 1, isFire: true, damage: damage, _tickTimer: 0 });
    }

    // ===== 镜中魔被动：幻影分身（短暂存在，迷惑玩家）=====
    createMirrorClone(position, color, duration) {
        const clone = new THREE.Group();
        // 半透明镜面碎片身躯
        const shardMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        for (let i = 0; i < 5; i++) {
            const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.3 - i * 0.04, 0), shardMat);
            shard.position.set((Math.random() - 0.5) * 0.4, 0.5 + i * 0.35, (Math.random() - 0.5) * 0.4);
            clone.add(shard);
        }
        // 镜面头
        const head = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), shardMat);
        head.position.y = 2.3;
        clone.add(head);
        clone.position.copy(position);
        this.scene.add(clone);

        // 分身存在期间自转+上浮+淡出
        const startTime = Date.now();
        const dur = duration * 1000;
        const animate = () => {
            const t = (Date.now() - startTime) / dur;
            if (t >= 1 || !clone.parent) { this.scene.remove(clone); return; }
            clone.rotation.y += 0.03;
            clone.position.y = position.y + t * 0.5;
            clone.children.forEach(c => { if (c.material) c.material.opacity = 0.4 * (1 - t); });
            requestAnimationFrame(animate);
        };
        animate();
    }

    createParticle(position, color, size) {
        const geo = new THREE.SphereGeometry(size * 0.5, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), life: 1, decay: 2 };
    }

    createPetal(position, color) {
        const geo = new THREE.PlaneGeometry(0.3, 0.3);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.scene.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), life: 2, decay: 1, rotationSpeed: (Math.random() - 0.5) * 5 };
    }

    createTear(position) {
        const geo = new THREE.SphereGeometry(0.08, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.tears, transparent: true, opacity: 0.7 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.scale.set(1, 1.5, 1);
        this.scene.add(mesh);
        return { mesh, velocity: new THREE.Vector3(), life: 2, decay: 1 };
    }

    createDamageDecal(position) {
        const geo = new THREE.CircleGeometry(0.8, 16);
        const mat = new THREE.MeshBasicMaterial({ color: CONFIG.colors.primary, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
        const decal = new THREE.Mesh(geo, mat);
        decal.position.set(position.x, 0.1, position.z);
        decal.rotation.x = -Math.PI / 2;
        this.scene.add(decal);
        this.decals.push({ mesh: decal, life: 1.5, decay: 1 });
    }

    createHealEffect(position) {
        for (let i = 0; i < 15; i++) {
            const particle = this.createParticle(
                position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2)),
                0x4ecdc4, 0.3
            );
            particle.velocity = new THREE.Vector3(0, 3 + Math.random() * 2, 0);
            particle.life = 1.5;
            this.particles.push(particle);
        }
    }

    createChargeWarning(position, direction) {
        const lineGeo = new THREE.PlaneGeometry(0.8, 12);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(position.x, 0.1, position.z);
        const angle = Math.atan2(direction.x, direction.z);
        line.rotation.z = -angle;
        line.position.x += direction.x * 6;
        line.position.z += direction.z * 6;
        this.scene.add(line);

        let elapsed = 0;
        const flashAnim = () => {
            elapsed += 16;
            line.material.opacity = 0.2 + Math.sin(elapsed * 0.02) * 0.3;
            if (elapsed < 800) {
                requestAnimationFrame(flashAnim);
            } else {
                this.scene.remove(line);
            }
        };
        flashAnim();
    }

    createFloatingDialogue(worldPosition, text, color) {
        if (!this.camera) return;
        const vector = worldPosition.clone();
        vector.y += 4;
        vector.project(this.camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        if (x < -200 || x > window.innerWidth + 200 || y < -200 || y > window.innerHeight + 200) return;

        const el = document.createElement('div');
        el.textContent = text;
        const hexColor = '#' + (color || 0xffd93d).toString(16).padStart(6, '0');
        Object.assign(el.style, {
            position: 'fixed',
            left: x + 'px',
            top: y + 'px',
            transform: 'translateX(-50%)',
            color: hexColor,
            fontSize: '1.4rem',
            fontWeight: 'bold',
            fontFamily: 'Microsoft YaHei, sans-serif',
            textShadow: '0 0 20px ' + hexColor + ', 2px 2px 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
            zIndex: '250',
            opacity: '1',
            transition: 'all 2s ease-out',
            letterSpacing: '4px',
            whiteSpace: 'nowrap'
        });
        document.body.appendChild(el);

        requestAnimationFrame(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(-60px)';
        });

        setTimeout(() => el.remove(), 2100);
    }

    createPhaseRing(position, color) {
        const ringColor = color || CONFIG.colors.accent;
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(0.5 + i * 0.8, 0.15, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.8 - i * 0.2 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(position);
            ring.position.y += 1;
            ring.rotation.x = Math.PI / 2;
            this.scene.add(ring);

            const delay = i * 150;
            setTimeout(() => {
                const expandRing = () => {
                    ring.scale.multiplyScalar(1.04);
                    ring.material.opacity -= 0.015;
                    if (ring.material.opacity > 0) {
                        requestAnimationFrame(expandRing);
                    } else {
                        this.scene.remove(ring);
                    }
                };
                expandRing();
            }, delay);
        }

        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * 2;
            const particle = this.createParticle(
                position.clone().add(new THREE.Vector3(Math.cos(angle) * r, 0.5 + Math.random() * 2, Math.sin(angle) * r)),
                ringColor, 0.3
            );
            particle.velocity = new THREE.Vector3(Math.cos(angle) * 8, 3 + Math.random() * 5, Math.sin(angle) * 8);
            particle.life = 1.5;
            this.particles.push(particle);
        }
    }

    update(delta) {
        if (this.shakeTimer > 0) this.shakeTimer -= delta;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= delta * p.decay;
            if (p.life <= 0) { this.scene.remove(p.mesh); this.particles.splice(i, 1); continue; }
            p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
            p.velocity.y -= 9.8 * delta;
            if (p.rotationSpeed) {
                p.mesh.rotation.x += p.rotationSpeed * delta;
                p.mesh.rotation.z += p.rotationSpeed * delta;
            }
            p.mesh.material.opacity = p.life * 0.8;
        }

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.life -= delta;
            if (proj.life <= 0) { this.scene.remove(proj.mesh); this.projectiles.splice(i, 1); continue; }

            // 追踪弹逻辑
            if (proj.homing && this.playerPosition && proj.mesh.position.distanceTo(this.playerPosition) > 1) {
                const toPlayer = new THREE.Vector3().subVectors(this.playerPosition, proj.mesh.position);
                toPlayer.y = 0;
                if (toPlayer.lengthSq() > 0.01) {
                    toPlayer.normalize();
                    const speed = proj.speed || 12;
                    const desired = toPlayer.multiplyScalar(speed);
                    // 平滑转向
                    proj.velocity.x += (desired.x - proj.velocity.x) * Math.min(1, delta * proj.homingStrength);
                    proj.velocity.z += (desired.z - proj.velocity.z) * Math.min(1, delta * proj.homingStrength);
                }
            }

            proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));

            // 纸人旋转飘动
            if (proj.isPaperDoll) {
                proj.mesh.rotation.y += delta * 4;
                proj.mesh.position.y += Math.sin(Date.now() * 0.006) * 0.02;
            }
            // 镜片自转
            if (proj.isMirror) {
                proj.mesh.children.forEach(c => { c.rotation.x += delta * 5; c.rotation.y += delta * 4; });
            }
            // 冷香弹碎片环绕
            if (proj.isCold) {
                proj.mesh.children.forEach((c, idx) => {
                    if (idx >= 2) {
                        c.position.x = Math.cos(Date.now() * 0.005 + idx) * 0.3;
                        c.position.y = Math.sin(Date.now() * 0.005 + idx) * 0.3;
                    }
                });
            }
        }

        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            d.life -= delta * d.decay;
            if (d.life <= 0) { this.scene.remove(d.mesh); this.decals.splice(i, 1); continue; }
            // 火焰区闪烁，普通decal渐隐
            if (d.isFire) {
                d.mesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.02) * 0.2;
            } else {
                d.mesh.material.opacity = d.life * 0.3;
            }
        }
    }

    // 检测火焰地面伤害区对玩家的持续伤害
    checkFireTrailDamage(position, radius) {
        let totalDmg = 0;
        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            if (!d.isFire) continue;
            const dx = d.mesh.position.x - position.x;
            const dz = d.mesh.position.z - position.z;
            if (Math.sqrt(dx * dx + dz * dz) < radius + 0.6) {
                // 每0.5秒判定一次伤害（由调用方控制频率）
                totalDmg += d.damage * 0.3;
            }
        }
        return totalDmg;
    }

    checkProjectileCollision(position, radius) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (proj.mesh.position.distanceTo(position) < radius) {
                const result = {
                    damage: proj.damage,
                    slow: proj.isCold ? 1.8 : 0,    // 冷香寒气：减速
                    root: 0
                };
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                return result;
            }
        }
        return { damage: 0, slow: 0, root: 0 };
    }

    clear() {
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.projectiles.forEach(p => this.scene.remove(p.mesh));
        this.decals.forEach(d => this.scene.remove(d.mesh));
        this.particles = [];
        this.projectiles = [];
        this.decals = [];
    }
}
