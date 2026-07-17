# DSAR — Orphan Node (§54)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §54 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Orphan 탐지 | **grep 0** — 조직 노드가 없으므로 고아도 없다 | `ABSENT` |
| ★고아 취급 위험 패턴 | `AdminMenu.php:272`·`:333` 조립 = `ORDER BY COALESCE(parent_id,"")` — **부모가 없는 노드와 부모 id 가 빈 노드를 동일 취급** → **고아를 루트처럼 정렬**. 트리 조립이 앱단(:272)이므로 **댕글링 parent_id 를 가진 노드는 조용히 탈락하거나 루트로 부상** | 🔴 위험 패턴 |
| 댕글링 엣지 처리 | `Gantt.php:98` `isset($taskMap[...])` = **조용한 스킵**(검증 아님·은폐) | 🔴 반례 |
| Placeholder Root | **grep 0** | `ABSENT` |
| 고아 UI 도구 | `PolicyTreeEditor.jsx`(재귀 DFS `:30-65`) — **전 frontend/src 에서 import 0**(정의부뿐) | ★`VACUOUS`(형태 함정) |
| `menu_tree` 운영 실재성 | ⚠️`reorder` **프론트 호출자 0** · `AdminMenuManager.jsx:252` *"menu_tree 가 비어 있습니다"* 분기 + `:341` *"⚠ menu_tree 미등록"* 배지 → **운영 0행 가능성 실재**(라이브 미검증) | ⚠️ 미확인 |
| Membership | 조직 멤버십 부재 · `team` 멤버는 **평면**(`TeamPermissions.php:145-151` — `parent_team_id` 없음) | `ABSENT` |
| HRIS 소스 | ★**커넥터 자체 부재** — `ChannelRegistry.php:12`·`:79` `group_type` = sales/marketing/logistics/pg/messaging + analytics·cs·esp·review · `sync_kind` = commerce/ad/messaging/none → **`hr`·`erp`·`finance` 값이 열거에 없다** | `ABSENT` |

**★축 주의 — §54 는 "계층이 있고 그 안에 고아가 생긴다"는 전제다.** 현행은 **계층이 0종**이므로 9개 후보 전부 **탐지 대상이 존재하지 않는다**. 🔴 **`PolicyTreeEditor.jsx` 가 재귀 DFS 를 갖고 있다는 이유로 "고아 처리 능력 있음"으로 계산하면 이중 오판**이다 — ⓐ **어디서도 import 되지 않는 `VACUOUS` 고아 컴포넌트**(코드 有·도달 불가)이고 ⓑ 설령 살아 있어도 **정책 트리 편집기**이지 조직 고아 처리기가 아니다.

## 1. 원문 전사 + 판정

### 1-A. Orphan 후보 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Root가 아닌데 Parent가 없음 | 부재(조직) · ★**동형 위험 실재** — `AdminMenu.php:272` `ORDER BY COALESCE(parent_id,"")` 가 **고아를 루트처럼 취급** · Root 개념·다중 Root 제한 **양쪽 0** | `ABSENT` · 🔴위험 패턴 |
| 2 | Active Membership이 있으나 Hierarchy Node가 없음 | 부재 — 멤버십·노드 양쪽 없음. `team` 멤버는 평면이라 **정의상 고아가 될 수 없다**(붙을 트리가 없음) | `ABSENT` |
| 3 | Active Role Assignment이 있으나 Organization Unit이 종료됨 | 부재 — **Organization Unit 없음** · **종료(retire) 개념 없음** · 역할축은 `team_role`(owner>manager>member `TeamPermissions.php:17`) **평면** | `ABSENT` |
| 4 | Approval Workflow Binding이 있으나 Hierarchy가 없음 | 부재 — 승인 워크플로 **grep 0**(5-3-2 §12: 30종 전부 부재) | `ABSENT` |
| 5 | Legal Entity Binding이 없음 | 부재 — 법인 엔티티 없음(`biz_no`/`brn`/`corp_reg`/`tax_id` **0건** · 사업자정보 = `app_user` 평문 필드 `UserAuth.php:499`·`:1720`) | `ABSENT` |
| 6 | Parent Version이 종료됨 | 부재 — ★**엔티티 `version` 은 `menu_defaults.version` 단 1건**(`AdminMenu.php:120`) · **optimistic lock `version` grep 0** · Version 종료 개념 없음 | `ABSENT` |
| 7 | Source HRIS Unit이 삭제됨 | 부재 — ★**HRIS 커넥터 부재의 능력축 증명**: `ChannelRegistry` `group_type`/`sync_kind` 열거에 **`hr` 값 없음** · `hris`/`workday`/`payroll` **grep 0**. 헌법 Vol2(`DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 이름만 정의 | `ABSENT` |
| 8 | Merge 대상이 없는 Superseded Unit | 부재 — Unit·Merge 양쪽 없음. 🔴**`crm_identity_merge_link`(`CRM.php:708-712`)를 Merge 선례로 계산 금지** — **무방향 등가 엣지**(union-find `:597-643`)이지 조직 승계가 아니다 | `ABSENT` |
| 9 | Split 대상이 없는 Retired Unit | 부재 — Split/Retire 개념 없음 | `ABSENT` |

**실측 개수: 9 / 9 전사.**

### 1-B. 처리 — **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | BLOCK | 부재(조직) · 인접 선례 = 쓰기 전 422 차단(`Dependencies.php:32-34`) · fail-closed 403(`index.php:585`·`AgencyPortal:427`) | `LEGACY_ADAPTER` |
| 2 | ATTACH_TO_PLACEHOLDER_ROOT | 부재 — Placeholder Root **grep 0** | `ABSENT` |
| 3 | MANUAL_REVIEW | 부재 — 리뷰 큐 없음(§51 #12 와 동일) | `ABSENT` |
| 4 | MIGRATION_REQUIRED | 부재 · ★**집행 수단 자체가 없다** — `backend/migrations/` **172차 정지**(최신 `20260527_172_002`) · 이후 전 스키마는 `ensureTables` 인데 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** | `ABSENT` · 🔴집행 불가 |
| 5 | ARCHIVE | 부재(조직) · 인접 = `status` 컬럼(`team` DDL `:145-151`) **평면 상태값** | `NAME_ONLY` |
| 6 | RESTORE_SOURCE | 부재 — **복원할 소스(HRIS/ERP)가 없다**(#7 참조) | `ABSENT` |
| 7 | CORRECT_BINDING | 부재 — Binding 개념 없음 | `ABSENT` |

**실측 개수: 7 / 7 전사.** 원문에 **필수필드 축 없음**(§54 는 후보 9 + 처리 7 + 규칙 1문장) → 필드 표 없음. 말미 규칙 = §2 반영.

커버리지(9+7=16) = `ABSENT` 14 · `NAME_ONLY` 1 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- ★**원문 말미가 규칙이다**(:2197): **"Production Approval Routing에서는 Placeholder Root를 자동 승인 경로로 사용하지 마라."** → `ATTACH_TO_PLACEHOLDER_ROOT`(#2)는 **고아를 그래프에 붙여 검증을 통과시키는 수단**일 뿐, **그 경로로 승인이 흐르면 안 된다**. Placeholder Root 는 **격리 보관소**이지 승인자가 아니다.
  🔴 **이 규칙이 288차 `ok=>true` 위장과 정확히 동형인 함정을 막는다** — 고아를 Placeholder 에 붙이면 §52 #13(Orphan Node 없음)이 **통과로 보이지만** 승인 경로는 **아무도 없는 루트**로 흐른다. **가짜 녹색.**
- ★🔴 **`AdminMenu.php:272` 패턴을 조직 트리 조립에 복제하지 마라.** `ORDER BY COALESCE(parent_id,"")` 는 **고아와 루트를 구분하지 않는다** — 조직에서는 **부모를 잃은 부서가 최상위로 부상**하고, 그 위에 승인 라우팅이 얹히면 **부서장이 전사 승인자로 승격**된다. 조직 조립은 **Root 를 명시 플래그로 선언**하고 **부모 미해소 노드는 `BLOCK`**(원문 처리 #1)해야 한다.
  ⚠️ 단 `menu_tree` 는 **`tenant_id` 컬럼이 없는 전역 단일 트리**(`AdminMenu.php:108-117`)이며 **운영 0행 가능성이 실재**(`AdminMenuManager.jsx:252`·`:341`·`reorder` 호출자 0·라이브 미검증)하다 → **"운영 중인 트리"로 인용 금지 · 선례로만 인용.**
- ★🔴 **`Gantt.php:98` 의 조용한 스킵을 고아 처리로 계산 금지.** `isset($taskMap[...])` 로 **댕글링 엣지를 버리는 것**은 §54 의 어떤 처리(#1~#7)도 아니다 — **탐지도 기록도 없이 사라진다.** 조직 그래프는 **고아를 발견하면 반드시 상태를 남겨야 한다**(§56 `MANUAL_REVIEW`/`BLOCKED`).
- ★🔴 **`PolicyTreeEditor.jsx` 를 재사용 대상으로 삼지 마라 — `VACUOUS` 고아 컴포넌트다**(전 frontend/src import **0**). **"코드가 있으니 재사용"은 283차 교훈("코드 존재 ≠ 구현 완료")의 정반대**다. 재귀 DFS(`:30-65`)가 있다는 형태 유사에 속지 마라. **본 컴포넌트 자체가 §54 후보 #1 의 프론트엔드판 실례** — 부모(import) 없는 노드가 트리에 매달려 있다.
- 🔴 **#4 `MIGRATION_REQUIRED` 를 "처리 가능"으로 계산 금지.** 마이그레이션 경로가 **172차에 죽었고** `ensureTables` 는 **백필을 하지 않는다** → **§14 Hierarchy Version 간 데이터 이행 · §46 Retroactive 재계산과 함께 집행 수단이 현재 없다.** 조직 도입 시 **백필 러너가 별도 신규 요구**이며, 이를 누락하면 **처리 7종 중 #4 가 이름만 존재**하게 된다.
- 🔴 **#6 `RESTORE_SOURCE` 는 소스 부재로 원천 불가.** HRIS/ERP 커넥터가 **`ChannelRegistry` 열거에 값조차 없다** → **복원할 원본이 없다.** §55 와 동일한 구조적 결론이다.
- **#1 `BLOCK` 만이 즉시 구현 가능하다** — 쓰기 전 422 차단(`Dependencies.php:32-34`) 패턴을 확장하라. **나머지 6종은 선행 자산(Placeholder Root·리뷰 큐·백필 러너·소스 커넥터)이 전부 신규**다.
- 🔴 **16종 "있다고 가정"하고 배선 금지.**
