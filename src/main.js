/* Острова Ветра — точка входа */
(function () {
  'use strict';

  const V = THREE.Vector3;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------- DOM ----------
  const container = document.getElementById('game');
  const startScreen = document.getElementById('startScreen');
  const startBtn = document.getElementById('startBtn');
  const flyBtn = document.getElementById('flyBtn');
  const jumpBtn = document.getElementById('jumpBtn');
  const descendBtn = document.getElementById('descendBtn');
  const joystick = document.getElementById('joystick');
  const stick = document.getElementById('stick');
  const placeName = document.getElementById('placeName');
  const placeLabel = document.getElementById('placeLabel');
  const crystalCount = document.getElementById('crystalCount');
  const fuelFill = document.getElementById('fuelFill');
  const flightPanel = document.getElementById('flightPanel');
  const toastEl = document.getElementById('toast');
  const soundBtn = document.getElementById('soundBtn');
  const flashEl = document.getElementById('flash');

  // ---------- рендер ----------
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xbfdde6, 1);
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 1400);

  const world = new window.World(scene);
  const player = new window.Player(scene);

  const spawn = world.getSpawnPoint();
  player.pos.set(spawn.x, spawn.y + 0.35, spawn.z);
  player.root.position.copy(player.pos);
  player.root.rotation.y = Math.PI + 0.5;
  player.grounded = true;
  player.fuel = player.maxFuel;

  // ---------- состояние ----------
  const state = {
    started: false,
    pitch: 0.25,
    dist: 7.2,
    camPos: new V(-24, 26, 50),
    camLook: new V(0, 8, 0),
    visited: {},
    currentIsland: '',
    flightHintShown: false,
    pitchOffset: 0,
    manual: false,
    qualityStep: 0
  };
  const keys = new Set();
  const input = {
    forward: 0,
    turn: 0,
    run: false,
    up: false,
    down: false,
    jumpPressed: false,
    flyPressed: false
  };
  const touch = { active: false, x: 0, y: 0, up: false, down: false };

  let dragging = false;
  let lastPY = 0;
  let toastTimer = 0;
  let uiTimer = 0;
  let islandTimer = 0;
  let lastFrame = performance.now();

  function isTouch() {
    return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  }
  if (isTouch() || /[?&]touch=1/.test(location.search)) document.body.classList.add('touch');
  const touchMode = document.body.classList.contains('touch');
  const flySmall = flyBtn.querySelector('.fly-text small');
  if (touchMode && flySmall) flySmall.textContent = 'нажмите';
  if (touchMode) {
    const hintSpans = document.querySelectorAll('.start-hints span');
    const touchHints = ['Джойстик — идти', 'Влево/вправо — поворот', 'Кнопка «Летать»'];
    hintSpans.forEach((el, i) => {
      if (touchHints[i]) el.innerHTML = '<i></i>' + touchHints[i];
    });
  }

  // ---------- старт ----------
  function startGame() {
    if (state.started) return;
    state.started = true;
    document.body.classList.add('running');
    startScreen.classList.add('gone');
    window.GameAudio.init();
    window.GameAudio.setMuted(window.GameAudio.muted);
    state.visited.heart = true;
    setTimeout(() => {
      startScreen.style.display = 'none';
    }, 1000);
    showToast('12 кристаллов спрятаны на островах · F — полёт', 4200);
    setTimeout(() => {
      if (state.started) showToast('Тропинки ведут к мостам между островами', 3000);
    }, 5200);
  }

  startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    startGame();
  });

  // ---------- звук ----------
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.GameAudio.init();
    const muted = window.GameAudio.toggleMuted();
    soundBtn.classList.toggle('muted', muted);
  });

  // ---------- кнопка полёта ----------
  flyBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.started) return;
    window.GameAudio.init();
    input.flyPressed = true;
  });
  flyBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ---------- прыжок / вниз на тач-устройствах ----------
  function bindHold(el, downFn, upFn) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      downFn();
    });
    const end = (e) => {
      e.preventDefault();
      upFn();
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
  }
  bindHold(jumpBtn, () => {
    window.GameAudio.init();
    input.jumpPressed = true;
    touch.up = true;
  }, () => {
    touch.up = false;
  });
  bindHold(descendBtn, () => {
    touch.down = true;
  }, () => {
    touch.down = false;
  });

  // ---------- джойстик ----------
  if (joystick) {
    const maxR = 44;
    let joyId = null;
    joystick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      joyId = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      joystick.classList.add('active');
      touch.active = true;
      moveStick(e);
    });
    const moveStick = (e) => {
      if (!touch.active) return;
      const rect = joystick.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > maxR) {
        dx = (dx / d) * maxR;
        dy = (dy / d) * maxR;
      }
      touch.x = dx / maxR;
      touch.y = dy / maxR;
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    joystick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      e.preventDefault();
      moveStick(e);
    });
    const release = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      touch.active = false;
      touch.x = 0;
      touch.y = 0;
      joystick.classList.remove('active');
      stick.style.transform = 'translate(-50%, -50%)';
    };
    joystick.addEventListener('pointerup', release);
    joystick.addEventListener('pointercancel', release);
    joystick.addEventListener('pointerleave', (e) => {
      if (touch.active && e.pointerId === joyId) release(e);
    });
  }

  // ---------- камера мышью / пальцем ----------
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.started) return;
    dragging = true;
    lastPY = e.clientY;
    canvas.classList.add('dragging');
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dy = e.clientY - lastPY;
    lastPY = e.clientY;
    // камера намертво привязана к повороту героя; мышью меняем только наклон
    state.pitch = clamp(state.pitch + dy * 0.0032, 0.02, 1.0);
  });
  const endDrag = () => {
    dragging = false;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!state.started) return;
    e.preventDefault();
    state.dist = clamp(state.dist + e.deltaY * 0.01, 4.0, 17);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- клавиатура ----------
  window.addEventListener('keydown', (e) => {
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
      e.preventDefault();
    }
    if (!state.started) {
      if (code === 'Enter' || code === 'Space') {
        startGame();
      }
      return;
    }
    keys.add(code);
    if (code === 'Space' && !e.repeat) {
      input.jumpPressed = true;
      input.up = true;
    }
    if (code === 'KeyF' && !e.repeat) input.flyPressed = true;
    if (code === 'KeyR' && !e.repeat) respawnPlayer(true);
    if (code === 'KeyM' && !e.repeat) {
      window.GameAudio.init();
      const muted = window.GameAudio.toggleMuted();
      soundBtn.classList.toggle('muted', muted);
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') input.up = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    input.up = false;
    input.down = false;
    input.jumpPressed = false;
    input.flyPressed = false;
    touch.active = false;
    touch.x = 0;
    touch.y = 0;
    touch.up = false;
    touch.down = false;
    if (stick) stick.style.transform = 'translate(-50%, -50%)';
    if (joystick) joystick.classList.remove('active');
    dragging = false;
  });

  // ---------- игровые события ----------
  player.onEvent = function (type) {
    if (type === 'jump') window.GameAudio.jump();
    else if (type === 'land') {
      window.GameAudio.land();
    } else if (type === 'step') {
      window.GameAudio.step();
    } else if (type === 'flyOn') {
      window.GameAudio.flyOn();
      if (state.started) {
        if (!state.flightHintShown) {
          state.flightHintShown = true;
          showToast('В полёте: <strong>Пробел</strong> вверх · <strong>Shift</strong> вниз · F — посадка', 3600);
        } else {
          showToast('Полёт включён', 1100);
        }
      }
    } else if (type === 'flyOff') {
      window.GameAudio.flyOff();
    } else if (type === 'nofuel') {
      window.GameAudio.fuelOut();
      showToast('Энергия полёта исчерпана — приземлитесь на остров', 2600);
    } else if (type === 'respawn') {
      showToast('Ветер подхватил вас и вернул на остров', 2600);
    }
  };

  world.onCollect = function (count, total) {
    crystalCount.textContent = String(count);
    window.GameAudio.chime();
    flashEl.classList.add('on');
    setTimeout(() => flashEl.classList.remove('on'), 70);
    if (count >= total) {
      showToast('<strong>Все 12 кристаллов собраны!</strong> Архипелаг исследован.', 6000);
      setTimeout(() => window.GameAudio.fanfare(), 240);
    } else {
      showToast('Кристалл найден — <strong>' + count + '</strong> из ' + total, 2000);
    }
  };

  // ---------- UI ----------
  function showToast(html, ms) {
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, ms || 2200);
  }

  function updateUI(dt) {
    const fuelPct = Math.max(0, Math.min(100, player.fuel));
    fuelFill.style.width = fuelPct.toFixed(1) + '%';
    flightPanel.classList.toggle('low', fuelPct < 26);
    if (flyBtn.classList.contains('active') !== player.flying) {
      flyBtn.classList.toggle('active', player.flying);
      flyBtn.setAttribute('aria-pressed', player.flying ? 'true' : 'false');
      const small = flyBtn.querySelector('.fly-text small');
      if (small) {
        if (touchMode) small.textContent = player.flying ? 'приземлиться' : 'нажмите';
        else small.textContent = player.flying ? 'F — приземлиться' : 'клавиша F';
      }
    }
    const noFuel = !player.flying && player.fuel < 5;
    flyBtn.classList.toggle('no-fuel', noFuel);

    uiTimer -= dt;
    if (uiTimer <= 0) {
      uiTimer = 0.22;
      const isl = world.islandAt(player.pos);
      let name = isl ? isl.name : 'Небесные просторы';
      let label = 'вы на';
      let onBridge = false;
      if (player.bridge) {
        const b = player.bridge;
        const bt = b.closest(player.pos.x, player.pos.z);
        // «Куда ведёт мост» — по направлению взгляда героя (камера смотрит туда же)
        const gazeDot = Math.sin(player.root.rotation.y) * b.dirX + Math.cos(player.root.rotation.y) * b.dirZ;
        let target;
        if (gazeDot > 0.05) target = b.islandB;
        else if (gazeDot < -0.05) target = b.islandA;
        else target = bt.t < 0.5 ? b.islandA : b.islandB;
        if (target) {
          name = 'Мост на ' + (target.def.nameTo || target.name);
          label = '';
          onBridge = true;
        }
      }
      const key = (onBridge ? 'bridge' : 'island') + '|' + name;
      if (key !== state.currentIsland) {
        state.currentIsland = key;
        placeName.textContent = name;
        if (placeLabel) {
          placeLabel.textContent = label;
          placeLabel.style.display = onBridge ? 'none' : '';
        }
        if (isl && !onBridge && state.started && !state.visited[isl.id]) {
          state.visited[isl.id] = true;
          showToast('Новый остров — <strong>' + isl.name + '</strong>', 2400);
        }
      }
    }
  }

  function respawnPlayer(manual) {
    if (!state.started) return;
    const p = world.getRespawnPoint(player.pos);
    player.resetTo(p.x, p.y + 0.45, p.z);
    player.grounded = true;
    player.emit('respawn');
    if (manual) showToast('Вы вернулись на остров: <strong>' + p.name + '</strong>', 2200);
  }

  // ---------- камера ----------
  const camOffset = new V();
  const desiredCam = new V();
  const targetLook = new V();

  function updateCamera(dt, elapsed) {
    if (!state.started) {
      const a = 0.5 + elapsed * 0.045;
      desiredCam.set(Math.sin(a) * 210, 72 + Math.sin(elapsed * 0.22) * 3.0, Math.cos(a) * 210);
      targetLook.set(0, 9, 0);
      state.camPos.lerp(desiredCam, 1 - Math.exp(-1.8 * dt));
      state.camLook.lerp(targetLook, 1 - Math.exp(-1.8 * dt));
      camera.position.copy(state.camPos);
      camera.lookAt(state.camLook);
      return;
    }

    targetLook.set(player.pos.x, player.pos.y + 1.3, player.pos.z);

    // Небольшая адаптация по уклону: вниз — камеру чуть выше, вверх — чуть ниже.
    let slopeOffsetTarget = 0;
    if (player.grounded) {
      const fx = Math.sin(player.root.rotation.y);
      const fz = Math.cos(player.root.rotation.y);
      const ax = player.pos.x + fx * 8;
      const az = player.pos.z + fz * 8;
      let ahead = null;
      if (player.bridge) {
        const bc = player.bridge.closest(ax, az);
        if (bc.dist <= player.bridge.half + 0.6) ahead = bc.y;
      }
      if (ahead === null) ahead = world.getWalkableHeightAhead(ax, az, player.pos.y);
      if (ahead !== null) {
        const slope = (ahead - player.pos.y) / 8;
        slopeOffsetTarget = clamp(-slope * 0.32, -0.12, 0.18);
      }
    }
    state.pitchOffset += (slopeOffsetTarget - state.pitchOffset) * (1 - Math.exp(-3.2 * dt));
    const pitch = clamp(state.pitch + state.pitchOffset, 0.02, 1.0);
    const cp = Math.cos(pitch);

    // Камера жёстко закреплена за спиной: yaw = поворот героя + π.
    // Никакого плавного доворота и свободного вращения по горизонтали.
    const behindYaw = player.root.rotation.y + Math.PI;
    camOffset.set(
      Math.sin(behindYaw) * cp * state.dist,
      Math.sin(pitch) * state.dist,
      Math.cos(behindYaw) * cp * state.dist
    );
    desiredCam.copy(targetLook).add(camOffset);

    // при необходимости приподнимаем камеру над уступом, но не меняем угол
    let extraLift = 0;
    const samples = 10;
    for (let pass = 0; pass < 2; pass++) {
      let need = 0;
      for (let i = 1; i <= samples; i++) {
        const t = i / samples;
        const x = targetLook.x + (desiredCam.x - targetLook.x) * t;
        const z = targetLook.z + (desiredCam.z - targetLook.z) * t;
        const y = targetLook.y + (desiredCam.y + extraLift - targetLook.y) * t;
        const top = world.cameraBlockTopAt(x, z, y);
        if (top !== null) {
          need = Math.max(need, (top + 0.5 - y) / Math.max(0.3, t));
        }
      }
      if (need <= 0.01) break;
      extraLift += Math.min(need, 4.5);
    }
    desiredCam.y += extraLift;

    const insideIslandTop = world.cameraBlockTopAt(desiredCam.x, desiredCam.z, desiredCam.y);
    if (insideIslandTop !== null && desiredCam.y < insideIslandTop + 1.1) {
      desiredCam.y = insideIslandTop + 1.1;
    }
    // не даём камере уйти под настил того моста, по которому идёт герой
    if (player.bridge) {
      const bc = player.bridge.closest(desiredCam.x, desiredCam.z);
      if (bc.dist <= player.bridge.half && desiredCam.y < bc.y + 1.0) {
        desiredCam.y = bc.y + 1.0;
      }
    }
    if (desiredCam.y < -100) desiredCam.y = -100;

    // жёстко, без сглаживания позиции и поворота
    camera.position.copy(desiredCam);
    camera.lookAt(targetLook);
  }

  // ---------- ввод ----------
  function gatherInput() {
    let f = 0;
    let t = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) t += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) t -= 1;
    if (touch.active) {
      t += touch.x;
      f += -touch.y;
    }
    if (Math.abs(f) < 0.12) f = 0;
    if (Math.abs(t) < 0.12) t = 0;
    input.forward = clamp(f, -1, 1);
    input.turn = clamp(t, -1, 1);
    input.run = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.up = keys.has('Space') || touch.up;
    input.down = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC') || touch.down;
  }

  // ---------- resize ----------
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  // ---------- цикл ----------
  let qualityTimer = 0;
  let qualityFrames = 0;

  function simulate(dt) {
    const elapsed = performance.now() / 1000;
    gatherInput();
    if (state.started) {
      player.update(dt, input, world);
    }
    world.update(dt, state.started ? player.pos : null);
    updateCamera(dt, elapsed);
    updateUI(dt);
    input.jumpPressed = false;
    input.flyPressed = false;
  }

  function loop(now) {
    const raw = (now - lastFrame) / 1000;
    lastFrame = now;
    const dt = clamp(raw, 0.0001, 0.05);

    if (!state.manual) simulate(dt);

    renderer.render(scene, camera);

    // адаптивное качество, если совсем тяжело
    qualityFrames++;
    qualityTimer += raw;
    if (qualityTimer > 5) {
      const avg = qualityFrames / qualityTimer;
      if (avg < 38 && state.qualityStep === 0 && window.devicePixelRatio > 1.15) {
        state.qualityStep = 1;
        renderer.setPixelRatio(1);
      } else if (avg < 30 && state.qualityStep === 1) {
        state.qualityStep = 2;
        renderer.setPixelRatio(0.85);
      }
      qualityTimer = 0;
      qualityFrames = 0;
    }

    requestAnimationFrame(loop);
  }

  // стартовая панорама
  state.camPos.set(Math.sin(0.5) * 210, 72, Math.cos(0.5) * 210);
  state.camLook.set(0, 9, 0);
  camera.position.copy(state.camPos);
  camera.lookAt(state.camLook);

  requestAnimationFrame(loop);

  // доступ для отладки
  window.__game = {
    scene: scene,
    world: world,
    player: player,
    camera: camera,
    renderer: renderer,
    state: state,
    input: input,
    step: simulate,
    start: startGame
  };

  if (location.hash === '#play' || /[?&]play=1/.test(location.search)) {
    setTimeout(startGame, 120);
  }
})();
