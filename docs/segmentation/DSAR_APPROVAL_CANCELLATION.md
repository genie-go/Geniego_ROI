# DSAR — Approval Cancellation (§37·필드 14·Type 10)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q18 "요청 취소를 어떻게 처리하는가") | 현행 | 분류 |
|---|---|---|
| 승인 도메인 **Cancellation** 엔티티·상태 | **부재**(승인 경로 `cancel` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| **★승인 후 취소(revoke) 선례** | `agency_client_link` `Handlers/AgencyPortal.php:68,80` — `status pending→approved→revoked` + `approved_at`/`revoked_at` **양쪽 타임스탬프 분리 보존** | **★LEGACY_ADAPTER**(유일 선례·재사용 근거) |
| 그 선례의 **집행 강도** | 매 요청 approved 재검증 **fail-closed**(`AgencyPortal.php:427`) — revoke 즉시 실효 | **VALIDATED_LEGACY**(패턴 승격) |
| `action_request` / `mapping_change_request` | 취소 상태·취소 시각 컬럼 **없음**(`Db.php:592-600` · `:623-636`) | **MIGRATION_REQUIRED** |
| Cancellation **Type** 구분 | **부재** — 취소 사유·주체·계기를 나눌 축 자체가 없음 | **NOT_APPLICABLE** |

> **선례가 증명하는 것**: 저장소는 이미 "승인은 종점이 아니다 — 승인 뒤에도 거둘 수 있다"를 **한 곳에서** 구현했다(`agency_client_link`). 부재는 **개념의 부재가 아니라 일반화의 부재**다 → **신설이 아니라 승격**.

## 1. Cancellation = **요청자 외 주체가 · 결정 전후 무관하게** 요청/승인을 무효화

Withdrawal(§36)과의 분기점은 **주체**와 **시점 허용범위**다.

| 축 | Withdrawal(§36) | **Cancellation(§37)** |
|---|---|---|
| 주체 | 요청자 본인 | **권한자·시스템·정책·상위 사건** |
| 시점 | Decision **전**만 | Decision **전·후 모두** |
| 선례 | 없음 | **`agency_client_link.revoked_at`** |

**필드 14 · Cancellation Type 10** — 스펙 §37 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `14`/`10`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드/Type 축 커버리지 주장 불가**.

영속된 요구(§0 Q18·§4.8·§4.9·§61)에서 확정 가능한 구조 요구:
- Cancellation은 **Append-only 사건**이다(§4.9) — `agency_client_link`가 `approved_at`을 **지우지 않고** `revoked_at`을 **추가**하는 방식이 정본 패턴.
- Cancellation은 **Decision을 삭제하지 않는다** — 과거 승인이 있었다는 사실은 남고, 그 **효력만** 종료된다.
- 취소 후 **실효는 즉시·fail-closed**여야 한다(`AgencyPortal.php:427` 매 요청 재검증 패턴 재사용).

## 2. 규칙

- **`agency_client_link` revoke 패턴을 재사용**한다 — 별도 취소 모델 신설 금지(Golden Rule = Replace가 아니라 Extend). 승격 방향: **링크 전용 → Canonical Approval Cancellation**.
- **Cancellation ≠ Withdrawal ≠ Rejection ≠ Expiration ≠ Supersession**(§4.8) — 현행이 이 5종을 `rejected` 하나로 뭉갠 것이 **MIGRATION_REQUIRED**의 실체.
- **이미 실행된 건의 취소는 실행 자체를 되돌리지 않는다** — 취소는 **승인 효력 종료**일 뿐, 집행된 Financial Action의 원복은 Reversal/Correction 요구(현행 **부재**).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤). 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
