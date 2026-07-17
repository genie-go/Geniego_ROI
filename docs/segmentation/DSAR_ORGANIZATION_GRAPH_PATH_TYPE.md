# DSAR — Organization Graph Path Type (§18)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §18(Path Type 축) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)
>
> 모(母) 문서: [DSAR_ORGANIZATION_GRAPH_PATH.md](DSAR_ORGANIZATION_GRAPH_PATH.md) (§18 필수필드 16종 + §19 + §66). 본 문서는 그중 **`path type` 단일 필드의 열거 축**만 전사한다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Path Type 열거 자체** | `SELF`/`DIRECT`/`TRANSITIVE`/`PRIMARY`/`SECONDARY`/`MATRIX`/`CROSS_ENTITY`/`FUNCTIONAL`/`ADMINISTRATIVE`/`FINANCIAL`/`APPROVAL_ELIGIBLE` — **backend/src grep 0** | `ABSENT`(이름·능력 양쪽) |
| **경로 테이블** | `graph_path`·`closure`·`ancestor`·`descendant` **grep 0** | `ABSENT` |
| **경로의 런타임 표현** | `GraphScore.php:197` `$paths = []` → `:226` `['influencer'=>…,'creative'=>…,'sku'=>…,'order'=>…,'path_weight'=>…]` → 응답과 함께 소멸 | **타입 필드 없음 · 비영속** |
| **경로 종류 구분** | `GraphScore.php:239` `'note' => 'direct'` — ★**레포 유일의 "경로 종류" 표기** | 아래 참조 |

### ★축 주의 — `'note' => 'direct'` 는 Path Type 이 아니다 (본 문서 최대 함정)

`GraphScore::scoreInfluencer` 는 두 경로를 계산한다.

| 경로 | 코드 | 표기 |
|---|---|---|
| 3-hop 전개 influencer→creative→sku→order | `:202-229` | **표기 없음** |
| **직접 엣지** influencer→order | `:231-240` | `:239` `'paths'[] = [… 'note' => 'direct']` |

이 `'direct'` 는 원문 `DIRECT` 와 **철자가 같다**. 🔴 **그러나 커버로 계산하면 역산이다**:

1. **필드가 아니라 응답 주석 문자열이다** — `'note'` 키이며 **DB 컬럼 아님**(`graph_edge` DDL `Db.php:826-837` 에 없음) · 저장되지 않음 · **질의 불가**.
2. **열거가 아니라 단일 값이다** — `'direct'` 하나뿐이고 대응하는 반대값(`'transitive'` 등)이 **없다**. 3-hop 경로에는 아무 표기도 붙지 않는다(`:226`).
3. **의미가 다르다** — 원문 `DIRECT` = **간선 1개(path length 1)** 인 경로. 코드의 `'direct'` = **"influencer→order 엣지가 알려진 경우"**(`GraphScore.php:15` docblock: *"influencer → order (direct, if known)"*) 라는 **마케팅 귀속의 데이터 가용성 표기**.
4. **도메인이 다르다** — 마케팅 귀속(influencer/creative/sku/order)이지 조직이 아니다.

**→ 5-3-1 의 `REQUIREMENT_TYPE` 사고(개수 20/20 일치인데 축 자체가 날조)와 동형의 함정이다. 철자 일치를 커버로 세지 마라.**

### 원문 Path Type 축의 이중 성격 — 판정의 근거

원문 11종은 **성격이 다른 두 묶음**이다. 이 구분이 전사 판정을 좌우한다.

| 묶음 | 항목 | 성격 | 산출 |
|---|---|---|---|
| **A. 경로의 위상(topology)** | SELF · DIRECT · TRANSITIVE | **path length 로부터 순수 파생**(0 / 1 / ≥2) | Edge 집합만 있으면 계산 가능 |
| **B. 관계의 의미(semantics)** | PRIMARY · SECONDARY · MATRIX · CROSS_ENTITY · FUNCTIONAL · ADMINISTRATIVE · FINANCIAL · APPROVAL_ELIGIBLE | **Hierarchy Type(§17)·relationship_type(§16)·legal entity boundary(§16)에서 유래** | **선행 축이 전부 부재** |

**→ 묶음 B 8종은 §16·§17 의 부재에 종속된다.** `hierarchy_type`·`relationship_type_id`·`legal_entity_id`·`is_primary` 가 전부 grep 0 이므로, **Path Type 을 먼저 만들 수 없다**(파생원이 없다).

## 1. 원문 전사 + 판정 — **원문 11종**

`path type` 축.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SELF | **grep 0.** 자기 자신 경로(length 0)를 표현하는 코드 없음. ⚠️인접 = self-loop **차단** 로직(`PM/Dependencies.php:29-31` → 422 `self_dependency` · `AdminMenu.php:542` 자기참조 즉시 차단) — 🔴 **현행은 self 를 "행으로 표현"하는 게 아니라 "금지"한다. 정반대 의미** | `NOT_APPLICABLE` |
| 2 | DIRECT | **grep 0.** 🔴 `GraphScore.php:239` `'note' => 'direct'` 는 **응답 주석 문자열**(DB 컬럼 아님·비영속·질의 불가·단일값·마케팅 도메인·의미 상이 = "엣지가 알려진 경우") — 위 §0 참조. 능력 = 인접 부모/자식 1홉 조회 실재(`UserAuth.php:200-217` `LIMIT 1` · `AdminMenu.php:272`) | `NAME_ONLY` |
| 3 | TRANSITIVE | **grep 0.** 이행 경로 계산 능력은 **있으나 비영속·boolean**(`validateDependency:79-100` 은 도달 가능성만 반환 · 경로 미보존) · `GraphScore:202-229` 는 이행 전개를 하나 **깊이 3 하드코딩 + N+1**(`:207-219`) | `PARTIAL`(계산 능력만·경로 미영속) |
| 4 | PRIMARY | **grep 0.** `is_primary`/`primary_flag` **0** · §17 Primary Parent 규칙 자체 부재 → 파생원 없음 | `NOT_APPLICABLE` |
| 5 | SECONDARY | **grep 0.** primary 가 없으므로 secondary 도 정의 불가 | `NOT_APPLICABLE` |
| 6 | MATRIX | **grep 0**(`matrix_` backend/src 0). ★**다중 부모가 구조적으로 불가** — `app_user.parent_user_id` **단일 컬럼**(`UserAuth.php:156-167`) · `team` 에 `parent_team_id` **없음**(`TeamPermissions.php:145-151`·`:168`) · `menu_tree.parent_id` **단일**(`AdminMenu.php:108-117`) → 매트릭스 경로가 발생할 수 없음 | `NOT_APPLICABLE` |
| 7 | CROSS_ENTITY | **grep 0.** 법인 엔티티 부재(`legal_entity_id` 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` 0 · 사업자정보는 `app_user` 평문필드 `UserAuth.php:499`·`:1720`). ⚠️인접 = `agency_client_link`(`AgencyPortal.php:64-72`) **크로스테넌트 위임 엣지** — 🔴 커버 금지: ⓐ **이분(bipartite)**(`agency_account:56-63` = 별도 인증 realm) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 아님 ⓓ **동의 기반 접근허가**이지 소유·포함 아님. 🔴 **테넌트 ≠ 법인**(테넌트 = 구독 단위 · 마스터 테이블 없음 · `api_key.tenant_id` FK 없음 `Db.php:944`) | `KEEP_SEPARATE_WITH_REASON` |
| 8 | FUNCTIONAL | **grep 0.** Hierarchy Type 축(§17 Functional Hierarchy) 자체 부재 → 파생원 없음. ⚠️인접 = `TeamPermissions::TEAM_TYPES` 17종(`:44-49`) · `ORG_PRESET` 15단위(`:706-722`) — **평면 문자열 카탈로그**이며 `team` DDL 에 **`parent_team_id` 없음** → "마케팅 글로벌팀"→"마케팅팀" **구조링크 0** = **"구조가 아니라 열거"**(`PARTIAL`). **기능 경로가 성립할 간선이 없다** | `NOT_APPLICABLE` |
| 9 | ADMINISTRATIVE | **grep 0.** ⚠️인접 = `app_user.parent_user_id` — 🔴 커버 금지: ★**용도가 한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(`UserAuth.php:197`·`:214` 동일값 UPDATE)이지 **보고선이 아니다** · **전 생성 경로가 owner 직속 2단**(`:1226-1227` 주석 *"항상 최상위 owner 에 종속"* · `EnterpriseAuth.php:500` · `UserAuth.php:1574/1581` · `:670`) → **3단 생성 경로가 존재하지 않아 길이 2 이상의 관리 경로가 발생 불가** | `KEEP_SEPARATE_WITH_REASON` |
| 10 | FINANCIAL | **grep 0.** `cost_center`·`profit_center` **backend/src 0** · ⚠️`po_*` 는 **Price Optimization**(`PriceOpt.php:38-146`)이지 Purchase Order 아님 · ERP/HRIS 커넥터 **0**(★능력축 증명: `ChannelRegistry.php:12`,`:79` `group_type` 도메인 = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) → **`erp`·`finance`·`hr` 값이 열거에 없다**). ⚠️`pnl_vat_summary` tenant 키(`Pnl.php:402-423`)는 **법인 회계가 아니라 구독자별 리포트** | `NOT_APPLICABLE` |
| 11 | APPROVAL_ELIGIBLE | **grep 0.** ★**승인이 조직을 경유하지 않는다** — 승인은 노드가 아니라 **핸들러 메서드**(5-3-2 실측) · `INSERT INTO action_request` **grep 0**(생산자 전무 → `Alerting::executeAction` 은 현재 `VACUOUS`) · 승인 라우팅을 조직 경로로 해석하는 코드 **0** | `NOT_APPLICABLE` |

**실측 개수: 11 / 11 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `KEEP_SEPARATE_WITH_REASON` 2 · `PARTIAL` 1 · `NAME_ONLY` 1 · `NOT_APPLICABLE` 7.

> 원문의 이 축은 `APPROVAL_ELIGIBLE` 불릿(`SPEC …:1034`)으로 **끝난다** — `evidence` 로 끝나지 않는다. 관례에 맞추려 없는 항목을 추가하지 않았다.

## 2. 규칙

- 🔴 **`GraphScore.php:239` 의 `'note' => 'direct'` 를 `DIRECT` 커버로 계산 금지.** 응답 주석 문자열 · DB 컬럼 아님 · 비영속 · 질의 불가 · **단일값**(반대값 없음) · 의미 상이("엣지가 알려진 경우") · 마케팅 도메인. **철자 일치는 커버가 아니다** → `NAME_ONLY`.
- 🔴 **11종 전부 "있다고 가정"하고 배선 금지.** 커버 = 0 이다.
- ★**Path Type 은 파생값이지 자유입력이 아니다.** §66 *"Path Index는 파생 데이터이며 Node·Edge와 Reconciliation 가능해야 한다"*(`SPEC …:2641`) 가 그대로 적용된다. **사용자가 path type 을 직접 지정하게 하면** Edge 와 어긋나고 §65 금지 *"Graph Path와 Edge가 별도 Source of Truth인 구현"*(`:2613`) 에 걸린다. **Edge 를 SoT 로 두고 전량 계산**하라.
- ★**축을 두 묶음으로 분리해 다뤄라**(§0 참조):
  - **A. 위상(SELF·DIRECT·TRANSITIVE)** = `path length` 로부터 **순수 파생**(0/1/≥2). Edge 집합만 있으면 즉시 계산 — **선행 의존 없음.**
  - **B. 의미(나머지 8종)** = **§16 `relationship_type_id`·§17 Primary Parent 규칙·§16 legal entity boundary 에 종속**. 이 선행 축들이 **전부 grep 0** 이므로 **B 를 먼저 만들 수 없다.** 🔴 선행 축 없이 B 를 구현하면 값의 근거가 없어 **임의 숫자 금지 원칙**과 같은 병리(근거 없는 값)에 빠진다.
- **A 묶음은 상호배타여야 한다.** `SELF`(length 0) · `DIRECT`(length 1) · `TRANSITIVE`(length ≥2) 는 **한 경로에 정확히 하나**다. 반면 **B 묶음은 중첩된다**(`PRIMARY` + `ADMINISTRATIVE` + `APPROVAL_ELIGIBLE` 동시 성립 가능). → 🔴 **단일 `path type` 컬럼에 두 묶음을 섞어 담지 마라** — 위상 1개 + 의미 다중(플래그/별도 행)의 형태가 아니면 표현이 손실된다. 원문 §18 이 `path type` 과 별도로 **`primary path 여부`를 독립 필드로 둔 것**(`SPEC …:1011`)이 이 분리의 방증이다.
- ★**`SELF`(#1)는 현행 관례와 정면 충돌한다.** 레포는 self 를 **금지**한다(`PM/Dependencies.php:29-31` 422 `self_dependency` · `AdminMenu.php:542` 자기참조 차단). 그러나 Closure Table 의 `SELF` 행(ancestor=descendant, length 0)은 **정상이며 필수**다(자기 자신을 조상으로 포함해야 서브트리 조회가 완결된다). 🔴 **Edge 의 self-loop 금지**(유지)**와 Path 의 SELF 행**(신규·필수)**을 혼동하지 마라** — 전자는 계속 422 로 막고, 후자는 Path Index 생성 시 **반드시 만들어라**.
- **`MATRIX`(#6)는 스키마 결정을 강제한다.** 현행 트리 3종이 전부 **단일 parent 컬럼**이라 다중부모가 구조적으로 불가하다. §17(*"Matrix Hierarchy: 여러 Parent 허용"*)을 지원하려면 **부모 컬럼이 아니라 Edge 테이블**이어야 하며, 이 점에서 `graph_edge`(`Db.php:826-839`)·`pm_task_dependencies`(UNIQUE + 양방향 인덱스 + 쓰기 전 순환차단)가 **유일한 유효 선례**다.
- **`TRANSITIVE`(#3)가 Path Index 의 존재 이유다.** 현행 이행 계산은 ⓐ `validateDependency:79-100` — **boolean 만 반환**(경로 미보존) ⓑ `GraphScore:202-229` — **깊이 3 하드코딩 + hop3∈hop2∈hop1 N+1**(`:207-219`, 285차 "루프 내 N+1=즉시장애" 트랩의 DB판). 🔴 **둘 다 조직 그래프에 복제 금지.**
- 🔴 **`agency_client_link` 를 `CROSS_ENTITY`(#7) 근거로 인용 금지**(bipartite · 1홉 · 동의 기반 접근허가 · 조직↔조직 아님). **테넌트 경계 ≠ 법인 경계.**
- 🔴 **`app_user.parent_user_id` 를 `ADMINISTRATIVE`(#9) 근거로 인용 금지.** 용도가 **테넌트 상속**이며(`UserAuth.php:197`·`:214`), **2단으로 봉인**돼 있어(전 생성 경로 owner 직속) 길이 2 이상의 관리 경로가 **발생 자체가 불가능**하다.
