# DSAR — Approval System Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: System Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

System Identity는 시스템 프로세스(cron/batch/scheduler)가 API/세션 경유 없이 DB에 직접 접근하는 실행 주체를 식별하는 엔티티다(스펙 §1 구현목표 항목2 "System Identity Registry"·§2 Canonical Entity `APPROVAL_SYSTEM_IDENTITY`). 목적은 현재 "단일 공유 시스템 자격증명"으로 뭉뚱그려진 cron/batch 실행체를 개별 System Identity로 분리 식별할 수 있는 설계 틀을 마련하는 것이며, 실 credential 분리·부여는 이번 차수 범위 밖이다(설계 명세만).

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§35(Database Constraint)·§36(Index) 근거의 설계 명세 필드(코드 0·미확정):

- `system_identity_id`(PK) · `tenant_id`(cron은 원 구조상 테넌트 무관 실행 — Registry 결합 시 검토 필요) · `system_process_key`(고유 식별키, 예: 잡 파일명 매핑) · `credential_ref`(→ 현재는 공유 root, 분리 후 per-job scoped credential) · `runtime_context_ref`(→ 스펙 §9 Environment/Namespace/Cluster/Node/Container/Pod/Pipeline/Application) · `status`(active/deprecated/retired) · `created_at`/`created_by`

## 3. 열거형 / 타입

- `identity_type`(스펙 §3 Identity Type 서브셋): `batch_user` | `scheduler` | `worker` | `queue_consumer` | `queue_producer` | `etl`
- `status`: `active` | `deprecated` | `retired`

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

- **System Identity 자체 = ABSENT**: `system_actor`/`non_human` grep 0(EXISTING_IMPLEMENTATION §2, 내부 엔티티 전무).
- **cron/batch = 시스템 공유 자격증명 직접 DB(RBAC 미경유)**: bin 35 cron 전수 = `Db::pdo()` 직접 접근(예 `writeback_cron.php:37`). `Db::pdo()` = 단일 공유 root 자격증명(`Db.php:122-123`) — 워커/cron/HTTP 요청이 동일 자격증명을 공유한다(EXISTING_IMPLEMENTATION §8).
- **omni_outbox claim_id = 동시성 락(identity 아님)**: `Omnichannel.php:95-97,390-446`, `claim_id = bin2hex(random_bytes(8))`(`:392`) — SKIP LOCKED 방식 락 토큰이며 실행 주체 식별자가 아니다(EXISTING_IMPLEMENTATION §8, Part 3-3 정합 재확인).
- **SystemMetrics unknown/critical = 무관(오탐 배제)**: `SystemMetrics.php:376,393,397-417`의 `unknown`/`critical`은 cron 잡 상태 모니터링(성공/실패/지연) 값이며, identity 신뢰등급(Trust Level)과 무관하다(EXISTING_IMPLEMENTATION §9).

## 5. 설계 원칙

- **경계 보존(오등록 금지)**: cron/batch(시스템 공유 자격증명)·omni_outbox claim_id(락)를 System Identity로 오등록하지 않는다(ADR §3 경계보존 명문).
- **선결 전제 — 자격증명 분리**: 현재 모든 cron/batch가 동일 root 자격증명을 쓰므로(`Db.php:122-123`), per-job scoped credential로 먼저 분리하지 않으면 System Identity 부여 자체가 무의미(단일 신뢰경계 안에서는 개별 identity 구분 불가). 이번 차수는 이 선행과제를 설계 명세로만 등재.
- **Golden Rule**: `Db::pdo()` 접근 패턴을 대체하지 않고, System Identity Registry가 이를 참조(adapter)하는 방식으로 조립.

## 6. Gap / BLOCKED_PREREQUISITE

- `system_actor`/`non_human` grep 0. bin 35 cron 전수가 단일 공유 자격증명 — per-job 분리 없이는 System Identity 테이블을 채울 데이터 자체가 없다.
- **BLOCKED_PREREQUISITE(RP-002)**: 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic 실 구현 부재.
- SystemMetrics 모니터링 상태를 Trust Level로 재해석하는 것은 오탐(§9) — System Identity 설계에서 명시적으로 배제.
