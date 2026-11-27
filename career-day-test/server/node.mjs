import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openDatabase } from './sqlite.mjs';
import { handleApi } from './api.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
export async function createIslandServer({ databasePath = ':memory:', adminPasswordHash = '', allowedOrigins = '', publicOrigin = '', host = '127.0.0.1', port = 0 } = {}) {
  if (databasePath !== ':memory:') await mkdir(path.dirname(path.resolve(databasePath)), { recursive: true });
  const DB = await openDatabase(databasePath);
  const server = http.createServer(async (incoming, outgoing) => {
    try {
      const local = `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${server.address().port}`;
      const origin = publicOrigin || local;
      const url = new URL(incoming.url, origin);
      const headers = new Headers(); for (const [key, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      // Never trust visitor-supplied proxy IP headers on the standalone server.
      headers.delete('cf-connecting-ip');
      const init = { method: incoming.method, headers };
      if (incoming.method !== 'GET' && incoming.method !== 'HEAD') { init.body = Readable.toWeb(incoming); init.duplex = 'half'; }
      const request = new Request(url, init); let response;
      if (url.pathname.startsWith('/api/')) response = await handleApi(request, { DB, ADMIN_PASSWORD_HASH: adminPasswordHash, ALLOWED_ORIGINS: allowedOrigins }, { clientIp: incoming.socket.remoteAddress });
      else if (url.pathname === '/studio/server-config.js') response = new Response(`export const API_BASE = ${JSON.stringify(origin)};\nexport const LIVE_UPDATES = false;\n`, { headers: { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' } });
      else if (url.pathname === '/admin') response = new Response(null, { status: 302, headers: { Location: '/admin/' } });
      else {
        const route = decodeURIComponent(url.pathname);
        const isPublic = route === '/' || route === '/index.html' || route === '/admin/' || route === '/admin/index.html' || (route.startsWith('/studio/') && /\.(?:js|css|svg|png|woff2|ttf)$/i.test(route));
        const filename = path.resolve(ROOT, '.' + (route.endsWith('/') ? route + 'index.html' : route));
        if (!isPublic || !filename.startsWith(ROOT)) response = new Response('Not found', { status: 404 });
        else {
          try { response = new Response(await readFile(filename), { headers: { 'Content-Type': TYPES[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' } }); }
          catch { response = new Response('Not found', { status: 404 }); }
        }
      }
      const output = new Headers(response.headers);
      output.set('X-Content-Type-Options', 'nosniff'); output.set('Referrer-Policy', 'no-referrer'); output.set('X-Frame-Options', 'DENY');
      output.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      outgoing.writeHead(response.status, Object.fromEntries(output));
      if (incoming.method === 'HEAD' || !response.body) outgoing.end(); else Readable.fromWeb(response.body).pipe(outgoing);
    } catch { outgoing.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); outgoing.end('서버 연결을 확인해 주세요.'); }
  });
  server.requestTimeout = 15000; server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  return { server, DB, url: publicOrigin || `http://${host}:${server.address().port}`, async close() { await new Promise(resolve => server.close(resolve)); DB.close(); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const running = await createIslandServer({ databasePath: process.env.HC_DATABASE_PATH || path.resolve('work/hc-island.sqlite'), adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '', allowedOrigins: process.env.ALLOWED_ORIGINS || '', publicOrigin: process.env.HC_PUBLIC_ORIGIN || '', host: process.env.HOST || '127.0.0.1', port: Number(process.env.PORT || 4327) });
  console.log(`Hope Creator server: ${running.url}`);
  if (!process.env.ADMIN_PASSWORD_HASH) console.log('관리자 로그인을 사용하려면 ADMIN_PASSWORD_HASH 설정이 필요합니다.');
  process.on('SIGINT', async () => { await running.close(); process.exit(0); });
}
