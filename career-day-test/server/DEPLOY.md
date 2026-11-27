# 공유 서버 배포

기존 화면, 메이트 자산, 폰트와 섬 동작을 그대로 사용합니다. 저장소 루트의 예산 관리 페이지를 수정하지 않습니다. 이 폴더(`career-day-test/`) 안에서만 배포합니다.

## 현재 상태

구현과 로컬 검증은 완료됐으며 실제 Cloudflare 계정 연결은 아직 필요합니다. `wrangler.jsonc`의 데이터베이스 ID는 교체 전 표시값이며 `studio/server-config.js`는 기존 기기별 테스트를 유지합니다. 관리자 비밀번호·실제 참여자 데이터는 소스나 ZIP에 포함되지 않습니다.

## Cloudflare Workers + D1

1. https://dash.cloudflare.com/sign-up 에서 사용자가 직접 계정을 만들고 이메일 인증과 로그인을 완료합니다. 유료 요금제 가입이나 결제는 별도 승인 없이 진행하지 않습니다.
2. 공식 Wrangler로 계정에 로그인합니다. 로그인·권한 동의는 사용자가 직접 완료합니다. 기존 설치본이 있으면 재사용합니다. 새 환경에서는 공식 npm 패키지 `wrangler`를 사용할 수 있습니다.
3. 이 폴더에서 `wrangler d1 create hope-creator-island`를 실행합니다. 반환받은 실제 ID만 `wrangler.jsonc`의 `database_id`에 넣습니다. 이미 생성한 DB는 재사용하며 임의의 ID를 만들지 않습니다.
4. `wrangler d1 execute hope-creator-island --remote --file server/schema.sql`로 테이블을 만듭니다. 이 스키마는 CREATE IF NOT EXISTS를 사용하며 기존 카드를 삭제하지 않습니다.
5. 사용자 비밀번호를 채팅·소스·명령 인자에 넣지 않습니다. `node server/password-hash.mjs`는 비밀번호를 가린 상태로 입력받아 PBKDF2 해시를 만듭니다. 생성한 해시만 Cloudflare의 `ADMIN_PASSWORD_HASH` 비밀값에 저장합니다. 평문과 해시는 GitHub에 커밋하지 않습니다. `wrangler secret put ADMIN_PASSWORD_HASH` 또는 Cloudflare 설정의 Secrets를 사용합니다.
6. `wrangler deploy --dry-run`으로 검증하고 `wrangler deploy`로 배포합니다. 런타임 비밀값을 바꿨다면 설정이 적용됐는지 확인합니다. 기본 배포 URL을 그대로 기록합니다.
7. 배포된 `/api/health`와 `/admin/`을 확인합니다. 관리자 비밀번호가 없거나 DB 설정이 잘못됐을 때는 관리자 요청을 거절합니다.
8. 기존 GitHub Pages 주소도 계속 사용하려면 `studio/server-config.js`의 `API_BASE`에 검증된 서버 origin을 넣고 `LIVE_UPDATES = true`로 설정합니다. `index.html`의 CSP `connect-src 'self'` 뒤에 같은 HTTPS origin과 WSS origin을 추가합니다. 관리자 화면은 공유 서버 `/admin/`으로 이동합니다. `ALLOWED_ORIGINS`에는 기존 Pages origin인 `https://palettecommunity.github.io`만 추가돼 있습니다.
9. GitHub main의 최신 head를 새로 읽고 해당 base tree와 expected SHA로 `career-day-test/`의 관련 파일만 커밋합니다. Pages 워크플로 성공과 공개 파일 해시를 확인합니다.
10. 두 브라우저/휴대폰으로 카드와 반응 공유, 관리자 개별 삭제·전체 삭제를 확인합니다. 삭제 검증에는 별도로 만든 테스트 카드만 사용하고 실제 참여자 데이터 삭제를 시험하지 않습니다.

공유 서버 자체도 전체 화면과 관리자 화면을 제공합니다. 원래 Pages QR 링크를 계속 쓰려면 위 8~9번 연결까지 마쳐야 합니다.

## 관리자 사용

- 공유 서버 `/admin/`에서 비밀번호로 로그인합니다. 로그인하지 않은 요청은 목록 조회와 삭제가 모두 거절됩니다.
- 개별 삭제는 캐릭터·소개 카드와 이 캐릭터가 주고받은 반응을 삭제합니다.
- 전체 삭제는 모든 캐릭터·소개 카드·반응을 삭제합니다. `전체 삭제`를 정확하게 입력해야 합니다. 삭제 확인 후 누군가 카드를 수정·추가했다면 다시 목록을 확인해야 합니다.
- 삭제는 되돌리기 기능을 제공하지 않습니다. Cloudflare가 제공하는 DB 복구·백업은 별도로 관리합니다.
- 참가자는 기기별 인증키로 자기 카드만 수정합니다. 브라우저 저장소를 지우면 수정 권한이 사라집니다. 현재 버전에는 계정 로그인·다른 기기 복구·채팅 메시지 기능이 없습니다. 소통은 카드 열람과 공감·멋져·응원·궁금해 반응입니다.
- 정상 연결에서는 카드 변경·반응을 WebSocket으로 바로 전달합니다. 연결이 끊어지면 30초 간격 조회로 복구하며, 정상 연결 중에도 목록은 5분 간격으로 확인합니다. 화면을 보지 않는 탭에서는 연결과 주기 조회를 멈춥니다. 반응 이벤트는 1시간 뒤 정리됩니다.

## 요금과 용량

운영 조건은 50명이 최소 한 시간 이상 사용하는 행사입니다. 기존 5초·2초 주기 조회를 제거하고, Workers Free에서도 사용할 수 있는 SQLite 기반 Durable Object와 WebSocket Hibernation을 사용합니다. 연결된 동안 변경이 없어도 반복해서 카드·반응을 조회하지 않습니다. 서버에서 나가는 WebSocket 메시지는 Worker HTTP 요청 수에 포함되지 않습니다.

Cloudflare Workers Free의 공식 일일 요청 한도는 현재 100,000건입니다. 50명이 두 시간 동안 각자 카드 저장 6회·반응 120회, 카드 변경마다 모든 참가자의 목록 조회, 5분 간격 복구 확인, 기타 요청 1,000건을 더하는 보수적인 시나리오의 계산은 약 23,600건입니다. 50명이 계속 연결돼 있어도 같은 시간당 126,000건이 발생하던 이전 구조와 다릅니다. 이 수치는 사용량 계획 계산이며 실제 두 시간 경과 검사는 아닙니다.

로컬 Cloudflare 런타임에서 동시 연결 50개, 카드 저장 50개, 반응 50개, 전체 삭제 알림의 총 5,050회 전달과 재연결·허위 메시지 거절을 검증했습니다. 실제 배포 후에도 기기 2대 이상의 접속과 계정 사용량을 확인합니다. 무료 요금제를 유지하며 유료 전환은 사용자 선택 후에만 진행합니다.

공식 자료:
- Workers 요금: https://developers.cloudflare.com/workers/platform/pricing/
- Durable Objects 요금: https://developers.cloudflare.com/durable-objects/platform/pricing/
- WebSocket 휴면: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- D1 시작: https://developers.cloudflare.com/d1/get-started/
- 비밀값: https://developers.cloudflare.com/workers/configuration/secrets/

## Node 서버로 실행

Node.js 24에서 추가 패키지 없이 실행할 수 있습니다. `ADMIN_PASSWORD_HASH`를 환경 변수로 설정하고 `node server/node.mjs`를 실행합니다. 기본 주소는 `http://127.0.0.1:4327/`이며 DB는 실행 작업 폴더의 `work/hc-island.sqlite`에 보관합니다. 운영에서는 `HC_DATABASE_PATH`를 영속 디스크의 경로로 지정하고 백업을 관리합니다. 외부 HTTPS 프록시가 있다면 `HC_PUBLIC_ORIGIN`을 정확한 공개 origin으로 지정합니다. Node 서버 한 프로세스에서 SQLite 파일을 사용합니다.

확인: `node server/test.mjs`. 테스트는 임시 DB와 무작위 비밀번호만 사용하고 종료 시 테스트 DB를 제거합니다.
