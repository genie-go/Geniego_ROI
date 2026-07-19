# DSAR — Approval Role Test Strategy (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§66의 **Role Registry 테스트 전략**을 정의한다. Unit·Property·Integration·Security·Concurrency·Migration·Regression 계층별로 무엇을 검증해야 실 엔진이 §57 Critical Gap을 재유입 없이 닫는지 명세한다. 본 저장소는 **구성된 lint·PHPUnit 스위트가 없다**(CLAUDE.md·수동/배포 검증) — 따라서 본 전략은 실 구현 세션에서 최소 테스트 하네스를 함께 세우는 것을 완료조건으로 명문화한다. **본 차수 코드 0**.

## 2. 열거 / 항목 (테스트 계층)

### 2.1 Unit
- Canonical Code 파싱/검증 · Lifecycle 전이표 · Owner 필수 · Scope Requirement 판정.

### 2.2 Property (불변식)
- 동일 Canonical Role → **동일 Digest**(결정성).
- Role Code **중복 불가**(Registry+Tenant 유일).
- Tenant 변경 시 **Cache Key 재사용 금지**.
- 과거 **Snapshot 불변**.
- Active Role은 **Owner + (Active) Permission Version 필수**.
- Suspended/Deprecated/Retired **런타임 사용 금지**.
- Human Approval Role을 **Service/System actor에 부여 금지**.
- Canonical Code **Locale 불변**(로케일에 따라 코드 변동 금지).
- Alias **불변**(Alias→Canonical 매핑 안정).
- Role Split 시 **자동 Migration 금지**(명시 승인).
- **Cross-Tenant Isolation**.
- Version/Snapshot/Evidence **Immutable**.

### 2.3 Integration
- Registry↔Definition↔Namespace↔(Permission Mapping·BLOCKED)↔Scope/Eligibility↔Snapshot/Evidence 왕복.

### 2.4 Security
- Cross-Tenant 접근 · Role Code Spoofing · Alias를 authz에 직접 사용 · Retired Role 재활성 · Permission/Risk Downgrade · Owner 제거 · Service Account에 Human Role · Snapshot/Evidence Mutation · Cache Poisoning · Duplicate Code · Lifecycle Bypass.

### 2.5 Concurrency
- 동시 Version 발행 경합 · Active Version Overlap 방지 · Idempotency·Expected Version 낙관적 동시성.

### 2.6 Migration
- 5 role 어휘(team_role/api_key role/admin_level/AdminMenu enum/SSO map)→Canonical 정규화 · Alias 매핑 안정성 · 폐기 admin_roles **재부활 없음** 검증.

### 2.7 Regression (무후퇴 표면)
- Login · User Mgmt · Permission · Approval · Assignment · Delegation · Payment · Contract · ERP · Workflow · API · Reporting · Admin Console · Support Tool.

## 3. substrate 매핑 (§5.2)

| 테스트 대상 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 테스트 하네스(lint/PHPUnit) | **ABSENT → 신설** | 저장소에 구성된 테스트 스크립트 없음(CLAUDE.md: 수동/배포 검증) |
| Regression 표면(team_role 가드) | **CANONICAL(무후퇴 대상)** | `requireTeamWrite`(`UserAuth.php:1134`)·roleOf(`TeamPermissions.php:120-131`) |
| Regression 표면(api_key RBAC) | **CANONICAL** | roleRank `index.php:573`·validRoles `Keys.php:95` |
| Regression 표면(admin SSOT) | **정합 기반(289차 P4)** | `resolveAdminByToken`·isMaster `UserAdmin.php:43-46` |
| Migration 소스(5 어휘) | **정형화 대상** | team_role `UserAuth.php:188`·admin_level `UserAuth.php:191`·SSO `EnterpriseAuth.php:70-88` |
| Digest/Snapshot/Cache Property | **ABSENT** | Snapshot/digest/cache 계약 부재 |
| Permission Version Property | **BLOCKED_PREREQUISITE** | Part 2 이후 |

## 4. 설계 원칙

1. **엔진 신설 = 테스트 하네스 동시 신설이 완료조건** — 구성된 테스트가 없는 저장소이므로, 실 구현 PR은 최소 Unit/Property/Security 하네스를 함께 세운다(수동 검증만으로 §57 gap 닫힘을 주장 금지).
2. **Property 테스트가 무결성 정본** — Digest 결정성·Snapshot 불변·Cross-Tenant·Locale 불변은 Property로 봉인(예시값 아닌 불변식 검증).
3. **Migration 테스트는 admin_roles 재부활 부재를 명시 검증** — 289차 폐기분이 정규화 과정에서 되살아나지 않음을 회귀로 고정.
4. **Regression 표면 무후퇴** — team_role 가드·api_key RBAC·admin SSOT는 Registry 도입 후에도 동일 판정(회귀 0)을 Regression 스위트로 증명.
5. **정직 부재는 테스트 대상 아님** — isManager/isApprover/JobTitle 개념이 없으므로 관련 테스트를 만들지 않는다(날조 금지).

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Version 관련 Property/Integration은 Part 2 이후.
- **Gap(순신규)**: 테스트 하네스 자체 부재 — Unit/Property/Security/Concurrency/Migration 스위트 전무.
- **CANONICAL(무후퇴)**: Regression 표면(team_role/api_key/admin SSOT)은 실재하므로 회귀 검증 대상.
- **판정**: NOT_CERTIFIED · 실 테스트 = 엔진 신설 + 하네스 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_ROLE_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
