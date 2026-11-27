import { apiFetch } from './static-api.js';
import { MATES, DEMOS } from './data.js';
import { UI, FIELDS, REACTIONS } from './ui-config.js';
import { MATE_ASSETS } from './mate-assets.js';
import { makeWalker, stepWorld } from './island-motion.js';
import { createProfileImage } from './profile-image.js';

const $ = id => document.getElementById(id);
const el = (tag, cls, value) => { const node = document.createElement(tag); if (cls) node.className = cls; if (value !== undefined) node.textContent = value; return node; };
const SCOPE = `hc-pages-${new URL('../', import.meta.url).pathname}`;
const KEY = `${SCOPE}-draft`, OWN = `${SCOPE}-own`;
const PENS = ['#304b5a', '#ce754a', '#81a9be', '#8ba38a', '#bd8fa4'];
const state = { cards: [], mine: null, current: null, view: 'world', paused: matchMedia('(prefers-reduced-motion: reduce)').matches, mateId: '', aspirationMateId: '', pickerTarget: 'mateId', strokes: [], pen: PENS[0], width: .012, signedIn: false, preview: false };
const walkers = new Map();
const EXTRA_DEMO_NAMES = ['귤조각', '작은등대', '모래별', '종이비행', '동그란꿈', '봄빛연구소', '밤하늘공방', '단단한새싹', '반짝호기심', '바다우체국', '아침노을', '호두연필', '오렌지파도', '두둥실', '말랑도전', '초록노트', '자유로운점', '오늘의발견', '보통의용기', '고요한리듬', '해바라기씨', '조각구름', '소다상상', '반달책상', '지구산책자', '내일한모금', '노란단추', '우연한발명', '첫번째용기', '가벼운시작', '구르는사과', '꿈꾸는빈칸'];
const SAMPLE_CARDS = [...DEMOS, ...EXTRA_DEMO_NAMES.map((name, i) => ({ ...DEMOS[i % DEMOS.length], id: `demo-${String(i + DEMOS.length + 1).padStart(2, '0')}`, name, isDemo: true }))];
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
  real.sort((a, b) => Number(own(b)) - Number(own(a))); return real.length ? real : SAMPLE_CARDS;
}
function renderGallery() {
  const profiles = cards(); $('avatars').replaceChildren(); $('card-grid').replaceChildren();
  for (const [index, card] of profiles.entries()) {
    const button = el('button', `avatar-button${own(card) ? ' mine' : ''}`); button.type = 'button'; button.setAttribute('aria-label', `${card.isDemo ? '예시 ' : ''}${card.name}의 카드 보기`);
    const art = el('span', 'avatar-art'); art.append(portrait(card)); const greeting = el('span', 'encounter-mark', '👋'); greeting.setAttribute('aria-hidden', 'true'); button.append(art, greeting, el('span', 'avatar-name', card.name)); button.addEventListener('click', () => openProfile(card)); $('avatars').append(button);
    const old = walkers.get(card.id); const walker = { ...(old || makeWalker(card.id, index, profiles.length, Math.random, UI.walking)), node: button, hover: false, focused: false };
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
  const crowd = [...walkers.values()]; for (const a of crowd) a.focused = document.activeElement === a.node;
  stepWorld(crowd, delta, w, h, { active: moving, walking: UI.walking });
  const first = crowd[0]?.node; const anchorX = (first?.offsetWidth || 70) / 2, anchorY = first?.offsetHeight || 94;
  for (const a of crowd) {
    const active = moving && !a.hover && !a.focused;
    a.node.classList.toggle('is-hopping', active && a.play === 'hopping'); a.node.classList.toggle('is-running', active && a.play === 'running' && a.wait <= 0);
    a.node.classList.toggle('is-dancing', active && a.play === 'dancing');
    a.node.classList.toggle('is-greeting', active && a.play === 'greeting'); a.node.style.setProperty('--facing', a.facing || 1);
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

function profileBlock(parent, type, label, value, selected) {
  const block = el('section', `story-block ${type}`), top = el('div', 'story-top'); top.append(el('h3', 'story-label', label));
  if (selected) { const tags = el('div', 'story-mates'), tag = el('span', 'mate-tag'), mini = el('span', 'mate-mini'); mini.append(portrait({ mateId: selected.id }, true)); tag.append(mini, el('span', '', `${selected.name} · #${selected.value}`)); tags.append(tag); top.append(tags); }
  block.append(top, el('p', 'story-text', value || '')); parent.append(block);
}
let profileFitFrame = 0;
function scheduleProfileFit() { cancelAnimationFrame(profileFitFrame); profileFitFrame = requestAnimationFrame(fitProfile); }
function fitProfile() {
  const dialog = $('profile-dialog'), node = $('profile-card'), viewport = $('profile-viewport'); if (!dialog.open) return;
  const variants = dialog.classList.contains('presenting') ? [[20,16,24,96],[19,14,20,92],[18,12,18,88],[17,10,16,80],[16,8,12,72]] : [[18,13,20,88]];
  let fits = false;
  for (const [font, gap, pad, size] of variants) {
    node.style.setProperty('--card-font-size', `${font}px`); node.style.setProperty('--card-gap', `${gap}px`); node.style.setProperty('--card-pad', `${pad}px`); node.style.setProperty('--portrait-size', `${size}px`);
    if (node.getBoundingClientRect().height <= viewport.clientHeight + 1) { fits = true; break; }
  }
  node.dataset.fit = fits ? 'screen' : 'scroll'; positionReactions();
}
function setPresentation(enabled) { $('profile-dialog').classList.toggle('presenting', enabled); $('present-card').textContent = enabled ? '기본 보기' : '크게 보기'; $('present-card').setAttribute('aria-pressed', String(enabled)); $('profile-viewport').scrollTop = 0; scheduleProfileFit(); }
function openProfile(card) {
  stopReactions(); state.current = card; const current = mate(card.mateId), aspiration = mate(card.aspirationMateId), node = $('profile-card'); node.replaceChildren();
  const top = el('header', 'card-identity'), heading = el('div', 'identity-copy'); heading.append(el('h2', '', card.name)); const job = el('p', 'identity-job', card.jobInterest || ''); job.setAttribute('aria-label', `관심 직무 ${card.jobInterest || ''}`); heading.append(job); top.append(portrait(card), heading); node.append(top);
  const body = el('div', 'card-body'); profileBlock(body, 'dopamine', '요즘 나의 도파민', card.dopamine); profileBlock(body, 'current', '나를 보여주는 경험', card.experience, current); profileBlock(body, 'aspiration', '앞으로 닮고 싶은 모습', card.attempts, aspiration); profileBlock(body, 'concern', '진로 고민 · 궁금한 점', card.concern); node.append(body);
  $('profile-kind').textContent = card.isDemo ? '예시 카드' : own(card) ? card.localOnly ? '기기 임시 저장' : '내 카드' : '';
  $('edit-profile').hidden = !own(card); $('save-image').hidden = !own(card); setPresentation(false); $('reaction-stage').replaceChildren(); showDialog($('profile-dialog')); $('profile-viewport').scrollTop = 0; scheduleProfileFit(); document.fonts.ready.then(scheduleProfileFit); startReactions(card);
}
function closeProfile() { if ($('profile-dialog').open) $('profile-dialog').close(); setPresentation(false); stopReactions(); }
async function saveImage() {
  const card = state.current; if (!card || !own(card)) return; let out;
  try { out = await createProfileImage(card, { mates: MATES, assets: MATE_ASSETS, drawStrokes }); } catch { return toast('카드 이미지를 만들지 못했습니다. 다시 시도해 주세요.'); }
  const blob = await new Promise(resolve => out.toBlob(resolve, 'image/png')); if (!blob) return toast('이미지를 만들지 못했습니다.'); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `HC_${card.name.replace(/[^\p{L}\p{N}_ -]/gu, '')}_자기소개카드.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); toast('이미지를 저장했습니다.');
}

let reactionTimer = null, reactionCursor = 'latest', reactionBusy = false, reactionGeneration = 0;
function stopReactions() { clearInterval(reactionTimer); reactionTimer = null; reactionGeneration++; }
function floatReaction(event) {
  if (!state.current || !REACTIONS[event.type]) return; positionReactions(); const bubble = el('div', 'reaction-float'); bubble.style.left = `${10 + Math.random() * 65}%`; bubble.append(portrait(event.actor), el('span', 'reaction-icon', REACTIONS[event.type]), el('span', 'reaction-name', event.actor.name)); $('reaction-stage').append(bubble); setTimeout(() => bubble.remove(), 4200);
}
function positionReactions() { const viewport = $('profile-viewport'); $('reaction-stage').style.top = `${viewport.offsetTop}px`; $('reaction-stage').style.height = `${viewport.clientHeight}px`; }
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
$('dock-button').addEventListener('click', () => state.mine ? openProfile(state.mine) : openEditor()); $('edit-profile').addEventListener('click', openEditor); $('save-image').addEventListener('click', saveImage); $('present-card').addEventListener('click', () => setPresentation(!$('profile-dialog').classList.contains('presenting')));
$('profile-viewport').addEventListener('scroll', positionReactions, { passive: true }); new ResizeObserver(scheduleProfileFit).observe($('profile-viewport')); window.addEventListener('resize', scheduleProfileFit); window.visualViewport?.addEventListener('resize', scheduleProfileFit); document.fonts.addEventListener('loadingdone', scheduleProfileFit);
for (const view of ['world', 'grid']) $(`${view}-view`).addEventListener('click', () => { state.view = view; renderGallery(); }); $('motion-toggle').addEventListener('click', () => { state.paused = !state.paused; renderGallery(); });
$('qr-open').addEventListener('click', () => showDialog($('qr-dialog'))); $('qr-close').addEventListener('click', () => $('qr-dialog').close());
for (const button of document.querySelectorAll('[data-reaction]')) button.addEventListener('click', () => sendReaction(button.dataset.reaction));
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
state.mine = stored(OWN); renderGallery(); refresh(); requestAnimationFrame(walk); requestAnimationFrame(() => { const world = $('world'), stage = $('island-stage'); world.scrollLeft = (stage.clientWidth - world.clientWidth) / 2; world.scrollTop = Math.max(0, stage.clientHeight * .64 - world.clientHeight * .58); });
setInterval(() => { if (!document.hidden && !document.querySelector('#editor[open]')) refresh(); }, UI.sharedCardRefreshMs);
window.addEventListener('focus', refresh);

