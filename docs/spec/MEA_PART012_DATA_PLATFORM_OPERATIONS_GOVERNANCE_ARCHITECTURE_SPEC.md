# MEA Part 012 — Enterprise Data Platform Operations & Governance Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세(★Data Platform 캡스톤·Part 001~012 완성) · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속(필수)**: 본 Part는 **MEA Part 001~011 전체**의 운영·거버넌스를 통합하며 재정의하지 않는다(Golden Rule=Extend). Part 001~011·데이터 헌법 6볼륨·`docs/CONSTITUTION.md`·`CHANGE_GATE.md`를 준수·인용한다. file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
Enterprise Data Platform 전체의 운영·거버넌스·변경관리·성능·장애·지속개선 표준. Data Platform 운영 기준(Single Operational Standard) — Lake/Warehouse/Metadata/MDM/DQM/Lineage/Catalog/CDC/ETL/Integration의 운영 정책 통합 관리.

## §2 구현 범위
Enterprise Data Operations · Data/Operational Governance · Capacity/Performance/Change/Incident/Problem/SLA Management · Continuous Improvement.

## §3 구현 목표 (10)
Data Operations Center · Governance Center · Operational Dashboard · SLA/Capacity/Change/Incident/Problem/Performance Manager · Continuous Improvement Manager.

## §4 아키텍처 원칙 (10)
Operational Excellence · Governance First · Automation First · Observability by Default · Policy Driven · Continuous Improvement · High Availability · Enterprise Standard · AI Assisted Operations · Zero Trust Operations.

## §5 Canonical Entity (15)
DATA_OPERATION · OPERATION_POLICY · GOVERNANCE_POLICY · SLA_POLICY · INCIDENT · PROBLEM · CHANGE_REQUEST · RELEASE · MAINTENANCE_WINDOW · PERFORMANCE_METRIC · CAPACITY_PLAN · OPERATION_{AUDIT·REPORT·ALERT} · IMPROVEMENT_PLAN. → 상세 = `MEA_PART012_CANONICAL_ENTITIES.md`.

## §6 운영 대상 (14)
Data Lake · Data Warehouse · Metadata · Master Data · Data Quality · Data Lineage · Data Catalog · CDC · ETL/ELT · Integration Platform · API Exchange · Storage · Monitoring · Backup. → ★MEA Part 002~011 전체(각 Part 운영 정책 상속).

## §7 운영 정책
24×365 · 무중단 배포 우선 · 자동 장애 감지 · 자동 복구 우선 · 변경 승인 필수 · 운영 이력 보존 · KPI 기반. → ★현행=무중단 배포(dist swap `rsync -a --delete`·fpm reload)·변경 승인 필수(`CHANGE_GATE`·[[feedback_deploy_approval_mandatory]])·운영 이력=`SecurityAudit`+`docs/registry/ChangeHistory.md`·장애 감지=`Alerting`/`AnomalyDetection`.

## §8 SLA 관리 (8)
Availability · Response Time · Recovery/Point Time · Throughput · Data Freshness · Job Success Rate · API Availability. → ★현행=Availability(health check)·Data Freshness(`DataPlatform` lineage 신선도)·Job Success(커넥터 sync 상태)·API Availability(health). 형식 SLA Manager(측정/보고)=ABSENT.

## §9 Change Management (8단계)
변경 요청→영향도 분석→승인→테스트→배포→검증→모니터링→종료. 긴급 변경도 감사. → ★★실 substrate 강함 — 이번 세션 프로세스와 정확히 대응: 영향도=`CHANGE_GATE`(변경 전 게이트·재구현금지·무후퇴)·승인=배포 승인 필수·테스트=php -l/빌드·배포=안전배포(out-of-band SHA→backup `.bak`→pscp→chown→post-deploy SHA byte-match→fpm reload)·검증=health 200/fatal 0·모니터링=`Alerting`·이력=git+`SecurityAudit`+`ChangeHistory.md`. 형식 Change Manager=ABSENT(프로세스는 실재).

## §10 Incident Management (8단계)
탐지→분류→우선순위→담당자→복구→원인분석→재발방지→종료. Problem 연결. → ★현행=탐지=`Alerting`/`AnomalyDetection`·이력=`docs/BUGS_TRACKING.md`/`PM_CURRENT_STATUS.md`·원인분석=감사 오탐 레지스트리([[reference_audit_false_positives]])·복구=배포 롤백(.bak). 형식 Incident/Problem Manager=ABSENT.

## §11 Capacity Management (8)
Storage/Compute/Memory/Network/Pipeline/API/Streaming/Backup Capacity. 예측 확장. → ★현행=Compute/Memory=★php-fpm pool 튜닝(max_children·별도 pool+소켓·[[reference_phpfpm_pool_tuning_502]])·Storage=dist.bak 정리·FS 모니터. 형식 Capacity Manager(예측)=ABSENT.

## §12 Data Security
Tenant Isolation · RBAC · MFA · Encryption · Audit Logging · Secret Management · Backup Encryption · Policy Enforcement. → ★Part 001~011 상속: Tenant=`Db.php`·RBAC=`index.php`·MFA=`UserAuth`(OTP·289차후속 fail-closed)·Encryption/Secret=`Crypto`·Audit=`SecurityAudit`·Policy Enforcement=writeGuard(289차).

## §13 Runtime 규칙
SLA 지속 측정 · 정책 위반 감지 · 자동 Alert · 변경 이력 기록 · 운영 KPI 계산 · 감사 로그. → ★정책 위반 감지=`Alerting`/writeGuard·변경 이력=`SecurityAudit`·운영 KPI=`Rollup`(Part 003)·감사=`SecurityAudit`. SLA 지속 측정=순신설(형식 SLA Manager 후).

## §14 API 표준 (8)
Query Operations · Register Change · Query Incident · Update SLA · Query Capacity/Performance · Register Maintenance · Generate Operations Report. → ★Register Change=`CHANGE_GATE`+git seed·Query Incident=`BUGS_TRACKING`/`Alerting`. 형식 Ops API=ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
OperationStarted/Completed · SLAThresholdExceeded · IncidentDetected · ProblemCreated · ChangeApproved · CapacityExceeded · ImprovementRegistered. → ABSENT(event-driven 부재·Part 001~011 정합·`Alerting` threshold=SLA/Capacity Exceeded seed).

## §16 AI Integration
장애/Capacity/SLA 위반 예측 · Root Cause 추천 · 운영 최적화 · 자동 운영 보고서 · 이상 패턴 탐지 · 유지보수 시점 추천 **만**·운영 정책 직접 변경/승인 불가. → ★이상 패턴=`AnomalyDetection`·Root Cause=감사 오탐 레지스트리. ★운영 정책 직접 변경/승인 불가=헌법 V3+배포 승인. 예측/보고서=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
운영 대시보드 ≤2초 · Alert ≤5초 · SLA 계산 ≤1초 · Incident 등록 ≤1초 · 자동 복구 ≤30초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
Data Operations Center·Governance·SLA/Change/Incident/Problem/Capacity Management·Security·Runtime·API/Event·AI Operations 구현. → **현재 미충족**(형식 ITIL Ops Center/SLA/Incident/Capacity Manager ABSENT·코드 0). ★단 Change Management 프로세스(CHANGE_GATE+안전배포)·거버넌스(CONSTITUTION/registry)·Incident(Alerting)·Capacity(php-fpm 튜닝)는 실 강함.

## 판정
**PARTIAL(★Change Management 프로세스=CHANGE_GATE+배포 승인+안전배포 패턴·Governance=CONSTITUTION/registry(ChangeHistory/DecisionLog/AuditHistory)·Incident=Alerting/AnomalyDetection/BUGS_TRACKING·Capacity=php-fpm pool 튜닝·Security=MFA/RBAC/Crypto/writeGuard·Audit=SecurityAudit·무중단 배포) / ABSENT-formal(형식 ITIL Data Operations Center·SLA/Capacity/Change/Incident/Problem/Performance Manager·Operational Dashboard·Event 표준).** ★핵심=운영/변경/거버넌스 **프로세스**는 실 강함(세션 워크플로우와 대응)이나 형식 ITIL 도구는 부재. ★Data Platform 캡스톤(Part 001~012 완성). Part 001~011 상속(재정의 금지)·마케팅 AI KEEP_SEPARATE·AI 운영 정책 직접변경/승인 불가(V3+배포 승인). 코드 변경 0.

## Data Platform 완료
MEA Part 001~012로 Enterprise Data Platform 기준 아키텍처 완성(설계 명세·코드 0·형식 엔진 구현은 후속·기존 substrate 재사용 원칙).

## 다음
MEA Part 013 — ROI Intelligence Platform Foundation(Data Platform 상속·확장).
