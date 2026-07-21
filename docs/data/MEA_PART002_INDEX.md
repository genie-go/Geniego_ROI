# MEA Part 002 — Index (Enterprise Data Lake Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 002 (Enterprise Data Lake Architecture) 산출 문서 색인. ★MEA Part 001 Foundation 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART002_DATA_LAKE_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_DATA_LAKE_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001 상속·MediaHost Raw/Object 승격) |
| `docs/data/MEA_PART002_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART002_DUPLICATE_AUDIT.md` | GT② Part 001·저장/데이터 자산 중복 경계 |
| `docs/data/MEA_PART002_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Zone/Ingestion/Format 판정 |
| `docs/data/MEA_PART002_GOVERNANCE_MECHANISMS.md` | §11~18 Retention/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART002_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL-narrow substrate(seed 실재):** ★Raw Zone/Object Storage/Immutable Raw/Store-Once=`MediaHost.php:21,93,211`(dataURL→sha256 내용주소·`/api/media/{sha}.{ext}`·수정 불가·경로조작 SAFE) · Object Version(해시=버전)=`MediaHost`(sha256) · Encryption(AES-256)=`Crypto`(비밀) · Tenant Partition=`Db.php`(`tenant_id`·Part 001 표준) · Immutable/Access Logging=`SecurityAudit` · Ingestion(Batch/API/File)=`ChannelSync`/`DataPlatform`/`MediaHost` · Retention seed=media_gc · Quality/Anomaly=`DataPlatform`(DataTrust)/`AnomalyDetection` · Export=CSV/JSON.
- **ABSENT-aspirational(단일 호스트 인프라 부재):** Enterprise Data Lake(형식) · **Standardized/Curated/AI Feature/Archive Zone** · **Parquet/ORC/Avro**(컬럼너) · **Feature Store** · **CDC/Streaming/Event Subscription** · Partition Manager(Region/Domain/시간) · Compression Manager · 형식 Object Versioning/Storage Policy/Metric/Recovery Job · Data Lake Monitoring · Event 표준(ObjectUploaded 등).
- **★핵심:** MEA Part 001 상속(DATA_DOMAIN/CLASSIFICATION/OWNERSHIP/tenant 표준/헌법 6볼륨/DATA_ARCHITECTURE 재정의 금지). `MediaHost`가 **유일 실 Object/Raw seed**(content-addressed=Store Once/Immutable/버전=해시). 형식 Data Lake·4 Zone·Parquet는 오브젝트스토리지/빅데이터 인프라 전제라 조기구현 금지(현행 분석은 MySQL 집계 `Rollup`/`Pnl`/`DataPlatform`가 Curated 대체).
- **★재사용(중복 신설 절대 금지):** `MediaHost`(오브젝트저장)·`Crypto`(암호)·`SecurityAudit`(불변/access-log)·`Db.php`(격리)·`DataPlatform`/`AnomalyDetection`(AI). AI=Raw 수정 불가(헌법 V3 수집≠사용).
- **★교훈:** [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Storage Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Access Log 정본=SecurityAudit::verify) · [[project_n289_post_blob_cap_hardening]](MediaHost 경로조작 SAFE·blob 캡).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001 + 오브젝트스토리지/빅데이터 인프라).

## 다음
MEA Part 003 — Enterprise Data Warehouse Architecture(본 Data Lake 상속·확장·중복 정의 금지).
