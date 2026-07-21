# MEA Part 008 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 Usage Analytics (10)
조회/다운로드/API호출/사용자/즐겨찾기/검색빈도/KPI참조/AI사용/최근변경/품질점수.
- 판정 **PARTIAL-informal**. 품질점수=`DataPlatform`(DataTrust·Part 006)·API호출=`api_key.use_count`(passive counter)·최근변경=`updated_at`/`SecurityAudit`. 형식 Usage Analytics Engine(조회/다운로드/즐겨찾기 집계)=순신설.

## §12 Data Security
Tenant Isolation · RBAC · Metadata Masking · Audit Logging · Dataset Permission · Classification 기반 접근. 권한 없으면 Metadata만.
- 판정 **PARTIAL**(Part 001~007 상속). Tenant Isolation=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·RBAC=`index.php`(role/scope)·Masking=`ChannelCreds`(last4)·Audit=`SecurityAudit`·Classification=Part 001(ABSENT·신설). "권한 없으면 Metadata만" 접근 패턴=순신설.

## §13 Runtime 규칙
신규 자산 자동 등록 · Metadata 자동 동기화 · 검색 인덱스 자동 갱신 · Certification 검증 · 사용 이력 기록 · Audit 기록.
- 판정 **PARTIAL**. ★Certification 검증=Trust First(READY만·Part 006 헌법 V3)·Audit=`SecurityAudit`·사용 이력=use_count. 자동 등록/동기화/인덱스 갱신=순신설(형식 Catalog 후).

## §14 API 표준 (8)
Register Data Asset · Search Catalog · Get Dataset · Update Business Glossary · Certify Dataset · Get Related Assets · Create Collection · Query Usage Analytics.
- **PARTIAL**(단 Register/Get Asset=`DataPlatform` DataAssets seed). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Register/Certify/Update Glossary=admin 게이트.

## §15 Event 표준 (8)
DataAssetRegistered · DatasetCertified · BusinessTermCreated · SearchExecuted · CollectionCreated · AssetUpdated · CatalogSynchronized · UsageAnalyticsUpdated.
- **ABSENT**(event-driven 부재·Part 001~007 §15 정합·내부 이벤트버스 후 신설).

## §16 AI Integration
Dataset/유사/품질기반/API·Event 연관 추천 · Business Term 자동생성 · 검색 의도 분석 · 자동 Tag · 자산 분류 · KPI 연관성 · NL Search · 공식 Metadata 직접 변경 불가(승인).
- 판정 **PARTIAL**(헌법 정합). NL Search=`ClaudeAI`(챗봇 지식 파이프라인·[[reference_chatbot_knowledge_pipeline]])·품질기반 추천=`DataPlatform`(DataTrust)·자산 분류=Part 006 DQ. ★공식 Metadata 직접 변경 불가(승인 절차)=Part 004 승인+데이터 헌법 V3(수집≠사용)/V4(근거/신뢰도). 추천/Tag 생성/유사 데이터셋=순신설. 마케팅 AI(`ClaudeAI`)는 챗봇/NL search 재사용하되 거버넌스 AI와 KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §17 성능 요구사항
검색 ≤300ms · Semantic Search ≤700ms · Catalog 조회 ≤500ms · Collection 생성 ≤1초 · Metadata 동기화 ≤5초 · Availability ≥99.99%. — 벤치 대상 미존재.

## §18 Completion Criteria
Data Catalog·Asset Registry·Business Glossary·Search Engine·Certification·Usage Analytics·Security·Runtime·API/Event·AI 구현.
- **현재 미충족**(형식 Catalog Portal/Glossary/Search Engine/Certification Manager·Tag/Collection·Event 표준 ABSENT·코드 0). ★단 DataAssets 카탈로그·Trust First 인증 원칙은 실 seed.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Asset Registry(DataPlatform DataAssets)·Certification(Trust First)·NL Search(ClaudeAI)·Security(RBAC/masking/tenant)·품질(DataTrust)·Audit는 `DataPlatform`/헌법 V3/`ClaudeAI`/`index.php`/`SecurityAudit` 재사용(★중복 카탈로그/인증/용어/검색 절대 금지), **형식 Catalog Portal·Business Glossary Manager·Full-Text/Semantic Search Engine·Tag/Collection·Usage Analytics/Recommendation Engine·Event 표준은 순신설**. Part 001~007/헌법 재정의 금지. 코드 변경 0.
