# ADR — MEA Part 006 Enterprise Data Quality Management (DQM) Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part006 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 006은 DQM(데이터 품질 측정·검증·개선). ★이 주제는 **데이터 헌법 Volume 3 `DATA_TRUST_QUALITY_CONSTITUTION.md`가 정확히 정의**한 영역이다 — Data Trust Intelligence Engine·수집≠사용·Trust First·Quality/Trust/Confidence Score·Cross Validation·Intelligence Readiness READY/WARNING/BLOCKED·안전장치(신뢰도 낮으면 AI 추천 금지). `DataPlatform`(DataTrust)·`AnomalyDetection`이 부분 구현. 형식 DQ Rule/Profiling/Cleansing/Exception 엔진은 부재. 본 Part는 Volume 3·Part 001~005 상속(재정의 금지).

## 결정
- **D-1 (헌법 Volume 3 재정의 절대 금지·상속):** 데이터 품질/신뢰 최상위 규범 = `DATA_TRUST_QUALITY_CONSTITUTION.md`(핵심경쟁력=Data Trust Intelligence Engine). 본 MEA는 이를 재정의·중복하지 않고 아키텍처 기준으로 정합·인용. Quality 평가 기준(§6)·Trust First 런타임(§13)=Volume 3 정합.
- **D-2 (Quality/Trust Score = DataPlatform DataTrust 승격):** Quality Score(0-100)·품질 평가(Accuracy/Completeness/…)·신뢰도 예측 = `DataPlatform`(DataTrust Score/Quality)+Volume 3. 등급 임계(Excellent~Critical) 형식화는 이 위에(값 재계산 금지). 중복 품질/신뢰 엔진 신설 절대 금지(V3 "중복 인텔리전스 금지"·엔진 난립금지).
- **D-3 (Validation/Cross Validation/Dedup = 기존 재사용):** Cross Validation=Volume 3(단일채널 불신·다소스 교차)·Duplicate Check=Part 005 dedup(UNIQUE/231차 SSOT/중복금지 게이트)·Pattern/Type/Range=핸들러 인라인 검증(bounds/regex·289차후속 TOCTOU/입력하드닝 정합). 형식 Validation/Quality Rule Engine=순신설(중복 검증 재구현 금지).
- **D-4 (Cleansing/Raw 불변/Anomaly = 기존 승격):** Cleansing 정규화=`ChannelSync`(표준모델 정규화)·Raw 절대 수정 금지=Part 002 `MediaHost`(sha256 content-addressed 불변)·이상 탐지=`AnomalyDetection`. 형식 Cleansing/Profiling/Exception Engine=순신설.
- **D-5 (Runtime Trust First·AI = 헌법 V3 정합):** "Validation 통과만 사용·Critical 사용 금지"=Intelligence Readiness BLOCKED·Trust First(신뢰도 미달=자동화/AI 제외)·안전장치(ROAS실패→광고중지금지)·`index.php` writeGuard. AI(이상/신뢰도 예측/규칙 추천)=`AnomalyDetection`/`DataPlatform`·직접수정 금지=헌법 V3(수집≠사용)/V4(근거/신뢰도). 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. ★헌법 Volume 3(핵심경쟁력) 재정의 절대 금지·상속·정합·DataTrust/AnomalyDetection/dedup/ChannelSync/MediaHost 재사용·형식 DQ Rule/Validation/Profiling/Cleansing/Exception Engine만 신설(값 재계산 없이). 실행은 선행 Part 001~005 종속.
