/* === MAP PROP RENDERERS (previously invisible authored decor) ===
   engine_maps.js authors 30+ prop types, but the engine_world.js prop pass was
   an if/else-if chain with no fallback, so sixteen of them were pushed into the
   map data and then silently skipped: pine, hay_bale, swamp_tree, neon_light,
   dumpster, charred_tree, barrel, manhole, crate, tire_tracks, slag_heap,
   planter_bed, log, grow_light, cairn. The decor-scatter pass in
   enrichMapData() re-scatters exactly those types, so most of the "lived-in"
   detail the maps describe never reached the screen.
   Props are decoration only - they carry no collision - so painting them cannot
   affect balance. drawMapPropExtra() is called as the fallback branch and
   returns true when it handled the type. */

const PPX = 3; // pixel lattice used by the gore pipeline, reused for crisp props

function propPixelRect(x, y, w, h, col) {
  X.fillStyle = col;
  const gx = Math.max(PPX, Math.round(w / PPX) * PPX);
  const gy = Math.max(PPX, Math.round(h / PPX) * PPX);
  X.fillRect(x - gx / 2, y - gy / 2, gx, gy);
}

/* Deterministic 0..1 hash so a prop keeps the same fleck pattern every frame. */
function propRand(x, y, salt) {
  const n = Math.sin((x | 0) * 12.9898 + (y | 0) * 78.233 + (salt | 0) * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function drawMapPropExtra(pr) {
  const t = pr.type;
  const rot = (pr.rot != null) ? pr.rot : (pr.a || 0);
  const groundCol = (typeof S !== 'undefined' && S) ? null : null;

  if (t === 'barrel') {
    const r = pr.r || 15, col = pr.col || '#5b5444';
    const hot = pr.hazard ? '#dc2626' : '#b45309';
    X.fillStyle = 'rgba(0,0,0,0.45)';
    X.beginPath(); X.ellipse(pr.x + 4, pr.y + r * 0.75, r * 1.15, r * 0.5, 0, 0, 6.28); X.fill();
    X.fillStyle = col;
    X.beginPath(); X.roundRect(pr.x - r, pr.y - r * 1.15, r * 2, r * 2.3, 4); X.fill();
    X.strokeStyle = 'rgba(0,0,0,0.55)'; X.lineWidth = 1.6; X.stroke();
    X.fillStyle = 'rgba(255,255,255,0.14)';
    X.fillRect(pr.x - r + 3, pr.y - r * 1.15 + 3, 3, r * 2.1);
    X.fillStyle = hot;
    X.fillRect(pr.x - r, pr.y - 2.5, r * 2, 5);
    X.fillStyle = 'rgba(0,0,0,0.5)';
    X.beginPath(); X.ellipse(pr.x, pr.y - r * 1.15, r * 0.72, r * 0.3, 0, 0, 6.28); X.fill();
    X.fillStyle = 'rgba(255,255,255,0.22)';
    X.beginPath(); X.ellipse(pr.x, pr.y - r * 1.18, r * 0.5, r * 0.2, 0, 0, 6.28); X.fill();
    return true;
  }

  if (t === 'crate') {
    const w = pr.w || 34, h = pr.h || 34;
    X.fillStyle = 'rgba(0,0,0,0.42)';
    X.fillRect(pr.x - w / 2 + 5, pr.y - h / 2 + 6, w, h);
    X.fillStyle = pr.col || '#6b4a2a';
    X.fillRect(pr.x - w / 2, pr.y - h / 2, w, h);
    X.strokeStyle = 'rgba(0,0,0,0.55)'; X.lineWidth = 2; X.strokeRect(pr.x - w / 2, pr.y - h / 2, w, h);
    X.strokeStyle = 'rgba(255,255,255,0.10)'; X.lineWidth = 2;
    X.beginPath();
    X.moveTo(pr.x - w / 2 + 3, pr.y - h / 2 + 3); X.lineTo(pr.x + w / 2 - 3, pr.y + h / 2 - 3);
    X.moveTo(pr.x + w / 2 - 3, pr.y - h / 2 + 3); X.lineTo(pr.x - w / 2 + 3, pr.y + h / 2 - 3);
    X.stroke();
    X.fillStyle = 'rgba(0,0,0,0.35)';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      X.fillRect(pr.x + sx * (w / 2 - 4) - 1, pr.y + sy * (h / 2 - 4) - 1, 2, 2);
    }
    return true;
  }

  if (t === 'dumpster') {
    const w = 46, h = 30;
    X.fillStyle = 'rgba(0,0,0,0.5)';
    X.beginPath(); X.ellipse(pr.x + 4, pr.y + h * 0.55, w * 0.55, h * 0.3, 0, 0, 6.28); X.fill();
    X.fillStyle = '#2f4f3a';
    X.beginPath(); X.roundRect(pr.x - w / 2, pr.y - h / 2, w, h, 3); X.fill();
    X.strokeStyle = '#16281c'; X.lineWidth = 2; X.stroke();
    X.fillStyle = '#3c6349';
    X.beginPath(); X.roundRect(pr.x - w / 2 - 2, pr.y - h / 2 - 6, w + 4, 8, 2); X.fill();
    X.strokeStyle = '#16281c'; X.lineWidth = 1.5; X.stroke();
    X.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 3; i++) X.fillRect(pr.x - w / 2 + 8 + i * 13, pr.y - 4, 2, h * 0.75);
    X.fillStyle = '#6b7280';
    X.beginPath(); X.arc(pr.x - w / 2 + 7, pr.y + h / 2 + 1, 3, 0, 6.28); X.arc(pr.x + w / 2 - 7, pr.y + h / 2 + 1, 3, 0, 6.28); X.fill();
    return true;
  }

  if (t === 'manhole') {
    const r = pr.r || 15;
    X.fillStyle = '#12140f';
    X.beginPath(); X.arc(pr.x, pr.y, r, 0, 6.28); X.fill();
    X.strokeStyle = '#3a3d33'; X.lineWidth = 3; X.stroke();
    X.strokeStyle = 'rgba(120,125,110,0.5)'; X.lineWidth = 1.4;
    X.beginPath();
    for (let i = -1; i <= 1; i++) { X.moveTo(pr.x - r * 0.6, pr.y + i * r * 0.42); X.lineTo(pr.x + r * 0.6, pr.y + i * r * 0.42); }
    X.stroke();
    return true;
  }

  if (t === 'tire_tracks') {
    X.save();
    X.translate(pr.x, pr.y);
    X.rotate(rot);
    X.fillStyle = 'rgba(18,20,16,0.5)';
    for (const off of [-10, 10]) {
      X.fillRect(-(pr.w || 90) / 2, off - 4, pr.w || 90, 8);
      X.fillStyle = 'rgba(60,62,52,0.45)';
      for (let i = -(pr.w || 90) / 2; i < (pr.w || 90) / 2; i += 12) X.fillRect(i, off - 4, 4, 8);
      X.fillStyle = 'rgba(18,20,16,0.5)';
    }
    X.restore();
    return true;
  }

  if (t === 'pine' || t === 'swamp_tree' || t === 'charred_tree') {
    const h = pr.h || (t === 'pine' ? 74 : 60);
    const trunkCol = t === 'charred_tree' ? '#1a1412' : (t === 'swamp_tree' ? '#3a2f22' : '#503a24');
    const leafCol = t === 'charred_tree' ? null : (t === 'swamp_tree' ? (pr.col || '#254a2c') : (pr.col || '#22401f'));
    X.fillStyle = 'rgba(0,0,0,0.5)';
    X.beginPath(); X.ellipse(pr.x + 5, pr.y + 6, 16, 7, 0, 0, 6.28); X.fill();
    X.fillStyle = trunkCol;
    X.fillRect(pr.x - 3, pr.y - 6, 6, 16);
    if (t === 'charred_tree') {
      X.strokeStyle = '#1a1412'; X.lineWidth = 4; X.lineCap = 'round';
      X.beginPath();
      X.moveTo(pr.x, pr.y - 6); X.lineTo(pr.x - 10, pr.y - 26);
      X.moveTo(pr.x, pr.y - 14); X.lineTo(pr.x + 11, pr.y - 30);
      X.moveTo(pr.x - 6, pr.y - 20); X.lineTo(pr.x - 14, pr.y - 34);
      X.stroke();
      X.fillStyle = 'rgba(255,90,34,' + (0.4 + 0.3 * Math.sin(((typeof S !== 'undefined' && S ? S.t : 0)) * 6 + pr.x)) + ')';
      X.fillRect(pr.x - 12, pr.y - 37, 3, 3);
      return true;
    }
    if (t === 'pine') {
      for (let i = 0; i < 3; i++) {
        const ry = pr.y - 8 - i * (h * 0.26);
        const rw = (h * 0.38) * (1 - i * 0.22);
        X.fillStyle = leafCol;
        X.beginPath(); X.moveTo(pr.x, ry - h * 0.3); X.lineTo(pr.x - rw, ry); X.lineTo(pr.x + rw, ry); X.closePath(); X.fill();
        X.fillStyle = 'rgba(255,255,255,0.16)';
        X.beginPath(); X.moveTo(pr.x, ry - h * 0.3); X.lineTo(pr.x - rw * 0.5, ry - h * 0.1); X.lineTo(pr.x + rw * 0.5, ry - h * 0.1); X.closePath(); X.fill();
      }
    } else {
      X.fillStyle = leafCol;
      X.beginPath(); X.ellipse(pr.x, pr.y - h * 0.55, h * 0.5, h * 0.32, 0, 0, 6.28); X.fill();
      X.fillStyle = 'rgba(0,0,0,0.28)';
      X.beginPath(); X.ellipse(pr.x + 4, pr.y - h * 0.5, h * 0.4, h * 0.22, 0, 0, 6.28); X.fill();
      X.strokeStyle = '#4a6a30'; X.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) {
        X.beginPath();
        X.moveTo(pr.x + i * 7, pr.y - h * 0.72);
        X.lineTo(pr.x + i * 7 + Math.sin(i) * 3, pr.y - h * 0.36);
        X.stroke();
      }
    }
    return true;
  }

  if (t === 'hay_bale') {
    const r = pr.r || 21;
    X.fillStyle = 'rgba(0,0,0,0.45)';
    X.beginPath(); X.ellipse(pr.x + 4, pr.y + r * 0.7, r * 1.05, r * 0.5, 0, 0, 6.28); X.fill();
    X.fillStyle = pr.col || '#b8912f';
    X.beginPath(); X.arc(pr.x, pr.y, r, 0, 6.28); X.fill();
    X.strokeStyle = 'rgba(90,66,18,0.85)'; X.lineWidth = 1.5;
    X.beginPath(); X.arc(pr.x, pr.y, r * 0.66, 0, 6.28); X.stroke();
    X.beginPath(); X.arc(pr.x, pr.y, r * 0.34, 0, 6.28); X.stroke();
    X.strokeStyle = 'rgba(70,50,14,0.9)'; X.lineWidth = 2;
    X.beginPath(); X.moveTo(pr.x - r * 0.55, pr.y - r * 0.5); X.lineTo(pr.x - r * 0.2, pr.y + r * 0.6); X.stroke();
    X.fillStyle = 'rgba(255,235,170,0.5)';
    for (let i = 0; i < 5; i++) {
      const a = propRand(pr.x, pr.y, i) * 6.28, rr = propRand(pr.x, pr.y, i + 9) * r * 0.8;
      X.fillRect(pr.x + Math.cos(a) * rr, pr.y + Math.sin(a) * rr, 3, 2);
    }
    return true;
  }

  if (t === 'slag_heap') {
    const r = pr.r || 22;
    X.fillStyle = 'rgba(0,0,0,0.55)';
    X.beginPath(); X.ellipse(pr.x + 4, pr.y + r * 0.6, r * 1.1, r * 0.45, 0, 0, 6.28); X.fill();
    X.fillStyle = pr.col || '#2b1d1a';
    X.beginPath(); X.moveTo(pr.x - r, pr.y + r * 0.5); X.lineTo(pr.x - r * 0.3, pr.y - r * 0.7); X.lineTo(pr.x + r * 0.35, pr.y - r * 0.45); X.lineTo(pr.x + r, pr.y + r * 0.5); X.closePath(); X.fill();
    X.fillStyle = 'rgba(255,90,34,' + (0.35 + 0.25 * Math.sin(((typeof S !== 'undefined' && S ? S.t : 0)) * 5 + pr.x * 0.1)) + ')';
    for (let i = 0; i < 4; i++) {
      const rx = pr.x - r * 0.5 + propRand(pr.x, pr.y, i) * r, ry = pr.y + propRand(pr.x, pr.y, i + 4) * r * 0.4;
      X.fillRect(rx, ry, 3, 3);
    }
    return true;
  }

  if (t === 'cairn') {
    X.fillStyle = 'rgba(0,0,0,0.45)';
    X.beginPath(); X.ellipse(pr.x + 3, pr.y + 6, 16, 6, 0, 0, 6.28); X.fill();
    const sizes = [14, 11, 8, 6];
    let cy = pr.y + 4;
    for (let i = 0; i < sizes.length; i++) {
      X.fillStyle = i % 2 ? '#6b6f63' : '#585d52';
      X.beginPath(); X.ellipse(pr.x, cy, sizes[i], sizes[i] * 0.55, 0, 0, 6.28); X.fill();
      X.strokeStyle = 'rgba(0,0,0,0.4)'; X.lineWidth = 1.2; X.stroke();
      cy -= sizes[i] * 0.85;
    }
    return true;
  }

  if (t === 'log') {
    const w = pr.w || 64, r = (pr.h || 14) / 2;
    X.save(); X.translate(pr.x, pr.y); X.rotate(rot);
    X.fillStyle = 'rgba(0,0,0,0.45)';
    X.beginPath(); X.roundRect(-w / 2 + 4, -r + 5, w, r * 2, r); X.fill();
    X.fillStyle = pr.col || '#4a3320';
    X.beginPath(); X.roundRect(-w / 2, -r, w, r * 2, r); X.fill();
    X.strokeStyle = 'rgba(0,0,0,0.5)'; X.lineWidth = 1.6; X.stroke();
    X.fillStyle = '#7a5a34';
    X.beginPath(); X.ellipse(w / 2 - 1, 0, r * 0.55, r * 0.85, 0, 0, 6.28); X.fill();
    X.strokeStyle = 'rgba(60,40,20,0.8)'; X.lineWidth = 1.2;
    X.beginPath(); X.ellipse(w / 2 - 1, 0, r * 0.3, r * 0.5, 0, 0, 6.28); X.stroke();
    X.restore();
    return true;
  }

  if (t === 'planter_bed') {
    const w = pr.w || 70, h = pr.h || 40;
    X.fillStyle = 'rgba(0,0,0,0.45)';
    X.fillRect(pr.x - w / 2 + 4, pr.y - h / 2 + 5, w, h);
    X.fillStyle = pr.col || '#1f4030';
    X.fillRect(pr.x - w / 2, pr.y - h / 2, w, h);
    X.strokeStyle = '#0d1f16'; X.lineWidth = 2; X.strokeRect(pr.x - w / 2, pr.y - h / 2, w, h);
    X.fillStyle = '#2a1c10';
    X.fillRect(pr.x - w / 2 + 4, pr.y - h / 2 + 4, w - 8, h - 8);
    X.strokeStyle = '#3f7a3f'; X.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      const sx = pr.x - w / 2 + 10 + i * ((w - 20) / 5);
      const sway = Math.sin(((typeof S !== 'undefined' && S ? S.t : 0)) * 2 + i) * 1.6;
      X.beginPath(); X.moveTo(sx, pr.y + h / 2 - 8); X.lineTo(sx + sway, pr.y + h / 2 - 20); X.stroke();
      X.fillStyle = i % 2 ? '#5aa84a' : '#7ec850';
      X.fillRect(sx + sway - 2, pr.y + h / 2 - 22, 4, 4);
    }
    return true;
  }

  if (t === 'neon_light') {
    const w = pr.w || 90;
    const flick = 0.75 + 0.25 * Math.sin(((typeof S !== 'undefined' && S ? S.t : 0)) * 9 + pr.x * 0.05);
    const col = pr.col || '#00e5ff';
    X.save();
    X.globalCompositeOperation = 'lighter';
    X.globalAlpha = 0.35 * flick;
    X.fillStyle = col;
    X.fillRect(pr.x - w / 2 - 6, pr.y - 9, w + 12, 18);
    X.globalAlpha = 1;
    X.globalCompositeOperation = 'source-over';
    X.fillStyle = col;
    X.fillRect(pr.x - w / 2, pr.y - 2, w, 4);
    X.fillStyle = 'rgba(255,255,255,' + (0.6 * flick) + ')';
    X.fillRect(pr.x - w / 2, pr.y - 1, w, 2);
    X.restore();
    return true;
  }

  if (t === 'grow_light') {
    const w = pr.w || 80;
    X.save();
    X.globalCompositeOperation = 'lighter';
    const gc = (typeof cachedRadialGradient === 'function')
      ? cachedRadialGradient('grow' + pr.x + ',' + pr.y, pr.x, pr.y + 8, 6, 90,
          [[0, 'rgba(190,255,120,0.30)'], [1, 'rgba(190,255,120,0)']])
      : 'rgba(190,255,120,0.12)';
    X.fillStyle = gc;
    X.beginPath(); X.arc(pr.x, pr.y + 8, 90, 0, 6.28); X.fill();
    X.restore();
    X.fillStyle = '#374151';
    X.beginPath(); X.roundRect(pr.x - w / 2, pr.y - 8, w, 10, 3); X.fill();
    X.fillStyle = '#d9f99d';
    X.beginPath(); X.roundRect(pr.x - w / 2 + 6, pr.y - 6, w - 12, 5, 2); X.fill();
    X.strokeStyle = '#1f2937'; X.lineWidth = 2;
    X.beginPath(); X.moveTo(pr.x, pr.y - 8); X.lineTo(pr.x, pr.y - 22); X.stroke();
    return true;
  }

  return false;
}

/* Ground texture: deterministic hairline cracks and stains plus loose pixel
   debris, painted under the entity band and culled to the camera rect. Cheap
   because it is a fixed lattice with a per-cell hash, so nothing is stored. */
function drawMapGroundDetail(cx, cy, W, H, mapDef) {
  const tile = 220;
  const x0 = Math.max(0, Math.floor((cx - 40) / tile) * tile);
  const y0 = Math.max(0, Math.floor((cy - 40) / tile) * tile);
  const x1 = Math.min(WS, cx + W + 40);
  const y1 = Math.min(WS, cy + H + 40);
  const crack = mapDef.crack || 'rgba(0,0,0,0.22)';
  const stain = mapDef.stain || 'rgba(0,0,0,0.10)';
  for (let gy = y0; gy < y1; gy += tile) {
    for (let gx = x0; gx < x1; gx += tile) {
      const h1 = propRand(gx, gy, 1), h2 = propRand(gx, gy, 2), h3 = propRand(gx, gy, 3);
      if (h1 < 0.72) {
        X.fillStyle = stain;
        const sx = gx + h2 * tile, sy = gy + h3 * tile, sr = 18 + h1 * 40;
        X.beginPath(); X.ellipse(sx, sy, sr, sr * 0.6, 0, 0, 6.28); X.fill();
      }
      if (h2 < 0.6) {
        X.strokeStyle = crack; X.lineWidth = 1.4;
        const sx = gx + h3 * tile, sy = gy + h1 * tile;
        X.beginPath();
        X.moveTo(sx, sy);
        let px = sx, py = sy;
        for (let s = 0; s < 4; s++) {
          px += (propRand(px | 0, py | 0, s + 5) - 0.5) * 60;
          py += (propRand(px | 0, py | 0, s + 11) - 0.5) * 60;
          X.lineTo(px, py);
        }
        X.stroke();
      }
      if (h3 < 0.35) {
        X.fillStyle = mapDef.debris || 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 3; i++) {
          const bx = gx + propRand(gx, gy, i + 20) * tile;
          const by = gy + propRand(gx, gy, i + 30) * tile;
          propPixelRect(bx, by, 3, 3, X.fillStyle);
        }
      }
    }
  }
}
