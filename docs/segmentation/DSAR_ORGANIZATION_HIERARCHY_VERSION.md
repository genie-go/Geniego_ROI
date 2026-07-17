# DSAR — Organization Hierarchy Version (§13)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §13 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 엔티티 `version` 컬럼 | ★**`menu_defaults.version` 단 1건**(`AdminMenu.php:120`·SQLite `:139`). `\bversion\b` 40건은 **전부 API 버전 문자열·DB 버전·벤더 헤더** | `PARTIAL` |
| optimistic lock `version` | **grep 0**(5-3-2 확정 재실증) | `ABSENT` |
| 버전 붙은 스냅샷 | `menu_defaults(snapshot_data JSON, version, created_at)` — 생성 `AdminMenu.php:308` · 복원 `:584-590`. **단 immutable_hash 없음 · 전역 1행(tenant 없음) · 최신 1건만 조회** | `PARTIAL` |
| 스냅샷 선례 2 | `pm_baseline(snapshot_json, captured_at)`(`PM\Enterprise.php:55`·`:62`·`:360-364`) — ★`captured_at` 명명이 원문 `recorded_at` 계열과 정확히 대응 | `LEGACY_ADAPTER` |
| `immutable_hash` 선례 | `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`·`:63-64`·`:145`/`:151`) | `LEGACY_ADAPTER` |
| 해시체인 선례 | `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) SHA-256 prev-chain 실구현(생성 `:182-197`·`lastHash()` `:214-219`·tamper-evident 주석 `:18`) | `LEGACY_ADAPTER` |
| `effective_from` | ★**`kr_fee_rule.effective_from`(`Db.php:898`) = 전 코드베이스 유일.** 쓰기 `KrChannel.php:128-140` · 읽기가 **전부 `ORDER BY effective_from DESC LIMIT 1`(최신승)**(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`) | `KV_ONLY` |
| as-of 조회 능력 | 🔴 ★**`WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건**(PM 직접 검증) | `ABSENT` |
| `effective_to` | `valid_to`\|`effective_to` **grep 0** → **폐구간 모델은 신규** | `ABSENT` |
| `crm_segments` 버전 | version/snapshot/evaluated_at **전무**(`CRM.php:64-70`) | `ABSENT` |
| 노드/엣지 저장 선례 | `graph_node`/`graph_edge`(`Db.php:816-839`) — `node_type`+`node_id` · `src_*`→`dst_*` · `edge_weight` · `meta_json` · **양방향 인덱스**(`:838-839`) | `KEEP_SEPARATE_WITH_REASON` |
| 승인 워크플로 | 승인 노드/케이스 grep 0(5-3-2 확정) · `Alerting::executeAction`(`Alerting.php:601-660`) = **VACUOUS**(`INSERT INTO action_request` grep 0 → 생산자 전무) | `NOT_APPLICABLE` |

**★축 주의 — 시점/버전 능력은 거의 전무하다.**
- 🔴 **`Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시**한다 → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**된다. 단 주석(`:451`)이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 **의도를 명시**하므로 **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요). 이것이 **§44 결번의 정확한 실증**이다 — 컬럼은 있으나 **as-of 조회 능력이 없다**.
- 🔴 **`plan_period_pricing.period_months`(migration `20260527_171_003:21-34`) 를 유효기간 선례로 인용 금지.** **구독 기간(1/3/6/12개월 상품 옵션)** 이지 effective date 가 아니다. `updated_at` 덮어쓰기 = **현재상태 전용**.
- 🔴 **"해시체인 없음"을 전역 명제로 인용하면 오염이다.** 참인 것은 **전역 `audit_log`**(`actor·action·details_json·created_at` 4컬럼 · tenant 없음 · 해시체인 없음 — MySQL `Db.php:540-545` / SQLite `AdminGrowth.php:157-159`) **에 한해서**다.

## 1. 원문 전사 + 판정 — **원문 25종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_hierarchy_version_id | 부재 — 계층 엔티티 자체 grep 0 | `NOT_APPLICABLE` |
| 2 | organization_hierarchy_id | 부재 | `NOT_APPLICABLE` |
| 3 | version_number | ★유일 선례 `menu_defaults.version`(`AdminMenu.php:120`) — **전역 1행 · tenant 없음 · 최신 1건만 조회** | `PARTIAL` |
| 4 | previous_version_id | **부재** — 버전 체인 링크 grep 0. 인접 개념 = `menu_audit_log` prev-hash(`AdminMenu.php:214-219`)이나 **버전 엔티티 링크 아님** | `ABSENT` |
| 5 | root nodes | 부재 · 인접 = `parent_user_id IS NULL` owner(`PlanLimits.php:36-37`) — 사용자 트리 루트 | `LEGACY_ADAPTER` |
| 6 | node count | 부재 — 집계 컬럼 전무 | `NOT_APPLICABLE` |
| 7 | edge count | 부재 | `NOT_APPLICABLE` |
| 8 | maximum depth | 부재(저장) · 런타임 캡 선례 3건 = `PM/Dependencies.php:79-100`(**10000**) · `AdminMenu.php:545`(**100**) · `ChannelSync.php:954-963`(**guard<10**) — **전부 런타임 가드이지 버전 메타 아님** | `LEGACY_ADAPTER` |
| 9 | structural changes | 부재 · 인접 = `pm_audit_log.diff_json`(migration `20260526_168_008`) — **엔티티 diff 이지 구조 변경 분류 아님** | `LEGACY_ADAPTER` |
| 10 | affected organization units | 부재 — 조직 단위 엔티티 자체 없음 | `NOT_APPLICABLE` |
| 11 | affected users | 부재 — 영향 분석 코드 grep 0 | `NOT_APPLICABLE` |
| 12 | affected role assignments | 부재 · 역할 저장 = `team_role`(`TeamPermissions.php:17`)·`sso_group_role_map`(`EnterpriseAuth.php:70`·`:72`) — **영향 추적 없음** | `NOT_APPLICABLE` |
| 13 | affected approval workflows | 부재 — 승인 워크플로 엔티티 grep 0(5-3-2 확정) | `NOT_APPLICABLE` |
| 14 | affected active approval cases | 부재 — 승인 케이스 grep 0 | `NOT_APPLICABLE` |
| 15 | source version | 부재 | `NOT_APPLICABLE` |
| 16 | effective_from | `kr_fee_rule.effective_from`(`Db.php:898`) **유일** · 🔴 **as-of 술어 전역 0건** → 컬럼만 존재 | `KV_ONLY` |
| 17 | effective_to | **grep 0**(`valid_to`\|`effective_to`) → 폐구간 모델 신규 | `ABSENT` |
| 18 | recorded_at | `created_at` 전 도메인 관례 · `pm_baseline.captured_at`(`PM\Enterprise.php:55`) 명명 대응 | `LEGACY_ADAPTER` |
| 19 | recorded_by | `created_by` 관례(`team` DDL `TeamPermissions.php:145-151`) · `audit_log.actor`(`Db.php:540-545`) | `LEGACY_ADAPTER` |
| 20 | reviewed_by | **부재** — Review 단계 자체 없음(5-3-2 §12 확정: Review/Approval 미분화) | `ABSENT` |
| 21 | approved_by reference | 부재(승인 도메인) · ⚠️ `agency_client_link.approved_at`(`AgencyPortal.php:64-72`) 는 **시각만 · approver 참조 없음** | `PARTIAL` |
| 22 | immutable_hash | ★선례 실재 — `schema_migrations.checksum`(`Migrate.php:50` `hash('sha256',$sql)`) · `menu_audit_log.hash_chain`(`AdminMenu.php:128`). 🔴 **단 `menu_defaults` 스냅샷에는 hash 없음** | `LEGACY_ADAPTER` |
| 23 | migration policy | **부재** — [Migration Policy 문서](DSAR_ORGANIZATION_HIERARCHY_MIGRATION_POLICY.md) 참조. ★**집행 수단 자체가 없다**(`ensureTables` 는 백필 안 함) | `ABSENT` |
| 24 | status | [Status 축 문서](DSAR_ORGANIZATION_HIERARCHY_VERSION_STATUS.md) 참조 — 14종 중 커버 0 | `NOT_APPLICABLE` |
| 25 | evidence | `menu_audit_log.hash_chain` / `pm_audit_log`(tenant+entity+diff_json+3인덱스) 패턴 확장 · `journey_node_logs` tenant_id 보유(`JourneyBuilder.php:69`·조회 술어 `:248`) = 스키마 선례 최적(단 마케팅 도메인 → 커버 금지) | `LEGACY_ADAPTER` |

**실측 개수: 25 / 25 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `PARTIAL` 3 · `LEGACY_ADAPTER` 7 · `KV_ONLY` 1 · `ABSENT` 4 · `NOT_APPLICABLE` 10.

> 🔴 **커버 0.** 25종 중 `VALIDATED_LEGACY` **하나도 없다**. 선례 7건(`LEGACY_ADAPTER`)은 **확장 대상**이지 커버가 아니다.

## 2. 규칙

- 🔴 **`kr_fee_rule.effective_from` 을 "시점 조회 능력 있음"의 근거로 쓰지 마라.** 컬럼은 있으나 **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승)** 이고 **as-of 술어는 전역 0건**이다. 능력이 아니라 **컬럼**이다(`KV_ONLY`).
- 🔴 **`plan_period_pricing.period_months` 를 §13 선례로 인용 금지** — 구독 기간 상품 옵션이다.
- 🔴 **`menu_defaults` 를 "테넌트별 버전 스냅샷" 선례로 인용 금지.** **전역 1행 · tenant 컬럼 없음 · 최신 1건만 조회 · immutable_hash 없음**. 선례 가치는 *"버전이 붙은 JSON 스냅샷을 만들고 복원한다"*(`:308`·`:584-590`)는 **형태**까지다.
- **`immutable_hash` 는 신설이 아니라 확장이다.** `schema_migrations.checksum`(`Migrate.php:50`) 의 `hash('sha256', $payload)` 패턴 + `menu_audit_log.lastHash()`(`AdminMenu.php:214-219`) 의 prev-chain 결합이 정본 경로.
- **`evidence` 는 `menu_audit_log`/`pm_audit_log` 패턴 확장이다** — "선례 없음→신설"이 아니다. 🔴 **전역 `audit_log`(4컬럼·tenant 없음·해시체인 없음)를 확장 기준으로 삼으면 후퇴다.**
- 🔴 **`graph_node`/`graph_edge` 를 §13 커버로 계산 금지.** 도메인 = **마케팅 귀속**(influencer→creative→sku→order). 단 **구조적 쌍둥이**이므로 신설 시 **저장 형태 선례로 최상급** — Node/Edge 분리 + 타입드 관계 + 가중치 + 양방향 인덱스가 이미 있어 **전용 그래프 DB 도입은 불필요**(Neo4j/Cypher/Gremlin/Neptune/Arango/JanusGraph/TinkerPop **grep 0**).
  ⚠️ 단 `graph_node`/`graph_edge` 는 **내부 생산자 0**(`upsertNode`/`upsertEdge` 호출처 = 핸들러·라우트뿐 · frontend 0 → **외부 POST 전용 유입**) — **VACUOUS 가능성 미배제**. "운영 중인 그래프"로 인용 금지.
- **`node count`/`edge count`/`maximum depth` 를 버전 메타로 저장하려면 신규다.** 현행 깊이캡 3건은 **런타임 가드**이지 저장 메타가 아니다 — 혼동 금지.
- 신설 시 **MySQL/SQLite 두 방언 동시 작성 의무**(`CRM.php:48` vs `:77`).
- 🔴 25종 **"있다고 가정"하고 배선 금지.** 특히 `affected *` 5종은 **영향 분석 엔진 자체가 없다** — 계산 주체 없이 필드만 만들면 `VACUOUS` 다.
