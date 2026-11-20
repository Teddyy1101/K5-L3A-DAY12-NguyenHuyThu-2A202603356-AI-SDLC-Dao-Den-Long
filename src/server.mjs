import { createServer } from 'node:http';
import { createReadStream, writeFileSync } from 'node:fs';
import { readLeaderboard, saveScore } from './leaderboard.mjs';

const routes = new Map([
  ['/', ['../index.html', 'text/html']],
  ['/styles.css', ['../styles.css', 'text/css']],
  ['/src/game.mjs', ['./game.mjs', 'text/javascript']],
  ['/src/render.mjs', ['./render.mjs', 'text/javascript']],
  ['/src/core.mjs', ['./core.mjs', 'text/javascript']],
  ['/src/nights.mjs', ['./nights.mjs', 'text/javascript']],
  ['/src/audio.mjs', ['./audio.mjs', 'text/javascript']],
  ['/src/keybinds.mjs', ['./keybinds.mjs', 'text/javascript']],
  ['/src/wood.mjs', ['./wood.mjs', 'text/javascript']],
  ['/src/meteor.mjs', ['./meteor.mjs', 'text/javascript']],
  ['/src/ice.mjs', ['./ice.mjs', 'text/javascript']],
  ['/src/bench-page.mjs', ['./bench-page.mjs', 'text/javascript']],
  ['/src/bench-scene.mjs', ['./bench-scene.mjs', 'text/javascript']],
  ['/bench', ['../bench.html', 'text/html']],
]);

const args=process.argv.slice(2);
if (args.length) {
  if (args.length!==2 || args[0]!=='--export-leaderboard' || !args[1]) {
    console.error('node src/server.mjs [--export-leaderboard out.json]');
    process.exit(2);
  }
  writeFileSync(args[1],JSON.stringify(readLeaderboard(),null,2)+'\n');
  process.exit(0);
}

const port = Number(process.env.GAME_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('GAME_PORT phải là số nguyên từ 1 đến 65535.');
}

async function leaderboard(request,response) {
  const send=(status,result)=>response.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store'}).end(JSON.stringify(result));
  try {
    if (request.method==='GET') return send(200,readLeaderboard());
    if (request.method!=='POST') return send(405,{error:'Phương thức không hỗ trợ.'});
    const origin=request.headers.origin;
    if (origin && origin!=='http://'+request.headers.host) return send(403,{error:'Nguồn yêu cầu không hợp lệ.'});
    if (request.headers['content-type']?.split(';')[0]!=='application/json') return send(415,{error:'Cần dữ liệu JSON.'});
    const chunks=[];
    let size=0;
    for await (const part of request) {
      size+=part.length;
      if (size>4096) return send(413,{error:'Dữ liệu quá lớn.'});
      chunks.push(part);
    }
    let input;
    try { input=JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return send(400,{error:'JSON không hợp lệ.'}); }
    const board=saveScore(input);
    return board ? send(200,board) : send(400,{error:'Tên hoặc điểm không hợp lệ.'});
  } catch (error) {
    console.error(error);
    send(500,{error:'Không ghi hoặc đọc được bảng xếp hạng.'});
  }
}

const server = createServer((request, response) => {
  const pathname=request.url.split('?')[0];
  if (pathname==='/api/leaderboard') { void leaderboard(request,response); return; }
  const route = routes.get(pathname);
  if (!route) {
    response.writeHead(404).end();
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const [path, contentType] = route;
  response.setHeader('Content-Type', `${contentType}; charset=utf-8`);
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const file = createReadStream(new URL(path, import.meta.url));
  file.on('error', () => response.writeHead(500).end());
  file.pipe(response);
});

server.listen(port, '127.0.0.1', () => console.log(`Đảo Đèn Lồng · http://127.0.0.1:${port}`));
