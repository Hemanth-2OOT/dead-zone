/* === DATA: WEAPONS, CLASSES, SKILLS, RELICS, PERKS, SKINS & EVENTS === */

const WEAP = [
  // `rng` is how far a round actually travels, in pixels: the projectile step
  // converts it to a lifetime via the muzzle velocity, so a pistol no longer
  // throws a slug the length of three screens while a sniper still reaches out.
  { n: 'Pistol', d: 20, r: 0.32, sp: 0.055, p: 1, c: 0, kb: 0.85, mag: 12, rl: 1.1, tier: 'COMMON', rng: 260 },
  { n: 'SMG', d: 9.5, r: 0.10, sp: 0.11, p: 1, c: 300, kb: 0.45, mag: 30, rl: 1.2, tier: 'UNCOMMON', rng: 240 },
  { n: 'Shotgun', d: 11, r: 0.62, sp: 0.24, p: 8, c: 500, kb: 0.6, mag: 8, rl: 1.5, tier: 'UNCOMMON', rng: 160 },
  { n: 'Rifle', d: 30, r: 0.20, sp: 0.02, p: 1, c: 700, kb: 0.95, mag: 25, rl: 1.3, tier: 'RARE', rng: 380 },
  { n: 'Minigun', d: 10, r: 0.075, sp: 0.16, p: 1, c: 1500, kb: 0.2, mag: 100, rl: 2.4, tier: 'EPIC', rng: 250 },
  { n: 'Revolver', d: 68, r: 0.60, sp: 0.02, p: 1, c: 400, kb: 1.6, mag: 6, rl: 1.45, tier: 'COMMON', rng: 330 },
  { n: 'Assault', d: 16, r: 0.095, sp: 0.05, p: 1, c: 900, kb: 0.7, mag: 30, rl: 1.3, tier: 'RARE', rng: 350 },
  { n: 'Sniper', d: 195, r: 1.05, sp: 0, p: 1, c: 1200, pr: 3, rg: 1.15, kb: 2.2, mag: 5, rl: 1.9, tier: 'EPIC', rng: 1150 },
  { n: 'Plasma', d: 34, r: 0.14, sp: 0.025, p: 1, c: 2500, pr: 2, kb: 0.85, mag: 20, rl: 1.5, tier: 'LEGENDARY', rng: 430 },
  { n: 'Rocket', d: 175, r: 0.95, sp: 0.01, p: 1, c: 3000, ex: 115, kb: 2.5, mag: 4, rl: 2.0, tier: 'LEGENDARY', rng: 820 },
  { n: 'Flamer', d: 8.5, r: 0.065, sp: 0.22, p: 2, c: 1800, rg: 0.24, flm: 1, kb: 0.12, mag: 50, rl: 1.7, tier: 'EPIC', rng: 95 },
  { n: 'Tesla', d: 62, r: 0.30, sp: 0, p: 1, c: 3500, pr: 3, cl: 3, kb: 0.75, mag: 15, rl: 1.6, tier: 'LEGENDARY', rng: 500 },
  { n: 'GL-40', d: 135, r: 0.90, sp: 0.03, p: 1, c: 2800, ex: 95, kb: 1.9, mag: 6, rl: 1.8, tier: 'EPIC', rng: 620 },
  { n: 'Cryo Blaster', d: 24, r: 0.13, sp: 0.025, p: 1, c: 3400, fz: 1, kb: 0.7, mag: 24, rl: 1.4, tier: 'LEGENDARY', rng: 310 },
  { n: 'Railgun', d: 340, r: 1.40, sp: 0, p: 1, c: 4200, pr: 10, rg: 1.35, kb: 2.8, mag: 3, rl: 2.3, tier: 'LEGENDARY', rng: 1250 },
  { n: 'Dual Pistols', d: 13, r: 0.16, sp: 0.04, p: 2, c: 350, kb: 0.55, mag: 24, rl: 1.3, tier: 'UNCOMMON', rng: 230 },
  { n: 'Burst Rifle', d: 22, r: 0.38, sp: 0.015, p: 3, c: 850, kb: 0.75, mag: 24, rl: 1.4, tier: 'RARE', rng: 400 },
  { n: 'Arc Shotgun', d: 24, r: 0.65, sp: 0.22, p: 6, c: 3800, cl: 1, kb: 0.7, mag: 10, rl: 1.6, tier: 'LEGENDARY', rng: 175 },
  { n: 'Crossbow', d: 84, r: 0.62, sp: 0, p: 1, c: 650, pr: 2, rg: 0.9, kb: 1.3, mag: 6, rl: 1.7, tier: 'RARE', rng: 520 },
  { n: 'Siphon SMG', d: 13, r: 0.085, sp: 0.09, p: 1, c: 1900, ls: 1, kb: 0.4, mag: 36, rl: 1.3, tier: 'EPIC', rng: 245 },
  { n: 'Glacier Breaker', d: 20, r: 0.72, sp: 0.2, p: 6, c: 2600, fz: 1, rg: 0.42, kb: 0.8, mag: 8, rl: 1.7, tier: 'EPIC', rng: 210 },
  { n: 'Hornet', d: 34, r: 0.23, sp: 0.05, p: 1, c: 2600, ex: 48, kb: 0.9, mag: 18, rl: 1.5, tier: 'EPIC', rng: 440 }
];

// Weapons are no longer bought: each unlocks automatically once the account
// reaches its rank. One new gun every rank or two, so the arsenal still opens
// up over time without a shop to visit.
const WEAP_RANK = [0,3,4,6,9,2,7,20,11,15,12,16,14,17,22,1,8,19,5,10,13,18];

/* ---- Weapon tier policy ------------------------------------------------
   One table decides what a tier is worth, so the armoury, the HUD and the
   regression tests share a definition instead of each carrying its own idea of
   what "EPIC" means. `dps` is *sustained* damage per second with reloads
   included (the honest number in a survival arena, where every magazine ends in
   a reload), `shot` is damage per trigger pull for a single-pellet weapon,
   `mag`/`rl` are the magazine and reload windows, `spread` is the muzzle cone.
   Bands are nested: every higher tier overlaps the one below it but reaches
   further, so an upgrade is always an upgrade. */
const TIER_POLICY = {
  COMMON:    { dps: [45, 85],   shot: [8, 70],   mag: [6, 24],  rl: [0.9, 1.5], spread: [0, 0.14] },
  UNCOMMON:  { dps: [65, 125],  shot: [8, 80],   mag: [6, 36],  rl: [1.0, 1.6], spread: [0, 0.25] },
  RARE:      { dps: [90, 155],  shot: [12, 90],  mag: [5, 30],  rl: [1.1, 1.8], spread: [0, 0.30] },
  EPIC:      { dps: [95, 185],  shot: [10, 200], mag: [5, 60],  rl: [1.2, 2.1], spread: [0, 0.35] },
  LEGENDARY: { dps: [115, 200], shot: [13, 350], mag: [3, 50],  rl: [1.3, 2.5], spread: [0, 0.35] }
};

// Weapons that are defined by breaking their tier's band. Declaring them keeps
// the validator honest - it still fails on accidental drift, but a deliberate
// outlier is stated here instead of loosening the band for every other gun.
const WEAP_TIER_EXCEPTIONS = {
  4: { fields: ['mag', 'rl'], why: 'Minigun: the 100-round belt and its heavy 2.4s reload are the whole point of the gun' }
};

// Derived stats for a weapon index. Everything the player is shown about a gun
// comes from here, so a change to WEAP can never leave the HUD stale.
function weaponStats(i) {
  const w = WEAP[i] || WEAP[0];
  const mag = w.mag || 12;
  const rl = w.rl || 1.2;
  const rate = Math.max(0.02, w.r || 0.3);
  const pellets = w.p || 1;
  const shot = w.d * pellets;
  const cycle = mag * rate + rl;
  return {
    tier: w.tier || 'COMMON',
    pellets,
    mag,
    reload: rl,
    rate,
    spread: w.sp || 0,
    shot,
    dps: (mag * shot) / cycle
  };
}

// The tier ladder itself: floors and ceilings must rise with the tier, so an
// upgrade is always an upgrade. Returns [] when the ladder is sound.
function tierLadderIssues() {
  const order = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  const issues = [];
  for (let i = 1; i < order.length; i++) {
    const lo = TIER_POLICY[order[i - 1]], hi = TIER_POLICY[order[i]];
    if (hi.dps[0] <= lo.dps[0]) issues.push(order[i] + ' dps floor ' + hi.dps[0] + ' does not exceed ' + order[i - 1] + ' ' + lo.dps[0]);
    if (hi.dps[1] <= lo.dps[1]) issues.push(order[i] + ' dps ceiling ' + hi.dps[1] + ' does not exceed ' + order[i - 1] + ' ' + lo.dps[1]);
    if (hi.shot[1] <= lo.shot[1]) issues.push(order[i] + ' shot ceiling ' + hi.shot[1] + ' does not exceed ' + order[i - 1] + ' ' + lo.shot[1]);
  }
  // The real table has to obey the ladder too: the weakest gun of a tier must
  // out-perform the weakest gun of the tier below it.
  const minDps = {};
  WEAP.forEach((w, i) => {
    const st = weaponStats(i);
    minDps[st.tier] = (minDps[st.tier] == null) ? st.dps : Math.min(minDps[st.tier], st.dps);
  });
  for (let i = 1; i < order.length; i++) {
    const a = minDps[order[i - 1]], b = minDps[order[i]];
    if (a != null && b != null && b <= a) {
      issues.push('weakest ' + order[i] + ' (' + Math.round(b * 10) / 10 + ' dps) is not stronger than the weakest ' + order[i - 1] + ' (' + Math.round(a * 10) / 10 + ' dps)');
    }
  }
  return issues;
}

// Every weapon that falls outside its own tier's band. Used by the build-time
// regression pass so a future stat edit cannot silently break the ladder.
function weaponTierIssues() {
  const issues = [];
  const inBand = (v, b) => v >= b[0] - 1e-9 && v <= b[1] + 1e-9;
  WEAP.forEach((w, i) => {
    const st = weaponStats(i);
    const pol = TIER_POLICY[st.tier];
    if (!pol) { issues.push({ i, n: w.n, why: 'unknown tier ' + st.tier }); return; }
    const fields = [
      ['dps', Math.round(st.dps * 10) / 10],
      ['shot', st.pellets > 1 ? 0 : w.d],
      ['mag', st.mag],
      ['rl', st.reload],
      ['spread', st.spread]
    ];
    for (const [k, v] of fields) {
      if (k === 'shot' && v === 0) continue;
      const ex = WEAP_TIER_EXCEPTIONS[i];
      if (ex && ex.fields.indexOf(k) !== -1) continue;
      if (!inBand(v, pol[k])) issues.push({ i, n: w.n, tier: st.tier, why: k + ' ' + v + ' outside [' + pol[k] + ']' });
    }
  });
  return issues;
}


const TIER_COLORS = {
  'COMMON': '#64748b',
  'UNCOMMON': '#22c55e',
  'RARE': '#38bdf8',
  'EPIC': '#a855f7',
  'LEGENDARY': '#f59e0b'
};

// Enemy roster. HP and contact damage were raised across the board: the player's
// damage compounds multiplicatively (perk stacks, crit, class, weapon mastery)
// while enemy health grew slowly, so the horde became paper past the opening
// waves. Chaff gained the most (~+30%, so a basic walker is never a one-tap),
// bruisers less (~+25%), and contact damage went up ~25% so enemies threaten
// without becoming a one-shot for a 100 HP operative.
const ZT = {
  walk: { hp: 58, s: 55, spd: 55, r: 13, col: '#6f8f4a', dm: 10, dmg: 10, cash: 10, kb: 1.0 },
  run: { hp: 40, s: 115, spd: 115, r: 11, col: '#a8a04a', dm: 8, dmg: 8, cash: 14, kb: 1.1 },
  tank: { hp: 300, s: 38, spd: 38, r: 22, col: '#7a4a4a', dm: 22, dmg: 22, cash: 55, kb: 0.25 },
  exp: { hp: 46, s: 90, spd: 90, r: 12, col: '#d0702a', dm: 0, dmg: 0, cash: 22, kb: 1.0 },
  spit: { hp: 74, s: 58, spd: 58, r: 12, col: '#4fb04a', dm: 8, dmg: 8, cash: 30, kb: 0.95 },
  stalker: { hp: 78, s: 82, spd: 82, r: 12, col: '#3e5f52', dm: 15, dmg: 15, cash: 25, stk: 1, kb: 0.85 },
  charger: { hp: 200, s: 45, spd: 45, r: 18, col: '#8a4828', dm: 20, dmg: 20, cash: 35, chg: 1, kb: 0.35 },
  boss: { hp: 5000, s: 48, spd: 48, r: 34, col: '#8a2f2f', dm: 40, dmg: 40, cash: 350, kb: 0.08 },
  // v2.7 support & specialist roster. Each new type owns a distinct tactical
  // job so encounters read logically instead of "more of the same walker".
  crawler: { hp: 42, s: 132, spd: 132, r: 9, col: '#93a24e', dm: 6, dmg: 6, cash: 12, kb: 1.3, crawl: 1 },
  bloater: { hp: 220, s: 33, spd: 33, r: 19, col: '#6d7a38', dm: 0, dmg: 0, cash: 42, kb: 0.28, blo: 1 },
  armored: { hp: 250, s: 50, spd: 50, r: 17, col: '#59626b', dm: 17, dmg: 17, cash: 48, kb: 0.4, arm: 1 },
  screamer: { hp: 100, s: 72, spd: 72, r: 13, col: '#a2597f', dm: 8, dmg: 8, cash: 30, kb: 0.9, scr: 1 },
  shielder: { hp: 160, s: 62, spd: 62, r: 15, col: '#3d5c7d', dm: 10, dmg: 10, cash: 44, kb: 0.7, shd: 1 },
  necromancer: { hp: 380, s: 42, spd: 42, r: 20, col: '#3a2a4a', dm: 13, dmg: 13, cash: 95, kb: 0.2, nec: 1 }
};
ZT.walker = ZT.walk;
ZT.runner = ZT.run;
ZT.brute = ZT.tank;
ZT.exploder = ZT.exp;
ZT.spitter = ZT.spit;

const ML = [36, 46, 60, 64, 60, 39, 62, 84, 56, 78, 60, 70, 54, 62, 86, 40, 66, 58, 62, 52, 48, 50];
const GL = {
  5: [24, 6, '#9a9a9a'],
  6: [46, 8, '#6a5a3c'],
  7: [64, 6, '#3c4a5a'],
  8: [52, 12, '#4b5563'],
  9: [68, 12, '#5a6a3c'],
  11: [56, 12, '#303850'],
  13: [52, 14, '#2e4254'],
  14: [74, 16, '#1c2432']
};
const WC = ['#ffe08a', '#ffb347', '#ff9a4a', '#9be7ff', '#ff5a3a', '#ffd36b', '#ff7a4a', '#9be7ff', '#5ae0ff', '#ff4a2a', '#ffaa33', '#00e5ff', '#ff9a4a', '#a6f0ff', '#ffe640', '#ffe08a', '#ffb347', '#00e5ff', '#d9c58a', '#ff4d6d', '#9be7ff', '#ffb347'];

const CL = [
  { n: 'Infantry', hp: 100, spd: 175, dm: 1, crit: 0.05, d: 'Standard frontline operator. Balanced mobility and firepower.', sk: ['dash', 'gren', 'turret'], pk: '#4a5738', ac: '#7a8e5a', hm: '#364024', vz: '#ffd36b' },
  { n: 'Commando', hp: 130, spd: 155, dm: 1.15, crit: 0.04, d: 'Heavy assault specialist. Increased health and weapon damage.', sk: ['rage', 'gren', 'nova'], pk: '#3a2a22', ac: '#8e4a30', hm: '#281c16', vz: '#ff5a3a' },
  { n: 'Scout', hp: 80, spd: 215, dm: 0.9, crit: 0.12, d: 'Rapid recon agent. Extreme speed, high critical chance, lower HP.', sk: ['dash', 'frost', 'cloak'], pk: '#28383a', ac: '#4a7a8e', hm: '#162428', vz: '#5ae0ff' },
  { n: 'Juggernaut', hp: 170, spd: 130, dm: 1.1, crit: 0.02, d: 'Walking tank. Absorbs massive punishment with heavy armor.', sk: ['shield', 'nova', 'heal'], pk: '#222830', ac: '#506078', hm: '#141820', vz: '#ffd84a' },
  { n: 'Spec-Ops', hp: 95, spd: 190, dm: 1.05, crit: 0.08, d: 'Black-ops infiltrator. Tactical skills and high adaptability.', sk: ['cloak', 'bolt', 'meteor'], pk: '#1e1c24', ac: '#6a5a8e', hm: '#141218', vz: '#be8cff' }
];

const SKN = {
  dash: 'DASH', nova: 'NOVA', rage: 'RAGE', gren: 'GRENADE', turret: 'TURRET',
  heal: 'FIELD HEAL', cloak: 'CLOAK', bolt: 'STORM BOLT', frost: 'FROST BURST',
  meteor: 'METEOR', shield: 'AEGIS SHIELD'
};

const SKL = [
  ['mx', 'Vitality', '+10 Max HP per rank'],
  ['spd', 'Agility', '+4% Move Speed per rank'],
  ['dm', 'Firepower', '+5% Damage per rank'],
  ['rof', 'Trigger Work', '+6% Fire Rate per rank'],
  ['crit', 'Deadly Aim', '+4% Critical Chance per rank'],
  ['vamp', 'Life Leech', '+0.5 HP per kill per rank'],
  ['regen', 'Cellular Repair', '+0.4 HP/sec regeneration per rank'],
  ['cb', 'Scavenger', '+10% Credit bonus per rank'],
  ['xpb', 'Tactical Training', '+8% XP gain per rank']
];

const BN = ['BRUTE', 'NECROMANCER', 'SPITTER QUEEN', 'JUGGERNAUT'];

// v2.7 ELITE AFFIXES. Elites (the gold dashed ring) used to be nothing but a
// 3.5x HP sack - the same fight, longer. Each elite now rolls one affix that
// changes how it must be killed, which is what makes a random elite worth
// reacting to. Index order is stable: world/render logic reads z.aff by index.
const ELITE_AFFIX = [
  { id: 'regen',    n: 'REGEN',    col: '#4ade80', hpRegen: 0.045 },
  { id: 'swift',    n: 'SWIFT',    col: '#38bdf8', spMul: 1.35 },
  { id: 'volatile', n: 'VOLATILE', col: '#fb923c' },
  { id: 'split',    n: 'SPLITTER', col: '#c084fc' }
];

const AR = [
  ['Vampire Fang', '+1 HP per kill', 700, () => S.ls = (S.ls || 0) + 1, '#d9453a'],
  ['Storm Crown', 'Storm Caller I', 1200, () => S.sc = (S.sc || 0) + 1, '#9be7ff'],
  ['Phoenix Feather', 'Revive once per run', 1800, () => S.ph = (S.ph || 0) + 1, '#ffb347'],
  ['Frost Heart', 'Frost Aura I', 900, () => S.fa = (S.fa || 0) + 1, '#9be7ff'],
  ['Soul Lantern', 'Soul Harvest I', 1000, () => S.so = (S.so || 0) + 1, '#c9a6ff'],
  ['Lucky Coin', 'Lucky Charm II', 800, () => S.lk = (S.lk || 0) + 2, '#e0b83a'],
  ['Spirit Blade', '+1 orbiting blade', 1100, () => S.ob = (S.ob || 0) + 1, '#c9a6ff'],
  ['Ember Core', 'Immolation I', 900, () => S.fi = (S.fi || 0) + 1, '#ff9a3a'],
  ['Arcane Tome', 'Arcane Missiles I', 1300, () => S.am = (S.am || 0) + 1, '#c9a6ff'],
  ['Titan Heart', '+40 max HP', 800, () => { P.mx += 40; P.hp += 40; }, '#8fae4a'],
  ['Plasma Core', 'Nano Swarm I & +15% ROF', 1600, () => { S.ns = (S.ns || 0) + 1; S.rf = (S.rf || 1) * 1.15; }, '#00e5ff'],
  ['Aegis Ward', 'Barrier I & +30 HP', 1400, () => { S.bl = (S.bl || 0) + 1; S.bc = (S.bc || 0) + 1; P.mx += 30; P.hp += 30; }, '#be8cff'],
  ['Chrono Shard', 'Time Warp I & +10% move speed', 1500, () => { S.tw = (S.tw || 0) + 1; S.ms = (S.ms || 1) * 1.1; }, '#6ee7b7'],
  ['Toxic Catalyst', 'Venom Rounds I & +10% damage', 1250, () => { S.pv = (S.pv || 0) + 1; S.dm = (S.dm || 1) * 1.1; }, '#7be04a'],
  ['Deflector Ring', '35% chance to reflect projectiles', 1350, () => S.kd = (S.kd || 0) + 1, '#60a5fa'],
  ['Berserker Ring', 'Berserker I & +15 max HP', 1150, () => { S.bk = (S.bk || 0) + 1; P.mx += 15; P.hp += 15; }, '#ff5a3a']
];

const PKS = [
  ['Power Shot', '+20% damage', () => S.dm = (S.dm || 1) * 1.2, 6, '#ef4444', 'PERK'],
  ['Rapid Fire', '+15% fire rate', () => S.rf = (S.rf || 1) * 1.15, 6, '#ffd36b', 'PERK'],
  ['Double Barrel', '+1 projectile per shot', () => S.xp2 = (S.xp2 || 0) + 1, 3, '#38bdf8', 'PERK'],
  ['Piercing Rounds', 'Bullets pierce +1 zombie', () => S.pc = (S.pc || 0) + 1, 3, '#a855f7', 'PERK'],
  ['Explosive Rounds', 'Bullets explode on impact', () => S.eb = 1, 1, '#f97316', 'ULTIMATE'],
  ['Sharpshooter', '+8% crit chance', () => S.ct = (S.ct || 0) + 0.08, 5, '#eab308', 'PERK'],
  ['Iron Body', '+25 max HP and heal', () => { P.mx += 25; P.hp += 25; }, 5, '#22c55e', 'PERK'],
  ['Second Wind', 'Regenerate 1.5 HP/s', () => S.rg = (S.rg || 0) + 1.5, 3, '#86efac', 'PERK'],
  ['Bloodthirst', '+1 HP per kill', () => S.ls = (S.ls || 0) + 1, 3, '#f43f5e', 'PERK'],
  ['Adrenaline', '+10% move speed', () => S.ms = (S.ms || 1) * 1.1, 4, '#06b6d4', 'PERK'],
  ['Kevlar', '-10% damage taken', () => S.ar = (S.ar || 1) * 0.9, 4, '#64748b', 'PERK'],
  ['Quick Skills', 'Skills recharge 20% faster', () => S.cd2 = (S.cd2 || 1) * 1.2, 3, '#818cf8', 'PERK'],
  ['Magnet', 'Wider pickup range', () => S.mg = (S.mg || 1) + 0.7, 3, '#c084fc', 'PERK'],
  ['Gold Rush', '+25% cash from kills', () => S.cm = (S.cm || 1) + 0.25, 3, '#fbbf24', 'PERK'],
  ['Grenadier', '+4 grenades', () => S.gr = (S.gr || 0) + 4, 3, '#f97316', 'PERK'],
  ['✦ Chain Lightning', 'Bullets arc to nearby zombies', () => S.cl = (S.cl || 0) + 1, 3, '#9be7ff', 'SPECIAL'],
  ['✦ Frost Aura', 'Zombies near you are slowed', () => S.fa = (S.fa || 0) + 1, 3, '#9be7ff', 'SPECIAL'],
  ['✦ Immolation', 'Burn every zombie close to you', () => S.fi = (S.fi || 0) + 1, 3, '#ff9a3a', 'SPECIAL'],
  ['✦ Spectral Blades', '+1 orbiting spirit blade', () => S.ob = (S.ob || 0) + 1, 4, '#c9a6ff', 'SPECIAL'],
  ['✦ Meteor Rain', 'Meteors crash onto the horde', () => S.mt = (S.mt || 0) + 1, 3, '#ff7a3a', 'SPECIAL'],
  ['✦ Arcane Barrier', 'Absorb a hit, recharges in 12s', () => { S.bl = (S.bl || 0) + 1; S.bc = (S.bc || 0) + 1; }, 3, '#be8cff', 'SPECIAL'],
  ['✦ Shadow Step', 'Dashing damages zombies you pass', () => S.sd = (S.sd || 0) + 1, 3, '#9a7aff', 'SPECIAL'],
  ['✦ Phoenix', 'Revive once at half HP with a fire blast', () => S.ph = (S.ph || 0) + 1, 1, '#ffb347', 'ULTIMATE'],
  ['✦ Storm Caller', 'Lightning strikes random zombies', () => S.sc = (S.sc || 0) + 1, 3, '#9be7ff', 'SPECIAL'],
  ['✦ Venom Rounds', 'Bullets poison zombies over time', () => S.pv = (S.pv || 0) + 1, 3, '#7be04a', 'SPECIAL'],
  ['✦ Soul Harvest', 'Every few kills release a soul blast', () => S.so = (S.so || 0) + 1, 3, '#c9a6ff', 'SPECIAL'],
  ['✦ Thorns', 'Hits on you blast attackers away', () => S.th = (S.th || 0) + 1, 3, '#ff7a5a', 'SPECIAL'],
  ['✦ Berserker', 'More damage the lower your HP', () => S.bk = (S.bk || 0) + 1, 3, '#ff5a3a', 'SPECIAL'],
  ['✦ Time Warp', 'All zombies move 12% slower', () => S.tw = (S.tw || 0) + 1, 3, '#9be7ff', 'SPECIAL'],
  ['✦ Executioner', 'Execute weakened zombies', () => S.xe = (S.xe || 0) + 1, 3, '#ff4a3a', 'SPECIAL'],
  ['✦ Lucky Charm', 'More chests and free powers', () => S.lk = (S.lk || 0) + 1, 3, '#e0b83a', 'SPECIAL'],
  ['✦ Arcane Missiles', 'Homing missiles hit nearest zombies', () => S.am = (S.am || 0) + 1, 3, '#c9a6ff', 'SPECIAL'],
  ['✦ Bloodlust', 'Kills boost your fire rate briefly', () => S.bz = (S.bz || 0) + 1, 3, '#ff5a3a', 'SPECIAL'],
  ['✦ Volatile Corpses', 'Dead zombies may explode', () => S.vc = (S.vc || 0) + 1, 3, '#ff9a3a', 'SPECIAL'],
  ['✦ Kill Rush', 'Kills speed up skill cooldowns', () => S.hs = (S.hs || 0) + 1, 3, '#9be7ff', 'SPECIAL'],
  ['✦ Overcharge', 'Every few shots deal triple damage', () => S.oc = (S.oc || 0) + 1, 3, '#ffd36b', 'SPECIAL'],
  ['✦ Guardian Angel', 'Heal 30% when near death', () => S.ga = (S.ga || 0) + 1, 2, '#8fd06a', 'SPECIAL'],
  ['✦ Fragmentation', 'Bullets burst into shards on impact', () => S.fr = (S.fr || 0) + 1, 2, '#ff9a3a', 'SPECIAL'],
  ['✦ Glass Cannon', '+40% damage, -20% max HP', () => { S.dm = (S.dm || 1) * 1.4; P.mx = Math.max(40, Math.round(P.mx * 0.8)); P.hp = Math.min(P.hp, P.mx); }, 1, '#ff4a3a', 'ULTIMATE'],
  ['✦ Nano Swarm', 'Drones seek and shred nearby zombies', () => S.ns = (S.ns || 0) + 1, 3, '#00e5ff', 'SPECIAL']
];

const RANK_MILESTONES = [
  { r: 2,  cr: 250,  label: 'FIELD COMMISSION' },
  { r: 4,  cr: 400,  label: 'SUPPLY CACHE' },
  { r: 6,  cr: 600,  label: 'VETERAN PACK' },
  { r: 8,  cr: 900,  label: 'ARSENAL GRANT' },
  { r: 10, cr: 1300, label: 'SECTOR CLEARANCE' },
  { r: 12, cr: 1700, label: 'ELITE COMMISSION' },
  { r: 15, cr: 2200, label: 'GHOST PROTOCOL' },
  { r: 20, cr: 3200, label: 'OVERLORD CLEARANCE' },
  { r: 25, cr: 4500, label: 'DEAD ZONE LEGEND' },
  { r: 30, cr: 6500, label: 'APEX OPERATIVE' }
];

const SKINS = {
  // Weapon Skins
  ashen_assault: { id: 'ashen_assault', type: 'weap', name: 'Ashen Vanguard', wi: 6, wName: 'Assault Rifle', col: '#ff4a22', desc: 'Smoldering volcanic ash finish with ember muzzle flash & tracer.', tagCol: '#ff5a3a', how: 'Complete Operation Last Stand (Events)', tier: 'EPIC' },
  crimson_sniper: { id: 'crimson_sniper', type: 'weap', name: 'Crimson Eclipse', wi: 7, wName: 'Sniper Rifle', col: '#e11d48', desc: 'Anodized crimson casing with blood-red supersonic tracer.', tagCol: '#f43f5e', how: 'Complete Operation Elite Hunt (Events)', tier: 'EPIC' },
  volt_railgun: { id: 'volt_railgun', type: 'weap', name: 'Cyberpunk Volt', wi: 14, wName: 'Heavy Railgun', col: '#facc15', desc: 'High-voltage overclocked frame with electric yellow discharge.', tagCol: '#00e5ff', how: 'Complete Operation Heavy Metal (Events)', tier: 'LEGENDARY' },
  gold_minigun: { id: 'gold_minigun', type: 'weap', name: 'Golden Legion', wi: 4, wName: 'Minigun', col: '#fbbf24', desc: 'Prestigious gilded rotary cannon for 10-day frontier veterans.', tagCol: '#e0b83a', how: 'Claim Day 10 Login Reward', tier: 'LEGENDARY' },
  toxic_shotgun: { id: 'toxic_shotgun', type: 'weap', name: 'Toxic Hazard', wi: 2, wName: 'Shotgun', col: '#22c55e', desc: 'Caustic bio-hazard plating with irradiated spread.', tagCol: '#22c55e', how: 'Survive Wave 15 in Toxic Swamp', tier: 'RARE' },
  neon_plasma: { id: 'neon_plasma', type: 'weap', name: 'Neon Overdrive', wi: 8, wName: 'Plasma', col: '#00e5ff', desc: 'Cybernetic turquoise energy battery with luminous discharge.', tagCol: '#00e5ff', how: 'Survive Wave 20 in Neon Lab', tier: 'LEGENDARY' },
  dragon_flamer: { id: 'dragon_flamer', type: 'weap', name: 'Dragon Breath', wi: 10, wName: 'Flamer', col: '#ff5722', desc: 'Obsidian dragon scale casing with roaring inferno burst.', tagCol: '#ff5722', how: 'Survive Wave 20 in Ashlands', tier: 'EPIC' },
  stealth_smg: { id: 'stealth_smg', type: 'weap', name: 'Shadow Ghost', wi: 1, wName: 'SMG', col: '#94a3b8', desc: 'Matte suppressed composite frame for covert operations.', tagCol: '#94a3b8', how: 'Recruit Spec-Ops Operator', tier: 'RARE' },

  // Operative Skins
  ghost_specops: { id: 'ghost_specops', type: 'op', name: 'Ghost Recon', ci: 4, col: '#00e5ff', ac: '#334155', hm: '#1e293b', vz: '#00e5ff', pk: '#0f172a', desc: 'Shadow stealth armor with thermal scanning cyan visor.', tagCol: '#00e5ff', how: 'Complete Operation Elite Hunt', tier: 'LEGENDARY' },
  cyber_juggernaut: { id: 'cyber_juggernaut', type: 'op', name: 'Cyber Enforcer', ci: 3, col: '#f59e0b', ac: '#b45309', hm: '#78350f', vz: '#fbbf24', pk: '#451a03', desc: 'Reinforced cybernetic exo-suit with high-voltage visor.', tagCol: '#f59e0b', how: 'Survive Wave 25 in Downtown', tier: 'EPIC' },
  hazmat_scout: { id: 'hazmat_scout', type: 'op', name: 'Biohazard Scout', ci: 2, col: '#84cc16', ac: '#4d7c0f', hm: '#365314', vz: '#a3e635', pk: '#1a2e05', desc: 'Chemical containment suit with toxin filter respirator.', tagCol: '#84cc16', how: 'Survive Wave 15 in Toxic Swamp', tier: 'RARE' },
  arctic_commando: { id: 'arctic_commando', type: 'op', name: 'Arctic Frost', ci: 1, col: '#38bdf8', ac: '#0369a1', hm: '#0c4a6e', vz: '#7dd3fc', pk: '#082f49', desc: 'Sub-zero insulated tactical armor with frost-resistant optics.', tagCol: '#38bdf8', how: 'Survive Wave 15 in Frozen Peak', tier: 'RARE' },
  desert_infantry: { id: 'desert_infantry', type: 'op', name: 'Desert Vanguard', ci: 0, col: '#eab308', ac: '#a16207', hm: '#713f12', vz: '#fde047', pk: '#422006', desc: 'Dune-camo heavy field uniform with sandstorm goggles.', tagCol: '#eab308', how: 'Survive Wave 15 in Dust Bowl', tier: 'COMMON' },
  blood_hunter: { id: 'blood_hunter', type: 'op', name: 'Crimson Hunter', ci: 0, col: '#ef4444', ac: '#991b1b', hm: '#450a0a', vz: '#f87171', pk: '#2d0606', desc: 'Ceremonial crimson battle armor worn by veteran zombie slayers.', tagCol: '#ef4444', how: 'Survive 50 Total Cumulative Waves', tier: 'EPIC' },

  // Milestone skins - unlocked automatically by the rule engine in
  // engine_meta.js (rk = lifetime stat key, rg = goal, rf = custom counter).
  wasteland_rifle: { id: 'wasteland_rifle', type: 'weap', name: 'Wasteland Rust', wi: 3, wName: 'Rifle', col: '#b45309', ac: '#78350f', desc: 'Oxidised scrap plating with a scavenged iron sight.', tagCol: '#d97706', how: 'Eliminate 500 infected (lifetime)', tier: 'RARE', rk: 'kills', rg: 500 },
  frostbite_cryo: { id: 'frostbite_cryo', type: 'weap', name: 'Frostbite Core', wi: 13, wName: 'Cryo Blaster', col: '#7dd3fc', ac: '#0369a1', desc: 'Sub-zero coolant loop that frosts the barrel between bursts.', tagCol: '#38bdf8', how: 'Reach wave 25 in a single run', tier: 'EPIC', rk: 'highestWave', rg: 25 },
  golden_revolver: { id: 'golden_revolver', type: 'weap', name: 'Marshal Gold', wi: 5, wName: 'Revolver', col: '#fbbf24', ac: '#92400e', desc: 'Hand-tooled gilded cylinder reserved for titan hunters.', tagCol: '#e0b83a', how: 'Eliminate 5 bosses (lifetime)', tier: 'LEGENDARY', rk: 'bosses', rg: 5 },
  storm_tesla: { id: 'storm_tesla', type: 'weap', name: 'Storm Coil', wi: 11, wName: 'Tesla', col: '#60a5fa', ac: '#1d4ed8', desc: 'Supercharged coil array with a crawling blue arc discharge.', tagCol: '#00e5ff', how: 'Eliminate 50 elites (lifetime)', tier: 'RARE', rk: 'elites', rg: 50 },
  plague_rocket: { id: 'plague_rocket', type: 'weap', name: 'Plague Lance', wi: 9, wName: 'Rocket', col: '#65a30d', ac: '#3f6212', desc: 'Bio-warhead launcher leaking a sickly green exhaust plume.', tagCol: '#84cc16', how: 'Clear 300 waves in total', tier: 'EPIC', rk: 'waves', rg: 300 },
  sanguine_siphon: { id: 'sanguine_siphon', type: 'weap', name: 'Sanguine Draw', wi: 19, wName: 'Siphon SMG', col: '#9f1239', ac: '#4c0519', desc: 'Dark maroon frame that pulses red on every siphon tick.', tagCol: '#be123c', how: 'Complete 10 runs', tier: 'RARE', rk: 'runs', rg: 10 },
  swarm_hornet: { id: 'swarm_hornet', type: 'weap', name: 'Swarm Regent', wi: 21, wName: 'Hornet', col: '#ca8a04', ac: '#713f12', desc: 'Hive-forged carapace shell with a bone-white impact core.', tagCol: '#facc15', how: 'Reach a 50 kill combo', tier: 'EPIC', rk: 'bestCombo', rg: 50 },
  apex_glacier: { id: 'apex_glacier', type: 'weap', name: 'Apex Glacier', wi: 20, wName: 'Glacier Breaker', col: '#a5f3fc', ac: '#0e7490', desc: 'Max-mastery ice relic: the barrel never stops steaming.', tagCol: '#22d3ee', how: 'Max out mastery on any weapon', tier: 'LEGENDARY', rf: () => Object.keys((typeof SV !== 'undefined' && SV && SV.mast) || {}).filter(i => masteryLevel(+i) >= MAST_MAX).length, rg: 1 },
  nightfall_op: { id: 'nightfall_op', type: 'op', name: 'Nightfall Recon', ci: 4, col: '#6366f1', ac: '#312e81', hm: '#1e1b4b', vz: '#a5b4fc', pk: '#171338', desc: 'Void-black recon rig issued to ascended operatives.', tagCol: '#818cf8', how: 'Reach ascension tier 3 in any sector', tier: 'LEGENDARY', rf: () => Math.max(0, ...Object.values((typeof SV !== 'undefined' && SV && SV.asc) || {}), 0), rg: 3 },
  trench_op: { id: 'trench_op', type: 'op', name: 'Trench Regular', ci: 0, col: '#78716c', ac: '#44403c', hm: '#292524', vz: '#fcd34d', pk: '#1c1917', desc: 'Weathered line-infantry greatcoat, mud to the knees.', tagCol: '#a8a29e', how: 'Complete 3 runs', tier: 'COMMON', rk: 'runs', rg: 3 }
};

const EVENTS = {
  last_stand: {
    id: 'last_stand',
    title: 'OPERATION: LAST STAND',
    brief: 'Defend the forward outpost through 10 relentless assault waves. Field repairs are severely rationed. Survive to extract.',
    rules: [
      'Survive exactly 10 high-density assault waves',
      'Healing is reduced by 70% from all sources',
      'Defeat the Sector Brute Commander at Wave 10',
      'Extract successfully to claim operation rewards'
    ],
    diff: 4,
    map: 0,
    targetWave: 10,
    rewardCr: 1200,
    rewardSkin: 'ashen_assault',
    col: '#ff5a3a'
  },
  elite_hunt: {
    id: 'elite_hunt',
    title: 'OPERATION: ELITE HUNT',
    brief: 'Apex mutated specimens detected in the frozen wasteland. Eliminate 8 designated elite commanders to secure the zone.',
    rules: [
      'Neutralize 8 designated Elite commanders',
      'Elite spawn rates increased by 400%',
      'Zombies receive +25% movement speed',
      'Mission ends immediately upon 8th elite kill'
    ],
    diff: 5,
    map: 2,
    targetElites: 8,
    rewardCr: 1600,
    rewardSkin: 'crimson_sniper',
    col: '#a855f7'
  },
  heavy_metal: {
    id: 'heavy_metal',
    title: 'OPERATION: HEAVY METAL',
    brief: 'Colossal zombie swarm invasion. Standard sidearms prohibited. Heavy ordnance only: Minigun, Rocket, GL-40, Railgun, Arc Shotgun.',
    rules: [
      'Heavy weaponry only (Minigun, Rocket, GL-40, Railgun, Arc Shotgun)',
      'Swarm density doubled (2.0x zombie count)',
      'Survive through Wave 12 to extract',
      'Starting weapon automatically upgraded to available heavy weapon'
    ],
    diff: 5,
    map: 4,
    targetWave: 12,
    heavyOnly: true,
    rewardCr: 2000,
    rewardSkin: 'volt_railgun',
    col: '#00e5ff'
  }
};

const LOGIN_REWARDS = [
  { day: 1, type: 'cr', amt: 100, label: '+100 CR' },
  { day: 2, type: 'cr', amt: 150, label: '+150 CR' },
  { day: 3, type: 'cr', amt: 250, label: '+250 CR' },
  { day: 4, type: 'cr', amt: 350, label: '+350 CR' },
  { day: 5, type: 'cr', amt: 500, label: '+500 CR' },
  { day: 6, type: 'cr', amt: 650, label: '+650 CR' },
  { day: 7, type: 'cr', amt: 850, label: '+850 CR' },
  { day: 8, type: 'cr', amt: 1100, label: '+1100 CR' },
  { day: 9, type: 'cr', amt: 1400, label: '+1400 CR' },
  { day: 10, type: 'skin', skin: 'gold_minigun', label: 'GOLD MINIGUN' }
];

const DAILY_MISSIONS_POOL = [
  { id: 'kills_50', title: 'Exterminator', desc: 'Eliminate 50 zombies', type: 'kills', target: 50, reward: 150 },
  { id: 'waves_5', title: 'Survivor', desc: 'Survive 5 waves', type: 'waves', target: 5, reward: 200 },
  { id: 'elites_3', title: 'Apex Predator', desc: 'Defeat 3 elite zombies', type: 'elites', target: 3, reward: 250 },
  { id: 'cash_500', title: 'Bounty Collector', desc: 'Collect 500 combat cash', type: 'cash', target: 500, reward: 180 },
  { id: 'kills_100', title: 'Purge Protocol', desc: 'Eliminate 100 zombies', type: 'kills', target: 100, reward: 300 }
];

// Procedural Visual Icons
const SI_CACHE = {};
function getStatIcon(statId, col = '#e0b83a') {
  const k = statId + '_' + col;
  if (SI_CACHE[k]) return SI_CACHE[k];
  const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
  const cx = cv.getContext('2d');
  cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 2.2; cx.lineCap = 'round'; cx.lineJoin = 'round';
  if (statId === 'hp') {
    cx.beginPath(); cx.moveTo(16, 26);
    cx.bezierCurveTo(7, 19, 4, 13, 4, 9);
    cx.bezierCurveTo(4, 5, 8, 4, 11, 4);
    cx.bezierCurveTo(14, 4, 16, 7, 16, 8);
    cx.bezierCurveTo(16, 7, 18, 4, 21, 4);
    cx.bezierCurveTo(24, 4, 28, 5, 28, 9);
    cx.bezierCurveTo(28, 13, 25, 19, 16, 26);
    cx.fill();
  } else if (statId === 'spd') {
    cx.beginPath(); cx.moveTo(19, 4); cx.lineTo(9, 17); cx.lineTo(16, 17); cx.lineTo(13, 28); cx.lineTo(23, 14); cx.lineTo(16, 14); cx.closePath(); cx.fill();
  } else if (statId === 'dmg') {
    cx.beginPath(); cx.moveTo(6, 26); cx.lineTo(21, 11); cx.stroke();
    cx.beginPath(); cx.moveTo(19, 7); cx.lineTo(25, 13); cx.lineTo(22, 16); cx.lineTo(16, 10); cx.closePath(); cx.fill();
    cx.beginPath(); cx.arc(8, 24, 3, 0, 6.28); cx.fill();
  } else if (statId === 'crit') {
    cx.beginPath(); cx.arc(16, 16, 10, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(16, 2); cx.lineTo(16, 30); cx.moveTo(2, 16); cx.lineTo(30, 16); cx.stroke();
    cx.beginPath(); cx.arc(16, 16, 3, 0, 6.28); cx.fill();
  } else {
    cx.beginPath(); cx.arc(16, 16, 10, 0, 6.28); cx.stroke();
    cx.font = 'bold 13px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('+', 16, 16);
  }
  return SI_CACHE[k] = cv.toDataURL();
}

const SK_CACHE = {};
// Same glyphs kept as live canvases so the in-game HUD buttons can draw them
// with drawImage instead of re-rasterising a data URL every frame.
const SK_CANVAS = {};
function getSkillIcon(skillId, col = '#8fae4a') {
  const k = skillId + '_' + col;
  if (SK_CACHE[k]) return SK_CACHE[k];
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
  const cx = cv.getContext('2d');
  cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.lineJoin = 'round';
  SK_CANVAS[k] = cv;
  if (skillId === 'dash') {
    cx.beginPath(); cx.moveTo(6, 20); cx.lineTo(26, 20); cx.stroke();
    cx.beginPath(); cx.moveTo(18, 12); cx.lineTo(28, 20); cx.lineTo(18, 28); cx.stroke();
    cx.beginPath(); cx.moveTo(4, 13); cx.lineTo(14, 13); cx.moveTo(4, 27); cx.lineTo(14, 27); cx.stroke();
  } else if (skillId === 'gren') {
    cx.beginPath(); cx.arc(20, 22, 11, 0, 6.28); cx.fill();
    cx.fillStyle = '#1c2216'; cx.fillRect(17, 7, 6, 6);
    cx.strokeStyle = col; cx.strokeRect(17, 7, 6, 6);
    cx.beginPath(); cx.arc(23, 7, 3.5, 0, 6.28); cx.stroke();
  } else if (skillId === 'turret') {
    cx.fillStyle = col; cx.fillRect(8, 26, 24, 7);
    cx.beginPath(); cx.arc(20, 23, 9, 3.14, 0); cx.fill();
    cx.fillRect(18, 9, 14, 5);
    cx.fillStyle = '#1c2216'; cx.fillRect(16, 18, 8, 4);
  } else if (skillId === 'rage') {
    cx.beginPath(); cx.arc(20, 18, 11, 0, 6.28); cx.fill();
    cx.fillStyle = '#111'; cx.beginPath(); cx.arc(16, 16, 2.5, 0, 6.28); cx.arc(24, 16, 2.5, 0, 6.28); cx.fill();
    cx.beginPath(); cx.arc(20, 23, 5, 0, 3.14); cx.fill();
  } else if (skillId === 'nova') {
    // Blast core with eight radial spikes.
    cx.beginPath(); cx.arc(20, 20, 6, 0, 6.28); cx.fill();
    cx.beginPath(); cx.arc(20, 20, 11, 0, 6.28); cx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * 0.7854;
      cx.beginPath();
      cx.moveTo(20 + Math.cos(a) * 14, 20 + Math.sin(a) * 14);
      cx.lineTo(20 + Math.cos(a) * 18, 20 + Math.sin(a) * 18);
      cx.stroke();
    }
  } else if (skillId === 'frost') {
    // Branched six-arm snowflake.
    for (let i = 0; i < 6; i++) {
      const a = i * 1.0472;
      const vx = Math.cos(a), vy = Math.sin(a);
      cx.beginPath(); cx.moveTo(20, 20); cx.lineTo(20 + vx * 15, 20 + vy * 15); cx.stroke();
      cx.beginPath();
      cx.moveTo(20 + vx * 9, 20 + vy * 9);
      cx.lineTo(20 + vx * 13 - vy * 5, 20 + vy * 13 + vx * 5);
      cx.moveTo(20 + vx * 9, 20 + vy * 9);
      cx.lineTo(20 + vx * 13 + vy * 5, 20 + vy * 13 - vx * 5);
      cx.stroke();
    }
    cx.beginPath(); cx.arc(20, 20, 2.6, 0, 6.28); cx.fill();
  } else if (skillId === 'cloak') {
    // Hooded silhouette inside two dashed concealment arcs.
    cx.setLineDash([3, 3]);
    cx.beginPath(); cx.arc(20, 21, 14, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.arc(20, 21, 18, 3.6, 5.9); cx.stroke();
    cx.setLineDash([]);
    cx.beginPath();
    cx.moveTo(20, 10);
    cx.bezierCurveTo(13, 10, 10, 16, 11, 22);
    cx.lineTo(11, 30); cx.lineTo(29, 30); cx.lineTo(29, 22);
    cx.bezierCurveTo(30, 16, 27, 10, 20, 10);
    cx.closePath();
    cx.fill();
    cx.fillStyle = '#1c2216';
    cx.beginPath(); cx.ellipse(20, 20, 6, 7.5, 0, 0, 6.28); cx.fill();
  } else if (skillId === 'shield') {
    // Faceted shield with a centre chevron and two rivets.
    cx.beginPath();
    cx.moveTo(20, 7); cx.lineTo(32, 12); cx.lineTo(30, 24);
    cx.lineTo(20, 33); cx.lineTo(10, 24); cx.lineTo(8, 12);
    cx.closePath(); cx.stroke();
    cx.beginPath(); cx.moveTo(20, 12); cx.lineTo(26, 22); cx.lineTo(20, 19); cx.lineTo(14, 22); cx.closePath(); cx.fill();
    cx.beginPath(); cx.arc(14, 14, 1.4, 0, 6.28); cx.arc(26, 14, 1.4, 0, 6.28); cx.fill();
  } else if (skillId === 'heal') {
    // Medic cross inside a ring, with a pulse blip.
    cx.beginPath(); cx.arc(20, 20, 14, 0, 6.28); cx.stroke();
    cx.fillRect(17, 10, 6, 20);
    cx.fillRect(10, 17, 20, 6);
    cx.fillStyle = '#1c2216';
    cx.beginPath(); cx.arc(20, 20, 3.4, 0, 6.28); cx.fill();
  } else if (skillId === 'bolt') {
    // Storm bolt with a fork.
    cx.beginPath();
    cx.moveTo(24, 5); cx.lineTo(12, 21); cx.lineTo(19, 21);
    cx.lineTo(15, 35); cx.lineTo(29, 17); cx.lineTo(21, 17);
    cx.closePath(); cx.fill();
    cx.lineWidth = 1.6;
    cx.beginPath(); cx.moveTo(12, 12); cx.lineTo(9, 17); cx.moveTo(29, 27); cx.lineTo(32, 22); cx.stroke();
  } else if (skillId === 'meteor') {
    // Rock with an incoming streak and ground impact rays.
    cx.beginPath(); cx.arc(25, 26, 8, 0, 6.28); cx.fill();
    cx.beginPath();
    cx.moveTo(20, 22); cx.lineTo(4, 5);
    cx.moveTo(23, 19); cx.lineTo(10, 4);
    cx.stroke();
    cx.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const a = -0.4 + i * 0.5;
      cx.beginPath();
      cx.moveTo(25 + Math.cos(a) * 10, 26 + Math.sin(a) * 10);
      cx.lineTo(25 + Math.cos(a) * 14, 26 + Math.sin(a) * 14);
      cx.stroke();
    }
  } else if (skillId === 'mx') {
    // Heart with a vitality plus.
    cx.beginPath();
    cx.moveTo(20, 33);
    cx.bezierCurveTo(9, 25, 5, 18, 5, 13);
    cx.bezierCurveTo(5, 8, 9, 6, 13, 6);
    cx.bezierCurveTo(17, 6, 20, 10, 20, 11.5);
    cx.bezierCurveTo(20, 10, 23, 6, 27, 6);
    cx.bezierCurveTo(31, 6, 35, 8, 35, 13);
    cx.bezierCurveTo(35, 18, 31, 25, 20, 33);
    cx.closePath(); cx.fill();
    cx.fillStyle = '#1c2216';
    cx.fillRect(19, 14, 3, 11);
    cx.fillRect(15, 18, 11, 3);
  } else if (skillId === 'spd') {
    // Double chevron with speed lines.
    cx.beginPath(); cx.moveTo(14, 8); cx.lineTo(24, 20); cx.lineTo(14, 32); cx.stroke();
    cx.beginPath(); cx.moveTo(23, 8); cx.lineTo(33, 20); cx.lineTo(23, 32); cx.stroke();
    cx.lineWidth = 1.8;
    cx.beginPath(); cx.moveTo(4, 14); cx.lineTo(10, 14); cx.moveTo(3, 20); cx.lineTo(9, 20); cx.moveTo(4, 26); cx.lineTo(10, 26); cx.stroke();
  } else if (skillId === 'dm') {
    // Rifle round with a muzzle flare.
    cx.beginPath(); cx.moveTo(21, 4); cx.lineTo(27, 14); cx.lineTo(27, 28); cx.lineTo(15, 28); cx.lineTo(15, 14); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(15, 31); cx.lineTo(27, 31); cx.lineTo(27, 36); cx.lineTo(15, 36); cx.closePath(); cx.stroke();
    cx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + (i - 1) * 0.5;
      cx.beginPath(); cx.moveTo(21, 4); cx.lineTo(21 + Math.cos(a) * 8, 4 + Math.sin(a) * 8); cx.stroke();
    }
  } else if (skillId === 'rof') {
    // Trigger plus a rotation arrow for cycle rate.
    cx.beginPath(); cx.moveTo(12, 8); cx.lineTo(12, 20);
    cx.bezierCurveTo(12, 26, 18, 30, 24, 28);
    cx.stroke();
    cx.beginPath(); cx.moveTo(20, 6); cx.lineTo(20, 12); cx.moveTo(17, 9); cx.lineTo(20, 6); cx.lineTo(23, 9); cx.stroke();
    cx.beginPath(); cx.arc(25, 22, 7, 0.6, 5.2); cx.stroke();
    cx.beginPath(); cx.moveTo(31, 18); cx.lineTo(31, 23); cx.lineTo(26, 22); cx.closePath(); cx.fill();
  } else if (skillId === 'crit') {
    // Crosshair with a crit star in the middle.
    cx.beginPath(); cx.arc(20, 20, 12, 0, 6.28); cx.stroke();
    cx.beginPath();
    cx.moveTo(20, 3); cx.lineTo(20, 11); cx.moveTo(20, 29); cx.lineTo(20, 37);
    cx.moveTo(3, 20); cx.lineTo(11, 20); cx.moveTo(29, 20); cx.lineTo(37, 20);
    cx.stroke();
    cx.beginPath();
    cx.moveTo(20, 11); cx.lineTo(22.5, 18); cx.lineTo(29, 20); cx.lineTo(22.5, 22);
    cx.lineTo(20, 29); cx.lineTo(17.5, 22); cx.lineTo(11, 20); cx.lineTo(17.5, 18);
    cx.closePath(); cx.fill();
  } else if (skillId === 'vamp') {
    // Blood drop with a fang notch and a pulse line.
    cx.beginPath();
    cx.moveTo(20, 5);
    cx.bezierCurveTo(28, 16, 30, 21, 30, 25);
    cx.bezierCurveTo(30, 31, 25, 35, 20, 35);
    cx.bezierCurveTo(15, 35, 10, 31, 10, 25);
    cx.bezierCurveTo(10, 21, 12, 16, 20, 5);
    cx.closePath(); cx.fill();
    cx.fillStyle = '#1c2216';
    cx.beginPath(); cx.moveTo(16, 22); cx.lineTo(19, 22); cx.lineTo(17.5, 30); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(22, 22); cx.lineTo(25, 22); cx.lineTo(23.5, 30); cx.closePath(); cx.fill();
  } else if (skillId === 'regen') {
    // Cellular repair: circular arrow around a plus.
    cx.beginPath(); cx.arc(20, 20, 13, 0.5, 5.3); cx.stroke();
    cx.beginPath(); cx.moveTo(31, 12); cx.lineTo(31, 18); cx.lineTo(25, 17); cx.closePath(); cx.fill();
    cx.fillRect(17, 14, 6, 12);
    cx.fillRect(14, 17, 12, 6);
  } else if (skillId === 'cb') {
    // Stacked credits with a sparkle.
    cx.beginPath(); cx.ellipse(18, 30, 12, 5, 0, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.ellipse(18, 24, 12, 5, 0, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.ellipse(18, 18, 12, 5, 0, 0, 6.28); cx.fill();
    cx.fillStyle = '#1c2216';
    cx.font = 'bold 11px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('$', 18, 18);
    cx.fillStyle = col;
    cx.beginPath();
    cx.moveTo(33, 6); cx.lineTo(34.6, 10.4); cx.lineTo(39, 12); cx.lineTo(34.6, 13.6);
    cx.lineTo(33, 18); cx.lineTo(31.4, 13.6); cx.lineTo(27, 12); cx.lineTo(31.4, 10.4);
    cx.closePath(); cx.fill();
  } else if (skillId === 'xpb') {
    // Training chevrons with a service star.
    cx.beginPath();
    cx.moveTo(6, 24); cx.lineTo(16, 32); cx.lineTo(34, 10);
    cx.stroke();
    cx.lineWidth = 1.8;
    cx.beginPath();
    cx.moveTo(6, 32); cx.lineTo(14, 36); cx.stroke();
    cx.beginPath();
    cx.moveTo(29, 4); cx.lineTo(30.8, 9); cx.lineTo(36, 10.8); cx.lineTo(30.8, 12.6);
    cx.lineTo(29, 18); cx.lineTo(27.2, 12.6); cx.lineTo(22, 10.8); cx.lineTo(27.2, 9);
    cx.closePath(); cx.fill();
  } else {
    cx.beginPath(); cx.arc(20, 20, 13, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(20, 8); cx.lineTo(20, 32); cx.moveTo(8, 20); cx.lineTo(32, 20); cx.stroke();
  }
  return SK_CACHE[k] = cv.toDataURL();
}

// In-game counterpart of getSkillIcon(): draws the same cached glyph straight
// onto the game canvas. Sharing the offscreen canvas keeps the lobby icons and
// the battlefield buttons identical, and drawImage of a small canvas is cheaper
// than any per-frame rasterisation.
function drawSkillGlyph(ctx, skillId, cx, cy, size, col = '#8fae4a') {
  if (!skillId) return false;
  const k = skillId + '_' + col;
  if (!SK_CANVAS[k]) getSkillIcon(skillId, col);
  const cv = SK_CANVAS[k];
  if (!cv) return false;
  ctx.drawImage(cv, cx - size / 2, cy - size / 2, size, size);
  return true;
}

function threatStars(diff) {
  const count = Math.max(1, Math.min(5, diff || 1));
  let svg = '<span style="display:inline-flex;gap:2px;align-items:center">';
  for (let i = 0; i < 5; i++) {
    const filled = i < count;
    svg += `<svg width="11" height="11" viewBox="0 0 24 24" fill="${filled ? '#ff5a3a' : 'rgba(255,255,255,.15)'}"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>`;
  }
  svg += '</span>';
  return svg;
}

const GI = {};
// The weapon sprite reads SV.eqSkin[i], so the cache key has to include it or a
// gun keeps showing the finish it had when the icon was first drawn.
function gunIcon(i) {
  const key = i + '_' + ((typeof SV !== 'undefined' && SV && SV.eqSkin && SV.eqSkin[i]) ? SV.eqSkin[i] : '-');
  if (GI[key]) return GI[key];
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 48;
  const cx = cv.getContext('2d');
  const oldX = X; X = cx;
  X.save(); X.translate(22, 24); X.scale(1.6, 1.6);
  gun(i, 0);
  X.restore();
  X = oldX;
  return GI[key] = cv.toDataURL();
}

function resetGunIconCache() {
  for (const key in GI) delete GI[key];
}

const PI_CACHE = {};
function getPerkIcon(name, col) {
  const cleanName = name.replace(/^✦\s*/, '');
  if (PI_CACHE[cleanName]) return PI_CACHE[cleanName];
  const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
  const cx = cv.getContext('2d'), c = col || '#8fae4a';
  cx.fillStyle = '#131710'; cx.beginPath();
  if (cx.roundRect) cx.roundRect(2, 2, 44, 44, 7); else cx.rect(2, 2, 44, 44);
  cx.fill();
  cx.strokeStyle = c; cx.lineWidth = 2; cx.stroke();
  cx.fillStyle = 'rgba(255,255,255,.05)'; cx.fillRect(4, 4, 40, 20);
  cx.save(); cx.translate(24, 24);
  cx.fillStyle = c; cx.strokeStyle = c; cx.lineWidth = 2; cx.lineCap = 'round';

  if (cleanName === 'Power Shot') {
    cx.beginPath(); cx.arc(0, 0, 9, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(-13, 0); cx.lineTo(13, 0); cx.moveTo(0, -13); cx.lineTo(0, 13); cx.stroke();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, 3, 0, 6.28); cx.fill();
  } else if (cleanName === 'Rapid Fire') {
    for (let k = -1; k <= 1; k++) {
      cx.beginPath(); cx.moveTo(k * 6 - 3, -8); cx.lineTo(k * 6 + 3, -8); cx.lineTo(k * 6 + 3, 8); cx.lineTo(k * 6 - 3, 8); cx.closePath(); cx.fill();
      cx.beginPath(); cx.moveTo(k * 6 - 3, -8); cx.lineTo(k * 6, -12); cx.lineTo(k * 6 + 3, -8); cx.closePath(); cx.fill();
    }
  } else if (cleanName === 'Double Barrel') {
    cx.fillStyle = '#c8302a';
    cx.beginPath();
    if (cx.roundRect) { cx.roundRect(-8, -10, 6, 20, 2); cx.roundRect(2, -10, 6, 20, 2); }
    else { cx.rect(-8, -10, 6, 20); cx.rect(2, -10, 6, 20); }
    cx.fill();
    cx.fillStyle = '#ffd84a'; cx.fillRect(-8, 6, 6, 4); cx.fillRect(2, 6, 6, 4);
  } else if (cleanName === 'Piercing Rounds') {
    cx.beginPath(); cx.moveTo(-11, 11); cx.lineTo(11, -11); cx.stroke();
    cx.beginPath(); cx.moveTo(4, -11); cx.lineTo(11, -11); cx.lineTo(11, -4); cx.stroke();
    cx.strokeStyle = '#fff'; cx.strokeRect(-5, -5, 10, 10);
  } else if (cleanName === 'Explosive Rounds') {
    for (let a = 0; a < 6.28; a += 0.785) {
      cx.beginPath(); cx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); cx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); cx.stroke();
    }
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.fill();
  } else if (cleanName === 'Sharpshooter') {
    cx.beginPath(); cx.arc(0, 0, 12, 0, 6.28); cx.arc(0, 0, 6, 0, 6.28); cx.stroke();
    cx.fillStyle = '#ff3b30'; cx.beginPath(); cx.arc(0, 0, 2.5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Iron Body') {
    cx.fillStyle = '#fff'; cx.fillRect(-4, -12, 8, 24); cx.fillRect(-12, -4, 24, 8);
    cx.strokeStyle = '#8fae4a'; cx.strokeRect(-12, -12, 24, 24);
  } else if (cleanName === 'Second Wind') {
    cx.beginPath(); cx.moveTo(-12, 2); cx.lineTo(-6, -4); cx.lineTo(0, 8); cx.lineTo(6, -8); cx.lineTo(12, 2); cx.stroke();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(6, -8, 2.5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Bloodthirst') {
    cx.fillStyle = '#ff3b30'; cx.beginPath();
    cx.moveTo(0, -11); cx.quadraticCurveTo(8, -2, 8, 3); cx.arc(0, 3, 8, 0, 3.14); cx.quadraticCurveTo(-8, -2, 0, -11); cx.fill();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(-2, 2, 2, 0, 6.28); cx.fill();
  } else if (cleanName === 'Adrenaline') {
    cx.beginPath(); cx.moveTo(-8, 8); cx.lineTo(4, -10); cx.lineTo(0, -10); cx.lineTo(8, -10); cx.stroke();
    cx.beginPath(); cx.moveTo(-12, 2); cx.lineTo(-2, 2); cx.moveTo(-10, 5); cx.lineTo(0, 5); cx.stroke();
    cx.fillStyle = '#00e5ff'; cx.beginPath(); cx.arc(3, -4, 3, 0, 6.28); cx.fill();
  } else if (cleanName === 'Kevlar') {
    cx.beginPath(); cx.moveTo(0, -12); cx.lineTo(11, -6); cx.lineTo(8, 10); cx.lineTo(0, 13); cx.lineTo(-8, 10); cx.lineTo(-11, -6); cx.closePath(); cx.fill();
    cx.strokeStyle = '#fff'; cx.lineWidth = 1.5; cx.stroke();
  } else if (cleanName === 'Quick Skills') {
    cx.beginPath(); cx.arc(0, 2, 10, 0, 6.28); cx.stroke();
    cx.fillRect(-2, -12, 4, 4);
    cx.beginPath(); cx.moveTo(0, 2); cx.lineTo(4, -4); cx.stroke();
  } else if (cleanName === 'Magnet') {
    cx.lineWidth = 4; cx.beginPath(); cx.arc(0, -2, 8, 3.14, 0); cx.lineTo(8, 8); cx.moveTo(-8, -2); cx.lineTo(-8, 8); cx.stroke();
    cx.fillStyle = '#fff'; cx.fillRect(-10, 4, 4, 4); cx.fillRect(6, 4, 4, 4);
  } else if (cleanName === 'Gold Rush') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.fill();
    cx.fillStyle = '#111'; cx.font = 'bold 12px Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('$', 0, 1);
  } else if (cleanName === 'Grenadier') {
    cx.beginPath(); if (cx.roundRect) cx.roundRect(-7, -5, 14, 16, 4); else cx.rect(-7, -5, 14, 16); cx.fill();
    cx.fillRect(-3, -10, 6, 5); cx.strokeRect(-1, -12, 4, 2);
  } else if (cleanName === 'Chain Lightning') {
    cx.beginPath(); cx.moveTo(-2, -12); cx.lineTo(-8, 0); cx.lineTo(0, 0); cx.lineTo(-4, 12); cx.lineTo(8, -2); cx.lineTo(1, -2); cx.lineTo(5, -12); cx.closePath(); cx.fill();
  } else if (cleanName === 'Frost Aura') {
    for (let k = 0; k < 3; k++) {
      const a = k * 1.047;
      cx.beginPath(); cx.moveTo(Math.cos(a) * -12, Math.sin(a) * -12); cx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); cx.stroke();
    }
    cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.stroke();
  } else if (cleanName === 'Immolation') {
    cx.beginPath(); cx.moveTo(0, -12); cx.quadraticCurveTo(8, -4, 6, 4); cx.arc(0, 4, 8, 0, 3.14); cx.quadraticCurveTo(-6, -4, 0, -12); cx.fill();
    cx.fillStyle = '#ffee55'; cx.beginPath(); cx.arc(0, 5, 3.5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Spectral Blades') {
    cx.lineWidth = 3; cx.beginPath(); cx.moveTo(-9, 9); cx.quadraticCurveTo(0, -2, 10, -10); cx.stroke();
    cx.fillStyle = '#fff'; cx.beginPath(); cx.moveTo(-9, 9); cx.lineTo(-4, 4); cx.lineTo(11, -11); cx.lineTo(6, -3); cx.closePath(); cx.fill();
  } else if (cleanName === 'Meteor Rain') {
    cx.beginPath(); cx.moveTo(-10, -10); cx.lineTo(6, 6); cx.stroke();
    cx.beginPath(); cx.arc(6, 6, 5, 0, 6.28); cx.fill();
    cx.strokeStyle = '#ffee55'; cx.beginPath(); cx.moveTo(-6, -12); cx.lineTo(3, 3); cx.stroke();
  } else if (cleanName === 'Arcane Barrier') {
    cx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * 1.047; cx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 12, Math.sin(a) * 12); }
    cx.closePath(); cx.stroke();
    cx.fillStyle = c; cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.fill();
  } else if (cleanName === 'Shadow Step') {
    cx.beginPath(); cx.moveTo(-12, -8); cx.lineTo(4, -8); cx.lineTo(8, -3); cx.lineTo(2, 8); cx.stroke();
    cx.beginPath(); cx.moveTo(-8, 2); cx.lineTo(6, 2); cx.stroke();
  } else if (cleanName === 'Phoenix') {
    cx.beginPath(); cx.arc(0, 2, 4, 0, 6.28); cx.fill();
    cx.beginPath(); cx.moveTo(-12, -6); cx.quadraticCurveTo(-4, 0, 0, 6); cx.quadraticCurveTo(4, 0, 12, -6); cx.stroke();
  } else if (cleanName === 'Storm Caller') {
    cx.beginPath(); if (cx.roundRect) cx.roundRect(-10, -10, 20, 9, 3); else cx.rect(-10, -10, 20, 9); cx.fill();
    cx.strokeStyle = '#fff'; cx.beginPath(); cx.moveTo(0, -1); cx.lineTo(-4, 9); cx.lineTo(1, 9); cx.lineTo(-2, 14); cx.stroke();
  } else if (cleanName === 'Venom Rounds') {
    cx.beginPath(); cx.arc(0, -2, 6, 0, 6.28); cx.fill();
    cx.fillRect(-3, 4, 6, 5);
    cx.fillStyle = '#111'; cx.beginPath(); cx.arc(-2, -2, 1.5, 0, 6.28); cx.arc(2, -2, 1.5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Soul Harvest') {
    cx.strokeRect(-7, -8, 14, 16);
    cx.fillStyle = '#df8aff'; cx.beginPath(); cx.ellipse(0, 0, 4, 6, 0, 0, 6.28); cx.fill();
  } else if (cleanName === 'Thorns') {
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785; cx.beginPath(); cx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); cx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); cx.stroke();
    }
    cx.beginPath(); cx.arc(0, 0, 5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Berserker') {
    cx.fillStyle = '#ff3b30'; cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.fill();
    cx.strokeStyle = '#fff'; cx.strokeRect(-5, -5, 10, 10);
  } else if (cleanName === 'Time Warp') {
    cx.beginPath(); cx.moveTo(-8, -10); cx.lineTo(8, -10); cx.lineTo(0, 0); cx.lineTo(8, 10); cx.lineTo(-8, 10); cx.closePath(); cx.stroke();
  } else if (cleanName === 'Executioner') {
    cx.beginPath(); cx.moveTo(-8, -10); cx.lineTo(8, -10); cx.lineTo(12, 4); cx.lineTo(-12, 4); cx.closePath(); cx.fill();
    cx.strokeRect(-2, 4, 4, 8);
  } else if (cleanName === 'Lucky Charm') {
    for (let i = 0; i < 4; i++) { const a = i * 1.57; cx.beginPath(); cx.arc(Math.cos(a) * 5, Math.sin(a) * 5, 4, 0, 6.28); cx.fill(); }
  } else if (cleanName === 'Arcane Missiles') {
    for (let k = -1; k <= 1; k++) {
      cx.beginPath(); cx.moveTo(k * 6, -10); cx.lineTo(k * 6 + 2, 4); cx.lineTo(k * 6 - 2, 4); cx.closePath(); cx.fill();
    }
  } else if (cleanName === 'Bloodlust') {
    cx.beginPath(); cx.arc(0, 0, 10, 0, 6.28); cx.stroke();
    cx.fillStyle = '#ff2222'; cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.fill();
  } else if (cleanName === 'Volatile Corpses') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.fill();
  } else if (cleanName === 'Kill Rush') {
    cx.beginPath(); cx.moveTo(-8, -4); cx.lineTo(0, -11); cx.lineTo(8, -4); cx.moveTo(-8, 4); cx.lineTo(0, -3); cx.lineTo(8, 4); cx.stroke();
  } else if (cleanName === 'Overcharge') {
    cx.strokeRect(-8, -10, 16, 20);
    cx.fillRect(-3, -13, 6, 3);
    cx.fillStyle = '#ffee33'; cx.beginPath(); cx.moveTo(1, -4); cx.lineTo(-3, 1); cx.lineTo(1, 1); cx.lineTo(-1, 6); cx.lineTo(3, 0); cx.lineTo(-1, 0); cx.closePath(); cx.fill();
  } else if (cleanName === 'Guardian Angel') {
    cx.beginPath(); cx.arc(0, -8, 6, 3.14, 0); cx.stroke();
    cx.beginPath(); cx.moveTo(-10, 0); cx.quadraticCurveTo(-4, 4, 0, 10); cx.quadraticCurveTo(4, 4, 10, 0); cx.stroke();
  } else if (cleanName === 'Fragmentation') {
    for (let k = 0; k < 6; k++) { const a = k * 1.047; cx.fillRect(Math.cos(a) * 8 - 1.5, Math.sin(a) * 8 - 1.5, 3, 3); }
    cx.beginPath(); cx.arc(0, 0, 3, 0, 6.28); cx.fill();
  } else if (cleanName === 'Glass Cannon') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(-8, -8); cx.lineTo(8, 8); cx.moveTo(-4, 8); cx.lineTo(4, -8); cx.stroke();
  } else if (cleanName === 'Nano Swarm') {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.094 - 1.57; cx.beginPath(); cx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); cx.lineTo(Math.cos(a) * 8 - 3, Math.sin(a) * 8 + 5); cx.lineTo(Math.cos(a) * 8 + 3, Math.sin(a) * 8 + 5); cx.closePath(); cx.fill();
    }
  } else if (cleanName === 'Cryo Blast') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.stroke();
    for (let k = 0; k < 4; k++) { const a = k * 1.57; cx.fillRect(Math.cos(a) * 10 - 1.5, Math.sin(a) * 10 - 1.5, 3, 3); }
  } else if (cleanName === 'Overdrive') {
    cx.beginPath(); cx.arc(0, 2, 11, 3.14, 0); cx.stroke();
    cx.strokeStyle = '#ff3b30'; cx.beginPath(); cx.moveTo(0, 2); cx.lineTo(6, -6); cx.stroke();
  } else if (cleanName === 'Singularity') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 3); cx.arc(0, 0, 11, 3.5, 6); cx.stroke();
    cx.fillStyle = '#111'; cx.beginPath(); cx.arc(0, 0, 5, 0, 6.28); cx.fill();
  } else if (cleanName === 'Static Discharge') {
    cx.beginPath(); cx.arc(0, 0, 4, 0, 6.28); cx.fill();
    for (let k = 0; k < 4; k++) {
      const a = k * 1.57 + 0.78; cx.beginPath(); cx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); cx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); cx.stroke();
    }
  } else if (cleanName === 'Toxic Trail') {
    cx.beginPath(); cx.ellipse(0, 4, 11, 5, 0, 0, 6.28); cx.fill();
    cx.beginPath(); cx.arc(-3, -3, 2.5, 0, 6.28); cx.arc(4, -5, 2, 0, 6.28); cx.fill();
  } else if (cleanName === 'Critical Surge') {
    cx.beginPath(); cx.arc(0, 0, 11, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(-4, 0); cx.lineTo(0, -6); cx.lineTo(4, 6); cx.stroke();
  } else if (cleanName === 'Kinetic Deflector') {
    cx.beginPath(); cx.arc(0, 0, 11, -1.57, 1.57); cx.stroke();
    cx.beginPath(); cx.moveTo(-10, 0); cx.lineTo(-2, 0); cx.lineTo(6, -6); cx.stroke();
  } else {
    // Heavy Ordnance & Default
    cx.beginPath(); if (cx.roundRect) cx.roundRect(-6, -10, 12, 18, 3); else cx.rect(-6, -10, 12, 18); cx.fill();
    cx.fillStyle = '#ffd36b'; cx.fillRect(-3, -12, 6, 2);
  }
  cx.restore();
  return PI_CACHE[cleanName] = cv.toDataURL();
}



function charSkinIcon(skinKey) {
  const sk = SKINS[skinKey]; if (!sk) return '';
  const cv = document.createElement('canvas'); cv.width = 130; cv.height = 76;
  const cx = cv.getContext('2d');
  const oldX = X; X = cx;
  X.save(); X.translate(46, 38); X.scale(1.25, 1.25);
  const customCls = { pk: sk.pk, ac: sk.ac, hm: sk.hm, vz: sk.vz };
  // Shadow
  X.fillStyle = '#00000066'; X.beginPath(); X.ellipse(4, 5, 16, 18, 0, 0, 6.28); X.fill();
  // Boots
  X.fillStyle = '#1c1f1a'; X.beginPath(); X.roundRect(-7, -13, 11, 6, 2); X.roundRect(-7, 7, 11, 6, 2); X.fill();
  // Pack & Torso
  X.fillStyle = sk.pk; X.beginPath(); X.roundRect(-16, -9, 9, 18, 3); X.fill();
  X.strokeStyle = '#141812'; X.lineWidth = 1.5; X.stroke();
  X.fillStyle = '#2d3326'; X.beginPath(); X.ellipse(0, 0, 11, 16, 0, 0, 6.28); X.fill();
  X.strokeStyle = sk.ac; X.lineWidth = 2.5; X.stroke();
  // Gun
  gun(sk.wi || SV.start || 0, 0);
  // Arms & Helmet
  X.lineCap = 'round'; X.strokeStyle = sk.ac; X.lineWidth = 6;
  X.beginPath(); X.moveTo(1, -11); X.lineTo(16, -4); X.moveTo(1, 11); X.lineTo(26, 3); X.stroke();
  X.fillStyle = sk.hm; X.beginPath(); X.arc(0, 0, 9, 0, 6.28); X.fill();
  X.strokeStyle = '#181e14'; X.lineWidth = 1.5; X.stroke();
  X.fillStyle = sk.vz; X.beginPath(); X.roundRect(4, -5.5, 4, 11, 2); X.fill();
  X.restore();
  X = oldX;
  return cv.toDataURL();
}


