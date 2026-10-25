// DEAD ZONE v2.0 - BOOTSTRAP & SYSTEM EVENT BINDINGS

const playBtn = document.getElementById('play');
if (playBtn) playBtn.onclick = begin;
const againBtn = document.getElementById('again');
if (againBtn) againBtn.onclick = begin;
const nextBtn = document.getElementById('next');
if (nextBtn) nextBtn.onclick = () => {
  const shopov = document.getElementById('shopov');
  if (shopov) shopov.classList.remove('on');
  startWave();
};

addEventListener('keydown', e => {
  K[e.key.toLowerCase()] = 1;
  if (e.key === 'Escape' || e.key === 'p') {
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

const lobBtn = document.getElementById('lob');
if (lobBtn) {
  lobBtn.onclick = () => {
    const over = document.getElementById('over');
    if (over) over.classList.remove('on');
    if (typeof clearEventContext === 'function') clearEventContext();
    const start = document.getElementById('start');
    if (start) start.classList.add('on');
    lobby();
  };
}

addEventListener('touchstart', () => { TCH = 1; M.down = 0; }, { passive: true });

// Load save data & initialize systems
ld();
init();
lobby();
initGameAssets();

const resBtn = document.getElementById('resume');
if (resBtn) resBtn.onclick = resume;
const quitBtn = document.getElementById('quit');
if (quitBtn) quitBtn.onclick = quit;

document.querySelectorAll('#nav button').forEach((b, i) => {
  b.onclick = () => tab(i);
});

const sndBtn = document.getElementById('sndbtn');
if (sndBtn) {
  sndBtn.onclick = () => {
    SV.mute = SV.mute ? 0 : 1;
    MUTE = SV.mute;
    sv();
    lobby();
  };
}

const apBtn = document.getElementById('apbtn');
if (apBtn) {
  apBtn.onclick = () => {
    SV.ap = SV.ap ? 0 : 1;
    sv();
    lobby();
  };
}

const dailyBtn = document.getElementById('daily');
if (dailyBtn) {
  dailyBtn.onclick = () => {
    SV.cr = (SV.cr || 0) + 200;
    SV.day = new Date().toDateString();
    SV.rev = (SV.rev || 0) + 1;
    SV.ts = Date.now();
    sv();
    lobby();
  };
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
window.addEventListener('pagehide', autoSave);
window.addEventListener('beforeunload', autoSave);

if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('appStateChange', state => {
    if (!state.isActive) { pause(); autoSave(); }
  });
}

// Kick off main animation loop
requestAnimationFrame(loop);
