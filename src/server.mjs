import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';

const routes = new Map([
  ['/', ['../index.html', 'text/html']],
  ['/styles.css', ['../styles.css', 'text/css']],
  ['/src/game.mjs', ['./game.mjs', 'text/javascript']],
  ['/src/render.mjs', ['./render.mjs', 'text/javascript']],
  ['/src/core.mjs', ['./core.mjs', 'text/javascript']],
  ['/src/nights.mjs', ['./nights.mjs', 'text/javascript']],
  ['/src/audio.mjs', ['./audio.mjs', 'text/javascript']],
]);

const port = Number(process.env.GAME_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('GAME_PORT phải là số nguyên từ 1 đến 65535.');
}

const server = createServer((request, response) => {
  const route = routes.get(request.url.split('?')[0]);
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
