import { fuelLevel, lanternCost, tickRate, tuning } from './core.mjs';
import { floorAt } from './nights.mjs';
import { drawWood, woodShake } from './wood.mjs';
import { drawIceModels, paintIce } from './ice.mjs';
import { drawMeteorModels, meteorAge, meteorSquash, meteorVisible, paintMeteor, squashFaces } from './meteor.mjs';

const near = 0.25;
const fullTurn = 2 * Math.PI;
const wood = ['#4f3628', '#6B4A2F', '#865b4c'];
const bark = ['#302635', '#553d3e', '#865b4c', '#a67a5c'];
const jade = ['#113f46', '#21595a', '#327568', '#659879'];
const needles = ['#14383e', '#1e5250', '#306b5e', '#488a70'];
const blossoms = ['#623e61', '#945b7c', '#b87a91', '#dda29f'];
const stone = ['#293b4a', '#3e525c', '#58696b', '#82918a'];
const brass = ['#74503b', '#ae7744', '#d8a95d', '#f9d591'];

function unit([x, y, z]) {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

function cross([x, y, z], [a, b, c]) {
  return [y * c - z * b, z * a - x * c, x * b - y * a];
}

function dot([x, y, z], [a, b, c]) {
  return x * a + y * b + z * c;
}

function createCamera(width, height, player, yaw, shake = 0, orbit = null) {
  const angle = yaw * Math.PI / 180;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const [px, py, pz] = player.pos;
  const [x, y, z] = orbit ?? [px + 7.1 * sin, 4.8 + py * 0.4, pz + 7.1 * cos];
  const forward = unit(orbit ? [-x,-y,-z] : [-10.1 * sin, 0.8 + py * 0.4 - y, -10.1 * cos]);
  const right = unit(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const focal = Math.min(height * 0.96, width * 1.25);
  return {
    width, height, right, up, forward, focal, shake, location:[x,y,z],
    view([px, py, pz]) {
      const offset = [px - x, py - y, pz - z];
      return [dot(offset, right), dot(offset, up), dot(offset, forward)];
    },
    screen([px, py, depth]) {
      const scale = focal / depth;
      return [width / 2 + px * scale + shake, height * 0.44 - py * scale + shake * .38, scale];
    },
  };
}

function projected(camera,pos,margin) {
  const view=camera.view(pos);
  if (view[2]<near) return;
  const screen=camera.screen(view);
  if (screen[0] < -margin || screen[0] > camera.width+margin ||
      screen[1] < -margin || screen[1] > camera.height+margin) return;
  return screen;
}

function clipToCamera(vertices) {
  const clipped = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    const fromVisible = from[2] >= near;
    const toVisible = to[2] >= near;
    if (fromVisible) clipped.push(from);
    if (fromVisible !== toVisible) {
      const fraction = (near - from[2]) / (to[2] - from[2]);
      clipped.push([from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction, near]);
    }
  }
  return clipped;
}

// Scratch buffers are reused so a frame with thousands of faces does not allocate.
let viewBuffer = new Float64Array(192), clipBuffer = new Float64Array(384), screenBuffer = new Float64Array(1 << 15);
let queue = [];
function paintFaces(ctx, camera, shapes) {
  const { right, up, forward, location, focal, width, height } = camera;
  const [lx, ly, lz] = location;
  const [rx, ry, rz] = right, [ux, uy, uz] = up, [fx, fy, fz] = forward;
  const centreX = width / 2 + camera.shake, centreY = height * 0.44 + camera.shake * .38;
  let used = 0, count = 0;
  for (let s = 0; s < shapes.length; s += 1) {
    const { vertices, color, closedMesh } = shapes[s];
    const n = vertices.length;
    if (n * 3 > viewBuffer.length) { viewBuffer = new Float64Array(n * 6); clipBuffer = new Float64Array(n * 12); }
    for (let i = 0, o = 0; i < n; i += 1, o += 3) {
      const v = vertices[i], x = v[0] - lx, y = v[1] - ly, z = v[2] - lz;
      viewBuffer[o] = x * rx + y * ry + z * rz;
      viewBuffer[o + 1] = x * ux + y * uy + z * uz;
      viewBuffer[o + 2] = x * fx + y * fy + z * fz;
    }
    if (closedMesh) {
      const e1x = viewBuffer[3] - viewBuffer[0], e1y = viewBuffer[4] - viewBuffer[1], e1z = viewBuffer[5] - viewBuffer[2];
      const e2x = viewBuffer[6] - viewBuffer[0], e2y = viewBuffer[7] - viewBuffer[1], e2z = viewBuffer[8] - viewBuffer[2];
      // The generated mesh winds inward. View space reverses that winding.
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
      if (nx * viewBuffer[0] + ny * viewBuffer[1] + nz * viewBuffer[2] >= 0) continue;
    }
    let m = 0;
    for (let i = 0; i < n; i += 1) {
      const a = i * 3, b = ((i + 1) % n) * 3;
      const fromVisible = viewBuffer[a + 2] >= near, toVisible = viewBuffer[b + 2] >= near;
      if (fromVisible) { clipBuffer[m++] = viewBuffer[a]; clipBuffer[m++] = viewBuffer[a + 1]; clipBuffer[m++] = viewBuffer[a + 2]; }
      if (fromVisible !== toVisible) {
        const k = (near - viewBuffer[a + 2]) / (viewBuffer[b + 2] - viewBuffer[a + 2]);
        clipBuffer[m++] = viewBuffer[a] + (viewBuffer[b] - viewBuffer[a]) * k;
        clipBuffer[m++] = viewBuffer[a + 1] + (viewBuffer[b + 1] - viewBuffer[a + 1]) * k;
        clipBuffer[m++] = near;
      }
    }
    const points = m / 3;
    if (points < 3) continue;
    if (used + points * 2 > screenBuffer.length) {
      const grown = new Float64Array(screenBuffer.length * 2); grown.set(screenBuffer); screenBuffer = grown;
    }
    let left = true, over = true, above = true, below = true, depth = 0;
    for (let i = 0, o = used; i < points; i += 1, o += 2) {
      const scale = focal / clipBuffer[i * 3 + 2];
      const px = centreX + clipBuffer[i * 3] * scale, py = centreY - clipBuffer[i * 3 + 1] * scale;
      screenBuffer[o] = px; screenBuffer[o + 1] = py;
      if (px >= 0) left = false;
      if (px <= width) over = false;
      if (py >= 0) above = false;
      if (py <= height) below = false;
      depth += clipBuffer[i * 3 + 2];
    }
    if (left || over || above || below) continue;
    let entry = queue[count];
    if (!entry) queue[count] = entry = { start: 0, points: 0, depth: 0, color: '' };
    entry.start = used; entry.points = points; entry.depth = depth / points; entry.color = color;
    count += 1; used += points * 2;
  }
  const visible = queue.slice(0, count).sort((a, b) => b.depth - a.depth);
  for (let q = 0; q < count; q += 1) {
    const { start, points, color } = visible[q];
    ctx.beginPath();
    ctx.moveTo(screenBuffer[start], screenBuffer[start + 1]);
    for (let i = 1, o = start + 2; i < points; i += 1, o += 2) ctx.lineTo(screenBuffer[o], screenBuffer[o + 1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
}
function ring(x, y, z, radius, segments, phase = 0) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = phase + fullTurn * index / segments;
    return [x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius];
  });
}

function prism(shapes, x, y, z, bottom, top, height, colors, segments = 6, phase = 0) {
  const lower = ring(x, y, z, bottom, segments, phase);
  const upper = ring(x, y + height, z, top, segments, phase);
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    shapes.push({ vertices: [lower[i], lower[next], upper[next], upper[i]], color: colors[i % colors.length], closedMesh: true });
  }
  if (top > 0) shapes.push({ vertices: upper, color: colors.at(-1), closedMesh: true });
}

// Join elliptical cross-sections. Offsetting each centre gives branches, cloth and
// foliage their own silhouette. Each band can have a different material.
function loft(shapes, x, z, sections, materials, sides = 8, phase = 0) {
  const loops = sections.map(([y, rx, rz, dx = 0, dz = 0]) =>
    Array.from({ length: sides }, (_, i) => {
      const a = phase + fullTurn * i / sides;
      return [x + dx + rx * Math.cos(a), y, z + dz + rz * Math.sin(a)];
    }));
  for (let j = 1; j < loops.length; j += 1) {
    const palette = materials[Math.min(j - 1, materials.length - 1)];
    for (let i = 0; i < sides; i += 1) {
      const next = (i + 1) % sides;
      const light = (1 + Math.cos(phase + fullTurn * (i + 0.5) / sides - 2.3)) / 2;
      const color = palette[Math.round(light * (palette.length - 1))];
      shapes.push({ vertices: [loops[j - 1][i], loops[j - 1][next], loops[j][next], loops[j][i]], color, closedMesh: true });
    }
  }
  shapes.push({ vertices: loops.at(-1), color: materials.at(-1).at(-1), closedMesh: true });
}

function terrain(radius, centre) {
  const ground = [{ vertices: ring(centre, -0.1, 0, radius + 0.35, 64), color: '#C9B48A' }];
  ground.push({ vertices: ring(centre, 0, 0, radius, 64), color: '#2F5D50' });
  for (let i = 0; i < 95; i += 1) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + .5) / 95) * (radius - 2);
    const x = centre + r * Math.cos(a), z = r * Math.sin(a);
    const vertices = ring(x, .01, z, 1.25 + .55 * Math.sin(i), 7, a)
      .map(([vx,y,vz]) => [x + (vx-x)*1.6, y, z + (vz-z)*.68]);
    ground.push({ vertices, color: i % 2 ? '#2c594b' : '#255043' });
  }
  return ground;
}

function raisedTerrain(night) {
  const shapes = [];
  if (night === 2) {
    for (let i = 0; i < 36; i++) {
      const x = 26 + i * .5;
      shapes.push({vertices:[[x,.02,-2],[x+.48,.02,-2],[x+.48,.02,2],[x,.02,2]],
        color:i%2?'#a98552':'#C9B48A'});
    }
  }
  if (night === 3) {
    prism(shapes,0,0,0,8,8,6,['#354951','#465c5b','#2F5D50'],48);
    for (let i=0;i<32;i++) {
      const a=Math.PI*i/32,b=Math.PI*(i+1)/32;
      const point=(r,y,t)=>[r*Math.cos(t),y,r*Math.sin(t)];
      for (const r of [12,24]) shapes.push({vertices:[point(r,0,a),point(r,0,b),point(r,3,b),point(r,3,a)],color:'#465c5b'});
      shapes.push({vertices:[point(12,3,a),point(12,3,b),point(24,3,b),point(24,3,a)],color:'#2F5D50'});
    }
    for (const angle of [30,150]) {
      const a=angle*Math.PI/180;
      const point=(r,y,w)=>[r*Math.cos(a)-w*Math.sin(a),y,r*Math.sin(a)+w*Math.cos(a)];
      shapes.push({vertices:[point(30,.02,-1.5),point(30,.02,1.5),point(24,3.02,1.5),point(24,3.02,-1.5)],color:'#C9B48A'});
    }
    prism(shapes,0,6,0,2,2,6.4,stone,12);
    prism(shapes,0,12.4,0,2.15,0,1.6,brass,12);
  }
  return shapes;
}

function trail(x1, z1, x2, z2) {
  const [x, , z] = unit([z2 - z1, 0, x1 - x2]);
  const w = 0.63;
  const path = {
    vertices: [[x1 + w * x, 0.02, z1 + w * z], [x2 + w * x, 0.02, z2 + w * z],
      [x2 - w * x, 0.02, z2 - w * z], [x1 - w * x, 0.02, z1 - w * z]],
    color: '#536e59',
  };
  const stones = [];
  const count = Math.ceil(Math.hypot(x2-x1,z2-z1)/1.05);
  for (let i=0; i<count; i++) {
    const t = (i+.5)/count;
    const offset = Math.sin(i*3.7)*.12;
    const cx=x1+(x2-x1)*t+x*offset, cz=z1+(z2-z1)*t+z*offset;
    const vertices=ring(0,.035,0,1,6,i*.43).map(([u,y,v]) =>
      [cx+x*u*.46-z*v*.27,y,cz+z*u*.46+x*v*.27]);
    stones.push({vertices,color: i%3 ? '#81917c' : '#708674'});
  }
  return [path,...stones];
}

function landscape() {
  const groups = [];
  const trees = [[-6, 9], [4.7, 7.8], [9.5, 6], [-10, 6], [-11, 1.5], [-9.8, -4],
    [-5.8, -8], [-2.5, -11], [2.5, -13], [8.5, -9.5], [11.5, -5.5], [12, -1], [11.5, 4], [-4, 13],
    ...ring(0, 0, 0, 30, 14, 0.14).map(([x, , z]) => [x, z])];
  trees.forEach(([x, z], index) => {
    const faces = [];
    const h = 1.55 + (index % 4) * 0.23;
    const lean = index % 2 ? -0.32 : 0.34;
    loft(faces, x, z, [[0, .44, .36], [h * .22, .23, .21, lean * .3],
      [h * .72, .16, .15, lean], [h * 1.34, .09, .09, lean * .52]], [bark], 6, index);
    const leaves = index % 5 === 0 ? blossoms : index % 2 ? needles : jade;
    for (const [side, elevation, spread] of [[-1, .84, .72], [1, 1.10, .68], [0, 1.55, .78]]) {
      const dx = lean + side * h * .51;
      const dz = side * .27;
      if (side) loft(faces, x, z, [[h * (elevation - .38), .13, .13, lean],
        [h * elevation, .08, .08, dx, dz]], [bark], 5);
      const w = h * spread;
      loft(faces, x + dx, z + dz, [[h * elevation, w * .42, w * .33],
        [h * elevation + .18, w, w * .73], [h * elevation + .54, w * .75, w * .65, .12],
        [h * elevation + .82, w * .17, w * .23, .25]], [leaves], 7, index + side);
    }
    groups.push({ centre: [x, h, z], radius: 4, faces });
  });
  const stones = [[-5, 5], [2.8, 4], [-9, -1], [-2.6, -5.9], [5.5, -6.8], [8.5, -1], [4.4, 10.8], [-2.5, 11.5]];
  stones.forEach(([x, z], index) => {
    const faces = [];
    const w = .55 + (index % 3) * .18;
    loft(faces, x, z, [[0, w * .9, w * .58], [.26, w, w * .64, .1],
      [.48, w * .69, w * .48, .16], [.54, w * .48, w * .39, .14]], [stone, stone, jade], 7, index);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4 + index;
      const fx = x + Math.cos(a) * w, fz = z + Math.sin(a) * w;
      const height = .24 + (i % 3) * .09;
      faces.push({ vertices: [[fx - .04, 0, fz], [fx + .04, 0, fz + .02], [fx + .09, height, fz]], color: '#749e77' });
      if (i % 2 === 0) loft(faces, fx + .09, fz, [[height - .05, .025, .025],
        [height, .09, .08], [height + .04, .04, .04]], [blossoms], 5, a);
    }
    groups.push({ centre: [x, .4, z], radius: 2, faces });
  });
  // A timber lantern rack beside the first footpath anchors the scale of the village.
  const rack = [];
  for (const x of [-4.9,-2.55]) {
    loft(rack,x,-3.5,[[0,.17,.15],[.22,.13,.12],[2.15,.085,.085]], [stone,bark],6);
  }
  loft(rack,-3.72,-3.5,[[2.08,1.49,.11],[2.2,1.55,.13],[2.25,1.5,.10]], [bark,brass],8);
  for (let i=0;i<3;i++) {
    const x=-4.49+i*.76, y=1.55+(i%2)*.18;
    loft(rack,x,-3.5,[[y+.17,.014,.014],[2.13,.014,.014]], [brass],4);
    loft(rack,x,-3.5,[[y-.25,.027,.027],[y-.12,.035,.035],[y-.09,.12,.09],
      [y+.02,.155,.14],[y+.13,.12,.10],[y+.17,.065,.055]], [cloth,brass,cloth,cloth,brass],8);
  }
  groups.push({centre:[-3.72,1.2,-3.5],radius:2,faces:rack,creative:true});
  return groups;
}

function paintSky(ctx, width, height, seconds, yaw) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0E1430');
  gradient.addColorStop(0.32, '#1B2350');
  gradient.addColorStop(0.55, '#12384A');
  gradient.addColorStop(1, '#12384A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 28; i += 1) {
    const x = width * ((i * 0.61803 + 0.21) % 1);
    const y = height * (0.04 + ((i * 0.327 + 0.07) % 1) * 0.20);
    ctx.fillStyle = i % 4 === 0 ? '#f5d9a8b8' : '#a9cec49c';
    ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
  }

  const moonX = width * 0.67;
  const moonY = height * 0.18;
  const radius = Math.max(14, Math.min(width, height) * 0.04);
  halo(ctx, moonX, moonY, radius * 2.8, '#ffeead52');
  ctx.fillStyle = '#f6dfaa';
  ctx.beginPath();
  ctx.arc(moonX, moonY, radius, 0, fullTurn);
  ctx.fill();

  ctx.fillStyle = '#17343d';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.39);
  for (let i = 0; i <= 12; i += 1) {
    ctx.lineTo(width * i / 12, height * (0.34 + 0.035 * Math.sin(i * 1.76) + 0.018 * Math.sin(i * 3.7)));
  }
  ctx.lineTo(width, height * 0.45);
  ctx.lineTo(0, height * 0.45);
  ctx.closePath();
  ctx.fill();

  // Distant floating islands move more slowly than the foreground as the camera turns.
  for (let i = 0; i < 5; i += 1) {
    const fraction = ((i * 0.233 - yaw / 360 + 0.08) % 1 + 1) % 1;
    const x = width * fraction;
    const y = height * (0.25 + (i % 3) * 0.026);
    const size = Math.min(width, height) * (0.04 + (i % 3) * 0.012);
    ctx.fillStyle = '#35515b';
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x - size * 0.45, y - size * 0.19);
    ctx.lineTo(x + size * 0.64, y - size * 0.11);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x + size * 0.36, y + size * 0.24);
    ctx.lineTo(x - size * 0.16, y + size * 0.55);
    ctx.closePath();
    ctx.fill();
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    cloud.addColorStop(0, '#b4d5d34a');
    cloud.addColorStop(1, '#647d9300');
    ctx.fillStyle = cloud;
    ctx.fillRect(x - size * 1.5, y + Math.sin(seconds * 0.4 + i) * 2, size * 3, size * 0.12);
  }
}

const haloTextures=new Map();
function halo(ctx, x, y, radius, color) {
  if (typeof OffscreenCanvas!=='undefined' && typeof ctx.drawImage==='function') {
    if (!haloTextures.has(color)) {
      const sprite=new OffscreenCanvas(96,96), brush=sprite.getContext('2d');
      const gradient=brush.createRadialGradient(48,48,0,48,48,48);
      gradient.addColorStop(0,color); gradient.addColorStop(1,'#00000000');
      brush.fillStyle=gradient; brush.fillRect(0,0,96,96);
      haloTextures.set(color,sprite);
    }
    ctx.drawImage(haloTextures.get(color),x-radius,y-radius,radius*2,radius*2);
    return;
  }
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, '#00000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawHalo(ctx, camera, world, size, color) {
  const point=projected(camera,world,250);
  if (!point) return;
  const [x, y, scale] = point;
  halo(ctx, x, y, Math.min(size * scale, 250), color);
}

function distantShadow(shapes,camera,shade,seconds,accessiblePalette) {
  const [x,y,z]=shade.pos;
  const origin=y-.7+Math.sin(seconds*3+x*.13)*.08;
  const [rx,,rz]=camera.right;
  const p=(offset,height)=>[x+offset*rx,origin+height,z+offset*rz];
  const eyes=accessiblePalette?'#00B3FF':'#7A3CFF';
  shapes.push({vertices:[p(-.67,.15),p(-.49,.65),p(-.30,1.08),p(.12,1.55),
    p(.43,1.02),p(.61,.61),p(.53,.13),p(.21,.34),p(-.06,.04),p(-.31,.35)],color:'#30213f'},
    {vertices:[p(-.39,.73),p(-.18,1.06),p(.28,1.0),p(.40,.70),p(0,.52)],color:'#120A1A'},
    {vertices:[p(-.29,.83),p(-.10,.79),p(-.16,.72)],color:eyes},
    {vertices:[p(.30,.83),p(.10,.79),p(.17,.72)],color:eyes});
}

function drawLantern(shapes, lantern, dimmed) {
  const { pos: [x, y, z], lit, deposited }=lantern;
  const start=shapes.length;
  const metal = ['#344b4a', '#516762', '#6e8070'];
  const paper = lit ? (dimmed?['#926338','#a7794a','#d4a369']:['#FFB347','#ffbd62','#FFE9B0'])
    : ['#545965', '#5B5F6E', '#666a7a'];
  const roof = lit ? ['#794234', '#b06042', '#e59152'] : ['#293741', '#40575c', '#698078'];
  prism(shapes, x, y + 0.02, z, 0.78, 0.66, 0.3, metal);
  prism(shapes, x, y + 0.32, z, 0.19, 0.16, 1.04, wood);
  prism(shapes, x, y + 1.36, z, 0.38, 0.57, 0.17, roof);
  prism(shapes, x, y + 1.53, z, 0.55, 0.5, 0.82, paper);
  if (!lit && deposited > 0) {
    prism(shapes, x, y + 1.53, z, 0.56, 0.54, 0.82 * deposited / lanternCost(lantern), ['#b36b48', '#e49256', '#f5ab68']);
  }
  prism(shapes, x, y + 2.35, z, 0.65, 0.16, 0.38, roof);
  prism(shapes, x, y + 2.73, z, 0.16, 0, 0.22, paper);
  loft(shapes,x,z,[[y+.035,.89,.89],[y+.12,.87,.87],[y+.19,.74,.74]], [stone,brass],8);
  for (const height of [.39,1.25,1.55,2.29]) {
    const radius = height < 1.5 ? .22 : .565;
    prism(shapes,x,y+height,z,radius,radius,.045,brass,8);
  }
  for (let i=0; i<6; i++) {
    const a = fullTurn*i/6;
    const dx = Math.cos(a), dz = Math.sin(a);
    loft(shapes,x,z,[[y+1.53,.032,.032,dx*.55,dz*.55],
      [y+2.35,.032,.032,dx*.50,dz*.50]], [bark],4);
  }
  // Four swept roof corners with a gilded lip and a deep glazed tile skirt.
  const perimeter = ring(x,y+2.42,z,.94,8,Math.PI/4);
  const upper = ring(x,y+2.69,z,.29,8,Math.PI/4);
  perimeter.forEach((p,i) => {
    if (i%2===0) p[1]+=.14;
  });
  perimeter.forEach((p,i) => {
    const next=(i+1)%8;
    shapes.push({vertices:[p,perimeter[next],upper[next],upper[i]],color:jade[i%4]});
    shapes.push({vertices:[p,perimeter[next],perimeter[next].map((v,k)=>k===1?v-.055:v),
      [p[0],p[1]-.055,p[2]]],color:brass[2]});
  });
  if (!lit) {
    for (let i=0;i<6;i++) {
      const angle=(i+.5)*fullTurn/6;
      const cos=Math.cos(angle),sin=Math.sin(angle);
      const tear=(across,up)=>[x+.49*cos-across*sin,y+up,z+.49*sin+across*cos];
      shapes.push({vertices:[tear(-.15,2.24),tear(.105,2.29),tear(.035,2.04),
        tear(.145,1.91),tear(.02,1.74),tear(-.025,1.98),tear(-.095,1.93)],color:'#222232'});
    }
    for (let i=start;i<shapes.length;i++) {
      shapes[i].vertices=shapes[i].vertices.map(([vx,vy,vz])=>vy<y+1.53 ? [vx,vy,vz] :
        [x+(vx-x)*.8,y+1.53+(vy-y-1.53)*.8,z+(vz-z)*.8]);
    }
  }
}

function paintFuel(ctx,camera,lantern,dimmed,accessiblePalette) {
  const [x,y,z]=lantern.pos;
  const view=camera.view([x,y+3.23,z]);
  if (view[2]<near) return;
  const [sx,sy,scale]=camera.screen(view);
  if (sx<0 || sx>camera.width || sy<6 || sy>camera.height) return;
  const width=Math.max(21,Math.min(66,scale*.87));
  const fuel=fuelLevel(lantern);
  const low=fuel<tuning.low_fuel_threshold;
  ctx.fillStyle='#101528ec';
  ctx.fillRect(sx-width/2-2,sy-2,width+4,9);
  ctx.fillStyle=low ? dimmed?'#777789':accessiblePalette?'#FFFFFF':'#FF5A5F' : '#FFE9B0';
  ctx.fillRect(sx-width/2,sy,Math.max(.7,width*fuel/tuning.fuel_max),5);
  if (low && accessiblePalette) {
    ctx.font='14px system-ui'; ctx.fillText('⚠',sx+width/2+5,sy+7);
  }
}

const tunic = ['#b7ad9d', '#cbc3b0', '#E8E2D0', '#f7f0dc'];
const cloth = ['#85112a', '#a60e28', '#C8102E', '#e12b46'];
const skin = ['#a66552', '#d08c69', '#eeba87', '#ffdbab'];
const hair = ['#282332', '#39303b', '#50404a', '#68515a'];
const straw = ['#876041', '#ba8d55', '#dcb97d', '#f4dca8'];
const boots = ['#302c40', '#494052', '#695867'];

function mayCostume() {
  const mesh = [];
  // The model faces local -Z. The hood, hair knot and pack read from the follow camera.
  loft(mesh, 0, 0, [[.35,.36,.26], [.44,.4,.27], [.59,.29,.2],
    [.78,.27,.22], [.94,.31,.22], [1,.14,.13]], [brass,tunic,tunic,tunic,tunic], 10);
  loft(mesh, 0, 0, [[.61,.30,.22],[.69,.29,.22]], [cloth], 10);
  loft(mesh, 0, .02, [[.88,.34,.27],[.99,.29,.23],[1.06,.19,.16]], [cloth], 10);
  loft(mesh, 0,-.025, [[1.01,.16,.14],[1.09,.27,.23],[1.27,.31,.28],[1.4,.27,.24]], [skin], 12);
  loft(mesh, 0,.065, [[1.15,.27,.21],[1.35,.32,.26],[1.43,.22,.2]], [hair], 10);
  for (const side of [-1,1]) {
    loft(mesh, side*.125,-.246, [[1.16,.027,.018],[1.21,.034,.024],[1.23,.02,.012]], [hair], 6);
    loft(mesh, side*.22,-.184, [[1.12,.034,.018],[1.15,.04,.021]], [cloth], 6);
    loft(mesh, side*.21,.19, [[1,.067,.065],[1.1,.085,.07],[1.23,.08,.075]], [hair,cloth], 7);
  }
  loft(mesh, 0,.25, [[.54,.18,.1],[.58,.24,.14],[.78,.24,.14],
    [.82,.25,.15],[.86,.18,.11]], [bark,straw,bark,straw], 8);
  for (const x of [-.13,0,.13]) {
    loft(mesh,x,.384,[[.6,.013,.01],[.78,.014,.012]], [bark], 4);
  }
  loft(mesh,0,0,[[1.36,.55,.49],[1.395,.565,.50],[1.435,.51,.46],
    [1.51,.42,.37],[1.525,.416,.368],[1.63,.29,.25],[1.644,.282,.245],
    [1.80,.065,.055],[1.84,.025,.022]], [cloth,straw,straw,brass,straw,brass,straw,cloth], 16);
  loft(mesh,-.47,.08,[[1.18,.012,.012],[1.4,.012,.012]], [brass], 4);
  loft(mesh,-.47,.08,[[.94,.024,.024],[1.025,.04,.04],[1.05,.085,.07],
    [1.11,.12,.105],[1.17,.09,.08],[1.19,.05,.04]], [cloth,brass,brass,['#e38b4a','#ffc562','#ffe59a'],brass], 8);
  return mesh;
}

function drawMay(shapes, state, stride, costume) {
  const { pos: [x,y,z], facing } = state.player;
  const limbs = [];
  for (const side of [-1,1]) {
    const swing = side * stride;
    const lift = Math.max(0,swing)*.12;
    const legZ = swing*.21;
    loft(limbs,side*.16,legZ,[[.025+lift,.126,.16,0,-.045],[.12+lift,.13,.14],
      [.20+lift,.106,.105],[.235+lift,.11,.11],[.43,.113,.11,0,-legZ*.7]], [boots,boots,brass,tunic], 7);
    const armZ = -swing*.19;
    loft(limbs,side*.29,0,[[.54,.079,.084,side*.075,armZ],[.62,.093,.094,side*.079,armZ],
      [.66,.105,.106,side*.07,armZ],[.73,.114,.11,side*.05,armZ*.7],
      [.91,.12,.12],[.95,.078,.08]], [skin,brass,tunic,tunic,tunic], 7);
  }
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const bob = Math.abs(stride)*.035;
  for (const part of [costume,limbs]) {
    for (const face of part) {
      shapes.push({ ...face, vertices: face.vertices.map(([a,b,c]) =>
        [x+a*cos-c*sin, y+b+(part === costume ? bob : 0), z+a*sin+c*cos]) });
    }
  }
}

function drawStunStars(shapes, x, headY, z, seconds, cameraYaw) {
  const yaw = cameraYaw * Math.PI / 180;
  const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
  for (let i = 0; i < 3; i++) {
    const orbit = seconds * 3.6 + i * fullTurn / 3;
    const cx = x + .49 * Math.cos(orbit);
    const cy = headY + .34 + .05 * Math.sin(orbit * 2);
    const cz = z + .49 * Math.sin(orbit);
    const vertices = Array.from({ length: 10 }, (_, tip) => {
      const angle = tip * Math.PI / 5 + Math.PI / 2 + .25 * Math.sin(orbit);
      const radius = tip % 2 === 0 ? .15 : .066;
      const horizontal = radius * Math.cos(angle);
      return [cx + rightX * horizontal, cy + radius * Math.sin(angle), cz + rightZ * horizontal];
    });
    shapes.push({ vertices, color: '#ffdf73' });
  }
}

function drawShadow(shapes, shade, playerPos, seconds, cameraYaw, sleeping, accessiblePalette) {
  const [x, center, z] = shade.pos;
  const stunned = shade.state === 'stunned';
  const wave = seconds * (stunned ? 1.5 : 3.2) + x * .12;
  const y = Math.max(0, center - .9) + .16 + Math.sin(wave) * .09;
  const hood = stunned ? ['#2b273e','#3A3450','#48425d','#55516f'] : ['#120A1A','#21142e','#35254d','#554175'];
  const lining = accessiblePalette ? ['#143751','#1d5b83','#228bba','#00B3FF'] : ['#382566','#533487','#6835cd','#7A3CFF'];
  const eyes = accessiblePalette ? '#00B3FF' : stunned ? '#ffe087' : '#7A3CFF';
  const mesh = [];
  // The pointed hood curls back over a dark face opening.
  loft(mesh, 0, 0, [[.53,.36,.28],[.86,.57,.38],[1.17,.45,.34,0,-.03],
    [1.42,.28,.23,.05,-.10],[1.57,.12,.12,.14,-.20],[1.63,.018,.02,.26,-.29]], [hood], 10);
  loft(mesh, 0, .245, [[.68,.13,.06],[.85,.35,.17],[1.06,.31,.14],[1.18,.15,.07]],
    [lining,['#120f20','#1a1426','#241a31'],hood], 10);
  for (const side of [-1,1]) {
    mesh.push({ color: eyes, vertices: [[side*.075,.90,.413],[side*.26,1.015,.368],
      [side*.225,.923,.389],[side*.135,.864,.409]] });
    const sway = Math.sin(wave + side) * .10;
    loft(mesh, side*.34, 0, [[.18,.025,.025,side*.40,.10+sway],
      [.38,.10,.09,side*.29,.09],[.57,.17,.13,side*.25,-.04],
      [.77,.19,.17,side*.09,-.07],[.84,.09,.09]], [lining,hood,hood,hood], 6);
  }
  // Uneven ribbons leave visible gaps below the mantle as they drift.
  for (let i=0; i<7; i++) {
    const a = fullTurn*i/7;
    const curl = Math.sin(wave + i)*.15;
    const dx = Math.cos(a), dz = Math.sin(a);
    loft(mesh, dx*.31, dz*.22, [[.01+(i%3)*.09,.014,.016,dx*.20+curl,dz*.16-.12],
      [.25,.10,.08,dx*.13,dz*.10],[.47,.16,.12,dx*.06,dz*.04],[.68,.15,.13]],
      [lining,hood,hood], 5, a);
  }
  const facing = Math.atan2(playerPos[0]-x, playerPos[2]-z);
  const cos = Math.cos(facing), sin = Math.sin(facing);
  for (const face of mesh) {
    shapes.push({ ...face, vertices: face.vertices.map(([a,b,c]) => {
      const bend = sleeping ? c + b * .62 : c;
      return [x+a*cos+bend*sin, y+b*(sleeping ? .48 : 1), z-a*sin+bend*cos];
    }) });
  }
  if (stunned && !sleeping) drawStunStars(shapes, x, y + 1.63, z, seconds, cameraYaw);
}

function paintSleep(ctx, camera, entity, seconds) {
  const [x,y,z] = entity.pos;
  const view=camera.view([x,y+1.3,z]);
  if (view[2]<near) return;
  const [sx,sy,scale]=camera.screen(view);
  const size=Math.min(23,Math.max(10,scale*.21));
  ctx.font='bold '+size+'px system-ui';
  ctx.fillStyle='#fff0bd';
  ctx.fillText('Z',sx,sy-Math.sin(seconds*3)*4);
  ctx.font='bold '+size*.73+'px system-ui';
  ctx.fillText('z',sx+size*.72,sy-size*.6);
}

const lightReach = 8;
function lanternLight(pos, litLanterns) {
  let brightest = 0;
  for (const lantern of litLanterns) {
    const dist = Math.hypot(pos[0]-lantern.pos[0], pos[2]-lantern.pos[2]);
    const t = Math.max(0, 1 - dist/lightReach);
    brightest = Math.max(brightest, t*t*(3-2*t));
  }
  return brightest;
}

// Reuse the finite palette across frames. The same light level tints each model
// consistently whether the camera sees it from inside or outside a pool of light.
const materialTints = new Map();
function tintFaces(target, start, light) {
  const level = Math.round(light * 63);
  const t = level / 63;
  for (let i=start; i<target.length; i++) {
    const face = target[i];
    let palette = materialTints.get(face.color);
    if (!palette) {
      palette = [];
      materialTints.set(face.color, palette);
    }
    if (!palette[level]) {
      const rgb = parseInt(face.color.slice(1),16);
      const r = Math.min(255, Math.round((rgb >> 16)*(.78+.39*t)+27*t));
      const g = Math.min(255, Math.round(((rgb >> 8)&255)*(.80+.27*t)+15*t));
      const b = Math.min(255, Math.round((rgb&255)*(.86+.08*t)+4*t));
      palette[level] = '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6,'0');
    }
    target[i] = {vertices:face.vertices, color:palette[level], closedMesh:face.closedMesh};
  }
}

function paintMap(ctx, width, height, state, yaw, accessiblePalette) {
  if (width < 860 || height < 390) return;
  const x = width - 106;
  const y = height - 254;
  const radius = 68;
  function spot(dx, dz, size, color) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dz, size, 0, fullTurn);
    ctx.fillStyle = color;
    ctx.fill();
  }
  spot(0, 0, radius + 5, '#7598849e');
  spot(0, 0, radius, '#112c35');
  const factor = (radius - 6) / (state.night===2 ? 63 : state.map.radius);
  const centre = state.night===2 ? 35 : 0;
  for (const lantern of state.lanterns) {
    spot((lantern.pos[0]-centre) * factor, lantern.pos[2] * factor, 4.5, lantern.lit ? '#FFB347' : '#5B5F6E');
  }
  const [px, , pz] = state.player.pos;
  for (const shade of state.shades) {
    if (Math.hypot(shade.pos[0] - px, shade.pos[2] - pz) <= 10) {
      spot((shade.pos[0]-centre) * factor, shade.pos[2] * factor, 3, accessiblePalette?'#00B3FF':'#7A3CFF');
    }
  }
  spot((px-centre) * factor, pz * factor, 4, '#fff1b5');
  const angle = yaw * Math.PI / 180;
  spot((px-centre) * factor - Math.sin(angle) * 7, pz * factor - Math.cos(angle) * 7, 2, '#fff1b5');
}

function paintGuide(ctx,camera,width,height,state) {
  const [px,,pz]=state.player.pos;
  let target, best=Infinity;
  for (const lantern of state.lanterns) {
    const distance=Math.hypot(lantern.pos[0]-px,lantern.pos[2]-pz);
    if (!lantern.lit && distance<best) { target=lantern; best=distance; }
  }
  if (!target) return;
  const [tx,ty,tz]=target.pos;
  const view=camera.view([tx,ty+2,tz]);
  const [sx,sy]=camera.screen([view[0],view[1],Math.max(near,view[2])]);
  if (view[2]>=near && sx>0 && sx<width && sy>0 && sy<height) return;
  const dx=view[0], dy=view[2]<near? Math.abs(view[2])+1:-view[1];
  const angle=Math.atan2(dy,dx);
  const x=width/2+Math.cos(angle)*width*.40, y=height/2+Math.sin(angle)*height*.30;
  ctx.beginPath();
  ctx.moveTo(x+Math.cos(angle)*15,y+Math.sin(angle)*15);
  ctx.lineTo(x+Math.cos(angle+2.55)*11,y+Math.sin(angle+2.55)*11);
  ctx.lineTo(x+Math.cos(angle-2.55)*11,y+Math.sin(angle-2.55)*11);
  ctx.closePath(); ctx.fillStyle='#F2C14E'; ctx.fill();
}

function paintSpawnDirection(ctx,camera,shade) {
  const view=camera.view(shade.pos);
  const angle=Math.atan2(-view[1],view[0] || .001);
  const x=camera.width/2+Math.cos(angle)*(camera.width/2-29);
  const y=camera.height/2+Math.sin(angle)*(camera.height/2-110);
  ctx.beginPath();
  ctx.moveTo(x+Math.cos(angle)*20,y+Math.sin(angle)*20);
  ctx.lineTo(x+Math.cos(angle+2.55)*15,y+Math.sin(angle+2.55)*15);
  ctx.lineTo(x+Math.cos(angle-2.55)*15,y+Math.sin(angle-2.55)*15);
  ctx.closePath(); ctx.fillStyle='#F5F1E6'; ctx.fill();
}

export function createRenderer(ctx) {
  const nightScenes = new Map();
  const baseScenery = landscape();
  const costume = mayCostume();
  const lightPools = new WeakMap();
  let previousTick = -1;
  let previousPosition;
  let walkPhase = 0;
  let stride = 0;
  return (width, height, state, seconds, yaw = 0, woodCast = null, accessiblePalette = false, options = {}) => {
    if (!nightScenes.has(state.night)) {
      const centres=state.night===2 ? [0,70] : [0];
      const ground=centres.map((x)=>terrain(state.map.radius,x));
      const scenery=centres.flatMap((x)=>baseScenery
        .filter(({centre:[cx,,cz]})=>Math.hypot(cx,cz)<state.map.radius-1)
        .map((group)=>{
          const [cx,cy,cz]=group.centre;
          const elevation=state.night===3?floorAt(3,cx,cz):0;
          return { ...group,centre:[cx+x,cy+elevation,cz], faces:group.faces.map((face)=>({
            ...face,vertices:face.vertices.map(([vx,vy,vz])=>[vx+x,vy+elevation,vz]),
          })) };
        }));
      const paths=state.night===1 ? state.map.lanterns.map(([x,,z])=>trail(0,0,x,z)).flat() : [];
      nightScenes.set(state.night,{ground,scenery,paths,raised:raisedTerrain(state.night)});
    }
    const { ground, scenery, paths, raised }=nightScenes.get(state.night);
    const camera = createCamera(width,height,state.player,yaw,options.reduceMotion?0:woodShake(state,woodCast),options.orbit);
    const litLanterns = state.lanterns.filter((lantern) => lantern.lit);
    const dimmed=(lantern)=>!options.reduceMotion && lantern.lit && fuelLevel(lantern)<tuning.low_fuel_threshold && state.simTick%tickRate>=tickRate/2;
    const [px, py, pz] = state.player.pos;
    if (state.tick !== previousTick) {
      const travelled = previousPosition && state.tick > previousTick
        ? Math.hypot(px - previousPosition[0], pz - previousPosition[2]) : 0;
      walkPhase += travelled * 5;
      stride = travelled > 0 && py === 0 ? Math.sin(walkPhase) : 0;
      previousPosition = state.player.pos;
      previousTick = state.tick;
    }
    paintSky(ctx, width, height, seconds, yaw);
    for (const island of ground) {
      paintFaces(ctx,camera,island.slice(0,1));
      paintFaces(ctx,camera,island.slice(1,2));
      paintFaces(ctx,camera,island.slice(2));
    }
    paintFaces(ctx,camera,paths);
    paintFaces(ctx,camera,raised);
    const ambient=.15+.55*litLanterns.length/state.lanterns.length;
    ctx.fillStyle = '#0c112a'+Math.round((.70-ambient)*115).toString(16).padStart(2,'0');
    ctx.fillRect(0, 0, width, height);
    for (const lantern of litLanterns) {
      let pool = lightPools.get(lantern);
      if (!pool) {
        const [x,y,z] = lantern.pos;
        pool = Array.from({length:16}, (_, i) => ({
          vertices:ring(x,y+.04,z,lightReach * (16-i)/16,32), color:'#FFB34708',
        }));
        lightPools.set(lantern, pool);
      }
      paintFaces(ctx, camera, pool);
    }
    const surface=floorAt(state.night,px,pz,py+.05);
    if (Number.isFinite(surface)) paintFaces(ctx, camera, [{ vertices: ring(px, surface+.05, pz, .43, 14), color: '#14242c70' }]);

    const pulseAge = state.tick - state.pulseTick;
    if (pulseAge >= 0 && pulseAge < 24) {
      const [x, , z] = state.player.pos;
      const radius = tuning.pulse_radius * Math.min(1, (pulseAge + 1) / 14);
      if (Number.isFinite(surface)) paintFaces(ctx, camera, [{ vertices: ring(x, surface+.04, z, radius, 26), color: '#ffe3874f' }]);
    }

    const models = [];
    for (const group of scenery) {
      if (options.orbit && group.creative) continue;
      const view = camera.view(group.centre);
      if (view[2] + group.radius < near) continue;
      if (view[2] > group.radius + near) {
        const [sx, sy, scale] = camera.screen(view);
        const margin = scale * group.radius * view[2] / (view[2] - group.radius);
        if (sx < -margin || sx > width + margin || sy < -margin || sy > height + margin) continue;
      }
      const start = models.length;
      models.push(...group.faces);
      tintFaces(models, start, lanternLight(group.centre,litLanterns));
    }
    const sparks = [];
    for (const mote of state.motes) {
      const [x, groundY, z] = mote.pos;
      const y = groundY + 0.66 + Math.sin(seconds * 3 + Number(mote.id.slice(1))) * 0.19;
      if (!projected(camera,[x,y,z],40)) continue;
      sparks.push([x, y + 0.09, z]);
      prism(models, x, y, z, 0.12, 0.038, 0.18, ['#FFE58A', '#FFF6C2', '#FFF6C2'], 5);
    }
    for (const lantern of state.lanterns) {
      const start = models.length;
      drawLantern(models, lantern, dimmed(lantern));
      tintFaces(models, start, lanternLight(lantern.pos,litLanterns));
    }
    const meteor=options.meteor, squash=meteorVisible(state,meteor) ? meteorSquash(meteor,meteorAge(state,meteor)) : 1;
    for (const shade of state.shades) {
      const visible=projected(camera,shade.pos,130);
      if (!visible) continue;
      const shadeStart=models.length;
      if (visible[2]<37 && shade.state==='wander') distantShadow(models,camera,shade,seconds,accessiblePalette);
      else drawShadow(models, shade, state.player.pos, seconds, yaw, shade.woodSleepUntil>state.simTick, accessiblePalette);
      if (meteor?.target===shade) squashFaces(models,shadeStart,shade,shade.pos[1]-.7,squash);
      drawHalo(ctx, camera, shade.pos, 2.7, '#21162fba');
    }
    for (const {pos:[x,y,z]} of state.map.pads) {
      prism(models,x,y+.01,z,1,.92,.12,['#406e81','#79a8b1','#8FA3B8'],12);
      prism(models,x,y+.13,z,.57,.47,.05,['#7398aa','#b3d7de','#F2C14E'],6);
    }
    for (const charm of state.charms) {
      if (!charm.available) continue;
      const [x,y,z]=charm.pos;
      const sway=Math.sin(seconds*3)*.08;
      models.push({vertices:[[x-.17,y+.36,z],[x+.17,y+.38,z],[x+.17+sway,y+.88,z],[x-.17+sway,y+.86,z]],color:'#F2C14E'},
        {vertices:[[x-.12,y+.41,z-.01],[x+.12,y+.43,z-.01],[x+.12+sway,y+.83,z-.01],[x-.12+sway,y+.81,z-.01]],color:'#C8102E'});
    }
    for (const d of state.drifters) {
      if (d.state==='removed') continue;
      const [x,base,z]=d.pos;
      const y=d.woodSleepUntil>state.simTick ? base-.45 : base;
      const driftStart=models.length;
      for (let i=0;i<7;i++) {
        const wave=(j)=>Math.sin(seconds*6+j*.65)*.2;
        models.push({vertices:[[x-i*.16,y+wave(i),z-.18],[x-i*.16,y+wave(i)-.19,z+.18],
          [x-(i+1)*.16,y+wave(i+1)-.17,z+.12],[x-(i+1)*.16,y+wave(i+1),z-.12]],color:i%2?'#8FA3B8':'#adbed0'});
      }
      if (meteor?.target===d) squashFaces(models,driftStart,d,base-.2,squash);
    }
    if (state.wind.warning || state.wind.active) {
      const a=state.wind.dir_deg*Math.PI/180;
      for (let i=0;i<17;i++) {
        const drift=((seconds*5+i*1.7)%15)-7;
        const x=px+Math.cos(a)*drift+Math.sin(i*3)*5;
        const z=pz+Math.sin(a)*drift+Math.cos(i*3)*5;
        const y=py+.8+(i%5)*.36;
        models.push({vertices:[[x,y,z],[x+.22,y+.06,z+.08],[x+.29,y,z]],color:'#b4c389'});
      }
    }
    drawWood(models,state,woodCast);
    drawMeteorModels(models,state,meteor);
    drawIceModels(models,state,options.ice);
    const playerStart = models.length;
    drawMay(models, state, stride, costume);
    tintFaces(models, playerStart, lanternLight(state.player.pos,litLanterns));
    if (!options.reduceMotion && state.player.invuln>0 && Math.floor(state.simTick/12)%2===1) {
      for (let i=playerStart;i<models.length;i++) models[i].color+='64';
    }
    paintFaces(ctx, camera, models);
    paintMeteor(ctx, camera, state, meteor, options);
    paintIce(ctx, camera, state, options.ice, options);
    for (const point of sparks) {
      const flicker = 0.55 + 0.13 * Math.sin(seconds * 3.6 + point[0] + point[2]);
      drawHalo(ctx, camera, point, flicker, '#FFE58Aa8');
    }
    drawHalo(ctx, camera, [px - Math.cos(state.player.facing) * 0.45, py + 1.12, pz - Math.sin(state.player.facing) * 0.45], 0.65, '#ffac4970');
    for (const lantern of litLanterns) {
      const [x,y,z]=lantern.pos;
      drawHalo(ctx, camera, [x,y+1.9,z], dimmed(lantern)?1.3:2.9, dimmed(lantern)?'#ffb34f53':'#ffb34f97');
      paintFuel(ctx,camera,lantern,dimmed(lantern),accessiblePalette);
    }
    for (const enemy of [...state.shades,...state.drifters]) {
      if (enemy.state!=='removed' && enemy.woodSleepUntil>state.simTick) paintSleep(ctx,camera,enemy,seconds);
    }
    if (!options.orbit) {
      paintMap(ctx, width, height, state, yaw, accessiblePalette);
      paintGuide(ctx,camera,width,height,state);
      const spawn=state.shades.find((shade)=>shade.id===options.spawnId);
      if (spawn) paintSpawnDirection(ctx,camera,spawn);
    }
  };
}
