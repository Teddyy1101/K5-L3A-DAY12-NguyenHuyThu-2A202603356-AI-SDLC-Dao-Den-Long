import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const folder=process.env.GAME_DATA_DIR ?? join(homedir(),'.dao-den-long');
const path=join(folder,'leaderboard.json');

export function readLeaderboard() {
  try { return JSON.parse(readFileSync(path,'utf8')); }
  catch (error) { if (error.code==='ENOENT') return {entries:[]}; throw error; }
}

export function saveScore(input, now = new Date()) {
  const {name,score,nights_won,seed}=input ?? {};
  if (typeof name!=='string' || !/^[A-Za-z0-9_]{3,12}$/.test(name) ||
      !Number.isSafeInteger(score) || score<0 || !Number.isInteger(nights_won) ||
      nights_won<0 || nights_won>3 || !Number.isSafeInteger(seed)) return null;
  const board=readLeaderboard();
  board.entries.push({name,score,nights_won,achieved_at:now.toISOString(),seed});
  board.entries.sort((a,b)=>b.score-a.score || Date.parse(a.achieved_at)-Date.parse(b.achieved_at));
  board.entries=board.entries.slice(0,10);
  mkdirSync(folder,{recursive:true});
  const temporary=join(folder,'leaderboard-'+randomUUID()+'.tmp');
  writeFileSync(temporary,JSON.stringify(board,null,2)+'\n');
  renameSync(temporary,path);
  return board;
}
