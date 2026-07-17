# DSAR — Workflow Resume (§50)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §50 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 워크플로 Resume | **부재** — pause 가 없으므로 resume 도 없다 | `NOT_APPLICABLE` |
| 재개 프리미티브 | `journey_enrollments status='processing'→'waiting'` 해제(JourneyBuilder.php:411-418) · stale lease 900s 회수(Omnichannel.php:394-399) · stale 600s 회수(ChannelSync.php:6136-6153) — **자동 회수이지 인가된 재개가 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 재폴링 패턴 | `wait` event-mode 재폴링(JourneyBuilder.php:565-570) | `LEGACY_ADAPTER`(패턴 재사용 · 설계 결론 1) |
| 타이머 재계산 | **부재** — `resume_at`/`wait_until` 은 **절대 시각 컬럼**(JourneyBuilder.php:80-82 · 206차 delay + 255차 이벤트 절대기한 **분리 설계**) · 재계산 코드 grep 0 | `NOT_APPLICABLE` |
| 정책/리소스 버전 | **버전 컬럼 grep 0**(`version`/`lock_version` backend/src 0) | `NOT_APPLICABLE` |
| 재검증(재개 시) | **부재** · 인접 = 대행사 콘솔 **매 요청 approved 재검증 fail-closed**(272차 AgencyPortal) | `LEGACY_ADAPTER`(규율 선례) |

**★축 주의 — "자동 회수" ≠ "Resume".** 현행 stale lease 회수(Omnichannel.php:394-399 · ChannelSync.php:6136-6153)는 **죽은 워커의 행을 되살리는 장애 복구**다. §50 Resume 은 **인가된 주체가 pause 를 명시적으로 해제**하는 것이며 `requested by`·`pause reference`·**4종 재검증**을 요구한다. 형태(status 되돌리기)가 같다고 커버로 계산하면 역산이다.

**★두 번째 축 주의 — 절대 시각 컬럼이 `timer recalculation` 을 구조적으로 막는다.** `resume_at` 은 **미래의 절대 UTC 시각**이다. pause 가 3일 지속되면 resume 시점에 `resume_at <= now` 가 이미 참이 되어 **대기 중이던 타이머가 일제히 즉시 발화**한다(thundering herd). 이는 §50 `timer recalculation` 이 **선택 항목이 아니라 필수인 이유**이며, 현행 컬럼 설계로는 잔여 시간을 복원할 수 없다(경과분 저장 없음).

## 1. 원문 전사 + 판정 — 필수 필드 **원문 13개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | resume_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow instance | 부재 — 인스턴스 테이블 grep 0 | `NOT_APPLICABLE` |
| 3 | pause reference | 부재 · §49 `pause_id` 참조 | `NOT_APPLICABLE` |
| 4 | requested by | 부재 · 인접 위조불가 신원 = `Mapping::actorId`(289차 신설 · 미확인 null→403 fail-closed) | `LEGACY_ADAPTER`(공용 추출 대상) |
| 5 | resume reason | 부재 | `NOT_APPLICABLE` |
| 6 | condition validation | 부재 · 인접 전이 가드 **4곳뿐**(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `LEGACY_ADAPTER` |
| 7 | resource version validation | **부재** — 버전 컬럼 grep 0 | `NOT_APPLICABLE` |
| 8 | policy version validation | **부재** — 정책 버전 개념 없음 | `NOT_APPLICABLE` |
| 9 | actor assignment validation | 부재 — 배정/클레임 개념 전무 · 인접 = `Mapping.php:245-290` 자기승인 차단·승인자 dedup | `LEGACY_ADAPTER`(공용 추출 대상) |
| 10 | timer recalculation | **부재** — `resume_at`/`wait_until` 절대 시각 컬럼, 재계산 코드 grep 0 | `NOT_APPLICABLE` |
| 11 | resumed at | 부재 | `NOT_APPLICABLE` |
| 12 | status | 부재(승인) · 전이 규칙 선언 0 | `NOT_APPLICABLE` |
| 13 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재 9 · 어댑터 4.

## 2. 원문 요구 문장 전사

> **"Resume 전 Resource·Policy·Role·Approval Requirement를 재검증할 수 있어야 한다."**

**4종 재검증 대상 대조 — 원문 4종**

| # | 재검증 대상 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Resource | 리소스 버전 부재 → 재검증 불가 | `NOT_APPLICABLE` |
| 2 | Policy | 정책 버전 부재 → 재검증 불가 | `NOT_APPLICABLE` |
| 3 | Role | 역할 바인딩 **코드 상수**(정의 테이블 부재 · 설계 결론 2) → 런타임 재검증 대상 자체가 없음 | `NOT_APPLICABLE` |
| 4 | Approval Requirement | 정족수가 **코드 리터럴**(Mapping INSERT `2` :209 · Alerting 응답 `2` :562) → 재검증 불가 | `NOT_APPLICABLE` |

**실측 개수: 4 / 4 전사.** 커버리지 = 부재 4.

## 3. 규칙

- 🔴 **stale lease 자동 회수를 Resume 으로 재사용 금지.** 회수는 `requested by` 가 없다 = 무인가 재개다. §50 은 **인가된 해제**이며 §49 `pause_id` 를 참조해야 한다.
- 🔴 **재검증 4종이 전부 불가능한 것이 현재 상태다.** 재검증 대상(Resource/Policy/Role/Approval Requirement)에 **버전이 없기 때문**이다. §50 을 만족하려면 **§55 Lock Version 도입이 선결**이며, 이는 **SQLite 폴백 호환 제약**과 정면으로 만난다(§55 문서 참조).
- 🔴 **"재검증 없는 Resume" = 조용한 우회로.** pause 중 정책이 강화됐는데 옛 요구로 재개되면, **pause 가 정책 회피 수단**이 된다. `resource version validation`·`policy version validation` 이 부재하면 **재개를 fail-closed 로 막아라**(재검증 불가 → 재개 거부). 검증 못 하는 것을 통과시키지 마라 — `Unknown ≠ Valid`.
- 🔴 **`timer recalculation` 미구현 시 Resume 금지.** 절대 시각 컬럼 특성상 pause 기간만큼 타이머가 일제 발화한다. 잔여 시간을 복원할 수 없으면 **재개 대신 명시적 재설정**을 요구하라.
- `wait` event-mode 재폴링(JourneyBuilder.php:565-570)은 **재개 후 조건 재평가 패턴으로 인용 가능**하다(설계 결론 1). 단 마케팅 도메인이므로 **커버로 계산하지 말고 프리미티브로만 재사용**.
- `condition validation` 은 전이 가드 4곳의 규율을 따르되, **`Catalog::approveQueue`:2341 을 참조 구현으로 삼아라**(승인 도메인 인접). 🔴 `Alerting::executeAction`(Alerting.php:601-660)은 **절대 참조 금지** — `:612` 가 status 를 SELECT 하고 판독하지 않는 죽은 읽기다.
