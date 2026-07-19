# DSAR — Role Graph Evidence (EPIC 06-A-03-02-03-04 Part 3-2 · per-entity 설계 · 스펙 §52)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 선행 Permission Engine(Part 2) + Role Registry(Part 3-1) + Decision Core 실 구현 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ) ground-truth**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(ADR §D-2·스펙 §6.1~6.3) · Golden Rule(Extend not Replace·중복 Graph/Resolver 신설 금지) · Historical Immutability(스펙 §6.15) · Cache Key는 Version+Tenant-aware 필수(스펙 §56)
- **반날조 규율**: 모든 `file:line`은 위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 **ABSENT**. 폐기 `admin_roles`/`user_roles`(289차 P3) 재부활 금지 · 289차 P1~P4(writeGuard·featurePlan·admin폐기·resolveAdminByToken) 재플래그 금지.

---

## 1. 목적

Role Graph Evidence = 특정 Role Graph Version에 대해 수행된 모든 판정(Scope Propagation·Actor Eligibility·Dependency·Conflict·Ambiguity·Circular Reference·Scope Expansion·Permission Expansion) 결과와, 그 근거가 된 Hierarchy/Composite/Role Version 참조·Edge/Path/Permission/Deny 스냅샷을 불변으로 캡처하는 evidence record(스펙 §52). Role Graph Snapshot(§50)·Composite Role Snapshot(§51)의 "결과"뿐 아니라 **그 결과에 도달한 판정 과정 자체**를 감사·사후재구성·Digest(§54) 산출의 근거로 남긴다.

- **순신규**: Role Graph 자체가 ABSENT이므로(ADR §1·EXISTING_IMPLEMENTATION §4) 그 위에서 수행되는 판정과 Evidence도 전부 ABSENT.

## 2. Canonical 필드

`APPROVAL_ROLE_GRAPH_EVIDENCE` (전부 신규 · 실값 아님 · 스펙 §52 원문 그대로)

| # | 필드 | 의미 |
|---|---|---|
| 1 | evidence id | Evidence 식별자 |
| 2 | tenant id | 테넌트 격리 경계 |
| 3 | graph version id | 대상 Role Graph Version |
| 4 | hierarchy version references | 참조된 Hierarchy Version들 |
| 5 | composite version references | 참조된 Composite Version들 |
| 6 | role version references | 참조된 Role Version들 |
| 7 | edge snapshots | Edge 상태 스냅샷 |
| 8 | path snapshots | Path 상태 스냅샷(§53) |
| 9 | permission snapshots | Permission 스냅샷 |
| 10 | deny snapshots | Deny 스냅샷 |
| 11 | scope propagation result | Scope 전파 판정 결과 |
| 12 | actor eligibility result | Actor 자격 판정 결과 |
| 13 | dependency result | Dependency 판정 결과 |
| 14 | conflict result | Conflict 판정 결과 |
| 15 | ambiguity result | Ambiguity(Diamond 등) 판정 결과 |
| 16 | circular reference result | 순환 참조 판정 결과 |
| 17 | scope expansion result | Scope 확대 가드 판정 결과 |
| 18 | permission expansion result | Permission 확대 가드 판정 결과 |
| 19 | graph digest | Graph Digest(§54) |
| 20 | captured at | 캡처 시각 |
| 21 | immutable digest | Evidence 자체 무결성 다이제스트 |
| 22 | status | Evidence 상태 |

## 3. 열거형 / 타입

- **각 result 필드(scope propagation/actor eligibility/dependency/conflict/ambiguity/circular reference/scope expansion/permission expansion) 값공간**: PASS/BLOCK/WARN류 판정 값 — 스펙·ADR 원문에 세부 열거값 미제시 → **설계 예약(미확정)**
- **status**: Evidence 생명주기(OPEN/VERIFIED 등) — 스펙 원문에 세부 값 미제시 → **설계 예약(미확정)**

## 4. 실 substrate 매핑 (§5.2)

| Evidence 축 | 최근접 substrate | file:line | 판정 |
|---|---|---|---|
| append-only 캡처 구조(근접 패턴·재사용 아님) | `menu_audit_log` hash_chain(append만·`appendAudit`/`lastHash`) | `AdminMenu.php:123-131,169-219` | **★tamper-evident 아님** — 정본 append-only 해시체인은 `SecurityAudit::verify`뿐(chain write만 실재·verify 0·장식). menu hash_chain을 tamper-evident Evidence로 인용 금지(EXISTING_IMPLEMENTATION §5) |
| graph/hierarchy/composite/role version references | — | **ABSENT** | Role Graph/Hierarchy/Composite Version 자체 순신규 |
| edge/path/permission/deny snapshots | — | **ABSENT** | 순신규 |
| scope propagation·actor eligibility·dependency·conflict·ambiguity·circular reference·scope/permission expansion result | — | **ABSENT** | 판정 알고리즘 전무(ADR §1 grep 0건: circular·Tarjan·transitive·closure·ancestor·descendant) |
| graph digest | — | **ABSENT** | §54 선행 신설 대상 |

> ★`SecurityAudit::verify`는 전수조사 2문서(EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT)에 file:line이 제시되지 않아 반날조 규율상 본 편에서 인용하지 않는다(정본 명칭만 언급된 상태). 실 Evidence integrity 메커니즘 결합은 별도 검증 세션 대상.

## 5. 설계 원칙

- **Evidence ≠ 장식 해시체인**: menu_audit_log 수준(append만·verify 0)을 Role Graph Evidence의 무결성 요건 충족으로 오인 금지. 스펙 §6.16 Mandatory Control의 Evidence 항목은 검증 가능한 append-only 메커니즘을 요구.
- **Immutable digest·Historical Immutability**(§6.15): Evidence는 캡처 시점 동결, 소급 수정 금지.
- **Tenant 격리 절대**: `tenant id` 필수 — auth_audit_log류 전역 누적 결함 미승계.
- **판정 결과는 Evidence로만 재구성**: 현재 Role Graph 상태로 과거 판정 결과를 대체 재계산하지 않는다(Snapshot ≠ 현재 재구성 원칙 동형 적용).

## 6. Gap / BLOCKED_PREREQUISITE

- Role Graph/Hierarchy/Composite Version = **전부 ABSENT** → Evidence가 참조할 대상 자체가 없음.
- 8종 판정 알고리즘(Scope Propagation·Actor Eligibility·Dependency·Conflict·Ambiguity·Circular Reference·Scope/Permission Expansion) = **전부 ABSENT**(ADR §1 grep 0건).
- 신뢰 가능한 append-only Evidence integrity 메커니즘 = 현재 substrate(menu_audit_log)가 tamper-evident 아님 → **별도 설계 신규**.
- 실 엔진 = 선행 Permission Engine·Role Registry·Decision Core 실구현 후 **별도 승인세션(RP-002)**. 본 편 코드/DB 0 · NOT_CERTIFIED.
