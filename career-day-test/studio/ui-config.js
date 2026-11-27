// 화면 스타일과 섬의 움직임을 수정하는 곳입니다.
export const UI = {
  colors: { text: '#304b5a', accent: '#cc8055', paper: '#fffdf6' },
  walking: { minSpeed: 9, maxSpeed: 17, pauseAtDestination: 2.5 },
  sharedCardRefreshMs: 5000,
  reactionRefreshMs: 2000,
};
// 입력 제한은 서버 app/api/cards/route.ts와 함께 수정해야 합니다.
export const FIELDS = [
  { key: 'name', id: 'name-input', label: '이름', max: 12, required: true },
  { key: 'dopamine', id: 'dopamine-input', label: '요즘 나의 도파민', max: 30, required: true },
  { key: 'experience', id: 'experience-input', label: '메이트와 닮은 나의 경험', max: 80, required: true },
  { key: 'attempts', id: 'attempts-input', label: '이를 위해 하고 있는 시도', max: 40, required: false },
  { key: 'concern', id: 'concern-input', label: '요즘 진로 고민', max: 60, required: true },
];
export const REACTIONS = { empathy: '❤️', cool: '👏', cheer: '🙌', curious: '💭' };
