# MEA Part 002 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★MediaHost/Crypto/Db/SecurityAudit 재사용·형식 Data Lake greenfield·Part 001 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | DATA_LAKE | 부재(형식 Data Lake) | — | ABSENT-aspirational |
| 2 | DATA_ZONE | Raw seed만(4 Zone 부재) | `MediaHost.php` | PARTIAL-seed(Raw만) |
| 3 | DATA_OBJECT | ★sha256 내용주소 오브젝트 | `MediaHost.php:93` | PARTIAL-strong |
| 4 | DATA_FILE | 미디어 파일 | `MediaHost.php` | PARTIAL |
| 5 | DATA_PARTITION | tenant_id partition만 | `Db.php`(tenant_id) | PARTIAL(Tenant만) |
| 6 | DATA_RETENTION_RULE | media_gc/log retention seed | (운영 cron) | PARTIAL-informal |
| 7 | DATA_STORAGE_POLICY | 부재(형식) | — | ABSENT |
| 8 | DATA_COMPRESSION | 부재(Snappy/GZIP/ZSTD) | — | ABSENT |
| 9 | DATA_ENCRYPTION | AES-256-GCM | `Crypto` | PARTIAL(비밀만) |
| 10 | DATA_OBJECT_VERSION | content-addressed(해시=버전) | `MediaHost.php`(sha256) | PARTIAL(형식 versioning 아님) |
| 11 | DATA_SOURCE_SYSTEM | 커넥터/데이터소스 | `DataPlatform.php`·헌법 Volume 2 | PARTIAL |
| 12 | DATA_LOAD_JOB | 커넥터 sync/ingest | `ChannelSync.php`·cron | PARTIAL-informal |
| 13 | DATA_STORAGE_METRIC | 부재(형식) | — | ABSENT |
| 14 | DATA_ARCHIVE_JOB | media_gc seed | (운영 cron) | PARTIAL-informal |
| 15 | DATA_RECOVERY_JOB | 부재 | — | ABSENT |

## §6~§16 표준 판정
- **§6 Zone(5)**: Raw/Object/Immutable=`MediaHost`(sha256) 실재. **Standardized/Curated/AI Feature/Archive=ABSENT**(현행 분석은 MySQL 집계 `Rollup`/`Pnl`/`DataPlatform`로 Curated 대체).
- **§7 데이터 유형(14)**: CSV/JSON/Image(MediaHost) 실재·**Parquet/ORC/Avro=ABSENT**(컬럼너 없음)·Audio/Video/Event Stream=부분/부재.
- **§8 Ingestion(6)**: Batch/API Import/File Upload=`ChannelSync`/`DataPlatform`/`MediaHost` 실재·**Streaming/CDC/Event Subscription=ABSENT**.
- **§9 Partition**: Tenant=`tenant_id`(Part 001) 실재·Region/Domain/Year/Month/Day=ABSENT.
- **§10 File Format**: CSV/JSON·**Parquet/ORC/압축=ABSENT**.
- **§11 Retention**: media_gc/log seed·형식 Retention Manager=ABSENT.
- **§12 Security**: AES-256=`Crypto`·Immutable=`MediaHost`/`SecurityAudit`·Access Log=`SecurityAudit`·Object Versioning(형식)=ABSENT.
- **§13 Runtime**: Tenant 분리=`Db.php`·Raw 불변=`MediaHost`. Metadata/Version/Encryption 강제=순신설.
- **§14 API(8)**: Upload/Download=`MediaHost`(store/serve) seed·나머지 ABSENT.
- **§16 AI**: 품질/이상=`DataPlatform`/`AnomalyDetection`·Raw 수정불가=`MediaHost`(헌법 V3). Metadata/분류/추천=순신설.

## 판정
**PARTIAL-strong(§3·§10=MediaHost object/version) / PARTIAL(§2·§4~6·§9·§11·§12·§14 seed) / ABSENT-aspirational(§1·§7·§8·§13·§15=Data Lake/Storage Policy/Compression/Metric/Recovery·4 Zone/Parquet/CDC).** 코드 0. ★Part 001 상속(재정의 금지)·MediaHost/Crypto/Db/SecurityAudit 재사용·형식 Data Lake/Zone/Parquet는 오브젝트스토리지/빅데이터 인프라 전제(조기구현 금지).
