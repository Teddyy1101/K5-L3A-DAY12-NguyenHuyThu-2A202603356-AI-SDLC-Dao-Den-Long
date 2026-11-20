import { nearbyLantern, newGame, stepGame, tickRate, timeLeft, tuning } from './core.mjs';
import { nights } from './nights.mjs';
import { createRenderer } from './render.mjs';
import { createSound } from './audio.mjs';

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
let settings = { volume: 45, sensitivity: 75 };
try { settings = { ...settings, ...JSON.parse(window.localStorage.getItem(settingsKey) || '{}') }; } catch {}
let state = newGame(gameSeed);
let scene = 'menu', paused = false;
let cameraYaw = 180, latestFrame, accumulated = 0;
let feedbackUntil = 0, lastSecond = null, lastWind = false;
let previousHud = {};

function text(id, value) { const element=el(id); if (element.textContent !== value) element.textContent=value; }
function hidden(id, value) { const element=el(id); if (element.hidden !== value) element.hidden=value; }
function clearInput() { keys.clear(); latestFrame=undefined; accumulated=0; }
function totalScore() { return [...points.values()].reduce((sum,score)=>sum+score,0); }
function applySettings() {
  sound.setVolume(settings.volume/100);
  try { window.localStorage.setItem(settingsKey,JSON.stringify(settings)); } catch {}
}

function showMenu() {
  scene='menu'; paused=false;
  sound.setMusic(false); clearInput();
  hidden('pause-panel',true); hidden('result',true); hidden('settings',true);
  hidden('stage',false); hidden('stage-settings',false); hidden('prompt',true); hidden('feedback',true);
  text('stage-title','Đảo Đèn Lồng');
  text('stage-text','Cùng Mây thắp đèn qua ba đêm.');
  text('stage-action','Bắt đầu');
  el('stage-action').focus();
}

function introduce(night) {
  scene='intro'; paused=false;
  state=newGame(gameSeed,{},night);
  cameraYaw=180;
  previousHud={};
  feedbackUntil=0; lastSecond=null; lastWind=false;
  clearInput(); sound.setMusic(false);
  hidden('pause-panel',true); hidden('result',true); hidden('stage',false); hidden('stage-settings',true);
  text('stage-title','Đêm '+night+' · '+nights[night].name);
  text('stage-text','Ông Đăng: “'+nights[night].advice+'”');
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
  const dawn=won && state.night===3;
  text('result-title',dawn?'Bình Minh':won?'Đêm '+state.night+' đã sáng đèn':'Đêm nay chưa kịp sáng đèn');
  text('result-detail',dawn?'Tổng điểm ba Đêm · '+totalScore():
    state.score+' điểm Đêm '+state.night+' · Tổng điểm game '+totalScore());
  hidden('result',false); hidden('next-night',!won || dawn); hidden('play-again',won);
  el(dawn?'result-menu':won?'next-night':'play-again').focus();
}

function showEvents(events) {
  for (const { name, data } of events) {
    sound.play(name==='game_over'?data.result:name);
    let message;
    switch (name) {
      case 'mote_picked': message='+1 đom đóm'; break;
      case 'deposit': message='Đã nạp '+data.amount+' đom đóm · +'+(data.amount*tuning.score.per_mote)+' điểm'; break;
      case 'lantern_lit': message='Đèn đã sáng · +'+tuning.score.per_lantern+' điểm'; break;
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
  const seconds=Math.max(0,Math.ceil(timeLeft(state)));
  text('night-name','Đêm '+state.night+' · '+state.map.name);
  text('health','♥'.repeat(p.flames)+'♡'.repeat(tuning.flames-p.flames));
  text('lit',state.lanterns.filter((l)=>l.lit).length+' / '+state.lanterns.length);
  text('score',String(state.score));
  text('timer',Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'));
  el('timer').className=seconds<=30?'danger':'';
  text('flies',p.carried+' / '+tuning.carry_capacity);
  if (p.carried!==previousHud.carried) {
    [...el('mote-bar').children].forEach((cell,index)=>{cell.className=index<p.carried?'full':'';});
    previousHud.carried=p.carried;
  }
  const ability=(cd,name)=>cd>0?name+' '+(cd/tickRate).toFixed(1)+'s':name+' ✓';
  text('dash-cd',ability(p.dashCd,'Lướt'));
  text('pulse-cd',ability(p.pulseCd,'Tỏa sáng'));
  hidden('charm-status',p.charm===0); text('charm-status','Bùa Gió '+Math.ceil(p.charm/tickRate)+'s');
  const playing=scene==='playing' && !paused;
  hidden('feedback',!playing || state.simTick>=feedbackUntil);
  const lantern=playing && nearbyLantern(state);
  if (lantern) text('prompt','E — Nạp ánh sáng ('+lantern.deposited+'/'+tuning.lantern_cost+')');
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
  draw(width,height,state,seconds,cameraYaw);
}

function frame(time) {
  if (scene==='playing' && !paused) {
    accumulated+=latestFrame===undefined?0:Math.min(150,time-latestFrame);
    while (accumulated+1e-8>=tickDuration && state.state==='playing') {
      const grounded=state.player.grounded;
      showEvents(stepGame(state,collectInput()));
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
  if (event.altKey || event.metaKey || event.ctrlKey || !el('settings').hidden) return;
  if (['p','escape'].includes(key) && !event.repeat && scene==='playing') {
    event.preventDefault(); setPaused(!paused); return;
  }
  if (scene!=='playing'||paused||!gameKeys.has(key)||(key===' '&&event.target?.tagName==='BUTTON')) return;
  event.preventDefault(); keys.add(key);
}

if (draw) {
  for (let i=0;i<10;i++) el('mote-bar').append(document.createElement('i'));
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
  for (const id of ['stage-settings','pause-settings']) {
    el(id).addEventListener('click',()=>{hidden('settings',false);el('volume').focus();});
  }
  el('settings-close').addEventListener('click',()=>{hidden('settings',true);el(paused?'pause-settings':'stage-settings').focus();});
  for (const id of ['volume','sensitivity']) {
    el(id).value=settings[id];
    el(id).addEventListener('input',()=>{settings[id]=Number(el(id).value);applySettings();});
  }
  applySettings(); showMenu(); updateHud();
  requestAnimationFrame(frame);
} else {
  hidden('stage',true); hidden('prompt',false);
  text('prompt','Trình duyệt không khởi tạo được đồ họa Canvas.');
}
