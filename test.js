const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const dir = '/Users/admin/Documents/project/腾讯黑客松项目/黑神话daiyu';

// Read all JS files
const jsFiles = ['config.js', 'levels.js', 'audio.js', 'world.js', 'player.js', 'boss.js', 'vfx.js', 'main.js'];
const jsContent = jsFiles.map(f => {
    const content = fs.readFileSync(path.join(dir, 'js', f), 'utf8');
    return `<script>${content}</script>`;
}).join('\n');

// Read HTML
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

// Replace external script tags with inline content
html = html.replace(/<script src="[^"]*three\.js[^"]*"><\/script>/, '<script>/* three.js placeholder */</script>');
html = html.replace(/<script src="js\/[^"]*"><\/script>/g, '');

// Inject JS before closing body
html = html.replace('</body>', jsContent + '\n</body>');

const errors = [];
const warnings = [];

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(window) {
        window.onerror = (msg, url, line, col, err) => {
            errors.push(`ERROR: ${msg} at line ${line}`);
        };
        window.addEventListener('error', (e) => {
            errors.push(`ERROR: ${e.message} at ${e.filename}:${e.lineno}`);
        });
        window.addEventListener('unhandledrejection', (e) => {
            errors.push(`UNHANDLED REJECTION: ${e.reason}`);
        });
        // Mock THREE.js
        window.THREE = {
            Scene: function() { this.fog = null; this.add = () => {}; this.remove = () => {}; this.traverse = (fn) => fn(this); },
            PerspectiveCamera: function() { this.aspect = 1; this.updateProjectionMatrix = () => {}; this.position = { x:0, y:0, z:0, copy:()=>{}, add:()=>{}, lerp:()=>{} }; this.lookAt = () => {}; },
            WebGLRenderer: function() { this.setSize = () => {}; this.setPixelRatio = () => {}; this.render = () => {}; this.shadowMap = { enabled: false, type: null }; this.toneMapping = 0; this.toneMappingExposure = 1; this.domElement = { width: 800, height: 600 }; },
            Fog: function() {},
            Vector3: function(x,y,z) { this.x=x||0; this.y=y||0; this.z=z||0; this.clone = () => new THREE.Vector3(this.x,this.y,this.z); this.copy = (v) => { this.x=v.x; this.y=v.y; this.z=v.z; return this; }; this.add = (v) => { this.x+=v.x; this.y+=v.y; this.z+=v.z; return this; }; this.sub = (v) => { this.x-=v.x; this.y-=v.y; this.z-=v.z; return this; }; this.subVectors = (a,b) => { this.x=a.x-b.x; this.y=a.y-b.y; this.z=a.z-b.z; return this; }; this.normalize = () => this; this.length = () => 1; this.lengthSq = () => 1; this.distanceTo = () => 5; this.multiplyScalar = (s) => { this.x*=s; this.y*=s; this.z*=s; return this; }; },
            Group: function() { this.children = []; this.add = (c) => this.children.push(c); this.position = { x:0, y:0, z:0, copy:()=>{}, set:()=>{} }; this.rotation = { x:0, y:0, z:0 }; this.scale = { x:1, y:1, z:1, set:()=>{}, multiplyScalar:()=>{} }; },
            Mesh: function(g, m) { this.position = { x:0, y:0, z:0, copy:()=>{}, set:()=>{}, add:()=>{} }; this.rotation = { x:0, y:0, z:0 }; this.scale = { x:1, y:1, z:1, set:()=>{}, multiplyScalar:()=>{} }; this.material = m; this.castShadow = false; this.receiveShadow = false; this.name = ''; },
            MeshStandardMaterial: function(p) { this.color = { set:()=>{}, clone:()=>({set:()=>{}, copy:()=>{}}) }; this.emissive = { set:()=>{} }; },
            MeshBasicMaterial: function(p) { this.color = { set:()=>{}, clone:()=>({set:()=>{}, copy:()=>{}}) }; this.opacity = 1; },
            CylinderGeometry: function() {},
            ConeGeometry: function() {},
            SphereGeometry: function() {},
            BoxGeometry: function() {},
            CircleGeometry: function() {},
            PlaneGeometry: function() {},
            TorusGeometry: function() {},
            OctahedronGeometry: function() {},
            GridHelper: function() {},
            DirectionalLight: function() { this.position = { x:0, y:0, z:0, copy:()=>{} }; this.shadow = { mapSize: { width:0, height:0 }, camera: { near:0, far:0, left:0, right:0, top:0, bottom:0 } }; },
            PointLight: function() { this.position = { x:0, y:0, z:0, copy:()=>{} }; },
            AmbientLight: function() {},
            ShaderMaterial: function() {},
            PCFSoftShadowMap: 1,
            ACESFilmicToneMapping: 1,
            BackSide: 1,
            DoubleSide: 1,
        };
    }
});

// Wait for scripts to execute
setTimeout(() => {
    const window = dom.window;

    console.log('=== DOM Structure Check ===');

    // Check critical elements
    const criticalIds = [
        'start-screen', 'start-btn', 'controls-btn', 'controls-screen', 'controls-back',
        'credits-btn', 'credits-screen', 'credits-back',
        'story-screen', 'story-text', 'story-continue',
        'hud', 'hp-fill', 'mp-fill', 'hp-text', 'mp-text',
        'boss-hud', 'boss-name', 'boss-hp-fill', 'boss-hp-text',
        'skills-bar', 'skill-q', 'skill-e', 'cd-q', 'cd-e',
        'controls', 'combo', 'poem', 'level-text',
        'damage-numbers', 'low-hp-overlay', 'crosshair',
        'boss-intro', 'phase-text', 'loot-toast', 'toast-items',
        'lock-hint', 'game-over', 'victory-screen', 'victory-boss-name', 'victory-level',
        'ending-screen', 'pause-screen', 'pause-resume'
    ];

    let missing = 0;
    criticalIds.forEach(id => {
        const el = window.document.getElementById(id);
        if (!el) {
            console.log(`  MISSING: #${id}`);
            missing++;
        }
    });
    if (missing === 0) console.log('  All ' + criticalIds.length + ' critical IDs found ✓');
    else console.log(`  ${missing} IDs missing!`);

    // Check JS globals
    console.log('\n=== JS Globals Check ===');
    const globals = ['CONFIG', 'SKILLS', 'LEVELS', 'PROLOGUE', 'audio', 'THREE'];
    globals.forEach(g => {
        const exists = window[g] !== undefined;
        console.log(`  ${g}: ${exists ? '✓' : '✗ MISSING'}`);
    });

    // Check class existence
    console.log('\n=== Classes Check ===');
    const classes = ['Game', 'Player', 'Boss', 'World', 'VFXManager', 'AudioManager'];
    classes.forEach(c => {
        const exists = typeof window[c] === 'function';
        console.log(`  ${c}: ${exists ? '✓' : '✗ MISSING'}`);
    });

    // Check for errors
    console.log('\n=== Errors ===');
    if (errors.length === 0) {
        console.log('  No errors detected ✓');
    } else {
        errors.forEach(e => console.log('  ' + e));
    }

    // Check start screen visibility
    console.log('\n=== Start Screen ===');
    const startScreen = window.document.getElementById('start-screen');
    if (startScreen) {
        const style = window.getComputedStyle(startScreen);
        console.log('  display:', style.display);
        console.log('  background:', style.background ? 'set ✓' : 'MISSING');
    }

    // Check game state
    console.log('\n=== Game State ===');
    // Game is instantiated on window.load, check if it exists
    console.log('  Game class defined:', typeof window.Game === 'function' ? '✓' : '✗');

    console.log('\n=== Done ===');
    process.exit(0);
}, 2000);
