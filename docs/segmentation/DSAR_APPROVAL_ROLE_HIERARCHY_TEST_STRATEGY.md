# DSAR — Role Hierarchy Test Strategy (EPIC 06-A-03-02-03-04 Part 3-2 · Role Hierarchy & Composite Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) + Role Registry Version Binding(Part 3-1) 실 구현 부재
- **불변**: Role ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group · Golden Rule · 무후퇴 · 성능 이유로 Cycle Detection/Deny/Tenant Isolation/Scope Guard/Version Binding 제거 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만 인용·없으면 ABSENT) · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지

---

## 1. 목적

§76(76.1~76.7)의 **Role Hierarchy/Composite Role/Role Graph 테스트 전략**을 정의한다. Unit·Property·Integration·Security·Concurrency·Migration·Regression 계층별로 무엇을 검증해야 실 엔진이 §67 Critical Gap을 재유입 없이 닫는지 명세한다. 본 저장소는 **구성된 lint·PHPUnit 스위트가 없다**(CLAUDE.md: 수동/배포 검증) — 실 구현 세션에서 최소 테스트 하네스를 함께 세우는 것을 완료조건으로 명문화한다. **76.7 Regression Test는 별도 문서(배치 파일 6 `DSAR_APPROVAL_ROLE_HIERARCHY_FUNCTION_REGRESSION_GATE.md`)로 상세화**하며 본 문서에서는 위치만 참조. **본 차수 코드 0**.

## 2. Canonical 필드

- **Test Layer** — 76.1 Unit / 76.2 Property / 76.3 Integration / 76.4 Security / 76.5 Concurrency / 76.6 Migration / 76.7 Regression(별도 문서)
- **Target Domain** — Hierarchy Edge / Composite Component / Role Graph(Path·Closure) / Cache·Digest / Legacy Migration
- **Invariant Reference** — §76.2 Property 목록 항목 번호
- **Harness Requirement** — 신규 실 구현 PR과 동시 신설(수동 검증만으로 gap 닫힘 주장 금지)

## 3. 열거형 / 타입

### 3.1 §76.1 Unit Test

Canonical Edge Type/Direction 파싱·검증 · Lifecycle 전이표 · Component Mandatory/Optional/Excluded/Conditional 판정 · Maximum Depth 파라미터 검증 · Scope Intersection 연산 단위 검증.

### 3.2 §76.2 Property Test (불변식 · §76 원문)

- 동일 **Canonical Graph = 동일 Digest**(결정성).
- **Tenant 변경 시 동일 Cache Key 금지**.
- **Cycle Graph 활성화 불가**.
- **Self-reference 불가**.
- **Retired Role Active Edge/Component 불가**.
- **Explicit Deny 상속 후 유지**.
- **Scope Intersection 결과 ≤ 입력 Scope**.
- **Composite Risk ≥ 구성 Role 최대 Risk**.
- **Human-only + Machine-only Composite 금지**.
- **Graph Version 변경 시 과거 Snapshot 불변**.
- **동일 Permission·Version·Scope만 Deduplicate**.
- **Multiple Path 다른 Deny = Ambiguity/Conflict**.
- **Maximum Depth 초과 불가**.
- **Cross-Tenant Edge 불가**.
- **Immutable Version/Snapshot/Evidence**.
- **Default Deny 유지**.

### 3.3 §76.3 Integration Test

Hierarchy Registry ↔ Role Hierarchy ↔ Composite Role ↔ Role Graph ↔ (Permission Engine·BLOCKED) ↔ Snapshot/Evidence/Digest 왕복. Ancestor/Descendant/Path 조회 ↔ Effective Inherited/Composite Set 계산 왕복.

### 3.4 §76.4 Security Test

Cross-Tenant Edge 시도 · Role Graph Spoofing(위조 Path) · Retired Role 재활성 · Composite Risk 하향 시도 · Explicit Deny 소실 유도 · Human/Machine 혼합 우회 · Snapshot/Evidence/Digest Mutation 시도 · Cache Poisoning(Tenant 미결합 키) · Duplicate Component 은닉 · Lifecycle Bypass · Runtime Bypass(plan god flag류 anti-pattern 재발 감시).

### 3.5 §76.5 Concurrency Test

동시 Hierarchy/Composite/Graph Version 발행 경합 · Active Version Overlap 방지 · Idempotency-Key·Expected Version 낙관적 동시성 · 동시 Edge 등록 시 Cycle 재검증.

### 3.6 §76.6 Migration Test

위계 유사 substrate 3종(roleRank·parent_user_id·menu_tree)이 **Role Graph로 오흡수되지 않음**을 검증(§6.1 경계 회귀 테스트) · Legacy IAM(SSO group→role) Adapter Mapping Confidence·Manual Review 경로 · 폐기 admin_roles/user_roles **재부활 없음** 검증.

### 3.7 §76.7 Regression Test

별도 문서 참조: [[DSAR_APPROVAL_ROLE_HIERARCHY_FUNCTION_REGRESSION_GATE]] — 기존 Approval 전 기능(Login/User Management/Permission/Role Registry/team 권한/api_key RBAC/admin SSOT/AdminMenu 게이트/SSO) 무후퇴 목록·통과 기준.

## 4. 실 substrate 매핑 (§5.2)

| 테스트 대상 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 테스트 하네스(lint/PHPUnit) | **ABSENT → 신설** | 저장소에 구성된 테스트 스크립트 없음(CLAUDE.md: 수동/배포 검증) |
| Cycle Property 참조 알고리즘(비-Role) | **근접 알고리즘 패턴** | `wouldCycle`(`AdminMenu.php:540-555`) |
| Migration 테스트 대상(경계 3종) | **정형화 대상(Role Graph 밖 유지 검증)** | roleRank(`index.php:573`)·parent_user_id(`UserAuth.php:176,316,423-426`)·menu_tree(`AdminMenu.php:108,117,268`) |
| Cross-Tenant Property 참조 | **PARTIAL(데이터 행필터·정의 격리 아님)** | `UserAuth.php:423-426` |
| Digest/Snapshot/Cache Property | **ABSENT** | 없음(`menu_audit_log` hash_chain은 tamper-evident 아님·정본 재사용 금지) |
| Permission Version Property | **BLOCKED_PREREQUISITE** | Part 2 이후 |
| Regression 대상(플랫 가드) | **CANONICAL(무후퇴)** | 파일 6에서 상세 |

## 5. 설계 원칙

1. **엔진 신설 = 테스트 하네스 동시 신설이 완료조건** — 수동 검증만으로 §67 Critical Gap 닫힘을 주장 금지.
2. **Property 테스트가 무결성 정본** — Digest 결정성·Cycle 불가·Cross-Tenant 불가·Immutable Snapshot은 예시값이 아닌 불변식으로 봉인.
3. **Migration 테스트는 경계 유지 검증(흡수 아님)** — roleRank/parent_user_id/menu_tree가 Role Graph Migration Test에서 "정상 통합"이 아니라 "Role Graph 밖 유지" 성공 여부로 판정(§6.1 정합).
4. **폐기 admin_roles 재부활 부재를 Migration Test로 명시 고정** — 289차 폐기분이 정규화 과정에서 되살아나지 않음을 회귀로 고정.
5. **Security Test는 plan god flag류 Anti-pattern 재발 감시를 포함** — Runtime Bypass Test가 §69 #28 ANTI_PATTERN 재발을 조기 검출.
6. **정직 부재는 테스트 대상 아님** — Diamond/Ambiguity/Conflict가 현재 발생 이력이 없으므로(대상 그래프 부재) "회귀 테스트"가 아니라 "신규 기능 테스트"로 분류(날조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Version 관련 Property/Integration은 Part 2 이후. Node/Edge Role Version 결합 테스트는 Part 3-1 이후.
- **Gap(순신규)**: 테스트 하네스 자체 부재 — Unit/Property/Integration/Security/Concurrency/Migration 스위트 전무.
- **별도 문서**: 76.7 Regression Test는 [[DSAR_APPROVAL_ROLE_HIERARCHY_FUNCTION_REGRESSION_GATE]]에서 전담.
- **판정**: NOT_CERTIFIED · 실 테스트 = 엔진 신설 + 하네스 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_HIERARCHY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE]]
