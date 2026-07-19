# DSAR — Permission Bundle Version (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_BUNDLE_VERSION`은 [`BUNDLE`](DSAR_APPROVAL_PERMISSION_BUNDLE.md)의 **구성이 변경될 때마다 발행되는 불변 스냅샷**이다. Bundle의 mandatory/optional/exclusion·constraint·compatibility·risk를 특정 시점으로 봉인하여, 이미 부여된 Grant가 **어떤 Bundle 정의를 근거로 부여됐는지** 사후 추적·재검증(Revalidation)·감사할 수 있게 한다. In-place Update를 금지하고 Version 축을 강제하는 이유는, Bundle 구성이 몰래 바뀌어 과거 부여의 근거가 소급 변조되는 것을 막기 위함이다(tamper-evident 의도).

Version ≠ Bundle 헤더: Bundle은 논리적 정체성(code·display)을 보유하고, Version은 그 시점의 **실제 Permission 구성 값**을 보유한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `bundle_version_id` | Canonical 식별자 |
| `bundle_id` | 소속 [`BUNDLE`](DSAR_APPROVAL_PERMISSION_BUNDLE.md) 참조 |
| `version_number` | 단조증가 정수/semver |
| `previous_version_id` | 직전 버전(변경 체인) |
| `mandatory_snapshot` | 이 시점 필수 Permission 참조 집합 |
| `optional_snapshot` | 선택 Permission 집합 |
| `exclusion_snapshot` | 배제 Permission 집합 |
| `constraint_snapshot` | 제약(scope override·조건) |
| `compatibility_snapshot` | [`COMPATIBILITY`](DSAR_APPROVAL_PERMISSION_BUNDLE_COMPATIBILITY.md) 규칙 시점값 |
| `risk_snapshot` | 이 버전의 risk level |
| `change_type` | ③ 열거형 |
| `change_reason` | 변경 사유(business justification) |
| `authored_by` / `authored_at` | 발행 주체·시각 |
| `immutable_digest` | 스냅샷 전체 해시(봉인) |
| `status` | DRAFT/ACTIVE/SUPERSEDED/RETIRED |

## ③ 열거형

**`change_type`**: `INITIAL` · `PERMISSION_ADDED` · `PERMISSION_REMOVED` · `MANDATORY_PROMOTION` · `OPTIONAL_DEMOTION` · `EXCLUSION_ADDED` · `CONSTRAINT_CHANGE` · `COMPATIBILITY_CHANGE` · `RISK_RECLASSIFICATION` · `DEPRECATION` · `MIGRATION`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| 변경 감사(발행 기록의 최근접) | `auth_audit_log`(permission 변경만 기록) | Evidence PARTIAL | 전수조사 §3 Evidence·`UserAuth::logAudit`(team_permissions_set) |
| **Bundle Version 스냅샷 테이블** | — | — | **ABSENT** (permission-schema 버전화 전무) |
| **immutable_digest / 봉인** | — | — | **ABSENT** |
| **previous_version 체인** | — | — | **ABSENT** |

★전수조사 §3: **Version = ABSENT**("permission-schema 버전화 없음"), **Snapshot = ABSENT**("permission 시점 스냅샷/이력 테이블 없음"). Bundle Version은 순신규. `auth_audit_log`는 permission **변경**만 기록할 뿐 시점 스냅샷·digest가 아니므로 대체 불가.

## ⑤ 설계원칙

- **불변·In-place Update 금지**: Bundle 구성 변경 = 새 Version 발행 + `immutable_digest` 봉인. 기존 Version 레코드 수정 금지(무후퇴·소급변조 차단).
- **Golden Rule**: Version 발행 이벤트는 기존 `auth_audit_log`(변경 감사 SSOT)에 **연결**하되 별도 감사 엔진 신설 금지. 단 audit_log ≠ 불변 스냅샷이므로 digest 봉인은 신규.
- **Risk snapshot 고정**: 부여 시점 재검증은 Grant가 참조한 `bundle_version_id`의 `risk_snapshot`을 사용 — Bundle 헤더의 현재 risk가 아님(과거 부여의 근거 보존).
- **Permission ≠ Role ≠ Authority**: Version 스냅샷은 Permission 구성만 봉인 — Role 부여 이력(P3)·Authority 한도(P5)와 별개 축.
- **Mandatory Control**: Version 불변성·digest·Canonical Code는 비활성 불가(ADR §6.16).

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Version digest의 tamper-evident 검증은 선행 Part 1 Snapshot/Evidence/Digest 저장체 + Decision Core 신설 후 결합 가능.
- Bundle Version 테이블·change_type·snapshot·digest·previous 체인 = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.
