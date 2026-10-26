// DEAD ZONE v1.0.2 - BOOTSTRAP & SYSTEM EVENT BINDINGS

/* ================================================================== */
// UI ACTIONS
//
// Every button in the shell - and in the markup the lobby renders, such as shop
// cards and mission rows - declares what it does with `data-act`, and the single
// delegated listener at the bottom of this file runs it. Nothing binds with an
// inline onclick attribute any more, which means: the markup carries no JS, a
// re-rendered button needs no re-binding, and a name that no longer resolves is
// caught by `npm run audit` before it ships instead of silently doing nothing
// when a player taps it.
//
// Render-scoped closures (perk cards, the gun picker list) still assign .onclick
// directly, because their handlers capture per-render state that a data
// attribute cannot carry.
const UI_ACTIONS = {
  // run lifecycle
  begin,
  resume,
  quit,
  toLobby: () => {
    // Credits are already banked by the death path (saveBest), so this only has
    // to leave the run; returnToLobby() also disarms the between-wave beat and
    // clears any lingering draft overlay.
    if (typeof clearEventContext === 'function') clearEventContext();
    if (typeof returnToLobby === 'function') returnToLobby();
    else { const o = document.getElementById('over'); if (o) o.classList.remove('on'); }
  },
  // shell
  tab: a => tab(Number(a) || 0),
  closeModal: a => { const el = document.getElementById(a); if (el) el.classList.remove('on'); },
  setColor: c => { PC = c; SV.col = PC; sv(); },
  toggleMute: () => { SV.mute = SV.mute ? 0 : 1; MUTE = SV.mute; sv(); lobby(); },
  toggleAutoPick: () => { SV.ap = SV.ap ? 0 : 1; sv(); lobby(); },
  claimDaily,
  openMapModal, closeMapModal,
  openMissionsModal, closeMissionsModal,
  openTacticalRecords,
  closeGunPicker,
  // filters
  filterEvents, filterSkins, filterShop, switchLobbyRewards,
  // comfort settings
  cycleCtlSize, cycleCtlOpacity, cycleCtlMode, cycleFx, cycleReducedMotion,
  toggleShake, toggleQuality, toggleGore,
  // cards the lobby event/mission/skin views render
  openEventBriefing, claimMission, claimLoginDay, claimRank,
  inspectSkin, equipSkinDirect,
  unequipSkin: unequipSkinDirect,
  unequipOpSkin: unequipOpSkinDirect,
  deployEvent: k => {
    const m = document.getElementById('ev-modal');
    if (m) m.classList.remove('on');
    beginEvent(k);
  }
};

document.addEventListener('click', e => {
  const t = e.target;
  const el = t && t.closest ? t.closest('[data-act]') : null;
  if (!el) return;
  const fn = UI_ACTIONS[el.dataset.act];
  if (typeof fn === 'function') fn(el.dataset.arg, el);
});
// The between-wave screen and its NEXT WAVE button are gone; waves roll on
// automatically once the clear beat and any perk draft are finished. Space or
// Enter still skips the beat if the player wants to move faster.
addEventListener('keydown', e => {
  if ((e.key === ' ' || e.key === 'Enter') && pendingNextWave && !S?.po) {
    e.preventDefault();
    startWave();
  }
});

addEventListener('keydown', e => {
  K[e.key.toLowerCase()] = 1;
  if (e.key === 'Escape' || e.key === 'p') {
    // Close any open hub window first so Escape always means "back one step".
    const mm = document.getElementById('map-modal');
    const ms = document.getElementById('missions-modal');
    if (mm && mm.classList.contains('on')) { closeMapModal(); return; }
    if (ms && ms.classList.contains('on')) { closeMissionsModal(); return; }
    if (run) pause();
    else {
      const p = document.getElementById('pause');
      if (p && p.classList.contains('on')) resume();
    }
  }
  if (run) {
    if (e.key === 'q') swap();
    if (e.key === ' ') skill('dash');
    if (e.key === 'e') skill('nova');
    if (e.key === 'r') {
      if (!P.reloading && P.ammo < (WEAP[P.cur].mag || 12)) startReload();
      else skill('rage');
    }
  }
});

addEventListener('keyup', e => { K[e.key.toLowerCase()] = 0; });
addEventListener('mousemove', e => {
  if (TCH) return;
  M.x = e.clientX; M.y = e.clientY; M.moved = 1;
});
addEventListener('mousedown', e => {
  if (e.target === C && !TCH) M.down = 1;
});
addEventListener('mouseup', () => { M.down = 0; });

['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(n => {
  if (C) C.addEventListener(n, tch, { passive: false });
});

addEventListener('touchstart', () => { TCH = 1; M.down = 0; }, { passive: true });

// Load save data & initialize systems
const GAME_VERSION = '1.0.2';

ld();
init();
// Persisted graphics/gore/audio/comfort choices are applied before the first
// frame, so a player who turned shake off does not see it once more on launch.
applyVisualSettings();
lobby();
{ const t = document.querySelector('#p0 .tagline'); if (t) t.textContent = 'OUTBREAK PROTOCOL \u2022 v' + GAME_VERSION + (typeof saveWarning === 'function' ? saveWarning() : ''); }
initGameAssets();

refreshDailyBtn();

// Daily login credit. This used to write SV.day but never read it, so the
// button could be tapped repeatedly for +200 each time. Gate on the stored date
// and reflect the claimed state on the button itself.
function refreshDailyBtn() {
  const b = document.getElementById('daily');
  if (!b || typeof SV === 'undefined' || !SV) return;
  const claimed = SV.day === new Date().toDateString();
  b.disabled = claimed;
  b.textContent = claimed ? 'DAILY CLAIMED' : 'DAILY +200';
  b.style.opacity = claimed ? '0.5' : '1';
}

function claimDaily() {
  if (typeof SV === 'undefined' || !SV) return;
  const today = new Date().toDateString();
  if (SV.day === today) {
    if (typeof announce === 'function') announce('ALREADY CLAIMED', '#8892a0', 'come back tomorrow', 3);
    return;
  }
  SV.cr = (SV.cr || 0) + 200;
  SV.day = today;
  SV.rev = (SV.rev || 0) + 1;
  SV.ts = Date.now();
  sv();
  if (typeof announce === 'function') announce('DAILY BONUS', '#ffd36b', '+200 credits', 3);
  lobby();
  refreshDailyBtn();
}

addEventListener('pointerdown', () => ac());
addEventListener('click', e => {
  if (e.target && e.target.tagName === 'BUTTON' && typeof snd === 'function') {
    snd(520, 0.05, 'square', 0.04, 0.8);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); autoSave(); }
});
// Losing focus (alt-tab, notification shade, app switcher) must not leave a stick
// or the trigger latched: no touchend arrives while the window is unfocused.
window.addEventListener('blur', () => { if (typeof releaseAllInputs === 'function') releaseAllInputs(); });
window.addEventListener('pagehide', () => { if (typeof releaseAllInputs === 'function') releaseAllInputs(); autoSave(); });
window.addEventListener('beforeunload', autoSave);

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', state => {
    if (!state.isActive) { pause(); autoSave(); }
  });
}

window.addEventListener('resize', () => {
  if (typeof rs === 'function') rs();
  if (!run && typeof drawZonePreview === 'function') {
    drawZonePreview(typeof curPreviewZone !== 'undefined' ? curPreviewZone : 0);
  }
});

// Kick off main animation loop
requestAnimationFrame(loop);
