# DSAR — Approval Delegation Index·Performance (§61)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §61(줄 2574-2603) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ⓓ ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(예정)
> 판정 어휘(§58): `NOT_APPLICABLE`·`ABSENT`·`LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON`·`TEST_ONLY`·`BLOCKED_*` — **`VALIDATED_LEGACY` 금지(커버 0).**
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=61` → **23**(불릿 23·번호 0). 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 테이블 | `delegation`/`delegate_binding`/`delegator_binding` 등 grep **0** — Delegation 엔티티 통째 부재(ⓑ §1·§0) | `NOT_APPLICABLE`(인덱스 대상 없음) |
| 인덱스 걸 컬럼(tenant/delegator/delegate/status/effective…) | 테이블이 없으므로 컬럼도 없음 → **최적화할 조회가 존재하지 않음** | `NOT_APPLICABLE` |
| 인덱스 패턴 선례(테넌트 스코프 복합) | `pm_task_dependencies`: `UNIQUE KEY uq_pm_dep(tenant_id,predecessor_id,successor_id,dep_type)` + 방향별 `KEY idx_pm_dep_pred`·`idx_pm_dep_succ`(`20260526_168_004:12-14`) — **관계 엔티티의 테넌트 스코프 유일성 + 양방향 조회 패턴**(위임 Delegator→Delegate 조회에 직접 참조 가능) | 선례(확장 참조) |
| 인덱스 선례(권한 저장) | `api_key`: `CREATE INDEX idx_api_key_tenant ON api_key(tenant_id,is_active)`(`Db.php:956`) — 도메인 상이(API 키 인증). Delegation 인덱스 아님 | `KEEP_SEPARATE_WITH_REASON`(도메인 상이) |

★**Delegation 테이블이 통째로 부재하므로 "최소 최적화 조회 23종"은 모두 인덱스 대상이 존재하지 않는다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이 / 인접 인덱스 선례"를 기록한다. 원문에 없는 인덱스를 지어내지 않는다.

## 1. 원문 전사 + 판정 — **원문 23종**(§61 최소 최적화 조회 목록)

| # | 원문 조회 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant별 Active Delegation | Delegation 테이블 부재 → 조회 대상 0 · 테넌트 스코프 복합인덱스 선례=`pm_task_dependencies`(168_004:12) | `NOT_APPLICABLE` |
| 2 | Delegator별 Delegation | Delegator Binding(§21) 엔티티 부재 · 방향별 조회 선례=`idx_pm_dep_pred`(168_004:13) | `NOT_APPLICABLE` |
| 3 | Delegate별 Delegation | Delegate Binding(§22) 엔티티 부재 · 방향별 조회 선례=`idx_pm_dep_succ`(168_004:14) | `NOT_APPLICABLE` |
| 4 | Type별 Delegation | Delegation Type(§8) 부재 | `NOT_APPLICABLE` |
| 5 | Status별 Delegation | Delegation Lifecycle status(§41) 부재 · 현행 status는 도메인별 산발(합법 전이집합 선언 0·ⓑ §2.5) | `NOT_APPLICABLE` |
| 6 | Effective Date 기준 Delegation | Effective-dated Period(§20) 엔티티 부재 · 인접 open-interval=`kr_fee_rule.effective_from`(수수료 도메인·ⓑ §3.2) | `NOT_APPLICABLE` |
| 7 | Organization별 Delegation | Organization Binding(§15) 부재 · Org 마스터 자체 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 8 | Legal Entity별 Delegation | Legal Entity Binding(§16) 부재 · Legal Entity 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 9 | Resource별 Delegation | Resource Binding(§13) 부재 · 인접 = `acl_permission` scopeSql 행필터(권한 아닌 데이터·ⓑ §2.1) | `NOT_APPLICABLE` |
| 10 | Action별 Delegation | Action Binding(§14) 부재 · 인접 = `acl_permission` menu×action 매트릭스(위임 아님) | `NOT_APPLICABLE` |
| 11 | Authority별 Delegation | Authority Binding(§12) 부재 · Authority Registry/Matrix 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 12 | Amount Band별 Delegation | Monetary Binding(§18) 부재 · 유일 금액조건=`HIGH_VALUE_KRW` 상수(boolean·ⓑ §3.2) | `NOT_APPLICABLE` |
| 13 | Currency별 Delegation | Currency Binding(§19) 부재 · 통화 스코프 저장계층 0 | `NOT_APPLICABLE` |
| 14 | Chain Level별 Delegation | Delegation Chain(§36)/Approval Chain Level 부재(5-3-3-3 커버 0·ⓑ §3.1) | `NOT_APPLICABLE` |
| 15 | Approval Case별 Delegation Resolution | Approval Case/Resolution(§30) 부재 · 단발 승인 플래그 3종만(ⓑ §3.1) | `NOT_APPLICABLE` |
| 16 | Active Conflict | Delegation Conflict(§34) 부재 | `NOT_APPLICABLE` |
| 17 | Cycle 상태 | Cycle Detection(§38) 부재 · 인접 DFS=`PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`(위임 체인 아님·ⓑ §2.4) | `NOT_APPLICABLE` |
| 18 | Future Activation | Delegation Activation(§42) 부재 · Future Scheduler 0 | `NOT_APPLICABLE` |
| 19 | Future Expiration | Delegation Expiration(§45) 부재 | `NOT_APPLICABLE` |
| 20 | Revoked Delegation | Delegation Revocation(§44) 부재 · 인접 = `agency_client_link.revoked_at` 수동철회(접근권·ⓑ §2.3) | `NOT_APPLICABLE` |
| 21 | Suspended Delegation | Delegation Suspension(§43) 부재 · `login_attempt.locked_until`=로그인 스로틀(권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE` |
| 22 | Snapshot | Delegation Snapshot(§39) 부재 · 인접 정본 = `SecurityAudit::verify():56-68`(검증형·ⓑ §2.5) | `NOT_APPLICABLE` |
| 23 | Reconciliation Mismatch | Delegation Reconciliation(§49) 부재 · 외부 소스(HRIS/Calendar/ERP) 5축 전부 ABSENT(ⓑ §1) | `NOT_APPLICABLE` |

**실측 개수: 23 / 23 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 23.

> 🔴 **커버 0.** Delegation 테이블이 통째로 부재하므로 23종 최적화 조회 중 **인덱스가 실재하는 항목은 하나도 없다** — 어떤 항목도 `VALIDATED_LEGACY`가 아니다. 인덱스 대상 부재는 "인덱스가 최적"이라는 우연한 준수가 **아니다**(측정 불가). `pm_task_dependencies` UNIQUE + 방향별 KEY(168_004:12-14)는 **신설 시 참조할 패턴 선례**이지 커버가 아니다.

## 2. 규칙

- 🔴 **인덱스를 신설 엔티티 위에서만 설계하라** — Delegation 테이블이 없으면 §61 조회 23종은 전부 인덱스 대상이 없다. "현행에 인덱스가 있다/최적이다"로 표기 금지(우연한 준수 계산 금지).
- 🔴 **패턴은 참조하되 재구현하지 마라** — 테넌트 스코프 관계 엔티티의 유일성+양방향 조회는 `pm_task_dependencies`(`UNIQUE(tenant_id,pred,succ,type)` + 방향별 KEY·`20260526_168_004:12-14`)가 검증된 선례다. Delegator→Delegate 조회 인덱스는 이 형태를 따르되 별도 도메인 인덱스로.
- 🔴 **`api_key(tenant_id,is_active)` 인덱스(`Db.php:956`)를 Delegation 인덱스로 혼동 금지** — 도메인이 상이하다(API 키 인증). `KEEP_SEPARATE_WITH_REASON`.
- 🔴 **`tenant_id`를 인덱스 선두 컬럼으로 강제하라** — Tenant Guard가 strict 기본 OFF(`index.php:585`·ⓑ §3.4)인 잔여 위험을 인덱스 레벨에서 상속하지 말고, 모든 Delegation 인덱스는 `tenant_id` 선두 복합으로 Cross-Tenant 조회를 물리적으로 분리하라(§66 정합).
