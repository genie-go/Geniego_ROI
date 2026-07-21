# ADR — MEA Part 001 Enterprise Data Platform Foundation

> **거버넌스 상태**: 아키텍처 결정 기록 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②(MEA Part001 EXISTING/DUPLICATE) 등장 file:line만(반날조).

## 맥락
MEA Part 001은 Data Platform Foundation(baseline). 그러나 GeniegoROI에는 이미 데이터 최상위 규범(헌법 6볼륨)과 구현 정본(`docs/data/DATA_ARCHITECTURE.md`)+실 데이터 플랫폼(`DataPlatform.php`·DataTrust/Lineage·272차)이 존재한다. 따라서 본 MEA는 신규 정본이 아니라 **상위 규범/정본을 상속·정합하는 아키텍처 기준**이다(Golden Rule=Extend not Replace·중복 정의 금지).

## 결정
- **D-1 (헌법/DATA_ARCHITECTURE 재정의 금지·상속):** 데이터 규범 = 헌법 6볼륨, 구현 정본 = `docs/data/DATA_ARCHITECTURE.md`. 본 MEA는 이를 재정의·중복하지 않고 아키텍처 기준으로 통합·인용한다. "본 문서가 유일 SSOT"는 **아키텍처 계층 한정**(규범=헌법·구현=DATA_ARCHITECTURE 상위).
- **D-2 (Data Domain = 실 핸들러 도메인 매핑):** §6 15 도메인(Identity/Authorization/Commerce/Logistics/Finance/ROI/AI/Analytics/Operations…)은 실 핸들러(`UserAuth`/`index.php` RBAC/`OrderHub`/`Wms`/`Pnl`/`Rollup`/`ClaudeAI`/`DataPlatform`)에 매핑. 형식 Data Domain Registry만 신설(도메인 재정의 금지).
- **D-3 (표준 필드 = 현행 관례 승격·점진 도입):** `tenant_id`(전역 2961 사용·SSOT)·`created_at`/`updated_at`(강한 관례)·`status`는 승격. `UUID`/`version`/`created_by`/`updated_by`는 **미정착**(현행 auto-increment id 다수) → 신규 표준으로 점진 도입(무후퇴·기존 테이블 즉시 강제 금지·마이그레이션 계획 후).
- **D-4 (Security/Immutable/Lineage = 기존 자산 재사용):** Encryption at Rest=`Crypto`(AES-256-GCM·channel_credential)·Encryption in Transit=nginx TLS·Row Level Security=앱계층 `tenant_id` 스코핑(`Db.php`)·Masking=ChannelCreds last4·Immutable History/Audit=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]])·Data Lineage=`DataPlatform.php`(data-lineage). 중복 암호/감사/lineage 엔진 신설 금지(V3 엔진 난립 금지).
- **D-5 (AI 제약 = 데이터 헌법 정합):** §16 "AI는 Canonical Data 직접 수정 불가·Metadata/Classification/Quality/Lineage/Anomaly만" = 데이터 헌법 V3(수집≠사용·Trust First·READY만)/V4(근거/신뢰도) 정합. AI Classification/Quality=`DataPlatform`(DataTrust)/`AnomalyDetection` 승격. 형식 Metadata/Classification Framework=신설. "중복 Entity 금지"=[[feedback_no_duplicate_features]]·중복금지 pre-commit 게이트 정합.

## 상태
전 결정 **설계-only·코드 0·NOT_CERTIFIED**. 헌법 6볼륨/DATA_ARCHITECTURE.md 상위·본 MEA는 상속·정합(재정의 금지)·표준 필드 점진 도입(무후퇴). 실행은 형식 Registry/Framework 신설 + 표준 마이그레이션 계획 종속.
