# DSAR — Conflict Resolution 기본 우선순위 (§46)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §46 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

★ **원문 §46 은 불릿이 아니라 번호목록(`1.`~`10.`)이다** — 측정기 분모 = 불릿 0 / 번호 10. **순서 자체가 요구사항**이므로 표의 `#` 는 원문 번호를 보존한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 우선순위 해소 엔진 | `resolveApprover`·`approval_chain`·`routeApproval` **grep 0** | `ABSENT` |
| **정렬 대상** | 🔴 **manager 후보를 계산하는 코드가 0** → **정렬할 대상이 없다** | `ABSENT`(**무대상**) |
| Source Priority(#2) | **manager 보유 소스 = 0개**(ⓑ §7) — §62 와 동근 | `ABSENT`(**무대상**) |
| 우선순위 상수 선례 | `edge priority`·`source_priority`·`priority` 열 **manager 도메인 0** | `ABSENT` |
| Manual Review(#9) | ✅ 승인 대기 상태 선례 2건 REAL(`mapping_change_request` · `catalog_writeback_job` `pending_approval`) | `LEGACY_ADAPTER` |
| Block(#10) | ✅ **쓰기 전 차단 선례** `Handlers/PM/Dependencies.php:32-34`(422 `cycle_detected`) | `LEGACY_ADAPTER` |

### ★축 주의 — **"우선순위 미구현"이 아니라 정렬할 대상이 0개**(규율 규칙 10)

🔴 §46 은 **복수 후보를 전제한 순서 규칙**이다. 현행은 후보 생성기가 **0개**이므로 10단계 중 어느 것도 "미구현"이라 부를 수 없다 — **무대상**이다. **§62 Source Priority 판정과 정확히 동형**이며, 이를 "우선순위만 붙이면 된다"로 읽으면 **역산**이다.

## 1. 원문 전사 + 판정 — **원문 10단계(번호목록)**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Explicit Governance Override | Governance Override 축 0 · ⚠️ `DATA_SCOPES` `'company'` 는 **무제한 센티넬**(`effectiveScope():258`)이지 override 아님 | `ABSENT` |
| 2 | Higher-priority Authoritative Source | 🔴 **manager 보유 소스 0개** → §62 와 동일 **무대상**. 권장 12단계 중 2·3·4(HRIS)·5(ERP)·8(IdP)·9(SCIM) **6단계 ABSENT** | `ABSENT` |
| 3 | Active Acting Assignment for matching scope | `acting` grep 0 · 🔴 `UserAdmin::impersonate:466-525` 는 **신원 위장 열람**(기간부 Assignment·original manager 참조·covered scope **전무**) — §29 로 계산 금지 | `ABSENT` |
| 4 | Active Interim Assignment | `interim` 1건 = 지오리프트 중간결과(`AttributionEngine.php:672`) — **무관** | `ABSENT` |
| 5 | Position-based Primary Supervisor | Position 축 0(§3.1 18/18 `CONTRACT_ONLY`) | `ABSENT` |
| 6 | Subject-based Primary Direct Manager | `team.manager_user_id` **1칸** · 🔴 **primary 개념 없음**(단일값이라 primary 를 선언할 상대가 없다) | `ABSENT` |
| 7 | Organization Primary Administrative Manager | `team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`TeamPermissions.php:148`/`:168`) | `ABSENT` |
| 8 | Domain-specific Functional Manager | 🔴 도메인 오너 7항목 중 6 `ABSENT` · 유일 인접 `pm_projects.owner_user_id` 는 **판독 술어 0 = 저장된 라벨** | `ABSENT` |
| 9 | Manual Review | 부재(manager) · 인접 선례 = `mapping_change_request`(**REAL** — actor fail-closed `Mapping.php:246-250` · 자기승인 차단 `:268-271` · dedup `:278-283` · 정족수 `:287`) | `LEGACY_ADAPTER` |
| 10 | Block | 부재(manager) · 인접 선례 = `Dependencies.php:32-34` **쓰기 전 422 차단** | `LEGACY_ADAPTER` |

**실측 개수: 10 / 10 전사.** 커버리지 = `ABSENT` 8 · `LEGACY_ADAPTER` 2(#9·#10 — **패턴 선례만**, 커버 아님).

★ **원문 말미 요구**(항목 아님 · 분모 밖): *"충돌이 Material한 경우 자동 Resolution 결과와 근거를 Evidence로 남겨라."*

## 2. 규칙

- 🔴 **§46 은 §5 Canonical 선언 + §51 Manager Candidate 이후에만 집행 가능하다.** 후보 0개 위에 우선순위를 얹으면 **10단계 전부가 항상 #10 Block 으로 떨어지거나**, 더 나쁘게는 **평가할 게 없어 자동 통과 = 가짜 녹색**이 된다.
- 🔴 **#2 를 "우선순위만 미구현"으로 적지 마라.** EnterpriseAuth 는 존재하나 **manager 데이터를 한 바이트도 싣지 않는다** → `VACUOUS` 이전에 **무대상**. **"source 측만 만들면 된다"는 역산**이며 **Canonical 선언이 선행**한다(§66 이중 공허와 동근).
- ★ **#9 Manual Review 는 `Mapping` 을 표준으로 삼아라** — maker-checker 4요소(actor fail-closed · 자기승인 차단 · dedup · 정족수)가 **전부 갖춰진 유일 경로**다.
  🔴 **`Catalog::approveQueue:2341-2365` 를 참조 구현으로 삼지 마라** — 실집행 경로는 REAL 이나 **행위자를 읽지도 않으며**(`:2343` `requirePro` = **구독 플랜 게이트**) `Mapping` 의 maker-checker 를 **전혀 갖지 않는다**. 이를 "중복 제거"로 통합하면 **`Mapping` 의 능력이 소실된다**(규칙 9 — 미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).
- ★ **#10 Block 은 쓰기 경로에서 집행하라**(`Dependencies.php:32-34` 패턴). 🔴 `Gantt.php:120-125` 의 **부분결과+경고 degrade** 를 Resolution 에 적용하면 **미해소 충돌이 저장·집행된다**.
- ★ **Evidence 말미 요구**: 자동 Resolution 결과와 **근거**를 남겨라 → `pm_audit_log` 패턴(`tenant_id NOT NULL`+`diff_json`+append-only) 확장. 🔴 **`menu_audit_log` 스키마 복제 금지(`tenant_id` 없음)** — 해시체인 알고리즘만 이식. 🔴 **단 쓰기 체인만 실재·검증기(`verify()`) 0·preimage ts(`:195`) 소실 → tamper-evident 아님**; 검증형 정본 = `SecurityAudit::verify():56-68`.
- ⚠️ **"Material" 의 기준은 원문이 정의하지 않는다** — §45 `severity` 와의 결합 규칙은 **본 블록 범위 밖**이며 임의 정의 금지(요구 날조 0).
</content>
