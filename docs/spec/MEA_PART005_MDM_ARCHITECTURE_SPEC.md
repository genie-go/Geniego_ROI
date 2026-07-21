# MEA Part 005 — Enterprise Master Data Management (MDM) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001~004**를 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Part 001 DATA_DOMAIN/표준필드/헌법 6볼륨·Part 004 Metadata(카탈로그/버전/거버넌스)를 준수·인용한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
플랫폼 전반 핵심 기준 데이터(Master Data)를 단일 기준으로 생성·관리·배포. 모든 시스템이 동일 기준 데이터 참조·데이터 중복/불일치 제거. → ★"중복 제거·SSOT"는 기존 [[feedback_no_duplicate_features]]·[[project_n231_dedup_ssot]] 정합.

## §2 구현 범위
Master Data Repository · Golden Record · Entity Resolution · Master Data Governance · Reference Data · Data Synchronization · Survivorship Rule · Match & Merge Engine · Master Data Distribution · Version Management.

## §3 구현 목표 (10)
Master Data Repository · Golden Record Manager · Match/Merge/Survivorship Engine · Reference Data Manager · Synchronization Service · Approval Workflow · Distribution Service · Master Data Dashboard.

## §4 아키텍처 원칙 (10)
Single Source of Truth · Golden Record First · Canonical Entity · Metadata Driven · Event Driven · Version Controlled · Audit by Default · Global Consistency · AI Assisted · Enterprise Standard.

## §5 Canonical Entity (15)
MASTER_ENTITY · GOLDEN_RECORD · MASTER_ATTRIBUTE · REFERENCE_DATA · MATCH_RULE · MERGE_RULE · SURVIVORSHIP_RULE · MASTER_{VERSION·OWNER·CHANGE_LOG·APPROVAL·SYNC_JOB·DISTRIBUTION·STATUS·AUDIT}. → 상세 = `MEA_PART005_CANONICAL_ENTITIES.md`.

## §6 Master Data Domain (15)
Organization · User · Role · Customer · Supplier · Partner · Product · Service · Warehouse · Vehicle · Employee · Currency · Country · Language · Tax Code. → ★Part 001 DATA_DOMAIN 상속·실 핸들러 매핑(GT①: User=`UserAuth`·Role=`index.php` RBAC·Customer=`CRM`·Supplier=`SupplyChain`·Partner=`PartnerPortal`·Product=`Catalog`·Warehouse=`Wms`).

## §7 Golden Record 정책
Entity당 하나의 기준 레코드 · 변경 이력 보존 · Source System 추적 · Version 관리 · 승인 기반 변경. → ★현행 seed=UNIQUE 제약(중복 방지)+`SecurityAudit`(이력)+`CHANGE_GATE`(승인). 형식 Golden Record Manager=ABSENT.

## §8 Match & Merge 정책
Exact/Rule Based/Fuzzy/AI Assisted Match · Merge 시 중복 제거·속성 충돌 해결·Source Priority·Survivorship. → ★★실 seed — `Attribution.php:133,176`(`attribution_identity_link`·tenant/identity_hash/session·**confidence 스코어**=확률적 Entity Resolution/Match)·`CRM`(identity360 고객 매칭)·`Wms`(consolidateOrphanStock=merge)·중복금지 pre-commit 게이트. 형식 Match/Merge Engine=ABSENT.

## §9 Survivorship Rule
우선순위: 승인 데이터 > 신뢰도 높은 시스템 > 최신 데이터 > 품질 점수 > 관리자 최종 승인. → ★현행 매핑: 승인=`CHANGE_GATE`·신뢰도=DataTrust/confidence(`Attribution`/`DataPlatform`)·최신=`updated_at`·품질=DataTrust Score·관리자 승인=admin 게이트. 형식 Survivorship Engine=ABSENT.

## §10 Reference Data (10)
국가/통화/언어 코드 · 배송/주문/결제 상태 · 권한/조직/산업/KPI 코드. Version 유지. → ★현행 seed=currency/country/status enum(산재·`OrderHub`/`Pnl`/`ChannelSync`)·`backend/data/st11_notice_types.json`·채널 레지스트리. 형식 Reference Data Manager=ABSENT.

## §11 Data Synchronization
Event/API/Batch/CDC 기반 · 모든 동기화=Audit. → ★현행=API/Batch(커넥터 `ChannelSync`)·**Event/CDC=ABSENT**·Audit=`SecurityAudit`.

## §12 Data Security
Tenant Isolation · Encryption · Role Based Access · Approval Workflow · Audit Logging · Version Protection. → ★Part 001~004 상속: Tenant=`Db.php`·Encryption=`Crypto`·RBAC=`index.php`·Approval=`CHANGE_GATE`·Audit=`SecurityAudit`·Version Protection=G2 sacred SHA.

## §13 Runtime 규칙
Golden Record 우선 · 중복 생성 금지 · 승인 없는 변경 금지 · Version 검증 · Synchronization 검증. → ★중복 생성 금지=UNIQUE 제약+중복금지 게이트([[feedback_no_duplicate_features]])·승인=`CHANGE_GATE`. Golden Record 우선/Version/Sync 검증=순신설.

## §14 API 표준 (8)
Create/Update/Search Master Data · Match/Merge Entity · Get Golden Record · Synchronize/Validate Master Data. → ★Match Entity=`Attribution` identity_link resolve seed·나머지 ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
MasterCreated · MasterUpdated · MasterMerged · GoldenRecordUpdated · SynchronizationCompleted · ReferenceDataUpdated · MasterApproved · MasterArchived. → ABSENT(event-driven 부재·Part 001~004 §15 정합).

## §16 AI Integration
중복 Entity 탐지 · Match Score 계산 · Merge 추천 · 데이터 품질 평가 · Reference Data 추천 · 이상 변경 탐지 **만**·Golden Record 직접 변경 불가. → ★Match Score=`Attribution`(confidence) seed·품질=`DataPlatform`(DataTrust)·이상=`AnomalyDetection`·직접변경 불가=헌법 V3. Merge/Reference 추천=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Master 조회 ≤200ms · Match ≤1초 · Merge ≤2초 · Sync ≤5초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
Master Data Repository·Golden Record·Match&Merge·Survivorship·Reference Data·Sync·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 MDM Repository/Golden Record/Match-Merge/Survivorship Engine ABSENT·코드 0).

## 판정
**PARTIAL(★Entity Resolution/Match=Attribution identity_link(confidence)·CRM identity360·dedup/SSOT=231차/UNIQUE/중복금지 게이트·Master 도메인 실 핸들러·Reference enum·Sync 커넥터·감사) / ABSENT-formal(형식 MDM Repository·Golden Record Manager·Match/Merge/Survivorship Engine·Reference Data Manager·Distribution).** ★핵심=아이덴티티 해석(confidence 스코어)·중복 제거(SSOT·231차)는 실 seed이나 형식 Golden Record/Match-Merge/Survivorship 엔진은 부재. Part 001~004 상속(재정의 금지)·마케팅 AI KEEP_SEPARATE·AI Golden Record 직접변경 불가(헌법 V3). 코드 변경 0.

## 다음
MEA Part 006 — Enterprise Data Quality Management Architecture(본 MDM 상속·확장).
