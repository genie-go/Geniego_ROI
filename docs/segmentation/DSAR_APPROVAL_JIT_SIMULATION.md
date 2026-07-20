# DSAR — JIT Access Governance: 상승 시뮬레이션 (APPROVAL_JIT_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_SIMULATION`(SPEC §24)은 JIT 정책·파라미터 **변경을 실집행 없이 사전 영향분석**하는 엔티티다. SPEC §24가 정의하는 변경 입력 4종과 출력(영향 지표) 3종:

| 시뮬레이션 입력(변경) | 출력(영향 분석) |
|---|---|
| Approval Chain 변경 | Approval Volume(승인 부하) |
| Duration 변경 | Security Risk(보안 위험) |
| Scope 변경 | Operational Delay(운영 지연) |
| Risk Threshold 변경 | — |

즉 "정책을 이렇게 바꾸면 승인 건수·보안 위험·운영 지연이 어떻게 변하는가"를 프로덕션 반영 전에 예측한다. SPEC §32 API "Simulation 실행"이 진입점이며, 어떤 실 grant도 발급하지 않는 **read-only 예측**이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT file:line) |
|---|---|---|
| elevation 정책 시뮬레이터 | **ABSENT** | GT② §2 "JIT Analytics/Risk/Anomaly on elevation = ABSENT"·"권한상승 risk scoring 0" |
| Approval Chain 원장(변경 대상) | ABSENT | Approval Workflow(권한상승용) ABSENT — 결재 엔진은 마케팅용(`Alerting.php:598`, GT② §2) |
| Duration/Scope 파라미터 원장 | 공백 | `acl_permission` TTL 컬럼 부재 `TeamPermissions.php:152`(GT② §2) |
| Risk Threshold 정의 | ABSENT | 권한상승 risk scoring 0(GT② §2·B-8) |
| maker-checker 상태머신(재활용 참조) | PRESENT(별개도메인) | `Alerting.php:642-650` 정족수2·`:600-606` fail-closed(GT① §4-B) — 마케팅 결재, 시뮬 대상 아님 |

→ **elevation 시뮬레이션은 순신규(ABSENT)**. 변경 대상이 될 Approval Chain·Duration·Risk Threshold 정의 자체가 미구현이므로 시뮬레이션 입력이 존재하지 않는다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 가상 정책 변경(Approval Chain/Duration/Scope/Risk Threshold, §24) + 대조 기준 = 과거 Request/Grant 이력(Analytics §20 지표: Active Elevations·Average Approval Time·Denied Requests 등).
- **출력**: Approval Volume·Security Risk·Operational Delay 3지표의 변화 추정. **부작용 0**(read-only) — 실 grant 발급·실 승인 상태 변경 금지.
- **제약**: Tenant Isolation(§33) — 시뮬레이션은 해당 테넌트 이력만 소비. 임의 숫자 금지·실 이력 파생만(AccessReview 파생분류 선례 `AccessReview.php:87-122`, GT① §4-E). 시뮬레이션 실행 자체를 SecurityAudit(`SecurityAudit.php:12-53`, GT① §4-F)에 기록해 정책결정 추적성 확보.
- **선행 의존**: Elevation Policy·Approval Workflow(권한상승)·Grant Ledger·Analytics(§20) 실 구현 후에만 시뮬레이션 입력·대조군 성립.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT②) | 분리 사유 |
|---|---|---|
| **비즈니스 simulate** `RuleEngine.php` | GT② B-8 | 마케팅 룰 시뮬레이션 — elevation simulation 아님 |
| `Decisioning.php` | GT② B-8 | 의사결정 시뮬레이션(마케팅) — 권한상승 영향분석 아님 |
| `PriceOpt.php` | GT② B-8 | 가격최적화 simulate — elevation simulation 아님 |

→ "simulate/simulation" 어휘가 겹치나 **비즈니스 의사결정·가격·룰 시뮬레이션**과 별개. elevation simulation은 접근 정책 변경의 승인부하·보안위험·운영지연 예측이지, 마케팅/가격 최적화가 아니다(흡수·개명 금지).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. elevation 시뮬레이터는 grep 0(GT② §2). 재활용 substrate = maker-checker 상태머신(`Alerting.php:642-650`)의 **패턴 참조**뿐 — 단 마케팅 도메인이며 시뮬 대상 아님(KEEP_SEPARATE, ADR D-2/D-6).
- **선행 의존**: 시뮬레이션이 변경할 정책 파라미터(Approval Chain/Duration/Risk Threshold)와 대조군(Analytics 이력)이 아직 미구현이므로 이중 선행의존(BLOCKED_PREREQUISITE, ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
