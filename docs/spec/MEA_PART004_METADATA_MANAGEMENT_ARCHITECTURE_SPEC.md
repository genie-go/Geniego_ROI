# MEA Part 004 — Enterprise Metadata Management Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001~003**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Part 001의 Metadata Framework/DATA_METADATA/표준필드(tenant_id/created_at 등)/DATA_DOMAIN·헌법 6볼륨·`DATA_ARCHITECTURE.md`를 준수·인용한다(Part 001이 Enterprise Metadata Registry를 ABSENT 목표로 스코핑 → 본 Part가 상세). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
플랫폼 전체에서 생성·수집·관리되는 모든 메타데이터(데이터·API·AI 모델·이벤트·정책·리소스)의 표준·중앙 관리 체계. Metadata First 원칙.

## §2 구현 범위
Enterprise Metadata Repository · Business/Technical/Operational/AI/API/Event Metadata · Metadata Versioning · Metadata Search · Metadata Governance.

## §3 구현 목표 (10)
Enterprise Metadata Repository · Metadata Registry · Metadata Version Manager · Metadata Validation Engine · Metadata Search Engine · Metadata Approval Workflow · Metadata Audit Manager · Metadata Synchronization Service · Metadata API Gateway · Metadata Dashboard.

## §4 아키텍처 원칙 (10)
Metadata First · Canonical Definition · Version Controlled · Discoverable · Searchable · Reusable · Traceable · AI Ready · API Driven · Enterprise Standard.

## §5 Canonical Entity (15)
METADATA · METADATA_{SCHEMA·ATTRIBUTE·VERSION·OWNER·POLICY·TAG·CATEGORY·RELATION·CHANGE_LOG·APPROVAL·SOURCE·STATUS·LINEAGE·AUDIT}. → 상세 = `MEA_PART004_CANONICAL_ENTITIES.md`.

## §6 Metadata 분류 (10)
Business · Technical · Operational · Security · AI · Data · API · Event · Integration · Governance Metadata. → ★Part 001 DATA_DOMAIN 정합.

## §7 Metadata 표준 (필수 필드)
Identifier · Name · Description · Version · Owner · Domain · Category · Status · Classification · Tags · Created At · Updated At. → ★Part 001 표준필드 상속(tenant_id/created_at/updated_at/status 관례·Version/Owner=Part 001 미정착 표준).

## §8 Metadata Repository
등록·조회·수정·승인·폐기·검색·버전 비교·이력 조회. → ★현행 비형식 카탈로그=**33개 DSAR canonical entity 문서**(authz/데이터 canonical 정의)+**20개 docs/registry**(API/Architecture/Component/Database/Decision 레지스트리)+`DATA_ARCHITECTURE.md`. 형식 Repository Manager=ABSENT.

## §9 Version 관리
Major/Minor/Patch · 이전 Version 삭제 금지. → ★현행=git(변경 이력)·API 버전(`/v{NNN}`). 형식 Metadata Version Manager=ABSENT.

## §10 Search
Name/Domain/Owner/Tag/Category/Entity/API/Event/AI Model · Full Text Search. → **ABSENT**(전용 메타데이터 검색엔진 부재·현행=grep/문서 탐색).

## §11 Governance
승인 없는 등록 금지 · 중복 Metadata 금지 · Owner 지정 필수 · 변경 이력 보존 · 자동 Audit. → ★★실 substrate — 승인=`CHANGE_GATE`+PM 승인·**중복 금지=pre-commit 중복금지 게이트**([[feedback_no_duplicate_features]])·이력=`SecurityAudit`·감사=`SecurityAudit::verify`. Owner 지정=Part 001 Ownership(ABSENT·신설).

## §12 Data Security
Role 기반 접근 · Attribute Masking · Audit Logging · Version Protection · Tenant Isolation · Encryption. → ★Part 001~003 상속: RBAC=`index.php`·Masking=ChannelCreds·Audit=`SecurityAudit`·Tenant=`Db.php`·Encryption=`Crypto`. Version Protection=git+pre-commit G2 sacred SHA.

## §13 Runtime 규칙
Metadata 검증 후 실행 · Version 호환성 확인 · Owner 확인 · Policy 검증 · Audit 기록. → ★Policy 검증=`index.php` RBAC/writeGuard·Audit=`SecurityAudit`. Metadata/Version/Owner 검증=순신설(형식 레지스트리 후).

## §14 API 표준 (8)
Register/Update/Search/Approve/Archive/Validate/Export Metadata · Compare Versions. → ABSENT(형식 Metadata API·Compare=git diff seed). Part 001 API 표준 상속·admin 게이트.

## §15 Event 표준 (8)
MetadataRegistered · MetadataUpdated · MetadataApproved · MetadataRejected · MetadataArchived · MetadataValidated · MetadataVersionCreated · MetadataSynchronized. → ABSENT(event-driven 부재·Part 001~003 §15 정합).

## §16 AI Integration
Metadata 자동 생성 · 설명 자동 작성 · Tag 추천 · 중복 Metadata 탐지 · Schema 추천 · 영향도 분석 **만**·승인 없이 변경 불가. → ★중복 탐지=pre-commit 중복금지 게이트 seed·품질/lineage=`DataPlatform`. 자동생성/Tag/Schema 추천=순신설(헌법 V3·승인 후). 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Metadata 조회 ≤200ms · 검색 ≤500ms · 등록 ≤1초 · Version 비교 ≤1초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
Enterprise Metadata Repository·Registry·Version 관리·Search Engine·Governance·Security·Runtime·API/Event·AI·표준 수립. → **현재 미충족**(형식 Repository/Registry/Search Engine/Version Manager ABSENT·코드 0).

## 판정
**PARTIAL-informal(★33 DSAR canonical+20 registry=메타데이터 카탈로그·CHANGE_GATE+중복금지 게이트=거버넌스·git 버전·SecurityAudit 감사·DataPlatform lineage·RBAC/tenant/Crypto 보안) / ABSENT-formal(Enterprise Metadata Repository·Registry·Version Manager·Validation/Search Engine·Approval/Sync/API/Dashboard).** ★핵심=메타데이터 카탈로그·거버넌스(승인/중복금지)·감사는 비형식으로 실재(★이 문서 시리즈 자체가 메타데이터)·형식 통합 Metadata Platform만 신설. Part 001 Metadata Framework 재정의 금지·마케팅 AI KEEP_SEPARATE. 코드 변경 0.

## 다음
MEA Part 005 — Enterprise Master Data Management(MDM) Architecture(본 Metadata 상속·확장).
