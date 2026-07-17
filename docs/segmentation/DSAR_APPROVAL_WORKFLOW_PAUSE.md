# DSAR — Workflow Pause (§49)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §49 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 승인 워크플로 Pause | **부재** — 워크플로 정의/인스턴스 테이블(`workflow_*`/`flow_*`/`wf_*`) grep 0 | `NOT_APPLICABLE` |
| Kill Switch (집행 중단) | `AdAdapters::executionEnabled` **AdAdapters.php:34-40** — `AD_EXECUTION_DISABLED=1`(긴급 킬스위치) / `AD_EXECUTION_ENABLED=0`(명시적 비활성) · **호출부 9곳 실배선 REAL**(:55·:194·:240·:331·:355·:1083·:1213·:1799·:1820) | `VALIDATED_LEGACY`(재사용 강제) |
| 실행 일시정지 프리미티브 | `journey_enrollments.status='processing'` ↔ `'waiting'` 조건부 UPDATE 선점/해제(JourneyBuilder.php:411-418) — **마케팅 여정 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| `LEGAL_HOLD` | **`legal_hold`/`legalHold` backend/src grep 0** | `NOT_APPLICABLE` |
| 활성 타이머 정책 | 타이머 서비스 부재 — `resume_at`/`wait_until` **DB 컬럼 + cron 폴링**(JourneyBuilder.php:80-82) | `LEGACY_ADAPTER`(패턴 재사용) |
| 외부 콜백 정책 | 인바운드 `Webhooks.php:22-27`(opt-in) · Paddle HMAC(Paddle.php:1073) — **pause 개념 없음** | `NOT_APPLICABLE` |

**★축 주의 — 오탐 재플래그 금지.** `AdAdapters::pause`(AdAdapters.php:264-275)가 `executionEnabled()` 게이트를 **면제**받는 것은 결함이 아니라 **279차 감사 D-P1의 의도된 설계**다. 주석(:267-271) 실측: *"킬스위치는 '지출을 늘리는 방향'(create/activate/증액)만 차단해야 한다. 정지(pause)는 지출을 멈추는 안전 방향이므로 킬스위치와 무관하게 항상 허용한다."* 종전엔 킬스위치를 켜면 라이브 캠페인을 못 멈춰 계속 소진되는 설계 모순이었다. **이 면제를 §49 Pause 결함으로 다시 플래그하지 마라.**

**★두 번째 축 주의 — 이름 충돌.** `AdAdapters::pause` 는 **광고 캠페인 집행 정지**이고 §49 는 **워크플로 인스턴스 일시정지**다. 이름이 같을 뿐 대상이 다르다. `AdAdapters::pause` 를 §49 커버로 계산하면 역산이다 → `SERVICE_TASK` 액추에이터로만 인용한다.

## 1. 원문 전사 + 판정 — Pause Trigger **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MANUAL | 부재 — 수동 pause 진입점 grep 0 | `NOT_APPLICABLE` |
| 2 | POLICY_CHANGE | 부재 · 정책 버전 개념 자체 없음 | `NOT_APPLICABLE` |
| 3 | RESOURCE_CHANGE | 부재 | `NOT_APPLICABLE` |
| 4 | SECURITY_INCIDENT | 부재(승인) · 인접 = `AD_EXECUTION_DISABLED` 긴급 킬스위치(AdAdapters.php:37) | `LEGACY_ADAPTER` |
| 5 | LEGAL_HOLD | **grep 0** | `NOT_APPLICABLE` |
| 6 | MAINTENANCE | 부재 | `NOT_APPLICABLE` |
| 7 | WORKFLOW_MIGRATION | 부재 · §56 Migration Plan 과 짝 | `NOT_APPLICABLE` |
| 8 | EXTERNAL_DEPENDENCY | 부재 · 인접 = **honest pending**(어댑터 부재 시 재시도 미소모 · ChannelSync.php:6173 · Catalog.php:1712) | `LEGACY_ADAPTER`(규율 재사용) |
| 9 | RISK_REEVALUATION | 부재 | `NOT_APPLICABLE` |
| 10 | OTHER | 부재 | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 8 · 어댑터 2.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 13개**

| # | 원문 필드명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | pause_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow instance | 부재 — 인스턴스 테이블 grep 0 | `NOT_APPLICABLE` |
| 3 | pause trigger | 부재 | `NOT_APPLICABLE` |
| 4 | requested by | 부재(승인) · 인접 위조불가 신원 = `Mapping::actorId`(289차 신설 · `apikey:{id}`/`user:{email}` · 미확인 null→403 fail-closed) | `LEGACY_ADAPTER`(공용 추출 대상) |
| 5 | reason | 부재 | `NOT_APPLICABLE` |
| 6 | effective at | 부재 | `NOT_APPLICABLE` |
| 7 | affected tokens | 부재 — Token 개념 자체 없음 | `NOT_APPLICABLE` |
| 8 | affected tasks | 부재 — Task 개념 자체 없음 | `NOT_APPLICABLE` |
| 9 | active timers policy | 부재 · 인접 = `resume_at`/`wait_until` cron 폴링(JourneyBuilder.php:80-82) | `LEGACY_ADAPTER` |
| 10 | external callbacks policy | 부재 | `NOT_APPLICABLE` |
| 11 | resume conditions | 부재 · §50 Resume 과 짝 | `NOT_APPLICABLE` |
| 12 | status | 부재(승인 pause) · 인접 = `UPDATE ... SET status=` **155건/44파일**이나 **전이 규칙 선언 0** | `NOT_APPLICABLE` |
| 13 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = 부재 10 · 어댑터 3.

## 2-1. 규칙

- 🔴 **Kill Switch 신설 금지.** `AdAdapters::executionEnabled`(AdAdapters.php:34-40)가 **호출부 9곳 실배선 REAL** 이다. `SECURITY_INCIDENT` pause 는 이 스위치를 **재사용**하고, 두 번째 킬스위치를 만들지 마라.
- 🔴 **`pause()` 킬스위치 면제(AdAdapters.php:264-275)를 결함으로 재플래그 금지** — 279차 D-P1 의도된 설계다. §49 가 pause 를 도입해도 **"지출을 멈추는 방향은 항상 허용"** 이라는 이 비대칭 규율을 깨뜨리지 마라.
- 🔴 **Pause 는 "실행 중단"이지 "상태 삭제"가 아니다.** `affected tokens`/`affected tasks` 는 **보존 후 표식**이며, pause 중 소실되면 §50 Resume 이 불가능해진다.
- `active timers policy` 는 **타이머 서비스가 없다는 현실**(DB 컬럼 + cron 폴링) 위에서 정의하라. cron 은 pause 를 모른다 → **폴링 쿼리의 술어에 pause 상태를 넣지 않으면 pause 가 무효**다. `journey_cron.php:29-35`(*/5) 가 `status='waiting' AND resume_at <= now` 만 보는 것과 동일한 구조적 함정.
- ⚠️ **`external callbacks policy` — pause 중 도착한 콜백을 버리면 유실이다.** Paddle 선례(`notification_id` UNIQUE · `processed=1`일 때만 skip · `processed=0`은 재처리 허용 · 272차)를 따라 **수신·기록하되 미처리로 보류**하라.
- `MANUAL` pause 의 `requested by` 는 **`Mapping::actorId` 의 위조불가 신원 규율**(미확인 null → 403 fail-closed)을 재사용하라. 🟠 단 현행은 **`actor_type` 부재**로 `apikey:`/`user:` 가 동등 계수된다 — pause 권한을 API 키에 열지 여부는 §49 가 아니라 §20 권한 축에서 결정된다.
