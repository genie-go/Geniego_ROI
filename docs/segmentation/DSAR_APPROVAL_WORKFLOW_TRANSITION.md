# DSAR — Workflow Transition (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §34 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

### 🔴 상태머신 = 없다 — §34가 정면으로 겨냥하는 결번

| 항목 | 실측 | 판정 |
|---|---|---|
| 상태 변경 문장 | `UPDATE ... SET status=` **155건 / 44파일**(Wms 10 · ChannelSync 10 · EmailMarketing 10 · JourneyBuilder 10 · Catalog 9 · LiveCommerce 9 …) | — |
| **전이 규칙 선언** | **0** — 전부 호출 지점 인라인 | `NOT_APPLICABLE` |
| **전이 기록 테이블** | **0** — 전이가 일어났다는 사실을 남기는 행이 없다 | `NOT_APPLICABLE` |
| 전이 가드 | **4곳뿐**: `FeedTemplate::transition`:248-285 · `Mapping::apply`:309 · `Catalog::approveQueue`:2341 · `AdminGrowth::launch`:1155 | `LEGACY_ADAPTER`(패턴만) |
| 워크플로 정의 테이블 | `TABLE IF NOT EXISTS (workflow_\|flow_\|wf_)` **grep 0** | `NOT_APPLICABLE` |
| 멱등키 | `idempotency_key` **grep 0** | `NOT_APPLICABLE` |
| 불변 해시 | `immutable hash` 상당 **grep 0** | `NOT_APPLICABLE` |

**★"155건의 status UPDATE" ≠ "상태머신".** 레포에 상태 변경은 넘치지만 **어느 상태에서 어느 상태로 갈 수 있는지 선언한 곳이 0**이고, **전이가 일어났다는 기록도 0**이다. 상태는 **덮어쓰기(destructive UPDATE)** 될 뿐 이력이 남지 않는다 → **"누가·언제·왜·어느 규칙으로 이 승인을 approved 로 바꿨는가"를 물을 수 없다.** 이것이 §34 의 존재 이유다.

### 전이 가드 4곳 실측 — 왜 "가드"이지 "규칙 선언"이 아닌가

| 위치 | 실측 | 한계 |
|---|---|---|
| `FeedTemplate::transition`(:249-262) | `private static function transition(..., string $from, string $to)` → `if ((string)$r['status'] !== $from) return 409 invalid_state`(:258) → `UPDATE feed_template SET status=?`(:259) | 🔴 `from`/`to` 가 **메서드 인자**다 — `submitDraft`→`('draft','submitted')`(:265) · `approveDraft`→`('submitted','approved')`(:271). **규칙이 호출부에 하드코딩** |
| `FeedTemplate::publishDraft`(:285) | `if ((string)$r['status'] !== 'approved') return 409 must_approve_first` | 리터럴 인라인 |
| `Mapping::apply`(:309) | 상태 게이트 | 인라인 |
| `Catalog::approveQueue`(:2341) | 상태 게이트 | 인라인 |
| `AdminGrowth::launch`(:1155) | 상태 게이트 | 인라인 |

→ **4곳 모두 "현재 상태가 기대와 다르면 409"** 라는 **동일 규율의 5회 재작성**이다. §34 는 이 규율을 **선언으로 승격**한다.

### 전이 기록의 최근접 — 그리고 왜 미달인가

`journey_node_logs`(JourneyBuilder.php:48-52): `enrollment_id` · `journey_id` · `node_id` · `node_type` · `action` · `result` · `executed_at`

🔴 **`source_node_id`·`target_node_id`·`edge_id` 가 없다.** 노드에서 **무슨 일이 있었나**는 남지만 **어디서 어디로 갔나**는 남지 않는다. 실제 전이 결정은 `nextNode($edges, $nodeId, $branch)`(:786-798)가 **메모리에서 계산하고 버린다** — 반환값(다음 노드 id)은 루프 변수 `$nodeId` 에 대입될 뿐(:620) 어디에도 기록되지 않는다. `split` 의 선택 분기만 `result` JSON 에 `['branch'=>$pick]`(:619)로 **매장**된다(조회·제약 불가).

**★축 주의 — `journey_node_logs` 를 Transition 으로 계산하면 역산.** 노드 로그(what happened at a node)와 전이 기록(which edge was traversed, by whom, under which rule)은 다른 것이다.

## 1. 원문 전사 + 판정 — **원문 19종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_transition_id | **grep 0** — 전이 기록 자체 부재 | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = `journey_node_logs.enrollment_id`(:50) | `LEGACY_ADAPTER` |
| 3 | workflow_token_id | **Token 개념 grep 0**(§33) | `NOT_APPLICABLE` |
| 4 | source_node_id | **부재** — `journey_node_logs` 에 source 축 없음 | `NOT_APPLICABLE` |
| 5 | target_node_id | **부재** — `nextNode`(:786) 반환값이 **기록되지 않고 버려짐** | `NOT_APPLICABLE` |
| 6 | edge_id | **부재** — `journeys.edges` JSON(:67)에 엣지가 있으나 **id 축이 없다**(`from`/`when` 로 매칭 :789,:796) | `NOT_APPLICABLE` |
| 7 | transition type | **부재**(14종 — [DSAR_APPROVAL_WORKFLOW_TRANSITION_TYPE.md](DSAR_APPROVAL_WORKFLOW_TRANSITION_TYPE.md)) | `NOT_APPLICABLE` |
| 8 | triggered by | **부재** — 여정 전이는 cron 이 유일 주체(journey_cron.php:29-35)라 기록 동기 자체가 없었음 | `NOT_APPLICABLE` |
| 9 | trigger event reference | 부재 · 인접 = `wait` mode=event 의 `eventOccurred`(:557) — **발생 여부 boolean 만**(어느 이벤트 행인지 미기록) | `KEEP_SEPARATE_WITH_REASON` |
| 10 | condition references | **부재** — `evalCondition`(condition :600 · exit :623)이 **조건 정의를 참조하지 않고 노드 config 인라인 평가** | `NOT_APPLICABLE` |
| 11 | condition results | 부재(행 축) · 인접 = `journey_node_logs.result` JSON **매장**(:619) | `KEEP_SEPARATE_WITH_REASON` |
| 12 | default path used 여부 | **부재** · 인접 = `nextNode`(:790) `if (!$cand) return '';` — **후보 없으면 빈 문자열=종료**. 기본 경로 개념 자체가 없음 | `NOT_APPLICABLE` |
| 13 | actor reference | **부재**(여정) · ★인접 = `Mapping::actorId`(289차 신설) — **위조불가 신원**(`apikey:{id}`/`user:{email}` · 미확인 null→403 **fail-closed**) | `VALIDATED_LEGACY`(공용 추출) |
| 14 | execution reference | **부재**(§32 Execution 결번) | `NOT_APPLICABLE` |
| 15 | transitioned_at | 부재 · 인접 = `journey_node_logs.executed_at`(:51) — **노드 실행 시각** | `LEGACY_ADAPTER` |
| 16 | idempotency key | **`idempotency_key` grep 0** · 인접 3패턴 = `claimSendOnce(enrollment_id,node_id)`(:672) · Paddle `notification_id` UNIQUE(:343) · `raw_vendor_event.uq_rve_dedup` UNIQUE(Db.php:1017-1034) | `LEGACY_ADAPTER`(패턴 채택) |
| 17 | immutable hash | **grep 0** — 전이 이력이 없으므로 위변조 방지 대상도 없음 | `NOT_APPLICABLE` |
| 18 | status | 부재(전이 단위) · 155건의 `status` 는 **대상 행의 상태**이지 전이의 상태 아님 | `NOT_APPLICABLE` |
| 19 | evidence | 부재 · 인접 = `journey_node_logs`(:48-52) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사.** 커버리지 = 부재 12 · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 2 · `VALIDATED_LEGACY` 1(`actor reference`).

★ **유일한 `VALIDATED_LEGACY` 가 `actor reference` 인 것이 이 축의 요약이다** — 레포는 **"누가"** 는 289차에 제대로 풀었고(`Mapping::actorId`), **"무엇에서 무엇으로·어느 규칙으로"** 는 전부 비어 있다.

## 2. 규칙

- 🔴 **전이 가드 4곳을 5번째로 재작성하지 마라.** `FeedTemplate::transition`(:249-262)의 규율 — **기대 상태 불일치 시 409 `invalid_state`**(:258) — 은 옳다. §34 는 이를 **선언 테이블로 승격**하는 것이지 6번째 인라인 가드를 만드는 것이 아니다. 4곳은 **존치**(무후퇴)하되 신규 승인 전이는 선언을 경유한다.
- 🔴 **`journey_node_logs`(:48-52) 를 Transition 테이블로 재사용 금지** — `source_node_id`/`target_node_id`/`edge_id` 3축이 **구조적으로 없다**. 컬럼을 ALTER 로 덧대면 **마케팅 노드 로그와 승인 전이 이력이 한 테이블에 섞인다**(도메인 혼입). 별 테이블 신설.
- 🔴 **`edge_id`(#6) 는 선결 과제다.** `journeys.edges` JSON 은 **엣지에 id 가 없고** `from`+`when` 매칭(:789,:796)으로 식별된다 → §33 의 **"동일 Token이 같은 Edge를 중복 통과하지 않도록"** 제약을 **걸 대상이 없다**. `UNIQUE(workflow_token_id, edge_id)` 를 세우려면 **엣지에 안정적 id 부여가 먼저**다. 이것을 건너뛰고 `from`+`to` 조합키로 대용하면 **동일 노드쌍 다중 엣지**(라벨 다른 병렬 엣지 :796)에서 붕괴한다.
- 🔴 **`actor reference`(#13) 는 `Mapping::actorId`(289차) 공용 추출 — 재작성 금지.** 위조불가 신원(`apikey:{id}`/`user:{email}`) · 미확인 null→**403 fail-closed**. **재작성 시 289차 G-01이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동이다.**
  🟠 단 **현행 `actorId` 에 `actor_type` 이 없다** → `apikey:`/`user:` 가 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). 전이에 actor 를 기록할 때 **`actor_type` 을 별 컬럼으로 분리**하라 — 문자열 접두어 파싱에 의존하지 마라.
- 🔴 **`idempotency key`(#16) = 5-3-2가 채울 결번.** 현행 3패턴 중 **`claimSendOnce` 자연키 선점 마커**(:672)가 승인 전이에 가장 정합하다(전이는 "이 토큰이 이 엣지를 통과했다"는 **자연키**를 갖는다). Paddle 패턴(`notification_id` UNIQUE :343)은 **외부 발급 id 가 있을 때만** 성립하므로 내부 전이에는 부적합.
  ★ Paddle 멱등의 **정확한 규율 승계**: `processed=1` 일 때만 skip · **`processed=0` 은 재처리 허용**(272차) — 즉 **수신 기록 ≠ 처리 완료**. 전이 멱등도 **기록과 완료를 구분**해야 크래시 시 전이가 유실되지 않는다.
- 🔴 **`immutable hash`(#17) 도입 시 155건의 destructive `UPDATE ... SET status=` 관행을 승계하지 마라** — 전이 이력은 **append-only** 여야 한다. 전이 행을 UPDATE 하면 해시가 무의미하다.
- `condition references`(#10)/`condition results`(#11) 를 `result` JSON(:619)에 매장 금지 — 조회·감사 불가. **행 축의 컬럼**이어야 "어느 조건이 이 승인을 통과시켰나"를 물을 수 있다.
