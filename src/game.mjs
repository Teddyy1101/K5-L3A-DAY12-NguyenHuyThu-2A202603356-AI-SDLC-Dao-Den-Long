import { capacityFor, fuelLevel, lanternCost, nearbyLantern, newGame, requiredLanterns, stepGame, tickRate, timeLeft, tuning } from './core.mjs';
import { nights } from './nights.mjs';
import { createRenderer } from './render.mjs';
import { createSound } from './audio.mjs';
import { castWood, updateWood, woodLayers, woodSettings, woodVisible } from './wood.mjs';

const el = (id) => document.querySelector('#' + id);
const canvas = el('island');
const context = canvas.getContext('2d');
const draw = context && createRenderer(context);
const keys = new Set();
const gameKeys = new Set(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','e','q','j','l','shift']);
const sound = createSound();
const gameSeed = 1201;
const tickDuration = 1000 / tickRate;
const points = new Map();
const settingsKey = 'dao-den-long-settings';
let settings = { volume: 45, sensitivity: 75, accessiblePalette: false };
try { settings = { ...settings, ...JSON.parse(window.localStorage.getItem(settingsKey) || '{}') }; } catch {}
settings.wood = woodSettings(settings.wood);
let state = newGame(gameSeed);
let scene = 'menu', paused = false;
let cameraYaw = 180, latestFrame, accumulated = 0;
let feedbackUntil = 0, lastSecond = null, lastWind = false;
let previousHud = {};
let woodCast = null;
let woodReady = 0;
let pickerTrigger;

function text(id, value) { const element=el(id); if (element.textContent !== value) element.textContent=value; }
function hidden(id, value) { const element=el(id); if (element.hidden !== value) element.hidden=value; }
function clearInput() { keys.clear(); latestFrame=undefined; accumulated=0; }
function totalScore() { return [...points.values()].reduce((sum,score)=>sum+score,0); }
function applySettings() {
  sound.setVolume(settings.volume/100);
  canvas.parentElement?.classList.toggle('accessible-palette',settings.accessiblePalette===true);
  try { window.localStorage.setItem(settingsKey,JSON.stringify(settings)); } catch {}
}

function showMenu() {
  scene='menu'; paused=false;
  sound.setMusic(false); clearInput();
  hidden('pause-panel',true); hidden('result',true); hidden('settings',true); hidden('night-picker',true);
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
  woodCast=null; woodReady=0;
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
  el(showNext?'next-night':won?'result-menu':'play-again').focus();
}

function showEvents(events) {
  for (const { name, data } of events) {
    sound.play(name==='game_over'?data.result:name);
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
  const x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  cameraYaw+=(Number(keys.has('l'))-Number(keys.has('j')))*1.5;
  return {move:[x,z],cam_yaw_deg:cameraYaw,jump:keys.has(' '),interact:keys.has('e'),pulse:keys.has('q'),dash:keys.has('shift')};
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
  hidden('charm-status',p.charm===0); text('charm-status','Bùa Gió '+Math.ceil(p.charm/tickRate)+'s');
  const playing=scene==='playing' && !paused;
  hidden('feedback',!playing || state.simTick>=feedbackUntil);
  const lantern=playing && nearbyLantern(state);
  if (lantern) {
    const fuel=fuelLevel(lantern);
    const warning=fuel<tuning.low_fuel_threshold && settings.accessiblePalette?'⚠ ':'';
    text('prompt',lantern.lit ? warning+'E — Châm dầu ('+Math.floor(fuel*10)/10+'/100)'
      : 'E — Nạp ánh sáng ('+lantern.deposited+'/'+lanternCost(lantern)+')');
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
  draw(width,height,state,seconds,cameraYaw,woodCast,settings.accessiblePalette);
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
  if (event.altKey || event.metaKey || event.ctrlKey || !el('settings').hidden || !el('night-picker').hidden) return;
  if (['p','escape'].includes(key) && !event.repeat && scene==='playing') {
    event.preventDefault(); setPaused(!paused); return;
  }
  if (key==='1' && !event.repeat && scene==='playing' && !paused) {
    event.preventDefault();
    if (state.simTick>=woodReady && !state.player.respawn) {
      woodCast=castWood(state,settings.wood);
      woodReady=state.simTick+tickRate*5;
      sound.play('wood_cast');
    }
    return;
  }
  if (scene!=='playing'||paused||!gameKeys.has(key)||(key===' '&&event.target?.tagName==='BUTTON')) return;
  event.preventDefault(); keys.add(key);
}

function setupWoodSettings() {
  for (const [id,title,fields] of woodLayers) {
    const group=document.createElement('fieldset');
    const toggleLabel=document.createElement('label');
    const toggle=document.createElement('input');
    toggle.type='checkbox'; toggle.checked=settings.wood[id];
    toggle.addEventListener('change',()=>{settings.wood[id]=toggle.checked;applySettings();});
    toggleLabel.append(title,toggle);
    group.append(toggleLabel);
    for (const [key,name,min,max,step] of fields) {
      const label=document.createElement('label');
      const range=document.createElement('input');
      const value=document.createElement('output');
      range.type='range'; range.min=min; range.max=max; range.step=step; range.value=settings.wood[key];
      value.textContent=range.value;
      range.addEventListener('input',()=>{
        settings.wood[key]=Number(range.value);
        value.textContent=range.value;
        applySettings();
      });
      label.append(name,range,value);
      group.append(label);
    }
    el('wood-options').append(group);
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
  el('settings-close').addEventListener('click',()=>{hidden('settings',true);el(paused?'pause-settings':'stage-settings').focus();});
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
  setupWoodSettings(); applySettings(); showMenu(); updateHud();
  requestAnimationFrame(frame);
} else {
  hidden('stage',true); hidden('prompt',false);
  text('prompt','Trình duyệt không khởi tạo được đồ họa Canvas.');
}
