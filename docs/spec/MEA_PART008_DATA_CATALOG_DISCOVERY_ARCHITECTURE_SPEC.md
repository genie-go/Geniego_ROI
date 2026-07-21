# MEA Part 008 — Enterprise Data Catalog & Discovery Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001~007**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Part 004 Metadata·Part 007 Provenance/Data Source·Part 006 DataTrust Quality·Part 003 EDW(Business Glossary/Semantic Layer는 Part 003서 ABSENT로 스코핑 → 본 Part 상세)·데이터 헌법 6볼륨을 준수·인용한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
플랫폼 전반 데이터 자산(Data Asset)을 중앙에서 등록·검색·분류·평가·공유. Data Lake/Warehouse/API/Feature Store/Dashboard/KPI/Event/Master Data/Metadata를 통합하는 Enterprise Data Discovery Hub.

## §2 구현 범위
Enterprise Data Catalog · Data Asset Registry · Business Glossary · Data Discovery · Smart Search · Tag Management · Dataset Certification · Dataset Recommendation · Usage Analytics · Enterprise Data Portal.

## §3 구현 목표 (10)
Enterprise Data Catalog · Data Asset Registry · Business Glossary Manager · Search Engine · Tag Management Service · Dataset Certification Manager · Recommendation Engine · Usage Analytics Engine · Data Portal · AI Discovery Engine.

## §4 아키텍처 원칙 (10)
Discoverability First · Metadata Driven · Business Friendly · Self-Service Analytics · Canonical Definition · AI Assisted Discovery · Data Democratization · Secure by Design · Enterprise Standard · Continuous Synchronization.

## §5 Canonical Entity (15)
DATA_ASSET · DATASET · DATA_CATALOG · BUSINESS_GLOSSARY · BUSINESS_TERM · DATA_TAG · DATA_LABEL · DATA_CERTIFICATION · DATA_OWNER · DATA_STEWARD · DATA_RATING · DATA_USAGE · SEARCH_INDEX · DISCOVERY_PROFILE · DATA_COLLECTION. → 상세 = `MEA_PART008_CANONICAL_ENTITIES.md`.

## §6 관리 대상 (14)
Database · Table · View · Dataset · API · Event · Dashboard · KPI · AI Model · Feature Store · Master Data · Metadata · Report · External Data Source. → ★현행=DB/Table(`Db.php`)·API(routes)·KPI(`Rollup`·Part 003)·Master Data(Part 005)·Metadata(Part 004)·External Source(`DataPlatform` data_source·Part 007). Feature Store=Part 002 미래.

## §7 Business Glossary
Business Term · Definition · Related KPI/Dataset/API/Event · Owner · Approval Status · Version · Domain. **동일 Business Term 중복 등록 불가.** → ★현행 seed=28+ DSAR canonical(용어/canonical 정의)+docs/registry·중복 금지=중복금지 게이트(Part 004/005·[[feedback_no_duplicate_features]]). 형식 Business Glossary Manager=ABSENT(Part 003 Semantic Layer 정합).

## §8 Dataset Certification (5등급)
Certified · Verified · Standard · Experimental · Deprecated. **Certified Dataset만 KPI/ROI Engine 기본 사용.** → ★★현행 정합: NOT_CERTIFIED 라벨(Part 3-36)·`docs/IMPLEMENTATION_STATUS.md`(구현 이력 정본)·★"Certified만 KPI 사용"=**헌법 V3 Trust First(신뢰도 미달=AI/자동화 제외·READY만 사용)**(Part 006). 형식 Certification Manager=ABSENT.

## §9 Search & Discovery (10)
Full Text/Semantic/Tag/Domain/Owner/Business Term/AI Recommendation/Similar Dataset/Related KPI/API Search. → ★현행=grep/문서 탐색·NL search seed=`ClaudeAI`(챗봇 지식·[[reference_chatbot_knowledge_pipeline]]). 형식 Full-Text/Semantic Search Engine=ABSENT.

## §10 Data Collection (6)
개인/조직/프로젝트/공유/읽기전용 Collection · 즐겨찾기. → **ABSENT**(형식 Collection 부재·신설).

## §11 Usage Analytics (10)
조회/다운로드/API호출/사용자/즐겨찾기/검색빈도/KPI참조/AI사용/최근변경/품질점수. → ★품질점수=`DataPlatform`(DataTrust·Part 006)·API호출=`api_key.use_count`(passive)·최근변경=`updated_at`/`SecurityAudit`. 형식 Usage Analytics Engine=ABSENT.

## §12 Data Security
Tenant Isolation · RBAC · Metadata Masking · Audit Logging · Dataset Permission · Classification 기반 접근. **권한 없으면 Metadata 수준만 조회.** → ★Part 001~007 상속: Tenant=`Db.php`·RBAC=`index.php`(role/scope)·Masking=`ChannelCreds`·Audit=`SecurityAudit`·Classification=Part 001(ABSENT·신설). Metadata-only 접근 패턴=순신설.

## §13 Runtime 규칙
신규 자산 자동 등록 · Metadata 자동 동기화 · 검색 인덱스 자동 갱신 · Certification 검증 · 사용 이력 기록 · Audit 기록. → ★Certification 검증=Trust First(READY만·Part 006)·Audit=`SecurityAudit`. 자동 등록/동기화/인덱스 갱신=순신설.

## §14 API 표준 (8)
Register Data Asset · Search Catalog · Get Dataset · Update Business Glossary · Certify Dataset · Get Related Assets · Create Collection · Query Usage Analytics. → ★Register/Get Asset=`DataPlatform`(DataAssets) seed·나머지 ABSENT. Part 001 API 표준 상속·RBAC 게이트.

## §15 Event 표준 (8)
DataAssetRegistered · DatasetCertified · BusinessTermCreated · SearchExecuted · CollectionCreated · AssetUpdated · CatalogSynchronized · UsageAnalyticsUpdated. → ABSENT(event-driven 부재·Part 001~007 §15 정합).

## §16 AI Integration
Dataset/유사데이터셋/품질기반/API·Event 연관 추천 · Business Term 자동생성 · 검색 의도 분석 · 자동 Tag · 자산 분류 · KPI 연관성 · **NL Search** **만**·공식 Metadata 직접 변경 불가(승인 절차). → ★NL Search=`ClaudeAI`(챗봇) seed·품질기반 추천=`DataPlatform`(DataTrust)·자산 분류=Part 006 DQ. 직접 변경 불가=헌법 V3/Part 004 승인. 추천/Tag 생성=순신설. 마케팅 AI(ClaudeAI)는 챗봇/NL search 재사용하되 거버넌스 AI와 KEEP_SEPARATE.

## §17 성능 요구사항
검색 ≤300ms · Semantic Search ≤700ms · Catalog 조회 ≤500ms · Collection 생성 ≤1초 · Metadata 동기화 ≤5초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
Data Catalog·Asset Registry·Business Glossary·Search Engine·Certification·Usage Analytics·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 Catalog Portal/Glossary/Search Engine/Certification Manager ABSENT·코드 0).

## 판정
**PARTIAL(★Data Asset Registry/Catalog=DataPlatform 272차 DataAssets·Certification=NOT_CERTIFIED+IMPLEMENTATION_STATUS+Trust First(READY만)·Glossary seed=DSAR canonical/registry·NL Search seed=ClaudeAI·Security=RBAC/tenant/masking·품질=DataTrust) / ABSENT-formal(형식 Catalog Portal·Business Glossary Manager·Full-Text/Semantic Search Engine·Tag/Collection·Usage Analytics/Recommendation Engine·Certification Manager).** ★핵심=데이터 자산 카탈로그(DataPlatform 272차)·인증 게이트(Trust First=Certified만 KPI)는 실 seed이나 형식 Portal/Search/Glossary는 부재. Part 001~007 상속(재정의 금지)·마케팅 AI 챗봇 NL search 재사용/거버넌스 분리·AI Metadata 직접변경 불가(승인). 코드 변경 0.

## 다음
MEA Part 009 — Enterprise CDC & Data Synchronization Architecture(본 Catalog 상속·확장).
