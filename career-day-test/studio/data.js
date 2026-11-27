// The value labels follow the supplied Smilemates reference.
// Descriptions are short interface copy, not a personality assessment.
export const MATES = [
  { id: 'flame', name: '플레임', en: 'Flame', value: '열정', desc: '좋아하는 일에 열정을 더해요.', color: '#ECA07D', x: 4, y: 0, w: 116, h: 120 },
  { id: 'wiz', name: '위즈', en: 'Wiz', value: '인사이트', desc: '경험 속에서 새로운 통찰을 발견해요.', color: '#B3C8DC', x: 314, y: 0, w: 116, h: 120 },
  { id: 'vini', name: '비니', en: 'Vini', value: '비전', desc: '앞으로 만들고 싶은 모습을 그려요.', color: '#E7CE8F', x: 4, y: 130, w: 116, h: 120 },
  { id: 'dutti', name: '듀띠', en: 'Dutti', value: '사명감', desc: '가치 있다고 믿는 일에 마음을 보태요.', color: '#ACCABF', x: 314, y: 130, w: 116, h: 120 },
  { id: 'mini', name: '미니', en: 'Mini', value: '미션', desc: '나에게 주어진 미션을 하나씩 해나가요.', color: '#E8B393', x: 4, y: 258, w: 116, h: 120 },
  { id: 'inou', name: '아이노', en: 'I-nou', value: '이해', desc: '서로의 이야기를 듣고 이해해요.', color: '#B4CFDC', x: 314, y: 258, w: 116, h: 120 },
  { id: 'intoo', name: '인투', en: 'Intoo', value: '눈높이가치', desc: '서로의 눈높이에 맞춰 함께해요.', color: '#DCCF9D', x: 4, y: 386, w: 116, h: 120 },
  { id: 'cloody', name: '클루디', en: 'Cloody', value: '공유', desc: '나의 경험과 생각을 함께 나눠요.', color: '#AFC9BE', x: 314, y: 386, w: 116, h: 120 },
  { id: 'mmuni', name: '뮤니', en: 'Mmuni', value: '소통', desc: '대화를 통해 서로에게 다가가요.', color: '#E4AF94', x: 4, y: 514, w: 116, h: 120 },
  { id: 'inno', name: '이노', en: 'Inno', value: '혁신', desc: '익숙한 것에 새로운 방법을 더해요.', color: '#B0C6DA', x: 314, y: 514, w: 116, h: 120 },
];

// Fictional sample profiles only. These are not participant records.
export const DEMOS = [
  { id: 'demo-01', name: '느린연필', mateId: 'flame', aspirationMateId: 'mini', dopamine: '퇴근이나 수업 뒤에 마음에 드는 그림 한 장 그리기', experience: '친구와 일주일 동안 서로 그린 낙서를 주고받았어요. 같은 물건도 전혀 다르게 그린다는 게 재미있었어요.', attempts: '하루에 10분이라도 스케치북을 펴보려고 해요.', concern: '좋아하는 그림을 꾸준히 그리면서 내 스타일도 찾아가고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-02', name: '오후의귤', mateId: 'wiz', aspirationMateId: 'vini', dopamine: '처음 가보는 동네에서 마음에 드는 카페 발견하기', experience: '관심 있는 일을 하는 지인에게 하루 일과를 물어봤어요. 직업 이름만 들었을 때와 실제 이야기가 달라 기억에 남아요.', attempts: '궁금한 직무를 하나씩 메모하고 있어요.', concern: '관심 분야가 여러 개라 어디서부터 경험해 볼지 고민이에요.', strokes: [], isDemo: true },
  { id: 'demo-03', name: '별줍는콩', mateId: 'vini', aspirationMateId: 'flame', dopamine: '막연했던 아이디어에 어울리는 이름을 떠올리는 순간', experience: '친구 생일에 작은 사진 모음을 만들어 줬어요. 완벽하지 않아도 완성해서 건네는 일이 생각보다 즐거웠어요.', attempts: '주말에 만들 수 있는 작은 아이디어를 적어봐요.', concern: '생각한 것을 실제로 시작할 때 망설임을 줄이고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-04', name: '파란노트', mateId: 'dutti', aspirationMateId: 'intoo', dopamine: '내가 정리한 자료가 누군가에게 도움이 됐다는 말', experience: '처음 모임에 온 친구에게 장소와 준비물을 정리해 알려줬어요. 작은 안내도 누군가에게는 든든할 수 있다는 걸 느꼈어요.', attempts: '', concern: '도움을 주고 싶을 때 상대가 정말 필요한 게 뭔지 잘 알고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-05', name: '작은항해', mateId: 'mini', aspirationMateId: 'inno', dopamine: '미뤄둔 작은 일을 끝내고 체크하는 순간', experience: '매일 할 일을 세 개만 적는 방법을 써봤어요. 계획을 많이 세울 때보다 끝낸 일이 눈에 잘 보였어요.', attempts: '부담 없이 계속할 수 있는 계획 방법을 시험 중이에요.', concern: '계획이 틀어져도 금방 다시 시작하는 방법이 궁금해요.', strokes: [], isDemo: true },
  { id: 'demo-06', name: '도토리공방', mateId: 'inou', aspirationMateId: 'cloody', dopamine: '친구가 좋아하는 것을 신나게 설명하는 모습', experience: '서로 최근 좋아하게 된 노래를 한 곡씩 소개했어요. 노래를 고른 이유를 듣다 보니 새로운 취향도 발견했어요.', attempts: '작은 취향 기록을 모아보고 있어요.', concern: '내가 좋아하는 것도 조금 더 편하게 말해보고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-07', name: '오늘의쉼표', mateId: 'intoo', aspirationMateId: 'mmuni', dopamine: '서로 다른 의견이 대화 끝에 하나로 이어지는 순간', experience: '친구들과 나들이 일정을 짜면서 각자 꼭 하고 싶은 것 하나씩을 먼저 골랐어요. 모두의 취향을 조금씩 담을 수 있었어요.', attempts: '답을 제안하기 전에 상대의 생각부터 물어보려 해요.', concern: '의견이 다를 때도 어색하지 않게 대화를 이어가고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-08', name: '느긋한모험가', mateId: 'cloody', aspirationMateId: 'wiz', dopamine: '처음 해본 일에서 예상 밖의 재미를 발견하기', experience: '처음으로 빵 만들기에 도전했다가 모양이 제각각 나왔어요. 친구들과 실패한 과정까지 나누니 더 재미있는 기억이 됐어요.', attempts: '해보고 싶던 취미를 하나씩 경험해 봐요.', concern: '새로운 경험에서 얻은 것을 잘 기록하고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-09', name: '구름산책', mateId: 'mmuni', aspirationMateId: 'inou', dopamine: '좋아하는 음악을 들으며 목적지 없이 산책하기', experience: '오랜만에 만난 친구와 각자 요즘 많이 하는 생각을 나눴어요. 거창한 소식이 없어도 대화가 충분히 즐거웠어요.', attempts: '', concern: '처음 만난 사람에게도 부담 없이 말을 걸 수 있으면 좋겠어요.', strokes: [], isDemo: true },
  { id: 'demo-10', name: '낮달우체국', mateId: 'inno', aspirationMateId: 'mini', dopamine: '새 도구로 익숙한 작업이 조금 편해지는 순간', experience: '사진 정리 방식을 날짜순에서 주제별로 바꿔봤어요. 잊고 있던 사진을 다시 발견해서 작은 앨범도 만들었어요.', attempts: '반복하는 일에 더 편한 방법이 있는지 찾아봐요.', concern: '새로운 도구를 이것저것 써보다가 중간에 멈추곤 해요.', strokes: [], isDemo: true },
  { id: 'demo-11', name: '말랑한질문', mateId: 'wiz', aspirationMateId: 'inou', dopamine: '생각해 보지 못한 질문을 듣고 이야기가 깊어질 때', experience: '함께 읽은 책에서 인상적인 문장 하나씩을 골라봤어요. 같은 문장에도 서로 다른 경험이 담겨 있다는 게 기억에 남아요.', attempts: '일상에서 떠오른 질문을 짧게 메모해요.', concern: '좋은 질문을 하면서도 상대에게 부담을 주지 않고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-12', name: '첫문장', mateId: 'flame', aspirationMateId: 'cloody', dopamine: '막혀 있던 글의 첫 문장이 써지는 순간', experience: '짧은 일기를 친구에게 처음 보여줬어요. 별것 아니라고 생각한 이야기에 공감해 줘서 다음 글도 써보고 싶어졌어요.', attempts: '하루 중 기억에 남은 장면 하나를 문장으로 남겨요.', concern: '다른 사람에게 내 작업을 보여줄 때 긴장을 많이 해요.', strokes: [], isDemo: true },
  { id: 'demo-13', name: '소소한수집가', mateId: 'cloody', aspirationMateId: 'mmuni', dopamine: '내가 아끼는 작은 물건에 담긴 이야기를 나눌 때', experience: '친구들과 각자 아끼는 물건 하나씩을 가져와 소개했어요. 평소 몰랐던 서로의 취향을 알게 돼 반가웠어요.', attempts: '사진과 짧은 설명으로 취향 목록을 만들어 봐요.', concern: '혼자 좋아하던 취미를 함께할 사람도 만나보고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-14', name: '귤빛메모', mateId: 'inou', aspirationMateId: 'dutti', dopamine: '내 이야기를 충분히 들어주는 사람과의 대화', experience: '친구의 고민을 듣다가 바로 해결책을 말하지 않고 더 물어봤어요. 듣는 것만으로도 도움이 될 수 있다는 말을 들었어요.', attempts: '대화 뒤 기억에 남는 말을 한 줄 적어요.', concern: '함께 고민하면서도 나의 마음을 잘 돌보는 방법이 궁금해요.', strokes: [], isDemo: true },
  { id: 'demo-15', name: '네모난상상', mateId: 'inno', aspirationMateId: 'vini', dopamine: '서로 다른 아이디어가 만나 예상 밖의 결과가 나올 때', experience: '친구와 휴대폰으로 짧은 영상을 찍었어요. 정해둔 장면보다 우연히 찍힌 장면이 더 마음에 들어서 재미있었어요.', attempts: '한 가지 주제로 30초짜리 영상을 구상해 봐요.', concern: '아이디어를 하나로 정하고 완성까지 이어가고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-16', name: '한발짝더', mateId: 'mini', aspirationMateId: 'flame', dopamine: '처음에는 어렵던 일이 조금 익숙해졌을 때', experience: '처음 가는 동네까지 혼자 자전거를 타봤어요. 짧은 거리부터 시작하니 다음 코스도 도전해 보고 싶어졌어요.', attempts: '관심 있는 일을 작은 단위로 먼저 해보려고 해요.', concern: '준비가 부족하다는 생각 때문에 시작이 늦어질 때가 있어요.', strokes: [], isDemo: true },
  { id: 'demo-17', name: '잔잔한물결', mateId: 'mmuni', aspirationMateId: 'intoo', dopamine: '함께 웃으면서 아이디어를 주고받는 시간', experience: '친구들과 저녁 메뉴를 정할 때 각자 피하고 싶은 것부터 말해봤어요. 작은 질문 하나로 결정이 훨씬 편해졌어요.', attempts: '', concern: '팀에서 조용한 사람의 생각도 자연스럽게 듣고 싶어요.', strokes: [], isDemo: true },
  { id: 'demo-18', name: '여백한칸', mateId: 'vini', aspirationMateId: 'wiz', dopamine: '좋아하는 일로 채운 하루를 상상하기', experience: '주말 하루를 기록해 보면서 무엇을 할 때 시간이 빨리 가는지 살펴봤어요. 의외로 좋아하는 순간을 몇 개 발견했어요.', attempts: '관심 분야를 적고 직접 해볼 수 있는 일을 찾아봐요.', concern: '잘하는 것과 좋아하는 것 사이에서 어떤 경험을 먼저 쌓을지 고민이에요.', strokes: [], isDemo: true },
];
