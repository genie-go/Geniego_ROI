# DSAR — Authorization Revalidation Foundation (06-A-03-02-03-04 · §47)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §47 Revalidation Foundation(Hook) · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§47 Revalidation Foundation(Hook) — trigger enum (원문 전사·14종):

`Commit / Expired / Policy Version Changed / Resource Version Changed / Actor Identity Changed / Session Changed / Assignment Changed / Authority Changed / Delegation Changed / Amount Changed / Currency Changed / Kill Switch Changed / Incident Changed / Manual · Custom.`

**`기존 Decision 수정 안 함 · 새 Decision 생성 후 이전과 연결.`**

의미: Revalidation Foundation은 최초 인가 판정(Decision) 이후 **판정 근거가 바뀌는 14종 trigger 발생 시 재검증을 유발하는 Hook**이다. Commit 직전(§5.10)·유효기간 만료·Policy/Resource Version 변경·Actor Identity/Session 변경·Assignment/Authority/Delegation 변경·Amount/Currency 변경·Kill Switch/Incident 변경 시 재평가한다. ★핵심 불변규칙: **기존 Decision을 절대 수정하지 않고, 재검증 결과를 새 Decision으로 생성한 뒤 이전 Decision과 연결**한다(§5.8 Decision=Immutable Snapshot). 이번 Part는 Hook(확장 포인트)만 정의, 실 재검증 엔진은 Part9.

## 2. 기존 구현 대조

- **인가 판정 재검증 Hook은 부재** — 최초 판정 이후 trigger 발생 시 재평가하고 새 Decision을 생성·연결하는 구조 전무. 애초에 판정결과(Decision)를 불변 저장하지 않으므로(auth append만) "재검증할 기존 Decision"이 존재하지 않는다.
- 현 구조는 **매 요청 재평가(stateless)** — 중앙 게이트(`index.php:553-603`)·TeamPermissions RBAC/ABAC(`TeamPermissions.php:120-322`)가 요청마다 처음부터 다시 판정한다. 이는 "항상 최신"이라는 부수효과가 있으나, ① 판정 스냅샷이 없어 "무엇이 바뀌어 결과가 달라졌는지"를 알 수 없고 ② Validation↔Commit 두 시점을 구분해 그 사이 변화를 탐지하는 §5.10 개념이 부재하다.
- 유사하나 무관(매요청 재검증이지 Decision 연결 아님):
  - agency 위임 status='approved' 매요청 재검증 `index.php:74-104` — 승인 철회를 매 요청 반영하나, 기존 Decision을 갱신·연결하는 게 아니라 stateless 재판정.
  - roleOf/isAdmin 매요청 산출 `TeamPermissions.php:120-136`·tenant 강제주입 `index.php:590-593,600` — 전부 요청 시점 재해석.
  - Commit 직전 재검증(§5.10) → no hits. Validation과 Commit을 분리하는 개념 자체 부재.
- **trigger 14종(Policy/Resource Version·Actor Identity·Session·Assignment/Authority/Delegation·Amount/Currency·Kill Switch·Incident Changed) 기반 Revalidation Hook** → no hits. 이 trigger들이 참조할 상위 구조체(Decision §24·Version §44·Kill Switch §46·Assignment/Authority/Delegation §3.3)가 대부분 ABSENT.
- **기존 Decision 수정 금지·새 Decision 연결** → no hits. Decision 불변저장·이전-이후 연결 링크 구조 부재.

## 3. 판정

- Verdict: **ABSENT (순신규 · Hook 정의만)**
- 근거: 판정결과를 불변 Decision으로 저장하지 않으므로(매요청 stateless 재판정) 재검증 Hook의 대상(기존 Decision)도, trigger가 참조할 버전/스냅샷 근거도 부재. 현 매요청 재평가는 drift 미탐지(변화 원인 추적 불가)이자 §5.10 미구현.
- 선행 의존: Revalidation은 Decision(§24)·Decision Snapshot(§34)·Commit Binding(§39)·Version Resolution(§44)·Kill Switch(§46)·Drift(§48)를 소비 — 이들이 ABSENT라 재검증이 유발·연결할 대상 자체가 부재.
- cover: **0** (재검증 Hook·Decision 연결 전무. 매요청 stateless 재판정은 "재검증"이 아니라 상태 부재의 부수효과·KEEP_SEPARATE).

## 4. 확장/구현 방향 (설계)

- 순신규 Revalidation Foundation Hook — trigger 14종(Commit/Expired/Policy·Resource Version/Actor Identity/Session/Assignment/Authority/Delegation/Amount/Currency/Kill Switch/Incident Changed/Manual/Custom)을 확장 포인트로 선언. 실 재검증 엔진은 Part9(이번 Part=Hook Interface만).
- ★불변 봉인(§5.8): 재검증은 **기존 Decision을 절대 수정하지 않고** 새 Decision(§24)을 생성해 previous decision 참조로 연결 — Decision Snapshot(§34) Immutable 유지. Decision 수정 API 금지(§60).
- §5.10 Commit 재검증: Validation 시 Decision Binding(§38)에 봉인한 Expected Version/Actor/Session/Resource Version을 Commit 직전 Commit Binding(§39)에서 대조, 불일치 시 Revalidation trigger 발화 → 새 Decision 생성.
- Golden Rule=Extend: 현 매요청 stateless 재판정(`index.php:74-104`·`TeamPermissions.php:120-136`)의 "항상 최신" 성질을 Revalidation의 Commit-time 재평가 substrate로 재사용 — 단 stateless를 "Decision 저장 + trigger 기반 재검증 + 연결"로 승격해 drift 추적 가능하게(§48 Drift Foundation과 결합).
- 실 배선은 후속 Part9(이번 Part=설계·Hook·확장 포인트만).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DRIFT_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_VERSION_RESOLUTION]] · [[DSAR_APPROVAL_AUTHORIZATION_KILL_SWITCH]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
