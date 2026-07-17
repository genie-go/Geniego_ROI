# DSAR — Reconciliation 상태 (§56)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §56 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 대사 상태 enum | **grep 0** — 대사기가 없으므로 상태도 없다 | `CONTRACT_ONLY` |
| 26종 상태 상수 | `HRIS_ORGANIZATION_MISMATCH` 등 **전 항목 backend/src grep 0** | `ABSENT` |
| 상태 저장 선례 | `agency_client_link.status`(pending/approved/revoked `AgencyPortal.php:64-72`) · `team.status`(`TeamPermissions.php:145-151`) — **평면 문자열 상태값** | `LEGACY_ADAPTER` |
| 상태 재검증 선례 | ★`AgencyPortal::resolveAccessContext:414-432` — **매 요청 fail-closed 재검증**(세션→링크 재조회 `:423` → `status!=='approved'` 이면 null `:427` → 세션↔링크 tenant 불일치 방어 `:428` → `index.php:85-90` **403**) | ★선례 최상 |
| 대사 상태를 만들 능력 | ★**§55 실측: 24종 비교 중 성립 0**(좌변 부분실재 5건도 우변 전부 부재) | ⊘ |

### ★★ 가짜 녹색의 발생 지점 — `MATCH`(#1)

§55 §0 에서 확인한 대로 **비교의 오른쪽 변(Canonical Organization)이 미선언**이다. 이 상태에서 대사기를 구현하면:

```
canonical state (§55 필드 #9) = null          ← Canonical 미선언
   → difference (§55 필드 #10) = ∅            ← 비교할 것이 없음
      → status (§55 필드 #15) = MATCH (#1)    ← "차이 없음" = 일치로 보고
```

**26종 상태 중 오직 `MATCH` 만이 출력된다.** 나머지 25종은 **도달 불가**(`VACUOUS`)다.

> 🔴 **이것이 288차 `ok=>true` 위장(하드 실패를 성공으로 보고 · ChannelSync 14채널 18개소)과 구조적으로 동형이다.**
> 차이는 위장의 주체뿐이다 — 288차는 **실패를 성공으로 덮었고**, 여기서는 **비교 부재를 일치로 덮는다.** 결과는 같다: **대시보드 전면 녹색 · 결함 0건 보고 · 신뢰 붕괴.**
> **`MATCH` 는 26종 중 유일하게 "아무것도 하지 않아도 참이 되는" 상태다.** 따라서 **가장 먼저 방어해야 할 상태이지, 기본값으로 둘 상태가 아니다.**

## 1. 원문 전사 + 판정 — **원문 26종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MATCH | **grep 0** · ★**양변 부재 시 자동 도달 = 가짜 녹색**(§0) | `ABSENT` · 🔴**최우선 방어 대상** |
| 2 | HRIS_ORGANIZATION_MISMATCH | grep 0 · **HRIS 커넥터 부재**(`group_type` 에 `hr` 없음) → 도달 불가 | `ABSENT` |
| 3 | ERP_ORGANIZATION_MISMATCH | grep 0 · **ERP 커넥터 부재**(`group_type`/`sync_kind` 에 `erp` 없음) → 도달 불가 | `ABSENT` |
| 4 | LEGAL_ENTITY_BINDING_MISMATCH | grep 0 · 법인 엔티티 0(`biz_no`/`corp_reg`/`tax_id` **0건**) · ★§55 비교 **#3·#11 이 공유**하는 상태 | `ABSENT` |
| 5 | COST_CENTER_BINDING_MISMATCH | grep 0 · `cost_center` **grep 0** | `ABSENT` |
| 6 | PROFIT_CENTER_BINDING_MISMATCH | grep 0 · `profit_center` **grep 0**(★`po_*` = Price Optimization 무관) | `ABSENT` |
| 7 | IDP_MEMBERSHIP_MISMATCH | grep 0 · 좌변 부분실재(`sso_group_role_map` **평문 문자열·미영속**) · 우변⊘ | `ABSENT` |
| 8 | SCIM_MEMBERSHIP_MISMATCH | grep 0 · **SCIM Groups GET 전용**(`EnterpriseAuth.php:417-423`) = 투영 방향 → **소스 상태 판독 불가** | `ABSENT` |
| 9 | CRM_HIERARCHY_MISMATCH | grep 0 · `crm_customers` 계층 컬럼 **전무**(`CRM.php:48-56`/`:77-83`) | `ABSENT` |
| 10 | TENANT_BINDING_MISMATCH | grep 0 · ★**테넌트 마스터 테이블 부재**(권위 목록 없음 · `DISTINCT` 19개소 역추론) | `ABSENT` |
| 11 | WORKSPACE_BINDING_MISMATCH | grep 0 · ⚠️Workspace Registry 실재 **미확인** | `ABSENT` · ⚠️미확인 |
| 12 | COUNTRY_PROFILE_MISMATCH | grep 0 · `Geo`(`Geo.php:23-53`)는 국가→**언어** 매핑 · Country Profile 아님 | `ABSENT` |
| 13 | REGION_PROFILE_MISMATCH | grep 0 · `region` **3축 병존** · **`APAC`/`EMEA` grep 0** · parent region 0 | `ABSENT` |
| 14 | BRAND_PROFILE_MISMATCH | grep 0 · 좌변 `catalog_brand` 실재하나 **11번가 브랜드코드용 상품 속성**(`Catalog.php:415`) · 우변⊘ | `ABSENT` |
| 15 | STORE_PROFILE_MISMATCH | grep 0 · `store_id` **자유문자열**(`Insights.php:114`) = `KV_ONLY` | `ABSENT` |
| 16 | VENDOR_PROFILE_MISMATCH | grep 0 · 좌변 `wms_suppliers`(`Wms.php:105`) **평면** · 우변⊘ | `ABSENT` |
| 17 | POSITION_UNIT_MISMATCH | grep 0 · `position_unit` **grep 0** · 직위 축 전무 | `ABSENT` |
| 18 | GRAPH_PATH_MISMATCH | grep 0 · **Path Index 전례 0**(Closure Table·Materialized Path 컬럼 grep 0) | `ABSENT` |
| 19 | SNAPSHOT_VERSION_MISMATCH | grep 0 · 선례 = `menu_defaults(version)`(`AdminMenu.php:120`) · `pm_baseline`(`PM\Enterprise.php:55`) · **엔티티 `version` 은 단 1건** | `ABSENT` |
| 20 | ROLE_SCOPE_MISMATCH | grep 0 · `data_scope` **평면·단일차원**(`TeamPermissions.php:160-166`·`:277`) | `ABSENT` |
| 21 | WORKFLOW_BINDING_MISMATCH | grep 0 · 승인 워크플로 **전무**(5-3-2 §12) | `ABSENT` |
| 22 | ACTIVE_TASK_HIERARCHY_MISMATCH | grep 0 · Task/배정 개념 전무 | `ABSENT` |
| 23 | RETIRED_ORGANIZATION_ACTIVE_CASE | grep 0 · Retire·Case 양쪽 없음 | `ABSENT` |
| 24 | FUTURE_CHANGE_SCHEDULING_MISMATCH | grep 0 · **as-of 술어 전역 0건** · **`effective_to` grep 0** | `ABSENT` |
| 25 | MANUAL_REVIEW | grep 0 · 리뷰 큐 없음(§51 #12·§54 처리 #3 과 동일 축) | `ABSENT` |
| 26 | BLOCKED | grep 0 · 인접 선례 = 쓰기 전 422(`Dependencies.php:32-34`) · fail-closed 403(`index.php:585`·`AgencyPortal:427`) | `LEGACY_ADAPTER` |

**실측 개수: 26 / 26 전사.** 원문은 **상태 enum 목록**이며 **필수필드 축이 아니다** → 목록이 `evidence` 로 끝나지 **않는다**(원문 :2280 = `BLOCKED`). **관례에 맞추려고 `evidence` 를 추가하지 않았다.**

커버리지 = `ABSENT` 25 · `LEGACY_ADAPTER` 1(#26) · **`VALIDATED_LEGACY` 0**.
→ ★**26종 전부 실코드 0.** 그리고 **현 상태에서 대사기를 켜면 #1 `MATCH` 하나만 출력되고 #2~#26 은 전부 `VACUOUS`** 다.

## 2. 규칙

- ★★🔴 **`MATCH`(#1)를 기본값·성공값으로 두지 마라 — Fail-closed 로 뒤집어라.**
  헌법 Vol3 정합(**Unknown ≠ Eligible**). 대사기는 **"차이를 못 찾음"과 "일치함"을 반드시 구분**해야 한다:
  - `canonical state` 가 **null** 이면 → **`MATCH` 가 아니라 `BLOCKED`(#26)**.
  - `source system` 커넥터가 **미등록**이면 → **`MATCH` 가 아니라 `MANUAL_REVIEW`(#25)**.
  - 비교를 **수행하지 못한 경우**와 **수행하고 일치한 경우**는 **다른 상태**다.
  🔴 **`MATCH` 는 양변이 모두 존재하고 실제로 비교가 수행됐을 때만 부여 가능**하다. 이 규칙 없이는 §56 전체가 **가짜 녹색 생성기**다.
- ★🔴 **Canonical 조직 모델 선언이 선행하지 않으면 §56 을 구현하지 마라.** §55 §2 의 순서 강제와 동일: ① Canonical Node·Edge → ② Hierarchy Version → ③ Path Index → ④ 대사 → ⑤ 상태. **상태 enum 만 먼저 박으면 `CONTRACT_ONLY` 26종이 코드에 들어앉아 "구현됨"처럼 보인다** — 283차 교훈("**코드 존재 ≠ 구현 완료**" · 실결함 대부분이 미배선)의 정확한 재현이다.
- ★🔴 **`VACUOUS` 상태를 "구현했다"고 보고 금지.** 현 시점에 #2~#24 를 enum 에 넣으면 **도달 불가 상수**가 된다. 5-3-2 에서 확인한 `Alerting::executeAction` 팬텀(**`INSERT INTO action_request` grep 0 → 생산자 전무 → 죽은 스켈레톤**)과 동형이며, 287차가 이를 **"가짜 집행"**으로 확정했다. **생산자(대사기)가 없는 상태 enum 은 스켈레톤이다.**
- 🔴 **#26 `BLOCKED` 를 예외 처리로 강등하지 마라 — 안전 기본값이다.** 레포에 fail-closed 선례가 실재한다: `index.php:585`(strict) · `Dependencies.php:32-34`(쓰기 전 422) · ★`AgencyPortal::resolveAccessContext:414-432`(**매 요청 재검증** → `status!=='approved'` 면 null → 403). **`BLOCKED` 가 대사 실패의 기본 착지점**이어야 한다.
- ★**상태 재검증은 `AgencyPortal` 패턴을 확장하라 — 레포 최상 선례다.** ⓐ **세션 캐시를 믿지 않고 매 요청 링크 재조회**(`:423`) ⓑ **`approved` 가 아니면 즉시 null**(`:427`) ⓒ **세션↔링크 tenant 불일치 방어**(`:428`). 조직 대사 상태도 **읽을 때마다 유효성을 재확인**해야 하며, 🔴 **`status` 를 한 번 쓰고 신뢰하는 구조는 금지**다.
  🔴 단 **`agency_client_link` 자체를 조직 대사에 재사용 금지** — **이분(bipartite)** · **N:M · 1홉 전용** · 조직↔조직 아님 · **동의 기반 접근 허가**이지 소유·포함 아님. ⚠️실 데이터 존재 **미확인**. **패턴만 차용.**
- 🔴 **`Alerting::executeAction`(`Alerting.php:601-660`)을 상태 판독 참조 구현으로 삼지 마라 — 정반대 사례다.** `:612` 에서 `status` 를 **SELECT 하고도 어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다(승인 우회). **상태를 저장하는 것과 강제하는 것은 다르다** — §56 26종을 저장만 하고 라우팅이 판독하지 않으면 **287차 "가짜 집행"의 재현**이다.
- 🔴 **288차 `ok=>true` 통일 원칙을 상속하라** — 285차 11번가 정본이 **하드 실패를 `ok=>false`** 로 확정했다. 대사도 동일: **수행 불가 = 실패이지 성공이 아니다.**
- **상태 기록은 `pm_audit_log` 패턴 확장**(`tenant_id`+`entity`+`diff_json`+3인덱스 · migration `20260526_168_008`). 🔴 **전역 `audit_log`(4컬럼·tenant 없음·해시체인 없음 `Db.php:540-545`) 사용 금지** — 테넌트 격리가 깨진다. 무결성이 필요하면 `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·:182-197·:214-219) 패턴.
- **회귀 커버리지 0** — `tools/e2e/` 3종에서 `organization|hierarchy|org_unit|sso|scim` **grep 0**. ★**`MATCH` 가짜 녹색은 E2E 없이는 절대 잡히지 않는다**(정의상 "정상"으로 보이므로). **"Canonical 부재 시 `BLOCKED` 를 반환하는가"를 검증하는 E2E 가 완료 조건**이다.
- 🔴 **26종 "있다고 가정"하고 배선 금지.**
