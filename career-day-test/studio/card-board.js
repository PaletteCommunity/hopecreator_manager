const ROTATION_MS = 3800;
const SWIPE_PAUSE_MS = 8500;

export function createCardBoard(board) {
  const track = board.querySelector('#card-grid');
  const controls = board.querySelector('.card-board-controls');
  const previous = board.querySelector('#card-board-previous');
  const next = board.querySelector('#card-board-next');
  const play = board.querySelector('#card-board-play');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reducedMotion.matches;
  let holdUntil = 0;

  function updatePlay() {
    play.textContent = paused ? '자동 재생' : '일시 정지';
  }

  function hold() {
    holdUntil = Date.now() + SWIPE_PAUSE_MS;
  }

  function move(direction) {
    const [first, second] = track.children;
    if (!second) return;
    const end = track.scrollWidth - track.clientWidth;
    if (end <= 2) return;
    const position = track.scrollLeft;
    const step = second.offsetLeft - first.offsetLeft;
    const wrap = direction > 0 ? position >= end - 3 : position <= 3;
    const target = wrap ? (direction > 0 ? 0 : end) : Math.max(0, Math.min(end, position + direction * step));
    track.scrollTo({ left: target, behavior: wrap || reducedMotion.matches ? 'instant' : 'smooth' });
  }

  function updateControls() {
    controls.hidden = track.children.length < 2 || track.scrollWidth - track.clientWidth <= 2;
  }

  previous.addEventListener('click', () => { hold(); move(-1); });
  next.addEventListener('click', () => { hold(); move(1); });
  play.addEventListener('click', () => {
    paused = !paused;
    if (!paused) holdUntil = 0;
    updatePlay();
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) { paused = true; updatePlay(); }
  });
  track.addEventListener('pointerdown', hold, { passive: true });
  track.addEventListener('pointerup', hold, { passive: true });
  track.addEventListener('wheel', hold, { passive: true });
  track.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    hold();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  new ResizeObserver(updateControls).observe(track);
  updatePlay();

  setInterval(() => {
    if (paused || board.hidden || controls.hidden || document.hidden || Date.now() < holdUntil) return;
    if (track.matches(':hover') || track.contains(document.activeElement) || document.querySelector('dialog[open]')) return;
    move(1);
  }, ROTATION_MS);

  return {
    replace(cards) {
      const previousPosition = track.scrollLeft;
      track.replaceChildren(...cards);
      track.scrollLeft = previousPosition;
      updateControls();
    },
    setVisible(visible) {
      board.hidden = !visible;
      if (visible) updateControls();
    },
  };
}
