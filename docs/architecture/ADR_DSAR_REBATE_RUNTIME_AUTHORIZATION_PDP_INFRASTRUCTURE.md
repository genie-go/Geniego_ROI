# ADR — DSAR Rebate Runtime Authorization, API·UI Enforcement & Policy Decision Infrastructure (EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-6)

- **일자**: 289차 (2026-07-17) · **비파괴 — 코드변경 0**
- **★★스펙 미수령 — 설계 자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **구조·Entity(24)·분류·규칙·통합 전략은 실측 + 5-1~5-5 산출 + 도메인 판단으로 자율 설계** · **정본 스펙 수령 시 재정합** · **§요구 부재 → "완료 조건 판정 불가" · §53/§59 없음**. RP-001 정합.
- **상태**: Accepted (런타임 집행 인프라·UI/API 일관성 계약 명세 확정). 실 PDP/Adapter/가드 구현은 후속 승인 세션.
- **범위**: 런타임 집행만 — Audit/Access Review=5-7 · **전체 Lint/Guard Certification·Golden·Production Certification=5-8**.
- **근거(실측·전부 수치/file:line)**: [`../segmentation/CANONICAL_DSAR_AUTHORIZATION_RUNTIME_ENFORCEMENT.md`](../segmentation/CANONICAL_DSAR_AUTHORIZATION_RUNTIME_ENFORCEMENT.md) · [`UI_API_CONSISTENCY`](../segmentation/CANONICAL_DSAR_AUTHORIZATION_UI_API_CONSISTENCY.md) · **라우트 1,448**(routes.php) · **index.php bypass 조건 143 / 667 라인** · **`authedTenant` 64 핸들러** · **`requirePro`/`requirePlan` 56 핸들러 · 호출부 465(정의부 제외 455)** · **`requireMasterAdmin2` 5 핸들러**(286차) · `PlanPolicy::RANK`(PlanPolicy.php:19)·기능키→최소플랜(:24)·`rank()`(:41)·**주석 "프론트 PLAN_TIER_RANK / MENU_MIN_PLAN 과 정합 유지(변경 시 양쪽 동시 갱신)"**(:14) · **`frontend/src/auth/planMenuPolicy.js`**(**`MENU_MIN_PLAN`** Object.freeze :25 · **`PLAN_TIER_RANK`** :91 · 주석 "menuAccess 설정 전에도 정본 기본 등급(MENU_MIN_PLAN)으로 접근" :6) · **286차 rank 맵 붕괴**(`starter=growth=pro=1` → requirePro 가 사실상 'starter+'·UserAuth.php:330-332) · **주석 "기존 351개 호출부"**(UserAuth.php:329·**286차 시점 값**) · **`tools/guard_headerless_getjson.mjs`**(275차 · 헤더리스 getJson **401 회귀 2차 재발** → CI 가드로 클래스 제거) · **`tools/e2e/{smoke,render,scenarios}.mjs`**(266차 · smoke=GET 500 스윕+계약키 가드·**CI Phase6 게이트**) · `.githooks/baseline.json`(267차) · agency 토큰 **서버바인딩 tenant 주입(위조불가)**(index.php:97-100) · **SCIM 즉시 deprovision**(EnterpriseAuth.php:400) · **★부재 확정**: 중앙 PDP · Authorization Cache(5-1 §51) · PEP Registry · Bypass Registry · Coverage 매핑 · 자동 Drift 탐지.

## 결정 (핵심)

1. **★분산 규모를 숫자로 확정했다(정직)**: **라우트 1,448** 을 **PEP 4계통**이 지킨다 — ①미들웨어 **1개소(bypass 조건 143 / index.php 667 라인)** ②`authedTenant` **64 핸들러** ③`requirePro`/`requirePlan` **56 핸들러·호출부 455** ④`requireMasterAdmin2` **5 핸들러**. **중앙 PDP·Cache·PEP Registry·Bypass Registry·Coverage 매핑 전부 부재**.

2. **★[자기 인용 정정] `requirePro` 호출부는 351 이 아니라 455 다**: 5-1~5-5 에서 인용한 **"호출부 351"** 은 **코드 주석 값**("기존 351개 호출부의 실효 동작을 보존한다"·UserAuth.php:329)이며 **286차 시점 기준**이다. **현재 실측 465**(정의부 제외 **455**) → **주석 작성 후 100+ 증가**. **★이는 "PEP 분산이 계속 심화 중"이라는 신호** — 5-1 §51 이 경고한 **"PEP 를 101번째로 추가하는 것"이 실제로 진행 중**. 앞선 파트의 "351" 인용은 **주석 인용임을 명시**하고 현재 실측치로 정정한다.

3. **★PEP 126+ 를 한 번에 바꾸는 것은 불가능 — 3단계 점진 통합(자율 판단·본 파트 핵심)**:
   1. **PDP 신설하되 기존 게이트를 대체하지 않는다** — `authedTenant`/`requirePlan`/`requireMasterAdmin2` **내부에서 PDP 를 호출**하도록 **위임(Adapter)**. **동작 동일 = 회귀 0** · **판정 근거만 PDP 가 기록**(5-1 Decision 기록 부재 해소).
   2. **PEP Registry 로 전수 목록화** — **1,448 라우트 × PEP 매핑**(Coverage).
   3. **신규 라우트만 PDP 직결** — **기존 455 호출부는 건드리지 않는다**(Legacy Equivalence=5-8).
   **★근거**: `requirePro` 의미를 바꿨을 때 무슨 일이 일어나는지 **286차가 이미 증명**(rank 맵 붕괴 → requirePro 가 사실상 'starter+').

4. **★Bypass Registry — 143 조건의 계약화(§3)**: index.php 의 **bypass 143 조건**은 **"인증 없음"이 아니라 "다른 수단으로 위임"**(세션 self-auth·파트너 토큰·서명 HMAC·공개 비콘). → **Registry 의 핵심 필드 = `self_auth_mechanism`**(무엇이 대신 지키는가) · **이 값이 비면 = 진짜 무인증 = Critical**. **신규 bypass 는 `justification`+`owner`+주기 review + Approval(5-3) 필수** · **★`/api` 별칭 변형 동시 등록**(192차 권한상승 교훈). **★현행 구조가 275차 사고의 뿌리**: bypass 에 **넣으면 미들웨어가 안 지키고**(핸들러 self-auth 의존) **안 넣으면 세션 토큰 호출이 401**(헤더리스 getJson 401 회귀 **2차 재발**) = **양쪽 다 위험한 이분법**.

5. **★[5-5 위임 판정·자율] Revocation 경로 불일치 = 위험도 하향**: 5-5 가 "SCIM 만 즉시 세션 삭제·타 경로 미확인"을 Critical 후보로 넘겼다. **본 블록 실측: `Authorization Cache` 부재**(5-1 §51) + **판정이 요청마다 DB 재조회**(authedTenant·requirePlan 이 매 요청 `app_user` 조회·UserAuth.php:41-45 패턴) → **Role/plan 변경은 다음 요청부터 즉시 반영** → **"Revoked 권한으로 접근 지속" 위험은 설계상 낮다**. **단 세션 자체는 유효** → **계정 비활성화 시엔 세션 삭제 필요**(SCIM 정본). **★결론: 5-5 관찰은 "Critical" 이 아니라 "캐시 부재 덕분에 완화됨"** · **★캐시를 도입하는 순간 실재화**(§5 강행 규칙). **PM 재증명 전 확정 금지**.

6. **Cache Policy(§5) — 도입 시 강행**: **①TTL 상한(짧게) ②Revocation 시 즉시 무효화 ③고위험 Action 은 `DISABLE_CACHE`**(5-1 §30) **④Policy Version 변경 시 전량 무효화** **⑤캐시 히트가 위험**(만료 권한 허용·5-1 §43 Critical). **Revocation Propagation = Grant REVOKED + 세션 종료 + 캐시 무효화**(5-5 "세션이 살아 있으면 회수가 아니다" 계승).

7. **Coverage(§4) — 1,448 라우트 전수 매핑**: 현행은 **어느 라우트가 무엇으로 지켜지는지 전수 파악 불가**(4계통 분산 + bypass 143). **★재사용 정본**: **`tools/e2e/smoke.mjs`**(GET 500 스윕 + 계약키 가드 · **CI Phase6 게이트**)가 **라우트 전수 순회의 실 인프라** · `render.mjs`(라우트 자동 도출) → **Coverage 검증으로 확장**(중복 도구 신설 금지).

8. **Performance Budget(§7)**: PDP `decision_latency` 상한 · **초과 시 fail-closed**(느리다고 통과 금지) · **캐시 없이도 성립해야** 한다(현행 DB 재조회가 이미 그러함).

9. **★권한 소스가 2개다 — 이미 2번 사고를 냈다(짝 문서 §0)**: 백엔드 `PlanPolicy` ↔ 프론트 **`frontend/src/auth/planMenuPolicy.js`**(`MENU_MIN_PLAN` :25 · `PLAN_TIER_RANK` :91) 가 **수동 동기화**(주석 :14 "변경 시 양쪽 동시 갱신"). **사고 2건**: ①**286차 rank 맵 붕괴**(UI/백엔드 위계 불일치 → requirePro 의미 변질) ②**275차 헤더리스 getJson 401 회귀 2차 재발**(UI 는 되는데 API 는 401) — **후자는 CI 가드로 클래스 제거** → **★전자도 동일하게 CI 가드로 해소하는 것이 정합**.

10. **★UI/API 드리프트 두 방향의 위험이 다르다(자율 판단)**: **UI 차단·API 허용 = 보안 사고(잠복·CRITICAL·5-1 §43)** vs **UI 허용·API 거부 = 가용성 사고(즉시 발견·HIGH·275차)**. **★286차 rank 붕괴는 전자에 가까웠다**(requirePro 가 의도보다 **넓게 허용**) → **"UI 차단·API 허용" 방향을 우선 탐지**.

11. **UI Projection 3방식(§2·권장순·자율)**: ①**런타임 투영**(백엔드가 권한 맵 제공 → 드리프트 구조적 불가·**단 planMenuPolicy.js 가 "menuAccess 설정 전 fallback 정본" 역할을 겸하므로**(:6) **이 요구를 먼저 해소해야 함** — 무조건 정답 아님) ②**빌드타임 생성**(정본에서 자동 생성·수기 편집 금지) ③**★CI 대조 가드(최소·즉시 적용 가능)** — **275차 `guard_headerless_getjson.mjs` 와 동일 형태** → **가장 현실적인 1단계**.

12. **★신설 권장 가드**: **`guard_plan_policy_drift.mjs`** — `PlanPolicy.php` 의 RANK/기능키 매핑과 `planMenuPolicy.js` 의 `PLAN_TIER_RANK`/`MENU_MIN_PLAN` 을 **파싱·대조**하여 **불일치 시 CI 차단**. **★"양쪽 동시 갱신"을 사람에게 의존하지 마라** — **286차가 그 의존이 실패한 증거** · **275차 가드가 성공한 선례**(중복 도구가 아니라 **동일 클래스 확장**).

13. **`Object.freeze` 는 정합을 보장하지 않는다**: planMenuPolicy.js 의 freeze(:25/:91)는 **런타임 변조만 차단** · **백엔드와의 값 일치는 미보장** — 정합은 여전히 **사람의 수동 갱신**에 의존.

14. **정직·무후퇴**: **코드변경 0 = 회귀 0**. index.php 미들웨어·bypass 143·authedTenant 64·requirePro/requirePlan 455 호출부·requireMasterAdmin2·PlanPolicy·planMenuPolicy.js·guard_headerless_getjson·e2e 3계층·baseline.json·SCIM deprovision·tenant 주입 보존. **스펙 §요구 부재로 완료 조건 판정 불가** · **실 코드·PDP·Adapter·가드 0건**.

## 무후퇴·영구 규칙
신규 런타임 집행 도입 전: **★PDP 는 Adapter 위임으로 신설(기존 게이트 대체 금지·회귀 0)·PEP Registry 로 1,448 라우트 전수 매핑·신규 라우트만 PDP 직결·기존 455 호출부 불변**(286차 rank 붕괴가 의미 변경의 위험을 증명) · **Bypass 는 `self_auth_mechanism` 필수**(비면 무인증=Critical)·justification·owner·주기 review·Approval·**`/api` 별칭 동시 등록**(192차) · **Cache 도입 시 TTL 상한·Revocation 즉시 무효화·고위험 DISABLE_CACHE·Policy Version 변경 시 전량 무효화**(★캐시가 5-5 위험을 실재화) · **권한 회수 = Grant REVOKED + 세션 종료 + 캐시 무효화** · **PDP timeout = fail-closed** · **UI 는 정본의 투영일 뿐 판정 주체 아님**(§4.8) · **★"양쪽 동시 갱신"을 사람에게 의존 금지 → CI 가드**(275차 선례·286차 실패 증거) · **UI 차단·API 허용 방향 우선 탐지**(잠복 보안 사고) · **기존 도구 확장**(e2e smoke→Coverage · guard_headerless→drift 가드 · 중복 도구 신설 금지) · **1차 grep/주석 인용을 실측으로 오인 금지**(★"351"=주석·실측 455) · ADR/PM/Repeat Problem/Agent History 기록.

## 결과
Runtime Entity(14) + UI/API Consistency Entity(10) = **24** · **실측 확정=라우트 1,448 · bypass 조건 143 · authedTenant 64 · requirePro/requirePlan 56 핸들러/호출부 455(★주석 351=286차 값) · requireMasterAdmin2 5 · PEP 4계통 · 중앙 PDP/Cache/Registry/Coverage/Drift 탐지 전부 부재** · **REAL 재사용=★guard_headerless_getjson(275차 CI 가드 정본·drift 가드의 직접 선례)·★e2e 3계층(266차 smoke=GET 500 스윕+계약키+CI Phase6 → Coverage 확장)·render.mjs(라우트 자동 도출)·baseline.json(267차)·agency 서버바인딩 tenant 주입(위조불가)·SCIM 즉시 deprovision·PlanPolicy(정본)·DB RLS 관례** · **NOT_APPLICABLE(신설)=PDP·PEP Registry·Bypass Registry(self_auth_mechanism)·Coverage 매핑·Cache Policy·Revocation Propagation·Performance Budget·Drift Detection(7 Rule)·CI Guard Registry·Contract Test·`guard_plan_policy_drift.mjs`(권장)** · **★자율 판단 4건=①PDP 3단계 점진 통합(Adapter 위임·기존 불변) ②Bypass 핵심=self_auth_mechanism ③5-5 Revocation 위험 하향(캐시 부재 덕분·캐시 도입 시 실재화) ④UI Projection 3방식(런타임 투영 권장이나 fallback 요구 선해소 필요·CI 가드가 현실적 1단계)** · **★자기 인용 정정=requirePro 호출부 351(주석·286차) → 실측 455(100+ 증가·PEP 분산 심화 신호)** · Drift Severity(UI차단·API허용=CRITICAL 잠복 / UI허용·API거부=HIGH 즉시발견) · Guard(8+5)/Error(6+5) **계약 명세 확정**(코드변경 0). 산출=docs/segmentation/CANONICAL_DSAR_AUTHORIZATION_{RUNTIME_ENFORCEMENT,UI_API_CONSISTENCY}.md. **★스펙 미수령·자율 설계 명시 · 분산 규모 수치 확정(1,448 라우트/PEP 126+/호출부 455) · 자기 인용 정정(351→455) · 5-5 위임 판정(캐시 부재 덕분 완화) · 권한 소스 2개가 이미 2번 사고(286/275차) · "양쪽 동시 갱신"을 사람에게 의존 금지 정직표기**. 다음 **Part 4-5-3-1-5-7 — Authorization Audit, Evidence, Compliance & Access Review**(입력=5-1 Audit Event 24·Evidence 계약 · **현행 audit_log 12파일(도메인별 KEEP_SEPARATE)** · 5-4 Post-Action Review · 5-5 만료 세션 정리 Job 부재 관찰 · **Access Review 부재(grep 0)**).
