import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { release, type } from 'node:os';
import { fileURLToPath } from 'node:url';
import { delay, openChromium } from './chromium.mjs';

const opts=new Map();
for (let i=2;i<process.argv.length;i+=2) {
  const key=process.argv[i],value=process.argv[i+1];
  if (!['--seed','--duration','--out'].includes(key) || opts.has(key) || !value) {
    console.error('node src/bench.mjs --seed 42 --duration 30 --out bench.json'); process.exit(2);
  }
  opts.set(key,value);
}
const seed=Number(opts.get('--seed')),duration=Number(opts.get('--duration')),out=opts.get('--out');
if (!Number.isSafeInteger(seed) || !Number.isFinite(duration) || duration<=0 || !out) {
  console.error('node src/bench.mjs --seed 42 --duration 30 --out bench.json'); process.exit(2);
}

const reservation=createServer();
await new Promise((resolve,reject)=>{reservation.once('error',reject);reservation.listen(0,'127.0.0.1',resolve);});
const {port}=reservation.address();
await new Promise((resolve)=>reservation.close(resolve));
const server=spawn(process.execPath,[fileURLToPath(new URL('./server.mjs',import.meta.url))],
  {env:{...process.env,GAME_PORT:String(port)},stdio:['ignore','ignore','inherit'],windowsHide:true});
let browser;
try {
  const origin='http://127.0.0.1:'+port;
  let ready=false;
  for (let tries=0;tries<100 && !ready;tries++) {
    if (server.exitCode!==null) throw Error('Máy chủ benchmark đã thoát.');
    try { ready=(await fetch(origin+'/bench')).ok; } catch {}
    if (!ready) await delay(40);
  }
  if (!ready) throw Error('Máy chủ benchmark không phản hồi.');
  browser=await openChromium(origin+'/bench?seed='+seed+'&duration='+duration);
  const deadline=performance.now()+(duration+22)*1000;
  while (performance.now()<deadline) {
    const result=await browser.evaluate('({data:window.benchmarkResult, first:window.benchmarkFirstFrame,error:window.benchmarkError, ua:navigator.userAgent})');
    if (result.error) throw Error(result.error);
    if (result.data) {
      const version=result.ua.match(/(?:HeadlessChrome|Chrome)\/([\d.]+)/)?.[1] ?? 'unknown';
      const report={contract_version:'1.3',...result.data,load_ms:Math.round(result.first-performance.timeOrigin),
        peak_mem_mb:null,vsync_off:false,renderer:'Đảo Đèn Lồng 1.0.0 Canvas 2D / Chromium '+version,os:type()+' '+release()};
      writeFileSync(out,JSON.stringify(report,null,2)+'\n');
      console.log(JSON.stringify(report));
      break;
    }
    await delay(225);
  }
  if (performance.now()>=deadline) throw Error('Benchmark quá thời gian chờ.');
} finally {
  await browser?.close();
  server.kill();
}
