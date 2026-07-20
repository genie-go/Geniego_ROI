# DSAR — Approval Scope Expansion Guard (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Expansion Guard · 스펙 §29)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §29 Scope Expansion Guard는 Tenant · Organization · Resource · Dataset · Time · Device · Environment 7종의 Expansion을 차단하는 런타임 안전장치다. ADR D-2가 "상위 scope가 하위를 덮어쓰지 않게·조직 위계를 scope 자동확장으로 변환 금지"로 명문화한 대상이며, ADR §5(★부수)와 DUPLICATE_AUDIT §D-5가 firsthand 확인한 **실 결함 1건**과 정면으로 겹친다: `putMemberPermissions`(`TeamPermissions.php:615-661`)는 menus는 `assignableMap` 상한으로 clamp(`:627-646`·DELEGATION_EXCEEDED)하나, **scope는 요청 body를 manager 본인 범위와 비교 없이 `replaceScope`에 직접 기록**(`TeamPermissions.php:649,653`) — 주석(`:648` "manager가 본인 범위보다 넓은 scope_type 부여 금지")의 약속이 코드로 구현되지 않아 manager가 팀원에 `company`(무제한 scope)를 위임을 통해 부여할 수 있는 권한상승 경로다. **이 결함은 설계 문서인 본 편에서 수정하지 않는다**(코드 0·별도 fix 세션·배포승인 필요).

## 2. Canonical 필드

스펙 §29는 차단 대상 축만 정의(필드 섹션 없음). 설계 제안: Expansion Guard ID · Guarded Axis(§3 열거값) · Requestor Effective Scope(baseline) · Requested Scope(candidate) · Comparison Result(REJECTED/ALLOWED) · Blocked At.

## 3. 열거형 / 타입

스펙 §29 원문 — **차단 대상**: Tenant · Organization · Resource · Dataset · Time · Device · Environment Expansion.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT-근접 · 실결함 등재)

| Canonical 축 | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| data_scope 자체 fail-closed(런타임 조회 시 확대 차단) | `effectiveScope`(비owner+무tenant=DENY_SCOPE·예외=DENY_SCOPE) | `TeamPermissions.php:236-265` | **PARTIAL/PRESENT** — 조회 시점 fail-closed는 실재 |
| Tenant Expansion 차단 | X-Tenant-Id 헤더 신뢰 배제·인증 user 행 tenant_id 사용·platform_growth act-as admin 한정 | `UserAuth.php:399,423-428` | **PRESENT(강)** — 188차/288차 정착 |
| ★위임(Delegation) 경로의 Scope Expansion 차단 | `putMemberPermissions`(menus는 clamp) | `TeamPermissions.php:615-661`,`:627-646` | **PARTIAL(menus만)** — menus는 상한 강제(DELEGATION_EXCEEDED) 존재 |
| ★위임 경로의 Scope 필드 자체 | `replaceScope` 직접 기록(비교 없음) | `TeamPermissions.php:649,653` | **★실결함(ABSENT의 실무적 등가)** — manager 본인 scope와 비교 로직 grep 0. 주석 약속(`:648`)과 코드 불일치. DUPLICATE_AUDIT §D-5 firsthand |
| Organization Expansion 차단 | — | — | **ABSENT** — team 평면(parent_team_id 없음·`TeamPermissions.php:145-151`)이므로 조직 위계 기반 Expansion 개념 자체가 미성립 |
| Resource Expansion 차단 | — | — | **ABSENT** — menu_key 단위 확대 차단 로직 grep 0 |
| Dataset Expansion 차단 | — | — | **ABSENT** |
| Time Expansion 차단 | — | — | **ABSENT** |
| Device Expansion 차단 | — | — | **ABSENT** |
| Environment Expansion 차단 | envLabel(demo/production) | `Db.php:56-61` | **NOT_SCOPE(ADR D-1 배제)** — 배포 라벨이지 데이터 scope 확장 차단 대상 아님. 오분류 금지 |
| company=wildcard 리스크 | `company`=null 무제한(미설정=fail-open 예외조항) | `TeamPermissions.php:255-256,258` | **★리스크 등재(PARTIAL)** — 자동확대 금지(D-2) 대상 지점 |

## 5. 설계 원칙

- Golden Rule — Scope Expansion Guard는 `effectiveScope`의 fail-closed 조회 판정(런타임 축)과 위임 시점 clamp(`assignableMap` 패턴·설계 축) 두 근접 substrate를 통합해 확장한다. 신규 Guard 클래스를 병렬로 발명하지 않는다.
- ★**manager scope 위임상한 실결함(D-5)을 본 Guard의 1차 목표로 명문화**한다 — `putMemberPermissions`가 menus에 적용 중인 `assignableMap` clamp 패턴(`TeamPermissions.php:627-646`)을 scope에도 동일 적용(요청 scope ⊆ manager effective scope)하는 것이 실 구현 시 최우선 대상. 단 이번 설계 문서는 코드를 변경하지 않는다.
- Default Intersection·자동확대 금지(ADR D-2) — 상위 scope가 하위를 덮어쓰지 않으며, 조직 위계가 scope 자동확장으로 변환되지 않는다. `company` wildcard(`TeamPermissions.php:255-256,258`)는 명시적 승인 없이는 위임 경로로 재부여될 수 없어야 한다.
- envLabel은 Guard의 Environment 축 후보 substrate가 아니다(ADR D-1 `NOT_SCOPE`) — 배포 라벨을 데이터 scope 확장 차단으로 오흡수하지 않는다.
- Organization Expansion Guard는 team 평면 구조(ADR D-3)를 유지한 채 설계한다 — Scope Hierarchy를 Org Hierarchy로 오해해 조기에 계층을 도입하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **★실결함(재확인·수정 아님)**: `putMemberPermissions`의 scope 위임 시 manager 본인 범위 비교 부재(`TeamPermissions.php:649,653`) — 별도 fix 세션·배포승인 필요. 본 편은 설계만.
- **Gap**: Organization/Resource/Dataset/Time/Device Expansion 차단 전부 ABSENT — 순신규 설계 필요.
- **BLOCKED_PREREQUISITE(RP-002)**: Resource/Dataset Expansion 차단은 Permission Engine(Part 2)의 리소스 모델이 선행되어야 함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
