# DSAR — Authorization Simulation Foundation (06-A-03-02-03-04 Part 1 · §50)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용원=[[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]](GROUND_TRUTH) allowlist. 여기 없는 file:line 인용 금지.

## 1. 원문 전사 (Canonical Contract)

§50 Simulation Foundation 원문:

- Simulation 유형(13종): `SUBJECT` / `RESOURCE` / `ACTION` / `POLICY_VERSION` / `TENANT` / `ORGANIZATION` / `AMOUNT` / `CURRENCY` / `SESSION` / `CLIENT` / `CHANNEL` / `KILL_SWITCH_CHANGE` / `CUSTOM`.
- 필드: `base context` · `simulated changes` · `simulated effect` · `simulated reasons` · `simulated obligations` · `simulated constraints` · `simulated challenge` · `difference from actual`.
- **금지**: 실제 `Permit` / `Exception` / `Override` / `Commit` 생성 금지. (§41 Simulation Expiration·§65 Testing Simulation 연계)

의미: 시뮬레이션은 "정책 버전을 바꾸면·주체/리소스/금액을 바꾸면 결정이 어떻게 달라지나"를 **부작용 없이** 미리 계산하는 What-if 계층이다. 실제 인가 결정·예외·오버라이드·커밋을 만들어서는 안 되며, 산출물은 항상 시뮬레이션 결과로만 표식되어 실 Decision Ledger와 격리된다.

## 2. 기존 구현 대조

- **인가 시뮬레이션(What-if) 계층 부재** — 정책 버전/주체/리소스/금액 변경 시 결정 변화를 미리보기하는 구조체 전무. 현행 인가는 오직 실 요청 시점에 즉석 판정만 수행한다(`index.php:553-603`·`TeamPermissions.php:120-322`).
- 위임 상한 검증(`TeamPermissions.php:615-647` assignableMap 교집합·DELEGATION_EXCEEDED)은 "이 역할을 위임 가능한가"를 판정하나, 이는 실 위임 요청의 게이트이지 부작용 없는 시뮬레이션이 아니다.
- Action Contract(§17)의 `SIMULATE` 액션 코드 개념은 스펙 원문에만 존재하며 현행 코드에는 대응 구현이 없다.
- **긍정**: 시뮬레이션 부재로 인해 "시뮬레이션이 실 Permit/Override를 생성하는" §53 위험(부작용 오염)은 현행에 존재하지 않는다. 순신규 설계 시 이 격리 불변식을 처음부터 코드로 강제하면 된다.
- base context 산출에 재사용 가능한 substrate: Subject/Resource/Action/Environment Contract가 확정되면 그 스냅샷을 base로 복제 — 단 선행 Context(§19)·Context Snapshot(§20)이 ABSENT이므로 현재는 복제 원본 자체가 없다.

## 3. 판정

- Verdict: **ABSENT (순신규)** — 인가 시뮬레이션 계층 전무.
- cover: **0**. 위임 상한 검증(`TeamPermissions.php:615-647`)은 실 게이트로 KEEP_SEPARATE, 시뮬레이션 대체 아님.
- 선행 의존: simulated effect/reasons/obligations/constraints/challenge는 Evaluation Pipeline(§42)·Decision(§24)·Reason/Obligation/Constraint/Challenge(§26~§31) 산출을 부작용 없이 재실행해야 산출 → 이들 전량 ABSENT → **BLOCKED_PREREQUISITE**. Evaluation Pipeline 신설 후에만 시뮬레이션 실장 가능.

## 4. 확장/구현 방향 (설계)

- 순신규 `APPROVAL_AUTHORIZATION_SIMULATION`(§6 엔티티) — 13종 시뮬레이션 유형(SUBJECT/RESOURCE/ACTION/POLICY_VERSION/TENANT/ORGANIZATION/AMOUNT/CURRENCY/SESSION/CLIENT/CHANNEL/KILL_SWITCH_CHANGE/CUSTOM)을 `base context` + `simulated changes`로 표현하고, Evaluation Pipeline(§42)을 **읽기전용·부작용 없는 모드**로 재실행해 `simulated effect/reasons/obligations/constraints/challenge`와 `difference from actual`을 산출.
- **격리 불변식(코드 강제)**: 시뮬레이션 경로는 실 Decision/Snapshot/Evidence/Ledger(§24·§34·§35)에 write 금지·Permit/Exception/Override/Commit Binding 생성 금지·Cache(§49) write 금지. 산출물은 별도 simulation 테이블에만 저장하고 만료(§41)를 강제.
- Request Type(§21) `SIMULATION`으로 태깅해 UI_HINT처럼 서버 인가 대체 불가 명시. Static Lint(§54)로 "시뮬레이션 코드가 실 Decision Repository에 write" 패턴 차단.
- 시뮬레이션 자체도 인가 대상 — 정책 버전 시뮬레이션은 민감 내부 Rule 노출 위험이 있으므로 결과에서 sensitive detail(§26)은 redaction. 아무나 정책 What-if를 볼 수 없도록 시뮬레이션 실행 권한을 별도 Policy로 게이트(후속 Part).
- 실 배선은 후속 — Part 1은 Simulation Contract·격리 불변식 정의만.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_AUTHORIZATION_RECONCILIATION_FOUNDATION]] · [[DSAR_APPROVAL_AUTHORIZATION_MIGRATION_FOUNDATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
