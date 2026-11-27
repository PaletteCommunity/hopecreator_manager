import { handleApi } from './api.mjs';
export { IslandLive } from './live.mjs';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const live = env.ISLAND_LIVE?.get(env.ISLAND_LIVE.idFromName('hope-creator'));
    if (url.pathname === '/api/live') {
      const allowed = new Set([url.origin, ...(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)]);
      if (!allowed.has(request.headers.get('origin'))) return new Response(null, { status: 403 });
      if (!live) return new Response(null, { status: 503 });
      return live.fetch(request);
    }
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, {
      waitUntil: promise => context.waitUntil(promise),
      publish: event => live ? live.fetch('https://live.internal/publish', { method: 'POST', body: JSON.stringify(event) }).then(response => { if (!response.ok) throw Error('Live delivery failed'); }) : Promise.resolve(),
    });
    if (url.pathname === '/studio/server-config.js') return new Response(`export const API_BASE = ${JSON.stringify(url.origin)};\nexport const LIVE_UPDATES = ${!!live};\n`, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if (url.pathname === '/admin') return Response.redirect(`${url.origin}/admin/`, 302);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('X-Frame-Options', 'DENY');
    if (url.pathname.startsWith('/admin/')) headers.set('Cache-Control', 'no-store');
    if (headers.get('Content-Type')?.includes('text/html')) {
      const wsOrigin = url.origin.replace(/^http/, 'ws');
      const html = (await response.text()).replace("connect-src 'self'", `connect-src 'self' ${wsOrigin}`);
      headers.delete('Content-Length');
      return new Response(html, { status: response.status, headers });
    }
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event, env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM reactions WHERE created_at < ?').bind(now - 3600000),
      env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now),
      env.DB.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(now),
    ]);
  },
};
