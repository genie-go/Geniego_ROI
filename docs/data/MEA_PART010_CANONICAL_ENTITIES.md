# MEA Part 010 — Canonical Entities Design & Judgment (§5~§16)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★ChannelSync/EventNorm/DataPlatform/Rollup·커넥터·cron/deploy.ps1 재사용·형식 ETL 엔진 greenfield·Part 001~009 상속.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | ETL_PIPELINE | 커넥터 sync 흐름(비형식) | `ChannelSync.php` | PARTIAL(형식 파이프라인 아님) |
| 2 | ELT_PIPELINE | Load 후 Rollup 집계 | `Rollup.php` | PARTIAL |
| 3 | PIPELINE_STAGE | E/T/L 단계(핸들러 내재) | `Connectors`/`ChannelSync`/`Rollup` | PARTIAL |
| 4 | TRANSFORMATION_RULE | ★정규화규칙·표준모델 | `ChannelSync.php`·`EventNorm.php`·`DataPlatform.php` | PARTIAL-strong(로직) |
| 5 | DATA_MAPPING | 채널→표준모델 매핑 | `ChannelSync.php` | PARTIAL |
| 6 | PIPELINE_JOB | 커넥터 sync job·cron | `ChannelSync.php`·cron | PARTIAL |
| 7 | EXECUTION_LOG | sync 로그·감사 | `SecurityAudit.php`·sync 로그 | PARTIAL |
| 8 | PIPELINE_VERSION | git·API 버전 | git | PARTIAL-informal |
| 9 | PIPELINE_TEMPLATE | 부재(재사용 컴포넌트) | — | ABSENT |
| 10 | PIPELINE_PARAMETER | 핸들러 파라미터(비형식) | 핸들러 | PARTIAL |
| 11 | PIPELINE_SCHEDULE | cron·빌드 파이프라인 | 서버 cron·`deploy.ps1` | PARTIAL |
| 12 | PIPELINE_DEPENDENCY | deploy.ps1 순서(Dependency) | `deploy.ps1` | PARTIAL-seed |
| 13 | PIPELINE_STATUS | sync 상태 | `ChannelSync.php` | PARTIAL |
| 14 | PIPELINE_METRIC | 부재(형식) | — | ABSENT |
| 15 | PIPELINE_AUDIT | 해시체인 감사 | `SecurityAudit.php` | PARTIAL-strong |

## §6~§16 표준 판정
- **§6 Pipeline 유형(10)**: Batch ETL=`ChannelSync`·KPI/ROI=`Rollup`/`Attribution`(Part 003)·Master Data=Part 005·CDC=Part 009. Streaming ETL/AI Feature=미래.
- **§7 Transformation(10)**: Normalization/Standardization=`ChannelSync`/`EventNorm`/`DataPlatform`·Aggregation=`Rollup`·Merge=Part 005 dedup. 재사용 컴포넌트/형식 Engine=ABSENT.
- **§8 Scheduling(6)**: Cron·API Trigger·`deploy.ps1`(빌드 파이프라인 Dependency)·Event/Streaming=Part 009 미래.
- **§9 Validation(8)**: Part 006 DQM 정합(Trust First·Quality Score·Duplicate=dedup).
- **§10 Error Handling**: Retry=`recoveryThrottle`·Rollback=.bak·Alert=`Alerting`·DLQ=ABSENT.
- **§11 Version**: git·삭제 금지·Approval=CHANGE_GATE·형식 Version Manager=ABSENT.
- **§12 Security**: Secret=`Crypto`·Tenant/RBAC/Audit·Pipeline Approval=배포 승인. Part 001~009 상속.
- **§16 AI**: 오류/이상=`AnomalyDetection`·직접수정/배포 불가=헌법 V3+배포 승인. 추천=순신설. 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§4·§15=Transformation Rule/Pipeline Audit) / PARTIAL(§1~3·§5~8·§10~13) / ABSENT-formal(§9 template·§14=Pipeline Template/Metric·형식 ETL Engine/Orchestrator/재사용 Transform 컴포넌트).** 코드 0. ★ChannelSync/EventNorm/DataPlatform/Rollup(Transform)·커넥터(Extract)·Db(Load)·cron/deploy.ps1(Schedule) 재사용(★중복 정규화/KPI 계산/커넥터 절대 금지)·형식 ETL 엔진/Orchestrator 신설·Part 001~009 상속·AI 운영 Pipeline 직접수정/배포 불가(V3+배포 승인).
