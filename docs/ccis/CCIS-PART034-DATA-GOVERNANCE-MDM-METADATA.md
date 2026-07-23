# GeniegoROI Claude Code Implementation Specification

# CCIS Part034 — Data Governance, Master Data Management & Metadata Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Data Governance·MDM·RDM·Metadata 표준을 수립한다.

> ★**성격(정책 거버넌스 강·형식 MDM/Catalog 도구 부재)**: 데이터 거버넌스는 이 저장소의 **핵심 경쟁력**이다 —
> 다만 **정책·원칙 층위**가 강하고 **형식 MDM 허브/Catalog 도구**는 없다. ★**강한 축(정책·품질·계보)**: **DATA
> 헌법 3권**(`DATA_INTELLIGENCE_CONSTITUTION`·`DATA_SOURCE_ARCHITECTURE_CONSTITUTION`·`DATA_TRUST_QUALITY_
> CONSTITUTION` — 최상위 데이터 원칙·SSOT·수집≠사용·Trust First)·**V3 Data Trust**(READY/WARNING/BLOCKED
> 품질 거버넌스·`AnomalyDetection`·Cross Validation)·**출처 lineage**(Source/Credential/Sync/Quality/Trust
> 기록·Part026)·**`GeniegoGlossary`**(비즈니스 용어집 50선 정본·SSOT)·**`DataPlatform`**(Data Source
> Registry·`data_source`·`tenant_business_profile`)·**`ChannelRegistry`/Connector Registry**(참조데이터)·
> **`EventNorm`/Unified Data Model**(마스터 정규화·채널 나열 금지)·**`Dsar`**(retention/erasure·삭제vs익명화·
> legal hold) 가 강하게 실재한다. ★**부재/부분 축**: 명세의 **형식 MDM 허브(golden record)·Data Catalog
> 도구(Collibra/Alation)·Metadata Repository API·형식 Data Classification taxonomy·Data Steward 역할·형식
> Data Dictionary**는 **부재/부분**(grep 0). Part001 §4 에 따라 실측 → MDM/Catalog 도구 부재증명 → DATA 헌법+
> lineage+V3 Trust+Glossary+Dsar 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 데이터 거버넌스 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Governance Architecture | System→Master→Metadata→Catalog→소비 | **부분(정책 중심)** — DATA 헌법+V3 Trust+lineage 가 소비 전 게이트. 형식 Catalog 계층 아님 |
| Master Data Management(MDM) | 중앙 Master/golden record | **부분(대응물)** — `DataPlatform` Data Source Registry·도메인 엔티티(Customer/Product/Campaign/Warehouse). golden record 통합 허브 아님 |
| Reference Data(RDM) | Country/Currency/Status 이력 | ★**대응물** — `ChannelRegistry`·Connector Registry(DATA Volume 2)·i18n 15개국·`fxToKrw`(통화). 변경이력 부분 |
| Data Ownership | Owner/Steward/Custodian | **부분** — `data_source` owner(tenant)·구독회원 소유 데이터. 형식 Steward/Custodian 역할 아님 |
| Metadata Repository | Entity/Column/Source/Owner/Ver | **부분** — 출처 기록(Source/Credential/Sync/Quality/Trust)·`data_source`. 형식 메타 리포지토리 API 아님 |
| Data Catalog | Search/Tag/Lineage/Owner | **부분(대응물)** — `DataPlatform` data_source 카탈로그·메트릭 카탈로그(Glossary). Collibra/Alation 아님 |
| Business Glossary | 용어/정의/Owner/Synonym | ★**실재** — `GeniegoGlossary`(50선 정본·SSOT·챗봇 주입·임의변경 금지) |
| Data Dictionary | Column/Type/Nullable/Validation | **부분** — 스키마(Db.php ensureTables)·필드 매핑(`Mapping`). 형식 데이터 사전 아님 |
| Data Lineage | Source→ETL→WH→소비 | ★**실재(텍스트)** — 출처(Source/Credential/Sync/Quality/Trust)·정규화 파이프라인(`EventNorm`). 시각화 도구 아님 |
| Data Classification | Public/Internal/Confidential/Restricted | **부분** — PII 미저장(집계 코호트)·민감도 부분. 형식 4등급 taxonomy 아님 |
| Data Quality | Accuracy/Completeness/Uniqueness | ★**강함(핵심 경쟁력)** — V3 Data Trust(READY/WARNING/BLOCKED)·`AnomalyDetection`·Cross Validation·**수집≠사용** |
| Data Profiling | Null/Duplicate/Pattern/Range | ★**부분 준수** — Trust 품질검증(Fake/Bot/Spam/Duplicate/Anomaly)·`AnomalyDetection`. 자동 프로파일링 리포트 부분 |
| Data Validation | Format/Domain/RefIntegrity/Rule | ★**부분 준수** — `Mapping` validation·Trust 검증·`RuleEngine`. RefIntegrity(FK) 부분 |
| Data Stewardship | Quality/Metadata/Policy Review | **부분** — Trust 게이트·`action_request` 승인. 형식 Steward 역할 아님 |
| Data Policy | Access/Retention/Sharing/Encrypt | ★**대응물** — DATA 헌법·RBAC(access)·`Dsar`(retention)·`Crypto`(encryption)·테넌트(sharing) |
| Data Retention | Period/Archive/Deletion/Legal Hold | ★**실재** — `Dsar`(GDPR Art.17·**삭제vs익명화**·법정보존 데이터 익명화·fail-closed·email_suppression 미삭제 역설) |
| Metadata API | Search/Register/Update/Version | **부분** — `DataPlatform` data_source API. 형식 메타 버전관리 API 아님 |
| Monitoring | Quality Score/Lineage Coverage | **부분** — Trust 상태(READY/WARNING/BLOCKED)·`SystemMetrics`. Coverage 지표 부분 |
| Logging | Metadata/Policy/Steward/Access | **부분** — `SecurityAudit`·`Dsar` 이력·error_log. Trace ID 부재 |
| Security(RBAC/ABAC/Masking/격리) | 최소권한 | ★**준수** — RBAC+Scope·`TeamPermissions`(ABAC)·Masking·**테넌트 격리 절대**·PII 미저장 |
| Compliance(GDPR/개인정보보호법/데이터3법) | 규정 | ★**부분 준수** — `Dsar`/`GdprConsent`(GDPR Art.17·PIPA)·PII 미저장. ISO/SOC2 형식 인증 아님 |
| Disaster Recovery | Metadata/Catalog/Lineage 복구 | **부분** — DB 백업(data_source·출처 기록)·git(헌법/Glossary). Catalog 전용 복구 아님 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(SSOT/Data as Asset/Metadata First/Governance by Design/Quality Before Consumption/Versioned/Traceability) | **★대체로 준수** | ★SSOT·Quality Before Consumption(수집≠사용)·Traceability(출처 lineage)·Governance by Design(DATA 헌법). Metadata First 부분 |
| §4 Governance Architecture | **부분(정책 중심)** | DATA 헌법+V3 Trust+lineage 소비 게이트. Catalog 계층 아님 |
| §5 MDM | **부분(대응물)** | `DataPlatform` Data Source Registry·도메인 엔티티. golden record 허브 아님 |
| §6 RDM | **★대응물** | `ChannelRegistry`·Connector Registry·i18n·`fxToKrw` |
| §7 Data Ownership | **부분** | `data_source` owner·구독회원 소유. Steward/Custodian 역할 부분 |
| §8 Metadata Repository | **부분** | 출처 기록·`data_source`. 형식 메타 리포지토리 API 부분 |
| §9 Data Catalog | **부분(대응물)** | data_source 카탈로그·메트릭 카탈로그(Glossary). Collibra/Alation 아님 |
| §10 Business Glossary | **★실재** | `GeniegoGlossary` 50선 정본·SSOT·챗봇 주입 |
| §11 Data Dictionary | **부분** | 스키마·`Mapping` 필드매핑. 형식 데이터 사전 부분 |
| §12 Data Lineage | **★실재(텍스트)** | 출처(Source/Credential/Sync/Quality/Trust)·`EventNorm` 정규화. 시각화 도구 아님 |
| §13 Data Classification | **부분** | PII 미저장·민감도 부분. 형식 4등급 taxonomy 아님 |
| §14 Data Quality | **★강함(핵심 경쟁력)** | V3 Data Trust(READY/WARNING/BLOCKED)·`AnomalyDetection`·Cross Validation·수집≠사용 |
| §15 Data Profiling | **부분 준수** | Trust 검증(Fake/Bot/Spam/Duplicate/Anomaly). 자동 프로파일링 리포트 부분 |
| §16 Data Validation | **부분 준수** | `Mapping`·Trust·`RuleEngine`. RefIntegrity 부분 |
| §17 Data Stewardship | **부분** | Trust 게이트·`action_request`. Steward 역할 부분 |
| §18 Data Policy | **★대응물** | DATA 헌법·RBAC·`Dsar`·`Crypto`·테넌트 |
| §19 Data Retention | **★실재** | `Dsar`(삭제vs익명화·법정보존·fail-closed·email_suppression 역설) |
| §20 Metadata API | **부분** | `DataPlatform` API. 메타 버전관리 API 부분 |
| §21 Monitoring | **부분** | Trust 상태·`SystemMetrics`. Coverage 부분 |
| §22 Logging | **부분** | `SecurityAudit`·`Dsar` 이력. Trace ID 부재 |
| §23 Security | **★준수** | RBAC+Scope·ABAC(TeamPermissions)·Masking·테넌트 격리·PII 미저장 |
| §24 Compliance | **부분 준수** | `Dsar`/`GdprConsent`(GDPR/PIPA)·PII 미저장. ISO/SOC2 형식 인증 아님 |
| §25 Disaster Recovery | **부분** | DB 백업·git(헌법/Glossary). Catalog 전용 복구 아님 |
| §26~§27 PHP/Claude(Metadata Repo/MDM Service/Catalog API/Versioning) | **부분** | ★출처 기록·`DataPlatform`·Trust·Glossary·`Dsar`. 형식 MDM Service/Catalog API/메타 버전관리 부재 |
| §28~§29 검증(metadata:list/data-quality:check 등) | **대상 없음** | artisan 없음. `DataPlatform` API·Trust 상태·`make quality` 로 대체 |

---

## 4. 확립된 표준 (신규 데이터 거버넌스 코드가 따를 정본)

- ★**거버넌스 정본 = DATA 헌법 3권**(Intelligence/Source Architecture/Trust Quality). 데이터 영역 변경 시 본 헌법 우선. 구현 정본=`docs/data/DATA_ARCHITECTURE.md`. ★**핵심: 데이터는 '많이'가 아니라 '정확·신뢰·최신·가치·활용가능'하게**.
- ★**품질 거버넌스 = V3 Data Trust**(READY/WARNING/BLOCKED)·`AnomalyDetection`·Cross Validation. ★**수집≠사용**(Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 + Quality/Trust/Confidence 후에만 AI/자동화). 기존 `DataPlatform`/`AnomalyDetection` 확장(엔진 난립 금지).
- ★**Lineage/Metadata = 출처 기록**(Source/Credential/Sync/Quality/Trust). 모든 데이터 출처 추적. `DataPlatform` Data Source Registry(구독등록 vs 외부수집·중복입력0=channel_credential 자동유도).
- ★**마스터 정규화 = `EventNorm`/Unified Data Model**. ★**채널 나열 금지 → 표준모델 정규화·통합**(DATA 헌법). 참조데이터=`ChannelRegistry`/Connector Registry.
- ★**비즈니스 용어 정본 = `GeniegoGlossary`**(50선·SSOT·챗봇 주입). ★**임의 변경 금지**(원본=HTML/파싱 정본)·중복 용어집 신설 금지.
- ★**Retention = `Dsar`**: 법정 보존의무 데이터(주문·클레임·반품·배송·정산)는 **삭제하지 않고 익명화**(GDPR Art.17(3)(b)·회계 정합값 보존·신원 식별자만 파기). ★**email_suppression 삭제 금지**(삭제=수신거부 해제 역설)·fail-closed(신원확인 전 실행 불가)·**해시 알고리즘 3종 정확 매칭**(틀리면 조용히 미삭제).
- ★**테넌트 격리 절대·PII 미저장**(집계 코호트·어트리뷰션=해시/익명 식별자). 데이터 소유=구독회원(Subscriber-Owned).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **형식 MDM 허브(golden record 통합·중앙 Master 관리 시스템)** — 안 함. `DataPlatform` Data Source Registry+도메인 엔티티+`EventNorm` 정규화가 대응물. 중앙 MDM=데이터 도메인 전면 재설계.
2. **Data Catalog 도구(Collibra/Alation)·Metadata Repository API·메타 버전관리** — 안 함. 출처 기록(lineage)+`data_source` 카탈로그+메트릭 카탈로그(Glossary)가 대응물. 형식 Catalog 도구=별도 인프라.
3. **형식 Data Classification taxonomy(Public/Internal/Confidential/Restricted)** — 안 함. PII 미저장(집계 코호트)+RBAC+테넌트 격리가 실효 보호. 4등급 라벨링 미도입.
4. **형식 Data Steward/Custodian 역할·Data Dictionary(컬럼 사전)** — 부분. Trust 게이트·`action_request` 승인·스키마·`Mapping` 필드매핑이 대응물.
5. **자동 Data Profiling 리포트·Lineage 시각화 도구·OpenTelemetry** — 부분. Trust 검증(Fake/Bot/Spam/Duplicate)·텍스트 lineage 가 대응물.
6. **ISO 27001/SOC 2 형식 인증** — 안 함. `Dsar`/`GdprConsent`(GDPR/PIPA)·PII 미저장·암호화 기술통제는 준수하되 형식 인증서는 별도.
7. **artisan `metadata:*`/`catalog:*`/`lineage:*` 명령** — 없음(Slim). `DataPlatform` API·Trust 상태·`make quality` 로 대체.

★**준수하는 실 원칙(강함)**: **DATA 헌법(거버넌스 정책)·V3 Trust(수집≠사용·품질 거버넌스)·출처 lineage(모든 데이터 추적)·마스터 정규화(채널 나열 금지)·`GeniegoGlossary`(용어 SSOT·임의변경 금지)·`Dsar` retention(삭제vs익명화·legal hold·역설 방지)·테넌트 격리 절대·PII 미저장·중복 엔진/용어집 금지**.

---

## 6. Claude Code 구현 규칙

1. 데이터 영역 변경=DATA 헌법 3권 우선(구현 정본=`docs/data/DATA_ARCHITECTURE.md`). **'많이'가 아니라 '정확·신뢰·최신·가치·활용가능'**.
2. ★품질=V3 Trust(READY/WARNING/BLOCKED)·**수집≠사용**(신뢰검증 후에만 AI/자동화). 기존 `DataPlatform`/`AnomalyDetection` 확장(난립 금지).
3. ★Lineage=출처 기록(Source/Credential/Sync/Quality/Trust) 필수. 마스터 정규화=`EventNorm`/Unified Data Model(**채널 나열 금지**). 참조데이터=`ChannelRegistry`/Connector Registry.
4. ★용어=`GeniegoGlossary` 확장(임의변경 금지·중복 용어집 금지). Retention=`Dsar`(법정보존=삭제 아닌 익명화·email_suppression 삭제 금지·fail-closed).
5. ★테넌트 격리 절대·PII 미저장(집계 코호트·해시 식별자)·RBAC/ABAC 최소권한·`SecurityAudit` 기록.
6. 형식 MDM 허브/Collibra/Alation/Data Classification taxonomy 를 "명세에 있다"는 이유로 이식하지 않는다(DATA 헌법+lineage+Trust+Glossary+Dsar 로 커버). 형식 Catalog=인프라 도입 결정 후.

---

## 7. Completion Criteria

- [x] 거버넌스 스택 **실측**(형식 MDM/Collibra/Alation 부재·DATA 헌법 3권·V3 Trust·출처 lineage·`GeniegoGlossary`·`DataPlatform` Data Source Registry·`Dsar` retention 실재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(MDM 허브/Catalog 도구/Classification taxonomy 부재 증명·품질 거버넌스 강함)
- [x] 실 거버넌스(DATA 헌법+V3 Trust+lineage+Glossary+DataPlatform+Dsar) 성문화(§4)
- [x] ★수집≠사용·출처 lineage·마스터 정규화(채널 나열 금지)·용어 SSOT·삭제vs익명화 retention·테넌트 격리·PII 미저장 명시
- [x] 의도적 미적용 + 사유(§5) — MDM 허브/Catalog 도구/Classification taxonomy/Steward/Data Dictionary
- [x] Claude Code 규칙(§6) · DATA 헌법·`DataPlatform`·V3 Trust·`GeniegoGlossary`·`Dsar` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **정책·품질·계보 층위가 강한**(DATA 헌법 3권 + V3 Data Trust 수집≠
> 사용 + 출처 lineage + `GeniegoGlossary` 용어 SSOT + `Dsar` retention) 거버넌스 스택의 성문화이지 Collibra/
> Alation/형식 MDM 허브 이식이 아니다. ★**데이터 인텔리전스=핵심 경쟁력**(강함) — 다만 형식 MDM/Catalog
> 도구가 아니라 **헌법+Trust+lineage** 로 실현한다.

---

## 다음 Part

**CCIS Part035 — Enterprise Scheduling, Resource Management & Calendar** — ★사전 실측 예고: 형식 캘린더/RFC 5545(iCalendar)/예약 최적화 엔진은 **부재/부분**이나, 스케줄링 실체는 **cron 스케줄러(Part019·발송/집계/정산/AI 워커)·`omni_outbox` STO(개인 최적시각)·daypart(RuleEngine 데이파팅·KST)·예약 발송·`Wms`(창고 작업)·타임존(Asia/Seoul 기본)**로 부분 실재. Part035 도 실측→RFC5545/Workforce Scheduling/Optimization 엔진 부재증명→cron+STO+daypart+예약 성문화. ★주의: 이 저장소는 마케팅/커머스 SaaS라 Appointment/Workforce/Shift 스케줄링은 대체로 사업범위 밖(064 "out of scope" 어휘 적용 가능).
