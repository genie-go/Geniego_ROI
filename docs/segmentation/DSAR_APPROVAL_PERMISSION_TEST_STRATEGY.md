# DSAR — Permission Engine Test Strategy (EPIC 06-A-03-02-03-04 Part 2 · §98)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지 · 저장소 테스트 스위트 부재(현행 검증=수동/배포)

---

## ① 목적

§98은 **Permission Engine 신설 시 요구되는 테스트 전략**이다. 이 저장소는 현재 lint/test 스크립트가 없고 검증이 수동/배포 기반이므로, Permission Engine처럼 보안 판정을 담당하는 컴포넌트는 **자동화 테스트가 완료의 정의에 포함**되어야 한다. Property/Security/Concurrency 테스트가 핵심 — 단순 Unit으로는 Deny 우선·범위 확장 금지·불변성·테넌트 격리 같은 불변식을 보장할 수 없다.

## ② 핵심 항목/열거 (§98 테스트 계층)

### Unit
- 개별 Resolver/Scope 매처/Combining 전략 단위 검증.

### Property (불변식 — 무작위 입력에도 성립)
| # | Property |
|---|---|
| P1 | 동일 Canonical Input → 동일 Digest(결정 재현성) |
| P2 | Explicit Deny 우선(Deny-overrides) |
| P3 | Missing Grant = Deny(Default Deny) |
| P4 | Expired/Revoked/Suspended grant 제외 |
| P5 | Scope Intersection은 확장 불가(결합이 권한을 넓히지 않음) |
| P6 | Circular(Hierarchy/Group/Dependency) 구성 불가 |
| P7 | Temporary grant는 만료 필수 |
| P8 | Snapshot/Evidence/Version Immutable |
| P9 | Cross-Tenant Isolation(타테넌트 grant 미적용) |
| P10 | UI Hint ≠ Permit(가시성이 집행을 부여하지 않음) |

### Integration
- Registry→Definition→Grant→Resolution→Enforcement 엔드투엔드·API 계약(§94)·에러 계약(§90/§91).

### Security
| 공격 | 기대 |
|---|---|
| Cross-Tenant 접근 | 차단 |
| Wildcard 남용 | api_key 한정 외 거부 |
| Admin Bypass 시도 | DB 판정 외 우회 불가 |
| Actor/Client Spoofing | 차단(신원 위조 불가) |
| IDOR | 리소스 스코프 거부 |
| Resource Version Downgrade | 거부 |
| Expired/Revoked Grant 재사용 | 거부 |
| Cache Poisoning | 무결성/키(version+tenant) 방어 |
| Cycle 주입 | 구성 거부 |
| Scope Expansion | Intersection Guard 거부 |
| Deny Bypass | Deny 우선 유지 |
| Service/System Actor 오용 | 제한 적용 |
| Snapshot/Evidence Mutation | 불변 거부 |

### Concurrency
| # | 경합 |
|---|---|
| C1 | Grant ↔ Revocation 동시 |
| C2 | Version Change ↔ Resolution 동시 |
| C3 | Cache Invalidation ↔ Resolution 동시 |
| C4 | Temporary Use Count 동시 증가 |

### Migration
- Legacy(menu_key) → Canonical Code 매핑 마이그레이션·무손실·롤백.

### Regression (무후퇴 — 기존 기능 보존)
- Login · User Mgmt · Role · Approval · Assignment · Delegation · Payment · Contract · ERP · Workflow · API · Reporting · Admin Console.

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **Security-Cross Tenant 검증 기준선** — `index.php:619`(tenant 강제주입)·acl_permission `tenant_id`(`:152-171`). Cross-Tenant Isolation(P9) 테스트의 현행 앵커.
- **Admin Bypass 판정 기준선** — `UserAuth::resolveAdminByToken :2998`(DB plan/plans/admin_level). "Admin Bypass 시도" 테스트가 리터럴 우회 부재를 회귀 검증.
- **Deny/Default Deny 기준선** — `DENY_SCOPE :234`·`1=0` 센티넬 `:290,303`·`effectiveForUser :366`(grant 부재=deny). P2/P3 검증 앵커.
- **Delegation Regression** — `putMemberPermissions :628-647`(403 DELEGATION_EXCEEDED)·`clampActions :396-402`·`reclampTeamMembers :779-800`. Delegation 회귀 테스트 대상.
- **writeGuard 서버 배선 회귀** — `guardTeamWrite :1167` + `index.php:82`(`TEAM_READ_ONLY`). P10(UI Hint≠Permit) 회귀 앵커(289차 해소분 무후퇴 검증).
- **Migration 대상** — acl_permission `menu_key`(`:152-171`) → Canonical Code. Legacy Mapping 마이그레이션 테스트 대상.
- **Property(Digest/Immutable Snapshot/Version)·Concurrency(Version↔Resolution/Cache Invalidation)·Cache Poisoning** — **ABSENT(테스트 대상 산출물 순신규)**.

## ④ 설계 원칙

- **완료의 정의에 자동 테스트 포함**: 보안 판정 컴포넌트는 수동/배포 검증만으로 완료 불가 — Property·Security·Concurrency 자동화 필수.
- **불변식 우선(Property)**: Deny 우선·범위 확장 금지·불변성·테넌트 격리는 예시 Unit이 아니라 **무작위 입력 Property**로 보장.
- **무후퇴 Regression 게이트**: 기존 Login/Role/Approval/Delegation/Payment 등 도메인 회귀 스위트를 Permission Engine 병합 조건으로.
- **fail-closed 검증**: 모호/미조회/드리프트/캐시 실패 케이스가 전부 Deny로 귀결되는지 명시 테스트.
- **Migration 무손실·롤백**: Legacy menu_key→Canonical 매핑은 confidence 기록·양방향 검증·롤백 경로.
- **오탐 회귀 방지**: Wildcard(api_key 한정)·admin DB 판정은 "정상"으로 테스트 — Security 테스트가 이를 결함으로 오분류하지 않도록 기준선 고정.

## ⑤ Gap

- 현행 저장소에 lint/test 스크립트·Permission 테스트 스위트 **전무** — 검증=수동/배포. §98 전 계층이 신설 대상.
- Property/Concurrency 테스트 대상(Digest·Snapshot·Version·Cache)은 해당 산출물이 순신규라 **BLOCKED_PREREQUISITE(RP-002)**.
- 실 substrate(acl/data_scope·중앙 RBAC·admin SSOT·delegation)에 대한 Regression 앵커는 지금도 존재 → 신설 시 이들 무후퇴가 최우선 게이트.
- ★테스트 코드 작성·CI 배선은 별도 승인세션. "있다고 가정" 배선 금지.
