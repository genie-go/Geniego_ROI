# MEA Part 001 — Governance Mechanisms (§10~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §10 Data Governance 규칙
중복 Entity 금지 · Canonical Entity 우선 · 변경 이력 저장 · Version 관리 · Metadata 자동 생성 · Data Lineage 자동 기록.
- 판정 **PARTIAL**. 중복 Entity 금지=★pre-commit 중복금지 게이트+[[feedback_no_duplicate_features]] 정합. 변경 이력=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]). Data Lineage 자동기록=`DataPlatform.php`(data-lineage) 승격. Version 관리/Metadata 자동생성=순신설.

## §11 Data Security 정책
Encryption at Rest · Encryption in Transit · Row Level Security · Column Level Security · Attribute Masking · Dynamic Data Masking.
- 판정 **PARTIAL**. Encryption at Rest=`Crypto`(AES-256-GCM·비밀만·전 컬럼 아님). In Transit=nginx TLS. Row Level Security=앱계층 `tenant_id` 스코핑(`Db.php`·[[reference_platform_growth_actas_tenant_hijack]]·DB-native RLS 아님). Masking=`ChannelCreds` last4. Column-Level/Dynamic Masking=순신설.

## §13 Runtime 규칙
Canonical Entity 접근 · Version 검증 · Metadata 검증 · Data Policy 검증 · Audit 기록.
- 판정 **PARTIAL**. Data Policy 검증=`index.php` RBAC/writeGuard(289차 서버전역). Audit 기록=`SecurityAudit`. Canonical/Version/Metadata 검증=순신설(형식 엔티티 계층 후).

## §14 API 표준
REST · GraphQL 지원 가능 · Event Publishing · Version Header · Idempotency · Trace ID.
- 판정 **PARTIAL**. REST=실재(`routes.php` /v{NNN}). Version=URL 버전 프리픽스. Idempotency=일부(Payment/write 멱등·TOCTOU 원자화 289차후속). **GraphQL/Event Publishing/Trace ID=ABSENT**(REST만·Part 3-47/3-54 정합).

## §15 Event 표준
DataCreated · DataUpdated · DataDeleted · DataArchived · DataValidated · DataPublished.
- **ABSENT**(event-driven 대부분 부재). 순신설(내부 이벤트 버스 후).

## §16 AI Integration 제약
Metadata 생성 · Classification 추천 · Quality Score · Lineage 분석 · Anomaly Detection **만**·Canonical 직접수정 불가.
- 판정 **PARTIAL**(★헌법 정합). Quality Score/Anomaly=`DataPlatform`(DataTrust)/`AnomalyDetection` 승격. Canonical 직접수정 불가=데이터 헌법 V3(수집≠사용·Trust First·READY만)/V4(근거/신뢰도) 정합. Metadata 생성/Classification 추천=순신설.

## §17 성능 요구사항
API ≤300ms · Metadata 조회 ≤100ms · Data Validation ≤500ms · Event Publishing ≤200ms · Availability ≥99.99%. — 벤치 대상 미존재(형식 계층 신설 후).

## §18 Completion Criteria
Enterprise Data Registry·Canonical Data Dictionary·Data Domain·Lifecycle·Classification·Ownership·Governance·Security·Runtime·API/Event 표준 정의.
- **현재 미충족**(형식 Registry/Dictionary/Classification/Ownership Framework·Event 표준 ABSENT·표준 필드 미정착·코드 0).

## §12 데이터 표준 필드 — 도입 계획(무후퇴)
- **관례 승격(즉시 표준)**: `tenant_id`(전역 2961·SSOT·격리)·`created_at`/`updated_at`·`status`.
- **점진 도입(미정착·마이그레이션 후)**: `UUID`(현행 auto-increment id 다수→병행 추가·기존 즉시 강제 금지)·`version`·`created_by`/`updated_by`. ★기존 테이블 파괴적 변경 금지(ensureTables 병행 추가·무후퇴).

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Governance(중복금지/이력/lineage)·Security(암호/RLS/마스킹)·Runtime(정책검증/audit)·AI 제약은 pre-commit 게이트/`SecurityAudit`/`Crypto`/`Db.php`/`DataPlatform`/헌법 재사용(비교적 강함), **형식 Registry/Metadata/Classification/Ownership Framework·Event 표준·GraphQL·UUID/version 표준은 순신설/점진**. 헌법 6볼륨/DATA_ARCHITECTURE 재정의 금지. 코드 변경 0.
