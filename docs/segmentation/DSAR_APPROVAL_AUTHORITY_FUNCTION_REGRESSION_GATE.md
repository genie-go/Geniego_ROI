# DSAR — Approval Authority 테스트 범위·기능 회귀 게이트 (§77)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §77(3174~3261) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §7 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=77` → **68**(불릿 68·번호 0 · Unit 16 + Integration 15 + Property 10 + Concurrency 6 + Security 10 + Regression 11). 육안 금지.

## 0. 현행 실측 (file:line·능력 기반 grep 재확인)

| 항목 | 실측 | 판정 |
|---|---|---|
| PHP 테스트 러너 | 🔴 **PHPUnit 부재** — `backend/composer.json`에 `require-dev` 블록 자체 없음(`require`=slim/php-di/illuminate/monolog만)·`phpunit` 미선언 | `ABSENT`(러너 0) |
| JS 테스트 러너 | 🔴 **`npm test` 부재** — `package.json` scripts = `build`·`e2e`·`e2e:render`·`e2e:scenario`·`chatbot:kb`만(`test`/`jest`/`vitest` 0·devDeps=vite/playwright/ssh2/acorn) | `ABSENT`(러너 0) |
| Authority 피시험 엔티티 | 🔴 Authority Definition/Version/Matrix Entry/Snapshot 전량 부재(ⓑ §1) → **테스트 대상 코드 자체가 없음** | `ABSENT` |
| 인접 테스트 하네스 | `tools/e2e/smoke.mjs:42` `/api/v423/approvals`(승인 라우트) — 단 **HTTP 상태만 검사**(승인 의미론 0)·`:132-153` GET 500 스윕 = liveness · `:148` `s !== 503` 로 503 실패 제외·`:139` 백오프 재시도 → **레이트리밋 회귀 은폐** | `LEGACY_ADAPTER`(liveness만·승인 의미론 없음) |

★**러너가 하나도 없고 피시험 Authority 엔티티도 없으므로 §77 6범주 68종의 대부분은 `ABSENT` 이다.** `smoke.mjs`는 승인 엔드포인트의 존재/무음500만 보는 liveness 하네스로 §77 이 요구하는 의미론 테스트가 아니다(`LEGACY_ADAPTER`). evidence 정본은 `SecurityAudit`(ⓑ §5)이며 🔴`menu_audit_log` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).

## 1. 원문 전사 + 판정 — **원문 68종**(6범주)

### Unit Test (16)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Authority Definition 생성 | 러너 0 · Authority Definition 엔티티 0(ⓑ §1) | `ABSENT` |
| 2 | Authority Version 생성 | 러너 0 · 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 3 | Matrix Entry 생성 | 러너 0 · Matrix 엔티티 0 | `ABSENT` |
| 4 | Subject·Role·Position Binding | 러너 0 · Position 개념 부재(ⓑ §3.1) | `ABSENT` |
| 5 | Legal Entity Binding | 러너 0 · Legal Entity 0(ⓑ §1) | `ABSENT` |
| 6 | Amount Band 경계 | 러너 0 · Amount Band 부재(HIGH_VALUE_KRW 상수만·ⓑ §4) | `ABSENT` |
| 7 | Threshold Gap | 러너 0 · Threshold 축 부재 | `ABSENT` |
| 8 | Threshold Overlap | 러너 0 · 동상 | `ABSENT` |
| 9 | Currency Scope | 러너 0 · 통화 스코프 0(ⓑ §4) | `ABSENT` |
| 10 | FX Conversion | 러너 0 · `fxToKrw`는 있으나 테스트 0(ⓑ §4) | `ABSENT` |
| 11 | Period Limit | 러너 0 · 인접 `AutoCampaign` 예산상한 무테스트(ⓑ §4) | `ABSENT` |
| 12 | Explicit Deny | 러너 0 · explicit deny 표현 0(ⓑ §3) | `ABSENT` |
| 13 | Specificity Resolution | 러너 0 · Specificity(§52) 부재(ⓑ §6) | `ABSENT` |
| 14 | Conflict Resolution | 러너 0 · Conflict(§53/§54) 부재(ⓑ §6) | `ABSENT` |
| 15 | Snapshot Hash | 러너 0 · 인접 `SecurityAudit::verify()`는 있으나 Authority Snapshot 무테스트(ⓑ §5) | `ABSENT` |
| 16 | Simulation | 러너 0 · Authority Simulation(§61) 0 | `ABSENT` |

### Integration Test (15)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 17 | Approval Chain Level 연계 | 러너 0 · Approval Chain(5-3-3-3) 실 엔티티 미구현 | `ABSENT` |
| 18 | Role Assignment 연계 | 러너 0 · role assignment 버전 0(ⓑ §5) | `ABSENT` |
| 19 | Position Incumbency 연계 | 러너 0 · Position 부재(ⓑ §3.1) | `ABSENT` |
| 20 | Cost Center Authority | 러너 0 · cost_center authority 0(ⓑ §1) | `ABSENT` |
| 21 | Budget Authority | 러너 0 · 인접 `AutoCampaign` 예산상한 무테스트(ⓑ §4) | `ABSENT` |
| 22 | Program Authority | 러너 0 · program authority 0(ⓑ §1) | `ABSENT` |
| 23 | Rebate Authority | 러너 0 · rebate authority 0(ⓑ §1) | `ABSENT` |
| 24 | Claim Authority | 러너 0 · claim authority 0 | `ABSENT` |
| 25 | Settlement Authority | 러너 0 · settlement authority 0(정산 파이프라인≠승인권한) | `ABSENT` |
| 26 | Payment Authority | 러너 0 · payment authority 0 | `ABSENT` |
| 27 | ERP DOA Import | 러너 0 · ERP Authority Table/DOA Import 0(ⓑ §1) | `ABSENT` |
| 28 | Finance Matrix Import | 러너 0 · Finance Approval Matrix 0(ⓑ §1) | `ABSENT` |
| 29 | Task Assignment | 러너 0 · authority-task 연계 0 | `ABSENT` |
| 30 | Decision Revalidation | 러너 0 · as-of 재검증 불가(Actor Auth Snapshot 부재·ⓑ §5) | `ABSENT` |
| 31 | Reconciliation | 러너 0 · Reconciliation(§63) 부재·대사 기준 Tenant 마스터 부재(ⓑ §7) | `ABSENT` |

### Property Test (10)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 32 | Threshold Non-overlap | 러너 0 · Threshold 축 부재 | `ABSENT` |
| 33 | Threshold Coverage | 러너 0 · 동상 | `ABSENT` |
| 34 | Tenant Isolation | 러너 0 · 가드는 REAL(`index.php:600`)이나 property 테스트 0·strict 기본 OFF(`:585`·ⓑ §7) | `ABSENT` |
| 35 | Immutable Version | 러너 0 · 불변 버전체인 선례 0(ⓑ §5) | `ABSENT` |
| 36 | Deterministic Resolution | 러너 0 · Resolution(§50) 부재 | `ABSENT` |
| 37 | Explicit Deny Precedence | 러너 0 · deny>allow 구조 0(ⓑ §6) | `ABSENT` |
| 38 | Currency Conversion Determinism | 러너 0 · 과거환율 조회 불가(FX KV 덮어쓰기·ⓑ §4) | `ABSENT` |
| 39 | Snapshot Determinism | 러너 0 · Authority Snapshot 부재(ⓑ §5) | `ABSENT` |
| 40 | Cumulative Limit Monotonicity | 러너 0 · 누적한도 = `AutoCampaign` 예산만(마케팅·무테스트·ⓑ §4) | `ABSENT` |
| 41 | Legal Entity Boundary Preservation | 러너 0 · Legal Entity 0(ⓑ §1) | `ABSENT` |

### Concurrency Test (6)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 42 | 동일 Authority Version 동시 생성 | 러너 0 · Authority Version 엔티티 0 | `ABSENT` |
| 43 | Matrix Version 동시 활성화 | 러너 0 · Matrix Version 0 | `ABSENT` |
| 44 | 동일 Subject Authority 동시 변경 | 러너 0 · Subject authority 0 | `ABSENT` |
| 45 | Utilization 동시 예약 | 러너 0 · Utilization 예약(TOCTOU 방어 포함) 미구현 | `ABSENT` |
| 46 | 동일 Decision Authority 동시 검증 | 러너 0 · Decision Revalidation 부재(ⓑ §5) | `ABSENT` |
| 47 | Future Version Scheduler 중복 실행 | 러너 0 · Future-Dated 예약 0(ⓑ §5) | `ABSENT` |

### Security Test (10)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 48 | Cross-Tenant Authority 사용 | 러너 0 · 가드 REAL(`index.php:600`)이나 security 테스트 0·strict 기본 OFF(ⓑ §7) | `ABSENT` |
| 49 | Cross-Legal-Entity Authority 우회 | 러너 0 · Legal Entity 0(ⓑ §1) | `ABSENT` |
| 50 | Unauthorized Subject Authority 생성 | 러너 0 · Subject authority 생성 API 0 | `ABSENT` |
| 51 | Mandatory Financial Limit 제거 | 러너 0 · Financial Limit 축 0(HIGH_VALUE_KRW 상수만·ⓑ §4) | `ABSENT` |
| 52 | Historical Snapshot 변조 | 러너 0 · Actor Auth Snapshot 부재(ⓑ §5)·`SecurityAudit::verify()`는 감사로그용 | `ABSENT` |
| 53 | Role 이름 위조 | 러너 0 · role 문자열 판정 방어 테스트 0(ⓑ §3.2 양축 직교) | `ABSENT` |
| 54 | FX Rate 위조 | 러너 0 · FX 24h TTL 가드는 있으나 위조 테스트 0(ⓑ §4) | `ABSENT` |
| 55 | Utilization Race Condition | 러너 0 · Utilization 예약 미구현 | `ABSENT` |
| 56 | Explicit Deny 우회 | 러너 0 · deny 표현 0(ⓑ §6) | `ABSENT` |
| 57 | Self-approval 우회 | 러너 0 · 방어는 Mapping만(`:268`)·나머지 3경로 미방어(ⓑ §2)·테스트 0 | `ABSENT` |

### Regression Test (11)

| # | 원문 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 58 | 기존 Approval Chain | 인접 = `smoke.mjs:42` `/api/v423/approvals` GET **liveness만**(승인 의미론 0·`:148` 503 제외·`:139` 백오프로 레이트리밋 회귀 은폐) | `LEGACY_ADAPTER` |
| 59 | 기존 Workflow | 러너 0 · mapping/catalog/action_request/admin_growth 4경로 회귀 테스트 0(GET 500 스윕 `:132-153`은 liveness 한정) | `ABSENT` |
| 60 | 기존 Manager Resolution | 러너 0 · Manager Resolver ABSENT(ⓑ §3.1)·회귀 테스트 0 | `ABSENT` |
| 61 | 기존 Finance Approval | 러너 0 · Finance Approval 자체 부재(ⓑ §1) | `ABSENT` |
| 62 | 기존 Rebate Approval | 러너 0 · rebate approval 부재 | `ABSENT` |
| 63 | 기존 Claim Approval | 러너 0 · claim approval 부재 | `ABSENT` |
| 64 | 기존 Settlement | 러너 0 · settlement authority 부재(파이프라인≠승인) | `ABSENT` |
| 65 | 기존 Payment·Payout | 러너 0 · payment/payout authority 부재 | `ABSENT` |
| 66 | 기존 ERP Integration | 러너 0 · ERP Integration/DOA 부재(ⓑ §1) | `ABSENT` |
| 67 | 기존 Notification | 러너 0 · Alerting 존재하나 notification 회귀 테스트 0 | `ABSENT` |
| 68 | 기존 Audit | 러너 0 · `SecurityAudit::verify()` 존재하나 회귀 테스트 0(ⓑ §5) | `ABSENT` |

**실측 개수: 68 / 68 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#58) · `ABSENT` 67.

> 🔴 **커버 0.00%.** 테스트 러너(PHPUnit·npm test)가 하나도 없고 피시험 Authority 엔티티도 없으므로 68종 어느 것도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(#58 smoke.mjs 승인 엔드포인트 liveness)은 HTTP 상태만 보는 liveness 하네스이지 §77 의미론 테스트가 아니다.

## 2. 규칙

- 🔴 **원문에 "테스트 러너를 세우라"는 지시는 없다 → §77 은 별도 계상** — 스펙은 테스트 범위(무엇을 테스트할지)만 열거하며 러너 신설을 요구하지 않는다. 러너 부재(PHPUnit·`npm test` 0)는 §77 위반이 아니라 **선행 인프라 부재**로 별도 트랙이다. 그러나 러너 없이는 이 68종이 구현 불가하므로 Authority 엔티티 신설 세션에서 러너를 동반 도입해야 한다.
- 🔴 **현행 `smoke.mjs`를 §77 회귀 게이트로 오인하지 마라(회귀 은폐 여지)** — `:42`는 승인 엔드포인트의 **liveness만** 보고 승인 의미론(정족수·자기승인차단·금액한도)을 검증하지 않으며, `:148`이 503 을 실패에서 제외하고 `:139` 백오프가 레이트리밋 회귀를 은폐한다. "smoke 통과=회귀 없음"으로 계산 금지.
- 🔴 **테스트 부재를 "회귀 0"으로 계산 금지** — 67종 `ABSENT`는 테스트가 통과해서가 아니라 러너·엔티티가 없어 실행 불가인 것이다(우연한 준수). 커버로 계상하지 마라.
- 🔴 **evidence 는 `SecurityAudit`(ⓑ §5)를 정본으로** — 테스트 증적/감사 기록에 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]] · `verify()` 0·preimage ts 소실 = 검증 불가능한 장식). Snapshot Hash(#15)·Historical Snapshot 변조(#52) 테스트는 `SecurityAudit::verify():56-68` 패턴을 확장하라(중복 해시엔진 금지).
