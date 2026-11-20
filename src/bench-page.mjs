import { benchmarkOrbit, benchmarkScene, metrics } from './bench-scene.mjs';
import { stepBenchmark, tickRate } from './core.mjs';
import { createRenderer } from './render.mjs';

const params=new URLSearchParams(location.search);
const seed=Number(params.get('seed'));
const duration=Number(params.get('duration'));
const state=benchmarkScene(seed);
const surface=document.querySelector('#bench');
const draw=createRenderer(surface.getContext('2d'));
const samples=[];
let start, previous, simulated=0;
function frame(now) {
  start ??= now;
  const seconds=(now-start)/1000;
  while (simulated<Math.floor(seconds*tickRate)) {
    stepBenchmark(state);
    simulated++;
  }
  draw(1280,720,state,seconds,90+seconds*24,null,false,{orbit:benchmarkOrbit(seconds)});
  const finished=performance.now();
  window.benchmarkFirstFrame ??= performance.timeOrigin+finished;
  if (previous!==undefined && previous>=start+3000 && finished<=start+3000+duration*1000) {
    samples.push(finished-previous);
  }
  previous=finished;
  if (finished>=start+3000+duration*1000) {
    try { window.benchmarkResult=metrics(samples); }
    catch (error) { window.benchmarkError=error.message; }
  } else requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
