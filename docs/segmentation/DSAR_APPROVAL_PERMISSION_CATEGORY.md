# DSAR — Permission Category (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission을 **분류·Risk 산정·SoD(직무분리) 분석**을 위한 Canonical Category로 태깅. Category는 **Resolution의 직접 허용 결정이 아니다** — 실제 permit/deny는 Definition effect + scope + Resolution이 결정한다. Category는 어떤 Permission들이 상호 배타(SoD)여야 하는지, 어떤 것이 민감/규제 대상인지 판단하는 분류 축.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `category_code` | Category 식별자 |
| `label` | 명칭 |
| `sod_sensitive` | SoD 충돌 후보 여부(예: APPROVAL vs EXECUTION) |
| `default_risk_floor` | 이 Category의 최소 Risk 하한(Risk 산정 입력) |
| `resolution_authoritative` | **항상 false** — Category는 결정 근거 아님(분류만) |

## 3. 열거형 / 타입

**category**: `READ` · `WRITE` · `CREATE` · `UPDATE` · `DELETE` · `APPROVAL` · `ASSIGNMENT` · `DELEGATION` · `ADMINISTRATION` · `CONFIGURATION` · `EXECUTION` · `EXPORT` · `REPORTING` · `SENSITIVE_DATA` · `SECURITY` · `COMPLIANCE` · `SYSTEM` · `CUSTOM`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| action→category 근접 | `ACTIONS` 8동작(view/create/update/delete/approve/export/execute/manage) | 부분 매핑 substrate | `TeamPermissions.php:39` |
| SENSITIVE_DATA/데이터 축 | `data_scope` 9 dims | ROW/DATA_SCOPE_CANDIDATE | `TeamPermissions.php:41`·`:218-322` |
| ADMINISTRATION | `resolveAdminByToken`(admin SSOT) | CANONICAL | `UserAuth.php:2998` |

★**정직**: 실 `ACTIONS`는 8 동작명일 뿐 — READ/WRITE/APPROVAL/DELEGATION/SoD 같은 **분류 축(Category) 엔티티는 순신규 ABSENT**. `sod_sensitive`·`default_risk_floor`·`resolution_authoritative`·명시적 SoD 매트릭스 = 전부 신설. 현 코드에 "approve"는 action grant일 뿐 진짜 2-eyes/SoD 워크플로 없음(GROUND_TRUTH §1.1 위임상한 인접만).

## 5. 설계 원칙 / 결정

- **Category ≠ 결정 근거** — `resolution_authoritative`는 항상 false. permit은 effect+scope+Resolution만.
- Category는 Risk 산정(하한 입력)과 SoD 충돌 탐지(APPROVAL↔EXECUTION, CREATE↔APPROVAL 등)에만 사용.
- `default_risk_floor`는 Risk Classification의 입력이지 상한이 아님(개별 Definition이 상향 가능).
- Golden Rule: ACTIONS 8동작을 Category 매핑 입력으로 확장(중복 분류체계 신설 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Category 엔티티·SoD 매트릭스 = 순신규.
- SoD 실 강제는 Part 6(SoD)·Part 8(Dual-Control) 소관 — 본 Part는 분류 축 정의만.
- **BLOCKED_PREREQUISITE**: 실 분류·Risk 연동 엔진은 Decision Core 신설 후 RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
