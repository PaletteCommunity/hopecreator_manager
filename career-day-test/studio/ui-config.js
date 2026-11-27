// 화면 스타일과 섬의 움직임을 수정하는 곳입니다.
export const UI = {
  colors: { text: '#304b5a', accent: '#cc8055', paper: '#fffdf6' },
  walking: { minSpeed: 12, maxSpeed: 21, runMultiplier: 2.4, pauseAtDestination: 2.5 },
  // Shared Cloudflare mode pushes updates. These intervals only recover a lost connection.
  sharedCardRefreshMs: 30000,
  reactionRefreshMs: 30000,
};
// 입력 제한은 server/api.mjs 및 기기별 테스트 static-api.js와 함께 수정합니다.
export const FIELDS = [
  { key: 'name', id: 'name-input', label: '이름', max: 12, required: true },
  { key: 'jobInterest', id: 'jobInterest-input', label: '나의 관심 직무', max: 30, required: true },
  { key: 'dopamine', id: 'dopamine-input', label: '요즘 나의 가장 큰 도파민은?', max: 30, required: true },
  { key: 'experience', id: 'experience-input', label: '이 메이트의 가치를 잘 보여주는 나의 경험은?', max: 80, required: true },
  { key: 'attempts', id: 'attempts-input', label: '관련해서 최근에 하고 있는 시도', max: 40, required: true },
  { key: 'concern', id: 'concern-input', label: '요즘 진로와 관련해 가장 고민되거나 궁금한 점은?', max: 60, required: true },
];
export const REACTIONS = { empathy: '❤️', cool: '👏', cheer: '🙌', curious: '💭' };
