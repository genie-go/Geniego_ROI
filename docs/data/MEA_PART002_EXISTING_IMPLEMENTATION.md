# MEA Part 002 — Ground-Truth ① Existing Implementation

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 본 문서 = 하위 인용의 허용 근거지(GROUND_TRUTH). 상위 = MEA Part 002 SPEC/ADR.

## 전수조사 방법
MediaHost/sha256/object-storage/data-lake/parquet/orc/avro/feature-store/cdc/spark/ingest/retention 키워드로 `backend/src` 전수 grep + 판독.

## 실존 substrate (narrow seed·형식 Data Lake 아님)
| MEA 개념 | 실존 substrate | 인용 | 성격·판정 |
|---|---|---|---|
| Raw Zone/Object Storage/Immutable Raw | ★sha256 내용주소 불변 파일저장 | `MediaHost.php:21,93,211`(dataURL→sha256→/api/media/{sha}.{ext}) | PARTIAL-strong(Object/Raw seed) |
| Object Version(해시=버전) | content-addressed | `MediaHost.php`(sha256) | PARTIAL(해시 불변) |
| Encryption(AES-256) | 비밀 암호화 | `Crypto`(AES-256-GCM) | PARTIAL(비밀만) |
| Tenant Partition | tenant_id 스코핑 | `Db.php`·`tenant_id` | PARTIAL(Tenant partition만) |
| Immutable/Access Logging | 해시체인 감사 | `SecurityAudit.php` | 실재(재사용) |
| Ingestion(Batch/API/File) | 커넥터·미디어 저장 | `ChannelSync.php`·`DataPlatform.php`·`MediaHost.php` | PARTIAL |
| Retention(seed) | media_gc·log retention | (운영 cron) | PARTIAL-informal |
| Quality/Anomaly(AI) | DataTrust·이상탐지 | `DataPlatform.php`·`AnomalyDetection.php` | PARTIAL |
| Export(CSV/JSON) | 표 export | `OrderHub`·`AdAdapters`·`dataExport.js` | PARTIAL(Parquet 없음) |

## 부재(ABSENT-aspirational) — 오브젝트스토리지/빅데이터 인프라 전제 (grep 0)
Enterprise Data Lake(형식) · Storage Zone Manager · **Standardized/Curated/AI Feature/Archive Zone** · **Parquet/ORC/Avro**(컬럼너 포맷) · **Feature Store** · Data Ingestion Manager(형식·**Streaming/CDC/Event Subscription**) · Data Partition Manager(Region/Domain/Year/Month/Day) · Compression Manager(Snappy/GZIP/ZSTD) · Data Version Manager(형식 Object Versioning) · Data Retention Manager(형식) · Archive/Recovery Job · Data Lake Monitoring · Event 표준(ObjectUploaded 등).

## 판정
**PARTIAL-narrow / ABSENT-aspirational.** `MediaHost`(sha256 content-addressed 불변 오브젝트저장=Raw/Object seed)·`Crypto`·tenant partition·`SecurityAudit`·커넥터 ingestion·CSV/JSON export·DataTrust 품질은 실재하나, **형식 Data Lake·5 Zone·Parquet/컬럼너·Feature Store·CDC/Streaming·Partition/Compression Manager는 단일 호스트 인프라 부재로 전무**. MediaHost가 유일 Object/Raw seed. 실행은 선행 Part 001 + 오브젝트스토리지/빅데이터 인프라 종속.
