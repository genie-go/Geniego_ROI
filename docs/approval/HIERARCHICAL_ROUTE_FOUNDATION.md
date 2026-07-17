# Hierarchical Route Foundation

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §28, §29 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §28. Hierarchical Route Foundation (원문 줄 1436-1491 · 분모 29)

원문 전제: *"Hierarchical Route는 Reporting Line과 Organization Hierarchy를 사용하여 Level Requirement를 정의한다."*
→ 이 전제의 두 입력(§3.1 Organization Foundation · §3.2 Reporting Line Foundation)이 **양쪽 다 REAL 0**이다. 따라서 아래 21개 필수 속성은 "아직 안 만들었다"가 아니라 **만들 재료가 없다**.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | hierarchy source type | 8종 열거 어느 것도 이름·능력 0(아래 #22-29). 계층 원천을 선택할 대상 자체가 없음 | ABSENT |
| 2 | reporting line type | §3.2 REAL 0. `parent_user_id` 판독자 12+ 전량 1홉·목적=tenant 해석(`UserAuth::resolveTenantId:207-215`·`Rollup.php:56-61`·`ChannelSync.php:72`) 또는 `IS NULL` owner 판별(`PlanLimits.php:37`·`UserAuth.php:41`) | BLOCKED_PREREQUISITE |
| 3 | supervisory hierarchy type | 상급자(사람) 반환 함수 0. `resolveApprover`/`next_approver`/`approval_level` 승인 히트 0 | BLOCKED_PREREQUISITE |
| 4 | starting subject source | 시작 주체를 해석할 Subject 축 부재. 권한 축 2벌 분열(`$roleRank` `backend/public/index.php:554` ↔ `team_role`, 매핑 코드 0) | BLOCKED_PREREQUISITE |
| 5 | starting position source | Position 축 이름·능력 0. `pm_task*`·`position_idx`(`Handlers/PM/Tasks.php:167`)는 정렬 인덱스 · `position_based`(`AttributionEngine.php:32`)는 U자형 기여도 | ABSENT |
| 6 | starting organization source | §3.1 REAL 0. `ORG_PRESET`=PHP 상수 15줄(`TeamPermissions.php:706-722`) · `seedOrg:739` INSERT 에 parent·manager 컬럼 부재 · `team`(`:143-151`) `parent_team_id` 없음 | BLOCKED_PREREQUISITE |
| 7 | manager relationship type | 🔴 `parent_user_id` 는 상급자를 표현할 수 없다 — 전 4 생성경로 owner 하드고정(#3 참조) | BLOCKED_PREREQUISITE |
| 8 | hierarchy direction | 사람 축 상향/하향 순회 선례 0. 유일 DB 상향순회=`AdminMenu::wouldCycle:540-555`(**메뉴 트리**) | ABSENT |
| 9 | required depth | 다단 순회기 부재 → depth 개념 성립 불가. `pm_tasks.parent_task_id`(`migrations/20260526_168_002_create_pm_tasks.sql:8`)조차 순회기 0 | BLOCKED_PREREQUISITE |
| 10 | minimum depth | 상동. 하한 검사 대상 경로 없음 | BLOCKED_PREREQUISITE |
| 11 | maximum depth | 유일 유사물=`AdminMenu::wouldCycle:545` `$depth < 100`(메뉴 트리 · 무한루프 방지 상수이지 정책 아님 · `$visited` 없음 · tenant 없음) | BLOCKED_PREREQUISITE |
| 12 | root handling | 루트 도달 판별 술어=`parent_user_id IS NULL`(`UserAuth.php:41` 등) 이나 owner 판별 목적. 체인 루트 처리 정책 0 | BLOCKED_PREREQUISITE |
| 13 | missing level policy | `MISSING_MANAGER_POLICY` 형태 유사물=`UserAuth.php:1226-1227`(정책 아니라 **평면화 하드코딩**) · `MANAGER_VACANCY`=`TeamPermissions.php:444` `if(!empty(...))` **표시 생략**뿐 | BLOCKED_PREREQUISITE |
| 14 | duplicate manager policy | 승인자 dedup 선례=`Mapping.php:278-283` 1곳(4경로 중). 단 이는 동일 건 내 중복승인 차단이지 계층 중복 매니저 정책 아님 | BLOCKED_PREREQUISITE |
| 15 | same actor across level policy | Level 개념 자체가 부재 → 레벨 간 동일 행위자 판정 불가. 자기승인 차단=`Mapping.php:268-271` 1곳뿐(단일 단계) | BLOCKED_PREREQUISITE |
| 16 | legal entity boundary policy | Legal Entity 이름·능력 0. 유일 히트 `MarketingDataHub.php:181` "한국 법인 철수"=데모 문자열. `effectiveScope:258` `'company'`→null(**무제한 센티넬** · 법인 아님) | ABSENT |
| 17 | organization boundary policy | 조직 경계 축 0. `wms_warehouses`(`Wms.php:59-65`) 실 행이나 완전 평면 · `manager`=FK 아닌 VARCHAR(120) | BLOCKED_PREREQUISITE |
| 18 | country boundary policy | `country_code` 전량 오염 — TikTok 리포트 차원(`Connectors.php:2044`,`:2071`) · IP Geo(`Geo.php:106`). 조직 국가 경계 0 | ABSENT |
| 19 | matrix branch reference | 매트릭스(이중 보고선) 축 0. `team.manager_user_id`(`TeamPermissions.php:148`) **팀당 1칸** → 구조적으로 단일 보고선만 표현 가능 | ABSENT |
| 20 | snapshot requirement | 스냅샷 선례 실재하나 전부 타 도메인 — `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`) · `pm_baseline.snapshot_json`(`Handlers/PM/Enterprise.php:360`). Hierarchy/Chain 도메인 0 | ABSENT |
| 21 | evidence requirement | Evidence 축 0. 감사 정본 선례=`SecurityAudit.php:27`(tenant 포함 해시)·`:45-52` DDL·`:56-68` `hash_equals` 검증기 — 그러나 Route 도메인 미배선 | ABSENT |
| 22 | REPORTING_LINE | 이름·능력 0(#2) | ABSENT |
| 23 | SUPERVISORY_PATH | 이름·능력 0. `escalat` grep=`Reviews.php:173-187` 부정리뷰 Slack 통지(오염) | ABSENT |
| 24 | ORGANIZATION_HIERARCHY | 이름·능력 0(#6). 레포 유일 tenant 격리 자기참조 트리=`pm_tasks.parent_task_id` — 🔴 순회기 0(저장·정렬·투영 7히트뿐: `PM/Tasks.php:30`,`:35`,`:114`,`:167` · `PM/Gantt.php:39`) → **이름은 트리, 능력은 평면 리스트** | ABSENT |
| 25 | POSITION_HIERARCHY | 이름·능력 0(#5) | ABSENT |
| 26 | FUNCTIONAL_HIERARCHY | 이름·능력 0 | ABSENT |
| 27 | REGIONAL_HIERARCHY | 이름·능력 0(#18) | ABSENT |
| 28 | FINANCIAL_HIERARCHY | 이름·능력 0. `business_unit_id`=Trustpilot 자격증명 · `company_id`=Adobe Analytics 자격증명(오염) | ABSENT |
| 29 | CUSTOM | 이름·능력 0 | ABSENT |

원문 §28 말미의 Level Requirement 예시 코드블록(줄 1479-1488, `Level 1: DIRECT_MANAGER, distance=1` 등)은 **필수 속성 열거가 아니라 산출 형태 예시**다 → 분모 29에 포함하지 않았다(§2에 계약으로 반영).

### §29. Manager-of-manager Route (원문 줄 1492-1518 · 분모 17)

🔴🔴 **§29는 데이터가 비어서가 아니라 쓰기 경로가 그렇게 코딩돼 있어서 불가능하다.** `parent_user_id` 의 **전 4 생성경로가 owner 로 하드고정**된다:

| 생성경로 | 실측 | 결과 |
|---|---|---|
| `UserAuth::createTeamMember:1225-1227` | 주석 자인 *"항상 최상위 owner 에 종속: manager 가 추가해도 parent 는 최상위 owner"* — `$parentId = (($caller['team_role']??'')==='manager' && !empty($caller['parent_user_id'])) ? (int)$caller['parent_user_id'] : $ownerId;` → manager 가 만든 멤버의 parent = **manager 자신이 아니라 manager 의 parent(=owner)** | 2단 체인 생성 자체를 코드가 능동 차단 |
| `EnterpriseAuth::provisionUser:502` | `(int)$owner['id']` 하드고정(`:494` `WHERE team_role='owner'` 로 조회한 행) | 상동 |
| `UserAdmin::createSubAdmin`(`UserAuth.php:1549`,`:1576`) | `parent=$masterId` | 상동 |
| sub 계정생성 차단(`UserAuth.php:1254-1256`) | 403 — 하위 관리자는 계정 생성 불가 | 3단 이상 원천 차단 |

→ **전 멤버 상급자 = owner 1단 평면.** 컬럼 재사용 불가 · **쓰기 경로부터 변경 필요**.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | base manager relationship type | 관계 유형 축 0. `parent_user_id` 단일 컬럼이 owner 종속만 표현(위 표) | BLOCKED_PREREQUISITE |
| 2 | starting point | 시작점 해석기 0. `parent_user_id` 판독자 12+ 전량 1홉·tenant 해석 목적(`UserAuth::resolveTenantId:207-215`) | BLOCKED_PREREQUISITE |
| 3 | chain distance | distance 개념 부재 — 전 생성경로가 owner 하드고정이라 **실현 가능한 distance = 1 뿐** | BLOCKED_PREREQUISITE |
| 4 | exact distance 여부 | 상동. 정확거리/최소거리 구분 대상 없음 | BLOCKED_PREREQUISITE |
| 5 | minimum distance | 상동 | BLOCKED_PREREQUISITE |
| 6 | maximum distance | 상동. 유일 depth 상한=`AdminMenu::wouldCycle:545` `$depth<100`(메뉴 트리) | BLOCKED_PREREQUISITE |
| 7 | skip duplicate subject policy | 사람 축 순회 부재 → 중복 주체 발생 자체가 없음(규칙 7: **대상 부재를 준수로 계산 금지**). ★오탐 주의: `CRM::resolveIdentitiesForTenant:608` `while ($parent[$x] !== $x)` = **Union-Find 경로압축**(메모리 배열 · 고객 아이덴티티 병합 · 조직 무관) | BLOCKED_PREREQUISITE |
| 8 | root reached policy | 루트=owner 이며 **모든 멤버가 1홉만에 루트 도달** → 정책이 걸릴 자리가 없음 | BLOCKED_PREREQUISITE |
| 9 | missing intermediate manager policy | 중간 매니저가 구조적으로 존재하지 않음(위 표). `UserAuth.php:1226-1227` 은 정책이 아니라 **평면화 하드코딩** | BLOCKED_PREREQUISITE |
| 10 | cross legal entity policy | Legal Entity 이름·능력 0(§28 #16) | ABSENT |
| 11 | manager chain snapshot requirement | Chain 도메인 스냅샷 0. `team.manager_user_id` 변경은 `TeamPermissions.php:495` **덮어쓰기**(이전 값 소멸) → as-of 재구성 불가 | ABSENT |
| 12 | fallback reference | Fallback 축 0. 🔴 인접 폴백 선례는 **전부 복제 금지 대상** — `JourneyBuilder::nextNode:811-812` 무라벨 위치 폴백(286차 실 오발송 장애 · 주석 `:801-803` 자인) · `:814` 첫 후보 반환 · `pickWeighted:729` 첫 키 폴백 | ABSENT |
| 13 | 실제 Manager Subject Resolution (후속 블록) | 원문이 후속 블록으로 명시 이관. 코드 실측=`resolveApprover`/`approval_chain`/`next_approver`/`approver_id` 승인 히트 0 · **4경로 전량 "호출자가 곧 승인자"** | ABSENT |
| 14 | Candidate Eligibility (후속 블록) | 원문 후속 이관. 코드 실측=후보 집합 생성 코드 전무 | ABSENT |
| 15 | Authority Check (후속 블록) | 원문 후속 이관. 코드 실측=🔴 `acl_permission.approve` 는 **완전한 장식** — `TeamPermissions::ACTIONS:39` 에 실재 · `seedOrg:711` 실제 시드 · 그러나 **읽어서 승인 가부를 판정하는 코드 0** | ABSENT |
| 16 | Terminated Manager 대체 (후속 블록) | 원문 후속 이관. 코드 실측=매니저 상태·재직 축 0 | ABSENT |
| 17 | Acting Manager 우선순위 (후속 블록) | 원문 후속 이관. 코드 실측=대행 축 0. 오염 주의: `대행`→배송/구매대행·광고대행사·PG · `UserAdmin::impersonate:472`=플랫폼 admin 대행열람(2h·`:499` 감사)이지 승인 대행 아님 | ABSENT |

#13-17은 원문이 *"다음은 후속 블록에서 처리한다"* 로 **명시 이관**한 항목이다. 판정은 **레포 코드 현황**(전량 부재)을 기록한 것이며, 이 블록의 미이행을 뜻하지 않는다.

## 2. 설계 계약

### 2.1 §28 산출 형태 계약
§28은 **실제 Manager Subject를 확정하지 않는다**(원문 줄 1475). 이 블록의 산출은 Requirement 뿐이며, 원문 예시(줄 1479-1488)의 형태를 계약으로 고정한다:

```text
Level 1: DIRECT_MANAGER, distance=1
Level 2: DIRECT_MANAGER chain, distance=2
Level 3: ORGANIZATION_HEAD, organization_type=BUSINESS_UNIT
```

→ Level Requirement 는 **주체(사람)가 아니라 관계 서술**이다. 후속 구현이 이 자리에 `user_id` 를 채워 넣으면 §28 위반이다.

### 2.2 쓰기 경로 선변경 계약 (§29 핵심)
Manager-of-manager 를 가능하게 하려면 **읽기(Resolver) 이전에 쓰기 경로 4곳을 먼저 고쳐야 한다**. 순서를 뒤집으면 Resolver 는 영원히 distance=1 만 반환한다.

1. `UserAuth::createTeamMember:1225-1227` — 평면화 하드코딩 제거, `parent_user_id = $caller['id']`(실 상급자) 허용
2. `EnterpriseAuth::provisionUser:476` — **시그니처에 manager 파라미터 자체가 없다**. 파라미터 추가 + `:502` 의 `(int)$owner['id']` 를 해석된 manager 로 대체
3. `UserAdmin::createSubAdmin`(`UserAuth.php:1549`,`:1576`) — `parent=$masterId` 고정 해제
4. `UserAuth.php:1254-1256` — sub 계정생성 차단이 다단 조직의 정당한 케이스를 막는지 재검토

🔴 **`parent_user_id` 재사용은 금지한다.** 이 컬럼은 12+ 판독자가 **tenant 해석 술어**로 쓰고 있어(`resolveTenantId:207-215`·`Rollup.php:56-61`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`), 의미를 "실 상급자"로 바꾸면 **테넌트 해석이 전역 붕괴**한다. Reporting Line 은 **별도 축**으로 신설하고 `parent_user_id` 의 tenant 해석 의미는 보존하라(무후퇴).

### 2.3 SCIM manager 수용 계약
`EnterpriseAuth` 가 읽는 SCIM 키 = `userName`/`emails[0].value`/`name.*`/`externalId`(`:364-367`) + `groups`(`:374`). **Enterprise User 확장 `manager` 파싱 0** · `department`/`title`/`employeeNumber` 0. `scimUpdateUser:388-395` 는 `active`/`name` 만 처리 → **IdP 가 manager 를 보내도 무음 폐기된다.**
→ 계약: manager 미수용을 **무음 폐기가 아니라 명시 거부 또는 명시 미지원 응답**으로 정직화하라(§72-25 "미구현을 구현 완료로 기록하지 마라" 정합).
→ 병기: `groups` 도 SCIM `:375` 만 전달하고 **OIDC `:240`·SAML `:294` 는 인자 생략 → `[]`** — manager 축 신설 시 동일 함정 반복 금지.

### 2.4 순회기 신설 계약
사람 축 다단 상향 순회는 **선례가 0**이다. 유일 DB 상향순회 `AdminMenu::wouldCycle:540-555` 를 참조하되 **결함 3건은 복제 금지**:
- `$visited` 집합 **없음** → 사이클 시 `$depth<100` 소진까지 공회전
- **tenant_id 술어 없음**(`:107-118` DDL 에도 없음) → 테넌트 격리 붕괴
- 홉마다 단건 SELECT → N+1(285차 실 장애 패턴)

→ **확장 기반 정본 = `backend/src/Handlers/PM/Dependencies.php:79-100`**(반복 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + 쓰기 전 차단 `:32-34` 422 `cycle_detected`). 알고리즘을 추출·재사용하되 **스키마 복제 금지**.
🔴 `Dependencies.php:32-34` 는 422 조기반환하여 `:48` `auditLog` **미도달** → **순환 탐지 시 감사 이벤트 없음**. 이 결함은 이식하지 마라.
🔴 경로 표기: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 산출 25편 오표기).

## 3. 미결·선행조건

### 3.1 ★선행조건이 0%다 — 문서 존재를 구현 존재로 계산하면 역산이다
**289차 5-3-3-1/5-3-3-2 산출 151편(70편 + 81편)은 문서상 계약뿐이다.** ADR 자인:
`docs/architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md:163` — *"실 코드·테이블 0건"*.

→ §28·§29 의 선행조건인 §3.1 Organization Foundation(12) · §3.2 Reporting Line Foundation(16) 은 **REAL 0**이다. 산출 문서를 선행조건 충족으로 계산하면 커버리지가 **정의상 100%** 가 된다(규율 규칙 2 역산 금지).

### 3.2 §28 vs §29 의 차단 성격이 다르다
| 섹션 | 차단 성격 |
|---|---|
| §28 | **재료 부재** — Organization Hierarchy·Reporting Line 이 없어 Level Requirement 를 정의할 입력이 없다. 데이터를 넣으면 풀린다. |
| §29 | 🔴 **쓰기 경로 코딩** — 데이터가 비어서가 아니다. 전 4 생성경로가 owner 하드고정이라 **DB 에 2단 체인이 물리적으로 적재될 수 없다**. 스키마·데이터 이관이 아니라 **애플리케이션 코드 변경**이 선결이다. |

### 3.3 분모 대조
- §28: 필수 속성 21 + Hierarchy Source Type 8 = **29행 / 분모 29** 일치
- §29: 기록 항목 12 + 후속 블록 이관 5 = **17행 / 분모 17** 일치
- 원문 예시 코드블록(줄 1479-1488)은 항목 열거가 아니므로 분모 제외 → §2.1 계약으로 반영

### 3.4 판정 분포
| 판정 | §28 | §29 | 계 |
|---|---|---|---|
| BLOCKED_PREREQUISITE | 12 | 9 | 21 |
| ABSENT | 17 | 8 | 25 |
| **REAL / VALIDATED_LEGACY** | **0** | **0** | **0** |

### 3.5 후속 승인세션 대상 (이 세션 코드변경 0)
1. Reporting Line 축 **신설**(`parent_user_id` 재사용 금지 — §2.2)
2. 쓰기 경로 4곳 평면화 해제(§2.2) — **Resolver 보다 먼저**
3. tenant 격리 상향 순회기(`PM/Dependencies.php:79-100` 확장 · §2.4)
4. SCIM manager 수용 또는 명시 미지원 정직화(§2.3)
