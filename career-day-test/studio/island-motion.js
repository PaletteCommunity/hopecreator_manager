// Foot positions are normalized to the island, independent of the DOM or zoom.
export const WALK_AREA = Object.freeze({ cx: .5, cy: .64, rx: .39, ry: .22 });
export const MOTION = Object.freeze({ encounterDistance: 84, personalSpace: 94, minimumSpace: 54, greetingSeconds: 1.65, greetingCooldown: 12, runMultiplier: 2.4 });
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function inside(point, margin = .96) {
  const { cx, cy, rx, ry } = WALK_AREA;
  let nx = (point.x - cx) / rx, ny = (point.y - cy) / ry;
  const radius = Math.hypot(nx, ny);
  if (radius > margin) { nx *= margin / radius; ny *= margin / radius; }
  return { x: cx + nx * rx, y: cy + ny * ry };
}
function randomPoint(random) {
  const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * .94;
  const { cx, cy, rx, ry } = WALK_AREA;
  return { x: cx + Math.cos(angle) * radius * rx, y: cy + Math.sin(angle) * radius * ry };
}
function initialSlots() {
  // Fifty 100 px-spaced hexagonal seats, spread over the whole 1600 x 1040 island.
  const slots = [], rows = [8, 11, 12, 11, 8];
  rows.forEach((count, row) => {
    for (let col = 0; col < count; col++) slots.push({ x: .5 + (col - (count - 1) / 2) * 100 / 1600, y: .64 + (row - 2) * 86.6025403784 / 1040 });
  });
  return slots;
}
const SLOTS = initialSlots();

export function makeWalker(id, index = 0, count = 50, random = Math.random, walking = { minSpeed: 12, maxSpeed: 21 }) {
  const n = Math.max(1, Math.floor(count)), i = Math.max(0, Math.floor(index));
  const point = n === 1 ? { x: .5, y: .64 } : n <= 50
    ? SLOTS[Math.min(49, Math.floor((i % n + .5) * 50 / n))]
    : inside({ x: .5 + Math.cos(i * GOLDEN_ANGLE) * Math.sqrt((i + .5) / n) * .39 * .93, y: .64 + Math.sin(i * GOLDEN_ANGLE) * Math.sqrt((i + .5) / n) * .22 * .93 });
  return {
    id, x: point.x, y: point.y, goal: randomPoint(random), speed: walking.minSpeed + random() * (walking.maxSpeed - walking.minSpeed),
    wait: random() * 1.5, nextPlay: 3 + random() * 10, play: '', playLeft: 0,
    facing: i % 2 ? -1 : 1, greetingWith: null, greetingLeft: 0,
    greetingCooldown: 1 + random() * 3, hover: false, focused: false,
  };
}

const blocked = walker => !!(walker.hover || walker.focused);
const pxDistance = (a, b, width, height) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);

function chooseGoal(walker, list, width, height, random) {
  let best = randomPoint(random), bestSpace = -1;
  for (let attempt = 0; attempt < 9; attempt++) {
    const point = randomPoint(random);
    let space = Infinity;
    for (const other of list) if (other !== walker) space = Math.min(space, pxDistance(point, other, width, height));
    if (space > bestSpace) { bestSpace = space; best = point; }
    if (space >= MOTION.personalSpace * 1.25) break;
  }
  return best;
}
function finishGreeting(walker, partner, width, height, random) {
  walker.greetingWith = null; walker.greetingLeft = 0; walker.greetingCooldown = MOTION.greetingCooldown;
  walker.play = ''; walker.playLeft = 0; walker.nextPlay = 3 + random() * 6;
  if (partner) {
    let dx = (walker.x - partner.x) * width, dy = (walker.y - partner.y) * height;
    const length = Math.hypot(dx, dy) || 1;
    if (Math.abs(dx) + Math.abs(dy) < 1) dx = walker.facing;
    walker.goal = inside({ x: walker.x + dx / length * 150 / width, y: walker.y + dy / length * 150 / height });
  } else walker.goal = randomPoint(random);
  walker.wait = .2 + random() * .35;
}
function beginGreeting(a, b) {
  a.greetingWith = b.id; b.greetingWith = a.id;
  for (const walker of [a, b]) { walker.greetingLeft = MOTION.greetingSeconds; walker.play = 'greeting'; walker.playLeft = MOTION.greetingSeconds; }
  a.facing = b.x >= a.x ? 1 : -1; b.facing = -a.facing;
}

/** Mutates a Map, array, or iterable of walkers. active:false freezes all clocks. */
export function stepWorld(walkers, delta, width, height, { active = true, random = Math.random, walking = MOTION } = {}) {
  if (!active || !Number.isFinite(delta) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  const dt = clamp(delta, 0, .05); if (!dt) return;
  const list = walkers instanceof Map ? [...walkers.values()] : Array.from(walkers);
  const byId = new Map(list.map(walker => [walker.id, walker]));

  // Cancel a pair together if one member is being inspected or removed.
  const cancelled = new Set();
  for (const walker of list) {
    if (walker.greetingWith == null) continue;
    const partner = byId.get(walker.greetingWith);
    if (!partner || blocked(walker) || blocked(partner)) { cancelled.add(walker); if (partner) cancelled.add(partner); }
  }
  for (const walker of cancelled) finishGreeting(walker, byId.get(walker.greetingWith), width, height, random);

  for (const walker of list) {
    if (blocked(walker)) continue;
    walker.greetingCooldown = Math.max(0, walker.greetingCooldown - dt);
    if (walker.greetingWith != null) { walker.greetingLeft = Math.max(0, walker.greetingLeft - dt); walker.playLeft = walker.greetingLeft; continue; }
    walker.nextPlay -= dt; walker.playLeft = Math.max(0, walker.playLeft - dt); walker.wait = Math.max(0, walker.wait - dt);
    if (!walker.playLeft) walker.play = '';
    if (walker.nextPlay <= 0) {
      const chance = random(); walker.play = chance < .35 ? 'hopping' : chance < .6 ? 'running' : 'dancing';
      walker.playLeft = walker.play === 'hopping' ? .65 : walker.play === 'dancing' ? 3.6 : 1.2 + random();
      walker.nextPlay = 7 + random() * 10;
    }
  }
  for (const walker of list) if (walker.greetingWith != null && walker.greetingLeft <= 0) finishGreeting(walker, byId.get(walker.greetingWith), width, height, random);

  // Pair nearest available neighbours once; a single encounter cannot chain a crowd.
  const candidates = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i]; if (blocked(a) || a.greetingWith != null || a.greetingCooldown > 0) continue;
    for (let j = i + 1; j < list.length; j++) {
      const b = list[j]; if (blocked(b) || b.greetingWith != null || b.greetingCooldown > 0) continue;
      const distance = pxDistance(a, b, width, height);
      if (distance <= MOTION.encounterDistance) candidates.push({ a, b, distance });
    }
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const { a, b } of candidates) if (a.greetingWith == null && b.greetingWith == null) beginGreeting(a, b);

  // Read a common snapshot for steering, so iteration order cannot push later walkers.
  const positions = list.map(walker => ({ walker, x: walker.x, y: walker.y }));
  for (const walker of list) {
    if (blocked(walker) || walker.greetingWith != null || walker.play === 'dancing' || walker.wait > 0) continue;
    let dx = (walker.goal.x - walker.x) * width, dy = (walker.goal.y - walker.y) * height;
    const distance = Math.hypot(dx, dy);
    if (distance < 5) { walker.goal = chooseGoal(walker, list, width, height, random); walker.wait = .45 + random() * 1.8; continue; }
    const speed = walker.speed * (walker.play === 'running' ? walking.runMultiplier || MOTION.runMultiplier : 1);
    let vx = dx / distance * speed, vy = dy / distance * speed;
    for (const other of positions) {
      if (other.walker === walker) continue;
      const sx = (walker.x - other.x) * width, sy = (walker.y - other.y) * height, apart = Math.hypot(sx, sy);
      if (apart >= MOTION.personalSpace) continue;
      const strength = (MOTION.personalSpace - apart) / (MOTION.personalSpace - MOTION.minimumSpace) * walker.speed * 1.8;
      const ux = apart > .1 ? sx / apart : walker.facing, uy = apart > .1 ? sy / apart : 0;
      vx += ux * strength; vy += uy * strength;
    }
    const velocity = Math.hypot(vx, vy), cap = speed * 1.35;
    if (velocity > cap) { vx *= cap / velocity; vy *= cap / velocity; }
    let next = inside({ x: walker.x + vx * dt / width, y: walker.y + vy * dt / height });
    const travel = pxDistance(walker, next, width, height);
    // Radial projection on a wide ellipse must not accelerate feet near its rim.
    if (travel > cap * dt) next = { x: walker.x + (next.x - walker.x) * cap * dt / travel, y: walker.y + (next.y - walker.y) * cap * dt / travel };
    let movedX = (next.x - walker.x) * width, movedY = (next.y - walker.y) * height;
    const movementSquared = movedX * movedX + movedY * movedY;
    let allowed = 1;
    // Trim a step at another person's personal-space circle instead of snapping
    // positions apart. Each accepted position is used by subsequent walkers.
    if (movementSquared > 0) for (const other of list) {
      if (other === walker) continue;
      const sx = (walker.x - other.x) * width, sy = (walker.y - other.y) * height;
      const c = sx * sx + sy * sy - MOTION.minimumSpace ** 2;
      if (c < 0) { if ((sx + movedX) ** 2 + (sy + movedY) ** 2 < sx * sx + sy * sy) allowed = 0; continue; }
      const b = 2 * (sx * movedX + sy * movedY), discriminant = b * b - 4 * movementSquared * c;
      if (discriminant < 0 || b >= 0) continue;
      const entry = (-b - Math.sqrt(discriminant)) / (2 * movementSquared);
      if (entry >= 0 && entry < allowed) allowed = Math.max(0, entry - .001);
    }
    movedX *= allowed; movedY *= allowed;
    next = { x: walker.x + movedX / width, y: walker.y + movedY / height };
    walker.blockedFor = allowed < .2 ? (walker.blockedFor || 0) + dt : 0;
    walker.x = next.x; walker.y = next.y;
    if (Math.abs(movedX) > .08) walker.facing = movedX > 0 ? 1 : -1;
    if (walker.blockedFor > .8) { walker.goal = chooseGoal(walker, list, width, height, random); walker.wait = .15; walker.blockedFor = 0; }
  }
}
