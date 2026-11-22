/* Острова Ветра — герой, анимация и физика */
(function () {
  'use strict';

  const V = THREE.Vector3;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

  function mat(color, rough, metal) {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: rough === undefined ? 0.85 : rough,
      metalness: metal === undefined ? 0 : metal
    });
  }

  function addMesh(parent, geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  class Player {
    constructor(scene) {
      this.scene = scene;
      this.pos = new V(0, 12, 0);
      this.vel = new V();
      this.grounded = false;
      this.flying = false;
      this.fuel = 100;
      this.maxFuel = 100;
      this.radius = 0.34;
      this.height = 1.85;
      this.onEvent = null;
      this.grace = 0;
      this.animTime = 0;
      this.landFx = 0;
      this.stepTimer = 0;
      this.turnInput = 0;
      this.turnVel = 0;
      this.bridge = null;

      this.buildModel();
      this.buildParticles();
    }

    buildModel() {
      const jacket = mat(0x2f7f78, 0.82);
      const jacketDark = mat(0x23625e, 0.85);
      const shirt = mat(0xf0dfb7, 0.9);
      const pants = mat(0x3b4b54, 0.9);
      const boot = mat(0x63462f, 0.85);
      const bootDark = mat(0x4a3525, 0.9);
      const skin = mat(0xf2c49b, 0.78);
      const skinDark = mat(0xdfae84, 0.8);
      const hair = mat(0x4b3326, 0.95);
      const scarf = mat(0xef7b50, 0.9);
      const scarfDark = mat(0xd8673f, 0.92);
      const pack = mat(0x8a6745, 0.9);
      const packDark = mat(0x704f33, 0.92);
      const metal = mat(0x6f767c, 0.45, 0.35);
      const metalDark = mat(0x4a5156, 0.5, 0.3);
      const eye = mat(0x241b16, 0.5);

      this.root = new THREE.Group();
      this.tilt = new THREE.Group();
      this.tilt.position.y = 0.95;
      this.visual = new THREE.Group();
      this.visual.position.y = -1.215;
      this.visual.scale.setScalar(0.92);
      this.tilt.add(this.visual);
      this.root.add(this.tilt);
      this.scene.add(this.root);

      this.upper = new THREE.Group();
      this.visual.add(this.upper);

      // ноги
      this.legL = new THREE.Group();
      this.legL.position.set(-0.125, 0.83, 0);
      this.visual.add(this.legL);
      this.legR = new THREE.Group();
      this.legR.position.set(0.125, 0.83, 0);
      this.visual.add(this.legR);

      const legGeo = new THREE.CapsuleGeometry(0.083, 0.34, 5, 8);
      const bootGeo = new THREE.BoxGeometry(0.17, 0.14, 0.28);
      [-1, 1].forEach((side) => {
        const leg = side < 0 ? this.legL : this.legR;
        addMesh(leg, legGeo, pants, 0, -0.24, 0);
        addMesh(leg, bootGeo, boot, 0, -0.45, 0.035);
        const sole = addMesh(leg, new THREE.BoxGeometry(0.18, 0.045, 0.3), bootDark, 0, -0.52, 0.035);
        sole.castShadow = false;
      });

      // торс
      const torso = addMesh(this.upper, new THREE.CapsuleGeometry(0.255, 0.35, 6, 12), jacket, 0, 1.25, 0);
      torso.scale.set(1, 1, 0.82);
      this.torso = torso;

      // грудная вставка и пояс
      const zipper = addMesh(this.upper, new THREE.BoxGeometry(0.035, 0.3, 0.028), shirt, 0, 1.3, 0.205);
      zipper.rotation.x = -0.06;
      addMesh(this.upper, new THREE.CylinderGeometry(0.047, 0.047, 0.016, 10), shirt, 0.1, 1.42, 0.205).rotation.x = Math.PI / 2;
      addMesh(this.upper, new THREE.CylinderGeometry(0.02, 0.02, 0.018, 8), jacketDark, 0.1, 1.42, 0.213).rotation.x = Math.PI / 2;
      const belt = addMesh(this.upper, new THREE.CylinderGeometry(0.245, 0.25, 0.09, 12), jacketDark, 0, 0.97, 0);
      belt.scale.z = 0.84;
      const buckle = addMesh(this.upper, new THREE.BoxGeometry(0.08, 0.075, 0.03), shirt, 0, 0.97, 0.235);
      buckle.castShadow = false;

      // руки
      this.armL = new THREE.Group();
      this.armL.position.set(-0.335, 1.44, 0);
      this.upper.add(this.armL);
      this.armR = new THREE.Group();
      this.armR.position.set(0.335, 1.44, 0);
      this.upper.add(this.armR);
      [-1, 1].forEach((side) => {
        const arm = side < 0 ? this.armL : this.armR;
        addMesh(arm, new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), jacket, 0, -0.2, 0);
        addMesh(arm, new THREE.SphereGeometry(0.085, 10, 8), skin, 0, -0.41, 0);
      });

      // голова
      this.head = new THREE.Group();
      this.head.position.set(0, 1.81, 0);
      this.upper.add(this.head);
      const skull = addMesh(this.head, new THREE.SphereGeometry(0.235, 18, 14), skin, 0, 0, 0);
      skull.scale.set(1, 1.02, 0.96);

      const hairCap = addMesh(this.head, new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), hair, 0, 0.055, -0.005);
      hairCap.scale.set(1.01, 0.94, 1.03);
      const fringe = addMesh(this.head, new THREE.ConeGeometry(0.07, 0.16, 6), hair, 0.04, 0.12, 0.19);
      fringe.rotation.set(1.1, 0.2, -0.4);
      fringe.scale.set(1.3, 0.9, 0.7);
      const tuft = addMesh(this.head, new THREE.ConeGeometry(0.075, 0.2, 6), hair, 0.02, 0.245, -0.03);
      tuft.rotation.z = -0.35;
      tuft.rotation.x = -0.25;
      addMesh(this.head, new THREE.SphereGeometry(0.055, 8, 6), hair, -0.205, 0.0, -0.02);
      addMesh(this.head, new THREE.SphereGeometry(0.055, 8, 6), hair, 0.205, 0.0, -0.02);

      const eyeGeo = new THREE.SphereGeometry(0.028, 8, 6);
      addMesh(this.head, eyeGeo, eye, -0.078, 0.015, 0.207);
      addMesh(this.head, eyeGeo, eye, 0.078, 0.015, 0.207);
      const shineGeo = new THREE.SphereGeometry(0.009, 6, 5);
      addMesh(this.head, shineGeo, shirt, -0.07, 0.026, 0.23).castShadow = false;
      addMesh(this.head, shineGeo, shirt, 0.086, 0.026, 0.23).castShadow = false;
      addMesh(this.head, new THREE.SphereGeometry(0.032, 8, 6), skinDark, 0, -0.035, 0.226);
      const mouth = addMesh(this.head, new THREE.BoxGeometry(0.06, 0.013, 0.012), eye, 0, -0.1, 0.216);
      mouth.castShadow = false;

      // шарф
      const knot = addMesh(this.upper, new THREE.TorusGeometry(0.175, 0.055, 6, 14), scarf, 0, 1.63, 0);
      knot.rotation.x = Math.PI / 2;
      knot.scale.set(1, 0.9, 1);
      const scarfTailGeo = new THREE.BoxGeometry(0.14, 0.03, 0.42);
      this.scarfA = addMesh(this.upper, scarfTailGeo, scarf, 0.1, 1.61, -0.28);
      this.scarfA.rotation.set(0.28, 0.2, -0.15);
      this.scarfB = addMesh(this.upper, scarfTailGeo, scarfDark, -0.02, 1.575, -0.26);
      this.scarfB.scale.set(0.8, 0.8, 0.8);
      this.scarfB.rotation.set(0.18, -0.12, 0.2);

      // рюкзак
      const bag = addMesh(this.upper, new THREE.BoxGeometry(0.36, 0.4, 0.22), pack, 0, 1.28, -0.29);
      bag.rotation.x = -0.06;
      addMesh(this.upper, new THREE.BoxGeometry(0.3, 0.16, 0.08), packDark, 0, 1.16, -0.42);
      const roll = addMesh(this.upper, new THREE.CylinderGeometry(0.085, 0.085, 0.38, 8), scarfDark, 0, 1.53, -0.3);
      roll.rotation.z = Math.PI / 2;
      addMesh(this.upper, new THREE.BoxGeometry(0.05, 0.38, 0.04), packDark, -0.13, 1.28, -0.41);
      addMesh(this.upper, new THREE.BoxGeometry(0.05, 0.38, 0.04), packDark, 0.13, 1.28, -0.41);

      // реактивные сопла
      addMesh(this.upper, new THREE.CylinderGeometry(0.055, 0.07, 0.17, 8), metal, -0.12, 1.0, -0.34);
      addMesh(this.upper, new THREE.CylinderGeometry(0.055, 0.07, 0.17, 8), metal, 0.12, 1.0, -0.34);
      addMesh(this.upper, new THREE.BoxGeometry(0.1, 0.06, 0.09), metalDark, -0.12, 0.915, -0.34);
      addMesh(this.upper, new THREE.BoxGeometry(0.1, 0.06, 0.09), metalDark, 0.12, 0.915, -0.34);

      const flameGeo = new THREE.ConeGeometry(0.085, 0.52, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffc76b,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.flameL = new THREE.Mesh(flameGeo, flameMat);
      this.flameL.position.set(-0.12, 0.64, -0.34);
      this.flameL.rotation.x = Math.PI;
      this.flameL.visible = false;
      this.upper.add(this.flameL);
      this.flameR = new THREE.Mesh(flameGeo, flameMat.clone());
      this.flameR.material.color.setHex(0xffd995);
      this.flameR.position.set(0.12, 0.64, -0.34);
      this.flameR.rotation.x = Math.PI;
      this.flameR.visible = false;
      this.upper.add(this.flameR);

      const jetGlowMat = new THREE.SpriteMaterial({
        map: window.Terrain.getGlowTexture(),
        color: 0xffb65c,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      this.jetGlowL = new THREE.Sprite(jetGlowMat);
      this.jetGlowL.position.set(-0.12, 0.6, -0.38);
      this.jetGlowL.scale.set(0.62, 0.62, 1);
      this.jetGlowL.visible = false;
      this.upper.add(this.jetGlowL);
      this.jetGlowR = new THREE.Sprite(jetGlowMat.clone());
      this.jetGlowR.material.color.setHex(0xffd089);
      this.jetGlowR.position.set(0.12, 0.6, -0.38);
      this.jetGlowR.scale.set(0.62, 0.62, 1);
      this.jetGlowR.visible = false;
      this.upper.add(this.jetGlowR);

      // крылья ветра
      const wingGeo = new THREE.BufferGeometry();
      wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        0, 0, 0,
        -0.92, 0.14, -0.5,
        -1.55, 0.03, -0.92,
        -1.14, -0.05, -1.28,
        -0.3, -0.09, -0.72
      ], 3));
      wingGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4]);
      wingGeo.computeVertexNormals();
      this.wingMat = new THREE.MeshBasicMaterial({
        color: 0x5fe8ca,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.wingEdgeMat = new THREE.LineBasicMaterial({
        color: 0xbafff0,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      this.wings = new THREE.Group();
      this.wings.position.set(0, 0.15, 0.02);
      this.wingL = new THREE.Mesh(wingGeo, this.wingMat);
      this.wingL.position.set(-0.13, 1.38, -0.3);
      this.wingL.rotation.set(0.04, 0.05, 0.04);
      this.wingL.add(new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo, 20), this.wingEdgeMat));
      this.wings.add(this.wingL);
      this.wingR = new THREE.Mesh(wingGeo, this.wingMat);
      this.wingR.scale.x = -1;
      this.wingR.position.set(0.13, 1.38, -0.3);
      this.wingR.rotation.set(0.04, -0.05, -0.04);
      this.wingR.add(new THREE.LineSegments(new THREE.EdgesGeometry(wingGeo, 20), this.wingEdgeMat));
      this.wings.add(this.wingR);
      this.wings.visible = false;
      this.wings.scale.setScalar(0.5);
      this.upper.add(this.wings);
      this.wingAmt = 0;

      this.root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = o.castShadow !== false;
        }
      });
      this.flameL.castShadow = false;
      this.flameR.castShadow = false;
    }

    buildParticles() {
      const N = 120;
      this.pcount = N;
      this.parts = new Array(N);
      const positions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        this.parts[i] = { x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 1, g: 1, b: 1 };
        positions[i * 3 + 1] = -999;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.32,
        map: window.Terrain.getSoftTexture(),
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true
      });
      this.points = new THREE.Points(geo, material);
      this.points.frustumCulled = false;
      this.scene.add(this.points);
      this.pIdx = 0;
      this.spawnPos = new V();
      this.spawnVel = new V();
    }

    emit(type) {
      if (this.onEvent) this.onEvent(type);
    }

    setFlying(on, silent) {
      if (this.flying === on) return;
      this.flying = on;
      if (this.flameL) {
        this.flameL.visible = on;
        this.flameR.visible = on;
        this.jetGlowL.visible = on;
        this.jetGlowR.visible = on;
      }
      if (on) {
        this.grace = 0.32;
        this.grounded = false;
        if (!silent) this.emit('flyOn');
      } else if (!silent) {
        this.emit('flyOff');
      }
      window.GameAudio.setThrust(0);
    }

    toggleFly() {
      if (this.flying) {
        this.setFlying(false);
      } else if (this.fuel > 4) {
        this.setFlying(true);
        this.vel.y = Math.max(this.vel.y, 5.2);
        this.pos.y += 0.05;
      }
    }

    resetTo(x, y, z) {
      this.pos.set(x, y, z);
      this.vel.set(0, 0, 0);
      this.fuel = this.maxFuel;
      this.grounded = true;
      this.flying = false;
      this.grace = 0;
      this.turnVel = 0;
      this.bridge = null;
      if (this.flameL) {
        this.flameL.visible = false;
        this.flameR.visible = false;
        this.jetGlowL.visible = false;
        this.jetGlowR.visible = false;
      }
    }

    canMoveTo(x, z, world, dist) {
      if (Math.hypot(x, z) >= 550) return false;
      const stepAllow = this.grounded && !this.flying ? (0.30 + dist * 1.08) : 0.22;
      const headY = this.pos.y + 1.75;
      if (world.isIslandBlockedAt(x, z, this.pos.y, headY, stepAllow)) return false;
      return true;
    }

    update(dt, input, world) {
      if (!dt || dt <= 0) return;
      this.animTime += dt;
      this.grace = Math.max(0, this.grace - dt);

      // Управление привязано к персонажу: A/D — поворот, W/S — вперёд/назад.
      // Бокового движения нет, камера жёстко стоит за спиной.
      const turnInput = clamp(input.turn || 0, -1, 1);
      const moveInput = clamp(input.forward || 0, -1, 1);
      this.turnInput = turnInput;

      // Плавный, но жёстко привязанный к камере поворот:
      // угловая скорость разгоняется/тормозится, сама камера не «плавает».
      const maxTurn = this.flying ? 1.25 : (this.grounded ? 1.75 : 1.1);
      const targetTurnVel = turnInput * maxTurn;
      this.turnVel += (targetTurnVel - this.turnVel) * (1 - Math.exp(-5.0 * dt));
      if (Math.abs(this.turnVel) > 0.00005) {
        this.root.rotation.y -= this.turnVel * dt;
      }

      const heading = this.root.rotation.y;
      const fwdX = Math.sin(heading);
      const fwdZ = Math.cos(heading);

      // переключение полёта
      if (input.flyPressed) this.toggleFly();

      // прыжок / взлёт в воздухе
      if (input.jumpPressed) {
        if (this.grounded && !this.flying) {
          this.vel.y = 8.7;
          this.grounded = false;
          this.emit('jump');
        } else if (!this.flying && !this.grounded && this.fuel > 8) {
          this.toggleFly();
        }
      }

      if (this.flying) {
        const forwardSpeed = moveInput >= 0 ? moveInput * 26 : moveInput * 12;
        const targetX = fwdX * forwardSpeed;
        const targetZ = fwdZ * forwardSpeed;
        const k = 1 - Math.exp(-6.4 * dt);
        this.vel.x += (targetX - this.vel.x) * k;
        this.vel.z += (targetZ - this.vel.z) * k;

        let targetY = 0;
        if (input.up) targetY += 8.8;
        if (input.down) targetY -= 8.8;
        if (moveInput > 0.1) targetY += 0.7;
        this.vel.y += (targetY - this.vel.y) * (1 - Math.exp(-5.5 * dt));

        this.fuel -= dt * 9.6;
        if (this.fuel <= 0) {
          this.fuel = 0;
          this.setFlying(false, true);
          this.emit('nofuel');
        }
        window.GameAudio.setThrust(this.flying ? 0.55 + Math.min(0.45, Math.abs(this.vel.y) * 0.03) : 0);
      } else {
        window.GameAudio.setThrust(0);
        const accel = this.grounded ? 13 : 4.2;
        const baseSpeed = this.grounded ? (input.run ? 10.5 : 6.2) : 6.8;
        const targetSpeed = moveInput >= 0 ? moveInput * baseSpeed : moveInput * baseSpeed * 0.52;
        const targetX = fwdX * targetSpeed;
        const targetZ = fwdZ * targetSpeed;
        const k = 1 - Math.exp(-accel * dt);
        this.vel.x += (targetX - this.vel.x) * k;
        this.vel.z += (targetZ - this.vel.z) * k;
        this.fuel = Math.min(this.maxFuel, this.fuel + (this.grounded ? 36 : 4) * dt);
      }

      // горизонтальное движение со скольжением по стенам
      const dx = this.vel.x * dt;
      const dz = this.vel.z * dt;
      const moveLen = Math.hypot(dx, dz);
      if (moveLen > 0.00001) {
        const nx = this.pos.x + dx;
        const nz = this.pos.z + dz;
        if (this.canMoveTo(nx, nz, world, moveLen)) {
          this.pos.x = nx;
          this.pos.z = nz;
        } else {
          let moved = false;
          if (Math.abs(dx) > 0.00001 && this.canMoveTo(nx, this.pos.z, world, Math.abs(dx))) {
            this.pos.x = nx;
            moved = true;
          } else {
            this.vel.x *= 0.2;
          }
          if (Math.abs(dz) > 0.00001 && this.canMoveTo(this.pos.x, nz, world, Math.abs(dz))) {
            this.pos.z = nz;
            moved = true;
          } else {
            this.vel.z *= 0.2;
          }
          if (!moved) {
            this.vel.x *= 0.35;
            this.vel.z *= 0.35;
          }
        }
      }

      // ограничиваем скольжение по мосту, чтобы герой не падал за перила.
      // У самых концов не ограничиваем — иначе нельзя сойти на остров.
      if (this.grounded && !this.flying && this.bridge) {
        const c = this.bridge.closest(this.pos.x, this.pos.z);
        const limit = this.bridge.half - 0.38;
        if (c.t > 0.02 && c.t < 0.98 && c.dist > limit) {
          const center = this.bridge.pointAt(c.t);
          let nx = this.pos.x - center.x;
          let nz = this.pos.z - center.z;
          const nd = Math.hypot(nx, nz) || 1;
          this.pos.x = center.x + (nx / nd) * limit;
          this.pos.z = center.z + (nz / nd) * limit;
          // гасим боковую скорость
          const tx = this.bridge.dirX;
          const tz = this.bridge.dirZ;
          const along = this.vel.x * tx + this.vel.z * tz;
          this.vel.x = tx * along;
          this.vel.z = tz * along;
        }
      }

      // поддержка под ногами
      const surfaces = world.getSurfacesAt(this.pos.x, this.pos.z);
      let support = null;
      for (let i = 0; i < surfaces.length; i++) {
        const s = surfaces[i];
        if (s.y <= this.pos.y + 0.46 && (!support || s.y > support.y)) support = s;
      }

      if (this.grounded) {
        if (support && support.y >= this.pos.y - 0.78) {
          this.pos.y = support.y;
          this.vel.y = 0;
        } else {
          this.grounded = false;
        }
      }
      if (this.grounded) {
        this.bridge = support && support.type === 'bridge' ? support.bridge : null;
      } else if (!this.flying) {
        this.bridge = null;
      }

      // вертикально
      if (!this.grounded) {
        const prevY = this.pos.y;
        if (!this.flying) this.vel.y -= 27 * dt;
        this.vel.y = Math.max(-38, this.vel.y);
        this.pos.y += this.vel.y * dt;

        if (this.vel.y <= 0) {
          const surfs = world.getSurfacesAt(this.pos.x, this.pos.z);
          let land = null;
          for (let i = 0; i < surfs.length; i++) {
            const s = surfs[i];
            if (s.y <= prevY + 0.09 && s.y >= this.pos.y - 3.2 && (!land || s.y > land.y)) land = s;
          }
          if (land && this.pos.y <= land.y + 0.025) {
            const impact = -this.vel.y;
            this.pos.y = land.y;
            this.vel.y = 0;
            this.grounded = true;
            if (this.flying) {
              this.setFlying(false, true);
              this.emit('land');
            } else if (impact > 5) {
              this.emit('land');
            }
            this.landFx = Math.min(1, impact / 18);
            this.spawnLandDust(Math.min(6, 2 + Math.floor(impact * 0.3)));
          }
        }
      }

      if (this.grounded && this.vel.y < 0) this.vel.y = 0;
      if (this.pos.y < -110) this.respawn(world);

      // шаги
      const footSpeed = Math.hypot(this.vel.x, this.vel.z);
      if (this.grounded && !this.flying && footSpeed > 1.3) {
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
          this.stepTimer = input.run ? 0.25 : 0.38;
          this.emit('step');
        }
      } else {
        this.stepTimer = Math.min(this.stepTimer, 0.12);
      }

      // аура/частицы
      this.updateParticles(dt);
      this.updateVisual(dt, world);
    }

    respawn(world) {
      const point = world.getRespawnPoint(this.pos);
      this.resetTo(point.x, point.y + 0.5, point.z);
      this.grounded = false;
      this.emit('respawn');
    }

    spawnLandDust(count) {
      for (let i = 0; i < count; i++) {
        const p = this.parts[this.pIdx];
        this.pIdx = (this.pIdx + 1) % this.pcount;
        p.x = this.pos.x + (Math.random() - 0.5) * 0.5;
        p.y = this.pos.y + 0.06;
        p.z = this.pos.z + (Math.random() - 0.5) * 0.5;
        p.vx = (Math.random() - 0.5) * 2.4;
        p.vy = 0.6 + Math.random() * 1.4;
        p.vz = (Math.random() - 0.5) * 2.4;
        p.life = p.max = 0.35 + Math.random() * 0.25;
        p.r = 0.55;
        p.g = 0.48;
        p.b = 0.36;
      }
    }

    updateParticles(dt) {
      if (this.flying) {
        const rotY = this.root.rotation.y;
        const bX = -Math.sin(rotY);
        const bZ = -Math.cos(rotY);
        for (let n = 0; n < 3; n++) {
          const p = this.parts[this.pIdx];
          this.pIdx = (this.pIdx + 1) % this.pcount;
          p.x = this.pos.x - bX * 0.42 + (Math.random() - 0.5) * 0.3;
          p.y = this.pos.y + 0.62 + (Math.random() - 0.5) * 0.16;
          p.z = this.pos.z - bZ * 0.42 + (Math.random() - 0.5) * 0.3;
          p.vx = bX * (3 + Math.random() * 3.5) + (Math.random() - 0.5) * 1.2;
          p.vy = -1.4 - Math.random() * 2.2;
          p.vz = bZ * (3 + Math.random() * 3.5) + (Math.random() - 0.5) * 1.2;
          p.life = p.max = 0.42 + Math.random() * 0.32;
          p.r = 0.82;
          p.g = 0.28;
          p.b = 0.04;
        }
        if (this.flameL) {
          const flick = 0.75 + Math.random() * 0.5;
          this.flameL.scale.set(0.9, flick, 0.9);
          this.flameR.scale.set(0.9, 0.75 + Math.random() * 0.5, 0.9);
          this.flameL.material.opacity = 0.65 + Math.random() * 0.25;
          this.jetGlowL.material.opacity = 0.3 + Math.random() * 0.22;
          this.jetGlowR.material.opacity = 0.27 + Math.random() * 0.2;
        }
      }

      const posAttr = this.points.geometry.attributes.position;
      const colAttr = this.points.geometry.attributes.color;
      const pa = posAttr.array;
      const ca = colAttr.array;
      for (let i = 0; i < this.pcount; i++) {
        const p = this.parts[i];
        if (p.life > 0) {
          p.life -= dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vx *= 1 - 2.2 * dt;
          p.vy *= 1 - 1.4 * dt;
          p.vz *= 1 - 2.2 * dt;
          const k = Math.max(0, p.life / p.max);
          pa[i * 3] = p.x;
          pa[i * 3 + 1] = p.y;
          pa[i * 3 + 2] = p.z;
          ca[i * 3] = p.r * k;
          ca[i * 3 + 1] = p.g * k;
          ca[i * 3 + 2] = p.b * k;
          if (p.life <= 0) pa[i * 3 + 1] = -999;
        } else {
          pa[i * 3 + 1] = -999;
          ca[i * 3] = ca[i * 3 + 1] = ca[i * 3 + 2] = 0;
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    updateVisual(dt, world) {
      const spd = Math.hypot(this.vel.x, this.vel.z);
      const spdN = clamp(spd / 8.6, 0, 1.4);
      let leanTarget = 0;
      if (this.flying) {
        const fwdVel = this.vel.x * Math.sin(this.root.rotation.y) + this.vel.z * Math.cos(this.root.rotation.y);
        leanTarget = 0.16 + clamp(fwdVel / 22, 0, 1) * 0.82;
      } else if (!this.grounded) {
        leanTarget = 0.08;
      }
      this.tilt.rotation.x = damp(this.tilt.rotation.x, leanTarget, 7, dt);
      this.tilt.rotation.z = 0;

      const phase = this.animTime * (6 + spdN * 8.5);
      const stride = this.grounded && spd > 0.35 ? Math.sin(phase) : 0;
      const amp = this.grounded ? clamp(spd / 8, 0, 1) * 0.85 : 0;

      let legTargetL, legTargetR, armX_L, armX_R, armZ_L, armZ_R;
      if (this.flying) {
        legTargetL = -0.35;
        legTargetR = -0.18;
        armX_L = -0.55;
        armX_R = -0.55;
        armZ_L = -1.28;
        armZ_R = 1.28;
      } else if (!this.grounded) {
        legTargetL = 0.42;
        legTargetR = -0.32;
        armX_L = -0.55;
        armX_R = -0.2;
        armZ_L = -0.85;
        armZ_R = 0.65;
        armZ_L += stride * 0.05;
      } else {
        legTargetL = stride * amp;
        legTargetR = -stride * amp;
        armX_L = -stride * amp * 0.72;
        armX_R = stride * amp * 0.72;
        armZ_L = -0.07;
        armZ_R = 0.07;
      }

      this.legL.rotation.x = damp(this.legL.rotation.x, legTargetL, 14, dt);
      this.legR.rotation.x = damp(this.legR.rotation.x, legTargetR, 14, dt);
      this.armL.rotation.x = damp(this.armL.rotation.x, armX_L, 10, dt);
      this.armR.rotation.x = damp(this.armR.rotation.x, armX_R, 10, dt);
      this.armL.rotation.z = damp(this.armL.rotation.z, armZ_L, 10, dt);
      this.armR.rotation.z = damp(this.armR.rotation.z, armZ_R, 10, dt);

      const bob = this.grounded ? Math.sin(phase * 2) * 0.028 * spdN : Math.sin(this.animTime * 2.2) * 0.012;
      this.upper.position.y = damp(this.upper.position.y, bob, 12, dt);

      const flutter = this.flying ? 1.6 : this.grounded ? 0.35 + spdN * 0.7 : 1.0;
      const flap = Math.sin(this.animTime * (7 + spdN * 5)) * 0.14 * flutter;
      this.scarfA.rotation.x = 0.28 + flap - clamp(spd / 25, 0, 0.5);
      this.scarfA.rotation.z = -0.15 + Math.sin(this.animTime * 5.3) * 0.12 * flutter;
      this.scarfB.rotation.x = 0.18 + flap * 1.3 - clamp(spd / 28, 0, 0.4);
      this.scarfB.rotation.z = 0.2 + Math.sin(this.animTime * 4.1 + 1.2) * 0.16 * flutter;

      this.wingAmt = damp(this.wingAmt, this.flying ? 1 : 0, 8, dt);
      if (this.wings) {
        this.wings.visible = this.wingAmt > 0.02;
        this.wingMat.opacity = 0.7 * this.wingAmt;
        this.wingEdgeMat.opacity = 0.75 * this.wingAmt;
        this.wings.scale.setScalar(0.55 + 0.45 * this.wingAmt);
        const wingFlap = Math.sin(this.animTime * 8.5) * 0.09 + clamp(spd / 26, 0, 0.14);
        this.wingL.rotation.z = 0.05 + wingFlap;
        this.wingR.rotation.z = -0.05 - wingFlap;
        this.wings.position.y = 0.15 + Math.sin(this.animTime * 8.5 + 1.2) * 0.025;
      }

      if (this.landFx > 0.01) {
        this.landFx *= Math.exp(-7 * dt);
        const squash = this.landFx;
        this.visual.scale.set(0.92 * (1 + squash * 0.08), 0.92 * (1 - squash * 0.12), 0.92 * (1 + squash * 0.08));
      } else {
        this.visual.scale.setScalar(0.92);
      }

      this.root.position.copy(this.pos);
    }
  }

  window.Player = Player;
})();
