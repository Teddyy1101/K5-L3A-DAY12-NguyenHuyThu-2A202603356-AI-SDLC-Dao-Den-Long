import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultInput, newGame, stepGame } from '../src/core.mjs';
import { castIce, drawIceModels, iceLayers, iceSettings, iceVisible, paintIce } from '../src/ice.mjs';

const quiet = {random_motes:false, random_shades:false, random_drifters:false};
const world = () => newGame(1, { ...quiet, shades: [{ pos: [0, 1, 12] }] });
const faces = (settings, t) => {
  const game = world(), cast = castIce(game, iceSettings(settings));
  game.simTick = cast.startTick + Math.round(t * 60);
  const shapes = []; drawIceModels(shapes, game, cast);
  return { shapes, cast, game };
};
const heights = (shapes) => shapes.length ? Math.max(...shapes.flatMap((f) => f.vertices.map((v) => v[1]))) : 0;

test('thông số kẹp trong khoảng và có sáu hiệu ứng bật tắt riêng', () => {
  const s = iceSettings({ spacing: 99, crackCount: 1, fanCount: 1.6, grow: false });
  assert.equal(s.spacing, 2); assert.equal(s.crackCount, 4); assert.equal(s.fanCount, 2); assert.equal(s.grow, false);
  assert.equal(iceLayers.length, 6);
});

test('gai mọc lần lượt từ người chơi tới quái và to dần', () => {
  const { cast } = faces({}, 0);
  assert.ok(cast.spikes.length >= 6);
  for (let i = 1; i < cast.spikes.length; i++) {
    assert.ok(cast.spikes[i].t > cast.spikes[i - 1].t);
    assert.ok(cast.spikes[i].z > cast.spikes[i - 1].z);
    assert.ok(cast.spikes[i].scale > cast.spikes[i - 1].scale);
  }
  assert.ok(castIce(world(), iceSettings({ grow: false })).spikes.every((s) => s.scale === 1));
  const early = faces({ fan: false, cracks: false, freeze: false }, .35);
  assert.ok(early.shapes.length > 0);
  const late = faces({ fan: false, cracks: false, freeze: false }, 1.0);
  assert.ok(late.shapes.length > early.shapes.length);
});

test('gai nhỏ hai bên, đất nứt, tan từ đỉnh và khối băng mỗi thứ tắt được riêng', () => {
  assert.ok(faces({}, .9).shapes.length > faces({ fan: false }, .9).shapes.length);
  assert.ok(faces({}, 1.3).shapes.length > faces({ cracks: false }, 1.3).shapes.length);
  assert.ok(faces({}, 1.6).shapes.length > faces({ freeze: false }, 1.6).shapes.length);
  const whole = faces({ freeze: false, cracks: false }, 1.2), cutting = faces({ freeze: false, cracks: false }, 1.65);
  assert.ok(heights(cutting.shapes.filter((f) => f.vertices.length === 4 || f.vertices.length === 5)) <= heights(whole.shapes) + 1e-9);
  const noShatter = faces({ shatter: false, freeze: false, cracks: false }, 1.9);
  assert.ok(cutting.shapes.length > noShatter.shapes.length, 'mảnh vỡ nằm lại, gai không biến mất đột ngột');
});

test('gai tan từ đỉnh xuống rồi mảnh nhỏ dần chứ không biến mất đột ngột', () => {
  const cast = castIce(world(), iceSettings({ fan: false, cracks: false, freeze: false }));
  const game = world(), first = cast.spikes[0], begin = first.t + .3 + cast.options.hold;
  const peak = (t) => { game.simTick = Math.round(t * 60); const s = []; drawIceModels(s, game, cast); return s; };
  const maxY = (s) => Math.max(...s.filter((f) => f.vertices.length >= 4).flatMap((f) => f.vertices.map((v) => v[1])), 0);
  assert.ok(maxY(peak(begin + .05)) > 0);
  const during = peak(begin + .25).filter((f) => f.vertices.length === 3).length;
  assert.ok(during > 0, 'đã có mảnh bay');
  assert.ok(peak(cast.duration - .01).length < peak(begin + .6).length);
  game.simTick = Math.round((cast.duration + .5) * 60);
  assert.equal(iceVisible(game, cast), false);
});

test('khối băng bọc quái, có tuyết, chỉ khi có mục tiêu', () => {
  const { cast, game, shapes } = faces({}, 2.3);
  assert.equal(cast.frozen, true);
  assert.ok(shapes.some((f) => f.color.length === 9));
  let dots = 0;
  const ctx = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'arc' ? () => { dots++; } : () => {}, set: () => true });
  paintIce(ctx, { view: ([x, y, z]) => [x, y, z + 20], screen: ([x, y, z]) => [640 + x * 30, 300 - y * 30, 600 / z] }, game, cast);
  assert.ok(dots >= 10);
  assert.equal(castIce(newGame(1, quiet), iceSettings()).frozen, false);
});

test('phép băng không đổi trạng thái gameplay', () => {
  const a = world(), b = world();
  castIce(a, iceSettings());
  stepGame(a, defaultInput, true); stepGame(b, defaultInput, true);
  assert.deepEqual(a.shades, b.shades);
  assert.deepEqual(a.player, b.player);
});