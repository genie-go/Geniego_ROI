# DSAR — Authorization Drift Foundation (06-A-03-02-03-04 · §48)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · §48 Drift Foundation · 289차 후속 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> ★ file:line 인용 = [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist 등재분만. 지어내기 금지.

## 1. 원문 전사 (Canonical Contract)

§48 Drift Foundation — drift type enum (원문 전사·20종):

`POLICY / DEFINITION_VERSION · REGISTRY_SCOPE · SUBJECT_IDENTITY · AUTHENTICATION · RESOURCE_VERSION / STATE · ACTION · ENVIRONMENT · ASSIGNMENT · AUTHORITY · DELEGATION · AMOUNT · CURRENCY · OBLIGATION · CONSTRAINT · EXCEPTION · OVERRIDE · KILL_SWITCH_DRIFT / CUSTOM.`

필수 필드 (원문 전사):
- `previous / current value digest`
- `detected`
- `severity`
- `commit blocked`
- `revalidation required`
- `resolved by decision`

의미: Drift Foundation은 최초 인가 판정(Validation) 시점과 실제 실행(Commit) 시점 사이에 **판정 근거가 달라졌는지를 previous/current value digest 대조로 탐지**하는 구조다. 20종 drift(Policy/Definition Version·Registry Scope·Subject Identity·Authentication·Resource Version/State·Action·Environment·Assignment/Authority/Delegation·Amount/Currency·Obligation/Constraint·Exception/Override·Kill Switch)를 각각 이전값 digest와 현재값 digest로 비교하고, drift 발견 시 severity에 따라 commit blocked(커밋 차단)·revalidation required(재검증 요구·§47)를 발화하며 resolved by decision으로 연결한다. §5.10(Validation↔Commit 분리)·§5.8(Immutable Snapshot)의 변화 탐지 계층이다.

## 2. 기존 구현 대조

- **인가 판정 drift 탐지는 부재** — previous/current value digest 대조로 판정 근거 변화를 탐지하는 구조 전무. 판정 스냅샷(Decision Snapshot §34)·digest(§37)를 남기지 않으므로 "이전값"이라는 비교 기준 자체가 없다.
- 현 구조는 **매 요청 stateless 재판정**(`index.php:553-603`·`TeamPermissions.php:120-322`)이라 항상 현재값으로만 판정 → 두 시점(Validation↔Commit)을 비교할 수단이 없어 **drift 미탐지**. "무엇이 언제 바뀌었나"를 추적 불가(§47과 동일 근본 부재).
- **previous/current value digest / detected / commit blocked / revalidation required** → no hits. digest 대조·commit 차단·재검증 연결 구조 부재.
- 유사하나 무관(변화 반영이지 drift 탐지 아님):
  - agency status='approved' 매요청 재검증 `index.php:74-104` — 승인 철회를 즉시 반영하나, 이전-현재 digest를 비교해 "drift 발생"으로 기록·차단하지 않고 그냥 최신값으로 판정.
  - tenant 강제주입 `index.php:590-593,600`·roleOf 매요청 산출 `TeamPermissions.php:120-136` — 요청 시점 재해석(drift 무관).
  - Version 변경 탐지(§44 Validation↔Commit Version 변경) → no hits(정책 버전화 ABSENT라 버전 drift도 성립 불가).
- **drift 20종이 참조할 상위 구조체**(Policy/Definition Version §13·Registry Scope §8·Resource Version §16·Assignment/Authority/Delegation §3.3·Exception §32·Override §33·Kill Switch §46) 대부분 ABSENT → drift 비교 대상 자체 부재.

## 3. 판정

- Verdict: **ABSENT (순신규)**
- 근거: 판정 근거의 이전값 digest를 저장하지 않으므로(매요청 stateless 재판정·Snapshot 부재) drift 20종의 어느 것도 탐지 불가. 현 "항상 최신값 판정"은 drift를 우회하는 게 아니라 drift 개념 자체의 부재이며, Validation↔Commit 사이 변화를 차단할 수단이 없다.
- 선행 의존: Drift는 Decision Snapshot(§34)·Digest(§37)·Version Resolution(§44)·Revalidation(§47)·Commit Binding(§39)·Kill Switch(§46)·Exception(§32)·Override(§33)를 소비 — 이들이 전부 ABSENT라 previous/current digest 대조의 두 항 모두 부재.
- cover: **0** (인가 drift 탐지 전무. 매요청 재판정은 drift 미탐지·KEEP_SEPARATE).

## 4. 확장/구현 방향 (설계)

- 순신규 Drift Foundation — drift 20종(POLICY/DEFINITION_VERSION·REGISTRY_SCOPE·SUBJECT_IDENTITY·AUTHENTICATION·RESOURCE_VERSION/STATE·ACTION·ENVIRONMENT·ASSIGNMENT·AUTHORITY·DELEGATION·AMOUNT·CURRENCY·OBLIGATION·CONSTRAINT·EXCEPTION·OVERRIDE·KILL_SWITCH/CUSTOM)을 previous/current value digest 대조로 탐지하는 구조를 선언. severity·detected·commit blocked·revalidation required·resolved by decision 필드.
- §5.10 봉인: Validation 시 판정 근거를 Decision Snapshot(§34)·Digest(§37)에 봉인하고, Commit 직전 현재값 digest와 대조 → drift 발견 시 **commit blocked** + Revalidation(§47) trigger 발화(새 Decision 생성·연결). Critical drift는 Commit Binding(§39) 통과 금지.
- Golden Rule=Extend: 현 매요청 재판정(`index.php:74-104`·`TeamPermissions.php:120-136`)이 이미 "현재값"을 산출하므로, 이를 Drift의 current value 소스로 재사용 — 신규는 previous value(Validation 시점 Snapshot digest) 저장 + 대조 로직. 재구현 아닌 확장.
- Drift↔Revalidation↔Version Resolution 결합: Version Resolution(§44)이 Validation↔Commit Version 변경을 탐지하면 POLICY/DEFINITION_VERSION drift로 기록, Revalidation(§47)이 새 Decision으로 해소.
- 실 배선은 후속 Part9(이번 Part=설계·확장 포인트만).

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_REVALIDATION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_VERSION_RESOLUTION]] · [[DSAR_APPROVAL_AUTHORIZATION_KILL_SWITCH]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
