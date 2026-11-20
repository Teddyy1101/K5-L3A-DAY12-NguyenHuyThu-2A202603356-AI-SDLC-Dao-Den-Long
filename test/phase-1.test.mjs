import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { defaultInput, newGame, snapshot, stepGame, tickRate, tuning } from '../src/core.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const cli = join(root, 'src', 'headless.mjs');
const proof = join(root, 'docs', 'proof', 'phase-1');
const scratch = mkdtempSync(join(tmpdir(), 'dao-den-long-test-'));
let serial = 0;

after(() => {
  for (const file of readdirSync(scratch)) rmSync(join(scratch, file));
  rmdirSync(scratch);
});

function jsonFile(data) {
  const file = join(scratch, `fixture-${serial++}.json`);
  writeFileSync(file, JSON.stringify(data));
  return file;
}

function run(ticks, ...flags) {
  const out = join(scratch, `output-${serial++}.jsonl`);
  const command = spawnSync(process.execPath, [cli, '--seed', '1201', '--night', '1', '--ticks', String(ticks), '--out', out, ...flags],
    { cwd: root, encoding: 'utf8', windowsHide: true });
  if (command.error) throw command.error;
  if (command.status !== 0) return command;
  const bytes = readFileSync(out, 'utf8');
  const rows = bytes.trimEnd().split('\n').map((row) => JSON.parse(row));
  return { ...command, bytes, rows, snapshots: rows.filter((row) => row.type === 'snapshot'),
    events: rows.filter((row) => row.type === 'event' && row.name !== 'night_start'), end: rows.at(-1) };
}

const emptyIsland = { random_motes: false, random_shades: false };

test('manifest khai đúng tuning dùng trong gameplay', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'game.contract.json'), 'utf8'));
  assert.equal(manifest.contract_version, '1.2');
  assert.deepEqual(manifest.tuning, tuning);
  assert.equal(snapshot(newGame()).lanterns.length, tuning.lantern_count_night1);
});

test('tick 0, số bước chính xác, camera yaw, chuẩn hóa đường chéo và nhảy cạnh lên', () => {
  const check = run(5, '--snapshot-every', '2', '--scenario', jsonFile(emptyIsland), '--inputs', jsonFile({ frames: [
    { tick: 0, move: [1, 1], cam_yaw_deg: 90, jump: true }, { tick: 3, move: [0, 0] },
  ] }));
  assert.equal(check.status, 0, check.stderr);
  assert.equal(check.stdout, '');
  assert.deepEqual(check.snapshots.map(({ tick }) => tick), [0, 2, 4]);
  assert.deepEqual(check.snapshots[0].player.pos, [0, 0, 0]);
  const [x,y,z] = check.snapshots[1].player.pos;
  const component = Number((2 * tuning.player_speed / tickRate / Math.sqrt(2)).toFixed(3));
  assert.deepEqual([x,z],[component,-component]);
  assert.ok(y>0);
  assert.equal(check.snapshots[2].time_left_s, tuning.night1_duration_s - 4 / tickRate);
  assert.equal(check.snapshots[2].sim_tick, 4);
  assert.equal(check.end.ticks, 5);

  const held = newGame(0, emptyIsland);
  for (let index = 0; index < 120; index += 1) stepGame(held, { ...defaultInput, jump: true });
  assert.equal(held.player.pos[1], 0);
  stepGame(held);
  stepGame(held, { ...defaultInput, jump: true });
  assert.ok(held.player.pos[1] > 0);
});

test('nạp từng phần, giữ nút không lặp, biên nhặt XZ và độ cao, giới hạn sức chứa', () => {
  const cost=tuning.lantern_cost;
  const check = run(4, '--snapshot-every', '1', '--scenario', jsonFile({ ...emptyIsland,
    player: { carried: 1 }, motes: [[tuning.pickup_radius, 1.5, 0], [tuning.pickup_radius+tuning.player_speed/tickRate, 0, 0], [0,1.51,0]],
    lanterns: [{ id: 'L1', pos: [0, 0, 0], deposited: cost-3 }],
  }), '--inputs', jsonFile({ frames: [
    { tick: 0, interact: true }, { tick: 1, move: [1, 0] }, { tick: 2, interact: false }, { tick: 3, interact: true },
  ] }));
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(check.events.map(({ tick, name, data }) => [tick, name, data]), [
    [1, 'mote_picked', { carried: 2 }], [1, 'deposit', { lantern_id: 'L1', amount: 2, deposited: cost-1 }],
    [2, 'mote_picked', { carried: 1 }], [4, 'deposit', { lantern_id: 'L1', amount: 1, deposited: cost }],
    [4, 'lantern_lit', { lantern_id: 'L1', relight:false }],
  ]);
  assert.equal(check.snapshots.at(-1).lanterns[0].lit, true);
  const capacity = newGame(0, { ...emptyIsland, player: { carried: tuning.carry_capacity - 1 }, motes: [[0, 0, 0], [0, 0, 0]] });
  stepGame(capacity);
  assert.equal(capacity.player.carried, tuning.carry_capacity);
  assert.equal(capacity.motes.length, 1);
});

test('pulse tốn ánh sáng, đẩy và choáng một Bóng Mực trước khi hết máu', () => {
  const close=tuning.pulse_radius*.6;
  const check = run(900, '--snapshot-every', '1', '--scenario', jsonFile({...emptyIsland,
    player:{carried:tuning.pulse_cost,flames:2},
    shades:[{id:'Snear',pos:[close,1,0]},{id:'Sedge',pos:[tuning.pulse_radius+1,1,0]}],
  }), '--inputs', join(proof, 'combat.inputs.json'));
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(check.events[0], { type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['Snear'] } });
  assert.deepEqual(check.snapshots[15].shades[0], { id: 'Snear', pos: [Number((close+tuning.pulse_push_m).toFixed(3)), 1, 0], state: 'stunned' });
  assert.equal(check.snapshots[1].player.carried, 0);
  const duration=Math.ceil(tuning.pulse_stun_s*tickRate);
  assert.equal(check.snapshots[duration].shades[0].state, 'stunned');
  assert.notEqual(check.snapshots[duration+1].shades[0].state, 'stunned');
  const hits = check.events.filter(({ name }) => name === 'player_hit');
  assert.deepEqual(hits.map(({ data }) => data.flames), [1, 0]);
  assert.ok(hits[1].tick - hits[0].tick >= tuning.invuln_s * tickRate);
  assert.ok(hits.every(({ data }) => data.by === 'shade' && data.dropped === 0));
  assert.deepEqual(check.events.at(-1).data, { result: 'lost', reason: 'no_flames' });
  assert.deepEqual(check.end, { type: 'end', ticks: hits[1].tick, state: 'lost', score: tuning.score.per_stun });
});

test('vùng an toàn của đèn sáng, cooldown pulse và trạng thái khởi tạo không có điểm', () => {
  const start = { ...emptyIsland, player: { carried: 8 }, lanterns: [{ id: 'L1', pos: [0, 0, 0], lit: true }],
    shades: [{ id: 'S1', pos: [tuning.safe_radius + 0.1, 1, 0] }] };
  const state = newGame(0, start);
  assert.equal(state.score, 0);
  for (let index = 0; index < 100; index += 1) stepGame(state);
  assert.equal(state.player.flames, tuning.flames);
  assert.ok(Math.hypot(state.shades[0].pos[0], state.shades[0].pos[2]) > tuning.safe_radius);

  const pulse = newGame(0, { ...emptyIsland, player: { carried: tuning.pulse_cost*2 } });
  const press = { ...defaultInput, pulse: true };
  assert.equal(stepGame(pulse, press)[0].name, 'pulse');
  stepGame(pulse);
  assert.deepEqual(stepGame(pulse, press), []);
  assert.equal(pulse.player.carried, tuning.pulse_cost);
  for (let index = 0; index < Math.ceil(tuning.pulse_cooldown_s*tickRate); index += 1) stepGame(pulse);
  assert.equal(stepGame(pulse, press)[0].name, 'pulse');
  assert.equal(pulse.player.carried, 0);
});

test('thắp đèn cuối Đêm 1 vẫn chạy tới bình minh, điểm Contract 1.2 và JSONL tất định', () => {
  const inputs=jsonFile({frames:[{tick:0,interact:true}]});
  const scenario=jsonFile({...emptyIsland,time_left_s:1,player:{pos:[0,0,25],carried:tuning.lantern_cost},
    lanterns:['L2','L3','L4','L5'].map((id)=>({id,lit:true}))});
  const first = run(60, '--inputs', inputs,'--scenario',scenario);
  const second = run(60, '--inputs', inputs,'--scenario',scenario);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.bytes, second.bytes);
  assert.equal(first.snapshots[0].score, 0);
  assert.deepEqual(first.events.filter(({ name }) => name === 'lantern_lit').map(({ data }) => data.lantern_id), ['L1']);
  assert.equal(first.snapshots[1].state,'playing');
  assert.deepEqual(first.events.at(-1).data, { result: 'won', reason: 'dawn_survived' });
  const points = tuning.lantern_cost * tuning.score.per_mote
    + tuning.score.per_lantern + 5*(tuning.score.per_dawn_lantern+99)
    + tuning.flames * tuning.score.per_flame_left;
  assert.deepEqual(first.end, { type: 'end', ticks: 60, state: 'won', score: points });
});

test('bình minh, snapshot mặc định và mã thoát cho JSON sai', () => {
  const check = run(40, '--scenario', jsonFile({ ...emptyIsland, time_left_s: 11 / tickRate }));
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(check.snapshots.map(({ tick }) => tick), [0, 10]);
  assert.deepEqual(check.events, [{ type: 'event', tick: 11, name: 'game_over', data: { result: 'lost', reason: 'dawn' } }]);
  assert.deepEqual(check.end, { type: 'end', ticks: 11, state: 'lost', score: 0 });

  const repeated = run(10, '--inputs', jsonFile({ frames: [{ tick: 4 }, { tick: 4 }] }));
  assert.equal(repeated.status, 2);
  assert.match(repeated.stderr, /tăng nghiêm ngặt/);
  const malformed = run(10, '--scenario', jsonFile({ motes: [[0, 0]] }));
  assert.equal(malformed.status, 2);
  assert.match(malformed.stderr, /motes/);
});

test('Bóng Mực sinh theo seed với ID duy nhất và tắt được bằng scenario', () => {
  const enabled = run(300, '--scenario', jsonFile({ player: { pos: [0, 0, 25] }, lanterns: [{ id: 'L1', lit: true }],
    shades: [{ id: 'S1', pos: [15, 1, 0] }, { pos: [15, 1, 15] }], random_motes: false,
  }));
  assert.equal(enabled.status, 0, enabled.stderr);
  assert.deepEqual(enabled.events.filter(({ name }) => name === 'shade_spawned'), [
    { type: 'event', tick: 300, name: 'shade_spawned', data: { id: 'S3' } },
    { type: 'event', tick: 300, name: 'shade_spawned', data: { id: 'S4' } },
  ]);
  assert.deepEqual(enabled.snapshots.at(-1).shades.map(({ id }) => id), ['S1', 'S2', 'S3','S4']);
});
