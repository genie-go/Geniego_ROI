# DSAR — Approval Recovery Reconciliation (Part 3-20 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`APPROVAL_RECOVERY_RECONCILIATION`은 복구 전후의 인가 상태를 **다축으로 대조(reconcile)** 하여, 복구가 의도한 상태로 정확히 수렴했고 미해결 잔차(residual delta)가 없음을 증명하는 엔진을 정의한다. 비교 축 4종:

- **Before/After Recovery** — 복구 이전 상태 ↔ 복구 이후 상태 delta 산출.
- **Snapshot** — 저장된 정본 snapshot ↔ 현재 상태 대조.
- **Runtime** — 선언 상태 ↔ 런타임 실제 결정 상태 대조.
- **Configuration** — 구성 baseline ↔ 배포 인스턴스 구성 대조.

Reconciliation은 각 축의 잔차를 분류·정량화하고, 잔차 존재 시 §24 Revalidation·§5 Drift로 재순환한다. **정본 Snapshot이 reconciliation의 기준선**이므로 Snapshot 부재는 곧 비교 대상 미완을 의미한다.

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Before/After 상태 기록(감사 기준) | `backend/src/SecurityAudit.php:14-68`·`:56-68`(append-only) | 재사용 대상 |
| 접근 상태 원장(대조 소스) | `backend/src/Handlers/AccessReview.php:141-171` | 부분 substrate |
| 런타임 결정 경로(Runtime 축) | `backend/public/index.php:610` | 관측 substrate |
| 규정 상태 대조 | `backend/src/Handlers/Compliance.php:120` | 부분 substrate |
| authz Snapshot 저장소(기준선) | 부재 — recovery snapshot 전무(grep 0) | ABSENT |
| delta 산출/잔차 분류 엔진 | 부재 | ABSENT |

## 3. 설계 계약

- **ReconciliationEngine**은 정본 Snapshot을 기준선으로 하는 다축 대조 계층이나, Snapshot·recovery 상태 자체가 부재하여 **비교 대상이 미완**이다(BLOCKED_PREREQUISITE).
- 대조는 read-only이며 상태를 변경하지 않는다. 잔차는 `SecurityAudit.php:14-68` 해시체인에 append-only 기록.
- 잔차 존재 시 §24·§5로 재순환하는 폐루프. delta 임계는 SPEC canonical 파생·임의 하드코딩 금지.
- Snapshot 저장소는 순신설이며 기존 어떤 스냅샷 구조도 authz 인가 상태를 담지 않음(재사용 불가).

## 4. KEEP_SEPARATE

- **재무 정산 reconciliation**: `backend/src/Handlers/PgSettlement.php:215`·`:294-301` — PG 정산 대사이며 authz recovery reconciliation 아님. 흡수 금지.
- **재고 reconciliation**: `backend/src/Handlers/Wms.php:2160` · `backend/src/Handlers/KrChannel.php:415-419` — 재고/채널 재고 대사이며 인가 복구 대조 아님. 별개 유지.

## 5. 판정

**ABSENT** — authz Recovery Reconciliation 엔진은 기준선인 정본 Snapshot과 recovery 상태가 부재(grep 0)하여 비교 대상 자체가 미완이며 순신설 대상이다. 기존 reconciliation 코드는 재무(`PgSettlement.php:215`)·재고(`Wms.php:2160`) 도메인이며 authz recovery reconciliation이 아니므로 KEEP_SEPARATE. Snapshot·§5·§24 선행 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
