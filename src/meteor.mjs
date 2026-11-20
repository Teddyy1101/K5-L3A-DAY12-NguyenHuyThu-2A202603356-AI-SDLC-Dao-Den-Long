import { seededRandom, tickRate } from './core.mjs';

// Mưa sao băng (phím 2). Chỉ là hiệu ứng hình ảnh: không đổi trạng thái gameplay,
// nên luật, số liệu và đầu ra headless giữ nguyên.
export const meteorLayers = [
  ['head', 'Đầu sáng', [['headSize', 'Bán kính (m)', .1, .7, .02, .3], ['elongation', 'Độ thuôn dài', 1, 3.5, .1, 2]]],
  ['tail', 'Vệt đuôi', [['tailLength', 'Chiều dài (m)', 2, 14, .5, 7], ['sparkles', 'Bụi lấp lánh', 0, 40, 1, 18]]],
  ['burst', 'Nổ tia', [['rays', 'Số tia', 6, 24, 1, 14], ['rayLength', 'Độ dài tia (m)', .8, 4, .1, 2]]],
  ['stars', 'Sao văng', [['starCount', 'Số sao', 2, 14, 1, 7], ['starSize', 'Kích thước (m)', .1, .6, .02, .26]]],
  ['rain', 'Mưa liên tục', [['count', 'Số sao băng', 5, 60, 1, 30], ['duration', 'Thời lượng (giây)', 1, 6, .1, 3.5],
    ['spread', 'Bán kính rải (m)', 1, 8, .1, 4]]],
  ['umbrella', 'Bonus · ô và sao băng khổng lồ', [['umbrellaSize', 'Cỡ ô (m)', .8, 2.2, .1, 1.4], ['giantScale', 'Độ to (×)', 2, 8, .5, 5]]],
];

export const meteorCooldown = 8;
const maxRange = 21;
const turn = Math.PI * 2;
const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const canopyHeight = 2.4, rimHeight = 1.95, gores = 8;

export function meteorSettings(saved = {}) {
  const options = {};
  for (const [id, , fields] of meteorLayers) {
    options[id] = typeof saved?.[id] === 'boolean' ? saved[id] : true;
    for (const [key, , min, max, step, fallback] of fields) {
      const value = Number.isFinite(saved?.[key]) ? saved[key] : fallback;
      options[key] = clamp(step >= 1 ? Math.round(value) : value, min, max);
    }
  }
  return options;
}

export function hash(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function castMeteor(state, options) {
  const start = [...state.player.pos];
  const target = [...state.shades, ...state.drifters]
    .filter((enemy) => enemy.state !== 'removed')
    .map((enemy) => ({ enemy, range: Math.hypot(enemy.pos[0] - start[0], enemy.pos[2] - start[2]) }))
    .filter(({ range }) => range <= maxRange)
    .sort((a, b) => a.range - b.range)[0]?.enemy;
  const east = Math.sin(state.player.facing), north = -Math.cos(state.player.facing);
  const end = target ? [...target.pos] : [start[0] + east * 13, start[1], start[2] + north * 13];
  end[1] = target ? target.pos[1] - .7 : end[1];
  const random = seededRandom(state.simTick + 17);
  const o = { ...options };
  const umbrella = Boolean(o.umbrella && target);
  const many = Boolean(o.rain);
  const radius = umbrella ? o.umbrellaSize * .75 : o.spread;
  const meteors = [];
  const total = many ? o.count : 1;
  for (let i = 0; i < total; i++) {
    const angle = random() * turn, reach = Math.sqrt(random()) * (many ? radius : 0);
    const ox = Math.cos(angle) * reach, oz = Math.sin(angle) * reach;
    const rim = umbrella ? Math.hypot(ox, oz) / o.umbrellaSize : 0;
    meteors.push({
      id: i + 1, t0: many && i ? random() * o.duration * .85 : 0,
      fall: many ? .55 + random() * .35 : 1.05, size: many ? (i ? .55 + random() * .9 : 1.2) : 1.2,
      ox, oz, lift: umbrella ? canopyHeight - (canopyHeight - rimHeight) * rim * rim : 0, height: 9 + random() * 2, tilt: .9,
    });
  }
  meteors.sort((a, b) => a.t0 - b.t0);
  const rainEnd = many ? o.duration : 0;
  let giant;
  if (umbrella) {
    const fall = 1.05, height = 12;
    giant = { id: 999, t0: rainEnd + .75 + .35, fall, size: o.giantScale, ox: 0, oz: 0, lift: 0, height, tilt: 0,
      pierce: fall * Math.pow(1 - canopyHeight / height, 2 / 3) };
    meteors.push(giant);
  }
  const lastImpact = Math.max(...meteors.map((m) => m.t0 + m.fall));
  const duration = giant ? giant.t0 + giant.fall + 2.9 : lastImpact + 2.2;
  const side = [-Math.sin(state.player.facing + Math.PI / 2) * .8, Math.cos(state.player.facing + Math.PI / 2) * .8];
  return { start, end, target, options: o, meteors, giant, umbrella, duration, side, startTick: state.simTick, seed: state.simTick,
    stars: Array.from({ length: 16 }, () => ({ angle: random() * turn, speed: 1 + random() * 1.8, rise: 2.6 + random() * 2.2, spin: (random() - .5) * 16 })),
    pieces: Array.from({ length: gores + 1 }, () => ({ speed: 2 + random() * 2, rise: 3 + random() * 2, spin: 5 + random() * 7 })) };
}

export const meteorAge = (state, cast) => (state.simTick - cast.startTick) / tickRate;
export const meteorVisible = (state, cast) => Boolean(cast) && meteorAge(state, cast) <= cast.duration;

function anchor(cast) {
  const enemy = cast.target;
  if (enemy && enemy.state !== 'removed') return { centre: [enemy.pos[0], enemy.pos[1] - .7, enemy.pos[2]] };
  return { centre: cast.end };
}

export function meteorSquash(cast, t) {
  if (!cast?.giant) return 1;
  const s = t - (cast.giant.t0 + cast.giant.fall);
  if (s < 0) return 1;
  if (s < .1) return 1 - s / .1 * .88;
  if (s < 2) return .12;
  if (s < 2.6) return .12 + .88 * (s - 2) / .6;
  return 1;
}

export function squashFaces(shapes, start, enemy, feet, factor) {
  if (factor >= 1) return;
  const [cx, , cz] = enemy.pos, wide = 1 + (1 - factor) * .7;
  for (let i = start; i < shapes.length; i++) {
    const face = shapes[i];
    shapes[i] = { ...face, vertices: face.vertices.map(([x, y, z]) => [cx + (x - cx) * wide, feet + (y - feet) * factor, cz + (z - cz) * wide]) };
  }
}

function pathPoint(cast, m, age, dest) {
  const e = Math.pow(clamp(age / m.fall), 1.5), k = 1 - e;
  return [dest[0] + cast.side[0] * m.tilt * m.height * k, dest[1] + m.height * k, dest[2] + cast.side[1] * m.tilt * m.height * k];
}

// Ô là mô hình 3D để được sắp theo độ sâu cùng cây, đèn và nhân vật.
export function drawMeteorModels(shapes, state, cast) {
  if (!meteorVisible(state, cast) || !cast.umbrella) return;
  const t = meteorAge(state, cast), { centre: [cx, feet, cz] } = anchor(cast), o = cast.options;
  const open = clamp(t / .35), grow = 1 - Math.pow(1 - open, 3);
  const R = o.umbrellaSize * (.15 + .85 * grow);
  const lift = (1 - grow) * -.8;
  const breakAt = cast.giant.t0 + cast.giant.pierce, broken = t >= breakAt;
  const colours = ['#c8102e', '#f2c14e'];
  const gore = (i, shift) => {
    const a0 = turn * i / gores, a1 = turn * (i + 1) / gores;
    const at = (a, r, h) => [cx + Math.cos(a) * R * r, feet + h + lift, cz + Math.sin(a) * R * r];
    return [
      { vertices: [[cx, feet + canopyHeight + lift, cz], at(a0, .62, 2.3), at(a1, .62, 2.3)], color: colours[i % 2] },
      { vertices: [at(a0, .62, 2.3), at(a0, 1, rimHeight), at(a1, 1, rimHeight), at(a1, .62, 2.3)], color: colours[(i + 1) % 2] },
    ].map((face) => shift ? { ...face, vertices: face.vertices.map(shift) } : face);
  };
  if (!broken) {
    for (let i = 0; i < gores; i++) shapes.push(...gore(i));
    for (const [dx, dz] of [[.02, 0], [0, .02]]) {
      shapes.push({ vertices: [[cx - dx, feet + .95 + lift, cz - dz], [cx + dx, feet + .95 + lift, cz + dz],
        [cx + dx, feet + canopyHeight + lift, cz + dz], [cx - dx, feet + canopyHeight + lift, cz - dz]], color: '#6b4a2f' });
    }
    return;
  }
  const s = t - breakAt;
  if (s > 2.4) return;
  for (let i = 0; i <= gores; i++) {
    const piece = cast.pieces[i], mid = turn * (i + .5) / gores;
    const seconds = Math.min(s, 1.2);
    const lifted = [Math.cos(mid) * piece.speed * s, piece.rise * s - 6.5 * s * s, Math.sin(mid) * piece.speed * s];
    const axis = [-Math.sin(mid), 0, Math.cos(mid)], angle = piece.spin * seconds;
    const centre = [cx + Math.cos(mid) * R * .6, feet + 2.1, cz + Math.sin(mid) * R * .6];
    const rotate = ([x, y, z]) => {
      const v = [x - centre[0], y - centre[1], z - centre[2]], c = Math.cos(angle), n = Math.sin(angle);
      const d = axis[0] * v[0] + axis[2] * v[2];
      const cr = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
      const r = [v[0] * c + cr[0] * n + axis[0] * d * (1 - c), v[1] * c + cr[1] * n, v[2] * c + cr[2] * n + axis[2] * d * (1 - c)];
      const y2 = Math.max(feet + .03, centre[1] + r[1] + lifted[1]);
      return [centre[0] + r[0] + lifted[0], y2, centre[2] + r[2] + lifted[2]];
    };
    if (i < gores) shapes.push(...gore(i, rotate));
    else shapes.push({ vertices: [[cx - .02, feet + .95, cz], [cx + .02, feet + .95, cz], [cx + .02, feet + canopyHeight, cz], [cx - .02, feet + canopyHeight, cz]]
      .map(rotate), color: '#6b4a2f' });
  }
}

const sprites = new Map();
export function glow(ctx, x, y, radius, color) {
  if (radius < .5) return;
  if (typeof OffscreenCanvas !== 'undefined' && typeof ctx.drawImage === 'function') {
    if (!sprites.has(color)) {
      const sprite = new OffscreenCanvas(96, 96), brush = sprite.getContext('2d');
      const gradient = brush.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, color); gradient.addColorStop(.35, color.slice(0, 7) + '55'); gradient.addColorStop(1, color.slice(0, 7) + '00');
      brush.fillStyle = gradient; brush.fillRect(0, 0, 96, 96);
      sprites.set(color, sprite);
    }
    ctx.drawImage(sprites.get(color), x - radius, y - radius, radius * 2, radius * 2);
    return;
  }
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color); gradient.addColorStop(1, color.slice(0, 7) + '00');
  ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function starPath(ctx, x, y, radius, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? radius * .45 : radius, a = rotation + i * Math.PI / 5 - Math.PI / 2;
    if (i) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}

export const project = (camera, point) => {
  const view = camera.view(point);
  return view[2] < .25 ? null : camera.screen(view);
};

function line(ctx, a, b, width, colour, alpha) {
  ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = Math.max(.6, width);
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}

function paintOne(ctx, camera, cast, m, t, centre) {
  const o = cast.options, age = t - m.t0;
  if (age < 0) return;
  const dest = [centre[0] + m.ox, centre[1] + m.lift, centre[2] + m.oz];
  if (age <= m.fall) {
    const head = pathPoint(cast, m, age, dest), screen = project(camera, head);
    if (!screen) return;
    const radius = o.headSize * m.size * screen[2];
    if (o.tail) {
      const length = o.tailLength * (m.size > 3 ? 1.7 : 1), steps = 16, span = length / (m.height * 1.4) * m.fall;
      let previous = screen;
      for (let k = 1; k <= steps; k++) {
        const point = project(camera, pathPoint(cast, m, Math.max(0, age - k / steps * span), dest));
        if (!point || !previous) { previous = point; continue; }
        const fade = 1 - k / steps, width = radius * 1.8 * Math.pow(fade, .9);
        line(ctx, previous, point, width * 2.8, '#3a8fff', Math.pow(fade, 1.6) * .22);
        line(ctx, previous, point, width * .85, '#d4eeff', Math.pow(fade, 1.4) * .9);
        previous = point;
      }
      ctx.lineCap = 'butt';
      for (let j = 0; j < o.sparkles; j++) {
        const h1 = hash(m.id * 131 + j), h2 = hash(m.id * 71 + j * 3.7), h3 = hash(m.id * 17 + j * 9.1);
        const born = age - h1 * span * 1.3;
        if (born < 0) continue;
        const base = pathPoint(cast, m, born, dest), drop = (age - born) * 1.2;
        const spot = project(camera, [base[0] + (h2 - .5) * .9, Math.max(dest[1], base[1] - drop), base[2] + (h3 - .5) * .9]);
        if (!spot) continue;
        ctx.globalAlpha = (1 - h1) * (.45 + .55 * Math.sin(age * 22 + j * 2.7)) ** 2;
        ctx.fillStyle = '#d8f0ff';
        ctx.beginPath(); ctx.arc(spot[0], spot[1], Math.max(.8, (.02 + .035 * h2) * m.size * spot[2]), 0, turn); ctx.fill();
      }
    }
    if (o.head) {
      const behind = project(camera, pathPoint(cast, m, Math.max(0, age - .04), dest)) ?? screen;
      const angle = Math.atan2(screen[1] - behind[1], screen[0] - behind[0]);
      ctx.save(); ctx.translate(screen[0], screen[1]); ctx.rotate(angle); ctx.scale(o.elongation, 1);
      ctx.globalAlpha = .85; glow(ctx, 0, 0, radius * 3.4, '#3d8dffcc');
      ctx.globalAlpha = 1; glow(ctx, 0, 0, radius * 1.7, '#9fd3ffff');
      glow(ctx, 0, 0, radius * 1.05, '#ffffffff');
      ctx.restore();
    }
    return;
  }
  const b = age - m.fall, unit = m.size > 3 ? m.size * .62 : m.size, target = project(camera, dest);
  if (!target) return;
  if (o.burst && b < .8) {
    const u = b / .8, reach = o.rayLength * unit * Math.sin(Math.PI * Math.pow(u, .7)), seed = m.id * 53;
    for (let i = 0; i < o.rays; i++) {
      const angle = turn * i / o.rays + hash(seed + i) * .3, lean = .35 + hash(seed + i + 9) * .5;
      const dir = [Math.cos(angle) * Math.cos(lean), Math.sin(lean), Math.sin(angle) * Math.cos(lean)];
      const from = project(camera, [dest[0] + dir[0] * .15 * unit, dest[1] + dir[1] * .15 * unit, dest[2] + dir[2] * .15 * unit]);
      const to = project(camera, [dest[0] + dir[0] * (.15 * unit + reach), dest[1] + dir[1] * (.15 * unit + reach), dest[2] + dir[2] * (.15 * unit + reach)]);
      if (!from || !to) continue;
      line(ctx, from, to, 4.5 * unit * target[2] / 60, '#5aaeff', (1 - u) * .8);
      line(ctx, from, to, 1.6 * unit * target[2] / 60 + .5, '#ffffff', 1 - u);
    }
    ctx.globalAlpha = (1 - u) * .9;
    ctx.strokeStyle = '#7cc6ff'; ctx.lineWidth = Math.max(1, 3 * unit * target[2] / 60);
    const ring = o.rayLength * unit * (.35 + 1.5 * (1 - Math.pow(1 - u, 2)));
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) {
      const p = project(camera, [dest[0] + Math.cos(turn * i / 28) * ring, dest[1] + .04, dest[2] + Math.sin(turn * i / 28) * ring]);
      if (!p) continue;
      if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    if (b < .22) { ctx.globalAlpha = 1 - b / .22; glow(ctx, target[0], target[1], 2.6 * unit * target[2], '#ffffffff'); }
    ctx.globalAlpha = (1 - u) * .8; glow(ctx, target[0], target[1], 1.6 * unit * target[2], '#4aa8ffcc');
  }
  if (o.stars && b < 1.3) {
    const count = Math.min(o.starCount, cast.stars.length);
    for (let i = 0; i < count; i++) {
      const s = cast.stars[(i + m.id * 3) % cast.stars.length], life = clamp(b / 1.3);
      const spot = project(camera, [dest[0] + Math.cos(s.angle) * s.speed * b * unit ** .5,
        Math.max(dest[1], dest[1] + s.rise * b * unit ** .5 - 6.5 * b * b), dest[2] + Math.sin(s.angle) * s.speed * b * unit ** .5]);
      if (!spot) continue;
      ctx.globalAlpha = 1 - life * life; ctx.fillStyle = '#8fd0ff';
      starPath(ctx, spot[0], spot[1], Math.max(2, o.starSize * unit ** .5 * spot[2]), s.spin * b);
      ctx.globalAlpha *= .6; glow(ctx, spot[0], spot[1], o.starSize * 2.2 * spot[2], '#4aa8ffaa');
    }
  }
}

export function paintMeteor(ctx, camera, state, cast, options = {}) {
  if (!meteorVisible(state, cast)) return;
  const t = meteorAge(state, cast), { centre } = anchor(cast);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const m of cast.meteors) if (t >= m.t0 && t <= m.t0 + m.fall + 1.4) paintOne(ctx, camera, cast, m, t, centre);
  let flash = 0;
  for (const m of cast.meteors) {
    const since = t - (m.t0 + m.fall), span = m === cast.giant ? .5 : .18;
    if (since >= 0 && since < span) flash = Math.max(flash, (1 - since / span) * (m === cast.giant ? 1 : .75));
  }
  const spot = project(camera, [centre[0], centre[1] + .8, centre[2]]);
  if (flash > 0 && spot && !options.reduceMotion) {
    ctx.globalAlpha = flash; glow(ctx, spot[0], spot[1], 1.5 * spot[2], '#ffffffff');
  }
  if (cast.giant) {
    const since = t - (cast.giant.t0 + cast.giant.fall);
    if (since > .15 && since < 2.7) {
      for (let i = 0; i < 4; i++) {
        const angle = t * 6 + turn * i / 4;
        const star = project(camera, [centre[0] + Math.cos(angle) * .55, centre[1] + .5 + Math.sin(t * 9 + i) * .05, centre[2] + Math.sin(angle) * .55]);
        if (!star) continue;
        ctx.globalAlpha = since > 2.2 ? 1 - (since - 2.2) / .5 : 1; ctx.fillStyle = '#ffe58a';
        starPath(ctx, star[0], star[1], .15 * star[2], t * 8 + i);
      }
    }
  }
  ctx.restore();
}
