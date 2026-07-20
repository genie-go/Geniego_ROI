# DSAR — Approval Effective Role Assignment Resolution (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Effective Assignment Resolution)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

Effective Assignment Resolution은 스펙 §15가 정의하는 계산 엔티티로, Direct·Group·Organization·Position·Delegated·Temporary·Emergency·Dynamic Assignment Reference 8종 Assignment Type의 결과를 병합해 Subject의 "현재 유효한 Assignment 집합"을 산출하며, **모든 결과는 Version 기준**이어야 한다(§15 원문). ★Part 3-2(전건 순신규)와 대조적으로, **이 계산 자체에 근접한 substrate가 실재**한다 — `effectiveForUser`/`effectiveScope`(`TeamPermissions.php:366-394,236-265`)가 role 기반 유효권한을 매 요청 라이브로 계산한다(ADR §D-4 근접 substrate 3종 중 1). 단, Assignment 엔티티·version을 전혀 참조하지 않는 라이브 재계산이라는 점에서 §15가 요구하는 "Version 기준" 요건은 미충족이다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `resolution_id` | 식별자 |
| `subject_id` | 대상 Subject |
| `resolved_at` | 계산 시각 |
| `direct_component` / `group_component` / `organization_component` / `position_component` / `delegated_component` / `temporary_component` / `emergency_component` / `dynamic_component` | §15 원문 8종 계산 입력 |
| `assignment_version_refs` | 병합에 사용된 각 Assignment의 Version 참조(§15 "모든 결과는 Version 기준") |
| `merge_result` | 병합 최종 결과 |

## 3. 열거형 / 타입

- **ResolutionComponent**(§15 원문): `DIRECT` · `GROUP` · `ORGANIZATION` · `POSITION` · `DELEGATED` · `TEMPORARY` · `EMERGENCY` · `DYNAMIC_ASSIGNMENT_REFERENCE`
- **범위 경계**: 본 엔티티는 "계산(Resolution)"만 정의한다. 계산 결과의 저장 형태는 §16 Effective Role Assignment Set(별도 DSAR)이 소유한다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical 계산 요소 | 판정 | 실 substrate (file:line) |
|---|---|---|
| **Direct** | **PARTIAL** | `effectiveForUser`(`TeamPermissions.php:366-394`) — owner/admin=full, manager=팀 acl, member=clamp를 team_role 값(Direct assignment 유일 실재 축)으로부터 라이브 계산 |
| **Scope 축(근접)** | **PARTIAL** | `effectiveScope`(`TeamPermissions.php:236-265`) — fail-closed `DENY_SCOPE` 기본값으로 scope 미해석 시 거부 |
| **Group** | **ABSENT(as 계산 시점 병합)** | SSO group→role(`roleForGroups`·`EnterpriseAuth.php:78-91`)은 **provisioning 시점 write**(team_role에 이미 반영)이지, Resolution 시점의 별도 병합 계산이 아니다 — Direct와 동일 축으로 흡수되어 있어 별도 Group 컴포넌트로 분리되지 않음 |
| **Organization / Position** | **ABSENT** | 전수조사 §4: 해당 Assignment 유형 자체가 substrate에 없음(Team 차원 partner_* 유형만 실재, Subject 차원 아님) |
| **Delegated** | **ABSENT** | `assignableMap`(`TeamPermissions.php:354-360,644-647`)은 acl_permission 위임상한이지 Delegated role 병합이 아님(ADR §D-5) |
| **Temporary / Emergency** | **ABSENT** | 만료 cron 부재(전수조사 §2)·break-glass≠role 부여(ADR §D-5) |
| **Dynamic Assignment Reference** | **ABSENT** | 전수조사 §6 순신규 목록 |
| **"모든 결과는 Version 기준"(§15 전제)** | **미충족(전제 자체 ABSENT)** | Assignment Version 순신규(전수조사 §6) — `effectiveForUser`는 version 무참조 라이브 재계산(ADR §3·DUPLICATE_AUDIT D-4) |

## 5. 설계 원칙

1. **확장이지 신설이 아니다** — `effectiveForUser`/`effectiveScope`를 Version 기준 Effective Assignment Resolution의 substrate로 **승격**한다(ADR §D-1 EFFECTIVE_RESOLUTION_SUBSTRATE(확장)). 병렬 신규 계산 엔진 금지.
2. **Direct부터 우선 확장, 나머지는 순차 결합** — 현재 실재하는 축은 Direct(및 Scope)뿐이다. Group/Organization/Position/Delegated/Temporary/Emergency/Dynamic은 각각의 상위 Assignment Type(§11-14 등) substrate가 먼저 신설된 후에야 Resolution에 결합 가능(과잉설계 금지).
3. **fail-closed 무후퇴** — `effectiveScope`의 `DENY_SCOPE` 기본값(scope 미해석 시 거부)은 Version 기준 전환 이후에도 동등 이상으로 보존한다.
4. **Group을 별도 컴포넌트로 도입할 때 Direct와의 중복 계산 방지** — 현재 SSO group→role은 이미 team_role(Direct 축)에 흡수되어 있으므로, Resolution 단계에서 Group을 분리 계산하려면 provisioning-write 방식(현행)과 resolution-time 병합 방식(§15 목표) 중 하나로 통일해야 한다(이중 반영 방지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: Assignment Version·Registry(선행 Part 2/3-1/3-2)가 전 구간 미구현 — "Version 기준"이라는 §15의 핵심 전제 자체가 충족 불가.
- **Gap-1(PARTIAL→확장 대상)**: Direct/Scope 컴포넌트는 실재 substrate 확장으로 도달 가능하나, 8종 중 6종(Group 분리·Organization·Position·Delegated·Temporary·Emergency·Dynamic)은 선행 Assignment Type 신설 필요.
- **Gap-2**: Version 무참조 라이브 재계산 → Version 기준 계산으로 전환하는 것이 이번 Part의 핵심 신설 작업(캐시·재계산 트리거 설계 포함, §44 Assignment Cache와 연동 — 본 문서 범위 외).
- **정직 부재**: 실재 과신 금지 — `effectiveForUser` 실재가 "Effective Assignment Resolution 완성"을 의미하지 않는다(PARTIAL, ABSENT 6/8 컴포넌트).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
