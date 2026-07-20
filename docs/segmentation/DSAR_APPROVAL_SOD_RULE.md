# DSAR — Runtime SoD Enforcement: 충돌 규칙 (APPROVAL_SOD_RULE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_SOD_RULE`은 "어떤 두 개체가 상충하는가"를 선언하는 **충돌 규칙**(SPEC §2 Canonical Entity 2번)이며, 상충 판정의 원자 단위다.

- **지원 충돌 유형(SPEC §3)**: Role vs Role · Permission vs Permission · Scope vs Scope · Transaction vs Transaction · Workflow Step vs Workflow Step · Organization vs Organization · Dataset vs Dataset · Environment vs Environment.
- **해소 전략(SPEC §16)**: 각 Rule은 위반 시 적용할 Resolution Strategy를 지정 — Block · Challenge · Approval Required · Escalation · Temporary Override · Break Glass.
- Rule은 Matrix(§14)에 집계되어 Runtime Evaluator(SPEC §22)가 매 요청 참조한다. 규칙 자체는 불변(SPEC §36 Immutable Conflict Rule).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 개념 축 | 판정 | 근거(GT file:line) |
|---|---|---|
| Conflict Rule Registry(상충 쌍 선언) | **ABSENT** | GT② §2 "SoD Registry / Conflict Rule / Conflict Matrix = ABSENT"; `roleConflict\|evaluateConflict\|toxicPair\|incompatibleRoles` 매칭 0(GT② §2) |
| Role/Permission/Scope/Context Conflict Engine | **ABSENT(grep 0)** | GT② §2 Row2 |
| 규칙 위반 시 해소전략 실행 워크플로(Approval Required 등) | **ABSENT** | GT② §2 "SoD Exception/Override/Compensating Control 워크플로 = ABSENT" |
| 위반 시 Block 강제를 얹을 삽입지점(재활용원) | PRESENT | 중앙 RBAC 게이트 `index.php:572-611`·`guardTeamWrite` `UserAuth.php:1167-1186`·`guardWarehouse` `Wms.php:557-590`(GT① §C) |
| Resolution=Break Glass 재활용 substrate | PRESENT | break-glass `UserAuth.php:790-801`(GT① §F) |
| Resolution=Compensating(강화MFA) 재활용 | PRESENT | MFA `mfa_policy` `UserAuth.php:929-961`·`:940-945`(GT① §F) |

Rule 스키마·평가는 순신규. 위반 시의 강제(Block)는 기존 PEP 게이트에, 상위 Resolution 전략(Break-Glass/강화MFA)은 기존 substrate에 얹는다(ADR D-1·D-5).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **Rule 필드**: Left Entity · Right Entity · Conflict Type(SPEC §3 8종) · Severity(SPEC §15 Low/Medium/High/Critical/Regulatory) · Resolution Strategy(SPEC §16 6종).
- **불변버전**: SPEC §36 Immutable Conflict Rule — 규칙 수정은 새 버전 추가만(ADR D-2). 과거 평가 재현성 보장.
- **테넌트 격리**: SPEC §36 Tenant Isolation. 재활용 `index.php:614-619` X-Tenant-Id 서버도출(GT① §E).
- **에러 계약(SPEC §33)**: Rule 미존재 시 `SOD_RULE_NOT_FOUND`, 위반 시 `SOD_CONFLICT_DETECTED`/`SOD_POLICY_VIOLATION`.
- **성능(SPEC §38)**: Conflict Lookup ≤ 5ms · False Positive ≤ 0.5%.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **Maker-Checker = dual-control ≠ SoD Rule**(GT② B-2): `Mapping.php:268-271` self-approval 차단·`Alerting.php:642-650` 정족수는 "2인 필요"이지 "상충역할 동시보유 금지 규칙"이 아니다. Transaction Conflict의 인접 선례로 재활용하되 SoD Rule로 개명·흡수 금지.
- **위임상한 클램프**(GT② B-4): `TeamPermissions.php:599-621`·`:642-658` = privilege-escalation 통제이지 role-conflict Rule 아님.
- **시간창 로직**(GT② B-3): `AbTesting.php:161`·`AutoCampaign.php:622`·`PgSettlement.php:221` = 쿨다운/정산 페어링이지 Temporal SoD Rule 아님.
- **비즈 simulate**(GT② B-6): `RuleEngine.php`/`Decisioning.php`/`PriceOpt.php` = 비즈니스 시뮬레이션. SoD Rule Simulation(SPEC §30) 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규)**. Conflict Rule Registry·상충 쌍 선언 구조 grep 0(GT② §2). 코드 변경 0 · NOT_CERTIFIED.
- **재활용(Extend)**: 위반 강제는 PEP 게이트(`index.php:572-611` 등), Break-Glass/강화MFA 해소전략은 break-glass·MFA substrate. 대체 아님(ADR D-1·D-5).
- **선행의존**: BLOCKED_PREREQUISITE — Rule은 Matrix(§14)·Registry(§1)의 하위 원자 단위. Part 1~3-9 인증 후 실 구현(ADR §4). Effective Resolution(3-7)·JIT(3-9)의 활성 역할집합을 입력원으로 결합(ADR D-6).
