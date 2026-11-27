# Hope Creator · 스마일메이츠 섬

테스트 주소: https://palettecommunity.github.io/hopecreator_manager/career-day-test/

기존 GitHub Pages 화면을 유지하면서 공유 서버와 관리자 페이지를 추가한 소스입니다.

- 소개서 작성, 필수 입력 후 그림판 해금, 현재 메이트 참고, 캐릭터의 섬 이동, 카드 크게 보기, PNG 저장을 테스트합니다.
- `studio/server-config.js`의 `API_BASE`가 빈 값인 GitHub Pages에서는 기존 기기별 테스트로 동작합니다. 서버 계정 연결 전에는 카드·반응이 다른 기기에 공유되지 않습니다.
- Node 또는 Cloudflare 서버에서 실행하면 카드와 반응을 데이터베이스에 공유합니다. 초안과 기기별 카드 수정 인증키는 브라우저에 보관합니다. 기기 데이터를 지우거나 다른 기기로 바꾸면 기존 카드 수정 권한은 복구되지 않습니다.
- 공유 모드는 예시 50개를 보여주지 않습니다. 관리자 전체 삭제 후에도 빈 섬이 유지됩니다.
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
위 예시는 기기별 테스트 모드에만 표시됩니다.
크게 보기는 휴대폰의 현재 화면 높이에 맞춰 카드 여백과 본문 크기를 조정합니다. 본문은 16px 아래로 줄이지 않으며, 화면이 짧거나 답변이 긴 경우 카드 내용 영역에서 스크롤할 수 있습니다.

현재 Pages는 main 브랜치의 루트에서 배포됩니다. 테스트 수정은 `career-day-test/` 폴더 안에서 진행하면 됩니다. 저장소 루트의 `index.html`은 기존 예산 관리 페이지입니다.

## 서버와 관리자

- `server/api.mjs`: 서버 입력 검증, 카드 소유권, 공유 카드·반응 API, 관리자 인증·삭제.
- `server/schema.sql`: 카드, 반응, 관리자 세션과 요청 제한 테이블. 카드 삭제 시 관련 반응도 함께 삭제합니다.
- `server/worker.mjs`, `wrangler.jsonc`: Cloudflare Workers + D1 배포.
- `server/node.mjs`, `server/sqlite.mjs`: Node.js 24 + SQLite 실행·검증. 추가 패키지가 필요 없습니다.
- `admin/`, `studio/admin.js`, `studio/admin.css`: 관리자 로그인, 목록·카드 확인, 개별 삭제, 전체 삭제.
- `studio/api-client.js`, `studio/server-config.js`: 기존 화면의 저장·반응을 공유 서버와 연결합니다.

관리자 경로는 공유 서버의 `/admin/`입니다. 비밀번호는 서버의 `ADMIN_PASSWORD_HASH` 비밀값으로만 설정합니다. 관리자 세션은 8시간 뒤 만료되며 HttpOnly·SameSite=Strict 쿠키를 사용합니다. HTTPS 배포에서는 Secure 속성도 적용합니다. 모든 삭제 요청은 서버 인증, 같은 출처와 CSRF 검사를 통과해야 합니다. 전체 삭제는 확인 문구와 목록 버전을 검사하며, 삭제 전 편집 화면의 오래된 저장 요청을 거절합니다.

검사: `node server/test.mjs`. 두 기기 공유·소유권·반응·관리자 권한·삭제·충돌·재시작 후 저장·로그아웃·세션 만료 등 51개 검사를 실행합니다.

배포 순서는 `server/DEPLOY.md`에 있습니다. 계정, 데이터베이스 ID, 관리자 비밀번호를 연결하기 전에는 외부 공유 서버 배포가 완료된 상태가 아닙니다.
