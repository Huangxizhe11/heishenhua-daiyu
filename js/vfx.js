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

        // 剑气斩击弧 - 扇形展开
        const arcCount = type === 'ultimate' ? 3 : type === 'skill' ? 2 : 1;
        for (let a = 0; a < arcCount; a++) {
            const arcGeo = new THREE.RingGeometry(0.8 + a * 1.5, 1.2 + a * 1.5, 16, 1, -0.6, 0.6);
            const arcMat = new THREE.MeshBasicMaterial({
                color: color, transparent: true, opacity: 0.9, side: THREE.DoubleSide
            });
            const arc = new THREE.Mesh(arcGeo, arcMat);
            arc.position.copy(position).add(direction.clone().multiplyScalar(2 + a * 1.5));
            arc.rotation.x = -Math.PI / 2;
            arc.rotation.z = -Math.atan2(direction.x, direction.z);
            this.scene.add(arc);
            this.particles.push({ mesh: arc, velocity: direction.clone().multiplyScalar(10), life: 0.3, decay: 4 });
        }

        // 剑气能量条 - 沿攻击方向的长条
        const trailGeo = new THREE.BoxGeometry(0.15, 0.4, 5);
        const trailMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.8
        });
        const trail = new THREE.Mesh(trailGeo, trailMat);
        trail.position.copy(position).add(direction.clone().multiplyScalar(2.5));
        trail.rotation.z = -Math.atan2(direction.x, direction.z);
        this.scene.add(trail);
        this.particles.push({ mesh: trail, velocity: direction.clone().multiplyScalar(8), life: 0.25, decay: 5 });

        // 能量碎片 - 沿攻击线分布
        for (let i = 0; i < 8; i++) {
            const frag = this.createParticle(
                position.clone().add(direction.clone().multiplyScalar(1 + i * 0.6)),
                0xffffff, 0.3
            );
            frag.velocity = direction.clone().multiplyScalar(12 + Math.random() * 5);
            frag.life = 0.5;
            this.particles.push(frag);
        }

        // 花瓣伴随效果
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

    createProjectile(position, direction, color, damage) {
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
            velocity: direction.clone().multiplyScalar(12),
            life: 3,
            damage: damage || 80
        });
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
            proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));
        }

        for (let i = this.decals.length - 1; i >= 0; i--) {
            const d = this.decals[i];
            d.life -= delta * d.decay;
            if (d.life <= 0) { this.scene.remove(d.mesh); this.decals.splice(i, 1); continue; }
            d.mesh.material.opacity = d.life * 0.3;
        }
    }

    checkProjectileCollision(position, radius) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (proj.mesh.position.distanceTo(position) < radius) {
                const dmg = proj.damage;
                this.scene.remove(proj.mesh);
                this.projectiles.splice(i, 1);
                return dmg;
            }
        }
        return 0;
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
