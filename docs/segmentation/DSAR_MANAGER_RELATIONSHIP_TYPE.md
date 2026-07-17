# DSAR — Manager Relationship Type (§11)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §11 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **Manager Relationship 축이 레포에 존재한 적이 없다**

`manager_id` **0** · `reports_to` **0** · `supervisor_id` **0** · `team_lead_id` **0** · `department_head_id` **0** · `head_id` **0** · `acting` **0** · `vacan` **0** · `deputy`/`substitute`/`stand_in` **0** · `rebate` **전역 0**(스펙 표제 도메인 자체가 없다).
★**git 이력: `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` 삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다.**

### 🔴 규칙 10 적중 지점 — **§4.3 위반이 아니다. 압축할 필드조차 없다**

원문 §4.3 은 *"하나의 `manager_id` 필드로 압축하지 마라"* 를 요구한다. 현행은 **이 요구를 위반한 상태가 아니다** — **`manager_id` 필드가 존재하지 않기 때문**이다. 현행이 표현하는 것은 **`app_user.team_role='manager'` 문자열 1개**뿐이며, 이는 **관계가 아니라 롤 라벨**이다.

| 오독 | 실측 |
|---|---|
| ❌ "현행이 27종을 `manager_id` 하나로 압축했다 → §4.3 위반" | ✅ **압축된 필드가 없다.** 관계 축 자체가 부재이며 롤 라벨 1개만 있다 |
| ❌ "타입 구분이 없다 → 단일 타입 준수" | ✅ **여러 타입을 표현할 수단이 없어서 1개**다(규칙 10) — 준수가 아니다 |

**이 구분을 흐리면**: 신설 설계가 "기존 `manager` 롤을 확장"으로 위장되고, **27종 분화 요구가 정의상 소멸**한다.

### 3개 대체물 — **서로 다른 축이며 어느 것도 §4.3/§4.4/§4.6 을 표현 못 한다**

| 대체물 | 실측 | 판정 |
|---|---|---|
| `app_user.parent_user_id` | **테넌트 소속 포인터**(보고선 아님) · 정의 `UserAuth.php:156-167` · **전 생성경로 owner 직속**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670`) · **3단 경로 없음** · 순회 = **단일 홉**(`resolveTenantId:200-217`) | `KEEP_SEPARATE_WITH_REASON` |
| `team.manager_user_id` | **팀당 1칸** · DDL `TeamPermissions.php:148`/`:168` · **`parent_team_id` 없음 → 팀 트리 자체가 없다** · ★**쓰기경로는 REAL**: `createTeam:463-469`(수령 → **테넌트 소속 검증 `:464` 422** → INSERT `:466` → `promoteManager:469`) · 수정 `:492-495` · 조회 `:444-445` · ★**`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재** → `ORG_PRESET` **시드 15팀 전부 manager NULL** | `PARTIAL` |
| `app_user.team_role='manager'` | **롤 라벨**(owner\|manager\|member `UserAuth.php:168`) — **이 문자열 하나에 승인 권한이 걸려 있다**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `NAME_ONLY` |

🔴 **`team.manager_user_id` 결여**: Type/Priority/Responsibility Scope 표현 불가(§4.6) · nullable · **effective date 0 · 이력 0** · **단일 칸이 복수 매니저를 스키마로 금지**(규칙 10 — 정책이 아니라 칸 개수가 금지한다).

### ★§57/§50 직결 — **관계 타입별 순환정책 표현 불가의 실증**

`Dependencies::validateDependency`(`backend/src/Handlers/PM/Dependencies.php:79-100`)는 §57 6방식 중 **DFS 를 실제로 구현한 유이한 선례**(+`Gantt.php:104-125` Kahn 위상정렬)이며 **쓰기 전 차단**(`:32-34` 422 `cycle_detected`)까지 REAL 이다. **그러나**:

```
:89-91  SELECT successor_id FROM pm_task_dependencies
        WHERE tenant_id = ? AND predecessor_id = ?      ← dep_type 이 술어에 없다
```

🔴 **`dep_type ENUM('FS','SS','FF','SF')` 가 존재함에도 순회 술어에 들어가지 않아 전 타입을 무차별 순회**한다. 즉 **관계 타입별 순환정책(어떤 타입은 순환 허용/어떤 타입은 금지)을 표현할 수단이 이미 없다.** §11 의 `transitive`·`manager chain eligible`·`skip level eligible`·`approval routing eligible` 4필드는 **정확히 이 능력을 요구**한다.

★부수 실측(오판 금지): **`:84` `$depth < 10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다** — `:85` `array_pop`). §57 "Maximum Depth" 로 계산하면 오판.

### ★§4.1(Manager≠Approver) — **양쪽 개념이 다 없다**

🔴 **"Manager 를 Approver 로 오용 중"이라 적으면 허구다.** 승인 경로 4개 전량 = **"호출자가 곧 승인자"**(`Mapping::approve:238-294` `actorId($request)` `:246` = 요청자 본인 · `Catalog::approveQueue:2341-2365` 는 **행위자를 읽지도 않는다** · `AgencyPortal::approveAgency:370` `isTenantOwner` · `FeedTemplate::approveDraft:271` 라우트 게이트).
★**규칙 10 적중**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.
★**Existing Approval Manager Resolver = `ABSENT`** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`).

## 1. 원문 전사 + 판정 ⓐ — **지원 Type 27종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DIRECT_MANAGER | `team.manager_user_id` **팀당 1칸** · 쓰기경로 REAL(`createTeam:463-469`) · **타입 구분 없음 · effective date 0 · 이력 0** | `PARTIAL` |
| 2 | ADMINISTRATIVE_MANAGER | 부재 — 행정/기능 보고선 분화 0 | `ABSENT` |
| 3 | FUNCTIONAL_MANAGER | 부재 | `ABSENT` |
| 4 | DOTTED_LINE_MANAGER | 부재 · **점선 보고선 = 복수 매니저 전제**인데 `manager_user_id` **단일 칸이 스키마로 금지**(규칙 10) | `ABSENT` |
| 5 | PROJECT_MANAGER | `pm_projects.owner_user_id`(migration `20260526_168_001:13`·`KEY idx_pm_proj_owner :21`·쓰기 `Projects.php:58`,`:66`,`:113`) — 🔴**4결격**: ①**`WHERE owner_user_id` grep 0 = 판독 술어 0**(인가·승인라우팅·감독 효과 **없음** → 저장된 라벨) ②무검증 자유문자열(`Projects.php:112-117` `validId()` 없음 · `PMSettings.jsx:166-167` 맨 `<input>` · FK 없음) ③기본값이 생성자(`:66` `?? $g['user_id']`) → 미설정 행과 **구분 불가** ④**단일값** · **§22 10요구 중 7 부재** | `PARTIAL` |
| 6 | PROGRAM_MANAGER | 🔴**규칙 8 적중** — `Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | `ABSENT` |
| 7 | PRODUCT_MANAGER | 부재 — 상품 명부는 REAL·관리자 축 0(규칙 9) | `ABSENT` |
| 8 | REGIONAL_MANAGER | 🔴트랩 `region` 3축 무관(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** · **Regional Directory 는 탐지·라우팅·세그먼트이지 명부 아님** | `ABSENT` |
| 9 | COUNTRY_MANAGER | 🔴트랩 `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** | `ABSENT` |
| 10 | BRAND_MANAGER | `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at`·`UNIQUE(tenant_id,name)` · **관리자 필드 없음**. 🔴**명부는 REAL·매니저는 ABSENT**(규칙 9) | `ABSENT` |
| 11 | STORE_MANAGER | 🔴트랩 **`wms_warehouses.manager VARCHAR(120)`**(`Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313`) = **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** | `NAME_ONLY` |
| 12 | MERCHANT_MANAGER | 부재 | `ABSENT` |
| 13 | VENDOR_MANAGER | 부재 · 🔴트랩 `TeamPermissions.php:718` `'외부 대행사'` = **팀 프리셋 이름**이지 매니저 아님 | `ABSENT` |
| 14 | PARTNER_MANAGER | 부재 · ⚠️`ORG_PRESET` `partner` scope 소비처 **0**(영원히 무제한 · 등급 미부여) | `ABSENT` |
| 15 | COST_CENTER_MANAGER | `cost_center` **grep 0** | `ABSENT` |
| 16 | PROFIT_CENTER_MANAGER | `profit_center` **grep 0** | `ABSENT` |
| 17 | BUDGET_MANAGER | 🔴트랩 `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 매니저 권한 아님 | `ABSENT` |
| 18 | RESOURCE_MANAGER | 부재 · 🔴트랩 `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))`(migration `…168_005`) = **태스크 역할이지 매니저 아님** | `ABSENT` |
| 19 | POSITION_SUPERVISOR | **Position 개념 0** · 🔴트랩 `position_idx` = **PM 태스크 정렬순서** · `position_based` = **U자형 기여도 모델**(`AttributionEngine.php:32`) | `ABSENT` |
| 20 | EXECUTIVE_SPONSOR | **`sponsor` grep 0** · 🔴트랩 **`admin_level`(master\|sub `UserAuth.php:171`) ≠ Executive Level**(콘솔 특권) · **`grade` 45+건 전량 무관** | `ABSENT` |
| 21 | ACTING_MANAGER | **`acting` grep 0** · 🔴**`UserAdmin::impersonate:466-525` 를 여기 계산하면 심각한 오판** — 주석이 "대행"을 6회(`:466`,`:492`,`:525`) 쓰지만 **권한 대행이 아니라 신원 위장 열람**(2시간 토큰 `:492`) · 기간부 Assignment·original manager 참조·covered scope **전무**. ★**§76 실재 결함 1**: `TeamPermissions.php:492-501` 교체 시 **전임자 강등 없음** | `ABSENT` |
| 22 | TEMPORARY_MANAGER | 부재 — **effective date·유효기간 컬럼 0**(`valid_from`/`valid_to` grep 0) | `ABSENT` |
| 23 | INTERIM_MANAGER | 🔴트랩 **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) | `ABSENT` |
| 24 | CO_MANAGER | 부재 · **`manager_user_id` 단일 칸이 공동 매니저를 스키마로 금지**(규칙 10) | `ABSENT` |
| 25 | SHARED_SERVICE_MANAGER | 부재 | `ABSENT` |
| 26 | MATRIX_MANAGER | 부재 · 🔴트랩 `matrix` = `Rollup::productChannelMatrix:378` · `Mmm::buildControlMatrix:476` | `ABSENT` |
| 27 | CUSTOM | 확장 슬롯 부재 — **타입 컬럼이 없으므로 CUSTOM 을 담을 곳도 없다** | `ABSENT` |

**소계: 27 / 27 전사.** 커버리지 = 부재 23 · 부분 2(`DIRECT_MANAGER`·`PROJECT_MANAGER`) · 이름뿐 2(`STORE_MANAGER`) — **`VALIDATED_LEGACY` 0종.**

## 1. 원문 전사 + 판정 ⓑ — **필수 필드 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_relationship_type_id | 타입 엔터티 부재 | `ABSENT` |
| 2 | relationship code | 부재 | `ABSENT` |
| 3 | relationship name | 부재 | `ABSENT` |
| 4 | relationship category | 부재 → [DSAR_MANAGER_RELATIONSHIP_CATEGORY.md](DSAR_MANAGER_RELATIONSHIP_CATEGORY.md)(§12) | `ABSENT` |
| 5 | primary eligible 여부 | 부재 — 주/부 매니저 구분 0 | `ABSENT` |
| 6 | multiple allowed 여부 | 부재 · **`team.manager_user_id` 단일 칸 · `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) = 복수를 스키마가 금지**(규칙 10 — 정책이 아니라 UNIQUE 가 금지) | `ABSENT` |
| 7 | transitive 여부 | 🔴**§57 직결** — `Dependencies:90-91` 이 **`dep_type` 을 술어에 안 넣어 전 타입 무차별 순회** → **타입별 이행성 표현 불가의 실증** | `ABSENT` |
| 8 | approval routing eligible 여부 | 🔴**§4.1 직결** — **승인자 후보 계산 코드 0**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) · 승인 4경로 전량 **"호출자가 곧 승인자"** · ★**§76 실재 결함 3**: **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`) | `ABSENT` |
| 9 | manager chain eligible 여부 | 🔴**§50 Chain 직결** — **recursive manager query 가 0개**다. ★**규칙 10 적중**: §76 *"Circular Detection 없는 Recursive Manager Query"* 탐지 결과 **0** 은 **정합이 아니라 질의가 0개**라서다 | `ABSENT` |
| 10 | skip level eligible 여부 | 부재 — **Skip-level 개념 0** · `parent_user_id` 순회가 **단일 홉**(`resolveTenantId:200-217`)이라 2단 상향 자체가 불가 | `ABSENT` |
| 11 | cross legal entity allowed 여부 | `legal_entity` **grep 0** · Legal Entity Officer `ABSENT`(`ceo_name` = 프로필 평문 `UserAuth.php:306-307`) | `ABSENT` |
| 12 | cross tenant allowed 여부 | 부재. **테넌트 격리 집행은 REAL**(`createTeam:464` 테넌트 소속 검증 422 · `Dependencies:91` 매 홉 tenant 필터) 🔴**그러나 이는 "cross tenant 를 정책으로 표현"이 아니라 "항상 금지"** — **`allowed 여부` 라는 필드가 없다**(규칙 10) | `BLOCKED_CROSS_TENANT` |
| 13 | acting replacement eligible 여부 | 부재 · ★**§76 실재 결함 2**: **Vacant Position 을 Active Manager 로 처리** — `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** | `ABSENT` |
| 14 | temporary assignment eligible 여부 | 부재 — **기간부 Assignment 개념 0**(`valid_from`/`valid_to`/`effective_to` grep 0) | `ABSENT` |
| 15 | maximum active relationship count | 부재 · 🔴트랩 **`DELEGATION_EXCEEDED`**(`TeamPermissions:645`) = **권한 부여 상한**이지 매니저 관계 개수 상한 아님 | `ABSENT` |
| 16 | priority | 부재 — §4.6 Priority 표현 불가 · 🔴트랩 `position_idx` = **PM 태스크 정렬순서** | `ABSENT` |
| 17 | status | 🔴트랩 **`is_active` = 계정 상태**(base DDL `Db.php:1106` · **`UserAuth.php:165-179` 만 보면 놓친다**) · **`NOT NULL DEFAULT 1` → `UNKNOWN` 표현 불가 = fail-open** | `ABSENT` |
| 18 | evidence | 관계 축 부재 · 선례 = `pm_audit_log`(`tenant_id NOT NULL`+`diff_json`+append-only `20260526_168_008`) | `ABSENT`(선례 = `LEGACY_ADAPTER`) |

**소계: 18 / 18 전사.** — **`VALIDATED_LEGACY` 0종.**
★원문 필드 목록이 `evidence` 로 **끝난다**(`:711`) → 전사 포함. ★지원 Type 목록은 **`CUSTOM` 으로 끝나며**(`:690`) **`evidence` 가 없다 → 추가하지 않았다**(규칙 4 양방향).

**실측 개수: 45 / 45 전사**(Type 27 + 필드 18). 측정기 §11 = **45** · **PM 브리핑 "27 Type + 18 필드 = 45" 와 일치** — 본 항목에 한해 **PM 분모가 정확하다**(재확인 결과 정정 없음).

## 2. 규칙

1. 🔴 **`pm_task_dependencies` 스키마 복제 금지.** `Dependencies:90-91` 이 **`dep_type` 을 순회 술어에 넣지 않아** 관계 타입별 순환정책을 표현하지 못한다. **이 결함을 물려받으면 설계 시점에 이미 `transitive`·`manager chain eligible`·`skip level eligible` 이 불가능해진다.** 순회 질의는 **`WHERE tenant_id=? AND predecessor_id=? AND dep_type IN (:transitive_types)`** 형태로, **타입 술어를 1급 요소**로 두라.
   - ✅ **이식 가능**: 반복형 DFS 골격 · `$visited` · **매 홉 tenant 필터**(`:91`) · **쓰기 전 차단**(`:32-34` 422) · self-loop 차단(`:29-31`) · Audit Event(`:48-54`).
   - 🔴 **이식 금지**: `:84` `$depth<10000`(**방문 노드 예산이지 깊이 캡 아님**) · `dep_type` 무술어 순회.
2. 🔴 **"현행 = `manager` 롤 1개 → 이를 확장한다"로 쓰지 마라.** `team_role='manager'` 는 **관계가 아니라 롤 라벨**이며, 27종을 담을 **필드가 없는 것이지 압축된 것이 아니다.** 이 구분을 흐리면 **§4.3 이 이미 충족된 것처럼 위장**된다(규칙 9·10).
3. 🔴 **Type 축과 Category 축(§12)·Hierarchy Type 축(§9)을 하나의 컬럼으로 합치지 마라.** 세 축은 직교이며, 합치는 순간 §4.6(Type/Priority/Responsibility Scope 병존)이 표현 불가가 된다.
4. 🔴 **`approval routing eligible` 을 "Manager 면 승인 가능"으로 구현 금지.** §4.1(Manager≠Approver) 정면 위반이며, **현행 `UserAuth.php:1064`·`TeamPermissions.php:136` 이 이미 그 결함**(§76 실재 3건 중 1)이다 — **재생산하지 마라.**
5. 🔴 **관계 신설 시 전임자 강등 경로를 함께 만들어라.** 현행 §76 실재 결함 2건이 정확히 이 부재다 — `TeamPermissions.php:492-501`(교체 시 전임자 강등 없음) · `promoteManager:768-776`(강등 경로 0 → **`manager_user_id=NULL` 이어도 전임자가 위임 권한 보유**). **관계 종료 ≠ 권한 종료를 방치하면 Vacant Position 이 Active Manager 로 남는다.**
6. 🔴 **`Alerting::actor:33-36` 을 승인 actor 참조 구현으로 삼지 마라** — `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백 = **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**. 표준은 **`Mapping::actorId:36-53`**(3분기: `apikey:{id}` `:41` / `user:{email}` `:47` / **`user:#{id}` 폴백** `:49` / **미확인 null `:52` → 403 fail-closed** `:187-190`·`:246-250`).
   - ⚠️**관찰(등급 미부여)**: 동일인이 **API키/세션 경로로 접근하면 actor 문자열이 다르다** → `:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**. 실 경합 경로 **미검증**.
7. 🔴 **27종을 "있다고 가정"하고 배선 금지.** `VALIDATED_LEGACY` 가 **0종**이다.
8. **이름 함정 8종을 커버로 계산 금지**: `UserAdmin::impersonate`(신원 위장 열람) · `대행` 한글 히트(배송/구매/광고대행사/PG — **직무대리 0건**) · `proxy` 7건(전부 HTTP) · `interim`(지오리프트) · `wms_warehouses.manager`(시설 담당자) · `position_idx`/`position_based` · `budget_amount` · `DELEGATION_EXCEEDED`.
9. **외부 소스로 타입을 채울 수 없다.** HRIS/ERP/Directory **42항목 전부 부재** · **SCIM `manager` = `ABSENT` 확정**(`urn:…:enterprise:2.0:User` 전역 0 · `scimUserOut:329-339` 에 manager 없음) · **`sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` 2슬롯뿐 · `manager_attr` 없음**.
   - 🔴 **PATCH = 침묵 no-op(가짜 녹색)**: `scimUpdateUser:391-396` 이 **`'active'` 경로만** 분기 → IdP 가 `PATCH {"path":"manager"}` 를 보내면 **200 + 정상 User 리소스 반환 · 저장된 것은 없다**. **현재 소비자 0 → 관찰 사실·등급 미부여.**
   - 🔴 **`'manager'` 롤 리터럴 오독 금지**: `sso_group_role_map.role`·`sso_config.default_role` 이 담는 것은 **`team_role` 의 값 문자열**이다. **"IdP 가 manager 를 준다"로 읽으면 §3.4 를 통째로 오판**한다. 그룹→롤 매핑은 **SCIM 경로 전용**이며 **OIDC(`:240`)/SAML(`:294`) 은 groups 를 읽지 않는다**(`provisionUser` 8인자 → `$groups` 기본값 `[]` `:476`).
10. **회귀 커버리지가 0 이다** — `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인) · 🔴**`smoke.mjs:84` `keys:['team','roas']` = Meta Ads 캠페인 계약키**(조직 team 아님 — **이름 함정**) · `scenarios.mjs` 매니저 0. **27종 배선 시 회귀 시나리오를 함께 만들지 않으면 검증 수단이 없다.**
