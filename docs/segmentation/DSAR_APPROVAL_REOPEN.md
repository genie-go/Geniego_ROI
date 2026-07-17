# DSAR — Approval Reopen (§38·필드 14·Type 9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q18 "재개·재승인을 어떻게 처리하는가") | 현행 | 분류 |
|---|---|---|
| **Reopen** 엔티티·상태·전이 | **전면 부재** — `reopen` 백엔드 grep **0건**(승인 도메인뿐 아니라 저장소 전체) | **NOT_APPLICABLE(부재→신설)** |
| 종결된 요청을 되살리는 경로 | **부재**. `mapping_change_request`는 `status!=='pending'`이면 승인 자체를 **409로 차단**(`Mapping.php:260-264`) — 종결이 **편도**임을 코드가 명시 | **VALIDATED_LEGACY**(종결 불변 전제) |
| `action_request` | `approved\|rejected\|executed\|failed\|approved_manual`(`Alerting.php:628,644`) — **되돌아오는 전이 없음**. 단 **전이 통제 자체가 없어** UPDATE로 임의 되돌리기가 **막혀 있지도 않음** | **MIGRATION_REQUIRED** |
| 재승인 트리거(승인 후 원본 변경 §4.5) | **부재**(grep 0) — 원본 변경 감지 축(Critical Field) 자체가 없음 | **NOT_APPLICABLE** |

> **핵심**: 현행에 Reopen이 없는 것은 **설계 결정이 아니라 상태기계의 부재**다. `Mapping`은 종결을 **의도적으로 편도**로 막았고(`:260-264`), `Alerting`은 **아무것도 막지 않는다** — 같은 "Reopen 없음"이 한쪽은 원칙, 한쪽은 공백이다.

## 1. Reopen = **종결된 요청을 · 같은 정체성으로 · 다시 심사 대기로** 되돌리는 사건

Supersession(§39)과의 분기점은 **정체성 연속성**이다.

| 축 | **Reopen(§38)** | Supersession(§39) |
|---|---|---|
| 요청 정체성 | **동일 Request가 되살아남** | **새 Request가 옛 것을 대체** |
| Version | 같은 계보의 후속 Version | 별개 요청 + 대체 링크 |
| 과거 Decision | **효력 정지 · 기록 보존** | 옛 요청째로 superseded 마감 |

**필드 14 · Reopen Type 9** — 스펙 §38 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `14`/`9`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드/Type 축 커버리지 주장 불가**.

영속된 요구(§0 Q18·§4.5·§4.9·§61 "상태 전이 통제")에서 확정 가능한 구조 요구:
- Reopen은 **Append-only 사건**이다(§4.9) — 과거 Decision을 **삭제하지 않고** 효력만 정지시킨다.
- Reopen은 **허용 전이 목록(§29·22종)의 통제를 받는다** — 임의 상태 되돌리기는 Reopen이 아니라 **무결성 사고**다.
- Reopen된 요청은 **Actor Authorization Snapshot(§21)을 재취득**해야 한다 — 과거 승인자의 권한이 지금도 유효하다고 가정할 수 없다(§4.6).

## 2. 규칙

- **`Mapping.php:260-264`의 "종결 건 재승인 409 차단"을 훼손하지 않는다** — Reopen은 그 게이트를 **뚫는 우회로가 아니라**, 상태기계가 **명시적으로 허용한 전이**여야 한다. Reopen 신설을 이유로 289차 G-01 수정을 되돌리면 **무후퇴 위반**.
- **Reopen ≠ Supersession**(§4.8) — 정체성이 이어지면 Reopen, 갈라지면 Supersession.
- **이미 실행된 건의 Reopen은 실행을 되돌리지 않는다** — 재심사와 원복은 별개다(Reversal/Correction 요구 · 현행 부재).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
