/* Острова Ветра — лёгкий синтезированный звук */
(function () {
  'use strict';

  const GameAudio = {
    ctx: null,
    master: null,
    muted: false,
    ready: false,
    thrustGain: null,
    windGain: null
  };

  function now() {
    return GameAudio.ctx ? GameAudio.ctx.currentTime : 0;
  }

  function makeNoise(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    return buf;
  }

  function connectLoop(ctx, filterType, freq, q, gainValue) {
    const src = ctx.createBufferSource();
    src.buffer = makeNoise(ctx, 3);
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    src.connect(filter).connect(gain).connect(GameAudio.master);
    src.start();
    return gain;
  }

  GameAudio.init = function () {
    if (GameAudio.ctx || GameAudio.ready) {
      if (GameAudio.ctx && GameAudio.ctx.state === 'suspended') GameAudio.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      GameAudio.ctx = ctx;
      GameAudio.ready = true;
      const master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      GameAudio.master = master;
      GameAudio.windGain = connectLoop(ctx, 'lowpass', 380, 0.4, 0.035);
      GameAudio.thrustGain = connectLoop(ctx, 'bandpass', 780, 0.7, 0.0001);
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      GameAudio.ready = false;
    }
  };

  GameAudio.setMuted = function (muted) {
    GameAudio.muted = !!muted;
    if (!GameAudio.master) return;
    const t = now();
    GameAudio.master.gain.cancelScheduledValues(t);
    GameAudio.master.gain.linearRampToValueAtTime(GameAudio.muted ? 0 : 0.55, t + 0.18);
  };

  GameAudio.toggleMuted = function () {
    GameAudio.setMuted(!GameAudio.muted);
    return GameAudio.muted;
  };

  function tone(freq, type, dur, volume, when, glideTo) {
    const ctx = GameAudio.ctx;
    if (!ctx || GameAudio.muted) return;
    try {
      const t0 = now() + (when || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(volume || 0.12, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(GameAudio.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) { /* звук не критичен */ }
  }

  GameAudio.chime = function () {
    tone(880, 'sine', 0.45, 0.10, 0);
    tone(1318.5, 'sine', 0.55, 0.075, 0.07);
    tone(1760, 'triangle', 0.6, 0.035, 0.13);
  };

  GameAudio.fanfare = function () {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 'sine', 0.8, 0.065, i * 0.13));
  };

  GameAudio.jump = function () {
    tone(330, 'triangle', 0.16, 0.055, 0, 620);
  };

  GameAudio.land = function () {
    tone(150, 'sine', 0.18, 0.11, 0, 85);
  };

  GameAudio.step = function () {
    tone(96 + Math.random() * 26, 'sine', 0.08, 0.022, 0, 58);
  };

  GameAudio.flyOn = function () {
    tone(260, 'sine', 0.45, 0.07, 0, 720);
  };

  GameAudio.flyOff = function () {
    tone(520, 'sine', 0.35, 0.05, 0, 180);
  };

  GameAudio.fuelOut = function () {
    tone(360, 'square', 0.2, 0.03, 0, 180);
    tone(260, 'square', 0.28, 0.025, 0.14, 120);
  };

  GameAudio.setThrust = function (amount) {
    if (!GameAudio.thrustGain || !GameAudio.ctx) return;
    try {
      const t = now();
      const target = Math.max(0.0001, amount * 0.05);
      GameAudio.thrustGain.gain.cancelScheduledValues(t);
      GameAudio.thrustGain.gain.setTargetAtTime(target, t, 0.08);
    } catch (e) { /* ignore */ }
  };

  window.GameAudio = GameAudio;
})();
