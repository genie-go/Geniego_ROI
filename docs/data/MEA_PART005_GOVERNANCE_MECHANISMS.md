# MEA Part 005 — Governance Mechanisms (§11~§18)

> **거버넌스 상태**: 실행 게이트/계약 설계 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 인용은 GT①②/ADR 등장분만(반날조).

## §11 Data Synchronization
Event/API/Batch/CDC 기반 · 모든 동기화=Audit.
- 판정 **PARTIAL**. API/Batch=커넥터 `ChannelSync.php`(준실시간 sync). **Event/CDC=ABSENT**(event-driven 부재). Audit=`SecurityAudit::verify`([[reference_menu_audit_log_not_tamper_evident]]).

## §12 Data Security
Tenant Isolation · Encryption · Role Based Access · Approval Workflow · Audit Logging · Version Protection.
- 판정 **PARTIAL**(Part 001~004 상속). Tenant Isolation=`Db.php`(tenant_id·[[reference_platform_growth_actas_tenant_hijack]])·Encryption=`Crypto`·RBAC=`index.php`·Approval=`CHANGE_GATE`/승인 워크플로우·Audit=`SecurityAudit`·Version Protection=pre-commit G2 sacred SHA.

## §13 Runtime 규칙
Golden Record 우선 · 중복 생성 금지 · 승인 없는 변경 금지 · Version 검증 · Synchronization 검증.
- 판정 **PARTIAL**. ★중복 생성 금지=UNIQUE 제약(uq_idlink 등)+pre-commit 중복금지 게이트([[feedback_no_duplicate_features]])+231차 SSOT([[project_n231_dedup_ssot]])·승인 없는 변경 금지=`CHANGE_GATE`+admin. Golden Record 우선/Version/Sync 검증=순신설(형식 MDM 후).

## §14 API 표준 (8)
Create · Update · Search Master Data · Match Entity · Merge Entity · Get Golden Record · Synchronize · Validate Master Data.
- **PARTIAL**(단 Match Entity=`Attribution` identity_link resolve seed). 최신 버전 프리픽스·`routes.php`+`index.php` bypass 규약. Create/Merge/Synchronize=admin 게이트.

## §15 Event 표준 (8)
MasterCreated · MasterUpdated · MasterMerged · GoldenRecordUpdated · SynchronizationCompleted · ReferenceDataUpdated · MasterApproved · MasterArchived.
- **ABSENT**(event-driven 부재·Part 001~004 §15 정합·내부 이벤트버스 후 신설).

## §16 AI Integration
중복 Entity 탐지 · Match Score 계산 · Merge 추천 · 데이터 품질 평가 · Reference Data 추천 · 이상 변경 탐지 · Golden Record 직접 변경 불가.
- 판정 **PARTIAL**(헌법 정합). 중복 Entity 탐지=중복금지 게이트 seed·Match Score=`Attribution`(confidence)·품질=`DataPlatform`(DataTrust)·이상=`AnomalyDetection`. Golden Record 직접 변경 불가=데이터 헌법 V3(수집≠사용·READY만)/V4(근거/신뢰도). Merge/Reference 추천=순신설. 마케팅 AI(`ClaudeAI`) KEEP_SEPARATE(중복 AI 엔진 금지·V3 난립금지).

## §17 성능 요구사항
Master 조회 ≤200ms · Match ≤1초 · Merge ≤2초 · Sync ≤5초 · Availability ≥99.99%. — 벤치 대상 미존재.

## §18 Completion Criteria
Master Data Repository·Golden Record·Match&Merge·Survivorship·Reference Data·Sync·Security·Runtime·API/Event·AI 구현.
- **현재 미충족**(형식 Golden Record Manager·Match/Merge/Survivorship Engine·Reference Data Manager·Distribution·Event 표준 ABSENT·코드 0). ★단 아이덴티티 해석·dedup은 실 seed.

## 종합 판정
전 메커니즘 **PARTIAL/ABSENT-formal** — Runtime(중복 금지)·Security(tenant/RBAC/암호/audit/G2)·Match(identity_link/confidence)·AI(중복탐지/Match Score)는 UNIQUE/중복금지 게이트/231차 SSOT/`Attribution`/`Db.php`/`SecurityAudit`/`DataPlatform` 재사용(★중복 dedup 재구현 절대 금지), **형식 Golden Record/Match-Merge/Survivorship Engine·Reference Data Manager·Distribution·Event 표준은 순신설**. Part 001~004/헌법 재정의 금지. 코드 변경 0.
