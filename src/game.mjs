import { capacityFor, fuelLevel, lanternCost, nearbyLantern, newGame, requiredLanterns, stepGame, tickRate, timeLeft, tuning } from './core.mjs';
import { nights } from './nights.mjs';
import { createRenderer } from './render.mjs';
import { createSound } from './audio.mjs';
import { castIce, iceCooldown, iceLayers, iceSettings, iceVisible } from './ice.mjs';
import { castMeteor, meteorCooldown, meteorLayers, meteorSettings, meteorVisible } from './meteor.mjs';
import { castWood, updateWood, woodLayers, woodSettings, woodVisible } from './wood.mjs';
import { actionForKey, actions, defaultBindings, keyName, loadBindings, usableKey } from './keybinds.mjs';

const el = (id) => document.querySelector('#' + id);
const canvas = el('island');
const context = canvas.getContext('2d');
const draw = context && createRenderer(context);
const keys = new Set();
const sound = createSound();
const gameSeed = 1201;
const tickDuration = 1000 / tickRate;
const points = new Map();
const settingsKey = 'dao-den-long-settings';
let settings = { volume: 45, sensitivity: 75, accessiblePalette: false,
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, largeFont: false };
try { settings = { ...settings, ...JSON.parse(window.localStorage.getItem(settingsKey) || '{}') }; } catch {}
settings.wood = woodSettings(settings.wood);
settings.meteor = meteorSettings(settings.meteor);
settings.ice = iceSettings(settings.ice);
settings.bindings = loadBindings(settings.bindings);
let state = newGame(gameSeed);
let scene = 'menu', paused = false;
let cameraYaw = 180, latestFrame, accumulated = 0;
let feedbackUntil = 0, lastSecond = null, lastWind = false;
let previousHud = {};
let woodCast = null;
let woodReady = 0;
let meteorCast = null, meteorReady = 0;
let iceCast = null, iceReady = 0;
let pickerTrigger;
let rebindAction, spawnCue;
const keyButtons=new Map();

function text(id, value) { const element=el(id); if (element.textContent !== value) element.textContent=value; }
function hidden(id, value) { const element=el(id); if (element.hidden !== value) element.hidden=value; }
function clearInput() { keys.clear(); latestFrame=undefined; accumulated=0; }
function totalScore() { return [...points.values()].reduce((sum,score)=>sum+score,0); }
function applySettings() {
  sound.setVolume(settings.volume/100);
  canvas.parentElement?.classList.toggle('accessible-palette',settings.accessiblePalette===true);
  document.documentElement?.classList.toggle('large-text',settings.largeFont===true);
  document.documentElement?.classList.toggle('reduce-motion',settings.reduceMotion===true);
  try { window.localStorage.setItem(settingsKey,JSON.stringify(settings)); } catch {}
}

function showMenu() {
  scene='menu'; paused=false;
  sound.setMusic(false); clearInput();
  hidden('pause-panel',true); hidden('result',true); hidden('settings',true); hidden('night-picker',true);
  hidden('leaderboard',true); hidden('captions',true);
  hidden('stage-switch',false);
  hidden('stage',false); hidden('stage-settings',false); hidden('prompt',true); hidden('feedback',true);
  text('stage-title','Đảo Đèn Lồng');
  text('stage-text','Châm dầu và giữ đủ đèn sáng tới bình minh.');
  text('stage-action','Bắt đầu');
  el('stage-action').focus();
}

function introduce(night) {
  scene='intro'; paused=false;
  state=newGame(gameSeed,{},night);
  cameraYaw=180;
  previousHud={};
  feedbackUntil=0; lastSecond=null; lastWind=false;
  woodCast=null; woodReady=0; meteorCast=null; meteorReady=0; iceCast=null; iceReady=0;
  spawnCue=undefined;
  clearInput(); sound.setMusic(false);
  hidden('pause-panel',true); hidden('result',true); hidden('stage',false); hidden('stage-settings',true);
  hidden('stage-switch',true); hidden('night-picker',true);
  text('stage-title','Đêm '+night+' · '+nights[night].name);
  text('stage-text','Ông Đăng: “'+nights[night].advice+'” Giữ ít nhất '+requiredLanterns(state)+' đèn sáng tới bình minh.');
  text('stage-action','Bắt đầu Đêm '+night);
  el('stage-action').focus();
  updateHud();
}

function playNight() {
  scene='playing'; hidden('stage',true);
  clearInput(); sound.unlock(); sound.setMusic(Boolean(globalThis.AudioContext));
  canvas.focus({preventScroll:true});
}

function setPaused(value) {
  if (scene!=='playing') return;
  paused=value;
  clearInput();
  hidden('pause-panel',!paused);
  hidden('feedback',true);
  hidden('prompt',true);
  hidden('captions',true);
  sound.setMusic(!paused && Boolean(globalThis.AudioContext));
  if (paused) el('resume').focus();
  else canvas.focus({preventScroll:true});
}

function showResult() {
  scene='result'; sound.setMusic(false);
  const won=state.state==='won';
  if (won) points.set(state.night,state.score);
  const dawn=won && state.night===3 && points.size===3;
  text('result-title',dawn?'Bình Minh':won?'Đêm '+state.night+' đã sáng đèn':'Đêm nay chưa kịp sáng đèn');
  text('result-detail',dawn?'Tổng điểm ba Đêm · '+totalScore():
    state.score+' điểm Đêm '+state.night+' · Tổng điểm game '+totalScore());
  const showNext=won && state.night<3;
  hidden('result',false); hidden('next-night',!showNext); hidden('play-again',won);
  hidden('score-form',won&&!dawn);
  el('score-name').value='';
  el('score-submit').disabled=false;
  text('score-status','');
  el(showNext?'next-night':'score-name').focus();
}

async function showLeaderboard() {
  hidden('leaderboard',false);
  el('leaderboard-close').focus();
  const list=el('leaderboard-list');
  list.replaceChildren();
  text('leaderboard-status','Đang tải…');
  try {
    const response=await fetch('/api/leaderboard');
    if (!response.ok) throw Error('HTTP '+response.status);
    const {entries}=await response.json();
    for (const {name,score,nights_won} of entries) {
      const row=document.createElement('li');
      row.textContent=name+' · '+score+' điểm · '+nights_won+' Đêm';
      list.append(row);
    }
    text('leaderboard-status',entries.length?'':'Chưa có lượt chơi nào được lưu.');
  } catch { text('leaderboard-status','Chưa tải được bảng xếp hạng.'); }
}

async function submitScore(event) {
  event.preventDefault();
  const submit=el('score-submit'), name=el('score-name').value.trim();
  if (submit.disabled) return;
  if (!/^[A-Za-z0-9_]{3,12}$/.test(name)) {
    text('score-status','Tên cần 3–12 chữ cái, chữ số hoặc dấu gạch dưới.');
    return;
  }
  submit.disabled=true;
  const round=state;
  try {
    const response=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,score:totalScore(),nights_won:points.size,seed:gameSeed})});
    if (!response.ok) throw Error('HTTP '+response.status);
    if (scene==='result' && state===round) text('score-status','Đã lưu điểm.');
  } catch {
    if (scene==='result' && state===round) { submit.disabled=false; text('score-status','Chưa lưu được. Hãy thử lại.'); }
  }
}

function showEvents(events) {
  for (const { name, data } of events) {
    sound.play(name==='game_over'?data.result:name);
    if (name==='shade_spawned') spawnCue={id:data.id,until:state.simTick+240};
    let message;
    switch (name) {
      case 'mote_picked': message='+1 đom đóm'; break;
      case 'deposit': message='Đã nạp '+data.amount+' đom đóm · +'+(data.amount*tuning.score.per_mote)+' điểm'; break;
      case 'lantern_lit': message=(data.relight?'Đèn đã thắp lại':'Đèn đã sáng')+' · +'+
        (data.relight?tuning.score.per_relight:tuning.score.per_lantern)+' điểm'; break;
      case 'refuel': message='Đã châm dầu · '+data.fuel+'/100'; break;
      case 'lantern_out': message='Đèn '+data.lantern_id+' đã cạn dầu'; break;
      case 'fuel_drain': message='Bóng Mực đang hút dầu '+data.lantern_id; break;
      case 'pulse': message=data.stunned_ids.length?'Đã làm choáng '+data.stunned_ids.length+' Bóng Mực':'Mây vừa tỏa sáng'; break;
      case 'player_hit': message='Mây mất một Ngọn Lửa'; break;
      case 'charm_picked': message='Bùa Gió · Lướt không hồi chiêu'; break;
      case 'drifter_steal': message='Gió Lạc đã cướp '+data.amount+' đom đóm'; break;
      case 'drifter_drop': message='Gió Lạc đã thả lại đom đóm'; break;
      default: continue;
    }
    text('feedback',message); feedbackUntil=state.simTick+84;
  }
}

function collectInput() {
  const held=new Set([...keys].map((key)=>actionForKey(settings.bindings,key)));
  const x=Number(held.has('right'))-Number(held.has('left'));
  const z=Number(held.has('down'))-Number(held.has('up'));
  cameraYaw+=(Number(held.has('cameraRight'))-Number(held.has('cameraLeft')))*1.5;
  return { move:[x,z],cam_yaw_deg:cameraYaw,jump:held.has('jump'),interact:held.has('interact'),
    pulse:held.has('pulse'),dash:held.has('dash') };
}

function updateHud() {
  const p=state.player;
  const capacity=capacityFor(p.successfulLights);
  const seconds=Math.max(0,Math.ceil(timeLeft(state)));
  text('night-name','Đêm '+state.night+' · '+state.map.name);
  text('health',(settings.accessiblePalette && p.flames<tuning.flames?'⚠ ':'')+'♥'.repeat(p.flames)+'♡'.repeat(tuning.flames-p.flames));
  text('lit',state.lanterns.filter((l)=>l.lit).length+' / '+state.lanterns.length);
  text('score',String(state.score));
  text('dawn-target','Cần giữ '+requiredLanterns(state));
  text('timer',(settings.accessiblePalette && seconds<=30?'⚠ ':'')+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));
  el('timer').className=seconds<=30?'danger':'';
  text('flies',p.carried+' / '+capacity);
  if (p.carried!==previousHud.carried || capacity!==previousHud.capacity) {
    [...el('mote-bar').children].forEach((cell,index)=>{
      cell.hidden=index>=capacity;
      cell.className=index<p.carried?'full':'';
    });
    previousHud.carried=p.carried;
    previousHud.capacity=capacity;
  }
  const ability=(cd,name)=>cd>0?name+' '+(cd/tickRate).toFixed(1)+'s':name+' ✓';
  text('dash-cd',ability(p.dashCd,'Lướt'));
  text('pulse-cd',ability(p.pulseCd,'Tỏa sáng'));
  text('wood-cd',ability(Math.max(0,woodReady-state.simTick),'Mộc Độn'));
  text('meteor-cd',ability(Math.max(0,meteorReady-state.simTick),'Mưa sao băng'));
  text('ice-cd',ability(Math.max(0,iceReady-state.simTick),'Phép băng'));
  hidden('charm-status',p.charm===0); text('charm-status','Bùa Gió '+Math.ceil(p.charm/tickRate)+'s');
  const playing=scene==='playing' && !paused;
  const captions=[];
  if (spawnCue?.until>state.simTick) captions.push('Bóng Mực xuất hiện ↑');
  if (state.wind.warning) captions.push('Gió mạnh sắp thổi');
  if (seconds>0 && seconds<=10) captions.push('Còn '+seconds+' giây');
  const low=state.lanterns.filter((lantern)=>lantern.lit && fuelLevel(lantern)<tuning.low_fuel_threshold);
  if (low.length) captions.push('⚠ Dầu thấp · '+low.map((lantern)=>lantern.id).join(', '));
  text('captions',captions.join('   |   '));
  hidden('captions',!playing || captions.length===0);
  hidden('feedback',!playing || state.simTick>=feedbackUntil);
  const lantern=playing && nearbyLantern(state);
  if (lantern) {
    const fuel=fuelLevel(lantern);
    const warning=fuel<tuning.low_fuel_threshold && settings.accessiblePalette?'⚠ ':'';
    const key=keyName(settings.bindings.interact);
    text('prompt',lantern.lit ? warning+key+' — Châm dầu ('+Math.floor(fuel*10)/10+'/100)'
      : key+' — Nạp ánh sáng ('+lantern.deposited+'/'+lanternCost(lantern)+')');
  }
  hidden('prompt',!lantern);
  if (playing && lastSecond!==seconds && seconds>0 && seconds<=10) sound.play('countdown');
  lastSecond=seconds;
}

function render(seconds) {
  const ratio=Math.min(window.devicePixelRatio||1,1.35);
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if (!width || !height) return;
  const pixels=[Math.round(width*ratio),Math.round(height*ratio)];
  if (canvas.width!==pixels[0]||canvas.height!==pixels[1]) [canvas.width,canvas.height]=pixels;
  context.setTransform(ratio,0,0,ratio,0,0);
  draw(width,height,state,seconds,cameraYaw,woodCast,settings.accessiblePalette,
    {reduceMotion:settings.reduceMotion,spawnId:spawnCue?.until>state.simTick?spawnCue.id:undefined,meteor:meteorCast,ice:iceCast});
}

function frame(time) {
  if (scene==='playing' && !paused) {
    accumulated+=latestFrame===undefined?0:Math.min(150,time-latestFrame);
    while (accumulated+1e-8>=tickDuration && state.state==='playing') {
      const grounded=state.player.grounded;
      showEvents(stepGame(state,collectInput(),true));
      if (updateWood(state,woodCast)) {
        sound.play('wood_hit');
        text('feedback',woodCast.options.flowers?'Phấn hoa khiến mục tiêu ngủ gục':'Mộc Độn trúng mục tiêu');
        feedbackUntil=state.simTick+84;
      }
      if (!woodVisible(state,woodCast)) woodCast=null;
      if (meteorCast && !meteorVisible(state,meteorCast)) meteorCast=null;
      if (iceCast && !iceVisible(state,iceCast)) iceCast=null;
      if (grounded && state.player.vel[1]>0) sound.play('jump');
      if (state.wind.warning && !lastWind) sound.play('wind_warning');
      lastWind=state.wind.warning;
      accumulated-=tickDuration;
    }
    if (state.state!=='playing') showResult();
    updateHud();
  }
  latestFrame=time;
  render(state.simTick/tickRate);
  requestAnimationFrame(frame);
}

function handleKey(event, pressed) {
  const key=event.key.toLowerCase();
  if (!pressed) { keys.delete(key); return; }
  if (rebindAction) {
    event.preventDefault();
    if (!usableKey(key) || event.altKey || event.metaKey || event.ctrlKey) {
      text('key-status','Phím này không hỗ trợ. Hãy chọn một phím khác.');
      return;
    }
    const conflict=actions.find(([action])=>action!==rebindAction && settings.bindings[action]===key);
    if (conflict) {
      text('key-status',keyName(key)+' đang dùng cho '+conflict[1]+'. Hãy chọn phím khác.');
      return;
    }
    settings.bindings[rebindAction]=key;
    rebindAction=undefined;
    updateKeyLabels();
    applySettings();
    text('key-status','Đã lưu phím '+keyName(key)+'.');
    return;
  }
  if (event.altKey || event.metaKey || event.ctrlKey || !el('settings').hidden || !el('night-picker').hidden) return;
  const action=actionForKey(settings.bindings,key);
  if (action==='pause' && !event.repeat && scene==='playing') {
    event.preventDefault(); setPaused(!paused); return;
  }
  if (action==='wood' && !event.repeat && scene==='playing' && !paused) {
    event.preventDefault();
    if (state.simTick>=woodReady && !state.player.respawn) {
      woodCast=castWood(state,settings.wood);
      woodReady=state.simTick+tickRate*5;
      sound.play('wood_cast');
    }
    return;
  }
  if (action==='meteor' && !event.repeat && scene==='playing' && !paused) {
    event.preventDefault();
    if (state.simTick>=meteorReady && !state.player.respawn) {
      meteorCast=castMeteor(state,settings.meteor);
      meteorReady=state.simTick+tickRate*meteorCooldown;
      sound.play('meteor_cast');
    }
    return;
  }
  if (action==='ice' && !event.repeat && scene==='playing' && !paused) {
    event.preventDefault();
    if (state.simTick>=iceReady && !state.player.respawn) {
      iceCast=castIce(state,settings.ice);
      iceReady=state.simTick+tickRate*iceCooldown;
      sound.play('ice_cast');
    }
    return;
  }
  if (scene!=='playing'||paused||!action||([' ','enter'].includes(key)&&event.target?.tagName==='BUTTON')) return;
  event.preventDefault(); keys.add(key);
}

function updateKeyLabels() {
  const shown=(action)=>keyName(settings.bindings[action]);
  for (const [action,button] of keyButtons) button.textContent=shown(action);
  for (const action of ['jump','interact','dash','pulse','wood','meteor','ice']) text('key-'+action,shown(action));
  text('key-move',['up','left','down','right'].map(shown).join(' '));
  text('key-camera',['cameraLeft','cameraRight'].map(shown).join(' '));
  text('pause','Tạm dừng ('+shown('pause')+')');
  text('pause-hint','Nhấn '+shown('pause')+' để tiếp tục.');
}

function setupKeySettings() {
  for (const [action,label] of actions) {
    const group=document.createElement('label'), button=document.createElement('button');
    button.type='button';
    button.addEventListener('click',()=>{
      rebindAction=action;
      text('key-status','Nhấn một phím cho '+label+'.');
    });
    keyButtons.set(action,button);
    group.append(label,button);
    el('key-controls').append(group);
  }
  el('keys-reset').addEventListener('click',()=>{
    settings.bindings={...defaultBindings}; rebindAction=undefined;
    updateKeyLabels(); applySettings(); text('key-status','Đã khôi phục phím mặc định.');
  });
  updateKeyLabels();
}

function setupWoodSettings() { setupLayerSettings(woodLayers,'wood','wood-options'); setupLayerSettings(meteorLayers,'meteor','meteor-options'); setupLayerSettings(iceLayers,'ice','ice-options'); }
function setupLayerSettings(layers,group_key,container) {
  for (const [id,title,fields] of layers) {
    const group=document.createElement('fieldset');
    const toggleLabel=document.createElement('label');
    const toggle=document.createElement('input');
    toggle.type='checkbox'; toggle.checked=settings[group_key][id];
    toggle.addEventListener('change',()=>{settings[group_key][id]=toggle.checked;applySettings();});
    toggleLabel.append(title,toggle);
    group.append(toggleLabel);
    for (const [key,name,min,max,step] of fields) {
      const label=document.createElement('label');
      const range=document.createElement('input');
      const value=document.createElement('output');
      range.type='range'; range.min=min; range.max=max; range.step=step; range.value=settings[group_key][key];
      value.textContent=range.value;
      range.addEventListener('input',()=>{
        settings[group_key][key]=Number(range.value);
        value.textContent=range.value;
        applySettings();
      });
      label.append(name,range,value);
      group.append(label);
    }
    el(container).append(group);
  }
}

if (draw) {
  for (let i=0;i<tuning.capacity_max;i++) el('mote-bar').append(document.createElement('i'));
  window.addEventListener('keydown',(event)=>handleKey(event,true));
  window.addEventListener('keyup',(event)=>handleKey(event,false));
  window.addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if (document.hidden) setPaused(true);});
  canvas.addEventListener('pointermove',(event)=>{
    if (scene==='playing' && !paused && (event.buttons & 1)) cameraYaw+=event.movementX*settings.sensitivity/100;
  });
  el('stage-action').addEventListener('click',()=>{
    if (scene==='menu') {points.clear(); introduce(1);}
    else playNight();
  });
  for (const id of ['pause','resume']) el(id).addEventListener('click',()=>setPaused(!paused));
  for (const id of ['restart','pause-replay','play-again']) el(id).addEventListener('click',()=>introduce(state.night));
  for (const id of ['pause-menu','result-menu']) el(id).addEventListener('click',showMenu);
  el('stage-leaderboard').addEventListener('click',showLeaderboard);
  el('leaderboard-close').addEventListener('click',()=>{hidden('leaderboard',true);el('stage-leaderboard').focus();});
  el('score-form').addEventListener('submit',submitScore);
  el('next-night').addEventListener('click',()=>introduce(state.night+1));
  for (const id of ['stage-switch','pause-switch']) {
    el(id).addEventListener('click',()=>{
      pickerTrigger=id;
      hidden('night-picker',false);
      el('choose-night-'+state.night).focus();
    });
  }
  el('picker-close').addEventListener('click',()=>{hidden('night-picker',true);el(pickerTrigger).focus();});
  for (const night of [1,2,3]) el('choose-night-'+night).addEventListener('click',()=>introduce(night));
  for (const id of ['stage-settings','pause-settings']) {
    el(id).addEventListener('click',()=>{hidden('settings',false);el('volume').focus();});
  }
  el('settings-close').addEventListener('click',()=>{rebindAction=undefined;hidden('settings',true);el(paused?'pause-settings':'stage-settings').focus();});
  for (const id of ['volume','sensitivity']) {
    el(id).value=settings[id];
    el(id).addEventListener('input',()=>{settings[id]=Number(el(id).value);applySettings();});
  }
  const palette = el('accessible-palette');
  palette.checked = settings.accessiblePalette===true;
  palette.addEventListener('change',()=>{
    settings.accessiblePalette=palette.checked;
    applySettings();
  });
  for (const [id,key] of [['reduce-motion','reduceMotion'],['large-font','largeFont']]) {
    const toggle=el(id);
    toggle.checked=settings[key]===true;
    toggle.addEventListener('change',()=>{settings[key]=toggle.checked;applySettings();});
  }
  setupKeySettings(); setupWoodSettings(); applySettings(); showMenu(); updateHud();
  requestAnimationFrame(frame);
} else {
  hidden('stage',true); hidden('prompt',false);
  text('prompt','Trình duyệt không khởi tạo được đồ họa Canvas.');
}
