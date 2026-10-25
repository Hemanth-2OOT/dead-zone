/* === MAP ARCHITECTURE & BELIEVABLE ENVIRONMENTS === */

const MP = [
  { n: 'Downtown', d: 'Urban ruins with asphalt avenues, crosswalks, crashed vehicles & street lamps.', b: 1, recLvl: 1, t1: '#3a3a36', t2: '#282824', rd: '#1c1e19', ln: '#e0b83a', wl: '#3e443b', ws: '#c8502d', cr: '#7a5a34', bd: '#ff5a3a', zs: 1, zh: 1, cm: 1.0, enemies: ['walk', 'run', 'tank', 'crawler'] },
  { n: 'Dust Bowl', d: 'Arid desert ranch with abandoned farmhouse, fences, hay bales & dust storms.', b: 0, recLvl: 3, t1: '#8a6e3d', t2: '#685028', rd: '#5a4220', ln: '#7a5a30', wl: '#6a452d', ws: '#3d2516', cr: '#7a5a34', bd: '#8c4820', zs: 1.1, zh: 1, cm: 1.15, enemies: ['walk', 'run', 'charger', 'screamer'] },
  { n: 'Frozen Peak', d: 'Sub-zero snowfield with log cabin outpost, ice sheets, pines & snowfall.', b: 0, recLvl: 6, t1: '#c2d2dc', t2: '#a4b8c4', rd: '#8ca6b5', ln: '#b2c8d6', wl: '#546b7a', ws: '#364d5c', cr: '#6a8292', bd: '#38bdf8', zs: 1, zh: 1.2, cm: 1.2, enemies: ['walk', 'exp', 'tank', 'armored'] },
  { n: 'Toxic Swamp', d: 'Murky bog with rotting boardwalks, rippling water & glowing toxic pools.', b: 0, recLvl: 9, t1: '#26341d', t2: '#1b2614', rd: '#141e0e', ln: '#223018', wl: '#2a3520', ws: '#4d6830', cr: '#3d4826', bd: '#6adf3a', zs: 0.95, zh: 1, cm: 1.25, hz: '#6adf3a', hn: 12, hd: 7, enemies: ['walk', 'spit', 'stalker', 'bloater'] },
  { n: 'Ashlands', d: 'Obsidian fortress ruins, glowing magma fissures, slag heaps & embers.', b: 1, recLvl: 12, t1: '#1f1816', t2: '#140f0e', rd: '#0d0a09', ln: '#381c14', wl: '#3d2a24', ws: '#ff5a22', cr: '#4a2820', bd: '#ff5a22', zs: 1.05, zh: 1.1, cm: 1.4, hz: '#ff5a22', hn: 9, hd: 14, enemies: ['walk', 'exp', 'charger', 'shielder', 'boss'] },
  { n: 'Neon Lab', d: 'Cybernetic facility with modular tiled floors, servers, glass & neon lighting.', b: 1, recLvl: 15, t1: '#121622', t2: '#0b0e17', rd: '#06080f', ln: '#00e5ff', wl: '#1c2438', ws: '#00e5ff', cr: '#25324d', bd: '#00e5ff', zs: 1.15, zh: 1.25, cm: 1.6, hz: '#00e5ff', hn: 8, hd: 16, enemies: ['run', 'stalker', 'charger', 'necromancer', 'boss'] },
  { n: 'Bio-Dome', d: 'Mutated botanical greenhouse with dome struts, planter beds & spore mist.', b: 1, recLvl: 18, t1: '#0e1f16', t2: '#08140e', rd: '#040d08', ln: '#00ff88', wl: '#1c3828', ws: '#00ff88', cr: '#204d35', bd: '#00ff88', zs: 1.2, zh: 1.3, cm: 1.8, hz: '#00ff88', hn: 10, hd: 18, enemies: ['walk', 'spit', 'stalker', 'bloater', 'shielder', 'boss'] }
];

const MREQ = [0, 3, 6, 9, 12, 15, 18];

// Data definitions for the 7 logical, believable game zones
const MAP_DATA = [];

// Helper to construct realistic environments
function buildMapData() {
  // === MAP 0: DOWNTOWN ===
  MAP_DATA[0] = {
    name: 'Downtown',
    roads: [
      { x: 0, y: 1100, w: 2400, h: 200, type: 'h_boulevard' },
      { x: 1100, y: 0, w: 200, h: 2400, type: 'v_avenue' }
    ],
    crosswalks: [
      { x: 1030, y: 1100, w: 70, h: 200 },
      { x: 1300, y: 1100, w: 70, h: 200 },
      { x: 1100, y: 1030, w: 200, h: 70 },
      { x: 1100, y: 1300, w: 200, h: 70 }
    ],
    sidewalks: [
      { x: 0, y: 1060, w: 2400, h: 40 },
      { x: 0, y: 1300, w: 2400, h: 40 },
      { x: 1060, y: 0, w: 40, h: 2400 },
      { x: 1300, y: 0, w: 40, h: 2400 }
    ],
    walls: [
      // 4 Main City Blocks
      { x: 300, y: 300, w: 560, h: 460, t: 'building', name: 'Metro Plaza', col: '#363d33', roof: '#272d24' },
      { x: 1540, y: 300, w: 560, h: 460, t: 'building', name: 'Financial Tower', col: '#34383c', roof: '#24282c' },
      { x: 300, y: 1640, w: 560, h: 460, t: 'building', name: 'Central Hospital', col: '#383630', roof: '#282622' },
      { x: 1540, y: 1640, w: 560, h: 460, t: 'building', name: 'Commerce Center', col: '#3d3434', roof: '#2c2424' },
      // Corner annexes
      { x: 920, y: 480, w: 100, h: 180, t: 'building', col: '#2c3328' },
      { x: 1380, y: 480, w: 100, h: 180, t: 'building', col: '#2c3328' },
      { x: 920, y: 1740, w: 100, h: 180, t: 'building', col: '#2c3328' },
      { x: 1380, y: 1740, w: 100, h: 180, t: 'building', col: '#2c3328' },
      // Concrete barricades on avenues
      { x: 700, y: 1180, w: 110, h: 26, t: 'barrier', col: '#505648' },
      { x: 1590, y: 1180, w: 110, h: 26, t: 'barrier', col: '#505648' },
      { x: 1180, y: 720, w: 26, h: 110, t: 'barrier', col: '#505648' },
      { x: 1180, y: 1570, w: 26, h: 110, t: 'barrier', col: '#505648' }
    ],
    props: [
      // Crashed vehicles on streets
      { x: 860, y: 1140, type: 'car', rot: 0.35, col: '#2563eb', label: 'POLICE' },
      { x: 1450, y: 1220, type: 'car', rot: -0.25, col: '#eab308', label: 'TAXI' },
      { x: 1150, y: 880, type: 'car', rot: 1.45, col: '#dc2626', label: 'AMBULANCE' },
      { x: 1240, y: 1520, type: 'car', rot: -1.2, col: '#475569', label: 'SUV' },
      { x: 420, y: 1170, type: 'car', rot: 0.12, col: '#16a34a' },
      { x: 1950, y: 1130, type: 'car', rot: -0.4, col: '#7c3aed' },
      // Street Lamps
      { x: 800, y: 1080, type: 'lamp', light: true, r: 140 },
      { x: 1040, y: 1080, type: 'lamp', light: true, r: 140 },
      { x: 1360, y: 1080, type: 'lamp', light: true, r: 140 },
      { x: 1600, y: 1080, type: 'lamp', light: true, r: 140 },
      { x: 800, y: 1320, type: 'lamp', light: true, r: 140 },
      { x: 1040, y: 1320, type: 'lamp', light: true, r: 140 },
      { x: 1360, y: 1320, type: 'lamp', light: true, r: 140 },
      { x: 1600, y: 1320, type: 'lamp', light: true, r: 140 },
      // Dumpsters
      { x: 890, y: 770, type: 'dumpster', rot: 0 },
      { x: 1490, y: 770, type: 'dumpster', rot: 0 },
      { x: 890, y: 1630, type: 'dumpster', rot: 0 },
      { x: 1490, y: 1630, type: 'dumpster', rot: 0 },
      // Manholes
      { x: 1200, y: 1200, type: 'manhole' },
      { x: 600, y: 1200, type: 'manhole' },
      { x: 1800, y: 1200, type: 'manhole' }
    ],
    hazards: []
  };

  // === MAP 1: DUST BOWL ===
  MAP_DATA[1] = {
    name: 'Dust Bowl',
    roads: [
      { x: 0, y: 1150, w: 2400, h: 100, type: 'dirt_road' },
      { x: 1150, y: 0, w: 100, h: 2400, type: 'dirt_road' }
    ],
    walls: [
      // Farmhouse & Barn compound
      { x: 820, y: 840, w: 320, h: 210, t: 'farmhouse', col: '#5c3a21', roof: '#422814' },
      { x: 1260, y: 800, w: 380, h: 260, t: 'barn', col: '#78281a', roof: '#4d160c' },
      { x: 860, y: 1350, w: 240, h: 160, t: 'shed', col: '#4a3320', roof: '#302012' },
      { x: 1320, y: 1380, w: 260, h: 170, t: 'corral', col: '#5c3a21', roof: '#3d2514' },
      // Fence sections
      { x: 500, y: 750, w: 280, h: 16, t: 'fence', col: '#614328' },
      { x: 1660, y: 750, w: 280, h: 16, t: 'fence', col: '#614328' },
      { x: 500, y: 1650, w: 280, h: 16, t: 'fence', col: '#614328' },
      { x: 1660, y: 1650, w: 280, h: 16, t: 'fence', col: '#614328' }
    ],
    props: [
      // Farmhouse & Windmill
      { x: 820, y: 840, type: 'farmhouse', w: 140, h: 90 },
      { x: 1200, y: 1100, type: 'windmill', rot: 0 },
      // Silo
      { x: 1220, y: 760, type: 'silo', r: 36, col: '#78716c' },
      // Hay bales
      { x: 1180, y: 920, type: 'hay_bale' }, { x: 1210, y: 920, type: 'hay_bale' },
      { x: 1400, y: 1100, type: 'hay_bale' }, { x: 1430, y: 1100, type: 'hay_bale' },
      { x: 1000, y: 1200, type: 'hay_bale' },
      // Barrels
      { x: 1120, y: 870, type: 'barrel' }, { x: 1135, y: 875, type: 'barrel' },
      { x: 1240, y: 1350, type: 'barrel' }, { x: 1255, y: 1350, type: 'barrel' },
      // Tire tracks
      { x: 700, y: 1160, type: 'tire_tracks' },
      { x: 1700, y: 1160, type: 'tire_tracks' }
    ],
    hazards: []
  };

  // === MAP 2: FROZEN PEAK ===
  MAP_DATA[2] = {
    name: 'Frozen Peak',
    roads: [],
    icePatches: [
      { x: 1000, y: 1000, w: 400, h: 400, r: 180 },
      { x: 500, y: 600, w: 300, h: 300, r: 120 },
      { x: 1800, y: 1600, w: 350, h: 350, r: 140 }
    ],
    walls: [
      // Log Cabins & Outposts
      { x: 880, y: 860, w: 340, h: 220, t: 'cabin', col: '#3d4d59', roof: '#e2e8f0' },
      { x: 1300, y: 880, w: 220, h: 180, t: 'cabin', col: '#344552', roof: '#e2e8f0' },
      { x: 920, y: 1320, w: 260, h: 180, t: 'bunker', col: '#2d3b47', roof: '#cbd5e1' },
      { x: 1340, y: 1340, w: 280, h: 190, t: 'bunker', col: '#2d3b47', roof: '#cbd5e1' }
    ],
    props: [
      // Cabin & Ice Patches
      { x: 960, y: 920, type: 'cabin', w: 120, h: 80 },
      { x: 1000, y: 1000, type: 'ice_patch', r: 90 },
      { x: 1400, y: 1200, type: 'ice_patch', r: 75 },
      // Pine Trees
      { x: 650, y: 700, type: 'pine', r: 32 }, { x: 720, y: 740, type: 'pine', r: 28 },
      { x: 1700, y: 720, type: 'pine', r: 35 }, { x: 1780, y: 760, type: 'pine', r: 30 },
      { x: 680, y: 1650, type: 'pine', r: 34 }, { x: 750, y: 1720, type: 'pine', r: 30 },
      { x: 1680, y: 1620, type: 'pine', r: 36 }, { x: 1750, y: 1690, type: 'pine', r: 32 },
      { x: 1200, y: 650, type: 'pine', r: 30 }, { x: 1200, y: 1750, type: 'pine', r: 30 },
      // Snow Crates
      { x: 1100, y: 830, type: 'crate' }, { x: 1120, y: 830, type: 'crate' },
      { x: 1280, y: 1300, type: 'crate' },
      // Rock Cairn
      { x: 1150, y: 1150, type: 'cairn' }
    ],
    hazards: []
  };

  // === MAP 3: TOXIC SWAMP ===
  MAP_DATA[3] = {
    name: 'Toxic Swamp',
    waterChannels: [
      { x: 0, y: 1080, w: 2400, h: 240 },
      { x: 1080, y: 0, w: 240, h: 2400 }
    ],
    boardwalks: [
      { x: 960, y: 1160, w: 480, h: 80, t: 'boardwalk' },
      { x: 1160, y: 960, w: 80, h: 480, t: 'boardwalk' }
    ],
    walls: [
      // Old Drainage Facility
      { x: 800, y: 800, w: 240, h: 220, t: 'pump_station', col: '#222d1a', roof: '#161e11' },
      { x: 1360, y: 800, w: 260, h: 220, t: 'stilt_shack', col: '#2a3620', roof: '#1a2214' },
      { x: 800, y: 1380, w: 250, h: 220, t: 'stilt_shack', col: '#2a3620', roof: '#1a2214' },
      { x: 1360, y: 1380, w: 260, h: 220, t: 'pump_station', col: '#222d1a', roof: '#161e11' }
    ],
    props: [
      // Boardwalks & Glowing Puddles
      { x: 1050, y: 1200, type: 'boardwalk', w: 160, h: 48 },
      { x: 1350, y: 1200, type: 'boardwalk', w: 160, h: 48 },
      { x: 1100, y: 1050, type: 'glowing_puddle', r: 35 },
      { x: 1300, y: 1350, type: 'glowing_puddle', r: 42 },
      // Swamp Trees
      { x: 600, y: 650, type: 'swamp_tree', r: 34 }, { x: 1800, y: 650, type: 'swamp_tree', r: 34 },
      { x: 600, y: 1750, type: 'swamp_tree', r: 34 }, { x: 1800, y: 1750, type: 'swamp_tree', r: 34 },
      // Mossy Logs
      { x: 900, y: 1200, type: 'log', rot: 0.5 },
      { x: 1500, y: 1200, type: 'log', rot: -0.4 }
    ],
    hazards: [
      { x: 1000, y: 900, r: 48 }, { x: 1400, y: 900, r: 52 },
      { x: 1000, y: 1500, r: 50 }, { x: 1400, y: 1500, r: 46 },
      { x: 650, y: 1200, r: 56 }, { x: 1750, y: 1200, r: 54 },
      { x: 1200, y: 650, r: 50 }, { x: 1200, y: 1750, r: 52 }
    ]
  };

  // === MAP 4: ASHLANDS ===
  MAP_DATA[4] = {
    name: 'Ashlands',
    roads: [],
    lavaFissures: [
      { x: 300, y: 1180, w: 600, h: 40 },
      { x: 1500, y: 1180, w: 600, h: 40 },
      { x: 1180, y: 300, w: 40, h: 600 },
      { x: 1180, y: 1500, w: 40, h: 600 }
    ],
    walls: [
      // Ruined Fortress Keep
      { x: 840, y: 840, w: 320, h: 260, t: 'fortress', col: '#2c1e19', roof: '#170f0c' },
      { x: 1240, y: 840, w: 320, h: 260, t: 'refinery', col: '#33221c', roof: '#1a110e' },
      { x: 840, y: 1300, w: 320, h: 260, t: 'refinery', col: '#33221c', roof: '#1a110e' },
      { x: 1240, y: 1300, w: 320, h: 260, t: 'fortress', col: '#2c1e19', roof: '#170f0c' },
      // Ruined parapet sections
      { x: 600, y: 600, w: 200, h: 30, t: 'ruin_wall', col: '#241814' },
      { x: 1600, y: 600, w: 200, h: 30, t: 'ruin_wall', col: '#241814' },
      { x: 600, y: 1780, w: 200, h: 30, t: 'ruin_wall', col: '#241814' },
      { x: 1600, y: 1780, w: 200, h: 30, t: 'ruin_wall', col: '#241814' }
    ],
    props: [
      // Charred tree stumps
      { x: 750, y: 950, type: 'charred_tree' }, { x: 1650, y: 950, type: 'charred_tree' },
      { x: 750, y: 1450, type: 'charred_tree' }, { x: 1650, y: 1450, type: 'charred_tree' },
      // Slag heaps
      { x: 1200, y: 780, type: 'slag_heap' }, { x: 1200, y: 1620, type: 'slag_heap' }
    ],
    hazards: [
      { x: 550, y: 1200, r: 45 }, { x: 1850, y: 1200, r: 45 },
      { x: 1200, y: 550, r: 45 }, { x: 1200, y: 1850, r: 45 },
      { x: 950, y: 950, r: 40 }, { x: 1450, y: 950, r: 40 },
      { x: 950, y: 1450, r: 40 }, { x: 1450, y: 1450, r: 40 }
    ]
  };

  // === MAP 5: NEON LAB ===
  MAP_DATA[5] = {
    name: 'Neon Lab',
    floorTiles: true,
    walls: [
      // High-tech server banks & security pods
      { x: 860, y: 860, w: 300, h: 240, t: 'lab_core', col: '#151b28', roof: '#0c1017' },
      { x: 1240, y: 860, w: 300, h: 240, t: 'lab_core', col: '#151b28', roof: '#0c1017' },
      { x: 860, y: 1300, w: 300, h: 240, t: 'lab_core', col: '#151b28', roof: '#0c1017' },
      { x: 1240, y: 1300, w: 300, h: 240, t: 'lab_core', col: '#151b28', roof: '#0c1017' },
      // Glass partition walls
      { x: 500, y: 1190, w: 260, h: 20, t: 'glass_wall', col: '#00e5ff' },
      { x: 1640, y: 1190, w: 260, h: 20, t: 'glass_wall', col: '#00e5ff' }
    ],
    props: [
      // Glass Partitions
      { x: 1050, y: 1200, type: 'glass_partition', w: 120, h: 16 },
      { x: 1350, y: 1200, type: 'glass_partition', w: 120, h: 16 },
      // Server Racks
      { x: 920, y: 820, type: 'server_rack' }, { x: 980, y: 820, type: 'server_rack' },
      { x: 1300, y: 820, type: 'server_rack' }, { x: 1360, y: 820, type: 'server_rack' },
      { x: 920, y: 1560, type: 'server_rack' }, { x: 980, y: 1560, type: 'server_rack' },
      { x: 1300, y: 1560, type: 'server_rack' }, { x: 1360, y: 1560, type: 'server_rack' },
      // Neon Light Pools
      { x: 1000, y: 1200, type: 'neon_light', col: '#00e5ff', r: 120 },
      { x: 1400, y: 1200, type: 'neon_light', col: '#d946ef', r: 120 },
      { x: 1200, y: 1000, type: 'neon_light', col: '#00e5ff', r: 120 },
      { x: 1200, y: 1400, type: 'neon_light', col: '#d946ef', r: 120 }
    ],
    hazards: [
      { x: 1200, y: 1200, r: 42 }
    ]
  };

  // === MAP 6: BIO-DOME ===
  MAP_DATA[6] = {
    name: 'Bio-Dome',
    domeRibs: true,
    walls: [
      // Hydroponic Laboratories
      { x: 860, y: 860, w: 320, h: 240, t: 'greenhouse', col: '#172e20', roof: '#0c1a12' },
      { x: 1220, y: 860, w: 320, h: 240, t: 'greenhouse', col: '#172e20', roof: '#0c1a12' },
      { x: 860, y: 1300, w: 320, h: 240, t: 'greenhouse', col: '#172e20', roof: '#0c1a12' },
      { x: 1220, y: 1300, w: 320, h: 240, t: 'greenhouse', col: '#172e20', roof: '#0c1a12' },
      // Retaining Planter Walls
      { x: 550, y: 800, w: 220, h: 36, t: 'planter_wall', col: '#22442e' },
      { x: 1630, y: 800, w: 220, h: 36, t: 'planter_wall', col: '#22442e' },
      { x: 550, y: 1560, w: 220, h: 36, t: 'planter_wall', col: '#22442e' },
      { x: 1630, y: 1560, w: 220, h: 36, t: 'planter_wall', col: '#22442e' }
    ],
    props: [
      // Dome Ribs & Alien Vines
      { x: 1200, y: 1200, type: 'dome_rib', r: 350 },
      { x: 950, y: 1050, type: 'alien_vine', w: 80, h: 40 },
      { x: 1450, y: 1350, type: 'alien_vine', w: 80, h: 40 },
      // Planter Beds with Alien Flora
      { x: 1000, y: 1140, type: 'planter_bed', w: 120, h: 60 },
      { x: 1280, y: 1140, type: 'planter_bed', w: 120, h: 60 },
      // Grow Lights
      { x: 1060, y: 1110, type: 'grow_light', r: 130 },
      { x: 1340, y: 1110, type: 'grow_light', r: 130 }
    ],
    hazards: [
      { x: 1200, y: 1200, r: 48 },
      { x: 750, y: 1200, r: 42 }, { x: 1650, y: 1200, r: 42 }
    ]
  };
}

buildMapData();

// === MAP ENRICHMENT: tactical cover clusters + themed decor (deterministic per map) ===
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const COVER_THEME = [
  /* 0 Downtown   */ { kinds: [['barrier', 92, 22, '#505648'], ['crate', 38, 38, '#5b5444'], ['cover', 62, 26, '#3f4638']], clusters: 16 },
  /* 1 Dust Bowl  */ { kinds: [['crate', 40, 40, '#6b4a2a'], ['fence', 96, 14, '#614328'], ['cover', 58, 30, '#7a5a30']], clusters: 15 },
  /* 2 Frozen     */ { kinds: [['cover', 64, 34, '#7e98a8'], ['crate', 36, 36, '#9db4c2'], ['barrier', 84, 22, '#6d8696']], clusters: 14 },
  /* 3 Swamp      */ { kinds: [['cover', 74, 24, '#3a2f1e'], ['crate', 34, 34, '#2d3a22'], ['cover', 54, 30, '#34402a']], clusters: 15 },
  /* 4 Ashlands   */ { kinds: [['cover', 66, 32, '#3d2a24'], ['barrier', 88, 22, '#4a2f26'], ['crate', 38, 38, '#2b1d1a']], clusters: 16 },
  /* 5 Neon Lab   */ { kinds: [['barrier', 96, 20, '#1c2a44'], ['crate', 40, 40, '#16213a'], ['cover', 64, 26, '#22314f']], clusters: 16 },
  /* 6 Bio-Dome   */ { kinds: [['cover', 70, 28, '#1f4030'], ['crate', 36, 36, '#173324'], ['barrier', 86, 20, '#2a5240']], clusters: 14 }
];

// Per-sector ground texture palette for the crack / stain / debris pass.
// Dark sectors get light cracks and vice versa so the detail never disappears
// into the base fill.
const GROUND_THEME = [
  { crack: 'rgba(210,200,170,0.14)', stain: 'rgba(0,0,0,0.16)', debris: 'rgba(220,220,210,0.07)' }, // Downtown
  { crack: 'rgba(60,40,18,0.28)',   stain: 'rgba(120,88,40,0.14)', debris: 'rgba(230,205,150,0.08)' }, // Dust Bowl
  { crack: 'rgba(70,100,125,0.22)', stain: 'rgba(255,255,255,0.10)', debris: 'rgba(230,245,255,0.10)' }, // Frozen Peak
  { crack: 'rgba(150,200,110,0.14)',stain: 'rgba(0,0,0,0.20)', debris: 'rgba(180,230,140,0.07)' }, // Toxic Swamp
  { crack: 'rgba(255,120,60,0.14)', stain: 'rgba(0,0,0,0.28)', debris: 'rgba(255,150,90,0.08)' }, // Ashlands
  { crack: 'rgba(0,229,255,0.16)',  stain: 'rgba(0,0,0,0.22)', debris: 'rgba(120,240,255,0.10)' }, // Neon Lab
  { crack: 'rgba(0,255,136,0.13)',  stain: 'rgba(0,0,0,0.24)', debris: 'rgba(120,255,180,0.08)' }  // Bio-Dome
];

function enrichMapData() {
  for (let mi = 0; mi < MAP_DATA.length; mi++) {
    const md = MAP_DATA[mi], th = COVER_THEME[mi];
    if (!md || !th || md._enriched) continue;
    md._enriched = true;
    const gt = GROUND_THEME[mi] || GROUND_THEME[0];
    md.crack = md.crack || gt.crack;
    md.stain = md.stain || gt.stain;
    md.debris = md.debris || gt.debris;
    md.walls = md.walls || []; md.props = md.props || [];
    const rnd = mulberry32(9001 + mi * 7919);
    const hz = md.hazards || [];
    const clear = (x, y, w, h, pad) => {
      if (x < 80 || y < 80 || x + w > WS - 80 || y + h > WS - 80) return false;
      if (Math.hypot(x + w / 2 - WS / 2, y + h / 2 - WS / 2) < 300) return false;
      for (const o of md.walls) if (x < o.x + o.w + pad && x + w > o.x - pad && y < o.y + o.h + pad && y + h > o.y - pad) return false;
      for (const h2 of hz) if (Math.hypot(x + w / 2 - h2.x, y + h / 2 - h2.y) < h2.r + 50) return false;
      return true;
    };
    let placed = 0;
    for (let c = 0; c < th.clusters; c++) {
      for (let tries = 0; tries < 40; tries++) {
        const cx = 120 + rnd() * (WS - 240), cy = 120 + rnd() * (WS - 240);
        const kind = th.kinds[Math.floor(rnd() * th.kinds.length)];
        const shape = rnd() < 0.5 ? 'row' : 'L';
        const horiz = rnd() < 0.5;
        const pieces = [];
        const [t, w, h, col] = kind;
        const n = shape === 'row' ? 2 + Math.floor(rnd() * 2) : 2;
        for (let i = 0; i < n; i++) {
          pieces.push(horiz ? { x: cx + i * (w + 8), y: cy, w, h } : { x: cx, y: cy + i * (h + 8), w: h > w ? w : h, h: h > w ? h : w });
        }
        if (shape === 'L') pieces.push(horiz ? { x: cx, y: cy + h + 8, w: h, h: w } : { x: cx + w + 8, y: cy, w: h, h: w });
        if (!pieces.every(p => clear(p.x, p.y, p.w, p.h, 70))) continue;
        for (const p of pieces) md.walls.push({ x: Math.round(p.x), y: Math.round(p.y), w: Math.round(p.w), h: Math.round(p.h), t, col });
        placed++;
        break;
      }
    }
    // Decor: re-scatter the map's own prop types in open ground for a lived-in feel
    const types = [...new Set(md.props.filter(p => ['barrel', 'crate', 'hay_bale', 'pine', 'swamp_tree', 'charred_tree', 'slag_heap', 'cairn', 'log', 'planter_bed', 'server_rack', 'dumpster', 'neon_light', 'grow_light', 'alien_vine', 'ice_patch', 'glowing_puddle'].includes(p.type)).map(p => p.type))];
    if (types.length) {
      let added = 0;
      for (let tries = 0; tries < 400 && added < 26; tries++) {
        const x = 100 + rnd() * (WS - 200), y = 100 + rnd() * (WS - 200);
        if (!clear(x - 18, y - 18, 36, 36, 30)) continue;
        md.props.push({ x: Math.round(x), y: Math.round(y), type: types[Math.floor(rnd() * types.length)], rot: rnd() * 6.28 });
        added++;
      }
    }
  }
}
enrichMapData();

// Initializes obstacles O, props P_PROPS, hazards HZ for the active map
let P_PROPS = [];
let AMB_PARTICLES = [];

function initMapArchitecture(curM) {
  O = [];
  P_PROPS = [];
  HZ = [];
  AMB_PARTICLES = [];

  const mData = MAP_DATA[curM] || MAP_DATA[0];

  // 1. Load 3D Obstacles into O
  if (mData.walls) {
    for (const w of mData.walls) {
      O.push({
        x: w.x, y: w.y, w: w.w, h: w.h,
        t: w.t || 'building',
        col: w.col || '#3a4234',
        roof: w.roof || '#242a1e',
        name: w.name || ''
      });
    }
  }

  // 2. Load Props
  if (mData.props) {
    for (const p of mData.props) {
      P_PROPS.push({ ...p });
    }
  }

  // 3. Load Hazards
  if (mData.hazards) {
    for (const h of mData.hazards) {
      HZ.push({ x: h.x, y: h.y, r: h.r });
    }
  }

  // 4. Initialize Ambient Weather Particles
  const ambCount = getQualityProfile().ambientCount;
  for (let i = 0; i < ambCount; i++) {
    AMB_PARTICLES.push({
      x: Math.random() * WS,
      y: Math.random() * WS,
      vx: (Math.random() - 0.5) * 20 + (curM === 2 ? 15 : (curM === 1 ? 40 : 0)),
      vy: (Math.random() - 0.5) * 20 + (curM === 2 ? 35 : (curM === 4 ? -25 : 0)),
      sz: 1.5 + Math.random() * 2.5,
      alpha: 0.2 + Math.random() * 0.4,
      rot: Math.random() * 6.28
    });
  }
}

function getCurMap() {
  return (typeof S !== 'undefined' && S && S.isEvent && S.evDef && S.evDef.map != null) ? S.evDef.map : (typeof SV !== 'undefined' && SV ? (SV.map || 0) : 0);
}

function clearEventContext() {
  if (typeof S !== 'undefined' && S) {
    S.isEvent = false;
    S.evId = null;
    S.evDef = null;
    S.evElites = 0;
    S.evTargetWave = null;
    S.evWon = false;
  }
}
