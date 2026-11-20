import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultInput, newGame, stepGame, tickRate } from '../src/core.mjs';
import { castWood, drawWood, updateWood, woodSettings, woodShake } from '../src/wood.mjs';

const quiet = {random_motes:false, random_shades:false, random_drifters:false};

test('bản chơi nảy lên và lùi khi Bóng Mực chạm, đường chạy mặc định giữ Contract', () => {
  const scenario={...quiet,shades:[{pos:[.8,1,0]}]};
  const browser=newGame(0,scenario);
  const headless=newGame(0,scenario);
  assert.deepEqual(stepGame(browser,defaultInput,true),stepGame(headless));
  stepGame(browser,defaultInput,true);
  stepGame(headless);
  assert.ok(browser.player.pos[0]<0);
  assert.ok(browser.player.pos[1]>0);
  assert.ok(browser.player.invuln>0);
  assert.deepEqual(headless.player.pos,[0,0,0]);
});

test('gỗ sinh nhánh, đất vỡ, lá và hoa, rồi giữ mục tiêu và phát rung lúc chạm', () => {
  const game=newGame(0,{...quiet,shades:[{pos:[0,1,10]}]});
  const enabled=woodSettings();
  const cast=castWood(game,enabled);
  assert.equal(cast.target,game.shades[0]);
  game.simTick=cast.impactTick-1;
  assert.equal(updateWood(game,cast),false);
  const trail=[];
  drawWood(trail,game,cast);
  for (const color of ['#aa8a6b','#85bf57','#ff9ace']) {
    assert.ok(trail.some((face)=>face.color===color));
  }
  const bare=[];
  drawWood(bare,game,{...cast,options:woodSettings({wave:false,branches:false,earth:false,leaves:false,flowers:false})});
  assert.ok(bare.length<trail.length);
  game.simTick=cast.impactTick+3;
  assert.equal(updateWood(game,cast),true);
  assert.equal(game.shades[0].state,'stunned');
  assert.equal(game.shades[0].woodSleepUntil,game.simTick+enabled.sleep*tickRate);
  assert.notEqual(woodShake(game,cast),0);
  assert.equal(updateWood(game,cast),false);
  const impact=[];
  drawWood(impact,game,cast);
  assert.ok(impact.some((face)=>face.color==='#ffc0d9'));
  const loosened=[];
  drawWood(loosened,game,{...cast,options:woodSettings({coil:false,flowers:false})});
  assert.ok(loosened.length<impact.length);
});

test('Mộc Độn giữ Gió Lạc tại chỗ và hoa có thể tắt riêng',()=>{
  const game=newGame(0,{...quiet,player:{carried:8},drifters:[{pos:[0,1,1],state:'chase'}]},2);
  const cast=castWood(game,woodSettings({flowers:false}));
  game.simTick=cast.impactTick;
  assert.equal(updateWood(game,cast),true);
  assert.equal(cast.target.woodSleepUntil,undefined);
  const origin=[...cast.target.pos];
  stepGame(game,defaultInput,true);
  assert.deepEqual(cast.target.pos,origin);
  assert.equal(game.player.carried,8);
});
