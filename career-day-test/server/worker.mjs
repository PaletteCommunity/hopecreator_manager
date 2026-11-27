import { handleApi } from './api.mjs';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, { waitUntil: promise => context.waitUntil(promise) });
    if (url.pathname === '/studio/server-config.js') return new Response(`export const API_BASE = ${JSON.stringify(url.origin)};\n`, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if (url.pathname === '/admin') return Response.redirect(`${url.origin}/admin/`, 302);
    const response = await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'no-referrer');
    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('X-Frame-Options', 'DENY');
    if (url.pathname.startsWith('/admin/')) headers.set('Cache-Control', 'no-store');
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
