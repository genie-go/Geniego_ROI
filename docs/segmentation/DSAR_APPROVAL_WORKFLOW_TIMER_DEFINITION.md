# DSAR — Timer Definition (§21)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §21 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 엔티티명: `APPROVAL_WORKFLOW_TIMER_DEFINITION`

> 원문 §21 말미 명시: **"상세 SLA·Escalation은 후속 단계에서 구현한다."** → `SLA_REFERENCE`·`DEADLINE_REFERENCE` 는 **본 단계에서 참조 축만 확정**하고 실 구현은 범위 밖이다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 타이머 **정의 테이블**(`timer_*`) | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 타이머 서비스 / 지연큐(delay queue) | **부재** — 전용 브로커 없음 | `NOT_APPLICABLE` |
| **실체 = DB 컬럼 + cron 폴링** | `journey_enrollments.resume_at`/`wait_until`(JourneyBuilder.php:80-82) — **206차 delay + 255차 이벤트 절대기한 분리 설계**(두 컬럼이 각각 다른 축) | `VALIDATED_LEGACY`(패턴 확장) |
| delay 판독 | `resume_at <= $now` **문자열 비교**(JourneyBuilder.php:529) · 설정 = `gmdate('Y-m-d H:i:s', strtotime("+{$val} {$unit}"))`(:538 · **UTC 고정**) | `LEGACY_ADAPTER` |
| wait date-mode | `resume_at <= $now`(:574) — delay 와 동일 축 재사용 | `KEEP_SEPARATE_WITH_REASON`(마케팅) |
| wait event-mode 타임아웃 | `wait_until <= $now` → `nextNode(..,'timeout')`(:562-565) · **미도래 시 `resume_at=now` 유지 재폴링**(:567-570) | **재폴링 패턴 인용 가능** |
| 예약 발송 | `sms_campaigns.scheduled_at` + `runScheduledQueue`(SmsMarketing.php:367 · **ISO8601 문자열 사전식 비교**) · kakao/email 대칭 | `KEEP_SEPARATE_WITH_REASON`(마케팅) |
| 스케줄링 수단 | **OS cron 단일 수단** — `journey_cron.php:29-35`(*/5) · `webhook_dispatch_cron.php:17-18`(* * * * *) · `install_crontab.sh` 정본 등재. **앱 내 cron 표현식 파서/평가기 grep 0**(cron 표현식은 crontab 파일에만 존재) | `VALIDATED_LEGACY`(배선 REAL) |
| 타임존 | JourneyBuilder = **`gmdate` UTC 고정**(:538 · timezone 축 없음) ↔ 인접 실자산 = `RuleEngine::DEFAULT_TZ='Asia/Seoul'`(:35) + `new \DateTimeZone($tz)`(:376-377 · 실패 시 UTC 폴백) · `crm_customer_prefs.tz_offset`(PreferenceCenter.php:84 · **INT offset**) | 혼재 — 3벌 축 |
| 영업일 달력 | `business_calendar`·`holiday`·`workday`·`business_day` **grep 0**(대소문자 무시) | `NOT_APPLICABLE` |
| 중복 발화 방지 | 부재(타이머) · 인접 = `claimSendOnce`(JourneyBuilder.php:450·:679) 자연키 선점 · 원자적 claim(:411-418) | `LEGACY_ADAPTER` |

**★축 주의 — 형태 유사 ≠ 의미 동일.** `journeys` 의 `delay`(:527)·`wait`(:548 `date|event|timeout` 분기)는 원문의 `DURATION`/`ABSOLUTE_DATETIME`/`DEADLINE_REFERENCE` 와 **형태가 닮았으나 마케팅 발송 도메인**이다(실행 컨텍스트 = `crm_customers`/`journey_enrollments` · **`customer_id` 필수** :554). **승인 타이머 커버로 계산하면 역산**이다 → `KEEP_SEPARATE_WITH_REASON`. **단 재폴링 패턴(:565-570)은 실행 프리미티브의 재사용 근거로 인용 가능**하다(설계 결론 1).

**★축 주의 2 — "타이머"라는 이름의 부재가 아니라 능력의 부재를 보라.** 이름(`timer_*`) grep 0 은 근거가 약하다. **능력 대조 결과**: 시각 도래 판정 능력은 **있다**(`resume_at <= now`). 없는 것은 **① 정의(선언) 축 ② 타임존/영업일 해석 ③ 놓친 발화 처리(catch-up/missed) ④ 중복 발화 방지 ⑤ 발화→전이 바인딩** 이다. 즉 **"판정은 되나 계약이 없다"**.

**★축 주의 3 — 폴링 주기가 타이머 정밀도의 상한이다.** `journey_cron.php` 는 **\*/5**(5분)이다. `DURATION`/`ABSOLUTE_DATETIME` 을 재사용하면 **승인 타이머의 실효 해상도는 5분**이며, 이보다 촘촘한 기한은 **선언은 가능하나 지켜지지 않는다**. 정의 축에 **최소 해상도 제약을 명시**해야 한다.

## 1. 원문 전사 + 판정 — **원문 필수 필드 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | timer_definition_id | 부재 — 타이머 정의 테이블 grep 0. 현행 타이머는 **컬럼값**일 뿐 **식별자 가진 정의체가 아님** | `NOT_APPLICABLE` |
| 2 | workflow_node_id | 부재 — 워크플로 정의 테이블(`workflow_*`/`flow_*`/`wf_*`) **grep 0**. 인접 = `journey_enrollments.current_node`(**노드 인스턴스 위치**이지 정의 참조 아님) | `NOT_APPLICABLE` |
| 3 | timer type | 부재 — §21 Timer Type 10종 축은 [DSAR_APPROVAL_WORKFLOW_TIMER_TYPE.md](DSAR_APPROVAL_WORKFLOW_TIMER_TYPE.md) 참조 | `NOT_APPLICABLE` |
| 4 | timer expression | 인접 = `config.value`+`config.unit`(JourneyBuilder.php:536-537) → `strtotime("+{$val} {$unit}")`(:538). **표현식이 아니라 2필드 산술** · **cron 표현식 파서 앱 내 grep 0**(crontab 파일 전용) | `KEEP_SEPARATE_WITH_REASON`(마케팅·표현식 축 부재) |
| 5 | timezone | 부재(타이머) — JourneyBuilder **`gmdate` UTC 고정**(:538) · 🔴 인접 타임존 축 **3벌 병존**: `RuleEngine::DEFAULT_TZ='Asia/Seoul'`(:35)+`DateTimeZone`(:376) · `crm_customer_prefs.tz_offset` **INT**(PreferenceCenter.php:84) · SmsMarketing **ISO8601 문자열**(:367) | `NOT_APPLICABLE`(신설 · 🔴 4번째 축 금지) |
| 6 | business calendar reference | 부재 — `business_calendar`/`holiday`/`workday`/`business_day` **grep 0**(backend/src 전역·대소문자 무시) | `NOT_APPLICABLE` |
| 7 | start reference | 부재(선언) · 인접 암묵 기준점 = `journey_enrollments.entered_at`(:552 `wait` 의 `$since`) · `resume_at` 설정 시점 = **호출 순간**(:538 `strtotime` 상대) | `NOT_APPLICABLE` |
| 8 | maximum delay | 부재(타이머) · 인접 = 재시도 백오프 캡 `86400s`(AdAdapters.php:1221 `600*2^n`) — **재시도 캡이지 타이머 상한 아님** | `NOT_APPLICABLE` |
| 9 | catch-up policy | 부재 — 🔴 현행은 **암묵 catch-up**: cron 정지 후 재개 시 `resume_at <= now` 가 **전부 한꺼번에 통과**(:529·:574). 정책 선언 없음 → **의도된 설계인지 사고인지 코드로 판별 불가** | `NOT_APPLICABLE` |
| 10 | missed timer policy | 부재 — 위와 동일. 놓친 발화를 **skip 할지 fire 할지 결정하는 지점 0** | `NOT_APPLICABLE` |
| 11 | duplicate fire protection | 부재(타이머 축) · 인접 실자산 = `claimSendOnce(enrollment_id,node_id)`(JourneyBuilder.php:450·:679 · **커밋 전 크래시 시 재발송 차단**·277차) · 원자적 claim 조건부 UPDATE(:411-418) | `LEGACY_ADAPTER`(패턴 재사용 강제) |
| 12 | target transition | 부재(선언) · 인접 = `nextNode($edges,$nodeId,'timeout')`(:565)/`'occurred'`(:559) — **엣지 라벨 하드코딩 · 선언적 전이 아님**. 🔴 **상태머신 없음**: 전이 규칙 선언 0 · 전이 가드 4곳뿐(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) | `NOT_APPLICABLE` |
| 13 | status | 부재(타이머 정의) · 인접 = `journey_enrollments.status='waiting'`(:539) — **enrollment 상태이지 타이머 상태 아님** | `NOT_APPLICABLE` |
| 14 | evidence | 부재 · 인접 감사로그 = `logNode(.., 'delay', 'waiting', ['resume_at'=>$resume])`(:541) · `'event_timeout'`(:563) → `journey_node_logs`(:50,:69) | `LEGACY_ADAPTER`(로깅 패턴 인용) |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 11 · 어댑터 2 · 도메인분리 1.

## 2. 규칙

- 🔴 **타이머 서비스·지연큐·인프로세스 스케줄러 신설 금지.** 레포의 **스케줄링 수단은 OS cron 단일**이며(`install_crontab.sh` 정본 등재) 이는 우연이 아니라 배포 형상이다. 신설분도 **DB 컬럼 + cron 폴링** 패턴을 따르고, `journey_cron.php`(*/5) 대열에 **cron 라인을 추가**하라.
- **`wait` event-mode 재폴링 패턴(JourneyBuilder.php:565-570) 재사용 강제** — 미도래 시 `resume_at=now` 유지 + `wait_until` 보존으로 **다음 cron에 재판정**. 승인 대기의 표준 프리미티브다. **단 `delay`/`wait` 노드 자체를 승인 타이머로 매핑 금지**(마케팅 도메인 · `customer_id` 필수 :554).
- ★ **206차 delay + 255차 `wait_until` 분리 설계를 승계하라.** `resume_at`(재폴링 시점)과 `wait_until`(**절대 기한**)은 **다른 축**이다. 하나로 합치면 255차가 분리한 이유가 무너진다 — 승인에서는 `resume_at`=다음 점검, `wait_until`=SLA 절대 기한.
- 🔴 **타임존 4번째 축 신설 금지.** 이미 3벌(`RuleEngine` `DateTimeZone` :376 · `tz_offset` INT PreferenceCenter.php:84 · ISO8601 문자열 SmsMarketing.php:367)이 병존한다. **`RuleEngine::DEFAULT_TZ`+`DateTimeZone`(:35·:376-377) 축 채택 권고** — 유일하게 IANA 타임존을 실제로 해석하고 실패 시 UTC 폴백까지 갖췄다. JourneyBuilder 의 `gmdate` UTC 고정(:538)은 **타임존 축이 없는 것**이지 UTC 정책이 아니다.
- 🔴 **문자열 사전식 비교 승계 시 형식 고정 필수.** `resume_at <= $now`(:529)·SmsMarketing ISO8601 사전식 비교(:367)는 **형식이 완전히 동일할 때만** 성립한다. `Y-m-d H:i:s`(:538)와 ISO8601(`T`/`Z` 포함)은 **사전식으로 뒤섞이면 오판정**한다. 신설 타이머는 **단일 형식 선언 필수**.
- **중복 발화 방지는 `claimSendOnce`(:450) 자연키 선점 마커 채택.** 🔴 **다른 동시성 모델 도입 금지** — optimistic lock(`version`)·분산락·`GET_LOCK` **전부 grep 0**이며 **SQLite 폴백 호환이 명시적 설계 제약**이다(`flock` 은 `stock_sync_cron.php:54` 유일). **조건부 UPDATE + rowCount CAS** 로 통일.
- 🔴 **`catch-up policy`/`missed timer policy` 는 반드시 명시적으로 선언하라.** 현행은 정책이 없어 cron 정지 후 재개 시 **밀린 타이머가 일괄 발화**한다(:529). 승인 도메인에서 이는 **기한 만료 일괄 자동거절** 같은 사고로 직결된다. "현행이 그러니 그대로"는 **정책 부재를 정책으로 승격시키는 역산**이다.
- **최소 해상도 제약 명시.** cron `*/5` 가 상한이므로 5분 미만 기한은 선언 금지.
- **SLA·Escalation 상세는 후속 단계**(원문 §21 명시) — 본 문서는 참조 축만 확정.
- 🔴 11종 **"있다고 가정"하고 배선 금지**.
