(() => {
const { splitText, floaters, fireworks, balloons, magnet, parallax, tilt, burst } = window.FX;

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Sparkles background ---------------- */
// Glowing stars are pre-rendered once as small sprites; per-frame shadowBlur is very slow in Safari/Firefox.
(() => {
  const c = $('#sparkles'), ctx = c.getContext('2d');
  const lowPower = innerWidth < 760 || (navigator.hardwareConcurrency || 8) <= 4;
  let w = 0, h = 0, dpr = 1, stars = [], shooting = [];
  const colors = ['255,198,232', '216,194,255', '255,110,199', '255,255,255'];
  const sprites = colors.map((col) => {
    const s = document.createElement('canvas');
    s.width = s.height = 32;
    const g = s.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${col},1)`); grad.addColorStop(.18, `rgba(${col},.9)`);
    grad.addColorStop(.4, `rgba(${col},.25)`); grad.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    return s;
  });
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    const nw = Math.round(innerWidth * dpr), nh = Math.round(innerHeight * dpr);
    if (nw === w && Math.abs(nh - h) < 150 * dpr && stars.length) { h = c.height = nh; return; } // mobile URL bar: keep stars
    w = c.width = nw; h = c.height = nh;
    const n = Math.round(Math.min(lowPower ? 60 : 130, (innerWidth * innerHeight) / 9000));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      size: (Math.random() * 6 + 4) * dpr,
      v: (Math.random() * .25 + .05) * dpr,
      p: Math.random() * Math.PI * 2,
      s: sprites[(Math.random() * sprites.length) | 0],
    }));
  };
  let last = 0;
  const tick = (t) => {
    const k = last ? Math.min((t - last) / 16.67, 3) : 1;
    last = t;
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.y -= s.v * k; if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; }
      ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 1400 + s.p));
      ctx.drawImage(s.s, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.globalAlpha = 1;
    if (Math.random() < .005) shooting.push({ x: Math.random() * w * .8, y: Math.random() * h * .4, life: 1, v: (8 + Math.random() * 6) * dpr });
    shooting = shooting.filter((m) => (m.life -= .018 * k) > 0);
    for (const m of shooting) {
      m.x += m.v * k; m.y += m.v * .45 * k;
      const g = ctx.createLinearGradient(m.x, m.y, m.x - 90 * dpr, m.y - 40 * dpr);
      g.addColorStop(0, `rgba(255,230,245,${m.life})`); g.addColorStop(1, 'rgba(255,110,199,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2 * dpr;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - 90 * dpr, m.y - 40 * dpr); ctx.stroke();
    }
    if (!reduceMotion) requestAnimationFrame(tick);
  };
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize(); requestAnimationFrame(tick);
})();

/* ---------------- Confetti ---------------- */
const confetti = (() => {
  const c = $('#confetti'), ctx = c.getContext('2d');
  let parts = [], running = false;
  const palette = ['#ff6ec7', '#f107a3', '#b44cff', '#7b2ff7', '#ffc6e8', '#d8c2ff', '#ffffff'];
  const D = Math.min(devicePixelRatio || 1, 1.5); // capped: 3x phone screens would push 9x the pixels
  const fit = () => { c.width = innerWidth * D; c.height = innerHeight * D; };
  addEventListener('resize', fit); fit();
  let last = 0;
  const loop = (now) => {
    const k = last ? Math.min((now - last) / 16.67, 3) : 1; // time-based: same speed at 60/120/144 Hz
    last = now;
    ctx.clearRect(0, 0, c.width, c.height);
    parts = parts.filter((p) => p.y < c.height + 40 && (p.life -= k) > 0);
    for (const p of parts) {
      p.vx *= Math.pow(.99, k); p.vy += .12 * D * k; p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k;
      ctx.setTransform(Math.cos(p.rot), Math.sin(p.rot), -Math.sin(p.rot), Math.cos(p.rot), p.x, p.y);
      ctx.fillStyle = p.color;
      if (p.shape === 'heart') { ctx.font = `${Math.round(p.size * 2)}px serif`; ctx.fillText('♥', -p.size, p.size); }
      else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2 * (0.5 + Math.abs(Math.sin(p.rot * 2))));
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; last = 0; ctx.clearRect(0, 0, c.width, c.height); }
  };
  return (count = 180, originX = .5, originY = .45) => {
    if (reduceMotion) return;
    if (innerWidth < 760) count = Math.round(count * .55);
    const d = D;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = (Math.random() * 9 + 4) * d;
      parts.push({
        x: c.width * originX, y: c.height * originY,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6 * d,
        rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
        size: (Math.random() * 8 + 6) * d, life: 400,
        color: palette[(Math.random() * palette.length) | 0],
        shape: Math.random() < .18 ? 'heart' : 'rect',
      });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  };
})();

/* ---------------- Media ---------------- */
let media = [], music = null, opened = false;
const MUSIC_VOL = .55;
function fadeTo(vol, ms = 1200) {
  if (!music) return;
  const from = music.volume, t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    music.volume = from + (vol - from) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function startMusic() {
  if (!music || !music.paused) return;
  music.volume = 0;
  music.play().then(() => { $('#music').hidden = false; $('#music').classList.remove('paused'); fadeTo(MUSIC_VOL, 2500); })
    .catch(() => { $('#music').hidden = false; $('#music').classList.add('paused'); });
}
// Media list comes from media.js (window.MEDIA), generated by `npm run media`.
const mediaReady = Promise.resolve({ items: window.MEDIA || [] })
  .then(({ items }) => {
    media = items.filter((i) => i.kind !== 'audio');
    // Playlist: the first track (Happy Birthday) plays once, then the melodies loop.
    const tracks = items.filter((i) => i.kind === 'audio').map((i) => i.url);
    if (tracks.length) {
      let t = 0;
      music = new Audio(tracks[0]); music.preload = 'auto';
      music.addEventListener('ended', () => {
        t = t + 1 < tracks.length ? t + 1 : Math.min(1, tracks.length - 1);
        setTimeout(() => { music.src = tracks[t]; music.play().catch(() => {}); }, 1500);
      });
      if (opened) startMusic();
    }
    const photos = media.filter((m) => m.kind === 'image');
    if (photos.length) {
      document.querySelectorAll('img[data-photo]').forEach((img) => {
        img.src = photos[Number(img.dataset.photo) % photos.length].url;
      });
    }
  })
  .catch(() => {});

/* ---------------- Stage flow ---------------- */
const stages = ['intro', 'letter', 'cake', 'celebrate'].map((id) => $('#' + id));
const PARTY = 3;
let current = 0;
document.body.classList.add('locked');
splitText(); floaters(); magnet(); parallax();

function go(i) {
  const from = stages[current], to = stages[i];
  const curtain = $('#curtain');
  curtain.classList.remove('sweep'); void curtain.offsetWidth; curtain.classList.add('sweep');
  from.classList.add('is-leaving'); from.classList.remove('is-active');
  setTimeout(() => from.classList.remove('is-leaving'), 1300);
  current = i;
  document.body.classList.toggle('locked', i !== PARTY);
  if (i === 1) book.reset();
  if (i === 2) cake.reset();
  i === PARTY ? fireworks.start() : fireworks.stop();
  requestAnimationFrame(() => to.classList.add('is-active'));
  if (i === PARTY) {
    scrollTo(0, 0);
    setTimeout(() => { confetti(220, .5, .35); setTimeout(() => { confetti(90, .15, .6); confetti(90, .85, .6); }, 500); }, 700);
    mediaReady.then(renderGallery);
    if (!balloonsOut) { balloonsOut = true; setTimeout(() => balloons($('#balloons')), 900); }
  }
}
let balloonsOut = false;

/* ---------------- Make a wish ---------------- */
const cake = (() => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const g = $('#cake .candles');
  const xs = [112, 136, 160, 184, 208];
  const colors = ['#d8c2ff', '#ff6ec7', '#ffffff', '#ff6ec7', '#d8c2ff'];
  const candles = xs.map((x, i) => {
    const c = document.createElementNS(svgNS, 'g');
    c.setAttribute('class', 'candle');
    c.style.setProperty('--i', i);
    c.innerHTML = `
      <rect x="${x - 5}" y="96" width="10" height="42" rx="3" fill="${colors[i]}"/>
      <path d="M${x - 5} 104 l10 -6 M${x - 5} 116 l10 -6 M${x - 5} 128 l10 -6" stroke="#f107a3" stroke-width="2" opacity=".55"/>
      <line x1="${x}" y1="96" x2="${x}" y2="90" stroke="#3b1650" stroke-width="1.5"/>
      <circle class="glow" cx="${x}" cy="78" r="22" fill="url(#glowG)"/>
      <path class="flame" d="M${x} 62 C ${x + 7} 72, ${x + 6} 84, ${x} 89 C ${x - 6} 84, ${x - 7} 72, ${x} 62 Z" fill="url(#flameG)" style="transform-origin:${x}px 89px"/>
      <g class="smoke"><circle cx="${x}" cy="84" r="4"/><circle cx="${x + 3}" cy="76" r="5"/><circle cx="${x - 2}" cy="66" r="6"/></g>`;
    g.appendChild(c);
    return c;
  });
  let lit = candles.length;
  const hint = $('#cakeHint');
  $('#cakeBtn').addEventListener('click', (e) => {
    if (!lit) return;
    const c = candles[candles.length - lit];
    c.classList.add('out');
    lit--;
    const r = c.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top, 8);
    hint.textContent = lit ? `${lit} more to go…` : 'all out! 🎉';
    if (!lit) {
      $('#cakeBtn').classList.add('done');
      confetti(260, .5, .45);
      setTimeout(() => { confetti(120, .2, .5); confetti(120, .8, .5); }, 450);
      setTimeout(() => { $('#wish').hidden = false; }, 700);
    }
  });
  $('#toParty').addEventListener('click', () => go(PARTY));
  return {
    reset() {
      candles.forEach((c) => c.classList.remove('out'));
      lit = candles.length;
      hint.textContent = 'tap the cake to blow out the candles';
      $('#cakeBtn').classList.remove('done');
      $('#wish').hidden = true;
    },
  };
})();

/* ---------------- The little book ---------------- */
const book = (() => {
  const el = $('#book');
  const pool = $('#pages');
  const all = [...pool.querySelectorAll('.page')];
  const endPage = all.find((p) => p.dataset.role === 'end');
  const endpaper = all.find((p) => p.dataset.role === 'endpaper');
  const pages = all.filter((p) => !p.dataset.role);
  const mq = matchMedia('(max-width: 760px)');
  let leaves = [], k = 0, single = null, audio;

  const face = (side, page) => {
    const f = document.createElement('div');
    f.className = `face face--${side}`;
    if (page) f.appendChild(page);
    else { const blank = document.createElement('div'); blank.className = 'page'; f.appendChild(blank); }
    return f;
  };
  const base = (side, page) => {
    const b = document.createElement('div');
    b.className = `book__base book__base--${side}`;
    b.appendChild(page);
    return b;
  };

  function build() {
    const pageIndex = single ? k : k * 2; // keep roughly the same place when switching modes
    single = mq.matches;
    pool.append(...all);
    el.innerHTML = '';
    el.classList.toggle('single', single);
    leaves = [];
    if (single) {
      el.appendChild(base('right', endPage));
      pages.forEach((p) => leaves.push([face('front', p), face('back')]));
    } else {
      el.appendChild(base('left', endpaper));
      el.appendChild(base('right', endPage));
      for (let i = 0; i < pages.length; i += 2) leaves.push([face('front', pages[i]), face('back', pages[i + 1])]);
    }
    leaves = leaves.map(([front, back]) => {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.append(front, back);
      el.appendChild(leaf);
      return leaf;
    });
    k = Math.min(leaves.length, single ? pageIndex : Math.round(pageIndex / 2));
    layout(false);
  }

  function visiblePages() {
    if (single) return [k < leaves.length ? pages[k] : endPage];
    return [k === 0 ? endpaper : pages[2 * k - 1], k < leaves.length ? pages[2 * k] : endPage];
  }

  function layout(animate = true, moving) {
    leaves.forEach((leaf, i) => {
      const flipped = i < k;
      leaf.classList.toggle('is-flipped', flipped);
      leaf.style.zIndex = i === moving ? 999 : flipped ? i + 1 : leaves.length * 2 - i;
    });
    if (moving !== undefined) {
      const leaf = leaves[moving];
      leaf.classList.add('is-turning');
      setTimeout(() => { leaf.classList.remove('is-turning'); layout(false); }, 1100);
    }
    el.classList.toggle('is-closed', k === 0);
    const total = single ? pages.length + 1 : leaves.length + 1;
    $('#pageCount').textContent = `${k + 1} / ${total}`;
    $('#prevPage').disabled = k === 0;
    $('#nextPage').disabled = k === leaves.length;
    const show = () => visiblePages().forEach((p) => p?.classList.add('seen'));
    animate ? setTimeout(show, 450) : show();
  }

  function rustle() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const len = audio.sampleRate * .35, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2) * Math.sin(Math.PI * Math.min(1, i / (len * .15)));
      const src = audio.createBufferSource(), bp = audio.createBiquadFilter(), g = audio.createGain();
      bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = .7; g.gain.value = .12;
      src.buffer = buf; src.connect(bp).connect(g).connect(audio.destination); src.start();
    } catch {}
  }

  function turn(dir) {
    const next = k + dir;
    if (next < 0 || next > leaves.length) return;
    const moving = dir > 0 ? k : k - 1;
    k = next;
    rustle();
    layout(true, moving);
  }

  el.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    turn(x < (single ? .35 : .5) && k > 0 ? -1 : 1);
  });
  let tx = null;
  el.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 40) { e.preventDefault(); turn(dx < 0 ? 1 : -1); }
  });
  $('#prevPage').addEventListener('click', () => turn(-1));
  $('#nextPage').addEventListener('click', () => turn(1));
  addEventListener('keydown', (e) => {
    if (current !== 1) return;
    if (e.key === 'ArrowRight') turn(1);
    if (e.key === 'ArrowLeft') turn(-1);
  });
  mq.addEventListener('change', build);
  build();

  return {
    reset() {
      all.forEach((p) => p.classList.remove('seen'));
      k = 0; layout(false);
    },
  };
})();

$('#openBtn').addEventListener('click', () => {
  confetti(60, .5, .62);
  opened = true;
  startMusic();
  go(1);
});
$('#toGallery').addEventListener('click', () => go(2));
$('#replay').addEventListener('click', () => go(1));
$('#music').addEventListener('click', (e) => {
  if (!music) return;
  if (music.paused) { music.play(); fadeTo(MUSIC_VOL); e.currentTarget.classList.remove('paused'); }
  else { music.pause(); e.currentTarget.classList.add('paused'); }
});

/* ---------------- Gallery ---------------- */
let rendered = false;
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('in'); io.unobserve(e.target);
    const v = e.target.querySelector('video'); if (v) v.play().catch(() => {});
  }
}, { threshold: .12 });

const photoBtn = (m, cls, extra = '') => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.setAttribute('aria-label', 'Open photo');
  b.innerHTML = `<img src="${m.url}" alt="" loading="lazy" decoding="async">${extra}`;
  b.addEventListener('click', () => openLightbox(media.indexOf(m)));
  return b;
};

// Pattern 1 · a beating heart made of photos
function renderHeart(photos) {
  const box = $('#heart');
  const n = 12;
  // Sample the heart curve by arc length so photos are evenly spaced (no bunching at the dip and tip).
  const curve = [];
  for (let k = 0; k <= 720; k++) {
    const t = (k / 720) * Math.PI * 2;
    curve.push([16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  const acc = [0];
  for (let k = 1; k < curve.length; k++) acc.push(acc[k - 1] + Math.hypot(curve[k][0] - curve[k - 1][0], curve[k][1] - curve[k - 1][1]));
  const total = acc[acc.length - 1];
  // Slot 0 would sit in the top dip behind her name, so it stays empty; slot n/2 lands exactly on the tip.
  for (let i = 1; i < n; i++) {
    const target = (i / n) * total;
    const [x, y] = curve[acc.findIndex((d) => d >= target)];
    const b = photoBtn(photos[i % photos.length], 'heart__pic');
    b.style.cssText = `left:${50 + (x / 16) * 41}%;top:${44 - (y / 17) * 44}%;--i:${i}`;
    box.appendChild(b);
  }
  const core = document.createElement('div');
  core.className = 'heart__core';
  core.innerHTML = '<span class="script">Ama</span><small>with love</small>';
  box.appendChild(core);
}

// Pattern 2 · a spinning 3D carousel
function renderCarousel(photos) {
  const ring = $('#ring');
  const list = photos.length >= 8 ? photos : [...photos, ...photos, ...photos].slice(0, 8);
  const n = list.length;
  const w = Math.min(200, innerWidth * .38);
  const radius = Math.round(w / 2 / Math.tan(Math.PI / n) + 24);
  ring.style.setProperty('--r', `${radius}px`);
  ring.style.setProperty('--w', `${w}px`);
  list.forEach((m, i) => {
    const b = photoBtn(m, 'carousel__panel');
    b.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`;
    ring.appendChild(b);
  });
}

// Pattern 3 · film strips sliding in opposite directions
function renderFilm(photos) {
  const half = Math.ceil(photos.length / 2);
  [[$('#filmA'), photos], [$('#filmB'), [...photos.slice(half), ...photos.slice(0, half)].reverse()]].forEach(([track, list]) => {
    for (const copy of [0, 1]) list.forEach((m) => {
      const b = photoBtn(m, 'film__frame');
      if (copy) { b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; }
      track.appendChild(b);
    });
  });
}

// Pattern 4 · floating snapshots, each on its own path
function renderDrift(photos) {
  const box = $('#drift');
  const patterns = ['orbit', 'figure8', 'bob', 'zigzag', 'pendulum', 'spin', 'wave'];
  const cols = innerWidth < 700 ? 3 : 4;
  const picW = Math.max(110, Math.min(200, innerWidth * .2)) * (innerWidth < 700 ? .85 : 1);
  const rowH = picW * 1.25 + 90; // photo height plus room for the motion paths
  photos.forEach((m, i) => {
    const b = photoBtn(m, `drift__pic drift--${patterns[i % patterns.length]}`);
    const row = Math.floor(i / cols), col = i % cols;
    const stagger = row % 2 ? 100 / cols / 4 : -100 / cols / 4;
    b.style.cssText = `left:${(col + .5) * (100 / cols) + (cols > 3 ? stagger : 0)}%;top:${row * rowH + 40}px;width:${picW}px;` +
      `--dur:${(7 + Math.random() * 7).toFixed(1)}s;--delay:${(-Math.random() * 8).toFixed(1)}s;--r:${(Math.random() * 12 - 6).toFixed(1)}deg`;
    box.appendChild(b);
  });
  box.style.height = `${Math.ceil(photos.length / cols) * rowH + 60}px`;
}

function renderRibbon() {
  const t = $('#ribbon');
  const chunk = '<span>Happy Birthday Mrs. Marfoa</span><b>✦</b><span>Ama Marfoa Ankomah</span><b>💜</b>';
  t.innerHTML = chunk.repeat(6);
}

// Reveal each showcase as it scrolls into view
const showIO = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); showIO.unobserve(e.target); }
}, { threshold: .15 });

function renderGallery() {
  if (rendered) return; rendered = true;
  const g = $('#gallery');
  if (!media.length) {
    g.innerHTML = '<p class="empty">Photos are on their way ✨</p>';
    return;
  }
  const photos = media.filter((m) => m.kind === 'image');
  if (photos.length) { renderHeart(photos); renderCarousel(photos); renderFilm(photos); renderDrift(photos); }
  renderRibbon();
  document.querySelectorAll('.show').forEach((el) => showIO.observe(el));
  // Pause showcase animations while they're scrolled out of view
  const pauseIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('offscreen', !e.isIntersecting);
  }, { rootMargin: '200px 0px' });
  document.querySelectorAll('.show, .ribbon').forEach((el) => pauseIO.observe(el));
  media.forEach((m, i) => {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.type = 'button';
    tile.setAttribute('aria-label', `Open ${m.kind} ${i + 1}`);
    tile.style.setProperty('--tilt', `${((i * 37) % 5 - 2) * .6}deg`);
    tile.style.transitionDelay = `${(i % 3) * 120}ms`;
    tile.style.padding = '0';
    if (m.kind === 'video') {
      tile.innerHTML = `<video src="${m.url}#t=0.1" muted loop playsinline preload="metadata"></video><span class="badge">▶</span>`;
    } else {
      tile.innerHTML = `<img src="${m.url}" alt="" loading="lazy" decoding="async">`;
    }
    tile.insertAdjacentHTML('beforeend', '<span class="shine"></span>');
    tile.addEventListener('click', () => openLightbox(i));
    tilt(tile, 8);
    g.appendChild(tile);
    io.observe(tile);
  });
}

/* ---------------- Lightbox ---------------- */
const lb = $('#lightbox'), lbStage = $('#lbStage');
let idx = 0, lastFocus;
function showItem(i) {
  idx = (i + media.length) % media.length;
  const m = media[idx];
  lbStage.innerHTML = m.kind === 'video'
    ? `<video src="${m.url}" controls autoplay playsinline></video>`
    : `<img src="${m.url}" alt="">`;
  $('#lbCount').textContent = `${idx + 1} / ${media.length}`;
}
function openLightbox(i) {
  lastFocus = document.activeElement;
  showItem(i); lb.hidden = false; document.body.classList.add('locked');
  if (music && !music.paused && media[i].kind === 'video') fadeTo(.1, 400);
  $('.lb__close').focus();
}
function closeLightbox() {
  lb.hidden = true; lbStage.innerHTML = ''; document.body.classList.remove('locked');
  if (music && !music.paused) fadeTo(MUSIC_VOL);
  lastFocus?.focus();
}
$('.lb__close').addEventListener('click', closeLightbox);
$('.lb__prev').addEventListener('click', () => showItem(idx - 1));
$('.lb__next').addEventListener('click', () => showItem(idx + 1));
lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
addEventListener('keydown', (e) => {
  if (lb.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') showItem(idx - 1);
  if (e.key === 'ArrowRight') showItem(idx + 1);
});
let touchX = null;
lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX; touchX = null;
  if (Math.abs(dx) > 50) showItem(idx + (dx < 0 ? 1 : -1));
});

})();
