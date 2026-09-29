(() => {
// Ambient effects: cursor trail, tap bursts, floaters, fireworks, balloons, text splitting, magnetic buttons.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PALETTE = ['#ff6ec7', '#f107a3', '#b44cff', '#7b2ff7', '#ffc6e8', '#d8c2ff', '#ffd166'];
const pick = (a) => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);
const lowPower = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
// Frame-rate independent step: 1 at 60 Hz, 0.5 at 120 Hz, capped after tab switches.
const stepper = () => { let last = 0; return (now) => { const k = last ? Math.min((now - last) / 16.67, 3) : 1; last = now; return k; }; };

function fitCanvas(c, cap = 1.5) {
  const d = Math.min(devicePixelRatio || 1, cap); // capped: full 3x density costs 4x the pixels for no visible gain
  c.width = innerWidth * d; c.height = innerHeight * d;
  return d;
}

/* ---------- Split text into letters (for waves / staggered reveals) ---------- */
function splitText(root = document) {
  root.querySelectorAll('[data-split]').forEach((el) => {
    if (el.dataset.splitDone) return;
    const text = el.textContent;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    });
    el.dataset.splitDone = '1';
  });
}

/* ---------- Sparkle trail + tap bursts (one top canvas) ---------- */
const trail = (() => {
  const c = document.getElementById('trail');
  if (!c || reduceMotion) return { burst() {} };
  const ctx = c.getContext('2d');
  let dpr = fitCanvas(c), parts = [], running = false;
  addEventListener('resize', () => { dpr = fitCanvas(c); });

  const star = (x, y, r, rot) => {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot + (i * Math.PI) / 4, rr = i % 2 ? r * .38 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  };
  const heart = (x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * .3);
    ctx.bezierCurveTo(x, y, x - s * .5, y, x - s * .5, y + s * .3);
    ctx.bezierCurveTo(x - s * .5, y + s * .6, x, y + s * .8, x, y + s);
    ctx.bezierCurveTo(x, y + s * .8, x + s * .5, y + s * .6, x + s * .5, y + s * .3);
    ctx.bezierCurveTo(x + s * .5, y, x, y, x, y + s * .3);
    ctx.fill();
  };
  let step = stepper();
  const loop = (now) => {
    const k = step(now);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'lighter'; // glowy look without per-particle shadowBlur (slow in Safari/Firefox)
    parts = parts.filter((p) => (p.life -= p.decay * k) > 0);
    for (const p of parts) {
      p.x += p.vx * k; p.y += p.vy * k; p.vy += p.g * k; p.rot += p.vr * k;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.kind === 'heart') heart(p.x, p.y, p.size); else star(p.x, p.y, p.size, p.rot);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (parts.length) requestAnimationFrame(loop); else { running = false; step = stepper(); }
  };
  const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };

  let last = 0;
  addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < 24 || e.pointerType === 'touch' || parts.length > 160) return;
    last = now;
    for (let i = 0; i < 2; i++) {
      parts.push({ kind: 'star', x: e.clientX * dpr + rand(-4, 4) * dpr, y: e.clientY * dpr + rand(-4, 4) * dpr,
        vx: rand(-.4, .4) * dpr, vy: rand(-.2, .6) * dpr, g: .02 * dpr, rot: rand(0, 6), vr: rand(-.1, .1),
        size: rand(2, 5) * dpr, life: 1, decay: rand(.02, .035), color: pick(PALETTE) });
    }
    kick();
  }, { passive: true });

  function burst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-.2, .2), sp = rand(2, 5) * dpr;
      parts.push({ kind: i % 3 ? 'heart' : 'star', x: x * dpr, y: y * dpr, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.5 * dpr,
        g: .08 * dpr, rot: 0, vr: .05, size: rand(7, 13) * dpr, life: 1, decay: rand(.012, .02), color: pick(PALETTE) });
    }
    kick();
  }
  addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY, e.pointerType === 'touch' ? 10 : 12), { passive: true });
  return { burst };
})();
const burst = trail.burst;

/* ---------- DOM floaters: rising hearts, falling petals, twinkling stars ---------- */
function floaters() {
  document.querySelectorAll('[data-floaters]').forEach((box) => {
    if (box.childElementCount || reduceMotion) return;
    const kind = box.dataset.floaters;
    const n = kind === 'stars' ? 26 : innerWidth < 700 ? 12 : 20;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = `fl fl--${kind}`;
      el.style.cssText = `left:${rand(0, 100)}%;top:${kind === 'stars' ? rand(0, 100) + '%' : ''};` +
        `--s:${rand(.5, 1.4).toFixed(2)};--dur:${rand(9, 20).toFixed(1)}s;--delay:${rand(-20, 0).toFixed(1)}s;` +
        `--sway:${rand(20, 70).toFixed(0)}px;--hue:${pick(['#ff6ec7', '#f107a3', '#d8c2ff', '#b44cff', '#ffc6e8'])}`;
      if (kind === 'hearts') el.textContent = pick(['♥', '♡', '✦', '♥']);
      box.appendChild(el);
    }
  });
}

/* ---------- Fireworks ---------- */
const fireworks = (() => {
  const c = document.getElementById('fireworks');
  if (!c || reduceMotion) return { start() {}, stop() {} };
  const ctx = c.getContext('2d');
  // 1x is plenty for soft glowing sparks, and the per-frame fade covers the whole canvas
  let dpr = fitCanvas(c, 1), rockets = [], sparks = [], raf = 0, timer = 0, active = false;
  addEventListener('resize', () => { dpr = fitCanvas(c, 1); });

  function launch() {
    rockets.push({ x: rand(.15, .85) * c.width, y: c.height + 10, vy: -rand(9, 12.5) * dpr, vx: rand(-1, 1) * dpr,
      target: rand(.15, .45) * c.height, color: pick(PALETTE) });
  }
  function explode(r) {
    const n = lowPower ? 44 : 70, shape = Math.random() < .35 ? 'heart' : 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      let vx, vy;
      if (shape === 'heart') { // parametric heart
        vx = 16 * Math.sin(a) ** 3 * .28; vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .28;
      } else { const sp = rand(2, 6.5); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
      sparks.push({ x: r.x, y: r.y, vx: vx * dpr, vy: vy * dpr, life: 1, decay: rand(.009, .016),
        color: Math.random() < .25 ? '#fff' : r.color });
    }
  }
  let step = stepper();
  function loop(now) {
    const k = step(now);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = `rgba(0,0,0,${Math.min(.6, .22 * k)})`; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'lighter';
    rockets = rockets.filter((r) => {
      r.x += r.vx * k; r.y += r.vy * k; r.vy += .12 * dpr * k;
      ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, 2.2 * dpr, 0, 7); ctx.fill();
      if (r.y <= r.target || r.vy >= 0) { explode(r); return false; }
      return true;
    });
    sparks = sparks.filter((p) => (p.life -= p.decay * k) > 0);
    const drag = Math.pow(.985, k);
    for (const p of sparks) {
      p.x += p.vx * k; p.y += p.vy * k; p.vx *= drag; p.vy = p.vy * drag + .05 * dpr * k;
      ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.8 * dpr, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (active || rockets.length || sparks.length) raf = requestAnimationFrame(loop);
    else { raf = 0; step = stepper(); ctx.clearRect(0, 0, c.width, c.height); }
  }
  return {
    start() {
      if (active) return;
      active = true;
      const t0 = performance.now();
      const schedule = () => {
        if (!active) return;
        if (!document.hidden) { launch(); if (Math.random() < .4) setTimeout(launch, 250); } // don't pile up rockets in a background tab
        const elapsed = performance.now() - t0;
        timer = setTimeout(schedule, elapsed < 12000 ? rand(500, 1000) : rand(3000, 6000));
      };
      schedule();
      if (!raf) raf = requestAnimationFrame(loop);
    },
    stop() { active = false; clearTimeout(timer); },
  };
})();

/* ---------- Balloon pop sound (synthesised, no audio file) ---------- */
let popCtx;
function popSound() {
  try {
    popCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (popCtx.state === 'suspended') popCtx.resume();
    const now = popCtx.currentTime;
    const out = popCtx.createGain();
    out.gain.value = .9;
    out.connect(popCtx.destination);

    // the "snap": a very short burst of bright noise
    const len = Math.floor(popCtx.sampleRate * .12);
    const buf = popCtx.createBuffer(1, len, popCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
    const noise = popCtx.createBufferSource();
    noise.buffer = buf;
    noise.playbackRate.value = rand(.85, 1.2); // every pop sounds a little different
    const hp = popCtx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 900;
    noise.connect(hp).connect(out);
    noise.start(now);

    // the "body": a quick low thump that drops in pitch
    const osc = popCtx.createOscillator();
    const og = popCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(rand(180, 240), now);
    osc.frequency.exponentialRampToValueAtTime(50, now + .09);
    og.gain.setValueAtTime(.7, now);
    og.gain.exponentialRampToValueAtTime(.001, now + .12);
    osc.connect(og).connect(out);
    osc.start(now); osc.stop(now + .13);
  } catch {}
}

/* ---------- Balloons you can pop ---------- */
function balloons(box, count = innerWidth < 700 ? 6 : 10) {
  if (!box || reduceMotion) return;
  const release = (delay) => setTimeout(() => {
    const b = document.createElement('button');
    b.className = 'balloon';
    b.setAttribute('aria-label', 'Pop balloon');
    b.tabIndex = -1;
    b.style.cssText = `left:${rand(2, 92)}%;--c:${pick(PALETTE.slice(0, 6))};--dur:${rand(9, 15).toFixed(1)}s;` +
      `--sway:${rand(-40, 40).toFixed(0)}px;--s:${rand(.75, 1.2).toFixed(2)}`;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (b.classList.contains('popped')) return;
      popSound();
      burst(e.clientX, e.clientY, 18);
      b.classList.add('popped');
      setTimeout(() => b.remove(), 250);
    });
    b.addEventListener('animationend', () => b.remove());
    box.appendChild(b);
  }, delay);
  for (let i = 0; i < count; i++) release(i * 420 + rand(0, 300));
  // keep a gentle trickle going
  let n = 0;
  const trickle = setInterval(() => { release(0); if (++n > 25) clearInterval(trickle); }, innerWidth < 700 ? 7000 : 5000);
}

/* ---------- Magnetic buttons ---------- */
function magnet() {
  if (reduceMotion || matchMedia('(hover: none)').matches) return;
  document.querySelectorAll('.btn--magnet').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .25}px ${(e.clientY - r.top - r.height / 2) * .35}px`;
    });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
}

/* ---------- Parallax on the background orbs ---------- */
function parallax() {
  if (reduceMotion) return;
  const orbs = document.querySelector('.orbs');
  addEventListener('pointermove', (e) => {
    orbs.style.setProperty('--mx', (e.clientX / innerWidth - .5).toFixed(3));
    orbs.style.setProperty('--my', (e.clientY / innerHeight - .5).toFixed(3));
  }, { passive: true });
}

/* ---------- 3D tilt on hover ---------- */
function tilt(el, max = 10) {
  if (reduceMotion || matchMedia('(hover: none)').matches) return;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - .5) * max * 2}deg`);
    el.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - .5) * max * 2}deg`);
    el.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
  });
  el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
}

window.FX = { splitText, burst, floaters, fireworks, balloons, magnet, parallax, tilt };
})();
