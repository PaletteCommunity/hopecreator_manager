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

현재 Pages는 main 브랜치의 루트에서 배포됩니다. 테스트 수정은 `career-day-test/` 폴더 안에서 진행하면 됩니다. 저장소 루트의 `index.html`은 기존 예산 관리 페이지입니다.
