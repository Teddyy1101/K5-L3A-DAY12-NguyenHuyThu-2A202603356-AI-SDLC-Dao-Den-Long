import { floorAt, nights } from './nights.mjs';

export const tickRate = 60;
export const tuning = Object.freeze({
  player_speed: 6, carry_capacity: 10, lantern_cost: 10, lantern_count_night1: 5,
  pickup_radius: 1, interact_radius: 2, pulse_cost: 3, pulse_radius: 5,
  night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300,
  flames: 3, invuln_s: 1.5, hit_drop_ratio: .5, pulse_stun_s: 2, pulse_push_m: 4,
  pulse_cooldown_s: 3, safe_radius: 6, shade_speed: 4, shade_speed_night3: 4.5, shade_hit_radius: 1,
  dash_speed: 14, dash_duration_s: .2, dash_cooldown_s: 1.5, fall_enabled: true,
  fuel_max: 100, fuel_decay_per_s: 1, fuel_per_mote: 10, relight_cost: 5,
  win_ratio: .6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20,
  score: Object.freeze({ per_mote: 5, per_lantern: 100, per_relight: 40,
    per_stun: 5, per_drain_stun: 15, per_dawn_lantern: 50, per_flame_left: 50 }),
});
export const defaultInput = Object.freeze({
  move: Object.freeze([0, 0]), cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false,
});
export const shadeStates = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
export const drifterStates = ['idle', 'chase', 'flee', 'removed'];
const buttons = ['pause', 'jump', 'dash', 'interact', 'pulse'];
const eps = 1e-8;
const gravity = 20;
const jumpSpeed = 7;
const dropLifetime = 480;
const ticks = (seconds) => Math.ceil(seconds * tickRate);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const within = (a, b, radius) => distance(a, b) <= radius + eps;
const eyeHeight = 1;
const round = (number) => Number(number.toFixed(3));
const maxFuel = tuning.fuel_max * tickRate;
const safeFuel = tuning.low_fuel_threshold * tickRate;
const fuelPerMote = tuning.fuel_per_mote * tickRate;
export const fuelLevel = (lantern) => lantern.fuelTicks / tickRate;
export const lanternCost = (lantern) => lantern.everLit ? tuning.relight_cost : tuning.lantern_cost;
export const capacityFor = (successfulLights) => Math.min(tuning.capacity_max, tuning.carry_capacity + 2 * successfulLights);
export const requiredLanterns = (state) => Math.ceil(state.lanterns.length * tuning.win_ratio);
const reportedFuel = (lantern) => Number(fuelLevel(lantern).toFixed(1));
const isWeak = (lantern) => lantern.lit && lantern.fuelTicks < safeFuel;

export function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function direction(a, b) {
  const d = distance(a, b);
  return d > eps ? [(b[0] - a[0]) / d, (b[2] - a[2]) / d] : [1, 0];
}

function offset(pos, [x, z], length) {
  return [pos[0] + x * length, pos[1], pos[2] + z * length];
}

function createIds(prefix, entries) {
  const reserved = new Set(entries.map((entry) => entry.id).filter(Boolean));
  let next = 1;
  return (given) => {
    if (given) return given;
    let id;
    do { id = prefix + next++; } while (reserved.has(id));
    return id;
  };
}

function initialMotes(map, random) {
  const candidates=[...map.motes];
  return Array.from({length:20},()=>candidates.splice(Math.floor(random()*candidates.length),1)[0]);
}

export function newGame(seed = 0, scenario = {}, night = 1) {
  const map = nights[night];
  const spec = scenario.player ?? {};
  const pos = [...(spec.pos ?? [0, 0, 0])];
  const grounded = Math.abs(floorAt(night, pos[0], pos[2], pos[1] + eps) - pos[1]) < eps;
  const overrides = new Map((scenario.lanterns ?? []).map((entry) => [entry.id, entry]));
  const lanterns = map.lanterns.map((position, i) => {
    const id = 'L' + (i + 1);
    const override = overrides.get(id);
    const cost = lanternCost({everLit: override?.ever_lit});
    const deposited = override?.deposited ?? (override?.lit ? cost : 0);
    const lit = override?.lit ?? deposited >= cost;
    const fuelTicks = lit ? Math.round((override?.fuel ?? tuning.fuel_max) * tickRate) : 0;
    return { id, pos: [...(override?.pos ?? position)], deposited, lit, fuelTicks,
      everLit: lit || (override?.ever_lit ?? false), relitCount: 0 };
  });
  const random=seededRandom(seed);
  const starts = (scenario.motes ?? (scenario.random_motes === false ? [] : initialMotes(map,random)))
    .map((entry) => Array.isArray(entry) ? {pos:entry} : entry);
  const shadeSpecs = scenario.shades ?? [];
  const drifterSpecs = scenario.drifters ?? [];
  const charmSpecs = scenario.charms ?? map.charms.map((position) => ({pos:position}));
  const nextMote = createIds('M', starts);
  const nextShade = createIds('S', shadeSpecs);
  const nextDrifter = createIds('D', drifterSpecs);
  const nextCharm = createIds('C', charmSpecs);
  return {
    night, map, tick: 0, simTick: 0, state: 'playing', score: 0, random, lanterns,
    duration: scenario.time_left_s ?? tuning['night' + night + '_duration_s'],
    player: { pos, vel: [0,0,0], grounded, carried: spec.carried ?? 0, flames: spec.flames ?? tuning.flames,
      successfulLights: spec.successful_lights ?? 0,
      facing: Math.PI, invuln: spec.invuln_ticks ?? 0, dashCd: spec.dash_cd_ticks ?? 0,
      pulseCd: spec.pulse_cd_ticks ?? 0, charm: spec.charm_ticks ?? 0,
      dashLeft: 0, dashDir: [0,1], launch: null, pad: null, respawn:0 },
    motes: starts.map((entry) => ({...entry, id:nextMote(entry.id), pos:[...entry.pos], kind:entry.kind ?? 'random',
      ttl:entry.ttl_ticks ?? (entry.kind === 'dropped' ? dropLifetime : null)})),
    shades: shadeSpecs.map((s) => {
      const mode=s.state ?? (within(s.pos,pos,12)?'chase':'wander');
      return {id:nextShade(s.id),pos:[...s.pos],state:mode,left:s.state_ticks_left ?? 0,heading:0,tracking:mode==='chase',
        targetLantern: lanterns.find((lantern) => lantern.id === s.target_lantern_id), drainTicks: 0};
    }),
    drifters: drifterSpecs.map((d) => ({id:nextDrifter(d.id), pos:[...d.pos], state:d.state ?? 'idle',
      stolen:d.stolen ?? 0, left:d.state_ticks_left ?? d.flee_ticks_left ?? 240, heading:0})),
    charms: charmSpecs.map((c) => ({ id:nextCharm(c.id), pos:[...(c.pos ?? map.charms[Number(c.id?.slice(1)) - 1] ?? [0,0,0])],
      available:c.available ?? (c.respawn_ticks ?? 0) <= 0, respawn:c.respawn_ticks ?? (c.available === false ? 2700 : 0) })),
    nextMote, nextShade, nextDrifter, spawnMotes: scenario.random_motes !== false, spawnShades:scenario.random_shades !== false,
    spawnDrifters:night > 1 && scenario.random_drifters !== false,
    windEnabled:night === 3 && scenario.wind_enabled !== false,
    wind:{active:false, warning:false, dir_deg:0}, held:{}, pulseTick:-Infinity,
  };
}

export function timeLeft(state) { return Math.max(0, state.duration - state.simTick / tickRate); }

export function nearbyLantern(state) {
  if (state.player.respawn || state.player.justRespawned || !state.player.flames) return;
  let nearest;
  let range = tuning.interact_radius + eps;
  for (const lantern of state.lanterns) {
    const d = distance(lantern.pos, state.player.pos);
    if ((!lantern.lit || lantern.fuelTicks < maxFuel) && d <= tuning.interact_radius + eps
      && (!nearest || d < range - eps)) {
      nearest = lantern;
      range = d;
    }
  }
  return nearest;
}

function updateFuel(state, emit) {
  const reports = [];
  for (const lantern of state.lanterns) {
    if (lantern.lit) lantern.fuelTicks -= tuning.fuel_decay_per_s;
  }
  for (const shade of state.shades) {
    const lantern = shade.targetLantern;
    if (shade.state !== 'drain' || !lantern?.lit || shade.woodHeldUntil > state.simTick
        || !within(shade.pos,lantern.pos,2) || shade.ejectLeft) continue;
    // 30 still protects the lamp at the start of the tick.
    if (lantern.fuelTicks + tuning.fuel_decay_per_s >= safeFuel) continue;
    lantern.fuelTicks -= tuning.drain_per_s;
    shade.drainTicks = (shade.drainTicks ?? 0) + 1;
    if (shade.drainTicks % tickRate === 0) reports.push({lamp:lantern,shade});
  }
  // All simultaneous drains report the same post-debit fuel for a given lamp.
  for (const { lamp, shade } of reports) {
    emit('fuel_drain',{lantern_id:lamp.id,shade_id:shade.id,fuel:Math.max(0,reportedFuel(lamp))});
  }
  for (const lantern of state.lanterns) {
    if (!lantern.lit || lantern.fuelTicks > 0) continue;
    lantern.lit=false; lantern.fuelTicks=0; lantern.deposited=0;
    emit('lantern_out',{lantern_id:lantern.id});
  }
}

function updateCounters(state) {
  const { player, simTick, wind } = state;
  for (const field of ['invuln','dashCd','pulseCd','charm']) player[field] = Math.max(0, player[field] - 1);
  player.justRespawned=player.respawn>0 && --player.respawn===0;
  if (player.justRespawned) {
    player.pos=[0,0,0]; player.vel=[0,0,0]; player.grounded=true; player.facing=Math.PI;
    player.invuln=ticks(tuning.invuln_s);
  }
  for (const enemy of [...state.shades,...state.drifters]) enemy.left = Math.max(0, enemy.left - 1);
  for (const mote of state.motes) if (mote.ttl !== null) mote.ttl--;
  state.motes = state.motes.filter((mote) => mote.ttl === null || mote.ttl > 0);
  for (const charm of state.charms) {
    if (!charm.available && --charm.respawn <= 0) { charm.respawn = 0; charm.available = true; }
  }
  if (state.windEnabled) {
    const cycle = simTick % 1800;
    if (cycle === 1680) wind.dir_deg = state.random() * 360;
    wind.warning = cycle >= 1680;
    wind.active = simTick >= 1800 && cycle < 300;
  }
}

function movePlayer(state, input, pressed, emit) {
  const p = state.player;
  if (p.respawn || p.justRespawned || !p.flames) return;
  const [x,y,z] = p.pos;
  const [ix,iz] = input.move;
  const angle = input.cam_yaw_deg * Math.PI / 180;
  const amount = Math.max(1,Math.hypot(ix,iz));
  const dx = (ix*Math.cos(angle)+iz*Math.sin(angle))/amount;
  const dz = (-ix*Math.sin(angle)+iz*Math.cos(angle))/amount;
  const magnitude = Math.hypot(dx,dz);
  if (magnitude > eps && !p.launch) p.facing = Math.atan2(dx,-dz);
  if (pressed.dash && !p.dashLeft && (p.charm > 0 || p.dashCd === 0)) {
    p.dashDir = magnitude > eps ? [dx/magnitude,dz/magnitude] : [Math.sin(p.facing),-Math.cos(p.facing)];
    p.dashLeft = ticks(tuning.dash_duration_s);
    p.dashCd = p.charm ? 0 : ticks(tuning.dash_cooldown_s);
    emit('dash', {});
  }
  const pad = state.map.pads.find((entry) => within(entry.pos,p.pos,1) && Math.abs(entry.pos[1]-y) < .05);
  let vy = p.vel[1];
  if (pad && p.grounded && p.pad !== pad) {
    const [a,b] = direction(pad.pos,pad.target);
    p.launch = [a*pad.speed,b*pad.speed];
    p.pad = pad;
    vy = pad.up;
  } else if (pressed.jump && p.grounded) vy = jumpSpeed;
  if (!pad) p.pad = null;

  const speed = p.charm ? 7.2 : tuning.player_speed;
  let [vx,vz] = p.launch ?? [dx*speed,dz*speed];
  const dashing = p.dashLeft>0;
  if (dashing) {
    [vx,vz] = p.dashDir.map((component) => component*tuning.dash_speed);
    p.dashLeft--;
  }
  if (p.hitMotion?.ticks > 0) {
    const speed = 6 * p.hitMotion.ticks / 12;
    [vx, vz] = p.hitMotion.heading.map((component) => component * speed);
    if (--p.hitMotion.ticks === 0) p.hitMotion = null;
  }
  if (state.wind.active) {
    const dir = state.wind.dir_deg * Math.PI / 180;
    vx += 2*Math.cos(dir); vz += 2*Math.sin(dir);
  }
  let nx = x+vx/tickRate, nz = z+vz/tickRate;
  const airDash=dashing && (!p.grounded || vy>0);
  let ny=airDash ? y : y+vy/tickRate;
  const height=Math.max(y,ny);
  if (state.night === 3 && (
    hitsWall([x,y,z],nx,nz,height+(p.grounded ? .16 : eps)) ||
    (height>=6-eps && Math.hypot(nx,nz)<2 && Math.hypot(x,z)>=2)
  )) {
    nx=x; nz=z; vx=0; vz=0;
  }
  const surface = floorAt(state.night,nx,nz,y + (p.grounded && vy <= 0 ? .16 : eps));
  p.grounded = !airDash && vy <= 0 && ny <= surface && surface !== -Infinity;
  if (p.grounded) {
    ny=surface; vy=0; p.launch=null;
  } else if (!airDash) vy -= gravity/tickRate;
  p.pos = [nx,ny,nz];
  p.vel = [vx,vy,vz];
  if (ny < -10) {
    const lost = p.carried;
    p.carried = 0;
    p.flames = Math.max(0,p.flames-1);
    p.vel = [0,0,0]; p.grounded=false; p.launch=null; p.dashLeft=0; p.pad=null; p.hitMotion=null;
    p.respawn = p.flames ? 60 : 0;
    emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});
  }
}

function collect(state, emit) {
  const p = state.player;
  if (p.respawn || p.justRespawned || !p.flames) return;
  const close = (pos) => within(p.pos,pos,tuning.pickup_radius) && Math.abs(p.pos[1]-pos[1]) <= 1.5+eps;
  state.motes = state.motes.filter(({pos}) => {
    if (p.carried >= capacityFor(p.successfulLights) || !close(pos)) return true;
    emit('mote_picked',{carried:++p.carried});
    return false;
  });
  for (const charm of state.charms) {
    if (!charm.available || !close(charm.pos)) continue;
    p.charm=600; p.dashCd=0; charm.available=false; charm.respawn=2700;
    emit('charm_picked',{charm_id:charm.id,charm_ticks:p.charm});
  }
}

function deposit(state, emit) {
  const lantern=nearbyLantern(state);
  if (!lantern) return;
  const player=state.player;
  if (lantern.lit) {
    const amount=Math.min(player.carried,Math.ceil((maxFuel-lantern.fuelTicks)/fuelPerMote));
    if (!amount) return;
    player.carried-=amount;
    lantern.fuelTicks=Math.min(maxFuel,lantern.fuelTicks+amount*fuelPerMote);
    state.score+=amount*tuning.score.per_mote;
    emit('refuel',{lantern_id:lantern.id,amount,fuel:reportedFuel(lantern)});
    return;
  }
  const cost=lanternCost(lantern);
  const amount=Math.min(player.carried,cost-lantern.deposited);
  if (amount > 0) {
    player.carried -= amount; lantern.deposited += amount;
    state.score += amount*tuning.score.per_mote;
    emit('deposit',{lantern_id:lantern.id,amount,deposited:lantern.deposited});
  }
  if (lantern.deposited >= cost) {
    const relight=lantern.everLit;
    lantern.lit=true; lantern.everLit=true; lantern.fuelTicks=maxFuel;
    if (relight) lantern.relitCount++;
    player.successfulLights++;
    state.score+=relight?tuning.score.per_relight:tuning.score.per_lantern;
    emit('lantern_lit',{lantern_id:lantern.id,relight});
  }
}

function dropMotes(state, pos, count, spread=false) {
  for (let i=0;i<count;i++) {
    const angle=spread ? state.random()*Math.PI*2 : 0;
    const radius=spread ? 1.5+state.random() : 0;
    const point=offset(pos,[Math.cos(angle),Math.sin(angle)],radius);
    const floor=floorAt(state.night,point[0],point[2],point[1]+eps);
    if (Number.isFinite(floor)) point[1]=floor;
    state.motes.push({id:state.nextMote(),pos:point,kind:'dropped',ttl:dropLifetime});
  }
}

function pulse(state, emit) {
  const p=state.player;
  if (p.respawn || p.justRespawned || !p.flames || p.carried < tuning.pulse_cost || p.pulseCd > 0) return;
  p.carried -= tuning.pulse_cost; p.pulseCd=ticks(tuning.pulse_cooldown_s);
  state.pulseTick=state.simTick;
  const stunnedIds=[];
  const reaches=({pos:[x,y,z]})=>Math.hypot(x-p.pos[0],y-p.pos[1]-.8,z-p.pos[2])<=tuning.pulse_radius+eps;
  for (const s of state.shades) {
    if (!reaches(s)) continue;
    state.score+=s.state==='drain'?tuning.score.per_drain_stun:tuning.score.per_stun;
    s.targetLantern=undefined; s.drainTicks=0;
    s.state='stunned'; s.left=ticks(tuning.pulse_stun_s);
    s.push={dir:direction(p.pos,s.pos),distance:tuning.pulse_push_m/15,left:15};
    stunnedIds.push(s.id);
  }
  emit('pulse',{stunned_ids:stunnedIds});
  for (const d of state.drifters) {
    if (!reaches(d)) continue;
    if (d.state === 'chase') { d.state='flee'; d.left=240; }
    else if (d.state === 'flee' && d.stolen > 0) {
      dropMotes(state,d.pos,d.stolen);
      emit('drifter_drop',{drifter_id:d.id,amount:d.stolen});
      d.stolen=0; d.left=120;
    }
  }
}

const safeAt = (lanterns,pos) => lanterns.find((l) => within(l.pos,pos,tuning.safe_radius));

function closestLantern(lanterns,pos,eligible) {
  let nearest;
  let best=Infinity;
  for (const lantern of lanterns) {
    if (!eligible(lantern)) continue;
    const d=distance(lantern.pos,pos);
    if (d < best-eps) { nearest=lantern; best=d; }
  }
  return nearest;
}

function safetyExit(lanterns, refuge, pos) {
  const heading=direction(refuge.pos,pos);
  const [dx,dz]=heading;
  const intervals=[];
  for (const lamp of lanterns) {
    const x=lamp.pos[0]-pos[0],z=lamp.pos[2]-pos[2];
    const centre=x*dx+z*dz;
    const halfWidthSquared=tuning.safe_radius**2-(x*dz-z*dx)**2;
    if (halfWidthSquared<0) continue;
    const halfWidth=Math.sqrt(halfWidthSquared);
    intervals.push([centre-halfWidth,centre+halfWidth]);
  }
  intervals.sort((a,b)=>a[0]-b[0]);
  let exit=0;
  for (const [start,end] of intervals) {
    if (start>exit+.005) break;
    exit=Math.max(exit,end);
  }
  return offset(pos,heading,exit+.005);
}

function hitsWall(from,x,z,height) {
  const surface=floorAt(3,x,z);
  return surface>height && surface>floorAt(3,from[0],from[2])+eps;
}

function moveShade(state, shade, next, safe) {
  if (safeAt(safe,next) || !Number.isFinite(floorAt(state.night,next[0],next[2],next[1]))) return false;
  if (state.night===3 && hitsWall(shade.pos,next[0],next[2],shade.pos[1])) return false;
  shade.pos=next;
  return true;
}

function moveEnemies(state, safe, wanderOnly = false) {
  const p=state.player;
  for (const s of state.shades) {
    let returnToWander = s.state==='stunned' && s.left===0 && !(s.woodHeldUntil>state.simTick);
    if (s.state==='drain') {
      const target=s.targetLantern;
      const validTarget=target && isWeak(target) && within(s.pos,target.pos,2);
      if (!validTarget || (!p.respawn && within(s.pos,p.pos,6))) {
        s.state=validTarget?'chase':'wander';
        s.tracking=validTarget;
        s.targetLantern=undefined; s.drainTicks=0;
        returnToWander=!validTarget;
      }
    }
    if (returnToWander) { s.state='wander'; s.tracking=false; }
    const refuge=safeAt(safe,s.pos);
    if (s.ejectEnd && distance(s.pos,s.ejectEnd)<eps) s.ejectEnd=undefined;
    if (refuge && (!s.ejectEnd || safeAt(safe,s.ejectEnd))) s.ejectEnd=safetyExit(safe,refuge,s.pos);
    if (s.ejectEnd) {
      s.ejectLeft ??= 30;
      const remaining=s.ejectLeft;
      s.pos=[s.pos[0]+(s.ejectEnd[0]-s.pos[0])/remaining,s.pos[1],
        s.pos[2]+(s.ejectEnd[2]-s.pos[2])/remaining];
      s.ejectLeft=Math.max(1,s.ejectLeft-1);
      continue;
    }
    s.ejectLeft=undefined;
    if (s.woodHeldUntil > state.simTick) continue;
    if (s.state==='drain') continue;
    if (s.push?.left>0) {
      const moved=moveShade(state,s,offset(s.pos,s.push.dir,s.push.distance),safe);
      s.push.left=moved?s.push.left-1:0;
      continue;
    }
    if (s.left > 0 && ['spawning','stunned','recoil'].includes(s.state)) continue;
    if (returnToWander) continue;
    s.tracking=!wanderOnly && !p.respawn && within(s.pos,p.pos,s.tracking?18:12);
    s.state=s.tracking?'chase':'wander';
    s.heading+=.008;
    const target=s.tracking ? null : closestLantern(state.lanterns,s.pos,isWeak)
      ?? closestLantern(state.lanterns,s.pos,(lantern)=>!lantern.lit);
    const destination=s.tracking ? p.pos : target?.pos;
    const dir=destination?direction(s.pos,destination):[Math.cos(s.heading),Math.sin(s.heading)];
    const step=(state.night===3?tuning.shade_speed_night3:tuning.shade_speed)/tickRate*(s.tracking?1:.45);
    const travel=destination?Math.min(step,distance(s.pos,destination)):step;
    const next=offset(s.pos,dir,travel);
    if (!moveShade(state,s,next,safe) && safeAt(safe,next) && !safeAt(safe,s.pos)) {
      // Stop at the rim rather than a whole simulation step short of it.
      let clear=0, blocked=travel;
      for (let i=0;i<10;i++) {
        const middle=(clear+blocked)/2;
        if (safeAt(safe,offset(s.pos,dir,middle))) blocked=middle; else clear=middle;
      }
      moveShade(state,s,offset(s.pos,dir,clear),safe);
    }
    if (target && isWeak(target) && within(s.pos,target.pos,2)) {
      s.state='drain'; s.targetLantern=target; s.drainTicks=0;
    }
  }
  for (const d of state.drifters) {
    if (d.woodHeldUntil > state.simTick) continue;
    if (d.state === 'flee' && d.left === 0) d.state='removed';
    if (d.state === 'removed') continue;
    if (d.state !== 'flee') d.state=p.carried >= 5 && within(d.pos,p.pos,15) ? 'chase' : 'idle';
    const dist=distance(d.pos,p.pos);
    d.heading += .013;
    if (d.state === 'idle') d.pos=offset(d.pos,[Math.cos(d.heading),Math.sin(d.heading)],2/tickRate);
    if (d.state === 'chase') d.pos=offset(d.pos,direction(d.pos,p.pos),Math.min(7/tickRate,dist));
    if (d.state === 'flee') d.pos=offset(d.pos,direction(p.pos,d.pos),7/tickRate);
  }
}

export function stepBenchmark(state) {
  state.tick++;
  state.simTick++;
  const safe=state.lanterns.filter((lantern)=>lantern.lit && !isWeak(lantern));
  moveEnemies(state,safe,true);
}

function contacts(state,safe,emit,reactToHits) {
  const p=state.player;
  if (p.respawn || p.justRespawned || !p.flames) return;
  for (const d of state.drifters) {
    if (d.woodHeldUntil > state.simTick || d.state !== 'chase' || p.carried < 5 || !within(p.pos,d.pos,1.2)) continue;
    const amount=Math.min(3,p.carried);
    d.state='flee'; d.left=240; d.stolen=amount; p.carried-=amount;
    emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});
  }
  if (p.invuln || !p.flames || safeAt(safe,p.pos)) return;
  const s=state.shades.filter((shade) => ['chase','wander'].includes(shade.state) && !shade.ejectLeft
    && within(p.pos,shade.pos,tuning.shade_hit_radius) && Math.abs(p.pos[1]-shade.pos[1])<=1.5+eps)
    .sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}))[0];
  if (!s) return;
  p.flames--; p.invuln=ticks(tuning.invuln_s);
  if (reactToHits && p.flames > 0) {
    p.hitMotion = { heading: direction(s.pos,p.pos), ticks: 12 };
    p.vel[1] = 3.6;
    p.grounded = false;
    p.launch = null;
    p.dashLeft = 0;
  }
  const dropped=Math.floor(p.carried*tuning.hit_drop_ratio);
  p.carried-=dropped; dropMotes(state,p.pos,dropped,true);
  s.state='recoil'; s.left=60;
  s.push={dir:direction(p.pos,s.pos),distance:2/60,left:60};
  emit('player_hit',{by:'shade',flames:p.flames,dropped});
}

function spawn(state,emit) {
  const {map,night,simTick,random}=state;
  const choose=(entries)=>entries[Math.floor(random()*entries.length)];
  if (state.spawnMotes && state.motes.length<30 && simTick%240===0) {
    const pos=choose(map.motes.filter((point)=>!state.motes.some((m)=>m.pos===point ||
      (m.pos[1]===point[1] && within(m.pos,point,.02)))));
    if (pos) state.motes.push({id:state.nextMote(),pos,kind:'random',ttl:null});
  }
  const shadeDue=simTick>=300 && (simTick-300)%ticks(map.shadesEvery)===0;
  if (state.spawnShades && shadeDue) {
    const points=map.mist.filter((point)=>distance(point,state.player.pos)>=(map.minShadeDistance??0));
    const count=simTick===300 ? 2 : 1;
    for (let i=0;i<count && points.length && state.shades.length<map.shadeLimit;i++) {
      const point=points.splice(Math.floor(random()*points.length),1)[0];
      const s={id:state.nextShade(),pos:[point[0],point[1]+eyeHeight,point[2]],
        state:'spawning',left:30,heading:random()*Math.PI*2};
      state.shades.push(s); emit('shade_spawned',{id:s.id});
    }
  }
  if (state.spawnDrifters && simTick%1200===0 && state.drifters.filter((d)=>d.state!=='removed').length<2) {
    const pos=choose(map.mist);
    state.drifters=state.drifters.filter((d)=>d.state!=='removed');
    state.drifters.push({id:state.nextDrifter(),pos:[pos[0],pos[1]+1,pos[2]],state:'idle',stolen:0,left:0,heading:random()*Math.PI*2});
  }
}

export function stepGame(state,input=defaultInput,reactToHits=false) {
  if (state.state==='won' || state.state==='lost') return [];
  state.tick++;
  const events=[];
  const emit=(name,data)=>events.push({type:'event',tick:state.tick,name,data});
  const pressed={};
  for (const button of buttons) {
    pressed[button]=Boolean(input[button]&&!state.held[button]);
    state.held[button]=Boolean(input[button]);
  }
  if (pressed.pause) {
    const wasPaused=state.state==='paused';
    state.state=wasPaused?'playing':'paused';
    emit(wasPaused?'resumed':'paused',{});
    if (!wasPaused) return events;
  }
  if (state.state==='paused') return events;
  state.simTick++;
  updateCounters(state);
  updateFuel(state,emit);
  movePlayer(state,input,pressed,emit);
  collect(state,emit);
  if (pressed.interact) deposit(state,emit);
  const safe=state.lanterns.filter((l)=>l.lit && !isWeak(l));
  if (pressed.pulse) pulse(state,emit);
  moveEnemies(state,safe);
  contacts(state,safe,emit,reactToHits);
  spawn(state,emit);
  const dawn=timeLeft(state)<=0;
  const bright=state.lanterns.filter((lantern)=>lantern.lit);
  const won=dawn && bright.length>=requiredLanterns(state);
  const reason=!state.player.flames?'no_flames':won?'dawn_survived':dawn?'dawn':null;
  if (reason) {
    state.state=reason==='dawn_survived'?'won':'lost';
    if (state.state==='won') {
      state.score+=bright.reduce((score,lantern)=>score+tuning.score.per_dawn_lantern+Math.floor(fuelLevel(lantern)),0)
        + state.player.flames*tuning.score.per_flame_left;
    }
    emit('game_over',{result:state.state,reason});
  }
  return events;
}

export function snapshot(state) {
  const pos = (entity) => entity.pos.map(round);
  const seconds = (value) => round(value/tickRate);
  const p=state.player;
  return {
    type:'snapshot',tick:state.tick,sim_tick:state.simTick,state:state.state,night:state.night,
    time_left_s:timeLeft(state),score:state.score,wind:{active:state.wind.active,dir_deg:round(state.wind.dir_deg)},
    player:{pos:pos(p),flames:p.flames,carried:p.carried,capacity:capacityFor(p.successfulLights),vel:p.vel.map(round),grounded:p.grounded,
      invuln:p.invuln>0,dash_cd_s:seconds(p.dashCd),pulse_cd_s:seconds(p.pulseCd),charm_s:seconds(p.charm)},
    lanterns:state.lanterns.map((l)=>({id:l.id,pos:pos(l),lit:l.lit,deposited:l.deposited,
      fuel:reportedFuel(l),ever_lit:l.everLit,relit_count:l.relitCount})),
    shades:state.shades.map((s)=>({id:s.id,pos:pos(s),state:s.state})),
    motes_active:state.motes.length,
    motes:state.motes.map((m)=>({id:m.id,pos:pos(m),kind:m.kind,ttl_s:m.ttl===null?null:seconds(m.ttl)})),
    drifters:state.drifters.map((d)=>({id:d.id,pos:pos(d),state:d.state,stolen:d.stolen})),
    charms:state.charms.map((c)=>({id:c.id,available:c.available,respawn_s:seconds(c.respawn)})),
  };
}
