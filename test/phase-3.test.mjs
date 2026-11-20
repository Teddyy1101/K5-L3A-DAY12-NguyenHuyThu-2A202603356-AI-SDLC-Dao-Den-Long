import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacityFor, defaultInput, fuelLevel, nearbyLantern, newGame, snapshot, stepGame, tickRate } from '../src/core.mjs';
import { parseScenario } from '../src/headless-schema.mjs';

const quiet={random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false};
const play=(state,steps=1)=>Array.from({length:steps},()=>stepGame(state)).flat();
const interact={...defaultInput,interact:true};

test('đèn dùng dầu nguyên theo tick, pause giữ nguyên dầu, cạn dầu phát một sự kiện',()=>{
  const state=newGame(0,{...quiet,lanterns:[{id:'L1',lit:true,fuel:2/tickRate},{id:'L2',lit:true}]});
  assert.equal(snapshot(state).lanterns[1].fuel,100);
  assert.equal(snapshot(state).player.capacity,10);
  assert.equal(state.score,0);
  stepGame(state,{...defaultInput,pause:true});
  play(state,4);
  assert.equal(fuelLevel(state.lanterns[0]),2/tickRate);
  assert.equal(state.simTick,0);
  stepGame(state,{...defaultInput,pause:true});
  const events=play(state,3);
  assert.deepEqual(events.filter((e)=>e.name==='lantern_out').map(({data,tick})=>({data,tick})),
    [{data:{lantern_id:'L1'},tick:7}]);
  assert.deepEqual(snapshot(state).lanterns[0],{id:'L1',pos:[0,0,25],lit:false,deposited:0,fuel:0,ever_lit:true,relit_count:0});
});

test('châm dầu theo ceil, đầy dầu bị loại và khoảng cách hòa chọn ID nhỏ hơn',()=>{
  const state=newGame(0,{...quiet,player:{carried:6},lanterns:[
    {id:'L1',pos:[1,0,0],lit:true,fuel:82},{id:'L2',pos:[-1,0,0],lit:true,fuel:66},
  ]});
  const events=stepGame(state,interact);
  assert.deepEqual(events.map(({name,data})=>[name,data]),[['refuel',{lantern_id:'L1',amount:2,fuel:100}]]);
  assert.equal(state.player.carried,4);
  assert.equal(state.score,10);
  assert.equal(nearbyLantern(state).id,'L2');
  const none=newGame(0,{...quiet,lanterns:[{id:'L1',pos:[0,0,0],lit:true}]});
  assert.equal(nearbyLantern(none),undefined);
  assert.equal(stepGame(none,interact).length,0);
  assert.equal(none.score,0);
});

test('đèn tắt ở bước 2 thắp lại cùng tick chỉ tốn 5, tăng sức chứa tới trần 20',()=>{
  const state=newGame(0,parseScenario({...quiet,player:{carried:17,successful_lights:4},
    lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:1/tickRate}]}));
  assert.equal(snapshot(state).player.capacity,18);
  const events=stepGame(state,interact);
  assert.deepEqual(events.map(({name,data})=>[name,data]),[
    ['lantern_out',{lantern_id:'L1'}],
    ['deposit',{lantern_id:'L1',amount:5,deposited:5}],
    ['lantern_lit',{lantern_id:'L1',relight:true}],
  ]);
  assert.equal(snapshot(state).lanterns[0].fuel,100);
  assert.equal(snapshot(state).lanterns[0].relit_count,1);
  assert.equal(snapshot(state).player.capacity,20);
  assert.equal(capacityFor(40),20);
  assert.equal(state.score,65);
  assert.equal(newGame(0,{},2).player.successfulLights,0);
});

test('hai Bóng Mực hút đồng thời và phát báo cáo mỗi 60 tick hút của từng con',()=>{
  const state=newGame(0,parseScenario({...quiet,lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:25}],
    shades:[{id:'S1',pos:[20.5,1,0],state:'drain',target_lantern_id:'L1'},
      {id:'S2',pos:[21,1,0],state:'drain',target_lantern_id:'L1'}]}));
  assert.deepEqual(play(state,59),[]);
  assert.deepEqual(play(state).map(({name,data,tick})=>[name,data,tick]),[
    ['fuel_drain',{lantern_id:'L1',shade_id:'S1',fuel:14},60],
    ['fuel_drain',{lantern_id:'L1',shade_id:'S2',fuel:14},60],
  ]);
  assert.equal(snapshot(state).lanterns[0].fuel,14);
  play(state,77);
  assert.equal(state.lanterns[0].lit,false);
  assert.ok(state.shades.every((shade)=>shade.state==='wander'));
});

test('Bóng lượn ưu tiên đèn yếu, phá hòa theo ID, sau đó chuyển đuổi trong 6 m',()=>{
  const state=newGame(0,{...quiet,lanterns:[{id:'L1',pos:[20,0,0],lit:true,fuel:20},
    {id:'L2',pos:[22,0,0],lit:true,fuel:20},{id:'L3',pos:[21,0,0]}],
    shades:[{pos:[21,1,0],state:'wander'}]});
  play(state);
  assert.equal(state.shades[0].state,'drain');
  assert.equal(state.shades[0].targetLantern.id,'L1');
  state.player.pos=[16,0,0];
  play(state);
  assert.equal(state.shades[0].state,'chase');
});

test('châm chính xác lên 30 khôi phục vùng an toàn và hoàn tất đẩy trong 30 tick',()=>{
  const state=newGame(0,{...quiet,player:{carried:1},
    lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:20.1}],
    shades:[{pos:[.4,1,0],state:'drain',target_lantern_id:'L1'}]});
  const first=stepGame(state,interact);
  assert.equal(first.find(({name})=>name==='refuel').data.fuel,30);
  assert.equal(state.shades[0].state,'wander');
  assert.ok(state.shades[0].pos[0]>.4);
  assert.equal(play(state,29).some(({name})=>name==='player_hit'),false);
  assert.ok(state.shades[0].pos[0]>=6);
  const overlap=newGame(0,{...quiet,lanterns:[
    {id:'L1',pos:[0,0,0],lit:true},{id:'L2',pos:[5,0,0],lit:true},
  ],shades:[{pos:[.4,1,0],state:'wander'}]});
  assert.equal(play(overlap,30).some(({name})=>name==='player_hit'),false);
  assert.ok(overlap.shades[0].pos[0]>11);
});

test('Tỏa Sáng tính tổng +15 khi trúng Bóng hút dầu và hết choáng chuyển về wander',()=>{
  const state=newGame(0,{...quiet,player:{carried:3},lanterns:[{id:'L1',pos:[0,0,0],lit:true,fuel:12}],
    shades:[{pos:[1,1,0],state:'drain',target_lantern_id:'L1'}]});
  const events=stepGame(state,{...defaultInput,pulse:true});
  assert.deepEqual(events.find((e)=>e.name==='pulse').data.stunned_ids,['S1']);
  assert.equal(state.score,15);
  assert.equal(state.shades[0].state,'stunned');
  play(state,120);
  assert.equal(state.shades[0].state,'wander');
});

test('đèn cạn đúng tick bình minh làm hụt ngưỡng và ra dawn',()=>{
  const state=newGame(0,{...quiet,time_left_s:1/tickRate,lanterns:[
    {id:'L1',lit:true,fuel:1/tickRate},{id:'L2',lit:true},{id:'L3',lit:true},
  ]});
  const events=stepGame(state);
  assert.deepEqual(events.map(({name})=>name),['lantern_out','game_over']);
  assert.deepEqual(events.at(-1).data,{result:'lost',reason:'dawn'});
  assert.equal(state.score,0);
});
