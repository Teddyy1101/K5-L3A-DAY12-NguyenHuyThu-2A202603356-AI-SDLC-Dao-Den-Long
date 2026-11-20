import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newGame, stepGame, defaultInput } from '../src/core.mjs';
import { castMeteor, drawMeteorModels, meteorLayers, meteorSettings, meteorSquash, meteorVisible, paintMeteor } from '../src/meteor.mjs';

const quiet = {random_motes:false, random_shades:false, random_drifters:false};
const recorder = () => {
  const calls = {};
  const target = new Proxy({}, { get: (_, key) => key === 'createRadialGradient' ? () => ({ addColorStop() {} })
    : (...args) => { calls[key] = (calls[key] ?? 0) + 1; }, set: () => true });
  return { target, calls };
};
const camera = { view: ([x, y, z]) => [x, y, z + 20], screen: ([x, y, z]) => [640 + x * 30, 300 - y * 30, 30 / z * 20] };

test('thông số được kẹp trong khoảng cho phép và mỗi bước bật tắt riêng', () => {
  const s = meteorSettings({ count: 999, duration: -1, rays: 7.6, rain: false });
  assert.equal(s.count, 60); assert.equal(s.duration, 1); assert.equal(s.rays, 8); assert.equal(s.rain, false);
  assert.equal(meteorLayers.length, 6);
  for (const [id] of meteorLayers) assert.equal(typeof meteorSettings()[id], 'boolean');
});

test('một sao băng rồi nhân lên thành mưa, ô chỉ có khi có mục tiêu', () => {
  const game = newGame(1, { ...quiet, shades: [{ pos: [0, 1, 10] }] });
  assert.equal(castMeteor(game, meteorSettings({ rain: false, umbrella: false })).meteors.length, 1);
  const rain = castMeteor(game, meteorSettings({ umbrella: false, count: 30 }));
  assert.equal(rain.meteors.length, 30);
  assert.ok(new Set(rain.meteors.map((m) => m.t0.toFixed(3))).size > 20, 'rơi lệch nhịp');
  assert.ok(new Set(rain.meteors.map((m) => m.size.toFixed(2))).size > 20, 'to nhỏ khác nhau');
  const bonus = castMeteor(game, meteorSettings());
  assert.equal(bonus.umbrella, true);
  assert.equal(bonus.giant.size, 5);
  assert.ok(bonus.giant.t0 > Math.max(...bonus.meteors.filter((m) => m !== bonus.giant).map((m) => m.t0)));
  const empty = castMeteor(newGame(1, quiet), meteorSettings());
  assert.equal(empty.umbrella, false);
  assert.equal(empty.giant, undefined);
});

test('ô vỡ thành từng múi sau khi bị xuyên, mục tiêu bị đè bẹp rồi hồi lại', () => {
  const game = newGame(1, { ...quiet, shades: [{ pos: [0, 1, 10] }] });
  const cast = castMeteor(game, meteorSettings());
  const at = (t) => { game.simTick = cast.startTick + Math.round(t * 60); return game.simTick; };
  at(1);
  const whole = []; drawMeteorModels(whole, game, cast);
  assert.ok(whole.length >= 17);
  at(cast.giant.t0 + cast.giant.pierce + .4);
  const broken = []; drawMeteorModels(broken, game, cast);
  assert.equal(broken.length, whole.length - 1, '16 mặt của 8 múi cộng cán ô');
  assert.notDeepEqual(broken[0].vertices, whole[0].vertices);
  assert.equal(meteorSquash(cast, cast.giant.t0 + cast.giant.fall - .01), 1);
  assert.ok(meteorSquash(cast, cast.giant.t0 + cast.giant.fall + 1) < .2);
  assert.equal(meteorSquash(cast, cast.giant.t0 + cast.giant.fall + 3), 1);
  at(cast.duration + 1);
  assert.equal(meteorVisible(game, cast), false);
});

test('vẽ đầu, đuôi, nổ tia, sao văng; tắt từng bước thì bớt lệnh vẽ; gameplay không đổi', () => {
  const game = newGame(1, { ...quiet, shades: [{ pos: [0, 1, 10] }] });
  const count = (settings, t) => {
    const cast = castMeteor(game, meteorSettings({ rain: false, umbrella: false, ...settings }));
    game.simTick = cast.startTick + Math.round(t * 60);
    const { target, calls } = recorder();
    paintMeteor(target, camera, game, cast);
    return Object.values(calls).reduce((a, b) => a + b, 0);
  };
  assert.ok(count({}, .6) > count({ tail: false }, .6));
  assert.ok(count({}, .6) > count({ head: false }, .6));
  assert.ok(count({}, 1.4) > count({ burst: false }, 1.4));
  assert.ok(count({}, 1.4) > count({ stars: false }, 1.4));
  const base = newGame(7, { ...quiet, shades: [{ pos: [0, 1, 10] }] }), other = newGame(7, { ...quiet, shades: [{ pos: [0, 1, 10] }] });
  castMeteor(base, meteorSettings());
  stepGame(base, defaultInput, true); stepGame(other, defaultInput, true);
  assert.deepEqual(base.shades, other.shades);
  assert.deepEqual(base.player, other.player);
});