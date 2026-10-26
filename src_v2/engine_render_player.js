// DEAD ZONE v1.1.0 - PLAYER & WEAPONS RENDERING ENGINE
// Senior 2D Artist / Technical Rendering Pipeline

function bodyBack(ci = (typeof SV !== 'undefined' && SV && SV.cls != null) ? SV.cls : 0) {
  let c = (typeof CL !== 'undefined' && CL[ci]) ? CL[ci] : (CL ? CL[0] : { pk: '#3a4430', ac: '#556644', hm: '#242b1f', vz: '#38bdf8' });
  const hu = (typeof P !== 'undefined' && P && P.hurt > 0);
  const curOpSkin = (typeof SV !== 'undefined' && SV && SV.eqOpSkin && typeof SKINS !== 'undefined') ? SKINS[SV.eqOpSkin] : null;
  if (curOpSkin) {
    c = { ...c, pk: curOpSkin.pk || c.pk, ac: curOpSkin.ac || c.ac, hm: curOpSkin.hm || c.hm, vz: curOpSkin.vz || c.vz };
  }
  
  X.save();
  X.globalAlpha = (typeof P !== 'undefined' && P && P.cloak > 0) ? 0.35 : 1;

  // Layer 1: Ambient occlusion / directional ground drop shadow (casts to bottom-right: light from top-left)
  X.fillStyle = 'rgba(0,0,0,0.45)';
  X.beginPath();
  X.ellipse(4, 7, 18, 14, 0.2, 0, 6.28);
  X.fill();

  // Layer 2: Tactical boots with natural walking stride
  const st = (typeof P !== 'undefined' && P && P.st) ? P.st : 0;
  const isMoving = (typeof P !== 'undefined' && P && Math.hypot(P.vx || 0, P.vy || 0) > 10);
  const bL = isMoving ? Math.sin(st) * 6 : 0;
  const bR = isMoving ? -Math.sin(st) * 6 : 0;

  // Left boot
  X.fillStyle = '#141812';
  X.beginPath(); X.roundRect(-8 + bL, -14, 13, 7, 3); X.fill();
  X.fillStyle = '#22281e';
  X.fillRect(-7 + bL, -13, 11, 3); // Boot tread highlight
  X.fillStyle = '#0c0e0a';
  X.fillRect(-6 + bL, -14, 2, 7); // Laces groove

  // Right boot
  X.fillStyle = '#141812';
  X.beginPath(); X.roundRect(-8 + bR, 7, 13, 7, 3); X.fill();
  X.fillStyle = '#22281e';
  X.fillRect(-7 + bR, 8, 11, 3);
  X.fillStyle = '#0c0e0a';
  X.fillRect(-6 + bR, 7, 2, 7);

  // Footprint blood tracker
  if (isMoving && Math.random() < 0.12 && typeof spawnFootprint === 'function') {
    const footY = Math.random() < 0.5 ? -10 : 10;
    const cosA = Math.cos(P.a || 0), sinA = Math.sin(P.a || 0);
    spawnFootprint(P.x - cosA * 8 - sinA * footY, P.y - sinA * 8 + cosA * footY, P.a || 0, 1.0);
  }

  // Layer 3: Tactical backpack & rear equipment harness
  const packCol = hu ? '#ffffff' : (c.pk || '#2e3826');
  // Backpack main pouch
  X.fillStyle = packCol;
  X.beginPath(); X.roundRect(-17, -10, 10, 20, 4); X.fill();
  X.strokeStyle = '#0e130c';
  X.lineWidth = 1.8;
  X.stroke();

  // Backpack MOLLE webbing strips
  X.fillStyle = 'rgba(0,0,0,0.35)';
  X.fillRect(-15, -7, 2.5, 14);
  X.fillRect(-11, -8, 2.5, 16);

  // Communications radio antenna & LED
  X.strokeStyle = '#222620';
  X.lineWidth = 1.6;
  X.beginPath(); X.moveTo(-14, -8); X.lineTo(-24, -14); X.stroke();
  X.fillStyle = '#4ade80'; // Green comms status LED
  X.beginPath(); X.arc(-24, -14, 1.8, 0, 6.28); X.fill();

  // Torso / tactical body armor
  const armorCol = hu ? '#ffffff' : (PC || '#364024');
  X.fillStyle = armorCol;
  X.beginPath(); X.ellipse(0, 0, 12, 17, 0, 0, 6.28); X.fill();
  X.strokeStyle = c.ac || '#556644';
  X.lineWidth = 2.8;
  X.stroke();

  // Ballistic chest plate ceramic inserts with edge bevels
  X.fillStyle = '#1c2217';
  X.fillRect(-4, -10, 8, 5);
  X.fillRect(-4, -3, 8, 6);
  X.fillRect(-4, 5, 8, 5);
  X.strokeStyle = '#3d4b34';
  X.lineWidth = 1.2;
  X.strokeRect(-4, -10, 8, 5);
  X.strokeRect(-4, -3, 8, 6);
  X.strokeRect(-4, 5, 8, 5);

  // Shoulder epaulets & armor pads
  X.fillStyle = c.ac || '#4a5736';
  X.beginPath(); X.roundRect(-2, -15, 6, 4, 1.5); X.roundRect(-2, 11, 6, 4, 1.5); X.fill();

  X.restore();
}

function bodyFront(ci = (typeof SV !== 'undefined' && SV && SV.cls != null) ? SV.cls : 0) {
  let c = (typeof CL !== 'undefined' && CL[ci]) ? CL[ci] : (CL ? CL[0] : { pk: '#3a4430', ac: '#556644', hm: '#242b1f', vz: '#38bdf8' });
  const hu = (typeof P !== 'undefined' && P && P.hurt > 0);
  const r = Math.max(0, (typeof P !== 'undefined' && P && P.fl) || 0) * 60;
  const curOpSkin = (typeof SV !== 'undefined' && SV && SV.eqOpSkin && typeof SKINS !== 'undefined') ? SKINS[SV.eqOpSkin] : null;
  if (curOpSkin) {
    c = { ...c, pk: curOpSkin.pk || c.pk, ac: curOpSkin.ac || c.ac, hm: curOpSkin.hm || c.hm, vz: curOpSkin.vz || c.vz };
  }

  X.save();
  X.globalAlpha = (typeof P !== 'undefined' && P && P.cloak > 0) ? 0.35 : 1;

  // Layer 4: Tactical arms gripping weapon
  X.lineCap = 'round';
  X.strokeStyle = hu ? '#ffffff' : (c.ac || '#556644');
  X.lineWidth = 6.5;

  // Left arm & forearm
  X.beginPath();
  X.moveTo(1, -11);
  X.lineTo(16 - r * 0.2, -4);
  // Right arm & forearm
  X.moveTo(1, 11);
  X.lineTo(26 - r * 0.2, 3);
  X.stroke();

  // Tactical gloved hands with knuckle protectors
  X.fillStyle = '#181d15';
  X.beginPath();
  X.arc(16 - r * 0.2, -4, 4.5, 0, 6.28);
  X.arc(26 - r * 0.2, 3, 4.5, 0, 6.28);
  X.fill();
  X.fillStyle = '#59654f';
  X.fillRect(14 - r * 0.2, -5.5, 3, 3);
  X.fillRect(24 - r * 0.2, 1.5, 3, 3);

  // Helmet / Tactical Headgear
  const helmCol = hu ? '#ffffff' : (c.hm || '#232b1d');
  X.fillStyle = helmCol;
  X.beginPath();
  X.arc(0, 0, 10, 0, 6.28);
  X.fill();
  X.strokeStyle = '#12170f';
  X.lineWidth = 1.8;
  X.stroke();

  // Tactical NVG / helmet mount bracket
  X.fillStyle = '#141812';
  X.fillRect(5, -3, 3, 6);
  X.fillStyle = '#3a4435';
  X.fillRect(3, -2, 2, 4);

  // Tactical visor / ballistic goggles with glossy specular sweep
  const visorCol = c.vz || '#38bdf8';
  X.fillStyle = visorCol;
  X.beginPath();
  X.roundRect(4, -6, 5, 12, 2.5);
  X.fill();

  // Glass specular reflection highlight
  X.fillStyle = 'rgba(255,255,255,0.7)';
  X.beginPath();
  X.moveTo(5, -4.5);
  X.lineTo(8, -2.5);
  X.lineTo(5, -1.5);
  X.closePath();
  X.fill();

  // Ambient helmet rim shadow (bottom-right shadow)
  X.fillStyle = 'rgba(0,0,0,0.28)';
  X.beginPath();
  X.arc(1, 2, 9, 0, 1.57);
  X.stroke();

  X.restore();
}

// Run clock for cosmetic animation inside the player/gun sprites. The lobby
// draws these same sprites for skin previews long before begin() exists, and S
// is null until then, so every animated detail has to survive a missing run.
function runClock() {
  return (typeof S !== 'undefined' && S && typeof S.t === 'number') ? S.t : 0;
}

// 4-LAYER GUN SPRITE RENDERING
function gun(i, rc) {
  if (i == null || typeof i !== 'number' || i < 0 || i > WEAP.length - 1 || isNaN(i)) i = 0;
  rc = rc || 0;
  X.save();
  X.translate(10 - rc, 0);
  const ga = X.globalAlpha;
  const fl = (typeof P !== 'undefined' && P && P.fl > 0);

  const q = (x, y, w, h, c) => { X.fillStyle = c; X.fillRect(x, y, w, h); };
  const bx = (x, y, w, h, c) => {
    q(x - 1, y - 1, w + 2, h + 2, '#080a0c'); // Outline
    q(x, y, w, h, c);                         // Base
    q(x, y, w, Math.min(2, h * 0.35), '#ffffff2a'); // Top rim highlight
    q(x, y + h - 1, w, 1, 'rgba(0,0,0,0.38)');      // Bottom shadow
  };
  const pg = (p, c) => {
    X.fillStyle = c;
    X.strokeStyle = '#080a0c';
    X.lineWidth = 1.5;
    X.beginPath();
    p.forEach((v, k) => k ? X.lineTo(v[0], v[1]) : X.moveTo(v[0], v[1]));
    X.closePath();
    X.fill();
    X.stroke();
  };
  const ln = (a, b, c, d, col, w) => {
    X.strokeStyle = col;
    X.lineWidth = w || 2;
    X.beginPath();
    X.moveTo(a, b);
    X.lineTo(c, d);
    X.stroke();
  };

  const MT = '#7d838a', DK = '#222528', WD = '#7a4e2a', WL = '#a8743f';

  if (i === 0) {
    // 0: Service Pistol (9mm Combat)
    pg([[3, 0], [11, 0], [9, 11], [1, 11]], '#33363a');
    for (let k = 0; k < 3; k++) q(2 + k * 0.5, 3 + k * 3, 7, 1, '#00000077');
    bx(1, -5, 23, 6, '#8a8f94');
    for (let k = 0; k < 4; k++) q(3 + k * 2, -4, 1, 4, '#00000055');
    bx(23, -4, 3, 4, '#b5b5b5');
    q(11, -4, 5, 2, DK); q(2, -7, 2, 2, DK); q(21, -7, 2, 2, DK);
    q(10, 1, 7, 1, DK); q(16, 1, 1, 4, DK); q(11, 2, 1, 3, '#ccc'); q(1, -5, 3, 2, '#555');
  } else if (i === 1) {
    // 1: Submachine Gun (Compact Tactical SMG)
    ln(0, -1, -9, -1, '#222'); ln(-9, -1, -9, 5, '#222'); ln(-9, 5, 0, 5, '#222');
    bx(0, -4, 24, 8, '#5f655b');
    q(2, -6, 20, 2, DK);
    for (let k = 0; k < 6; k++) q(3 + k * 3, -6, 1, 2, '#888');
    bx(24, -3, 10, 6, '#444');
    for (let k = 0; k < 3; k++) q(26 + k * 3, -1, 1.5, 2, '#000');
    q(34, -2, 2, 4, '#aaa');
    bx(9, 4, 5, 14, DK);
    q(10, 6, 3, 1, '#d9b84a'); q(10, 9, 3, 1, '#d9b84a'); q(10, 12, 3, 1, '#d9b84a');
    pg([[1, 4], [7, 4], [5, 12], [-1, 12]], '#222');
    bx(21, 4, 4, 7, DK); q(14, -8, 3, 2, '#999'); q(3, -8, 2, 2, DK);
  } else if (i === 2) {
    // 2: Riot Shotgun (Pump-Action 12G)
    pg([[-12, -4], [2, -5], [2, 5], [-12, 7]], WD);
    ln(-10, 0, 0, 0, WL, 1);
    bx(2, -5, 14, 9, MT);
    q(6, -3, 5, 3, '#c8302a'); q(11, -3, 2, 3, '#d9b84a'); q(4, -5, 6, 1, DK);
    bx(16, -4, 34, 3, '#55595e');
    bx(16, 0, 30, 3, '#44484c');
    bx(26, -1, 12, 6, WD);
    for (let k = 0; k < 4; k++) q(28 + k * 3, -1, 1, 6, '#0005');
    q(48, -6, 2, 2, '#e8503a'); q(8, 4, 5, 2, DK);
    pg([[2, 4], [7, 4], [5, 11], [0, 11]], WD);
  } else if (i === 3) {
    // 3: Hunting Rifle (Semi-Auto Precision)
    pg([[-12, -3], [2, -5], [2, 4], [-10, 8]], WD);
    ln(-9, 0, 0, 0, WL, 1);
    bx(2, -4, 18, 7, '#566049');
    bx(20, -3, 32, 3, '#3d4440');
    bx(20, -4, 16, 6, '#596a50');
    bx(8, -11, 22, 5, '#1c1f22');
    q(29, -10, 2, 3, '#9be7ff'); q(7, -10, 2, 3, '#5ac8e8');
    q(12, -6, 3, 2, DK); q(24, -6, 3, 2, DK);
    bx(10, 3, 6, 8, DK); q(14, -5, 3, 2, '#bbb'); q(50, -4, 4, 5, '#222'); q(18, -11, 2, 1, '#fff7');
  } else if (i === 4) {
    // 4: Heavy Minigun (6-Barrel Gatling)
    const ph = fl ? runClock() * 45 : 0;
    bx(-10, -5, 6, 10, DK);
    bx(-4, -9, 16, 18, '#555');
    for (let k = 0; k < 3; k++) q(-2 + k * 4, -9, 1, 18, '#0004');
    q(4, -13, 10, 3, DK); q(4, -11, 2, 3, DK); q(12, -11, 2, 3, DK);
    bx(12, -8, 14, 16, '#666');
    bx(26, -8, 3, 16, '#333');
    for (let k = 0; k < 6; k++) {
      const a = ph + k * 1.047;
      bx(28, Math.sin(a) * 6 - 1.5, 22, 3, Math.cos(a) > 0 ? '#aaa' : '#6a6a6a');
    }
    bx(44, -8, 3, 16, '#333');
    if (fl) q(44, -8, 3, 16, '#ff5a3a66');
    bx(4, 9, 12, 7, '#3a4a30');
    for (let k = 0; k < 5; k++) q(16 + k * 2, 8 - k * 0.5, 2, 2, '#d9b84a');
    q(5, 11, 10, 1, '#e0b83a');
  } else if (i === 5) {
    // 5: Heavy Revolver (.44 Magnum)
    pg([[-2, -1], [8, -1], [6, 11], [-6, 10]], WD);
    ln(-4, 6, 5, 6, WL, 1);
    bx(0, -5, 16, 7, '#9a9a9a');
    bx(7, -6, 9, 9, '#b0b0b0');
    q(9, -6, 1, 9, '#0005'); q(12, -6, 1, 9, '#0005');
    bx(16, -4, 13, 4, '#8c8c8c');
    q(16, -5, 12, 1, '#ddd'); q(16, 1, 11, 2, '#666');
    pg([[0, -5], [-5, -8], [-2, -3]], DK);
    q(27, -6, 2, 2, DK); q(8, 2, 1, 3, '#ccc'); q(8, 4, 6, 1, DK);
  } else if (i === 6) {
    // 6: Combat Assault Rifle (5.56 Bullpup)
    pg([[-12, -3], [0, -4], [0, 4], [-12, 6]], WD);
    ln(-10, 0, 0, 0, WL, 1);
    bx(0, -5, 20, 8, '#2d3033');
    q(3, -3, 12, 1, '#0008');
    bx(20, -4, 14, 7, WD);
    bx(20, -7, 18, 2, '#555');
    bx(34, -3, 16, 3, '#444');
    q(44, -7, 2, 4, DK); q(50, -4, 3, 5, '#222');
    pg([[10, 3], [17, 3], [22, 16], [15, 16]], '#7a4a2a');
    q(12, 7, 5, 1, '#0005'); q(13, 11, 5, 1, '#0005');
    pg([[3, 3], [8, 3], [6, 12], [1, 12]], DK);
    q(14, -7, 4, 2, DK); q(8, -3, 3, 1, '#bbb');
  } else if (i === 7) {
    // 7: Heavy Sniper (.50 BMG Anti-Material)
    pg([[-14, -3], [4, -5], [4, 4], [-14, 8]], '#3a4a5a');
    q(-12, -5, 10, 2, '#2c3844'); q(-17, -3, 3, 11, DK);
    bx(4, -5, 18, 8, '#3c4a5a');
    bx(22, -3, 42, 3, '#2a3038');
    bx(60, -5, 14, 7, '#222');
    for (let k = 0; k < 4; k++) q(62 + k * 3, -5, 1, 7, '#555');
    bx(8, -13, 30, 6, '#1c1f22');
    bx(4, -14, 5, 8, '#111'); bx(34, -14, 6, 8, '#111');
    q(4, -12, 1.5, 5, '#9be7ff'); q(39, -12, 1.5, 5, '#9be7ff');
    q(14, -7, 3, 2, DK); q(28, -7, 3, 2, DK); q(17, -9, 3, 3, '#555'); q(15, -8, 6, 2, '#bbb');
    ln(38, 2, 32, 11, '#111'); ln(41, 2, 47, 11, '#111'); bx(8, 3, 6, 6, DK);
  } else if (i === 8) {
    // 8: Plasma Cannon (Ionized Energy Blaster)
    const a = 0.6 + Math.sin(runClock() * 8) * 0.3;
    bx(0, -6, 22, 12, '#4b5563');
    for (let k = 0; k < 3; k++) q(3 + k * 6, -6, 2, 12, '#0004');
    bx(22, -6, 18, 2, '#6a7a8a');
    bx(22, 4, 18, 2, '#6a7a8a');
    X.globalAlpha = ga * a;
    q(22, -3, 18, 6, '#5ae0ff'); q(4, -3, 3, 6, '#5ae0ff'); q(10, -3, 3, 6, '#5ae0ff');
    X.globalAlpha = ga;
    for (let k = 0; k < 4; k++) q(24 + k * 4, -4, 1.5, 8, '#2a3340');
    bx(40, -6, 4, 12, '#2a3340'); q(44, -2, 2, 4, '#fff');
    pg([[3, 6], [10, 6], [8, 14], [1, 14]], DK);
    q(14, -8, 4, 2, '#5ae0ff');
  } else if (i === 9) {
    // 9: Rocket Launcher (RPG-7 Kinetic Warhead)
    bx(-6, -7, 6, 14, '#3a4428');
    bx(0, -6, 56, 12, '#5a6a3c');
    for (const x of [12, 30, 46]) q(x, -6, 2, 12, '#2a3320');
    q(2, -4, 6, 8, '#e0b83a');
    for (let k = 0; k < 3; k++) ln(2 + k * 2, 4, 5 + k * 2, -4, '#222', 1);
    bx(56, -7, 6, 14, '#3a4428');
    if (!fl) pg([[62, -4], [68, 0], [62, 4]], '#c8502d');
    bx(20, 6, 5, 9, DK); bx(38, 6, 4, 7, DK);
    bx(22, -10, 12, 4, '#222'); q(33, -9, 1.5, 2, '#ff5a3a');
  } else if (i === 10) {
    // 10: Flamethrower (High-Pressure Napalm)
    bx(-4, -7, 14, 14, '#404040');
    bx(10, -6, 26, 10, '#a04020');
    bx(36, -4, 18, 6, '#606060');
    bx(54, -6, 6, 10, '#e08020');
    bx(6, 7, 12, 12, '#d05020');
    q(8, 9, 8, 8, '#ff9030');
    pg([[3, 6], [8, 6], [7, 12], [2, 12]], DK);
  } else if (i === 11) {
    // 11: Tesla Gun (Arc Induction Emitter)
    bx(-6, -6, 20, 12, '#202430');
    bx(14, -8, 24, 16, '#303850');
    for (let k = 0; k < 4; k++) bx(18 + k * 6, -10, 3, 20, '#00e5ff');
    bx(38, -5, 16, 10, '#405070');
    bx(54, -3, 10, 6, '#00e5ff');
    pg([[2, 6], [8, 6], [7, 13], [1, 13]], DK);
  } else if (i === 12) {
    // 12: GL-40 (Grenade Launcher)
    bx(-6, -8, 14, 14, WD); pg([[-6, -8], [-14, -3], [-14, 5], [-6, 6]], DK);
    bx(8, -8, 20, 16, '#3a4234');
    for (let k = 0; k < 6; k++) {
      const a = k * 1.047 + (fl ? runClock() * 20 : 0);
      q(18 + Math.cos(a) * 5 - 2, Math.sin(a) * 5 - 2, 4, 4, '#1a1f16');
      q(18 + Math.cos(a) * 5 - 1, Math.sin(a) * 5 - 1, 2, 2, '#d9b84a');
    }
    bx(28, -7, 26, 14, '#2d3328'); bx(54, -8, 4, 16, '#1a1d17'); q(32, -11, 16, 4, '#111');
    pg([[4, 6], [10, 6], [8, 14], [2, 14]], DK);
  } else if (i === 13) {
    // 13: Cryo Cannon (Liquid Nitrogen Projector)
    const cGlow = 0.7 + Math.sin(runClock() * 10) * 0.3;
    bx(-6, -8, 18, 16, '#223242'); bx(12, -7, 28, 14, '#2e4254');
    X.fillStyle = '#8fe3ff'; X.globalAlpha = ga * cGlow;
    bx(14, -10, 22, 3, '#5ac8e8'); bx(14, 7, 22, 3, '#5ac8e8');
    for (let k = 0; k < 3; k++) q(16 + k * 7, -3, 4, 6, '#00f0ff');
    X.globalAlpha = ga;
    bx(40, -9, 14, 18, '#1c2834'); bx(54, -6, 8, 12, '#5ac8e8');
    pg([[2, 8], [8, 8], [7, 15], [1, 15]], DK);
  } else if (i === 14) {
    // 14: Railgun (Hypervelocity Magnetic Accelerator)
    bx(-8, -9, 22, 18, '#141922'); bx(14, -7, 16, 14, '#1c2432');
    bx(30, -8, 44, 4, '#2a3548'); bx(30, 4, 44, 4, '#2a3548');
    bx(74, -9, 6, 18, '#111720');
    const rGlow = 0.6 + Math.sin(runClock() * 15) * 0.4;
    X.fillStyle = '#00f0ff'; X.globalAlpha = ga * rGlow;
    for (let k = 0; k < 6; k++) q(32 + k * 7, -3, 3, 6, '#00f0ff');
    if (fl || Math.random() < 0.35) {
      X.strokeStyle = '#ffffff'; X.lineWidth = 1.5; X.beginPath();
      X.moveTo(34, -3); X.lineTo(48, 2); X.lineTo(60, -2); X.lineTo(72, 1); X.stroke();
    }
    X.globalAlpha = ga;
    bx(6, -12, 22, 5, '#0d1219'); q(7, -11, 2, 3, '#00f0ff'); q(25, -11, 2, 3, '#00f0ff');
    pg([[4, 7], [11, 7], [9, 15], [2, 15]], DK);
  } else if (i === 15) {
    // 15: Dual Pistols (Twin Compact Tacticals)
    bx(-2, -7, 18, 5, '#40464d'); bx(16, -6, 3, 3, '#94a3b8'); pg([[0, -4], [6, -4], [4, 4], [-2, 4]], '#222');
    bx(-2, 2, 18, 5, '#40464d'); bx(16, 3, 3, 3, '#94a3b8'); pg([[0, 5], [6, 5], [4, 13], [-2, 13]], '#222');
    if (fl) { q(19, -8, 6, 6, '#ffe08a'); q(19, 1, 6, 6, '#ffe08a'); }
  } else if (i === 16) {
    // 16: Burst Rifle (Bullpup Combat Rifle)
    pg([[-10, -3], [2, -5], [2, 4], [-8, 7]], '#334155');
    bx(2, -4, 22, 8, '#475569'); bx(24, -3, 26, 4, '#1e293b');
    bx(6, -8, 20, 4, '#0f172a'); q(24, -7, 2, 2, '#38bdf8');
    bx(12, 4, 6, 9, '#0f172a'); bx(28, -1, 8, 4, '#1e293b');
    if (fl) { q(50, -5, 10, 8, '#38bdf899'); q(52, -3, 6, 4, '#fff'); }
  } else if (i === 17) {
    // 17: Arc Shotgun (Electrified Combat Shotgun)
    pg([[-10, -4], [3, -5], [3, 5], [-10, 7]], '#382418');
    bx(3, -5, 16, 10, '#334155');
    bx(19, -4, 30, 4, '#1e293b'); bx(19, 0, 28, 4, '#0f172a');
    for (let k = 0; k < 3; k++) bx(22 + k * 8, -6, 3, 12, '#00e5ff');
    if (fl) { q(49, -7, 14, 14, '#00e5ffaa'); q(51, -4, 8, 8, '#fff'); }
  } else if (i === 18) {
    // 18: Crossbow (Recurve Hunter Crossbow with loaded bolt)
    pg([[-9, -3], [4, -4], [4, 5], [-7, 7]], '#5a3a1e');
    q(-7, -1, 8, 1, '#ffffff22');
    bx(4, -3, 30, 6, '#6b4a2a');
    bx(10, -6, 14, 3, '#2b2f33'); q(12, -8, 3, 2, '#38bdf8');
    ln(30, 0, 38, -15, '#2b2f33', 3.5); ln(30, 0, 38, 15, '#2b2f33', 3.5);
    ln(38, -15, 33, -19, '#2b2f33', 3); ln(38, 15, 33, 19, '#2b2f33', 3);
    ln(33, -19, 20, 0, '#e2e8f0', 1); ln(33, 19, 20, 0, '#e2e8f0', 1);
    q(18, -1, 40, 2, '#cbd5e1'); q(18, -1, 40, 1, '#ffffff66');
    pg([[56, -3], [64, 0], [56, 3]], '#f1f5f9');
    q(18, -3, 4, 6, '#ef4444');
    bx(8, 4, 5, 8, '#3a2814');
    if (fl) { q(60, -3, 8, 6, '#fde68a99'); }
  } else if (i === 19) {
    // 19: Siphon SMG (Bio-hazard blood-vial submachine gun)
    pg([[-9, -3], [2, -5], [2, 5], [-7, 7]], '#2a1318');
    bx(2, -5, 20, 10, '#4a1d28'); bx(22, -3, 22, 6, '#2b1a1f');
    bx(8, 5, 7, 10, '#1b0e12'); q(9, 6, 5, 2, '#ff4d6d');
    bx(9, -10, 13, 5, '#7f1d3a'); q(10, -9, 11, 3, '#ff4d6d'); q(11, -9, 4, 1, '#ffd0da');
    for (let k = 0; k < 3; k++) q(26 + k * 5, -2, 2, 4, '#ff4d6dcc');
    bx(44, -2, 6, 4, '#111');
    if (fl) { q(50, -4, 11, 8, '#ff4d6d99'); q(52, -2, 6, 4, '#fff'); }
  } else if (i === 20) {
    // 20: Glacier Breaker (Cryo scatter cannon)
    pg([[-10, -4], [3, -5], [3, 5], [-10, 7]], '#1e3a52');
    bx(3, -5, 14, 10, '#2b6c8f'); bx(17, -5, 26, 5, '#38bdf8'); bx(17, 0, 24, 5, '#0e7490');
    pg([[21, -6], [24, -13], [27, -6]], '#e0f2fe'); pg([[30, -6], [33, -11], [36, -6]], '#bae6fd');
    pg([[24, 5], [26, 10], [29, 5]], '#e0f2fe');
    bx(20, 5, 10, 5, '#0c4a6e'); q(42, -5, 3, 10, '#e0f2fe');
    q(6, -3, 8, 2, '#ffffff66');
    if (fl) { q(45, -7, 15, 14, '#9be7ffaa'); q(47, -4, 8, 8, '#fff'); }
  } else if (i === 21) {
    // 21: Hornet (Micro-rocket submachine gun)
    pg([[-8, -3], [2, -5], [2, 5], [-6, 6]], '#3a2f1e');
    bx(2, -5, 18, 10, '#52525b'); bx(20, -6, 20, 5, '#a16207'); bx(20, 1, 20, 5, '#a16207');
    pg([[40, -6], [47, -3.5], [40, -1]], '#f97316'); pg([[40, 1], [47, 3.5], [40, 6]], '#f97316');
    bx(8, 5, 8, 9, '#27272a'); q(4, -8, 10, 3, '#fbbf24'); q(24, -5, 12, 1, '#fde68a88');
    if (fl) { q(47, -5, 13, 10, '#ffb347aa'); q(49, -3, 7, 6, '#fff'); }
  } else if (i === 22) {
    // 22: Volt Carbine (arc-coil piercing carbine)
    pg([[-10, -3], [2, -5], [2, 4], [-8, 7]], '#0e7490');
    bx(2, -5, 16, 9, '#155e75');
    bx(18, -4, 28, 3, '#38bdf8'); bx(18, 1, 24, 3, '#0e7490');
    for (let k = 0; k < 4; k++) q(21 + k * 7, -8, 3, 3, '#7dd3fc');   // coil rings over the bore
    q(24, -2, 16, 1, '#e0f2fe88');
    bx(7, 4, 6, 8, '#082f49');
    q(4, -8, 10, 3, '#22d3ee');
    if (fl) { q(46, -6, 14, 12, '#38bdf8aa'); q(48, -3, 8, 6, '#fff'); }
  } else if (i === 23) {
    // 23: Siegebreaker (heavy twin-bore breach cannon)
    pg([[-12, -4], [4, -6], [4, 5], [-10, 8]], '#2f2a24');
    bx(4, -6, 22, 12, '#3f3a33');
    bx(26, -7, 26, 6, '#55504a'); bx(26, 1, 26, 6, '#3a3630');
    bx(52, -8, 5, 15, '#26231f');
    q(30, -5, 18, 1, '#ffd36b88'); q(30, 3, 18, 1, '#ffd36b88');
    bx(10, 6, 8, 8, '#1c1a17');
    q(6, -10, 12, 3, '#e8503a');
    for (let k = 0; k < 3; k++) q(8 + k * 4, -9, 2, 2, '#fbbf24');
    if (fl) { q(57, -9, 18, 18, '#ff8a4aaa'); q(60, -5, 10, 10, '#fff'); }
  } else {
    // Generic fallback
    bx(0, -4, 24, 8, '#475569'); pg([[2, 4], [8, 4], [6, 12], [0, 12]], DK);
  }

  // Active Skin Custom Overlay
  const activeSkinKey = (typeof SV !== 'undefined' && SV && SV.eqSkin && SV.eqSkin[i]) ? SV.eqSkin[i] : null;
  const skDef = activeSkinKey && typeof SKINS !== 'undefined' && SKINS[activeSkinKey] ? SKINS[activeSkinKey] : null;
  if (skDef) {
    X.save();
    if (activeSkinKey === 'ashen_assault') {
      X.fillStyle = '#ff4a22'; X.globalAlpha = ga * 0.75;
      X.fillRect(4, -5, 22, 2); X.fillRect(20, -6, 16, 2); X.fillRect(36, -4, 14, 2);
      X.strokeStyle = '#ff6b3d'; X.lineWidth = 1.5; X.strokeRect(0, -5, 20, 8);
    } else if (activeSkinKey === 'crimson_sniper') {
      X.fillStyle = '#e11d48'; X.globalAlpha = ga * 0.8;
      X.fillRect(4, -5, 18, 8); X.fillRect(22, -3, 40, 3);
      X.fillStyle = '#ff4d6d'; X.fillRect(8, -12, 28, 4);
      X.strokeStyle = '#fb7185'; X.lineWidth = 1.5; X.strokeRect(8, -13, 30, 6);
    } else if (activeSkinKey === 'volt_railgun') {
      X.fillStyle = '#facc15'; X.globalAlpha = ga * 0.85;
      X.fillRect(30, -8, 44, 4); X.fillRect(30, 4, 44, 4);
      X.fillStyle = '#00e5ff'; X.fillRect(14, -7, 16, 14);
      X.strokeStyle = '#fef08a'; X.lineWidth = 1.5; X.strokeRect(28, -9, 48, 18);
    } else if (activeSkinKey === 'gold_minigun') {
      X.fillStyle = '#fbbf24'; X.globalAlpha = ga * 0.85;
      X.fillRect(12, -8, 14, 16); X.fillRect(26, -8, 3, 16); X.fillRect(44, -8, 3, 16);
      X.fillStyle = '#fef08a'; X.fillRect(4, 9, 12, 7);
      X.strokeStyle = '#d97706'; X.lineWidth = 1.5; X.strokeRect(12, -8, 35, 16);
    } else {
      // Data-driven finish: any skin carrying col/ac plates the receiver and
      // barrel along the real weapon length (ML) instead of a fixed 22px box,
      // so long guns no longer only get a tiny patch near the grip.
      const L = (typeof ML !== 'undefined' && ML[i]) ? ML[i] : 34;
      const core = skDef.col || '#94a3b8';
      const dark = skDef.ac || '#1c1917';
      const pulse = 0.7 + Math.sin(runClock() * 8) * 0.3;
      X.globalAlpha = ga * 0.5;
      X.fillStyle = core;
      X.fillRect(2, -4.5, L * 0.56, 9);
      X.fillRect(L * 0.53, -2.2, L * 0.42, 4.4);
      X.globalAlpha = ga * 0.55;
      X.fillStyle = dark;
      X.fillRect(2, 2.6, L * 0.56, 2.2);
      X.globalAlpha = ga * 0.8 * pulse;
      X.fillStyle = '#ffffff';
      X.fillRect(6, -1.3, Math.max(8, L * 0.4), 1.6);
      X.globalAlpha = ga * 0.75;
      X.fillStyle = core;
      for (let px = 7; px < L * 0.62; px += 9) X.fillRect(px, 4.1, 3, 1.7);
      X.globalAlpha = ga * 0.7;
      X.strokeStyle = core;
      X.lineWidth = 1.4;
      X.strokeRect(1.5, -5.2, Math.min(L * 0.58, 30), 10.4);
    }
    X.restore();
  }

  // Weapon micro-details: metal wear, scratches & rivets
  X.save();
  X.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  X.lineWidth = 0.8;
  X.beginPath();
  X.moveTo(4, -3); X.lineTo(12, -2);
  X.moveTo(8, 1);  X.lineTo(15, 0);
  X.stroke();
  X.fillStyle = 'rgba(0, 0, 0, 0.35)';
  X.fillRect(5, 2, 8, 1.2);
  X.fillStyle = '#cbd5e1';
  X.fillRect(3, -2, 1, 1);
  X.fillRect(14, -2, 1, 1);
  X.restore();

  X.restore();
}

function spawnMag(x, y, aimAngle) {
  if (typeof MAG === 'undefined') return;
  const ejectionAngle = aimAngle - 1.57 + (Math.random() - 0.5) * 0.4;
  const speed = 75 + Math.random() * 50;
  MAG.push({
    x: x - Math.cos(aimAngle) * 4,
    y: y - Math.sin(aimAngle) * 4,
    vx: Math.cos(ejectionAngle) * speed,
    vy: Math.sin(ejectionAngle) * speed,
    a: Math.random() * 6.28,
    va: (Math.random() - 0.5) * 16,
    col: '#242a1e',
    l: 14
  });
  if (MAG.length > 40) MAG.shift();
}

function sndReloadStart() {
  if (typeof snd === 'function') {
    snd(380, 0.09, 'triangle', 0.08, 0.4);
    setTimeout(() => { snd(220, 0.12, 'square', 0.06, 0.5); }, 110);
  }
}

function sndReloadEnd() {
  if (typeof snd === 'function') {
    snd(460, 0.08, 'triangle', 0.07, 1.4);
    setTimeout(() => { snd(640, 0.1, 'sawtooth', 0.08, 0.8); }, 80);
  }
}

function startReload() {
  if (!run || !P || P.reloading) return;
  const w = (typeof WEAP !== 'undefined' && WEAP[P.cur]) ? WEAP[P.cur] : { mag: 12, rl: 1.2 };
  const maxA = w.mag || 12;
  if (P.ammo >= maxA) return;
  P.reloading = true;
  P.reloadDuration = (w.rl || 1.2) * ((typeof S !== 'undefined' && S && S.fastReload) ? 0.75 : 1);
  P.reloadTimer = P.reloadDuration;
  sndReloadStart();
  spawnMag(P.x, P.y, P.a);
}

const CI_CACHE = {};
// Keyed on the class AND everything the body renderer reads (equipped operative
// skin, survivor suit tint). Keying on the class alone meant a card kept showing
// the suit you had on when it was first drawn, so equipping an operative skin
// never changed the HERO tab.
function clsIcon(ci, wi = 0) {
  const k = ci + '_' + wi + '_' + (SV && SV.eqOpSkin ? SV.eqOpSkin : '-') + '_' + (typeof PC !== 'undefined' ? PC : '');
  if (CI_CACHE[k]) return CI_CACHE[k];
  const cv = document.createElement('canvas');
  cv.width = 220;
  cv.height = 128;
  const cx = cv.getContext('2d');
  withCtx(cx, () => {
    X.save();
    X.translate(50, 64);
    X.scale(1.7, 1.7);
    if (typeof bodyBack === 'function') bodyBack(ci);
    if (typeof gun === 'function') gun(wi, 0);
    if (typeof bodyFront === 'function') bodyFront(ci);
    X.restore();
  });
  return CI_CACHE[k] = cv.toDataURL();
}

// Drop the cached body sprites whenever the look changes. The cache key already
// separates looks; this just stops it growing without bound over a long session.
function resetCharacterIconCache() {
  for (const key in CI_CACHE) delete CI_CACHE[key];
}

