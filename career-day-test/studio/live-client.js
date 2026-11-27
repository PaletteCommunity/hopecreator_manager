import { API_BASE, LIVE_UPDATES } from './server-config.js';

const listeners = new Set();
let socket = null, reconnect = null, heartbeat = null, failures = 0, connected = false;
const emit = event => { for (const listener of listeners) listener(event); };
export const liveConnected = () => connected;
export function subscribeLive(listener) { listeners.add(listener); connect(); return () => listeners.delete(listener); }
function connect() {
  if (!API_BASE || !LIVE_UPDATES || document.hidden || !navigator.onLine || socket || reconnect) return;
  const url = new URL('/api/live', API_BASE); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  let current;
  try { current = new WebSocket(url); } catch { return; }
  socket = current;
  current.addEventListener('open', () => {
    if (socket !== current) return;
    failures = 0; connected = true;
    heartbeat = setInterval(() => { if (current.readyState === WebSocket.OPEN) current.send('ping'); }, 30000);
  });
  current.addEventListener('message', message => {
    if (socket !== current || message.data === 'pong') return;
    try { const event = JSON.parse(message.data); if (['ready', 'cards', 'reaction'].includes(event.kind)) emit(event); } catch {}
  });
  current.addEventListener('error', () => current.close());
  current.addEventListener('close', () => {
    if (socket !== current) return;
    socket = null; connected = false; clearInterval(heartbeat); heartbeat = null;
    if (!document.hidden && navigator.onLine) {
      const delay = Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)) + Math.random() * 1000;
      reconnect = setTimeout(() => { reconnect = null; connect(); }, delay);
    }
  });
}
function stop() {
  clearTimeout(reconnect); reconnect = null; clearInterval(heartbeat); heartbeat = null;
  const old = socket; socket = null; connected = false; if (old) old.close(1000, 'Hidden');
}
document.addEventListener('visibilitychange', () => document.hidden ? stop() : connect());
window.addEventListener('offline', stop); window.addEventListener('online', connect); window.addEventListener('pagehide', stop); window.addEventListener('pageshow', connect);
