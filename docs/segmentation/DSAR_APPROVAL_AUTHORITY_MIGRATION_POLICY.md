# DSAR — Authority Version Migration Policy (§11)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §11(834-853) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 상위: [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) 필드 #26

> **★분할 분모: §10 측정기 28+15+14=57 정합** — 본 문서는 **§11 별도 측정**(`measure_spec_denominator.mjs --sec=11` = **11**). §11 Migration Policy 11종은 §10(57) 분모와 분리 계상한다. 본 문서 = 지원 정책 **11종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Migration 집행수단 | 🔴 `backend/migrations/` 21파일·`20260527_172_002` **정지** · `ensureTables`=CREATE만·**백필 0**(ⓑ §5) — 버전 이행 집행기 부재 | `NOT_APPLICABLE` |
| 이행 대상 버전 엔티티 | Authority Version 엔티티 부재(→[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md)) → 이행할 버전 전이 자체 없음 | `NOT_APPLICABLE` |
| 정면 반례(파괴적 이행) | 🔴 `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(ⓑ §5) → as-of 재구성 불가 · **복제 금지** | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 원문 불변성 명령 | §11 원문 마지막 문장 "완료된 Decision의 당시 Authority Snapshot을 변경하지 마라"(831行 상당) = `SecurityAudit` 불변성 원칙(`verify():56-68`·ⓑ §5) | `LEGACY_ADAPTER`(불변성 정본) |

★**이행 집행수단 부재 + 이행 대상 버전 엔티티 부재 → 이행 정책 11종 열거는 무의미.** 11종 전량 `NOT_APPLICABLE`. `VALIDATED_LEGACY` 금지(커버 0). 원문 불변성 명령은 신설 시 `SecurityAudit` 불변성을 상속하고 `AgencyPortal` in-place 소거를 상속하지 않도록 강제하는 게이트다.

## 1. 원문 전사 + 판정 — **지원 정책 11종**

| # | 원문 정책 | 정책 의미 · 현행 대조(ⓑ) | 판정 |
|---|---|---|---|
| 1 | NEW_CASES_ONLY | 신규 케이스만 신버전 적용 · 버전 엔티티·이행 집행기 부재(ⓑ §5) | `NOT_APPLICABLE` |
| 2 | ACTIVE_TASKS_KEEP_SNAPSHOT | 진행 태스크는 당시 스냅샷 유지 · 🔴 Actor Auth Snapshot ABSENT(보존할 스냅샷 없음·ⓑ §5) | `NOT_APPLICABLE` |
| 3 | UNASSIGNED_LEVELS_REEVALUATE | 미배정 레벨 재평가 · Approval Level 엔티티 부재([VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #15) | `NOT_APPLICABLE` |
| 4 | FUTURE_STAGES_REEVALUATE | 미래 단계 재평가 · Future-Dated ABSENT(미래 예약 0·ⓑ §5) | `NOT_APPLICABLE` |
| 5 | CURRENT_TASK_REVALIDATE | 현재 태스크 재검증 · 재검증 대상 authority 판독축 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 6 | SELECTED_CASES_MIGRATE | 선택 케이스 이행 · 이행 집행기 부재(백필 0·ⓑ §5) | `NOT_APPLICABLE` |
| 7 | ALL_ELIGIBLE_CASES_MIGRATE | 적격 전체 이행 · 상동 — 대량 이행 수단 없음 | `NOT_APPLICABLE` |
| 8 | MANUAL_REVIEW | 수동 검토 후 이행 · Review 단계 미분화(reviewed_by ABSENT·ⓑ §2) | `NOT_APPLICABLE` |
| 9 | BLOCK_NEW_DECISIONS | 이행 중 신규 결정 차단 · 결정 게이트를 버전에 묶는 수단 부재 | `NOT_APPLICABLE` |
| 10 | NO_MIGRATION | 이행 안 함(기존 유지) · 우연히 현행과 일치하나 **버전이 없어 "이행 안 함"도 무의미**(계산 금지) | `NOT_APPLICABLE` |
| 11 | CUSTOM | 사용자정의 이행 · 확장 훅 부재 | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 11(전량).

> 🔴 **커버 0.** 이행 집행수단(migrations 172정지·`ensureTables` 백필 0·ⓑ §5)과 이행 대상 버전 엔티티가 모두 부재하므로 정책 11종은 **집행할 수단이 없다**. NO_MIGRATION(#10)이 현행 상태와 표면상 일치하나, 버전 자체가 없으므로 "이행 안 함"조차 성립하지 않는다(우연한 준수·계산 금지).

## 2. 규칙

- 🔴 **원문 불변성 명령을 `SecurityAudit` 불변성으로 상속하라** — §11 원문 "완료된 Decision의 당시 Authority Snapshot을 변경하지 마라"는 `SecurityAudit::verify():56-68`(preimage ts 저장·prev_hash 교차·ⓑ §5)의 append-only 불변성 원칙이다. ACTIVE_TASKS_KEEP_SNAPSHOT(#2)은 [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md)의 6개 `*_snapshot` 신설을 전제한다.
- 🔴 **`AgencyPortal` in-place 소거를 이행 수단으로 복제하지 마라** — `AgencyPortal.php:304,381` `revoked_at=NULL`(ⓑ §5)은 as-of 재구성을 붕괴시키는 파괴적 정정이다. 어떤 Migration Policy 도 완료된 Decision snapshot 을 in-place 변경해서는 안 된다(`BLOCKED_HISTORICAL_INTEGRITY_RISK` 상속 방지).
- 🔴 **이행 집행기를 신설하되 migrations 172정지 공백을 메꿔라** — 현행 `ensureTables`=CREATE만·백필 0(ⓑ §5). SELECTED/ALL_ELIGIBLE_CASES_MIGRATE 는 실 백필 집행기가 선행되어야 하며, 백필 자체도 원본 snapshot 을 보존하는 append 방식이어야 한다.
- 🔴 **NO_MIGRATION 을 "현행 준수"로 오판하지 마라** — 버전 엔티티 부재는 "이행 안 함 정책 선택"이 아니라 **미구현**이다(§65 gap 이 아니라 부재·ⓑ §8). 우연한 일치를 준수로 계상 금지.
