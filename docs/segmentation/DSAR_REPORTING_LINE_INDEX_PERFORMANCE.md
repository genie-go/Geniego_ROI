# DSAR — Index·Performance (§79)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §79 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **최적화할 조회가 0개다**

§79 는 26종 조회의 최적화를 요구한다. 🔴**그러나 Manager Relationship 축이 존재하지 않으므로 26종 전부 질의 대상이 없다.** 인덱스 설계는 **신설 스키마에 대한 선행 명세**이며, **현행 인덱스 중 어느 것도 커버가 아니다.**

### 인덱스 선례 (실측 재확인 · 이식 가능)

| 선례 | 실측 | 이식 가치 |
|---|---|---|
| `graph_edge` **양방향** | `Db.php:838-839` — `idx_graph_edge_src(tenant_id,src_type,src_id)` · `idx_graph_edge_dst(tenant_id,dst_type,dst_id)` | ★**tenant 선두 + 양방향** = Ancestor/Descendant 양방향 조회의 정석 선례 |
| `pm_task_dependencies` **양방향** | migration `20260526_168_004:12-14` — `UNIQUE KEY uq_pm_dep(tenant_id,predecessor_id,successor_id,dep_type)` · `KEY idx_pm_dep_pred(predecessor_id)` · `KEY idx_pm_dep_succ(successor_id)` | ★**UNIQUE 에 관계타입 포함** = 동일 쌍 다중 타입 허용 선례 |
| `idx_menu_tree_parent` | `AdminMenu.php:117` `KEY idx_menu_tree_parent (parent_id)` | 부모 조회 · 🔴**`menu_tree` 에 `tenant_id` 없음 → 복제 금지** |
| `KEY idx_pm_proj_owner` | migration `20260526_168_001:21` | 🔴**인덱스는 있으나 `WHERE owner_user_id` grep 0 = 판독 술어 0** → **쓰이지 않는 인덱스** |
| `pm_audit_log` 3인덱스 | migration `20260526_168_008:17-19` · `tenant_id NOT NULL :7` | ★**Audit 인덱스 정본** |

### ⚠️ 결함 선례 (복제 금지)

| 결함 | 실측 |
|---|---|
| **`graph_node` 인덱스·UNIQUE 0** | `Db.php:816-824` = **`id` PK 뿐**(실측 재확인) · `:838-839` 는 **edge 전용** · 🔴**`(tenant_id,node_type,node_id)` UNIQUE 조차 없다** → 중복 노드 무방비 · **내부 생산자 0 → VACUOUS 미배제** |
| **`is_active` 인덱스 0** | 실측 재확인 — `INDEX`/`KEY`/`idx` 에 `is_active` **0건**. 세션 검증이 **매 요청** `u.is_active=1` 을 **무인덱스로** 조회(`UserAuth.php:248`,`:805`,`:2455`·`routes.php:2776`) — ⚠️**등급 미부여 관찰**(실 부하 미측정) |
| `idx_pm_proj_owner` | 인덱스만 있고 **판독 술어 0** → **성능이 아니라 라벨** |

### `pm_task_dependencies` 순회의 성능·정합 결함

- ★**`Dependencies.php:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → §79 "Chain Depth" 최적화로 계산하면 오판.
- 🔴 **`:90-91` 이 `dep_type` 을 술어에 안 넣어 전 타입 무차별 순회** → **인덱스가 있어도 타입별 가지치기 불가** → **§11 Manager Type 27종별 순환정책 표현 불가.** **스키마 복제 금지.**

## 1. 원문 전사 + 판정 — **원문 26종**

> ★측정기 26 / 원문 대조 26 / 전사 26 — **일치**.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Subject별 Active Direct Manager | 질의 대상 0 · `active` 축 = **`is_active`(계정 상태)뿐이며 인덱스 0** | `NOT_APPLICABLE`(신설) |
| 2 | Position별 Active Supervisor | Position 축 0 | `NOT_APPLICABLE`(신설) |
| 3 | Organization별 Active Manager | 인접 `team.manager_user_id` 조회(`TeamPermissions.php:444-445`) — **팀당 1칸 · 전용 인덱스 미확인** | `PARTIAL`(**커버 아님**) |
| 4 | Effective Date 기준 Manager | 🔴**`effective_to`/`valid_to`/`valid_from` grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無**(읽기 4개소 전부 최신승 `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) → **인덱스 이전에 질의가 없다** | `NOT_APPLICABLE`(신설) |
| 5 | Acting Manager | **`acting` grep 0** | `NOT_APPLICABLE`(신설) |
| 6 | Temporary Manager | **grep 0** | `NOT_APPLICABLE`(신설) |
| 7 | Interim Manager | **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` · 무관) | `NOT_APPLICABLE`(신설) |
| 8 | Vacancy별 Interim Manager | **`vacan` grep 0** | `NOT_APPLICABLE`(신설) |
| 9 | Manager별 Subordinate | 부재 · 선례 = `graph_edge` **dst 인덱스**(`Db.php:839`) | `NOT_APPLICABLE`(신설 · 선례 이식) |
| 10 | Direct Subordinate | 부재 · 🔴**`app_user.parent_user_id` 는 테넌트 포인터**(보고선 아님) · 인덱스 미확인 | `NOT_APPLICABLE`(신설) |
| 11 | 전체 Descendant | 부재 — **Closure Table·Materialized Path·Recursive CTE 전부 0** · **순회는 단일 홉**(`resolveTenantId:200-217` `LIMIT 1`) | `NOT_APPLICABLE`(신설) |
| 12 | Manager Ancestor Chain | 부재 · 선례 = `graph_edge` **src 인덱스**(`Db.php:838`) | `NOT_APPLICABLE`(신설 · 선례 이식) |
| 13 | Root Manager | 부재 | `NOT_APPLICABLE`(신설) |
| 14 | Legal Entity별 Manager | **Legal Entity Officer `ABSENT`** — `ceo_name` = `app_user` **평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720`) · FK·감독관계 전무 · 🔴**`DATA_SCOPES 'company'` = 무제한 센티넬**(법인 아님) | `NOT_APPLICABLE`(신설) |
| 15 | Department별 Head | **`department_head_id`·`head_id` grep 0** | `NOT_APPLICABLE`(신설) |
| 16 | Cost Center별 Manager | 축 자체 부재 | `NOT_APPLICABLE`(신설) |
| 17 | Profit Center별 Manager | 축 자체 부재 | `NOT_APPLICABLE`(신설) |
| 18 | Program별 Manager | 🔴**Program 개념 0** — `pm_portfolio` "프로그램"은 **주석 팬텀**(`Enterprise.php:13`) · `\bprogram\b` = LiveCommerce WebRTC 스트림명뿐 | `NOT_APPLICABLE`(신설) |
| 19 | Region별 Manager | 🔴**`region` 3축 전부 무관**: 광고 인구통계(`Db.php:681`,`:690`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** | `NOT_APPLICABLE`(신설) |
| 20 | Country별 Manager | 🔴**`Geo.php:23-53` = IP→ISO alpha-2 언어 결정용**(탐지·라우팅이지 명부 아님) | `NOT_APPLICABLE`(신설) |
| 21 | Active Approval Candidate | ★**`ABSENT`** — **후보를 계산하는 코드가 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0**) → **인덱스 이전에 대상이 없다** | `ABSENT` |
| 22 | Manager Snapshot | ★**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → 🔴**인덱스 불가·as-of 질의 불가** | `KV_ONLY`(**인덱스 불가 선례**) |
| 23 | Future Manager Change | 부재 — **미래일자 축 0** · §38 Business/System Time **이중 시간축 전례 0** | `NOT_APPLICABLE`(신설) |
| 24 | Reporting Line Conflict | 부재 | `NOT_APPLICABLE`(신설) |
| 25 | Circular Relationship | **알고리즘 선례 REAL**: DFS `Handlers/PM/Dependencies.php:79-100`(+`UNIQUE uq_pm_dep`·양방향 인덱스 `…168_004:12-14`) · Kahn `Handlers/PM/Gantt.php:104-125` 🔴**`ChannelSync.php:955-962` 는 검출기가 아니다**(`$visited` 없이 깊이만 자름) | `LEGACY_ADAPTER`(**인덱스 형태만 이식**) |
| 26 | Reconciliation Mismatch | ★**이중 공허** — **좌변(source)·우변(canonical) 양쪽 부재** → 인덱스 이전에 **무대상** | `NOT_APPLICABLE`(**Canonical 선언 선행**) |

**실측 개수: 26 / 26 전사.** 커버(`VALIDATED_LEGACY`) = **0** · `LEGACY_ADAPTER` 1 · `PARTIAL` 1 · `ABSENT` 1 · `KV_ONLY` 1 · `NOT_APPLICABLE` 22.

## 2. 규칙

- 🔴 **26종 전부 "최적화할 조회가 없다."** 인덱스 명세는 **신설 스키마 선행 요건**이며 **현행 인덱스를 커버로 계산 금지**.
- ★**tenant 선두 복합인덱스 + 양방향**을 정본으로 삼으라 — `graph_edge`(`Db.php:838-839`)·`pm_task_dependencies`(`…168_004:12-14`). Ancestor(src)·Descendant(dst) 양방향 조회는 **인덱스 2벌이 필수**다.
- ★**UNIQUE 에 관계타입을 포함하라** — `uq_pm_dep(tenant_id,predecessor_id,successor_id,dep_type)` 선례. **타입 없는 UNIQUE 는 Direct/Functional/Dotted-line 병존을 스키마가 금지**해 버린다(규칙 10 — 정책이 아니라 UNIQUE 가 여러 개를 금지하는 사고. `data_scope UNIQUE(tenant_id,subject_type,subject_id)` `TeamPermissions.php:164` 가 실제 사례).
- 🔴 **`graph_node` 를 인덱스 선례로 삼지 마라** — **인덱스·UNIQUE 0**(`Db.php:816-824` = id PK 뿐). 신설 시 **`(tenant_id,node_type,node_id)` UNIQUE 필수**. 🔴**단 `graph_node`/`graph_edge` 스키마 쌍둥이 신설 = 두 번째 그래프 스토어 = 헌법 위반** — `KEEP_SEPARATE_WITH_REASON` 의 근거는 **게이트 사실**(`GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422 가 조직/Subject 노드 저장을 막는다**).
- 🔴 **`menu_tree`·`menu_audit_log` 인덱스 복제 금지** — **`tenant_id` 자체가 없다**. 인덱스 형태만 이식하고 **tenant 선두를 반드시 추가**하라.
- 🔴 **`idx_pm_proj_owner` 를 "Project Manager 조회 최적화됨"으로 계산 금지** — 인덱스는 있으나 **`WHERE owner_user_id` grep 0** = **판독 술어 0**. **인덱스의 존재는 질의의 존재를 증명하지 않는다**(규칙 7).
- 🔴 **`Dependencies.php:84` `$depth<10000` 을 "Maximum Depth"로 계산 금지** — **방문 노드 예산**이다(`:97` `$depth++` 가 pop 마다).
- ⚠️ **등급 미부여 관찰**: `is_active` 인덱스 0 · 세션 검증이 매 요청 무인덱스 조회. **실 부하 미측정** → 등급 부여하지 않는다.
