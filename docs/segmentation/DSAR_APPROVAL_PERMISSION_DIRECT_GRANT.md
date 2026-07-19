# DSAR — Permission Direct Grant (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_DIRECT_GRANT`는 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)의 `grant_type=DIRECT` 특화 규율이다. Role/Bundle/Group을 경유하지 않고 **개별 Permission을 Subject에 직접 부여**하는 경로로, 강력하지만 관리·감사가 어려워 **가장 제한적으로 다뤄야 하는 부여 형태**다. 목적은 (a) Direct Grant를 예외 경로로 제약(Role 경유 우선), (b) 명확한 Business Justification·Evidence·Review Due를 강제, (c) High/Critical Permission의 Direct 부여를 추가 제한, (d) 사후 Role 정규화 대상으로 표시하는 것이다.

## ② Canonical 필드

(공통 필드는 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md) 상속 · Direct 특화 필드만 표기)

| 필드 | 설명 |
|---|---|
| `grant_ref` | 소속 [`GRANT`](DSAR_APPROVAL_PERMISSION_GRANT.md)(`grant_type=DIRECT`) |
| `business_justification` | **필수** — 왜 Role 경유가 아닌 직접 부여인지 |
| `role_alternative_evaluated` | Role 경유 대안 검토 여부(강제) |
| `risk_classification` | 대상 Permission risk(HIGH/CRITICAL 추가제한) |
| `expiration_recommended` | 만료 권장 플래그 |
| `review_due_at` | **필수** — 재검토 기한 |
| `evidence_ref` | 부여 근거 증거(승인/요청 기록) |
| `role_normalization_flag` | 사후 Role 정규화 대상 표시 |
| `approver_ref` | 승인자(위조불가 신원) |

## ③ 열거형

**`direct_grant_disposition`**: `PENDING_NORMALIZATION` · `JUSTIFIED_PERMANENT` · `EXPIRING` · `FLAGGED_FOR_ROLE` · `UNDER_REVIEW`

**`risk_classification`**: `LOW` · `MEDIUM` · `HIGH` · `CRITICAL`(HIGH/CRITICAL은 Direct 부여 추가 제한·승인 상향)

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| **Direct grant 실체(정본 매핑)** | `acl_permission` row(subject_type=user·직접 부여) | EXISTS(Grant substrate) | `TeamPermissions.php:325`, `:152-171` |
| 부여상한(Direct 부여도 상속) | `putMemberPermissions`(DELEGATION_EXCEEDED)·`assignableMap`·`clampActions` | 위임상한 확장점 | `TeamPermissions.php:628-647`, `:354-360`, `:396-402` |
| Business Justification/Evidence 기록 | `auth_audit_log`(변경 기록) | Evidence PARTIAL | 전수조사 §3(`UserAuth::logAudit`) |
| 승인자 위조불가 신원 | `index.php` auth_key 주입 | CANONICAL(PEP) | `index.php:591-593` |
| **business_justification 필수 강제** | — | — | **ABSENT** (현행 grant에 justification 필수 필드 없음) |
| **risk_classification / HIGH·CRITICAL 제한** | — | — | **ABSENT** (permission risk 등급 부재) |
| **review_due_at / role_normalization_flag** | — | — | **ABSENT** |

★현행 `acl_permission`의 `subject_type=user` 직접 부여가 Direct Grant substrate — 실재한다. 단 justification 필수·risk 제한·review due·정규화 표시 = 순신규 규율. 부여상한(`:628-647`)은 Direct 부여에도 이미 상속되어 자기 권한 초과 직접 부여를 차단하고 있다.

## ⑤ 설계원칙

- **Role 경유 우선**: Direct Grant는 예외 경로 — `role_alternative_evaluated` 강제로 "왜 Role이 아닌가"를 문서화. 사후 `role_normalization_flag`로 Role 정규화 대상 표시.
- **명확한 Business Justification 필수**: `business_justification` 없으면 부여 거부(fail-closed). `'unknown'`·리터럴 폴백 금지(Actor 정직 원칙 계승).
- **High/Critical 제한**: `risk_classification` HIGH/CRITICAL Permission의 Direct 부여는 승인 상향·Expiration 권장·Review Due 필수.
- **Golden Rule**: `acl_permission`(`replacePerms :325`) 직접 부여 substrate 재사용 — 별도 direct-grant 저장체 신설 금지. 부여상한 `:628-647` 상속.
- **Permission ≠ Role ≠ Authority**: Direct는 Permission을 직접 붙일 뿐 Role(P3) 우회가 목적이 아님 — 오히려 Role 정규화로 회귀 유도. Authority(P5)는 별개.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: risk_classification은 선행 Canonical Permission Definition의 risk 메타·P5 Authority 신설 후. Justification/Evidence의 불변 증거화는 Part 1 Evidence 저장체 결합 후.
- business_justification 필수·risk 등급·review due·role normalization·expiration 권장 강제 = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.
