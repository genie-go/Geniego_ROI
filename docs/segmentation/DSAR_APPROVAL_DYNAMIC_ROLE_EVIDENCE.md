# DSAR — Approval Dynamic Role Evidence (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Evidence · 스펙 §1(18)·§2·§36)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role Registry/Rule Engine(본 Part 본체) 실 구현 부재
- **불변**: Snapshot 불변(참조 편 `DSAR_APPROVAL_DYNAMIC_ROLE_SNAPSHOT`과 결합) · UNKNOWN Permit 금지(ADR D-2) · 마케팅 automation 오흡수 금지(KEEP_SEPARATE·ADR D-4) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §1(구현범위 18번: Dynamic Role Evidence)·§2(Canonical Entity: `APPROVAL_DYNAMIC_ROLE_EVIDENCE`) = Dynamic Role 활성/비활성 및 §18 Policy Decision(Permit/Deny/Challenge/Escalate/Manual Review) 판단 근거를 사후 검증 가능하게 보전하는 엔티티. §36 Completion Gate가 "Evidence 구축"을 완료조건 항목으로 명문화.

- **순신규 총평**: RBAC용 Rule Engine·Rule Evaluation(§9)이 grep 0(EXISTING_IMPLEMENTATION §2) → 근거를 남길 평가 자체가 없음. 근접 substrate로 `auth_audit_log`(mutable·정적 risk 라벨)만 실재.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence id | Evidence PK |
| 2 | decision id / evaluation id | 대상 Rule Evaluation(§9)/Policy Decision(§18) |
| 3 | evidence type | §3 열거형 |
| 4 | rule id / rule version id | 근거 Rule/Version |
| 5 | attribute snapshot | 평가 시점 attribute 값(§4 Attribute Source) |
| 6 | outcome | TRUE/FALSE/UNKNOWN/ERROR(§9) |
| 7 | recorded at | 기록 시각 |
| 8 | immutable | 항상 true |
| 9 | tenant id | 테넌트 격리 |

## 3. 열거형 / 타입

스펙 원문에 Evidence Type 전용 열거형은 없음(§2 Canonical Entity 목록에 엔티티명만 존재) — §9 Rule Evaluation 출력(TRUE/FALSE/UNKNOWN/ERROR)·§18 Policy Decision(Permit/Deny/Challenge/Escalate/Manual Review)을 근거로 설계 도출: `RULE_EVALUATION_EVIDENCE` · `POLICY_DECISION_EVIDENCE`(스펙 미확정 · 본 편 제안 — 스펙 원문과 혼동 금지).

## 4. 실 substrate 매핑 (ABSENT/근접)

| Evidence Type(제안) | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| POLICY_DECISION_EVIDENCE(근접) | `auth_audit_log`(at/risk 컬럼)·`audit()` 함수 | `UserAuth.php:4165,4174-4197` | 근접(이벤트 기록 자체는 실재)이나 mutable 저장소(불변성 보장 메커니즘 grep 0)·risk는 정적 라벨(호출부 하드코딩 `:4174,4203`)이지 Rule Evaluation 결과 기록이 아님 |
| RULE_EVALUATION_EVIDENCE | Rule Evaluation(§9)·RBAC Rule Engine 자체 ABSENT | — | **ABSENT** — 근거를 남길 평가 자체가 존재하지 않음(EXISTING_IMPLEMENTATION §2) |
| (오흡수 경계) | 마케팅 `RuleEngine.php` 평가(`evaluateTenant`) | `RuleEngine.php:194-220` | **KEEP_SEPARATE** — channel_roas/sku_stock 대상 마케팅 자동화, RBAC 근거 아님(오흡수 금지) |

## 5. 설계 원칙

- Evidence는 사후 위조 불가능해야 감사 신뢰의 최소 조건을 충족한다 — `auth_audit_log`(`UserAuth.php:4165`)는 mutable 테이블(append-only/해시체인 보장 grep 0)이라 그대로는 Evidence 요건 미충족. Snapshot(참조 편)·Digest(참조 편)와 결합해 무결성 축을 별도로 추가해야 한다.
- risk 필드(`auth_audit_log.risk`)는 계산형이 아니라 호출부 하드코딩 정적 라벨(`UserAuth.php:4174,4203`)이므로, Rule Evaluation Evidence의 "outcome" 필드로 그대로 재사용할 수 없다 — 신규 Evaluation Result 구조(§9)가 선행되어야 한다.
- 마케팅 RuleEngine 평가 로그를 Evidence로 오흡수 금지(대상 도메인 상이, ADR D-4).

## 6. Gap / BLOCKED_PREREQUISITE

- RULE_EVALUATION_EVIDENCE = 완전 ABSENT(평가 엔진 자체 없음).
- POLICY_DECISION_EVIDENCE = 근접 substrate(`auth_audit_log`) 존재하나 불변성·근거구조(rule/attribute snapshot) ABSENT.
- 마케팅 `RuleEngine.php` 평가 로그는 KEEP_SEPARATE — RBAC Evidence로 오흡수 금지.
- 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Dynamic Role Registry/Rule Engine 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
