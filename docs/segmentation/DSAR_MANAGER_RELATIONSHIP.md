# DSAR — Manager Relationship (§13)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §13(737-789) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 대전제 — **Manager Relationship 축이 레포에 존재하지 않는다**

`manager_id` **0** · `reports_to` **0** · `supervisor_id` **0** · `team_lead_id` **0** · `department_head_id` **0** · `head_id` **0** · `acting` **0** · `vacan` **0** · `deputy`/`substitute`/`stand_in` **0** · `rebate` **전역 0**(스펙 표제 도메인 자체가 없다).
★**git 이력에 `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` 삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다.**

### 🔴 ★축 주의 — **3개 대체물을 아래 Relationship Basis 10종에 매핑하지 마라. 서로 다른 축이다.**

| 대체물 | 실제 축 | 증거 | §13 커버 |
|---|---|---|---|
| `app_user.parent_user_id` | **테넌트 소속 포인터**(보고선 아님) | 정의 `UserAuth.php:156`,`:167` · **nullable** | ❌ |
| `team.manager_user_id` | **팀당 1칸**(조직↔담당자 1슬롯) | DDL `TeamPermissions.php:148` | ❌ (§17 축 · 본 §의 관계 엔티티 아님) |
| `team_role='manager'` | **롤 라벨**(관계 아님) | `UserAuth.php:168` (owner\|manager\|member) | ❌ |

🔴 **`parent_user_id` 를 `SUBJECT_TO_SUBJECT` 로 계산하면 심각한 오판이다.** 실측:
- **전 생성경로가 owner 직속 2단으로 봉인** — `UserAuth.php:1226-1227`(주석 `:1225` *"항상 최상위 owner 에 종속: manager 가 추가해도 parent 는 최상위 owner"*) · `EnterpriseAuth.php:500`(INSERT · `:494-496` owner 조회 후 `(int)$owner['id']`) · `UserAuth.php:670`(null). **3단 경로가 코드에 없다.**
- 순회 = **단일 홉** — `resolveTenantId:200-217` · `LIMIT 1` **1회** · 재귀 없음 · 하위계정이 상위 owner tenant_id 를 **그대로** 물려받음(`:197`·`:214`).
- **판독 술어가 전부 tenant 해석**(`:41`·`:207`·`:243`·`:296`·`Rollup.php:47`,`:56`) — **보고선·승인라우팅·감독 효과 0.**
- 🔴 **3단 허용 시 `resolveTenantId` 단일 홉 가정이 붕괴 → 286차 하이재킹과 동형 사고. 일반화가 선결.**

★**규칙 10 적중**: `parent_user_id` 가 "1홉"인 것은 **깊이 정책을 지켜서가 아니라 여러 홉을 표현할 수단이 없어서**다. 준수로 계산 금지.

### 인접 능력 실측

| 축 | 상태 | 증거 |
|---|---|---|
| 관계 엔티티 | **부재** — 매니저 관계를 담는 테이블 0 | 상기 grep 전량 0 |
| 순환 탐지(§13 hierarchy forming 전제) | **DFS·Topological 2/6 실재 · 도메인 상이** | `Handlers/PM/Dependencies.php:79-100`(tenant 필터 `:91` · 쓰기 전 차단 `:32-34`) · `Handlers/PM/Gantt.php:104-125`(Kahn) — **★경로 접두 `backend/src/Handlers/PM/…`** (`backend/src/PM/` 는 **존재하지 않는다**) |
| 시점(valid_from/valid_to) | **전역 0** | `valid_from`·`valid_to`·`effective_to` grep **0**. ★**`valid_to` 유일 히트 `Onsite.php:396` 은 `'invalid_token'` 문자열의 부분일치 = 위양성** |
| evidence / source system | **부재** | HRIS/ERP/Directory 소스 히트 0 · 커넥터 카탈로그 행 0 · fetcher 0 |

## 1. 원문 전사 + 판정 — **원문 41종**(필수 필드 31 + Relationship Basis 10)

### 1-1. 필수 필드 — **원문 31종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_relationship_id | 관계 엔티티 자체 부재 | `ABSENT` |
| 2 | reporting_line_version_id | `reporting_line` grep 0 | `ABSENT` |
| 3 | supervisory_hierarchy_version_id | `supervisory` grep 0 | `ABSENT` |
| 4 | tenant_id | **패턴 실재** — `team.tenant_id`(`TeamPermissions.php:146`) · `app_user.tenant_id`(`UserAuth.php:155`) · 격리 경계 REAL | `LEGACY_ADAPTER`(컬럼 관례만 이식) |
| 5 | relationship_type_id | 타입 축 부재(§11 27종 표현 수단 0) | `ABSENT` |
| 6 | subordinate subject reference | 직원 아이덴티티 = `app_user.id` 뿐 · 관계의 종속측 참조 없음 | `ABSENT` |
| 7 | subordinate position reference | **Position 엔티티 자체 부재**(§16) | `ABSENT` |
| 8 | subordinate organization reference | `team.id` 인접 · 종속측 참조로 쓰이지 않음 | `ABSENT` |
| 9 | manager subject reference | `team.manager_user_id`(`:148`) = **조직당 1칸이지 관계행의 매니저 참조 아님** | `ABSENT`(§17 축) |
| 10 | manager position reference | Position 부재 | `ABSENT` |
| 11 | manager organization reference | 조직→조직 매니저 참조 0 · **`parent_team_id` 없음 → 팀 트리 자체가 없다** | `ABSENT` |
| 12 | relationship basis | 하기 10종 축 전부 부재 | `ABSENT` |
| 13 | primary 여부 | 🔴**규칙 10** — `team.manager_user_id` 가 1칸이라 "primary" 가 **우연히 참**. 복수 관계를 표현할 수단이 없어서지 정책이 아니다 | `ABSENT` |
| 14 | hierarchy forming 여부 | 계층 형성/비형성 구분 0 · 팀 트리 부재 | `ABSENT` |
| 15 | manager chain eligible 여부 | **manager chain 개념 0** · recursive manager query **0개** | `ABSENT` |
| 16 | approval routing eligible 여부 | 🔴**승인자 후보 계산 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **0**(`approver` 2건은 에러 메시지 문자열 `Mapping.php:248`,`:280`) | `ABSENT` |
| 17 | responsibility scope | `team.manager_user_id` 로 표현 불가(§4.6) | `ABSENT` |
| 18 | organization scope | `data_scope` 인접 — 🔴**`UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`)가 단일행을 스키마로 강제** → 복수 scope 불가 | `PARTIAL`(단일행 한정) |
| 19 | legal entity scope | **Legal Entity Officer `ABSENT`** — `ceo_name` = `app_user` 프로필 평문 문자열(`UserAuth.php:306-307`) · FK·감독관계 전무 | `ABSENT` |
| 20 | workspace scope | 워크스페이스 scope 축 0 | `ABSENT` |
| 21 | region scope | 🔴**`region` 3축 전부 무관** — 광고 인구통계(`Db.php:681`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`). `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 22 | country scope | `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용**이지 명부 아님 | `ABSENT` |
| 23 | program scope | 🔴**`pm_portfolio` "프로그램" = 주석 팬텀** — `Handlers/PM/Enterprise.php:13` 주석이 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | `ABSENT` |
| 24 | cost center scope | `cost_center` grep 0 | `ABSENT` |
| 25 | profit center scope | `profit_center` grep 0 | `ABSENT` |
| 26 | source system | 🔴**HRIS/ERP/Directory 전량 부재** — `hris`·`workday`·`bamboo`·`payroll`·`sap`·`netsuite`·`ldap`·`active_directory` **소스 히트 0** · 커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0 | `ABSENT` |
| 27 | source relationship id | 외부 상관자 3컬럼(`oidc_sub`·`oidc_provider`·`scim_external_id` `EnterpriseAuth.php:64-65`)은 **계정 상관자이지 관계 상관자 아님** | `ABSENT` |
| 28 | valid_from | `valid_from` grep **0** | `ABSENT` |
| 29 | valid_to | `valid_to` grep **0** (★`Onsite.php:396` `'invalid_token'` = 부분일치 위양성) | `ABSENT` |
| 30 | status | **패턴 실재** — `team.status`(`:148` `VARCHAR(20) DEFAULT 'active'`) · 갱신 화이트리스트 `['active','disabled','archived']`(`:490`) | `LEGACY_ADAPTER`(패턴만 이식) |
| 31 | evidence | 증거 첨부 축 0 | `ABSENT` |

### 1-2. Relationship Basis — **원문 10종**

🔴 **아래 10종 중 어느 것도 현행 3개 대체물로 커버되지 않는다**(§0 축 주의). 대체물은 **다른 축**이지 이 열거의 값이 아니다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SUBJECT_TO_SUBJECT | 🔴**`parent_user_id` 를 여기 매핑 금지** — 테넌트 소속 포인터 · owner 직속 2단 봉인(`UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`) · 판독 술어 전부 tenant 해석 | `ABSENT` |
| 2 | POSITION_TO_POSITION | Position 엔티티 부재(§16) | `ABSENT` |
| 3 | SUBJECT_TO_POSITION | Position 엔티티 부재 | `ABSENT` |
| 4 | POSITION_TO_SUBJECT | Position 엔티티 부재 | `ABSENT` |
| 5 | ORGANIZATION_TO_POSITION | Position 엔티티 부재 | `ABSENT` |
| 6 | ORGANIZATION_TO_SUBJECT | 🔴**`team.manager_user_id` 가 형태상 최근접이나 basis 값이 아니다** — basis 는 **관계행의 근거 유형 분류**이고 `manager_user_id` 는 **조직 테이블의 1칸**(§17 축). 판정은 §17 에서 `PARTIAL` | `ABSENT`(본 § 축) |
| 7 | OWNER_RELATIONSHIP | `team_role='owner'` 는 **롤 라벨**이지 관계 근거 아님 · owner 강등 차단(`TeamPermissions.php:773`)은 보호이지 관계 아님 | `ABSENT` |
| 8 | SOURCE_SYSTEM_REFERENCE | 🔴**manager 데이터를 싣는 소스가 0개** — SCIM `manager` **전역 0**(`urn:…enterprise:2.0:User` 0) · `sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` **2슬롯뿐 · `manager_attr` 없음** | `ABSENT` |
| 9 | MANUAL_GOVERNED | 수기 관계 등록 경로 0 | `ABSENT` |
| 10 | CUSTOM | 확장 축 0 | `ABSENT` |

**실측 개수: 41 / 41 전사** (측정기 41 · 원문 대조 41 · 전사 41 — **3자 일치**).
커버리지 = `ABSENT` 38 · `LEGACY_ADAPTER` 2 · `PARTIAL` 1. **`VALIDATED_LEGACY` 0 — 커버 0종.**

## 2. 규칙

- 🔴 **3개 대체물(`parent_user_id`·`team.manager_user_id`·`team_role='manager'`)을 Relationship Basis 10종에 매핑 금지.** 서로 다른 축이며, 매핑은 **갭이 정의상 소멸하는 역산**이다.
- 🔴 **`parent_user_id` 확장 금지가 선결 조건이다.** 3단 허용 = `resolveTenantId:200-217` 단일 홉 가정 붕괴 = **286차 하이재킹과 동형 사고**. Manager Relationship 은 **별도 엔티티**로 신설하고 `parent_user_id` 는 **테넌트 소속 축 그대로 보존**하라(무후퇴).
- 🔴 **"1개뿐이라 primary/단일 계층이 지켜지고 있다"로 계산 금지**(규칙 10). 현행이 1개인 것은 **여러 개를 표현할 수단이 없어서**다.
- **`hierarchy forming` + `manager chain eligible` 은 순환 탐지를 전제한다.** 이식 대상 = **`Handlers/PM/Dependencies.php:79-100`**(반복형 DFS · `$visited` · **tenant 필터 `:91` 매 홉** · **쓰기 전 차단 `:32-34`** 422 `cycle_detected` · self-loop `:29-31`).
  - ★**`:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → "Maximum Depth"로 계산하면 오판.
  - 🔴 **`pm_task_dependencies` 스키마 복제 금지** — `:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회**. 이 결함을 물려받으면 **§11 Manager Type 27종별 순환정책이 설계 시점에 이미 불가능**해진다.
  - 🔴 **`ChannelSync.php:955-962` 를 순환 검출기로 계산 금지** — `$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**.
- 🔴 **`approval routing eligible` 을 "현행이 준수 중"으로 읽지 마라**(규칙 10). 승인 경로 4개 전량이 **"호출자가 곧 승인자"**(`Mapping::approve:246` `actorId` = 요청자 본인 · `Catalog::approveQueue:2341-2365` **행위자를 읽지도 않음** · `AgencyPortal::approveAgency:370` `isTenantOwner` · `FeedTemplate::approveDraft:271` 라우트 게이트). **Manager 권한 자동상속을 안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.
- 🔴 **`source system`/`evidence` 를 "소스만 붙이면 된다"로 역산 금지** — §66 Reconciliation 은 **좌변(source)·우변(canonical) 양쪽 부재**다. **Canonical 선언이 선행**(양변 부재 → 자동 MATCH = **가짜녹색** = 288차 `ok=>true` 위장과 동형).
- 🔴 **`region`·`country`·`program` 스코프에 기존 동명 컬럼 재사용 금지** — 전부 도메인 상이(광고 인구통계 / Amazon Ads 엔드포인트 / WMS 시·도 / IP 언어 결정 / WebRTC 스트림명).
- 🔴 41종 **"있다고 가정"하고 배선 금지.**
