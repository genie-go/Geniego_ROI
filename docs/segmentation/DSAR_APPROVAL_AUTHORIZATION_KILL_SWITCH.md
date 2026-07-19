# DSAR — Authorization Kill Switch (06-A-03-02-03-04 · §46)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §46 KILL_SWITCH · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§46 KILL_SWITCH — scope enum (원문 전사·14종):

`PLATFORM` / `TENANT` / `LEGAL_ENTITY` / `ORGANIZATION` / `DOMAIN` / `RESOURCE_TYPE` / `ACTION_TYPE` / `POLICY` / `DEFINITION` / `CLIENT` / `CHANNEL` / `SYSTEM_ACTOR` / `SERVICE_ACCOUNT` / `CUSTOM`.

필수 필드 (원문 전사):
- `reason` · `severity`
- `activated by` / `approved by`
- `activated / expires / deactivated`
- `allowed read behavior`
- `blocked actions`
- `notification` / `incident`
- `immutable digest`

의미: Kill Switch는 사고·침해·정책오류 발생 시 **특정 범위(플랫폼~서비스계정 14종)의 인가를 즉시 차단**하는 비상 정지 장치다. scope별로 blocked actions(차단할 Action)와 allowed read behavior(읽기 허용 여부)를 선언하고, activated/expires/deactivated 시각·activated/approved by·reason·severity·incident 연결·immutable digest를 남긴다. 판정 파이프라인(§42)은 Kill Switch 활성 시 최종 Effect=KILL_SWITCH_BLOCKED로 귀결(§25 Decision Result·§45 Fail-Closed)하고, Cache(§49)는 Kill Switch 활성 범위를 즉시 무효화한다.

## 2. 기존 구현 대조

- **인가 Kill Switch는 전무(순신규)** — scope 14종 단위로 인가를 즉시 차단하는 비상 정지 구조체 전무. GROUND_TRUTH·본 판정 규율 모두 "Kill Switch 전무" 확정.
- **scope 14종 / blocked actions / allowed read behavior 선언** → no hits.
- **activated/expires/deactivated · activated/approved by · incident · immutable digest** → no hits.
- 유사하나 무관(비상 정지 아님):
  - `GENIE_STRICT_AUTH=1` 무테넌트 키 403 `index.php:585-587` — 환경변수 토글이나 scope별 비상차단이 아니라 전역 정책 스위치(기본 OFF).
  - agency 위임 status='approved' 재검증 `index.php:74-104` — 승인 철회 시 차단되나 대상은 agency 링크 1건, 인가 전역 Kill Switch 아님.
  - api_key scopes 화이트리스트 `Keys.php:99-113,198-206` — 키별 권한 축소이나 비상 정지 장치 아님.
  - Registry/Policy status(§7 SUSPENDED) 기반 정지는 상위 Registry가 ABSENT라 존재 불가.
- **immutable digest / incident 연결** → no hits. 앞 블록 Hash Chain 정책(§37)을 인가 Kill Switch에 결합한 구조 전무.

## 3. 판정

- Verdict: **ABSENT (전무 · 순신규)**
- 근거: scope 14종 단위 비상 인가 차단·blocked actions·allowed read behavior·activated/expires·incident·immutable digest의 어느 요소도 실재하지 않음. GENIE_STRICT_AUTH·agency 재검증·api_key scopes는 전역 토글/개별 권한 축소이지 비상 정지 장치가 아님(KEEP_SEPARATE).
- 선행 의존: Kill Switch는 Registry(§7)·Domain(§9)·Policy(§10)·Definition(§12)·Decision Result(§25 KILL_SWITCH_BLOCKED)·Cache(§49 즉시 Invalidation)·Digest(§37)를 소비 — 이들이 전부 ABSENT라 Kill Switch가 차단할 대상(Policy/Definition/Domain)도, 결합할 판정결과·캐시·digest도 부재.
- cover: **0** (인가 비상 정지 장치 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_authorization_kill_switch` — scope 14종(PLATFORM~SERVICE_ACCOUNT/CUSTOM)별로 reason·severity·activated/approved by·activated/expires/deactivated·allowed read behavior·blocked actions·notification/incident·immutable digest를 데이터로 선언.
- 판정 결합: Evaluation Pipeline(§42) 후반에 Kill Switch 조회 단계를 두어 활성 범위 매칭 시 최종 Effect=KILL_SWITCH_BLOCKED(§25)·Decision Result·Audit(§36 KILL_SWITCH_ACTIVATED/RUNTIME_BLOCKED). Fail-Closed(§45)의 Deny 트리거 목록에 Kill Switch 포함.
- Cache 즉시 무효화(§49·§63): Kill Switch 활성 시 해당 scope의 캐시 키(kill switch version 포함)를 즉시 Invalidation — 활성 상태를 우회하는 캐시 히트 금지.
- Golden Rule=Extend: 기존 GENIE_STRICT_AUTH 토글(`index.php:585-587`)·agency status 재검증(`index.php:74-104`)의 "즉시 차단" 선례를 Kill Switch의 특수 scope(PLATFORM·SERVICE_ACCOUNT) 구현 참고로 재사용 — 별도 비상 장치로 신설하되 기존 차단 idiom과 정합.
- immutable digest: 앞 블록 Hash Chain 정책(§37)을 결합해 Kill Switch 활성/해제 이벤트를 tamper-evident 원장에 봉인 — 단, `menu_audit_log.hash_chain` 류의 verify() 0 장식 오인 금지(289차 정정).
- 실 배선은 후속 Part(이번 Part=설계·확장 포인트만).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_FAIL_CLOSED_POLICY]] · [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION_PIPELINE]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
