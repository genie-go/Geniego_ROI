# DSAR — Approval Effective Permission Assignment (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Effective Permission Assignment)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

Effective Permission Assignment는 스펙 §17이 정의하는 엔티티로, §16 Effective Role Assignment Set(role 수준)을 **권한(permission) 수준**으로 한 단계 더 투영(projection)한다 — Direct/Composite/Inherited Permission과 Explicit Deny를 합성하고, 그 위에 Scope/Constraint/Risk Projection을 씌운다(§17 원문). ★근접 substrate로 `effectiveScope`(`TeamPermissions.php:236-265`)·acl_permission(`:154,162`)이 실재하나, Composite/Inherited Permission(role 위계 기반 권한 합성)과 Constraint/Risk Projection은 substrate가 없다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `effective_permission_id` | 식별자 |
| `subject_id` | 대상 Subject |
| `direct_permissions` | Assignment로 직접 부여된 권한 |
| `composite_permissions` | Composite Role(Part 3-2)에서 합성된 권한 |
| `inherited_permissions` | Role Hierarchy(Part 3-2)에서 상속된 권한 |
| `explicit_deny` | 명시적 거부 목록(우선 적용) |
| `scope_projection` | Scope 축 투영 결과(§8 Assignment Scope) |
| `constraint_projection` | 제약조건 투영 결과 |
| `risk_projection` | 위험도 투영 결과(§31 Assignment Risk Assessment와 결합) |
| `assignment_version_refs` | 근거 Version(§15 "Version 기준" 요건 상속) |
| `computed_at` | 계산 시각 |

## 3. 열거형 / 타입

- **PermissionProjectionSource**(§17 원문): `DIRECT` · `COMPOSITE` · `INHERITED` · `EXPLICIT_DENY`
- **ProjectionAxis**(§17 원문): `SCOPE` · `CONSTRAINT` · `RISK`
- **범위 경계**: 본 엔티티는 §16(role 수준) 산출물을 permission 수준으로 투영하는 결과물만 정의한다. role→permission 매핑 자체의 정책 계약은 Part 3-1 Role-Permission Mapping 영역(본 문서 인용 범위 외)이다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical 요소 | 판정 | 실 substrate (file:line) |
|---|---|---|
| **Direct Permission** | **PARTIAL** | acl_permission(subject `'team'`\|`'member'`, `TeamPermissions.php:154,162`) + `effectiveForUser`(`:366-394`)의 role→권한 매핑이 근접 |
| **Composite / Inherited Permission** | **ABSENT** | Role Hierarchy/Composite Role 순신규(선행 Part 3-2) — 본 문서 인용 3편(ADR·전수조사 2편) 내 관련 file:line 없음(반날조 — 타 Part 문서 교차인용 금지) |
| **Explicit Deny** | **PARTIAL(근접·정밀도 낮음)** | `effectiveScope`의 fail-closed `DENY_SCOPE` 기본값(`TeamPermissions.php:236-265`)이 근접이나, 이는 scope 미해석 시 **전체 기본 거부**이지 permission 단위로 명시 지정된 Explicit Deny 목록이 아니다 |
| **Scope Projection** | **PARTIAL** | `effectiveScope`(`:236-265`) 자체가 Scope 투영 계산 — version 무참조 라이브 재계산(§15 DSAR와 동일 판정) |
| **Constraint Projection** | **ABSENT** | 전수조사 §6·§7 목록에 Constraint 개념 매치 0 |
| **Risk Projection** | **ABSENT** | Assignment Risk Assessment(§31)·Request Risk Score(§10) 전 구간 부재(grep 0, 전수조사 전영역) — Risk Projection이 참조할 원천 점수 자체가 없음 |

## 5. 설계 원칙

1. **Direct/Scope는 확장, Composite/Inherited/Constraint/Risk는 순신설** — acl_permission·`effectiveScope`를 Direct Permission·Scope Projection의 substrate로 확장하되(ADR §D-1), 나머지 3+1축은 선행 Part(3-2 Role Hierarchy, §31 Risk Assessment)의 실 구현을 전제로 한다.
2. **Explicit Deny는 fail-closed 기본값과 구분** — `DENY_SCOPE`(scope 미해석 시 전체 거부)를 permission 단위 Explicit Deny 목록으로 확대 해석하지 않는다. 둘은 "기본값이 거부"와 "특정 permission을 명시적으로 거부"라는 서로 다른 메커니즘이다.
3. **Risk Projection은 단일 스코어링 소스 공유** — §10 Assignment Request의 `risk_score`, §31 Assignment Risk Assessment와 별개 리스크 엔진을 신설하지 않는다(무후퇴+값 단일소스 원칙).
4. **Composite/Inherited를 Direct로 눙쳐 넣지 않는다** — Role Hierarchy가 미구현인 현재, Composite/Inherited 항목을 Direct Permission으로 대체 표기하면 실제로는 없는 상속/합성 권한이 있는 것처럼 보이는 가짜 녹색이 발생한다. 반드시 ABSENT로 유지한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Role Hierarchy/Composite(Part 3-2)·Assignment Risk Assessment(§31)·Assignment Version이 전부 선행 미구현.
- **Gap-1**: 7개 요소 중 확장 가능은 Direct Permission·Scope Projection(PARTIAL) 2종, Explicit Deny는 정밀도 낮은 근접 1종, 나머지 3종(Composite/Inherited/Constraint/Risk)은 순신규.
- **Gap-2**: Risk Projection의 원천이 되는 Risk Score/Assessment가 스펙 전 구간에서 substrate 0 — 리스크 축 전체가 이번 Part 범위 밖 선행 신설에 의존.
- **정직 부재**: `DENY_SCOPE`(scope 전체 기본거부)를 permission 단위 Explicit Deny로 과대 해석하지 않음(정밀도 명시).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
