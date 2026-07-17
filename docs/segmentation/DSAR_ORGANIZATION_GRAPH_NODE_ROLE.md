# DSAR — Organization Graph Node Role (§15)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §15(Node Role 축) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 모(母) 문서: [DSAR_ORGANIZATION_GRAPH_NODE.md](DSAR_ORGANIZATION_GRAPH_NODE.md) (§15 필수필드 19종). 본 문서는 그중 **`node role` 단일 필드의 열거 축**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Node Role 열거 자체** | `ROOT`/`INTERMEDIATE`/`LEAF`/`VIRTUAL_ROOT`/`SHARED_SERVICE`/`MATRIX_NODE`/`EXTERNAL_REFERENCE`/`PLACEHOLDER`/`ARCHIVED_REFERENCE` — **backend/src grep 0** | `ABSENT`(이름·능력 양쪽) |
| `graph_node.node_type` | `Db.php:819` VARCHAR(100) · 값 화이트리스트 `['influencer','creative','sku','order']`(`GraphScore.php:57-58` · 위반 422 `:59`) | **엔티티 종류이지 그래프 역할 아님** → `KEEP_SEPARATE_WITH_REASON` |

### ★축 주의 — `node_type` ≠ `node role` (본 문서 최대 함정)

원문은 **한 노드에 두 축**을 요구한다.

| 축 | 원문 필드 | 의미 | 현행 |
|---|---|---|---|
| **무엇인가**(엔티티 종류) | `organization_unit_id` → Organization Type | 부서? 법인? 팀? | `organization_unit` **grep 0** |
| **그래프에서 어떤 위치·성격인가** | **`node role`** | ROOT? LEAF? MATRIX_NODE? | **grep 0** |

`graph_node.node_type` 은 **첫 번째 축**(influencer/creative/sku/order = 무엇인가)이다. 🔴 **`node_type` 을 `node role` 에 매핑하면 축 자체를 날조하는 것**이며, 이는 5-3-1 에서 `REQUIREMENT_TYPE` 이 **20/20 개수 일치인데도 축이 날조**였던 사고와 동형이다.

### 현행의 역할 표현 = **NULL 관례 · 명시 열거 0**

| 원문 role 개념 | 현행 표현 | 실측 |
|---|---|---|
| ROOT | **NULL 관례** — `parent_user_id IS NULL`(`PlanLimits.php:36-37` owner 판정) · `COALESCE(parent_id,"")` 정렬(`AdminMenu.php:272`·`:333`) | 플래그·enum **없음** · `is_root` **grep 0** |
| LEAF | `channel_category_catalog.is_leaf`(`Catalog.php:200`·`:209`·인덱스 `:203`·조회 `:297`) · `elevenStCategoryCatalog` 반환 `leaf`(`ChannelSync.php:948`·`:968`) | **채널 카테고리 도메인 전용** |
| INTERMEDIATE | **표현 없음** — root/leaf 여집합을 계산하는 코드 0 | `ABSENT` |
| 나머지 6종 | **표현 없음** | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 9종**

`node role` 축.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ROOT | 명시 role 없음. **NULL 관례로 암묵 표현**(`PlanLimits.php:36-37` `parent_user_id IS NULL` · `AdminMenu.php:272` `COALESCE(parent_id,"")`) · `is_root` grep 0 | `NOT_APPLICABLE` |
| 2 | INTERMEDIATE | **grep 0** · 중간노드를 식별하는 술어 자체가 없음(레포 유일 부모간선 `app_user.parent_user_id` 는 **2단으로 봉인** — 3단 생성 경로 부재 → 중간노드가 **구조적으로 존재 불가**) | `NOT_APPLICABLE` |
| 3 | LEAF | `is_leaf`(`Catalog.php:200`,`:209`) + `leaf`(`ChannelSync.php:948`) — **채널 카테고리 도메인** · 조직 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 4 | VIRTUAL_ROOT | **grep 0**(`virtual_root`·`virtual` 조직 맥락 0) · 가상 루트를 세우는 코드 없음 | `NOT_APPLICABLE` |
| 5 | SHARED_SERVICE | **grep 0**. ★인접 오독 주의 — `DATA_SCOPES` 의 `'company'`(`TeamPermissions.php:41`)는 공유서비스가 아니라 **무제한 센티넬**(`effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한`) | `NOT_APPLICABLE` |
| 6 | MATRIX_NODE | **grep 0**(`matrix_` backend/src 0). 다중 부모 자체가 불가 — `app_user.parent_user_id` **단일 컬럼** · `team` 에 `parent_team_id` **없음**(`TeamPermissions.php:145-151`·`:168`) · `menu_tree.parent_id` **단일**(`AdminMenu.php:108-117`) | `NOT_APPLICABLE` |
| 7 | EXTERNAL_REFERENCE | **grep 0**(`external_party`·`contractor` 0). 인접 = `partner_account`(`PartnerPortal.php:52-59` · `TYPES=['supplier','logistics','warehouse']` `:29`) · `wms_suppliers`(`Wms.php:105` · SSOT 선언 `SupplyChain.php:243`) · `agency_account`(`AgencyPortal.php:56-63`) — 전부 **별도 인증 realm 의 외부 party 로그인 계정**이지 조직 그래프의 외부참조 노드 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | PLACEHOLDER | **grep 0** · 미해결 참조를 임시 노드로 세우는 개념 없음. ⚠️인접 오독 주의 — `upsertEdge` 의 **자동 노드 생성**(`GraphScore.php:126-133` `INSERT IGNORE ... graph_node`, label=node_id)은 형태상 placeholder 를 닮았으나 **role 이 아니라 참조무결성 편의**이며 상태 구분이 없다 | `NOT_APPLICABLE` |
| 9 | ARCHIVED_REFERENCE | **grep 0** · `graph_node` 에 `status` 컬럼 **없음**(`Db.php:816-824`) → 아카이브 상태 표현 불가. 인접 = `agency_client_link.status`(pending/approved/**revoked** `AgencyPortal.php:64-72`)·`team.status` | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `KEEP_SEPARATE_WITH_REASON` 2 · `NOT_APPLICABLE` 7.

> 원문의 role 축은 `node role:` 다음 9개 불릿(`SPEC …:927-937`)으로 **끝난다** — `evidence` 로 끝나지 않는다. 관례에 맞추려 없는 항목을 추가하지 않았다.

## 2. 규칙

- 🔴 **`graph_node.node_type` 을 Node Role 로 매핑 금지.** 축이 다르다(엔티티 종류 vs 그래프 역할). 매핑하면 **축 날조 = 갭 정의상 소멸 = 역산**.
- 🔴 **9종 전부 "있다고 가정"하고 배선 금지.** 커버 = 0 이다.
- ★**Node Role 은 파생값이지 자유입력이 아니다.** `ROOT`/`INTERMEDIATE`/`LEAF` 는 Edge 집합에서 **계산되는 성질**이다(입차수·출차수). §66 의 *"Path Index는 파생 데이터이며 Node·Edge와 Reconciliation 가능해야 한다"* 와 같은 계열 — **Edge 를 SoT 로 두고 role 을 파생·검증**하라. 사용자가 role 을 직접 써넣게 하면 Edge 와 어긋나고 **§65 금지의 "Graph Path와 Edge가 별도 Source of Truth인 구현"**(`SPEC …:2613`)과 동일한 병리에 빠진다.
- ★**현행은 role 을 NULL 관례로 표현한다**(`parent_user_id IS NULL` = root). **이 관례를 조직 그래프에 복제하지 마라** — 9종 중 NULL 로 표현 가능한 것은 ROOT 하나뿐이고, `VIRTUAL_ROOT`·`PLACEHOLDER`·`ARCHIVED_REFERENCE` 는 **부모가 없다는 사실만으로 구별되지 않는다**.
- **`MATRIX_NODE`(#6)는 스키마 결정을 강제한다.** 현행 트리 3종이 전부 **단일 parent 컬럼**(`app_user.parent_user_id`·`menu_tree.parent_id`·`team` 은 부모 컬럼조차 없음)이므로, 다중부모(§17 Matrix Hierarchy: *"여러 Parent 허용"*)를 지원하려면 **부모 컬럼 방식이 아니라 Edge 테이블 방식**이어야 한다. 이 점에서 `graph_edge`(`Db.php:826-839`)·`pm_task_dependencies`(엣지 리스트 · `UNIQUE(tenant,pred,succ,dep_type)` · 양방향 인덱스 · migration `20260526_168_004:12-14`)가 **유일한 유효 선례**다.
- **`ARCHIVED_REFERENCE`(#9)는 `status` 컬럼을 요구한다.** `graph_node` 에는 없다 — 이 선례를 복제하면 아카이브 표현이 불가능해진다. `agency_client_link.status`(`AgencyPortal.php:64-72`) 패턴을 차용하라.
- **`EXTERNAL_REFERENCE`(#7) 는 외부 party 를 조직 노드로 끌어들인다.** 🔴 그러나 `agency_client_link`(`AgencyPortal.php:64-72`)를 근거로 삼지 마라: ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님.
