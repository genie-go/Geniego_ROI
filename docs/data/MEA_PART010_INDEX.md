# MEA Part 010 — Index (Enterprise ETL / ELT Processing Architecture)

> **거버넌스 상태**: 설계 명세 인덱스 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).

Master Enterprise Architecture Part 010 (ETL/ELT Processing) 산출 문서 색인. ★MEA Part 001~009 상속·확장(재정의 금지).

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/MEA_PART010_ETL_ELT_PROCESSING_ARCHITECTURE_SPEC.md` | canonical SPEC v1.0(§1~§18) |
| `docs/architecture/ADR_MEA_ETL_ELT_PROCESSING_ARCHITECTURE.md` | 설계 결정(D-1~D-5·Part 001~009 상속·ChannelSync/Rollup Transform 승격) |
| `docs/data/MEA_PART010_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `docs/data/MEA_PART010_DUPLICATE_AUDIT.md` | GT② 정규화/집계/커넥터·Part 002/003/006/009 중복 경계 |
| `docs/data/MEA_PART010_CANONICAL_ENTITIES.md` | §5 15 엔티티 + §6~16 Pipeline/Transformation 판정 |
| `docs/data/MEA_PART010_GOVERNANCE_MECHANISMS.md` | §10~18 Error/Version/Security/Runtime/API/Event/AI |
| `docs/data/MEA_PART010_INDEX.md` | 본 색인 |

## 판정 요약
- **★PARTIAL substrate(E-T-L 처리·정규화/집계 실재):** ★Transformation(Normalize/Standardize)=`ChannelSync.php`(표준모델 정규화)·`EventNorm.php`(이벤트 정규화)·`DataPlatform.php`(정규화규칙) · Transformation(Aggregation)=`Rollup.php`(GROUP BY·Part 003) · Extract=`Connectors`/`ChannelSync`(외부 채널 fetch) · Load=DB(`Db.php`) · Scheduling=서버 cron + ★`deploy.ps1`(gen_chatbot_knowledge→i18n_autofill×4→vite build=빌드 파이프라인 Dependency seed) · Validation=Part 006 DQM(Trust First) · Error=`recoveryThrottle`/`Alerting` · Version=git(삭제 금지) · Approval=`CHANGE_GATE`+배포 승인 · Audit=`SecurityAudit`.
- **ABSENT-formal(형식 ETL 엔진/오케스트레이터 greenfield):** Enterprise ETL/ELT Engine(형식) · **Pipeline Orchestrator/DAG** · **재사용 Transformation Engine**(컴포넌트) · **Job Scheduler**(형식) · **Streaming ETL** · **Dead Letter Queue** · **Pipeline Repository/Template** · Monitoring Dashboard · Recovery Manager · Event 표준(PipelineCreated 등).
- **★핵심:** E-T-L 처리(커넥터 extract→ChannelSync/EventNorm/DataPlatform 정규화 transform→DB load→Rollup aggregate)는 실재하나 **명령형 핸들러 코드 + cron/deploy.ps1**이지 "Pipeline as Code" 메타데이터 ETL 엔진·DAG 오케스트레이터·재사용 Transformation 컴포넌트 아님. 형식 ETL 엔진만 신설.
- **★재사용(중복 신설 절대 금지):** `ChannelSync`/`EventNorm`/`DataPlatform`(정규화)·`Rollup`(집계·★중복 KPI 계산 절대 금지=값 분산=회귀)·커넥터(Extract)·`Db.php`(Load)·cron/`deploy.ps1`(Schedule)·Part 006(Validation)·`SecurityAudit`(Audit). Part 002 Ingestion·Part 003 Aggregation·Part 006 Validation·Part 009 CDC·헌법 재정의 금지. AI=운영 Pipeline 직접수정/배포 불가(V3+배포 승인)·마케팅 AI KEEP_SEPARATE.
- **★교훈:** [[feedback_no_regression_value_unification]](Aggregation 중복 KPI 계산 금지=값 분산=회귀) · Part 002/006(Normalization=ChannelSync 표준모델·중복 정규화 금지) · [[feedback_deploy_approval_mandatory]](운영 Pipeline 배포 승인) · [[reference_platform_growth_actas_tenant_hijack]](Cross-Tenant Pipeline Leakage) · [[reference_menu_audit_log_not_tamper_evident]](Pipeline Audit 정본=SecurityAudit::verify).
- **코드 변경 0 · NOT_CERTIFIED**(선행 Part 001~009 + 형식 ETL 엔진 신설).

## 다음
MEA Part 011 — Enterprise Data Integration & API Exchange Architecture(본 ETL 상속·확장·중복 정의 금지).
