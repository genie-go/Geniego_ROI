# ADR — MEA Part 010 Enterprise ETL / ELT Processing Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part010 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 010은 ETL/ELT. GeniegoROI는 형식 ETL 엔진(Airflow/dbt/Spark)·Pipeline Orchestrator/DAG가 부재하나, E-T-L 처리 자체는 실재 — 커넥터(Extract: `Connectors`/`ChannelSync`)→정규화(Transform: `ChannelSync` 표준모델 정규화·`EventNorm`·`DataPlatform` 정규화규칙)→DB(Load)→집계(`Rollup` GROUP BY). 스케줄은 cron+`deploy.ps1`(gen_chatbot_knowledge→i18n_autofill×4→vite build=빌드 파이프라인). 단 Transformation이 명령형 핸들러 코드이지 "Pipeline as Code" 메타데이터 엔진 아님. 본 Part는 Part 001~009 상속(재정의 금지).

## 결정
- **D-1 (Part 001~009·헌법 상속·재정의 금지):** Ingestion/Cleansing(Part 002)·Aggregation(Part 003 Rollup)·Validation(Part 006 DQM)·CDC/Sync(Part 009)를 준수·인용. Pipeline 유형(§6)=Part 002~009 매핑(KPI/ROI=Part 003·Master Data=Part 005·CDC=Part 009). 중복 정의 금지.
- **D-2 (Transformation = ChannelSync/Rollup/EventNorm/DataPlatform 승격):** Normalization/Standardization=`ChannelSync`(표준모델 정규화)·`EventNorm`(이벤트 정규화)·`DataPlatform`(정규화규칙). Aggregation=`Rollup`(Part 003·중복 KPI 계산 절대 금지). 형식 재사용 Transformation Engine은 이 로직 위에(중복 정규화/집계 재구현 금지).
- **D-3 (Extract/Load = 커넥터/DB 재사용):** Extract=`Connectors`/`ChannelSync`(외부 채널 fetch·SSRF 가드=`Ssrf`)·Load=DB(`Db.php`). CDC Pipeline=Part 009. 중복 커넥터/적재 로직 금지.
- **D-4 (Scheduling/Version/Approval = cron·git·CHANGE_GATE 재사용):** Scheduling=cron+`deploy.ps1`(빌드 파이프라인 seed·Dependency 순서). Version=git+API 버전(삭제 금지). Pipeline Approval=`CHANGE_GATE`+배포 승인([[feedback_deploy_approval_mandatory]]). 형식 Orchestrator/Scheduler=순신설(DAG는 이벤트 버스/스트리밍 전제).
- **D-5 (형식 ETL Engine/Streaming/DLQ = ABSENT·조기구현 금지·AI 제약):** 형식 ETL/ELT Engine·Pipeline Orchestrator/DAG·Streaming ETL·Dead Letter Queue·Pipeline Repository/Template는 빅데이터/스트리밍 인프라 전제라 부재. 조기구현 금지(블라인드 스켈레톤 방지). Error Handling(Retry=`recoveryThrottle`·Rollback=.bak·Alert=`Alerting`). AI(오류/병목 분석)=`AnomalyDetection`·운영 Pipeline 직접수정/배포 불가=헌법 V3+배포 승인. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~009/헌법 상속·재정의 금지·ChannelSync/Rollup/EventNorm/DataPlatform(Transform)·커넥터/DB(E/L)·cron/deploy.ps1(Schedule)·git/CHANGE_GATE(Version/Approval) 재사용·형식 ETL Engine/Orchestrator/재사용 Transform 컴포넌트만 신설(조기구현 금지). 실행은 선행 Part 001~009 종속.
