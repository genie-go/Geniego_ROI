# DSAR — Function Regression Gate (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 목적: Sequential Approval State Machine 신설·정형화(흡수) 과정에서 **실존 기능의 무후퇴(No-Regression) 게이트** 정의. Golden Rule=Replace 아니라 Extend.

## 1. 원문 전사 (Canonical Contract)

§71 FUNCTION_REGRESSION_GATE — 아래 실존/인접 기능은 State Machine 신설 후에도 **무회귀**로 보존되어야 한다:
1. 기존 Approval Chain
2. Authority
3. Delegation
4. Assignment
5. Workflow
6. Rebate
7. Claim
8. Settlement
9. Payment / Payout
10. ERP
11. Notification
12. Audit

실존 무후퇴 대상(§GROUND_TRUTH 근거):
- `catalog_writeback_job` 전이
- `admin_growth_approval` 승인
- `mapping_change_request` 정족수
- omni_outbox claim
- JourneyBuilder 저니

## 2. 기존 구현 대조 (무후퇴 게이트 대상)

### 2.1 `catalog_writeback_job` 전이 — 무후퇴 게이트
- 실존 능력: 승인 후 큐 투입(`Catalog.php:2397`)·워커 원자적 선점(`:1726`, CAS)·stale 복구(`:1700`, 600s)·재부활(`:1710`).
- 게이트: State Machine으로 흡수(전이) 시 위 4 전이가 **의미 동등**하게 보존되어야 한다 — 선점 CAS의 원자성·복구 타이머·재부활 경로가 하나라도 소실되면 회귀. 정형화는 Extend(전이 정의로 승격)이지 Replace 아님.

### 2.2 `admin_growth_approval` 승인 — 무후퇴 게이트
- 실존 능력: `pending→approved|rejected`(`AdminGrowth.php:1330`)·이미처리 409 가드(`:1327`)·ref_type별 후속 분기(`:1334-1341`).
- 게이트: 흡수 후에도 이미처리 409 재승인 차단·ref_type 분기 집행이 보존. 단발 승인 UX가 다단으로 강제 변경되어선 안 됨(무후퇴).

### 2.3 `mapping_change_request` 정족수 — 무후퇴 게이트 (별 개념·존치)
- 실존 능력: M-of-N 정족수(`Mapping.php:287`)·approvals_json(`:285`)·재승인 409(`:262`)·자기승인 차단(`:268`)·dedup(`:279`).
- 게이트: Maker-Checker 정족수는 순차와 **별 개념**으로 존치 — Sequential State Machine이 이를 대체·간섭하지 **않는다**. 자기승인 차단·정족수 계산·dedup 전부 무회귀.

### 2.4 omni_outbox claim — 무후퇴 게이트 (CANONICAL 재사용)
- 실존 능력: `FOR UPDATE SKIP LOCKED`(`Omnichannel.php:405`)·claim/claimed_at(`:97,410,418`)·해제(`:560`)·stale 회수(`:395-399`, 900s).
- 게이트: Transition Lock/Lease로 **재사용(확장)**하되 기존 outbox 소비 의미론(중복 처리 방지·순서 FIFO·stale 회수)이 보존. 새 lock으로 대체해 outbox 경로를 깨면 회귀.

### 2.5 JourneyBuilder 저니 — 무후퇴 게이트 (KEEP_SEPARATE)
- 실존 능력: current_node 순회(`JourneyBuilder.php:504`)·pause/resume(`:403`)·CAS 선점(`:415-425`)·stale 회수(`:396`)·멱등 발송(`:446-490`)·releaseSendOnce(`:463`).
- 게이트: 마케팅 저니는 승인 도메인과 **격리 존치** — State Machine 신설이 저니 상태전이·멱등·pause/resume에 영향 0(무간섭 무회귀). 패턴 참조는 허용하되 저니 코드 변경 금지.

### 2.6 선행 5군 인접 기능 (§71 1~4) — 현 상태
- Approval Chain(1)·Authority(2)·Delegation(3)·Assignment(4): §3.1~3.4 **ABSENT** — 회귀시킬 실존 기능 없음(신설 대상). 단 도메인 특화 승인값(`Catalog.php:2300` approvalCreate·`:395` requiresHighValueApproval)·정적 role 서열(`TeamPermissions.php:120,136`)은 무후퇴 대상(무단 변경 금지).
- Audit(12): SecurityAudit::verify(`SecurityAudit.php:56-68`)·감사무결 substrate — 무후퇴 필수.
- Workflow/Rebate/Claim/Settlement/Payment/ERP/Notification(5~11): 각 도메인 인접 기능은 State Machine 신설과 무관하게 보존(간섭 금지).

## 3. 판정

- Verdict: **무후퇴 게이트 정의 완료** — 실존 무후퇴 대상 5종 확정(catalog_writeback_job·admin_growth_approval·mapping_change_request·omni_outbox·JourneyBuilder). State Machine 자체는 ABSENT이나 정형화 시 이 게이트 필수 통과.
- 선행 의존: 흡수(전이) 구현은 선행 4군(Approval/Authority/Delegation/Assignment) 신설에 종속 → 실 정형화는 BLOCKED_PREREQUISITE.
- cover: 무후퇴 대상 5(근거 §2 file:line)·감사 substrate 1(`SecurityAudit.php:56-68`). 순수 Sequential State Machine cover: 0.

## 4. 확장/구현 방향 (설계)

- **Golden Rule = Extend, not Replace**: 정형화는 실존 전이를 Transition Definition(§19)으로 **승격**하되 관측 가능한 능력을 하나도 제거하지 않는다.
- **회귀 판정 = 능력 기반(이름 아님)**: 흡수 전후로 (a) catalog 워커 선점 원자성·복구 타이머·재부활, (b) admin_growth 409 재승인 차단·ref_type 분기, (c) mapping M-of-N/자기승인 차단, (d) omni_outbox FIFO/stale 회수, (e) JourneyBuilder 저니 무간섭 — 5개를 회귀 게이트로 명시. 하나라도 소실 시 착수 차단.
- **★실위험 무후퇴**: 흡수 시 Fencing Token·범용 Idempotency를 추가하되 기존 CAS/UNIQUE 멱등(`Catalog.php:1726`·`JourneyBuilder.php:454`·`Paddle.php:343-348`)을 **약화시키지 말 것** — 신규 게이트가 기존 방어를 우회·완화하면 보안 회귀.
- **Cross-Tenant 무후퇴(§59)**: Tenant Guard(`UserAuth.php:403-406`) 격리는 신설 전이 전 경로에서 보존 — 승인 전이가 테넌트 경계를 넘게 하면 최중대 회귀.
- **BLOCKED_PREREQUISITE**: 무후퇴 게이트를 실제로 검증하는 구현·회귀 테스트는 선행 4군 신설 후 별도 승인세션(Golden + verify + 배포승인).

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
