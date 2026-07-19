# DSAR — Permission Audit Event (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule(`UserAuth::logAudit`→`auth_audit_log` SSOT).

---

## ① 목적

**Permission Registry·Definition·Grant·Resolution·Snapshot 생애 전 구간의 상태 전이를 단일 감사 스트림으로 기록.** 무엇이 언제 누구에 의해 생성/활성/정지/부여/폐기/거부/드리프트됐는지의 append-only 사건 로그다. 정본 = `UserAuth::logAudit`→`auth_audit_log`(SSOT) 확장. 현행은 permission **변경**만 기록(team_permissions_set 등)하고 per-request 결정·해소·드리프트 사건은 미기록(전수조사 §3) — 본 이벤트 집합이 그 공백을 메운다.

## ② Canonical 필드

`PERMISSION_AUDIT_EVENT`

| # | 필드 | 설명 |
|---|---|---|
| 1 | `permission_audit_event_id` | 이벤트 식별자 |
| 2 | `event_type` | 이벤트 유형(열거형 §③) |
| 3 | `tenant_id` | 테넌트(격리 귀속) |
| 4 | `actor` | 사건 유발 Actor(Actor Identity Part) |
| 5 | `target_ref` | 대상(Definition/Grant/Resolution/Snapshot id) |
| 6 | `before_ref` / `after_ref` | 전/후 상태 참조 |
| 7 | `occurred_at` | 발생 시각 |
| 8 | `evidence_ref` | 연결 Evidence([Evidence](DSAR_APPROVAL_PERMISSION_EVIDENCE.md)) |
| 9 | `chain_digest` | 해시 체인 다이제스트([Digest](DSAR_APPROVAL_PERMISSION_DIGEST.md)·Part 1 `SecurityAudit::verify`) |

## ③ 열거형 — `event_type`

- **Registry/Definition 생애**: `PERMISSION_REGISTRY_CREATED` · `DEFINITION_CREATED` · `VERSION_CREATED` · `ACTIVATED` · `SUSPENDED` · `DEPRECATED` · `RETIRED`.
- **Grant 생애**: `GRANT_REQUESTED` · `GRANTED` · `GRANT_REVOKED` · `GRANT_EXPIRED` · `DENY_CREATED`.
- **Resolution**: `RESOLUTION_REQUESTED` · `RESOLUTION_GRANTED` · `RESOLUTION_DENIED`.
- **무결성/이상**: `CONFLICT_DETECTED` · `AMBIGUITY_DETECTED` · `CIRCULAR_REFERENCE_DETECTED` · `SCOPE_EXPANSION_DETECTED`.
- **Snapshot/Evidence**: `SNAPSHOT_CREATED` · `EVIDENCE_CREATED`.
- **Cache/Drift/Runtime**: `CACHE_HIT` · `CACHE_MISS` · `CACHE_INVALIDATED` · `DRIFT_DETECTED` · `RUNTIME_BLOCKED`.

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 요소 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| 감사 저장체(SSOT) | `auth_audit_log`(`UserAuth::logAudit`) | CANONICAL(Audit SSOT) | EXISTS — 확장 대상 |
| permission **변경** 이벤트(GRANTED/DENY_CREATED 인접) | team_permissions_set 등 변경 기록 | CANONICAL | PARTIAL(변경만) |
| deny at gate(`RUNTIME_BLOCKED` 인접) | `index.php:553-603` PEP·`guardTeamWrite`(`UserAuth.php:1167`·`index.php:82`)·위임 초과 `DELEGATION_EXCEEDED`(`TeamPermissions.php:628-647`) | CANONICAL(PEP) | 거부 실집행되나 **이벤트 미기록** |
| `RESOLUTION_*` | `effectiveForUser :366` 온디맨드·감사 미발행 | CANONICAL(Resolver) | **ABSENT(이벤트)** |
| `CONFLICT/AMBIGUITY/CIRCULAR/SCOPE_EXPANSION_DETECTED` | 충돌/순환/확장 탐지기 부재 | — | **ABSENT** |
| `CACHE_HIT/MISS/INVALIDATED` | version-aware 캐시 부재(Effective-Set 미캐시) | — | **ABSENT** |
| `DRIFT_DETECTED` | 드리프트/재검증 파운데이션 부재 | — | **ABSENT** |
| `chain_digest` | Part 1 Cryptographic Hash Chain(`SecurityAudit::verify`) | CANONICAL(재사용) | 재사용 가능·Permission 이벤트 미배선 |

## ⑤ 설계 원칙

- **`auth_audit_log` SSOT 확장**(Golden Rule) — Permission 전용 감사 테이블 신설 금지. `UserAuth::logAudit` 경유로 단일 스트림 유지.
- **append-only + 해시 체인** — Part 1 `SecurityAudit::verify`(유일한 실 tamper-evident 체인) 재사용. 별도 체인 신설 금지.
- **Tenant Isolation** — 모든 이벤트에 `tenant_id` 귀속(Cross-tenant 격리 정본 `index.php:619`).
- **결정/거부/드리프트 감사가 핵심 신설** — 현행 변경-only를 per-request·resolution·drift로 확장.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 PARTIAL**: `auth_audit_log`는 permission **변경**만 기록 — `RESOLUTION_*`·`RUNTIME_BLOCKED`·`*_DETECTED`·`CACHE_*`·`DRIFT_DETECTED` 미발행.
- **G2 ABSENT**: Conflict/Ambiguity/Circular/Scope-Expansion 탐지기·version-aware Cache·Drift 파운데이션 순신규.
- **G3 BLOCKED_PREREQUISITE(RP-002)**: `SNAPSHOT_CREATED`/`EVIDENCE_CREATED`가 지목할 스냅샷/Evidence·Part 1 Decision 저장체 코드 0.
