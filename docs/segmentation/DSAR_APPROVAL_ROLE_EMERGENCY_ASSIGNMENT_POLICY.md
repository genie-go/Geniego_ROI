# DSAR — Approval Role Emergency Assignment Policy (per-entity 설계 명세)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 엔진은 선행 Permission Engine 실구현 + 별도 승인세션)
- **상위 ADR**: [`../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **ⓑ GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **★범위 경계**: **Emergency Assignment Policy(break-glass 정책 계약)만**. 실 긴급 배정 행·자동 회수 집행은 **Part 3-3**. 여기서는 긴급 배정의 **인시던트 근거·세션 결합·기간·사후검토·자동 회수 정책**만 설계한다.

> **반날조 규율**: `파일:라인`은 위 2문서에서 확인된 것만 인용. 확인 불가 substrate는 **ABSENT**. Role ≠ Permission ≠ Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

긴급(emergency·break-glass) Role 배정의 정책 계약을 정의한다. 긴급 배정은 반드시 **인시던트/티켓 참조·세션 결합·최대 기간·사후 필수검토·자동 회수**를 갖추어야 하며, **일반 Assignment로 기록되어서는 안 된다**(별도 긴급 경로·강화 증거 등급). 현행 substrate에는 break-glass 개념이 전무하다(ⓑ §3 전부 ABSENT). 본 정책은 긴급 배정의 강화 통제만 규정하고, **실 배정·회수 워커는 생성하지 않는다**(Foundation only).

## ② Canonical 필드

| 필드 | 의미 |
|---|---|
| `emergency_assignment_allowed` | 긴급 배정 허용 여부 |
| `incident_reference_required` | 인시던트 참조 필수 |
| `ticket_reference_required` | 티켓 참조 필수 |
| `reason_required` | 긴급 사유 필수 |
| `approval_reference` | 승인 참조(사전 또는 사후 승인) |
| `session_binding_required` | 세션 결합 필수(발급 세션에만 유효) |
| `max_duration` | 최대 유효기간(짧게 강제) |
| `max_use_count_ref` | 최대 사용 횟수 참조 |
| `notification_required` | 즉시 통지 필수(Security/Owner) |
| `post_review_required` | 사후 검토 필수 |
| `post_review_deadline` | 사후 검토 기한 |
| `auto_revocation` | 만료/인시던트 종료 시 자동 회수 |
| `audit_level` | 감사 등급(강화) |
| `evidence_level` | 증거 등급(강화) |

## ③ 열거형

- **EmergencyReferenceType**: `INCIDENT` · `TICKET` · `BOTH_REQUIRED`
- **ApprovalTiming**: `PRE_APPROVAL` · `POST_APPROVAL`(사후 승인 시 review deadline 강제)
- **SessionBinding**: `REQUIRED`(발급 세션 한정) — 미결합 긴급 배정 금지
- **RevocationTrigger**: `MAX_DURATION` · `MAX_USE_COUNT` · `INCIDENT_CLOSED` · `MANUAL`
- **AuditLevel** / **EvidenceLevel**: `STANDARD` · `ELEVATED` · `FORENSIC`(긴급=ELEVATED↑)

## ④ substrate 매핑 (§5.2)

| Canonical 정책 요소 | 현행 substrate | §5.2 분류 | file:line |
|---|---|---|---|
| Role 위계(긴급 부여 대상) | `team_role` / `admin_level` | CANONICAL_ROLE_REGISTRY_CANDIDATE / SUB_ROLE_CANDIDATE | `UserAuth.php:188` · `UserAdmin.php:43-46` |
| incident/ticket reference | — | ABSENT | ABSENT |
| session binding | — | ABSENT | ABSENT |
| max_duration / max_use_count | — | ABSENT | ABSENT |
| post-review / deadline | — | ABSENT | ABSENT |
| auto-revocation | — | ABSENT | ABSENT |
| audit/evidence level(강화) | auth_audit_log(단일 등급) | PARTIAL | ⓑ §3 |

**정직한 부재**: break-glass·긴급 배정 경로는 ⓑ GROUND_TRUTH에 존재하지 않는다. 순신규(전부 ABSENT).

## ⑤ 설계원칙

1. **일반 Assignment로 기록 금지** — 긴급 배정은 별도 경로·강화 증거 등급(`evidence_level` ELEVATED↑)으로 기록. 일반 direct assignment와 혼입 금지.
2. **인시던트/티켓·세션 결합 필수** — `incident_reference_required`·`session_binding_required` 미충족 긴급 배정은 정책상 거부. 발급 세션 외 재사용 금지.
3. **짧은 최대 기간 + 자동 회수** — `max_duration`을 짧게 강제하고, 만료·인시던트 종료·사용 횟수 초과 시 `auto_revocation` 발동.
4. **사후 검토 필수** — `post_review_required`+`post_review_deadline`. 사후 승인(POST_APPROVAL) 시 기한 내 검토 미완=위반.
5. **★Role Assignment Table 생성 안 함** — 긴급 배정 행·회수 워커는 Part 3-3. 본 Part는 break-glass **정책 스키마만**.
6. **Golden Rule·무후퇴** — 실존 관리자 게이트(`requireMasterAdmin`)·부여 상한(`requireTeamWrite`)을 확장하며, 긴급 경로가 정상 통제를 영구 우회하는 god-path가 되지 않도록 강화 통제로 봉쇄.

## ⑥ Gap

| 능력 | 상태 | 근거 |
|---|---|---|
| incident/ticket reference · session binding | ABSENT | break-glass 개념 부재(ⓑ §3) |
| max duration · max use count · auto-revocation | ABSENT | Lifecycle=ABSENT |
| post-review · deadline | ABSENT | Review/Certification=ABSENT |
| audit/evidence level(강화 등급) | PARTIAL | auth_audit_log=단일 등급 |
| **선행 전제** | BLOCKED_PREREQUISITE | 실 긴급 집행/회수=Part 3-3 · Permission Version=Part 2(RP-002) |
