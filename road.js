/* YODA: the page sits on an open South African road, seen from the driver's seat.
   A tar texture (aggregate grain, tyre-polished tracks, cracks, patch repairs, worn paint, tarred shoulders,
   gravel verge and dry veld) is painted once, then drawn row by row in true perspective ("mode 7").
   Scrolling drives forward and glides to a stop; scrolling up reverses. Night: headlights light the road ahead.
   Four lanes: broken white lane lines, solid white centre lines, yellow edge lines. */
(() => {
  const c = document.getElementById('road');
  if (!c) return;
  const g = c.getContext('2d'), root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- world (metres) and texture --------------------------------------------------------------
  const HALF = 22;                      // texture covers 22 m either side of the centre line
  const LANE = 3.7, EDGE = 2 * LANE, SHOULDER = EDGE + 2.2, GRAVEL = SHOULDER + 2.8;
  const LEN = 48;                       // texture repeats every 48 m (4 dash periods)
  const TW = 1024, TH = 1024, PX = TW / (2 * HALF), PY = TH / LEN;
  const xOf = i => (i + .5) / PX - HALF;                       // texture column -> metres from centre
  const yOf = j => (j + .5) / PY;                              // texture row -> metres along the road

  // small deterministic noise
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  function grid(n) { const a = new Float32Array(n * n); for (let k = 0; k < a.length; k++) a[k] = rnd(); return a; }
  const G1 = grid(64), G2 = grid(64);
  function vnoise(G, x, y) {           // tileable value noise on a 64x64 grid
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, m = v => ((v % 64) + 64) % 64;
    const s = t => t * t * (3 - 2 * t), a = G[m(yi) * 64 + m(xi)], b = G[m(yi) * 64 + m(xi + 1)], cc = G[m(yi + 1) * 64 + m(xi)], d = G[m(yi + 1) * 64 + m(xi + 1)];
    return a + (b - a) * s(fx) + (cc - a) * s(fy) + (a - b - cc + d) * s(fx) * s(fy);
  }

  function paint(x, y) {   // 1 = paint, 0 = none (with wear)
    const ax = Math.abs(x), dashOn = (y % 12) < 3, wear = vnoise(G2, x * 3, y * 1.4);
    let p = 0;
    if (Math.abs(ax - (EDGE - .25)) < .07) p = 2;                                        // yellow edge lines
    else if (ax < .2 && Math.abs(ax - .12) < .055) p = 1;                                 // double solid centre
    else if (Math.abs(ax - LANE) < .065 && dashOn) p = 1;                                 // broken lane lines
    return p && wear > .18 ? p : 0;
  }

  function buildTextures() {
    const day = new ImageData(TW, TH), night = new ImageData(TW, TH);
    // a few repairs and cracks, kept away from the seam so the texture tiles
    const patches = [[-5.6, 9, 2.4, 5], [2.2, 30, 3, 3.2], [-1.9, 40, 1.6, 2.2]];
    const cracks = []; for (let k = 0; k < 7; k++) { let x = (rnd() - .5) * 2 * EDGE * .9, y = 3 + rnd() * 40; const pts = [[x, y]]; for (let s = 0; s < 14; s++) { x += (rnd() - .5) * .35; y += .18 + rnd() * .15; pts.push([x, y]); } cracks.push(pts); }
    const crackMask = new Uint8Array(TW * TH);
    for (const pts of cracks) for (let s = 1; s < pts.length; s++) {
      const [x0, y0] = pts[s - 1], [x1, y1] = pts[s];
      for (let t = 0; t <= 1; t += .05) { const i = Math.round((x0 + (x1 - x0) * t + HALF) * PX), j = Math.round((y0 + (y1 - y0) * t) * PY); if (i >= 0 && i < TW && j >= 0 && j < TH) crackMask[j * TW + i] = 1; }
    }
    for (let j = 0; j < TH; j++) {
      const y = yOf(j);
      for (let i = 0; i < TW; i++) {
        const x = xOf(i), ax = Math.abs(x), k = (j * TW + i) * 4;
        const grain = rnd(), lo = vnoise(G1, x * .9, y * .5), mid = vnoise(G2, x * 4, y * 3);
        let r, gg, b, refl = 0;
        if (ax < EDGE) {                                        // tar
          let v = 62 + lo * 14 + mid * 8 + (grain > .975 ? 16 : grain < .05 ? -12 : (grain - .5) * 10);
          const inLane = ((ax % LANE) + LANE) % LANE, track = Math.min(Math.abs(inLane - .95), Math.abs(inLane - 2.75));
          if (track < .35) v -= 9 * (1 - track / .35);            // tyre-polished tracks
          if (Math.abs(inLane - 1.85) < .3) v -= 6 * vnoise(G1, x * 2, y * .25);   // oil drip down the lane centre
          for (const [px, py, pw, ph] of patches) if (Math.abs(x - px) < pw / 2 && y > py && y < py + ph) v = v * .78 + 6;
          if (crackMask[j * TW + i]) v *= .45;
          const p = paint(x, y);
          if (p === 1) { v = 222 - mid * 30; refl = 1; }
          r = gg = b = v; if (p === 2) { r = 214 - mid * 25; gg = 166 - mid * 20; b = 52; refl = 1; } else if (!p) b += 3;
        } else if (ax < SHOULDER) {                             // tarred shoulder: rougher, a little lighter
          const v = 74 + lo * 16 + (grain > .94 ? 34 : (grain - .5) * 16); r = v + 2; gg = v + 1; b = v;
        } else if (ax < GRAVEL) {                               // gravel verge
          const v = 128 + lo * 30 + (grain - .5) * 46; r = v + 14; gg = v + 4; b = v - 14;
        } else {                                                // dry Highveld grass
          const v = vnoise(G1, x * 1.6, y * 1.1), tuft = vnoise(G2, x * 9, y * 7);
          r = 150 + v * 40 - tuft * 30; gg = 132 + v * 30 - tuft * 26; b = 78 + v * 10 - tuft * 14;
          if (tuft > .8) { r -= 34; gg -= 24; b -= 18; }
        }
        day.data[k] = r; day.data[k + 1] = gg; day.data[k + 2] = b; day.data[k + 3] = 255;
        // night: everything sinks into the dark; paint keeps some glow (it's retro-reflective)
        const n = refl ? .62 : ax < SHOULDER ? .24 : .14;
        night.data[k] = r * n; night.data[k + 1] = gg * n; night.data[k + 2] = b * n * 1.12; night.data[k + 3] = 255;
      }
    }
    const mk = d => { const t = document.createElement('canvas'); t.width = TW; t.height = TH; t.getContext('2d').putImageData(d, 0, 0); return t; };
    return { day: mk(day), night: mk(night) };
  }
  const TEX = buildTextures();

  // --- camera ----------------------------------------------------------------------------------
  const HOR = .36;
  let W = 0, H = 0, F = 1, CAM = 2, dirty = true;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.imageSmoothingEnabled = true;
    F = H * .95;
    // eye height chosen so the yellow edge lines leave the screen about halfway down the road (wide on any screen)
    CAM = Math.min(6.5, Math.max(1.5, .5 * (H * (1 - HOR)) * 2 * EDGE / W));
    dirty = true;
  }
  const yAt = z => H * HOR + F * CAM / z;

  let travel = 0, shown = 0, sy = scrollY;
  addEventListener('scroll', () => { travel += (scrollY - sy) * 0.05; sy = scrollY; }, { passive: true });  // ~50 m of road per 1000 px
  addEventListener('resize', size);
  addEventListener('themechange', () => dirty = true);

  const BG = { day: '#f4f3f0', night: '#08080a' };
  function draw() {
    const mode = root.dataset.theme === 'day' ? 'day' : 'night', tex = TEX[mode], hy = H * HOR, cx = W / 2;
    g.fillStyle = BG[mode]; g.fillRect(0, 0, W, H);
    // the road, one screen row at a time
    for (let y = Math.ceil(hy + 1); y < H; y++) {
      const z = F * CAM / (y - hy);
      if (z > 900) continue;
      const s = z + shown, v = ((s * PY) % TH + TH) % TH, w = F * 2 * HALF / z;
      g.drawImage(tex, 0, v | 0, TW, 1, cx - w / 2, y, w, 1.6);
    }
    // reflector posts just past the gravel, every 25 m (white on the left, red on the right, as in SA)
    const step = 25, first = step - (((shown % step) + step) % step);
    for (let z = first; z < 160; z += step) {
      const base = yAt(z), h = F * 1 / z, wpx = Math.max(1, F * .1 / z), fade = Math.max(0, 1 - z / 160);
      if (base > H + h) continue;
      for (const side of [-1, 1]) {
        const x = cx + F * side * (GRAVEL + .4) / z;
        g.globalAlpha = fade; g.fillStyle = mode === 'day' ? '#f2f2f2' : '#2a2a30'; g.fillRect(x - wpx / 2, base - h, wpx, h);
        g.fillStyle = side < 0 ? '#ffffff' : '#ff2b3d'; g.fillRect(x - wpx / 2, base - h * .88, wpx, h * .13);
        g.globalAlpha = 1;
      }
    }
    if (mode === 'night') {   // headlights: a warm pool on the road ahead
      g.save(); g.translate(cx, H * 1.02); g.scale(1.6, 1);
      const r = (H - hy) * .95, hl = g.createRadialGradient(0, 0, 0, 0, 0, r);
      hl.addColorStop(0, 'rgba(255,236,200,.20)'); hl.addColorStop(.55, 'rgba(255,236,200,.07)'); hl.addColorStop(1, 'rgba(255,236,200,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = hl; g.fillRect(-r, -r, 2 * r, r); g.restore();
      g.globalCompositeOperation = 'source-over';
    }
    // the far road melts into the page colour; a light veil keeps the page text easy to read
    const haze = g.createLinearGradient(0, hy - 2, 0, hy + (H - hy) * .4);
    haze.addColorStop(0, BG[mode]); haze.addColorStop(1, BG[mode] + '00');
    g.fillStyle = haze; g.fillRect(0, hy - 2, W, H - hy + 2);
    g.fillStyle = BG[mode] + (mode === 'day' ? '59' : '3d'); g.fillRect(0, 0, W, H);
  }

  function frame() {
    const d = travel - shown;
    if (Math.abs(d) > 0.002) { shown += calm ? d : d * 0.1; dirty = true; }   // glide to a stop (no glide with reduced motion)
    if (dirty && !document.hidden) { dirty = false; draw(); }
    requestAnimationFrame(frame);
  }
  size(); requestAnimationFrame(frame);
  root.classList.add('on-road');
})();
