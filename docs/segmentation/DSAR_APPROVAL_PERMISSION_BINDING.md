# DSAR — Permission Binding (EPIC 06-A-03-02-03-04 Part 2)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · ★**BLOCKED_PREREQUISITE(RP-002)**
> **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
> 규율: Permission ≠ Role ≠ Authority · 반날조(file:line은 위 2문서 GROUND_TRUTH만) · Golden Rule · **선행 Part 1 Decision Core 부재 → 상위 결합 공회전**.

---

## ① 목적

**Permission Resolution Result를 Part 1 Authorization 결정 골격(Request/Context/Decision/Command/Slot/Case/Resource/Action/Effective Actor/Session)에 영속 결합.** "이 결정이 · 이 자원·동작에 대해 · 이 실효 권한 해소 결과로 · 이 Actor·세션 하에서 인가됐다"를 잇는 불변 링크다. ★단 결합 상대인 Part 1 Authorization Decision/Decision Core가 **코드 0**(ADR §D-4) — Binding은 지목할 결정 저장체가 없어 **BLOCKED_PREREQUISITE**다. 본 문서는 그 결합 형상만 규정(선행 신설 후 활성).

## ② Canonical 필드

`PERMISSION_BINDING` — permission resolution result ↔ 결정 골격

| # | 필드 | 설명 |
|---|---|---|
| 1 | `permission_binding_id` | 링크 식별자 |
| 2 | `permission_resolution_result_id` | 해소 결과([Effective](DSAR_APPROVAL_EFFECTIVE_PERMISSION_SNAPSHOT.md)) |
| 3 | `authorization_request_ref` | Part 1 Authorization Request |
| 4 | `authorization_context_ref` | Authorization Context |
| 5 | `authorization_decision_ref` | Authorization Decision |
| 6 | `decision_command_ref` | Decision Command |
| 7 | `decision_slot_ref` | Decision Slot |
| 8 | `approval_case_ref` | Approval Case |
| 9 | `resource_ref` | Resource |
| 10 | `resource_version_ref` | Resource Version |
| 11 | `action_ref` | Action |
| 12 | `effective_actor_ref` | Effective Actor |
| 13 | `auth_session_ref` | Auth Session |
| 14 | `bound_at` | 결합 시각 |
| 15 | `expires_at` | 결합 만료 |
| 16 | `immutable_digest` | 불변 다이제스트([Digest](DSAR_APPROVAL_PERMISSION_DIGEST.md)) |

## ③ 열거형

- **binding_state**: `BOUND / EXPIRED / SUPERSEDED / INVALIDATED`.
- **decision outcome(참조)**: `GRANTED / DENIED`(Part 1 Decision 소유).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate (file:line) | §92 분류 | 판정 |
|---|---|---|---|
| `permission_resolution_result_id` | `effectiveForUser :366`·`effectiveScope :236`(계산·미영속) | CANONICAL(Resolver) | PARTIAL(결과 미영속) |
| `effective_actor_ref` | admin SSOT `resolveAdminByToken`(`UserAuth.php:2998`)·team_role `roleOf :120-131` | CANONICAL | PARTIAL(위임 해소 축 없음) |
| `auth_session_ref` | 세션 토큰(289차 P5 at-rest 해시화·Actor Identity 03-03) | VALIDATED_IAM | PARTIAL(Binding 미결합) |
| `action_ref` | `TeamPermissions.php ACTIONS :39`(8동작) | CANONICAL | EXISTS(vocabulary만) |
| `resource_ref` | `acl_permission.menu_key`(`:152-159`) — UI 자원 근접 | PARTIAL | menu_key≠Canonical Resource |
| `authorization_request/context/decision/command/slot/case_ref` | Part 1 Authorization Decision/Decision Core 저장체 **코드 0** | — | **BLOCKED_PREREQUISITE** |
| `resource_version_ref` | Canonical Resource Version Registry 부재 | — | **ABSENT** |
| `bound_at`/`expires_at`/`immutable_digest`/Binding 자체 | 영속 링크 없음 | — | **ABSENT(순신규)** |

**커버리지 = Binding 축 0.** 결합할 결정 골격이 코드 0이므로 링크는 원리적으로 아직 생성 불가.

## ⑤ 설계 원칙

- **Binding은 값이 아니라 링크** — 각 참조는 불변 스냅샷/결정 record를 지목(가변 현재값 참조 금지).
- **선행 신설 순서**: Part 1 Decision Core + Canonical Action/Resource(Version) Registry → 그 후 Binding 활성. 순서 역전 시 빈 스켈레톤.
- **Permission ≠ Role ≠ Authority**: Binding은 Permission 해소 결과의 결정 결합이지 Role 부여(Part 3)·금액 Authority(Part 5) 결합이 아니다.
- **Digest 앵커** — Binding은 결합 시점 다이제스트로 봉인.
- 실 구현 = 별도 승인세션(RP-002). 코드변경 0.

## ⑥ Gap

- **G1 BLOCKED_PREREQUISITE(RP-002·핵심)**: Authorization Request/Context/Decision/Command/Slot/Case 저장체·Decision Core 코드 0 → Binding 생성 원리적 불가.
- **G2 ABSENT**: Resource Version Registry·Permission Resolution Result 영속·Binding 링크 자체 순신규.
- **G3 PARTIAL**: Actor(위임 해소)·Session·Resource(menu_key→Canonical) 재료는 존재하나 Binding 축 미결합.
