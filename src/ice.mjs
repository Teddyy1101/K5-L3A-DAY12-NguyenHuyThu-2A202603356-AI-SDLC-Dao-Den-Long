import { tickRate } from './core.mjs';
import { floorAt } from './nights.mjs';
import { glow, hash, project } from './meteor.mjs';

// Phép băng (phím 3). Thuần hình ảnh: không đổi trạng thái gameplay, luật hay đầu ra headless.
export const iceLayers = [
  ['spikes', 'Gai mọc từ đất', [['spacing', 'Khoảng cách gai (m)', .6, 2, .1, 1], ['travel', 'Thời gian lan tới quái (giây)', .3, 1.5, .05, .7],
    ['height', 'Chiều cao gốc (m)', .6, 2, .1, 1.1]]],
  ['grow', 'Gai to dần về phía quái', [['growth', 'Gai cuối to gấp (×)', 1, 4, .1, 2.4]]],
  ['fan', 'Gai nhỏ hai bên', [['fanAngle', 'Góc nghiêng ra (độ)', 10, 55, 1, 30], ['fanSize', 'Cỡ gai nhỏ', .3, .8, .05, .5], ['fanCount', 'Số gai mỗi bên', 1, 2, 1, 1]]],
  ['cracks', 'Đất nứt và mảnh vụn', [['crackCount', 'Số vết nứt', 4, 12, 1, 8], ['crackLength', 'Độ dài vết nứt (m)', 1, 4, .1, 2.4], ['debris', 'Mảnh vụn', 0, 24, 1, 12]]],
  ['shatter', 'Gai tan từ đỉnh và vỡ mảnh', [['hold', 'Giữ gai (giây)', .3, 3, .1, 1], ['shatterTime', 'Thời gian tan (giây)', .2, 1, .05, .5], ['shards', 'Mảnh mỗi gai', 2, 8, 1, 5]]],
  ['freeze', 'Kết liễu · bọc khối băng', [['blockSize', 'Cỡ khối băng', .8, 2.5, .1, 1.2], ['blockHold', 'Giữ khối băng (giây)', 1, 5, .1, 2.8], ['snow', 'Tuyết và hơi lạnh', 0, 60, 1, 30]]],
];

export const iceCooldown = 6;
const maxRange = 21, rise = .3, turn = Math.PI * 2, sides = 5;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const easeOutBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

export function iceSettings(saved = {}) {
  const options = {};
  for (const [id, , fields] of iceLayers) {
    options[id] = typeof saved?.[id] === 'boolean' ? saved[id] : true;
    for (const [key, , min, max, step, fallback] of fields) {
      const value = Number.isFinite(saved?.[key]) ? saved[key] : fallback;
      options[key] = clamp(step >= 1 ? Math.round(value) : value, min, max);
    }
  }
  return options;
}

export function castIce(state, options) {
  const start = [...state.player.pos];
  const target = [...state.shades, ...state.drifters]
    .filter((enemy) => enemy.state !== 'removed')
    .map((enemy) => ({ enemy, range: Math.hypot(enemy.pos[0] - start[0], enemy.pos[2] - start[2]) }))
    .filter(({ range }) => range <= maxRange)
    .sort((a, b) => a.range - b.range)[0]?.enemy;
  const east = Math.sin(state.player.facing), north = -Math.cos(state.player.facing);
  const end = target ? [...target.pos] : [start[0] + east * 13, start[1], start[2] + north * 13];
  const length = Math.hypot(end[0] - start[0], end[2] - start[2]);
  const direction = length > .05 ? [(end[0] - start[0]) / length, (end[2] - start[2]) / length] : [east, north];
  const o = { ...options };
  const from = Math.min(1.5, length * .3), to = Math.max(from + .5, length - .7);
  const count = o.spikes ? Math.max(2, Math.floor((to - from) / o.spacing) + 1) : 0;
  const spikes = [];
  for (let i = 0; i < count; i++) {
    const p = count > 1 ? i / (count - 1) : 1, distance = from + (to - from) * p;
    const scale = o.grow ? 1 + (o.growth - 1) * p : 1;
    const jitter = (hash(i * 3.1 + state.simTick) - .5) * .18;
    spikes.push({ index: i, t: i / count * o.travel, scale, x: start[0] + direction[0] * distance - direction[1] * jitter,
      z: start[2] + direction[1] * distance + direction[0] * jitter, seed: i + 1 });
  }
  const hitAt = count ? o.travel + rise * .5 : .2;
  const spikeEnd = count ? o.travel + rise + (o.shatter ? o.hold + o.shatterTime + 1.7 : o.hold + .4) : 0;
  const frozen = Boolean(o.freeze && target);
  const freezeAt = hitAt + .15;
  const blockEnd = frozen ? freezeAt + .35 + o.blockHold + .7 : 0;
  return { start, end, target, direction, options: o, spikes, hitAt, freezeAt, frozen, startTick: state.simTick,
    duration: Math.max(spikeEnd, blockEnd, target && o.cracks ? hitAt + 2.1 : 0, .6) };
}

export const iceAge = (state, cast) => (state.simTick - cast.startTick) / tickRate;
export const iceVisible = (state, cast) => Boolean(cast) && iceAge(state, cast) <= cast.duration;

function ground(state, x, z, fallback) {
  const level = floorAt(state.night, x, z, fallback + 1.2);
  return Number.isFinite(level) ? level : fallback;
}

function anchor(state, cast) {
  const enemy = cast.target;
  const live = enemy && enemy.state !== 'removed' ? enemy.pos : cast.end;
  return [live[0], ground(state, live[0], live[2], cast.target ? cast.end[1] - .7 : cast.end[1]), live[2]];
}

const palette = ['#d9f4ff', '#a9dcf7', '#effbff', '#7cc3ee', '#c3e9fb'];

// Gai 5 cạnh. `cut` là phần đỉnh đã tan, đỉnh bị cắt nhỏ dần thay vì biến mất.
function spike(shapes, [x, y, z], radius, height, tilt, cut = 0, seed = 1, alpha = '') {
  const levelHeight = height * (1 - cut), topRadius = radius * cut;
  if (levelHeight < .02 || radius < .01) return;
  const lean = levelHeight / height;
  const ring = (r, h, shift) => Array.from({ length: sides }, (_, i) => {
    const a = turn * i / sides + seed;
    return [x + shift[0] + Math.cos(a) * r, y + h, z + shift[1] + Math.sin(a) * r];
  });
  const low = ring(radius, 0, [0, 0]), top = ring(topRadius, levelHeight, [tilt[0] * lean, tilt[1] * lean]);
  for (let i = 0; i < sides; i++) {
    const next = (i + 1) % sides, colour = palette[(i + seed) % palette.length] + alpha;
    shapes.push({ vertices: topRadius < .015 ? [low[i], low[next], top[0]] : [low[i], low[next], top[next], top[i]], color: colour });
  }
  if (topRadius >= .015) shapes.push({ vertices: top, color: '#f4fcff' + alpha });
}

function shard(shapes, [x, y, z], size, spin, tumble, color) {
  const points = [0, 1, 2].map((k) => {
    const a = k * turn / 3 + spin;
    return [x + Math.cos(a) * size, y + Math.sin(a) * Math.cos(tumble) * size, z + Math.sin(a) * Math.sin(tumble) * size];
  });
  shapes.push({ vertices: points, color });
}

// Mảnh bay: parabol có sàn, đáp xuống rồi nhỏ dần, không biến mất đột ngột.
function flight(from, velocity, floor, s) {
  const y = from[1] + velocity[1] * s - 9 * s * s;
  const landed = y <= floor;
  return { pos: [from[0] + velocity[0] * Math.min(s, 1.2), Math.max(floor, y), from[2] + velocity[2] * Math.min(s, 1.2)], landed };
}
function sizeAfter(s, life) { return s < life ? 1 : clamp(1 - (s - life) / .6); }

export function drawIceModels(shapes, state, cast) {
  if (!iceVisible(state, cast)) return;
  const t = iceAge(state, cast), o = cast.options, [dx, dz] = cast.direction, px = -dz, pz = dx;
  for (const sp of cast.spikes) {
    const base = [sp.x, ground(state, sp.x, sp.z, cast.start[1]), sp.z];
    const parts = [{ along: 0, side: 0, size: 1, lean: [0, 0], delay: 0, id: 0 }];
    if (o.fan) {
      for (const side of [-1, 1]) {
        for (let j = 1; j <= o.fanCount; j++) {
          const spread = (.34 + .3 * (j - 1)) * sp.scale + .1, tilt = Math.tan(o.fanAngle * Math.PI / 180);
          const size = o.fanSize * (j === 1 ? 1 : .72);
          parts.push({ along: -.1 * j, side: side * spread, size, lean: [px * side * tilt * o.height * sp.scale * size * .9, pz * side * tilt * o.height * sp.scale * size * .9],
            delay: .05 * j, id: side * j + 7 });
        }
      }
    }
    for (const part of parts) {
      const age = t - sp.t - part.delay;
      if (age < 0) continue;
      const x = base[0] + dx * part.along + px * part.side, z = base[2] + dz * part.along + pz * part.side;
      const floor = ground(state, x, z, base[1]);
      const full = o.height * sp.scale * part.size, radius = .2 * sp.scale * (part.id ? part.size * .8 : 1) + .06;
      const tilt = part.id ? part.lean : [dx * .12, dz * .12];
      const shatterAt = rise + o.hold;
      if (age < shatterAt || !o.shatter) {
        const grown = easeOutBack(clamp(age / rise));
        const sink = !o.shatter && age > shatterAt ? clamp(1 - (age - shatterAt) / .4) : 1;
        spike(shapes, [x, floor, z], radius, full * Math.max(0, grown) * sink, tilt, 0, sp.seed + part.id);
        continue;
      }
      const u = clamp((age - shatterAt) / o.shatterTime);
      if (u < 1) spike(shapes, [x, floor, z], radius, full, tilt, u, sp.seed + part.id);
      for (let k = 0; k < o.shards; k++) {
        const fraction = (k + .5) / o.shards;
        if (u < fraction && u < 1) continue;
        const born = shatterAt + fraction * o.shatterTime, s = age - born;
        if (s < 0) continue;
        const key = (sp.seed * 17 + part.id * 5 + k) * 1.7, heading = hash(key) * turn, push = .8 + hash(key + 1) * 1.6;
        const level = full * (1 - fraction), lean = 1 - fraction;
        const from = [x + tilt[0] * lean, floor + level, z + tilt[1] * lean];
        const { pos } = flight(from, [Math.cos(heading) * push, .8 + hash(key + 2) * 1.6, Math.sin(heading) * push], floor + .04, s);
        const size = (.07 + radius * (1 - fraction) * .8) * sizeAfter(s, 1);
        if (size > .01) shard(shapes, pos, size, hash(key + 3) * turn + Math.min(s, .9) * (4 + hash(key + 4) * 6), Math.min(s, .9) * 5 + hash(key + 5) * 3,
          k % 2 ? '#e8f8ff' : '#a9dcf7');
      }
    }
  }
  if (!cast.target) return;
  const [cx, feet, cz] = anchor(state, cast), s = t - cast.hitAt;
  if (o.cracks && s >= 0 && s < 2.1) {
    const fade = clamp((2.1 - s) / .5), grow = clamp(s / .25) * 4, tone = Math.round(fade * 255).toString(16).padStart(2, '0');
    for (let c = 0; c < o.crackCount; c++) {
      const angle = turn * c / o.crackCount + (hash(c * 4.3) - .5) * .5, reach = o.crackLength * (.7 + hash(c * 1.3) * .6);
      let previous = [cx, cz], width = .22;
      for (let k = 1; k <= 4 && k <= Math.ceil(grow); k++) {
        const part = Math.min(1, grow - (k - 1)), distance = reach * (k - 1 + part) / 4;
        const wobble = (hash(c * 9 + k) - .5) * .5, a = angle + wobble;
        const next = [cx + Math.cos(a) * distance, cz + Math.sin(a) * distance];
        const nx = -Math.sin(a), nz = Math.cos(a), w = width * (1 - k / 5.5);
        for (const [scale, y, colour] of [[1, .02, '#0d1822'], [.5, .035, '#b4ecff']]) {
          shapes.push({ vertices: [[previous[0] - nx * w * scale, feet + y, previous[1] - nz * w * scale], [previous[0] + nx * w * scale, feet + y, previous[1] + nz * w * scale],
            [next[0] + nx * w * scale * .8, feet + y, next[1] + nz * w * scale * .8], [next[0] - nx * w * scale * .8, feet + y, next[1] - nz * w * scale * .8]], color: colour + tone });
        }
        previous = next; width = w;
      }
    }
    for (let d = 0; d < o.debris; d++) {
      const born = hash(d * 2.2) * .18, age = s - born;
      if (age < 0) continue;
      const heading = hash(d * 5.1) * turn, from = Math.sqrt(hash(d * 7.7)) * o.crackLength * .8;
      const origin = [cx + Math.cos(heading) * from, feet + .05, cz + Math.sin(heading) * from];
      const { pos } = flight(origin, [Math.cos(heading) * (.4 + hash(d) * 1.2), 2.4 + hash(d + 9) * 2.4, Math.sin(heading) * (.4 + hash(d) * 1.2)], feet + .04, age);
      const size = (.045 + hash(d + 3) * .06) * sizeAfter(age, 1.1);
      if (size > .01) shard(shapes, pos, size, hash(d + 1) * turn + Math.min(age, .8) * 9, Math.min(age, .8) * 7, ['#5a6b6f', '#8fa3a8', '#cfe8f5'][d % 3]);
    }
  }
  if (cast.frozen) {
    const age = t - cast.freezeAt;
    if (age < 0) return;
    const melt = clamp((age - .35 - o.blockHold) / .7), grown = clamp(easeOutBack(clamp(age / .35)), 0, 1.12);
    const R = .85 * o.blockSize * grown * (1 + melt * .2), H = 2.1 * o.blockSize * grown * (1 - melt * .85);
    if (H < .03) return;
    const alpha = Math.round((1 - melt * .5) * 150).toString(16).padStart(2, '0');
    const ring = (radius, h, spin) => Array.from({ length: 7 }, (_, i) => {
      const a = turn * i / 7 + spin, wobble = .88 + hash(i * 6.6 + h) * .24;
      return [cx + Math.cos(a) * radius * wobble, feet + h, cz + Math.sin(a) * radius * wobble];
    });
    const rings = [ring(R, 0, .2), ring(R * 1.1, H * .3, .35), ring(R * .95, H * .66, .5), ring(R * .6, H * .9, .7)];
    const tip = [cx + R * .08, feet + H, cz - R * .06];
    const tones = ['#c3e9fb', '#9fd8ff', '#e8f8ff', '#7cc3ee', '#d9f4ff'];
    for (let band = 0; band < 3; band++) {
      for (let i = 0; i < 7; i++) {
        const next = (i + 1) % 7;
        shapes.push({ vertices: [rings[band][i], rings[band][next], rings[band + 1][next], rings[band + 1][i]], color: tones[(i + band) % tones.length] + alpha });
      }
    }
    for (let i = 0; i < 7; i++) shapes.push({ vertices: [rings[3][i], rings[3][(i + 1) % 7], tip], color: tones[(i + 2) % tones.length] + alpha });
    for (let i = 0; i < 5; i++) {
      const a = turn * i / 5 + .5, r = R * 1.12;
      spike(shapes, [cx + Math.cos(a) * r, feet, cz + Math.sin(a) * r], .17 * o.blockSize, (.6 + hash(i) * .4) * o.blockSize * grown * (1 - melt),
        [Math.cos(a) * .35, Math.sin(a) * .35], 0, i + 2);
    }
  }
}

export function paintIce(ctx, camera, state, cast, options = {}) {
  if (!iceVisible(state, cast)) return;
  const t = iceAge(state, cast), o = cast.options;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const sp of cast.spikes) {
    const age = t - sp.t;
    if (age < 0 || age > .45) continue;
    const spot = project(camera, [sp.x, ground(state, sp.x, sp.z, cast.start[1]) + o.height * sp.scale * .7, sp.z]);
    if (spot) { ctx.globalAlpha = (1 - age / .45) * .8; glow(ctx, spot[0], spot[1], .75 * sp.scale * spot[2], '#8fe0ffcc'); }
  }
  if (!cast.target) { ctx.restore(); return; }
  const centre = anchor(state, cast), s = t - cast.hitAt;
  if (s >= 0 && s < .25 && !options.reduceMotion) {
    const spot = project(camera, [centre[0], centre[1] + .8, centre[2]]);
    if (spot) { ctx.globalAlpha = 1 - s / .25; glow(ctx, spot[0], spot[1], 1.8 * spot[2], '#e8faffff'); }
  }
  if (cast.frozen && t >= cast.freezeAt) {
    const age = t - cast.freezeAt, melt = clamp((age - .35 - o.blockHold) / .7), size = o.blockSize;
    for (let i = 0; i < 8; i++) {
      const life = (age * .45 + hash(i * 3.3)) % 1, a = hash(i * 1.9) * turn + age * .6;
      const spot = project(camera, [centre[0] + Math.cos(a) * size * (.5 + life * .9), centre[1] + .15 + life * 1.3 * size, centre[2] + Math.sin(a) * size * (.5 + life * .9)]);
      if (!spot) continue;
      ctx.globalAlpha = Math.sin(life * Math.PI) * .32 * (1 - melt); glow(ctx, spot[0], spot[1], (.55 + life * .7) * size * spot[2], '#d8f3ffcc');
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < o.snow; i++) {
      const life = (age * (.28 + hash(i) * .2) + hash(i * 2.7)) % 1, a = hash(i * 4.1) * turn + age * (.7 + hash(i + 8) * .8);
      const radius = (.4 + hash(i * 6.3) * 1.5) * size;
      const spot = project(camera, [centre[0] + Math.cos(a) * radius, centre[1] + (1 - life) * 3.2 * size, centre[2] + Math.sin(a) * radius]);
      if (!spot) continue;
      ctx.globalAlpha = Math.sin(life * Math.PI) * .9 * (1 - melt);
      ctx.beginPath(); ctx.arc(spot[0], spot[1], Math.max(1.1, (.03 + hash(i + 2) * .035) * spot[2]), 0, turn); ctx.fill();
    }
  }
  ctx.restore();
}
