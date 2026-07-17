# DSAR — Approval Decision Type (§22·14종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 승인 경로 | 지원 결정 종류 | 분류 |
|---|---|---|
| `Mapping::approve` `Handlers/Mapping.php:238-294` | **approve 1종뿐** — reject 경로 자체가 이 메서드에 없음 · 결과 status = `approved`/`pending`(`:287`) | **MIGRATION_REQUIRED** |
| `Alerting::decideAction` `Handlers/Alerting.php:572-599` | `$decision`(`:578`, 기본값 `"approve"`) → `:593` **`approve` 면 `approved`, 그 외 전부 `rejected`** = **실질 2종** · **미검증 자유문자열**(화이트리스트 없음) | **MIGRATION_REQUIRED** |
| `AdminGrowth::approvalDecide` `Handlers/AdminGrowth.php:1313-1343` | `approved`/`rejected` **2종** · `:1321` `in_array(['approved','rejected'])` **화이트리스트 검증 존재** | **VALIDATED_LEGACY**(검증 패턴 재사용) |
| `Catalog::approveQueue` `Handlers/Catalog.php:2341-2364` | **approve 1종**(reject 경로 없음) | **MIGRATION_REQUIRED** |
| Conditional / Changes Required / Delegate / Abstain 등 | **부재**(grep 0) | **NOT_APPLICABLE(부재→신설)** |
| Decision Type **컬럼** | **부재** — 종류는 `status` 문자열에 융합되어 있음 | **NOT_APPLICABLE** |

**핵심**: 현행 결정 종류 = **approve / reject 2종**(그마저 경로별 상이). 스펙 §62 완료보고가 요구하는
**Conditional 수(17)·Changes Required 수(18)** 는 **집계 대상 자체가 없다**.

## 1. Decision Type 14종

스펙 §22 의 **14종 원문 항목명은 저장소 미영속**(REQ 는 개수 `14` 만 고정 · 나열 부재) → **UNVERIFIED**.
**14종의 이름을 추정·창작하지 않는다**(REQ §15 역산 금지 — 자작 열거형으로 낸 커버리지는 동어반복).

확정 사실만:
- 현행 실측 = **2종**(approve/reject). 14 대비 **12종 부재**로 보이나, **항목명 미확인이므로 매핑 주장 금지**
  (현행 `approve` 가 스펙의 어느 항목에 대응하는지 확정 불가 — 이름 없이 대조 불가).
- `Alerting::decideAction` `:578,593` 의 **`else` 폴백**(approve 아니면 전부 rejected)은 오타·미지원 종류를
  **조용히 rejected 로 흡수**한다 → Decision Type 확장 시 **최우선 제거 대상**(무음 오분류).
- `AdminGrowth` `:1321` 화이트리스트 = **유일한 정본 검증 패턴** → 확장 기반.

## 2. 규칙

- **Type 열거형 창작 후 정본화 금지** — 스펙 §22 원문 수령 후 채운다.
- **자유문자열 decision 폐기** — `AdminGrowth::approvalDecide:1321` 의 `in_array` **화이트리스트 검증을 정본으로 승격**(Golden Rule = Extend).
- **미지원 Type = 명시적 422** — `else → rejected` 무음 폴백 금지(오분류가 승인 이력을 오염).
- **Decision Type 은 Decision 행의 필드**(§22) — `status` 컬럼에 융합 금지(§4.3 필요성↔결과 분리 · Decision 문서 §2 참조).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.
