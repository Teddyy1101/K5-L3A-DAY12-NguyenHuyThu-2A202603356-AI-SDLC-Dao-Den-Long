import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after,test } from 'node:test';
import { tickRate,tuning } from '../src/core.mjs';
import { floorAt,nights } from '../src/nights.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const scratch=mkdtempSync(join(tmpdir(),'dao-den-long-phase-2-'));
const quiet={random_motes:false,random_shades:false,random_drifters:false};
let sequence=0;

after(()=>{
  for (const file of readdirSync(scratch)) rmSync(join(scratch,file));
  rmdirSync(scratch);
});

function run(night,ticks,scenario,frames=[],every=1) {
  const prefix=join(scratch,String(sequence++));
  writeFileSync(prefix+'-scenario.json',JSON.stringify(scenario));
  writeFileSync(prefix+'-inputs.json',JSON.stringify({frames}));
  const result=spawnSync(process.execPath,[join(root,'src','headless.mjs'),'--night',String(night),'--seed','1201',
    '--ticks',String(ticks),'--snapshot-every',String(every),'--out',prefix+'.jsonl',
    '--scenario',prefix+'-scenario.json','--inputs',prefix+'-inputs.json'],{encoding:'utf8',cwd:root,windowsHide:true});
  assert.equal(result.status,0,result.error?.message ?? result.stderr);
  const bytes=readFileSync(prefix+'.jsonl','utf8');
  const rows=bytes.trim().split('\n').map(JSON.parse);
  return {bytes, snapshots:rows.filter((row)=>row.type==='snapshot'),
    events:rows.filter((row)=>row.type==='event'), end:rows.at(-1)};
}

test('ba bản đồ chuẩn, tọa độ đèn, vách đảo, cầu và cao độ tầng',()=>{
  for (const night of [1,2,3]) {
    const result=run(night,1,{...quiet});
    assert.deepEqual(result.snapshots[0].lanterns.map((l)=>l.pos),nights[night].lanterns);
    assert.equal(result.snapshots[0].night,night);
    assert.deepEqual(result.events[0],{type:'event',tick:0,name:'night_start',data:{night}});
  }
  assert.equal(floorAt(1,40,0),0);
  assert.equal(floorAt(1,40.01,0),-Infinity);
  assert.equal(floorAt(2,35,1),0);
  assert.equal(floorAt(2,35,2.1),-Infinity);
  assert.equal(floorAt(3,0,18),3);
  assert.equal(floorAt(3,0,-18),0);
  assert.equal(floorAt(3,0,6),6);
});

test('pause giữ sim_tick, TTL, hồi chiêu và thời gian, resume tiếp tục mô phỏng',()=>{
  const {snapshots,events}=run(2,10,{...quiet,player:{dash_cd_ticks:10,charm_ticks:12},
    motes:[{pos:[8,0,0],kind:'dropped',ttl_ticks:12}]},
  [{tick:1,pause:true},{tick:2,pause:false},{tick:7,pause:true}]);
  assert.equal(snapshots[2].state,'paused');
  for (const tick of [2,3,4,5,6,7]) {
    const snapshot=snapshots[tick];
    assert.equal(snapshot.sim_tick,1);
    assert.equal(snapshot.time_left_s,snapshots[1].time_left_s);
    assert.equal(snapshot.motes[0].ttl_s,snapshots[1].motes[0].ttl_s);
    assert.equal(snapshot.player.dash_cd_s,snapshots[1].player.dash_cd_s);
    assert.equal(snapshot.player.charm_s,snapshots[1].player.charm_s);
  }
  assert.equal(snapshots[8].sim_tick,2);
  assert.deepEqual(events.map(({name,tick})=>[name,tick]),[['night_start',0],['paused',2],['resumed',8]]);
});

test('bục nhảy Đêm 2 giữ vận tốc phóng và vượt biển mây, cầu có thể đi bộ',()=>{
  const flight=run(2,90,{...quiet,player:{pos:[20,0,18]}},[{tick:0,move:[-1,0]}]);
  assert.ok(flight.snapshots[1].player.vel[0]>20);
  assert.equal(flight.snapshots[1].player.grounded,false);
  assert.ok(flight.snapshots[85].player.pos[0]>48);
  assert.equal(flight.snapshots[90].player.grounded,true);
  const walk=run(2,Math.ceil(13/tuning.player_speed*tickRate),{...quiet,player:{pos:[29,0,0]}},[{tick:0,move:[1,0]}],20);
  assert.ok(walk.snapshots.at(-1).player.pos[0]>39);
  assert.equal(walk.events.some(({name})=>name==='player_hit'),false);
});

test('Đêm 3 lên dốc, bục đưa lên tầng 2, đi khỏi gờ rơi về tầng dưới',()=>{
  const angle=Math.PI/6;
  const climber=run(3,Math.ceil(7/tuning.player_speed*tickRate),{...quiet,wind_enabled:false,
    player:{pos:[30*Math.cos(angle),0,30*Math.sin(angle)]}},[{tick:0,move:[-Math.cos(angle),-Math.sin(angle)]}]);
  assert.equal(climber.snapshots.at(-1).player.pos[1],3);
  const leap=run(3,85,{...quiet,wind_enabled:false,player:{pos:[0,3,13]}});
  assert.equal(leap.snapshots.at(-1).player.pos[1],6);
  const descent=run(3,90,{...quiet,wind_enabled:false,player:{pos:[0,6,-7.95]}},[{tick:0,move:[0,-1]}]);
  assert.equal(descent.snapshots.at(-1).player.pos[1],0);
  const wall=run(3,20,{...quiet,wind_enabled:false,player:{pos:[0,0,25]}},[{tick:0,move:[0,-1]}]);
  assert.ok(wall.snapshots.at(-1).player.pos[2]>=24);
});

test('rơi khỏi bờ làm mất Ngọn Lửa và báo số đom đóm bị mất',()=>{
  const result=run(1,130,{...quiet,player:{pos:[39.95,0,0],carried:4}},[{tick:0,move:[1,0]}]);
  const hit=result.events.find(({name})=>name==='player_hit');
  assert.deepEqual(hit.data,{by:'fall',flames:tuning.flames-1,dropped:0,lost:4});
  assert.equal(result.snapshots[hit.tick].player.carried,0);
  assert.ok(hit.tick>=60);
  assert.ok(result.snapshots[hit.tick].player.pos[1]<-10);
  assert.deepEqual(result.snapshots[hit.tick+60].player.pos,[0,0,0]);
  assert.deepEqual(result.snapshots[hit.tick+60].player.vel,[0,0,0]);
  assert.equal(result.snapshots[hit.tick+60].player.invuln,true);
});

test('lướt chuẩn 14 m/s trong 12 tick, bùa bỏ hồi chiêu, bùa hồi sau 2700 tick',()=>{
  const result=run(2,2702,{...quiet,player:{pos:[35,0,0]}},[
    {tick:1,dash:true,move:[1,0]},{tick:2,dash:false,move:[0,0]},
    {tick:3,dash:true},{tick:4,dash:false},{tick:13,dash:true},{tick:14,dash:false},
  ]);
  assert.deepEqual(result.events.filter((e)=>e.name==='dash').map((e)=>e.tick),[2,14]);
  assert.equal(result.snapshots[2].player.vel[0],14);
  assert.equal(result.snapshots[13].player.vel[0],14);
  assert.equal(result.snapshots[2].player.dash_cd_s,0);
  assert.equal(result.snapshots[1].player.charm_s,10);
  assert.equal(result.snapshots[1].charms[0].respawn_s,45);
  assert.equal(result.snapshots[2701].charms[0].available,true);
  const regular=run(1,20,quiet,[{tick:0,dash:true,move:[1,0]},{tick:1,dash:false},{tick:12,dash:true}]);
  assert.deepEqual(regular.events.filter(({name})=>name==='dash').map(({tick})=>tick),[1]);
  assert.ok(regular.snapshots[2].player.dash_cd_s > 0);
  assert.equal(regular.snapshots[13].player.vel[0],tuning.player_speed);
});

test('Gió Lạc cướp trong vùng đèn khi bất tử, Tỏa Sáng thu hồi đom đóm',()=>{
  const result=run(2,125,{...quiet,player:{carried:8,invuln_ticks:90},
    lanterns:[{id:'L1',pos:[0,0,0],lit:true}],drifters:[{id:'D1',pos:[1,1,0],state:'chase'}]},
  [{tick:1,pulse:true}]);
  assert.deepEqual(result.events.find(({name})=>name==='drifter_steal').data,{drifter_id:'D1',amount:3,carried:5});
  assert.deepEqual(result.events.find(({name})=>name==='drifter_drop').data,{drifter_id:'D1',amount:3});
  assert.equal(result.snapshots[2].motes.length,3);
  assert.ok(result.snapshots[2].motes.every((m)=>m.kind==='dropped' && m.ttl_s>0));
  assert.equal(result.snapshots[122].drifters[0].state,'removed');
  assert.equal(result.snapshots[122].player.flames,tuning.flames);
  const fendOff=run(3,3,{...quiet,player:{carried:8},drifters:[{pos:[1,1,0],state:'chase'}]},[{tick:0,pulse:true}]);
  assert.equal(fendOff.snapshots[1].drifters[0].state,'flee');
  assert.equal(fendOff.events.some(({name})=>name==='drifter_steal'),false);
});

test('Gió Lạc sinh từ tick 1200, Bóng Mực sinh theo lịch, gió Đêm 3 chạy đúng 5 s',()=>{
  const time=run(3,2101,{random_motes:false,player:{invuln_ticks:2200}},[],1);
  assert.equal(time.snapshots[1200].drifters[0].id,'D1');
  assert.equal(time.snapshots[1199].drifters.length,0);
  assert.equal(time.events.find(({name})=>name==='shade_spawned').tick,300);
  assert.equal(time.snapshots[1799].wind.active,false);
  assert.equal(time.snapshots[1800].wind.active,true);
  assert.ok(Math.abs(Math.hypot(time.snapshots[1800].player.vel[0],time.snapshots[1800].player.vel[2])-2)<.002);
  assert.equal(time.snapshots[2099].wind.active,true);
  assert.equal(time.snapshots[2100].wind.active,false);
  assert.equal(time.bytes,run(3,2101,{random_motes:false,player:{invuln_ticks:2200}},[],1).bytes);
});

test('đom đóm rơi hết TTL, Bóng Mực đang choáng vẫn tính điểm khi trúng thêm',()=>{
  const result=run(1,5,{...quiet,player:{carried:tuning.pulse_cost},
    motes:[{pos:[7,0,0],kind:'dropped',ttl_ticks:2}],shades:[{pos:[1,1,0],state:'stunned',state_ticks_left:15}]},
  [{tick:0,pulse:true}]);
  assert.equal(result.snapshots[1].score,5);
  assert.equal(result.snapshots[1].motes.length,1);
  assert.equal(result.snapshots[2].motes.length,0);
});

test('20 đom đóm ban đầu ở điểm riêng biệt và sinh thêm từ tick 240',()=>{
  const result=run(3,480,{random_shades:false,random_drifters:false,wind_enabled:false},[],120);
  const [start,first,second]=[result.snapshots[0],result.snapshots[2],result.snapshots[4]];
  assert.equal(start.motes_active,20);
  assert.equal(new Set(start.motes.map((m)=>JSON.stringify(m.pos))).size,20);
  assert.equal(first.motes_active,21);
  assert.equal(second.motes_active,22);
});

test('lướt trên không giữ cao độ đủ 12 tick và Tỏa Sáng xét tâm 3D',()=>{
  const result=run(1,30,{...quiet,player:{carried:3},shades:[
    {id:'S1',pos:[0,1,3]},{id:'S2',pos:[0,7,1]},
  ]},[{tick:0,jump:true,pulse:true},{tick:5,dash:true,move:[1,0]}]);
  assert.deepEqual(result.events.find(({name})=>name==='pulse').data.stunned_ids,['S1']);
  for (let tick=6;tick<=17;tick++) {
    assert.equal(result.snapshots[tick].player.pos[1],result.snapshots[5].player.pos[1]);
  }
  assert.notEqual(result.snapshots[18].player.pos[1],result.snapshots[17].player.pos[1]);
});

test('hit tạo vành đom đóm rơi, Bóng Mực lùi 2 m và đèn mới sáng đẩy Bóng ra mép',()=>{
  const hit=run(1,61,{...quiet,player:{carried:7},shades:[{pos:[.8,1,0]}]});
  assert.equal(hit.snapshots[1].shades[0].state,'recoil');
  assert.equal(hit.snapshots[1].motes_active,3);
  for (const mote of hit.snapshots[1].motes) {
    const d=Math.hypot(mote.pos[0],mote.pos[2]);
    assert.ok(d>=1.499 && d<=2.501);
    assert.equal(mote.ttl_s,8);
  }
  assert.ok(Math.abs(hit.snapshots[61].shades[0].pos[0]-hit.snapshots[1].shades[0].pos[0]-2)<.002);
  const lamp=run(1,30,{...quiet,player:{carried:10},
    shades:[{pos:[.3,1,0]}],lanterns:[{id:'L1',pos:[0,0,0]}]},[{tick:0,interact:true}]);
  assert.equal(lamp.events.some(({name})=>name==='player_hit'),false);
  assert.equal(lamp.snapshots[30].shades[0].pos[0],6.005);
});

test('nạp đèn ở tick bình minh đạt đúng ngưỡng cả ba Đêm, hết Ngọn Lửa ưu tiên thua',()=>{
  for (const night of [1,2,3]) {
    const threshold=Math.ceil(nights[night].lanterns.length*tuning.win_ratio);
    const lanterns=nights[night].lanterns.slice(1,threshold).map((_,index)=>({id:'L'+(index+2),lit:true}));
    const scene={...quiet,time_left_s:1/tickRate,player:{pos:nights[night].lanterns[0],carried:10},lanterns};
    assert.equal(run(night,5,scene,[{tick:0,interact:true}]).events.at(-1).data.reason,'dawn_survived');
    assert.equal(run(night,5,scene).events.at(-1).data.reason,'dawn');
    const dead=run(night,5,{...scene,player:{...scene.player,flames:0}},[{tick:0,interact:true}]);
    assert.equal(dead.events.at(-1).data.reason,'no_flames');
  }
});
