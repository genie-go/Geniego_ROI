# DSAR — Workflow Migration Execution (§57)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §57 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Migration 실행 기록 | grep 0 | `NOT_APPLICABLE` |
| 워크플로 정의/버전 | `workflow_*`/`flow_*`/`wf_*` **grep 0** → 이전할 source/target 부재 | `NOT_APPLICABLE` |
| Token/Task/Variable | 개념 전무(grep 0) | `NOT_APPLICABLE` |
| 인스턴스 순회 실 엔진 | `JourneyBuilder::advanceEnrollment`(JourneyBuilder.php:498-700+) — **마케팅 여정** | `KEEP_SEPARATE_WITH_REASON` |
| 원자적 선점 | `JourneyBuilder` :411-418 조건부 UPDATE | `VALIDATED_LEGACY`(실행 프리미티브 재사용) |
| 롤백 참조 | 워크플로 축 부재 · 인접 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |

**★축 주의 — §56과 동일하게 전방호환 계약.** 이전 대상(Definition·Version·Instance)이 전부 부재하므로 §57은 **실행 설계가 아니라 신설 시점부터 구속되는 계약**이다. 현행 코드에 대응물이 있다고 계산하면 역산이다.

**★축 주의 2 — `JourneyBuilder` 를 §57 커버로 계산 금지.** JourneyBuilder는 레포 유일의 실 Flow 실행 엔진이나 **버전 마이그레이션 능력이 없다**: 실행 중 enrollment를 다른 여정 정의로 이전하는 경로가 grep 0이다. 순회 프리미티브(원자적 claim·멱등·순환 감지)는 **재사용 근거로 인용 가능**하나, 그것이 Migration Execution 요구를 충족하는 것은 아니다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 20종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | migration_execution_id | 부재 | `NOT_APPLICABLE` |
| 2 | migration plan | 부재(§56 자체가 부재) | `NOT_APPLICABLE` |
| 3 | workflow instance | 부재 · 인접 = `journey_enrollments` — 🔴 **`customer_id` 필수**(JourneyBuilder.php:554) | `KEEP_SEPARATE_WITH_REASON` |
| 4 | source version | 부재 — 버전 개념 grep 0 | `NOT_APPLICABLE` |
| 5 | target version | 부재 | `NOT_APPLICABLE` |
| 6 | source node | 부재(승인) · 인접 = `journey_node_logs`(JourneyBuilder.php:50,:69) | `LEGACY_ADAPTER`(노드 감사 선례) |
| 7 | target node | 부재 | `NOT_APPLICABLE` |
| 8 | source tokens | 부재 — Token 개념 전무 | `NOT_APPLICABLE` |
| 9 | target tokens | 부재 | `NOT_APPLICABLE` |
| 10 | source variables | 부재 — Variable 개념 전무 | `NOT_APPLICABLE` |
| 11 | migrated variables | 부재 | `NOT_APPLICABLE` |
| 12 | active tasks result | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 13 | timers result | 부재(승인) · 인접 = `resume_at`/`wait_until`(JourneyBuilder.php:80-82) | `LEGACY_ADAPTER` |
| 14 | event subscriptions result | 부재 — 🔴 범용 이벤트 버스·구독 기전 grep 0 | `NOT_APPLICABLE` |
| 15 | started at | 부재(워크플로) · 유사 타임스탬프 관행 존재 | `NOT_APPLICABLE` |
| 16 | completed at | 부재(워크플로) | `NOT_APPLICABLE` |
| 17 | validation result | 부재 · 인접 = `Mapping::validateValue`(Mapping.php:203) — **매핑값 검증**(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| 18 | rollback reference | 부재(참조형) | `NOT_APPLICABLE` |
| 19 | status | 유사 존재하나 🔴 **전이 규칙 선언 0**(§63) | `NOT_APPLICABLE` |
| 20 | evidence | 부재 · 인접 = `audit_log`(AdminGrowth.php:157-159) | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사.** 커버리지 = 부재 14 · 어댑터 3 · 분리 3.

## 2. 원문 전사 + 판정 — 차단 대상 **원문 8종**

원문: "다음을 차단하라."

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Node Mapping 없는 Active Node Migration | 부재(Node Mapping 자체가 부재) | `NOT_APPLICABLE` |
| 2 | Mandatory Approval Task 우회 | 🔴 **차단 부재 + 현행 우회 결함 실재** — `Alerting::executeAction`(Alerting.php:601-660) 이 `:612` 에서 status를 SELECT하고 **판독하지 않아** `pending`·`rejected` 도 실집행(`AdAdapters::pause` :631 / `updateBudget` :634). 현재 VACUOUS(생산자 0)이나 배선 시 즉시 활성 | `NOT_APPLICABLE`(차단 신설 · 참조 구현 금지) |
| 3 | 완료된 Decision 손실 | 부재 · 인접 = `approvals_json` 누적(Mapping.php:209) | `NOT_APPLICABLE` |
| 4 | Tenant 변경 Migration | 🔴 차단 부재 · **`admin_growth_approval` 은 tenant_id 컬럼 자체가 없음**(AdminGrowth.php:142-149) → 테넌트 변경을 검출할 축조차 없음 | `NOT_APPLICABLE` |
| 5 | Environment 변경 Migration | 부재 · 인접 = `Db::envLabel()`(278차) | `LEGACY_ADAPTER`(환경 판별만) |
| 6 | Legal Entity 경계 변경 | 부재 — Legal Entity 개념 전무 | `NOT_APPLICABLE` |
| 7 | 승인되지 않은 Target Version | 부재(버전·승인 결합 전무) | `NOT_APPLICABLE` |
| 8 | Active Financial Execution 중 무검증 Migration | 부재 · 인접 실자산 = `AdAdapters::executionEnabled`(AdAdapters.php:34-40 · **호출부 9곳 실배선 REAL**) | `VALIDATED_LEGACY`(킬스위치 재사용 강제) |

**실측 개수: 8 / 8 전사.** 커버리지 = 부재 6 · 어댑터 1 · 확장 1.

## 3. 규칙

- 🔴 **차단 8종은 전부 fail-closed 로 신설하라.** 현행에 대응 차단이 0이므로 "기존 가드가 막아준다"는 가정은 성립하지 않는다.
- 🔴 **`Alerting::executeAction` 을 참조 구현으로 삼지 마라.** 차단 #2(Mandatory Approval Task 우회)의 **실물 반례**다 — status를 읽고도 판독하지 않는 죽은 읽기(:612). 이를 본떠 배선하면 우회 결함을 복제한다. (미수정·별도 세션 대상)
- 🔴 **차단 #4(Tenant 변경) 는 `admin_growth_approval` 테넌트 결번 위에서 구현 불가.** 컬럼이 없으므로 source/target tenant 비교 자체가 불가능하다 → **tenant_id 백필이 선결**. 결번을 방치한 채 "테넌트 변경 없음"을 반환하면 그것이 가짜녹색이다.
- **차단 #8 은 `AdAdapters::executionEnabled` 재사용 강제** — 킬스위치는 이미 호출부 9곳 실배선 REAL이다. 신규 킬스위치 신설 금지.
  - ⚠️ 오탐 주의: `pause()` 킬스위치 면제는 **279차 D-P1 의도된 설계**(킬스위치는 지출을 늘리는 방향만 차단) — 재플래그 금지.
- **`workflow instance` 를 `journey_enrollments` 로 곧장 매핑 금지.** 해당 테이블은 **`customer_id` 필수**(:554)이므로 비-고객 승인(예산·가격·배포)을 태울 수 없다 → **enrollment 컨텍스트 일반화가 선결**.
- **멱등은 `claimSendOnce` 자연키 선점 마커 패턴 채택**(JourneyBuilder.php:672). `idempotency_key` 는 레포 전체 grep 0 = 5-3-2가 채울 결번이다.
- **동시성은 조건부 UPDATE+rowCount CAS** — SQLite 폴백 호환이 명시적 설계 제약(`Db.php`). optimistic lock/분산락 도입은 제약 위반.
- 🔴 20종·8종 **"있다고 가정"하고 배선 금지**.
