# DSAR — Approval Role Permission Merge (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity: Role Permission Merge)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule(Extend not Replace) · Cycle 금지·Scope Intersection 기본·Explicit Deny 보존·Actor 교집합·Risk 상향 · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Role Permission Merge(§36)는 Effective Inherited Role Set(§34)과 Effective Composite Role Set(§35)이 공통으로 사용하는 **20단계 결정적 병합 알고리즘**이다. Direct Mapping부터 Permission Group/Bundle Flattening, Inherited/Composite Permission, Version/Lifecycle 검증, Deny 수집, Exclusion 제거, Deduplication, Scope/Constraint Intersection, Actor Eligibility·Conflict·Dependency 검증, Risk 계산, 최종 Digest·Evidence 생성까지의 순서를 고정하여, 동일 입력이면 항상 동일 Effective 결과(및 동일 Digest)가 나오도록 보장한다. 이 문서는 별도 저장 테이블이 아니라 §34·§35가 호출하는 **알고리즘 명세**다.

## 2. Canonical 필드 (20단계 순서 — §36 원문)

| # | 단계 | 목적 |
|---|---|---|
| 1 | Direct Role Permission Mapping 조회 | Role Definition에 직접 매핑된 Permission 조회 |
| 2 | Permission Group Flattening | Permission Group(묶음) 전개 |
| 3 | Permission Bundle Flattening | Permission Bundle 전개 |
| 4 | Inherited Role Permission | §34 Hierarchy 상속으로 유입된 Permission 병합 |
| 5 | Composite Component Permission | §35 Composite Component로 유입된 Permission 병합 |
| 6 | Permission Version 검증 | 각 Permission의 Version Binding 유효성 확인 |
| 7 | Permission Lifecycle 검증 | Deprecated/Retired/Suspended Permission 배제 |
| 8 | Permission Effect 분리 | Allow/Deny Effect 분리 |
| 9 | Explicit Deny 수집 | 모든 경로의 Explicit Deny를 누락 없이 수집(§6.8) |
| 10 | Excluded Permission 제거 | Composite Excluded Component의 Permission 제거 |
| 11 | Duplicate Deduplication | §37 원칙에 따라 동일 Version·Scope·Constraint만 병합 |
| 12 | Scope Intersection | §39 기본 정책(교집합) 적용 |
| 13 | Constraint Intersection | §40 원칙(더 강한 제약 우선) 적용 |
| 14 | Actor Eligibility 검증 | §6.9 교집합 확인 |
| 15 | Conflict 탐지 | §18 Role Conflict 검사 |
| 16 | Dependency 검증 | §17 Missing Required Dependency 차단 |
| 17 | Risk 계산 | §6.10 최대값/상향 계산 |
| 18 | Effective Permission Digest | 최종 Allow 집합 Digest 생성 |
| 19 | Effective Deny Digest | 최종 Deny 집합 Digest 생성 |
| 20 | Evidence 생성 | §53 Path Evidence·§52 Graph Evidence 기록 |

## 3. 열거형 / 타입

이 문서 자체는 별도 엔티티 열거형을 갖지 않는다(§36은 순서 알고리즘). 관련 열거형은 별도 per-entity 문서가 정본이다 — Permission Deduplication 보존 항목(§37)·Role Permission Precedence 14단계 우선순위(§38, 별도 entity)·Scope Propagation Policy(§39)는 이 병합 알고리즘의 12~13단계가 참조하되 이 문서에서 재정의하지 않는다.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line·ground-truth만·없으면 ABSENT) |
|---|---|---|
| 20단계 병합 알고리즘 전체 | ABSENT(순신규) | 결정적 다단계 Role Permission Merge 파이프라인 자체가 부재(GROUND_TRUTH §4) |
| 1단계(Direct Role Permission Mapping 조회) 근접 | Permission Group Candidate(묶음) | team_role→acl_permission(`TeamPermissions.php:152`) — 정적 1회 조회이지 20단계 파이프라인의 1단계로 설계된 적 없음 |
| 8단계(Permission Effect 분리)·9단계(Explicit Deny 수집) 근접 | Anti-pattern(§6.5) 인접 경계 | `isAdmin` plan god flag(`TeamPermissions.php:132`)는 Effect 분리 없이 전역 우회하는 반대 사례 — 이 병합 알고리즘이 방지하려는 패턴의 실사례(§6.5) |
| 4단계(Inherited Role Permission)·5단계(Composite Component Permission) | ABSENT(순신규) | Effective Inherited/Composite Role Set(§34·§35)이 ABSENT이므로 입력 자체가 없음 |
| 11단계(Duplicate Deduplication) 근접 | Role Inclusion 아님 | `effectiveForUser`(`TeamPermissions.php:366-394`)의 클램프 로직은 다중 경로 Permission을 병합하는 것이 아니라 team_role 3단계 중 하나를 선택하는 단일 분기이며, 이 20단계 파이프라인과 구조가 다름 |

## 5. 설계 원칙

- 20단계는 **고정 순서**다 — 예를 들어 Deduplication(11)을 Scope Intersection(12)보다 먼저 수행해야 서로 다른 Scope를 가진 두 경로를 잘못 하나로 합치지 않는다(§45 Diamond Inheritance 오류 방지).
- Explicit Deny 수집(9)은 Excluded Permission 제거(10)·Deduplication(11)보다 먼저 수행하여, Deny가 Dedup 과정에서 유실되지 않게 한다(§6.8).
- Conflict 탐지(15)·Dependency 검증(16)에서 Critical 판정이 나오면 이후 단계(17~20)는 진행하되 최종 결과는 Runtime Guard(§69)에서 차단 상태로 마킹한다 — 병합 자체를 중단하지 않고 "차단된 결과"를 Evidence로 남긴다(§6.16 Evidence 필수).
- `isAdmin` god flag(`TeamPermissions.php:132`) 같은 Effect 분리 없는 전역 우회는 이 20단계 파이프라인 설계 시 반면교사로만 참조하며, 신규 Role Permission Merge에 이식하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

Role Permission Merge는 입력으로 삼는 Effective Inherited Role Set(§34)·Effective Composite Role Set(§35)·Permission Group/Bundle(Part 2 Permission Engine)이 모두 ABSENT·설계 단계이므로 **완전 ABSENT(순신규) · BLOCKED_PREREQUISITE** 판정이다. 근접 실 코드(`TeamPermissions.php:152,366-394`)는 단일 정적 매핑/클램프이며 20단계 결정적 파이프라인이 아니다. 실 구현은 선행 Permission Engine(Part 2)·Role Definition Version(Part 3-1)이 실 코드로 구현된 이후 별도 승인세션(RP-002)에서만 진행하며, 이번 차수는 설계 명세·코드 0·NOT_CERTIFIED로 종결한다.
