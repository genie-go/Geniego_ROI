# MEA Part 006 — Index (Enterprise Data Quality Management Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 006 (Enterprise DQM Architecture) 산출 문서 색인. ★데이터 헌법 Volume 3(DATA_TRUST_QUALITY)·MEA Part 001~005 상속·정합(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART006_DATA_QUALITY_MANAGEMENT_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_QUALITY_MANAGEMENT_ARCHITECTURE.md` | 설계 결정(D-1~D-5·헌법 V3 재정의 금지·DataTrust 승격) |
| `docs/data/MEA_PART006_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART006_DUPLICATE_AUDIT.md` | GT② 헌법 V3/DataTrust/dedup·Part 001~005 중복 경계 |
| `docs/data/MEA_PART006_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 품질기준/Validation/Score 판정 |
| `docs/data/MEA_PART006_GOVERNANCE_MECHANISMS.md` | §11~18 Cleansing/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART006_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-strong substrate(헌법 V3 품질/신뢰 프레임워크=최상위 규범·부분구현 실재):** ★데이터 품질/신뢰 프레임워크=**`docs/DATA_TRUST_QUALITY_CONSTITUTION.md`(Volume 3)**(Data Trust Intelligence Engine·수집≠사용·Trust First·Quality/Trust/Confidence Score·Cross Validation·Intelligence Readiness READY/WARNING/BLOCKED=★핵심경쟁력) · Quality/Trust Score=`DataPlatform.php`(DataTrust) · 이상/fraud 탐지=`AnomalyDetection.php` · Duplicate Check=Part 005 dedup(231차/UNIQUE/중복금지 게이트) · Cleansing 정규화=`ChannelSync`(표준모델) · Raw 불변=Part 002 `MediaHost`(sha256) · Runtime Trust First(신뢰도 미달=AI/자동화 제외)=Volume 3·`index.php` writeGuard · Quality Audit=`SecurityAudit`.
- **ABSENT-formal(형식 DQ 엔진 greenfield):** Data Quality Repository(형식) · **Quality Rule Manager/Engine**(Version 규칙) · **Validation Engine**(형식) · **Profiling Engine**(Null%/Cardinality/분포/표준편차) · **Cleansing Engine**(형식 표준화 파이프라인) · Quality Scoring Engine(0-100 등급 Excellent~Critical) · **Exception Manager**(8단계) · DQ Dashboard · Monitoring Service · Event 표준(DataValidated 등).
- **★핵심:** DQM 주제는 **데이터 헌법 Volume 3가 정확히 정의**한 영역(핵심경쟁력=Data Trust Intelligence Engine)이고 `DataPlatform`(DataTrust)/`AnomalyDetection`이 부분 구현 — 형식 DQ Rule/Validation/Profiling/Cleansing/Exception 엔진만 신설. ★중복 품질/신뢰/dedup 엔진 신설 절대 금지(헌법 V3 "중복 인텔리전스 금지·엔진 난립 금지").
- **★재사용(중복 신설 절대 금지):** 헌법 Volume 3(규범)·`DataPlatform`(DataTrust)·`AnomalyDetection`·Part 005 dedup·`ChannelSync`(정규화)·`MediaHost`(Raw 불변)·`SecurityAudit`(감사). Volume 3·Part 001~005 재정의 금지. AI=직접수정 금지(헌법 V3)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** 헌법 Volume 3(Trust First·수집≠사용·중복 인텔리전스 금지) · [[feedback_no_duplicate_features]](Duplicate Check=중복금지 게이트) · [[project_n231_dedup_ssot]](dedup=Part 005) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Quality Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Quality Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~005 + 형식 DQ 엔진 신설·값 재계산 없이).

## 다음
MEA Part 007 — Enterprise Data Lineage & Impact Analysis Architecture(본 DQM 상속·확장·중복 정의 금지).
