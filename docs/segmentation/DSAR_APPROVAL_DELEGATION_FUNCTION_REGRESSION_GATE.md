# DSAR — Approval Delegation 테스트 범위 / Function·Regression Gate (§63)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §63(줄 2655-2758) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ⓓ ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(예정)
> 판정 어휘(§58): `NOT_APPLICABLE`·`ABSENT`·`LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON`·`TEST_ONLY`·`BLOCKED_*` — **`VALIDATED_LEGACY` 금지(커버 0).**
> 측정기 분모: `--sec=63` → **82**(불릿 82·번호 0). **헤더 분할 분모 = Unit 20 + Integration 18 + Property 11 + Concurrency 7 + Security 15 + Regression 11 = 82.** 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| PHP 테스트 러너 | 🔴 `backend/composer.json` **`require-dev` 절 자체 부재** · `phpunit` grep 0 — 단위/통합 테스트 러너 없음 | `ABSENT` |
| JS 테스트 러너 | 🔴 `package.json` `scripts`에 **`test` 없음**(`build`·`e2e`·`e2e:render`·`e2e:scenario`·`chatbot:kb`만·`:2-8`) · jest/vitest 미설치 | `ABSENT` |
| 인접 하네스 | `tools/e2e/smoke.mjs` = **liveness 스윕**(로그인 후 GET 500 스윕·계약 200 체크) — 승인/위임 의미론 검증 0 | `LEGACY_ADAPTER`(liveness만) |
| 🔴 smoke 503 은폐 | `smoke.mjs:139-151` — 503은 "인프라 레이트리밋"으로 재시도 후 **비실패 처리**(`:143·:148-151`). 승인 게이트가 503으로 죽어도 회귀 미탐 여지 | 회귀 은폐 리스크 |
| smoke의 approvals 언급 | `smoke.mjs:42` `/api/v423/approvals` — GET liveness 대상일 뿐 **승인 의미론(정족수/권한/위임) 검증 아님** | `LEGACY_ADAPTER`(liveness만) |
| evidence 정본 | `SecurityAudit::verify():56-68`(tenant 해시·preimage·hash_equals) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**러너가 통째로 부재(PHPUnit·npm test 0)하고 Delegation 엔티티 자체가 없으므로 §63 테스트 82종은 실행 근거가 없다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "러너/대상 부재 / 인접 liveness 하네스"를 기록한다. 원문에 없는 테스트를 지어내지 않는다.

## 1. 원문 전사 + 판정 — **원문 82종**(6 test 소절)

### 1-A. Unit Test (20)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Delegation Definition 생성 | Definition(§9) 엔티티 부재 + 러너 0 | `ABSENT` |
| 2 | Delegation Version 생성 | Version(§10) 부재 · 불변 체인 선례 0(ⓑ §2.1) | `ABSENT` |
| 3 | Scope Binding | Scope(§11) 부재 | `ABSENT` |
| 4 | Period Validation | Period(§20) 부재 | `ABSENT` |
| 5 | Delegator Eligibility | Delegator Eligibility(§26) 부재 | `ABSENT` |
| 6 | Delegate Eligibility | Delegate Eligibility(§27) 부재 | `ABSENT` |
| 7 | Acceptance | Acceptance(§23) 부재 | `ABSENT` |
| 8 | Approval | Approval(§24) 부재 · 승인 4경로는 실재하나 위임 승인 아님(ⓑ §2.2) | `ABSENT` |
| 9 | Activation | Activation(§42) 부재 | `ABSENT` |
| 10 | Suspension | Suspension(§43) 부재 | `ABSENT` |
| 11 | Revocation | Revocation(§44) 부재 | `ABSENT` |
| 12 | Expiration | Expiration(§45) 부재 | `ABSENT` |
| 13 | Amount Ceiling | Monetary Binding(§18) 부재 · `HIGH_VALUE_KRW` 상수만(ⓑ §3.2) | `ABSENT` |
| 14 | Currency Scope | Currency Binding(§19) 부재 | `ABSENT` |
| 15 | Re-delegation | Re-delegation Governance(§37) 부재 · acl 위임상한은 재위임 경로 0(ⓑ §2.1) | `ABSENT` |
| 16 | Depth | Depth Bound 부재 · 인접 depth walk=PM/메뉴(위임 아님·ⓑ §2.4) | `ABSENT` |
| 17 | Cycle Detection | Cycle(§38) 부재 · 인접 DFS=`PM/Dependencies.php:79-100`(위임 체인 아님) | `ABSENT` |
| 18 | Conflict Resolution | Conflict(§34) 부재 | `ABSENT` |
| 19 | Snapshot Hash | Snapshot(§39) 부재 · 인접 hash 정본=`SecurityAudit::verify()`(ⓑ §2.5) | `ABSENT` |
| 20 | Simulation | Simulation(§48) 부재 | `ABSENT` |

### 1-B. Integration Test (18)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 21 | Approval Authority 연계 | Authority 0(ⓑ §3.2) + 러너 0 | `ABSENT` |
| 22 | Approval Chain Level 연계 | Chain(5-3-3-3) 커버 0(ⓑ §3.1) | `ABSENT` |
| 23 | Role Assignment 연계 | Role=`team_role` flat enum 3값(ⓑ §3.3) · 위임 연계 테스트 0 | `ABSENT` |
| 24 | Position Incumbency 연계 | Position/Incumbency 0(`position_idx`=Gantt 오탐·ⓑ §3.3) | `ABSENT` |
| 25 | Organization 연계 | Org 마스터 0(ⓑ §3.3) | `ABSENT` |
| 26 | Legal Entity 연계 | Legal Entity 0(ⓑ §3.3) | `ABSENT` |
| 27 | HRIS Leave 연계 | HRIS 소스 ABSENT(`hris`=`hig`hRis`k` 오탐·ⓑ §1) | `ABSENT` |
| 28 | Calendar Out-of-office 연계 | Calendar OOO 소스 ABSENT(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |
| 29 | ERP Delegation 연계 | ERP Delegate 소스 ABSENT(ⓑ §1) | `ABSENT` |
| 30 | Rebate Program | rebate authority/program 0 | `ABSENT` |
| 31 | Claim | claim approval 0 | `ABSENT` |
| 32 | Settlement | 정산 파이프라인 실재하나 위임 연계 테스트 0 · liveness만(smoke) | `LEGACY_ADAPTER`(liveness) |
| 33 | Payment | Paddle/Stripe 빌링 실재하나 위임 연계 테스트 0 | `LEGACY_ADAPTER`(liveness) |
| 34 | Payout | payout 위임 연계 0 | `ABSENT` |
| 35 | Contract | contract 엔티티 0 | `ABSENT` |
| 36 | Task Assignment Reference | 위임≠Task Reassignment 분리(§5.10) · PM 태스크 할당 실재하나 위임 참조 아님(ⓑ §2.4) | `KEEP_SEPARATE_WITH_REASON` |
| 37 | Decision Revalidation | Decision 재검증(§5.11) 훅 부재 · 위임 없어 무발동 | `ABSENT` |
| 38 | Reconciliation | Reconciliation(§49) 부재 · 외부소스 5축 0 | `ABSENT` |

### 1-C. Property Test (11)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 39 | Tenant Isolation | Delegation 부재 → 격리 프로퍼티 대상 없음 · Guard REAL이나 strict 기본 OFF(`index.php:585`·ⓑ §3.4) · 러너 0 | `ABSENT` |
| 40 | Immutable Version | 불변 version 체인 선례 0(ⓑ §2.1) | `ABSENT` |
| 41 | Delegated Scope ⊆ Original Scope | acl 위임상한(monotonicity)은 유사 개념이나 기간/재위임 없는 RBAC 부여상한(ⓑ §2.1)·프로퍼티 테스트 0 | `ABSENT` |
| 42 | Delegated Ceiling ≤ Original Ceiling | Ceiling 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 43 | Delegation Period Determinism | Period(§20) 부재 | `ABSENT` |
| 44 | No Self-delegation | Self-delegation 차단(§5.9) — Delegation 부재로 무발동(신설 시 필수·ⓑ §5) | `ABSENT` |
| 45 | No Cycle | Cycle 차단(§5.8) — Delegation 부재로 무발동 | `ABSENT` |
| 46 | Depth Bound Preservation | Depth Bound 부재 | `ABSENT` |
| 47 | Legal Entity Boundary Preservation | Legal Entity 0(ⓑ §3.3) | `ABSENT` |
| 48 | Deterministic Resolution | Resolution(§30) 부재 | `ABSENT` |
| 49 | Snapshot Determinism | Snapshot(§39) 부재 · 인접 결정론 정본=`SecurityAudit::verify()`(ⓑ §2.5) | `ABSENT` |

### 1-D. Concurrency Test (7)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 50 | 동일 Delegation Version 동시 생성 | Version(§10) 부재 + 러너 0 | `ABSENT` |
| 51 | 동일 Delegation 동시 활성화 | Activation(§42) 부재 | `ABSENT` |
| 52 | Acceptance·Approval 동시 처리 | Acceptance(§23)/Approval(§24) 부재 | `ABSENT` |
| 53 | Revocation·Decision 동시 처리 | Revocation(§44)/Decision 재검증 부재 | `ABSENT` |
| 54 | Expiration·Decision 동시 처리 | Expiration(§45) 부재 | `ABSENT` |
| 55 | Re-delegation 동시 생성 | Re-delegation(§37) 부재 | `ABSENT` |
| 56 | Future Scheduler 중복 실행 | Future Scheduler(§42/§45) 부재 · 인접 워커(SMS 예약 등)는 위임 무관 | `ABSENT` |

### 1-E. Security Test (15)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 57 | Cross-Tenant Delegation | Delegation 부재 · Cross-Tenant는 Guard(`index.php:600`) 잔여(strict 기본 OFF·ⓑ §3.4·§5) · 러너 0 | `ABSENT` |
| 58 | Cross-Legal-Entity 우회 | Legal Entity 0(ⓑ §3.3) | `ABSENT` |
| 59 | Unauthorized Delegation 생성 | Delegation 생성 경로 0 | `ABSENT` |
| 60 | Original Authority 초과 | Authority 0(ⓑ §3.2) · acl monotonicity(ⓑ §2.1)는 유사하나 기간/위임 관계 없음 | `ABSENT` |
| 61 | Monetary Ceiling 확대 | Ceiling 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 62 | Self-delegation | §5.9 — 무발동(신설 시 필수) | `ABSENT` |
| 63 | Cycle 우회 | §5.8 — 무발동 | `ABSENT` |
| 64 | Depth 우회 | Depth Bound 부재 | `ABSENT` |
| 65 | Acceptance 우회 | Acceptance(§23) 부재 | `ABSENT` |
| 66 | Approval 우회 | Approval(§24) 부재 | `ABSENT` |
| 67 | Revocation 우회 | Revocation(§44) 부재 | `ABSENT` |
| 68 | Historical Snapshot 변조 | Snapshot(§39) 부재 · 변조검증 정본=`SecurityAudit::verify()`(ⓑ §2.5·`menu_audit_log` 금지) | `ABSENT` |
| 69 | Role Name 위조 | Role=flat enum(ⓑ §3.3) · 위임 role 위조 테스트 0 | `ABSENT` |
| 70 | Calendar Status 위조 | Calendar 소스 ABSENT(ⓑ §1) | `ABSENT` |
| 71 | Mandatory Control 제거 | SoD/CoI/Break-glass 훅 grep 0(ⓑ §3.4) · 필수통제 자체 부재 | `ABSENT` |

### 1-F. Regression Test (11)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 72 | 기존 Approval Chain | Approval Chain(5-3-3-3) 커버 0(ⓑ §3.1) — 회귀 보호할 실체 부재 | `ABSENT` |
| 73 | 기존 Authority Resolution | Authority 0(ⓑ §3.2) | `ABSENT` |
| 74 | 기존 Manager Resolution | Reporting-Line Resolver ABSENT(`parent_user_id` owner로 붕괴·`UserAuth.php:156-157`·ⓑ §3.3) | `ABSENT` |
| 75 | 기존 Workflow | 승인 4경로 상태머신 실재하나 회귀 하네스 0 · smoke liveness만(`smoke.mjs`) | `LEGACY_ADAPTER`(liveness) |
| 76 | 기존 Rebate Approval | rebate authority 0(ⓑ §3.2) | `ABSENT` |
| 77 | 기존 Claim Approval | claim approval 0 | `ABSENT` |
| 78 | 기존 Settlement | 정산 파이프라인 실재 · 승인 회귀 하네스 0 · smoke liveness만 | `LEGACY_ADAPTER`(liveness) |
| 79 | 기존 Payment·Payout | Paddle/Stripe 빌링 실재 · 회귀 하네스 0 · smoke liveness만 | `LEGACY_ADAPTER`(liveness) |
| 80 | 기존 ERP Integration | ERP 소스 0(ⓑ §1) | `ABSENT` |
| 81 | 기존 Notification Hook | 발송 인프라(Postfix/SMS) 실재 · 위임 회귀 하네스 0 · smoke liveness만 | `LEGACY_ADAPTER`(liveness) |
| 82 | 기존 Audit | `SecurityAudit::verify()` 실재(정본) · 회귀 하네스=smoke liveness만(의미론 검증 0·ⓑ §2.5) | `LEGACY_ADAPTER`(liveness) |

**실측 개수: 82 / 82 전사**(Unit 20 + Integration 18 + Property 11 + Concurrency 7 + Security 15 + Regression 11). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 74.

> 🔴 **커버 0.** PHP(PHPUnit)·JS(npm test) 러너가 통째로 부재하고 Delegation 엔티티가 없으므로 82종 테스트 중 **실행 가능한 회귀 테스트는 하나도 없다** — 어떤 항목도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 7건은 전부 `tools/e2e/smoke.mjs` **liveness 스윕**(HTTP 200/500 존재확인)이지 승인·위임 의미론 회귀가 아니다.

## 2. 규칙

- 🔴 **원문 §63에 "테스트 러너를 세우라"는 항목이 없다 — 러너 신설을 별도 선행 계상하라.** §63은 테스트 *범위* 82종만 열거하며, 이를 실행할 PHPUnit/npm-test 하네스는 스펙 밖의 인프라 전제다. 러너 신설(composer `require-dev` + `phpunit.xml` / `vitest`) 없이 "테스트 있음"으로 표기 금지.
- 🔴 **`tools/e2e/smoke.mjs` liveness를 승인/위임 회귀로 오독 금지** — GET 200/500 존재확인일 뿐 정족수·권한초과·Cross-Tenant·Cycle·Self-delegation 등 의미론을 검증하지 않는다. `/api/v423/approvals`(smoke.mjs:42) 스윕도 liveness 대상일 뿐이다.
- 🔴 **smoke의 503 비실패 처리(`smoke.mjs:139-151`)가 회귀를 은폐할 여지를 명시하라** — 승인 게이트가 503(레이트리밋/과부하)으로 죽어도 smoke는 재시도 후 비실패로 넘긴다. 신설 회귀 하네스는 승인/위임 엔드포인트의 503을 **명시적 실패**로 다뤄야 한다(liveness 은폐 답습 금지).
- 🔴 **evidence·변조검증은 `SecurityAudit::verify():56-68` 확장** — Snapshot Hash(#19·#68) 등 무결성 테스트는 검증형 정본을 재사용하라. `menu_audit_log.hash_chain`은 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가 장식).
- 🔴 **Property #44/#45(No Self-delegation·No Cycle)를 "현행 준수"로 계상 금지** — Delegation이 없어 위반이 발생하지 않을 뿐, 이는 프로퍼티 충족이 아니라 대상 부재다. 엔티티 신설 시 즉시 필수 프로퍼티가 된다.
- 🔴 **Task Assignment Reference(#36)는 위임과 분리 유지**(§5.10) — PM 태스크 할당(ⓑ §2.4)을 Delegation 통합 테스트로 흡수하지 마라. `KEEP_SEPARATE_WITH_REASON`.
