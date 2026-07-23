# GeniegoROI Claude Code Implementation Specification

# CCIS Part049 — Enterprise Master Data Management (MDM), Reference Data & Data Quality Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise MDM·Reference Data·Data Quality 표준을 수립한다.

> ★**성격(★Part034 강한 중복 — 품질/정규화/매칭 실재·형식 MDM 허브 부재)**: 본 Part 는 **CCIS Part034(데이터
> 거버넌스/MDM/메타데이터)와 강하게 중복**된다. Part034 의 판정(형식 MDM 허브/Collibra/Alation 부재·DATA 헌법+
> V3 Trust+lineage+Glossary 실재)을 **승계**하되, 본 Part 는 **Golden Record·Survivorship·Data Matching·Data
> Quality Framework** 관점을 추가한다. ★명세가 다루는 **형식 MDM Hub·Golden Record 엔진·Survivorship Rule
> 엔진·형식 Data Steward 역할·Fuzzy/AI Match·Data Certification·Data Profiling 리포트 도구(Informatica/
> Collibra MDM)**는 **부재**한다(grep 0·Part034). ★**실재 축(품질/정규화/매칭 substrate)**: ★★**CRM 아이덴티티
> 해석**(**canonical `identity_id`**·다중 연락처 email/phone/kakao 통합·**union-find 클러스터링**·normalizePhone/
> normalizeKakao **exact match dedup**·LTV/세그먼트 파편화 방지 = **golden-record 대응물**)·**`EventNorm`/
> Unified Data Model**(마스터 정규화/cleansing)·**V3 Data Trust**(READY/WARNING/BLOCKED = Data Quality
> Framework·수집≠사용)·**`DataPlatform`**(Data Source Registry)·**`ChannelRegistry`/Connector Registry**
> (참조데이터)·**`Mapping`**(필드매핑/validation)·**출처 lineage**·**`Dsar`**(retention·삭제vs익명화) 가
> 실재한다. Part001 §4 에 따라 실측 → MDM 허브/golden record 엔진 부재증명 → CRM identity+EventNorm+V3 Trust
> 성문화했다. ★정본=**Part034(데이터 거버넌스)** 승계·**"수집≠사용"·삭제vs익명화** 재확인·중복 판정 재작성 금지.
> (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 MDM/품질 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| MDM Architecture | Source→Integration→MDM Hub→Golden Record | **부분(대응물)** — cron sync→`EventNorm` 정규화→CRM identity/rollup. 형식 MDM Hub 아님(Part034) |
| Master Data Model | Customer/Product/Warehouse/User… | **부분** — 도메인 엔티티(CRM 고객·Catalog 상품·Wms 창고·app_user). golden record 통합 허브 아님 |
| Reference Data Management | Country/Currency/Language/Status | ★**대응물** — `ChannelRegistry`·Connector Registry·i18n 15개국·`fxToKrw`(통화)·상태 코드(핸들러) |
| Golden Record | Master ID/Confidence/Merge History | **부분(대응물)** — ★**CRM canonical `identity_id`**(다중 연락처 통합·union-find). Master ID/Confidence Score 부분 |
| Survivorship Rule | Priority/Latest/Confidence/Override | **부분** — CRM identity 통합(best-effort)·`EventNorm` 정규화. 형식 survivorship 엔진 부분 |
| Data Stewardship | Steward/Approval/Quality Dashboard | **부분** — `action_request`(승인)·V3 Trust 상태. 형식 Steward 역할 부분 |
| Data Profiling | Completeness/Uniqueness/Distribution | ★**부분 준수** — V3 Trust 검증(Fake/Bot/Spam/Duplicate/Anomaly)·`AnomalyDetection`. 자동 프로파일링 리포트 부분 |
| Data Quality Framework | Accuracy/Completeness/Consistency 점수 | ★**강함(핵심 경쟁력)** — **V3 Data Trust(READY/WARNING/BLOCKED)**·Cross Validation·**수집≠사용** |
| Data Cleansing | Standardize/Normalize/Missing 처리 | ★**대응물** — `EventNorm`/Unified Data Model·`Mapping`(필드매핑)·normalizePhone/Kakao |
| Data Matching | Exact/Fuzzy/AI/Rule-Based | **부분(Exact)** — ★CRM **exact match**(정규화 phone/kakao·union-find)·`CONNECTOR_KEY`. Fuzzy/AI Match 부재 |
| Duplicate Detection | Score/Merge Suggestion/Conflict | **부분(Exact)** — CRM identity 통합(exact)·externalId dedup(upsert). 점수 기반/Merge Suggestion 부분 |
| Data Validation | Schema/Business Rule/Reference/Relationship | ★**부분 준수** — `Mapping` validation·V3 Trust·`RuleEngine`. RefIntegrity(FK) 부분 |
| Metadata Synchronization | Schema/Attribute/Lineage/Catalog Sync | **부분** — 출처 기록(Source/Credential/Sync/Quality/Trust)·`DataPlatform`. 형식 메타 sync 부분 |
| Data Certification | Certified/Review/Steward Approval | **부분(대응물)** — V3 Trust READY(=인증 유사)·`action_request`. 형식 Certification 부분 |
| Data Governance Integration | Catalog/Lineage/Ownership/Retention | ★**대응물** — `DataPlatform`·`GeniegoGlossary`·lineage·`Dsar`(retention·Part034) |
| Monitoring | Duplicate Rate/Quality Score/Steward | **부분** — V3 Trust 상태·`AnomalyDetection`·`SystemMetrics`. Golden Record Count 부분 |
| Logging | Master ID/Source/Steward/Trace | **부분** — `SecurityAudit`·출처 기록. Master ID/Trace 부분 |
| Security(RBAC/Masking/격리) | Master Data 접근 | ★**준수** — RBAC+Scope·Masking·**테넌트 격리 절대**·PII 미저장(집계 코호트) |
| Compliance(GDPR) | Master Data 정책 | ★**부분 준수** — `Dsar`(삭제vs익명화)·`GdprConsent`·DATA 헌법 |
| Disaster Recovery | Master/Golden Record/Reference 복구 | **부분** — DB 백업·git(Registry/Glossary). Golden Record 전용 복구 부분 |
| Performance(Matching/Validation Cache/증분 Sync) | 대용량 | **부분** — 인덱스·증분(`synced_at`)·HTTP 캐시. Matching 캐시 부분 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(SSOT/Quality by Design/Governance Driven/Standardized Master/Reusable Reference/Tenant Isolated/Auditable) | **★대체로 준수** | ★SSOT·Quality by Design(V3 Trust)·Standardized(EventNorm)·Tenant Isolated·Auditable. 형식 Governance Hub 부분 |
| §4 MDM Architecture | **부분(대응물)** | cron→`EventNorm`→CRM identity/rollup. MDM Hub 아님 |
| §5 Master Data Model | **부분** | 도메인 엔티티. golden record 허브 아님 |
| §6 Reference Data | **★대응물** | `ChannelRegistry`·Connector Registry·i18n·`fxToKrw` |
| §7 Golden Record | **부분(대응물)** | ★CRM canonical `identity_id`(union-find). Confidence Score 부분 |
| §8 Survivorship Rule | **부분** | CRM 통합(best-effort)·`EventNorm`. 형식 엔진 부분 |
| §9 Data Stewardship | **부분** | `action_request`·V3 Trust. Steward 역할 부분 |
| §10 Data Profiling | **부분 준수** | V3 Trust(Fake/Bot/Spam/Duplicate)·`AnomalyDetection` |
| §11 Data Quality Framework | **★강함(핵심 경쟁력)** | V3 Data Trust(READY/WARNING/BLOCKED)·Cross Validation·수집≠사용 |
| §12 Data Cleansing | **★대응물** | `EventNorm`/Unified Model·`Mapping`·normalize |
| §13 Data Matching | **부분(Exact)** | ★CRM exact match(union-find)·`CONNECTOR_KEY`. Fuzzy/AI 부재 |
| §14 Duplicate Detection | **부분(Exact)** | CRM identity·externalId dedup. 점수/Suggestion 부분 |
| §15 Data Validation | **부분 준수** | `Mapping`·V3 Trust·`RuleEngine`. RefIntegrity 부분 |
| §16 Metadata Synchronization | **부분** | 출처 기록·`DataPlatform`. 형식 sync 부분 |
| §17 Data Certification | **부분(대응물)** | V3 Trust READY·`action_request` |
| §18 Data Governance Integration | **★대응물** | `DataPlatform`·`GeniegoGlossary`·lineage·`Dsar`(Part034) |
| §19 Monitoring | **부분** | V3 Trust·`AnomalyDetection`·`SystemMetrics` |
| §20 Logging | **부분** | `SecurityAudit`·출처 기록 |
| §21 Security | **★준수** | RBAC+Scope·Masking·테넌트 격리·PII 미저장 |
| §22 Compliance | **부분 준수** | `Dsar`(삭제vs익명화)·`GdprConsent`·DATA 헌법 |
| §23 Disaster Recovery | **부분** | DB 백업·git(Registry/Glossary) |
| §24 Performance | **부분** | 인덱스·증분(`synced_at`)·캐시 |
| §25~§26 PHP/Claude(MDM/Golden Record/Matching/Validation/Stewardship Service) | **부분** | ★CRM identity·`EventNorm`·V3 Trust·`Mapping`. 형식 MDM/Golden Record 엔진 부재 |
| §27~§28 검증(mdm:health/golden-record:verify/data-quality:report) | **대상 없음** | artisan 없음. CRM identity·V3 Trust·`make quality`·`DataPlatform` 로 대체 |

---

## 4. 확립된 표준 (신규 MDM/품질 코드가 따를 정본)

- ★**아이덴티티 해석/매칭 정본 = CRM canonical `identity_id`**(union-find 클러스터링·다중 연락처 통합·normalizePhone/Kakao **exact match**). 신규 고객 매칭/dedup 은 이 로직 확장(중복 identity 엔진 신설 금지). ★**목적=LTV/세그먼트 파편화 방지**(231 DB SSOT 승계).
- ★**Data Quality Framework = V3 Data Trust**(READY/WARNING/BLOCKED·Part034/041). ★**수집≠사용**(Fake/Bot/Spam/Fraud/Duplicate/Anomaly 검증 + Quality/Trust/Confidence 후에만 AI/자동화). Certification=READY 상태. 기존 `DataPlatform`/`AnomalyDetection` 확장(엔진 난립 금지).
- ★**마스터 정규화/cleansing = `EventNorm`/Unified Data Model + `Mapping`**(필드매핑·Part034). ★**채널 나열 금지 → 표준 정규화**. 참조데이터=`ChannelRegistry`/Connector Registry·i18n·`fxToKrw`.
- ★**거버넌스 연계 = `DataPlatform`(Registry)+`GeniegoGlossary`(용어)+출처 lineage+`Dsar`(retention)**(Part034). ★retention=**삭제vs익명화**(법정보존=익명화·Part034).
- ★**Survivorship/병합 정직**: CRM identity 통합은 **best-effort exact match**(fuzzy/AI 아님). ★**임의 병합 금지**(형식 survivorship/confidence 없으면 exact match·정직 미산출). 병합 이력=`SecurityAudit`.
- ★**테넌트 격리·PII 미저장**: Master Data 조회는 위조 불가 권위 tenant. PII 미저장(집계 코호트·해시 식별자)·RBAC/Masking.
- ★★**Part034 중복 명시**: 형식 MDM/Data Governance 판정은 **Part034 가 정본**. 본 Part 는 golden record/matching/quality 관점 보강이지 중복 신설 아님.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — Part034 중복 + 형식 MDM 부재)

1. **형식 MDM Hub·Golden Record 엔진·Survivorship Rule 엔진(Informatica/Collibra MDM)** — 안 함(Part034 승계). CRM canonical `identity_id`(union-find exact match)+`EventNorm` 정규화가 대응물. 중앙 MDM Hub=데이터 도메인 전면 재설계.
2. **Fuzzy Match/AI Match** — 안 함. CRM 은 **정규화 exact match**(phone/kakao)이지 fuzzy/편집거리 매칭 아님. ★**임의 매칭 금지**(오병합=고객 데이터 오염). fuzzy 도입 시 confidence/steward 검토 선행.
3. **형식 Data Steward 역할·Data Certification 워크플로** — 부분. `action_request`(승인)·V3 Trust READY(=인증 유사)가 대응물.
4. **자동 Data Profiling 리포트·형식 Duplicate Score/Merge Suggestion UI** — 부분. V3 Trust(Fake/Bot/Spam/Duplicate)·`AnomalyDetection`·externalId dedup 이 대응물.
5. **Part034 와 중복되는 형식 Metadata/Catalog/Lineage** — Part034 정본(재판정 금지). 본 Part 는 golden record/matching 관점만.
6. **artisan `mdm:*`/`golden-record:verify`/`data-quality:report` 명령** — 없음(Slim). CRM identity·V3 Trust·`make quality`·`DataPlatform` 로 대체.

★**준수하는 실 원칙(강함)**: **CRM canonical identity(union-find exact match·파편화 방지)·V3 Trust(Data Quality·수집≠사용·핵심 경쟁력)·EventNorm 정규화(채널 나열 금지)·참조데이터 Registry·출처 lineage·삭제vs익명화(Dsar)·테넌트 격리·PII 미저장·정직 미산출(임의 병합 금지)·중복 엔진 금지**. ★**Part034 중복 명시**: 형식 MDM/거버넌스 판정 정본=Part034.

---

## 6. Claude Code 구현 규칙

1. 고객 매칭/dedup=CRM canonical `identity_id`(union-find exact match·normalizePhone/Kakao) 확장. 중복 identity 엔진 신설 금지·LTV 파편화 방지.
2. 품질=V3 Data Trust(READY/WARNING/BLOCKED·수집≠사용). Certification=READY. `DataPlatform`/`AnomalyDetection` 확장(난립 금지).
3. 정규화/cleansing=`EventNorm`/Unified Model+`Mapping`(**채널 나열 금지**). 참조데이터=`ChannelRegistry`/Connector Registry·i18n·`fxToKrw`.
4. ★**임의 병합/fuzzy 매칭 금지**(exact match·confidence/steward 검토 선행). 병합 이력=`SecurityAudit`·retention=`Dsar`(삭제vs익명화).
5. ★테넌트 격리 절대·PII 미저장(집계 코호트·해시)·RBAC/Masking·정직 미산출.
6. ★★형식 MDM/거버넌스는 **Part034 정본 재사용**(중복 신설 금지). Informatica/Collibra MDM/Golden Record 엔진을 "명세에 있다"는 이유로 이식하지 않는다(CRM identity+EventNorm+V3 Trust 로 커버).

---

## 7. Completion Criteria

- [x] MDM/품질 스택 **실측**(형식 MDM Hub/Golden Record 엔진/Survivorship/Fuzzy Match/Collibra 부재·CRM canonical identity(union-find)·V3 Trust·`EventNorm`·`ChannelRegistry` 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(형식 MDM 허브 부재 증명·품질/정규화/exact 매칭 실재·★Part034 중복 명시)
- [x] 실 MDM/품질(CRM identity+V3 Trust+EventNorm+참조 Registry+lineage+Dsar) 성문화(§4)
- [x] ★CRM canonical identity(union-find exact match·파편화 방지)·V3 Trust(수집≠사용)·정규화(채널 나열 금지)·임의 병합 금지·삭제vs익명화·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — MDM Hub/Golden Record 엔진/Survivorship/Fuzzy·AI Match/Steward/Certification(+Part034 중복)
- [x] Claude Code 규칙(§6) · CRM identity·V3 Trust·`EventNorm`·`ChannelRegistry`·`Dsar` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **Part034(데이터 거버넌스/MDM) 와 강하게 중복**되며, golden record/
> matching/quality 관점을 보강한 성문화다 — CRM canonical `identity_id`(union-find exact match) + V3 Data Trust
> (Data Quality·수집≠사용) + `EventNorm` 정규화가 실재하되 **형식 MDM Hub/Golden Record 엔진/Fuzzy Match/
> Collibra MDM 이식이 아니다**. ★**정직**: CRM 매칭은 **exact match(fuzzy 아님)**이며 임의 병합은 금지(오병합=
> 고객 데이터 오염). 형식 MDM/거버넌스 판정 정본=**Part034**(재판정 금지).

---

## 다음 Part

**CCIS Part050 — Enterprise Data Fabric, Data Mesh, Virtualization & Unified Data Access** — ★사전 실측 예고: ★**Part026(DWH)·Part034(거버넌스)·Part041(데이터플랫폼)과 중복** — 형식 Data Fabric/Data Mesh/Data Virtualization(Denodo)·Federated Query 는 **부재**이나, 통합 데이터 접근 실체는 **`EventNorm`/Unified Data Model(단일 논리 모델)·rollup 집계(통합 뷰)·`Connectors`/Connector Registry(도메인 소스)·cron sync(cross-system)·V3 Trust·테넌트 격리**로 부분 실재. Part050 도 실측→Data Fabric/Mesh/Virtualization 부재증명→EventNorm+rollup+Connector 성문화. ★Part026/034/041 중복 명시·"채널 나열 금지·표준 정규화·단일 Intelligence Layer" 재확인.
