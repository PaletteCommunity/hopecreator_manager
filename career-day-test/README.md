# Hope Creator 모바일 UI 테스트

테스트 주소: https://palettecommunity.github.io/hopecreator_manager/career-day-test/

GitHub Pages용 정적 테스트본입니다.

- 소개서 작성, 필수 입력 후 그림판 해금, 현재 메이트 참고, 캐릭터의 섬 이동, 카드 크게 보기, PNG 저장을 테스트합니다.
- 카드와 초안은 현재 브라우저에 저장합니다. 서버나 다른 기기로 전송하지 않습니다.
- 반응은 현재 기기의 캐릭터로 표시하는 시뮬레이션입니다. 여러 사람의 카드·반응 공유에는 별도 서버가 필요합니다.
- 예시 소개는 모두 허구입니다.

## 편집

이 저장소의 `career-day-test/` 폴더가 테스트 페이지 소스입니다.

- 화면 구조: `career-day-test/index.html`
- 스타일: `career-day-test/studio/island.css`
- 글자 수·움직임: `career-day-test/studio/ui-config.js`
- 화면 동작: `career-day-test/studio/app.js`
- 카드 보기 디자인: `career-day-test/studio/profile-card.css`
- 카드 PNG 디자인: `career-day-test/studio/profile-image.js`
- 섬과 캐릭터 크기: `career-day-test/studio/world.css`
- 이동·만남·인사: `career-day-test/studio/island-motion.js`
- 메이트 이미지와 표시 영역: `career-day-test/studio/mate-assets.js`
- 폰트: `career-day-test/studio/fonts.css` (Hada Type 춤추는 사람들, SIL OFL 1.1 원문은 assets/fonts에 동봉)

메이트 6종은 공식 투명 PNG 원본을 사용합니다. 원본을 찾지 못한 위즈·비니·미니·인투 4종은 제공된 자료를 바탕으로 투명 이미지로 재현한 테스트 자산입니다.

참여자 카드가 없으면 50개의 가상 예시 카드로 섬 밀도를 확인할 수 있습니다. 실제 참가자 수를 의미하지 않습니다.
크게 보기는 휴대폰의 현재 화면 높이에 맞춰 카드 여백과 본문 크기를 조정합니다. 본문은 16px 아래로 줄이지 않으며, 화면이 짧거나 답변이 긴 경우 카드 내용 영역에서 스크롤할 수 있습니다.

현재 Pages는 main 브랜치의 루트에서 배포됩니다. 테스트 수정은 `career-day-test/` 폴더 안에서 진행하면 됩니다. 저장소 루트의 `index.html`은 기존 예산 관리 페이지입니다.
