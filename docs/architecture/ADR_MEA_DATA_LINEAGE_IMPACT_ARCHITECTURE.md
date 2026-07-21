# ADR — MEA Part 007 Enterprise Data Lineage & Impact Analysis Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part007 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 007은 Data Lineage & Impact Analysis. GeniegoROI는 데이터 계보/출처 추적 substrate가 실재 — `DataPlatform`(272차 Data Source Registry `data_source`·source_type/channel/account/credential/priority=출처 카탈로그)+data-lineage(분석→원천+신선도+정규화규칙)+헌법 "출처(Source/Credential/Sync/Quality/Trust) 기록". 불변 이력=`SecurityAudit`·Explainability=헌법 V4·변경 관리=`CHANGE_GATE`+무후퇴 value unification. 단 그래프 기반 자동 Impact/Dependency/Root Cause 엔진·시각화는 부재. 본 Part는 Part 001~006 상속(재정의 금지).

## 결정
- **D-1 (Part 001~006·헌법 상속·재정의 금지):** DataTrust lineage/freshness(Part 006)·Data Source(Part 001)·표준필드를 준수·인용. Lineage 대상(§6)=Part 001~003 도메인/KPI 매핑. 중복 정의 금지.
- **D-2 (Provenance/Data Source = DataPlatform data_source registry 승격):** Data Provenance(Source System/Record/Credential/Processing) = `DataPlatform.php:61`(272차 `data_source` registry)+헌법 출처 기록. 형식 Provenance Manager는 이를 인덱싱(중복 소스 레지스트리 신설 금지·[[project_n272_data_platform]]).
- **D-3 (Data Lineage = DataPlatform data-lineage 승격):** End-to-End Lineage = `DataPlatform`(/api/data-lineage·분석→원천+신선도+정규화규칙). 형식 Lineage Graph Engine은 이 위에(중복 lineage 엔진 신설 금지·V3 난립금지).
- **D-4 (Impact/Dependency/Root Cause = ABSENT-formal·원칙 재사용):** 그래프 기반 자동 Impact Analysis/Dependency Analyzer/Change Propagation/Root Cause Analyzer=부재. 현행 변경-영향 인식=`CHANGE_GATE`(변경 전 게이트)+무후퇴 value unification(한 값 변경=관련 전부 동기화·[[feedback_no_regression_value_unification]])+감사 오탐 레지스트리. 형식 그래프 엔진은 순신설(원칙은 재사용).
- **D-5 (Immutable/Explainability/AI = 기존 자산·헌법 정합):** Read-Only Lineage/삭제 금지=`SecurityAudit`(append-only·[[reference_menu_audit_log_not_tamper_evident]]). Explainability=헌법 V4(근거/신뢰도). AI(이상 경로/영향도 예측)=`AnomalyDetection`·Lineage 변경/삭제 불가=헌법 V3. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Tenant Isolation=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 001~006/헌법 상속·재정의 금지·DataPlatform(data_source/lineage)·SecurityAudit·CHANGE_GATE·무후퇴 원칙 재사용·형식 Lineage Graph/Dependency/Impact/Root Cause Engine·Visualization만 신설. 실행은 선행 Part 001~006 종속.
