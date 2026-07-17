# DSAR — Workflow Transition Type (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §34(Transition Type) · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)
> 필드 축은 [DSAR_APPROVAL_WORKFLOW_TRANSITION.md](DSAR_APPROVAL_WORKFLOW_TRANSITION.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 전이 종류 축 | **backend/src grep 0** — 전이 기록 자체가 없으므로 그 분류도 없음 | `NOT_APPLICABLE`(부재 → 신설) |
| 전이 규칙 선언 | **0** — `UPDATE ... SET status=` **155건/44파일**이 전부 호출 지점 인라인 | `NOT_APPLICABLE` |
| 전이 가드 | 4곳(`FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155) — **전부 종류 구분 없음** | `LEGACY_ADAPTER`(패턴만) |
| 전이 주체 | 여정 = cron 단일(journey_cron.php:29-35 `*/5`) · 승인 4종 = HTTP 요청 단일 | **자동/수동 구분 동기 자체가 없었음** |

**★축 주의 — "전이 종류"는 전이 기록을 전제한다.** 현행은 `status` 를 **덮어쓸** 뿐이므로 그 전이가 자동이었는지·인간이 했는지·타이머가 쐈는지·관리자가 강제했는지 **구분할 자리가 물리적으로 없다**. 14종 전부 `NOT_APPLICABLE` 이다. 아래 "인접" 열은 **그 종류의 전이를 유발하는 코드가 어디 있는가**를 표시한 것이지 **커버가 아니다** — 그 코드들은 전이를 **일으키되 기록하지 않는다**.

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | AUTOMATIC | 부재(기록) · 인접 = `trigger` 통과(:524) · `nextNode`(:786) 무조건 진행 | `LEGACY_ADAPTER` |
| 2 | HUMAN_COMPLETION | **부재** · ★인접 = `Mapping::approve`(Mapping.php:238-294) — 레포 **유일 REAL 승인**(정족수·위조불가 신원·자기승인 차단·dedup·상태 게이트 5단 전부) | `VALIDATED_LEGACY`(공용 추출) |
| 3 | DECISION | 부재 · 인접 = `condition`(:600)·`split`(:614-621)·`nba`/`decision` 노드 — **마케팅 발송 분기** | `KEEP_SEPARATE_WITH_REASON` |
| 4 | EVENT | 부재 · 인접 = `wait` mode=event `eventOccurred`(:557) — **마케팅 이벤트**(purchase/email_open/email_click) · 🔴 **범용 이벤트 버스 grep 0** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | TIMER | 부재(기록) · 인접 = `delay` resume(:527,:539) · `sms_campaigns.scheduled_at`+`runScheduledQueue`(SmsMarketing.php:367) · **스케줄링=OS cron 단일 수단** | `LEGACY_ADAPTER` |
| 6 | SIGNAL | **부재** — 🔴 in-process dispatcher·구독 기전 **grep 0**. `OpenPlatform::emit`(:311-328)은 **웹훅 발신 전용**(구독 0이면 no-op · **예외 절대 미전파** :325) | `NOT_APPLICABLE` |
| 7 | MESSAGE | 부재(승인) · 인접 = `Webhooks.php:22-27` **opt-in**(시크릿 미설정 벤더 수신 허용 + `verified=false`) | `LEGACY_ADAPTER` |
| 8 | ERROR | **부재** — 여정은 실패 상태가 없다(예외 시 `release`(:417) `status='waiting'` **원위치**) | `NOT_APPLICABLE` |
| 9 | TIMEOUT | 부재(기록) · 인접 = `wait` timeout 분기(:565-570 `wait_until <= now` → `nextNode(...,'timeout')`) | `LEGACY_ADAPTER` |
| 10 | CANCEL | 부재 · 인접 = `exit` 노드(:623) **즉시 종료**(요청/수락 2단 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | COMPENSATION | **부재** · 유사 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 12 | MIGRATION | **grep 0**(정의 버전 개념 부재) | `NOT_APPLICABLE` |
| 13 | REPLAY | **grep 0** | `NOT_APPLICABLE` |
| 14 | ADMINISTRATIVE | **부재** — 🔴 관리자 강제 전이가 **구분 없이 일반 UPDATE 와 동일**(`AdminGrowth.php:1324` `WHERE id=?` · **tenant_id 없음·전역**) | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = 부재 6 · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 3 · `VALIDATED_LEGACY` 1(`HUMAN_COMPLETION`).

★ **`ADMINISTRATIVE`(#14)가 부재인 것이 가장 위험하다** — 관리자 강제 전이가 **일반 전이와 구분되지 않는 채로 이미 실행되고 있다**(`admin_growth_approval`: tenant_id 없음 · 전역 조회 · 결정 경로도 격리 없음 :1324). 즉 **"이 승인은 관리자가 규칙을 우회해 밀어넣은 것인가"를 사후에 물을 수 없다.** §34 신설 시 이 종류를 반드시 명시적으로 기록해야 한다.

## 2. 규칙

- 🔴 **`HUMAN_COMPLETION`(#2) = 신설 금지 · `Mapping.php:245-290` 5단 규율을 공용 트레이트/서비스로 추출.**
  순서: **위조불가 신원 fail-closed → 자기승인 차단 → 승인자 dedup → 비-pending 409 → 정족수.**
  🔴 **재작성 시 289차 G-01이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동이다.**
  🟠 추출 시 **`actor_type` 결번을 함께 닫아라** — 현행은 `apikey:`/`user:` 가 정족수에 **동등 계수**되어 **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배).
- 🔴 **`DECISION`(#3) 을 `condition`(:600)/`split`(:614-621)로 커버 계산 금지.** 형태 유사·**마케팅 발송 도메인**이다. 특히 `split` 은 `pickWeighted`(:618) **확률 택일**(A/B 테스트)이지 승인 결정이 아니다 — 승인을 확률로 분기시키면 **감사 불가**.
- 🔴 **`EVENT`(#4)/`SIGNAL`(#6) 를 "있다고 가정"하고 배선 금지.** 범용 이벤트 버스·in-process dispatcher·구독 기전 **전부 grep 0**(내부는 직접 static 호출). `OpenPlatform::emit`(:311-328)에 승인 신호를 태우면 ① 구독 0 → **no-op** ② **예외 절대 미전파**(:325) → **신호가 조용히 사라진다**. 승인 전이가 유실되는 것은 데이터 손상이다.
- 🔴 **`ADMINISTRATIVE`(#14) 를 일반 전이와 같은 경로로 흘리지 마라.** 현행 `admin_growth_approval` 이 정확히 그래서 **tenant_id 없이 전역 결정**(:1324)이 가능하다. 관리자 전이는 **별 종류 + `actor_type` + 사유 필수 + 별도 알림**이어야 한다. **이 결함을 승계하지 마라.**
- 🔴 **`TIMER`(#5) 신설 시 타이머 서비스·지연큐 도입 금지** — 현행 **스케줄링 = OS cron 단일 수단**(journey_cron.php:29-35 `*/5` · `install_crontab.sh` 정본 등재)이고 타이머 서비스는 부재다. `resume_at`/`wait_until` **DB 컬럼 + cron 폴링** 패턴(:80-83)을 따르라 — 브로커 도입은 SQLite 폴백 제약과 충돌한다.
  ⚠️ `SmsMarketing.php:367` `runScheduledQueue` 는 **ISO8601 문자열 사전식 비교**다 — 시각 컬럼을 문자열로 두는 관행이 레포 전역(`VARCHAR(32)` :80-83)이므로 **형식 일관성 유지**(사전식=시간순이 깨지면 타이머가 조용히 어긋난다).
- 🔴 **`ERROR`(#8) 배선 시 `release`(:417) 패턴 참조 금지** — 예외를 삼키고 `status='waiting'` 원위치 = **실패가 기록되지 않고 무한 재시도**. 승인 전이 실패는 **종류 `ERROR` 로 기록**되어야 `DEAD_LETTERED`(§31) 도달이 가능하다.
- **`MESSAGE`(#7) 는 fail-closed** — `Webhooks.php:22-27` 의 opt-in(`verified=false` 수신 허용)은 벤더 웹훅의 타협이다. 승인 전이를 유발하는 메시지는 **서명 검증 필수**(`OpenPlatform.php:373` Stripe식 서명 + **SSRF 방어** :414-424 재사용).
- 🔴 **`MIGRATION`(#12)/`REPLAY`(#13) 은 정의 버전 축 선행 없이 배선 금지** — `workflow_version_id`(§31 #3)·`engine version`(§32 #6) 둘 다 grep 0 이라 **어느 버전으로 옮기고/되감는지 지정할 수 없다**.
