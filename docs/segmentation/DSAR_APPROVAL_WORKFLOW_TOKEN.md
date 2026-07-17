# DSAR — Workflow Token (§33)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §33 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

원문 정의: **"Token은 실행 경로를 추적한다."** · 원문 말미 제약: **"동일 Token이 같은 Edge를 중복 통과하지 않도록 하라."**

## 0. 현행 실측 (file:line)

**Token 개념 = 레포 전체 결번.** 289차 지침의 "grep 0" 주장을 **실측으로 재확인했다**:

| 검증 대상 | 실측 명령 결과 | 판정 |
|---|---|---|
| `workflow_token` / `token_id` / `parent_token` / `fork_ref` / `join_ref` | **backend/src grep 0**(hit 없음) | `NOT_APPLICABLE`(부재 → 신설) |
| `lock_version` / `optimistic` | **grep 0** | `NOT_APPLICABLE` |

★ **이름 grep 0 ≠ 능력 부재.** 규율에 따라 **능력(무엇을 하는가)** 으로 재대조했고, **능력 축에서도 부재가 확인됐다**:

| 능력 | 실측 | 결론 |
|---|---|---|
| 실행 경로 커서 | `journey_enrollments.current_node VARCHAR(80)`(JourneyBuilder.php:44) — **enrollment 당 스칼라 1개** | **커서 1개 = 토큰 1개 고정** |
| 다음 노드 결정 | `nextNode(array $edges, string $fromId, ?string $branch): string`(:786-790) — **단일 문자열 반환**(`if (!$cand) return '';`) | **분기해도 결과는 1개** |
| `split` 노드 | `pickWeighted($branches, $enrollId)`(:618) → `$nodeId = self::nextNode($edges, $nodeId, $pick)`(:620) — **가중 확률로 한 분기 선택**(A/B 테스트) | 🔴 **배타 분기이지 parallel fork 아님** |
| 병렬 실행 | `while ($nodeId !== '' && $guard++ < 100)`(:510) — **단일 커서 순차 루프** | **동시 활성 경로 불가능** |
| Fork/Join | `sub_journey`/`call_activity` **grep 0** · Sub-workflow 부재 | 부재 |

→ **JourneyBuilder 는 enrollment 당 단일 커서이며 병렬 토큰이 없다**(ⓑ 주장 실측 확인 완료). `split` 이 "분기"라는 **이름**을 갖지만 능력은 **택일**이다 — 두 분기를 동시에 살리지 않는다. **§33 전체가 결번이다.**

**★축 주의 — `token` 이라는 단어의 오탐 3종.** 아래는 §33 Token 과 **무관**하다:
- `journeys.webhook_token VARCHAR(64)`(:88) — **인바운드 트리거 인증 토큰**
- `omni_outbox.claim_id`(Omnichannel.php:97,:392) — **워커 선점 ID**(경로 추적 아님)
- `WmsCctv` `Authorization: Bearer <token>`(:1005) — **브리지 인증**

이름이 같다고 §33 커버로 계산하면 역산이다.

## 1. 원문 전사 + 판정 — **원문 15종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_token_id | **grep 0** | `NOT_APPLICABLE` |
| 2 | workflow_instance_id | 부재 · 인접 = `journey_enrollments.id`(:43) | `LEGACY_ADAPTER` |
| 3 | parent_token_id | **grep 0** — 토큰 계보 개념 전무 | `NOT_APPLICABLE` |
| 4 | source_node_id | **부재** — `journey_node_logs`(:48-52)에 source/target 축 **없음**(`node_id` 단일) | `NOT_APPLICABLE` |
| 5 | current_node_id | 인접 = `journey_enrollments.current_node`(:44) — **스칼라 1개**(토큰당 아님·enrollment 당) | `LEGACY_ADAPTER` |
| 6 | token type | **grep 0**(8종 전부 부재 — [DSAR_APPROVAL_WORKFLOW_TOKEN_TYPE.md](DSAR_APPROVAL_WORKFLOW_TOKEN_TYPE.md)) | `NOT_APPLICABLE` |
| 7 | branch reference | 인접 = `split` 의 `$pick`(:618) — `journey_node_logs.result` 에 `['branch'=>$pick]`(:619) **JSON 매장**(조회 불가·행 축 아님) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | fork reference | **부재** — fork 능력 자체가 없음(`nextNode` 단일 반환 :786) | `NOT_APPLICABLE` |
| 9 | join reference | **부재** | `NOT_APPLICABLE` |
| 10 | created_at | 부재(토큰) · 인접 = `entered_at`(:45) **enrollment 단위** | `LEGACY_ADAPTER` |
| 11 | consumed_at | **부재** — 토큰 소비 개념 전무 | `NOT_APPLICABLE` |
| 12 | cancelled_at | **부재** | `NOT_APPLICABLE` |
| 13 | status | 부재(토큰) · `journey_enrollments.status`(:45)는 **enrollment 단위** | `KEEP_SEPARATE_WITH_REASON` |
| 14 | lock version | **grep 0** — SQLite 폴백 호환이 **명시적 설계 제약** | `NOT_APPLICABLE` |
| 15 | evidence | 부재 · 인접 = `journey_node_logs`(:48-52) **노드 단위** | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = 부재 9 · `LEGACY_ADAPTER` 4 · `KEEP_SEPARATE_WITH_REASON` 2 · **`VALIDATED_LEGACY` 0**.

★ **§33 은 5-3-2 범위에서 `VALIDATED_LEGACY` 가 0인 유일한 축 중 하나다.** `LEGACY_ADAPTER` 4건도 전부 **enrollment 단위 컬럼을 토큰 단위로 오인할 수 있는 자리**를 표시한 것이지 커버가 아니다.

## 2. 규칙

- 🔴 **`current_node`(:44) 위에 Token 을 얹지 마라.** enrollment 당 스칼라 1개다. 병렬 토큰을 콤마 문자열/JSON 배열로 우겨넣으면 ① `WHERE current_node=?` 조회 불가 ② 원자적 claim(:415-418 `WHERE id=:id AND status='waiting'`)이 **토큰 단위 선점 불가** ③ 순환 감지(`$seen[$nodeId]` :512,:516)가 **토큰 간 오탐**. Token 은 **별 행(row)** 이어야 한다.
- 🔴 **`split`(:614-621)을 `FORK` 로 승격 금지.** 능력이 다르다 — `pickWeighted`(:618)는 **택일**이고 `$enrollId` 기반 **결정적 분배**(A/B 테스트 재현성)다. Fork 로 바꾸면 **A/B 테스트가 붕괴**한다(무후퇴 위반). `split` 은 존치하고 fork 는 **별 노드**로 신설하라.
- 🔴 **`lock version`(#14) 을 낙관적 잠금으로 신설 시 SQLite 폴백 제약 위반 주의.** `lock_version`/분산락/`GET_LOCK` 전부 grep 0 인 것은 누락이 아니라 설계 제약이다 → **CAS 술어(`WHERE token_id=:id AND lock_version=:v`) + `rowCount()` 검사**로 구현하면 현행 4곳(Catalog:1683 · ChannelSync:6136-6153 · JourneyBuilder:411 · Omnichannel:427-447)과 **동일 모델**이라 제약을 지킨다. 다른 동시성 모델 도입 = 제약 위반.
- 🔴 **원문 말미 제약 "동일 Token이 같은 Edge를 중복 통과하지 않도록 하라" 를 현행 순환 감지로 충족했다고 계산 금지.** `$seen[$nodeId]`(:512,:516)는 ① **노드** 단위이지 Edge 단위가 아니고 ② **한 advance 패스 내**에서만 유효하며(메모리 배열·패스 종료 시 소멸) ③ 주석이 **"작성자 JSON에 acyclicity 검증 없음"** 을 자인한다 = **런타임 방어만**. 원문은 **Token×Edge 영속 제약**을 요구한다 → **`UNIQUE(workflow_token_id, edge_id)`** 가 정합이며, 이는 `claimSendOnce(enrollment_id, node_id)`(:672) **자연키 선점 마커 패턴의 직접 확장**이다(`idempotency_key` grep 0 = 5-3-2가 채울 결번).
- 🔴 **`branch reference`(#7) 를 `journey_node_logs.result` JSON(:619)으로 대체 금지** — JSON 매장은 조회·제약·인덱스가 불가능하다. Token 행의 **컬럼**이어야 §33 의 Edge 중복 제약을 걸 수 있다.
- **Token 신설은 "4번째 Foundation 신설"에 해당하지 않는다**(AL-19 저촉 아님) — 승인 정족수/신원 축이 아니라 **실행 경로 축**이고, 흡수할 기존 자산이 **문자 그대로 0**이기 때문이다. 단 **Flow 실행 엔진은 여전히 신설 금지** — Token 은 `JourneyBuilder` 에 **부속**되어야 하며 별도 엔진을 끌고 오면 안 된다.
