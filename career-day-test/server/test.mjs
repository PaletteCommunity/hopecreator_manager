import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createIslandServer } from './node.mjs';
import { makePasswordHash } from './api.mjs';

const password = `test-${crypto.randomUUID()}`, passwordHash = await makePasswordHash(password);
const folder = await mkdtemp(path.join(os.tmpdir(), 'hc-server-test-'));
const databasePath = path.join(folder, 'test.sqlite');
let app = await createIslandServer({ databasePath, adminPasswordHash: passwordHash, allowedOrigins: 'https://palettecommunity.github.io' });
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks++; };
const fixture = { name: '함께만드는별', jobInterest: '게임 기획', dopamine: '그림 그리기', experience: '친구의 의견을 듣고 함께 프로젝트를 완성했어요.', attempts: '작은 프로젝트를 준비하고 있어요.', concern: '관심 분야의 실무가 궁금해요.', mateId: 'mmuni', aspirationMateId: 'inno', strokes: [{ color: '#304b5a', width: .012, points: [[.1, .2], [.3, .4]] }] };
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
const a = token(), b = token(); let cookie = '', csrf = '';
async function request(route, { method = 'GET', data, actor, admin = false, headers = {} } = {}) {
  const response = await fetch(`${app.url}${route}`, { method, headers: { ...(actor ? { Authorization: `Bearer ${actor}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}), ...(admin ? { Cookie: cookie, Origin: app.url, 'X-HC-CSRF': csrf } : {}), ...headers }, ...(data ? { body: JSON.stringify(data) } : {}), redirect: 'manual' });
  const body = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text();
  return { response, body, status: response.status };
}
async function save(actor, fields = fixture, generation = 1, expected = '') { return request('/api/cards', { actor, method: 'POST', data: fields, headers: { 'X-HC-Generation': String(generation), ...(expected ? { 'X-HC-Card': expected } : {}) } }); }
async function login() {
  const result = await request('/api/admin/login', { method: 'POST', data: { password }, headers: { Origin: app.url } });
  check(result.status === 200, 'correct password signs in'); cookie = result.response.headers.get('set-cookie').split(';')[0]; csrf = result.body.csrf;
  check(result.response.headers.get('set-cookie').includes('HttpOnly') && result.response.headers.get('set-cookie').includes('SameSite=Strict'), 'admin cookie is protected');
}
try {
  check((await request('/api/health')).body.shared === true, 'server is ready');
  check((await request('/api/cards')).status === 401, 'participant token is required');
  check((await request('/api/admin/cards')).status === 401, 'card administration requires login');
  check((await request('/api/admin/cards', { method: 'DELETE', data: { confirmation: '전체 삭제' }, actor: a, headers: { Origin: app.url } })).status === 401, 'participant token cannot grant admin deletion');
  check((await request('/api/admin/session')).body.authenticated === false, 'anonymous session reveals no data');
  check((await request('/server/api.mjs')).status === 404, 'server source is not served');
  check((await request('/server/schema.sql')).status === 404, 'database schema is not served');
  check((await request('/work/test.sqlite')).status === 404, 'database files are not served');
  check((await request('/studio/server-config.js')).body.includes(app.url), 'runtime config points at the shared server');
  check((await request('/admin/')).status === 200, 'admin login shell loads');
  check((await request('/')).body.includes("connect-src 'self'"), 'participant CSP permits same-origin API');
  let result = await save(a); check(result.status === 200, 'first participant can save'); const idA = result.body.card.id;
  result = await save(b, { ...fixture, name: '두번째메이트' }); check(result.status === 200, 'second participant can save'); const idB = result.body.card.id;
  result = await request('/api/cards', { actor: a }); check(result.body.cards.length === 2 && result.body.mine.id === idA, 'device A sees both shared cards and owns A');
  check(!JSON.stringify(result.body).includes('owner_hash') && !JSON.stringify(result.body).includes(a), 'ownership secrets stay private');
  const etag = result.response.headers.get('etag'); check((await request('/api/cards', { actor: a, headers: { 'If-None-Match': etag } })).status === 304, 'unchanged cards support conditional refresh');
  result = await request('/api/cards', { actor: b }); check(result.body.mine.id === idB, 'device B owns only B');
  check((await save(b, fixture, 1, idA)).status === 409, 'another device cannot edit A');
  check((await save(a, { ...fixture, name: 'x'.repeat(13) }, 1, idA)).status === 400, 'server enforces text limit');
  check((await save(a, { ...fixture, strokes: [{ ...fixture.strokes[0], points: [[2, 0]] }] }, 1, idA)).status === 400, 'server validates drawing bounds');
  result = await save(a, { ...fixture, name: '<img src=x>' }, 1, idA); check(result.status === 200 && result.body.card.id === idA, 'saving updates the same owned card and preserves text');
  check((await request('/api/cards', { actor: a, headers: { Origin: 'https://untrusted.invalid' } })).status === 403, 'untrusted cross-origin access is rejected');
  result = await request('/api/cards', { method: 'OPTIONS', headers: { Origin: 'https://palettecommunity.github.io', 'Access-Control-Request-Method': 'POST' } });
  check(result.status === 204 && result.response.headers.get('access-control-allow-origin') === 'https://palettecommunity.github.io', 'GitHub Pages preflight is allowed');
  result = await request(`/api/reactions?cardId=${idA}&after=latest`, { actor: a }); const cursor = result.body.cursor;
  check((await request('/api/reactions', { method: 'POST', actor: b, data: { cardId: idA, type: 'cheer' } })).status === 200, 'device B sends a real reaction');
  result = await request(`/api/reactions?cardId=${idA}&after=${cursor}`, { actor: a });
  check(result.body.events.length === 1 && result.body.events[0].actor.id === idB && result.body.events[0].type === 'cheer', 'device A receives B’s reaction');
  check((await request('/api/reactions', { method: 'POST', actor: b, data: { cardId: idA, type: 'invalid' } })).status === 400, 'invalid reaction is rejected');
  check((await request('/api/admin/login', { method: 'POST', data: { password: 'wrong' }, headers: { Origin: app.url } })).status === 401, 'wrong password is rejected');
  check((await request('/api/admin/login', { method: 'POST', data: { password }, headers: { Origin: 'https://palettecommunity.github.io' } })).status === 403, 'admin login is same-origin only');
  await login();
  result = await request('/api/admin/cards', { admin: true }); check(result.body.cards.length === 2, 'signed-in admin can list shared cards'); let snapshot = result.body;
  check((await request('/api/admin/cards', { method: 'DELETE', data: { confirmation: '전체 삭제', revision: snapshot.revision, generation: 1 }, headers: { Cookie: cookie, Origin: app.url } })).status === 403, 'admin deletion requires CSRF token');
  check((await request('/api/admin/cards', { method: 'DELETE', data: { confirmation: '삭제' }, admin: true })).status === 400, 'bulk deletion requires exact confirmation');
  await save(b, { ...fixture, name: '수정된메이트' }, 1, idB);
  check((await request('/api/admin/cards', { method: 'DELETE', data: { confirmation: '전체 삭제', revision: snapshot.revision, generation: snapshot.generation }, admin: true })).status === 409, 'bulk deletion rejects an out-of-date list');
  check((await request(`/api/admin/cards/${idB}`, { method: 'DELETE', data: { updatedAt: snapshot.cards.find(c => c.id === idB).updatedAt }, admin: true })).status === 409, 'individual deletion rejects a changed card');
  snapshot = (await request('/api/admin/cards', { admin: true })).body;
  result = await request(`/api/admin/cards/${idB}`, { method: 'DELETE', data: { updatedAt: snapshot.cards.find(c => c.id === idB).updatedAt }, admin: true }); check(result.status === 200, 'admin deletes an individual character');
  result = await request('/api/cards', { actor: b }); check(result.body.mine === null && result.body.cards.length === 1, 'deleted character is gone from every device');
  result = await request(`/api/reactions?cardId=${idA}&after=0`, { actor: a }); check(result.body.events.length === 0, 'deleted actor reactions are removed');
  check((await save(b, fixture, 1, idB)).status === 409, 'an open stale editor cannot restore an individually deleted card');
  await save(b, fixture, 1);
  snapshot = (await request('/api/admin/cards', { admin: true })).body;
  result = await request('/api/admin/cards', { method: 'DELETE', data: { confirmation: '전체 삭제', revision: snapshot.revision, generation: snapshot.generation }, admin: true }); check(result.status === 200 && result.body.deleted === 2, 'admin deletes all cards atomically');
  result = await request('/api/cards', { actor: a }); check(result.body.cards.length === 0 && result.body.mine === null && result.body.generation === 2, 'all clients receive empty shared state after reset');
  check((await save(a, fixture, 1)).status === 409, 'an open stale editor cannot restore cards after reset');
  check((await save(a, fixture, 2)).status === 200, 'participant can deliberately create a new card after refreshing');
  await app.close(); app = await createIslandServer({ databasePath, adminPasswordHash: passwordHash });
  result = await request('/api/cards', { actor: a }); check(result.body.cards.length === 1 && result.body.mine.name === fixture.name, 'cards persist after a server restart');
  check((await request('/api/admin/session', { admin: true })).body.authenticated === true, 'admin session survives a server restart');
  check((await request('/api/admin/logout', { method: 'POST', data: {}, admin: true })).status === 200, 'logout invalidates the admin session');
  check((await request('/api/admin/cards', { admin: true })).status === 401, 'logged-out session cannot read admin cards');
  await login(); await app.DB.prepare('UPDATE admin_sessions SET expires_at = 0').bind().run();
  check((await request('/api/admin/cards', { admin: true })).status === 401, 'expired sessions cannot administer cards');
  for (let i = 0; i < 8; i++) await request('/api/admin/login', { method: 'POST', data: { password: 'wrong' }, headers: { Origin: app.url } });
  check((await request('/api/admin/login', { method: 'POST', data: { password }, headers: { Origin: app.url } })).status === 429, 'login attempts are rate limited');
  console.log(`PASS ${checks} server checks: two devices, ownership, real reactions, admin access, CSRF, individual/bulk deletion, reset conflicts, persistence, logout and expiry.`);
} finally { await app.close(); await rm(folder, { recursive: true, force: true }); }
