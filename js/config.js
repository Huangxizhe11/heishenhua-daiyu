// config.js - 游戏配置参数
const CONFIG = {
    // 玩家配置 - 林黛玉
    player: {
        maxHp: 1000,
        maxMp: 500,
        moveSpeed: 8,
        dashSpeed: 25,
        dashDuration: 0.2,
        dashCooldown: 0.5,
        attackDamage: 80,
        attackRange: 3,
        attackCooldown: 0.3,
        skillDamage: 150,
        skillRange: 8,
        skillCooldown: 2,
        ultimateDamage: 400,
        ultimateRange: 12,
        ultimateCooldown: 10,
        invincibleDuration: 0.5,
        height: 1.6,
    },

    // Boss配置 - 薛宝钗
    boss: {
        name: '薛宝钗',
        maxHp: 5000,
        phases: [
            { hpThreshold: 1.0, pattern: 'normal' },
            { hpThreshold: 0.6, pattern: 'enraged' },
            { hpThreshold: 0.3, pattern: 'desperate' }
        ],
        attackDamage: 120,
        attackRange: 4,
        chargeSpeed: 15,
        chargeDamage: 200,
    },

    // 场景配置
    world: {
        size: 100,
        groundColor: 0x1a0a2e,
        fogColor: 0x0f0a1a,
        fogNear: 20,
        fogFar: 80,
    },

    // 视觉效果配置
    vfx: {
        bloomStrength: 1.5,
        bloomRadius: 0.4,
        bloomThreshold: 0.85,
        filmGrainIntensity: 0.05,
        vignetteIntensity: 0.3,
    },

    // 配色方案
    colors: {
        primary: 0xe94560,      // 红色
        secondary: 0x4ecdc4,    // 青色
        accent: 0xffd93d,       // 金色
        dark: 0x1a0a2e,         // 深紫
        light: 0xffffff,        // 白色
        petal: 0xffb6c1,        // 花瓣粉
        tears: 0x87ceeb,        // 泪水蓝
    },

    // 音效配置
    audio: {
        masterVolume: 0.5,
        bgmVolume: 0.3,
        sfxVolume: 0.7,
    },

    // 相机配置
    camera: {
        distance: 10,
        height: 5,
        smoothing: 0.05,
    }
};

// 战斗系统配置
const COMBAT = {
    comboWindow: 2,
    comboDamageMultipliers: [1, 1.2, 1.5],
    comboRanges: [3, 3.5, 4.5],
    chargeMaxTime: 1.5,
    chargeMinTime: 0.35,
    chargeDamageMultiplier: 3,
    chargeRangeMultiplier: 1.5,
    perfectDodgeWindow: 0.3,
    perfectDodgeBonus: 2,
    mpPerHit: 5,
    mpPerComboFinish: 10,
    skillBuffDuration: 5,
    tearBuffCount: 3,
    tearBuffDamageMultiplier: 1.3,
    ultimateBuffRangeMultiplier: 1.5,
    charmBuffHealPerHit: 30,
    charmBuffCount: 3,
};

// 技能配置
const SKILLS = {
    normal: {
        name: '葬花剑',
        damage: CONFIG.player.attackDamage,
        range: CONFIG.player.attackRange,
        cooldown: CONFIG.player.attackCooldown,
        mpCost: 0,
        description: '挥舞花锄，释放剑气'
    },
    skill: {
        name: '泪雨术',
        damage: CONFIG.player.skillDamage,
        range: CONFIG.player.skillRange,
        cooldown: CONFIG.player.skillCooldown,
        mpCost: 50,
        description: '召唤泪雨，范围伤害'
    },
    ultimate: {
        name: '天魁星',
        damage: CONFIG.player.ultimateDamage,
        range: CONFIG.player.ultimateRange,
        cooldown: CONFIG.player.ultimateCooldown,
        mpCost: 150,
        description: '化身天魁星，毁灭一切'
    },
    charm: {
        name: '颦颦一笑',
        healAmount: 200,
        mpRestore: 100,
        cooldown: 8,
        mpCost: 0,
        stunDuration: 2.5,
        description: '回眸一笑，魅惑敌人'
    }
};
