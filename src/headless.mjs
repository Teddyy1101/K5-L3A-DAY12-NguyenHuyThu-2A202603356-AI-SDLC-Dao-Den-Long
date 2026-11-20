import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { defaultInput, newGame, snapshot, stepGame } from './core.mjs';
import { parseInputs, parseScenario } from './headless-schema.mjs';

const usage = 'node src/headless.mjs --seed <int> --night <1|2|3> [--scenario <file.json>] [--inputs <file.json>] '
  + '--ticks <int> --out <file.jsonl> [--snapshot-every <int>]';
const flags = new Set(['--seed', '--night', '--scenario', '--inputs', '--ticks', '--out', '--snapshot-every']);

function numberArgument(value, flag, min = Number.MIN_SAFE_INTEGER) {
  if (!/^[+-]?\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < min) {
    throw new Error(`Giá trị ${flag} không hợp lệ.`);
  }
  return Number(value);
}

function argumentsFrom(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const [flag, value] = [args[i], args[i + 1]];
    if (!flags.has(flag) || values.has(flag) || !value || value.startsWith('--')) {
      throw new Error(`Tham số không hợp lệ: ${flag}.`);
    }
    values.set(flag, value);
  }
  for (const required of ['--seed', '--night', '--ticks', '--out']) {
    if (!values.has(required)) throw new Error(`Thiếu tham số ${required}.`);
  }
  const night = numberArgument(values.get('--night'), '--night', 1);
  if (night > 3) throw new Error('--night phải là 1, 2 hoặc 3.');
  return {
    seed: numberArgument(values.get('--seed'), '--seed'), night,
    ticks: numberArgument(values.get('--ticks'), '--ticks', 0),
    snapshotEvery: numberArgument(values.get('--snapshot-every') ?? '10', '--snapshot-every', 1),
    output: values.get('--out'), inputs: values.get('--inputs'), scenario: values.get('--scenario'),
  };
}

function loadJson(path, parse, fallback) {
  if (path === undefined) return fallback;
  try {
    return parse(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`, { cause: error });
  }
}

function run(config, scenario, frames) {
  const state = newGame(config.seed, scenario, config.night);
  const input = { ...defaultInput };
  let nextFrame = 0;
  let buffer = '';
  const fd = openSync(config.output, 'w');

  function append(row) {
    buffer += `${JSON.stringify(row)}\n`;
    if (buffer.length >= 65536) {
      writeFileSync(fd, buffer, 'utf8');
      buffer = '';
    }
  }

  try {
    append(snapshot(state));
    append({ type: 'event', tick: 0, name: 'night_start', data: { night: state.night } });
    while (state.tick < config.ticks && (state.state === 'playing' || state.state === 'paused')) {
      const frame = frames[nextFrame];
      if (frame?.tick === state.tick) {
        for (const key of Object.keys(defaultInput)) {
          if (Object.hasOwn(frame, key)) input[key] = frame[key];
        }
        nextFrame += 1;
      }
      for (const event of stepGame(state, input)) append(event);
      if (state.tick % config.snapshotEvery === 0) append(snapshot(state));
    }
    append({ type: 'end', ticks: state.tick, state: state.state, score: state.score });
    if (buffer) writeFileSync(fd, buffer, 'utf8');
  } finally {
    closeSync(fd);
  }
}

function main(args) {
  let config;
  try {
    config = argumentsFrom(args);
  } catch (error) {
    console.error(`${error.message}\n${usage}`);
    return 1;
  }

  let frames;
  let scenario;
  try {
    scenario = loadJson(config.scenario, (data) => parseScenario(data, config.night), {});
    frames = loadJson(config.inputs, parseInputs, []);
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  try {
    run(config, scenario, frames);
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

process.exitCode = main(process.argv.slice(2));
