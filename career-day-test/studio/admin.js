import { API_BASE } from './server-config.js';
import { MATES } from './data.js';
import { MATE_ASSETS } from './mate-assets.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; };
let csrf = '', snapshot = null, pending = null, busy = false, refreshing = false, authenticated = false;
function message(id, text = '') { $(id).textContent = text; $(id).hidden = !text; }
function status(text) { message('admin-status', text); clearTimeout(status.timer); status.timer = setTimeout(() => message('admin-status'), 4500); }
function showLogin() {
  authenticated = false; csrf = ''; snapshot = null; pending = null;
  $('management').hidden = true; $('login-panel').hidden = false; $('admin-cards').replaceChildren(); $('detail-content').replaceChildren(); $('detail-name').textContent = '';
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
}
async function request(route, { method = 'GET', data } = {}) {
  const response = await fetch(route, { method, credentials: 'same-origin', cache: 'no-store', headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' && csrf ? { 'X-HC-CSRF': csrf } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15000) });
  const result = await response.json();
  if (!response.ok) { if (response.status === 401 && route !== '/api/admin/login') { showLogin(); message('login-error', '로그인이 만료됐습니다. 다시 로그인해 주세요.'); } const error = Error(result.error || '요청을 처리하지 못했습니다.'); error.status = response.status; throw error; }
  return result;
}
function portrait(card) {
  const box = el('div', 'portrait');
  if (card.strokes?.length) {
    const canvas = el('canvas'); canvas.width = canvas.height = 252; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${card.name}의 캐릭터`); const ctx = canvas.getContext('2d'); ctx.lineCap = ctx.lineJoin = 'round';
    for (const stroke of card.strokes) { ctx.strokeStyle = ctx.fillStyle = stroke.color; ctx.lineWidth = stroke.width * 252; ctx.beginPath(); const [x, y] = stroke.points[0]; if (stroke.points.length === 1) { ctx.arc(x * 252, y * 252, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); } else { ctx.moveTo(x * 252, y * 252); for (const [px, py] of stroke.points.slice(1)) ctx.lineTo(px * 252, py * 252); ctx.stroke(); } }
    box.append(canvas);
  } else if (MATE_ASSETS[card.mateId]) {
    const asset = MATE_ASSETS[card.mateId], ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), image = document.createElementNS(ns, 'image');
    svg.setAttribute('viewBox', asset.viewBox.join(' ')); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', MATES.find(m => m.id === card.mateId)?.name || '캐릭터');
    image.setAttribute('href', new URL(asset.file, import.meta.url).href); image.setAttribute('width', asset.width); image.setAttribute('height', asset.height); svg.append(image); box.append(svg);
  }
  return box;
}
function details(card) {
  $('detail-name').textContent = card.name; const content = $('detail-content'); content.replaceChildren(portrait(card), el('p', 'job', card.jobInterest));
  for (const [label, text] of [['나를 보여주는 경험', card.experience], ['앞으로 닮고 싶은 모습', card.attempts], ['진로 고민 · 궁금한 점', card.concern], ['요즘 나의 도파민', card.dopamine]]) { const section = el('section'); section.append(el('h3', '', label), el('p', '', text)); content.append(section); }
  $('detail-dialog').showModal();
}
function render() {
  $('card-count').textContent = `등록된 캐릭터 ${snapshot.cards.length}개`; $('empty-message').hidden = snapshot.cards.length !== 0; $('delete-all-button').disabled = snapshot.cards.length === 0;
  const fragment = document.createDocumentFragment();
  for (const card of snapshot.cards) {
    const tile = el('article', 'admin-card'), actions = el('div', 'card-actions'); const view = el('button', '', '카드 보기'), remove = el('button', 'danger-outline', '삭제'); view.type = remove.type = 'button';
    view.addEventListener('click', () => details(card)); remove.setAttribute('aria-label', `${card.name} 캐릭터 삭제`); remove.addEventListener('click', () => confirm(card)); actions.append(view, remove);
    const updated = new Date(card.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    tile.append(portrait(card), el('h2', '', card.name), el('p', 'job', card.jobInterest), el('p', 'updated', `${updated} 수정`), actions); fragment.append(tile);
  }
  $('admin-cards').replaceChildren(fragment); $('last-refresh').textContent = `${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} 확인`;
}
async function refresh() {
  if (refreshing || !authenticated) return;
  refreshing = true; $('refresh-button').disabled = true;
  try { const data = await request('/api/admin/cards'); if (!authenticated) return; snapshot = data; render(); message('management-error'); }
  catch (error) { if (authenticated) message('management-error', error.message || '연결을 확인해 주세요.'); }
  finally { refreshing = false; $('refresh-button').disabled = false; }
}
function confirm(card = null) {
  if (!snapshot || busy) return;
  pending = card ? { card } : { revision: snapshot.revision, generation: snapshot.generation, count: snapshot.cards.length };
  $('delete-title').textContent = card ? '캐릭터 삭제' : '전체 삭제';
  $('delete-description').textContent = card ? `‘${card.name}’ 캐릭터와 소개 카드, 이 캐릭터가 주고받은 반응을 삭제합니다.\n삭제한 내용은 되돌릴 수 없습니다.` : `등록된 캐릭터 ${pending.count}개와 모든 소개 카드·반응을 삭제합니다.\n삭제한 내용은 되돌릴 수 없습니다.`;
  $('confirmation-field').hidden = !!card; $('delete-confirmation').value = ''; $('delete-confirmation').required = !card; $('confirm-delete').textContent = card ? '삭제' : '전체 삭제'; $('confirm-delete').disabled = !card; message('delete-error'); $('delete-dialog').showModal();
}
$('delete-confirmation').addEventListener('input', () => $('confirm-delete').disabled = $('delete-confirmation').value !== '전체 삭제');
$('cancel-delete').addEventListener('click', () => { if (!busy) $('delete-dialog').close(); });
$('delete-dialog').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('delete-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !pending) return;
  if (!pending.card && $('delete-confirmation').value !== '전체 삭제') return;
  const target = pending; busy = true; $('confirm-delete').disabled = $('cancel-delete').disabled = true; $('confirm-delete').textContent = '삭제 중';
  try {
    await request(target.card ? `/api/admin/cards/${encodeURIComponent(target.card.id)}` : '/api/admin/cards', { method: 'DELETE', data: target.card ? { updatedAt: target.card.updatedAt } : { confirmation: '전체 삭제', revision: target.revision, generation: target.generation } });
    $('delete-dialog').close(); pending = null; status(target.card ? '캐릭터를 삭제했습니다.' : '전체 삭제했습니다.'); await refresh();
  } catch (error) {
    if (authenticated) { if (error.status === 409) { $('delete-dialog').close(); pending = null; await refresh(); message('management-error', error.message); } else message('delete-error', error.message || '삭제 결과를 확인하지 못했습니다. 목록을 새로 확인해 주세요.'); }
  } finally { busy = false; $('cancel-delete').disabled = false; $('confirm-delete').textContent = target.card ? '삭제' : '전체 삭제'; $('confirm-delete').disabled = !target.card && $('delete-confirmation').value !== '전체 삭제'; }
});
$('login-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return; busy = true; $('login-button').disabled = true; message('login-error');
  try { const data = await request('/api/admin/login', { method: 'POST', data: { password: $('admin-password').value } }); csrf = data.csrf; authenticated = true; $('admin-password').value = ''; $('login-panel').hidden = true; $('management').hidden = false; await refresh(); }
  catch (error) { message('login-error', error.message || '연결을 확인해 주세요.'); }
  finally { busy = false; $('login-button').disabled = false; }
});
$('logout-button').addEventListener('click', async () => {
  $('logout-button').disabled = true;
  try { await request('/api/admin/logout', { method: 'POST', data: {} }); showLogin(); $('admin-password').focus(); }
  catch (error) { if (authenticated) message('management-error', error.message || '로그아웃하지 못했습니다. 다시 시도해 주세요.'); }
  finally { $('logout-button').disabled = false; }
});
$('refresh-button').addEventListener('click', refresh); $('delete-all-button').addEventListener('click', () => confirm()); $('close-detail').addEventListener('click', () => $('detail-dialog').close());
async function initialize() {
  if (!API_BASE) { $('login-button').disabled = true; message('login-error', '공유 서버 연결이 준비되지 않았습니다.'); return; }
  const destination = new URL(API_BASE);
  if (destination.origin !== location.origin) { location.replace(new URL('/admin/', destination)); return; }
  try { const data = await request('/api/admin/session'); if (data.authenticated) { csrf = data.csrf; authenticated = true; $('login-panel').hidden = true; $('management').hidden = false; await refresh(); } }
  catch (error) { message('login-error', error.message || '서버 연결을 확인해 주세요.'); }
}
initialize();
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]') && !busy) refresh(); }, 10000);
window.addEventListener('focus', () => { if (!document.querySelector('dialog[open]') && !busy) refresh(); });
