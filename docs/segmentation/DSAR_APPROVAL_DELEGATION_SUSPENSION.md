# DSAR — Approval Delegation Suspension (§43)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §43(줄 1836-1857) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=43` → **13**(불릿 13·번호 0) = Suspension 사유 enum 13

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 정지 처리기 | 🔴 SUSPENDED 상태 전이(§41 `ACTIVE → SUSPENDED`) 및 정지 사유 저장계층 통째 부재 — `APPROVAL_DELEGATION_*` 0(ⓑ §1·§4) | `ABSENT` |
| "Suspension" 이름 유일 히트 | `login_attempt.locked_until`(`UserAuth.php:3335,3405`) = **로그인 실패 스로틀**(계정 잠금·권한/위임 정지 아님·ⓑ §3.4) | `LEGACY_ADAPTER`(인접·도메인 상이) |
| SoD/CoI 정지 트리거 | 🔴 SoD Hook·CoI Hook grep 0(ⓑ §3.4 ABSENT) → 충돌기반 정지 발동원 부재 | `ABSENT` |

★**정지 처리기 전체가 부재하므로 사유 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "정지 발동원 부재 깊이·인접 잠금 자산"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 13종**(Suspension 사유 enum)

| # | 원문 사유 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SECURITY_SUSPENSION | 인접 실재 = `login_attempt.locked_until`(`UserAuth.php:3335` 스키마·`:3405` 잠금대입·`:3370` 조회) — 🔴 **로그인 실패 스로틀이지 권한/위임 정지 아님**(ⓑ §3.4·Delegation 활성 레코드 대상 아님) | `LEGACY_ADAPTER` |
| 2 | DELEGATOR_AUTHORITY_SUSPENDED | 🔴 위임자의 Original Authority 정지를 감지하려면 Authority Registry/Resolution 이 선결인데 부재(ⓑ §3.2 ABSENT·5-3-3-4 "Authority 개념 없음") → 발동 대상 미정의 | `BLOCKED_PREREQUISITE` |
| 3 | DELEGATE_SUSPENDED | 인접 = 계정 로그인 잠금(`login_attempt.locked_until` `UserAuth.php:3405`) — 🔴 계정 접속 차단이지 위임 수임자 권한정지 아님(ⓑ §3.4) · Delegate 관계 엔티티(§22) 부재로 연동 불가 | `LEGACY_ADAPTER` |
| 4 | LEGAL_ENTITY_RESTRICTION | 🔴 **Legal Entity 전면 void** — `biz_no`/`corp_reg`/`tax_id` grep 0 · `business_number` 단일 문자열은 법인 아님(ⓑ §3.3) → 법인 제한 정지 사유 표현 불가 | `ABSENT` |
| 5 | ORGANIZATION_CHANGE | 🔴 Organization Unit/Hierarchy 엔티티 부재(ⓑ §3.3·5-3-3-1 확정) → 조직변경 감지원 0 | `ABSENT` |
| 6 | ROLE_CHANGE | 🔴 Role=`team_role` flat enum 3값(owner/manager/member)뿐 · 역할변경 이벤트/트리거로 위임 정지시키는 배선 0(ⓑ §3.3) | `ABSENT` |
| 7 | POSITION_CHANGE | 🔴 Position/Incumbency 엔티티 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) → 직위변경 감지원 0 | `ABSENT` |
| 8 | PERIOD_ANOMALY | 🔴 Delegation Period(§20) 엔티티 0 · `start_at`/`end_at`/effective-dating 저장계층 부재(ⓑ §2.1 "기간 없음") → 기간이상 판정 불가 | `ABSENT` |
| 9 | CONFLICT_DETECTED | 🔴 Conflict-of-interest Hook grep 0(ⓑ §3.4 ABSENT) · Delegation Conflict(§34) 엔티티 0 → 충돌 감지원 부재 | `ABSENT` |
| 10 | SOD_FAILURE | 🔴 Segregation of Duties Hook grep 0(ⓑ §3.4 ABSENT) → SoD 위반 감지원 부재 | `ABSENT` |
| 11 | AUDIT_HOLD | 🔴 감사보류로 위임을 정지시키는 자산 0 · evidence 정본 `SecurityAudit` 은 검증기이지 정지 트리거 아님(ⓑ §2.5) | `ABSENT` |
| 12 | MANUAL_HOLD | 🔴 Delegation 수동정지 경로 0(SUSPENDED 상태 전이 미구현·§41 doc) | `ABSENT` |
| 13 | CUSTOM | 🔴 확장 사유 슬롯 부재 — 정지 enum 저장계층 자체 없음 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 9 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** 정지 사유 13종 중 어느 것도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 2건(SECURITY_SUSPENSION·DELEGATE_SUSPENDED)은 **로그인 실패 스로틀**(`login_attempt.locked_until`)이 인접할 뿐 권한정지가 아니다 — 이름 유사에 속아 커버로 계산하지 마라. `BLOCKED_PREREQUISITE` 1건(DELEGATOR_AUTHORITY_SUSPENDED)은 Authority Registry/Resolution 신설 후에만 발동 가능하다.

## 2. 규칙

- 🔴 **Suspension 중에는 새로운 Decision 을 허용하지 마라**(원문 §43 말미) — SUSPENDED 상태의 Delegation 으로 승인 시도 시 fail-closed 로 차단해야 한다. 이는 §11 "Decision 시점 재검증"(§42 Activation·§41 `ACTIVE → SUSPENDED` 전이와 연동)의 정지판(版)이다. 정지 상태를 저장만 하고 Decision 게이트에 반영하지 않으면 무의미하다.
- 🔴 **SECURITY_SUSPENSION/DELEGATE_SUSPENDED 를 로그인 스로틀로 오구현 금지** — `login_attempt.locked_until`(`UserAuth.php:3405`)은 **계정 접속 잠금**이지 위임 권한정지가 아니다(ⓑ §3.4). 이름 유사로 재사용하면 "로그인은 되는데 위임 권한만 정지" 같은 정당 케이스를 표현하지 못한다. Delegation 정지는 활성 Delegation 레코드 상태를 대상으로 별도 신설하라.
- 🔴 **DELEGATOR_AUTHORITY_SUSPENDED 는 Authority Foundation 신설을 선행조건으로 한다** — 위임자의 Original Authority 가 정지되면 Delegation 도 정지돼야 하나(원문 "Delegator 가 Authority 를 상실하면 Delegation 은 어떻게 되는가"), Authority Registry/Resolution(§3.2) 부재로 현재는 감지 불가다. 선행 신설 없이 이 사유를 "구현됨" 으로 표기하지 마라.
- 🔴 **SOD_FAILURE/CONFLICT_DETECTED 는 Hook 신설 후에만 발동한다** — SoD/CoI Hook 이 grep 0(ⓑ §3.4)이다. 정지 사유 enum 만 선언하고 Hook 을 비우면 충돌·SoD 위반이 정지를 발동하지 못한다. Hook 을 실 발동원으로 배선하라.
- 🔴 **정지·해제는 immutable 근거와 함께 기록하라** — evidence 정본=`SecurityAudit::verify():56-68`(preimage ts·hash_equals·prev_hash·tenant) 확장. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식). SUSPENDED→ACTIVE 재활성(§41 전이 29)도 근거를 남겨라.
