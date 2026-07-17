# DSAR — Notification Task (§29)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §29 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★통지 SSOT | `notification_channel`(Alerting.php:**911** `ensureNotifyTable`) — 컬럼 = `tenant_id`(**PRIMARY KEY**)·`slack_webhook`·`generic_webhook`·`webhook_secret`·`email_to`·`min_severity`·`enabled` | `VALIDATED_LEGACY`(**신설 금지**) |
| ★공개 진입점 | **`Alerting::pushEvent`(Alerting.php:917, `public static`)** — 심각도 랭크 게이트(:924-925) → Slack(:929)·범용웹훅(:931)·Email(:933) · **실배선 4곳**(EmailMarketing:1046 · Referral:271 · AutoCampaign:883,:1217) | `VALIDATED_LEGACY`(**배선만**) |
| ★폴백 체인 | `dispatchNotifications`(Alerting.php:**445**, **`private static`**) — 정책 자체 채널 미발송 시 `notification_channel` SSOT 로 폴백(**:471-497**, 282차 "알림 통지 죽음" 수정분) | `VALIDATED_LEGACY` |
| 발송 원시함수 | `sendSlack`(:736) · `sendEmail`(:810) · `sendWebhook`(:937) — 전부 `private static` | `VALIDATED_LEGACY`(가시성 승격 필요) |
| 승인 이벤트 ↔ 통지 배선 | **0** — 4곳 실배선 중 승인 도메인 **없음** | `NOT_APPLICABLE`(**배선 = 5-3-2 작업**) |
| 실패 격리 | `pushEvent` **예외 절대 미전파**(:934 `catch → error_log`) · 반환형 `void` | `VALIDATED_LEGACY`(§29 마지막 줄 이미 충족) |

**★축 주의 ① — 규율 파일의 `Alerting::dispatch` 는 실재하지 않는 이름이다(전사자 실측 정정).** `function dispatch(` **grep 0**. 실제로는 두 개의 다른 메서드다:
- **`Alerting::pushEvent`(:917) = `public static`** → **외부에서 호출 가능한 유일한 통지 진입점**. 승인 노드가 재사용할 대상은 **이것**이다.
- `Alerting::dispatchNotifications`(:445) = **`private static`** → 임계치 정책 전용. **외부 호출 불가** — 승인 노드가 직접 부를 수 없다. 폴백 체인(:471-497)은 이 안에 있다.
🔴 **"`Alerting::dispatch` 재사용"을 그대로 설계에 옮기면 존재하지 않는 메서드에 배선하게 된다.** 이름이 아니라 **능력(가시성 포함)**으로 대조한 결과다.

**★축 주의 ② — ⚠️282차 트랩(재발 방지).** 정책 폼(`Approvals.jsx`)은 `slack:{enabled}` 만 보내고 **webhook_url 은 다른 테이블**(`notification_channel`)에 저장한다. 종전 dispatch 는 **정책 컬럼(빈 `slack_webhook_url`)만 봐서 임계 초과 시 Slack/이메일이 영원히 무발송**이었다(인앱만 생성). 🔴 **승인 통지를 "정책에 채널이 켜져 있다"는 신호만 보고 발송했다고 간주하지 마라 — URL 은 SSOT 테이블에 있다.**

## 1. 원문 전사 + 판정 — Notification Task 지원 Channel **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | IN_APP | `alert_instance`(Db.php:574) 존재 — **임계치 알림 도메인** · `notification_channel` SSOT 에는 **인앱 컬럼 없음** | `LEGACY_ADAPTER` |
| 2 | EMAIL | `notification_channel.email_to`(:911) + `sendEmail`(:810) + `\Genie\Mailer::send`(:933 · 259차 부재클래스 정정분) | `VALIDATED_LEGACY` |
| 3 | SMS_REFERENCE | SMS 인프라 REAL(SmsMarketing · NaverSms SENS 203차) · 🔴 **`notification_channel` SSOT 에 SMS 컬럼 없음** = 통지 채널로 미배선 | `LEGACY_ADAPTER` |
| 4 | PUSH | WebPush REAL(routes.php:616-625 · RFC8291 283차) · 🔴 **SSOT 에 push 컬럼 없음** | `LEGACY_ADAPTER` |
| 5 | SLACK_REFERENCE | `notification_channel.slack_webhook` + `sendSlack`(:736) · 암호화 저장(`nDec` :914) | `VALIDATED_LEGACY` |
| 6 | TEAMS_REFERENCE | 전용 컬럼 부재 · **`generic_webhook` 이 흡수**(:907 주석 "범용웹훅 Teams/Discord/n8n") | `VALIDATED_LEGACY` |
| 7 | WEBHOOK | `notification_channel.generic_webhook` + `sendWebhook`(:937) + 서명(`webhook_secret` :931) | `VALIDATED_LEGACY` |
| 8 | ERP_INBOX | **부재** | `NOT_APPLICABLE` |
| 9 | PROVIDER_NOTIFICATION | **부재** | `NOT_APPLICABLE` |
| 10 | CUSTOM | 부재(확장 축) · `generic_webhook` 이 사실상 대체하나 **정의된 확장점 아님** | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 현행충족 4 · 어댑터 3 · 부재 3.

## 2. 원문 전사 + 판정 — Notification Task 필수 항목 **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | recipient resolution hook | 🔴 **부재** — `notification_channel` 은 `tenant_id` **PRIMARY KEY** = **테넌트당 1행**. "이 승인의 승인자에게" 보낼 수단이 없다(테넌트 공용 채널로만 발송) | `NOT_APPLICABLE` |
| 2 | template version | 부재 — 문구는 코드 인라인(`pushEvent` :927-928 문자열 조립 · `buildEmailHtml`/`buildSlackBlocks`) | `NOT_APPLICABLE` |
| 3 | tenant branding reference | 부재 — `[Geniego-ROI]` **하드코딩**(:927,:933) | `NOT_APPLICABLE` |
| 4 | locale | 🔴 **부재** — 통지 문구 **한국어 하드코딩**(:906-907 주석 · 이모지+한글 조립 :927). 백엔드 i18n 계층(`I18n.php`·`X-Lang` 270차)은 **통지 경로에 미배선** | `NOT_APPLICABLE` |
| 5 | timezone | 부재 — `gmdate('c')` **UTC 고정**(:931) | `NOT_APPLICABLE` |
| 6 | sensitive data policy | 부재 · 인접 = 채널 자격증명 암호화(`nDec` :914)이나 **본문 마스킹 정책 아님** | `NOT_APPLICABLE` |
| 7 | retry policy | 🔴 **부재** — `pushEvent` 는 **1회 시도 후 실패 무시**(:934). 통지는 DLQ/재시도 큐를 타지 않음 | `NOT_APPLICABLE` |
| 8 | delivery result | 🔴 **부재** — `pushEvent` 반환형 **`void`**(:917) · 예외 swallow(:934) → **발송 성공/실패를 호출자가 알 수 없다** ※`dispatchNotifications`(:445)는 `bool` 반환하나 `private` | `NOT_APPLICABLE` |
| 9 | notification correlation | 부재 — 승인 건 ↔ 통지 상관키 없음(§27 Correlation ID 결번과 동근) | `NOT_APPLICABLE` |
| 10 | evidence | 부재 — 통지 발송 증거 미보존(`error_log` 만 :934) | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재 10 · **현행 충족 0**.
※ 원문 §29 필수 목록은 **`evidence` 로 끝난다** — 10번으로 전사했다(누락 아님).

**★"완비 → 신설 금지·배선만" 은 Channel 축에 한정된다(전사자 정정).** Channel 10종은 4충족/3어댑터로 실하지만, **필수 10종은 현행 충족 0**이다. 🔴 **"Alerting 이 완비되어 있으니 배선만 하면 된다"로 §29 전체를 닫으면 필수 10종이 통째로 증발한다** — 이는 분모를 Channel 축으로 갈아끼우는 역산이다.

## 3. 규칙

- 🔴 **통지 인프라 신설 금지 — `Alerting::pushEvent`(:917) + `notification_channel` SSOT(:911) 재사용.** 단 **`Alerting::dispatch` 는 존재하지 않는다** — 배선 대상은 `pushEvent`(public)이며, `dispatchNotifications`(:445)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** 이라 **가시성 승격이 선결**이다.
- 🔴 **원문 마지막 줄 = "Notification 실패를 Approval Decision 실패로 자동 해석하지 않는다."** 현행 `pushEvent` 는 **예외 미전파·void 반환**(:934)이라 이 규율을 **구조적으로 이미 충족**한다 — 🔴 **재사용 시 이 성질을 깨지 마라.** 통지 결과를 승인 트랜잭션에 결합하면 **Slack 장애가 승인 실패로 번진다.**
- ⚠️ **그러나 항목 8(delivery result)과 위 규율은 충돌하지 않는다** — 요구는 "결과를 **기록**하라"이지 "결과로 승인을 **실패시켜라**"가 아니다. 🔴 **swallow 를 유지한 채 결과를 별도 기록**하는 형태로 구현하라(반환값 전파 ≠ 승인 실패 연동).
- 🔴 **재시도(7번)를 통지에 도입할 때 백오프 4공식을 만들지 마라** — `AdAdapters:1221`(`600*2^n`, 86400s 캡) 채택. DLQ 는 `ad_delivery_dlq`(:1127) 확장.
- **recipient resolution hook(1번)이 §29 최대 결번이다** — `notification_channel.tenant_id` **PK 구조상 수신자 지정이 불가능**하다. 승인자 개인 통지는 **SSOT 확장(비파괴)** 없이는 성립하지 않는다. 🔴 **기존 테넌트 채널 행을 재해석·재용도화하지 마라**(무후퇴).
- **locale(4번)은 15개국 현지화 원칙과 직결** — 통지 문구 한국어 하드코딩(:927)은 승인 통지에 그대로 승계하면 안 된다. 백엔드 `I18n.php`(270차)를 **배선**하라(신설 금지).
- ⚠️282차 트랩 재발 방지: **정책의 `enabled` 플래그가 아니라 SSOT 테이블의 URL 존재로 발송 가능 여부를 판정하라.**
- 🔴 **Channel 축 4충족을 §29 충족으로 확대 해석 금지** — 필수 10종 전부 신설 대상이다.
