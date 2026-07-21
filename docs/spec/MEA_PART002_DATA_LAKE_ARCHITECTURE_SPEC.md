# MEA Part 002 — Enterprise Data Lake Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001(Enterprise Data Platform Foundation)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend not Replace). Foundation의 DATA_DOMAIN/CLASSIFICATION/OWNERSHIP/표준필드(tenant_id 등)/데이터 헌법 6볼륨/`DATA_ARCHITECTURE.md`를 그대로 인용·준수한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
모든 원천 데이터를 손실 없이 수집·보관·분석하는 중앙 데이터 저장소(Data Lake). 구조·저장정책·계층(Zone)·보안·운영 표준 정의 — 모든 원천 데이터는 본 구조로 관리.

## §2 구현 범위
Enterprise Data Lake · Raw/Standardized/Curated/AI Feature/Archive Zone · Data Ingestion · Object Storage · Lifecycle Management · Data Governance Integration(Part 001 상속).

## §3 구현 목표 (10)
Enterprise Data Lake · Storage Zone Manager · Data Ingestion Manager · Data Retention Manager · Data Partition Manager · File Format Manager · Compression Manager · Encryption Manager · Data Version Manager · Data Lake Monitoring.

## §4 아키텍처 원칙 (10)
Store Once · Read Many · Immutable Raw Data · Schema Evolution · Metadata Driven · Cost Optimized · AI Ready · Cloud Native · Infinite Scalability · Zero Trust Storage.

## §5 Canonical Entity (15)
DATA_{LAKE·ZONE·OBJECT·FILE·PARTITION·RETENTION_RULE·STORAGE_POLICY·COMPRESSION·ENCRYPTION·OBJECT_VERSION·SOURCE_SYSTEM·LOAD_JOB·STORAGE_METRIC·ARCHIVE_JOB·RECOVERY_JOB}. → 상세 = `MEA_PART002_CANONICAL_ENTITIES.md`.

## §6 Storage Zone (5)
Raw(원본·수정금지·Immutable) · Standardized(표준 스키마·정제) · Curated(비즈니스/KPI) · AI Feature(학습/Feature Store) · Archive(장기·저비용). → ★Raw Zone/Object Storage/Immutable seed = `MediaHost`(GT① 참조). Standardized/Curated/AI Feature/Archive Zone=ABSENT.

## §7 지원 데이터 유형 (14)
Database Export · CSV · JSON · XML · Parquet · ORC · Avro · Image · Audio · Video · Log · Event Stream · Document · AI Dataset. → ★현행=CSV/JSON/Image(MediaHost)·**Parquet/ORC/Avro=ABSENT**(컬럼너 포맷 없음).

## §8 Ingestion 정책 (6)
Batch Load · Streaming Load · CDC · API Import · File Upload · Event Subscription. 모든 적재=Metadata 생성. → ★현행=Batch/API Import/File Upload(커넥터·`ChannelSync`/`DataPlatform`)·**Streaming/CDC/Event Subscription=ABSENT**.

## §9 Partition 정책
기본: Tenant · Region · Business Domain · Year · Month · Day. 필요시: Customer · Product · Organization. → ★Tenant partition=`tenant_id`(Part 001 표준·실재)·나머지=ABSENT.

## §10 File Format 표준
권장 Parquet/ORC · 지원 CSV/JSON/XML · 압축 Snappy/GZIP/ZSTD. → ★현행=CSV/JSON·**Parquet/ORC/컬럼너 압축=ABSENT**.

## §11 Data Retention
Raw=영구 · Standardized=10년 · Curated=7년 · AI Feature=모델정책 · Archive=무기한. → ★현행 seed=media_gc/log retention(형식 Retention Manager 아님).

## §12 Data Security
AES-256 Encryption · TLS · Object Versioning · Immutable Storage · Access Logging · Key Rotation. → ★Part 001 상속: AES-256=`Crypto`·TLS=nginx·Immutable=`MediaHost`(sha256 content-addressed)/`SecurityAudit`·Access Logging=`SecurityAudit`·Key Rotation=수동. 형식 Object Versioning=ABSENT.

## §13 Runtime 규칙
Raw Zone 수정 금지 · Metadata 없는 파일 저장 금지 · Encryption 없는 저장 금지 · Version 없는 변경 금지 · Tenant 분리 강제. → ★Tenant 분리=`Db.php`(Part 001)·Raw 불변=`MediaHost`(sha256). Metadata/Version 강제=순신설.

## §14 API 표준 (8)
Upload/Download/Archive/Restore/Delete/Validate Object · Search Metadata · Query Storage. → ★Upload/Download=`MediaHost`(store/serve) seed·나머지 ABSENT. Part 001 API 표준(REST/version/idempotency) 상속.

## §15 Event 표준 (8)
ObjectUploaded · ObjectValidated · ObjectArchived · ObjectRestored · ObjectDeleted · MetadataGenerated · PartitionCreated · StorageOptimized. → ABSENT(event-driven 부재·Part 001 §15 정합).

## §16 AI Integration
자동 Metadata 생성 · 데이터 분류 · 품질 예측 · 이상 데이터 탐지 · Storage/Retention 추천 **만**·Raw 수정 불가. → ★품질/이상=`DataPlatform`(DataTrust)/`AnomalyDetection` seed·Raw 수정불가=`MediaHost` content-addressed(헌법 V3 정합). Metadata/분류/추천=순신설.

## §17 성능 요구사항
Upload ≤2초 · Metadata Search ≤200ms · Storage Query ≤500ms · Archive ≤5초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
Data Lake·Zone·Ingestion·Partition·File Format·Retention·Security·Runtime·API/Event·AI Integration 구현. → **현재 미충족**(Data Lake/Zone/Parquet/Object Storage 인프라 ABSENT·코드 0).

## 판정
**ABSENT-aspirational(Data Lake/5 Zone/Parquet/Feature Store/CDC/Streaming·단일 호스트 인프라 부재) / PARTIAL-narrow(★MediaHost content-addressed 불변 오브젝트저장=Raw/Object seed·Crypto 암호·tenant partition·SecurityAudit 불변/access-log·DataPlatform 품질·CSV/JSON export·커넥터 ingestion).** ★핵심=Part 001 상속(재정의 금지)·MediaHost가 유일 실 Object/Raw seed·형식 Data Lake는 오브젝트스토리지/빅데이터 인프라 전제(조기구현 금지). 코드 변경 0.

## 다음
MEA Part 003 — Enterprise Data Warehouse Architecture(본 Data Lake 상속·확장).
