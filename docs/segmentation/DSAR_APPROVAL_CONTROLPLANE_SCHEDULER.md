# DSAR — Authorization Scheduler (Part 3-19 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §4)
`Authorization Scheduler`는 승인 제어 평면의 **시간 구동(time-driven)** 실행자로, 아래 스케줄 능력을 계약한다.
- **Scheduled Policy Activation/Expiration**: 정책 발효·만료 시각 도달 시 자동 전환.
- **Compliance Review**: 주기적 접근검토(access review) 사이클 개시.
- **Certificate Rotation**: 서비스/시스템 identity 자격의 주기 회전.
- **JIT Cleanup**: Just-In-Time 상승 권한의 TTL 만료 회수.
- **Assignment Cleanup**: 만료·고아 role 할당 청소.
- **Snapshot Schedule**: 정책/할당 스냅샷 주기 생성.

## 2. Substrate 매핑 (현행 → 계약)
| SPEC 능력 | 현행 substrate | 상태 |
|---|---|---|
| authz 스케줄러 | authz 시간구동 cron **grep 0** | ABSENT |
| 접근검토 트리거 | `AccessReview.php:176-225`(`:188`~`:225`) = **request-driven·비스케줄** | 스케줄 아님 |
| 정책 저장 | `AdminPlans.php:53-72` product config(주기 회전 로직 없음) | 스케줄 무관 |
| 위임 만료 | `TeamPermissions.php:695-701`·`:704-712`(권한 부여/상한) — 시간 회수기 부재 | ABSENT |
| 스냅샷 근거 | `SecurityAudit.php:14-64` append-only(수동 이벤트·주기 스냅샷 아님) | 스케줄 없음 |

## 3. 설계 계약 (신설, 코드 0)
- **Schedule Registry**: `{job_id, kind(activation|expiration|review|rotation|jit_cleanup|assignment_cleanup|snapshot), cron_expr, last_run_epoch, tenant_scope}` 논리 테이블. Ground-Truth ①에 등재 후 배선.
- **Idempotent Tick**: 각 tick은 멱등 — 동일 시각 중복 실행이 이중 만료/회전을 유발하지 않음.
- **Fail-Closed Expiration**: 만료 job 실패 시 권한은 **부여 유지가 아니라 회수 대기(hold)**로 강등. 만료 누락이 상승 권한 잔류로 이어지지 않게.
- **Audit-per-Job**: 모든 스케줄 집행은 `SecurityAudit.php:14-64` append-only 이벤트로 기록 — 무기록 자동집행 금지.
- **Review Bridge**: 스케줄된 Compliance Review는 `AccessReview.php:176-225`의 request-driven 경로를 **호출**하되 대체하지 않음(중복 엔진 금지).

## 4. KEEP_SEPARATE (혼입 금지)
- 커머스/메시징 cron 일체 = 도메인 배치이지 authz 스케줄 아님: `commerce_sync_cron.php`·`stock_sync_cron.php`·`data_export_cron.php`·`media_gc_cron.php`·`sms_queue_cron.php`·`journey_cron.php`·`oauth_refresh_cron.php`.
- `alerts_cron.php:43`·`:48` = **모니터링(alert_policy)**. 이름에 policy가 있어도 authz 정책 스케줄러 아님 — 승격 금지.
- `AccessReview.php:176-225`(`:188`,`:225`) = **request-driven**. 스케줄러가 이를 트리거할 뿐, 자체는 스케줄 substrate 아님.

## 5. 판정
**ABSENT (순신설)**. authz 시간구동 cron은 grep 0이며, 현존 cron은 전부 커머스/메시징 도메인(KEEP_SEPARATE)이고 `alerts_cron.php:43`·`:48`은 모니터링이다. 접근검토(`AccessReview.php:176-225`)는 request-driven이고, 위임(`TeamPermissions.php:695-701`·`:704-712`)에는 시간 회수기가 없다. 본 스케줄러는 Schedule Registry·Idempotent Tick·Fail-Closed Expiration을 **순신설**하되, 집행은 `SecurityAudit.php:14-64` append-only로 기록하고 Compliance Review는 기존 request-driven 경로를 대체 없이 호출한다. BLOCKED_PREREQUISITE — Cluster Coordinator(리스/정족수) 부재로 안전한 단일-리더 tick 불가. NOT_CERTIFIED.
