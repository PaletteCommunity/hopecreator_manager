// Public change notifications only. Participant/admin credentials never enter this object.
// SQLite-backed Durable Object + hibernation are supported on Workers Free.
export class IslandLive {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/publish') {
      const text = await request.text();
      if (text.length > 262144) return new Response(null, { status: 413 });
      let event;
      try { event = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
      if (!['cards', 'reaction'].includes(event.kind)) return new Response(null, { status: 400 });
      for (const socket of this.ctx.getWebSockets()) {
        try { socket.send(text); } catch { try { socket.close(1011, 'Reconnect'); } catch {} }
      }
      return new Response(null, { status: 204 });
    }
    if (request.method !== 'GET' || request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response(null, { status: 426 });
    if (this.ctx.getWebSockets().length >= 300) return new Response(null, { status: 503 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ kind: 'ready' }));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(socket) {
    // Only the internal Worker binding may publish. Clients cannot broadcast.
    socket.close(1008, 'Read-only connection');
  }
  webSocketClose(socket, code, reason) {
    try { if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) socket.close(code, reason); else socket.close(); } catch {}
  }
  webSocketError(socket) { try { socket.close(1011, 'Reconnect'); } catch {} }
}
