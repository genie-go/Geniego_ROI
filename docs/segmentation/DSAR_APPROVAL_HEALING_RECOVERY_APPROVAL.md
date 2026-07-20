# DSAR — Recovery Approval Manager (Part 3-20 §16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §16 — Recovery Approval Manager)

APPROVAL_RECOVERY_APPROVAL은 자동힐링(§11)이 자동집행할 수 없는 고위험 인가 복구 5종을 인간 승인 게이트(maker-checker)로 통제한다.

| 복구 유형 | 정의 | 승인 계약 |
|-----------|------|-----------|
| Global Policy Rollback | 전역 정책 이전 버전 복원 | 정족수 승인·self-approval 차단 |
| Region Isolation | 리전 격리(차단) 결정 | maker-checker·근거 justification |
| Federation Disconnect | 외부 페더레이션 연결 해제 | 정족수·감사 이벤트 |
| Critical Config Restore | 임계 authz config 복원 | 승인 후 §11 Executor 집행 |
| Compliance Override | 컴플라이언스 예외 승인 | 근거 필수·이중 서명 |

## 2. Substrate 매핑

| 승인 요소 | 현행 substrate | 판정 |
|-----------|----------------|------|
| maker-checker 승인 큐 | `Mapping.php:240`(승인)·producer `Mapping.php:209`·`Mapping.php:246-250` | **PARTIAL(재사용)** |
| self-approval 차단 | `Mapping.php:268-271` | 재사용 |
| 정족수(quorum) | `Mapping.php:287`·`Mapping.php:278-283` | 재사용 |
| 경보/집행 라우팅 | `Alerting.php:642-650`(`Alerting.php:610-657`)·`Alerting.php:660` | 확장 대상(producer 신설) |
| 근거 justification | AccessReview (`AccessReview.php:188-194`·`AccessReview.php:180-242`) | 재사용 |

## 3. 설계 계약

- Recovery Approval Manager는 **신규 승인 엔진을 만들지 않고** 기존 maker-checker 정족수 substrate(`Mapping.php:240`·`:268-271`·`:287`)를 **recovery 도메인으로 확장**한다. 복구 유형별 위험 등급→필요 정족수·이중 서명 매핑을 추가한다.
- Alerting 경보 경로(`Alerting.php:642-650`)는 소비자만 실재하고 recovery 이벤트 **producer는 신설 필요**하다(무-producer 스켈레톤 재발 방지). producer는 §11 Healing Plan에서 고위험 판정 시 승인 큐 항목을 생성한다.
- 모든 승인 결정·집행은 SecurityAudit(`SecurityAudit.php:14`) 체인에 근거(justification·정족수 충족 여부)와 함께 기록한다. 근거 없는 override는 Fail-closed로 거부한다.

## 4. KEEP_SEPARATE (흡수 금지)

- **DB 스키마 self-heal**(`Db.php:308`·`Db.php:585-590`·`AdminPlans.php:661-663`·`Wms.php:859`)은 스키마 DDL 자가치유로, Critical Config Restore와 혼동 금지(물리 스키마 ≠ authz config). 별도 유지.
- Alerting 자동 실행 경로는 마케팅/운영 경보 도메인이며, recovery 승인 producer는 그 위에 얹지 말고 별도 authz 이벤트로 분리한다.

## 5. 판정

**PARTIAL** — maker-checker 정족수·self-approval 차단·justification substrate(`Mapping.php:240`·`:268-271`·`:287`·`AccessReview.php:188-194`)는 실재하나 recovery 도메인 확장·Alerting producer 신설이 필요하다. 순신설 부분 다수. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
