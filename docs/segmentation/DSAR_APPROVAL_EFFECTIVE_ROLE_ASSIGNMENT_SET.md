# DSAR — Approval Effective Role Assignment Set (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Effective Role Assignment Set)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

Effective Role Assignment Set은 스펙 §16이 정의하는 저장 엔티티로, §15 Effective Assignment Resolution의 계산 결과를 "Subject별 Active/Inherited/Composite/Temporary/Emergency/Delegated/Suspended/Expired Roles"로 분류·저장한다(§16 원문). §15가 계산이라면 §16은 그 결과의 **카테고리화된 스냅샷**이다. ★근접 substrate로 `effectiveForUser`(`TeamPermissions.php:366-394`)가 실재하나, 이는 매 요청 라이브로 계산되는 단일 "현재 유효 role" 값일 뿐 — Active/Inherited/Composite 등 8분류로 세분화되어 저장되는 Set 엔티티가 아니다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `set_id` | 식별자 |
| `subject_id` | 대상 Subject |
| `active_roles` | 현재 활성 role 목록 |
| `inherited_roles` | Role Hierarchy(Part 3-2)로부터 상속된 role |
| `composite_roles` | Composite Role(Part 3-2)로 구성된 role |
| `temporary_roles` | 한시 assignment(§11)로부터의 role |
| `emergency_roles` | 긴급 assignment(§12)로부터의 role |
| `delegated_roles` | 위임 assignment(§14)로부터의 role |
| `suspended_roles` | 정지 상태 role |
| `expired_roles` | 만료된 role |
| `computed_at` / `assignment_version_refs` | 계산 시각·근거 Version(§15 "Version 기준" 요건 상속) |

## 3. 열거형 / 타입

- **RoleSetCategory**(§16 원문): `ACTIVE` · `INHERITED` · `COMPOSITE` · `TEMPORARY` · `EMERGENCY` · `DELEGATED` · `SUSPENDED` · `EXPIRED`
- **범위 경계**: 본 엔티티는 저장 형태(Set)만 정의한다. 분류 산출 로직은 §15 Effective Assignment Resolution(별도 DSAR)이 소유한다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical 카테고리 | 판정 | 실 substrate (file:line) |
|---|---|---|
| `active_roles`(Subject·현재 활성) | **PARTIAL** | `effectiveForUser`(`TeamPermissions.php:366-394`)가 라이브로 계산하는 현재 유효 role — 단 저장(persist)되는 "Set" 엔티티가 아니라 매 요청 재계산되는 값(전수조사 §7 근접표) |
| `inherited_roles` / `composite_roles` | **ABSENT** | Role Hierarchy·Composite Role은 선행 Part 3-2가 순신규로 판정(ADR 선행 블록 링크만 존재, 본 문서 인용 문서 3편 내 file:line 없음) |
| `temporary_roles` / `emergency_roles` / `delegated_roles` | **ABSENT** | ADR §D-5 — Temporary/Scheduled 만료 role 부재(순신규)·Emergency=break-glass는 role 부여 아님·Delegated=`assignableMap`은 acl 위임상한이지 role 위임 아님(`TeamPermissions.php:354-360,644-647`) |
| `suspended_roles` | **PARTIAL(세분화 미달)** | is_active=0이 team_role(팀원)·sub-admin·api_key 3/5 자원에서 "정지" 대용(전수조사 §2 표)이나, Suspended를 Revoked/Expired와 구분하는 별도 상태값이 아니라 단일 이진 토글(전수조사 §2 "is_active 이진 토글이 3/5 자원의 '정지' 대용·정식 상태머신 아님") |
| `expired_roles` | **ABSENT(role/permission)** | role/permission 만료 cron 부재(bin 34 스크립트 전수 0, 전수조사 §2). 유일 시간기반 실효는 api_key `expires_at` 요청시점 게이트(`Keys.php:119,170`·`index.php:518-520`)뿐이며 role 자체의 만료가 아님 |

## 5. 설계 원칙

1. **is_active 이진 토글의 세분화가 선결 과제** — Suspended/Revoked/Expired 3분리를 위해서는 team_role/sub-admin/api_key의 정지 신호를 상태머신(§7 Assignment Lifecycle)으로 먼저 승격해야 한다(전수조사 §2 재확인).
2. **Set은 파생 뷰, 별도 저장 SSOT 아님** — `effectiveForUser` 확장(§15)의 산출물을 caching 목적으로 저장하되, Assignment Version을 SSOT로 유지한다(중복 SSOT 금지, ADR §D-1).
3. **Inherited/Composite는 Part 3-2 완성 후 결합** — 현재 Part 3-3 문서 3편(ADR·전수조사 2편) 범위에는 Role Hierarchy의 실 substrate 인용이 없으므로, 본 DSAR는 이 두 카테고리를 ABSENT로만 표기하고 Part 3-2 산출물을 직접 인용하지 않는다(반날조 — 타 Part 문서 교차인용 금지).
4. **Emergency/Delegated를 근접 substrate로 오채움 금지** — break-glass·assignableMap을 각각 Emergency Roles·Delegated Roles 항목에 채워 넣지 않는다(ADR §D-5 명시적 구분 유지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: §15 Effective Assignment Resolution(선행 산출 로직)·Assignment Version·Role Hierarchy/Composite(Part 3-2)가 전부 선행 미구현.
- **Gap-1**: 8개 카테고리 중 실질 확장 가능은 `active_roles`(PARTIAL)·`suspended_roles`(PARTIAL·세분화 필요) 2종뿐, 나머지 6종은 순신규.
- **Gap-2**: role/permission 만료 워커 부재 — `expired_roles` 카테고리는 만료 cron 신설이 선행 필요(전수조사 §2 "role/permission 만료 cron 부재").
- **정직 부재**: `effectiveForUser` 실재를 Set 엔티티 완성으로 과신하지 않음(PARTIAL·저장되지 않는 라이브 값).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
