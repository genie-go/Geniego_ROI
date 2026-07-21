# MEA Part 002 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 Data Retention
Raw=영구 · Standardized=10년 · Curated=7년 · AI Feature=모델정책 · Archive=무기한.
- 판정 **PARTIAL-informal**. Raw 영구=`MediaHost`(content-addressed·GC 대상 아님 seed). media_gc/log retention=시간기반 정리 seed. 형식 Zone별 Retention Manager=순신설(Standardized/Curated Zone 부재).

## §12 Data Security
AES-256 Encryption · TLS · Object Versioning · Immutable Storage · Access Logging · Key Rotation.
- 판정 **PARTIAL**(Part 001 상속). AES-256=`Crypto`(비밀·전 오브젝트 아님)·TLS=nginx·Immutable Storage=`MediaHost`(sha256)/`SecurityAudit`·Access Logging=`SecurityAudit`·Key Rotation=수동([[reference_session_credentials]])·**형식 Object Versioning=ABSENT**(content-addressed 해시로 대체).

## §13 Runtime 규칙
Raw Zone 수정 금지 · Metadata 없는 저장 금지 · Encryption 없는 저장 금지 · Version 없는 변경 금지 · Tenant 분리 강제.
- 판정 **PARTIAL**. Raw Zone 수정 금지=`MediaHost` sha256(내용변경=새 오브젝트). Tenant 분리 강제=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]). Metadata/Version/Encryption 강제=순신설(형식 오브젝트 계층 후).

## §14 API 표준 (8)
Upload · Download · Search Metadata · Archive · Restore · Delete · Query Storage · Validate Object.
- **PARTIAL**. Upload=`MediaHost::store`·Download=`MediaHost::serve`(sha256+확장자 화이트리스트·경로조작 SAFE·[[project_n289_post_blob_cap_hardening]]) seed. Search Metadata/Archive/Restore/Query/Validate=ABSENT. Part 001 API 표준(REST/version/idempotency) 상속·admin 게이트.

## §15 Event 표준 (8)
ObjectUploaded · ObjectValidated · ObjectArchived · ObjectRestored · ObjectDeleted · MetadataGenerated · PartitionCreated · StorageOptimized.
- **ABSENT**(event-driven 부재·Part 001 §15 정합·내부 이벤트버스 후 신설).

## §16 AI Integration
자동 Metadata 생성 · 데이터 분류 · 품질 예측 · 이상 데이터 탐지 · Storage/Retention 추천 · Raw 수정 불가.
- 판정 **PARTIAL**(헌법 정합). 품질 예측/이상탐지=`DataPlatform`(DataTrust)/`AnomalyDetection` 승격. Raw 수정 불가=`MediaHost` content-addressed(데이터 헌법 V3 수집≠사용·Trust First). Metadata 생성/분류/Storage 추천=순신설.

## §17 성능 요구사항
Upload ≤2초 · Metadata Search ≤200ms · Storage Query ≤500ms · Archive ≤5초 · Availability ≥99.99%. — 벤치 대상 미존재(형식 계층 신설 후).

## §18 Completion Criteria
Data Lake·Zone·Ingestion·Partition·File Format·Retention·Security·Runtime·API/Event·AI Integration 구현.
- **현재 미충족**(Data Lake/Zone/Parquet/Object Storage/CDC/Streaming 인프라 ABSENT·Event 표준 ABSENT·코드 0).

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-aspirational** — Security(암호/불변/access-log)·Runtime(tenant 분리/Raw 불변)·API(Upload/Download)·AI(품질/이상)는 `Crypto`/`MediaHost`/`SecurityAudit`/`Db.php`/`DataPlatform` 재사용, **형식 Data Lake·4 Zone·Parquet/컬럼너·Feature Store·CDC/Streaming·Partition/Compression/Retention Manager·Event 표준은 오브젝트스토리지/빅데이터 인프라 전제라 순신설/미래**. Part 001/헌법/DATA_ARCHITECTURE 재정의 금지. 코드 변경 0.
