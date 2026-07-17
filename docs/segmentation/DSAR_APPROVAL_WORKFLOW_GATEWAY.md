# DSAR — Workflow Gateway (§18)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §18 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

> **본 문서는 §18의 `Gateway Type` + 필수 필드를 다룬다.** `Evaluation Mode` 7종은 [DSAR_APPROVAL_WORKFLOW_GATEWAY_EVALUATION_MODE.md](DSAR_APPROVAL_WORKFLOW_GATEWAY_EVALUATION_MODE.md) 참조.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_GATEWAY` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| `gateway` 문자열 전수 | **워크플로 게이트웨이 히트 0.** 실측 전건이 무관 — Coupang API 호스트 `api-gateway.coupang.com`(Connectors.php:1251,:1292 · ChannelSync.php:635,:2988,:5273 · PriceOpt.php:1173 · ChannelCreds.php:766 · DigitalShelf.php:244) · Braintree 안내문(GeniegoKnowledge.php:344) | **문자열 동음이의** — 축 무관 |
| 현행 분기의 실체 | **게이트웨이 노드가 아니라 노드 타입 인라인 분기.** `condition`(:599-605) `evalCondition` → `'true'`/`'false'` 2분기 · `split`(:609-621) 가중 N분기 · `wait`(:554-566) `occurred`/`timeout` 2분기 — **전부 마케팅 여정** | `KEEP_SEPARATE_WITH_REASON` |
| 분기 판정 위치 | **엣지가 아니라 노드**가 판정하고, 결과 라벨로 엣지를 **조회**(`nextNode` :786-815) | **원문과 역방향** — 아래 ★ |
| `evaluation mode` | **grep 0**(`first_match`/`highest_priority`/`all_matches`/`no_match`) — 모드 축 자체 부재(단일 암묵 동작) | `NOT_APPLICABLE` |
| `default edge` | **부재.** 286차가 위치 폴백을 **의도적으로 제거**(:809 `if ($hasLabeled) return '';`) | `NOT_APPLICABLE` |
| `no match behavior` | **암묵 존재 = fail-closed.** 라벨 그래프에서 미매칭 → `''` 반환 → **여정 종료**(:809). 무라벨 레거시 그래프만 위치 폴백(:811) | `VALIDATED_LEGACY`(**검증된 `BLOCK_ON_NO_MATCH` 의미론** — 아래 ★) |
| `multiple match behavior` | **부재 · 암묵 first-wins.** `nextNode` :795-800 은 후보 엣지를 순회하며 **첫 일치 즉시 return** — 다중 일치는 **탐지도 기록도 안 됨** | `NOT_APPLICABLE` |
| `evaluation timeout` | **부재.** `evalCondition`(:818-846)은 DB 조회 2건(:829 crm_customers · :837 email_sends)을 하며 **타임아웃 없음**(예외는 빈 catch :834,:842 로 삼킴 → 사실 누락 → **보수적 false** :844) | `NOT_APPLICABLE` |
| `evidence capture` | 부재(게이트웨이) · 인접 = `logNode(... 'condition','evaluated',['branch'=>$branch])`(:601) · `split`(:617 `branches`·`auto` 포함) — **분기 결과 감사 REAL** | `LEGACY_ADAPTER`(**검증된 선례**) |
| `PARALLEL`/`FORK`/`JOIN` | **부재.** 현행 `advanceEnrollment` 는 **단일 `$nodeId` 커서 while 루프**(:511) — 동시 다중 경로를 **구조적으로 표현 불가** | `NOT_APPLICABLE` |

### ★축 주의 ① — 원문과 현행은 판정 주체가 반대다

| | 현행(JourneyBuilder) | 원문 §18 |
|---|---|---|
| 판정 주체 | **노드**(`condition`/`split`/`wait` 가 자기 안에서 판정) | **Gateway**(전용 노드가 나가는 엣지들을 평가) |
| 엣지 역할 | 판정 **결과를 담는 라벨**(`nextNode` 는 문자열 일치만) | 판정의 **대상**(condition reference + priority 보유) |
| 모드 | 없음(암묵 first-wins) | **7종 명시**(`evaluation mode`) |
| 다중 일치 | 탐지 불가(첫 일치 return) | `multiple match behavior` 로 **선언** |

**형태 유사 ≠ 의미 동일.** `condition`/`split` 을 `CONDITION`/`EXCLUSIVE` Gateway 로 매핑하면 **(a) 마케팅 발송 도메인이고 (b) 판정 방향이 반대**여서 이중으로 역산이다 → `KEEP_SEPARATE_WITH_REASON`.

### ★축 주의 ② — 필수 필드가 `evidence` 로 끝나지 않는다 (원문 그대로)

§18 필수 필드 목록의 **말미는 `status`(11번)이며 `evidence` 항목이 없다.** 대신 `evidence capture`(9번)가 중간에 있다. 스펙 전 엔티티가 `evidence` 로 끝나는 관례(§15 15축 · §17 20축)와 **다르다.** 🔴 **관례에 맞춰 12번째 `evidence` 를 임의 추가하지 않았다** — 원문 11축 그대로 전사한다(규율 4: 숫자를 조용히 맞추지 마라). 이 편차가 원문의 의도인지 누락인지는 **본 문서가 판단할 사안이 아니다 — 사실만 기록한다.**

## 1. 원문 전사 + 판정 — Gateway Type **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EXCLUSIVE | **grep 0**(§12 #13 과 동일 결론) · 형태 유사 = `condition` 2분기(:599-605) **마케팅 여정** | `KEEP_SEPARATE_WITH_REASON` |
| 2 | INCLUSIVE | **grep 0** · 다중 경로 동시 진행 **구조적 불가**(단일 `$nodeId` 커서 :511) | `NOT_APPLICABLE` |
| 3 | DECISION | 부재 · 인접 = `Decisioning.php`(집계 코호트 · **PII 없음** 설계) — **승인 결정 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 4 | CONDITION | 부재(승인) · 형태 유사 = `evalCondition`(:818-846) 사실 5종 하드코딩 | `KEEP_SEPARATE_WITH_REASON` |
| 5 | EVENT | 부재 · 유사 = `wait` event 모드(:554-566 `eventOccurred` 폴링). 🔴 **범용 이벤트 버스 grep 0** | `LEGACY_ADAPTER`(**폴링 프리미티브만**) |
| 6 | PARALLEL_REFERENCE | 부재 — 병렬 개념 전무 | `NOT_APPLICABLE` |
| 7 | COMPLEX_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 8 | MERGE | 부재 · 🔴 현행 그래프는 **합류를 표현할 수 있으나 검증하지 않는다**(`nextNode` 는 들어오는 엣지를 안 봄) | `NOT_APPLICABLE` |
| 9 | FORK_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 10 | JOIN_REFERENCE | 부재 · 🔴 **동시성 자산은 REAL 이나 축이 다름** — `Omnichannel::claimBatch`(:394-423 stale lease 900s → `FOR UPDATE SKIP LOCKED`)는 **작업 선점**이지 **경로 합류**가 아님 | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 신설 6 · 도메인분리 3 · 어댑터 1.

## 2. 원문 전사 + 판정 — 필수 필드 **원문 11축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_gateway_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_node_id | 부재(§12) | `NOT_APPLICABLE` |
| 3 | gateway type | 부재(위 10종 전부) | `NOT_APPLICABLE` |
| 4 | evaluation mode | **grep 0** — 모드 축 부재(암묵 first-wins) | `NOT_APPLICABLE` |
| 5 | outgoing edge policy | 부재 · 현행은 정책 없이 `foreach ($edges)` 소스 일치 수집(:789) | `NOT_APPLICABLE` |
| 6 | default edge | **부재** — 286차가 위치 폴백 제거(:809) | `NOT_APPLICABLE` |
| 7 | no match behavior | **암묵 fail-closed 존재**(:809 미연결 분기 → 여정 종료) — 선언 축은 없으나 **의미론은 검증됨** | `VALIDATED_LEGACY`(의미론) |
| 8 | multiple match behavior | 부재 · 암묵 first-wins(:799 첫 일치 return) — **다중 일치 무탐지·무기록** | `NOT_APPLICABLE` |
| 9 | evaluation timeout | 부재 · `evalCondition` DB 조회(:829,:837) 타임아웃 없음 · 예외는 빈 catch(:834,:842) → **보수적 false**(:844) | `NOT_APPLICABLE` |
| 10 | evidence capture | 부재(게이트웨이) · **선례 REAL** = `logNode(...'condition','evaluated',['branch'=>$branch])`(:601) · `split`(:617) | `LEGACY_ADAPTER` |
| 11 | status | 부재(게이트웨이 레벨) | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** ★**원문 목록 말미는 `status` 이며 `evidence` 항목이 없다 — 임의 추가하지 않았다**(위 ★축 주의 ② 참조). 커버리지 = 신설 9 · 어댑터 1 · 재사용 1.

## 3. 규칙

- 🔴 **`condition`/`split` 노드를 Gateway 로 매핑 금지.** 도메인 상이(마케팅 발송) + **판정 방향 반대**(노드가 판정 → 엣지는 라벨 수납). 매핑하면 §15 Edge 의 `condition reference`/`condition priority` 가 정의상 무의미해진다.
- ★**`no match behavior`(#7)는 신설이 아니라 승격이다.** 286차가 `nextNode` :801-809 에서 위치 폴백을 제거한 이유가 주석에 실측된다 — "종전엔 위치 폴백이 false/b 를 유일한 연결 엣지(idx 0)로 보내 **조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송**했다". **승인 도메인 등가 = 반려를 승인 경로로 라우팅.** 이 fail-closed 의미론을 §18 `BLOCK_ON_NO_MATCH` 의 기본값으로 채택하라. 🔴 재작성 시 286차가 닫은 오라우팅 경로를 다시 연다 — **신규 작성이 아니라 위치 이동.**
- 🔴 **`default edge`(#6) 도입은 286차 결정의 역행이다 — 승인 도메인에서는 특히.** 도입한다면 **명시 선언 시에만**(`DEFAULT_ON_NO_MATCH` 를 켠 게이트웨이) 유효하고, **미선언 시 절대 암묵 폴백 금지**. 무라벨 레거시 위치 폴백(:811)은 **승인 도메인에 이식 금지**.
- **`multiple match behavior`(#8)는 현행 최대 무음 구멍이다.** `nextNode` :795-800 은 첫 일치에서 return 하므로 **엣지 2개가 같은 라벨을 가져도 아무도 모른다**. 승인 도메인에서 = **동일 조건에 승인·반려 엣지가 동시 매칭돼도 선언 순서대로 조용히 승인**. §18 은 이를 **선언 강제**하고 §16 #20(Edge Code 중복 없음)이 **정적으로 차단**한다 — **둘 다 필요**.
- **`evaluation timeout`(#9) 설계 시 현행 빈 catch 패턴 답습 금지.** `evalCondition` :834,:842 의 `catch (\Throwable $e) {}` 는 **DB 실패를 사실 부재로 강등**시키고 :844 가 **보수적 false** 로 흘린다. 마케팅에서는 안전(발송 안 함)이나 **승인에서는 방향이 반대**다 — "조건 평가 실패"를 `false`(=반려 아님·다음 경로)로 흘리면 **평가 불능이 곧 통과**가 될 수 있다. 🔴 §19 `failure behavior`/`timeout behavior` 로 **명시 선언**하고 **Unknown ≠ Pass(fail-closed)** 를 기본값으로 하라(Part 3-2 Eligibility Engine 의 `Unknown≠Eligible` 규율과 동일).
- **`evidence capture`(#10)는 `logNode` 를 확장하라** — `journey_node_logs`(:50,:69) + `['branch'=>$branch]`(:601)는 **분기 근거 감사의 검증된 선례**다. 🔴 게이트웨이 전용 감사 테이블 신설 금지(AL-19).
- **`PARALLEL`/`FORK`/`JOIN`(#6,#9,#10)은 실행 모델 자체를 요구한다.** 현행 `advanceEnrollment` 는 **단일 커서 while**(:511) — 병렬은 **노드 타입 추가로 얻어지지 않는다**. 🔴 동시 경로 도입 시 `optimistic lock(version)`·분산락·`GET_LOCK` **전부 grep 0**이며 **SQLite 폴백 호환이 명시적 설계 제약**이다 → **다른 동시성 모델 도입 = 제약 위반**. 반드시 **조건부 UPDATE + rowCount CAS**(확립 4곳: Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:427-447) 채택.
- 🔴 Gateway Type `NOT_APPLICABLE` 6종 · 필수 필드 `NOT_APPLICABLE` 9축 **"있다고 가정"하고 배선 금지**.
