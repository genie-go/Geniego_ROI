# DSAR — Workflow Type (§8)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §8 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Workflow Type 분류축 | **grep 0** — Definition 이 없으므로 그 유형도 없다 | `NOT_APPLICABLE`(부재 → 신설) |
| SUB_WORKFLOW | 하위 워크플로 호출 **grep 0** | `NOT_APPLICABLE` |
| MIGRATION | `backend/migrations` 는 **세션 172 에서 정지** · 이후 핸들러별 `ensureTables` 자가치유 — **승인 마이그레이션 워크플로 아님** | `KEEP_SEPARATE_WITH_REASON`(명명 충돌) |
| SYSTEM | 부재 | `NOT_APPLICABLE` |

**★축 주의:** 원문 Workflow Type 은 **Definition 의 생성·실행 성격**(표준/템플릿기반/커스텀/시스템/하위/긴급참조/이관/읽기전용/혼합)을 분류한다. 현행에 Definition 이 없으므로 **대응물이 원리적으로 존재할 수 없다** — 현행 핸들러를 이 축에 매핑하는 것은 역산이다.

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | STANDARD | 부재 | `NOT_APPLICABLE` |
| 2 | TEMPLATE_BASED | 부재 — Template 자체가 부재(§7) | `NOT_APPLICABLE` |
| 3 | CUSTOM | 부재 | `NOT_APPLICABLE` |
| 4 | SYSTEM | 부재 | `NOT_APPLICABLE` |
| 5 | SUB_WORKFLOW | 부재(grep 0) | `NOT_APPLICABLE` |
| 6 | EMERGENCY_REFERENCE | 부재 — break-glass/JIT 승인 워크플로 grep 0 | `NOT_APPLICABLE` |
| 7 | MIGRATION | 부재(승인 도메인). `backend/migrations`(세션 172 정지)와 **동명이의** | `NOT_APPLICABLE` |
| 8 | READ_ONLY_REVIEW | 부재 — Review 와 Approval 미분화 | `NOT_APPLICABLE` |
| 9 | HYBRID | 부재 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버리지 = **부재 9 / 9 (100%)**.

## 2. 규칙

- **본 축은 현행 커버리지 0 이다.** 어떤 현행 핸들러도 Workflow Type 을 갖지 않는다 — **"이미 STANDARD 로 동작 중"이라는 서술 금지**(Definition 부재 → 유형 부재).
- `EMERGENCY_REFERENCE`·`MIGRATION` 은 **참조 유형**이다 — 별도 블록(Emergency Break-glass·Migration Plan)의 정의를 참조만 하고 **중복 정의 금지**.
- `READ_ONLY_REVIEW` 는 **승인 권한 없는 검토**를 뜻한다 — 현행은 Review/Approval 이 미분화이므로, 신설 시 `TeamPermissions::ACTIONS` 의 고아 `'approve'`(TeamPermissions.php:39 · **호출부 grep 0**)와 혼동 금지.
- 🔴 `MIGRATION` 을 `backend/migrations` 인프라와 연결 금지 — 동명이의다.
