# DSAR — Organization Manager Binding (§17)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §17(894-928) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★`team.manager_user_id` = **§17 의 최근접 자산이나 `PARTIAL`**

3개 대체물 중 **§17 축에 유일하게 실제로 인접**한 것이다(§13 Relationship Basis 10종·§15 Subject Binding·§16 Position Binding 에는 **매핑 금지**).

| 축 | 실측 | 판정 |
|---|---|---|
| DDL | `TeamPermissions.php:148` — `manager_user_id INT NULL`(MySQL) / `:168`(SQLite). 🔴**`parent_team_id` 없음 → 팀 트리 자체가 없다**(`:146-150`) | 조직당 **1칸** |
| 🔴**쓰기경로** | ★**REAL** — `createTeam:463-469`: manager 수령 `:463` → **테넌트 소속 검증 `:464`**(`memberInTenant` 실패 시 **422**) → INSERT `:466` → `promoteManager:469`. 수정 `:492-495` → UPDATE `:500` → `promoteManager:501`. 조회 `:444-445` | **REAL** |
| ★**시드** | **`seedOrg:739` INSERT 컬럼 8개**(`tenant_id, name, description, team_type, status, created_by, created_at, updated_at`)**에 `manager_user_id` 부재** → **`ORG_PRESET` 시드 15팀 전부 manager NULL** | **비어 있음** |
| 부작용 | `promoteManager:768-776` — `app_user.team_role='manager'` + `team_id` UPDATE(`:774`) · **owner 강등 차단 `:773`** · 멤버 아니면 **무동작 `:772`** | REAL |

🔴 ★**정정 반영(ⓑ 실측)**: **"team owner 실사용 인용 금지"는 시드 축에 한해 참, 쓰기경로 축에서는 거짓.** 시드가 비었다는 사실로 **쓰기경로를 부재라 주장하면 오판**이다 — `createTeam`/`updateTeam` 은 **테넌트 소속 검증(422)까지 갖춘 실경로**다.

### 🔴 `manager_user_id` 의 4결격 — **`VALIDATED_LEGACY` 가 아닌 이유**

1. **표현력** — Type/Priority/Responsibility Scope 표현 불가(§4.6). **1칸에 참조 하나뿐.**
2. **단일값**(규칙 10) — Department Head / Country Manager / Cost Center Owner **병존 표현 불가**. "primary 가 지켜진다"는 **정책이 아니라 칸이 하나여서**다.
3. **시점 0** — `valid_from`·`valid_to`·`effective_from`(관계) **grep 0** · **이력 0**. ★`valid_to` 유일 히트 `Onsite.php:396` 은 **`'invalid_token'` 부분일치 = 위양성.**
4. **nullable + 강등 경로 0** — 하기 ★주의.

### 🔴 ★축 주의 — **공석 전환 시 "관계는 비고 권한은 남는다"**(§16 원문 요구와 정반대 현상)

§16 원문 890 은 *"Position이 공석이더라도 관계 자체를 삭제하지 마라"* 를 요구한다. **현행은 문제의 방향이 반대**다:

| 단계 | 코드 | 현상 |
|---|---|---|
| 공석 전환 | `updateTeam:492-495`(`$newMgr = null`) → UPDATE `:500` | `team.manager_user_id = NULL` — **관계 슬롯만 비워짐** |
| 강등 | 🔴**`:501` 이 `if ($newMgr !== null)` 일 때만 `promoteManager` 호출 → 강등 경로 0** | 🔴**전임자 `app_user.team_role='manager'` 잔존** |
| 교체 | `:500-501`(새 매니저 승격) | 🔴**전임자 강등 없음** → **매니저 2인 상태**(§76 실사례 1) |
| 결과 | `isManagerAdmin:136` · `putMemberPermissions:618` · `UserAuth.php:1064` | 🔴**전임자가 위임 권한을 계속 보유** = **§76 실사례 2 "Vacant Position 을 Active Manager 로 처리"** |

🔴 **"현행이 관계를 보존하고 있다"로 계산하면 정반대 오판이다 — 잔존은 보존이 아니라 권한 누수다.**
★**§76 실사례 3**: **Manager 라는 이유만으로 Approval Authority 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`) → `team_role='manager'` **문자열 하나에 승인 권한이 걸려 있다.**

### 🔴 §17 "예" 8종 인접 자산 실측 — **명부는 있어도 매니저는 없다**(규칙 9)

| 예 | 인접 자산 | 실측 |
|---|---|---|
| Brand Head | `catalog_brand`(`Catalog.php:151-169`) | `id·tenant_id·name·code·created_at·updated_at` · `UNIQUE(tenant_id,name)`. 🔴**관리자 필드 없음 — 명부는 REAL·매니저는 `ABSENT`** |
| Country Manager / Regional Head | `Geo.php:23-53` | IP→ISO alpha-2 **언어 결정용** — **탐지·라우팅이지 명부 아님**. `region` 3축 전부 무관(광고 인구통계 `Db.php:681`,`:690` / **Amazon Ads 엔드포인트 na·eu·fe** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0** |
| Department/Division/Business Unit Head | `ORG_PRESET` 15팀 | **열거+시딩 · 계층 링크 0** · ★시드가 `manager_user_id` 를 **비운다**(`:739`) · 🔴**`business_unit_id` = Trustpilot 자격증명**(오독 주의) |
| Cost/Profit Center Owner | — | `cost_center`·`profit_center` **grep 0** |

### 인접 오너 자산 — `pm_projects.owner_user_id` = `PARTIAL`(4결격)

migration `20260526_168_001:13` · `KEY idx_pm_proj_owner :21` · 쓰기 `Handlers/PM/Projects.php:58`,`:66`,`:113`.
🔴 ① **`WHERE owner_user_id` grep 0 = 판독 술어 0**(인가·승인라우팅·감독 효과 **없음** → **저장된 라벨**) ② **무검증 자유문자열**(`Projects.php:112-117` `validId()` 없음 · `PMSettings.jsx:166-167` 맨 `<input>` · `app_user` FK 없음) ③ **기본값이 생성자**(`:66` `?? $g['user_id']`) → **미설정 행과 구분 불가** ④ **단일값**(규칙 10).
🔴 **CRM Account Owner `ABSENT`** — `CRM.php` 1659줄 전수 grep: `owner`·`assigned`·`sales_rep`·`account_owner`·`assignee`·`manager` **전부 0**(**고객 도메인이며 Account 아님**).

## 1. 원문 전사 + 판정 — **원문 23종**(필수 필드 15 + 예 8)

### 1-1. 필수 필드 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_manager_binding_id | 바인딩 엔티티 부재 — 현행은 **`team` 테이블의 1칸**이지 바인딩 행이 아니다 | `ABSENT` |
| 2 | organization unit id | **`team.id`**(`TeamPermissions.php:146`) — 조직 단위 실재. 🔴**단 `parent_team_id` 없음 → 계층 없는 평면 목록** | `PARTIAL` |
| 3 | manager subject or position reference | **`team.manager_user_id`**(`:148`) — ★**쓰기경로 REAL**(`createTeam:463-469` 테넌트 검증 `:464` 422 → INSERT `:466` → `promoteManager:469` · 수정 `:492-501`). 🔴**단 Subject 만 · Position 부재(§16) · 시드는 비어 있음(`:739`)** | `PARTIAL` |
| 4 | relationship type | §11 Manager Type 27종 표현 수단 0 · `team.team_type VARCHAR(48)` 은 **무검증 대입**(`createTeam:461`)이며 **팀 유형이지 관계 유형 아님** | `ABSENT` |
| 5 | manager role | 🔴**하기 8종(Department Head 등) 어느 것도 표현 불가** — `team_role ∈ {owner,manager,member}` 는 **테넌트 RBAC 롤**(`UserAuth.php:168`)이지 조직 매니저 역할 아님 | `ABSENT` |
| 6 | responsibility scope | `data_scope` 인접 — 🔴**`UNIQUE(tenant_id,subject_type,subject_id)`(`:164`) = 단일행이 스키마로 강제**(규칙 10 — 정책이 아니라 UNIQUE 가 복수를 금지). ⚠️**`ORG_PRESET` 15팀 중 8팀 scope 실효 없음**(`'재무팀' => 'company'` `:717` = **무제한 센티넬** `effectiveScope():258` · `partner`(`:720-721`)·`campaign`(`:708-710`,`:718`) **소비처 0 → 영원히 무제한**). **등급 미부여**(설계 의도 미확인) | `PARTIAL` |
| 7 | legal entity scope | **Legal Entity Officer `ABSENT`** — `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720` · `:1183` 가입 필수검사) · FK·감독관계·승인라우팅·시점 **전무**. 🔴**`DATA_SCOPES` `'company'` = 무제한 센티넬**이지 **법인 아님** | `ABSENT` |
| 8 | country scope | 🔴**`Geo.php:23-53` = IP→ISO alpha-2 언어 결정용** — 탐지이지 명부·스코프 아님 | `ABSENT` |
| 9 | program scope | 🔴**`pm_portfolio` "프로그램" = 주석 팬텀** — `Handlers/PM/Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐). **규칙 8 적중** | `ABSENT` |
| 10 | primary 여부 | 🔴**규칙 10 적중** — `team.manager_user_id` 가 **1칸**이라 "primary" 가 **우연히 참**. 복수 매니저를 표현할 수단이 없어서지 정책이 아니다. **준수로 계산 금지** | `ABSENT` |
| 11 | approval routing eligible 여부 | 🔴**승인자 후보를 계산하는 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **0**(`approver` 2건은 에러 메시지 문자열 `Mapping.php:248`,`:280`). ★**현행은 정반대** — `team_role='manager'` **문자열만으로 승인/위임 권한 자동 부여**(`UserAuth.php:1064`·`TeamPermissions.php:136`) = **eligible 판정이 아니라 무조건 부여**(§76 실사례 3) | `ABSENT` |
| 12 | valid_from | `valid_from` grep **0** | `ABSENT` |
| 13 | valid_to | `valid_to` grep **0** (★`Onsite.php:396` `'invalid_token'` = 부분일치 위양성) | `ABSENT` |
| 14 | status | **패턴 실재** — `team.status VARCHAR(20) DEFAULT 'active'`(`:148`) · 화이트리스트 `['active','disabled','archived']`(`:490`). 🔴**단 팀 상태이지 바인딩 상태 아님** | `LEGACY_ADAPTER`(패턴만 이식) |
| 15 | evidence | 증거 첨부 축 0 · §66 Reconciliation 은 **좌·우변 이중 부재** | `ABSENT` |

### 1-2. 예 — **원문 8종**

★**원문은 이를 `예:`(예시)로 제시한다** — 필수 열거가 아니다. 전사하되 **강제 축으로 계산하지 마라.**
🔴 **8종 전부 `manager role` 축의 값이며, 현행은 그 축 자체가 없다**(§1-1 #5 `ABSENT`).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Department Head | `ORG_PRESET` = **열거+시딩 · 계층 링크 0** · ★시드가 `manager_user_id` 를 **비운다**(`:739`) · `department_head_id` grep **0** | `ABSENT` |
| 2 | Division Head | `division` 조직 축 0 | `ABSENT` |
| 3 | Business Unit Head | 🔴**`business_unit_id` = Trustpilot 자격증명**(오독 주의) · 조직 BU 축 0 | `ABSENT` |
| 4 | Country Manager | 🔴**`Geo.php:23-53` = IP→ISO alpha-2 언어 결정용** — 명부 아님 | `ABSENT` |
| 5 | Regional Head | 🔴**`region` 3축 전부 무관** — 광고 인구통계(`Db.php:681`,`:690`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`) · `APAC`/`EMEA`/`LATAM` **0**. 🔴**`wms_warehouses.manager`(`Wms.php:62`/`:112`)는 `region`·`country` 와 같은 테이블에 공존해 오독하기 쉬우나 시설 담당자 자유텍스트**(FK 0 · 판독 술어 0) → `NAME_ONLY` | `ABSENT` |
| 6 | Brand Head | 🔴**명부는 REAL·매니저는 `ABSENT`**(규칙 9) — `catalog_brand`(`Catalog.php:151-169`) = `id·tenant_id·name·code·created_at·updated_at` · **관리자 필드 없음** | `ABSENT` |
| 7 | Cost Center Owner | `cost_center` grep **0** | `ABSENT` |
| 8 | Profit Center Owner | `profit_center` grep **0** | `ABSENT` |

**실측 개수: 23 / 23 전사** (측정기 23 = 필수 필드 15 + 예 8 · 원문 대조 23 · 전사 23 — **3자 일치**).
커버리지 = `ABSENT` 19 · `PARTIAL` 3 · `LEGACY_ADAPTER` 1. **`VALIDATED_LEGACY` 0 — 커버 0종.**

## 2. 규칙

- 🔴 **`team.manager_user_id` 는 §17 의 최근접 자산이나 `PARTIAL` 이지 커버가 아니다.** 4결격 — ① Type/Priority/Responsibility Scope 표현 불가 ② **단일값**(규칙 10) ③ **시점·이력 0** ④ **강등 경로 0**. **"이미 있다 → 확장만 하면 된다"로 계산하면 규칙 9 위반**(미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).
- 🔴 ★**쓰기경로와 시드를 구분하라(정정 반영).** `createTeam:463-469`·`updateTeam:492-501` 은 **테넌트 소속 검증(`:464` 422)까지 갖춘 REAL 경로**다. **"team owner 실사용 인용 금지"는 시드 축(`seedOrg:739` — 15팀 전부 manager NULL)에 한해 참이며, 쓰기경로 축에서는 거짓**이다. 시드가 비었다는 사실로 쓰기경로를 부재라 주장하면 **오판**.
- 🔴 **`promoteManager` 의 짝(강등 경로)을 반드시 함께 설계하라 — 본 §의 최우선 결함.** `:501` 이 `$newMgr !== null` 일 때만 호출 → **공석 전환·교체 양쪽에서 전임자 `team_role='manager'` 잔존** → `isManagerAdmin:136`·`putMemberPermissions:618`·`UserAuth.php:1064` **위임/승인 권한 계속 보유**(§76 실사례 1·2). 🔴**"관계가 보존되고 있다"로 읽지 마라 — 잔존은 보존이 아니라 누수다.**
- 🔴 **`approval routing eligible` 을 "현행 manager 가 이미 승인한다"로 계산 금지.** 현행은 **eligible 판정이 아니라 무조건 부여**다 — `team_role='manager'` **문자열 하나에 승인 권한이 걸려 있다**(§76 실사례 3). 승인자 **후보를 계산하는 코드 자체가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` **0**).
  - ★**규칙 10 적중**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.
  - 🔴 **통합 시 주의**: `Catalog::approveQueue:2341-2365` 는 `Mapping` 의 maker-checker(actor `:246` · 정족수 `:287` · 자기승인 차단 `:268-271` · dedup `:278-283`)를 **전혀 갖지 않는다**(🔴`:2341-2365` 는 **행위자를 읽지도 않는다** · `:2343` `requirePro` = **구독 플랜** 게이트). **"중복 제거"로 포장하면 `Mapping` 의 능력이 소실**된다(규칙 9).
- 🔴 **`manager role` 8종(예)을 `team_role` 로 표현하려 하지 마라** — `team_role ∈ {owner,manager,member}` 는 **테넌트 RBAC 롤**이지 조직 매니저 역할이 아니다. 8종은 **원문상 `예:`(예시)이며 강제 열거가 아니다** — 축은 `manager role` 자체다.
- 🔴 **"명부가 있으니 매니저도 있다"로 계산 금지**(규칙 9). `catalog_brand` = **명부 REAL · 관리자 필드 0**. `ORG_PRESET` = **열거+시딩 · 계층 링크 0 · manager 비움**.
- 🔴 **`region`·`country`·`program`·`business_unit_id` 에 기존 동명 자산 재사용 금지** — 전부 도메인 상이(광고 인구통계 / **Amazon Ads 엔드포인트** / **WMS 시·도** / IP 언어 결정 / **LiveCommerce WebRTC 스트림명** / **Trustpilot 자격증명**).
- 🔴 **`pm_projects.owner_user_id` 를 선례로 복제 금지** — **판독 술어 0**(`WHERE owner_user_id` grep 0) · **무검증 자유문자열**(FK 없음) · **기본값이 생성자**(미설정 행과 구분 불가) · **단일값**. **저장된 라벨이지 감독 관계가 아니다.**
- **`responsibility scope` 설계 시 `data_scope` 의 `UNIQUE(tenant_id,subject_type,subject_id)`(`:164`) 를 복제하지 마라** — **단일행을 스키마로 강제**하므로 복수 scope 가 **설계 시점에 이미 불가능**해진다.
- 🔴 23종 **"있다고 가정"하고 배선 금지.**
