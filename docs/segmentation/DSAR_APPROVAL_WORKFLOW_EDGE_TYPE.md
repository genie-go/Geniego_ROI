# DSAR — Workflow Edge Type (§15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §15 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> **본 문서는 §15의 `Edge Type` 축만 다룬다.** 엔티티 본체·필수 필드 15축은 [DSAR_APPROVAL_WORKFLOW_EDGE.md](DSAR_APPROVAL_WORKFLOW_EDGE.md) 정본을 참조하라(중복 금지).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `edge_type` 컬럼·상수 | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 현행 엣지의 "타입" 표현 | **타입 없음 — 라벨만.** `nextNode`(JourneyBuilder.php:786-815)가 엣지에서 읽는 것은 `when`/`branch`/`condition`/`label` **4개 키의 자유 문자열**(:796)뿐 | `KEEP_SEPARATE_WITH_REASON`(마케팅 여정 · 타입 축 자체가 부재) |
| 분기 라벨 어휘 | `true`/`yes`/`y`/`1` · `false`/`no`/`n`/`0` · split 임의 키(`a`/`b`/…) · wait 의 `occurred`(:559)/`timeout`(:565) | **분기 라벨이지 Edge Type 아님** — 축 다름 |
| 승인 결과 엣지(APPROVED/REJECTED) | 부재 — 승인 결정은 엣지가 아니라 `UPDATE ... SET status=?`(Alerting.php:572-599 decideAction) | `NOT_APPLICABLE` |
| `DEFAULT` path | **부재.** 286차가 라벨 그래프의 위치 폴백을 **제거**(:809 `if ($hasLabeled) return '';`) — 미연결 분기는 **여정 종료(fail-closed)** | `NOT_APPLICABLE`(단 §18 `BLOCK_ON_NO_MATCH` 의 검증된 의미론) |
| `TIMEOUT` 엣지 | 유사 — `wait` event 모드 타임아웃이 `'timeout'` **라벨 엣지**로 분기(JourneyBuilder.php:562-565) | `LEGACY_ADAPTER`(**실행 프리미티브만** 재사용) |
| `LOOP` 엣지 | 부재 · 순환은 **타입이 아니라 런타임 차단 대상**(:512-517 재방문 시 `cycle_detected` 로그 후 break) | `NOT_APPLICABLE` |

**★축 주의 — "라벨"과 "타입"은 다른 축이다.** JourneyBuilder 엣지의 `when`/`branch` 는 **작성자가 적은 임의 문자열**이며 시스템은 그 의미를 모른다(`nextNode` :793-799 은 문자열 일치만 수행). 원문 Edge Type 은 **엔진이 의미를 아는 폐집합(closed set)** 이다. 라벨 어휘 `true`/`false`/`timeout` 을 원문 16종에 매핑하면 **역산**이다.

**★286차 fail-closed 는 인용 가능한 검증 자산이다.** `nextNode` :801-809 주석 실측 — "종전엔 위치 폴백이 false/b 를 유일한 연결 엣지(idx 0)로 보내 **조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송**했다". 이것은 **`DEFAULT` 엣지를 잘못 구현하면 승인 도메인에서 무슨 일이 벌어지는지에 대한 실제 사고 기록**이다(승인 도메인 등가물 = 반려를 승인 경로로 라우팅).

## 1. 원문 전사 + 판정 — Edge Type **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | NORMAL | 부재(타입 축 없음) · 유사 = 무라벨 엣지 `nextNode` :814 `$cand[0]['to']` | `KEEP_SEPARATE_WITH_REASON`(마케팅 여정) |
| 2 | CONDITIONAL | 부재 · 유사 = 라벨 매칭 엣지(:795-800) — **엔진이 조건을 모름**(라벨 일치만) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | DEFAULT | **부재.** 286차가 위치 폴백을 의도적으로 제거(:809) → 현행에 기본 경로 개념 없음 | `NOT_APPLICABLE` |
| 4 | APPROVED | 부재(엣지) · 승인 결과는 **레코드 상태**(`Mapping.php:238-294` · `Alerting.php:572-599`) | `NOT_APPLICABLE`(축 다름) |
| 5 | REJECTED | 부재(엣지) · 상태 `rejected` 존재. 🔴 단 `Alerting::executeAction`(:612)이 status 미판독 → **rejected 도 실집행**(승인 우회 · 현재 VACUOUS) | `NOT_APPLICABLE` |
| 6 | CONDITIONAL_APPROVED | 부재 — 조건부 승인 개념 전무(§14 `CONDITIONALLY_APPROVED` 와 짝) | `NOT_APPLICABLE` |
| 7 | CHANGES_REQUIRED | 부재 | `NOT_APPLICABLE` |
| 8 | RETURNED | 부재 — 반려 후 재제출(되돌림) 경로 전무 | `NOT_APPLICABLE` |
| 9 | TIMEOUT | 부재(승인) · **실행 프리미티브 존재** = `wait` event 모드 `wait_until` 도래 시 `'timeout'` 분기(JourneyBuilder.php:562-565) | `LEGACY_ADAPTER`(프리미티브만 · 도메인 상이) |
| 10 | ERROR | 부재 · Error Boundary 자체 부재(§12 #24) | `NOT_APPLICABLE` |
| 11 | CANCEL | 부재 | `NOT_APPLICABLE` |
| 12 | SIGNAL | 부재 — **범용 이벤트 버스·in-process dispatcher grep 0**(내부는 전부 직접 static 호출) | `NOT_APPLICABLE` |
| 13 | MESSAGE | 부재 · 인접 = `OpenPlatform::emit`(:311-328) **웹훅 발신 전용**(구독 0이면 no-op · 예외 미전파 :325) | `NOT_APPLICABLE` |
| 14 | COMPENSATION_REFERENCE | 부재 · 인접 역분개 선례 = OrderHub 수동취소 역분개(268차) | `NOT_APPLICABLE` |
| 15 | LOOP | 부재 · 🔴 현행은 순환을 **타입으로 선언하는 게 아니라 런타임에 차단**(:512-517) | `NOT_APPLICABLE` |
| 16 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 16 / 16 전사.** 커버리지 = `NOT_APPLICABLE` 13(#3,4,5,6,7,8,10,11,12,13,14,15,16) · `KEEP_SEPARATE_WITH_REASON` 2(#1,#2) · `LEGACY_ADAPTER` 1(#9). **합계 13+2+1 = 16 ✅**(항목번호까지 대조 완료).

## 2. 규칙

- **Edge Type 은 폐집합(closed set)이어야 한다.** 현행 `nextNode` 의 자유 문자열 라벨(:796 `when`/`branch`/`condition`/`label` 4키 허용)은 **오타가 곧 미연결**이 되는 구조다. 승인 도메인에서 오타 = **결정 유실**. 🔴 자유 문자열 라벨 방식 답습 금지 — 타입은 열거값으로 선언·검증(§16 "Edge Source·Target 유효").
- 🔴 **`APPROVED`/`REJECTED` 엣지를 레코드 status 로 대체 금지.** §4.3(Workflow 상태 ≠ Approval 상태)에 따라 **엣지는 그래프 전이**이고 status 는 **Case 상태**다. 동일시하면 §14 End Node 매핑이 붕괴한다.
- **`DEFAULT` 엣지는 §18 `DEFAULT_ON_NO_MATCH` 없이 단독 성립 금지.** Edge 의 `default path 여부`(§15 필드 #9)는 Gateway 평가 모드의 **입력**이지 그 자체로 라우팅 권한이 아니다 — Edge 단독 판정은 중복 판정 엔진을 낳는다.
- ★**286차 위치 폴백 제거(:801-809)를 승인 도메인의 기본 규율로 승격하라.** 라벨 그래프에서 요청 분기가 미연결이면 **엉뚱한 엣지로 보내지 말고 정지**한다. 승인 도메인 등가 = **`REJECTED` 엣지 미정의 시 `APPROVED` 로 흘리지 말고 §18 `BLOCK_ON_NO_MATCH`**. 🔴 "일단 첫 엣지로" 폴백 = 286차 오발송 사고의 승인판 재현.
- **`TIMEOUT` 은 `wait` event-mode 재폴링 패턴(JourneyBuilder.php:565-570)을 재사용하라** — 타이머 서비스·지연큐 신설 금지(현행 타이머 = DB 컬럼 + cron 폴링 단일 수단 · `journey_cron.php:29-35` */5 REAL). 🔴 단 **enrollment 컨텍스트 일반화가 선결**(`customer_id` 필수 :554 — 비-고객 승인 태울 수 없음).
- **`SIGNAL`/`MESSAGE` 는 결번을 자인하라.** 범용 이벤트 버스 grep 0 · `OpenPlatform::emit` 은 **아웃바운드 웹훅 전용이며 예외를 절대 전파하지 않는다**(:325) → **인바운드 catch 엣지의 근거로 삼으면 조용한 유실**이다. 🔴 "emit 이 있으니 SIGNAL 된다" 금지.
- 🔴 `NOT_APPLICABLE` 13종 **"있다고 가정"하고 배선 금지**.
