# MEA Part 006 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 Cleansing 정책
공백 제거·형식 표준화·코드 변환·중복 제거·주소/전화/이메일 표준화 · 원본(Raw) 절대 수정 금지.
- 판정 **PARTIAL**. 정규화=`ChannelSync`(표준모델 정규화)·중복 제거=Part 005 dedup(UNIQUE/231차·[[project_n231_dedup_ssot]])·★Raw 절대 수정 금지=Part 002 `MediaHost`(sha256 content-addressed 불변). 형식 Cleansing Engine(주소/전화/이메일 표준화 파이프라인)=순신설.

## §12 Data Security
Tenant Isolation · Encryption · Audit Logging · Rule Version Protection · Approval Workflow · Sensitive Data Masking.
- 판정 **PARTIAL**(Part 001~005 상속). Tenant Isolation=`Db.php`([[reference_platform_growth_actas_tenant_hijack]])·Encryption=`Crypto`·Audit=`SecurityAudit`·Rule Version Protection=pre-commit G2 sacred SHA·Approval=`CHANGE_GATE`·Masking=`ChannelCreds`.

## §13 Runtime 규칙
Validation 통과 데이터만 사용 · Critical 오류 데이터 사용 금지 · Quality Score 계산 · Exception 자동 생성 · Audit 기록.
- 판정 **PARTIAL-strong**(★헌법 V3 정합). "Validation 통과만 사용·Critical 사용 금지"=**Intelligence Readiness BLOCKED·Trust First**(신뢰도 미달=자동화/AI 제외)·안전장치(ROAS실패→광고중지금지)·`index.php` writeGuard. Quality Score 계산=`DataPlatform`(DataTrust)·Exception 자동생성=`AnomalyDetection`·Audit=`SecurityAudit`.

## §14 API 표준 (8)
Validate Data · Execute Quality Rule · Get Quality Score/Data Profile · Register/Update Quality Rule · Query Exceptions · Generate Quality Report.
- **PARTIAL**(단 Get Quality Score=`DataPlatform` DataTrust seed). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Register/Update Rule=admin 게이트.

## §15 Event 표준 (8)
DataValidated · QualityScoreCalculated · ExceptionDetected · DataProfileCompleted · CleansingCompleted · QualityRuleUpdated · QualityThresholdExceeded · QualityReportGenerated.
- **ABSENT**(event-driven 부재·Part 001~005 §15 정합·QualityThresholdExceeded=`Alerting` threshold seed·내부 이벤트버스 후 신설).

## §16 AI Integration
품질 규칙 추천 · 이상 탐지 · 품질 저하 예측 · 자동 정제 제안 · Rule 최적화 · 추세 분석 · Root Cause · 신뢰도 예측 · 직접 수정 금지.
- 판정 **PARTIAL**(헌법 정합). 이상 탐지=`AnomalyDetection`·신뢰도 예측/품질=`DataPlatform`(DataTrust). ★직접 수정 금지(승인/정제 엔진 통해)=데이터 헌법 V3(수집≠사용·신뢰도 낮으면 AI 추천 금지)/V4(근거/신뢰도). 규칙/정제 추천·Root Cause=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §17 성능 요구사항
Validation ≤300ms · Quality Score ≤500ms · Profiling ≤5초 · Exception ≤1초 · Dashboard ≤2초 · Availability ≥99.99%. — 벤치 대상 미존재.

## §18 Completion Criteria
DQ Repository·Validation·Profiling·Quality Score·Exception·Cleansing·Security·Runtime·API/Event·AI 구현.
- **현재 미충족**(형식 Quality Rule/Validation/Profiling/Cleansing/Exception Engine·0-100 등급·Event 표준 ABSENT·코드 0). ★단 헌법 V3 품질/신뢰 프레임워크·DataTrust·Trust First는 실 규범/부분구현.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Runtime(Trust First/Readiness BLOCKED)·Quality Score(DataTrust)·이상탐지(AnomalyDetection)·중복(dedup)·Raw 불변(MediaHost)·Security(tenant/암호/audit/G2)·AI(이상/신뢰도)는 헌법 V3+`DataPlatform`+`AnomalyDetection`+Part 002/005+`Db.php`/`SecurityAudit` 재사용(★중복 품질/신뢰/dedup 엔진 절대 금지), **형식 Quality Rule/Validation/Profiling/Cleansing/Exception Engine·0-100 등급·Report/Dashboard·Event 표준은 순신설(값 재계산 없이)**. 헌법 V3/Part 001~005 재정의 금지. 코드 변경 0.
