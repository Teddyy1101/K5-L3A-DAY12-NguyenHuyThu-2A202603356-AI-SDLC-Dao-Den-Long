import { writeFileSync } from 'node:fs';
import { newGame, seededRandom, stepGame, tickRate } from './core.mjs';

const [, , seedFlag, rawSeed, nightsFlag, rawNights, outFlag, out, ...extra] = process.argv;
const seed=Number(rawSeed), nights=Number(rawNights);
if (seedFlag!=='--seed' || nightsFlag!=='--nights' || outFlag!=='--out' || !out || extra.length ||
    !Number.isSafeInteger(seed) || !Number.isSafeInteger(nights) || nights<1 || nights>10000) {
  console.error('node --expose-gc src/soak.mjs --seed 7 --nights 10 --out soak.json');
  process.exit(2);
}

const rss=()=>{
  globalThis.gc?.();
  return process.memoryUsage.rss()/1024**2;
};
// Khởi động: chạy một Đêm bỏ đi để JIT và bộ cấp phát ổn định trước khi đo RSS (heap đã kiểm chứng phẳng).
{
  const warm=newGame(seed-1,{},1), random=seededRandom(seed-1);
  while (warm.state==='playing' && warm.simTick<warm.duration*tickRate) {
    stepGame(warm,{move:[1,0],cam_yaw_deg:0,jump:random()<.05,dash:random()<.03,pulse:random()<.02,interact:random()<.1});
  }
}
const started=performance.now();
let state, memStart;
let crashes=0;
const results=[];
for (let i=0;i<nights;i++) {
  const night=i%3+1;
  const nightSeed=seed+i;
  try {
    state=newGame(nightSeed,{},night);
    if (i===0) memStart=rss();
    const random=seededRandom(nightSeed);
    let move;
    while (state.state==='playing' && state.simTick<state.duration*tickRate) {
      if (state.simTick%30===0) {
        const theta=random()*Math.PI*2;
        move=[Math.cos(theta),Math.sin(theta)];
      }
      stepGame(state,{move,cam_yaw_deg:0,jump:random()<.05,dash:random()<.03,
        pulse:random()<.02,interact:random()<.10});
    }
    results.push(state.state);
  } catch (error) {
    crashes++;
    results.push('crashed');
    console.error(error);
  } finally {
    state=null;
  }
}
const round=n=>Math.round(n*1000)/1000;
const report={nights,crashes,results,mem_start_mb:round(memStart ?? rss()),mem_end_mb:round(rss()),
  duration_s:round((performance.now()-started)/1000)};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');
if (crashes) process.exitCode=1;
