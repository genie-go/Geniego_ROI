# DSAR — Role Hierarchy Error / Warning Contract (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§70(Error)·§71(Warning)의 **Role Hierarchy/Composite/Graph 에러·경고 코드 정본**을 정의한다. Error=요청을 **차단(fail-closed)**하는 확정 위반, Warning=처리는 진행하되 **감사·후속 조치를 유발**하는 신호다. 두 목록은 §69 Runtime Guard(차단 발동)·§72 API(응답 표현)가 공유하는 단일 소스다. **현행 저장소에는 Role Hierarchy/Composite 코드 체계가 전무**하며(순신규), 현재의 authz 실패는 flat HTTP 403/401(RBAC 미들웨어·`requireTeamWrite`)로만 표현된다.

## 2. Canonical 필드

- **Code** — `APPROVAL_ROLE_*` 네임스페이스(세부: `_HIERARCHY_*` / `_COMPOSITE_*` / `_GRAPH_*` / 무접두 관계형: `_DEPENDENCY_*`·`_EXCLUSION_*`·`_CONFLICT_*`·`_DIAMOND_INHERITANCE_*`·`_PATH_EVIDENCE_*`)
- **Class** — `ERROR`(fail-closed) / `WARNING`(진행+감사)
- **Trigger** — 발동 조건(§70/§71 원문)
- **Related Runtime Guard** — §69 항목 매핑(배치 파일 1)
- **Related API** — §72 응답 표면(배치 파일 3)
- **Remediation Hint** — Deprecation/Review/Migration 등 Warning 후속 조치 유형

## 3. 열거형 / 타입

### 3.1 §70 Error 코드 (40개 · fail-closed 차단 · 정본)

**Hierarchy 계열 (17)**

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_HIERARCHY_REGISTRY_NOT_FOUND` | Hierarchy Registry 미존재 |
| `APPROVAL_ROLE_HIERARCHY_NOT_FOUND` | Hierarchy 정의 미존재 |
| `APPROVAL_ROLE_HIERARCHY_VERSION_NOT_FOUND` | Version 미존재 |
| `APPROVAL_ROLE_HIERARCHY_VERSION_INACTIVE` | 비활성 Version 참조 |
| `APPROVAL_ROLE_HIERARCHY_VERSION_MISMATCH` | Expected Version 불일치 |
| `APPROVAL_ROLE_HIERARCHY_NODE_NOT_FOUND` | Node(Role) 미존재 |
| `APPROVAL_ROLE_HIERARCHY_EDGE_NOT_FOUND` | Edge 미존재 |
| `APPROVAL_ROLE_HIERARCHY_DIRECTION_INVALID` | Inheritance Direction 위반(기본값 `EXPLICIT_EDGE_DIRECTION_ONLY` 외) |
| `APPROVAL_ROLE_HIERARCHY_CIRCULAR_REFERENCE` | Direct/Indirect Cycle |
| `APPROVAL_ROLE_HIERARCHY_MAX_DEPTH_EXCEEDED` | Maximum Depth 초과 |
| `APPROVAL_ROLE_HIERARCHY_CROSS_TENANT_BLOCKED` | Cross-Tenant Edge 시도 |
| `APPROVAL_ROLE_HIERARCHY_CROSS_REGISTRY_BLOCKED` | 미승인 Cross-Registry Edge |
| `APPROVAL_ROLE_HIERARCHY_ROLE_VERSION_MISSING` | Node Role Version 결합 누락 |
| `APPROVAL_ROLE_HIERARCHY_ROLE_INACTIVE` | 비활성 Role 사용 |
| `APPROVAL_ROLE_HIERARCHY_ROLE_SUSPENDED` | Suspended Role 신규 Edge/사용 |
| `APPROVAL_ROLE_HIERARCHY_ROLE_RETIRED` | Retired Role Active Graph 포함 |
| `APPROVAL_ROLE_HIERARCHY_PERMISSION_VERSION_MISSING` | 결합 Permission Version 누락(BLOCKED·Part 2) |

**Composite 계열 (10)**

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_COMPOSITE_NOT_FOUND` | Composite Role 미존재 |
| `APPROVAL_ROLE_COMPOSITE_VERSION_NOT_FOUND` | Composite Version 미존재 |
| `APPROVAL_ROLE_COMPOSITE_COMPONENT_NOT_FOUND` | Component Role 미존재 |
| `APPROVAL_ROLE_COMPOSITE_CIRCULAR_REFERENCE` | Nested Composite Cycle |
| `APPROVAL_ROLE_COMPOSITE_DUPLICATE_COMPONENT` | Component 중복 |
| `APPROVAL_ROLE_COMPOSITE_ACTOR_INCOMPATIBLE` | Human-only↔Machine-only Component 혼합 |
| `APPROVAL_ROLE_COMPOSITE_PERMISSION_CONFLICT` | Component 간 Permission 충돌 |
| `APPROVAL_ROLE_COMPOSITE_EXPLICIT_DENY_CONFLICT` | Explicit Deny 소실/충돌 |
| `APPROVAL_ROLE_COMPOSITE_SCOPE_EXPANSION_BLOCKED` | Scope 자동 확대 시도 |
| `APPROVAL_ROLE_COMPOSITE_RISK_INVALID` | Composite Risk가 구성 Role 최대 Risk 미만(하향) |

**관계형 (4)**

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_DEPENDENCY_MISSING` | Required Dependency 미충족 |
| `APPROVAL_ROLE_EXCLUSION_TRIGGERED` | Excluded Role 포함 시도 |
| `APPROVAL_ROLE_CONFLICT_DETECTED` | Role Conflict(SoD) 탐지 |
| `APPROVAL_ROLE_DIAMOND_INHERITANCE_CONFLICT` | Diamond 경로 간 Scope/Deny 불일치 |

**Graph 무결성 (9)**

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_GRAPH_AMBIGUOUS` | 모호 경로/해석 |
| `APPROVAL_ROLE_GRAPH_VERSION_MISMATCH` | Graph Version 불일치 |
| `APPROVAL_ROLE_GRAPH_DIGEST_MISMATCH` | Canonical Digest 불일치 |
| `APPROVAL_ROLE_GRAPH_SNAPSHOT_MISSING` | 필수 Snapshot 부재 |
| `APPROVAL_ROLE_PATH_EVIDENCE_MISSING` | Path Evidence 부재 |
| `APPROVAL_ROLE_GRAPH_DRIFT_DETECTED` | 정의-실사용 Drift |
| `APPROVAL_ROLE_GRAPH_CACHE_INVALID` | Cache Key에 Graph Version 미결합/무효 |
| `APPROVAL_ROLE_GRAPH_RUNTIME_BLOCKED` | Runtime Bypass 시도 |
| `APPROVAL_ROLE_GRAPH_TAMPER_DETECTED` | Graph Tamper 탐지 |

### 3.2 §71 Warning 코드 (17개 · 진행 + 감사 · 정본)

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_HIERARCHY_DEPRECATION_WARNING` | Deprecated 예정 Hierarchy 사용 |
| `APPROVAL_ROLE_HIERARCHY_VERSION_WARNING` | 비-Active Version 참조 |
| `APPROVAL_ROLE_COMPOSITE_VERSION_WARNING` | 비-Active Composite Version 참조 |
| `APPROVAL_ROLE_COMPONENT_DEPRECATION_WARNING` | Deprecated Component 포함 |
| `APPROVAL_ROLE_COMPONENT_SUSPENSION_WARNING` | Suspended Component 포함 |
| `APPROVAL_ROLE_SCOPE_EXPANSION_WARNING` | Scope 확대 경향 감지(차단 미만) |
| `APPROVAL_ROLE_PERMISSION_EXPANSION_WARNING` | Permission 확대 경향 감지 |
| `APPROVAL_ROLE_DIAMOND_INHERITANCE_WARNING` | Diamond 경로 감지(충돌 미만) |
| `APPROVAL_ROLE_MULTIPLE_INHERITANCE_WARNING` | 다중 상속 경로 감지 |
| `APPROVAL_ROLE_ACTOR_COMPATIBILITY_WARNING` | Actor 적합성 경계 사례 |
| `APPROVAL_ROLE_RISK_ESCALATION_WARNING` | Risk 상향 발생 |
| `APPROVAL_ROLE_CONFLICT_WARNING` | 잠재 Conflict(차단 미만) |
| `APPROVAL_ROLE_DEPENDENCY_WARNING` | Dependency 경계 사례 |
| `APPROVAL_ROLE_MIGRATION_WARNING` | Legacy Migration 경로 사용 |
| `APPROVAL_ROLE_DRIFT_WARNING` | Drift 감지(재검증 필요) |
| `APPROVAL_ROLE_RECONCILIATION_WARNING` | Reconciliation 필요 |
| `APPROVAL_ROLE_MANUAL_REVIEW_REQUIRED` | 수동 검토 라우팅 |

## 4. 실 substrate 매핑 (§5.2)

| Canonical 코드축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Hierarchy/Composite/Graph 구조화 코드 체계 | **ABSENT → 신설** | 없음 — 현행은 flat HTTP 403/401 |
| 현행 authz 실패 표면(최근접) | **PARTIAL(flat)** | RBAC 미들웨어(roleRank `index.php:573,592-595`) · `requireTeamWrite`류(Part 3-1 substrate) |
| roleOf fail-closed(코드 유사 부재) | **PARTIAL** | `TeamPermissions.php:120-131` |
| Cycle/Diamond/Ambiguity/Conflict 코드 | **ABSENT** | 대상 그래프 자체 부재 |
| Snapshot/Digest/Path Evidence/Drift/Cache/Tamper 코드 | **ABSENT** | `menu_defaults`(`AdminMenu.php:119-122`)·`menu_audit_log`(`AdminMenu.php:123-131,169-219`)는 비-Role 근접(장식 아닌 tamper-evident 아님 명시 필요) |
| Permission Version 관련 코드 | **BLOCKED_PREREQUISITE** | Part 2 이후 |
| Composite 관련 코드 | **ABSENT** | team_role→acl_permission(`TeamPermissions.php:152`)은 Composite 아님(§6.3) |

## 5. 설계 원칙

1. **Error=차단·Warning=진행+감사 이분법 고정** — Lifecycle/Tenant/Cycle/Diamond/Digest/Tamper 위반은 Error(fail-closed), Deprecation/Risk 상향/Migration/Drift는 Warning. 혼용 금지.
2. **코드 목록 단일 정본** — §69 가드(파일1)·§72 API(파일3)·§76 테스트(파일5)가 본 문서 코드 이름을 공유. 코드 문자열 중복 정의 금지.
3. **Hierarchy/Composite/Graph 3계열 네임스페이스 분리 유지** — `_HIERARCHY_*`(Edge 구조)·`_COMPOSITE_*`(조합)·`_GRAPH_*`(전역 무결성)를 혼동 표기 금지(ADR D-3 Edge 의미론과 정합).
4. **fail-closed 계승** — 현행 roleOf(미해결→member)·RBAC 기본거부 방향을 Hierarchy Error 코드로 승격하되 기본거부 유지(권한상승 금지).
5. **Composite Risk Invalid는 하향 금지 규율의 코드화** — `_COMPOSITE_RISK_INVALID`는 ADR D-4(§6.10 Risk 최대값/상향)의 직접 강제.
6. **Tamper/Digest 코드는 무결성 정본에 결합** — 새 해시엔진 남립 금지. `menu_audit_log` hash_chain을 tamper-evident로 오인용 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `_HIERARCHY_PERMISSION_VERSION_MISSING` 등 Permission Version 관련 코드는 Part 2 이후 실효. `_HIERARCHY_NODE_NOT_FOUND`류는 Part 3-1 Role Definition 실구현 이후.
- **Gap(순신규)**: Error 40 + Warning 17 코드 전부 신설 — 현행은 flat HTTP 상태만 존재.
- **PARTIAL(최근접)**: RBAC/roleOf가 차단은 하나 구조화 코드·Hierarchy/Composite/Graph 신호 미표현.
- **정직 부재**: Diamond/Ambiguity/Conflict/Cycle 기반 에러는 대상 그래프 부재로 발생 이력 자체가 없음(날조 금지).
- **판정**: NOT_CERTIFIED · 실 코드 방출 = Canonical Role Graph 신설 + Part 2/3-1 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_GRAPH_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]
