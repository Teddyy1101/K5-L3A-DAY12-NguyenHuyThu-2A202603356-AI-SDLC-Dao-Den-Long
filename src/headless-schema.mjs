import { drifterStates, shadeStates, tuning } from './core.mjs';
import { nights } from './nights.mjs';

function requireValue(condition, label, expected) {
  if (!condition) throw new Error(`${label} phải là ${expected}.`);
}

function object(value, label) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), label, 'đối tượng');
}

function array(value, label) {
  requireValue(Array.isArray(value), label, 'mảng');
}

function position(value, label) {
  requireValue(Array.isArray(value) && value.length === 3 && value.every(Number.isFinite), label, '[x, y, z] gồm ba số hữu hạn');
}

function boolean(value, label) {
  requireValue(typeof value === 'boolean', label, 'boolean');
}

function range(value, label, maximum) {
  requireValue(Number.isSafeInteger(value) && value >= 0 && value <= maximum, label, `số nguyên từ 0 đến ${maximum}`);
}

export function parseInputs(data) {
  object(data, 'inputs');
  array(data.frames, 'frames');
  let lastTick = -1;
  for (const [index, frame] of data.frames.entries()) {
    const label = `frames[${index}]`;
    object(frame, label);
    requireValue(Number.isSafeInteger(frame.tick) && frame.tick > lastTick, `${label}.tick`, 'số nguyên không âm và tăng nghiêm ngặt');
    lastTick = frame.tick;
    if ('move' in frame) {
      requireValue(Array.isArray(frame.move) && frame.move.length === 2
        && frame.move.every((axis) => Number.isFinite(axis) && Math.abs(axis) <= 1), `${label}.move`, '[x, z] với mỗi trục trong [-1, 1]');
    }
    if ('cam_yaw_deg' in frame) {
      requireValue(Number.isFinite(frame.cam_yaw_deg), `${label}.cam_yaw_deg`, 'số hữu hạn');
    }
    for (const button of ['jump', 'interact', 'pulse', 'dash', 'pause']) {
      if (button in frame) boolean(frame[button], `${label}.${button}`);
    }
  }
  return data.frames;
}

export function parseScenario(data, night = 1) {
  object(data, 'scenario');
  for (const flag of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) {
    if (flag in data) boolean(data[flag], flag);
  }
  if ('time_left_s' in data) {
    requireValue(Number.isFinite(data.time_left_s) && data.time_left_s >= 0, 'time_left_s', 'số hữu hạn không âm');
  }
  if ('player' in data) {
    const player = data.player;
    object(player, 'player');
    if ('pos' in player) position(player.pos, 'player.pos');
    if ('carried' in player) range(player.carried, 'player.carried', tuning.carry_capacity);
    if ('flames' in player) range(player.flames, 'player.flames', tuning.flames);
    for (const field of ['invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks']) {
      if (field in player) range(player[field], 'player.'+field, Number.MAX_SAFE_INTEGER);
    }
  }
  for (const collection of ['motes','shades','drifters','charms']) {
    if (!(collection in data)) continue;
    array(data[collection], collection);
    const ids = new Set();
    for (const [index, entry] of data[collection].entries()) {
      const label = `${collection}[${index}]`;
      if (Array.isArray(entry) && collection === 'motes') { position(entry,label); continue; }
      object(entry, label);
      if (collection !== 'charms' || 'pos' in entry) position(entry.pos, label+'.pos');
      if ('id' in entry) {
        requireValue(typeof entry.id === 'string' && entry.id.trim() !== '' && !ids.has(entry.id), label+'.id', 'chuỗi không rỗng và duy nhất');
        ids.add(entry.id);
      }
      if ('state' in entry && collection === 'shades') requireValue(shadeStates.includes(entry.state),label+'.state','trạng thái Bóng Mực hợp lệ');
      if ('state' in entry && collection === 'drifters') requireValue(drifterStates.includes(entry.state),label+'.state','trạng thái Gió Lạc hợp lệ');
      if ('kind' in entry && collection === 'motes') requireValue(['random','dropped'].includes(entry.kind),label+'.kind','random hoặc dropped');
      if ('available' in entry && collection === 'charms') boolean(entry.available,label+'.available');
      if ('stolen' in entry && collection === 'drifters') range(entry.stolen,label+'.stolen',3);
      for (const field of ['state_ticks_left','flee_ticks_left','respawn_ticks','ttl_ticks']) {
        if (field in entry) range(entry[field],label+'.'+field,Number.MAX_SAFE_INTEGER);
      }
    }
  }
  if ('lanterns' in data) {
    array(data.lanterns, 'lanterns');
    const ids = new Set(nights[night].lanterns.map((_,index) => 'L'+(index+1)));
    for (const [index, lantern] of data.lanterns.entries()) {
      const label = `lanterns[${index}]`;
      object(lantern, label);
      requireValue(ids.delete(lantern.id), `${label}.id`, 'ID đèn duy nhất thuộc Đêm đã chọn');
      if ('pos' in lantern) position(lantern.pos, `${label}.pos`);
      if ('deposited' in lantern) range(lantern.deposited, `${label}.deposited`, tuning.lantern_cost);
      if ('lit' in lantern) boolean(lantern.lit, `${label}.lit`);
    }
  }
  return data;
}
