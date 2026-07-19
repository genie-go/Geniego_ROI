# DSAR — Approval Role Delegation Policy (per-entity 설계 명세)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 엔진은 선행 Permission Engine 실구현 + 별도 승인세션)
- **상위 ADR**: [`../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **ⓑ GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **★범위 경계**: **Delegation Policy(위임 정책 계약)만**. 실 위임 배정 행·집행은 **Part 3-3**. 여기서는 위임의 **허용·범위 제한·부분 위임·한시성·재위임·증거 정책**만 설계한다.

> **반날조 규율**: `파일:라인`은 위 2문서에서 확인된 것만 인용. 확인 불가 substrate는 **ABSENT**. Role ≠ Permission ≠ Authority. 289차 확정분(EPIC 06-A-01 Delegation Foundation·impersonated_by P4) 재플래그 금지.

---

## ① 목적

Approval Role의 **위임(delegation)** 정책 계약을 정의한다. 한 subject가 자신의 Role을 다른 subject에게 위임할 때 **범위 제한·부분 위임·한시성·재위임 상한·증거**를 강제하는 정책 스키마를 세운다. **High-risk Approval Role의 무제한 Delegation은 금지**한다. 현행 substrate에는 위임 상한 개념으로 team_role 쓰기 게이트(`requireTeamWrite`)가 존재하나, 별도의 "위임 배정" 개념은 부재하다(EPIC 06-A-01 Delegation Foundation에서 Approval Delegation 개념 부재·선행 4축 부재로 확정). 본 정책은 위임 통제만 규정하고, **실 위임 배정 데이터는 생성하지 않는다**(Foundation only).

## ② Canonical 필드

| 필드 | 의미 |
|---|---|
| `delegation_allowed` | 위임 허용 여부 |
| `scope_restriction` | 위임 시 범위 축소 강제(원 범위 이하) |
| `partial_delegation_allowed` | 부분(일부 권한/scope) 위임 허용 |
| `temporary_only` | 위임은 한시만 허용(영구 위임 금지) |
| `max_duration` | 최대 위임 기간 |
| `redelegation_allowed` | 재위임(위임받은 자의 재위임) 허용 여부 |
| `evidence_required` | 위임 요청·승인·근거 증거 캡처 필수 |

## ③ 열거형

- **DelegationScope**: `FULL`(High-risk 금지) · `SCOPE_REDUCED`(원 범위 이하) · `PARTIAL`(일부 권한)
- **DelegationDuration**: `TEMPORARY_ONLY`(영구 위임 금지) — `max_duration` 필수
- **RedelegationPolicy**: `NOT_ALLOWED`(기본·High-risk) · `LIMITED`(depth 상한)
- **DelegationRiskGate**: `LOW` · `MEDIUM` · `HIGH`(무제한 위임 금지) · `CRITICAL`(위임 금지 또는 Owner 승인)

## ④ substrate 매핑 (§5.2)

| Canonical 정책 요소 | 현행 substrate | §5.2 분류 | file:line |
|---|---|---|---|
| Role 위임의 기반 위계 | `team_role`(owner/manager/member) | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188` |
| **위임 쓰기 상한(가장 근접)** | `TEAM_OWNER_ONLY` · `teamCanWrite` · `requireTeamWrite` | CANONICAL_ROLE_REGISTRY_CANDIDATE(확장) | `UserAuth.php:1117` · `:1125` · `:1134` |
| roleOf 정규화(위임 대상 판정) | `TeamPermissions::roleOf` | 정책 소비지 미러 | `TeamPermissions.php:120-131` |
| delegation(위임 배정 개념) | — | ABSENT | ABSENT (EPIC 06-A-01: Approval Delegation 개념 부재·선행 4축 부재) |
| scope_restriction / partial / temporary_only | — | ABSENT | ABSENT |
| redelegation / max_duration | — | ABSENT | ABSENT |
| impersonate 경로(위임과 구분) | `impersonated_by` 보존(289차 P4) — **2문서 내 file:line 없음** | 참조·보존 | ABSENT (실 substrate는 Impersonation Policy 문서 참조) |

**정직한 부재**: 별도의 "Role Delegation" 배정 개념·범위 제한·재위임 상한은 ⓑ GROUND_TRUTH에 존재하지 않는다(전부 ABSENT). 가장 근접한 실체는 위임 쓰기 상한 게이트(`requireTeamWrite`)이며 이는 확장 대상이다.

## ⑤ 설계원칙

1. **High-risk Approval Role 무제한 Delegation 금지** — `DelegationRiskGate` HIGH/CRITICAL은 `FULL` 위임·무제한 `redelegation` 불가. 범위 축소(`SCOPE_REDUCED`) 또는 위임 금지.
2. **위임은 한시만·영구 금지** — `temporary_only`+`max_duration` 강제. 영구 위임(사실상 권한 이양)은 정책상 거부.
3. **범위 하향 강제** — `scope_restriction`으로 위임 범위는 항상 원 Role 범위 이하. 위임을 통한 권한 상향 금지.
4. **재위임 상한** — `redelegation_allowed` 기본 false(High-risk). 허용 시 depth 상한으로 무한 재위임 차단.
5. **impersonate와 구분·P4 보존 참조** — Delegation(권한 위임)은 Impersonation(대리 세션)과 별개 개념이다. 289차 `impersonated_by` 보존(P4)과 EPIC 06-A-01 Delegation Foundation을 **참조·보존**하며 본 정책이 이를 무력화하지 않는다. Impersonation 통제는 별도 Impersonation Policy 문서.
6. **★Role Assignment Table 생성 안 함·Golden Rule** — 실 위임 배정 행은 Part 3-3. 실존 `requireTeamWrite`(`UserAuth.php:1134`) 위임 상한을 **확장**하며 별도 위임 게이트 신설 금지. 무후퇴.

## ⑥ Gap

| 능력 | 상태 | 근거 |
|---|---|---|
| Role Delegation 배정 개념 | ABSENT | EPIC 06-A-01(Approval Delegation 개념 부재) |
| scope restriction · partial · temporary_only | ABSENT | ⓑ §3 |
| redelegation · max_duration | ABSENT | Lifecycle=ABSENT |
| 위임 evidence | PARTIAL | auth_audit_log(변경 로그만) |
| 위임 쓰기 상한(근접 substrate) | REAL(확장 대상) | `UserAuth.php:1117/1125/1134` |
| **선행 전제** | BLOCKED_PREREQUISITE | 실 위임 집행=Part 3-3 · Delegation Foundation 선행 4축=EPIC 06-A-01(RP-002) |
