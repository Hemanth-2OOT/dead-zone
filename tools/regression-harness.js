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
    var sa = saInsets(), res = { bad: [], centre: [] };
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
    ok(typeof WEAP !== 'undefined' && WEAP.length === 24, 'arsenal table present', WEAP.length);
    ok(typeof weaponStats === 'function', 'weaponStats present');
    ok(typeof hudUnit === 'function', 'hudUnit present');
    ok(typeof addSolidPropColliders === 'function', 'prop collider builder present');
    ok(typeof moveBody === 'function', 'moveBody present');

    /* ---------------- 1. SKINS SCREEN ---------------- */
    section('SKINS');
    var keys = Object.keys(SKINS);
    try { tab(3); } catch (e) { ok(false, 'tab(3) threw', e.message); }
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
      try { tab(3); inspectSkin(keys[r2 % keys.length]); tab(0); tab(3); tab(0); } catch (e) { swErr.push(e.message); }
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

    /* ---------------- 5. BURN STATUS ---------------- */
    // The promise of the burn rework is that the fire on a zombie is the same
    // thing as the damage coming off it: same radius, same rate, same ticks, and
    // nothing on fire that is not really taking burn damage.
    section('BURN STATUS');
    function burnZombie(ax, ay) {
      var z = { x: (ax == null ? P.x + 40 : ax), y: (ay == null ? P.y : ay), t: 'walk', hp: 1e9, mh: 1e9, r: 13, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
      Z.push(z);
      return z;
    }
    function dropZ(z) { z.hp = 0; z.dead = 1; var i = Z.indexOf(z); if (i >= 0) Z.splice(i, 1); }
    function runPassive(seconds) {
      var n = Math.round(seconds * 60);
      var hps = P.hp;
      for (var f = 0; f < n; f++) { S.t = (S.t || 0) + 1 / 60; P.hp = hps; updatePassives(1 / 60); }
    }
    var savedFi = S.fi, savedHp = P.hp;
    P.hp = P.mx;

    // Immolation's radius is the radius it draws (88 + 8 per stack).
    var insideZ = burnZombie(P.x + 90, P.y), outsideZ = burnZombie(P.x + 105, P.y);
    S.fi = 1;
    var inHp0 = insideZ.hp, outHp0 = outsideZ.hp;
    runPassive(2);
    var inLost = inHp0 - insideZ.hp, outLost = outHp0 - outsideZ.hp;
    ok(Math.abs(inLost - 40) <= 20 * 0.25 + 0.01, 'two seconds inside the Immolation ring costs ~40 hp', inLost.toFixed(2) + ' hp');
    ok(outLost === 0, 'a zombie just outside the drawn ring takes nothing', 'r=' + (88 + 8 * S.fi) + 'px, target at 105px');
    ok(insideZ.bn > 0 && insideZ.bnD === 20, 'and it is left burning, at the rate it is being burned', 'bn=' + insideZ.bn.toFixed(2) + 's dps=' + insideZ.bnD);
    ok(!(outsideZ.bn > 0), 'nothing outside the ring is on fire');

    // Leaving the ring: one last tick, then the flames go out.
    insideZ.x = P.x + 400;
    var hpAtExit = insideZ.hp;
    runPassive(0.35);
    var residual = hpAtExit - insideZ.hp;
    ok(residual <= 2 * 20 * 0.25 + 0.01, 'walking out of the ring owes at most two ticks', residual.toFixed(2) + ' hp (tick = 5)');
    ok(!(insideZ.bn > 0), 'and the burn is visibly over', 'bn=' + (insideZ.bn || 0));

    // The rate is capped and cannot be stacked by re-applying it.
    applyBurn(insideZ, 9999);
    ok(insideZ.bnD === 40, 'the burn rate is capped', 'dps=' + insideZ.bnD);
    insideZ.bnD = 0; insideZ.bn = 0;
    applyBurn(insideZ, 30);
    applyBurn(insideZ, 5);
    ok(insideZ.bnD === 30, 'a weaker source cannot weaken a stronger burn', 'dps=' + insideZ.bnD);
    // Re-applying refreshes the clock, it does not add a tick per application:
    // twenty applies inside one duration pay one tick, not twenty.
    for (var rep = 0; rep < 20; rep++) applyBurn(insideZ, 30);
    var repHp0 = insideZ.hp;
    runPassive(0.35);
    var repLost = repHp0 - insideZ.hp;
    ok(repLost > 0 && repLost <= 15.01, 're-applying refreshes the burn instead of stacking ticks',
      repLost.toFixed(2) + ' hp in 0.35s (1-2 ticks of 7.5; a stacked burn would pay 150)');
    // Held on a target continuously (what the aura does), it pays its full rate.
    var holdZ = burnZombie(P.x + 400, P.y);
    applyBurn(holdZ, 30);
    var holdHp0 = holdZ.hp;
    var holdFrames = 60, hpKeep = P.hp;
    for (var hf = 0; hf < holdFrames; hf++) { S.t = (S.t || 0) + 1 / 60; P.hp = hpKeep; applyBurn(holdZ, 30); updatePassives(1 / 60); }
    var holdLost = holdHp0 - holdZ.hp;
    ok(Math.abs(holdLost - 30) <= 7.51, 'a held burn pays 30 hp per second', holdLost.toFixed(2) + ' hp in 1s');
    dropZ(holdZ);
    dropZ(insideZ); dropZ(outsideZ);
    S.fi = savedFi; P.hp = savedHp;

    /* ---------------- 6. GROUNDING ---------------- */
    section('GROUNDING');
    // An explosion must leave a mark on the floor, and the mark must be the size
    // of the blast: the scorch decal is derived from the same radius the damage
    // loop uses, so it cannot claim more ground than the grenade actually covered.
    // Counted by type, not by index: the decal pool is capped and trims its oldest
    // entries, so an index captured before the blast can shift out from under it.
    function scorchAt(x, y) {
      var best = null, bestD = 1e9;
      // Newest first: a later blast lands on the same ground as an earlier one,
      // and the fresh mark is the one being asserted about.
      for (var di = DEC.length - 1; di >= 0; di--) {
        var d = DEC[di];
        if (d.type !== 'scorch') continue;
        var dd = Math.hypot(d.x - x, d.y - y);
        if (dd < bestD) { bestD = dd; best = d; }
      }
      return bestD < 30 ? best : null;
    }
    var scorchBefore = DEC.filter(function (d) { return d.type === 'scorch'; }).length;
    var bx = P.x + 200, by = P.y;
    boom(bx, by, 90, 0);
    var made = scorchAt(bx, by);
    var scorchAfter = DEC.filter(function (d) { return d.type === 'scorch'; }).length;
    ok(scorchAfter > scorchBefore && !!made, 'an explosion leaves a scorch on the ground', scorchAfter - scorchBefore + ' new scorch decals');
    // Proportionality, not the decal pool's internal stretch factor: the mark
    // scales with the blast and stays a fraction of it rather than covering ground
    // the explosion never touched.
    ok(made && made.r / 90 > 0.3 && made.r / 90 < 0.8, 'the scorch stays a fraction of the blast radius',
      made ? Math.round(made.r) + 'px for a 90px blast (' + Math.round(made.r / 90 * 100) + '%)' : 'none');
    boom(bx, by, 200, 0);
    var madeBig = scorchAt(bx, by);
    ok(madeBig && made && Math.abs(madeBig.r / made.r - 200 / 90) < 0.05, 'and it scales with the blast',
      (madeBig ? Math.round(madeBig.r) : 'none') + ' vs ' + (made ? Math.round(made.r) : 'none') + ' for 200 vs 90');
    // The decal budget still holds under a burst of explosions.
    for (var bi = 0; bi < 60; bi++) boom(P.x + 120 + (bi % 10) * 30, P.y + (bi % 7) * 30, 60, 0);
    var cap = getQualityProfile().maxDecals;
    ok(DEC.length <= cap + 30, 'a burst of blasts stays inside the decal budget', DEC.length + ' decals, budget ' + cap);

    // Footfall dust: it appears while the player walks, on the stride beat, and
    // never while standing still. Driven through the real update() with a held
    // movement key, so it tests the same path a player uses.
    function dustRun(frames, holdKey) {
      var seen = 0, hp0 = P.hp, savedK = K.d, x0 = P.x, y0 = P.y;
      P.dash = 0;
      F.length = 0;   // the particle cap is its own behaviour; start from a clean pool
      if (holdKey) K.d = 1; else K.d = 0;
      for (var f = 0; f < frames; f++) {
        var fb = F.length;
        S.t = (S.t || 0) + 1 / 60; P.hp = hp0;
        update(1 / 60);
        for (var fi = fb; fi < F.length; fi++) if (String(F[fi].c).indexOf('rgba(205,196,176') === 0) seen++;
      }
      K.d = savedK; P.hp = hp0;
      return { seen: seen, moved: Math.hypot(P.x - x0, P.y - y0) };
    }
    var walkedDust = dustRun(40, true);
    var stoodDust = dustRun(40, false);
    ok(walkedDust.moved > 5, 'the walk probe actually moved the player', Math.round(walkedDust.moved) + 'px in 40 frames');
    ok(walkedDust.seen > 0, 'walking kicks up footfall dust', walkedDust.seen + ' puffs in 40 frames');
    ok(stoodDust.seen === 0, 'standing still kicks up nothing', stoodDust.seen + ' puffs');

    /* ---------------- 7. COLLISION ---------------- */
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
      log('   ' + w3 + 'x' + h3 + ' pad buttons ' + ctl.n);
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

    /* ---------- shop + controls ---------- */
    section('SHOP');

    // A fresh profile at the default rank must not already own Dual Pistols.
    SV.lvl = 1;
    SV.own = WEAP.map(function (_, i) { return i === 0 ? 1 : 0; });
    if (typeof syncWeaponUnlocks === 'function') syncWeaponUnlocks();
    ok(SV.own[0] === 1, 'the starter Pistol is owned at rank 1');
    ok(SV.own[15] === 0, 'Dual Pistols is NOT owned at rank 1', 'own[15]=' + SV.own[15]);
    var free = SV.own.filter(function (v) { return v; }).length;
    ok(free === 1, 'exactly one weapon is owned on a fresh profile', free + ' owned');

    SV.cr = 0;
    tab(2);
    var psh = document.getElementById('psh');
    ok(!!psh && psh.classList.contains('on'), 'the SHOP tab opens its panel');
    var list = document.getElementById('shop-list');
    var cards = list ? Array.prototype.slice.call(list.children) : [];
    ok(cards.length === WEAP.length, 'every weapon is listed', cards.length + ' cards / ' + WEAP.length + ' weapons');

    // Read the tier badge and price straight out of the rendered cards, so this
    // checks what the player sees rather than the comparator the renderer used.
    var TIER_ORDER = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4 };
    var rendered = cards.map(function (c) {
      var badge = c.querySelector('span');
      var tier = badge ? badge.textContent.trim() : '';
      var buy = c.querySelector('button[data-buy]');
      var eq = c.querySelector('button[data-eq]');
      var nameEl = c.querySelector('b');
      return {
        tier: tier,
        name: nameEl ? nameEl.textContent.trim() : '',
        price: buy ? parseInt(buy.textContent.replace(/[^0-9]/g, ''), 10) : null,
        owned: !!eq
      };
    });
    var tierBad = [];
    for (var ti = 1; ti < rendered.length; ti++) {
      var a = TIER_ORDER[rendered[ti - 1].tier], b = TIER_ORDER[rendered[ti].tier];
      if (a == null || b == null || b < a) tierBad.push(rendered[ti - 1].tier + ' then ' + rendered[ti].tier);
    }
    ok(tierBad.length === 0, 'the rendered list runs low tier to high tier', tierBad.slice(0, 3).join(' | ') || rendered.map(function (r) { return r.tier; }).join(' > '));
    var priceBad = [];
    for (var pi = 1; pi < rendered.length; pi++) {
      var pa = rendered[pi - 1], pb = rendered[pi];
      if (pa.tier !== pb.tier || pa.price == null || pb.price == null) continue;
      if (pb.price < pa.price) priceBad.push(pa.name + ' ' + pa.price + ' then ' + pb.name + ' ' + pb.price);
    }
    ok(priceBad.length === 0, 'price rises within a tier in the rendered list', priceBad.slice(0, 3).join(' | '));
    var expected = WEAP.map(function (w, i) { return { w: w, i: i }; }).sort(function (x, y) {
      var tx = TIER_ORDER[x.w.tier], ty = TIER_ORDER[y.w.tier];
      if (tx !== ty) return tx - ty;
      if ((x.w.c || 0) !== (y.w.c || 0)) return (x.w.c || 0) - (y.w.c || 0);
      return x.i - y.i;
    }).map(function (e) { return e.w.n; });
    ok(rendered.map(function (r) { return r.name; }).join('|') === expected.join('|'),
      'the rendered order is tier-then-price', rendered.map(function (r) { return r.name; }).join(', '));

    // Buying and equipping through the real DOM handlers. The SMG is rank 3, so
    // the profile has to be rank 3 to see a BUY button at all - rank is the gate
    // and the price is the cost, which is the whole point of the ownership model.
    SV = sanitizeSV(Object.assign({}, SV, { lvl: Math.max(SV.lvl || 1, weaponRankReq(1)), cr: 5000 }));
    tab(2);
    cards = Array.prototype.slice.call(document.getElementById('shop-list').children);
    var smgCard = cards.filter(function (c) { return (c.querySelector('b') || {}).textContent === 'SMG'; })[0];
    var smgBuy = smgCard && smgCard.querySelector('button[data-buy]');
    ok(!!smgBuy, 'an unowned weapon renders a BUY button', smgBuy ? smgBuy.textContent.trim() : 'none');
    var crBefore = SV.cr;
    if (smgBuy) smgBuy.click();
    ok(SV.own[1] === 1, 'buying a weapon marks it owned', 'own[1]=' + SV.own[1]);
    ok(SV.cr === crBefore - 300, 'buying a weapon spends its price', crBefore + ' -> ' + SV.cr);
    cards = Array.prototype.slice.call(document.getElementById('shop-list').children);
    var smgCard2 = cards.filter(function (c) { return (c.querySelector('b') || {}).textContent === 'SMG'; })[0];
    var smgEq = smgCard2 && smgCard2.querySelector('button[data-eq]');
    ok(!!smgEq, 'a purchased weapon offers EQUIP', smgEq ? smgEq.textContent.trim() : 'none');
    if (smgEq) smgEq.click();
    ok(SV.start === 1, 'equipping sets the deployed weapon', 'SV.start=' + SV.start);

    // Insufficient funds must not hand over the gun. The Railgun is rank 17, so
    // the profile is raised to its gate first - otherwise the card would be gated
    // by rank and the price would never be consulted.
    SV = sanitizeSV(Object.assign({}, SV, { lvl: Math.max(SV.lvl || 1, weaponRankReq(14)), cr: 0 }));
    tab(2);
    cards = Array.prototype.slice.call(document.getElementById('shop-list').children);
    var lockCard = cards.filter(function (c) { return (c.querySelector('b') || {}).textContent === 'Railgun'; })[0];
    var lockBuy = lockCard && lockCard.querySelector('button[data-buy]');
    ok(!!lockBuy && lockBuy.disabled, 'an unaffordable weapon is disabled', lockBuy ? 'price ' + WEAP[14].c + ' CR, rank ' + weaponRankReq(14) : 'no buy button');
    if (lockBuy) lockBuy.click();
    ok(!SV.own[14], 'clicking a disabled BUY does not grant the weapon', 'own[14]=' + SV.own[14]);

    // 8. The two weapons added in this draft. They are appended to WEAP, so their
    // indices must not have disturbed anything already saved, and their rank gates
    // must be visible on the card and enforced on the buy path.
    var vcIdx = WEAP.findIndex(function (w) { return w.n === 'Volt Carbine'; });
    var sbIdx = WEAP.findIndex(function (w) { return w.n === 'Siegebreaker'; });
    ok(vcIdx > 21 && sbIdx > vcIdx, 'the new weapons are appended after the existing arsenal',
      'Volt Carbine @' + vcIdx + ', Siegebreaker @' + sbIdx);
    ok(WEAP[0].n === 'Pistol' && WEAP[15].n === 'Dual Pistols' && WEAP[21].n === 'Hornet',
      'and the existing indices are unchanged', WEAP[0].n + '/' + WEAP[15].n + '/' + WEAP[21].n);
    ok(weaponRankReq(vcIdx) === 21 && weaponRankReq(sbIdx) === 24, 'both carry their rank gate',
      'VC rank ' + weaponRankReq(vcIdx) + ', SB rank ' + weaponRankReq(sbIdx));
    SV = sanitizeSV(Object.assign({}, SV, { lvl: 20, cr: 20000 }));
    tab(2);
    cards = Array.prototype.slice.call(document.getElementById('shop-list').children);
    var vcCard = cards.filter(function (c) { return (c.querySelector('b') || {}).textContent === 'Volt Carbine'; })[0];
    ok(!!vcCard, 'the Volt Carbine is listed in the shop');
    var vcBuy = vcCard && vcCard.querySelector('button[data-buy]');
    ok(!vcBuy, 'and is not buyable below its rank', vcCard ? vcCard.textContent.replace(/\s+/g, ' ').slice(0, 60) : 'no card');
    SV = sanitizeSV(Object.assign({}, SV, { lvl: 21 }));
    tab(2);
    cards = Array.prototype.slice.call(document.getElementById('shop-list').children);
    vcCard = cards.filter(function (c) { return (c.querySelector('b') || {}).textContent === 'Volt Carbine'; })[0];
    vcBuy = vcCard && vcCard.querySelector('button[data-buy]');
    ok(!!vcBuy && !vcBuy.disabled, 'at its rank the BUY button appears', vcBuy ? vcBuy.textContent.trim() : 'none');
    var vcCr = SV.cr;
    if (vcBuy) vcBuy.click();
    ok(SV.own[vcIdx] === 1 && SV.cr === vcCr - WEAP[vcIdx].c, 'and buying it spends its price',
      'own=' + SV.own[vcIdx] + ', ' + vcCr + ' -> ' + SV.cr);
    // A piercing RARE must actually pierce: one round, two targets.
    var pierceA = { x: P.x + 200, y: P.y, t: 'walk', hp: 500, mh: 500, r: 16, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
    var pierceB = { x: P.x + 210, y: P.y, t: 'walk', hp: 500, mh: 500, r: 16, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
    Z.push(pierceA); Z.push(pierceB);
    P.cur = vcIdx; P.a = 0; P.cd = 0; P.ammo = 10;
    B.length = 0;
    fire();
    for (var pf = 0; pf < 20; pf++) { try { update(1 / 60); } catch (e) { break; } }
    ok(pierceA.hp < 500 && pierceB.hp < 500, 'a piercing round damages both targets in line',
      'A ' + (500 - pierceA.hp) + ' hp, B ' + (500 - pierceB.hp) + ' hp');
    dropZ(pierceA); dropZ(pierceB);
    P.cur = 0;

    section('CONTROLS');
    ok(BT.filter(function (b) { return b.fire; }).length === 0, 'no FIRE button remains on the pad');
    ok(document.getElementById('firebtn') === null, 'the FIRE setting row is gone from Options');
    ok(SV.fireMode === undefined, 'the retired fire-mode preference is not in the save', String(SV.fireMode));
    var ctlBad = [];
    for (var ci = 0; ci < BT.length; ci++) {
      var bb = BT[ci];
      if (!btActive(bb)) continue;
      var pp = bb.p(), hr = btHit(bb);
      if (hr <= 0 || !isFinite(pp[0]) || !isFinite(pp[1])) ctlBad.push(bb.id);
    }
    ok(ctlBad.length === 0, 'every remaining pad button has a real position and hit radius', ctlBad.join(', '));

    // Aiming is the trigger now: hold the aim stick and the gun must fire with no
    // FIRE button involved anywhere in the input path.
    if (!S) { try { begin(); } catch (e) {} }
    MUTE = 1;
    P.reloading = false;
    P.cd = 0;
    P.fl = 0;
    P.cur = 0;
    P.maxAmmo = weaponStats(0).mag;
    P.ammo = P.maxAmmo;
    var ammoBefore = P.ammo;
    J.r = { id: 991, ox: W * 0.72, oy: H * 0.62, x: W * 0.72 + 60, y: H * 0.62 };
    for (var fr = 0; fr < 40; fr++) { try { update(1 / 60); } catch (e) { ok(false, 'update threw while aiming', e.message); break; } }
    J.r = null;
    if (typeof releaseAllInputs === 'function') releaseAllInputs();
    ok(P.ammo < ammoBefore, 'holding the aim stick fires without a FIRE button', ammoBefore + ' -> ' + P.ammo + ' rounds');

    section('UI BINDING');

    // One delegated listener runs every data-act button, so the chrome has to be
    // exercised by clicking it, not by calling tab(): a stale index, a removed
    // action or a broken delegation only shows up in the real click path.
    var pids = ['p0', 'pe', 'psh', 'psk', 'pc', 'ps', 'p2', 'pa', 'p3'];
    var navBtns = Array.prototype.slice.call(document.querySelectorAll('#nav [data-act="tab"]'));
    ok(navBtns.length === pids.length, 'the nav has one tab button per panel', navBtns.length + ' buttons / ' + pids.length + ' panels');
    var navBad = [];
    for (var ni = 0; ni < navBtns.length; ni++) {
      navBtns[ni].click();
      var shown = pids.filter(function (p) { var el = document.getElementById(p); return el && el.classList.contains('on'); });
      if (shown.length !== 1 || shown[0] !== pids[ni]) navBad.push('nav[' + ni + '] showed ' + (shown.join(',') || 'nothing'));
      if (!navBtns[ni].classList.contains('on')) navBad.push('nav[' + ni + '] not highlighted');
    }
    ok(navBad.length === 0, 'clicking each nav button opens exactly the matching panel', navBad.slice(0, 4).join(' | ') || navBtns.length + ' tabs');

    var inlineEls = document.querySelectorAll('[onclick],[onchange],[oninput],[onsubmit],[onpointerdown]');
    ok(inlineEls.length === 0, 'the built page carries no inline event attributes', inlineEls.length + ' found');

    var acts = Array.prototype.slice.call(document.querySelectorAll('[data-act]'));
    var unresolved = acts.filter(function (el) { return typeof UI_ACTIONS[el.dataset.act] !== 'function'; });
    ok(unresolved.length === 0, 'every data-act element resolves to a handler',
      unresolved.length + ' unresolved of ' + acts.length + ' elements');

    // A settings toggle, driven through its own button.
    var sndBtn = document.getElementById('sndbtn');
    var muteBefore = SV.mute ? 1 : 0;
    var sndLabel = sndBtn.textContent;
    sndBtn.click();
    ok((SV.mute ? 1 : 0) !== muteBefore, 'clicking SOUND toggles the persisted mute flag', muteBefore + ' -> ' + (SV.mute ? 1 : 0));
    sndBtn.click();
    ok(sndBtn.textContent === sndLabel, 'clicking it again restores the label', sndBtn.textContent);

    // A modal opened and closed by two different data-act buttons.
    tab(0);
    var mapModal = document.getElementById('map-modal');
    var hubOpen = document.querySelector('[data-act="openMapModal"]');
    if (hubOpen && mapModal) {
      hubOpen.click();
      ok(mapModal.classList.contains('on'), 'the map modal opens through its data-act button');
      var closer = document.querySelector('#map-modal [data-act="closeMapModal"]');
      if (closer) closer.click();
      ok(!mapModal.classList.contains('on'), 'and closes through its own');
    }

    // A shop tier chip re-renders the list through the same delegated path.
    tab(2);
    var chip = document.querySelector('[data-act="filterShop"][data-arg="EPIC"]');
    if (chip) {
      chip.click();
      var epic = Array.prototype.slice.call(document.getElementById('shop-list').children);
      var epicBad = epic.filter(function (c) { return c.textContent.indexOf('EPIC') < 0; });
      ok(epic.length > 0 && epicBad.length === 0, 'a tier chip filters the rendered shop list', epic.length + ' EPIC cards, ' + epicBad.length + ' wrong');
      document.querySelector('[data-act="filterShop"][data-arg="all"]').click();
    }

    // The daily bonus, claimed through its button, then rolled back.
    var daily = document.getElementById('daily');
    if (daily && !daily.disabled) {
      var cr0 = SV.cr, day0 = SV.day, rev0 = SV.rev;
      daily.click();
      ok(SV.cr === cr0 + 200 && SV.day === new Date().toDateString(), 'the daily button claims once', cr0 + ' -> ' + SV.cr);
      ok(daily.disabled, 'and disables itself');
      SV.cr = cr0; SV.day = day0; SV.rev = rev0;
      refreshDailyBtn();
      lobby();
    }

    section('CANVAS CONTEXT');
    // The engine draws through one mutable global context. Every scratch render
    // (icons, the hero band, the skin turntable) points it at an offscreen canvas,
    // and must hand it back - otherwise the main loop quietly draws a whole frame
    // into a 220x128 thumbnail.
    var mainCx = document.getElementById('c').getContext('2d');
    var cxBad = [];
    function scratch(name, fn) {
      try { fn(); } catch (e) { cxBad.push(name + ' threw: ' + e.message); return; }
      if (X !== mainCx) cxBad.push(name + ' left X on a scratch canvas');
    }
    scratch('drawHeroBand', function () { drawHeroBand(); });
    scratch('tab(3)', function () { tab(3); });
    scratch('gunIcon', function () { gunIcon(0); });
    var opSkin = Object.keys(SKINS).filter(function (k) { return SKINS[k].type === 'op'; })[0];
    scratch('charSkinIcon', function () { charSkinIcon(opSkin); });
    scratch('clsIcon', function () { clsIcon(0); });
    scratch('tab(0)', function () { tab(0); });
    ok(cxBad.length === 0, 'every scratch render hands the engine context back', cxBad.join(' | ') || 'X === main context');
    ok(X === mainCx && X0 === mainCx, 'the engine context is still the main canvas');

    // The guarantee that matters: a scratch render that throws mid-draw must still
    // restore the context, which is what withCtx() exists for.
    var realGun = gun, threw = false;
    gun = function () { throw new Error('scratch draw failed'); };
    try { clsIcon(3, 4); } catch (e) { threw = true; }
    gun = realGun;
    ok(threw, 'a throwing scratch render propagates its error');
    ok(X === mainCx, 'and still hands the engine context back', 'X ' + (X === mainCx ? 'restored' : 'left dangling'));

    section('PROGRESSION & REWARDS');
    // Everything below goes through the real DOM path - a rendered button, a real
    // click, the delegated listener, the game function, the save. The profile is
    // snapshotted and restored so the perf section still sees a normal save.
    var svSnap = JSON.stringify(SV);
    var dzsSnap = localStorage.getItem('dzs'), dzsBakSnap = localStorage.getItem('dzs_bak');
    var today = new Date().toDateString();
    function profile(o) {
      SV = sanitizeSV(Object.assign({
        v: 3, lvl: 1, cr: 0, loginDays: 1, dmDate: today, lastLogin: today,
        dailyMissions: {}, loginClaimed: {}, rankClaimed: {},
        own: WEAP.map(function (_, i) { return i ? 0 : 1; })
      }, o || {}));
      lobby();
    }

    // 1. A fresh rank-1 profile owns the pistol and nothing else.
    profile();
    var ownedAtBoot = SV.own.filter(Boolean).length;
    ok(ownedAtBoot === 1, 'a fresh profile owns only the starter pistol', ownedAtBoot + ' of ' + WEAP.length);

    // 2. No rank met, no money: every non-starter card offers a disabled gate.
    tab(2);
    var gated = Array.prototype.slice.call(document.querySelectorAll('#shop-list [data-buy]'));
    ok(gated.length === 0, 'no weapon is purchasable at rank 1', gated.length + ' buy buttons');
    var gateBtns = Array.prototype.slice.call(document.querySelectorAll('#shop-list button[disabled]'));
    ok(gateBtns.length >= WEAP.length - 1, 'every locked weapon renders a disabled rank button',
      gateBtns.length + ' disabled of ' + (WEAP.length - 1) + ' locked');

    // 3. Money alone is not enough: the rank gate still holds.
    profile({ cr: 999999 });
    tab(2);   // the shop renders when its tab opens, so re-render after a profile swap
    var richLocked = Array.prototype.slice.call(document.querySelectorAll('#shop-list [data-buy]'));
    ok(richLocked.length === 0, 'credits do not bypass the rank gate', richLocked.length + ' buy buttons with 999999 CR');
    var crBefore = SV.cr;
    if (richLocked.length) richLocked[0].click();
    ok(SV.cr === crBefore && SV.own.filter(Boolean).length === 1, 'and clicking a gated card changes nothing');

    // 4. Rank met + affordable: the buy path actually works, once.
    profile({ lvl: 3, cr: 999999 });
    tab(2);
    var wi = -1;
    for (var bi = 1; bi < WEAP.length; bi++) {
      if (weaponRankMet(bi) && SV.own[bi] !== 1) { wi = bi; break; }
    }
    ok(wi > 0, 'a rank-3 profile has something to buy', wi > 0 ? WEAP[wi].n + ' (rank ' + weaponRankReq(wi) + ')' : 'nothing');
    var buyBtn = wi > 0 ? document.querySelector('#shop-list [data-buy="' + wi + '"]') : null;
    ok(!!buyBtn, 'and its card offers a BUY button', buyBtn ? buyBtn.textContent.trim() : 'no buy button');
    if (buyBtn) {
      var cost = WEAP[wi].c;
      var cr0 = SV.cr;
      buyBtn.click();
      ok(SV.own[wi] === 1, 'buying sets ownership', WEAP[wi].n);
      ok(SV.cr === cr0 - cost, 'and debits the price exactly once', cr0 + ' -> ' + SV.cr + ' (-' + cost + ')');
      var eq = document.querySelector('#shop-list [data-eq="' + wi + '"]');
      ok(!!eq, 'the card becomes equippable after the purchase');
      if (eq) { eq.click(); ok(SV.start === wi, 'and equipping it works'); }
      // Ownership is purchase state, so it has to survive a save/reload.
      sv(); ld();
      ok(SV.own[wi] === 1, 'a bought weapon is still owned after a save/reload', WEAP[wi].n);
    }

    // 5. Login rewards, day by day, through the rendered buttons.
    profile({ lvl: 5, cr: 0, loginDays: 1 });
    var day1 = document.querySelector('#login-track [data-act="claimLoginDay"][data-arg="1"]');
    var day2 = document.querySelector('#login-track [data-act="claimLoginDay"][data-arg="2"]');
    ok(!!day1 && !!day2, 'the login track renders one button per reward day');
    if (day1 && day2) {
      ok(day2.disabled === true, 'a day beyond the streak is locked', 'day 2 disabled=' + day2.disabled);
      day1.click();
      ok(SV.cr === 100, 'clicking CLAIM on day 1 pays +100', SV.cr + ' CR');
      ok(!!(SV.loginClaimed && SV.loginClaimed['1']), 'and the claim is recorded');
      day1.click();
      ok(SV.cr === 100, 'clicking it again does not pay twice', SV.cr + ' CR');
      var day1After = document.querySelector('#login-track [data-act="claimLoginDay"][data-arg="1"]');
      ok(day1After && day1After.disabled && /CLAIMED/.test(day1After.textContent), 'and the card reads CLAIMED',
        day1After ? day1After.textContent.trim() : 'gone');
    }

    // 6. Rank milestones, through the rendered CLAIM button.
    profile({ lvl: 2, cr: 0 });
    var rank2 = document.querySelector('#rank-list [data-act="claimRank"][data-arg="2"]');
    var rank4 = document.querySelector('#rank-list [data-act="claimRank"][data-arg="4"]');
    ok(!!rank2 && !!rank4 && rank4.disabled === true, 'rank milestones above the current rank are locked');
    if (rank2 && !rank2.disabled) {
      rank2.click();
      ok(SV.cr === 250, 'the rank-2 milestone pays +250', SV.cr + ' CR');
      rank2.click();
      ok(SV.cr === 250, 'and only once', SV.cr + ' CR');
    } else { ok(false, 'the rank-2 milestone CLAIM button is enabled at rank 2'); }

    // 7. Daily missions: progress -> claim -> persisted, through the real buttons.
    // The board rotates (three of five templates, drawn by the calendar date), so
    // this cannot assume m1 is the kill mission any more. It first checks the draw
    // itself, then seats a known board so the claim assertions are about the claim
    // path rather than about which three missions today happened to produce.
    profile({ lvl: 5, cr: 0 });
    initDailyMissions();
    var drawKeys = Object.keys(SV.dailyMissions || {});
    var drawTypes = drawKeys.map(function (k) { return SV.dailyMissions[k].type; });
    var WIRED = ['kills', 'waves', 'elites', 'bosses', 'pickups'];
    ok(drawKeys.length === 3, 'the daily board draws three missions', drawKeys.join(','));
    ok(drawTypes.every(function (t) { return WIRED.indexOf(t) >= 0; }),
      'every drawn mission is a real, wired type', drawTypes.join(','));
    ok(new Set(drawTypes).size === 3, 'and no type is drawn twice', drawTypes.join(','));
    var drawTitlesOk = drawKeys.every(function (k) { var m = SV.dailyMissions[k]; return m.target > 0 && typeof m.title === 'string' && m.title.length > 0 && m.reward > 0; });
    ok(drawTitlesOk, 'every drawn mission has a title, a target and a reward',
      drawKeys.map(function (k) { return SV.dailyMissions[k].title; }).join(' | '));
    // Same day, same board: reseeding must not re-roll the draw.
    var firstDraw = JSON.stringify(SV.dailyMissions);
    SV.dailyMissions = {}; SV.dmDate = new Date().toDateString();
    initDailyMissions();
    ok(JSON.stringify(SV.dailyMissions) === firstDraw, 'the same day redraws the same board');

    // Seat a fixed board for the claim path.
    SV.dailyMissions = {
      m1: { title: 'Eliminate 60 Zombies', target: 60, cur: 0, reward: 150, claimed: false, type: 'kills' },
      m2: { title: 'Survive 3 Waves', target: 3, cur: 0, reward: 200, claimed: false, type: 'waves' },
      m3: { title: 'Destroy 2 Elites', target: 2, cur: 0, reward: 250, claimed: false, type: 'elites' }
    };
    trackMissionProgress('kills', 60);
    trackMissionProgress('waves', 3);
    trackMissionProgress('elites', 1, { el: true });
    lobby();
    var boardRows = document.querySelectorAll('#daily-list [data-act="claimMission"]');
    ok(boardRows.length === 3, 'the mission board renders one row per mission', boardRows.length + ' rows');
    var m1Btn = document.querySelector('#daily-list [data-act="claimMission"][data-arg="m1"]');
    var m3Btn = document.querySelector('#daily-list [data-act="claimMission"][data-arg="m3"]');
    ok(!!m1Btn && !m1Btn.disabled, 'a completed mission is claimable');
    ok(!!m3Btn && m3Btn.disabled === true, 'an incomplete mission is not', 'elites 1/2');
    if (m1Btn) {
      var crA = SV.cr;
      m1Btn.click();
      ok(SV.cr === crA + 150, 'claiming the kill mission pays +150', SV.cr + ' CR');
      m1Btn.click();
      ok(SV.cr === crA + 150, 'a second click pays nothing', SV.cr + ' CR');
      var m1After = document.querySelector('#daily-list [data-act="claimMission"][data-arg="m1"]');
      ok(m1After && /CLAIMED/.test(m1After.textContent), 'the row reads CLAIMED', m1After ? m1After.textContent.trim() : 'gone');
    }
    // The board must survive the sanitiser that every lobby() pass runs - this is
    // the regression that made missions look permanently empty.
    lobby();
    var boardAfter = SV.dailyMissions ? Object.keys(SV.dailyMissions).length : 0;
    ok(boardAfter === 3, 'the board survives a lobby() pass', boardAfter + ' missions');
    ok(SV.dailyMissions.m1 && SV.dailyMissions.m1.cur === 60 && SV.dailyMissions.m1.claimed === true,
      'with progress and the claimed flag intact', SV.dailyMissions.m1 ? SV.dailyMissions.m1.cur + '/60 claimed=' + SV.dailyMissions.m1.claimed : 'gone');
    ok(SV.dailyMissions.m2 && SV.dailyMissions.m2.cur === 3, 'including the waves mission', SV.dailyMissions.m2 ? SV.dailyMissions.m2.cur + '/3' : 'gone');
    sv(); ld();
    ok(SV.dailyMissions && Object.keys(SV.dailyMissions).length === 3 && SV.dailyMissions.m2.cur === 3,
      'and survives a save/reload round trip', SV.dailyMissions ? Object.keys(SV.dailyMissions).length + ' missions' : 'gone');

    // 7b. The two mission types added in this draft, driven through the real
    // gameplay entry points rather than the tracker: a boss really dying and a
    // power-up really being picked up.
    SV.dailyMissions = {
      m1: { title: 'Bring down 1 Boss', target: 1, cur: 0, reward: 300, claimed: false, type: 'bosses' },
      m2: { title: 'Collect 3 Power-ups', target: 3, cur: 0, reward: 220, claimed: false, type: 'pickups' }
    };
    var bossTarget = { x: P.x + 120, y: P.y, t: 'boss', hp: 40, mh: 9000, r: 40, hit: 0, flinch: 0, iv: 0, sh: 0, dead: 0, animOffset: 0, cd: 0, bv: 0, aff: -1, cgT: 0 };
    Z.push(bossTarget);
    damageZ(bossTarget, 1e6, 'test', false);
    ok(SV.dailyMissions.m1.cur === 1, 'a boss kill advances the boss mission through the real kill path',
      SV.dailyMissions.m1.cur + '/1');
    var puId = (typeof PU_DEFS !== 'undefined' && Object.keys(PU_DEFS).length) ? Object.keys(PU_DEFS)[0] : 'dd';
    applyPowerup(puId);
    applyPowerup(puId);
    ok(SV.dailyMissions.m2.cur === 2, 'a power-up pickup advances the pickup mission',
      SV.dailyMissions.m2.cur + '/3');
    dropZ(bossTarget);
    // Clear the timed effects and the pools this block dirtied. The perf section
    // runs later in this same session: a 14-second OVERCHARGE overlay left running
    // would be counted there as per-frame gradient work and read as a regression.
    S.dd = 0; S.fz = 0; S.sh2 = 0; S.mgTime = 0; S.adr = 0; S.dark = 0;
    F.length = 0; RG.length = 0; DEC.length = 0; B.length = 0;

    // restore
    SV = sanitizeSV(JSON.parse(svSnap));
    if (dzsSnap === null) localStorage.removeItem('dzs'); else localStorage.setItem('dzs', dzsSnap);
    if (dzsBakSnap === null) localStorage.removeItem('dzs_bak'); else localStorage.setItem('dzs_bak', dzsBakSnap);
    lobby();
    tab(0);

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
