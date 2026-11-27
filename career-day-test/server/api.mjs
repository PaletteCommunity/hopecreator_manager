const encoder = new TextEncoder();
const LIMITS = { name: 12, jobInterest: 30, dopamine: 30, experience: 80, attempts: 40, concern: 60 };
const MATES = new Set(['flame', 'wiz', 'vini', 'dutti', 'mini', 'inou', 'intoo', 'cloody', 'mmuni', 'inno']);
const TYPES = new Set(['empathy', 'cool', 'cheer', 'curious']);
const SESSION_MS = 8 * 60 * 60 * 1000;
const COOKIE = 'hc_admin';
const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g) || [], n => parseInt(n, 16));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function fail(status, message) { throw new HttpError(status, message); }
const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
const stmt = (db, sql, ...args) => db.prepare(sql).bind(...args);
const first = (db, sql, ...args) => stmt(db, sql, ...args).first();
const rows = async (db, sql, ...args) => (await stmt(db, sql, ...args).all()).results;
const changes = result => Number(result.meta?.changes || 0);
const publicCard = row => row ? { ...JSON.parse(row.data), id: row.id, createdAt: row.created_at, updatedAt: row.updated_at } : null;
async function announce(context, event) {
  if (!context.publish) return;
  const task = context.publish(event).catch(() => console.error('Live notification delivery failed'));
  if (context.waitUntil) context.waitUntil(task); else await task;
}

export async function makePasswordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw Error('관리자 비밀번호는 12~256자로 설정해 주세요.');
  const salt = random();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: 100000 }, key, 256);
  return `pbkdf2-sha256$100000$${salt}$${hex(hash)}`;
}
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length > 256) return false;
  const [, iterations, salt, expected] = stored.split('$');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: Number(iterations) }, key, 256));
  const wanted = unhex(expected); let diff = actual.length ^ wanted.length;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ (wanted[i] || 0);
  return diff === 0;
}
function passwordConfigured(env) { return /^pbkdf2-sha256\$100000\$[0-9a-f]{64}\$[0-9a-f]{64}$/.test(env.ADMIN_PASSWORD_HASH || ''); }
async function body(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail(415, 'JSON 형식으로 요청해 주세요.');
  if (Number(request.headers.get('content-length')) > 262144) fail(413, '입력 데이터가 너무 큽니다.');
  const reader = request.body?.getReader(); if (!reader) fail(400, '입력 내용을 확인해 주세요.');
  let length = 0; const chunks = [];
  while (true) { const part = await reader.read(); if (part.done) break; length += part.value.length; if (length > 262144) { await reader.cancel(); fail(413, '입력 데이터가 너무 큽니다.'); } chunks.push(part.value); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { const value = JSON.parse(new TextDecoder().decode(bytes)); if (!value || Array.isArray(value) || typeof value !== 'object') throw Error(); return value; } catch { fail(400, '입력 내용을 확인해 주세요.'); }
}
function parseCard(payload) {
  const card = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    if (typeof payload[key] !== 'string') fail(400, '모든 칸을 채워 주세요.');
    const value = payload[key].normalize('NFC').trim();
    if (!value || Array.from(value).length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail(400, '입력 글자 수와 내용을 확인해 주세요.');
    card[key] = value;
  }
  if (!MATES.has(payload.mateId) || !MATES.has(payload.aspirationMateId)) fail(400, '두 메이트를 선택해 주세요.');
  card.mateId = payload.mateId; card.aspirationMateId = payload.aspirationMateId;
  if (!Array.isArray(payload.strokes) || payload.strokes.length > 100) fail(400, '그림 데이터를 확인해 주세요.');
  let count = 0;
  card.strokes = payload.strokes.map(s => {
    if (!s || !/^#[0-9a-f]{6}$/i.test(s.color) || !Number.isFinite(s.width) || s.width < .002 || s.width > .1 || !Array.isArray(s.points) || !s.points.length) fail(400, '그림 데이터를 확인해 주세요.');
    count += s.points.length; if (count > 6000) fail(400, '그림이 너무 복잡합니다.');
    return { color: s.color, width: s.width, points: s.points.map(p => { if (!Array.isArray(p) || p.length !== 2 || p.some(n => !Number.isFinite(n) || n < 0 || n > 1)) fail(400, '그림 데이터를 확인해 주세요.'); return [...p]; }) };
  });
  return card;
}
async function owner(request) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([0-9a-f]{64})$/)?.[1];
  if (!token) fail(401, '기기 인증을 확인해 주세요. 새로고침 후 다시 시도해 주세요.');
  return digest(token);
}
async function rate(db, key, max, milliseconds) {
  const now = Date.now(), bucket = Math.floor(now / milliseconds);
  const result = await first(db, `INSERT INTO rate_limits(key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count`, `${key}:${bucket}`, (bucket + 1) * milliseconds);
  if (result.count > max) fail(429, '요청이 많습니다. 잠시 후 다시 시도해 주세요.');
}
const allowedOrigins = (env, origin) => new Set([origin, ...(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)]);
function requireAdminOrigin(request, origin) { if (request.headers.get('origin') !== origin) fail(403, '관리자 페이지에서 다시 시도해 주세요.'); }
async function session(request, db, required = true) {
  const token = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const current = token && /^[0-9a-f]{64}$/.test(token) ? await first(db, 'SELECT * FROM admin_sessions WHERE token_hash = ? AND expires_at > ?', await digest(token), Date.now()) : null;
  if (!current && required) fail(401, '관리자 로그인이 필요합니다.');
  return current;
}
function csrf(request, current) { if (request.headers.get('x-hc-csrf') !== current.csrf) fail(403, '로그인 상태를 새로 확인해 주세요.'); }
function cookie(token, url, maxAge = SESSION_MS / 1000) {
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
}

async function api(request, env, url, context) {
  const db = env.DB, route = url.pathname, method = request.method;
  if (!db) fail(503, '공유 저장소가 연결되지 않았습니다.');
  if (route === '/api/health' && method === 'GET') { await first(db, 'SELECT generation FROM island_state WHERE id = 1'); return json({ ok: true, shared: true }); }
  if (route.startsWith('/api/admin/')) {
    if (method !== 'GET') requireAdminOrigin(request, url.origin);
    if (!passwordConfigured(env)) fail(503, '관리자 비밀번호 설정이 필요합니다.');
    if (route === '/api/admin/login' && method === 'POST') {
      const ip = request.headers.get('cf-connecting-ip') || context.clientIp || 'unknown';
      await rate(db, `login:${await digest(ip)}`, 8, 15 * 60 * 1000);
      const input = await body(request);
      if (!await verifyPassword(input.password, env.ADMIN_PASSWORD_HASH)) fail(401, '비밀번호를 확인해 주세요.');
      const token = random(), secret = random(), expires = Date.now() + SESSION_MS;
      const old = await session(request, db, false);
      await db.batch([
        stmt(db, 'DELETE FROM admin_sessions WHERE expires_at <= ? OR token_hash = ?', Date.now(), old?.token_hash || ''),
        stmt(db, 'INSERT INTO admin_sessions(token_hash, csrf, expires_at) VALUES (?, ?, ?)', await digest(token), secret, expires),
        stmt(db, 'DELETE FROM rate_limits WHERE expires_at <= ?', Date.now()),
      ]);
      return json({ authenticated: true, csrf: secret, expiresAt: expires }, 200, { 'Set-Cookie': cookie(token, url) });
    }
    if (route === '/api/admin/session' && method === 'GET') {
      const current = await session(request, db, false);
      return json(current ? { authenticated: true, csrf: current.csrf, expiresAt: current.expires_at } : { authenticated: false });
    }
    const current = await session(request, db);
    if (method !== 'GET') csrf(request, current);
    if (route === '/api/admin/logout' && method === 'POST') { await stmt(db, 'DELETE FROM admin_sessions WHERE token_hash = ?', current.token_hash).run(); return json({ ok: true }, 200, { 'Set-Cookie': cookie('', url, 0) }); }
    if (route === '/api/admin/cards' && method === 'GET') {
      const snapshot = await db.batch([stmt(db, 'SELECT revision, generation FROM island_state WHERE id = 1'), stmt(db, 'SELECT id, data, created_at, updated_at FROM cards ORDER BY created_at DESC')]);
      return json({ ...snapshot[0].results[0], cards: snapshot[1].results.map(publicCard) });
    }
    const cardMatch = route.match(/^\/api\/admin\/cards\/([a-zA-Z0-9-]{1,80})$/);
    if (cardMatch && method === 'DELETE') {
      const input = await body(request);
      const result = await stmt(db, 'DELETE FROM cards WHERE id = ? AND updated_at = ?', cardMatch[1], String(input.updatedAt || '')).run();
      if (!changes(result)) fail(409, '카드가 변경되었거나 이미 삭제됐습니다. 목록을 새로 확인해 주세요.');
      await announce(context, { kind: 'cards' });
      return json({ deleted: true });
    }
    if (route === '/api/admin/cards' && method === 'DELETE') {
      const input = await body(request);
      if (input.confirmation !== '전체 삭제' || !Number.isSafeInteger(input.revision) || !Number.isSafeInteger(input.generation)) fail(400, '확인 문구를 정확히 입력해 주세요.');
      const nonce = random();
      const results = await db.batch([
        stmt(db, 'UPDATE island_state SET generation = generation + 1, purge_nonce = ? WHERE id = 1 AND revision = ? AND generation = ?', nonce, input.revision, input.generation),
        stmt(db, 'DELETE FROM cards WHERE EXISTS(SELECT 1 FROM island_state WHERE id = 1 AND purge_nonce = ?) RETURNING id', nonce),
        stmt(db, "UPDATE island_state SET purge_nonce = '' WHERE id = 1 AND purge_nonce = ?", nonce),
      ]);
      if (!changes(results[0])) fail(409, '목록이 변경됐습니다. 새로고침한 목록을 확인한 뒤 다시 삭제해 주세요.');
      await announce(context, { kind: 'cards' });
      // D1 meta.changes also counts cascades/triggers; RETURNING counts cards only.
      return json({ deleted: results[1].results.length });
    }
    fail(404, '관리자 요청을 찾지 못했습니다.');
  }
  if (route === '/api/cards') {
    const ownerHash = await owner(request);
    if (method === 'GET') {
      const current = await first(db, 'SELECT revision, generation FROM island_state WHERE id = 1');
      const currentEtag = `"${current.generation}-${current.revision}-${ownerHash.slice(0, 16)}"`;
      if (request.headers.get('if-none-match') === currentEtag) return new Response(null, { status: 304, headers: { ETag: currentEtag } });
      // A D1 batch gives the revision, generation and cards one consistent snapshot.
      const snapshot = await db.batch([stmt(db, 'SELECT revision, generation FROM island_state WHERE id = 1'), stmt(db, 'SELECT id, owner_hash, data, created_at, updated_at FROM cards ORDER BY created_at, id')]);
      const meta = snapshot[0].results[0], all = snapshot[1].results;
      const etag = `"${meta.generation}-${meta.revision}-${ownerHash.slice(0, 16)}"`;
      if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
      return json({ cards: all.map(publicCard), mine: publicCard(all.find(row => row.owner_hash === ownerHash)), signedIn: true, preview: false, ...meta }, 200, { ETag: etag });
    }
    if (method === 'POST') {
      await rate(db, `save:${ownerHash}`, 30, 60000);
      const fields = parseCard(await body(request)), generation = Number(request.headers.get('x-hc-generation'));
      if (!Number.isSafeInteger(generation) || generation < 1) fail(409, '섬을 새로고침한 뒤 다시 저장해 주세요.');
      const expected = request.headers.get('x-hc-card') || '';
      if (expected && !/^[a-zA-Z0-9-]{1,80}$/.test(expected)) fail(400, '카드 정보를 확인해 주세요.');
      const now = new Date().toISOString();
      const result = await stmt(db, `INSERT INTO cards(id, owner_hash, data, created_at, updated_at)
        SELECT ?, ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM island_state WHERE id = 1 AND generation = ?)
        AND (? = '' OR EXISTS(SELECT 1 FROM cards WHERE id = ? AND owner_hash = ?))
        AND (EXISTS(SELECT 1 FROM cards WHERE owner_hash = ?) OR (SELECT COUNT(*) FROM cards) < 500)
        ON CONFLICT(owner_hash) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        crypto.randomUUID(), ownerHash, JSON.stringify(fields), now, now, generation, expected, expected, ownerHash, ownerHash).run();
      if (!changes(result)) fail(409, '섬의 카드 상태가 변경됐습니다. 새로고침 후 다시 저장해 주세요. 초안은 기기에 남아 있습니다.');
      await announce(context, { kind: 'cards' });
      return json({ card: publicCard(await first(db, 'SELECT * FROM cards WHERE owner_hash = ?', ownerHash)) });
    }
  }
  if (route === '/api/reactions') {
    const ownerHash = await owner(request);
    if (method === 'GET') {
      const id = url.searchParams.get('cardId') || '', after = url.searchParams.get('after');
      if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) fail(400, '카드를 확인해 주세요.');
      if (!await first(db, 'SELECT id FROM cards WHERE id = ?', id)) fail(404, '삭제된 카드입니다.');
      const latest = (await first(db, "SELECT seq FROM sqlite_sequence WHERE name = 'reactions'"))?.seq || 0;
      if (after === 'latest') return json({ events: [], cursor: latest });
      const cursor = Number(after); if (!Number.isSafeInteger(cursor) || cursor < 0) fail(400, '반응 정보를 확인해 주세요.');
      const events = await rows(db, `SELECT r.id, r.type, r.created_at, c.id AS actor_id, c.data FROM reactions r JOIN cards c ON c.id = r.actor_id
        WHERE r.card_id = ? AND r.id > ? AND r.created_at >= ? ORDER BY r.id LIMIT 100`, id, cursor, Date.now() - 60000);
      return json({ events: events.map(row => ({ id: row.id, type: row.type, actor: { ...JSON.parse(row.data), id: row.actor_id } })), cursor: events.length === 100 ? events.at(-1).id : Math.max(cursor, latest, events.at(-1)?.id || 0) });
    }
    if (method === 'POST') {
      const input = await body(request); if (!TYPES.has(input.type) || typeof input.cardId !== 'string') fail(400, '반응을 확인해 주세요.');
      await rate(db, `reaction:${ownerHash}`, 12, 10000);
      const actor = await first(db, 'SELECT id, data FROM cards WHERE owner_hash = ?', ownerHash); if (!actor) fail(403, '내 카드를 먼저 저장해 주세요.');
      const result = await stmt(db, `INSERT INTO reactions(card_id, actor_id, type, created_at)
        SELECT ?, ?, ?, ? WHERE EXISTS(SELECT 1 FROM cards WHERE id = ?) AND EXISTS(SELECT 1 FROM cards WHERE id = ?)`, input.cardId, actor.id, input.type, Date.now(), input.cardId, actor.id).run();
      if (!changes(result)) fail(404, '삭제된 카드입니다.');
      const actorCard = JSON.parse(actor.data);
      await announce(context, { kind: 'reaction', cardId: input.cardId, event: { id: Number(result.meta.last_row_id), type: input.type, actor: { id: actor.id, name: actorCard.name, mateId: actorCard.mateId, strokes: actorCard.strokes } } });
      // Events are transient; keep at most one hour of reactions.
      const cleanup = db.batch([stmt(db, 'DELETE FROM reactions WHERE created_at < ?', Date.now() - 3600000), stmt(db, 'DELETE FROM rate_limits WHERE expires_at <= ?', Date.now())]);
      if (context.waitUntil) context.waitUntil(cleanup); else await cleanup;
      return json({ ok: true });
    }
  }
  fail(404, '요청을 찾지 못했습니다.');
}

export async function handleApi(request, env, context = {}) {
  const url = new URL(request.url), isAdmin = url.pathname.startsWith('/api/admin/');
  const origin = request.headers.get('origin'); let response;
  try {
    if (origin && (isAdmin ? origin !== url.origin : !allowedOrigins(env, url.origin).has(origin))) fail(403, '허용되지 않은 접속 경로입니다.');
    if (request.method === 'OPTIONS') {
      if (isAdmin) fail(403, '관리자 페이지에서 접속해 주세요.');
      response = new Response(null, { status: 204 });
    } else response = await api(request, env, url, context);
  } catch (error) {
    if (!(error instanceof HttpError)) console.error('Island API failure:', error.name);
    response = json({ error: error instanceof HttpError ? error.message : '서버 연결을 확인해 주세요.' }, error.status || 500);
  }
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store'); headers.set('X-Content-Type-Options', 'nosniff'); headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Vary', 'Origin');
  if (!isAdmin && origin && allowedOrigins(env, url.origin).has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-None-Match, X-HC-Generation, X-HC-Card');
    headers.set('Access-Control-Expose-Headers', 'ETag');
    headers.set('Access-Control-Max-Age', '600');
  }
  return new Response(response.body, { status: response.status, headers });
}
