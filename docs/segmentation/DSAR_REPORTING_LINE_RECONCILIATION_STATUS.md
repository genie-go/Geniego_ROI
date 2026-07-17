# DSAR — Reconciliation 상태 (§67)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §67 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 대사 상태 enum | **grep 0** — **대사기가 없으므로 상태도 없다** | `CONTRACT_ONLY` |
| 30종 상태 상수 | `HRIS_MANAGER_MISMATCH` 등 **전 항목 backend/src grep 0** | `ABSENT` |
| 상태 저장 선례 | `agency_client_link.status`(pending/approved/revoked `AgencyPortal.php:64-72`) · `team.status`(`TeamPermissions.php:145-151`) · `catalog_writeback_job.status`(`pending_approval`) — **평면 문자열 상태값** | `LEGACY_ADAPTER` |
| ★상태 **재검증** 선례 | ★`AgencyPortal::resolveAccessContext:414-432` — **매 요청 fail-closed 재검증**(세션→링크 재조회 `:423` → `status!=='approved'` 면 null `:427` → 세션↔링크 tenant 불일치 방어 `:428` → `index.php:85-90` **403**) | ★**레포 최상 선례** |
| ★상태 **미판독** 반례 | 🔴`Alerting::executeAction:601-660` — `:612` 에서 `status` 를 **SELECT 하고도 어디서도 판독하지 않아** `pending`·`rejected` 도 **실집행**(승인 우회). 287차가 **"가짜 집행"** 확정 | 🔴**참조 금지** |
| 상태를 만들 능력 | ★**§66 실측: 28개 비교쌍 중 성립 0** — 🔴**좌변(source)·우변(canonical) 양변 부재** | ⊘ |

### ★★★ 가짜 녹색의 발생 지점 — `MATCH`(#1)

[§66 §0](DSAR_REPORTING_LINE_RECONCILIATION.md) 에서 확인한 대로 **비교의 양변이 모두 부재**다. 이 상태에서 대사기를 구현하면:

```
source manager (§66 필드 #36)   = null      ← HRIS/ERP/IdP/SCIM/Directory 전부 ABSENT
canonical manager (§66 필드 #37) = null      ← Canonical Reporting Line 미선언
   → difference (§66 필드 #39) = ∅          ← 비교할 것이 없음
      → status (§66 필드 #46) = MATCH (#1)   ← "차이 없음" = 일치로 보고
```

**30종 상태 중 오직 `MATCH` 만이 출력된다.** 나머지 29종은 **도달 불가**(`VACUOUS`)다.

> 🔴🔴 **이것이 288차 `ok=>true` 위장**(하드 실패를 성공으로 보고 · ChannelSync 14채널 18개소 · **285차 11번가 정본이 `ok=>false` 로 통일**)**과 구조적으로 동형이다.**
> 차이는 위장의 주체뿐이다 — 288차는 **실패를 성공으로 덮었고**, 여기서는 **비교 부재를 일치로 덮는다.** 결과는 같다: **대시보드 전면 녹색 · 드리프트 0건 보고 · 신뢰 붕괴.**
> **`MATCH` 는 30종 중 유일하게 "아무것도 하지 않아도 참이 되는" 상태다.** 따라서 **가장 먼저 방어해야 할 상태이지, 기본값으로 둘 상태가 아니다.**

> ★**5-3-3-1 §56 대비 — 본 절이 더 깊다.** 5-3-3-1 은 *좌변 부분실재 5건 · 우변 전부 부재*였다. §67 은 **좌변마저 0**(Manager 보유 소스 **0개**)이다. **`VACUOUS` 이전에 무대상**이다.

## 1. 원문 전사 + 판정 — **원문 30종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MATCH | **grep 0** · ★**양변 부재 시 자동 도달 = 가짜 녹색**(§0) | `ABSENT` · 🔴**최우선 방어 대상** |
| 2 | HRIS_MANAGER_MISMATCH | grep 0 · **HRIS 커넥터 부재**(카탈로그 행 0·fetcher 0·정규화 테이블 0) → 도달 불가 | `ABSENT` |
| 3 | HRIS_POSITION_MISMATCH | grep 0 · HRIS 부재 + **직위 축 전무**(`position_idx` = **PM 태스크 정렬순서**) | `ABSENT` |
| 4 | ERP_MANAGER_MISMATCH | grep 0 · **ERP 부재**(`sap`·`netsuite`·`dynamics` 소스 히트 0) | `ABSENT` |
| 5 | IDP_MANAGER_MISMATCH | grep 0 · **`sso_config` 에 `manager_attr` 슬롯 없음**(`EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` 2슬롯) | `ABSENT` |
| 6 | SCIM_MANAGER_MISMATCH | grep 0 · **enterprise ext. 전역 0** · 🔴**PATCH `manager` = 침묵 no-op**(`scimUpdateUser:391-396` `'active'` 경로만 분기 → **200 + 정상 User 반환 · 저장 0**) — ★**대사기가 잡아야 할 드리프트의 원형이자, 대사기 없이는 영원히 미발견** | `ABSENT` |
| 7 | DIRECTORY_MANAGER_MISMATCH | grep 0 · `ldap`·`active_directory`·`distinguishedName` **0**(🔴**`$dn` 2건은 PHP 지역변수** `Connectors.php:1557`·`GraphScore.php:343`) | `ABSENT` |
| 8 | ORGANIZATION_HEAD_MISMATCH | grep 0 · `head_id`·`department_head_id` **grep 0** · §3.1 **18/18 `CONTRACT_ONLY`** | `ABSENT` |
| 9 | DEPARTMENT_HEAD_MISMATCH | grep 0 · **`team` 에 `parent_team_id` 없음 → 팀 트리 자체가 없다**(`TeamPermissions.php:148`/`:168`) | `ABSENT` |
| 10 | COST_CENTER_MANAGER_MISMATCH | grep 0 · `cost_center` **grep 0** · Finance Master 0 | `ABSENT` |
| 11 | PROFIT_CENTER_MANAGER_MISMATCH | grep 0 · `profit_center` **grep 0**(★`po_*` = Price Optimization **무관**) | `ABSENT` |
| 12 | PROJECT_MANAGER_MISMATCH | grep 0 · 좌변 부분실재 `pm_projects.owner_user_id` 이나 🔴**`WHERE owner_user_id` grep 0 = 판독 술어 0**(저장된 라벨) · **기본값이 생성자**(`Projects.php:66`) → **미설정과 구분 불가 → 드리프트 정의상 탐지 불가** · 우변 Registry ⊘ | `ABSENT` |
| 13 | PROGRAM_MANAGER_MISMATCH | grep 0 · 🔴**`pm_portfolio` "프로그램" = 주석 팬텀**(`PM/Enterprise.php:13` 주석 자칭 · **코드에 program 개념 0** · `\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | `ABSENT` |
| 14 | REGIONAL_MANAGER_MISMATCH | grep 0 · 🔴**`region` 3축 전부 명부 아님**(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · **`APAC`/`EMEA`/`LATAM` 0** | `ABSENT` |
| 15 | COUNTRY_MANAGER_MISMATCH | grep 0 · 🔴**`Geo.php:23-53` = IP→ISO alpha-2 언어 결정용**(탐지이지 명부 아님) | `ABSENT` |
| 16 | POSITION_INCUMBENT_MISMATCH | grep 0 · 직위·재직자 축 **전무** | `ABSENT` |
| 17 | EMPLOYMENT_STATE_MISMATCH | grep 0 · 🔴**`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL **`Db.php:1106`** · 소비처 전부 인증 게이트) · **`NOT NULL DEFAULT 1` → 미지 = 자동 "가용" = fail-open** · `terminated`·`on_leave` grep 0 · 🔴**`locked_until` ≠ 고용 정지**(무차별 대입 스로틀 `UserAuth.php:3335`) · 🔴**`suspend` = 말장난 1건**(`WorkspaceState.php:12` "belt-and-**suspenders**") | `ABSENT` |
| 18 | MEMBERSHIP_MISMATCH | grep 0 · `app_user.team_id` = **단일 컬럼 = 1인 1팀**(이력·유효기간 0) · 🔴**`data_scope` 는 `UNIQUE(tenant_id,subject_type,subject_id)`(`:164`)가 단일행을 스키마로 강제**(규칙 10 — 정책이 아니라 UNIQUE 가 여러 개를 금지) | `ABSENT` |
| 19 | LEGAL_ENTITY_MISMATCH | grep 0 · 🔴**법인 엔티티 0** · `ceo_name` = **`app_user` 프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720`) · FK·감독관계·시점 전무 · 🔴**`DATA_SCOPES` `'company'` = 무제한 센티넬**(법인 아님 · `effectiveScope():258`) | `ABSENT` |
| 20 | SUPERVISORY_PATH_MISMATCH | grep 0 · **Supervisory Path 0** · 🔴**optimistic lock `version` grep 0** · 엔티티 `version` = `menu_defaults.version` **1건**이며 ★**유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `ABSENT` |
| 21 | PATH_INDEX_MISMATCH | grep 0 · **Closure Table·Materialized Path 컬럼 grep 0** · 🔴**`graph_node`/`graph_edge`(`Db.php:816-839`)를 Path Index 로 계산 금지** — `GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422 가 조직 노드 저장을 막는다**(게이트 사실) · ⚠️**인덱스·UNIQUE 0**(`:816-824`) · **내부 생산자 0 → `VACUOUS` 미배제** | `ABSENT` |
| 22 | SNAPSHOT_VERSION_MISMATCH | grep 0 · 🔴**`pm_baseline.captured_at` 은 DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가**(`KV_ONLY`) · **`as_of` 2건 = 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`) · 🔴**`snapshot` grep 최다 히트 = CCTV JPEG 프레임**(`routes.php:271`·`WmsCctv.php:45`) — **최우선 오염원** | `ABSENT` |
| 23 | TASK_ASSIGNEE_MISMATCH | grep 0 · **Task 축 grep 0** · **워크플로 정의 테이블(`workflow_*`/`flow_*`/`wf_*`) `CREATE TABLE` grep 0** · **후보 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) | `ABSENT` |
| 24 | CLAIM_ACTOR_MISMATCH | grep 0 · 🔴**`Omnichannel::claimBatch:390` 의 `claim_id` 는 익명 워커 랜덤값**(`:392` `bin2hex(random_bytes(8))`) — **사람 Actor 아님**(주체·대상·목적·인가·해제 **5축 상이**) · Manager Snapshot ⊘ | `ABSENT` |
| 25 | TERMINATED_MANAGER_ACTIVE_TASK | grep 0 · 좌변 종료 상태 0(#17) · 우변 Task 0(#23) · 🔴**강등 경로 0**(`promoteManager:768-776`) | `ABSENT` |
| 26 | VACANT_POSITION_MANAGER_ACTIVE | grep 0 · `vacan` **grep 0** · ★**단 §76 실재 결함과 직결**: `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** = **이 상태가 탐지하려는 바로 그 상황이 현재 무탐지로 발생 가능** | `ABSENT` · 🔴**실 결함 인접** |
| 27 | FUTURE_CHANGE_SCHEDULING_MISMATCH | grep 0 · 🔴**`effective_to`/`valid_to`/`valid_from` grep 0 · as-of 술어 전역 0** · `next_run_at` = **`Reports.php:75`,`:77` 리포트 스케줄러**(Task 스케줄러 아님) · **§38 Business/System 이중 시간축 = 전례 0** | `ABSENT` |
| 28 | APPROVAL_CHAIN_REFERENCE_MISMATCH | grep 0 · `approval_chain` **grep 0** · `approvals_json`(`Mapping.php:285`) = `{user, ts}` **2키 JSON 배열** = **체인 아님·인덱스 불가** | `ABSENT` |
| 29 | MANUAL_REVIEW | grep 0 · **리뷰 큐 없음** · 🔴`Reviews.php` 는 **고객 리뷰**(부정 리뷰 Slack 에스컬레이션 `:174`,`:179`)이지 결재 리뷰 아님 | `ABSENT` · 🔴**커넥터 미등록 시 착지점** |
| 30 | BLOCKED | grep 0 · 인접 선례 = **쓰기 전 422**(`PM/Dependencies.php:32-34` `cycle_detected`) · **fail-closed 403**(`index.php` strict · `AgencyPortal::resolveAccessContext:427`) | `LEGACY_ADAPTER` · 🔴**canonical null 시 착지점** |

**실측 개수: 30 / 30 전사.**
- **측정기 분모 30 · 원문 대조 30 · 전사 30 — 3자 일치.**
- 원문 §67 은 **상태 enum 목록**이며 **필수필드 축이 아니다** → 목록이 `evidence` 로 끝나지 **않는다**(원문 :2344 = `BLOCKED`). **관례에 맞추려고 `evidence` 를 추가하지 않았다**(규칙 4 반대 편향 방지).

커버리지 = `ABSENT` 29 · `LEGACY_ADAPTER` 1(#30) · **`VALIDATED_LEGACY` 0**.
→ ★**30종 전부 실코드 0.** 그리고 **현 상태에서 대사기를 켜면 #1 `MATCH` 하나만 출력되고 #2~#30 은 전부 `VACUOUS`** 다.

### ⚠️ 원문의 비대칭 — **§66 비교쌍 #22 에 대응하는 상태가 §67 에 없다**

§66 의 28개 비교쌍 중 **27개는 §67 에 1:1 대응 상태**가 있으나, **#22 `Manager Candidate vs Active Relationship`** 만 대응 상태가 **없다**(`CANDIDATE_*_MISMATCH` 계열 부재).

🔴 **날조로 메우지 마라**(규칙 1). 이것은 **원문의 사실**이며, 다음 중 하나다: ⓐ 원문 누락 ⓑ #22 를 `MANUAL_REVIEW`(#29)로 흡수하려는 의도 ⓒ #22 가 상태가 아니라 **후보 재평가 트리거**(§64 #2·#16 축). **어느 쪽인지 미확인 — 설계 확정 전 원문 소유자 판단 필요.**

## 2. 규칙

- ★★★🔴 **`MATCH`(#1)를 기본값·성공값으로 두지 마라 — Fail-closed 로 뒤집어라.**
  헌법 Vol3 정합(**Unknown ≠ Eligible** · **수집≠사용**). 대사기는 **"차이를 못 찾음"과 "일치함"을 반드시 구분**해야 한다:
  - `canonical manager`(§66 #37)가 **null** 이면 → **`MATCH` 가 아니라 `BLOCKED`(#30)**.
  - `source system`(§66 #35) 커넥터가 **미등록**이면 → **`MATCH` 가 아니라 `MANUAL_REVIEW`(#29)**.
  - 비교를 **수행하지 못한 경우**와 **수행하고 일치한 경우**는 **다른 상태**다.
  🔴 **`MATCH` 는 양변이 모두 존재하고 실제로 비교가 수행됐을 때만 부여 가능**하다. **"비교 못함" ≠ "일치함".** 이 규칙 없이는 §67 전체가 **가짜 녹색 생성기**다.
  > ★ 이 반전 규칙은 **5-3-3-1 §56 선례를 그대로 채택**한 것이다. **동일 구조의 결함이 두 절 연속 재발**했으므로, **대사 절의 표준 규칙으로 승격**한다.
- ★★★🔴 **Canonical Reporting Line 선언이 §67 에 선행한다.** [§66 §0](DSAR_REPORTING_LINE_RECONCILIATION.md) 의 순서 강제와 동일: ① Canonical Reporting Line → ② Manager Assignment 영속 → ③ Supervisory Path/Version → ④ Source Connector → ⑤ 대사기 → ⑥ 상태.
  - 🔴 **"source 측만 만들면 된다"는 역산 금지.** ④ 를 먼저 만들면 **"HRIS 가 정본"이 암묵 확정** → 헌법 Vol2 **Unified Data Model** · Vol3 **Cross Validation(단일채널 불신)** 정면 위반.
  - 🔴 **상태 enum 만 먼저 박으면 `CONTRACT_ONLY` 30종이 코드에 들어앉아 "구현됨"처럼 보인다** — 283차 교훈(**"코드 존재 ≠ 구현 완료"** · 실결함 대부분이 **미배선**)의 정확한 재현이다.
- ★🔴 **`VACUOUS` 상태를 "구현했다"고 보고 금지.** 현 시점에 #2~#28 을 enum 에 넣으면 **도달 불가 상수**가 된다. 5-3-2 에서 확인한 `Alerting::executeAction` 팬텀(**`INSERT INTO action_request` grep 0 → 생산자 전무 → 죽은 스켈레톤**)과 동형이며, **287차가 이를 "가짜 집행"으로 확정**했다. **생산자(대사기)가 없는 상태 enum 은 스켈레톤이다.**
- 🔴 **#30 `BLOCKED` 를 예외 처리로 강등하지 마라 — 안전 기본값이다.** 레포에 fail-closed 선례가 실재한다: `index.php` strict · `PM/Dependencies.php:32-34`(**쓰기 전 422**) · ★`AgencyPortal::resolveAccessContext:414-432`(**매 요청 재검증** → `status!=='approved'` 면 null → **403**). **`BLOCKED` 가 대사 실패의 기본 착지점**이어야 한다.
- ★**상태 재검증은 `AgencyPortal` 패턴을 확장하라 — 레포 최상 선례다.** ⓐ **세션 캐시를 믿지 않고 매 요청 링크 재조회**(`:423`) ⓑ **`approved` 가 아니면 즉시 null**(`:427`) ⓒ **세션↔링크 tenant 불일치 방어**(`:428`). 보고선 대사 상태도 **읽을 때마다 유효성을 재확인**해야 하며, 🔴 **`status` 를 한 번 쓰고 신뢰하는 구조는 금지**다.
  🔴 단 **`agency_client_link` 자체를 보고선 대사에 재사용 금지** — **이분(bipartite)** · **N:M · 1홉 전용** · **동의 기반 접근 허가**이지 감독 관계 아님. ⚠️실 데이터 존재 **미확인**. **패턴만 차용.**
  🔴 그리고 **`AgencyPortal.php:304`·`:381` 의 `revoked_at=NULL` 소거 패턴은 복제 금지** — **이력 물리적 소멸** = §55 "과거 Snapshot 대체 금지" **정면 반례**. **재검증 패턴은 차용하되 이력 처리 패턴은 반면교사다.**
- 🔴 **`Alerting::executeAction`(`Alerting.php:601-660`)을 상태 판독 참조 구현으로 삼지 마라 — 정반대 사례다.** `:612` 에서 `status` 를 **SELECT 하고도 어디서도 판독하지 않아** `pending`·`rejected` 도 실집행된다(승인 우회). **상태를 저장하는 것과 강제하는 것은 다르다** — §67 30종을 저장만 하고 라우팅이 판독하지 않으면 **287차 "가짜 집행"의 재현**이다.
  - 🔴 **잠복 결함 경고**: `Alerting::actor:33-36` = **`X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백**(289차 G-01 이 `Mapping` 에서 고친 **바로 그 위조가능 패턴**) · `decideAction:591-595` = **단일 결정으로 즉시 approved**(**정족수를 표시하나 집행하지 않는다**). **현재 생산자 0(VACUOUS) → 도달 불가**이나, **§67 대사기가 `action_request` 를 생산자로 삼는 순간 위조가능 승인이 활성화**된다.
  - ✅ **표준 = `Mapping::actorId:36-53`** — **3분기 fail-closed**(`apikey:{id}` `:41` / `user:{email}` `:47` / `user:#{id}` 폴백 `:49` / 미확인 **null** `:52` → **403** `:187-190`,`:246-250`).
- 🔴 **288차 `ok=>true` 통일 원칙을 상속하라** — **285차 11번가 정본이 하드 실패를 `ok=>false` 로 확정**했다(288차가 14채널 18개소에 전면 적용). 대사도 동일: **수행 불가 = 실패이지 성공이 아니다.**
- 🔴 **#12 `PROJECT_MANAGER_MISMATCH` 는 현 좌변으로 구현 시 정의상 무탐지**다. `pm_projects.owner_user_id` 의 **기본값이 생성자**(`Projects.php:66` `?? $g['user_id']`)라 **미설정 행과 구분 불가** → **"드리프트 0건"이 항상 참**이 된다. 좌변 정합화(**판독 술어·FK·명시적 null**)가 선결이다.
- 🔴 **#26 은 상태 신설 이전에 실 결함이다.** `promoteManager:768-776` 강등 경로 0 → **전임자 권한 잔존**. **상태 enum 을 만들기 전에 강등 경로를 먼저 고쳐야** 이 상태가 의미를 갖는다. 🔴 **단 이는 코드 변경이므로 본 세션 범위 밖 — 별도 승인 세션**(Golden Rule + verify + 배포 승인).
- **상태 기록은 `pm_audit_log` 패턴 확장**(`tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스 · migration `20260526_168_008`). 🔴 **전역 `audit_log`(`Db.php:540-545` · 4컬럼 · **tenant 없음** · 해시체인 없음) · `menu_audit_log`(**tenant_id 없음** · `lastHash():214-219` 에 tenant 술어 없음) · `admin_growth_approval`(`AdminGrowth.php:142-149` **tenant_id 컬럼 없음**) 전부 복제 금지** — 테넌트 격리 절대(헌법 Vol1). 무결성이 필요하면 `menu_audit_log.hash_chain`(SHA-256 prev-chain `AdminMenu.php:128`·`:182-197`·`:214-219`) **알고리즘만 이식** · 테넌트별 체인 시 **`WHERE tenant_id=?` 필수**.
- 🔴 **신규 스키마의 마이그레이션 경로가 없다** — `backend/migrations/` **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 패턴 의무 · 🔴**`ensureTables` 는 백필을 하지 않는다** → **소급 상태 부여 불가** · **MySQL/SQLite 두 방언 수기 중복 작성 의무**. 🔴**`Migrate` 이름 겹침 — DDL 적용기이지 도메인 데이터 이행기가 아니다.**
- **회귀 커버리지 0** — `tools/e2e/` 3종에서 `manager|reporting|hris|scim|reconcil` **grep 0**(`render.mjs:17` **마운트 크래시만 검사** 자인 · `smoke.mjs:84` `keys:['team','roas']` = **Meta Ads 캠페인 계약키** · 이름 함정 · `scenarios.mjs` 매니저 0). ★**`MATCH` 가짜 녹색은 E2E 없이는 절대 잡히지 않는다**(정의상 "정상"으로 보이므로). **"Canonical 부재 시 `BLOCKED` 를 반환하는가"·"커넥터 미등록 시 `MANUAL_REVIEW` 를 반환하는가"를 검증하는 E2E 가 완료 조건**이다.
  - **가드 등급 3단 인지**: `WIRED(pre-commit·로컬)`(★`core.hooksPath`=`.githooks` 는 **본 클론만 설정** · 신규 클론 기본 미설정 · `--no-verify` 우회 가능 → **보장 아님**) / `WIRED(CI·탐지)`(`security-scan.yml` `repo-guards`) / 🔴**`ENFORCED(예방)` = 현행 부재**(브랜치 보호+required check 미설정 G-06b).
- 🔴 **30종 "있다고 가정"하고 배선 금지.**
