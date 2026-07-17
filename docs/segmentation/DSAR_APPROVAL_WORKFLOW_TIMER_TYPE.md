# DSAR — Timer Type (§21)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §21 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

`APPROVAL_WORKFLOW_TIMER_DEFINITION` 의 **Timer Type** 축. 엔티티/필수 필드는 [DSAR_APPROVAL_WORKFLOW_TIMER_DEFINITION.md](DSAR_APPROVAL_WORKFLOW_TIMER_DEFINITION.md) 참조.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 타이머 **타입 축** 선언 | **grep 0** — 타이머를 유형으로 분류·분기하는 지점 없음 | `NOT_APPLICABLE`(부재 → 신설) |
| 실체 | **DB 컬럼 + cron 폴링**(타이머 서비스·지연큐 부재) — `journey_enrollments.resume_at`/`wait_until`(JourneyBuilder.php:80-82) | `VALIDATED_LEGACY`(패턴만) |
| 현행 "유형"의 총수 | **사실상 2종** — 상대시간(`delay` :527·`strtotime("+{$val} {$unit}")` :538) · 절대시각(`wait` date-mode :574 / event-mode 기한 `wait_until` :562) | `KEEP_SEPARATE_WITH_REASON`(마케팅) |
| 예약 발송 | `sms_campaigns.scheduled_at`+`runScheduledQueue`(SmsMarketing.php:367) · kakao/email 대칭 = **절대시각 1종** | `KEEP_SEPARATE_WITH_REASON` |
| cron 표현식 | **앱 내 파서/평가기 grep 0** — cron 표현식은 `install_crontab.sh`·`journey_cron.php:29-35`(*/5)·`webhook_dispatch_cron.php:17-18` 등 **crontab 파일에만** 존재 | `NOT_APPLICABLE`(앱 축 부재) |
| 영업일 달력 | `business_calendar`/`holiday`/`workday`/`business_day` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 — 현행 2종을 원문 10종에 매핑 금지.** `delay`(상대)·`wait`(절대) 는 **형태상 `DURATION`/`ABSOLUTE_DATETIME` 과 겹쳐 보이지만 마케팅 발송 도메인**이며(`customer_id` 필수 :554) **타입으로 선언된 적이 없다** — 노드 타입 분기(`$type === 'delay'`)의 부산물일 뿐이다. 승인 커버로 계산하면 역산이다. **단 실행 프리미티브(재폴링 :565-570)는 인용 가능**.

**★축 주의 2 — `*_REFERENCE`/`RELATIVE_TO_*` 는 "기준점 축"이지 "시간 계산 축"이 아니다.** 10종 중 4종(`RELATIVE_TO_NODE_ENTRY`·`RELATIVE_TO_TASK_ASSIGNMENT`·`RELATIVE_TO_REQUEST_SUBMISSION`·`DEADLINE_REFERENCE`)은 **시작 기준점을 무엇으로 삼는가**를 가른다. 현행은 기준점이 **암묵적으로 "호출 순간"** 하나뿐이다(:538 `strtotime` 상대 · `entered_at` :552 는 `wait` 전용). 즉 **`DURATION` 하나만 흉내낼 수 있고 나머지 기준점 축은 존재 자체가 없다**.

**★축 주의 3 — 폴링 해상도 상한.** `journey_cron.php` = **\*/5**. 어떤 타이머 타입을 채택하든 **실효 해상도는 5분**이다.

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DURATION | 인접 = `delay` 노드 `config.value`+`config.unit` → `strtotime("+{$val} {$unit}")`(JourneyBuilder.php:536-538) · **UTC 고정 `gmdate`** · **마케팅 도메인** | `KEEP_SEPARATE_WITH_REASON` — 패턴만 인용, 노드 매핑 금지 |
| 2 | ABSOLUTE_DATETIME | 인접 = `wait` date-mode `resume_at <= $now`(:574) · `sms_campaigns.scheduled_at`+`runScheduledQueue`(SmsMarketing.php:367 · **ISO8601 문자열 사전식 비교**) · **양쪽 다 마케팅** | `KEEP_SEPARATE_WITH_REASON` |
| 3 | BUSINESS_CALENDAR | **부재** — `business_calendar`/`holiday`/`workday`/`business_day` **grep 0**(backend/src 전역·대소문자 무시) | `NOT_APPLICABLE` |
| 4 | DEADLINE_REFERENCE | 인접 = `wait_until`(:80-82·:562 · **255차 이벤트 절대기한 분리 설계**) = 레포에서 **기한 개념에 가장 가까운 실자산** · 단 마케팅 · **참조(선언) 축 없음**(컬럼 직접 판독) | `KEEP_SEPARATE_WITH_REASON` — 🔴 **분리 설계 자체는 승계 필수**(설계 결론) |
| 5 | SLA_REFERENCE | **부재** — SLA 정의체 grep 0. ※ 원문 §21 명시: **"상세 SLA·Escalation은 후속 단계에서 구현한다"** → 본 단계는 **참조 축만 확정** | `CONTRACT_ONLY` |
| 6 | CRON_REFERENCE | **앱 내 부재** — cron 표현식 파서/평가기 grep 0. cron 표현식은 **crontab 파일에만**(`journey_cron.php:29-35` */5 · `webhook_dispatch_cron.php:17-18` * * * * * · `install_crontab.sh:122-123`). 🔴 **OS cron = 스케줄링 단일 수단**이나 이는 **런타임 구동 수단**이지 **타이머 타입 축이 아니다** | `NOT_APPLICABLE`(앱 축 신설 · OS cron 은 구동 기반으로 재사용) |
| 7 | RELATIVE_TO_NODE_ENTRY | **부재** — 노드 진입 시각 기록 축 없음. 인접 = `journey_enrollments.entered_at`(:552)는 **enrollment 진입**이지 노드 진입 아님 · `journey_node_logs`(:50,:69)에 노드별 기록은 있으나 **타이머 기준점으로 판독하는 코드 0** | `NOT_APPLICABLE` |
| 8 | RELATIVE_TO_TASK_ASSIGNMENT | **부재** — Task/배정 개념 자체 전무(§22) → 기준점이 성립 불가 | `NOT_APPLICABLE` |
| 9 | RELATIVE_TO_REQUEST_SUBMISSION | **부재**(선언) · 인접 데이터 = `mapping_change_request` 생성시각(Mapping.php:209 **REAL**) · 🔴 `action_request` 는 **`INSERT` grep 0 = 생산자 전무(VACUOUS)** → 제출 시각이 **한 번도 존재한 적 없음** | `NOT_APPLICABLE` |
| 10 | CUSTOM | **부재** | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 6 · 도메인분리 3 · 계약만 1.

## 2. 규칙

- 🔴 **현행 2종(`delay` 상대 · `wait` 절대)을 원문 10종에 매핑 금지.** 형태 유사·도메인 상이(마케팅 발송 · `customer_id` 필수 :554). 매핑하면 **갭이 정의상 소멸하는 역산**이다.
- ★ **`DEADLINE_REFERENCE` 는 255차 `wait_until` 분리 설계를 반드시 승계하라.** `resume_at`(다음 재폴링 시점)과 `wait_until`(**절대 기한**)이 **다른 컬럼인 것이 설계**다(:80-82). 승인 타이머에서 이를 하나로 합치면 **"아직 안 깨어남"과 "기한 만료"가 구분 불가**해진다.
- 🔴 **`CRON_REFERENCE` 를 "OS cron 이 있으니 커버"로 계산 금지.** OS cron 은 **폴러를 구동하는 수단**이지 **테넌트가 선언하는 타이머 타입**이 아니다. 앱 내 cron 표현식 파서는 **grep 0** — 채택 시 **신설**이며, 채택하지 않는 것도 정당한 결론이다(승인 도메인에 반복 일정이 필요한지 먼저 증명하라).
- 🔴 **타이머 서비스·지연큐 신설 금지** — 전 타입을 **DB 컬럼 + cron 폴링**(`journey_cron.php` */5 대열)으로 구현하고, **재폴링 패턴(JourneyBuilder.php:565-570)** 을 재사용하라.
- 🔴 **중복 발화 방지 필수** — `claimSendOnce`(:450·:679) 자연키 선점 마커 채택. **다른 동시성 모델 금지**(optimistic lock/분산락/`GET_LOCK` 전부 grep 0 · **SQLite 폴백 호환이 명시적 설계 제약**) → **조건부 UPDATE + rowCount CAS** 로 통일.
- 🔴 **`BUSINESS_CALENDAR` 채택 시 신설 불가피 — 그러나 타임존 4번째 축을 만들지 마라.** 이미 3벌 병존(`RuleEngine::DEFAULT_TZ='Asia/Seoul'`:35+`DateTimeZone`:376-377 · `tz_offset` INT PreferenceCenter.php:84 · ISO8601 문자열 SmsMarketing.php:367). **`RuleEngine` 축 채택 권고**.
- **`SLA_REFERENCE` 는 `CONTRACT_ONLY`** — 원문이 후속 단계로 명시했다. **본 단계에서 구현 금지**(범위 침범).
- **5분 미만 해상도 타이머 선언 금지**(cron `*/5` 상한).
- 🔴 6종 **"있다고 가정"하고 배선 금지**.
