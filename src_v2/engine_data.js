/* === DATA: WEAPONS, CLASSES, SKILLS, RELICS, PERKS, SKINS & EVENTS === */

const WEAP = [
  { n: 'Pistol', d: 20, r: 0.32, sp: 0.02, p: 1, c: 0, kb: 0.85, mag: 12, rl: 1.1, tier: 'COMMON' },
  { n: 'SMG', d: 9.5, r: 0.10, sp: 0.11, p: 1, c: 300, kb: 0.45, mag: 30, rl: 1.2, tier: 'UNCOMMON' },
  { n: 'Shotgun', d: 11, r: 0.62, sp: 0.24, p: 8, c: 500, kb: 0.6, mag: 8, rl: 1.5, tier: 'UNCOMMON' },
  { n: 'Rifle', d: 30, r: 0.20, sp: 0.02, p: 1, c: 700, kb: 0.95, mag: 25, rl: 1.3, tier: 'RARE' },
  { n: 'Minigun', d: 8.5, r: 0.075, sp: 0.16, p: 1, c: 1500, kb: 0.2, mag: 100, rl: 2.4, tier: 'EPIC' },
  { n: 'Revolver', d: 68, r: 0.52, sp: 0.01, p: 1, c: 400, kb: 1.6, mag: 6, rl: 1.2, tier: 'COMMON' },
  { n: 'Assault', d: 16, r: 0.095, sp: 0.05, p: 1, c: 900, kb: 0.7, mag: 30, rl: 1.3, tier: 'RARE' },
  { n: 'Sniper', d: 195, r: 1.05, sp: 0, p: 1, c: 1200, pr: 3, rg: 1.15, kb: 2.2, mag: 5, rl: 1.9, tier: 'EPIC' },
  { n: 'Plasma', d: 34, r: 0.14, sp: 0.025, p: 1, c: 2500, pr: 2, kb: 0.85, mag: 20, rl: 1.5, tier: 'LEGENDARY' },
  { n: 'Rocket', d: 175, r: 0.95, sp: 0.01, p: 1, c: 3000, ex: 115, kb: 2.5, mag: 4, rl: 2.0, tier: 'LEGENDARY' },
  { n: 'Flamer', d: 8.5, r: 0.065, sp: 0.22, p: 2, c: 1800, rg: 0.24, flm: 1, kb: 0.12, mag: 50, rl: 1.7, tier: 'EPIC' },
  { n: 'Tesla', d: 62, r: 0.30, sp: 0, p: 1, c: 3500, pr: 3, cl: 3, kb: 0.75, mag: 15, rl: 1.6, tier: 'LEGENDARY' },
  { n: 'GL-40', d: 115, r: 0.90, sp: 0.03, p: 1, c: 2800, ex: 95, kb: 1.9, mag: 6, rl: 1.8, tier: 'EPIC' },
  { n: 'Cryo Blaster', d: 24, r: 0.13, sp: 0.025, p: 1, c: 3400, fz: 1, kb: 0.7, mag: 24, rl: 1.4, tier: 'LEGENDARY' },
  { n: 'Railgun', d: 340, r: 1.40, sp: 0, p: 1, c: 4200, pr: 10, rg: 1.35, kb: 2.8, mag: 3, rl: 2.3, tier: 'LEGENDARY' },
  { n: 'Dual Pistols', d: 13, r: 0.16, sp: 0.04, p: 2, c: 350, kb: 0.55, mag: 24, rl: 1.3, tier: 'UNCOMMON' },
  { n: 'Burst Rifle', d: 22, r: 0.38, sp: 0.015, p: 3, c: 850, kb: 0.75, mag: 24, rl: 1.4, tier: 'RARE' },
  { n: 'Arc Shotgun', d: 18, r: 0.65, sp: 0.22, p: 6, c: 3800, cl: 1, kb: 0.7, mag: 10, rl: 1.6, tier: 'LEGENDARY' },
  { n: 'Crossbow', d: 84, r: 0.62, sp: 0, p: 1, c: 650, pr: 2, rg: 0.9, kb: 1.3, mag: 6, rl: 1.7, tier: 'RARE' },
  { n: 'Siphon SMG', d: 10, r: 0.085, sp: 0.09, p: 1, c: 1900, ls: 1, kb: 0.4, mag: 36, rl: 1.3, tier: 'EPIC' },
  { n: 'Glacier Breaker', d: 13, r: 0.72, sp: 0.2, p: 6, c: 2600, fz: 1, rg: 0.42, kb: 0.8, mag: 8, rl: 1.7, tier: 'EPIC' },
  { n: 'Hornet', d: 26, r: 0.23, sp: 0.05, p: 1, c: 2600, ex: 48, kb: 0.9, mag: 18, rl: 1.5, tier: 'EPIC' }
];

const TIER_COLORS = {
  'COMMON': '#64748b',
  'UNCOMMON': '#22c55e',
  'RARE': '#38bdf8',
  'EPIC': '#a855f7',
  'LEGENDARY': '#f59e0b'
};

const ZT = {
  walk: { hp: 32, s: 55, spd: 55, r: 13, col: '#6f8f4a', dm: 8, dmg: 8, cash: 10, kb: 1.0 },
  run: { hp: 18, s: 115, spd: 115, r: 11, col: '#a8a04a', dm: 6, dmg: 6, cash: 14, kb: 1.1 },
  tank: { hp: 190, s: 38, spd: 38, r: 22, col: '#7a4a4a', dm: 18, dmg: 18, cash: 55, kb: 0.25 },
  exp: { hp: 24, s: 90, spd: 90, r: 12, col: '#d0702a', dm: 0, dmg: 0, cash: 22, kb: 1.0 },
  spit: { hp: 40, s: 58, spd: 58, r: 12, col: '#4fb04a', dm: 6, dmg: 6, cash: 30, kb: 0.95 },
  stalker: { hp: 42, s: 82, spd: 82, r: 12, col: '#3e5f52', dm: 12, dmg: 12, cash: 25, stk: 1, kb: 0.85 },
  charger: { hp: 115, s: 45, spd: 45, r: 18, col: '#8a4828', dm: 16, dmg: 16, cash: 35, chg: 1, kb: 0.35 },
  boss: { hp: 1150, s: 48, spd: 48, r: 34, col: '#8a2f2f', dm: 32, dmg: 32, cash: 350, kb: 0.08 }
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
  blood_hunter: { id: 'blood_hunter', type: 'op', name: 'Crimson Hunter', ci: 0, col: '#ef4444', ac: '#991b1b', hm: '#450a0a', vz: '#f87171', pk: '#2d0606', desc: 'Ceremonial crimson battle armor worn by veteran zombie slayers.', tagCol: '#ef4444', how: 'Survive 50 Total Cumulative Waves', tier: 'EPIC' }
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
function getSkillIcon(skillId, col = '#8fae4a') {
  const k = skillId + '_' + col;
  if (SK_CACHE[k]) return SK_CACHE[k];
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
  const cx = cv.getContext('2d');
  cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.lineJoin = 'round';
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
  } else {
    cx.beginPath(); cx.arc(20, 20, 13, 0, 6.28); cx.stroke();
    cx.beginPath(); cx.moveTo(20, 8); cx.lineTo(20, 32); cx.moveTo(8, 20); cx.lineTo(32, 20); cx.stroke();
  }
  return SK_CACHE[k] = cv.toDataURL();
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
function gunIcon(i) {
  if (GI[i]) return GI[i];
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 48;
  const cx = cv.getContext('2d');
  const oldX = X; X = cx;
  X.save(); X.translate(22, 24); X.scale(1.6, 1.6);
  gun(i, 0);
  X.restore();
  X = oldX;
  return GI[i] = cv.toDataURL();
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


