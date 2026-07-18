# DSAR — 기존 구현 분류 (§75)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §75 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **Manager Relationship 축이 레포에 존재하지 않는다**

| 탐지 토큰 | 히트 |
|---|---|
| `manager_id` · `reports_to` · `supervisor_id` · `team_lead_id` · `department_head_id` · `head_id` | **전부 0** |
| `acting` · `vacan` · `deputy` · `substitute` · `stand_in` | **전부 0** |
| `interim` | 1건 — `AttributionEngine.php:672` `$rj['interim']` = **지오리프트 중간결과**(무관) |
| `rebate` | **전역 0** — 스펙 표제 도메인 자체가 없다 |

★**git 삭제 이력 0**(`manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy`) → **팬텀도 유물도 아니다. 존재한 적이 없다**(5-3-3-1 조직 축과 동형).

🔴 **그러므로 `CANONICAL_*` 17종은 전부 무대상이다.** 그러나 **분류할 인접 자산은 실재**하므로 아래에 능력축으로 배치한다(규칙 7 — 이름이 아니라 능력으로).

### 분류 대상 인접 자산 (실측)

| 자산 | 실측 | 능력 |
|---|---|---|
| `app_user.parent_user_id` | 정의 `UserAuth.php:156-167` · nullable · 전 생성경로 owner 직속(`:1226-1227` · `EnterpriseAuth.php:500` · `:1574/1581` · `:670` null) · 순회 = **단일 홉**(`resolveTenantId:200-217` · `LIMIT 1` · 재귀 0) | **테넌트 소속 포인터**(보고선 아님) · **2단 봉인** |
| `team.manager_user_id` | DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite) · **`parent_team_id` 없음 → 팀 트리 자체가 없다** · **`seedOrg:739` INSERT 8컬럼에 부재 → `ORG_PRESET` 15팀 전부 NULL** · ★**쓰기경로 REAL**: `createTeam:463-469`(테넌트 소속 검증 `:464` 422 → INSERT `:466` → `promoteManager:469`) · 수정 `:492-495` · 조회 `:444-445` | **팀당 1칸** · Type/Priority/Scope 표현 불가 · **effective date 0 · 이력 0** |
| `team_role='manager'` | `app_user.team_role` ∈ {owner\|manager\|member}(`UserAuth.php:168`) | **롤 라벨**(관계 아님) — **이 문자열 하나에 승인 권한이 걸려 있다** |
| `pm_projects.owner_user_id` | migration `20260526_168_001:13` · `KEY idx_pm_proj_owner :21` · 쓰기 `Projects.php:58`,`:66`,`:113` | 🔴**무판독 라벨** — `WHERE owner_user_id` **grep 0** |
| `wms_warehouses.manager` | `Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313` · `VARCHAR(120)` | **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** |
| `PM/Dependencies` + `PM/Gantt` | DFS `Handlers/PM/Dependencies.php:79-100` · Kahn `Handlers/PM/Gantt.php:104-125` | **순환탐지 알고리즘 REAL**(도메인 = 일정 선후행) |
| `EnterpriseAuth` | SSO/SCIM REAL · `sso_config` DDL `:45-54` = `email_attr`·`name_attr` **2슬롯뿐** | 🔴**manager 속성 0** — `manager_attr` 설정 슬롯조차 없다 |
| `Mapping::actorId` | `Mapping.php:36-53` **3분기** · 미확인 null(`:52`) → **403 fail-closed**(`:187-190`·`:246-250`) | **위조불가 신원**(국소 REAL) |

## 1. 원문 전사 + 판정 — **원문 33종**

> ★**측정기 33 / 원문 대조 33 / 전사 33.** 🔴**PM 브리핑은 "34종"이라 했으나 실측은 33이다**(규칙 3 — 조용히 맞추지 않고 사실대로 적는다).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | `CANONICAL_REPORTING_LINE_REGISTRY` | 무대상 — Registry 개념 0 | **무대상**(신설) |
| 2 | `CANONICAL_REPORTING_LINE_DEFINITION` | 무대상 | **무대상**(신설) |
| 3 | `CANONICAL_REPORTING_LINE_VERSION` | 무대상 · 인접 `menu_defaults.version` = ★리터럴 `'baseline'`(`AdminMenu.php:309`) = **버전이 아니라 라벨** | **무대상**(신설) |
| 4 | `CANONICAL_SUPERVISORY_HIERARCHY` | 무대상 — `parent_team_id` 없음 → 팀 트리 자체가 없다 | **무대상**(신설) |
| 5 | `CANONICAL_SUPERVISORY_GRAPH` | 무대상 · 🔴**`graph_node`/`graph_edge`(`Db.php:816-839`)가 스키마 쌍둥이** → 신설 시 **두 번째 그래프 스토어 = 헌법 위반** | **무대상**(신설 · #27 과 함께 판단) |
| 6 | `CANONICAL_MANAGER_RELATIONSHIP_TYPE` | 무대상 — Type 27종 표현 수단 0 | **무대상**(신설) |
| 7 | `CANONICAL_MANAGER_RELATIONSHIP` | 무대상 — 관계 테이블 0 | **무대상**(신설) |
| 8 | `CANONICAL_SUBJECT_MANAGER_BINDING` | 무대상 | **무대상**(신설) |
| 9 | `CANONICAL_POSITION_MANAGER_BINDING` | 무대상 — Position 축 0 | **무대상**(신설) |
| 10 | `CANONICAL_ORGANIZATION_MANAGER_BINDING` | 무대상 · 인접 `team.manager_user_id` = **팀당 1칸**(#25 로 분류) | **무대상**(신설) |
| 11 | `CANONICAL_MANAGER_ASSIGNMENT` | 무대상 — `acting`·`vacan` 0 | **무대상**(신설) |
| 12 | `CANONICAL_MANAGER_ELIGIBILITY` | 무대상 — 적격 술어 **0**(`Mapping::approve` 는 **정족수(숫자)뿐**) | **무대상**(신설) |
| 13 | `CANONICAL_MANAGER_VACANCY` | 무대상 — `vacan` grep 0 | **무대상**(신설) |
| 14 | `CANONICAL_MANAGER_CONFLICT` | 무대상 | **무대상**(신설) |
| 15 | `CANONICAL_MANAGER_CANDIDATE` | 무대상 — ★**승인자 후보를 계산하는 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | **무대상**(신설) |
| 16 | `CANONICAL_MANAGER_SNAPSHOT` | 무대상 · 🔴**`snapshot` grep 최다 히트 = CCTV JPEG 프레임**(`routes.php:271`·`WmsCctv.php:45`) — 최우선 오염원 | **무대상**(신설) |
| 17 | `CANONICAL_REPORTING_LINE_RECONCILIATION` | 무대상 — ★**이중 공허**: 비교쌍의 **좌변(source)·우변(canonical) 양쪽 부재** | **무대상**(신설 · Canonical 선언이 선행) |
| 18 | `VALIDATED_HRIS_SOURCE` | **`hris`·`workday`·`bamboo`·`payroll` 소스 히트 0** · 커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0 | `ABSENT` |
| 19 | `VALIDATED_ERP_SOURCE` | **`sap`·`netsuite`·`dynamics` 히트 0** · 동일하게 카탈로그/fetcher/정규화 **0** | `ABSENT` |
| 20 | `VALIDATED_DIRECTORY_SOURCE` | **`ldap`·`active_directory`·`distinguishedName` 히트 0** · 🔴`$dn`(`Connectors.php:1557`·`GraphScore.php:343`)은 **PHP 지역변수**(`distinguishedName` 아님) | `ABSENT` |
| 21 | `EXTERNAL_SOURCE_ADAPTER` | `EnterpriseAuth` SSO/SCIM = **어댑터 골격 REAL**이나 **manager 속성 0** · ★**SCIM `manager` = `ABSENT` 확정**(`urn:…enterprise:2.0:User` 전역 0 · `scimUserOut:329-339` 8필드뿐 · `scimCreateUser:364-375` 5종만 파싱 · `/Schemas`·`/ResourceTypes` 부재) | `LEGACY_ADAPTER`(**manager 무적재 · 확장 지점** — 커버 아님) |
| 22 | `VALIDATED_LEGACY` | 🔴**해당 자산 0.** 현행 중 §4.3/§4.4/§4.6 요구를 **실제 충족**하는 것은 하나도 없다 | **해당 없음(0건)** |
| 23 | `LEGACY_ADAPTER` | `EnterpriseAuth`(#21) · `PM/Dependencies`+`PM/Gantt` 순환탐지 알고리즘(**도메인 = 일정 선후행** · 이식 대상은 **알고리즘뿐**) · `Mapping::actorId`(**위조불가 신원** — 3분기 · null → 403) | `LEGACY_ADAPTER` **3건** |
| 24 | `MIGRATION_REQUIRED` | 🔴**대상 0 — 이관할 데이터가 없다.** `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지** | **해당 없음(0건)** |
| 25 | `CONSOLIDATION_REQUIRED` | 🔴**대상 0**(§76 중복 0). `team.manager_user_id`·`team_role='manager'`·`pm_projects.owner_user_id` 는 **통합 대상이 아니라 서로 다른 축** — **커버 계산 금지**(§76 참조) | **해당 없음(0건)** |
| 26 | `DEPRECATION_CANDIDATE` | `catalog_writeback_approval`(`Catalog.php:86`·`:126` CREATE 뿐 · **INSERT/SELECT 0 실측 확인**) = **테이블 고아**. 🔴**단 능력은 살아 있다**(실경로 = `catalog_writeback_job`) → **"테이블 고아 = 축 미달"로 계산하면 규칙 7 위반** | `DEPRECATION_CANDIDATE` **1건**(테이블 한정) |
| 27 | `KEEP_SEPARATE_WITH_REASON` | `graph_node`/`graph_edge` — 근거는 "다른 것"이 아니라 **게이트 사실**: `GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → **422 가 조직/Subject 노드 저장을 막는다** · `pm_task_dependencies`(🔴**스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회** → §11 Manager Type 27종별 순환정책 표현 불가) · `journeys` 노드(마케팅 도메인) | `KEEP_SEPARATE_WITH_REASON` **3건** |
| 28 | `BLOCKED_CROSS_TENANT` | 선례 REAL: `Dependencies.php:91` **tenant 필터 매 홉** · `Catalog::approveQueue:2350` 테넌트 스코프 · 🔴**반례**: `admin_growth_approval` **`tenant_id` 컬럼 없음**(`AdminGrowth.php:142-149`) · `menu_tree`·`menu_audit_log` **tenant_id 없음** | `BLOCKED_CROSS_TENANT`(**선례 有 · 신설 시 필수** — 반례 3건 복제 금지) |
| 29 | `BLOCKED_CIRCULAR_REPORTING` | 선례 = **6방식 중 2/6**: DFS `Dependencies.php:79-100`(**쓰기 전 차단 `:32-34` 422 `cycle_detected`** · self-loop `:29-31`) · Kahn `Gantt.php:104-125`(⚠️**탐지 후 차단 안 함** — 읽기 경로) · 🔴**`ChannelSync.php:955-962` 는 순환 검출기가 아니다**(`$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**) — **후보 계산 금지** | `BLOCKED_CIRCULAR_REPORTING`(**알고리즘 선례 2 · 도메인 신규**) |
| 30 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` | 🔴**현행이 정면 반례**: `AgencyPortal.php:304`·`:381` 이 **`revoked_at=NULL` 로 이전 해지 시각을 소거** → **이력 물리적 소멸**(§55 "과거 Snapshot 대체 금지" 위반) · 선례 = `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain · `lastHash():214-219`) 🔴**단 쓰기 체인만 실재·`verify()` 0** — preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼 소실→`created_at` DEFAULT 가 덮어 재계산 불가 → **tamper-evident 아님**(`:18` 주석≠근거); **무결성 검증형 정본 = `SecurityAudit::verify():56-68`**. `menu_audit_log` 은 **`tenant_id` 없음 → 스키마 복제 금지·검증형 알고리즘만 이식** | `BLOCKED_HISTORICAL_INTEGRITY_RISK`(**차단 대상 실재**) |
| 31 | `BLOCKED_MANAGER_ELIGIBILITY` | 🔴**차단 대상 실재** — **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064` `in_array($role,['owner','manager'])` · `TeamPermissions.php:136` `isManagerAdmin`). 적격 술어 **0** | `BLOCKED_MANAGER_ELIGIBILITY`(**신설 필수**) |
| 32 | `UNVERIFIED` | ⚠️**등급 미부여 관찰 3건**: ① 동일인이 API키/세션 경로 접근 시 **actor 문자열 상이** → `Mapping.php:279` dedup·`:268` 자기승인 차단 **경로 전환 우회 가능**(실 경합 경로 미검증) ② `scimUpdateUser:391-396` **PATCH manager = 침묵 no-op**(200 + 정상 User 반환 · 현재 소비자 0) ③ `ORG_PRESET` 15팀 중 8팀 scope 실효 없음(설계 의도 미확인) | `UNVERIFIED` **3건** |
| 33 | `TEST_ONLY` | `teamApi.js:94` `manager_user_id:'tm_1'` = **데모 fixture**(운영 데이터 아님) | `TEST_ONLY` **1건** |

**실측 개수: 33 / 33 전사.** 분포 = 무대상(CANONICAL_*) 17 · `ABSENT` 3 · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 3 · `UNVERIFIED` 3 · `DEPRECATION_CANDIDATE` 1 · `TEST_ONLY` 1 · `BLOCKED_*` 4(차단 대상 실재) · **`VALIDATED_LEGACY` 0 · `MIGRATION_REQUIRED` 0 · `CONSOLIDATION_REQUIRED` 0**.

## 2. 규칙

- 🔴 **`VALIDATED_LEGACY` = 0.** 커버는 `VALIDATED_LEGACY` 뿐이며 **단 하나도 없다.** `LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON`·`PARTIAL` 을 커버로 계산하면 역산이다.
- 🔴 **`MIGRATION_REQUIRED`·`CONSOLIDATION_REQUIRED` 가 0인 것은 정합의 증거가 아니라 축의 부재다**(규칙 9). 이관할 데이터도 통합할 중복도 없는 이유는 **원본이 존재한 적이 없기 때문**이다.
- 🔴 **`app_user.parent_user_id` 를 보고선으로 계산 금지.** 3단 허용 시 `resolveTenantId` **단일 홉 가정이 붕괴** → 286차 하이재킹과 동형 사고. **일반화가 선결.**
- 🔴 **형태 유사 함정 — 커버 계산 금지**: `UserAdmin::impersonate:466-525`(주석이 "대행" 6회이나 **권한 대행이 아니라 신원 위장 열람** · 기간부 Assignment·original manager 참조·covered scope **전무**) · 한글 `대행` 대량 히트 = **전부 비즈니스 도메인**(배송/구매/광고대행사/PG) · `proxy` 7건 = **HTTP 프록시** · `DELEGATION_EXCEEDED`(`TeamPermissions:645`) = **권한 부여 상한** · `lead_id` = **B2B 영업 리드** · `admin_level` ≠ Executive Level · `DATA_SCOPES 'company'` = **무제한 센티넬**(법인 아님).
- 🔴 **`'manager'` 롤 리터럴을 IdP 산출로 오독 금지** — `sso_group_role_map.role`·`sso_config.default_role` 이 담는 것도 **이 문자열**이다. "IdP 가 manager 를 준다"로 읽으면 §3.4 ⑧⑨ 를 통째로 오판한다.
- 🔴 **`wms_warehouses.manager` 는 `region`·`country` 와 같은 테이블에 공존**해 Regional/Country Manager 로 오독하기 쉽다 → `NAME_ONLY`.
- **`team.manager_user_id` 인용 시 축을 명시하라** — **"시드는 비었다"는 참, "쓰기경로는 REAL"도 참.** 어느 한쪽만 인용하면 거짓이 된다.
- **경로 접두 필수**: `backend/src/Handlers/PM/…` — **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편에 오표기 전파).
