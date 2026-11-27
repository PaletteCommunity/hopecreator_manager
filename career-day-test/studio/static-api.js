// GitHub Pages UI preview: device-local records, no participant data leaves this browser.
const storageKey = `hc-pages-${new URL('../', import.meta.url).pathname}-card`;
const limits = { name: 12, dopamine: 30, experience: 80, attempts: 40, concern: 60 };
const mates = new Set(['flame', 'wiz', 'vini', 'dutti', 'mini', 'inou', 'intoo', 'cloody', 'mmuni', 'inno']);
function load() { try { return JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch { return null; } }
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } }); }
function parse(payload) {
  const card = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof payload[key] !== 'string') throw Error('입력 내용을 확인해 주세요.');
    const text = payload[key].normalize('NFC').trim();
    if ((key !== 'attempts' && !text) || Array.from(text).length > max) throw Error('입력 글자 수를 확인해 주세요.'); card[key] = text;
  }
  if (!mates.has(payload.mateId) || !mates.has(payload.aspirationMateId)) throw Error('두 메이트를 선택해 주세요.');
  card.mateId = payload.mateId; card.aspirationMateId = payload.aspirationMateId;
  let points = 0;
  if (!Array.isArray(payload.strokes) || payload.strokes.length > 100) throw Error('그림 데이터를 확인해 주세요.');
  card.strokes = payload.strokes.map(s => {
    if (!/^#[0-9a-f]{6}$/i.test(s.color) || !Number.isFinite(s.width) || s.width < .002 || s.width > .1 || !Array.isArray(s.points) || !s.points.length) throw Error('그림 데이터를 확인해 주세요.');
    points += s.points.length; if (points > 6000) throw Error('그림이 너무 복잡합니다.');
    return { color: s.color, width: s.width, points: s.points.map(p => { if (!Array.isArray(p) || p.length !== 2 || p.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw Error('그림 데이터를 확인해 주세요.'); return [...p]; }) };
  });
  return card;
}
export async function apiFetch(resource, init = {}) {
  const pathname = new URL(resource, 'https://local-preview.invalid').pathname;
  if (pathname === '/api/cards') {
    if (!init.method || init.method === 'GET') { const mine = load(); return json({ cards: mine ? [mine] : [], mine, signedIn: true, preview: true }); }
    if (init.method === 'POST') {
      try { const fields = parse(JSON.parse(init.body)); const old = load(); const now = new Date().toISOString(); const card = { ...fields, id: old?.id || crypto.randomUUID(), createdAt: old?.createdAt || now, updatedAt: now }; localStorage.setItem(storageKey, JSON.stringify(card)); return json({ card }); }
      catch (error) { return json({ error: error.name === 'QuotaExceededError' ? '기기 저장 공간이 부족합니다.' : error.message }, 400); }
    }
  }
  if (pathname === '/api/reactions') return json({ events: [], cursor: 0 });
  return json({ error: '정적 테스트에서 지원하지 않는 기능입니다.' }, 404);
}
