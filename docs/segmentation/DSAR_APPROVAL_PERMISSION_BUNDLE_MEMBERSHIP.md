# DSAR — Permission Bundle Membership (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

> **상태**: 설계 명세 · 코드 0 · **NOT_CERTIFIED** · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 위 2문서에서만 인용 · 부재는 **ABSENT** · Part 1 D-2·기수정 재플래그 금지.

---

## ① 목적

`PERMISSION_BUNDLE_MEMBERSHIP`은 특정 [`BUNDLE_VERSION`](DSAR_APPROVAL_PERMISSION_BUNDLE_VERSION.md)이 **어떤 개별 Permission을 어떤 조건으로 포함하는가**를 나타내는 조인 엔티티(bundle version × permission)다. 각 멤버십은 그 Permission이 이 Bundle에서 필수/선택인지, scope override가 있는지, 추가 constraint가 있는지를 규정한다. 이 엔티티가 Bundle의 실제 내용물을 구성하며, Bundle 부여 시 여기 나열된 mandatory 멤버가 모두 함께 부여된다.

Membership ≠ Grant: Membership은 "Bundle 정의 안에서의 소속"(정의 축)이고, Grant는 "Subject에 실제 부여"(부여 축)다.

## ② Canonical 필드

| 필드 | 설명 |
|---|---|
| `membership_id` | Canonical 식별자 |
| `bundle_version_id` | 소속 [`BUNDLE_VERSION`](DSAR_APPROVAL_PERMISSION_BUNDLE_VERSION.md) 참조 |
| `permission_ref` | 대상 Permission Definition 참조(Canonical Code) |
| `permission_version_ref` | 대상 Permission Version(고정) |
| `inclusion_kind` | ③ 열거형(MANDATORY/OPTIONAL/EXCLUDED) |
| `scope_override` | Bundle 내 이 Permission의 scope 좁힘(확장 금지) |
| `constraints` | 조건(시간/환경/amount 등 · P4 ABAC 연결) |
| `ordinal` | 표기 순서 |
| `notes` | 설명(판정 사용 금지) |

## ③ 열거형

**`inclusion_kind`**: `MANDATORY` · `OPTIONAL` · `EXCLUDED`

- **MANDATORY**: Bundle 부여 시 반드시 함께 부여 · 개별 제거 불가.
- **OPTIONAL**: 부여 시 선택적 포함.
- **EXCLUDED**: 이 Bundle과 공존 금지(Deny overrides · Compatibility Conflict 트리거).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 개념 | 실존 substrate | §92 분류 | file:line |
|---|---|---|---|
| 개별 Permission(멤버 재료) | `acl_permission`(menu×action row) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-171` |
| scope_override 재료 | `data_scope`(scope_type×scope_values) | ROW/DATA_SCOPE_CANDIDATE | `TeamPermissions.php:160-166`, `:236-265` |
| scope 좁힘 강제(Intersection 재료) | `scopeSql`·`effectiveScope`·DENY_SCOPE fail-closed | ROW/DATA_SCOPE(확장) | `TeamPermissions.php:286-293`, `:234` |
| **Bundle Membership 조인 테이블** | — | — | **ABSENT** |
| **inclusion_kind(mandatory/optional/excluded)** | — | — | **ABSENT** |

★멤버가 될 개별 Permission·scope override 재료(`acl_permission`·`data_scope`)는 실재하나, 이를 Bundle에 소속시키는 **조인 엔티티와 inclusion_kind**는 순신규. 현행은 `replacePerms :325`가 낱개 grant를 직접 쓸 뿐 Bundle 소속 개념이 없다.

## ⑤ 설계원칙

- **Golden Rule**: Membership의 `permission_ref`는 `acl_permission` grant substrate를 낱개로 참조 — 별도 permission 저장체 신설 금지. scope_override는 실존 `data_scope`(`:160-322`) 정형화(Canonical Filter AST)로 표현.
- **Scope Intersection·Expansion Guard**: `scope_override`는 오직 **좁힘**만 허용 — Bundle이 Subject 본래 scope를 넓힐 수 없음(권한 확장 금지·`:234` DENY_SCOPE fail-closed 원칙 계승).
- **EXCLUDED 우선**: EXCLUDED 멤버가 Subject의 다른 grant와 충돌 시 Compatibility Critical Conflict → Bundle Grant 차단.
- **Permission ≠ Role ≠ Authority**: Membership은 Permission만 나열 — Role 조합(P3)·Authority 한도(P5) 미포함.
- **Version 고정**: `permission_version_ref`로 멤버 Permission의 특정 버전 고정(Bundle Version 스냅샷과 정합).

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: Membership이 참조할 Canonical Permission Definition/Version Registry가 순신규(전수조사 §3: Version ABSENT). 선행 신설 필요.
- Bundle Membership 조인 테이블·inclusion_kind·scope_override 정형모델 = **전부 ABSENT**.
- **코드/DB 변경 0 · NOT_CERTIFIED**. 실 엔진은 별도 승인세션.
