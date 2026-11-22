/* Острова Ветра — процедурный рельеф островов */
(function () {
  'use strict';

  const PI = Math.PI;
  const TAU = PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  function smoothstep(e0, e1, x) {
    if (e0 === e1) return x < e0 ? 0 : 1;
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function angleDelta(a, b) {
    let d = (a - b) % TAU;
    if (d > PI) d -= TAU;
    if (d < -PI) d += TAU;
    return d;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iz, seed) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }

  function valueNoise(x, z, seed) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const ux = fx * fx * (3 - 2 * fx);
    const uz = fz * fz * (3 - 2 * fz);
    const a = hash2(ix, iz, seed);
    const b = hash2(ix + 1, iz, seed);
    const c = hash2(ix, iz + 1, seed);
    const d = hash2(ix + 1, iz + 1, seed);
    const top = a + (b - a) * ux;
    const bot = c + (d - c) * ux;
    return top + (bot - top) * uz;
  }

  function fbm(x, z, seed, octaves) {
    const oct = octaves || 3;
    let value = 0;
    let amp = 0.5;
    let freq = 1;
    let sum = 0;
    for (let i = 0; i < oct; i++) {
      value += amp * valueNoise(x * freq, z * freq, (seed | 0) + i * 131);
      sum += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return (value / sum) * 2 - 1;
  }

  /* ---------- форма береговой линии ---------- */
  function edgeFactor(theta, seed, style) {
    let e = 1;
    if (style === 'twin') {
      e += 0.21 * Math.sin(theta * 2 + 0.85 + seed * 0.11);
      e += 0.065 * Math.sin(theta * 5 - 1.2);
      e += 0.03 * Math.sin(theta * 9 + seed);
    } else if (style === 'spire') {
      e += 0.10 * Math.sin(theta * 4 + seed * 0.6);
      e += 0.055 * Math.sin(theta * 7 - seed * 0.4);
      e += 0.03 * Math.sin(theta * 11 + 1.9);
    } else if (style === 'broken') {
      e += 0.19 * Math.sin(theta * 3 + seed * 1.3);
      e += 0.115 * Math.sin(theta * 6 - seed * 1.7);
      e += 0.06 * Math.sin(theta * 10 + seed * 0.6);
      e += 0.035 * Math.sin(theta * 15 - 0.8);
    } else {
      e += 0.155 * Math.sin(theta * 3 + seed);
      e += 0.095 * Math.sin(theta * 5 - seed * 1.7);
      e += 0.05 * Math.sin(theta * 8 + seed * 0.6);
      e += 0.028 * Math.sin(theta * 12 - seed * 0.4);
    }
    return e;
  }

  function edgeMax(seed, style) {
    let m = 1;
    for (let i = 0; i < 256; i++) m = Math.max(m, edgeFactor((i / 256) * TAU, seed, style));
    return m;
  }

  /* ---------- полка-рампа в террасе ---------- */
  function rampWeight(theta, tier) {
    if (tier.ramp === undefined || tier.ramp === null) return 0;
    const list = Array.isArray(tier.ramp) ? tier.ramp : [tier.ramp];
    let best = 0;
    for (let i = 0; i < list.length; i++) {
      const d = Math.abs(angleDelta(theta, list[i]));
      best = Math.max(best, Math.exp(-(d * d) / (2 * 0.215 * 0.215)));
    }
    return best;
  }

  /* ---------- высота рельефа в локальных координатах ---------- */
  function heightAt(def, x, z) {
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
    const u = r / edge;
    if (u > 1.035) return null;
    const uu = Math.min(u, 1);

    let h = def.dome * Math.pow(Math.max(0, 1 - uu * uu), 1.25);

    if (def.tiers) {
      for (let i = 0; i < def.tiers.length; i++) {
        const t = def.tiers[i];
        const ramp = rampWeight(theta, t);
        const w = (t.w || 0.024) + 0.31 * ramp;
        h += t.h * smoothstep(t.r + w, t.r - w, uu);
      }
    }

    if (def.bumps) {
      for (let i = 0; i < def.bumps.length; i++) {
        const b = def.bumps[i];
        const d = Math.hypot(x - b.x, z - b.z) / b.r;
        if (d < 1.7) h += b.h * smoothstep(1.55, 0.12, d) * (1 + 0.08 * fbm(x * 0.2, z * 0.2, def.seed + 9, 2));
      }
    }

    if (def.pond) {
      const p = def.pond;
      const d = Math.hypot(x - p.x, z - p.z);
      h -= p.depth * smoothstep(p.r * 1.08, p.r * 0.12, d);
    }

    const broad = fbm(x * 0.035 + def.seed, z * 0.035, def.seed + 41, 2) *
      (def.roll === undefined ? 0.7 : def.roll) * (1 - 0.65 * uu);
    h += broad;

    const rough = def.roughness === undefined ? 0.45 : def.roughness;
    h += fbm(x * 0.115, z * 0.115, def.seed + 3, 3) * rough * (0.4 + 0.6 * Math.pow(1 - uu, 0.6));
    h += fbm(x * 0.42, z * 0.42, def.seed + 17, 2) * rough * 0.22;

    const drop = smoothstep(0.925, 1.0, u);
    h = h * (1 - drop) - drop * 0.82;
    return h;
  }

  function slopeAt(def, x, z) {
    const e = 0.32;
    const hx1 = heightAt(def, x + e, z);
    const hx0 = heightAt(def, x - e, z);
    const hz1 = heightAt(def, x, z + e);
    const hz0 = heightAt(def, x, z - e);
    if (hx1 === null || hx0 === null || hz1 === null || hz0 === null) return 4;
    return Math.hypot((hx1 - hx0) / (2 * e), (hz1 - hz0) / (2 * e));
  }

  // Нижняя граница скального объёма острова в локальных координатах.
  // Нужна, чтобы отличать «мост под островом» от «стена острова».
  function undersideBottomAt(def, x, z) {
    const r = Math.hypot(x, z);
    const theta = Math.atan2(z, x);
    const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
    const u = r / Math.max(0.0001, edge);
    if (u > 1.06) return null;
    const uu = Math.min(u, 1);
    const depth = def.depth || (def.R * 1.0 + 2.5);
    let t;
    if (uu <= 0.2) t = 1;
    else t = Math.pow(clamp((1 - uu) / 0.8, 0, 1), 1 / 1.12);
    // запас вниз, чтобы не «поймать» игрока краем скалы
    return -0.82 - depth * Math.pow(t, 1.15) - depth * 0.035;
  }

  /* ---------- текстуры ---------- */
  let detailTex = null;
  let dirtTex = null;
  let woodTex = null;
  let glowTex = null;
  let softTex = null;

  function makeCanvas(size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    return c;
  }

  function finishTexture(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat || 1, repeat || 1);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function getDetailTexture() {
    if (detailTex) return detailTex;
    const c = makeCanvas(256);
    const g = c.getContext('2d');
    g.fillStyle = '#f1efe4';
    g.fillRect(0, 0, 256, 256);
    const rand = mulberry32(7);
    for (let i = 0; i < 2600; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const a = 0.03 + rand() * 0.09;
      g.fillStyle = rand() > 0.45 ? `rgba(80,90,50,${a})` : `rgba(255,255,235,${a * 0.9})`;
      g.fillRect(x, y, 1 + rand() * 2, 1 + rand() * 2);
    }
    for (let i = 0; i < 110; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      g.strokeStyle = `rgba(90,110,60,${0.05 + rand() * 0.08})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (rand() - 0.5) * 5, y - 2 - rand() * 5);
      g.stroke();
    }
    detailTex = finishTexture(c, 1);
    return detailTex;
  }

  function getDirtTexture() {
    if (dirtTex) return dirtTex;
    const c = makeCanvas(256);
    const g = c.getContext('2d');
    g.fillStyle = '#fff7ec';
    g.fillRect(0, 0, 256, 256);
    const rand = mulberry32(23);
    for (let i = 0; i < 3200; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      const v = rand();
      g.fillStyle = v > 0.6
        ? `rgba(120,90,55,${0.04 + rand() * 0.13})`
        : `rgba(255,250,235,${0.05 + rand() * 0.13})`;
      const s = 1 + rand() * 2.6;
      g.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 90; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      g.fillStyle = `rgba(96,76,54,${0.08 + rand() * 0.16})`;
      g.beginPath();
      g.ellipse(x, y, 1 + rand() * 2.2, 1 + rand() * 1.5, rand() * PI, 0, TAU);
      g.fill();
    }
    dirtTex = finishTexture(c, 1);
    return dirtTex;
  }

  function getWoodTexture() {
    if (woodTex) return woodTex;
    const c = makeCanvas(256);
    const g = c.getContext('2d');
    g.fillStyle = '#fbf2e2';
    g.fillRect(0, 0, 256, 256);
    const rand = mulberry32(41);
    for (let i = 0; i < 60; i++) {
      const x = rand() * 256;
      g.strokeStyle = `rgba(125,90,55,${0.05 + rand() * 0.14})`;
      g.lineWidth = 0.6 + rand() * 1.7;
      g.beginPath();
      g.moveTo(x, -10);
      g.bezierCurveTo(x + 4, 70, x - 5, 160, x + 2, 266);
      g.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const x = rand() * 256;
      const y = rand() * 256;
      g.strokeStyle = `rgba(110,80,50,${0.1 + rand() * 0.12})`;
      g.lineWidth = 1;
      g.beginPath();
      g.ellipse(x, y, 5 + rand() * 9, 2 + rand() * 4, rand() * PI, 0, TAU);
      g.stroke();
    }
    woodTex = finishTexture(c, 1);
    return woodTex;
  }

  function getGlowTexture() {
    if (glowTex) return glowTex;
    const c = makeCanvas(128);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.18, 'rgba(255,255,255,.85)');
    grd.addColorStop(0.45, 'rgba(255,255,255,.28)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    glowTex = new THREE.CanvasTexture(c);
    glowTex.colorSpace = THREE.SRGBColorSpace;
    return glowTex;
  }

  function getSoftTexture() {
    if (softTex) return softTex;
    const c = makeCanvas(64);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,.95)');
    grd.addColorStop(0.5, 'rgba(255,255,255,.5)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    softTex = new THREE.CanvasTexture(c);
    softTex.colorSpace = THREE.SRGBColorSpace;
    return softTex;
  }

  /* ---------- цвета вершин ---------- */
  const _c = new THREE.Color();
  const _c2 = new THREE.Color();

  function vertexColor(def, x, z, u, out) {
    const pal = def.palette;
    const n = valueNoise(x * 0.22, z * 0.22, def.seed + 5);
    _c.setHex(pal.grassA);
    _c2.setHex(pal.grassB);
    out.copy(_c).lerp(_c2, clamp(n * 1.25 + 0.1, 0, 1));

    const slope = slopeAt(def, x, z);
    if (slope > 0.48) {
      _c.setHex(pal.rock);
      out.lerp(_c, smoothstep(0.48, 1.45, slope));
      const band = 0.82 + 0.26 * valueNoise(x * 0.35, z * 0.9, def.seed + 27);
      out.multiplyScalar(1 - smoothstep(0.55, 1.3, slope) * (1 - band) * 0.5);
    }
    if (def.palette.dark) {
      _c.setHex(def.palette.dark);
      out.lerp(_c, smoothstep(0.95, 1.25, slope) * 0.35);
    }
    _c.setHex(pal.dirt);
    out.lerp(_c, smoothstep(0.93, 1.0, u) * 0.75);
    const shade = 0.9 + 0.16 * valueNoise(x * 0.55, z * 0.55, def.seed + 11);
    out.multiplyScalar(shade);
    return out;
  }

  /* ---------- геометрия верхней поверхности ---------- */
  function buildTerrainMesh(def) {
    const SEG = def.lowDetail ? 72 : 176;
    const RINGS = def.lowDetail ? 24 : 68;
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const col = new THREE.Color();

    // центр
    const h0 = heightAt(def, 0, 0) || 0;
    positions.push(0, h0, 0);
    vertexColor(def, 0, 0, 0, col);
    colors.push(col.r, col.g, col.b);
    uvs.push(0, 0);

    for (let i = 1; i <= RINGS; i++) {
      const u = i / RINGS;
      for (let j = 0; j < SEG; j++) {
        const theta = (j / SEG) * TAU;
        const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
        const rr = edge * u;
        const x = Math.cos(theta) * rr;
        const z = Math.sin(theta) * rr;
        const h = heightAt(def, x, z);
        positions.push(x, h === null ? -0.9 : h, z);
        // для прибрежной полосы используем локальный фактор u
        const uu = Math.min(1, Math.hypot(x, z) / Math.max(0.0001, edge));
        vertexColor(def, x, z, uu, col);
        colors.push(col.r, col.g, col.b);
        uvs.push(x * 0.085, z * 0.085);
      }
    }

    const ringStart = (i) => 1 + (i - 1) * SEG;
    for (let j = 0; j < SEG; j++) {
      const jn = (j + 1) % SEG;
      indices.push(0, ringStart(1) + jn, ringStart(1) + j);
    }
    for (let i = 1; i < RINGS; i++) {
      const a = ringStart(i);
      const b = ringStart(i + 1);
      for (let j = 0; j < SEG; j++) {
        const jn = (j + 1) % SEG;
        const p = a + j;
        const q = a + jn;
        const s = b + jn;
        const t = b + j;
        indices.push(p, q, s, p, s, t);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: getDetailTexture(),
      roughness: 0.97,
      metalness: 0,
      side: THREE.FrontSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  /* ---------- нижняя скала ---------- */
  function depthAt(def, theta) {
    return def.depth || (def.R * 1.0 + 2.5);
  }

  function rockColor(def, t, theta, out) {
    const pal = def.palette;
    const n = valueNoise(theta * 3.1, t * 6.5, def.seed + 31);
    _c.setHex(pal.rock);
    _c2.setHex(def.palette.rockDark || 0x5e574b);
    out.copy(_c).lerp(_c2, 0.35 + 0.55 * n);
    out.multiplyScalar(0.72 + 0.36 * (1 - t));
    return out;
  }

  function buildUnderside(def) {
    const group = new THREE.Group();
    const SEG = def.lowDetail ? 48 : 120;
    const LAYERS = def.lowDetail ? 7 : 16;
    const positions = [];
    const colors = [];
    const indices = [];
    const col = new THREE.Color();
    const depth = depthAt(def);

    // верхнее кольцо = кромка верхней поверхности
    for (let j = 0; j < SEG; j++) {
      const theta = (j / SEG) * TAU;
      const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
      const rimH = heightAt(def, Math.cos(theta) * edge * 0.998, Math.sin(theta) * edge * 0.998);
      positions.push(Math.cos(theta) * edge, rimH === null ? -0.82 : rimH, Math.sin(theta) * edge);
      rockColor(def, 0, theta, col);
      colors.push(col.r, col.g, col.b);
    }

    for (let l = 1; l <= LAYERS; l++) {
      const t = l / LAYERS;
      const shrink = 1 - 0.8 * Math.pow(t, 1.12);
      for (let j = 0; j < SEG; j++) {
        const theta = (j / SEG) * TAU;
        const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
        const jag = (valueNoise(theta * 2.6, t * 5.2, def.seed + 43) - 0.5) * 0.19;
        const rr = edge * Math.max(0.015, shrink * (1 + jag * Math.sin(3.1 * theta + 1.3)));
        const y = -0.82 - depth * Math.pow(t, 1.15) + (valueNoise(theta * 4.4, t * 3.1, def.seed + 71) - 0.5) * depth * 0.08;
        positions.push(Math.cos(theta) * rr, y, Math.sin(theta) * rr);
        rockColor(def, t, theta, col);
        colors.push(col.r, col.g, col.b);
      }
    }

    const ring = (i) => i * SEG;
    for (let i = 0; i < LAYERS; i++) {
      const a = ring(i);
      const b = ring(i + 1);
      for (let j = 0; j < SEG; j++) {
        const jn = (j + 1) % SEG;
        indices.push(a + j, b + j, b + jn, a + j, b + jn, a + jn);
      }
    }
    // закрываем низ скалы, чтобы снизу не было видно пустоты
    const capIndex = positions.length / 3;
    positions.push(0, -0.82 - depth * 1.06, 0);
    rockColor(def, 1, 0, col);
    colors.push(col.r * 0.8, col.g * 0.8, col.b * 0.8);
    const lastRing = ring(LAYERS);
    for (let j = 0; j < SEG; j++) {
      const jn = (j + 1) % SEG;
      indices.push(lastRing + j, lastRing + jn, capIndex);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // сталактиты-шипы
    const rand = mulberry32((def.seed || 1) * 777 | 0);
    const spikeCount = def.lowDetail ? 0 : 3;
    for (let i = 0; i < spikeCount; i++) {
      const theta = rand() * TAU;
      const d = 0.34 + rand() * 0.32;
      const len = depth * (0.24 + rand() * 0.3);
      const rad = def.R * (0.07 + rand() * 0.09);
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(rad, len, 6, 2),
        new THREE.MeshStandardMaterial({ color: def.palette.rockDark || 0x615a4d, roughness: 1, flatShading: true })
      );
      spike.position.set(Math.cos(theta) * def.R * d, -0.9 - len * 0.5 - depth * 0.18, Math.sin(theta) * def.R * d);
      spike.rotation.set(PI, rand() * 0.4, 0);
      spike.rotation.z = (rand() - 0.5) * 0.25;
      spike.castShadow = true;
      group.add(spike);
    }

    return group;
  }

  /* ---------- лента тропинки ---------- */
  let pathMaterial = null;
  function getPathMaterial() {
    if (pathMaterial) return pathMaterial;
    pathMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: getDirtTexture(),
      roughness: 1,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    return pathMaterial;
  }

  const pathColor = new THREE.Color(0xc0a077);
  const pathEdge = new THREE.Color(0x927049);

  function buildRibbon(def, waypoints, opts) {
    opts = opts || {};
    const width = opts.width || 0.85;
    const lift = opts.lift === undefined ? 0.055 : opts.lift;
    const pts = waypoints.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.35);
    const lengthEstimate = curve.getLength();
    const N = Math.max(24, Math.min(320, Math.ceil(lengthEstimate / 0.5)));
    const positions = [];
    const colors = [];
    const uvs = [];
    const indices = [];
    const samples = [];
    const col = new THREE.Color();
    const tan = new THREE.Vector3();
    const pt = new THREE.Vector3();

    for (let i = 0; i <= N; i++) {
      const t = i / N;
      curve.getPointAt(t, pt);
      curve.getTangentAt(t, tan);
      let nx = -tan.z;
      let nz = tan.x;
      const nl = Math.hypot(nx, nz) || 1;
      nx /= nl;
      nz /= nl;
      const w = width * (0.82 + 0.18 * Math.sin(t * PI));
      const steps = [-1, 0, 1];
      for (let k = 0; k < steps.length; k++) {
        const side = steps[k];
        const x = pt.x + nx * w * 0.5 * side;
        const z = pt.z + nz * w * 0.5 * side;
        let h = heightAt(def, x, z);
        if (h === null) h = heightAt(def, pt.x, pt.z) || 0;
        positions.push(x, h + lift, z);
        const edge = Math.abs(side);
        col.copy(pathColor).lerp(pathEdge, edge * 0.65 + valueNoise(x * 0.8, z * 0.8, def.seed + 3) * 0.16);
        col.multiplyScalar(0.92 + 0.14 * valueNoise(x * 1.6, z * 1.6, def.seed + 19));
        colors.push(col.r, col.g, col.b);
        uvs.push((side + 1) * 0.5, t * Math.max(1, lengthEstimate / 2.4));
      }
      samples.push({ x: pt.x, z: pt.z });
      if (i < N) {
        const a = i * 3;
        const b = (i + 1) * 3;
        indices.push(a, a + 1, b + 1, a, b + 1, b);
        indices.push(a + 1, a + 2, b + 2, a + 1, b + 2, b + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, getPathMaterial());
    mesh.receiveShadow = true;
    return { mesh, samples, length: lengthEstimate };
  }

  /* ---------- тропинка через террасы ---------- */
  function trailWaypoints(def, startTheta) {
    const out = [];
    const pushPolar = (u, theta) => {
      const edge = def.R * edgeFactor(theta, def.seed, def.style || 'lobed');
      const rr = edge * u;
      out.push({ x: Math.cos(theta) * rr, z: Math.sin(theta) * rr });
    };
    pushPolar(0.945, startTheta);
    pushPolar(0.912, startTheta);
    let theta = startTheta;
    const tiers = (def.tiers || []).slice().sort((a, b) => b.r - a.r);
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const ramp = tier.ramp === undefined ? null : (Array.isArray(tier.ramp) ? tier.ramp[0] : tier.ramp);
      if (ramp === null) continue;
      const uArc = Math.min(0.88, tier.r + 0.105);
      const da = angleDelta(ramp, theta);
      const steps = Math.max(2, Math.ceil(Math.abs(da) / 0.32));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        pushPolar(lerp(0.905, uArc, t), theta + da * t);
      }
      pushPolar(tier.r + 0.055, ramp);
      pushPolar(tier.r - 0.115, ramp);
      theta = ramp;
    }
    // к центру — мягкий серпантин
    pushPolar(0.26, theta + 0.75);
    pushPolar(0.09, theta + 0.15);
    return out;
  }

  window.Terrain = {
    PI, TAU, clamp, lerp, smoothstep, angleDelta, mulberry32,
    valueNoise, fbm, edgeFactor, edgeMax, heightAt, slopeAt,
    undersideBottomAt,
    buildTerrainMesh, buildUnderside, buildRibbon, trailWaypoints,
    getDetailTexture, getDirtTexture, getWoodTexture, getGlowTexture, getSoftTexture
  };
})();
