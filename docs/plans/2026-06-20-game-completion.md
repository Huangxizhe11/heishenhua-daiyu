# 黑神话·林黛玉 游戏优化完成计划

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan.

**Goal:** 修复核心游戏机制bug，补全缺失功能，提升视觉和操控体验，使游戏可完整游玩。

**Architecture:** 基于现有Three.js架构，修复main.js中的战斗检测逻辑、补全Boss技能投射物系统、增强HUD反馈、改善相机操控。

**Tech Stack:** Three.js r128, WebAudio API, 纯HTML/CSS/JS

---

## Task 1: 修复核心战斗机制

**问题:** Boss攻击通过距离判定直接扣血，没有攻击时机；gameOver()/victory()从未被调用。

**Files:**
- Modify: `js/main.js:220-235` (checkCombat)
- Modify: `js/boss.js:140-180` (update)
- Modify: `js/player.js:301-323` (takeDamage)

- [ ] **Step 1: 修复Boss攻击投射物生成**

在 `js/boss.js` 的 `meleeAttack()` 和 `projectileAttack()` 中，将攻击信息返回给main.js处理，而不是仅设置内部状态。

修改 `js/boss.js` `meleeAttack()`:
```javascript
meleeAttack() {
    if (this.attackCooldown > 0) return null;

    this.isAttacking = true;
    this.attackCooldown = 1.5 - this.phase * 0.3;

    audio.playBossAttack();

    // 攻击动画
    this.weapon.rotation.z = -Math.PI / 2;
    setTimeout(() => {
        this.weapon.rotation.z = 0;
        this.isAttacking = false;
    }, 300);

    return {
        type: 'melee',
        damage: CONFIG.boss.attackDamage * (1 + this.phase * 0.3),
        range: CONFIG.boss.attackRange,
        position: this.position.clone(),
        direction: this.getDirection()
    };
}
```

修改 `js/boss.js` `projectileAttack()`:
```javascript
projectileAttack(playerPosition) {
    if (this.attackCooldown > 0) return null;

    this.attackCooldown = 2 - this.phase * 0.3;

    audio.playBossAttack();

    const direction = new THREE.Vector3();
    direction.subVectors(playerPosition, this.position).normalize();

    return {
        type: 'projectile',
        damage: 80 * (1 + this.phase * 0.3),
        range: 20,
        position: this.position.clone().add(new THREE.Vector3(0, 1, 0)),
        direction: direction,
        speed: 15
    };
}
```

修改 `js/boss.js` `decideAction()` 返回攻击结果:
```javascript
decideAction(playerPosition) {
    if (this.attackCooldown > 0) return null;

    const distance = this.position.distanceTo(playerPosition);

    if (distance < 5) {
        if (Math.random() < 0.7) {
            return this.meleeAttack();
        } else {
            return this.chargeAttack(playerPosition);
        }
    } else if (distance < 15) {
        if (Math.random() < 0.5) {
            return this.chargeAttack(playerPosition);
        } else {
            return this.projectileAttack(playerPosition);
        }
    } else {
        return this.projectileAttack(playerPosition);
    }
}
```

修改 `js/boss.js` `update()` 添加返回值:
```javascript
update(delta, playerPosition) {
    if (this.hp <= 0) return null;

    if (this.attackCooldown > 0) {
        this.attackCooldown -= delta;
    }

    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= CONFIG.boss.phases[2].hpThreshold) {
        this.phase = 2;
    } else if (hpPercent <= CONFIG.boss.phases[1].hpThreshold) {
        this.phase = 1;
    }

    if (playerPosition) {
        const direction = new THREE.Vector3();
        direction.subVectors(playerPosition, this.position).normalize();
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    }

    if (this.aura) {
        this.aura.rotation.z += delta * 2;
        this.aura.scale.set(
            1 + Math.sin(Date.now() * 0.003) * 0.1,
            1 + Math.sin(Date.now() * 0.003) * 0.1,
            1
        );
    }

    let attackResult = null;
    if (!this.isAttacking && !this.isCharging) {
        attackResult = this.decideAction(playerPosition);
    }

    this.mesh.position.copy(this.position);
    return attackResult;
}
```

- [ ] **Step 2: 修复main.js中的战斗检测和胜负判定**

修改 `js/main.js` `update()`:
```javascript
update(delta) {
    this.player.update(delta, this.keys);

    if (this.boss.hp > 0) {
        const bossAttack = this.boss.update(delta, this.player.position);
        if (bossAttack) {
            this.handleBossAttack(bossAttack);
        }
    }

    this.world.update(delta);
    this.vfx.update(delta);
    this.checkPlayerProjectiles(delta);
    this.updateCamera(delta);
    this.updateHUD();

    if (this.player.mp < CONFIG.player.maxMp) {
        this.player.mp += 10 * delta;
    }

    // 检测胜负
    if (this.player.hp <= 0 && this.gameState === 'playing') {
        this.gameOver();
    }
    if (this.boss.hp <= 0 && this.gameState === 'playing') {
        this.victory();
    }
}
```

添加新方法 `handleBossAttack`:
```javascript
handleBossAttack(attack) {
    if (attack.type === 'melee' || attack.type === 'charge') {
        const distance = this.player.position.distanceTo(attack.position);
        if (distance <= attack.range) {
            this.player.takeDamage(attack.damage);
            this.showDamageNumber(attack.damage, this.player.position, '#e94560');
            this.screenShake(0.3);
        }
    } else if (attack.type === 'projectile') {
        this.vfx.createProjectile(attack.position, attack.direction, CONFIG.colors.accent);
        const proj = this.vfx.projectiles[this.vfx.projectiles.length - 1];
        proj.damage = attack.damage;
    }
}
```

添加 `checkPlayerProjectiles`:
```javascript
checkPlayerProjectiles(delta) {
    for (let i = this.vfx.projectiles.length - 1; i >= 0; i--) {
        const proj = this.vfx.projectiles[i];
        const dist = proj.mesh.position.distanceTo(this.player.position);
        if (dist < 1.5) {
            this.player.takeDamage(proj.damage);
            this.showDamageNumber(proj.damage, this.player.position, '#e94560');
            this.screenShake(0.2);
            this.scene.remove(proj.mesh);
            this.vfx.projectiles.splice(i, 1);
        }
    }
}
```

- [ ] **Step 3: 添加右键技能释放**

修改 `js/main.js` `bindEvents()` 中的鼠标事件:
```javascript
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        this.mouse.left = true;
        this.playerAttack();
    }
    if (e.button === 2) {
        this.mouse.right = true;
        this.playerUseSkill();
    }
});
```

- [ ] **Step 4: Commit**

```bash
git add js/main.js js/boss.js
git commit -m "fix: 修复战斗检测机制，Boss攻击现在正确造成伤害并生成投射物"
```

---

## Task 2: 添加视觉反馈系统

**Files:**
- Modify: `js/main.js` (添加screenShake, showDamageNumber方法)
- Modify: `index.html` (添加伤害数字样式)
- Modify: `js/vfx.js` (添加受伤闪烁效果)

- [ ] **Step 1: 在index.html中添加伤害数字和屏幕震动样式**

在 `</style>` 前添加:
```css
#damage-numbers {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 200;
}
.damage-number {
    position: absolute; font-weight: bold; font-size: 1.5rem;
    text-shadow: 0 0 10px currentColor; pointer-events: none;
    animation: damageFloat 1s ease-out forwards;
}
@keyframes damageFloat {
    0% { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
}
#screen-flash {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: radial-gradient(circle, transparent 30%, rgba(233,69,96,0.4) 100%);
    pointer-events: none; z-index: 150; opacity: 0;
    transition: opacity 0.1s;
}
#boss-phase-indicator {
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    color: #e94560; font-size: 2rem; font-weight: bold; z-index: 200;
    text-shadow: 0 0 30px #e94560; opacity: 0; pointer-events: none;
    transition: opacity 0.5s;
}
#skill-cooldowns {
    position: fixed; bottom: 80px; left: 20px; z-index: 100;
    display: flex; gap: 10px; pointer-events: none;
}
.skill-icon {
    width: 60px; height: 60px; border: 2px solid #555;
    border-radius: 8px; position: relative; overflow: hidden;
    background: rgba(0,0,0,0.6);
}
.skill-icon .skill-name {
    position: absolute; bottom: 2px; left: 0; right: 0;
    text-align: center; font-size: 0.6rem; color: #aaa;
}
.skill-icon .cooldown-overlay {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: rgba(0,0,0,0.7); color: #fff;
    text-align: center; font-size: 0.8rem; line-height: 60px;
}
```

在 `<body>` 中添加:
```html
<div id="damage-numbers"></div>
<div id="screen-flash"></div>
<div id="boss-phase-indicator"></div>
<div id="skill-cooldowns">
    <div class="skill-icon" id="skill-q">
        <span class="skill-name">泪雨术</span>
    </div>
    <div class="skill-icon" id="skill-e">
        <span class="skill-name">天魁星</span>
    </div>
</div>
```

- [ ] **Step 2: 在main.js中添加视觉反馈方法**

在Game类中添加:
```javascript
showDamageNumber(damage, worldPosition, color) {
    const vector = worldPosition.clone();
    vector.y += 2;
    vector.project(this.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.className = 'damage-number';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.textContent = Math.floor(damage);
    document.getElementById('damage-numbers').appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

screenShake(intensity = 0.3) {
    const flash = document.getElementById('screen-flash');
    flash.style.opacity = '1';
    setTimeout(() => flash.style.opacity = '0', 100);

    const originalPos = this.camera.position.clone();
    let shakeCount = 0;
    const shakeInterval = setInterval(() => {
        this.camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
        this.camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
        shakeCount++;
        if (shakeCount > 5) {
            clearInterval(shakeInterval);
            this.camera.position.copy(originalPos);
        }
    }, 30);
}
```

- [ ] **Step 3: 修改checkHit添加伤害数字**

修改 `js/main.js` `checkHit()`:
```javascript
checkHit(attack) {
    if (this.boss.hp <= 0) return;

    const distance = this.player.position.distanceTo(this.boss.position);
    if (distance <= attack.range) {
        this.boss.takeDamage(attack.damage);
        this.vfx.createDamageDecal(this.boss.position);
        this.showDamageNumber(attack.damage, this.boss.position, '#ffd93d');

        this.player.combo++;
        this.player.comboTimer = 2;
        this.updateCombo();
    }
}
```

- [ ] **Step 4: 添加技能冷却HUD更新**

在 `updateHUD()` 末尾添加:
```javascript
// 技能冷却显示
this.updateSkillCooldown('skill-q', this.player.cooldowns.skill, SKILLS.skill.cooldown, SKILLS.skill.mpCost);
this.updateSkillCooldown('skill-e', this.player.cooldowns.ultimate, SKILLS.ultimate.cooldown, SKILLS.ultimate.mpCost);
```

添加新方法:
```javascript
updateSkillCooldown(elementId, currentCooldown, maxCooldown, mpCost) {
    const el = document.getElementById(elementId);
    const existing = el.querySelector('.cooldown-overlay');
    if (this.player.cooldowns[elementId === 'skill-q' ? 'skill' : 'ultimate'] > 0) {
        if (!existing) {
            const overlay = document.createElement('div');
            overlay.className = 'cooldown-overlay';
            el.appendChild(overlay);
        }
        const cd = this.player.cooldowns[elementId === 'skill-q' ? 'skill' : 'ultimate'];
        el.querySelector('.cooldown-overlay').textContent = cd.toFixed(1);
        el.style.borderColor = '#555';
    } else {
        if (existing) existing.remove();
        el.style.borderColor = this.player.mp >= mpCost ? '#4ecdc4' : '#555';
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: 添加伤害数字、屏幕震动、技能冷却HUD"
```

---

## Task 3: 改善相机操控和角色朝向

**问题:** 玩家移动方向是世界坐标，不是相对于相机；鼠标无法自由旋转视角。

**Files:**
- Modify: `js/main.js:66-118` (bindEvents, updateCamera)
- Modify: `js/player.js:147-197` (update)

- [ ] **Step 1: 修改鼠标控制实现pointer lock**

修改 `bindEvents()`:
```javascript
bindEvents() {
    document.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === 'q') this.playerUseSkill();
        if (e.key.toLowerCase() === 'e') this.playerUseUltimate();
    });

    document.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
    });

    // 点击canvas锁定鼠标
    this.renderer.domElement.addEventListener('click', () => {
        this.renderer.domElement.requestPointerLock();
    });

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === this.renderer.domElement) {
            this.cameraAngle -= e.movementX * 0.003;
            this.cameraHeight = Math.max(2, Math.min(15,
                this.cameraHeight + e.movementY * 0.02
            ));
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            this.mouse.left = true;
            this.playerAttack();
        }
        if (e.button === 2) {
            this.mouse.right = true;
            this.playerUseSkill();
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouse.left = false;
        if (e.button === 2) this.mouse.right = false;
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 滚轮缩放
    document.addEventListener('wheel', (e) => {
        this.cameraDistance = Math.max(5, Math.min(20,
            this.cameraDistance + e.deltaY * 0.01
        ));
    });

    window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
```

- [ ] **Step 2: 修改Player移动支持相机相对方向**

修改 `js/player.js` `update()` 中的移动逻辑:
```javascript
update(delta, keys, cameraAngle) {
    if (this.hp <= 0) return;

    Object.keys(this.cooldowns).forEach(key => {
        if (this.cooldowns[key] > 0) {
            this.cooldowns[key] -= delta;
        }
    });

    if (this.combo > 0) {
        this.comboTimer -= delta;
        if (this.comboTimer <= 0) {
            this.combo = 0;
        }
    }

    // 相机相对移动
    const moveDir = new THREE.Vector3();
    const forward = new THREE.Vector3(-Math.sin(cameraAngle), 0, -Math.cos(cameraAngle));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);

    if (keys['w'] || keys['arrowup']) moveDir.add(forward);
    if (keys['s'] || keys['arrowdown']) moveDir.sub(forward);
    if (keys['a'] || keys['arrowleft']) moveDir.sub(right);
    if (keys['d'] || keys['arrowright']) moveDir.add(right);

    if (moveDir.length() > 0 && !this.isDashing) {
        moveDir.normalize();
        this.position.x += moveDir.x * CONFIG.player.moveSpeed * delta;
        this.position.z += moveDir.z * CONFIG.player.moveSpeed * delta;
        this.velocity.x = moveDir.x * CONFIG.player.moveSpeed;
        this.velocity.z = moveDir.z * CONFIG.player.moveSpeed;

        // 角色朝向移动方向
        this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
    }

    const limit = CONFIG.world.size * 0.45;
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));

    if (keys[' '] && this.canDash && !this.isDashing) {
        this.dash(moveDir);
    }

    this.mesh.position.copy(this.position);

    if (this.weapon) {
        this.weapon.rotation.z += delta * 2;
    }
}
```

- [ ] **Step 3: 修改main.js的update传入cameraAngle**

修改 `update()`:
```javascript
update(delta) {
    this.player.update(delta, this.keys, this.cameraAngle);
    // ... 其余代码不变
}
```

- [ ] **Step 4: Commit**

```bash
git add js/main.js js/player.js
git commit -m "feat: 相机相对移动、pointer lock鼠标控制、滚轮缩放"
```

---

## Task 4: 添加Boss阶段转换和攻击投射物视觉

**Files:**
- Modify: `js/main.js` (阶段提示)
- Modify: `js/boss.js` (阶段视觉变化)

- [ ] **Step 1: 添加Boss阶段转换提示**

在 `js/main.js` `update()` 中添加阶段检测:
```javascript
// 阶段检测
if (this.boss.hp > 0) {
    const hpPercent = this.boss.hp / this.boss.maxHp;
    let newPhase = 0;
    if (hpPercent <= 0.3) newPhase = 2;
    else if (hpPercent <= 0.6) newPhase = 1;

    if (newPhase > this.currentBossPhase) {
        this.currentBossPhase = newPhase;
        this.showBossPhaseIndicator(newPhase);
    }
}
```

在constructor中添加:
```javascript
this.currentBossPhase = 0;
```

添加方法:
```javascript
showBossPhaseIndicator(phase) {
    const texts = ['', '宝钗怒·金锁碎', '宝钗狂·玉碎焚'];
    const el = document.getElementById('boss-phase-indicator');
    el.textContent = texts[phase];
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
    this.screenShake(0.5);
}
```

- [ ] **Step 2: Boss阶段视觉变化**

修改 `js/boss.js` `update()` 中阶段改变时的效果:
```javascript
// 在阶段改变时改变光环颜色
const hpPercent = this.hp / this.maxHp;
let newPhase = 0;
if (hpPercent <= 0.3) newPhase = 2;
else if (hpPercent <= 0.6) newPhase = 1;

if (newPhase !== this.phase) {
    this.phase = newPhase;
    // 改变光环颜色
    if (this.aura) {
        const colors = [CONFIG.colors.accent, CONFIG.colors.primary, 0xff0000];
        this.aura.material.color.setHex(colors[this.phase]);
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add js/main.js js/boss.js
git commit -m "feat: Boss阶段转换提示和视觉变化"
```

---

## Task 5: 完善游戏结束和胜利流程

**Files:**
- Modify: `index.html` (游戏结束界面)
- Modify: `js/main.js` (gameOver, victory, restart)

- [ ] **Step 1: 改进gameOver和victory界面**

修改 `gameOver()`:
```javascript
gameOver() {
    this.gameState = 'gameover';
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <h1 style="color:#e94560;">魂归离恨天</h1>
        <p style="color:#a0a0a0; margin: 10px 0;">林黛玉已陨落</p>
        <p style="color:#666; font-size:0.9rem;">花谢花飞花满天，红消香断有谁怜</p>
        <p style="margin-top: 30px; color: #e94560; animation: pulse 2s infinite;">
            点击任意位置重新开始
        </p>
    `;
    loading.classList.remove('hidden');
    document.exitPointerLock();
}
```

修改 `victory()`:
```javascript
victory() {
    this.gameState = 'victory';
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <h1 style="color:#4ecdc4;">潇湘妃子，功德圆满</h1>
        <p style="color:#a0a0a0; margin: 10px 0;">薛宝钗已被降服</p>
        <p style="color:#666; font-size:0.9rem;">一朝春尽红颜老，花落人亡两不知</p>
        <p style="margin-top: 30px; color: #4ecdc4; animation: pulse 2s infinite;">
            点击任意位置重新挑战
        </p>
    `;
    loading.classList.remove('hidden');
    document.exitPointerLock();
}
```

修改 `restart()`:
```javascript
restart() {
    this.player.respawn();
    this.boss.respawn();
    this.vfx.clear();
    this.currentBossPhase = 0;
    this.gameState = 'playing';
    document.getElementById('loading').classList.add('hidden');
    this.lastTime = Date.now();
}
```

修改事件绑定，让任意点击可以重启:
```javascript
// 在bindEvents末尾添加
document.addEventListener('click', () => {
    if (this.gameState === 'gameover' || this.gameState === 'victory') {
        this.restart();
    }
});
```

- [ ] **Step 2: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: 完善游戏结束和胜利界面，支持点击重启"
```

---

## Task 6: 添加攻击连招系统和视觉增强

**Files:**
- Modify: `js/player.js` (连招系统)
- Modify: `js/vfx.js` (增强特效)
- Modify: `index.html` (连击UI)

- [ ] **Step 1: 添加3段连招系统**

修改 `js/player.js` `attack()`:
```javascript
attack() {
    if (this.cooldowns.attack > 0 || this.hp <= 0) return null;

    this.cooldowns.attack = SKILLS.normal.cooldown;

    // 连招计数
    this.comboCount = (this.comboCount || 0) + 1;
    if (this.comboCount > 3) this.comboCount = 1;
    this.comboTimer = 1.5;

    // 连招伤害加成
    const comboMultiplier = 1 + (this.comboCount - 1) * 0.2;
    const damage = SKILLS.normal.damage * comboMultiplier * (1 + this.combo * 0.05);

    audio.playAttack();

    // 不同连招段的动画
    const angles = [-Math.PI / 3, Math.PI / 6, -Math.PI / 2];
    this.weapon.rotation.z = angles[this.comboCount - 1];
    setTimeout(() => {
        this.weapon.rotation.z = 0;
    }, 200);

    return {
        type: 'normal',
        combo: this.comboCount,
        damage: damage,
        range: SKILLS.normal.range + (this.comboCount === 3 ? 1 : 0),
        position: this.position.clone(),
        direction: this.getDirection()
    };
}
```

- [ ] **Step 2: 修改连击计时器**

在 `update()` 中:
```javascript
if (this.comboTimer > 0) {
    this.comboTimer -= delta;
    if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboCount = 0;
    }
}
```

- [ ] **Step 3: 添加连击UI**

在 `index.html` 中修改combo元素:
```html
<div id="combo">
    <span id="combo-count"></span>
    <span id="combo-text">COMBO</span>
</div>
```

添加样式:
```css
#combo {
    position: fixed; top: 50%; right: 100px; transform: translateY(-50%);
    color: #e94560; z-index: 100; pointer-events: none;
    opacity: 0; transition: opacity 0.3s; text-align: center;
}
#combo.show { opacity: 1; }
#combo-count { font-size: 3rem; font-weight: bold; display: block; text-shadow: 0 0 20px #e94560; }
#combo-text { font-size: 1rem; display: block; }
```

修改 `updateCombo()`:
```javascript
updateCombo() {
    const comboElement = document.getElementById('combo');
    if (this.player.combo > 1) {
        document.getElementById('combo-count').textContent = this.player.combo;
        comboElement.classList.add('show');
        clearTimeout(this.comboTimeout);
        this.comboTimeout = setTimeout(() => {
            comboElement.classList.remove('show');
        }, 1500);
    }
}
```

- [ ] **Step 4: 增强攻击特效**

修改 `js/vfx.js` `createAttackEffect()` 添加连招视觉差异:
```javascript
createAttackEffect(position, direction, type = 'normal', combo = 1) {
    const color = type === 'ultimate' ? CONFIG.colors.accent : CONFIG.colors.primary;
    const count = combo === 3 ? 20 : combo === 2 ? 15 : 10;

    for (let i = 0; i < count; i++) {
        const spread = combo === 3 ? 0.5 : 0.3;
        const particle = this.createParticle(
            position.clone().add(direction.clone().multiplyScalar(i * spread)),
            color,
            0.5
        );
        particle.velocity = direction.clone().multiplyScalar(10 + Math.random() * 5);
        this.particles.push(particle);
    }

    if (type === 'skill' || type === 'ultimate') {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const particle = this.createPetal(
                position.clone().add(new THREE.Vector3(
                    Math.cos(angle) * 2,
                    1 + Math.random(),
                    Math.sin(angle) * 2
                )),
                CONFIG.colors.petal
            );
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * 3,
                2 + Math.random() * 2,
                Math.sin(angle) * 3
            );
            this.particles.push(particle);
        }
    }
}
```

修改 `playerAttack()` 传入combo:
```javascript
playerAttack() {
    const attack = this.player.attack();
    if (attack) {
        this.vfx.createAttackEffect(attack.position, attack.direction, attack.type, attack.combo);
        this.checkHit(attack);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add js/player.js js/vfx.js js/main.js index.html
git commit -m "feat: 3段连招系统和连击UI"
```

---

## Task 7: 添加背景音乐和音效增强

**Files:**
- Modify: `js/audio.js` (背景音乐生成)

- [ ] **Step 1: 添加程序化背景音乐**

修改 `js/audio.js`:
```javascript
class AudioManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.bgmPlaying = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('WebAudio not supported');
        }
    }

    startBGM() {
        if (!this.ctx || this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.playBGMLoop();
    }

    playBGMLoop() {
        if (!this.bgmPlaying || !this.ctx) return;

        // 简单的古风旋律
        const notes = [
            { freq: 261.63, dur: 0.5 }, // C4
            { freq: 293.66, dur: 0.5 }, // D4
            { freq: 329.63, dur: 0.5 }, // E4
            { freq: 261.63, dur: 0.5 }, // C4
            { freq: 349.23, dur: 0.5 }, // F4
            { freq: 329.63, dur: 0.5 }, // E4
            { freq: 293.66, dur: 0.5 }, // D4
            { freq: 261.63, dur: 0.5 }, // C4
        ];

        let time = this.ctx.currentTime;
        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.frequency.value = note.freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + note.dur);
            osc.start(time);
            osc.stop(time + note.dur);
            time += note.dur;
        });

        // 循环播放
        setTimeout(() => this.playBGMLoop(), notes.length * 500);
    }

    stopBGM() {
        this.bgmPlaying = false;
    }

    // ... 其余方法保持不变
}
```

在 `main.js` `init()` 中添加:
```javascript
// 用户交互后启动BGM
document.addEventListener('click', () => {
    if (!audio.bgmPlaying) {
        audio.startBGM();
    }
}, { once: false });
```

- [ ] **Step 2: Commit**

```bash
git add js/audio.js js/main.js
git commit -m "feat: 添加程序化背景音乐"
```

---

## Task 8: 最终整合测试

- [ ] **Step 1: 在浏览器中测试完整游戏流程**
  - 加载游戏
  - WASD移动（相对相机方向）
  - 鼠标旋转视角
  - 左键攻击（3段连招）
  - 右键泪雨术
  - Q天魁星
  - E大招
  - 空格翻滚
  - 击败Boss触发胜利
  - 被击败触发失败
  - 点击重启

- [ ] **Step 2: 修复发现的问题**

- [ ] **Step 3: 最终Commit**
```bash
git add -A
git commit -m "chore: 游戏优化完成，可完整游玩"
```
