# DSAR — Authorization Mesh Drift Detection (Part 3-24 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_MESH_DRIFT(§22)는 다중 노드/리전으로 구성된 권한 승인 메시(Authorization Approval Mesh)에서 각 참여 노드가 보유한 유효 권한 상태가 **정본(canonical baseline)에서 이탈(drift)** 하는 현상을 감지·분류·기록하는 거버넌스 계약이다. Drift는 5개 축으로 정의한다.

- **Node Drift** — 개별 노드의 정책 스냅샷 해시가 baseline 해시와 불일치.
- **Region Drift** — 리전 단위 집계 상태가 글로벌 기준과 이탈.
- **Policy Drift** — 정책 규칙 집합의 버전/내용 표류.
- **Trust Drift** — 노드 신뢰도(Trust Score) 하락으로 인한 유효 권한 축소.
- **Topology Drift** — 메시 참여 노드 집합(가입/탈퇴) 변화로 인한 위상 이탈.

SPEC은 Drift 감지 결과를 §24 Reconciliation의 입력으로 넘긴다. 본 계약은 감지·분류·불변 기록까지만 책임지며 자동 교정은 하지 않는다.

## 2. Substrate 매핑

| Drift 축 | 요구 substrate | 현행 실재 | 판정 |
|---|---|---|---|
| Node/Region/Policy/Trust/Topology Drift | Mesh 노드 레지스트리·baseline 해시·drift 이벤트 | 부재(grep 0) | ABSENT-greenfield |
| Drift 불변 기록 | append-only 해시체인 | 감사 해시체인 `SecurityAudit.php:27`·`:63-64` 확장 참고 | 확장 대상 |
| 물리 노드 위상 | 다중 노드 클러스터 | 단일노드 `Db.php:63-87` | 단일노드(위상 미형성) |

## 3. 설계 계약 (greenfield)

- Drift 감지기는 각 노드 정책 스냅샷의 canonical 해시를 baseline과 비교하는 순수 함수로 설계하되, 실 배선은 후속 승인 세션에서만.
- Drift 이벤트는 발생 즉시 append-only 로그로 기록하고 preimage(노드 id·해시·타임스탬프)를 보존한다. 기존 감사 해시체인(`SecurityAudit.php:27`·`:63-64`)의 append-only 패턴을 확장 근거로 삼는다.
- 단일노드 환경(`Db.php:63-87`)에서는 Topology/Region Drift가 원천적으로 미형성이므로, 다중 노드 형성 전까지 해당 축은 정의만 두고 감지 비활성(no-op)으로 명세한다.

## 4. KEEP_SEPARATE

- **ML 모델 드리프트는 별개다.** `ModelMonitor.php:18-19`·`:42`의 모델 드리프트/성능 표류 감지는 ML 예측 품질 도메인으로, 권한 메시 drift와 개념·데이터·수명주기가 전혀 다르다. Mesh Drift로 흡수 금지 — 독립 유지.
- 죽은 terraform(`infra/aws/terraform/autoscaling.tf`)은 PRESENT로 오인 금지. 실 다중노드 위상의 근거가 될 수 없다.

## 5. 판정

**ABSENT-greenfield.** Mesh drift 관련 코드·스키마·이벤트 전무(grep 0). 순신설 대상이며 코드 변경 0·NOT_CERTIFIED. 불변 기록만 기존 감사 해시체인 확장으로 재사용하고, ML 모델 드리프트(`ModelMonitor.php:18-19`·`:42`)와는 영구 분리. 단일노드 현실상 Topology/Region 축은 정의 후 비활성. 실 구현은 §24 Reconciliation 및 선행 Mesh Foundation 이후 별도 승인 세션.
