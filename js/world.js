class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.petals = [];
        this.worldConfig = null;
    }

    init(config) {
        this.worldConfig = config || LEVELS[0].world;
        this.createGround();
        this.createRuins();
        this.createTrees();
        this.createPetals();
        this.createLighting();
        this.createSkybox();
    }

    clear() {
        this.petals.forEach(p => this.scene.remove(p));
        this.objects.forEach(o => this.scene.remove(o));
        this.petals = [];
        this.objects = [];
        const toRemove = [];
        this.scene.traverse(child => {
            if ((child.isMesh || child.isLight) && child !== this.scene) {
                if (child.name === 'ground' || child.name === 'grid' || child.name === 'platform' ||
                    child.name === 'sky' || child.name === 'moon' || child.name === 'moonGlow' ||
                    child.name === 'ambient' || child.name === 'moonLight' || child.name === 'pointLight') {
                    toRemove.push(child);
                }
            }
        });
        toRemove.forEach(obj => this.scene.remove(obj));
    }

    createGround() {
        const c = this.worldConfig;
        const groundGeo = new THREE.CircleGeometry(CONFIG.world.size, 64);
        const groundMat = new THREE.MeshStandardMaterial({
            color: c.groundColor, roughness: 0.8, metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.name = 'ground';
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(CONFIG.world.size, 50, 0x2a1a4e, c.groundColor);
        gridHelper.position.y = 0.01;
        gridHelper.name = 'grid';
        this.scene.add(gridHelper);
    }

    createRuins() {
        const c = this.worldConfig;
        const pillarPositions = [
            [-15, 0, -15], [15, 0, -15], [-15, 0, 15], [15, 0, 15],
            [-25, 0, 0], [25, 0, 0], [0, 0, -25], [0, 0, 25]
        ];

        pillarPositions.forEach(pos => {
            const height = 5 + Math.random() * 8;
            const pillar = this.createPillar(height, c);
            pillar.position.set(pos[0], height / 2, pos[2]);
            pillar.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(pillar);
            this.objects.push(pillar);
        });

        const platformGeo = new THREE.CylinderGeometry(8, 10, 1, 8);
        const platformMat = new THREE.MeshStandardMaterial({
            color: c.groundColor, roughness: 0.9, metalness: 0.1
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.y = 0.5;
        platform.receiveShadow = true;
        platform.name = 'platform';
        this.scene.add(platform);
    }

    createPillar(height, c) {
        const group = new THREE.Group();
        const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, height, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: c.groundColor, roughness: 0.7, metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        const topGeo = new THREE.CylinderGeometry(0.6, 0.4, 0.5, 8);
        const top = new THREE.Mesh(topGeo, bodyMat);
        top.position.y = height / 2 + 0.25;
        top.castShadow = true;
        group.add(top);
        return group;
    }

    createTrees() {
        const treePositions = [
            [-20, 0, -20], [20, 0, -20], [-20, 0, 20], [20, 0, 20]
        ];
        treePositions.forEach(pos => {
            const tree = this.createDeadTree();
            tree.position.set(pos[0], 0, pos[2]);
            tree.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(tree);
            this.objects.push(tree);
        });
    }

    createDeadTree() {
        const group = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 6, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a1a, roughness: 0.9, metalness: 0.1 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 3;
        trunk.castShadow = true;
        group.add(trunk);

        const branchCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < branchCount; i++) {
            const branchGeo = new THREE.CylinderGeometry(0.05, 0.1, 2 + Math.random() * 2, 4);
            const branch = new THREE.Mesh(branchGeo, trunkMat);
            const angle = (i / branchCount) * Math.PI * 2;
            branch.position.set(Math.cos(angle) * 0.5, 4 + Math.random() * 2, Math.sin(angle) * 0.5);
            branch.rotation.z = (Math.random() - 0.5) * 1;
            branch.rotation.x = (Math.random() - 0.5) * 0.5;
            branch.castShadow = true;
            group.add(branch);
        }
        return group;
    }

    createPetals() {
        const c = this.worldConfig;
        const petalGeo = new THREE.PlaneGeometry(0.2, 0.2);
        const petalMat = new THREE.MeshBasicMaterial({
            color: c.petalColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7
        });
        this._petalBaseColor = new THREE.Color(c.petalColor);

        for (let i = 0; i < c.petalCount; i++) {
            const petal = new THREE.Mesh(petalGeo, petalMat.clone());
            petal.position.set(
                (Math.random() - 0.5) * 60,
                Math.random() * 15 + 2,
                (Math.random() - 0.5) * 60
            );
            petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            petal.userData = {
                speed: 0.3 + Math.random() * 0.7,
                rotationSpeed: (Math.random() - 0.5) * 2,
                wobble: Math.random() * Math.PI * 2,
                wobbleAmplitude: 0.3 + Math.random() * 0.5,
                wobbleFreq: 0.5 + Math.random() * 1.5,
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.2 + Math.random() * 0.6,
                colorTimer: Math.random() * 8,
                colorDuration: 3 + Math.random() * 4,
                originalColor: petal.material.color.clone()
            };
            this.scene.add(petal);
            this.petals.push(petal);
        }
    }

    createLighting() {
        const c = this.worldConfig;
        const ambientLight = new THREE.AmbientLight(c.ambientColor, c.ambientIntensity);
        ambientLight.name = 'ambient';
        this.scene.add(ambientLight);

        const moonLight = new THREE.DirectionalLight(c.moonColor, 0.5);
        moonLight.position.set(20, 30, 20);
        moonLight.castShadow = true;
        moonLight.shadow.mapSize.width = 2048;
        moonLight.shadow.mapSize.height = 2048;
        moonLight.shadow.camera.near = 0.5;
        moonLight.shadow.camera.far = 100;
        moonLight.shadow.camera.left = -30;
        moonLight.shadow.camera.right = 30;
        moonLight.shadow.camera.top = 30;
        moonLight.shadow.camera.bottom = -30;
        moonLight.name = 'moonLight';
        this.scene.add(moonLight);

        const pointLight = new THREE.PointLight(c.pointLightColor, 0.5, 20);
        pointLight.position.set(0, 5, 0);
        pointLight.name = 'pointLight';
        this.scene.add(pointLight);
    }

    createSkybox() {
        const c = this.worldConfig;
        const skyGeo = new THREE.SphereGeometry(100, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(c.skyTop) },
                bottomColor: { value: new THREE.Color(c.skyBottom) },
                offset: { value: 10 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.name = 'sky';
        this.scene.add(sky);

        const moonGeo = new THREE.SphereGeometry(3, 32, 32);
        const moonMat = new THREE.MeshBasicMaterial({ color: c.moonColor });
        const moon = new THREE.Mesh(moonGeo, moonMat);
        moon.position.set(30, 40, -30);
        moon.name = 'moon';
        this.scene.add(moon);

        const glowGeo = new THREE.SphereGeometry(5, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({ color: c.moonColor, transparent: true, opacity: 0.2 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(moon.position);
        glow.name = 'moonGlow';
        this.scene.add(glow);
    }

    update(delta) {
        this.petals.forEach(petal => {
            const ud = petal.userData;
            ud.wobble += delta * ud.wobbleFreq;
            ud.sway += delta * ud.swaySpeed;
            petal.position.y -= delta * ud.speed * 0.5;
            petal.position.x += Math.sin(ud.wobble) * delta * ud.wobbleAmplitude;
            petal.position.z += Math.cos(ud.sway) * delta * ud.wobbleAmplitude * 0.4;
            petal.rotation.x += delta * ud.rotationSpeed;
            petal.rotation.z += delta * ud.rotationSpeed * 0.5;
            petal.rotation.y += delta * ud.rotationSpeed * 0.3;

            ud.colorTimer += delta;
            if (ud.colorTimer > ud.colorDuration) {
                ud.colorTimer = 0;
                ud.colorDuration = 3 + Math.random() * 4;
                if (Math.random() < 0.15 && this._petalBaseColor) {
                    const altColors = [0xffb6c1, 0xdda0dd, 0xb0c4de, 0xffd93d, 0xffffff];
                    const target = new THREE.Color(altColors[Math.floor(Math.random() * altColors.length)]);
                    petal.material.color.lerpColors(ud.originalColor, target, 0.5 + Math.random() * 0.5);
                    petal.material.opacity = 0.5 + Math.random() * 0.3;
                    ud._colorTarget = target;
                } else if (ud._colorTarget) {
                    petal.material.color.copy(ud.originalColor);
                    petal.material.opacity = 0.7;
                    ud._colorTarget = null;
                }
            }

            if (petal.position.y < 0) {
                petal.position.y = 15 + Math.random() * 5;
                petal.position.x = (Math.random() - 0.5) * 60;
                petal.position.z = (Math.random() - 0.5) * 60;
            }
        });

        const moonGlow = this.scene.getObjectByName('moonGlow');
        if (moonGlow) {
            const t = Date.now() * 0.001;
            const breathe = 0.5 + 0.5 * Math.sin(t * 0.8);
            moonGlow.material.opacity = 0.12 + breathe * 0.18;
            const s = 5 + breathe * 0.8;
            moonGlow.scale.set(s / 5, s / 5, s / 5);
        }
    }
}
