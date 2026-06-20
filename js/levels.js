const PROLOGUE = [
    '三界失衡，妖魔横行。',
    '太虚幻境崩塌，人间沦为炼狱。',
    '她是绛珠仙草转世——林黛玉。',
    '前世以泪还恩，今生以剑除魔。',
    '花锄化为神兵，泪滴凝成灵力。',
    '潇湘妃子，降世除魔。',
];

const LEVELS = [
    {
        id: 1,
        name: '金锁迷障',
        subtitle: '第一回',
        boss: {
            name: '薛宝钗',
            type: 'baochai',
            displayName: '薛 宝 钗',
            maxHp: 5000,
            attackDamage: 120,
            chargeDamage: 200,
            chargeSpeed: 15,
            attackRange: 4,
            bodyColor: 0xffd700,
            skirtColor: 0xdaa520,
            weaponColor: 0xffd700,
            auraColor: 0xffd700,
            // 原著意象：金锁(护身)·冷香丸(寒气)·牡丹(艳冠群芳)·冷美人(防御反击)
            coldBreathDmg: 90,        // 冷香寒气：直线冰冻弹，命中减速
            coldBreathRange: 18,
            peonyBloomDmg: 130,       // 牡丹绽放：自身周围AOE + 短暂禁锢
            peonyBloomRange: 5,
            reflectChance: 0.25,      // 金锁护体：概率弹反玩家普攻（阶段2+）
            phases: [
                { hpThreshold: 1.0, pattern: 'normal', damageResistance: 0, weaknessMultiplier: 1 },
                { hpThreshold: 0.6, pattern: 'enraged', damageResistance: 0.15, weaknessMultiplier: 1.1 },
                { hpThreshold: 0.3, pattern: 'desperate', damageResistance: 0.25, weaknessMultiplier: 1.3 }
            ],
            phaseNames: ['冷香初绽 · 金锁护体', '牡丹怒放 · 冷酷无情', '金锁将碎 · 玉石俱焚'],
            phaseDialogues: ['金锁有灵，岂容你放肆！', '牡丹花开，冷香彻骨——你该退下了！', '金锁将碎……玉石俱焚，也在所不惜！'],
            projectileBaseDmg: 80,
        },
        world: {
            groundColor: 0x1a0a2e,
            fogColor: 0x0f0a1a,
            ambientColor: 0x1a1a2e,
            ambientIntensity: 0.3,
            moonColor: 0x4a4a8a,
            pointLightColor: 0xe94560,
            skyTop: 0x0a0a2e,
            skyBottom: 0x1a0a2e,
            petalColor: 0xffb6c1,
            petalCount: 100,
        },
        story: {
            intro: [
                '潇湘馆，月色如霜。',
                '林黛玉自太虚幻境苏醒，手持花锄，踏上降魔之路。',
                '忽闻金锁碎裂之声——',
                '薛宝钗被金锁中的妖物附体，化为金甲战士挡在前方。',
            ],
            victory: [
                '金锁碎裂，妖气散尽。',
                '宝钗缓缓睁开双眼："黛玉……太虚幻境的守门人已经苏醒……"',
                '"你必须去荣国府，那里有更大的危险在等着你。"',
            ],
        },
        loot: [
            { name: '潇湘泪·残片', desc: '蕴含灵力的泪滴结晶', color: '#87ceeb' },
            { name: '花锄碎片', desc: '葬花锄上脱落的灵木碎片', color: '#ffb6c1' },
            { name: '金锁碎片', desc: '薛宝钗金锁的残余力量', color: '#ffd93d' },
        ],
    },
    {
        id: 2,
        name: '妒火炼狱',
        subtitle: '第二回',
        boss: {
            name: '赵姨娘',
            type: 'zhaoyiniang',
            displayName: '赵 姨 娘',
            maxHp: 7000,
            attackDamage: 150,
            chargeDamage: 250,
            chargeSpeed: 18,
            attackRange: 4.5,
            bodyColor: 0xff4500,
            skirtColor: 0xcc3300,
            weaponColor: 0xff6600,
            auraColor: 0xff4400,
            // 原著意象：魇魔法(与马道婆用纸人纸鬼诅咒宝玉凤姐)·嫉妒之火·暗算·庶出怨毒
            paperDollDmg: 110,        // 纸人诅咒：召唤追踪纸人，接触爆炸
            paperDollCount: 1,        // 同时召唤纸人数（阶段2增加）
            fireBreathDmg: 60,        // 妒火吐息：前方扇形持续火焰（多段）
            fireBreathRange: 7,
            curseDmg: 100,            // 魇魔诅咒弹：暗紫追踪弹
            phases: [
                { hpThreshold: 1.0, pattern: 'normal', damageResistance: 0, weaknessMultiplier: 1 },
                { hpThreshold: 0.5, pattern: 'enraged', damageResistance: 0.1, weaknessMultiplier: 1.15 },
                { hpThreshold: 0.2, pattern: 'desperate', damageResistance: 0.2, weaknessMultiplier: 1.35 }
            ],
            phaseNames: ['妒火初燃 · 魇魔初现', '烈焰焚心 · 纸人漫天', '灰飞烟灭 · 同归于尽'],
            phaseDialogues: ['你们都该死！都是你们害的！', '嫉妒之火，焚尽一切！纸人听令！', '哈哈哈——同归于尽吧！都别想活！'],
            projectileBaseDmg: 100,
        },
        world: {
            groundColor: 0x2e0a0a,
            fogColor: 0x1a0505,
            ambientColor: 0x2e1a1a,
            ambientIntensity: 0.4,
            moonColor: 0xff6633,
            pointLightColor: 0xff4400,
            skyTop: 0x1a0505,
            skyBottom: 0x2e0a0a,
            petalColor: 0xff6633,
            petalCount: 60,
        },
        story: {
            intro: [
                '荣国府偏院，烈焰焚天。',
                '赵姨娘被嫉妒之火吞噬，化为火焰魔女。',
                '她的笑声在火海中回荡："都是因为你们……都是因为林黛玉！"',
                '火焰化为利刃，向黛玉席卷而来。',
            ],
            victory: [
                '火焰熄灭，赵姨娘倒在灰烬中。',
                '"太虚幻境的……守门人……已经醒了……"',
                '"那面镜子……映出了你最害怕的东西……小心……"',
            ],
        },
        loot: [
            { name: '通灵宝玉', desc: '大荒山无稽崖下的仙石之灵', color: '#4ecdc4' },
            { name: '火焰精华', desc: '赵姨娘嫉妒之火的凝结', color: '#ff6633' },
            { name: '绛珠仙草', desc: '偿还灌溉之恩的仙界灵草', color: '#e94560' },
        ],
    },
    {
        id: 3,
        name: '太虚幻境',
        subtitle: '终回',
        boss: {
            name: '镜中魔',
            type: 'mirror',
            displayName: '镜 中 魔',
            maxHp: 10000,
            attackDamage: 180,
            chargeDamage: 300,
            chargeSpeed: 20,
            attackRange: 5,
            bodyColor: 0x9400d3,
            skirtColor: 0x6a0dad,
            weaponColor: 0xbb77ff,
            auraColor: 0x9932cc,
            // 原著意象：风月宝鉴(正反两面镜)·太虚幻境·镜像分身·碎裂颠倒
            mirrorBarrageDmg: 70,     // 镜面折射弹幕：多方向镜片
            mirrorBarrageCount: 8,    // 弹幕数量（阶段3增加）
            teleportDmg: 220,         // 空间瞬移突袭：瞬移到玩家身后斩击
            shatterDmg: 260,          // 幻境碎裂：大范围镜片爆裂（阶段3终极）
            shatterRange: 9,
            phases: [
                { hpThreshold: 1.0, pattern: 'normal', damageResistance: 0, weaknessMultiplier: 1 },
                { hpThreshold: 0.5, pattern: 'enraged', damageResistance: 0.2, weaknessMultiplier: 1.2 },
                { hpThreshold: 0.25, pattern: 'desperate', damageResistance: 0.3, weaknessMultiplier: 1.4 }
            ],
            phaseNames: ['镜花水月 · 幻境初显', '幻境崩塌 · 镜像分身', '心魔显形 · 万镜碎裂'],
            phaseDialogues: ['你看清自己了吗？这只是开始……', '幻境破碎，镜像分身——你无处可逃！', '你最恐惧的，就是你自己！万镜碎裂！'],
            projectileBaseDmg: 120,
        },
        world: {
            groundColor: 0x0a0a2e,
            fogColor: 0x050510,
            ambientColor: 0x1a0a3e,
            ambientIntensity: 0.2,
            moonColor: 0x9966ff,
            pointLightColor: 0x9932cc,
            skyTop: 0x020010,
            skyBottom: 0x0a0a2e,
            petalColor: 0xcc99ff,
            petalCount: 150,
        },
        story: {
            intro: [
                '太虚幻境，天地颠倒。',
                '一面巨大的古镜悬浮在虚空中，镜面映出无数个黛玉的倒影。',
                '镜中传来低语："林黛玉……你一直在逃避的，就是你自己。"',
                '古镜碎裂，镜中魔化形而出——那是黛玉内心最深处的恐惧。',
            ],
            victory: [
                '镜中魔碎裂，无数镜片化为星光消散。',
                '太虚幻境恢复了平静。',
                '黛玉望着满天星光，微微一笑。',
                '"花谢花飞花满天……这一次，我不会再让花落了。"',
                '人间恢复太平，黛玉归于花神之位。',
            ],
        },
        loot: [
            { name: '太虚幻境碎片', desc: '映照三界的神秘镜片', color: '#9966ff' },
            { name: '通灵宝玉·完整', desc: '大荒山无稽崖下仙石的全部力量', color: '#4ecdc4' },
            { name: '绛珠仙草·化身', desc: '绛珠仙草的最终形态', color: '#e94560' },
        ],
    },
];
