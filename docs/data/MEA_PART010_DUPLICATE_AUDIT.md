# MEA Part 010 — Ground-Truth ② Duplicate Implementation Audit

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = ETL/ELT 신설이 기존 정규화/집계/커넥터·Part 001~009와 중복 재정의하지 않도록 경계 확정.

## ★상위 Part/규범 중복 — 재정의 금지
| MEA 개념 | 상위 Part/규범 | 판정 |
|---|---|---|
| Ingestion/Cleansing(Normalize) | ★MEA Part 002 Data Lake·Part 006 Cleansing | ★재정의 금지·재사용 |
| Aggregation(KPI/ROI) | ★MEA Part 003 EDW(`Rollup`) | ★재정의 금지·재사용(중복 KPI 계산 금지) |
| Validation | MEA Part 006 DQM | 참조·재사용 |
| CDC/Sync Pipeline | MEA Part 009 | 참조·재사용 |
| Master Data Pipeline | MEA Part 005 MDM | 참조 |

## ★동음이의(코드베이스) — 재사용 vs 오흡수
| MEA 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Transformation(Normalize) | 표준모델 정규화·이벤트 정규화 | `ChannelSync.php`·`EventNorm.php`·`DataPlatform.php` | ★재사용(중복 정규화 재구현 금지) |
| Transformation(Aggregate) | 집계 | `Rollup.php` | ★재사용(중복 KPI 계산 절대 금지·값 분산=회귀) |
| Extract/Load | 커넥터/DB | `Connectors`·`ChannelSync`·`Db.php` | 재사용 |
| Scheduling | cron·빌드 파이프라인 | 서버 cron·`deploy.ps1` | 재사용 |
| Error Handling | Retry/Alert | `recoveryThrottle`·`Alerting.php` | 재사용 |
| Approval/Version | 게이트·git | `CHANGE_GATE.md`·git | 재사용 |
| Audit | 해시체인 | `SecurityAudit.php` | 재사용 |

## ★교훈 반영
- [[feedback_no_regression_value_unification]]: Aggregation(KPI) 중복 계산 금지=값 분산=회귀(Part 003).
- Part 002/006: Normalization/Cleansing=ChannelSync 표준모델(중복 정규화 금지).
- [[feedback_deploy_approval_mandatory]]: Pipeline(운영 배포)=배포 승인 필수.
- [[reference_platform_growth_actas_tenant_hijack]]: Cross-Tenant Pipeline Leakage·Tenant Isolation.
- [[reference_menu_audit_log_not_tamper_evident]]: Pipeline Audit 정본 = `SecurityAudit::verify`만.

## 확장 대상(중복 신설 금지·기존 승격)
- Transform=`ChannelSync`/`EventNorm`/`DataPlatform`(정규화)+`Rollup`(집계) 승격. Extract=커넥터. Load=`Db.php`. Schedule=cron/deploy.ps1. Validation=Part 006. Audit=`SecurityAudit`.

## 판정
**중복 위험 최상(정규화/집계/커넥터 실재·Part 002/003/006/009 중첩).** ★핵심=`ChannelSync`/`EventNorm`/`DataPlatform`(정규화)·`Rollup`(집계)·커넥터(Extract)·`Db.php`(Load)·cron/`deploy.ps1`(Schedule)은 **재사용/승격**(★중복 정규화/KPI 계산/커넥터/적재 로직 신설 절대 금지). Part 002 Ingestion·Part 003 Aggregation·Part 006 Validation·Part 009 CDC·헌법 **재정의 금지**. 본 Part 고유 순신설=형식 ETL/ELT Engine·Pipeline Orchestrator/DAG·재사용 Transformation 컴포넌트·Job Scheduler·Streaming ETL·DLQ·Pipeline Repository/Template뿐. 마케팅 AI KEEP_SEPARATE·AI 운영 Pipeline 직접수정/배포 불가(V3+배포 승인).
