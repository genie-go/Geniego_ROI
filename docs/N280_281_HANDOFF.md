# N280·281차 세션 인계서

> 브랜치 `feat/n236-admin-growth-automation`. master 미접촉. 13커밋 전부 운영(www.genieroi.com)+데모(demo.genieroi.com) 배포·라이브검증·push 완료.
> 상세 근거는 메모리 `project_n280_pixel_pipeline_rootfix`·`project_n281_full_audit`·`project_n281_cross_audit_round2` 참조.

## 0. 다음 차수 검수자 최우선 인지

- **재감사 금지(전수 근거 확보됨)**: 아래 도메인은 이번 세션에 전수 대조로 확정양호 판정 — 다시 결함으로 올리지 말 것.
  - **배선 진위(가짜배선)** = 0건. route→handler 매핑 1021·프론트 엔드포인트 834·index.php bypass 224·백엔드 클래스 130 self::/static:: 전수. 미정의 메서드 0·미bypass 0·응답미검사 0.
  - **파이프라인(자격증명→즉시실행)** = 끊김 0건. ChannelCreds::upsert 가 10채널유형 전부 실 sync 배선. 픽셀 CAPI 7종 저장→forward 완전연결.
  - **자격증명 3자대조** = 90채널 핵심키 불일치 0건.
  - **산출값** = P0/P1 오값 0건(머니 SSOT·정산·ROAS·BG/NBD·WMS 교차검증).
  - **메뉴노출** = 관리자/타테넌트 회원노출 P0 0건.
- **★재발방지 게이트 신설**: `tools/check_static_refs.mjs`(팬텀 정적자산)·`tools/check_rules_of_hooks.sh`에 **no-undef 추가**(vite build 가 못 잡는 런타임 ReferenceError). CI `.github/workflows/deploy.yml`에 verify job 배선(전 브랜치 push·PR·배포 없음). pre-commit G14 추가.
- **배포 = 수동 plink/pscp 필수**(CI inert). 모든 배포 사용자 승인 의무. `.env` GENIE_DB_PASS=root(양env). SSH/MySQL/admin 자격증명은 메모리 `reference_session_credentials`.

## 1. 280차 — 픽셀 파이프라인 정문 복구 (P0 핵심)

★**최대 발견**: `PixelTracking::getSnippet()`이 고객사에 `<script src="{base}/pixel.js">`를 배포해왔으나 **pixel.js 가 git·디스크·라우트 어디에도 없는 팬텀**이었다. nginx 가 SPA index.html(text/html+nosniff)을 반환 → 브라우저 실행거부 → `POST /pixel/collect` 한 번도 호출 안 됨 → **CAPI 7종·attribution markov·CRM동기화가 전부 빈 파이프라인 위**였다.

- 3중 차단벽 근본수정: ① `frontend/public/pixel.js` 신설(무의존 ES5 로더·클릭ID·세션·sendBeacon) ② 무접두 `/pixel/collect`=nginx 405 → `/api/pixel/collect` ③ CORS 가 자사도메인만 허용 → 픽셀 경로만 임의오리진(신뢰모델=HMAC+도메인일치+레이트리밋, CORS 아님).
- CAPI 매칭신호: 포워더가 읽던 `$b['user_agent']`는 아무도 안 보내는 값·Meta 는 client_ip=null → 비로그인 이벤트 매칭 0 → 서버 헤더 UA/IP·클릭ID 배선.
- **LinkedIn Conversions API 신설**(7번째 목적지)·**CAPI 5종 설정 UI 개통**(GA4/Pinterest/Snap/Reddit/LinkedIn 백엔드만 있고 입력 UI 없어 아무도 못 켰음)·**픽셀 도메인 필수화**(미입력 시 전 이벤트 무력화 함정).
- **화이트스크린 4건**(useMemo 미임포트=픽셀관리 페이지 276차부터 사망·OperationsHub map스코프·Topbar setTab·AuthPage lang)·**시스템 헬스위젯 가짜초록**(팬텀 /favicon.ico + 응답미검사).
- **e2e 스모크 2FA 복구**(273차부터 로그인 401로 사망) — 데모 otp_dev 자동통과.
- 커밋: 81d6366e4dd·852fcb29f66·3159acdb530·b233ea25b9d·125a646f841·9d3aeff642d·5f876a82da7.

## 2. 281차 — 12도메인 전수감사 "겉보기 정상·실제 사망"

P0 1 + P1 8 + P2 20 전건 수정. 핵심:
- **P0** 픽셀 syncToCRM 첫고객 오염(이메일 매칭 없이 테넌트 첫 고객에 전 매출 기장 → LTV/세그먼트 오염). 280 파이프라인 개통으로 라이브. → 이메일 매칭+미매칭 no-op.
- **P1** `UserAuth::requireAdmin` 미정의(WebPush VAPID저장·EnterpriseAuth KEK회전 매호출 fatal 500·246/255차~)·OmniChannel 다국어 상태미인식(10~13국 취소/반품 매출과대·데모 은폐)·카카오 live전환UI부재(데모만통과)·WMS 발주입고 무반영·번들출고 가짜버튼(초과판매)·CAPI 이중전송·세션 COUNT오집계.
- **P2 20건**: Google 채널타입 유실·Pnl by_currency 무음·KCP/NaverPay 키불일치·SIEM SSRF·seat_tier 드리프트·고아페이지 진입점(AgencyManager/DataAssets/AgencyAccess/UserMenuPref)·DigitalShelf 토스트·픽셀 config 편집 PUT·상품등록 재고정합·pixel click-id/UTM TTL·WMS 감사추적 서버화·**알림정책 생성UI 개통**(Alerting 백엔드·cron·통지채널 다 살아있는데 정책UI만 없어 헛돌던 것).
- 커밋: 56d500250f6·8650d0be4bc·b885ed1b9a3·f3c54e7cc81·773babf3b68.

## 3. 281차 2R — 7도메인 교차감사 (자기회귀·자격증명·메뉴·성능)

- **자기회귀**(직접발견): OmniChannel status 캐논토큰화가 색상맵/필터를 라벨기반인 채 남겨 카드 전부 회색·데모필터 깨짐 → 캐논 value 통일.
- **PG connected 표시 오판**: 9종(inicis/kcp/naverpay/adyen/paddle/square/mollie/razorpay/klarna) 등록해도 "미연결" 표시(기능정상=신뢰훼손) → provider별 대표키.
- **회원 메뉴게이트**: 미등재 5페이지(digital-shelf 등) plan게이트 부재 → _EXTRA_PATH_MENUKEYS·/pg-test DEV게이트.
- **성능(회귀0)**: 픽셀 collect 매요청 ~22 DDL → ensureTables 정적가드·rate-limit 복합인덱스.
- **산출값**: netProfit estShare 프론트정합(OrderHub totalNetEst 노출).
- 커밋: 77d40da718c.

## 4. 잔여 (버그 아님·기능과제)

- G sub-admin admin_menus 서버경계(279 기문서화·권한상승은 차단됨·메뉴도달만 클라게이트).
- 성능 2차: ensureTables 정적가드 타 핸들러 확산(고빈도 read부터·점진)·GlobalDataContext value 메모이제이션(stale클로저 위험=신중)·마운트 중복fetch 통합(limit 상이 주의).
- influencerIngest.js 고아모듈(honest-pending 골격·데드코드 정리 참고).
- Criteo CAPI = 공개 서버사이드 API 부재로 보류(파트너 통합 계약 선행).

## 5. ★사용자 예정 작업

사용자가 "자격증명은 완료되면 하나씩 등록"할 예정. 등록 시 채널별로 저장→sync→실행이 즉시 동작하도록 파이프라인·자격증명 필드가 정합됨을 이번 세션에 확정. 등록 시 실동작 실증 함께 권장.
