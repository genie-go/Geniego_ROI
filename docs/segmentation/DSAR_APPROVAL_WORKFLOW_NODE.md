# DSAR — Workflow Node (§12)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §12 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `workflow_node` | **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 노드 개념(승인) | **전무** — 현행 승인은 노드 없는 **2~4단 상태 문자열**(FeedTemplate.php:248-285 등) | **구조적 부재** |
| 노드 테이블 유사물 | `journeys.nodes` MEDIUMTEXT + `journey_node_logs`(JourneyBuilder.php:35-49) — **마케팅 여정 노드** · 타입 10종(`action·condition·delay·email·kakao·push·sms·split·wait·webhook`) · `approve|approval` **grep 0** | `KEEP_SEPARATE_WITH_REASON` — **승인 노드로 전용 금지** |
| `approval requirement reference` | 유사물 = `required_approvals INT DEFAULT 2`(Db.php:623-636) — **스칼라**(요구사항 엔티티 아님) · `action_request` 에는 **컬럼조차 없음**(Db.php:592-600) | `MIGRATION_REQUIRED` |
| `authorization requirement` | `api_key` RBAC(`role`·`scopes_json`·SHA-256 `key_hash` · Db.php:942-955) + 미들웨어 주입(index.php:591-593) | `VALIDATED_LEGACY`(재사용) |
| `retry policy`/`failure policy` | 승인 도메인 **부재**(grep 0) | `NOT_APPLICABLE` |
| `timeout policy` | 부재 | `NOT_APPLICABLE` |

## 1. 원문 전사 + 판정 — 필수 필드 **원문 25축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_node_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_version_id | 부재(§9) | `NOT_APPLICABLE` |
| 3 | node_code | 부재 | `NOT_APPLICABLE` |
| 4 | node_name | 부재 | `NOT_APPLICABLE` |
| 5 | node_type | 부재 | `NOT_APPLICABLE` |
| 6 | description | 부재 | `NOT_APPLICABLE` |
| 7 | incoming edge count | 부재 | `NOT_APPLICABLE` |
| 8 | outgoing edge count | 부재 | `NOT_APPLICABLE` |
| 9 | task definition reference | 부재(§22) | `NOT_APPLICABLE` |
| 10 | gateway reference | 부재(§18) | `NOT_APPLICABLE` |
| 11 | timer reference | 부재(§21) | `NOT_APPLICABLE` |
| 12 | event reference | 부재(§20) | `NOT_APPLICABLE` |
| 13 | assignment rule reference | 부재(§37) — Human Task 배정 개념 없음 | `NOT_APPLICABLE` |
| 14 | authorization requirement | `api_key` RBAC(Db.php:942-955 · index.php:591-593) | `VALIDATED_LEGACY`(확장) |
| 15 | approval requirement reference | `required_approvals` 스칼라(Db.php:623-636) — `action_request` 는 컬럼 없음 | `MIGRATION_REQUIRED` |
| 16 | timeout policy | 부재 | `NOT_APPLICABLE` |
| 17 | retry policy | 부재 | `NOT_APPLICABLE` |
| 18 | failure policy | 부재 | `NOT_APPLICABLE` |
| 19 | compensation reference | 부재(§52 Compensation Hook) | `NOT_APPLICABLE` |
| 20 | skippable 여부 | 부재 | `NOT_APPLICABLE` |
| 21 | mandatory 여부 | 부재 | `NOT_APPLICABLE` |
| 22 | customer editable 여부 | 부재 | `NOT_APPLICABLE` |
| 23 | position metadata | 부재(승인). 인접 = `journeys` 캔버스 좌표 | `NOT_APPLICABLE` |
| 24 | status | 부재(노드 레벨) | `NOT_APPLICABLE` |
| 25 | evidence | 부분(`audit_log` Db.php:540-546 — tenant_id·해시체인 없음) | `MIGRATION_REQUIRED` |

**실측 개수: 25 / 25 전사.** ★**말미 `evidence` 포함 확인.** 커버리지 = 신설 21 · 재사용/이관 4.

> Node Type 30종은 [DSAR_APPROVAL_WORKFLOW_NODE_TYPE.md](DSAR_APPROVAL_WORKFLOW_NODE_TYPE.md) 참조.

## 2. 규칙

- 🔴 **`journeys.nodes` 를 승인 노드로 전용 금지.** 노드타입 10종에 승인 없음 · `approve|approval` grep 0 → **287차 죽은 스켈레톤 재현 위험**. 승인 노드는 **신설**이다.
- `authorization requirement` 는 **`api_key` RBAC 확장**이다(신설 금지 · Golden Rule).
- `approval requirement reference` 는 **스칼라 `required_approvals` 로 축소 금지** — 정족수는 요구사항의 한 속성일 뿐이다. 🔴 특히 `Alerting::listActionRequests`(Alerting.php:562)가 응답에 `"required_approvals" => 2` 를 **하드코딩**하면서 DB 컬럼도 없고 집행도 참조 안 하는 **장식**임을 반면교사로 삼아라 — **표시값을 요구사항으로 착각 금지**.
- `mandatory 여부` 는 §16 **"Mandatory Node 우회 경로 없음"** 검증의 입력이다 — 선언 없으면 검증 불가.
- 🔴 `NOT_APPLICABLE` 21축 **"있다고 가정"하고 배선 금지**.
