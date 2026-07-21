# DSAR — Role Certification & Access Review 거버넌스: 거버넌스 계층 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md`.
> 상위 ADR: `docs/architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md`.
> Ground-Truth ①: `docs/segmentation/DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md`.
> 본 문서는 반날조(anti-fabrication) 인용 정본 허용목록의 ②편이다 — (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) 이름만 유사한 근접물 KEEP_SEPARATE 판정.

---

## 0. 방법

- 대상: `backend/src/` + `backend/public/index.php` + `frontend/src/`. 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`·`legacy_v338_pkg/`.
- `certification|certify|recertif|attestation|access.review|review.queue|reviewer|escalat|SLA|reminder|remediation|revoke|drift|reconcil|simulation|snapshot` 다중 grep + 상태전이 substrate 정독(Explore 스레드 ②·24 tool-use). 라인 실측.

## 1. 핵심 판정 — **(A) 12 거버넌스 계층 전부 ABSENT (순신규 그린필드)**

코드 전체에서 role/access **인증(certification)** 의미의 히트는 **0건**이다. 유일 grep 히트 2건은 전혀 다른 도메인:
- `backend/src/Handlers/ChannelSync.php:3099`·`:3322` — `certificationTargetExcludeContent` = 네이버 **상품 데이터** 인증대상 필드.
- `frontend/src/data/manual_rich/google_ads.json:136` — Google **개발자 토큰** access review(외부 플랫폼 매뉴얼 텍스트).

방대한 `docs/segmentation/DSAR_APPROVAL_ROLE_*`·`docs/spec/EPIC_06A_*` 명세는 **명세일 뿐 대응 구현 코드가 없다** — 명세↔코드 괴리가 반날조 핵심 지점. 하위 per-entity DSAR은 이 괴리를 "부재"로 정직 판정해야 하며, 근접 substrate를 "이미 구현"으로 과장 금지.

## 2. 거버넌스 계층 실측표 (SPEC §7~§30 대조)

| SPEC 항목 | 판정 | 근거 (파일:라인) |
|---|---|---|
| #1 Certification Registry(§1) | **ABSENT** | grep 0(상품 인증 오탐 제외) |
| #2 Campaign Engine/Schedule(§3) | **ABSENT** | 마케팅 substrate만: `Handlers/AutoCampaign.php`·`admin_growth_campaign`(`AdminGrowth.php:1063`)·`CampaignManager.jsx` — 광고 캠페인(§4.B-1 KEEP_SEPARATE) |
| #3 Review Queue 상태머신(§9) | **ABSENT** | `ReviewQueue/InReview/Escalated/review_queue` grep 0. 근접 상태머신 `action_request`·`agency_client_link`는 §4.B-2·B-6 별도 도메인 |
| #4 Reviewer Governance/Delegation(§6·§7) | **ABSENT** | 권한위임 substrate만: `TeamPermissions.php:393`·`:613`·`:810`·`PM/Assignees.php:14`(reviewer role enum·PM) |
| #5 Attestation/Recertification(§12·§13) | **ABSENT** | 전자서명+timestamp attestation grep 0 |
| #6 Exception Management(§14) | **ABSENT** | compensating control/exception 만료 grep 0 |
| #7 Remediation/Auto Revocation(§15·§16) | **ABSENT(자동 없음)** | `revoke`는 전부 수동·타도메인: 쿠폰(`CouponAdmin.php:263`)·세션(`UserAuth.php:4284`)·API키(`UserAuth.php:4365`)·대행사(`AgencyPortal.php:390`). 검토연동 자동철회 없음 |
| #8 Review SLA/Reminder/Escalation(§17·§18·§19) | **ABSENT(접근검토용)** | 타도메인: `Dsar.php:54`·`:288`·`:384`(`SLA_DAYS=30` DSAR 규제기한)·`Reviews.php:174`·`:179`(`escalateNegatives` 부정 상품리뷰 Slack) |
| #9 Analytics/Risk/Drift/Reval/Reconcil/Simulation(§20·§21·§22·§23·§24·§25) | **ABSENT(접근인증용)** | 이질 도메인: `ModelMonitor.php:42`·`:221`·`:244`(ML drift)·`PgSettlement.php:295`·`Connectors.php:902`(결제/ROAS reconcil)·`PriceOpt.php:105`(`po_simulations` 가격)·`AutoCampaign.php:917`(`driftFromSeries` ROAS). access risk score = 0 |
| #10 Snapshot/Evidence/Digest(§26·§27·§28) | **ABSENT(인증 증적)** | 타도메인: `AdminMenu.php:120`·`:595`(메뉴설정 snapshot)·`Attribution.php:379`~`:462`(`evidence_json` 귀속근거)·`WmsCctv.php`(카메라 snapshot) |
| #11 Runtime Guard(미검토 배정 차단, §29) | **ABSENT** | 해당 guard 없음. `docs/.../*RUNTIME_GUARD*.md`는 명세문서 only |
| #12 Static Lint(인증우회 탐지, §30) | **ABSENT** | 해당 lint 없음. `docs/.../*STATIC_LINT.md`는 명세문서 only |

**요약: 12개 계층 전부 ABSENT.** 재사용 가능한 것은 "이질 도메인 substrate 패턴"(SLA 상수·drift 계산·evidence_json·snapshot 패턴)뿐이며 어느 것도 access certification 워크플로가 아니다.

## 3. 유일 재활용 실감사 substrate — SecurityAudit (PRESENT, 흡수 아님·참조 기반)

| 파일:라인 | 심볼 | 판정 |
|---|---|---|
| `backend/src/SecurityAudit.php:8` | (주석) log INSERT-only·UPDATE/DELETE 코드경로 없음 명시 | append-only |
| `backend/src/SecurityAudit.php:27` | `prev_hash` 참조 | 해시체인 |
| `backend/src/SecurityAudit.php:63` | `hash_chain` SHA-256 계산 | 해시체인 |
| `backend/src/SecurityAudit.php:56` | `verify()` 무결성 재계산 시작 | **유일 실 verify** |
| `backend/src/SecurityAudit.php:68` | verify 종단(broken_at) | 변조탐지 |
| `backend/src/Handlers/AdminGrowth.php:1429` | `'integrity'=>SecurityAudit::verify` 소비 | 실 소비처 |

> **경계**: SecurityAudit는 보안 감사 트레일이지 certification 워크플로가 아니다(상태머신·검토자·재인증 없음). Certification Evidence/Digest(§27·§28)의 **tamper-evident 저장 기반**으로 참조·확장만 하고 **개명·certification 엔진으로 흡수 금지**(가짜녹색 회피). `menu_audit_log`(`AdminMenu.php:123`·`:140`·`:18`·`:166`)는 `hash_chain` 컬럼은 있으나 통합 verify는 SecurityAudit::verify가 정본(`reference_menu_audit_log_not_tamper_evident` 정정 참조).

## 4. KEEP_SEPARATE — 흡수·개명 금지 근접물 (가짜녹색 최상위 위험)

### B-1. 마케팅/성장 campaign·approval
- `frontend/src/pages/CampaignManager.jsx`·`Handlers/AutoCampaign.php`·`admin_growth_campaign`(`AdminGrowth.php:1040`~`:1069`, status `pending_approval`) — **광고/성장 캠페인**. 접근권한 주기검토 아님(마케팅 발송 승인).
- `Handlers/Catalog.php:2383` `approveQueue()` + `catalog_writeback_job status='pending_approval'`(`Catalog.php:396`·`:858`·`:2312`~`:2392`; 라우트 `routes.php:99`) — **상품 채널 라이트백** human-in-loop 승인. 권한검토 아님.
- `Handlers/Reviews.php:174`·`:179` — **고객 상품리뷰** 부정리뷰 Slack 에스컬레이션. role review 아님.
- `frontend/src/pages/Approvals.jsx:557` — 실체는 아래 action_request 결재 UI.

### B-2. Alerting/Decisioning/Anomaly/ModelMonitor
- `action_request` 테이블(`Db.php:592`) + `Handlers/Alerting.php:571`~`:723`(`listActionRequests`/`decideAction`/`executeAction`, `approvals_json`, status pending→approved→executed; 라우트 `routes.php:432`~`:434`) — **마케팅 자동집행** 정족수 결재. 권한 인증 아님. ★상태전이가 review와 흡사하나 access review 아님.
- `Handlers/AnomalyDetection.php`·`Handlers/Decisioning.php`·`Handlers/ModelMonitor.php`(drift_score/retrain) — 성과·모델 모니터링. 접근검토 아님.

### B-3. 데이터 품질/신뢰 "certification"
- `backend/src/GeniegoKnowledge.php:574`(메뉴 `dataTrust`)·`Handlers/DataPlatform.php:281`(DataTrustDashboard)·`frontend/src/pages/DataAssets.jsx` — **데이터 신뢰도**. role/access 인증 아님.
- `docs/.../EPIC_03/04/05_FINAL_CERTIFICATION_PACKAGE.md`·`ADR_*_ENTERPRISE_CERTIFICATION.md`·semantic/ai-memory — **문서상 프로덕션 인증 패키지**(데이터·에픽 릴리즈 인증). 접근권한 인증 아님·대응 코드 없음.

### B-4. KYC/셀러/사업자 verification
- `Handlers/ChannelContract.php:14`(원산지/AS)·`Handlers/Catalog.php`·`ChannelCreds.php`·`ChannelSync.php`(사업자등록/product notification) — **상품·판매자 신원/규정 검증**. role certification 아님.
- `Handlers/Dsar.php:335` `verify()` — **DSAR 요청자 본인확인**. 접근검토 아님.
- `password_verify()` 다수(`UserAuth.php`) — 인증(authentication)이지 인증검토(certification) 아님.

### B-5. 수동 revoke·대행사 상태전이
- `CouponAdmin.php:263`·`UserAuth.php:4284`·`:4365`·`AgencyPortal.php:390` — 전부 수동 revoke(쿠폰/세션/키/대행사링크). 검토연동 자동 아님.
- `agency_client_link` pending→approved→revoked(`AgencyPortal.php:20`·`:69`) — 대행사-클라이언트 링크 승인. ★상태전이 흡사하나 **대행사 도메인**.

### B-6. 팀 권한 재클램프/effectiveForUser
- `Handlers/TeamPermissions.php:16`·`:393`(`effectiveForUser`)·`:613`·`:810`(`reclampTeamMembers`) — 팀 권한 상한 **즉시 재계산/재클램프**(RBAC/ABAC, `acl_permission`/`data_scope`). **주기적 접근검토 campaign이 아님.** Certification의 검토 대상 데이터소스로만 참조.

### B-7. 순수 오탐 (재플래그 금지)
- `PM/Assignees.php:14`(reviewer=PM 태스크 역할)·`ChannelSync.php:2651`(상품리뷰 작성자)·`ChannelSync.php:3099`·`:3322`(상품 인증필드)·`EnterpriseAuth.php:597`(SAML 인증서)·`google_ads.json:136`(외부 매뉴얼)·`review_collect_cron.php`(상품리뷰 수집).

## 5. 종합

**Certification/Access-Review 거버넌스 = 순신규 그린필드(12 계층 ABSENT).** 코드에 상태머신(Pending/InReview/Escalated/Approved/Revoked)·검토자 배정·재인증·전자서명 attestation·미검토배정 차단 guard·인증우회 static lint 중 **어느 것도 없다**. 재활용 실 substrate는 (1) `SecurityAudit` 해시체인+verify(Evidence/Digest tamper-evident 기반, 흡수 금지) (2) `TeamPermissions` RBAC/ABAC(검토 대상 데이터소스) (3) 형태만 유사한 패턴(Dsar SLA·Attribution evidence_json·AdminMenu snapshot·AutoCampaign driftFromSeries — 전부 이질 도메인). 가짜녹색 최상위 위험 = `action_request` 결재·`catalog_writeback approveQueue`·`agency_client_link` 상태전이(이름·상태만 흡사, 전부 마케팅·상품·대행사 도메인).
