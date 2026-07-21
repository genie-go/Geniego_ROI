# MEA Part 015 — Enterprise KPI Management Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 013(ROI Foundation)+Part 014(Calc Engine)+Data Platform(Part 001~012)**을 상속·확장하며 재정의하지 않는다(Golden Rule=Extend). Part 003 EDW KPI/Part 013 ROI KPI(값 SSOT)·Part 004 Metadata·Part 006 DQM·Part 008 Certification(Trust First)을 준수·인용한다. ★**KPI 값 SSOT는 이미 실재**(GT①)·본 Part는 형식 metadata-driven KPI Registry 계층만 추가(값 재계산 없이). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
모든 KPI를 중앙에서 정의·관리·측정·검증·배포하는 표준. ROI Calculation Engine/Dashboard/AI/Warehouse/Analytics에서 사용하는 KPI의 유일 기준(SSOT).

## §2 구현 범위
Enterprise KPI Registry · KPI Governance · KPI Calculation · KPI Lifecycle/Hierarchy/Dependency · KPI Version Management · KPI Certification · KPI Monitoring · KPI AI Intelligence.

## §3 구현 목표 (10)
KPI Registry · KPI Repository · KPI Governance Engine · KPI Dependency Manager · KPI Version Manager · KPI Certification Manager · KPI Monitoring Engine · KPI Dashboard Service · KPI Audit Service · KPI AI Recommendation Engine.

## §4 아키텍처 원칙 (10)
KPI Single Source of Truth · Business First · Explainable KPI · Metadata Driven · Version Controlled · Reusable Metrics · Hierarchical KPI · Event Driven · AI Assisted · Enterprise Standard.

## §5 Canonical Entity (15)
KPI · KPI_CATEGORY · KPI_GROUP · KPI_FORMULA · KPI_TARGET · KPI_THRESHOLD · KPI_BASELINE · KPI_DEPENDENCY · KPI_VERSION · KPI_CERTIFICATION · KPI_OWNER · KPI_SCORE · KPI_STATUS · KPI_AUDIT · KPI_REPORT. → 상세 = `MEA_PART015_CANONICAL_ENTITIES.md`.

## §6 KPI Domain (12)
Executive/Financial/Marketing/Sales/Commerce/Logistics/Customer/Product/AI/Operations/Organization/ROI KPI. → ★현행 매핑=Financial=`Pnl`·Marketing=`Mmm`/`Attribution`·Commerce=`OrderHub`/`Rollup`·Customer=`CRM`·ROI=`Rollup`(P&L SSOT)·Part 013 정합.

## §7 KPI Lifecycle (7)
Draft→Review→Approval→Published→Active→Deprecated→Archived. Published 이전 운영 사용 금지. → ★현행=변경 게이트(`CHANGE_GATE`)+PM 승인·Published 게이트=Trust First(READY만·Part 008). 형식 Lifecycle Manager=ABSENT.

## §8 KPI Hierarchy (5)
Enterprise/Business Unit/Department/Team/Individual KPI. 상위=하위 집계. → ★현행=`Rollup`(Enterprise KPI가 채널/기간 집계·GROUP BY)=계층 집계 seed. 형식 KPI Hierarchy Manager=ABSENT.

## §9 KPI Dependency (8)
KPI→KPI/Metric/Dataset/Dashboard/ROI Model/AI Model/Business Goal/Financial Metric. Dependency 변경=영향도 분석. → ★현행=무후퇴 value unification(KPI→Metric 값 동기화 인식·[[feedback_no_regression_value_unification]])+`DataPlatform` lineage(Part 007)·Business Goal=목표퍼널(objective). 형식 Dependency Graph Manager=ABSENT.

## §10 KPI Certification (5등급)
Enterprise/Business/Department Certified · Experimental · Deprecated. **Enterprise Certified만 공식 보고서·ROI 기본 지표.** → ★★현행 정합: NOT_CERTIFIED 라벨·`docs/IMPLEMENTATION_STATUS.md`·★"Certified만 ROI 사용"=**헌법 V3 Trust First(READY만·Part 006/008)**. 형식 Certification Manager=ABSENT.

## §11 KPI Monitoring (10)
Current Value/Target Achievement/Trend/Threshold Violation/Forecast/Growth Rate/Alert Count/Data Freshness/Quality Score/Last Update. → ★현행=Current Value=`Rollup`/`Pnl`·★Threshold Violation/Alert=`Alerting.php`(alert_policy)·Quality Score=`DataPlatform`(DataTrust·Part 006)·Data Freshness=`DataPlatform` lineage·Forecast=`Mmm`(frontier). 형식 Monitoring Engine=부분.

## §12 Data Security
Tenant Isolation · RBAC · KPI Formula Protection · Audit Logging · Version Protection · Financial KPI Masking. → ★Part 001~014 상속: Tenant=`Db.php`·RBAC=`index.php`·Formula Protection=git+G2 sacred SHA+`CHANGE_GATE`·Audit=`SecurityAudit`·Masking=`ChannelCreds`.

## §13 Runtime 규칙
KPI Version 검증 · Certification 검증 · Formula 검증 · Dependency 확인 · Threshold 평가 · Audit. → ★Certification 검증=Trust First(Part 006/008)·Threshold 평가=`Alerting`·Audit=`SecurityAudit`·KPI 값=`Rollup`/`Pnl` SSOT. Version/Formula/Dependency 검증(형식)=순신설.

## §14 API 표준 (8)
Register/Update/Publish/Query KPI · Query KPI Dependency · Validate KPI · Compare KPI Version · Get KPI Dashboard. → ★Query KPI=`Rollup`/`Pnl`/`Attribution` API seed(실재)·나머지 ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
KPIRegistered · KPIUpdated · KPIPublished · KPICertified · KPIThresholdExceeded · KPIForecastGenerated · KPIAudited · KPIArchived. → ABSENT(event-driven 부재·Data Platform §15 정합·`Alerting` threshold=KPIThresholdExceeded seed).

## §16 AI Integration
KPI 추천 · KPI 이상 탐지 · 영향도 분석 · KPI Forecast · 계층 최적화 · Threshold 자동 추천 · 품질 분석 · **KPI Explainability** **만**·KPI 직접 생성/수정/승인 불가. → ★KPI 이상=`AnomalyDetection`·Explainability=헌법 V4·Forecast=`Mmm`·품질=`DataPlatform`(DataTrust)·직접 생성/수정/승인 불가=헌법 V3+`CHANGE_GATE`. KPI/Threshold 추천=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
KPI 조회 ≤200ms · KPI 계산 ≤300ms · Dashboard ≤2초 · Forecast ≤3초 · Availability ≥99.99%. (벤치 대상 미존재·현행 `Rollup` 사전집계 seed.)

## §18 Completion Criteria
KPI Registry·Governance·Hierarchy·Dependency·Certification·Monitoring·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 metadata-driven KPI Registry/Hierarchy/Dependency/Version/Certification Manager ABSENT·코드 0). ★단 KPI 값 SSOT·거버넌스·Certification(Trust First)·Monitoring(Alerting)은 실 강함.

## 판정
**PARTIAL-strong(★KPI 값 SSOT=Rollup/Pnl/Attribution/CRM/Mmm·KPI 도메인 실 핸들러·Certification=Trust First(READY만)·Monitoring/Threshold=Alerting·Governance=무후퇴/CHANGE_GATE·Hierarchy 집계=Rollup·Dependency=무후퇴/lineage·Explainable=헌법 V4·Quality=DataTrust) / ABSENT-formal(형식 metadata-driven KPI Registry·KPI Repository·Governance/Dependency/Version/Certification/Hierarchy Manager).** ★핵심=KPI **값**은 이미 서버 SSOT(제품 핵심·무후퇴 단일소스)·인증 게이트(Trust First)·모니터링(Alerting)은 실재이나 형식 metadata-driven KPI Registry는 부재(코드 내재·Part 003/013 동일 판정). Part 013/014/Data Platform 상속(재정의 금지)·★중복 KPI 계산 절대 금지(값 분산=회귀)·마케팅 AI KEEP_SEPARATE·AI KPI 직접생성/수정/승인 불가(V3+CHANGE_GATE). 코드 변경 0.

## 다음
MEA Part 016 — Enterprise Profit Intelligence Engine Architecture(본 KPI Management 상속·확장).
