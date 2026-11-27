import { apiFetch } from './static-api.js';
import { MATES, DEMOS } from './data.js';
import { UI, FIELDS, REACTIONS } from './ui-config.js';
import { MATE_ASSETS } from './mate-assets.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; };
const SCOPE = `hc-pages-${new URL('../', import.meta.url).pathname}`;
const KEY = `${SCOPE}-draft`, OWN = `${SCOPE}-own`;
const PENS = ['#304b5a', '#ce754a', '#81a9be', '#8ba38a', '#bd8fa4'];
const state = { cards: [], mine: null, current: null, view: 'world', paused: matchMedia('(prefers-reduced-motion: reduce)').matches, mateId: '', aspirationMateId: '', pickerTarget: 'mateId', strokes: [], pen: PENS[0], width: .012, signedIn: false, preview: false };
const walkers = new Map();
for (const [key, value] of Object.entries(UI.colors)) document.documentElement.style.setProperty(`--ui-${key}`, value);
function stored(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
function keep(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast('기기 저장 공간을 확인해 주세요.'); } }
function toast(message, duration = 3500) { const target = [...document.querySelectorAll('dialog[open]')].at(-1) || $('hc-root'); target.append($('toast')); $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden = true, duration); }
function notice(message) { $('connection-notice').textContent = message; $('connection-notice').hidden = !message; }
const mate = id => MATES.find(m => m.id === id);
const own = card => card && state.mine && card.id === state.mine.id;
function showDialog(node) { if (!node.open) node.showModal(); }
function drawStrokes(ctx, strokes, size, ox = 0, oy = 0) {
  ctx.save(); ctx.translate(ox, oy); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const stroke of strokes || []) {
    if (!stroke.points?.length) continue;
    ctx.fillStyle = ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.width * size; ctx.beginPath();
    const [x, y] = stroke.points[0];
    if (stroke.points.length === 1) { ctx.arc(x * size, y * size, ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.moveTo(x * size, y * size); for (const p of stroke.points.slice(1)) ctx.lineTo(p[0] * size, p[1] * size); ctx.stroke(); }
  }
  ctx.restore();
}
function portrait(card, forceMate = false) {
  const selected = mate(card.mateId); const out = el('span', 'mate-portrait');
  if (card.strokes?.length && !forceMate) {
    out.classList.add('drawn'); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 300; drawStrokes(canvas.getContext('2d'), card.strokes, 300);
    const img = el('img'); img.alt = `${card.name || ''}의 캐릭터`; img.src = canvas.toDataURL(); out.append(img);
  } else if (selected) {
    const asset = MATE_ASSETS[selected.id];
    if (asset) {
      out.classList.add('official-mate'); const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', asset.viewBox.join(' ')); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', selected.name);
      const image = document.createElementNS('http://www.w3.org/2000/svg', 'image'); image.setAttribute('href', new URL(asset.file, import.meta.url).href); image.setAttribute('width', asset.width); image.setAttribute('height', asset.height); svg.append(image); out.append(svg);
    }
  }
  return out;
}
function cards() {
  const real = [...state.cards]; if (state.mine && !real.some(c => c.id === state.mine.id)) real.unshift(state.mine);
  real.sort((a, b) => Number(own(b)) - Number(own(a))); return real.length ? real : DEMOS;
}
function destination() { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()); return { x: .5 + Math.cos(a) * r * .33, y: .755 + Math.sin(a) * r * .10 }; }
function renderGallery() {
  const profiles = cards(); $('avatars').replaceChildren(); $('card-grid').replaceChildren();
  for (const card of profiles) {
    const button = el('button', `avatar-button${own(card) ? ' mine' : ''}`); button.type = 'button'; button.setAttribute('aria-label', `${card.isDemo ? '예시 ' : ''}${card.name}의 카드 보기`);
    const art = el('span', 'avatar-art'); art.append(portrait(card)); button.append(art, el('span', 'avatar-name', card.name)); button.addEventListener('click', () => openProfile(card)); $('avatars').append(button);
    const old = walkers.get(card.id); const walker = { ...(old || destination()), goal: old?.goal || destination(), speed: old?.speed || UI.walking.minSpeed + Math.random() * (UI.walking.maxSpeed - UI.walking.minSpeed), wait: old?.wait || 0, nextPlay: old?.nextPlay ?? 2 + Math.random() * 8, playLeft: old?.playLeft || 0, play: old?.play || '', node: button, hover: false };
    button.addEventListener('pointerenter', () => walker.hover = true); button.addEventListener('pointerleave', () => walker.hover = false); walkers.set(card.id, walker);
    const tile = el('button', 'mini-card'); tile.type = 'button'; tile.setAttribute('aria-label', `${card.isDemo ? '예시 ' : ''}${card.name}의 카드 보기`); tile.append(portrait(card), el('strong', '', card.name)); tile.addEventListener('click', () => openProfile(card)); $('card-grid').append(tile);
  }
  for (const id of walkers.keys()) if (!profiles.some(c => c.id === id)) walkers.delete(id);
  $('world').hidden = state.view !== 'world'; $('card-grid').hidden = state.view !== 'grid'; $('motion-toggle').hidden = state.view !== 'world';
  $('motion-toggle').textContent = state.paused ? '▷' : 'Ⅱ'; $('motion-toggle').setAttribute('aria-label', state.paused ? '움직임 켜기' : '움직임 멈추기'); $('motion-toggle').title = state.paused ? '움직임 켜기' : '움직임 멈추기'; $('motion-toggle').setAttribute('aria-pressed', String(state.paused));
  for (const view of ['world', 'grid']) { $(`${view}-view`).classList.toggle('selected', state.view === view); $(`${view}-view`).setAttribute('aria-pressed', String(state.view === view)); }
  $('world').classList.toggle('paused', state.paused);
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.classList.add('hud-icon'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true'); const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', 'M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-1 9h8v-1a4 4 0 0 0-8 0v1Z'); path.setAttribute('fill', 'currentColor'); icon.append(path); $('dock-button').replaceChildren(icon, el('span', 'caption', state.mine ? '내 카드' : '내 카드 만들기'));
}
let frame = 0;
function walk(time) {
  const delta = Math.min((time - frame) / 1000, .05); frame = time; const w = $('island-stage').clientWidth, h = $('island-stage').clientHeight;
  const moving = !state.paused && !document.hidden && state.view === 'world' && !document.querySelector('dialog[open]');
  const first = walkers.values().next().value?.node; const anchorX = (first?.offsetWidth || 112) / 2, anchorY = first?.offsetHeight || 146;
  for (const a of walkers.values()) {
    const active = moving && !a.hover && document.activeElement !== a.node;
    if (active) {
      a.nextPlay -= delta; a.playLeft = Math.max(0, a.playLeft - delta);
      if (a.playLeft === 0) a.play = '';
      if (a.nextPlay <= 0) { const chance = Math.random(); a.play = chance < .35 ? 'hopping' : chance < .6 ? 'running' : 'dancing'; a.playLeft = a.play === 'hopping' ? .65 : a.play === 'dancing' ? 3.6 : 1.2 + Math.random(); a.nextPlay = 7 + Math.random() * 10; }
      if (a.play === 'dancing') { /* A short, stationary dance between walks. */ }
      else if (a.wait > 0) a.wait -= delta;
      else { const dx = (a.goal.x - a.x) * w, dy = (a.goal.y - a.y) * h, d = Math.hypot(dx, dy); if (d < 4) { a.goal = destination(); a.wait = .5 + Math.random() * UI.walking.pauseAtDestination; } else { const step = Math.min(d, a.speed * delta * (a.play === 'running' ? UI.walking.runMultiplier : 1)); a.x += dx / d * step / w; a.y += dy / d * step / h; } }
    }
    a.node.classList.toggle('is-hopping', active && a.play === 'hopping'); a.node.classList.toggle('is-running', active && a.play === 'running' && a.wait <= 0);
    a.node.classList.toggle('is-dancing', active && a.play === 'dancing');
    a.node.style.transform = `translate(${(a.x * w - anchorX).toFixed(1)}px,${(a.y * h - anchorY).toFixed(1)}px)`; a.node.style.zIndex = String(Math.round(a.y * 100));
  }
  requestAnimationFrame(walk);
}
async function refresh() {
  try {
    const response = await apiFetch('/api/cards', { cache: 'no-store' }); if (!response.ok) throw Error(); const data = await response.json(); if (!Array.isArray(data.cards)) throw Error();
    state.cards = data.cards.filter(c => typeof c.dopamine === 'string'); state.signedIn = !!data.signedIn; state.preview = !!data.preview;
    if (data.mine && typeof data.mine.dopamine === 'string') { state.mine = data.mine; keep(OWN, data.mine); }
    else if (!state.mine?.localOnly) { state.mine = null; keep(OWN, null); }
    notice('기기별 테스트 · 다른 기기와 카드·반응은 공유되지 않습니다.'); const key = JSON.stringify([state.cards, state.mine]); if (refresh.key !== key) { refresh.key = key; renderGallery(); }
  } catch { notice('연결을 확인하지 못했습니다.'); }
}

function currentDraft() { const d = { mateId: state.mateId, aspirationMateId: state.aspirationMateId, strokes: state.strokes }; for (const field of FIELDS) d[field.key] = $(field.id).value.trim(); return d; }
function isComplete() { return FIELDS.every(f => !f.required || $(f.id).value.trim()) && !!mate(state.mateId) && !!mate(state.aspirationMateId); }
function updateForm() {
  const complete = isComplete(); $('photo-lock').hidden = complete; $('character-preview').classList.toggle('locked', !complete); $('character-preview').setAttribute('aria-label', complete ? '내 캐릭터 그리기' : '모든 칸 작성 후 캐릭터 그리기'); $('preview-art').replaceChildren(portrait({ mateId: state.mateId, strokes: state.strokes }));
  $('choose-mate').textContent = mate(state.mateId) ? `${mate(state.mateId).name} · ${mate(state.mateId).value}` : '선택'; $('choose-aspiration').textContent = mate(state.aspirationMateId) ? `${mate(state.aspirationMateId).name} · ${mate(state.aspirationMateId).value}` : '선택';
  for (const field of FIELDS) { const counter = document.querySelector(`[data-count-for="${field.id}"]`); if (counter) counter.textContent = `${Array.from($(field.id).value).length}/${field.max}`; }
  keep(KEY, currentDraft());
}
function openEditor() {
  closeProfile(); const draft = stored(KEY) || state.mine || {}; for (const field of FIELDS) $(field.id).value = draft[field.key] || '';
  state.mateId = mate(draft.mateId) ? draft.mateId : ''; state.aspirationMateId = mate(draft.aspirationMateId) ? draft.aspirationMateId : ''; state.strokes = structuredClone(draft.strokes || []); $('form-error').hidden = true;
  updateForm(); redraw(); showDialog($('editor')); $('editor').scrollTop = 0;
}
function openPicker(target) {
  state.pickerTarget = target; $('mate-picker-title').textContent = target === 'mateId' ? '나를 대표하는 메이트' : '닮고 싶은 메이트'; $('mate-options').replaceChildren();
  for (const item of MATES) { const b = el('button', `mate-option${state[target] === item.id ? ' selected' : ''}`); b.type = 'button'; b.append(portrait({ mateId: item.id }), el('strong', '', item.name), el('small', '', `#${item.value}`), el('p', 'mate-desc', item.desc)); b.setAttribute('aria-pressed', String(state[target] === item.id)); b.addEventListener('click', () => { state[target] = item.id; updateForm(); $('mate-dialog').close(); }); $('mate-options').append(b); }
  showDialog($('mate-dialog'));
}
function openDrawing() {
  if (!isComplete()) { const lock = $('character-preview'); lock.classList.remove('is-shaking'); void lock.offsetWidth; lock.classList.add('is-shaking'); setTimeout(() => lock.classList.remove('is-shaking'), 500); toast('모든 칸을 전부 채운 후 마지막에 내 캐릭터를 그려주세요!', 5000); return; }
  $('reference-mate').replaceChildren(portrait({ mateId: state.mateId }, true), el('strong', '', mate(state.mateId).name), el('span', '', mate(state.mateId).value)); redraw(); showDialog($('character-dialog'));
}
async function submit(event) {
  event.preventDefault(); if (!$('profile-form').reportValidity() || !isComplete()) { $('form-error').textContent = '필수 문항과 두 메이트를 확인해 주세요.'; $('form-error').hidden = false; return; }
  const draft = currentDraft(); $('submit-profile').disabled = true; $('submit-profile').textContent = '저장 중'; let saved = false;
  try { const response = await apiFetch('/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); const result = await response.json(); if (response.ok) { state.mine = result.card; saved = true; } else if (response.status !== 401 && response.status !== 503) { $('form-error').textContent = result.error || '입력 내용을 확인해 주세요.'; $('form-error').hidden = false; return; } }
  catch { /* The full draft remains on this device until a shared save succeeds. */ }
  finally { $('submit-profile').disabled = false; $('submit-profile').textContent = '저장'; }
  if (!saved) state.mine = { ...draft, id: state.mine?.id || `local-${crypto.randomUUID()}`, localOnly: true };
  keep(OWN, state.mine); keep(KEY, draft); $('editor').close(); renderGallery(); openProfile(state.mine); toast(saved ? '저장했습니다.' : '이 기기에 임시 저장했습니다.');
  if (saved) await refresh(); else notice('공유 저장은 완료되지 않았습니다. 연결 후 다시 저장해 주세요.');
}

const canvas = $('drawing'), context = canvas.getContext('2d'); let pointer = null, activeStroke = null;
function redraw() { context.clearRect(0, 0, 600, 600); drawStrokes(context, state.strokes, 600); }
function point(event) { const r = canvas.getBoundingClientRect(); return [(event.clientX - r.left) / r.width, (event.clientY - r.top) / r.height].map(v => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000); }
canvas.addEventListener('pointerdown', e => { if (pointer !== null || !isComplete()) return; if (state.strokes.length >= 100 || state.strokes.reduce((n, s) => n + s.points.length, 0) >= 5900) return toast('그림이 복잡해졌어요. 일부를 지워주세요.'); e.preventDefault(); pointer = e.pointerId; canvas.setPointerCapture(pointer); activeStroke = { color: state.pen, width: state.width, points: [point(e)] }; state.strokes.push(activeStroke); redraw(); });
canvas.addEventListener('pointermove', e => { if (pointer !== e.pointerId || !activeStroke || activeStroke.points.length >= 600) return; const p = point(e), last = activeStroke.points.at(-1); if (Math.hypot(p[0] - last[0], p[1] - last[1]) < .002) return; if (state.strokes.reduce((n, s) => n + s.points.length, 0) < 6000) { activeStroke.points.push(p); redraw(); } });
function endStroke(e) { if (pointer !== e.pointerId) return; pointer = null; activeStroke = null; keep(KEY, currentDraft()); }
canvas.addEventListener('pointerup', endStroke); canvas.addEventListener('pointercancel', endStroke);
$('undo-drawing').addEventListener('click', () => { state.strokes.pop(); redraw(); updateForm(); }); $('clear-drawing').addEventListener('click', () => { state.strokes = []; redraw(); updateForm(); });
PENS.forEach((color, i) => { const b = el('button', `pen-color${!i ? ' selected' : ''}`); b.type = 'button'; b.style.setProperty('--pen-color', color); b.setAttribute('aria-label', ['남색 펜', '주황 펜', '하늘색 펜', '초록 펜', '분홍 펜'][i]); b.setAttribute('aria-pressed', String(!i)); b.addEventListener('click', () => { state.pen = color; for (const n of $('pen-colors').children) { n.classList.toggle('selected', n === b); n.setAttribute('aria-pressed', String(n === b)); } }); $('pen-colors').append(b); });
for (const [id, width] of [['thin-pen', .012], ['thick-pen', .03]]) $(id).addEventListener('click', () => { state.width = width; for (const other of ['thin-pen', 'thick-pen']) { $(other).classList.toggle('selected', other === id); $(other).setAttribute('aria-pressed', String(other === id)); } });

function section(parent, heading, value, extra) { const block = el('section', 'card-section'); const title = el('h3', '', heading); block.append(title); if (extra) block.append(extra); if (value) block.append(el('p', '', value)); parent.append(block); }
function openProfile(card) {
  stopReactions(); state.current = card; const current = mate(card.mateId), aspiration = mate(card.aspirationMateId), node = $('profile-card'); node.replaceChildren(); node.style.setProperty('--profile-color', current?.color || '#c7dbcc');
  const top = el('div', 'result-top'), heading = el('div', 'result-heading'); heading.append(el('h2', '', card.name)); if (card.jobInterest) heading.append(el('p', 'result-job', card.jobInterest)); top.append(portrait(card), heading); node.append(top);
  section(node, '요즘 나의 가장 큰 도파민은?', card.dopamine);
  section(node, `나를 보여주는 메이트 · ${current?.name || ''}`, card.experience, el('div', 'mate-value', `#${current?.value || ''}`));
  const aspirationLine = el('div', 'aspiration-line'); aspirationLine.append(portrait({ mateId: card.aspirationMateId }, true), el('strong', '', `${aspiration?.name || ''} · #${aspiration?.value || ''}`)); section(node, '앞으로 닮아가고 싶은 메이트', card.attempts, aspirationLine);
  section(node, '진로에 대한 고민이나 궁금증', card.concern);
  $('profile-kind').textContent = card.isDemo ? '예시 카드' : own(card) ? card.localOnly ? '기기 임시 저장' : '내 카드' : '';
  $('edit-profile').hidden = !own(card); $('save-image').hidden = !own(card); $('profile-dialog').classList.remove('presenting'); $('reaction-stage').replaceChildren(); showDialog($('profile-dialog')); $('profile-dialog').scrollTop = 0; startReactions(card);
}
function closeProfile() { if ($('profile-dialog').open) $('profile-dialog').close(); $('profile-dialog').classList.remove('presenting'); stopReactions(); }
function splitLines(c, text, width) { const lines = []; let line = ''; for (const char of Array.from(text || '')) { if (char === '\n') { lines.push(line); line = ''; } else if (c.measureText(line + char).width > width && line) { lines.push(line); line = char; } else line += char; } if (line) lines.push(line); return lines; }
async function saveImage() {
  const card = state.current; if (!card || !own(card)) return; const current = mate(card.mateId), aspiration = mate(card.aspirationMateId);
  await document.fonts.ready;
  const groups = [['요즘 나의 가장 큰 도파민은?', card.dopamine], [`나를 보여주는 메이트 · ${current.name} / #${current.value}`, card.experience], [`앞으로 닮아가고 싶은 메이트 · ${aspiration.name} / #${aspiration.value}`, card.attempts], ['진로에 대한 고민이나 궁금증', card.concern]];
  const out = document.createElement('canvas'); out.width = 1000; let c = out.getContext('2d');
  c.font = '800 62px HCDisplay, sans-serif'; const names = splitLines(c, card.name, 570); c.font = '32px sans-serif'; const jobs = splitLines(c, card.jobInterest || '', 570);
  const headerHeight = Math.max(245, 60 + names.length * 75 + jobs.length * 46);
  c.font = '44px sans-serif'; const layout = groups.map(([label, text]) => ({ label, lines: splitLines(c, text, 840) })); out.height = headerHeight + 155 + layout.reduce((n, s) => n + 130 + Math.max(1, s.lines.length) * 67, 0);
  c = out.getContext('2d'); c.fillStyle = '#fffdf6'; c.fillRect(0, 0, out.width, out.height); c.strokeStyle = '#d8ae7e'; c.lineWidth = 2; c.strokeRect(36, 36, 928, out.height - 72);
  c.fillStyle = '#ffe8c5'; c.fillRect(60, 60, 880, headerHeight);
  if (card.strokes?.length) drawStrokes(c, card.strokes, 210, 75, 75);
  else { const asset = MATE_ASSETS[current.id], source = new Image(); source.src = new URL(asset.file, import.meta.url).href; try { await source.decode(); const [x, y, w, h] = asset.viewBox, scale = Math.min(210 / w, 210 / h); c.drawImage(source, x, y, w, h, 75 + (210 - w * scale) / 2, 75 + (210 - h * scale) / 2, w * scale, h * scale); } catch { return toast('캐릭터를 불러오지 못했습니다.'); } }
  c.fillStyle = '#76502f'; c.font = '800 62px HCDisplay, sans-serif'; names.forEach((line, i) => c.fillText(line, 325, 140 + i * 75)); c.font = '32px sans-serif'; jobs.forEach((line, i) => c.fillText(line, 325, 140 + names.length * 75 + i * 46));
  let y = headerHeight + 105;
  for (const item of layout) { c.fillStyle = '#ffe8c5'; c.fillRect(60, y, 880, 61); c.fillStyle = '#87542c'; c.font = '800 29px HCDisplay, sans-serif'; c.fillText(item.label, 78, y + 42); y += 115; c.fillStyle = '#694c35'; c.font = '44px sans-serif'; for (const line of item.lines) { c.fillText(line, 80, y); y += 67; } if (!item.lines.length) y += 67; y += 15; }
  const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png')); if (!blob) return toast('이미지를 만들지 못했습니다.'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `HC_${card.name.replace(/[^\p{L}\p{N}_ -]/gu, '')}_자기소개카드.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); toast('이미지를 저장했습니다.');
}

let reactionTimer = null, reactionCursor = 'latest', reactionBusy = false, reactionGeneration = 0;
function stopReactions() { clearInterval(reactionTimer); reactionTimer = null; reactionGeneration++; }
function floatReaction(event) {
  if (!state.current || !REACTIONS[event.type]) return; positionReactions(); const bubble = el('div', 'reaction-float'); bubble.style.left = `${10 + Math.random() * 65}%`; bubble.append(portrait(event.actor), el('span', 'reaction-icon', REACTIONS[event.type]), el('span', 'reaction-name', event.actor.name)); $('reaction-stage').append(bubble); setTimeout(() => bubble.remove(), 4200);
}
function positionReactions() { $('reaction-stage').style.top = `${$('profile-dialog').scrollTop}px`; $('reaction-stage').style.height = `${$('profile-dialog').clientHeight}px`; }
async function pollReactions(generation = reactionGeneration) {
  if (!state.current || state.current.isDemo || state.current.localOnly || !document.querySelector('#profile-dialog[open]') || document.hidden) return;
  const id = state.current.id;
  try { const response = await apiFetch(`/api/reactions?cardId=${encodeURIComponent(id)}&after=${reactionCursor}`, { cache: 'no-store' }); if (!response.ok) return; const data = await response.json(); if (generation !== reactionGeneration || state.current?.id !== id) return; reactionCursor = data.cursor; for (const event of data.events || []) floatReaction(event); } catch { /* A later poll can recover transient connection failures. */ }
}
function startReactions(card) { reactionCursor = 'latest'; const generation = reactionGeneration; pollReactions(generation); if (!card.isDemo && !card.localOnly) reactionTimer = setInterval(() => pollReactions(generation), UI.reactionRefreshMs); }
async function sendReaction(type) {
  if (reactionBusy || !state.current) return;
  if (!state.mine) return toast('내 캐릭터 카드를 먼저 만들어 주세요.');
  if (state.current.isDemo || state.current.localOnly || state.preview) { floatReaction({ type, actor: state.mine }); return; }
  reactionBusy = true;
  try { const response = await apiFetch('/api/reactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId: state.current.id, type }) }); if (response.ok) await pollReactions(); else if (response.status === 429) toast('잠시 후 다시 눌러주세요.'); else toast('반응을 보내지 못했습니다.'); } catch { toast('연결을 확인해 주세요.'); } finally { setTimeout(() => reactionBusy = false, 800); }
}

for (const field of FIELDS) { $(field.id).maxLength = field.max; $(field.id).required = field.required; }
$('profile-form').addEventListener('input', updateForm); $('profile-form').addEventListener('submit', submit);
$('choose-mate').addEventListener('click', () => openPicker('mateId')); $('choose-aspiration').addEventListener('click', () => openPicker('aspirationMateId')); $('mate-close').addEventListener('click', () => $('mate-dialog').close());
$('character-preview').addEventListener('click', openDrawing); for (const id of ['character-close', 'character-done']) $(id).addEventListener('click', () => { updateForm(); $('character-dialog').close(); });
document.querySelector('.close-editor').addEventListener('click', () => $('editor').close()); $('close-profile').addEventListener('click', closeProfile); $('profile-dialog').addEventListener('close', stopReactions);
$('dock-button').addEventListener('click', () => state.mine ? openProfile(state.mine) : openEditor()); $('edit-profile').addEventListener('click', openEditor); $('save-image').addEventListener('click', saveImage); $('present-card').addEventListener('click', () => { $('profile-dialog').classList.add('presenting'); $('profile-dialog').scrollTop = 0; });
$('profile-dialog').addEventListener('scroll', positionReactions, { passive: true });
for (const view of ['world', 'grid']) $(`${view}-view`).addEventListener('click', () => { state.view = view; renderGallery(); }); $('motion-toggle').addEventListener('click', () => { state.paused = !state.paused; renderGallery(); });
$('qr-open').addEventListener('click', () => showDialog($('qr-dialog'))); $('qr-close').addEventListener('click', () => $('qr-dialog').close());
for (const button of document.querySelectorAll('[data-reaction]')) button.addEventListener('click', () => sendReaction(button.dataset.reaction));
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
state.mine = stored(OWN); renderGallery(); refresh(); requestAnimationFrame(walk); requestAnimationFrame(() => { $('world').scrollLeft = ($('island-stage').clientWidth - $('world').clientWidth) / 2; });
setInterval(() => { if (!document.hidden && !document.querySelector('#editor[open]')) refresh(); }, UI.sharedCardRefreshMs);
window.addEventListener('focus', refresh);

