/* Острова Ветра — мир архипелага */
(function () {
  'use strict';

  const T = window.Terrain;
  const V = THREE.Vector3;
  const clamp = T.clamp;

  const ISLAND_DEFS = [
    {
      id: 'heart', name: 'Сердце архипелага', pos: [0, 0, 0], R: 60, dome: 2.2,
      seed: 3.4, style: 'lobed', roughness: 0.35, depth: 40, roll: 1.6,
      palette: { grassA: 0x6fae58, grassB: 0x4d8b4b, rock: 0x8d8371, rockDark: 0x5e574b, dirt: 0xb1895d },
      tiers: [
        { r: 0.81, h: 1.2, w: 0.09, ramp: 0.55 },
        { r: 0.60, h: 1.6, w: 0.08, ramp: 2.5 },
        { r: 0.36, h: 1.6, w: 0.07, ramp: 4.35 }
      ],
      bumps: [
        { x: 24, z: -20, r: 24.0, h: 3.4 },
        { x: -28, z: 18, r: 20.0, h: 2.4 },
        { x: 6, z: 34, r: 18.0, h: 1.8 }
      ],
      crystals: [{ x: 24, z: -26 }, { x: -28, z: 12 }],
      treeDensity: 1.1,
      spawn: { x: 20, z: 30 }
    },
    {
      id: 'west', name: 'Западный утёс', pos: [-160, 8, 24], R: 42, dome: 1.6,
      seed: 7.1, style: 'broken', roughness: 0.4, depth: 30, roll: 1.4,
      palette: { grassA: 0x7ab85d, grassB: 0x548f4c, rock: 0x968a76, rockDark: 0x635b4f, dirt: 0xb08a5f },
      tiers: [
        { r: 0.83, h: 0.9, w: 0.12, ramp: -1.1 },
        { r: 0.58, h: 1.4, w: 0.10, ramp: 0.8 }
      ],
      bumps: [
        { x: -12, z: 7, r: 20.0, h: 3.2 },
        { x: 16, z: -10, r: 18.0, h: 2.0 },
        { x: 7, z: 18, r: 14.0, h: 1.4 }
      ],
      crystals: [{ x: 14, z: -12 }, { x: -16, z: 9 }],
      treeDensity: 0.95
    },
    {
      id: 'garden', name: 'Сад камней', pos: [-104, -5, -138], R: 40, dome: 1.4,
      seed: 11.3, style: 'broken', roughness: 0.38, depth: 28, roll: 1.2,
      palette: { grassA: 0x87ba5d, grassB: 0x5d984f, rock: 0x9f917a, rockDark: 0x6b6152, dirt: 0xb98f60 },
      tiers: [
        { r: 0.84, h: 0.8, w: 0.14, ramp: 2.0 },
        { r: 0.64, h: 1.2, w: 0.12, ramp: 4.2 },
        { r: 0.42, h: 1.3, w: 0.10, ramp: 0.6 }
      ],
      bumps: [
        { x: 7, z: 7, r: 13.0, h: 2.2 },
        { x: -12, z: -4, r: 12.0, h: 1.8 },
        { x: 14, z: -10, r: 10.0, h: 1.5 },
        { x: -4, z: 16, r: 10.0, h: 1.2 },
        { x: 20, z: 9, r: 8.0, h: 1.0 }
      ],
      crystals: [{ x: 2, z: 2 }, { x: 14, z: 9 }],
      treeDensity: 0.8,
      flowers: 2.0
    },
    {
      id: 'crystal', name: 'Кристальный пик', pos: [64, 12, -140], R: 36, dome: 1.4,
      seed: 15.8, style: 'spire', roughness: 0.4, depth: 28, roll: 1.0,
      palette: { grassA: 0x74b39b, grassB: 0x4f8f83, rock: 0x8b9393, rockDark: 0x5e6a6d, dirt: 0x9c9a86 },
      tiers: [
        { r: 0.81, h: 0.9, w: 0.12, ramp: 1.15 },
        { r: 0.57, h: 1.4, w: 0.10, ramp: 3.4 }
      ],
      bumps: [
        { x: 0, z: 0, r: 16.0, h: 5.5 },
        { x: -14, z: 12, r: 11.0, h: 1.5 },
        { x: 14, z: -10, r: 11.0, h: 1.4 }
      ],
      crystals: [{ x: 1, z: -1 }, { x: 12, z: -9 }],
      treeDensity: 0.6,
      glowFlowers: true
    },
    {
      id: 'twin', name: 'Скалы-близнецы', pos: [176, 4, -24], R: 46, dome: 1.4,
      seed: 19.2, style: 'twin', roughness: 0.42, depth: 34, roll: 1.5,
      palette: { grassA: 0x72b259, grassB: 0x4c8a4c, rock: 0x958774, rockDark: 0x61594d, dirt: 0xb18a5f },
      tiers: [
        { r: 0.82, h: 0.8, w: 0.13, ramp: 2.65 },
        { r: 0.60, h: 1.2, w: 0.11, ramp: 5.1 }
      ],
      bumps: [
        { x: -16, z: 2, r: 20.0, h: 4.5 },
        { x: 16, z: -2, r: 19.0, h: 3.8 }
      ],
      crystals: [{ x: 14, z: 7 }],
      treeDensity: 0.95
    },
    {
      id: 'roots', name: 'Висячие корни', pos: [120, -8, 144], R: 42, dome: 2.0,
      seed: 23.6, style: 'broken', roughness: 0.38, depth: 32, roll: 1.3,
      palette: { grassA: 0x5d9b50, grassB: 0x3f7a44, rock: 0x7e6d58, rockDark: 0x53483b, dirt: 0x9b764f },
      tiers: [
        { r: 0.83, h: 0.8, w: 0.13, ramp: 0.2 },
        { r: 0.60, h: 1.2, w: 0.11, ramp: 2.9 }
      ],
      bumps: [
        { x: 9, z: 5, r: 16.0, h: 2.6 },
        { x: -14, z: -9, r: 14.0, h: 1.8 }
      ],
      crystals: [{ x: 7, z: -7 }],
      treeDensity: 1.6,
      bigTrees: true
    },
    {
      id: 'bay', name: 'Тихая заводь', nameTo: 'Тихую заводь', pos: [-88, 2, 152], R: 38, dome: 1.6,
      seed: 27.9, style: 'lobed', roughness: 0.36, depth: 26, roll: 1.1,
      palette: { grassA: 0x8fc36c, grassB: 0x679f58, rock: 0x9c8f79, rockDark: 0x68604f, dirt: 0xba9160 },
      tiers: [
        { r: 0.83, h: 0.8, w: 0.13, ramp: 1.5 },
        { r: 0.60, h: 1.1, w: 0.11, ramp: 3.8 }
      ],
      bumps: [
        { x: -12, z: -12, r: 14.0, h: 2.2 },
        { x: 16, z: -9, r: 12.0, h: 1.2 }
      ],
      crystals: [{ x: -12, z: 9 }],
      treeDensity: 0.85,
      pond: { x: 13, z: 18, r: 10.0, depth: 2.6 },
      flowers: 1.7
    },
    {
      id: 'high', name: 'Небесный маяк', pos: [-12, 34, -152], R: 28, dome: 1.6,
      seed: 33.2, style: 'spire', roughness: 0.38, depth: 20, roll: 0.9,
      palette: { grassA: 0x9fc3a8, grassB: 0x7aa78d, rock: 0x949e9f, rockDark: 0x626d70, dirt: 0xa6a68f },
      tiers: [
        { r: 0.81, h: 0.9, w: 0.12, ramp: 1.8 },
        { r: 0.57, h: 1.2, w: 0.10, ramp: 4.5 }
      ],
      bumps: [{ x: 0, z: 0, r: 13.0, h: 4.0 }],
      crystals: [{ x: 0, z: 0 }],
      treeDensity: 0.45
    }
  ];

  const BRIDGE_PAIRS = [
    ['heart', 'west'],
    ['heart', 'garden'],
    ['heart', 'twin'],
    ['heart', 'roots'],
    ['heart', 'bay'],
    ['west', 'garden'],
    ['garden', 'crystal'],
    ['crystal', 'twin']
  ];

  function makeMaterial(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: opts.roughness === undefined ? 0.9 : opts.roughness,
      metalness: opts.metalness || 0,
      flatShading: !!opts.flat,
      side: opts.side || THREE.FrontSide,
      transparent: !!opts.transparent,
      opacity: opts.opacity === undefined ? 1 : opts.opacity,
      map: opts.map || null,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0
    });
  }

  function makeGlowSprite(color, scale, opacity) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: T.getGlowTexture(),
      color: color,
      transparent: true,
      opacity: opacity === undefined ? 0.6 : opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    sprite.scale.set(scale, scale, 1);
    return sprite;
  }

  /* ---------- мост ---------- */
  class Bridge {
    constructor(a, b, index) {
      this.a = a.clone();
      this.b = b.clone();
      this.index = index;
      this.hLen = Math.hypot(b.x - a.x, b.z - a.z);
      this.width = 2.3;
      this.half = 1.08;
      this.sag = Math.min(4.5, 1.0 + this.hLen * 0.03);
      this.dirX = (b.x - a.x) / (this.hLen || 1);
      this.dirZ = (b.z - a.z) / (this.hLen || 1);
      this.group = new THREE.Group();
      this.build();
    }

    pointAt(t) {
      const endFade = T.smoothstep(0, 0.2, t) * T.smoothstep(1, 0.8, t);
      return {
        x: T.lerp(this.a.x, this.b.x, t),
        y: T.lerp(this.a.y, this.b.y, t) - this.sag * 4 * t * (1 - t) * endFade,
        z: T.lerp(this.a.z, this.b.z, t)
      };
    }

    railY(t, p) {
      return p.y + 1.06 + 0.62 * Math.pow(2 * t - 1, 2);
    }

    sideAt(t, side) {
      const p = this.pointAt(t);
      // перпендикуляр к направлению моста
      return { x: p.x - this.dirZ * this.half * side, z: p.z + this.dirX * this.half * side };
    }

    closest(x, z) {
      const l2 = this.hLen * this.hLen;
      let t = l2 > 0 ? ((x - this.a.x) * (this.b.x - this.a.x) + (z - this.a.z) * (this.b.z - this.a.z)) / l2 : 0;
      t = clamp(t, 0, 1);
      const p = this.pointAt(t);
      return { t: t, y: p.y, dist: Math.hypot(p.x - x, p.z - z) };
    }

    build() {
      const woodMat = makeMaterial(0xffffff, {
        map: T.getWoodTexture(),
        roughness: 0.94,
        flat: false
      });
      const ropeMat = makeMaterial(0xd8c39b, { roughness: 0.95 });
      const postMat = makeMaterial(0x9a7049, { roughness: 0.92, map: T.getWoodTexture() });
      const darkMat = makeMaterial(0x6e5136, { roughness: 0.95 });
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffd486 });
      const rand = T.mulberry32(100 + this.index * 17);

      // доски
      const count = Math.max(8, Math.floor(this.hLen / 0.52));
      const plankGeo = new THREE.BoxGeometry(this.width, 0.14, 0.48);
      const planks = new THREE.InstancedMesh(plankGeo, woodMat, count);
      const dummy = new THREE.Object3D();
      const q = new THREE.Quaternion();
      const qyaw = new THREE.Quaternion();
      const dir = new V();
      const up = new V(0, 1, 0);
      const right = new V();
      const upPerp = new V();
      const basis = new THREE.Matrix4();
      const col = new THREE.Color();
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const p = this.pointAt(t);
        const p2 = this.pointAt(Math.min(1, t + 0.004));
        dir.set(p2.x - p.x, p2.y - p.y, p2.z - p.z).normalize();
        // строгий базис: доска лежит на настиле, без случайного крена
        right.crossVectors(up, dir).normalize();
        if (!isFinite(right.x) || right.lengthSq() < 0.001) right.set(1, 0, 0);
        upPerp.crossVectors(dir, right).normalize();
        basis.makeBasis(right, upPerp, dir);
        q.setFromRotationMatrix(basis);
        qyaw.setFromAxisAngle(new V(0, 1, 0), (rand() - 0.5) * 0.022);
        q.multiply(qyaw);
        dummy.position.set(p.x, p.y - 0.07, p.z);
        dummy.quaternion.copy(q);
        dummy.scale.set(1 + (rand() - 0.5) * 0.025, 1, 1);
        dummy.updateMatrix();
        planks.setMatrixAt(i, dummy.matrix);
        col.setHex(0xc9a279).multiplyScalar(0.84 + rand() * 0.24);
        planks.setColorAt(i, col);
      }
      planks.instanceMatrix.needsUpdate = true;
      if (planks.instanceColor) planks.instanceColor.needsUpdate = true;
      planks.castShadow = true;
      planks.receiveShadow = true;
      planks.computeBoundingSphere();
      this.group.add(planks);

      // сплошной настил под досками, чтобы мост читался как мост
      const deckMat = makeMaterial(0x9a7048, { roughness: 0.96, map: T.getWoodTexture(), side: THREE.DoubleSide });
      const segs = Math.max(28, Math.floor(this.hLen / 1.4));
      const dpos = [];
      const duv = [];
      const didx = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = this.pointAt(t);
        const ox = -this.dirZ * (this.width * 0.46);
        const oz = this.dirX * (this.width * 0.46);
        dpos.push(p.x + ox, p.y - 0.16, p.z + oz);
        dpos.push(p.x - ox, p.y - 0.16, p.z - oz);
        duv.push(0, t * this.hLen * 0.8);
        duv.push(1, t * this.hLen * 0.8);
        if (i < segs) {
          const a = i * 2;
          didx.push(a, a + 1, a + 3, a, a + 3, a + 2);
        }
      }
      const deckGeo = new THREE.BufferGeometry();
      deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3));
      deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(duv, 2));
      deckGeo.setIndex(didx);
      deckGeo.computeVertexNormals();
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.castShadow = true;
      deck.receiveShadow = true;
      this.group.add(deck);

      // опоры и фонари на концах
      const postGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
      const capGeo = new THREE.BoxGeometry(0.32, 0.1, 0.32);
      for (let end = 0; end < 2; end++) {
        const t = end;
        const p = this.pointAt(t);
        for (let side = -1; side <= 1; side += 2) {
          const s = this.sideAt(t, side);
          const post = new THREE.Mesh(postGeo, postMat);
          post.position.set(s.x, p.y + 0.65, s.z);
          post.castShadow = true;
          post.receiveShadow = true;
          this.group.add(post);
          const cap = new THREE.Mesh(capGeo, darkMat);
          cap.position.set(s.x, p.y + 1.92, s.z);
          cap.castShadow = true;
          this.group.add(cap);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), lanternMat);
          lamp.position.set(s.x, p.y + 2.07, s.z);
          this.group.add(lamp);
          const glow = makeGlowSprite(0xffc470, 0.7, 0.23);
          glow.position.copy(lamp.position);
          this.group.add(glow);
        }
      }

      // перила-канаты
      for (let side = -1; side <= 1; side += 2) {
        const pts = [];
        const railPoints = Math.max(22, Math.floor(this.hLen / 1.4));
        for (let i = 0; i <= railPoints; i++) {
          const t = i / railPoints;
          const s = this.sideAt(t, side);
          const p = this.pointAt(t);
          pts.push(new V(s.x, this.railY(t, p), s.z));
        }
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
        const ropeSegments = Math.max(36, Math.floor(this.hLen * 0.9));
        const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, ropeSegments, 0.036, 4, false), ropeMat);
        rope.castShadow = true;
        this.group.add(rope);

        // вертикальные подвесы
        const hangerCount = Math.max(2, Math.floor(this.hLen / 1.35));
        const hangerGeo = new THREE.CylinderGeometry(0.013, 0.013, 1, 4);
        hangerGeo.translate(0, 0.5, 0);
        const hangers = new THREE.InstancedMesh(hangerGeo, ropeMat, hangerCount);
        for (let i = 0; i < hangerCount; i++) {
          const t = (i + 0.5) / hangerCount;
          const s = this.sideAt(t, side);
          const p = this.pointAt(t);
          const ry = this.railY(t, p);
          dummy.position.set(s.x, p.y + 0.02, s.z);
          dummy.quaternion.identity();
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, ry - p.y - 0.03, 1);
          dummy.updateMatrix();
          hangers.setMatrixAt(i, dummy.matrix);
        }
        hangers.instanceMatrix.needsUpdate = true;
        hangers.castShadow = false;
        hangers.computeBoundingSphere();
        this.group.add(hangers);
      }
    }
  }

  /* ---------- мир ---------- */
  class World {
    constructor(scene) {
      this.scene = scene;
      this.islands = [];
      this.byId = {};
      this.bridges = [];
      this.crystals = [];
      this.collected = 0;
      this.totalCrystals = 0;
      this.time = 0;
      this.onCollect = null;
      this.waterfalls = [];
      this.waterMats = [];

      this.buildSkyAndLights();
      this.buildIslands();
      this.buildBridges();
      this.buildTrails();
      this.buildProps();
      this.buildWater();
      this.buildCrystals();
      this.buildAtmosphere();
    }

    buildSkyAndLights() {
      const sunDir = new V(0.48, 0.7, 0.42).normalize();
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(640, 40, 24),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: {
            topColor: { value: new THREE.Color(0x24558f) },
            midColor: { value: new THREE.Color(0x70aecb) },
            horizonColor: { value: new THREE.Color(0xffe0ab) },
            sunDir: { value: sunDir.clone() }
          },
          vertexShader: [
            'varying vec3 vDir;',
            'void main() {',
            '  vDir = normalize(position);',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
          ].join('\n'),
          fragmentShader: [
            'uniform vec3 topColor;',
            'uniform vec3 midColor;',
            'uniform vec3 horizonColor;',
            'uniform vec3 sunDir;',
            'varying vec3 vDir;',
            'void main() {',
            '  float h = clamp(vDir.y, -0.2, 1.0);',
            '  vec3 col = mix(horizonColor, midColor, smoothstep(-0.03, 0.24, h));',
            '  col = mix(col, topColor, smoothstep(0.20, 0.9, h));',
            '  float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);',
            '  col += vec3(1.0, 0.72, 0.4) * pow(sd, 14.0) * 0.16;',
            '  col += vec3(1.0, 0.9, 0.7) * pow(sd, 160.0) * 0.45;',
            '  gl_FragColor = vec4(col, 1.0);',
            '  #include <tonemapping_fragment>',
            '  #include <colorspace_fragment>',
            '}'
          ].join('\n')
        })
      );
      sky.frustumCulled = false;
      this.scene.add(sky);

      const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.getGlowTexture(),
        color: 0xffe6b0,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending
      }));
      sunSprite.scale.set(130, 130, 1);
      sunSprite.position.copy(sunDir.clone().multiplyScalar(520));
      this.scene.add(sunSprite);
      const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
        map: T.getGlowTexture(),
        color: 0xfff8e8,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending
      }));
      sunCore.scale.set(38, 38, 1);
      sunCore.position.copy(sunDir.clone().multiplyScalar(516));
      this.scene.add(sunCore);

      this.scene.fog = new THREE.FogExp2(0xd7e6e4, 0.0021);

      const hemi = new THREE.HemisphereLight(0xdcefff, 0x6c7b63, 1.18);
      this.scene.add(hemi);

      const sun = new THREE.DirectionalLight(0xffe9c6, 2.55);
      sun.position.set(62, 100, 48);
      sun.target.position.set(0, 2, 0);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -85;
      sun.shadow.camera.right = 85;
      sun.shadow.camera.top = 85;
      sun.shadow.camera.bottom = -85;
      sun.shadow.camera.near = 1;
      sun.shadow.camera.far = 320;
      sun.shadow.bias = -0.0004;
      sun.shadow.normalBias = 0.055;
      this.scene.add(sun);
      this.scene.add(sun.target);
      this.sun = sun;

      const fill = new THREE.DirectionalLight(0xa9c9f2, 0.42);
      fill.position.set(-70, 32, -50);
      this.scene.add(fill);

      const bounce = new THREE.DirectionalLight(0xb9d2da, 0.5);
      bounce.position.set(-24, -40, 14);
      this.scene.add(bounce);

      this.sunOffset = new V(62, 100, 48);
    }

    buildIslands() {
      for (let i = 0; i < ISLAND_DEFS.length; i++) {
        const def = ISLAND_DEFS[i];
        const island = {
          def: def,
          id: def.id,
          name: def.name,
          pos: new V(def.pos[0], def.pos[1], def.pos[2]),
          R: def.R,
          maxR: def.R * T.edgeMax(def.seed, def.style || 'lobed'),
          bridgeSpots: [],
          trailSamples: [],
          trailCount: 0,
          group: new THREE.Group()
        };
        island.group.position.copy(island.pos);
        island.terrain = T.buildTerrainMesh(def);
        island.under = T.buildUnderside(def);
        island.group.add(island.terrain);
        island.group.add(island.under);
        this.scene.add(island.group);
        this.islands.push(island);
        this.byId[def.id] = island;
        this.addVines(island);
      }
    }

    addVines(island) {
      const def = island.def;
      const rand = T.mulberry32(def.seed * 991 | 0);
      const count = def.id === 'roots' ? 8 : 4;
      const vineMat = makeMaterial(def.id === 'roots' ? 0x5b6b33 : 0x6f7f3e, { roughness: 1 });
      for (let i = 0; i < count; i++) {
        const theta = rand() * Math.PI * 2;
        const er = T.edgeFactor(theta, def.seed, def.style || 'lobed');
        const rr = def.R * er * (0.96 + rand() * 0.03);
        const len = def.id === 'roots' ? 5 + rand() * 8 : 2.4 + rand() * 4;
        const sx = Math.cos(theta) * rr;
        const sz = Math.sin(theta) * rr;
        const pts = [];
        const sway = (rand() - 0.5) * 1.8;
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          pts.push(new V(
            sx + sway * Math.sin(t * 2.1) * t,
            -0.7 - len * t,
            sz + sway * 0.5 * t * Math.cos(t * 1.4)
          ));
        }
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
        const vine = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.03 + rand() * 0.025, 4, false), vineMat);
        vine.castShadow = false;
        island.group.add(vine);
        if (def.id === 'roots' && i % 2 === 0) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), makeMaterial(0x5d7c38, { roughness: 1, flat: true }));
          leaf.position.set(sx + sway * 0.7, -0.9 - len * 0.55, sz);
          leaf.scale.set(1.3, 0.45, 1);
          island.group.add(leaf);
        }
      }
    }

    anchorOf(island, towardPos) {
      const def = island.def;
      const dx = towardPos.x - island.pos.x;
      const dz = towardPos.z - island.pos.z;
      const theta = Math.atan2(dz, dx);
      const er = T.edgeFactor(theta, def.seed, def.style || 'lobed');
      const rr = island.R * er * 0.95;
      const x = Math.cos(theta) * rr;
      const z = Math.sin(theta) * rr;
      const h = T.heightAt(def, x, z);
      return {
        point: new V(island.pos.x + x, island.pos.y + (h === null ? 0 : h) + 0.4, island.pos.z + z),
        angle: theta
      };
    }

    buildBridges() {
      for (let i = 0; i < BRIDGE_PAIRS.length; i++) {
        const a = this.byId[BRIDGE_PAIRS[i][0]];
        const b = this.byId[BRIDGE_PAIRS[i][1]];
        if (!a || !b) continue;
        const aa = this.anchorOf(a, b.pos);
        const bb = this.anchorOf(b, a.pos);
        const bridge = new Bridge(aa.point, bb.point, i);
        bridge.islandA = a;
        bridge.islandB = b;
        this.scene.add(bridge.group);
        this.bridges.push(bridge);
        a.bridgeSpots.push({ angle: aa.angle, bridge: bridge, other: b });
        b.bridgeSpots.push({ angle: bb.angle, bridge: bridge, other: a });
      }
    }

    buildTrails() {
      for (let i = 0; i < this.islands.length; i++) {
        const island = this.islands[i];
        const spots = island.bridgeSpots.slice();
        if (spots.length === 0) spots.push({ angle: 1.35 });
        for (let s = 0; s < spots.length; s++) {
          const wps = T.trailWaypoints(island.def, spots[s].angle);
          const ribbon = T.buildRibbon(island.def, wps, {
            width: 1.05,
            lift: 0.055 + (island.trailCount % 4) * 0.009
          });
          island.group.add(ribbon.mesh);
          island.trailSamples.push.apply(island.trailSamples, ribbon.samples);
          island.trailCount++;
        }
      }
    }

    nearTrail(island, x, z, radius) {
      const samples = island.trailSamples;
      const r2 = (radius === undefined ? 1.05 : radius) * (radius === undefined ? 1.05 : radius);
      for (let i = 0; i < samples.length; i += 2) {
        const dx = samples[i].x - x;
        const dz = samples[i].z - z;
        if (dx * dx + dz * dz < r2) return true;
      }
      return false;
    }

    buildProps() {
      const treeData = [];
      const leafBlobs = [];
      const pineCones = [];
      const rockData = [];
      const bushData = [];
      const flowerData = [];
      const grassData = [];
      const flowerPalette = [0xffd6e6, 0xffe9a0, 0xf6fbff, 0xd9c6ff, 0xffb08a];

      for (let ii = 0; ii < this.islands.length; ii++) {
        const island = this.islands[ii];
        const def = island.def;
        const rand = T.mulberry32((def.seed * 1733) | 0);
        const localPoint = (u, theta) => {
          const er = T.edgeFactor(theta, def.seed, def.style || 'lobed');
          return { x: Math.cos(theta) * def.R * er * u, z: Math.sin(theta) * def.R * er * u };
        };
        const canPlace = (x, z, h, slopeMax, trailDist) => {
          if (h === null) return false;
          if (T.slopeAt(def, x, z) > slopeMax) return false;
          if (this.nearTrail(island, x, z, trailDist || 1.05)) return false;
          if (def.pond) {
            const p = def.pond;
            if (Math.hypot(x - p.x, z - p.z) < p.r + 3.0) return false;
          }
          if (def.spawn && Math.hypot(x - def.spawn.x, z - def.spawn.z) < 8.0) {
            return false;
          }
          if (def.crystals) {
            for (let c = 0; c < def.crystals.length; c++) {
              if (Math.hypot(x - def.crystals[c].x, z - def.crystals[c].z) < 7.0) return false;
            }
          }
          for (let b = 0; b < island.bridgeSpots.length; b++) {
            const theta = island.bridgeSpots[b].angle;
            const er = T.edgeFactor(theta, def.seed, def.style || 'lobed');
            const bx = Math.cos(theta) * def.R * er * 0.95;
            const bz = Math.sin(theta) * def.R * er * 0.95;
            if (Math.hypot(x - bx, z - bz) < 6.0) return false;
          }
          return true;
        };

        const treeCount = Math.round(8 + island.R * 0.55 * def.treeDensity);
        const treeSpots = [];
        const treeSpacing = def.bigTrees ? 7.2 : 6.2;
        for (let k = 0; k < treeCount; k++) {
          let placed = false;
          for (let attempt = 0; attempt < 50 && !placed; attempt++) {
            const theta = rand() * Math.PI * 2;
            const u = 0.1 + rand() * 0.72;
            const p = localPoint(u, theta);
            const h = T.heightAt(def, p.x, p.z);
            if (!canPlace(p.x, p.z, h, 0.85, 3.2)) continue;
            let tooClose = false;
            for (let t = 0; t < treeSpots.length; t++) {
              if (Math.hypot(p.x - treeSpots[t].x, p.z - treeSpots[t].z) < treeSpacing) {
                tooClose = true;
                break;
              }
            }
            if (tooClose) continue;

            const conifer = def.id === 'high' || (def.id === 'west' && rand() > 0.6) || rand() > 0.84;
            const bigMul = def.bigTrees ? 1.15 : 1.0;
            const trunkH = (4.4 + rand() * 1.7) * bigMul;
            const trunkThick = (2.4 + rand() * 1.4) * bigMul;
            const treeRot = rand() * Math.PI * 2;
            const baseY = island.pos.y + h;
            const wx = island.pos.x + p.x;
            const wz = island.pos.z + p.z;
            treeData.push({
              x: wx,
              y: baseY,
              z: wz,
              hTrunk: trunkH,
              thick: trunkThick,
              rot: treeRot,
              conifer: conifer
            });
            treeSpots.push({ x: p.x, z: p.z });

            if (conifer) {
              const canopyBase = trunkH * 0.86;
              const coneR = (2.3 + rand() * 0.9) * bigMul;
              const coneH = (3.1 + rand() * 0.9) * bigMul;
              for (let layer = 0; layer < 3; layer++) {
                const rr = coneR * (1 - layer * 0.23);
                pineCones.push({
                  x: wx,
                  y: baseY + canopyBase + layer * 1.15 * bigMul,
                  z: wz,
                  sx: rr,
                  sy: coneH * (1 - layer * 0.14),
                  sz: rr,
                  ry: treeRot + layer * 0.4,
                  rz: (rand() - 0.5) * 0.06,
                  color: 0x3f7148,
                  shade: 0.8 + rand() * 0.32
                });
              }
            } else {
              const cr = (2.2 + rand() * 0.9) * bigMul;
              const centerY = trunkH + cr * 0.55;
              const palette = def.id === 'bay'
                ? [0x86b551, 0x6fa844, 0xa7bd5d]
                : [0x4f8d46, 0x619d4d, 0x3f7f44, 0x77a94e];
              const layers = [
                { ox: 0, oy: 0, oz: 0, s: 1.1 },
                { ox: -0.55, oy: -0.05, oz: 0.12, s: 0.72 },
                { ox: 0.5, oy: 0.1, oz: -0.15, s: 0.68 },
                { ox: 0.05, oy: 0.55, oz: 0.12, s: 0.6 },
                { ox: -0.05, oy: 0.15, oz: 0.55, s: 0.62 }
              ];
              for (let layer = 0; layer < layers.length; layer++) {
                const L = layers[layer];
                const rr = cr * L.s * (0.9 + rand() * 0.15);
                leafBlobs.push({
                  x: wx + L.ox * cr,
                  y: baseY + centerY + L.oy * cr,
                  z: wz + L.oz * cr,
                  sx: rr,
                  sy: rr * (0.82 + rand() * 0.2),
                  sz: rr,
                  ry: treeRot + layer * 0.9,
                  rz: (rand() - 0.5) * 0.28,
                  color: palette[Math.floor(rand() * palette.length)],
                  shade: 0.82 + rand() * 0.3
                });
              }
            }
            placed = true;
          }
        }

        // камни
        const rockCount = Math.round(4 + island.R * 0.4);
        for (let k = 0; k < rockCount; k++) {
          for (let attempt = 0; attempt < 12; attempt++) {
            const theta = rand() * Math.PI * 2;
            const u = 0.35 + rand() * 0.62;
            const p = localPoint(u, theta);
            const h = T.heightAt(def, p.x, p.z);
            if (!canPlace(p.x, p.z, h, 1.5, 1.0)) continue;
            const s = 0.3 + rand() * (island.R * 0.055);
            rockData.push({
              x: island.pos.x + p.x,
              y: island.pos.y + h + s * 0.16,
              z: island.pos.z + p.z,
              sx: s * (1 + rand() * 0.4),
              sy: s * (0.6 + rand() * 0.55),
              sz: s * (0.9 + rand() * 0.3),
              rx: rand() * 3,
              ry: rand() * 6.28,
              rz: rand() * 3,
              color: def.palette.rock,
              shade: 0.85 + rand() * 0.3
            });
            break;
          }
        }

        // кусты
        const bushCount = 4 + Math.round(rand() * 5);
        for (let k = 0; k < bushCount; k++) {
          for (let attempt = 0; attempt < 10; attempt++) {
            const theta = rand() * Math.PI * 2;
            const u = 0.25 + rand() * 0.6;
            const p = localPoint(u, theta);
            const h = T.heightAt(def, p.x, p.z);
            if (!canPlace(p.x, p.z, h, 0.75, 1.0)) continue;
            const s = 0.35 + rand() * 0.45;
            bushData.push({
              x: island.pos.x + p.x,
              y: island.pos.y + h + s * 0.25,
              z: island.pos.z + p.z,
              sx: s * 1.4,
              sy: s * 0.8,
              sz: s * 1.2,
              ry: rand() * 6.28,
              color: 0x4a8344,
              shade: 0.8 + rand() * 0.4
            });
            break;
          }
        }

        // цветы
        const flowerCount = Math.round((def.flowers || 0.6) * 34);
        for (let k = 0; k < flowerCount; k++) {
          const theta = rand() * Math.PI * 2;
          const u = 0.18 + rand() * 0.68;
          const p = localPoint(u, theta);
          const h = T.heightAt(def, p.x, p.z);
          if (h === null || T.slopeAt(def, p.x, p.z) > 1.2) continue;
          const s = 0.55 + rand() * 0.75;
          flowerData.push({
            x: island.pos.x + p.x,
            y: island.pos.y + h + 0.16 * s,
            z: island.pos.z + p.z,
            sx: s,
            sy: s * (0.8 + rand() * 0.6),
            sz: s,
            ry: rand() * 6.28,
            color: def.glowFlowers ? (rand() > 0.5 ? 0x9ce8ff : 0xc9b6ff) : flowerPalette[Math.floor(rand() * flowerPalette.length)],
            shade: 0.9 + rand() * 0.2
          });
        }

        // трава
        const grassCount = Math.round(90 + island.R * 13);
        for (let k = 0; k < grassCount; k++) {
          const theta = rand() * Math.PI * 2;
          const u = 0.1 + rand() * 0.84;
          const p = localPoint(u, theta);
          const h = T.heightAt(def, p.x, p.z);
          if (h === null) continue;
          if (T.slopeAt(def, p.x, p.z) > 1.3) continue;
          const s = 0.6 + rand() * 1.15;
          grassData.push({
            x: island.pos.x + p.x,
            y: island.pos.y + h,
            z: island.pos.z + p.z,
            sx: s,
            sy: s * (0.7 + rand() * 0.9),
            sz: s,
            ry: rand() * 6.28,
            rz: (rand() - 0.5) * 0.18,
            color: rand() > 0.5 ? 0x5d9448 : 0x77aa54,
            shade: 0.75 + rand() * 0.4
          });
        }
      }

      // стволы
      const trunkGeo = new THREE.CylinderGeometry(0.085, 0.16, 1, 6, 1);
      trunkGeo.translate(0, 0.5, 0);
      const trunkMat = makeMaterial(0xffffff, { roughness: 0.95, map: T.getWoodTexture() });
      const trunkItems = treeData.map((t) => ({
        x: t.x,
        y: t.y - 0.05,
        z: t.z,
        sx: t.thick,
        sy: t.hTrunk,
        sz: t.thick,
        ry: t.rot,
        color: 0x7a5a3d,
        shade: 0.8 + Math.random() * 0.3
      }));
      this.addInstanced(trunkGeo, trunkMat, trunkItems, { cast: true, receive: true });

      const leafGeo = new THREE.IcosahedronGeometry(1, 0);
      const leafMat = makeMaterial(0xffffff, { roughness: 0.95, flat: true });
      this.addInstanced(leafGeo, leafMat, leafBlobs, { cast: true, receive: true });

      const coneGeo = new THREE.ConeGeometry(1, 1, 7);
      coneGeo.translate(0, 0.5, 0);
      const coneMat = makeMaterial(0xffffff, { roughness: 0.95, flat: true });
      this.addInstanced(coneGeo, coneMat, pineCones, { cast: true, receive: true });

      const rockGeo = new THREE.DodecahedronGeometry(1, 0);
      const rockMat = makeMaterial(0xffffff, { roughness: 1, flat: true });
      this.addInstanced(rockGeo, rockMat, rockData, { cast: true, receive: true });

      const bushGeo = new THREE.IcosahedronGeometry(1, 0);
      const bushMat = makeMaterial(0xffffff, { roughness: 0.98, flat: true });
      this.addInstanced(bushGeo, bushMat, bushData, { cast: true, receive: true });

      const flowerGeo = new THREE.IcosahedronGeometry(0.075, 0);
      const flowerMat = makeMaterial(0xffffff, { roughness: 0.7, flat: true });
      this.addInstanced(flowerGeo, flowerMat, flowerData, { cast: false, receive: false });

      const grassGeo = new THREE.ConeGeometry(0.045, 0.32, 4);
      grassGeo.translate(0, 0.16, 0);
      const grassMat = makeMaterial(0xffffff, { roughness: 1, flat: true });
      this.addInstanced(grassGeo, grassMat, grassData, { cast: false, receive: true });
    }

    addInstanced(geo, material, items, opts) {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geo, material, items.length);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
        dummy.scale.set(it.sx || 1, it.sy || 1, it.sz || 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (it.color !== undefined) {
          col.setHex(it.color);
          col.multiplyScalar(it.shade === undefined ? 1 : it.shade);
          mesh.setColorAt(i, col);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = !!(opts && opts.cast);
      mesh.receiveShadow = !!(opts && opts.receive);
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
      return mesh;
    }

    buildWater() {
      const island = this.byId['bay'];
      if (!island) return;
      const def = island.def;
      const pond = def.pond;
      const centerH = T.heightAt(def, pond.x, pond.z);
      if (centerH === null) return;
      const waterY = centerH + pond.depth * 0.52;
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x57b1c4,
        roughness: 0.12,
        metalness: 0.22,
        transparent: true,
        opacity: 0.82,
        emissive: 0x0b3f48,
        emissiveIntensity: 0.25
      });
      this.waterMats.push(waterMat);
      const water = new THREE.Mesh(new THREE.CircleGeometry(pond.r * 0.94, 40), waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(pond.x, waterY + 0.035, pond.z);
      water.receiveShadow = true;
      island.group.add(water);
      this.pondWater = water;

      // лилии
      const padMat = makeMaterial(0x5f9e4c, { roughness: 0.9 });
      const rand = T.mulberry32(888);
      for (let i = 0; i < 7; i++) {
        const a = rand() * Math.PI * 2;
        const rr = rand() * pond.r * 0.62;
        const pad = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rand() * 0.4, 9), padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(pond.x + Math.cos(a) * rr, waterY + 0.06, pond.z + Math.sin(a) * rr);
        island.group.add(pad);
      }

      // ручей к краю
      const theta = Math.atan2(pond.z, pond.x);
      const er = T.edgeFactor(theta, def.seed, def.style || 'lobed');
      const edge = def.R * er;
      const pondDist = Math.hypot(pond.x, pond.z);
      const wps = [];
      for (let k = 0; k <= 5; k++) {
        const t = k / 5;
        const d = T.lerp(pondDist + pond.r * 0.72, edge * 0.988, t);
        wps.push({ x: Math.cos(theta) * d, z: Math.sin(theta) * d });
      }
      const stream = T.buildRibbon(def, wps, { width: 1.2, lift: 0.065 });
      const streamMat = new THREE.MeshStandardMaterial({
        color: 0x7ccbd6,
        roughness: 0.15,
        metalness: 0.15,
        transparent: true,
        opacity: 0.9,
        emissive: 0x123c46,
        emissiveIntensity: 0.2
      });
      stream.mesh.material = streamMat;
      stream.mesh.receiveShadow = false;
      island.group.add(stream.mesh);
      this.waterMats.push(streamMat);

      // водопад
      const edgeR = edge * 0.99;
      const ex = Math.cos(theta) * edgeR;
      const ez = Math.sin(theta) * edgeR;
      const edgeH = T.heightAt(def, ex, ez);
      const fallTop = (edgeH === null ? -0.5 : edgeH) + 0.05;

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 256;
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, 64, 256);
      const wr = T.mulberry32(551);
      for (let i = 0; i < 48; i++) {
        const x = wr() * 64;
        const w = 0.8 + wr() * 2.8;
        const alpha = 0.16 + wr() * 0.5;
        g.fillStyle = `rgba(255,255,255,${alpha})`;
        g.fillRect(x, 0, w, 256);
      }
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,255,255,${0.1 + wr() * 0.4})`;
        g.fillRect(wr() * 64, wr() * 256, 1 + wr() * 2, 5 + wr() * 24);
      }
      const fallTex = new THREE.CanvasTexture(canvas);
      fallTex.wrapS = THREE.RepeatWrapping;
      fallTex.wrapT = THREE.RepeatWrapping;
      fallTex.repeat.set(1, 2.2);
      fallTex.colorSpace = THREE.SRGBColorSpace;
      const fallMat = new THREE.MeshBasicMaterial({
        map: fallTex,
        color: 0xbfe9f2,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending
      });
      const fallGroup = new THREE.Group();
      const planeGeo = new THREE.PlaneGeometry(3.8, 28);
      for (let i = 0; i < 2; i++) {
        const plane = new THREE.Mesh(planeGeo, fallMat);
        plane.position.set(0, -14, 0);
        plane.rotation.y = i * Math.PI / 2 + 0.35;
        fallGroup.add(plane);
      }
      fallGroup.position.set(ex, fallTop, ez);
      fallGroup.rotation.y = -theta + Math.PI / 2;
      island.group.add(fallGroup);
      this.waterfalls.push({ mat: fallMat, tex: fallTex, group: fallGroup, baseY: fallTop });

      for (let i = 0; i < 3; i++) {
        const mist = makeGlowSprite(0xd7f7ff, 3.8 + i * 1.8, 0.28);
        mist.position.set(ex, fallTop - 0.6 - i * 1.2, ez);
        island.group.add(mist);
      }

      // лёгкая рябь на воде
      this.pondBaseY = waterY;
    }

    buildCrystals() {
      const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
      crystalGeo.scale(1, 1.75, 1);
      const innerGeo = new THREE.OctahedronGeometry(0.2, 0);
      innerGeo.scale(1, 1.7, 1);
      let idx = 0;
      for (let i = 0; i < this.islands.length; i++) {
        const island = this.islands[i];
        const def = island.def;
        for (let k = 0; k < def.crystals.length; k++) {
          const spot = def.crystals[k];
          const h = T.heightAt(def, spot.x, spot.z) || 0;
          const group = new THREE.Group();
          group.position.set(island.pos.x + spot.x, island.pos.y + h + 1.35, island.pos.z + spot.z);
          const mat = new THREE.MeshStandardMaterial({
            color: 0x9af6e6,
            emissive: 0x2ed4c2,
            emissiveIntensity: 1.5,
            metalness: 0.3,
            roughness: 0.16,
            transparent: true,
            opacity: 0.96
          });
          const mesh = new THREE.Mesh(crystalGeo, mat);
          mesh.castShadow = false;
          group.add(mesh);
          const inner = new THREE.Mesh(innerGeo, new THREE.MeshBasicMaterial({ color: 0xefffff, transparent: true, opacity: 0.9 }));
          group.add(inner);
          const glow = makeGlowSprite(0x7ff5df, 2.7, 0.6);
          group.add(glow);
          const halo = makeGlowSprite(0xb6fff2, 1.15, 0.55);
          halo.position.y = 0.05;
          group.add(halo);
          this.scene.add(group);
          this.crystals.push({
            group: group,
            mesh: mesh,
            inner: inner,
            glow: glow,
            alive: true,
            dying: -1,
            baseY: group.position.y,
            phase: idx * 1.73 + k,
            mat: mat
          });
          idx++;
        }
      }
      this.totalCrystals = this.crystals.length;
    }

    buildAtmosphere() {
      this.buildClouds();
      this.buildDistantIsles();
      this.buildFloatingRocks();
      this.buildPollen();
    }

    buildClouds() {
      const cloudMat = makeMaterial(0xffffff, { roughness: 1, flat: true });
      cloudMat.emissive.setHex(0xcfe3f2);
      cloudMat.emissiveIntensity = 0.55;
      const puffGeo = new THREE.IcosahedronGeometry(1, 1);
      const rand = T.mulberry32(4242);
      const items = [];
      const clusters = 12;
      for (let c = 0; c < clusters; c++) {
        const a = (c / clusters) * Math.PI * 2 + rand() * 0.4;
        const dist = 260 + rand() * 280;
        const cx = Math.cos(a) * dist;
        const cz = Math.sin(a) * dist;
        const cy = 35 + rand() * 75;
        const puffs = 4 + Math.floor(rand() * 4);
        for (let p = 0; p < puffs; p++) {
          const s = 8 + rand() * 10;
          items.push({
            x: cx + (rand() - 0.5) * 36,
            y: cy + (rand() - 0.5) * 7,
            z: cz + (rand() - 0.5) * 30,
            sx: s * (1 + rand() * 0.5),
            sy: s * (0.4 + rand() * 0.22),
            sz: s * (0.75 + rand() * 0.4),
            ry: rand() * 6.28,
            color: 0xf7fbff,
            shade: 0.92 + rand() * 0.1
          });
        }
      }
      this.cloudGroup = new THREE.Group();
      const upper = this.addInstanced(puffGeo, cloudMat, items, { cast: false, receive: false });
      if (upper) {
        this.scene.remove(upper);
        this.cloudGroup.add(upper);
      }
      this.scene.add(this.cloudGroup);

      // море облаков внизу
      const seaItems = [];
      for (let i = 0; i < 46; i++) {
        const a = rand() * Math.PI * 2;
        const dist = 120 + rand() * 560;
        const s = 24 + rand() * 40;
        seaItems.push({
          x: Math.cos(a) * dist,
          y: -78 + rand() * 6,
          z: Math.sin(a) * dist,
          sx: s * 1.7,
          sy: s * 0.36,
          sz: s * 1.2,
          ry: rand() * 6.28,
          color: 0xf4fbff,
          shade: 0.9 + rand() * 0.12
        });
      }
      this.seaGroup = new THREE.Group();
      const seaPuffs = this.addInstanced(puffGeo, cloudMat, seaItems, { cast: false, receive: false });
      if (seaPuffs) {
        this.scene.remove(seaPuffs);
        this.seaGroup.add(seaPuffs);
      }

      // мягкое полотно облаков
      const cc = document.createElement('canvas');
      cc.width = cc.height = 512;
      const g = cc.getContext('2d');
      g.clearRect(0, 0, 512, 512);
      const cr = T.mulberry32(991);
      for (let i = 0; i < 90; i++) {
        const x = cr() * 512;
        const y = cr() * 512;
        const r = 24 + cr() * 82;
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,.34)');
        grd.addColorStop(0.55, 'rgba(250,253,255,.16)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      const seaTex = new THREE.CanvasTexture(cc);
      seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping;
      seaTex.repeat.set(4, 4);
      seaTex.colorSpace = THREE.SRGBColorSpace;
      const seaPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1800, 1800),
        new THREE.MeshBasicMaterial({
          map: seaTex,
          color: 0xf4fbff,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      seaPlane.rotation.x = -Math.PI / 2;
      seaPlane.position.y = -85;
      this.seaGroup.add(seaPlane);
      this.seaTex = seaTex;
      this.scene.add(this.seaGroup);
    }

    buildDistantIsles() {
      const rand = T.mulberry32(1877);
      const group = new THREE.Group();
      const rockMat = makeMaterial(0x7d7f75, { roughness: 1, flat: true });
      const grassMat = makeMaterial(0x679a58, { roughness: 1, flat: true });
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI * 2;
        const dist = 330 + rand() * 240;
        const R = 6 + rand() * 12;
        const depth = R * (1.1 + rand() * 0.9);
        const y = -45 + rand() * 130;
        const isle = new THREE.Group();
        isle.position.set(Math.cos(a) * dist, y, Math.sin(a) * dist);
        const rock = new THREE.Mesh(new THREE.ConeGeometry(R, depth, 9, 2), rockMat);
        rock.rotation.x = Math.PI;
        rock.position.y = -depth * 0.5;
        isle.add(rock);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), grassMat);
        cap.scale.y = 0.3;
        isle.add(cap);
        const tree = new THREE.Mesh(new THREE.ConeGeometry(R * 0.24, R * 0.9, 6), makeMaterial(0x4c7e45, { roughness: 1, flat: true }));
        tree.position.set(R * 0.2, R * 0.55, 0);
        isle.add(tree);
        isle.rotation.y = rand() * 6.28;
        group.add(isle);
      }
      this.scene.add(group);
    }

    buildFloatingRocks() {
      const rand = T.mulberry32(671);
      const geo = new THREE.DodecahedronGeometry(1, 0);
      const mat = makeMaterial(0xffffff, { roughness: 1, flat: true });
      const items = [];
      for (let i = 0; i < 70; i++) {
        const isl = this.islands[Math.floor(rand() * this.islands.length)];
        const a = rand() * Math.PI * 2;
        const dist = isl.R * (1.05 + rand() * 0.8);
        const s = 0.3 + rand() * 1.25;
        items.push({
          x: isl.pos.x + Math.cos(a) * dist,
          y: isl.pos.y - 2 + rand() * 9,
          z: isl.pos.z + Math.sin(a) * dist,
          sx: s,
          sy: s * (0.7 + rand() * 0.6),
          sz: s * (0.8 + rand() * 0.5),
          rx: rand() * 6.28,
          ry: rand() * 6.28,
          rz: rand() * 6.28,
          color: 0x8b8577,
          shade: 0.7 + rand() * 0.4
        });
      }
      this.debrisGroup = new THREE.Group();
      const mesh = this.addInstanced(geo, mat, items, { cast: false, receive: false });
      if (mesh) {
        this.scene.remove(mesh);
        this.debrisGroup.add(mesh);
      }
      this.scene.add(this.debrisGroup);
    }

    buildPollen() {
      const rand = T.mulberry32(31415);
      const N = 300;
      const positions = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = rand() * Math.PI * 2;
        const r = 60 + rand() * 360;
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = -25 + rand() * 140;
        positions[i * 3 + 2] = Math.sin(a) * r;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.32,
        map: T.getSoftTexture(),
        color: 0xfff1c4,
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      this.pollen = points;
      this.scene.add(points);
    }

    /* ---------- запросы к миру ---------- */
    getTerrainHeightAt(x, z) {
      let best = null;
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const h = T.heightAt(isl.def, x - isl.pos.x, z - isl.pos.z);
        if (h !== null) {
          const y = isl.pos.y + h;
          if (best === null || y > best) best = y;
        }
      }
      return best;
    }

    getSurfacesAt(x, z) {
      const arr = [];
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const h = T.heightAt(isl.def, x - isl.pos.x, z - isl.pos.z);
        if (h !== null) arr.push({ y: isl.pos.y + h, type: 'island', island: isl });
      }
      for (let i = 0; i < this.bridges.length; i++) {
        const b = this.bridges[i];
        const c = b.closest(x, z);
        if (c.dist <= b.half) arr.push({ y: c.y, type: 'bridge', bridge: b, t: c.t });
      }
      return arr;
    }

    // Объёмная коллизия с островом: верх острова, скальное тело и свободный
    // проход под островом. Нужна для мостов, проходящих под парящими островами.
    isIslandBlockedAt(x, z, feetY, headY, stepAllow) {
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const lx = x - isl.pos.x;
        const lz = z - isl.pos.z;
        const h = T.heightAt(isl.def, lx, lz);
        if (h === null) continue;
        const top = isl.pos.y + h;
        if (top <= feetY + (stepAllow || 0)) continue;
        const bLocal = T.undersideBottomAt(isl.def, lx, lz);
        const bottom = isl.pos.y + (bLocal === null ? h - 100 : bLocal);
        if (bottom >= headY) continue; // остров сверху, под ним свободно
        return true;
      }
      return false;
    }

    getWalkableHeightAhead(x, z, referenceY) {
      let best = null;
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const h = T.heightAt(isl.def, x - isl.pos.x, z - isl.pos.z);
        if (h === null) continue;
        const top = isl.pos.y + h;
        if (top <= referenceY + 3.5 && (best === null || top > best)) best = top;
      }
      for (let i = 0; i < this.bridges.length; i++) {
        const b = this.bridges[i];
        const c = b.closest(x, z);
        if (c.dist <= b.half && c.y <= referenceY + 3.5 && (best === null || c.y > best)) best = c.y;
      }
      return best;
    }

    // Если точка камеры внутри скального тела острова — вернуть верх, над
    // которым камере нужно оказаться. Под островом (ниже скалы) — свободно.
    cameraBlockTopAt(x, z, y) {
      let needed = null;
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const lx = x - isl.pos.x;
        const lz = z - isl.pos.z;
        const h = T.heightAt(isl.def, lx, lz);
        if (h === null) continue;
        const top = isl.pos.y + h;
        const bLocal = T.undersideBottomAt(isl.def, lx, lz);
        const bottom = isl.pos.y + (bLocal === null ? h - 100 : bLocal);
        if (y > bottom + 0.05 && y < top - 0.05 && (needed === null || top > needed)) needed = top;
      }
      return needed;
    }

    getRespawnPoint(from) {
      let best = null;
      let bestD = Infinity;
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const d = Math.hypot(from.x - isl.pos.x, from.z - isl.pos.z) - isl.maxR * 0.4;
        if (d < bestD) {
          bestD = d;
          best = isl;
        }
      }
      if (!best) return { x: 0, y: 20, z: 0 };
      let lx = best.def.spawn ? best.def.spawn.x : 0;
      let lz = best.def.spawn ? best.def.spawn.z : 0;
      let h = T.heightAt(best.def, lx, lz);
      if (h === null || T.slopeAt(best.def, lx, lz) > 1.4) {
        lx = 0;
        lz = 0;
        h = T.heightAt(best.def, 0, 0);
      }
      if (h === null) h = 1;
      return { x: best.pos.x + lx, y: best.pos.y + h, z: best.pos.z + lz, name: best.name };
    }

    getSpawnPoint() {
      const heart = this.byId['heart'];
      const spot = heart.def.spawn;
      const h = T.heightAt(heart.def, spot.x, spot.z) || 1;
      return { x: heart.pos.x + spot.x, y: heart.pos.y + h, z: heart.pos.z + spot.z };
    }

    islandAt(pos) {
      let best = null;
      let bestD = Infinity;
      for (let i = 0; i < this.islands.length; i++) {
        const isl = this.islands[i];
        const dx = pos.x - isl.pos.x;
        const dz = pos.z - isl.pos.z;
        const lx = dx;
        const lz = dz;
        const h = T.heightAt(isl.def, lx, lz);
        if (h === null) continue;
        const top = isl.pos.y + h;
        // «на острове» — только если мы не под ним и не внутри скалы
        if (pos.y < top - 2.0) continue;
        const d = Math.hypot(dx, dz) - isl.maxR;
        if (d < bestD) {
          bestD = d;
          best = isl;
        }
      }
      if (best && bestD < 16) return best;
      return null;
    }

    /* ---------- обновление ---------- */
    update(dt, playerPos) {
      this.time += dt;

      if (this.sun && playerPos) {
        this.sun.target.position.set(playerPos.x, playerPos.y, playerPos.z);
        this.sun.position.set(
          playerPos.x + this.sunOffset.x,
          playerPos.y + this.sunOffset.y,
          playerPos.z + this.sunOffset.z
        );
      }

      // кристаллы
      for (let i = 0; i < this.crystals.length; i++) {
        const c = this.crystals[i];
        if (c.alive) {
          c.group.position.y = c.baseY + Math.sin(this.time * 1.55 + c.phase) * 0.17;
          c.mesh.rotation.y += dt * 0.95;
          c.inner.rotation.y -= dt * 1.4;
          c.mesh.rotation.z = Math.sin(this.time * 1.1 + c.phase) * 0.08;
          const pulse = 0.5 + 0.16 * Math.sin(this.time * 2.2 + c.phase);
          c.glow.material.opacity = pulse;
          c.glow.scale.setScalar(2.5 + Math.sin(this.time * 2.2 + c.phase) * 0.25);
          c.mat.emissiveIntensity = 1.35 + 0.3 * Math.sin(this.time * 2.4 + c.phase);
          if (playerPos) {
            const dx = c.group.position.x - playerPos.x;
            const dy = c.group.position.y - (playerPos.y + 1.0);
            const dz = c.group.position.z - playerPos.z;
            if (dx * dx + dy * dy + dz * dz < 5.5) {
              c.alive = false;
              c.dying = 0;
              this.collected++;
              if (this.onCollect) this.onCollect(this.collected, this.totalCrystals, c);
            }
          }
        } else if (c.dying >= 0 && c.dying < 0.6) {
          c.dying += dt;
          const t = Math.min(1, c.dying / 0.55);
          c.group.position.y += dt * 2.4;
          c.group.scale.setScalar(1 + t * 2.2);
          c.mat.opacity = 1 - t;
          c.glow.material.opacity = (1 - t) * 0.9;
          c.glow.scale.setScalar(3 + t * 6);
          c.inner.visible = false;
          if (t >= 1) {
            c.group.visible = false;
            c.dying = -1;
          }
        }
      }

      // вода и водопады
      for (let i = 0; i < this.waterfalls.length; i++) {
        const wf = this.waterfalls[i];
        wf.tex.offset.y -= dt * 1.9;
        wf.mat.opacity = 0.5 + Math.sin(this.time * 2.4) * 0.05;
      }
      if (this.pondWater) {
        this.pondWater.position.y = this.pondBaseY + 0.035 + Math.sin(this.time * 1.25) * 0.012;
      }

      // облака
      if (this.cloudGroup) this.cloudGroup.rotation.y += dt * 0.0038;
      if (this.seaGroup) {
        this.seaGroup.rotation.y -= dt * 0.0015;
        if (this.seaTex) this.seaTex.offset.x += dt * 0.0016;
      }
      if (this.pollen) {
        this.pollen.rotation.y += dt * 0.008;
        this.pollen.material.opacity = 0.48 + Math.sin(this.time * 0.8) * 0.09;
      }
      if (this.debrisGroup) {
        this.debrisGroup.rotation.y += dt * 0.0012;
      }
    }
  }

  window.World = World;
})();
