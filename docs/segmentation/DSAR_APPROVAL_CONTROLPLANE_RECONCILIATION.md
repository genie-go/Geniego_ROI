# DSAR — Authorization Control Reconciliation (Part 3-19 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Authorization Control Reconciliation이란 **인가 제어면의 여러 상태 표현을 상호 대조하여 발산을 검출·수렴**시키는 거버넌스 계약이다. Drift(§26)의 관측 원천이자 Revalidation(§28)의 정합 기준을 제공한다. §29는 네 비교 대상을 정의한다.

| 비교 대상 | 의미 |
|---|---|
| Control Plane | 선언된 의도 제어 상태(desired state) |
| Runtime | 실제 프로세스에서 유효한 관측 상태(observed state) |
| Snapshot | 특정 시점 동결본(기준선) |
| Active Configuration | 현재 활성화된 설정값 |

## 2. Substrate 매핑
| 계약 요구 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Active Configuration 원천 | app_setting | `Db.php:308-321` | 유일 존재 원천(대조 상대 없음) |
| 설정 접근 경로 | Db 설정 조회 | `Db.php:157-162` | 읽기 경로만(비교 로직 부재) |
| Snapshot 후보 | AdminPlans 미러 | `AdminPlans.php:53-72` | 정적 미러(동결 스냅샷 규약 미정) |
| 발산 기록 흐름 | SecurityAudit | `SecurityAudit.php:14-64` | 기록 가능(대조 엔진 부재) |
| 관측면 | Health probe | `Health.php:56-67` | 가용성만(Runtime 유효상태 미표현) |

## 3. 설계 계약
- **ReconciliationEngine(순신설)**: Control Plane / Runtime / Snapshot / Active Configuration 네 상태를 정규 키로 대조하여 발산 레코드를 산출, Drift(§26)의 입력으로 방출한다.
- **비교 대상 미완 경고**: 현행은 Active Configuration(`Db.php:308-321`)만 실존하고 **Control Plane(의도 상태)·Snapshot(동결본)이 부재** → 비교 삼각형이 성립하지 않음. 따라서 대조는 선행 상태 모델 신설 후에만 가능.
- **수렴 정책**: 발산 검출 시 자동 수정이 아니라 Revalidation(§28)·승인 게이트로 위임(자율 재작성 금지, 승인정책 존중).
- **추적성**: 모든 대조 사이클을 append-only 감사(`SecurityAudit.php:56`)에 근거 첨부.

## 4. KEEP_SEPARATE
- **재무/재고 reconciliation은 별개 도메인**이다. PG 정산 대사(`PgSettlement.php:215`)·WMS 재고 대사(`Wms.php:2160`)를 인가 제어 대조 엔진으로 통합 금지 — 명명만 겹칠 뿐 대상·규약이 다르다.
- 채널 대사(`KrChannel.php:419`)·결제수단 대사(`BillingMethod.php:551`)도 KEEP_SEPARATE.

## 5. 판정
**ABSENT** — Control Plane 대조 엔진 부재. 비교 4대상 중 Active Configuration(`Db.php:308-321`)만 실존하고 Control Plane/Snapshot 부재라 **비교 대상 자체가 미완**. 현행 app_setting 접근(`Db.php:157-162`·`:308-321`)만으로는 대조 불가. 순신설 필요, 선행 상태 모델 부재로 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
