# ADR — MEA Part 002 Enterprise Data Lake Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part002 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 002는 Data Lake(중앙 저장소). 그러나 GeniegoROI는 **단일 호스트 PHP/MySQL+SQLite** 앱으로 오브젝트 스토리지(S3)·빅데이터(Parquet/Spark)·데이터 레이크 zone·CDC·Feature Store 인프라가 전무하다. 유일 실 seed = `MediaHost`(sha256 content-addressed 불변 파일 저장). 따라서 형식 Data Lake는 대부분 aspirational. 본 Part는 MEA Part 001 상속(재정의 금지).

## 결정
- **D-1 (MEA Part 001 상속·재정의 금지):** DATA_DOMAIN/CLASSIFICATION/OWNERSHIP/표준필드(tenant_id 등)/데이터 헌법 6볼륨/`DATA_ARCHITECTURE.md`는 Part 001 정의를 준수·인용. Data Lake는 그 위의 저장 계층만 추가(중복 정의 금지).
- **D-2 (Raw Zone/Object Storage = MediaHost 승격):** Immutable Raw Data/Store Once/Object Storage = `MediaHost.php`(dataURL→sha256 내용주소·`/api/media/{sha}.{ext}`·수정 불가=해시 불변). 형식 Raw Zone/Object Store는 이 위에 신설(중복 파일저장 신설 금지). Object Versioning=content-addressed(해시=버전) seed.
- **D-3 (Standardized/Curated/AI Feature/Archive Zone = ABSENT-aspirational·조기구현 금지):** 4 Zone·Parquet/ORC/Avro 컬럼너·Feature Store·CDC/Streaming·Partition/Compression Manager는 오브젝트스토리지/빅데이터 인프라 전제라 부재. 인프라 없이 조기구현 금지(블라인드 스켈레톤 방지). 현행 분석은 MySQL 집계(`Rollup`/`Pnl`/`DataPlatform`)로 수행(Curated 대체).
- **D-4 (Security/Immutable = Part 001 자산 재사용):** AES-256=`Crypto`·TLS=nginx·Immutable=`MediaHost`(sha256)/`SecurityAudit`·Access Logging=`SecurityAudit`·Tenant partition=`Db.php`(`tenant_id`·[[reference_platform_growth_actas_tenant_hijack]]). 중복 암호/감사/격리 신설 금지.
- **D-5 (Ingestion/Retention/AI = 기존 승격):** Ingestion(Batch/API/File)=`ChannelSync`/`DataPlatform`/`MediaHost` 승격(Streaming/CDC=미래). Retention=media_gc/log retention seed. AI(품질/이상)=`DataPlatform`(DataTrust)/`AnomalyDetection`·Raw 수정불가=`MediaHost` content-addressed(헌법 V3 수집≠사용). 중복 AI 엔진 금지(V3 난립금지).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001/헌법/DATA_ARCHITECTURE 상속·재정의 금지·MediaHost가 유일 Object/Raw seed·형식 Data Lake는 오브젝트스토리지/빅데이터 인프라 전제(조기구현 금지). 실행은 선행 Part 001 + 저장 인프라 종속(대부분 aspirational).
