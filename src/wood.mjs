import { tickRate } from './core.mjs';
import { floorAt } from './nights.mjs';

export const woodLayers = [
  ['wave', 'Uốn sóng', [['height','Độ cao',1,4,.1,2.4],['length','Bước sóng',2,7,.1,4]]],
  ['branches', 'Nhiều nhánh', [['count','Số thân phụ',3,4,1,4],['spread','Độ rộng làn',.3,2,.1,1.1]]],
  ['earth', 'Đất vỡ', [['debris','Lượng đá và bụi',2,9,1,5]]],
  ['leaves', 'Lá mọc', [['leafSize','Kích thước lá',.1,.5,.05,.3],['sway','Độ đung đưa',0,1,.1,.55]]],
  ['coil', 'Quấn chặt', [['hold','Thời gian siết (giây)',.5,3,.1,1.6],['shake','Rung camera',0,1,.05,.65]]],
  ['flowers', 'Hoa và phấn ngủ', [['bloom','Kích thước hoa',.1,.5,.05,.25],['sleep','Ngủ (giây)',1,6,.1,3]]],
];

export function woodSettings(saved = {}) {
  const options = {};
  for (const [id,,fields] of woodLayers) {
    options[id] = typeof saved?.[id] === 'boolean' ? saved[id] : true;
    for (const [key,,min,max,,fallback] of fields) {
      const value = Number.isFinite(saved?.[key]) ? saved[key] : fallback;
      options[key] = Math.max(min, Math.min(max, key === 'count' ? Math.round(value) : value));
    }
  }
  return options;
}

const maxRange = 21;
const travelSpeed = 20;
const turn = Math.PI * 2;
const clamp = (n) => Math.max(0,Math.min(1,n));

export function castWood(state, options) {
  const start = [...state.player.pos];
  const target = [...state.shades,...state.drifters]
    .filter((enemy) => enemy.state !== 'removed')
    .map((enemy) => ({enemy, range:Math.hypot(enemy.pos[0]-start[0],enemy.pos[2]-start[2])}))
    .filter(({enemy,range}) => range <= maxRange && Math.abs(enemy.pos[1]-start[1]) <= 4)
    .sort((a,b)=>a.range-b.range)[0]?.enemy;
  const east = Math.sin(state.player.facing), north = -Math.cos(state.player.facing);
  const end = target ? [...target.pos] : [start[0]+east*13,start[1],start[2]+north*13];
  const distance = Math.hypot(end[0]-start[0],end[2]-start[2]);
  const direction = distance > .05 ? [(end[0]-start[0])/distance,(end[2]-start[2])/distance] : [east,north];
  return { start, end, direction, distance:Math.max(1,distance), target, options:{...options},
    startTick:state.simTick, impactTick:state.simTick+Math.max(8,Math.ceil(distance/travelSpeed*tickRate)),
    hit:false };
}

export function updateWood(state, cast) {
  if (!cast || cast.hit || state.simTick < cast.impactTick) return false;
  cast.hit = true;
  const target = cast.target;
  if (!target || target.state === 'removed') return false;
  const options = cast.options;
  const seconds = Math.max(options.coil ? options.hold : .35, options.flowers ? options.sleep : 0);
  target.woodHeldUntil = state.simTick + Math.round(seconds * tickRate);
  if (options.flowers) target.woodSleepUntil = state.simTick + Math.round(options.sleep * tickRate);
  if (state.shades.includes(target)) {
    target.state = 'stunned';
    target.left = Math.max(target.left ?? 0, Math.round(seconds * tickRate));
    target.push = null;
  }
  return true;
}

export function woodVisible(state, cast) {
  return cast && state.simTick <= cast.impactTick + tickRate * Math.max(1.2, cast.options.hold, cast.options.sleep);
}

export function woodShake(state, cast) {
  if (!cast?.options.coil || !cast.target || cast.target.state === 'removed') return 0;
  const t=(state.simTick-cast.impactTick)/tickRate;
  return t >= 0 && t < .38 ? Math.sin(t*73)*cast.options.shake*(1-t/.38)*9 : 0;
}

// An XZ ribbon for the ground and a square-section tube for the visible wood.
function timber(shapes, a, b, width, sideX, sideZ, color) {
  shapes.push(
    {vertices:[[a[0]+sideX*width,a[1],a[2]+sideZ*width],a,b,
      [b[0]+sideX*width,b[1],b[2]+sideZ*width]],color},
    {vertices:[[a[0]-sideX*width,a[1],a[2]-sideZ*width],a,b,
      [b[0]-sideX*width,b[1],b[2]-sideZ*width]],color:'#77412e'},
    {vertices:[[a[0]+sideX*width,a[1],a[2]+sideZ*width],
      [a[0],a[1]+width,a[2]],[b[0],b[1]+width,b[2]],[b[0]+sideX*width,b[1],b[2]+sideZ*width]],color:'#ca8d4e'},
    {vertices:[[a[0]-sideX*width,a[1],a[2]-sideZ*width],
      [a[0],a[1]+width,a[2]],[b[0],b[1]+width,b[2]],[b[0]-sideX*width,b[1],b[2]-sideZ*width]],color:'#a66d42'},
  );
}

function foliage(shapes, [x,y,z], size, angle, flower) {
  const dx=Math.cos(angle)*size,dz=Math.sin(angle)*size;
  shapes.push({vertices:[[x,y,z],[x+dx*.44-dz*.3,y+size*.22,z+dz*.44+dx*.3],
    [x+dx,y+size*.42,z+dz],[x+dx*.48+dz*.22,y+size*.16,z+dz*.48-dx*.22]],color:'#85bf57'});
  if (!flower) return;
  for (let petal=0;petal<5;petal++) {
    const a=angle+petal*turn/5,r=flower;
    shapes.push({vertices:[[x,y+.06,z],[x+Math.cos(a-.26)*r,y+.12,z+Math.sin(a-.26)*r],
      [x+Math.cos(a)*r*1.24,y+.14,z+Math.sin(a)*r*1.24],
      [x+Math.cos(a+.26)*r,y+.12,z+Math.sin(a+.26)*r]],color:petal%2?'#ff9ace':'#ffe2a3'});
  }
}

function debris(shapes, [x,y,z], elapsed, amount) {
  if (elapsed < 0 || elapsed > .85) return;
  const fade = 1 - elapsed/.85;
  for (let i=0;i<amount;i++) {
    const a=i*2.39996,dx=Math.cos(a),dz=Math.sin(a);
    const reach=.24+i*.04;
    shapes.push({vertices:[[x,y+.045,z],[x+dx*reach*.62,y+.047,z+dz*reach*.62],
      [x+dx*reach-dz*.11,y+.047,z+dz*reach+dx*.11],[x+dx*reach*.42,y+.049,z+dz*reach*.42]],color:'#362921'});
    const dist=.09 + elapsed*(.6 + i*.12);
    const bx=x+dx*dist,bz=z+dz*dist;
    const by=y+.04+Math.max(0,2.8*elapsed-4.6*elapsed**2)*(1+i%3*.16);
    shapes.push({vertices:[[bx-.06,by,bz],[bx+.08,by+.12,bz+.04],[bx+.07,by,bz+.12]],color:'#aa8a6b'});
    const dust=.11+elapsed*.38;
    const opacity=Math.round(fade*74).toString(16).padStart(2,'0');
    shapes.push({vertices:[[bx-dust,by,bz],[bx,by+dust,bz],[bx+dust,by,bz]],color:'#dcc098'+opacity});
  }
}

export function drawWood(shapes, state, cast) {
  if (!woodVisible(state,cast)) return;
  const { start,end,options,distance,impactTick,target } = cast;
  const age=(state.simTick-cast.startTick)/tickRate;
  const impactAge=(state.simTick-impactTick)/tickRate;
  const [dx,dz]=cast.direction, sx=-dz, sz=dx;
  const destination=target?.pos ?? end;
  const branchCount=options.branches ? options.count : 0;
  for (let branch=0;branch<=branchCount;branch++) {
    const speed=travelSpeed*(branch ? .93+branch*.065 : 1);
    const travelled=(age-branch*.055)*speed;
    if (travelled <= 0) continue;
    const amplitude=options.height*(branch ? .45+branch*.105 : 1);
    const wavelength=options.length*(branch ? .68+branch*.135 : 1);
    const lane=branch ? (branch%2 ? -1:1)*Math.ceil(branch/2)*options.spread*.55 : 0;
    const width=branch ? .085+branch*.007 : .16;
    const steps=Math.max(1,Math.ceil(Math.min(distance,travelled)/.28));
    let previous;
    for (let i=0;i<=steps;i++) {
      const d=Math.min(i*.28,travelled,distance);
      const t=clamp(d/distance);
      const split=lane*Math.sin(t*Math.PI);
      const x=start[0]+dx*d+sx*split+(destination[0]-end[0])*t**4;
      const z=start[2]+dz*d+sz*split+(destination[2]-end[2])*t**4;
      const floor=floorAt(state.night,x,z,Math.max(start[1],destination[1])+1);
      if (!Number.isFinite(floor)) { previous=null; continue; }
      const height=options.wave
        ? amplitude*(.35+.65*t)*Math.sin(d/wavelength*turn)-.09
        : .18+.12*Math.sin(t*Math.PI);
      const point=[x,floor+Math.max(.015,height),z];
      if (previous && (height>0 || previous.height>0)) timber(shapes,previous.point,point,width,sx,sz,'#97663e');
      if (previous && height<=0 && previous.height<=0) {
        const [ax,ay,az]=previous.point;
        shapes.push({vertices:[[ax+sx*width,ay,az+sz*width],[ax-sx*width,ay,az-sz*width],
          [x-sx*width,floor+.018,z-sz*width],[x+sx*width,floor+.018,z+sz*width]],color:'#593d2c'});
      }
      const elapsed=age-branch*.055-d/speed;
      const crossing=previous && (options.wave
        ? (height>0)!==(previous.height>0) : i===1 || (t===1 && previous.t<1));
      if (options.earth && crossing) {
        debris(shapes,[x,floor,z],elapsed,options.debris);
      }
      if (i%3===1 && height>.14 && elapsed>.035 && options.leaves) {
        const angle=i*2.39996+Math.sin(age*5+i)*options.sway;
        foliage(shapes,point,options.leafSize*clamp(elapsed*7),angle,0);
      }
      if (i%6===1 && height>.16 && elapsed>.09 && options.flowers) {
        foliage(shapes,point,0,i,options.bloom*clamp((elapsed-.09)*5));
      }
      previous={point,height,t};
    }
  }
  if (impactAge < 0 || !target) return;
  const [x,y,z]=destination;
  if (options.coil && impactAge<options.hold) {
    const tight=clamp(impactAge*3.2);
    const radius=.98-tight*.59;
    for (let j=0;j<=branchCount;j++) {
      let previous;
      for (let i=0;i<=22;i++) {
        const t=i/22;
        const angle=j*turn/(branchCount+1)+t*turn*1.4+impactAge*2;
        const point=[x+Math.cos(angle)*radius,y-.75+t*1.95+Math.sin(impactAge*15)*.045,z+Math.sin(angle)*radius];
        if (previous) timber(shapes,previous,point,.10,Math.cos(angle),Math.sin(angle),'#97663e');
        previous=point;
      }
    }
  }
  if (options.flowers && impactAge < options.sleep) {
    for (let i=0;i<16;i++) {
      const angle=i*2.39996+impactAge*.9;
      const radius=.49+(i%5)*.19+impactAge*.19;
      const px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
      const py=y-.5+((impactAge*.73+i*.17)%2.35);
      const size=.04+(i%3)*.024;
      shapes.push({vertices:[[px-size,py,pz],[px,py+size,pz],[px+size,py,pz],[px,py-size,pz]],color:i%2?'#ffe6a4':'#ffc0d9'});
    }
  }
}
