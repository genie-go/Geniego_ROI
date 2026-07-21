# DSAR — Certification Completion Gate (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §38(Completion Gate)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **위치**: 본 문서는 **Part 3-8(Role Certification & Access Review Governance)의 최종 완료 게이트 정본**이다. 하위 per-entity DSAR(Registry·Reviewer Governance·API Surface·Database Constraint·Index Strategy·Performance Requirements·Test Contract 등)의 완료 조건을 집약한다.
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §38(Completion Gate)은 Part 3-8 실 구현이 "완료(Done)"로 인정되기 위한 **21개 완료 조건**을 정의한다. 원문 21조건: Certification Registry·Campaign Engine·Review Queue·Reviewer Governance·Delegation·Attestation·Exception Management·Remediation Workflow·Auto Revocation·Analytics·Snapshot·Evidence·Digest·Drift·Revalidation·Simulation·Runtime Guard·Static Lint 구축 + Performance Benchmark 통과·Compliance Validation 통과·Regression Test 100% 통과. 본 문서는 이 21조건을 현행 substrate와 대조하여 각 조건의 시작점을 판정하고, 하위 per-entity DSAR로의 매핑을 집약한다. ★판정 핵심(ADR §2.3): **Certification & Access Review = ABSENT-engine / PARTIAL-substrate**. Part 3-7(ERRE, PARTIAL-substrate 5종 보유)보다도 얇은 그린필드로, 21조건 중 재활용 가능한 시작점은 감사 인프라(SecurityAudit)·수동 회수·만료 필드 3종뿐이며 나머지는 순신규다.

## 2. Ground-Truth (substrate or ABSENT+KEEP_SEPARATE)

### 2.1 실존 substrate (PARTIAL·완료 시작점 실재)

- **감사/증거 인프라**: `SecurityAudit.php:12`(클래스)·`:56`(verify)·`:27`(prev_hash)·`:63`(hash_chain)·`:8`(append-only 주석) = 유일 실 tamper-evident. Evidence/Digest 완료 조건의 참조 기반(흡수 아님).
- **회수(수동)**: `Keys.php:135`(revoke)·`:155`(rotate)·`UserAdmin.php:338`(is_active)·`:342`(세션 revoke)·`UserAuth.php:141`(결제만료 강등)·`TeamPermissions.php:517`(팀 status). Remediation/Auto Revocation 완료 조건의 수동 근접 시작점.
- **만료/휴면**: `index.php:518`(expires 강제)·`:522`(last_used)·`:506`(is_active)·`UserAuth.php:206`(세션 유휴). Dormant Review(§8) 판정 소재.
- **위임(권한)**: `TeamPermissions.php:641`(putMemberPermissions)·`:393`(effectiveForUser)·`:379`. Reviewer Delegation(§7)의 상한 로직 참고(D-5, 권한위임≠검토위임).

### 2.2 ABSENT 거버넌스 (SPEC §38 완료 조건)

- **12 ABSENT 계층**(Ground-Truth ② §2, ADR §2.2): Registry·Campaign/Schedule·Review Queue 상태머신·Reviewer Governance/Delegation·Attestation/Recertification·Exception·Remediation/Auto-Revocation(자동 연동)·SLA/Reminder/Escalation·Analytics/Risk/Drift/Reval/Reconcil/Simulation·Snapshot/Evidence/Digest(전용 스키마)·Runtime Guard·Static Lint. 유일 grep 히트 2건(`ChannelSync.php:3099`·`google_ads.json:136`)은 이질 도메인.
- **Performance Benchmark 미충족**: PERFORMANCE_REQUIREMENTS DSAR(§36) 5개 SLA 전부 ABSENT — 측정 대상 엔진 자체 부재.
- **Regression 스위트 부재**: CLAUDE.md 명시("no configured lint or test scripts") — TEST_CONTRACT DSAR(§37) 하네스 자체가 저장소 전역 부재.

### 2.3 KEEP_SEPARATE (오흡수 금지 · 가짜녹색 회피)

Ground-Truth ② §4 전체: 마케팅 approval(`Alerting.php:571`~`:723` action_request·`Catalog.php:2383` approveQueue·`AdminGrowth.php:1040`~`:1069`)·모니터링(`ModelMonitor.php`·`AnomalyDetection.php`·`Decisioning.php`)·데이터 certification(`DataPlatform.php:281`·`GeniegoKnowledge.php:574`)·KYC(`ChannelContract.php:14`·`Dsar.php:335`)·대행사(`AgencyPortal.php:390`·`:20`·`:69`). 완료 조건 충족으로 오계산 금지 — 이들이 있다고 Campaign/Review/Snapshot/Simulation 완료로 표기하면 가짜녹색.

## 3. Canonical 설계 (21 Completion Condition 집약)

| # | 완료 조건(SPEC §38) | 시작점 판정 | 하위 DSAR | 근거(파일:라인) |
|---|---|---|---|---|
| 1 | Certification Registry 구축 | ABSENT | REGISTRY | 4소스 산재(`Db.php:951`·`UserAuth.php:54`·`TeamPermissions.php:393`·`routes.php:2800`), 통합 인덱스 grep 0 |
| 2 | Campaign Engine 구축 | ABSENT | API_SURFACE | Campaign 테이블 grep 0(② §2 #2) |
| 3 | Review Queue 구축 | ABSENT | API_SURFACE | 상태머신 grep 0(② §2 #3) |
| 4 | Reviewer Governance 구축 | **PARTIAL(근접)** | REVIEWER_GOVERNANCE | `effectiveForUser`(`TeamPermissions.php:393`)가 검토자 후보 판별의 근접 substrate |
| 5 | Delegation 구축 | **PARTIAL(권한위임 근접)** | REVIEWER_GOVERNANCE | `putMemberPermissions`(`TeamPermissions.php:641`) 상한 로직, D-5 참고(검토위임과 구별) |
| 6 | Attestation 구축 | ABSENT | TEST_CONTRACT | 전자서명+timestamp grep 0(② §2 #5) |
| 7 | Exception Management 구축 | ABSENT | (미분리) | compensating control grep 0(② §2 #6) |
| 8 | Remediation Workflow 구축 | **PARTIAL(수동 근접)** | (미분리) | `Keys.php:135`·`UserAdmin.php:338` 수동 revoke, 검토연동 자동 아님 |
| 9 | Auto Revocation 구축 | ABSENT | (미분리) | 검토거부→자동회수 연동 grep 0 |
| 10 | Analytics 구축 | ABSENT | PERFORMANCE_REQUIREMENTS | Certification Analytics grep 0(② §2 #9) |
| 11 | Snapshot 구축 | ABSENT | DATABASE_CONSTRAINT | 불변 스냅샷 grep 0(② §2 #10) |
| 12 | Evidence 구축 | ABSENT(패턴 참고) | DATABASE_CONSTRAINT | `SecurityAudit.php:56`·`:27` 참조 가능(흡수 아님) |
| 13 | Digest 구축 | ABSENT | DATABASE_CONSTRAINT | 권한 digest grep 0. SecurityAudit는 KEEP_SEPARATE 참조 |
| 14 | Drift 구축 | ABSENT | (미분리) | drift grep 0(② §2 #9, 접근인증용) |
| 15 | Revalidation 구축 | ABSENT | (미분리) | 재검증 grep 0 |
| 16 | Simulation 구축 | ABSENT | API_SURFACE | 권한 what-if grep 0(② §2 #9) |
| 17 | Runtime Guard 구축 | ABSENT | (미분리) | 미검토 배정 차단 guard grep 0(② §2 #11) |
| 18 | Static Lint 구축 | ABSENT | (미분리) | 인증우회 탐지 lint grep 0(② §2 #12) |
| 19 | Performance Benchmark 통과 | ABSENT | PERFORMANCE_REQUIREMENTS·INDEX_STRATEGY | 측정 대상 엔진 부재 + 인덱스 미구축 |
| 20 | Compliance Validation 통과 | ABSENT | DATABASE_CONSTRAINT | SOX/SOC2/ISO27001 등 매핑은 설계 참고뿐, 실 검증 대상 없음 |
| 21 | Regression Test 100% 통과 | ABSENT | TEST_CONTRACT | 저장소 전역 테스트 하네스 부재(CLAUDE.md) + Certification 테스트 자체 grep 0 |

**게이트 원칙**:
1. **PARTIAL 3종(#4·#5·#8)은 확장 완료(대체 아님)** — Reviewer Governance·Delegation·Remediation은 팀 권한위임(`TeamPermissions.php:393`·`:641`)·수동 revoke(`Keys.php:135`)를 접근검토 워크플로로 승격해야 완료된다.
2. **ABSENT 18종은 순신규 완료** — Registry/Campaign/Queue/Attestation/Exception/AutoRevoke/Analytics/Snapshot/Evidence/Digest/Drift/Reval/Simulation/Guard/Lint/Benchmark/Compliance/Regression은 그린필드 구축 후에만 완료.
3. **fail-closed 무후퇴** — Remediation(#8)·Auto Revocation(#9) 완료가 현행 수동 revoke·만료 강제(`index.php:518`)를 후퇴시키면 완료 불인정.
4. **가짜녹색 금지** — KEEP_SEPARATE 근접물(action_request/approveQueue/dataTrust/agency_client_link)을 완료로 오계산 금지.

## 4. Kernel/substrate 매핑 (SPEC §1~§30 ↔ 하위 DSAR)

- **API(§33)** → Campaign/Review/Evidence/Decision/Analytics/Simulation/상태조회 9 엔드포인트. DSAR_API_SURFACE.
- **Database Constraint(§34)** → Immutable Campaign Version/Decision·Tenant Isolation·Evidence/Snapshot Integrity. DSAR_DATABASE_CONSTRAINT.
- **Index(§35)** → Campaign/Reviewer/User/Role/Permission/Decision/Status/Due Date 8종. DSAR_INDEX_STRATEGY.
- **성능(§36)** → 5개 SLA, INDEX_STRATEGY와 상호의존. DSAR_PERFORMANCE_REQUIREMENTS.
- **테스트(§37)** → Unit/Integration/Performance/Security/Regression 5계층. DSAR_TEST_CONTRACT.
- **Registry(§1)·Reviewer Governance(§6·§7)** → 선행 완료 문서(DSAR_APPROVAL_CERTIFICATION_REGISTRY·REVIEWER_GOVERNANCE).
- **본 게이트(§38)** → 21조건 집약 정본.

## 5. 무후퇴 · Extend

- **PARTIAL 3종 확장 완료**: `effectiveForUser`(`TeamPermissions.php:393`)·`putMemberPermissions`(`:641`)·수동 revoke(`Keys.php:135`·`UserAdmin.php:338`)를 삭제 없이 접근검토 워크플로 substrate로 승격.
- **SecurityAudit 참조 승격(D-2)**: Evidence(#12)·Digest(#13) 완료는 `SecurityAudit.php:56`(verify)·`:27`(prev_hash)를 참조하되 개명·흡수하지 않는다.
- **만료/휴면 필드 승격**: `index.php:518`(expires)·`:522`(last_used)·`UserAuth.php:206`(세션 유휴)는 Dormant Review 자동선정 신호로 승격하되 필드 정의·쓰기 경로는 변경하지 않는다.
- **KEEP_SEPARATE 불흡수**: §2.3 근접물을 완료 조건 충족으로 오계산 금지(가짜녹색 회피, D-6).
- **부수 아키텍처 부채(ADR D-8)**: 휴면 계정 회수 부재·role 배정 표면 축소(`UserAdmin.php:598`)·menu_audit_log 이중 해시체인(`AdminMenu.php:123`)은 완료 게이트 통과 시 정합 대상(즉시 수정 아님·라이브 실결함 아님).

## 6. 완료 게이트 (본 Part의 최종 게이트 정본)

**Part 3-8(Certification & Access Review) 완료 = 아래 전부 충족 시에만 CERTIFIED 승격:**

1. **선행 인증**: Part 1~3-7(Auth Registry·Permission Engine·Role Registry·Hierarchy/Composite·Assignment·Scoped·Dynamic·Service·System·ERRE) 전부 실 구현·인증(BLOCKED_PREREQUISITE 해제) — Certification은 ERRE effective 결과를 검토 대상으로 소비하므로 ERRE 없이는 검토 대상이 파편화된다.
2. **21조건 구축**: SPEC §38 21조건 전부 실 코드(Registry/Campaign/Queue/Reviewer/Delegation/Attestation/Exception/Remediation/AutoRevoke/Analytics/Snapshot/Evidence/Digest/Drift/Reval/Simulation/Guard/Lint + Benchmark/Compliance/Regression).
3. **성능(§36)**: Campaign 생성 ≤3초·Review 조회 ≤200ms·Decision 저장 ≤100ms·Analytics 갱신 ≤5분·Reviewer Queue 생성 ≤30초(100만 배정) — INDEX_STRATEGY(§35) 선행 구축 필수.
4. **테스트(§37)**: Unit/Integration/Performance/Security/Regression 100% 통과 + fail-closed 회귀 0. 저장소 전역 테스트 하네스 도입 여부는 별도 판단(범위 확장 시 별도 승인).
5. **무후퇴 검증**: 기존 게이트(SecurityAudit·수동 revoke·expires/last_used·effectiveForUser) 병행·후퇴 0.
6. **배포 승인**: 운영/데모 동등 배포 + 사전 승인(MEMORY 배포 승인 규칙).

- **현재 상태**: 코드 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE**. 본 설계는 명세·거버넌스 계약만. 실 완료는 별도 승인 세션(RP-track).
- **다음 추천(SPEC §39)**: Part 3-9 Just-In-Time(JIT) Access Governance.

## 7. 반날조 인용 출처

본 문서가 인용한 `파일:라인`은 전부 SPEC §38 / ADR / Ground-Truth ①② 등장분이다. 테스트/lint 부재는 CLAUDE.md 명시.

- `backend/src/SecurityAudit.php` — `:8`(append-only) · `:12`(클래스) · `:27`(prev_hash) · `:56`(verify) · `:63`(hash_chain)
- `backend/src/Handlers/Keys.php` — `:135`(revoke) · `:155`(rotate)
- `backend/src/Handlers/UserAdmin.php` — `:338`(is_active) · `:342`(세션 revoke) · `:598`(role 표면 축소 주석)
- `backend/src/Handlers/UserAuth.php` — `:141`(결제만료 강등) · `:206`(세션 유휴)
- `backend/src/Handlers/TeamPermissions.php` — `:379` · `:393`(effectiveForUser) · `:517`(팀 status) · `:641`(putMemberPermissions)
- `backend/public/index.php` — `:506`(is_active) · `:518`(expires) · `:522`(last_used)
- `backend/src/Db.php:951`(api_key) · `backend/src/Handlers/UserAuth.php:54`(app_user) · `backend/src/routes.php:2800`(license_key)
- `backend/src/Handlers/AdminMenu.php:123`(menu_audit_log, 부수발견)
- **KEEP_SEPARATE(오흡수 금지)**: `Alerting.php:571`~`:723` · `Catalog.php:2383` · `AdminGrowth.php:1040`~`:1069` · `ModelMonitor.php` · `DataPlatform.php:281` · `Dsar.php:335` · `AgencyPortal.php:390`

---
**요약**: SPEC §38의 21 완료 조건 판정 = PARTIAL 3(Reviewer Governance/Delegation/Remediation 근접)·ABSENT 18. 본 문서가 Part 3-8 최종 게이트 정본. 완료 = 선행 Part 1~3-7 인증 + 21조건 구축 + 성능/테스트 통과 + 무후퇴 + 배포 승인. 현재 코드 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE. 다음=Part 3-9 JIT Access Governance.
