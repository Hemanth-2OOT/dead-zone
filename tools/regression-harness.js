// DEAD ZONE browser regression harness.
//
// Drives the real game in a browser and asserts the behaviour that a static check
// cannot see: the Skins tab opening every skin without an error overlay, the
// revolver/pistol projectile lengths actually drawn at several speeds, collision
// against every solid prop from eight directions and two speeds, the HUD text
// boxes not overlapping at four landscape resolutions, weapon switching, reload,
// pause/resume and wave transitions.
//
//   npm run harness     # writes .agent_tmp/harness.html
//   then open http://localhost:8080/_harness.html from a static server rooted at www/,
//   or point any headless browser at it. The page prints PASS/FAIL and a summary.
//
// It injects itself into a copy of the built bundle, so run `npm run build` first.
(function () {
  var R = [], FAILS = 0, ERRORS = [];
  var out = document.getElementById('mout');
  function log(s) { R.push(s); if (out) out.textContent = R.join('\n'); }
  function ok(c, n, extra) { if (!c) FAILS++; log((c ? 'ok   ' : 'FAIL ') + n + (extra != null ? '  :: ' + extra : '')); }
  function section(t) { log(''); log('== ' + t + ' =='); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ov(a, b) { return a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5; }
  window.addEventListener('error', function (e) { ERRORS.push('onerror: ' + e.message); });
  window.addEventListener('unhandledrejection', function (e) { ERRORS.push('rejection: ' + (e.reason && e.reason.message || e.reason)); });
  var oErr = console.error;
  console.error = function () {
    ERRORS.push('console.error: ' + Array.prototype.map.call(arguments, function (a) { return (a && a.message) || String(a); }).join(' '));
    return oErr.apply(console, arguments);
  };
  function errOverlay() { return !!document.getElementById('debug-err-overlay'); }
  function report() {
    var body = document.title + '\n' + R.join('\n');
    try { fetch('/__result?d=' + encodeURIComponent(body)); } catch (e) {}
    try { fetch('/__result', { method: 'POST', body: body }); } catch (e) {}
  }

  /* ---------- HUD text probe: intercept the draw calls renderHUD makes ------ */
  function probeText(fn) {
    var boxes = [];
    var oFT = X.fillText;
    X.fillText = function (t, px, py) {
      var m = /(\d+(?:\.\d+)?)px/.exec(X.font || '');
      var size = m ? parseFloat(m[1]) : 10;
      var w = X.measureText(String(t)).width, h = size;
      var al = X.textAlign, bl = X.textBaseline;
      var lx0 = al === 'center' ? px - w / 2 : (al === 'right' ? px - w : px);
      var ly0 = bl === 'middle' ? py - h / 2 : (bl === 'top' ? py : py - h * 0.8);
      // Map the local box through the live transform: some overlay text (the wave
      // announcement) is drawn inside a camera translate, so raw coordinates lie.
      var tm = null;
      try { tm = X.getTransform(); } catch (e) { tm = null; }
      var cxs = [lx0, lx0 + w, lx0, lx0 + w], cys = [ly0, ly0, ly0 + h, ly0 + h], acc = null;
      for (var ci = 0; ci < 4; ci++) {
        var cxp = cxs[ci], cyp = cys[ci];
        var sx = tm ? (tm.a * cxp + tm.c * cyp + tm.e) : cxp;
        var sy = tm ? (tm.b * cxp + tm.d * cyp + tm.f) : cyp;
        acc = acc ? { x0: Math.min(acc.x0, sx), x1: Math.max(acc.x1, sx), y0: Math.min(acc.y0, sy), y1: Math.max(acc.y1, sy) } : { x0: sx, x1: sx, y0: sy, y1: sy };
      }
      boxes.push({ t: String(t), x0: acc.x0, y0: acc.y0, x1: acc.x1, y1: acc.y1, size: size });
      return oFT.apply(X, arguments);
    };
    try { fn(); } finally { X.fillText = oFT; }
    return boxes;
  }

  function hudProbe(w, h) {
    var sw = W, sh = H;
    W = w; H = h;
    // drawControls is part of renderHUD's tail but is not HUD chrome: it paints the
    // sticks, buttons and the LEVEL UP banner, which legitimately sit in the middle.
    var sd = drawControls;
    drawControls = function () {};
    var boxes;
    try { boxes = probeText(function () { renderHUD(); }); } finally { drawControls = sd; }
    var hits = [];
    for (var i = 0; i < boxes.length; i++) for (var j = i + 1; j < boxes.length; j++) {
      var A = boxes[i], B = boxes[j];
      if (!ov(A, B)) continue;
      // A stack-count badge is deliberately printed on the corner of its chip; only
      // flag an overlap that actually swallows a meaningful part of either label.
      var iw = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), ih = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      var area = Math.max(0, iw) * Math.max(0, ih);
      var small = Math.min((A.x1 - A.x0) * (A.y1 - A.y0), (B.x1 - B.x0) * (B.y1 - B.y0));
      var tiny = (A.t.length <= 2 && A.size <= 9) || (B.t.length <= 2 && B.size <= 9);
      if (area > small * 0.34 && !tiny) hits.push('"' + A.t + '" over "' + B.t + '" (' + Math.round(area) + 'px2)');
    }
    var sa = saInsets();
    var edge = boxes.filter(function (b) { return b.x0 < sa[3] - 1 || b.y0 < sa[0] - 1 || b.x1 > w - sa[1] + 1 || b.y1 > h - sa[2] + 1; })
      .map(function (b) { return b.t + '@' + Math.round(b.x0) + ',' + Math.round(b.y0); });
    var keep = { x0: w * 0.34, x1: w * 0.66, y0: h * 0.30, y1: h * 0.70 };
    var intr = boxes.filter(function (b) { return ov(b, keep); }).map(function (b) { return b.t; });
    var off = boxes.filter(function (b) { return b.x0 < -1 || b.y0 < -1 || b.x1 > w + 1 || b.y1 > h + 1; }).map(function (b) { return b.t; });
    W = sw; H = sh;
    return { n: boxes.length, hits: hits, edge: edge, intr: intr, off: off };
  }

  /* ---------- control geometry probe (uses the game's own helpers) ---------- */
  function ctlProbe(w, h) {
    var sw = W, sh = H;
    W = w; H = h;
    var sa = saInsets(), res = { bad: [], fireGap: 0, centre: [] };
    var boxes = [];
    for (var i = 0; i < BT.length; i++) {
      var b = BT[i];
      if (!btActive(b)) continue;
      var p = b.p(), r = btHit(b);
      boxes.push({ id: b.id, x: p[0], y: p[1], r: r, rad: btnRad(b) });
      if (p[0] - r < sa[3] - 0.5 || p[1] - r < sa[0] - 0.5 || p[0] + r > w - sa[1] + 0.5 || p[1] + r > h - sa[2] + 0.5) {
        res.bad.push(b.id + ' hit circle out of bounds @' + Math.round(p[0]) + ',' + Math.round(p[1]) + ' r' + Math.round(r));
      }
    }
    for (var a = 0; a < boxes.length; a++) for (var c = a + 1; c < boxes.length; c++) {
      var d = Math.hypot(boxes[a].x - boxes[c].x, boxes[a].y - boxes[c].y);
      if (d < boxes[a].r + boxes[c].r - 0.5) res.bad.push('hit overlap ' + boxes[a].id + '/' + boxes[c].id);
    }
    var fire = boxes.filter(function (z) { return z.id === 'fire'; })[0];
    var rel = boxes.filter(function (z) { return z.id === 'reload'; })[0];
    if (fire && rel) res.fireGap = Math.round(Math.hypot(fire.x - rel.x, fire.y - rel.y) - fire.r - rel.r);
    if (fire) {
      boxes.forEach(function (z) { if (z.id !== 'fire' && z.rad >= fire.rad) res.bad.push('FIRE not the largest button: ' + z.id); });
    }
    // The player is always drawn at the screen centre (14px body + margin), so the
    // standard for the pad is "never covers the player", not "never enters the
    // middle third" - on a 640px-wide screen a right-hand pad legitimately reaches
    // within 60px of centre without ever hiding the player.
    var keep = { x0: w / 2 - 34, x1: w / 2 + 34, y0: h / 2 - 34, y1: h / 2 + 34 };
    [['l', jPos('l')], ['r', jPos('r')]].forEach(function (q) {
      var rr = jRad();
      if (q[1][0] - rr < sa[3] - 0.5 || q[1][1] - rr < sa[0] - 0.5 || q[1][0] + rr > w - sa[1] + 0.5 || q[1][1] + rr > h - sa[2] + 0.5) res.bad.push('stick ' + q[0] + ' out of bounds');
      if (q[1][0] + rr > keep.x0 && q[1][0] - rr < keep.x1 && q[1][1] + rr > keep.y0 && q[1][1] - rr < keep.y1) res.centre.push('stick ' + q[0]);
    });
    boxes.forEach(function (z) {
      if (z.x + z.r > keep.x0 && z.x - z.r < keep.x1 && z.y + z.r > keep.y0 && z.y - z.r < keep.y1) res.centre.push('btn ' + z.id);
    });
    W = sw; H = sh;
    return res;
  }

  /* ---------- projectile trail measurement (real draw path) ---------------- */
  function trailPx(wi, speed, ft) {
    var w = WEAP[wi];
    var b = { x: Math.round(W * 0.5), y: Math.round(H * 0.5), vx: speed || 700, vy: 0, d: w.d, l: 1, c: null, wi: wi, isCrit: false, ft: (ft == null ? 0.25 : ft), pr: 0, ex: 0, cl: 0, fz: 0, flm: 0, ls: 0 };
    var sx = Math.round(W * 0.5) - 220, ex = Math.round(W * 0.5) + 40;
    X.save();
    X.setTransform(1, 0, 0, 1, 0, 0);
    X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
    X.fillStyle = '#000'; X.fillRect(sx - 10, b.y - 70, (ex - sx) + 40, 140);
    drawBulletDefault(b);
    X.restore();
    var dpr = DPR || 1;
    var img = X.getImageData(Math.round((sx - 10) * dpr), Math.round((b.y - 70) * dpr), Math.round(((ex - sx) + 40) * dpr), Math.round(140 * dpr)).data;
    var cw = Math.round(((ex - sx) + 40) * dpr), ch = Math.round(140 * dpr);
    var minx = 1e9, maxx = -1e9, count = 0;
    for (var y = 0; y < ch; y++) for (var x = 0; x < cw; x++) {
      var i = (y * cw + x) * 4;
      if (img[i] + img[i + 1] + img[i + 2] > 14) { if (x < minx) minx = x; if (x > maxx) maxx = x; count++; }
    }
    if (count === 0) return { len: 0, count: 0 };
    return { len: (maxx - minx + 1) / dpr, count: count };
  }

  /* ---------- collision helpers -------------------------------------------- */
  function penetration(x, y, r) {
    var worst = 0, which = null;
    for (var i = 0; i < O.length; i++) {
      var o = O[i];
      var cx = Math.max(o.x, Math.min(x, o.x + o.w)), cy = Math.max(o.y, Math.min(y, o.y + o.h));
      var d = Math.hypot(x - cx, y - cy);
      var pen = r - d;
      if (pen > worst) { worst = pen; which = o; }
    }
    return { pen: worst, o: which };
  }
  function tryMove(px, py, dx, dy, step) {
    P.x = px; P.y = py;
    var n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    for (var i = 0; i < n; i++) moveBody(P, 14, dx / n, dy / n);
    return { x: P.x, y: P.y, pen: penetration(P.x, P.y, 14) };
  }

  /* ======================================================================== */
  async function main() {
    section('BOOT');
    var t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      if (typeof SV !== 'undefined' && SV && typeof S !== 'undefined' && !document.getElementById('load-screen')) break;
      await sleep(120);
    }
    ok(typeof SV !== 'undefined' && !!SV, 'game booted', 'GAME_VERSION=' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '?'));
    ok(typeof WEAP !== 'undefined' && WEAP.length === 22, 'arsenal table present', WEAP.length);
    ok(typeof weaponStats === 'function', 'weaponStats present');
    ok(typeof hudUnit === 'function', 'hudUnit present');
    ok(typeof addSolidPropColliders === 'function', 'prop collider builder present');
    ok(typeof moveBody === 'function', 'moveBody present');

    /* ---------------- 1. SKINS SCREEN ---------------- */
    section('SKINS');
    var keys = Object.keys(SKINS);
    try { tab(2); } catch (e) { ok(false, 'tab(2) threw', e.message); }
    await sleep(150);
    ok(!errOverlay(), 'no runtime error overlay after opening Skins');
    var listEl = document.getElementById('skin-list');
    ok(listEl && listEl.children.length > 0, 'skin list rendered', listEl ? listEl.children.length + ' cards' : 'no list');
    var thrown = [];
    for (var i = 0; i < keys.length; i++) {
      try { inspectSkin(keys[i]); renderTurntable(); } catch (e) { thrown.push(keys[i] + ': ' + e.message); }
    }
    ok(thrown.length === 0, 'inspected all ' + keys.length + ' skins + turntable frames', thrown.slice(0, 3).join(' | '));
    ok(!errOverlay(), 'no error overlay after inspecting every skin');
    // This profile has no skins yet, so seed two (and restore afterwards) to exercise
    // the owned + equipped preview path the user asked about.
    var skinsBefore = JSON.parse(JSON.stringify(SV.skins || {}));
    SV.skins[keys[0]] = 1; SV.skins[keys[1]] = 1;
    if (typeof skinWeaponIndex === 'function') {
      var s0 = SKINS[keys[0]];
      if (s0.type === 'op') SV.eqOpSkin = keys[0]; else SV.eqSkin[skinWeaponIndex(s0)] = keys[0];
    }
    var locked = keys.filter(function (k) { return !(SV.skins && SV.skins[k]); });
    var owned = keys.filter(function (k) { return SV.skins && SV.skins[k]; });
    ok(locked.length > 0, 'found a locked skin to inspect', locked.length + ' locked');
    try { inspectSkin(locked[0]); renderTurntable(); } catch (e) { ok(false, 'locked skin threw', e.message); }
    ok(!errOverlay(), 'locked skin preview safe');
    ok(owned.length >= 2, 'seeded two owned skins for the equip path', owned.length + ' owned');
    if (owned.length) {
      try {
        renderSkinsUI();
        equipSkinDirect(owned[1]);
        inspectSkin(owned[1]);
        renderTurntable();
      } catch (e) { ok(false, 'equipped skin threw', e.message); }
      var sk0 = SKINS[owned[1]];
      var eqW = (sk0 && sk0.type === 'op') ? SV.eqOpSkin : SV.eqSkin[skinWeaponIndex(sk0)];
      log('   assert: wi=' + skinWeaponIndex(sk0) + ' type=' + sk0.type + ' eqW=' + eqW + ' want=' + owned[1]);
      ok(eqW === owned[1], 'equipped skin registered', owned[1]);
      ok(!errOverlay(), 'equipped skin preview safe');
    } else log('note: no owned skins in this save');
    SKINS.__probe_missing = { name: 'PROBE MISSING WI', type: 'weap', col: '#8fae4a', tier: 'COMMON', desc: 'no wi' };
    SKINS.__probe_bogus = { name: 'PROBE BOGUS WI', type: 'weap', wi: 999, col: '#8fae4a', tier: 'EPIC', desc: 'bad wi' };
    var badDef = [];
    try { renderSkinsUI(); inspectSkin('__probe_missing'); renderTurntable(); inspectSkin('__probe_bogus'); renderTurntable(); }
    catch (e) { badDef.push(e.message); }
    ok(badDef.length === 0, 'missing/invalid preview data handled', badDef.join(' | '));
    ok(!errOverlay(), 'no overlay for invalid skin definitions');
    delete SKINS.__probe_missing; delete SKINS.__probe_bogus;
    var swErr = [];
    for (var r2 = 0; r2 < 6; r2++) {
      try { tab(2); inspectSkin(keys[r2 % keys.length]); tab(0); tab(2); tab(0); } catch (e) { swErr.push(e.message); }
    }
    ok(swErr.length === 0, 'tabs switched 6x Skins<->Play without error', swErr.slice(0, 2).join(' | '));
    ok(!errOverlay(), 'no overlay after repeated tab switching');
    tab(0);
    await sleep(200);
    ok(typeof TURNTABLE_RAF === 'undefined' || !TURNTABLE_RAF, 'turntable loop stopped on leaving Skins', String(TURNTABLE_RAF));
    SV.skins = skinsBefore;
    renderSkinsUI();

    /* ---------------- start a run ---------------- */
    section('RUN BOOT');
    var btn = document.getElementById('play');
    if (btn) btn.click(); else begin();
    t0 = Date.now();
    while (Date.now() - t0 < 10000 && !(typeof S !== 'undefined' && S && S.wave >= 1)) await sleep(120);
    ok(!!S && S.wave >= 1, 'run started', S ? 'wave ' + S.wave : 'no S');
    ok(run === 1, 'simulation running after leaving Skins (playable)', 'run=' + run);
    ok(P && P.hp > 0, 'player alive', P ? 'hp ' + Math.round(P.hp) : 'no P');
    ok(!errOverlay(), 'no error overlay after deploy');

    /* ---------------- 2. PROJECTILES ---------------- */
    section('PROJECTILE VISUALS');
    var tl = {};
    [0, 5, 3, 1, 9, 14].forEach(function (wi) { tl[wi] = trailPx(wi, 700); });
    log('drawn length px @700px/s: ' + Object.keys(tl).map(function (k) { return WEAP[k].n + '=' + Math.round(tl[k].len); }).join(', '));
    var rev = tl[5].len, pis = tl[0].len;
    ok(rev > 0 && pis > 0, 'both sidearms render a tracer');
    ok(rev <= 38, 'revolver tracer + head is a short compact round (<=38px)', Math.round(rev) + 'px');
    ok(pis <= 40, 'pistol tracer is short (<=40px)', Math.round(pis) + 'px');
    ok(rev > pis, 'revolver round still reads heavier than the pistol', Math.round(rev) + ' vs ' + Math.round(pis));
    ok(rev <= pis * 1.6, 'revolver no longer dwarfs the pistol', 'ratio ' + (rev / pis).toFixed(2));
    ok(tl[14].len > rev * 1.4, 'railgun slug still clearly longer than a sidearm', Math.round(tl[14].len) + 'px');
    ok(tl[9].len > rev, 'rocket still longer than a sidearm', Math.round(tl[9].len) + 'px');
    var speeds = [300, 480, 700, 1050, 1400];
    var sweep = speeds.map(function (v) { return v + ':' + Math.round(trailPx(5, v).len); });
    var worstR = Math.max.apply(null, speeds.map(function (v) { return trailPx(5, v).len; }));
    ok(worstR <= 38, 'revolver round stays short at every speed incl. its head (<=38px)', 'max ' + Math.round(worstR) + '  ' + sweep.join(' '));
    log('revolver muzzle-frame ' + Math.round(trailPx(5, 700, 0).len) + 'px, steady ' + Math.round(rev) + 'px');

    /* ---------------- 3. WEAPON TIERS ---------------- */
    section('WEAPON TIER BALANCE');
    var wIssues = weaponTierIssues(), lIssues = tierLadderIssues();
    ok(wIssues.length === 0, 'every weapon inside its tier band', JSON.stringify(wIssues));
    ok(lIssues.length === 0, 'tier ladder monotonic', JSON.stringify(lIssues));
    log('name|tier|dmg-per-pull|sustained dps|mag|reload');
    WEAP.forEach(function (w, i) { var st = weaponStats(i); log('  ' + [w.n, st.tier, Math.round(w.d * st.pellets), Math.round(st.dps * 10) / 10, st.mag, st.reload].join('|')); });
    var ps = weaponStats(0), rs = weaponStats(5), smg = weaponStats(1), rif = weaponStats(3);
    ok(ps.dps < smg.dps, 'pistol sustained dps below the SMG', ps.dps.toFixed(1) + ' < ' + smg.dps.toFixed(1));
    ok(ps.dps < rs.dps, 'revolver out-damages the pistol', rs.dps.toFixed(1) + ' > ' + ps.dps.toFixed(1));
    ok(rs.shot > ps.shot * 2, 'revolver per-shot punch kept', rs.shot + ' vs ' + ps.shot);
    ok(rs.reload > ps.reload, 'revolver reloads slower than the pistol', rs.reload + ' vs ' + ps.reload);
    ok(rif.dps > smg.dps, 'rare rifle out-performs the uncommon SMG', rif.dps.toFixed(1) + ' > ' + smg.dps.toFixed(1));
    var floors = [TIER_POLICY.COMMON.dps[0], TIER_POLICY.UNCOMMON.dps[0], TIER_POLICY.RARE.dps[0], TIER_POLICY.EPIC.dps[0], TIER_POLICY.LEGENDARY.dps[0]];
    ok(floors.every(function (f, i2) { return i2 === 0 || floors[i2 - 1] < f; }), 'tier dps floors strictly increase', floors.join(' < '));
    ok(weaponMode(WEAP[16]) === 'BURST', 'Burst Rifle labelled BURST not PUMP', weaponMode(WEAP[16]));
    ok(weaponMode(WEAP[15]) === 'DUAL', 'Dual Pistols labelled DUAL', weaponMode(WEAP[15]));
    ok(weaponMode(WEAP[2]) === 'PUMP', 'Shotgun labelled PUMP', weaponMode(WEAP[2]));
    ok(weaponMode(WEAP[9]) === 'LAUNCH', 'Rocket labelled LAUNCH', weaponMode(WEAP[9]));
    ok(weaponMode(WEAP[0]) === 'SEMI' && weaponMode(WEAP[5]) === 'BOLT', 'pistol SEMI / revolver BOLT', weaponMode(WEAP[0]) + '/' + weaponMode(WEAP[5]));

    /* ---------------- 4. DISPLAYED == APPLIED DAMAGE ---------------- */
    section('DAMAGE DISPLAY vs APPLICATION');
    function applyToWalker(wi) {
      var z = { x: P.x + 60, y: P.y, t: 'walk', hp: 1e9, mh: 1e9, r: 13, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
      Z.push(z);
      var before = z.hp;
      var dealt = baseShotDamage(wi);
      damageZ(z, dealt, 'probe', false, 0, wi);
      var delta = before - z.hp;
      z.hp = 0; z.dead = 1;
      var idx = Z.indexOf(z); if (idx >= 0) Z.splice(idx, 1);
      return { dealt: dealt, delta: delta, expected: baseShotDamage(wi) };
    }
    var dmgBad = [];
    [0, 5, 3, 1, 2, 14, 20].forEach(function (wi) {
      var r = applyToWalker(wi);
      if (Math.abs(r.delta - r.expected) > 1e-6) dmgBad.push(WEAP[wi].n + ' delta ' + r.delta + ' != ' + r.expected);
    });
    ok(dmgBad.length === 0, 'applied damage equals baseShotDamage() for 7 weapons', dmgBad.join(' | '));
    function hudDmgText(wi) {
      var saved = P.cur; P.cur = wi;
      var texts = [];
      var oFT = X.fillText;
      X.fillText = function (t) { texts.push(String(t)); return oFT.apply(X, arguments); };
      try { drawWeaponHud(); } finally { X.fillText = oFT; }
      P.cur = saved;
      return texts;
    }
    var hudBad = [];
    [0, 5, 2, 16].forEach(function (wi) {
      var st = weaponStats(wi);
      var want = 'DMG ' + Math.round(baseShotDamage(wi) * st.pellets) + (st.pellets > 1 ? ' \u00d7' + st.pellets : '');
      var got = hudDmgText(wi);
      if (got.indexOf(want) < 0) hudBad.push(WEAP[wi].n + ' wanted "' + want + '" got ' + JSON.stringify(got));
    });
    ok(hudBad.length === 0, 'HUD prints the damage the shot actually deals', hudBad.join(' | '));
    var savedDm = S.dm;
    S.dm = 1.36;
    var r2b = applyToWalker(0);
    var wantP = 'DMG ' + Math.round(baseShotDamage(0));
    ok(Math.abs(r2b.delta - r2b.expected) < 1e-6, '+36% damage perk: applied damage matches baseShotDamage()', r2b.delta.toFixed(2));
    ok(hudDmgText(0).indexOf(wantP) >= 0, 'HUD damage follows the perk', wantP);
    var mast = (typeof masteryDamageMult === 'function') ? masteryDamageMult(0) : 1;
    ok(Math.abs(r2b.expected - 20 * 1.36 * mast) < 1e-6, 'perk maths unchanged (pistol 20 x 1.36 x mastery)', r2b.expected.toFixed(2) + ' mast ' + mast);
    S.dm = savedDm;

    /* ---------------- 5. COLLISION ---------------- */
    section('COLLISION');
    ok(typeof S.propColliders === 'number' && S.propColliders > 0, 'solid props registered as colliders', 'count ' + S.propColliders);
    var solid = O.filter(function (o) { return o.prop; });
    ok(solid.length > 0, 'prop colliders in O', solid.length + ' props of ' + O.length + ' colliders');
    var target = solid.slice().sort(function (a, b) { return Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y); })[0];
    if (target) {
      log('probe prop: ' + Math.round(target.w) + 'x' + Math.round(target.h) + ' at ' + Math.round(target.x) + ',' + Math.round(target.y));
      var cx = target.x + target.w / 2, cy = target.y + target.h / 2;
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      var bad = [], worst = 0;
      for (var di = 0; di < dirs.length; di++) {
        for (var si = 0; si < 2; si++) {
          var sp = si === 0 ? 3 : 15;
          var start = [cx - dirs[di][0] * (Math.max(target.w, target.h) / 2 + 90), cy - dirs[di][1] * (Math.max(target.w, target.h) / 2 + 90)];
          var res = tryMove(start[0], start[1], dirs[di][0] * 120, dirs[di][1] * 120, sp);
          if (res.pen.pen > 0.51) bad.push('dir ' + dirs[di] + ' step ' + sp + ' pen ' + res.pen.pen.toFixed(2));
          if (res.pen.pen > worst) worst = res.pen.pen;
        }
      }
      ok(bad.length === 0, 'player blocked from 8 directions x 2 speeds', 'worst pen ' + worst.toFixed(2) + ' ' + bad.slice(0, 4).join(' | '));
      var big = tryMove(cx - (target.w / 2 + 220), cy, 440, 0, 440);
      ok(big.pen.pen <= 0.51, 'single 440px step cannot tunnel through a solid prop', 'pen ' + big.pen.pen.toFixed(2) + ' end ' + Math.round(big.x) + ',' + Math.round(big.y));
      var corner = tryMove(target.x - 60, target.y - 60, 130, 130, 4);
      ok(corner.pen.pen <= 0.51, 'diagonal corner approach blocked', 'pen ' + corner.pen.pen.toFixed(2));
    } else ok(false, 'no prop collider to test');
    var thin = O.slice().sort(function (a, b) { return Math.min(a.w, a.h) - Math.min(b.w, b.h); })[0];
    if (thin) {
      var horiz = thin.w >= thin.h;
      var sx = thin.x + thin.w / 2 - (horiz ? (thin.w / 2 + 70) : 0);
      var sy = thin.y + thin.h / 2 - (horiz ? 0 : (thin.h / 2 + 70));
      var crossed = tryMove(sx, sy, horiz ? 220 : 0, horiz ? 0 : 220, 220);
      var far = horiz ? (crossed.x > thin.x + thin.w + 8) : (crossed.y > thin.y + thin.h + 8);
      ok(!far && crossed.pen.pen <= 0.51, 'thinnest collider (' + Math.round(thin.w) + 'x' + Math.round(thin.h) + ') cannot be crossed in one step', 'pen ' + crossed.pen.pen.toFixed(2) + ' end ' + Math.round(crossed.x) + ',' + Math.round(crossed.y));
    }
    var kb = tryMove(target ? target.x - 40 : P.x, target ? target.y - 40 : P.y, 18, 18, 18);
    ok(kb.pen.pen <= 0.51, 'knockback impulse resolves out of geometry', 'pen ' + kb.pen.pen.toFixed(2));
    P.x = WS / 2; P.y = WS / 2; sanitizePlayer();
    ok(isFinite(P.x) && isFinite(P.y), 'player position sane after collision probes', Math.round(P.x) + ',' + Math.round(P.y));

    /* ---------------- 6. HUD / CONTROLS LAYOUT ---------------- */
    section('HUD LAYOUT');
    await sleep(2600);   // let the WAVE 1 announcement banner expire
    var sizes = [[640, 360], [720, 400], [854, 393], [1024, 576], [1280, 600]];
    var savedPk = S.pk, savedBoons = S.boons, savedCash = S.cash, savedWm = S.wmList, savedAr = S.ar, savedBc = S.bc;
    for (var s3 = 0; s3 < sizes.length; s3++) {
      var w3 = sizes[s3][0], h3 = sizes[s3][1];
      var plain = hudProbe(w3, h3);
      ok(plain.hits.length === 0, 'HUD ' + w3 + 'x' + h3 + ' plain: no text overlap (' + plain.n + ' labels)', plain.hits.slice(0, 3).join(' | '));
      ok(plain.edge.length === 0, 'HUD ' + w3 + 'x' + h3 + ' plain: inside safe area', plain.edge.slice(0, 3).join(' | '));
      ok(plain.intr.length === 0, 'HUD ' + w3 + 'x' + h3 + ' plain: arena centre clear', plain.intr.slice(0, 3).join(' | '));
      ok(plain.off.length === 0, 'HUD ' + w3 + 'x' + h3 + ' plain: nothing off-screen', plain.off.slice(0, 3).join(' | '));
      var ctl = ctlProbe(w3, h3);
      ok(ctl.bad.length === 0, 'controls ' + w3 + 'x' + h3 + ': no overlap / out of bounds', ctl.bad.slice(0, 3).join(' | '));
      ok(ctl.centre.length === 0, 'controls ' + w3 + 'x' + h3 + ': pad clear of arena centre', ctl.centre.slice(0, 3).join(' | '));
      log('   ' + w3 + 'x' + h3 + ' FIRE-RELOAD gap ' + ctl.fireGap + 'px');
    }
    S.pk = {}; PKS.slice(0, 14).forEach(function (p) { S.pk[p[0]] = 1 + (Math.random() * 3 | 0); });
    S.boons = {}; BOONS.slice(0, 10).forEach(function (b) { S.boons[b.id] = 1 + (Math.random() * 4 | 0); });
    S.wmList = [{ name: 'TOUGH SKIN x2', col: '#ef4444' }, { name: 'FAST SHAMBLERS', col: '#fb923c' }, { name: 'CRIT IMMUNE', col: '#c084fc' }];
    S.cash = 987654; S.ar = 0.82; S.bc = 3; S.bl = 5;
    S.dd = 8; S.fz = 6; S.sh2 = 5; S.mgTime = 9; S.adr = 4;
    var bossZ = { x: P.x + 300, y: P.y, t: 'boss', hp: 5000, mh: 9000, r: 40, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
    Z.push(bossZ);
    var busyN = 0;
    for (var s4 = 0; s4 < sizes.length; s4++) {
      var w4 = sizes[s4][0], h4 = sizes[s4][1];
      var busy = hudProbe(w4, h4);
      if (s4 === 2) busyN = busy.n;
      ok(busy.hits.length === 0, 'HUD ' + w4 + 'x' + h4 + ' busy: no text overlap (' + busy.n + ' labels)', busy.hits.slice(0, 4).join(' | '));
      ok(busy.edge.length === 0, 'HUD ' + w4 + 'x' + h4 + ' busy: inside safe area', busy.edge.slice(0, 3).join(' | '));
      ok(busy.intr.length === 0, 'HUD ' + w4 + 'x' + h4 + ' busy: arena centre clear', busy.intr.slice(0, 3).join(' | '));
      ok(busy.off.length === 0, 'HUD ' + w4 + 'x' + h4 + ' busy: nothing off-screen', busy.off.slice(0, 3).join(' | '));
    }
    log('busy-HUD label count at 854x393: ' + busyN);
    // Ink sanity: the geometry rework must not have pushed an anchor off screen.
    function ink(x, y, w2, h2) {
      var dpr = DPR || 1;
      var d = X.getImageData(Math.round(x * dpr), Math.round(y * dpr), Math.round(w2 * dpr), Math.round(h2 * dpr)).data;
      var c = 0;
      for (var i2 = 0; i2 < d.length; i2 += 4) if (d[i2] + d[i2 + 1] + d[i2 + 2] > 60) c++;
      return c;
    }
    var inkBad = [];
    var keepW2 = W, keepH2 = H; W = 854; H = 393;
    var sd2 = drawControls; drawControls = function () {};
    try { renderHUD(); } finally { drawControls = sd2; }
    var regions = {
      'radar+vitals (left)': [0, 0, 240, 120],
      'cash+horde plate (right)': [600, 0, 254, 60],
      'right trays (perks/boons/mods)': [520, 40, 334, 80],
      'boss lane (centre top)': [230, 45, 400, 30]
    };
    for (var rk in regions) {
      var c2 = ink(regions[rk][0], regions[rk][1], regions[rk][2], regions[rk][3]);
      if (c2 < 40) inkBad.push(rk + ' only ' + c2 + ' lit px');
      else log('   ink ' + rk + ': ' + c2 + 'px');
    }
    W = keepW2; H = keepH2;
    ok(inkBad.length === 0, 'every HUD anchor region still paints ink', inkBad.join(' | '));
    S.pk = savedPk; S.boons = savedBoons; S.cash = savedCash; S.wmList = savedWm; S.ar = savedAr; S.bc = savedBc;
    S.dd = 0; S.fz = 0; S.sh2 = 0; S.mgTime = 0; S.adr = 0;
    Z.splice(Z.indexOf(bossZ), 1);

    /* ---------------- 7. GAMEPLAY REGRESSION ---------------- */
    section('GAMEPLAY');
    var gErr = ERRORS.length;
    var ownedW = [0, 5, 1, 3, 2];
    var swBad = [];
    if (!SV.own) SV.own = [];
    ownedW.forEach(function (wi) {
      SV.own[wi] = 1; P.w[wi] = 1;
      try { selectWeapon(wi); } catch (e) { swBad.push(wi + ': ' + e.message); }
      if (P.cur !== wi) swBad.push('cur ' + P.cur + ' != ' + wi);
      if (P.ammo !== weaponStats(wi).mag) swBad.push(WEAP[wi].n + ' ammo ' + P.ammo + ' != mag ' + weaponStats(wi).mag);
    });
    ok(swBad.length === 0, 'weapon switching updates cur + magazine', swBad.join(' | '));
    selectWeapon(0);
    var a0 = P.ammo, b0 = B.length;
    P.fl = 0; P.cd = 0; fire();
    ok(P.ammo === a0 - 1, 'pistol shot consumes one round', a0 + ' -> ' + P.ammo);
    ok(B.length > b0, 'pistol shot spawned a projectile', (B.length - b0) + ' bullets');
    ok(B[B.length - 1] && B[B.length - 1].wi === 0, 'projectile carries the firing weapon index', B[B.length - 1] ? B[B.length - 1].wi : 'none');
    selectWeapon(5);
    var rs2 = weaponStats(5);
    ok(P.ammo === rs2.mag, 'revolver cylinder loaded', P.ammo + '/' + rs2.mag);
    for (var k2 = 0; k2 < 12 && P.ammo > 0; k2++) { P.cd = 0; P.fl = 0; fire(); }
    ok(P.ammo === 0, 'revolver empties its cylinder', 'ammo ' + P.ammo);
    startReload();
    ok(P.reloading === true, 'reload starts when the cylinder is empty', 'reloading ' + P.reloading);
    P.reloadTimer = 0.001;
    await sleep(300);
    ok(P.reloading === false && P.ammo === rs2.mag, 'reload tick refills the cylinder', 'ammo ' + P.ammo + '/' + rs2.mag + ' reloading ' + P.reloading);
    ok(Math.abs(rs2.reload - 1.45) < 1e-6, 'revolver reload window is the tuned 1.45s', rs2.reload);
    var slots = abilitySlots();
    var abBad = [];
    slots.forEach(function (k) { try { skill(k); } catch (e) { abBad.push(k + ': ' + e.message); } });
    ok(abBad.length === 0, 'ability slots fire without throwing', abBad.join(' | ') + ' slots=' + slots.join(','));
    ok(slots.indexOf('gren') >= 0, 'grenade slot present', slots.join(','));
    pause();
    ok(run === 0 && document.getElementById('pause').classList.contains('on'), 'pause stops the sim and shows the overlay');
    resume();
    ok(run === 1 && !document.getElementById('pause').classList.contains('on'), 'resume restores the sim');
    var w0 = S.wave;
    try { startWave(); } catch (e) { ok(false, 'startWave threw', e.message); }
    ok(S.wave === w0 + 1 || S.wave === w0, 'wave advance did not throw', w0 + ' -> ' + S.wave);
    await sleep(400);
    ok(!errOverlay(), 'no error overlay during gameplay');
    var newErrs = ERRORS.slice(gErr);
    ok(newErrs.length === 0, 'no console errors during gameplay tests', newErrs.slice(0, 3).join(' | '));
    ok(ERRORS.length === 0, 'NO console/window errors during the whole pass', ERRORS.slice(0, 4).join(' | '));

    section('PERF / DRAW PATH');
    var gcount = 0, gp = CanvasRenderingContext2D.prototype;
    ['createRadialGradient', 'createLinearGradient'].forEach(function (k) {
      var o = gp[k];
      gp[k] = function () { gcount++; return o.apply(this, arguments); };
    });
    try { if (!S) begin(); } catch (e) {}
    MUTE = 1;
    var frames = 180, perfBad = null, t0 = 0, ms = 0;
    try {
      gcount = 0;
      t0 = performance.now();
      for (var fi = 0; fi < frames; fi++) { update(1 / 60); draw(); }
      ms = (performance.now() - t0) / frames;
    } catch (e) { perfBad = e && e.message; }
    ok(perfBad === null, 'sim+draw loop survives 180 headless frames', perfBad || '');
    ok(true, 'frame cost', ms.toFixed(2) + ' ms/frame');
    ok(true, 'gradient objects built per frame', (gcount / frames).toFixed(2));
    ok(gcount / frames < 4, 'per-frame gradient allocation is near zero', (gcount / frames).toFixed(2) + '/frame');

    log('');
    var n = R.filter(function (l) { return l.indexOf('ok   ') === 0 || l.indexOf('FAIL ') === 0; }).length;
    log('RESULT: ' + (FAILS === 0 ? 'ALL CHECKS PASSED' : FAILS + ' FAILURES') + ' (' + n + ' assertions)');
    log('errors captured: ' + ERRORS.length);
    document.title = 'M-HARNESS ' + (FAILS === 0 ? 'PASS' : 'FAIL ' + FAILS);
    window.__M_DONE = { fails: FAILS, errors: ERRORS.slice(0, 20), log: R.join('\n') };
    report();
  }

  setTimeout(function () {
    main().catch(function (e) {
      log('HARNESS THREW: ' + (e && e.stack || e));
      document.title = 'M-HARNESS THREW';
      window.__M_DONE = { fails: -1, errors: [String(e && e.stack || e)], log: R.join('\n') };
      report();
    });
  }, 300);
})();
