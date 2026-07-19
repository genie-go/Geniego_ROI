# DSAR — Composite Role Drift (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §59)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Composite Role Drift = 배포된 Composite Role Version이, 이후 발생한 Component Role Version/Status 변경·Nested Composite 변경·Permission/Deny/Scope Aggregation 변경·Actor Eligibility 변경·Risk 변경·Conflict/Dependency/Validity 변경과 **불일치(Drift)**하는 조건을 탐지하는 엔티티(스펙 §59). Role Hierarchy Drift(§58)가 **Graph(Node/Edge)** 축이라면, 본 편은 **Composite(조합)** 축.

- **순신규**: Composite Role 자체가 ABSENT(EXISTING_IMPLEMENTATION §4 "Composite Role/Component/Nested Composite = 전무") → 비교할 배포 상태 자체가 없음.

## 2. Canonical 필드

★스펙 §59 원문은 **Drift Type 열거형만 명시**하고 별도 필드 목록을 제시하지 않는다. §58 Role Hierarchy Drift의 필드 구조(drift id·대상 id·version id·source resolution reference·drift type·previous/current digest·affected count·severity·runtime blocked·revalidation required·detected/resolved at·status·evidence)를 Composite 대상으로 치환 적용하는 것이 설계상 합당하나, 이는 **스펙 §59 원문에 명시되지 않은 설계 추정**이므로 다음과 같이 명확히 구분해 표기한다.

| # | 필드(설계 추정 — §58 구조 준용) | 근거 |
|---|---|---|
| 1 | drift id | §58 §2 구조 준용 |
| 2 | composite role id | §58의 hierarchy id를 Composite 대상으로 치환 |
| 3 | composite version id | §58의 hierarchy version id를 치환 |
| 4 | source resolution reference | §58 §2 구조 준용 |
| 5 | drift type | §3 열거형(스펙 §59 원문) |
| 6 | previous digest / current digest | §58 §2 구조 준용(§51 Composite Role Snapshot의 immutable digest 비교) |
| 7 | affected component count(추정) | §58의 affected role count를 Component 단위로 치환 — **원문 미제시** |
| 8 | severity / runtime blocked / revalidation required | §58 §2 구조 준용(§6.16 Mandatory Control) |
| 9 | detected at / resolved at / status / evidence | §58 §2 구조 준용 |

> ★#2~#9는 "설계 추정(§58 구조 준용·스펙 §59 원문 비명시)"임을 명시. 실 필드 확정은 스펙 원문 명문화 또는 별도 승인 필요.

## 3. 열거형 (Drift Type — 스펙 §59 원문 그대로)

`COMPOSITE_VERSION_DRIFT` · `COMPONENT_VERSION_DRIFT` · `COMPONENT_STATUS_DRIFT` · `NESTED_COMPOSITE_DRIFT` · `PERMISSION_AGGREGATION_DRIFT` · `DENY_AGGREGATION_DRIFT` · `SCOPE_AGGREGATION_DRIFT` · `ACTOR_ELIGIBILITY_DRIFT` · `RISK_DRIFT` · `CONFLICT_DRIFT` · `DEPENDENCY_DRIFT` · `VALIDITY_DRIFT` · `DIGEST_DRIFT` · `CUSTOM`

## 4. 실 substrate 매핑 (§5.2)

전부 **ABSENT**. Composite Role 자체가 저장소에 실재하지 않는다(ADR §1·EXISTING_IMPLEMENTATION §4 "Composite Role/Component/Nested Composite = 전무").

| Drift Type | 최근접 substrate 검토 | file:line | 판정 |
|---|---|---|---|
| COMPONENT_STATUS_DRIFT(먼 근접·직접 매핑 아님) | team_role→acl_permission 매핑의 상태(`roleOf` fail-closed) | `TeamPermissions.php:120-131` | **직접 매핑 아님** — 이는 Role→Permission 매핑의 상태 변화이지 Composite의 Component(=Role Definition)의 상태가 아니다(§6.3 구분 유지). 참고용으로만 기재 |
| COMPOSITE_VERSION_DRIFT / COMPONENT_VERSION_DRIFT / NESTED_COMPOSITE_DRIFT | — | **ABSENT** | Composite Role/Version/Component/Nested 자체 순신규 |
| PERMISSION_AGGREGATION_DRIFT / DENY_AGGREGATION_DRIFT / SCOPE_AGGREGATION_DRIFT | — | **ABSENT** | Part 2 Permission Engine 코드 0(집계 대상 부재) |
| ACTOR_ELIGIBILITY_DRIFT / RISK_DRIFT / CONFLICT_DRIFT / DEPENDENCY_DRIFT / VALIDITY_DRIFT | — | **ABSENT** | 순신규 |
| DIGEST_DRIFT | — | **ABSENT** | §54 Role Graph Digest 선행 신설 대상 |

## 5. 설계 원칙

- **§51 Composite Role Snapshot 재사용**: Composite Drift는 §51 Snapshot의 previous/current 비교로 산출하며(§54 Digest 결합), 별도 비교 스토어를 신설하지 않는다.
- **Deprecated/Retired Component 즉시 감지**(§6.11/§6.12): Component가 Deprecated/Retired로 전이되면 즉시 `COMPONENT_STATUS_DRIFT` — 지연 감지 금지.
- **Risk 하향 방향 재계산은 우선 조사 대상**(§6.10 원칙 적용): `RISK_DRIFT`가 하향 방향으로 나타나면 이전 판정이 오류였을 가능성을 먼저 검토 — 자동 하향 반영 금지.
- **비파괴 신호원**: §58과 동일하게 Drift는 관측만 하고 Composite Role을 In-place Update 하지 않는다(§6.5·§6.15).

## 6. Gap / BLOCKED_PREREQUISITE

- Composite Role/Version/Component/Nested/Aggregation = **전부 ABSENT** → 전 drift_type 순신규.
- 필드 목록(§2)이 스펙 §59 원문에 명시되지 않아 §58 구조 준용은 **설계 추정** — 별도 확정 필요(스펙 원문 보완 또는 후속 승인).
- Permission/Deny/Scope Aggregation 결합 = **BLOCKED_PREREQUISITE**(Part 2 Permission Engine 코드 0).
- previous/current digest 비교 = §54 Role Graph Digest 선행 신설 대상.
- 실 엔진 = 선행 Permission Engine·Role Registry 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
