# DSAR — Workflow Reconciliation (§61)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §61 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **워크플로** 대사 | grep 0 | `NOT_APPLICABLE` |
| 결제 대사 | `PgSettlement::reconcile`(:215 · window 7일) + `GET /v427/pg/reconciliation`(routes.php:644-645, :3362) | `KEEP_SEPARATE_WITH_REASON`(**금액 축**) |
| 광고 대사 | `Connectors::roasReconciliation`(:902 · 매체보고 ROAS vs 실주문귀속 · 228차 S1) | `KEEP_SEPARATE_WITH_REASON` |
| 재고 대사 | `Wms::reconcileChannelStock`(:2160-2184) | `KEEP_SEPARATE_WITH_REASON` |
| 정산 대사 | `KrChannel` :415-419(`kr_settlement_line`) | `KEEP_SEPARATE_WITH_REASON` |
| stale claim 회수 | `BillingMethod::reconcileStaleClaims`(:551-589 · `charging`/`reconciling` 회수) | `VALIDATED_LEGACY`(**대사 패턴의 실 선례**) |
| Canonical State | 🔴 **부재** — 상태머신 미선언(§63) → **비교할 정본이 없음** | `NOT_APPLICABLE` |

**★축 주의 — 대사(reconciliation)는 레포에 4종 실재하나 전부 "값" 축이다.** `PgSettlement`(결제금액) · `Connectors`(ROAS) · `Wms`(재고수량) · `KrChannel`(정산라인)은 **두 개의 숫자를 맞춘다**. §61은 **두 개의 상태를 맞춘다**. 형태(대사)만 같고 도메인이 다르다 → 매핑하면 역산이다. 다만 **대사 리포트의 구조·window·severity 관행은 프리미티브로 인용 가능**하며, 특히 `BillingMethod::reconcileStaleClaims`(:551-589)는 **"진행중 상태가 고착되면 회수한다"는 상태 대사에 가장 근접한 실 선례**다.

**★축 주의 2 — 🔴 비교의 오른쪽(Canonical State)이 존재하지 않는다.** §61의 23개 비교는 전부 `X vs Y` 형태이나, 현행에는 **정본 상태집합이 선언돼 있지 않다**(`UPDATE ... SET status=` 155건/44파일이나 전이 규칙 선언 0 — §63 참조). **비교 대상이 없는 대사는 항상 MATCH를 반환한다 = 가짜녹색의 순수형.** §61은 §63이 정본을 선언한 이후에만 실행 가능하다.

**★축 주의 3 — 🔴 내부 삭제/상태변경만으로 완료 선언 금지(SEG-H2/H5 계열).** 프로젝트 헌법의 반복 교훈이다. 대사가 불일치를 **내부 status만 바꿔** 해소하면 외부 실체(광고 채널·결제사·워커)는 그대로 남는다. `resolution` 은 **외부 실집행 결과를 포함**해야 하며, 그 집행은 `AdAdapters`(자격증명 게이트·감사로그 내장)에 위임한다.

## 1. 원문 전사 + 판정 — 비교 대상 **원문 23종**

원문: "다음을 비교하라."

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Approval Case Workflow Reference vs Runtime Instance | 부재 — Case·Instance 양변 모두 부재 | `NOT_APPLICABLE` |
| 2 | Workflow Definition Version vs Runtime Version | 부재 — 정의·버전 grep 0 | `NOT_APPLICABLE` |
| 3 | Workflow Instance State vs Approval Case Status | 부재 — 🔴 §63 매핑 정본 미선언 | `NOT_APPLICABLE` |
| 4 | Current Node vs Active Tasks | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 5 | Active Tokens vs Active Branches | 부재 — Token 개념 전무 | `NOT_APPLICABLE` |
| 6 | Task Assignment vs Approval Participant | 부재 — 배정/클레임 개념 전무 | `NOT_APPLICABLE` |
| 7 | Task Claim Actor vs Decision Actor | 부재(Task 축) · 🟠 인접 위험 = **actor_type 부재**로 `apikey:`/`user:` 동등 계수 | `NOT_APPLICABLE` |
| 8 | Task Completion vs Approval Decision | 부재 · 인접 = `approvals_json` 누적(Mapping.php:209) | `NOT_APPLICABLE` |
| 9 | Transition Event vs Node State | 부재 — 🔴 전이 규칙 선언 0(전부 호출지점 인라인) | `NOT_APPLICABLE` |
| 10 | Timer State vs Scheduler State | 부재(승인) · 인접 = `resume_at`/`wait_until`(JourneyBuilder.php:80-82) vs **OS cron 단일 수단**(`journey_cron.php:29-35` */5) | `LEGACY_ADAPTER` |
| 11 | Wait State vs Event Subscription | 부재 — 🔴 범용 이벤트 버스·구독 기전 grep 0 → 오른쪽 변 부재 | `NOT_APPLICABLE` |
| 12 | External Callback vs Message Correlation | 부재(승인) · 인접 = Paddle `notification_id` UNIQUE 멱등(272차) · 🔴 **`paddle_events` 에 tenant_id 없음**(:99 · 테넌트 검증 부재) | `LEGACY_ADAPTER` |
| 13 | Retry State vs Execution Attempt | 부재(승인) · 인접 = `ad_delivery_dlq.attempts`(AdAdapters.php:1187-1228) | `LEGACY_ADAPTER` |
| 14 | Dead Letter vs Failed Execution | 부재(승인) · 인접 = **DLQ 테이블 `ad_delivery_dlq` 1개뿐** · 나머지는 원 테이블 `status='failed'` 잔류 | `LEGACY_ADAPTER` |
| 15 | Workflow Cancellation vs Active Tasks | 부재 | `NOT_APPLICABLE` |
| 16 | Workflow Pause vs Running Worker | 부재 · 인접 = `BillingMethod::reconcileStaleClaims`(:551-589 · 고착 회수) · `Omnichannel::claimBatch` stale lease 900s(:394-423) · `ChannelSync` stale 600s(:6136-6153) | `LEGACY_ADAPTER`(stale 회수 패턴) |
| 17 | Workflow Completion vs Pending Mandatory Requirement | 부재 · 인접 게이트 = `AdminGrowth::launch`(:1155 `status='approved'` 확인) | `LEGACY_ADAPTER` |
| 18 | Workflow End State vs Approval Request Status | 부재 — 🔴 §63 매핑 정본 미선언 | `NOT_APPLICABLE` |
| 19 | Workflow Execution vs Audit Event | 부재 · 인접 = `audit_log`(AdminGrowth.php:157-159) · `journey_node_logs`(JourneyBuilder.php:50,:69) | `LEGACY_ADAPTER` |
| 20 | External Engine State vs Canonical State | 부재 — 🔴 **외부 엔진 없음 + Canonical State 미선언 = 양변 모두 부재** | `NOT_APPLICABLE` |
| 21 | Migration State vs Runtime Version | 부재 — §56/§57 자체가 전방호환 계약 | `NOT_APPLICABLE` |
| 22 | Replay Result vs Original State | 부재 — §58 자체가 부재 | `NOT_APPLICABLE` |
| 23 | Approval Execution Binding vs Workflow Completion | 🔴 부재 + **현행 반례 실재** — `Alerting::executeAction`(:601-660)이 `:612` status를 SELECT하고 **판독 안 함** → `pending`·`rejected` 도 실집행(`AdAdapters::pause` :631/`updateBudget` :634). 현재 VACUOUS(생산자 0)이나 배선 시 즉시 활성 | `NOT_APPLICABLE`(대사 신설 · 참조 구현 금지) |

**실측 개수: 23 / 23 전사.** 커버리지 = 부재 15 · 어댑터 8.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_reconciliation_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow instance | 부재 · 인접 = `journey_enrollments`(🔴 `customer_id` 필수 :554) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | approval case | 부재 — Case 개념 전무 | `NOT_APPLICABLE` |
| 4 | comparison type | 부재 · §62 상태와 짝 | `NOT_APPLICABLE` |
| 5 | source state | 부재 | `NOT_APPLICABLE` |
| 6 | canonical state | 🔴 부재 — 정본 상태집합 미선언(§63) | `NOT_APPLICABLE` |
| 7 | difference | 부재 · 인접 = `PgSettlement::reconcile` 차이 리포트(:215 · **금액 축**) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | severity | 부재(대사 축) · 인접 = `notification_channel.min_severity`(Alerting.php:911) | `LEGACY_ADAPTER`(severity 어휘 정합) |
| 9 | detected at | 부재 | `NOT_APPLICABLE` |
| 10 | resolved at | 부재 | `NOT_APPLICABLE` |
| 11 | resolution | 부재 — 🔴 SEG-H2/H5: **내부 상태변경만으로 해소 금지** | `NOT_APPLICABLE` |
| 12 | status | 부재(대사 축) · §62 26종과 짝 | `NOT_APPLICABLE` |
| 13 | evidence | 부재 · 인접 = `audit_log`·`journey_node_logs` | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재 9 · 어댑터 2 · 분리 2.

## 3. 규칙

- 🔴 **§61은 §63 이후다.** 23개 비교 전부가 `X vs Canonical` 구조인데 **Canonical State 가 선언돼 있지 않다**. 정본 없이 대사를 돌리면 **항상 MATCH** = 가짜녹색. 상태집합 선언이 선결 조건이다.
- 🔴 **내부 삭제/상태변경만으로 완료 선언 금지(SEG-H2/H5 · 프로젝트 헌법 반복 교훈).** `resolution` 은 외부 실체(광고 채널·결제사·워커)의 실집행 결과를 포함해야 한다. 내부 `status='resolved'` 만 찍고 닫으면 불일치는 그대로 남는다. 외부 집행은 **`AdAdapters` 위임**(자격증명 게이트·감사로그 내장) — 신규 액추에이터 금지.
- 🔴 **비교 #23 은 현행 반례를 먼저 인지하고 설계하라.** `Alerting::executeAction`(:612)의 죽은 status 읽기가 곧 "Execution Binding vs Completion" 불일치의 실물이다. **참조 구현 금지**(미수정·별도 세션).
- 🔴 **값 대사 4종(`PgSettlement`·`Connectors`·`Wms`·`KrChannel`)을 §61 커버로 계산 금지 — 값 축 ≠ 상태 축.** 단 리포트 구조·window·severity 관행은 인용 가능.
- **stale 회수 패턴은 재사용 강제** — `BillingMethod::reconcileStaleClaims`(:551-589) · `Omnichannel::claimBatch` lease 900s(:394-423) · `ChannelSync` 600s(:6136-6153). 비교 #16(Pause vs Running Worker)의 직접 선례다. 🔴 **신규 lease/락 모델 도입 금지** — optimistic lock·분산락·`GET_LOCK` 전부 grep 0이고 **SQLite 폴백 호환이 명시적 설계 제약**(`Db.php` · 285차·286차 실측 대조 시 유지).
- 🔴 **테넌트 결번을 대사 설계에 반드시 반영하라.** `admin_growth_approval` 은 **tenant_id 컬럼이 없고**(AdminGrowth.php:142-149) 조회가 전역(`:641`·`:1306`)이며 결정 경로도 격리가 없다(`:1324 WHERE id=?`). **테넌트 축이 없는 테이블을 대사 모수에 넣으면 대사 자체가 테넌트 경계를 넘는다**(A테넌트 승인이 B테넌트 불일치로 집계). 동일 결함이 `paddle_events`(:99)에도 있다. → 대사 스코프는 **tenant_id 백필 후에만** 확정 가능.
- **알림은 신설 금지·배선만** — `notification_channel` SSOT(Alerting.php:911) + 폴백 체인(:471-497 · 282차). ⚠️ 282차 트랩: 정책은 `slack.enabled` 만 보고 URL은 다른 테이블 → 무발송.
- 🔴 23종·13종 **"있다고 가정"하고 배선 금지**.
