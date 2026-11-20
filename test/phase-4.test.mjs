import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { actions, defaultBindings, loadBindings } from '../src/keybinds.mjs';
import { metrics } from '../src/bench-scene.mjs';

test('metrics theo định nghĩa Ticket-04', () => {
  const samples=[10,10,10,10,10,10,10,10,10,100];
  const r=metrics(samples);
  assert.equal(r.frames,10);
  assert.equal(r.avg_fps,Number((1000*10/190).toFixed(3)));
  assert.equal(r.p1_low_fps,10); // k=1: dt lớn nhất = 100ms
  assert.equal(r.frame_ms_p95,100);
});

test('phím trùng bị từ chối và quay về mặc định', () => {
  assert.equal(actions.length,14);
  const dup={...defaultBindings,jump:'e'};
  assert.deepEqual(loadBindings(dup),defaultBindings);
  const ok={...defaultBindings,jump:'z'};
  assert.equal(loadBindings(ok).jump,'z');
});

test('bảng xếp hạng: lưu top 10, sắp xếp, xuất, từ chối tên sai', async () => {
  const dir=mkdtempSync(join(tmpdir(),'ddl-lb-'));
  process.env.GAME_DATA_DIR=dir;
  const { saveScore } = await import('../src/leaderboard.mjs');
  assert.equal(saveScore({name:'ab',score:1,nights_won:0,seed:1}),null);
  assert.equal(saveScore({name:'Tên có dấu',score:1,nights_won:0,seed:1}),null);
  for (let i=0;i<12;i++) saveScore({name:'P'+String(i).padStart(2,'0')+'_x',score:i%3*10,nights_won:i%4,seed:i},new Date(2026,0,1,0,0,i));
  const out=join(dir,'out.json');
  const run=spawnSync(process.execPath,['src/server.mjs','--export-leaderboard',out],{env:{...process.env,GAME_DATA_DIR:dir}});
  assert.equal(run.status,0);
  const {entries}=JSON.parse(readFileSync(out,'utf8'));
  assert.equal(entries.length,10);
  for (let i=1;i<10;i++) {
    assert.ok(entries[i-1].score>entries[i].score ||
      (entries[i-1].score===entries[i].score && entries[i-1].achieved_at<=entries[i].achieved_at));
  }
});