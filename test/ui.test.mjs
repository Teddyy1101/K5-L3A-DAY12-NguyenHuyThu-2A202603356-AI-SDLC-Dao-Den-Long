import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newGame, stepGame, tickRate, tuning } from '../src/core.mjs';
import { createRenderer } from '../src/render.mjs';

test('Canvas vẽ cảnh 3D với camera quay, người chơi nhảy và đèn sáng', () => {
  let polygons = 0;
  let lights = 0;
  let stars = 0;
  const point = (...values) => assert.ok(values.every(Number.isFinite));
  const gradient = { addColorStop: () => {} };
  const context = {
    beginPath() {}, closePath() {}, fill() {
      polygons += 1;
      if (this.fillStyle === '#ffdf73') stars += 1;
    },
    arc: point, moveTo: point, lineTo: point, fillRect: point,
    createLinearGradient: () => gradient,
    createRadialGradient(...values) { lights += 1; point(...values); return gradient; },
  };
  const game = newGame(1201, { player: { carried: tuning.pulse_cost }, lanterns: [{ id: 'L1', lit: true }],
    random_shades: false, shades: [{pos:[0,1,-Math.min(2,tuning.pulse_radius*.7)]}] });
  const draw = createRenderer(context);
  draw(1280, 720, game, 0, 0);
  assert.equal(stars, 0);
  stepGame(game, { move: [0, 0], cam_yaw_deg: 90, jump: true, pulse: true });
  draw(1280, 720, game, 1.2, 90);
  assert.equal(stars, 3);
  draw(390, 844, game, 1.25, -160);
  stars = 0;
  for (let tick = 0; tick < Math.ceil(tuning.pulse_stun_s * tickRate); tick++) stepGame(game);
  draw(1280, 720, game, 3.2, 0);
  assert.equal(stars, 0);
  assert.ok(polygons > 200);
  assert.ok(lights > 4);
});

test('đường vào game nhận phím, cập nhật HUD, hiển thị thua và chơi lại', async () => {
  const nodes = new Map();
  const handlers = new Map();
  for (const id of ['island','lit','flies','health','timer','score','prompt','result','result-title','result-detail','restart',
    'play-again','feedback','pause','night-name','mote-bar','dash-cd','pulse-cd','charm-status','next-night','result-menu',
    'stage','stage-title','stage-text','stage-action','stage-settings','pause-panel','resume','pause-replay','pause-settings',
    'pause-menu','settings','volume','sensitivity','settings-close','wood-cd','wood-options','stage-switch','pause-switch',
    'night-picker','picker-close','choose-night-1','choose-night-2','choose-night-3','dawn-target','accessible-palette']) {
    nodes.set(`#${id}`, { textContent:'', hidden:true, children:[], focus() {},
      append(child) { this.children.push(child); }, addEventListener:(type,callback)=>handlers.set(`${id}:${type}`,callback) });
  }
  Object.assign(nodes.get('#island'), { getContext: () => ({}), clientWidth: 0, clientHeight: 0 });
  let nextFrame;
  let now = 0;
  const originals = Object.fromEntries(['window', 'document', 'requestAnimationFrame'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage=new Map();
  globalThis.window = { addEventListener: (type, callback) => handlers.set(type, callback),
    localStorage:{getItem:(key)=>storage.get(key),setItem:(key,value)=>storage.set(key,value)} };
  globalThis.document = { querySelector:(id)=>nodes.get(id), createElement:()=>({children:[],
    append(...children) { this.children.push(...children); },addEventListener() {}}), addEventListener() {} };
  globalThis.requestAnimationFrame = (callback) => { nextFrame = callback; };
  const key = (type, value) => handlers.get(type)({ key: value, preventDefault() {} });
  const frames = (count, interval = 1000 / 60) => {
    for (let index = 0; index < count; index += 1) {
      nextFrame(now);
      now += interval;
    }
  };

  try {
    await import('../src/game.mjs');
    frames(1);
    handlers.get('stage-settings:click')();
    nodes.get('#volume').value=23;
    handlers.get('volume:input')();
    assert.equal(JSON.parse(storage.get('dao-den-long-settings')).volume,23);
    nodes.get('#accessible-palette').checked=true;
    handlers.get('accessible-palette:change')();
    assert.equal(JSON.parse(storage.get('dao-den-long-settings')).accessiblePalette,true);
    handlers.get('settings-close:click')();
    handlers.get('stage-action:click')();
    assert.match(nodes.get('#stage-text').textContent,/Ông Đăng/);
    handlers.get('stage-action:click')();
    assert.equal(nodes.get('#lit').textContent, '0 / 5');
    key('keydown','1');
    frames(1);
    assert.match(nodes.get('#wood-cd').textContent,/Mộc Độn 5.0s/);
    const atStart=nodes.get('#timer').textContent;
    key('keydown', 'Escape');
    frames(120);
    assert.equal(nodes.get('#pause-panel').hidden,false);
    assert.equal(nodes.get('#timer').textContent,atStart);
    handlers.get('resume:click')();
    frames(1);

    key('keydown', 'w');
    frames(Math.round(25*tickRate/tuning.player_speed));
    key('keyup', 'w');
    assert.match(nodes.get('#prompt').textContent, /Nạp ánh sáng/);
    key('keydown', 'e');
    frames(1);
    key('keyup', 'e');
    assert.match(nodes.get('#feedback').textContent, /Đã nạp/);
    assert.ok(Number(nodes.get('#score').textContent) >= tuning.score.per_mote);

    handlers.get('restart:click')();
    handlers.get('stage-action:click')();
    frames(Math.ceil(tuning.night1_duration_s/.14)+5,140);
    assert.equal(nodes.get('#result').hidden, false);
    assert.match(nodes.get('#timer').textContent,/⚠/);
    assert.match(nodes.get('#result-title').textContent, /chưa kịp sáng đèn/);
    handlers.get('play-again:click')();
    frames(1);
    assert.equal(nodes.get('#result').hidden, true);
    assert.equal(nodes.get('#health').textContent, '♥'.repeat(tuning.flames));
    assert.equal(nodes.get('#score').textContent, '0');
    handlers.get('stage-action:click')();
    key('keydown','Escape');
    handlers.get('pause-switch:click')();
    assert.equal(nodes.get('#night-picker').hidden,false);
    handlers.get('choose-night-3:click')();
    assert.match(nodes.get('#stage-title').textContent,/Tháp Chuông/);
    assert.equal(nodes.get('#lit').textContent,'0 / 7');
    assert.equal(nodes.get('#dawn-target').textContent,'Cần giữ 5');
    assert.equal(nodes.get('#wood-options').children.length,6);
  } finally {
    for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
