import { API_BASE } from './server-config.js';
import { apiFetch as localFetch } from './static-api.js';

export const isShared = Boolean(API_BASE);
const scope = `hc-pages-${new URL('../', import.meta.url).pathname}`;
const tokenKey = `${scope}-participant-token`;
let generation = null, cardId = '', cache = null, sequence = 0, applied = 0;
function token() {
  let value = localStorage.getItem(tokenKey);
  if (!/^[0-9a-f]{64}$/.test(value || '')) {
    value = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(tokenKey, value);
  }
  return value;
}
export async function apiFetch(resource, init = {}) {
  if (!isShared) return localFetch(resource, init);
  const endpoint = new URL(resource, API_BASE);
  if (!endpoint.pathname.startsWith('/api/') || endpoint.origin !== new URL(API_BASE).origin) throw Error('Invalid API path');
  const headers = new Headers(init.headers); headers.set('Authorization', `Bearer ${token()}`);
  const reading = endpoint.pathname === '/api/cards' && (!init.method || init.method === 'GET');
  if (reading && cache?.etag) headers.set('If-None-Match', cache.etag);
  if (init.method === 'POST' && endpoint.pathname === '/api/cards') {
    if (generation === null) await apiFetch('/api/cards');
    headers.set('X-HC-Generation', String(generation)); if (cardId) headers.set('X-HC-Card', cardId);
  }
  const order = ++sequence;
  const response = await fetch(endpoint, { ...init, headers, credentials: 'omit', cache: 'no-store', signal: init.signal || AbortSignal.timeout(12000) });
  if (reading) {
    if (response.status === 304 && cache) return new Response(cache.body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    if (response.ok) {
      const text = await response.clone().text(), data = JSON.parse(text);
      if (order >= applied) { applied = order; generation = data.generation; cardId = data.mine?.id || ''; cache = { body: text, etag: response.headers.get('ETag') }; }
    }
  } else if (endpoint.pathname === '/api/cards' && response.ok) {
    const data = await response.clone().json(); cardId = data.card.id; cache = null; applied = order;
  }
  return response;
}
