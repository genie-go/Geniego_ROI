# DSAR — Permission Grant Version (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_GRANT_VERSION`은 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)가 변경될 때마다 발행되는 **불변 버전 레코드**다. Grant의 **In-place Update를 절대 금지**하고, scope 축소/확대·유효기간 변경·취소·마이그레이션 등 모든 변화를 새 Version으로 봉인한다. 목적은 (a) 부여 이력의 tamper-evident 추적, (b) 특히 **Scope Expansion(권한 확대)은 추가 승인 + Risk Review Hook을 강제**하여 몰래 권한이 넓어지는 것을 차단, (c) 취소·만료의 시점 증거 보존이다.

Grant가 몰래 수정되면 "언제부터 이 권한을 가졌는가"의 근거가 소급 변조된다 — Version 축은 이를 원천 봉쇄한다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `grant_version_id` | Canonical 식별자 |
| `grant_id` | 소속 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md) 참조 |
| `version_number` | 단조증가 |
| `previous_version_id` | 직전 버전(변경 체인) |
| `permission_version_snapshot` | 이 시점 대상 Permission Version |
| `scope_snapshot` | 이 시점 scope 값 |
| `validity_snapshot` | valid_from/to·max_use_count 시점값 |
| `source_snapshot` | 파생 원천(Bundle/Role/Group version) 시점값 |
| `effect_snapshot` | ALLOW/DENY 시점값 |
| `change_type` | ③ 열거형 |
| `change_reason` | 변경 사유 |
| `approval_ref` | 이 변경을 승인한 근거(Scope Expansion 시 필수) |
| `risk_review_ref` | Risk Review Hook 결과(Scope Expansion 시) |
| `changed_by` / `changed_at` | 변경 주체·시각(위조불가 신원) |
| `immutable_digest` | 스냅샷 전체 해시(봉인) |

## ③ 열거형

**`change_type`**: `INITIAL` · `SCOPE_REDUCTION` · `SCOPE_EXPANSION` · `VALIDITY_CHANGE` · `CONSTRAINT_CHANGE` · `EFFECT_CHANGE` · `SOURCE_REBIND` · `SUSPENSION` · `REINSTATEMENT` · `REVOCATION` · `MIGRATION`

- **SCOPE_EXPANSION** → **추가 승인(`approval_ref`) + Risk Review Hook(`risk_review_ref`) 필수**.
- **SCOPE_REDUCTION** → 즉시 적용 가능(권한 축소는 안전 방향).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| Grant 원본(버전화 대상) | `acl_permission` row(replacePerms) | EXISTS(Grant substrate) | `TeamPermissions.php:325` |
| 변경 감사(발행 기록 최근접) | `auth_audit_log`(변경만 기록) | Evidence PARTIAL | 전수조사 §3(team_permissions_set·`UserAuth::logAudit`) |
| Scope Expansion 차단 재료 | 부여상한 `putMemberPermissions`(DELEGATION_EXCEEDED)·`clampActions` | 위임상한 확장점 | `TeamPermissions.php:628-647`, `:396-402` |
| scope 축소 강제 재료 | DENY_SCOPE fail-closed·`scopeSql` | ROW/DATA_SCOPE | `TeamPermissions.php:234`, `:286-293` |
| **Grant Version 테이블·digest·체인** | — | — | **ABSENT** (Version ABSENT·Snapshot ABSENT) |
| **In-place Update 금지 강제** | — | — | **ABSENT** (현행 `replacePerms :325`가 **덮어쓰기**) |
| **Risk Review Hook** | — | — | **ABSENT** (P5/risk 엔진 부재) |

★현행 `replacePerms :325`는 **In-place 덮어쓰기**(replace)로 이전 grant 상태를 남기지 않는다 — 정확히 Grant Version이 금지하려는 패턴. 변경 사실은 `auth_audit_log`에 남으나 이는 불변 스냅샷·digest가 아니므로 Version 대체 불가(전수조사 §3: Version/Snapshot = ABSENT).

## ⑤ 설계원칙

- **In-place Update 절대 금지**: 모든 Grant 변경 = 새 Version 발행 + `immutable_digest` 봉인. 현행 `replacePerms :325`의 덮어쓰기는 Version 발행 패턴으로 정형화(무후퇴·이전 상태 보존).
- **Scope Expansion = 추가 승인 + Risk Review Hook**: 권한 확대는 fail-closed(`approval_ref`·`risk_review_ref` 없으면 발행 거부). 부여상한 `:628-647`(DELEGATION_EXCEEDED)을 Version 발행 게이트로 확장 — 확대 방향만 추가 통제.
- **Golden Rule**: `auth_audit_log`(변경 감사 SSOT)에 Version 발행을 연결하되 별도 감사 엔진 신설 금지. digest 봉인만 신규.
- **Permission ≠ Role ≠ Authority**: `source_snapshot`이 Role/Bundle을 참조하더라도 Version은 Permission 부여 상태만 봉인 — Role 이력(P3)·Authority 한도(P5)와 별개.
- **위조불가 신원**: `changed_by`는 서버측 도출 신원(`index.php:591-593`)만.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Version digest tamper-evident 검증·Risk Review Hook 실 배선은 선행 Part 1 Snapshot/Evidence/Digest 저장체 + P5 risk 엔진 신설 후.
- Grant Version 테이블·change_type 11종·snapshot·digest·previous 체인·In-place 금지 강제 = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.
