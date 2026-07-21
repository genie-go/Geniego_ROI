# ADR — MEA Part 015 Enterprise KPI Management Architecture

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part015 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 015는 KPI Management(중앙 정의/측정/인증). ★"KPI Registry" 테마는 Part 003 EDW(KPI Definition Registry)·Part 004 Metadata·Part 008 Catalog(Certification)·Part 013 ROI KPI에서 반복 등장했고 일관 판정은 **KPI 값은 실 SSOT(`Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`)이나 형식 metadata-driven KPI Registry는 부재**(KPI 정의=코드 내재). Monitoring=`Alerting`·Certification=Trust First(Part 006/008). 본 Part는 Part 013/014/Data Platform 상속(재정의 금지).

## 결정
- **D-1 (Part 013/014/003/008/Data Platform 재정의 금지):** KPI 값(Part 013/003)·Calc Engine(Part 014)·Metadata(Part 004)·Certification/Trust First(Part 006/008)·Lineage(Part 007)를 준수·인용. KPI 도메인(§6)=실 핸들러 매핑. 중복 정의 금지.
- **D-2 (KPI 값 SSOT = Rollup/Pnl/Attribution 승격·★중복 KPI 계산 절대 금지):** KPI 값 = `Rollup`/`Pnl`/`Attribution`/`CRM`/`Mmm`. ★값은 무후퇴 단일소스([[feedback_no_regression_value_unification]])로 이미 강제. ★중복 KPI 계산 신설 절대 금지(값 분산=회귀). 형식 KPI Registry는 정의를 메타데이터화(값 재계산 아님).
- **D-3 (KPI Certification = Trust First 재사용):** Enterprise Certified만 공식 ROI 사용(§10) = ★헌법 V3 Trust First(신뢰도 미달=배제·READY만·Part 006/008)+NOT_CERTIFIED 라벨+`IMPLEMENTATION_STATUS`. 형식 Certification Manager=순신설(중복 인증 로직 금지).
- **D-4 (Hierarchy/Dependency/Monitoring = 기존 승격·형식 신설):** Hierarchy 집계=`Rollup`(Enterprise가 채널/기간 집계)·Dependency=무후퇴 value unification(KPI→Metric 값 동기화)+`DataPlatform` lineage(Part 007)·Monitoring/Threshold=`Alerting`(alert_policy)·Quality=`DataPlatform`(DataTrust). 형식 Hierarchy/Dependency Graph/Monitoring Manager=순신설(중복 lineage/알림 금지).
- **D-5 (Governance/AI/Security = 무후퇴·헌법 정합):** KPI 단일 정의=무후퇴·Formula 변경 승인=`CHANGE_GATE`·이력=`SecurityAudit`·Formula Protection=git+G2 sacred SHA. AI(KPI 이상/Forecast)=`AnomalyDetection`/`Mmm`·KPI 직접생성/수정/승인 불가=헌법 V3+`CHANGE_GATE`. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE. Tenant=`Db.php`([[reference_platform_growth_actas_tenant_hijack]]).

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. Part 013/014/003/008/Data Platform/헌법 상속·재정의 금지·KPI 값(Rollup/Pnl/Attribution)·Trust First 인증·Alerting 모니터링·무후퇴 거버넌스·SecurityAudit 재사용(★중복 KPI 계산/인증/알림 절대 금지)·형식 metadata-driven KPI Registry/Hierarchy/Dependency/Version/Certification Manager만 신설(값 재계산 없이). 실행은 선행 Part 001~014 종속.
