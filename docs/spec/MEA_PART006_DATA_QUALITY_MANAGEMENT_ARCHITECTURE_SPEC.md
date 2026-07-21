# MEA Part 006 — Enterprise Data Quality Management (DQM) Architecture · SPEC v1.0

> **거버넌스 상태**: Master Enterprise Architecture 명세 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★**상속·상위규범 정합(필수)**: 본 Part의 최상위 규범 = **데이터 헌법 Volume 3 `docs/DATA_TRUST_QUALITY_CONSTITUTION.md`**(Data Trust Intelligence Engine·수집≠사용·Trust First·Quality/Trust/Confidence Score·Cross Validation·Intelligence Readiness READY/WARNING/BLOCKED). 본 MEA는 이를 **재정의하지 않고 상속·정합**하며, MEA Part 001~005도 상속한다(Golden Rule=Extend·중복 정의 금지). file:line 인용은 GT①②/ADR 등장분만(반날조).

## §1 작업 목적
플랫폼 전반 데이터 품질을 지속 측정·검증·개선·모니터링. 모든 데이터가 AI/Analytics/ROI Engine/App에서 신뢰 가능한 품질 유지. → ★헌법 V3 "수집≠사용(신뢰도 미달=AI/자동화 제외)" 정합.

## §2 구현 범위
Data Quality Framework · Quality Rule Engine · Validation Engine · Profiling Engine · Data Cleansing · Quality Scoring · Exception Management · DQ Dashboard · Continuous Monitoring · AI Quality Recommendation.

## §3 구현 목표 (10)
Data Quality Repository · Quality Rule Manager · Validation Engine · Profiling Engine · Cleansing Engine · Quality Scoring Engine · Exception Manager · Quality Dashboard · Monitoring Service · AI Recommendation Engine.

## §4 아키텍처 원칙 (10)
Quality by Design · Prevention First · Continuous Validation · Measurable Quality · Metadata Driven · Event Driven · Automated Monitoring · AI Assisted · Enterprise Standard · Traceable Quality.

## §5 Canonical Entity (15)
DATA_QUALITY_{RULE·PROFILE·SCORE·AUDIT·REPORT·METRIC} · DATA_VALIDATION_RESULT · DATA_EXCEPTION · DATA_CORRECTION · DATA_PROFILE · DATA_DUPLICATION · DATA_{COMPLETENESS·CONSISTENCY·ACCURACY·TIMELINESS}. → 상세 = `MEA_PART006_CANONICAL_ENTITIES.md`.

## §6 품질 평가 기준 (8)
Accuracy · Completeness · Consistency · Validity · Uniqueness · Timeliness · Integrity · Availability. → ★헌법 V3 Quality/Trust/Confidence Score 정합·`DataPlatform`(DataTrust) seed.

## §7 Validation Rule (10)
Required · Data Type · Length · Range · Pattern · Foreign Key · Business Rule · **Cross Validation** · **Duplicate Check** · Referential Integrity. Rule Version 관리. → ★Cross Validation=헌법 V3(단일채널 불신·다소스 교차)·Duplicate Check=Part 005 dedup(UNIQUE/231차)·Pattern/Type=핸들러 인라인 검증(bounds/regex). 형식 Rule Engine=ABSENT.

## §8 Quality Score
0~100 · Excellent(95+)/Good(90+)/Fair(80+)/Warning(70+)/Critical(<70). AI·KPI 기준. → ★★현행=`DataPlatform`(DataTrust Score)·헌법 V3 Trust/Confidence Score(신뢰도 미달=AI/자동화 제외). ★단 0-100 등급 임계(Excellent~Critical) 형식화=신설(값 재계산 없이).

## §9 Data Profiling (9)
Null 비율 · 중복 비율 · 최대/최소 · 평균 · 표준편차 · 이상치 · 분포 · Cardinality · 변화 추이. → ★이상치=`AnomalyDetection`·중복비율=dedup(Part 005). 형식 Profiling Engine(전 통계)=ABSENT.

## §10 Exception Management (8단계)
탐지→자동분류→우선순위→담당자→수정→재검증→종료→감사. → ★탐지=`AnomalyDetection`·감사=`SecurityAudit`·수정 워크플로우=`CHANGE_GATE`/approvals seed. 형식 Exception Manager=ABSENT.

## §11 Cleansing 정책
공백 제거·형식 표준화·코드 변환·중복 제거·주소/전화/이메일 표준화. **원본(Raw) 절대 수정 금지.** → ★정규화=`ChannelSync`(표준모델 정규화)·중복 제거=Part 005 dedup·Raw 불변=Part 002 `MediaHost`(sha256 content-addressed). 형식 Cleansing Engine=ABSENT.

## §12 Data Security
Tenant Isolation · Encryption · Audit Logging · Rule Version Protection · Approval Workflow · Sensitive Data Masking. → ★Part 001~005 상속: Tenant=`Db.php`·Encryption=`Crypto`·Audit=`SecurityAudit`·Rule Version=G2 sacred SHA·Approval=`CHANGE_GATE`·Masking=ChannelCreds.

## §13 Runtime 규칙
Validation 통과 데이터만 사용 · Critical 오류 데이터 사용 금지 · Quality Score 계산 · Exception 자동 생성 · Audit 기록. → ★★헌법 V3 정합: "Validation 통과만 사용·Critical 사용 금지"=Intelligence Readiness BLOCKED·Trust First(신뢰도 미달=자동화/AI 제외)·안전장치(ROAS실패→광고중지금지). 형식 Quality Score 계산/Exception 자동생성=`DataPlatform`/`AnomalyDetection` 승격.

## §14 API 표준 (8)
Validate Data · Execute Quality Rule · Get Quality Score/Data Profile · Register/Update Quality Rule · Query Exceptions · Generate Quality Report. → ★Get Quality Score=`DataPlatform`(DataTrust) seed·나머지 ABSENT. Part 001 API 표준 상속.

## §15 Event 표준 (8)
DataValidated · QualityScoreCalculated · ExceptionDetected · DataProfileCompleted · CleansingCompleted · QualityRuleUpdated · QualityThresholdExceeded · QualityReportGenerated. → ABSENT(event-driven 부재·Part 001~005 §15 정합·Alerting threshold seed).

## §16 AI Integration
품질 규칙 추천 · 이상 탐지 · 품질 저하 예측 · 자동 정제 제안 · Rule 최적화 · 추세 분석 · Root Cause · 신뢰도 예측 **만**·직접 수정 금지(승인/정제 엔진 통해). → ★이상 탐지=`AnomalyDetection`·신뢰도 예측=`DataPlatform`(DataTrust)·직접수정 금지=헌법 V3. 규칙/정제 추천/Root Cause=순신설. 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## §17 성능 요구사항
Validation ≤300ms · Quality Score ≤500ms · Profiling ≤5초 · Exception ≤1초 · Dashboard ≤2초 · Availability ≥99.99%. (벤치 대상 미존재.)

## §18 Completion Criteria
DQ Repository·Validation·Profiling·Quality Score·Exception·Cleansing·Security·Runtime·API/Event·AI 구현. → **현재 미충족**(형식 Quality Rule/Validation/Profiling/Cleansing/Exception Engine ABSENT·코드 0).

## 판정
**PARTIAL-strong(★헌법 V3 Data Trust Quality 프레임워크=최상위 규범 실재·DataPlatform DataTrust Score·AnomalyDetection·Cross Validation·Trust First 런타임·dedup·ChannelSync 정규화·Raw 불변) / ABSENT-formal(형식 Quality Rule Engine·Validation/Profiling/Cleansing Engine·Exception Manager·0-100 등급·DQ Dashboard).** ★핵심=데이터 품질/신뢰 프레임워크는 헌법 V3+DataTrust로 이미 규범/부분구현 실재(핵심경쟁력)이나 형식 DQ 엔진은 부재. 헌법 V3/Part 001~005 상속(재정의 금지)·마케팅 AI KEEP_SEPARATE·AI 직접수정 금지(V3). 코드 변경 0.

## 다음
MEA Part 007 — Enterprise Data Lineage & Impact Analysis Architecture(본 DQM 상속·확장).
