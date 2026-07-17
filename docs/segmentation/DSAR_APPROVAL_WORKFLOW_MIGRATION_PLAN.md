# DSAR — Workflow Migration Plan (§56)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §56 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 워크플로 **정의(Definition) 테이블** | `workflow_*`/`flow_*`/`wf_*` **backend/src grep 0** | `NOT_APPLICABLE` |
| 워크플로 **버전** 개념 | grep 0 — 버전이 없으므로 source/target 자체가 성립 불가 | `NOT_APPLICABLE` |
| Migration Plan | grep 0 | `NOT_APPLICABLE` |
| 인접 유일 `migration` 어휘 | `/v423/paddle/migrate`(routes.php) = **결제 플랜 이전** · 워크플로 무관 | `KEEP_SEPARATE_WITH_REASON` |
| DB 스키마 마이그레이션 | `backend/migrations/`(172차 정지) + 핸들러별 `ensureTables` 자가치유 | `KEEP_SEPARATE_WITH_REASON`(스키마 축 ≠ 인스턴스 축) |
| 승인 요청 테이블 4종 | `mapping_change_request`(REAL) · `action_request`(VACUOUS) · `admin_growth_approval` · `catalog_writeback_approval`(고아) — **전부 버전 컬럼 없음** | `NOT_APPLICABLE` |

**★축 주의 — 마이그레이션 대상 정의 자체가 부재.** §56은 "실행 중 Instance를 새 Workflow **Version**으로 이전"하는 계약이다. 그러나 현행은 **워크플로 정의 테이블 grep 0** → 정의도 버전도 인스턴스도 없다. **이전할 원본이 없으므로 §56은 마이그레이션 설계가 아니라 전방호환(forward-compat) 계약이다.** 즉 5-3-2가 Definition/Version을 **신설하는 그 순간부터** 본 계약이 구속력을 갖는다. 신설 이전에 §56을 "충족"으로 계산하면 대상 0에 대한 커버리지 100%라는 공허한 참(vacuous truth)이 된다.

**★축 주의 2 — DB 스키마 마이그레이션과 혼동 금지.** 레포에는 `backend/migrations/`라는 실 자산이 있으나 이는 **테이블 DDL 축**이다. §56은 **실행 중 인스턴스의 런타임 상태 축**이다. 형태(migration)만 같고 도메인이 다르다 → 매핑하면 역산이다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 22종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | migration_plan_id | 부재 | `NOT_APPLICABLE` |
| 2 | source workflow version | 부재 — 버전 개념 grep 0 | `NOT_APPLICABLE` |
| 3 | target workflow version | 부재 | `NOT_APPLICABLE` |
| 4 | tenant scope | 부재 · 🔴 `admin_growth_approval` 은 **tenant_id 컬럼 자체가 없음**(AdminGrowth.php:142-149) | `NOT_APPLICABLE` |
| 5 | environment scope | 부재 · 인접 = `Db::envLabel()`(운영/데모 구분·278차) | `LEGACY_ADAPTER`(환경 판별만 재사용) |
| 6 | eligible instance states | 부재 — 🔴 **상태집합 선언 자체가 없음**(§63 참조) | `NOT_APPLICABLE` |
| 7 | node mapping | 부재 | `NOT_APPLICABLE` |
| 8 | variable mapping | 부재 | `NOT_APPLICABLE` |
| 9 | task mapping | 부재 — Task 개념 전무 | `NOT_APPLICABLE` |
| 10 | token mapping | 부재 — Token 개념 전무 | `NOT_APPLICABLE` |
| 11 | active approval decision handling | 부재 · 인접 = `mapping_change_request.approvals_json`(Mapping.php:209) | `NOT_APPLICABLE` |
| 12 | active task handling | 부재 | `NOT_APPLICABLE` |
| 13 | timer handling | 부재(승인) · 인접 = `journey_enrollments.resume_at`/`wait_until`(JourneyBuilder.php:80-82) | `LEGACY_ADAPTER` |
| 14 | event subscription handling | 부재 — 🔴 범용 이벤트 버스·구독 기전 grep 0 | `NOT_APPLICABLE` |
| 15 | rollback policy | 부재(워크플로) · 인접 = `rollback_plan` 필드(Alerting.php:565) — **응답 패스스루일 뿐 집행 코드 없음** | `NOT_APPLICABLE` |
| 16 | dry-run result | 부재(워크플로) · 인접 = `dry_run_diff`(Alerting.php:564) — 동일하게 패스스루 | `NOT_APPLICABLE` |
| 17 | risk assessment | 부재 | `NOT_APPLICABLE` |
| 18 | requested by | 존재(유사) — `mapping_change_request.requested_by`(Mapping.php:209) · `admin_growth_approval.requested_by`(AdminGrowth.php:147) · **위조불가 신원은 `Mapping::actorId` 만** | `VALIDATED_LEGACY`(신원 산출은 `actorId` 재사용 강제) |
| 19 | approved by reference | 부재(참조형) · 현행은 참조가 아니라 **문자열 직접 기록**(`decided_by` AdminGrowth.php:147) | `NOT_APPLICABLE` |
| 20 | scheduled at | 부재(워크플로) · 인접 = `sms_campaigns.scheduled_at`(SmsMarketing.php:367) | `LEGACY_ADAPTER` |
| 21 | status | 존재(유사) — 단 🔴 **전이 규칙 선언 0**(§63) | `NOT_APPLICABLE`(상태집합 미선언) |
| 22 | evidence | 부재 · 인접 = `audit_log`(AdminGrowth.php:157-159) | `LEGACY_ADAPTER` |

**실측 개수: 22 / 22 전사.** 커버리지 = 부재 16 · 어댑터 5 · 확장 1.

## 2. 원문 전사 + 판정 — Migration Policy **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | NEW_INSTANCES_ONLY | 부재 | `NOT_APPLICABLE` |
| 2 | SAFE_POINT_ONLY | 부재 — Safe Point 개념 전무 | `NOT_APPLICABLE` |
| 3 | PAUSED_INSTANCES_ONLY | 부재 — Pause 상태 미선언 | `NOT_APPLICABLE` |
| 4 | SELECTED_INSTANCES | 부재 | `NOT_APPLICABLE` |
| 5 | ALL_ELIGIBLE_INSTANCES | 부재 | `NOT_APPLICABLE` |
| 6 | NO_MIGRATION | 부재 — **단 이것이 5-3-2 착수 시점의 사실상 현행값**(정의 0 → 이전 대상 0) | `NOT_APPLICABLE` |
| 7 | MANUAL | 부재 | `NOT_APPLICABLE` |

**실측 개수: 7 / 7 전사.** 커버리지 = 부재 7.

## 3. 규칙

- 🔴 **§56은 전방호환 계약이다.** 워크플로 정의 테이블 grep 0 → **마이그레이션 대상 정의 자체가 부재**. Definition/Version을 신설하기 전에는 본 계약을 "충족"으로 계산하지 마라(대상 0에 대한 공허한 100%).
- 🔴 **DB 스키마 마이그레이션(`backend/migrations/`)을 §56 커버로 계산 금지.** DDL 축 ≠ 런타임 인스턴스 축. 형태 유사·도메인 상이.
- 🔴 **기본 정책은 `NO_MIGRATION`.** Version 신설 직후 곧바로 `ALL_ELIGIBLE_INSTANCES`를 켜지 마라 — Safe Point·eligible state 집합이 §63에서 선언되기 전까지 이전 가능 여부를 판정할 근거가 없다.
- **`requested by` 의 신원은 `Mapping::actorId` 재사용 강제**(위조불가 `apikey:{id}`/`user:{email}` · 미확인 null→403 fail-closed). 신규 신원 산출 로직 작성 시 289차 G-01이 닫은 우회로(익명 2회=정족수)를 다시 연다.
  - 🟠 단 `actorId` 는 **actor_type 부재** — `apikey:`/`user:` 가 정족수에 동등 계수된다(스펙 §20 위배). Migration 승인(`approved by reference`)을 여기에 얹기 전에 actor_type 분리가 선결이다.
- **`tenant scope` 설계 시 `admin_growth_approval` 의 테넌트 결번을 반드시 반영하라.** 해당 테이블은 tenant_id 컬럼이 **없고**(AdminGrowth.php:142-149) 조회도 전역(`:641`·`:1306`)이며 결정 경로도 격리가 없다(`:1324 WHERE id=?`). **이 테이블을 마이그레이션 대상 모수에 그대로 편입하면 테넌트 경계 위반이 이전 로직으로 전파된다.** 흡수 시 tenant_id 백필이 선결.
- **`dry-run result`·`rollback policy` 를 "이미 있다"고 판단하지 마라.** `Alerting.php:564-565` 의 `dry_run_diff`/`rollback_plan` 은 **응답 패스스루 필드**이고 `action_request` 는 생산자 0(VACUOUS)이다 — 한 번도 채워진 적 없다.
- **동시성 모델은 조건부 UPDATE+rowCount CAS 채택.** optimistic lock(`version`)·분산락·`GET_LOCK` 은 전부 grep 0이며 **SQLite 폴백 호환이 명시적 설계 제약**(`Db.php`)이다 — 다른 동시성 모델 도입은 제약 위반.
- 🔴 22종·7종 **"있다고 가정"하고 배선 금지**.
