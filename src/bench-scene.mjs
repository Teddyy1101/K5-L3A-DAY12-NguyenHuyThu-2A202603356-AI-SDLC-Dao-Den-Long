import { newGame, seededRandom } from './core.mjs';

export function benchmarkScene(seed) {
  const random=seededRandom(seed);
  const spread=(count,y)=>Array.from({length:count},(_,i)=>{
    // Equal-area radial strata prevent clumps and leave the outer shore clear.
    const r=38*Math.sqrt((i+random())/count);
    const angle=i*2.399963229728653+random()*.22;
    return [r*Math.cos(angle),y,r*Math.sin(angle)];
  });
  return newGame(seed,{
    random_shades:false,random_drifters:false,random_motes:false,
    shades:spread(200,1).map((pos)=>({pos,state:'wander'})),
    motes:spread(100,0),
    lanterns:['L1','L2','L3'].map((id)=>({id,lit:true,fuel:100})),
  },1);
}

export function benchmarkOrbit(seconds) {
  const angle=seconds*Math.PI*2/15;
  return [30*Math.cos(angle),15,-30*Math.sin(angle)];
}

export function metrics(samples) {
  const sorted=[...samples].sort((a,b)=>a-b);
  const n=sorted.length;
  if (!n) throw Error('Benchmark không ghi được khung hình.');
  const k=Math.max(1,Math.ceil(n*.01));
  const mean=(values)=>values.reduce((sum,dt)=>sum+dt,0)/values.length;
  const round=(value)=>Math.round(value*1000)/1000;
  return {avg_fps:round(1000/mean(sorted)),p1_low_fps:round(1000/mean(sorted.slice(-k))),
    frame_ms_p95:round(sorted[Math.ceil(n*.95)-1]),frames:n};
}
