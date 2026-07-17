# DSAR — Node Configuration (§17)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §17 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_NODE_CONFIGURATION` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 노드 설정의 형태 | `node['config']` — **스키마 없는 자유 JSON**. 소비 지점마다 인라인 해석: `delay` = `{value,unit}`(:535-537) · `wait` = `{mode,event,until,timeout_value,timeout_unit}`(:549-590) · `condition` = `{field,op,value}`(:820-823) · `split` = `{branches:[{key,weight}],weight_a,auto_optimize}`(:610-617) | `KEEP_SEPARATE_WITH_REASON`(마케팅 여정 · **스키마 축 자체가 부재**) |
| 설정 검증 | **0.** `createJourney`(:135)·`updateJourney`(:153)가 `nodes` 를 **`json_encode` 원본 그대로 저장** — config 스키마 검증 전무 | `NOT_APPLICABLE` |
| 설정 버전 | **0.** config 변경은 `nodes` 전체 **덮어쓰기**(:153) — 이력 소실 | `NOT_APPLICABLE` |
| `input`/`output`/`variable mappings` | **grep 0**(`input_mapping`/`output_mapping`/`variable_mapping`). 현행은 **매핑이 아니라 하드코딩된 사실 조회**: `evalCondition`(:826-843)이 `revenue`/`grade`/`ltv`/`email_opened`/`email_clicked` **5개 사실만** 코드로 수집 | `NOT_APPLICABLE` |
| `form`/`UI schema reference` | **grep 0**(`ui_schema`/`form_schema`/`json_schema`) — 폼/스키마 개념 전무. 노드 편집 UI 는 `JourneyBuilderConstants.js` 타입별 하드코딩 | `NOT_APPLICABLE` |
| `notification template reference` | **grep 0**(`notification_template`). 채널별 템플릿 테이블은 REAL — `email_templates`(EmailMarketing.php:48) · `sms_templates`(SmsMarketing.php:74) · `kakao_templates`(KakaoChannel.php:45) · `line_templates`(Line.php:41) · `whatsapp_templates`(WhatsApp.php:72) — **전부 마케팅 발송** | `KEEP_SEPARATE_WITH_REASON` |
| `execution service reference` | 부재(선언) · 실 액추에이터 = `AdAdapters::pause`(Alerting.php:631)/`updateBudget`(:634) — **호출부에 클래스명 하드코딩** | `LEGACY_ADAPTER` |
| `required permission`/`role reference` | 부재(노드 단위) · 인접 = `UserAuth::requirePro`(JourneyBuilder.php:114,143) 플랜 게이트 · RBAC 4역할(index.php `viewer<connector<analyst<admin`) — **엔드포인트 단위**이지 노드 단위 아님 | `LEGACY_ADAPTER`(축 다름) |
| `authorization action` | 부재 — 노드가 "무슨 행위의 권한을 요구하는가"를 선언하는 축 없음 | `NOT_APPLICABLE` |
| `attachment`/`comment policy` | **부재.** 승인 4종 어디에도 첨부·코멘트 없음 | `NOT_APPLICABLE` |
| `evidence requirements` | 부재 · 인접 = `audit_log`(Db.php:540-546 — **tenant_id·해시체인 없음**) · `journey_node_logs`(JourneyBuilder.php:50,:69) | `MIGRATION_REQUIRED` |

**★축 주의 — `node['config']` 는 Node Configuration 이 아니다.** 형태는 "노드별 설정 JSON"으로 닮았으나 **(a) 스키마가 없고 (b) 버전이 없고 (c) 매핑이 아니라 소비 지점 인라인 해석**이다. 원문 §17 은 **선언적 계약**(input/output/variable mappings · form · UI schema)을 요구한다. `config` 를 §17 커버로 계산하면 **역산**이다.

**★중요 — §17 은 노드 "실행 방법"이 아니라 "계약"이다.** 현행이 `config` 로 `{value:3, unit:'days'}` 를 넘기는 것은 **파라미터 전달**이다. §17 의 `input mappings`/`output mappings` 는 **워크플로 변수 ↔ 노드 경계의 데이터 흐름 선언**으로, **`WORKFLOW_VARIABLE`(§19 Condition Source Type #9)이 선행 존재해야 성립**한다. 현행에 워크플로 변수 개념 자체가 없다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 20축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | node_configuration_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_node_id | 부재(§12) · 유사 = `node['id']` 자유 문자열(:519 `findNode`) | `NOT_APPLICABLE` |
| 3 | configuration version | 부재 · 🔴 현행은 `nodes` 전체 덮어쓰기(:153) → **설정 이력 소실** | `NOT_APPLICABLE` |
| 4 | input mappings | **grep 0** · 유사 = `evalCondition` 하드코딩 사실 5종(:826-843) — 매핑 아님 | `NOT_APPLICABLE` |
| 5 | output mappings | **grep 0** · 현행 노드는 **출력을 워크플로에 반환하지 않는다**(`$actions[]` 는 응답 로그 :602,:618) | `NOT_APPLICABLE` |
| 6 | variable mappings | **grep 0** · 워크플로 변수 개념 부재 | `NOT_APPLICABLE` |
| 7 | form reference | **grep 0** — 폼 개념 전무(승인 입력은 `{decision, comment?}` 조차 없음) | `NOT_APPLICABLE` |
| 8 | UI schema reference | **grep 0** · 현행 노드 UI = `JourneyBuilderConstants.js` **프론트 하드코딩**(서버 스키마 미제공) | `NOT_APPLICABLE` |
| 9 | task instruction reference | 부재 — 승인자에게 "무엇을 왜 승인하는가"를 전달하는 축 없음 | `NOT_APPLICABLE` |
| 10 | evidence requirements | 부재 — 증빙 **요구** 선언 없음(제출 강제 불가) | `NOT_APPLICABLE` |
| 11 | attachment policy | 부재 | `NOT_APPLICABLE` |
| 12 | comment policy | 부재 · 🔴 `Mapping::approve`(:238-294)·`Alerting::decideAction`(:572-599) 어디에도 **반려 사유 필수 강제 없음** | `NOT_APPLICABLE` |
| 13 | authorization action | 부재 | `NOT_APPLICABLE` |
| 14 | required permission | 부재(노드) · 인접 = 스코프 `write:*`/`write:ingest`/`admin:keys`(index.php RBAC) — **엔드포인트 단위** | `LEGACY_ADAPTER`(축 다름) |
| 15 | required role reference | 부재(노드) · 인접 = 역할 4종 `viewer<connector<analyst<admin` + `UserAuth::requirePro`(:114,:143) | `LEGACY_ADAPTER`(축 다름) |
| 16 | execution service reference | 부재(선언) · 실 액추에이터 존재 = `AdAdapters::pause`(Alerting.php:631)/`updateBudget`(:634) — **하드코딩 호출**. ★`AdAdapters::executionEnabled`(:34-40) 킬스위치 **9곳 실배선 REAL** | `LEGACY_ADAPTER`(위임 대상) |
| 17 | connector reference | 부재(노드) · 커넥터 자산 REAL = `ChannelCreds`(암호화 자격증명 · Crypto AES-256-GCM fail-closed) | `LEGACY_ADAPTER` |
| 18 | notification template reference | **grep 0**(`notification_template`) · 통지 인프라는 **완비** = `notification_channel` SSOT(Alerting.php:911 slack/webhook/email + `min_severity`) + 폴백 체인(:471-497 · 282차) — 🔴 **템플릿 축만 결번** | `LEGACY_ADAPTER`(배선만) |
| 19 | status | 부재(설정 레벨) | `NOT_APPLICABLE` |
| 20 | evidence | 부분 — `audit_log`(Db.php:540-546 · **tenant_id·해시체인 없음**) · `journey_node_logs`(JourneyBuilder.php:50,:69 노드 단위 감사 REAL) | `MIGRATION_REQUIRED` |

**실측 개수: 20 / 20 전사.** ★**말미 `evidence`(#20) 포함 확인.** 커버리지 = 신설 14 · 어댑터 5 · 이관 1.

## 2. 규칙

- 🔴 **`node['config']` 자유 JSON 방식 답습 금지.** 현행은 config 오타·타입 불일치가 **저장 시 통과 → 실행 시 무음 기본값**으로 흡수된다(예: `wait` 의 `$mode = $cfg['mode'] ?? 'date'` :550 — `evnet` 오타 시 조용히 date 모드). 승인 도메인에서 이 무음 흡수 = **잘못된 승인 경로 실행**. §17 은 스키마(`form reference`·`UI schema reference`)를 **서버 정본**으로 요구한다.
- **`configuration version`(#3)은 §4.2(Version Immutable)와 직결이다.** 현행 `updateJourney` :153 의 `nodes` 통째 덮어쓰기는 **활성 여정의 노드 설정을 실행 중 변조**할 수 있다. 🔴 승인 워크플로에서 동일 구조 = **집행 중 정족수 변경**. 설정은 **Version 에 고정**되어야 한다.
- **`input`/`output`/`variable mappings`(#4-6)는 워크플로 변수 선행이 필수다.** 🔴 변수 없이 매핑 축만 신설 금지 — `evalCondition`(:826-843) 처럼 **사실 목록을 코드에 하드코딩**하면 §19 `WORKFLOW_VARIABLE` 이 정의상 불가능해진다(현행이 정확히 그 상태).
- **`comment policy`(#12) 는 반려 사유 강제의 근거다.** 현행 승인 4종 중 **반려 사유를 요구하는 것은 0** — `Mapping::approve`(:238-294) 조차 없다. 🔴 사유 없는 반려 = §16 #14(요건 없는 승인 태스크)의 반려판.
- **`execution service reference`(#16) 는 반드시 `AdAdapters` 에 위임하라** — 신설 액추에이터 금지(자격증명 게이트·감사로그 내장). ★**`AdAdapters::executionEnabled`(:34-40) 킬스위치 재사용 강제**(호출부 9곳 실배선 REAL).
  🔴 **단 `Alerting::executeAction`(:601-660)을 참조 구현으로 삼지 마라**: `:612` 가 status 를 SELECT 하고도 **판독하지 않아** `pending`·`rejected` 도 실집행된다. `INSERT INTO action_request` grep 0 → **현재 VACUOUS** 이나 생산자 배선 시 즉시 활성.
  ⚠️ **오탐 주의**: `pause()` 킬스위치 면제는 **279차 D-P1 의도된 설계**(킬스위치는 지출을 늘리는 방향만 차단) — 재플래그 금지.
- **`notification template reference`(#18) 는 신설 금지·배선만.** `Alerting::pushEvent` 폴백 체인(:471-497)이 정본이다. 🔴 채널별 마케팅 템플릿(`email_templates`/`sms_templates`/`kakao_templates`/`line_templates`/`whatsapp_templates` 5종)을 승인 통지에 재사용 금지 — **도메인 상이**(발송 동의·수신거부 게이트가 걸린 마케팅 파이프라인이다).
  ⚠️ **282차 트랩**: 정책은 `slack.enabled` 만 보고 URL 은 다른 테이블에 있어 **무발송**이 됐다 — 배선 시 채널 설정과 정책의 **양쪽 실측** 필수.
- **`required permission`/`role reference`(#14-15)는 엔드포인트 RBAC 로 대체 불가.** 현행 게이트는 **"이 API 를 호출할 수 있는가"**이고 §17 은 **"이 노드를 승인할 자격이 있는가"**다 — 축이 다르다.
  🟠 **선결 결함**: `Mapping::actorId`(289차 신설)는 위조불가 신원(`apikey:{id}`/`user:{email}`)만 허용하나 **`actor_type` 축이 없어** apikey 와 user 가 정족수에 **동등 계수**된다 → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). #15 설계 시 **actor_type 선행 도입** 없이는 역할 바인딩이 무의미하다.
- **`evidence`(#20) 이관 시** — `journey_node_logs`(:50,:69)는 **노드 단위 감사의 검증된 선례**이므로 확장 대상이나, `audit_log`(Db.php:540-546)는 **tenant_id·해시체인이 없어** 승인 증빙의 정본이 될 수 없다. 🔴 감사 테이블 신설 전 **두 자산의 EquivalenceProof 선행**(286차 rank 맵 붕괴 재현 방지).
- 🔴 `NOT_APPLICABLE` 14축 **"있다고 가정"하고 배선 금지**.

---

## ★정정 — 통지 인프라 재사용 판정 (289차 9회차 · PM 직접 실측)

> **본 절은 상위 본문의 "통지 = 신설 금지·배선만" 판정을 정정한다.** 초판은 전사자 공통 규율 파일의 **`Alerting::dispatch` 재사용**을 인용했으나, 그 이름은 **실재하지 않는다**.

**① 팬텀 이름의 출처** — `function dispatch(` **grep 0**. `Alerting.php:472-474` **주석**에 *"종전 dispatch 는 …"* 로 남은 **역사적 명칭**(282차 수정으로 소멸)이며, 규율 파일이 이를 실 메서드로 오인해 인용했다. CLAUDE.md 기지 트랩(`ClaudeAI.php` "killswitch 내장" **주석은 실효와 불일치**)과 **동형**이다. → **주석을 API 근거로 삼지 마라.**

**② 실 진입점과 가시성** — `Alerting::pushEvent`(**:917**)만이 `public`이다. 폴백 체인(:471-497)을 품은 `dispatchNotifications`(**:445**)·`sendSlack`(:736)·`sendEmail`(:810)·`sendWebhook`(:937)은 **전부 `private`** → 승인 노드가 직접 부를 수 없다. **가시성 승격이 선결.**

**③ `pushEvent` 는 그대로 재사용 불가** (실측 3제약)
- **반환 `void` + 예외 삼킴**(:934 `catch { error_log }`) → **발송 실패가 무음**. 승인 통지는 감사 대상이므로 **결과 반환·감사 기록이 필수**.
- **`tenant === 'demo'` → no-op**(:919) → **데모 환경에서 승인 통지 검증 불가**(배포 전 E2E 사각).
- **`notification_channel` = `tenant_id` PRIMARY KEY = 테넌트당 1행**(:911-912) · `email_to` **단일 주소** · locale 한국어 하드코딩(:927) → **승인자 개인 통지(recipient resolution) 구조적 불가**.

**④ 정정된 판정** — "배선만"은 **Channel 축에만 참**이다. §29 실측 기준 **필수 10종 현행 충족 0**.
> ∴ 정확한 판정 = **`pushEvent` 배선 + 가시성 승격 + 발송결과 반환/감사 + recipient resolution 신설**.
> 🔴 **"완비 → 배선만"으로 닫으면 분모를 Channel 축으로 갈아끼우는 역산이다.**

**⑤ 보존되는 것**(재구현 금지) — `notification_channel` SSOT(:911) · 폴백 체인(:471-497 · 282차 "알림 통지 죽음" 수정분) · `min_severity` 게이트 · `Genie\Crypto` 자격 복호(`nDec` :915). ⚠️282차 트랩: 정책은 `slack.enabled`만 보고 URL은 다른 테이블 → **무발송**. **실발송 검증 필수.**
