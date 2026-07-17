# DSAR — Approval Participant Type (§19·15종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 현행 | 분류 |
|---|---|---|
| Participant Type 열거형 | **부재**(`participant_type` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 역할 구분 유사물 ① | `team_role` owner>manager>member `Handlers/TeamPermissions.php:145` | **CANONICAL 재료**(역할 ≠ 승인참여유형) |
| 역할 구분 유사물 ② | `api_key.role` viewer<connector<analyst<admin `Db.php:942-955` | **CANONICAL 재료** |
| 역할 구분 유사물 ③ | `PlanPolicy::RANK` free/demo0<starter1<growth2<pro3<enterprise4<admin5 `PlanPolicy.php:17,20,28` · 🔴 **fail-open**(`:12` 자인) | **MIGRATION_REQUIRED** |
| IdP 그룹→역할 | `sso_group_role_map` `Handlers/EnterpriseAuth.php:43,59,70` — REAL | **VALIDATED_LEGACY**(재사용) |
| 승인 참여 **유형**(요청자/승인자/검토자/참관자/위임자…) 구분 | **전면 부재** — 현행 승인 3경로 모두 유형 없이 단일 행위자만 기록 | **NOT_APPLICABLE** |

**핵심**: 현행의 role 은 **"무엇을 할 수 있는가"(권한)** 이지 **"이 승인 건에서 어떤 역할로 참여하는가"(참여유형)** 가 아니다. 둘을 동일시하면 §4.7(Authorization Deny ≠ Approval Rejection) 위반이다.

## 1. Participant Type 15종

스펙 §19 의 **항목명 원문은 저장소 미영속**(REQ 는 개수 `15` 만 고정 · 나열 부재).
→ 분류 **UNVERIFIED**. **15종의 이름을 추정·창작하지 않는다** — 창작한 열거형은 분모가 아니라 자작이며,
그것으로 계산한 커버리지는 정의상 100%가 되는 동어반복이다(REQ §15 · 289차 ⑤ §1-1).

확정 사실만 기록한다:
- 현행 구분 가능 유형 = **실질 0종**(요청자/승인자조차 별도 유형 필드로 기록되지 않음).
  단 `mapping_change_request` 는 `requested_by` 와 `approvals_json[].user` 를 **분리 저장**하여
  요청자/승인자를 **사후 구별**할 수 있다(`Mapping.php:268,285`) — 유형 열거형은 아니나 **유일한 선례**.
- 따라서 스펙 원문 수령 시 **15종 대비 현행 커버리지는 0~1종 수준**으로 예상되나, **분모 항목명 없이 수치 주장 금지**.

## 2. 규칙

- **Type 열거형을 창작해 정본화 금지** — 스펙 §19 원문 수령 후 채운다.
- **role 을 participant_type 으로 전용 금지** — 권한(무엇을 할 수 있나)과 참여유형(이 건에서 누구인가)은 별개 축.
- `sso_group_role_map`·`team_role`·`api_key.role` 은 **후보 산출 입력**으로 재사용(중복 신설 금지).
- `PlanPolicy` **fail-open** 위에 참여유형을 얹지 말 것 — 승인 도메인은 **fail-closed** 가 전제(§4.1 Deny-by-default).
