# GeniegoROI E2E 스모크 (핵심 플로우 회귀 자동화) — 266차 신설

"배포할 때마다 무음실패·계약불일치가 계속 나오는" 문제의 **근본 해결**. 매 변경마다 수동으로 하던
런타임 검증(로그인→전 엔드포인트 발사→응답 계약키 확인)을 자동화해, 회귀를 CI/로컬에서 즉시 잡는다.

## 무엇을 잡는가 (정적 분석·빌드가 못 잡는 것)
| 스크립트 | 검사 | 잡는 회귀 |
|----------|------|-----------|
| `smoke.mjs` (무의존) | 로그인 + GET 엔드포인트 500 스윕 + 계약키 검증 | 스키마드리프트→**런타임 500 무음실패**, 프론트-백엔드 **계약키 누락**(share/roas/team/content/monthly_sent/keywords/summary/type 등 266차 수정분) |
| `render.mjs` (Playwright opt-in) | 전 메뉴 admin 세션 렌더 | **마운트 React 크래시**(undefined 식별자·Rules-of-Hooks·정의 안 된 컴포넌트) |
| `scenarios.mjs` (쓰기·가역) | 핵심 유저 플로우 write→read→검증(영속 왕복·엔티티 CRUD) | **쓰기 경로 무결**(저장 실패·계약키 회귀). ★자가정리(원복/삭제)·**데모 백엔드 권장**·CI 자동실행 금지 |

## 실행

```bash
# 자격증명은 env 로만 주입 (★소스 하드코딩 금지)
export E2E_EMAIL='...'          # 앱 admin 이메일
export E2E_PASSWORD='...'       # 비밀번호
export E2E_ACCESS_CODE='GENIEGO-ADMIN'   # 선택(기본값)
export E2E_BASE='https://www.genieroi.com'  # 선택(기본=운영). 데모=https://demo.genieroi.com

npm run e2e            # 코어 API 스모크(무의존·비파괴·반복안전·CI 게이트)
npm run e2e:render     # 렌더 스윕(Playwright 필요: npm i -D playwright && npx playwright install chromium)
npm run e2e:scenario   # 쓰기 시나리오(가역·자가정리). ★데모 백엔드 권장: E2E_BASE=https://demo.genieroi.com. CI 자동실행 금지
```

종료코드: `0`=통과 · `1`=실패(500 또는 계약키 누락 또는 렌더 크래시) · `2`=자격증명 미주입 · `3`=Playwright 미설치(render skip).

## 비파괴성
- `smoke.mjs` 는 **읽기(GET)만** 발사 + 응답 키 검증. 운영 DB 무오염·AI 비용 0·반복 실행 안전.
- 쓰기(POST/PUT)·send/launch/sync 등 부수효과 엔드포인트는 **의도적으로 제외**.

## 계약키 회귀 가드 갱신 규칙
프론트-백엔드 계약(응답 키)을 새로 수정하면 `smoke.mjs` 의 `CONTRACT` 배열에 한 줄 추가한다.
그러면 그 계약이 다시 깨지는 순간 이 스모크가 즉시 실패시킨다(재발 영구 차단).

## CI 연동(권장)
`.github/workflows/deploy.yml` 배포 후 스텝에 추가(시크릿 등록 시):
```yaml
- name: E2E smoke
  if: env.HAS_TEST_SECRETS == 'true'
  env: { E2E_EMAIL: ${{ secrets.E2E_EMAIL }}, E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }} }
  run: npm run e2e
```

## 한계 (정직 고지)
- `smoke` 는 읽기·응답구조만. **쓰기 경로의 로직 결함**은 미커버.
- `render` 는 마운트 렌더만. **클릭/폼 제출·데이터 채워진 상태의 상호작용 크래시**는 미커버.
- 완전한 커버리지는 핵심 유저 플로우(로그인→채널연동→캠페인생성→정산조회 등)의 **시나리오 e2e**를 점진 추가해 확장한다.
