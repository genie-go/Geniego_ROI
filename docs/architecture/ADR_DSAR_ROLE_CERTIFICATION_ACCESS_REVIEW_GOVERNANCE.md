# ADR — Role Certification & Access Review Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-8
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md`
- **Ground-Truth**: `docs/segmentation/DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md`(①) · `docs/segmentation/DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1(Auth Registry)·2(Permission Engine)·3-1(Role Registry)·3-2(Hierarchy/Composite)·3-3(Assignment)·3-4(Scoped)·3-5(Dynamic/ABAC)·3-6(Service/System)·**3-7(ERRE)**

---

## 1. Context

GeniegoROI Authorization은 세 rank 체계(plan·api_key·team_role)가 직교 병렬로 산재하며(Part 3-7 ADR §1), 배정(assignment)이 **한 번 부여된 후 주기적으로 "여전히 유효한가"를 재확인하는 접근권한 검토(Access Review) 루프가 전혀 없다.** api_key는 만료(`index.php:518`)·비활성(`Keys.php:135`)으로만, 계정은 결제 만료(`UserAuth.php:141`)·수동 비활성(`UserAdmin.php:338`)으로만 회수되며, **누가·언제·왜 이 배정을 승인/유지/철회했는지**를 검토자(reviewer)가 증거 기반으로 결정하는 워크플로는 부재하다.

본 ADR은 SOX/ISO27001/SOC2/HIPAA/PCI DSS/NIST 800-53/COBIT 감사요구를 만족하는 **지속적 인증(Certification) 및 접근권한 검토(Access Review) 거버넌스**의 기반을 정의한다. 이는 Part 3-7 ERRE가 산출한 effective 권한을 **주기적으로 재검증(recertify)하고, 미검토·거부 배정을 자동 회수(remediate)** 하는 상위 통제 계층이다.

## 2. Ground-Truth 판정 (전수조사 기반·2 스레드 상호검증)

### 2.1 실존 substrate (Ground-Truth ①)
- **감사/증거**: `SecurityAudit`(`SecurityAudit.php:12`·`verify()` `:56`) = **유일 실 append-only 해시체인**. `menu_audit_log`(`AdminMenu.php:123`, hash_chain 컬럼)·`auth_audit_log`(`UserAuth.php:4165`, 평문)·`Compliance.php:133`(UNION 뷰).
- **회수(수동)**: `Keys.php:135` revoke·`Keys.php:155` rotate·`UserAdmin.php:338`+`:342`(비활성+세션 revoke)·`UserAuth.php:141`(결제만료 자동 강등)·`TeamPermissions.php:517`(팀 status).
- **만료/휴면 소재**: `index.php:518`(expires 강제)·`:522`(last_used)·`UserAdmin.php:117`(last_login)·`UserAuth.php:206`(세션 유휴)·`AgencyPortal.php:60`·`PartnerPortal.php:57`.
- **위임(권한)**: `TeamPermissions.php:641`(putMemberPermissions)·`:393`(effectiveForUser).
- **배정 상태 스키마**: api_key(`Db.php:951`)·app_user(`UserAuth.php:54`)·user_session(`UserAuth.php:4263`)·license_key(`routes.php:2800`).

### 2.2 거버넌스 계층 (Ground-Truth ②) — **12 계층 전부 ABSENT**
Registry·Campaign/Schedule·Review Queue 상태머신·Reviewer Governance/Delegation·Attestation/Recertification·Exception·Remediation/Auto-Revocation·SLA/Reminder/Escalation·Analytics/Risk/Drift/Reval/Reconcil/Simulation·Snapshot/Evidence/Digest·Runtime Guard·Static Lint = **grep 0**. 유일 히트 2건(`ChannelSync.php:3099`·`google_ads.json:136`)은 상품/외부매뉴얼 도메인.

### 2.3 종합
**Certification & Access Review 판정 = ABSENT-engine / PARTIAL-substrate.** ERRE(Part 3-7, PARTIAL-substrate)보다도 얇은 그린필드 — effective 계산의 substrate(`effectiveForUser`)는 있으나, 그것을 **주기적으로 검토·재인증하는 상위 통제 루프**는 개념 자체가 순신규다. 재활용 실 substrate는 SecurityAudit(증거)·수동 revoke(remediation 근접)·expires/last_used(dormant 판정 소재)뿐.

## 3. Decision

### D-1. Certification은 기존 substrate를 **대체가 아닌 상위 통제로 감싼다(Extend·Wrap)**
`effectiveForUser`(ERRE Effective Calculator)·수동 `revoke`(`Keys.php:135`·`UserAdmin.php:338`)·expires/last_used를 **파괴하지 않고**, Review Queue의 (a) 검토 대상 데이터소스·(b) Remediation 실행 액션·(c) Dormant/Expiring 자동선정 신호로 재활용한다. Certification은 이들 위에 얹히는 주기적 검토·증거·재인증 루프다. (Golden Rule: Replace가 아니라 Extend)

### D-2. SecurityAudit 해시체인을 Evidence/Digest tamper-evident 기반으로 참조 (흡수 아님)
Certification Decision/Attestation/Snapshot은 `SecurityAudit::log`로 **append-only 기록**하고 `verify()`로 무결성 검증한다. 단 SecurityAudit를 개명·certification 엔진으로 흡수 금지 — 별개 보안감사 트레일로 존치하고 **참조/확장만**(가짜녹색 회피, `reference_menu_audit_log_not_tamper_evident` 준수). Certification 전용 상태(campaign/review/decision)는 신규 스키마.

### D-3. Review Queue 상태머신·Decision 계약 (§9·§10 SPEC)
Pending→In Review→Waiting Evidence→(Escalated)→{Approved|Revoked}→Closed. Decision = Approve/Reject/Revoke/Reduce Scope/Reduce Permission/Escalate/Request Evidence/Request Revalidation. **미검토(Pending 초과 SLA)·거부·attestation 부재·risk 임계 초과 → Auto Revocation(§16)이 Remediation(§15)을 통해 기존 revoke 액션 호출.**

### D-4. Attestation·Evidence·불변성 (§12·§27·§34)
모든 Decision은 (a) Evidence(assignment/login/access history·justification·policy evaluation)와 (b) 전자서명+timestamp Attestation을 요구한다. Immutable Decision·Immutable Campaign Version·Tenant Isolation·Evidence/Snapshot Integrity를 DB 제약으로 강제. Evidence 없는 Approve 금지(Runtime Guard §29 `Missing Evidence`·`Unauthorized Decision` 차단).

### D-5. Reviewer Delegation은 원 권한 상한을 넘지 못한다 (§7 SPEC)
검토 위임은 원 Reviewer보다 높은 권한을 생성하지 못한다 — 현행 위임 상한 로직(`putMemberPermissions` `:641` assignable 교집합·403 초과차단)과 **동형 fail-closed 규칙**을 Reviewer Delegation에 적용. 단 "권한 위임(TeamPermissions)"과 "검토 위임(reviewer)"은 개념 분리(Ground-Truth ② B-6).

### D-6. KEEP_SEPARATE — 마케팅/승인/데이터/KYC 도메인 오흡수 금지
Ground-Truth ② §4의 근접물은 이름·상태전이만 유사하고 **접근권한 인증이 아니다**. Certification에 흡수·개명·통합 금지(가짜녹색 회피):
- **마케팅 approval**: `action_request`(`Alerting.php:571`~`:723`·`Db.php:592`)·`catalog_writeback approveQueue`(`Catalog.php:2383`)·`admin_growth_campaign`(`AdminGrowth.php:1063`)·`AutoCampaign.php`·`Reviews.php:174`(상품리뷰).
- **모니터링**: `ModelMonitor.php`·`AnomalyDetection.php`·`Decisioning.php`(성과/ML drift).
- **데이터 certification**: `DataPlatform.php:281`·`GeniegoKnowledge.php:574` dataTrust·`EPIC_03/04/05_FINAL_CERTIFICATION_PACKAGE.md`.
- **KYC/verify**: `ChannelContract.php:14`·`Dsar.php:335`(본인확인)·`password_verify`.
- **대행사 상태전이**: `agency_client_link` pending→approved→revoked(`AgencyPortal.php:20`·`:69`).
- **패턴 재사용은 형태만**: `Dsar.php:54`(SLA_DAYS)·`Attribution.php:379`(evidence_json)·`AutoCampaign.php:917`(driftFromSeries) — 도메인 이질, 흡수 금지.

### D-7. 정직 분리 (실재 과신·부재 과장 양방향 회피)
- **실재 과신 회피**: 수동 `revoke`는 Remediation "액션"이지 검토연동 "자동 회수"가 아님. SecurityAudit는 감사 트레일이지 certification 워크플로가 아님. `effectiveForUser`는 즉시 권한산정이지 주기적 검토 campaign이 아님. "이미 있다"로 오판 금지.
- **부재 과장 회피**: Campaign/Review Queue/Attestation/Drift grep 0은 실측 부재지 "숨겨진 구현"이 아님. `docs/segmentation/DSAR_APPROVAL_ROLE_*` 방대한 명세는 미구현 설계문서 — 명세↔코드 괴리를 "구현"으로 착시 금지.
- 이번 세션 P1~P5 보안수정(writeGuard 서버강제·admin SSOT·plan fail-secure·세션토큰 hash-only)은 Certification의 검토 대상 substrate·Remediation 실행 기반으로 재활용(재플래그 금지).

### D-8. 부수 발견 (설계 코드 0 · 수정 아님 · 후속 fix 후보)
- **휴면 계정 회수 부재(아키텍처 부채)**: last_login/last_seen 필드는 있으나(`UserAdmin.php:117`·`UserAuth.php:206`) N일 미로그인 계정을 스캔→검토→회수하는 크론·쿼리 부재. 만료 차단은 api_key expires(`index.php:518`)만. Certification Dormant Review(§8)가 실 완화책. (라이브 실결함 아님 — 안전측 미회수는 접근 유지일 뿐 상승 아님.)
- **역할 배정 표면 축소**: `UserAdmin.php:598` 주석 — `assignRole/revokeRole/getUserRoles` 제거·재신설 금지. Certification이 검토할 명시적 role-assignment 표면이 얇음(현행 role은 team_role/api_key role/plan에 내장). Review Scope(§4)는 이 3소스를 통합 조회해야 함.
- **menu_audit_log 이중 해시체인**: `AdminMenu.php:123` hash_chain 컬럼이 SecurityAudit와 별개 존재 — 통합 verify는 SecurityAudit::verify 정본. Certification Evidence는 SecurityAudit로 단일화 권장(SSOT).
- (모두 라이브 실결함 아닌 아키텍처 부채. 즉시 수정 대상 아님. 별도 판단.)

## 4. Consequences

- **긍정**: 주기적·증거기반·설명가능·감사가능 접근권한 통제. 컴플라이언스(SOX/SOC2/ISO27001) access-review 요구 충족. 휴면/과다 권한 자동 수렴(최소권한 유지).
- **비용**: 대규모 신규(Registry/Campaign/Schedule/Queue/Reviewer/Decision/Attestation/Exception/Remediation/Auto-Revoke/Analytics/Drift/Reval/Reconcil/Simulation/Snapshot/Evidence/Digest/Guard/Lint). 성능 요구(Reviewer Queue ≤30초/100만 배정·Review 조회 ≤200ms)는 인덱스+비동기 큐 필수.
- **선행 의존**: Part 1~3-7 인증 후 실 구현(BLOCKED_PREREQUISITE) — Certification은 ERRE effective 결과를 검토 대상으로 소비하므로 ERRE 없이는 검토 대상이 파편화됨. 본 설계는 명세·거버넌스 계약만.
- **무후퇴**: 기존 회수(수동 revoke·결제만료 강등·세션 유휴)·감사(SecurityAudit)는 Certification 완성까지 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. 실 엔진은 별도 승인 세션(RP-track)에서 Golden Rule+verify+배포승인 하에 구현.
- 하위 per-entity DSAR(`DSAR_APPROVAL_CERTIFICATION_*`)은 본 ADR + Ground-Truth ①② 등장 `파일:라인`만 인용(반날조 허용목록).
- Completion Gate(§38)·Performance Benchmark(§36)·Regression 100%(§37)는 실 구현 세션의 완료 조건.

---
**요약**: Certification & Access Review = ABSENT-engine(12 거버넌스 계층 grep 0·순신규) / PARTIAL-substrate(SecurityAudit 해시체인·수동 revoke·expires/last_used·effectiveForUser). Extend-Wrap: 기존 substrate를 검토 대상·Remediation 액션·Evidence 기반으로 감싸는 주기적 통제 루프. Review Queue 상태머신·Attestation 불변·Reviewer Delegation 상한·Auto-Revocation·KEEP_SEPARATE(action_request/approveQueue/agency_link/dataTrust/KYC). 코드 0·NOT_CERTIFIED·선행의존(Part 1~3-7).
