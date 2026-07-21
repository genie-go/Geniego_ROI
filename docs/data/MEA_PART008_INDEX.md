# MEA Part 008 — Index (Enterprise Data Catalog & Discovery Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 008 (Data Catalog & Discovery) 산출 문서 색인. ★MEA Part 001~007 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART008_DATA_CATALOG_DISCOVERY_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_CATALOG_DISCOVERY_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~007 상속·DataPlatform DataAssets 승격) |
| `docs/data/MEA_PART008_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART008_DUPLICATE_AUDIT.md` | GT② DataAssets/Metadata/Certification·Part 004/006/007 중복 경계 |
| `docs/data/MEA_PART008_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Catalog/Glossary/Certification 판정 |
| `docs/data/MEA_PART008_GOVERNANCE_MECHANISMS.md` | §11~18 Usage/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART008_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL substrate(데이터 자산 카탈로그·인증 원칙 실재):** ★Data Asset Registry/Catalog=`DataPlatform.php:12,78`(272차 DataAssets·"출처 명시 데이터 자산 카탈로그화"·L1 자산·data_source registry) · Dataset Certification=NOT_CERTIFIED 라벨·`docs/IMPLEMENTATION_STATUS.md`·★**헌법 V3 Trust First**(Certified만 KPI=신뢰도 미달 배제·READY만·Part 006) · Business Glossary/Term seed=28+ DSAR canonical·`docs/registry/` · 중복 Term 금지=중복금지 게이트 · NL Search seed=`ClaudeAI`(챗봇 지식) · Usage=`api_key.use_count`(passive)·품질=`DataPlatform`(DataTrust) · Security=RBAC(`index.php`)/masking(`ChannelCreds`)/tenant(`Db.php`) · Audit=`SecurityAudit`.
- **ABSENT-formal(형식 카탈로그/검색/글로서리 greenfield):** Enterprise Data Catalog(형식 Portal) · **Business Glossary Manager** · **Search Engine**(Full Text/Semantic) · **Tag Management** · **Data Collection**(개인/조직/공유) · Dataset Certification Manager(형식 5등급) · **Usage Analytics/Recommendation Engine** · Data Portal · Owner/Steward 지정(Part 001 Ownership 부재) · Event 표준(DataAssetRegistered 등).
- **★핵심:** 데이터 자산 카탈로그(`DataPlatform` 272차 DataAssets)와 인증 게이트(**Trust First=Certified만 KPI/ROI 사용**)는 이미 실 seed/원칙 — 형식 Catalog Portal/Search/Glossary만 신설. ★중복 카탈로그/인증/용어/검색 로직 신설 절대 금지.
- **★재사용(중복 신설 절대 금지):** `DataPlatform`(DataAssets/data_source)·헌법 V3 Trust First(인증)·28+ DSAR canonical(용어)·중복금지 게이트·`ClaudeAI`(NL search)·RBAC/tenant/masking·`SecurityAudit`. Part 004 Metadata·Part 006 Certification·Part 007 Source·헌법 재정의 금지. 마케팅 AI 챗봇 NL search 재사용/거버넌스 KEEP_SEPARATE·AI Metadata 직접변경 불가(승인).
- **★교훈:** [[project_n272_data_platform]](DataPlatform DataAssets=데이터 자산 카탈로그 정본) · 헌법 V3 Trust First(Certified만 KPI=READY만) · [[feedback_no_duplicate_features]](동일 Term 중복 금지) · [[reference_chatbot_knowledge_pipeline]](NL search=챗봇 지식) · [[reference_menu_audit_log_not_tamper_evident]](Catalog Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~007 + 형식 Catalog/Search/Glossary 신설).

## 다음
MEA Part 009 — Enterprise CDC & Data Synchronization Architecture(본 Catalog 상속·확장·중복 정의 금지).
