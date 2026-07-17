# DSAR — Organization Position Unit Foundation (§39)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §39 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`position_unit` / `hierarchy_level` / `vacancy` | ★**PM 직접 재확인 — `backend/src` 전역 grep = 0건** | `ABSENT` |
| ★직위 표현의 전량 | **컬럼 2개뿐** — `app_user.team_role VARCHAR(40) NULL`(`UserAuth.php:168`) · `app_user.admin_level VARCHAR(20) NULL`(`UserAuth.php:171`) | `NAME_ONLY` |
| `team_role` 값 | `owner` > `manager` > `member` **문자열 3종**(`TeamPermissions.php:17`) — **열거이지 레지스트리 아님** | `NAME_ONLY` |
| `admin_level` 값 | `master` \| `sub`(`UserAuth.php:170-172` 주석 *"하위 관리자(sub-admin) 체계: admin_level('master'\|'sub'), admin_menus(JSON 허용 메뉴 경로 배열)"*) | `NAME_ONLY` |
| `team.manager_user_id` | `TeamPermissions.php:145-151` — 팀당 관리자 **1명 포인터**. ★단 `team` DDL 에 **`parent_team_id` 없음** → 팀 계층 0 | `PARTIAL`(§39 의 manager eligible 아님) |
| `app_user.parent_user_id` | `UserAuth.php:156-167`(nullable) — ★**용도 = 한 테넌트 안 사용자 트리 + owner→member tenant 상속**(`:197`,`:214`) · **전 생성 경로가 owner 직속 2단**(`:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`) · 순회 = **단일 홉**(`resolveTenantId` `:200-217`) | `KEEP_SEPARATE_WITH_REASON`(보고선 아님) |
| `reports_to` / `manager_id` | **grep 0**(단 `team.manager_user_id` 는 존재) | `ABSENT` |
| `ORG_PRESET` 15단위 | `TeamPermissions.php:706-722` — 팀 **이름** 열거 + 기본 scope/perms · `seedOrg`(`:725-753`) 실배선 | ★**구조가 아니라 열거** |
| SCIM Users | `EnterpriseAuth` — **CRUD 5개 실배선**(`routes.php:915-932`) · 프로비저닝 시 `parent_user_id = (int)$owner['id']` **고정**(`EnterpriseAuth.php:500`) | `LEGACY_ADAPTER` |
| SCIM Groups | ★**GET 전용**(`scimListGroups` `EnterpriseAuth.php:417-423` · `routes.php:932`) — 내부 `team` 을 **투영해 내보낼 뿐 IdP→내부 인입 경로 없음** | `PARTIAL` |
| `sso_group_role_map` | `EnterpriseAuth.php:70`,`:72` — `(tenant_id, group_name, role)` · 해석 `roleForGroups:78-85` · 어설션 `groups` 수신 `:374` → ★**그룹이 엔티티가 아니라 평문 문자열** · `group_name IN (?)` 단순 룩업(`:84`) | `NAME_ONLY` |
| HRIS/HR 커넥터 | 능력축 증명 — `ChannelRegistry` `group_type`(`:12`,`:79`)·`sync_kind` 열거에 **`hr`·`hris` 값 없음** · `workday`/`payroll` grep 0 | `ABSENT` |

**★축 주의 — `team_role` 은 직위(Position)가 아니라 권한 등급이다.**
`team_role`(owner|manager|member — `TeamPermissions.php:17`)은 **3값 문자열 열거**다. Position 은 **레지스트리 엔티티**(코드·직함·분류·계층레벨·재직자·공석 상태)를 요구한다. 현행에는 ⓐ **직위 마스터 테이블이 없고** ⓑ **계층 레벨이 없고**(`hierarchy_level` grep 0) ⓒ **재직자/공석 개념이 없다**(`vacancy` grep 0 — 사용자가 곧 역할이므로 **공석이 표현 불가능**). → **18필수필드 중 실재 0** · `NAME_ONLY`.

**★축 주의 2 — `parent_user_id` 는 보고선이 아니다.**
유일한 부모-자식 간선이나 ⓐ **전 생성 경로가 owner 직속 2단**(3단을 만드는 경로가 **존재하지 않는다**) ⓑ 순회가 **단일 홉**(`:200-217` — `LIMIT 1` 1회 후 즉시 return · 재귀 없음) ⓒ **용도 = tenant 상속**(`:197`·`:214` 동일값 UPDATE). 🔴 **보고선(reporting line)으로 계산하면 역산.**

## 1. 원문 전사 + 판정 — **원문 18종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | position_unit_id | ★**`position_unit` 전역 0** | `ABSENT` |
| 2 | position registry reference | 부재 — 직위 레지스트리 자체가 없음 | `ABSENT` |
| 3 | organization unit | **`organization_unit` 전역 0** | `ABSENT` |
| 4 | position code | 부재 — 직위 코드 축 0 | `ABSENT` |
| 5 | position title | 부재 — 🔴 `app_user.team_name`(`UserAuth.php:169`)은 **팀 이름 문자열**이지 직함 아님 | `ABSENT` |
| 6 | position category | 부재 · ⚠️ 인접 = `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)이나 **평면 문자열 카탈로그**이며 팀 분류이지 직위 분류 아님 | `NAME_ONLY` |
| 7 | hierarchy level | ★**`hierarchy_level` 전역 0** · 🔴 `team_role` 3값(`:17`)은 **권한 등급**이지 조직 계층 레벨 아님 | `ABSENT` |
| 8 | executive level | 부재 — 임원 축 0 | `ABSENT` |
| 9 | manager eligible 여부 | 부재 · ⚠️ 인접 = `team.manager_user_id`(`:145-151`) **직접 포인터**(자격이 아니라 지정) · `team_role='manager'`(`:17`)도 **현재 역할**이지 자격 아님 | `NAME_ONLY` |
| 10 | approval eligible 여부 | 부재 — 승인 자격 축 0(승인 계층 전역 0) | `ABSENT` |
| 11 | authority matrix eligible 여부 | 부재 — ★`matrix_` **전역 0**(§40) | `ABSENT` |
| 12 | incumbent subject reference | 부재 — ★**직위와 사람이 미분리**(사용자가 곧 역할: `app_user.team_role` `:168`) → 재직자 참조 개념 성립 불가 | `ABSENT` |
| 13 | vacancy state | ★**`vacancy` 전역 0** — 위와 동일 이유로 **공석 표현 구조적 불가** | `ABSENT` |
| 14 | temporary incumbent reference | 부재 — 대행(acting) 축 0 | `ABSENT` |
| 15 | valid_from | 부재 — `app_user` 에 직위 유효기간 없음 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)조차 as-of 조회 불가 | `ABSENT` |
| 16 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 17 | status | 부재(직위 상태) · ⚠️ `team.status`(`:145-151`)는 **팀 상태**이지 직위 상태 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 18 | evidence | 부재 | `ABSENT` |

**실측 개수: 18 / 18 전사.** 커버리지 = `NAME_ONLY` 3 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 14. **`VALIDATED_LEGACY` = 0 · `PARTIAL` 0 → 18필수필드 중 실재 0.**

## 2. 규칙

- 🔴 **§39 는 `NAME_ONLY` 다 — 직위 표현의 전량이 `app_user.team_role`(`UserAuth.php:168`) + `admin_level`(`:171`) 컬럼 2개다.** 18축 중 **실재 0**. `position_unit`·`hierarchy_level`·`vacancy` **전역 grep 0**(PM 재확인). → **신설**.
- 🔴 **`team_role` 에 직위를 욱여넣지 마라.** `owner|manager|member`(`TeamPermissions.php:17`)는 **권한 등급**이고 `effectiveScope():245-246` 등 **인가 경로가 이 3값에 직결**돼 있다. 여기에 직함(부장/팀장…)을 추가하면 **권한 판정이 미정의 값과 만나 붕괴**한다.
- 🔴 **직위와 사람을 미분리한 현행을 그대로 확장하지 마라.** 현행은 **사용자가 곧 역할**(`app_user.team_role`)이라 **공석(vacancy)·대행(temporary incumbent)이 구조적으로 표현 불가능**하다. §39 는 **Position(직위) 을 독립 엔티티로 분리**하고 `incumbent subject reference` 로 사람을 **참조**하도록 요구한다 — **신설 시 처음부터 분리**하라.
- 🔴 **`parent_user_id`(`UserAuth.php:156-167`)를 보고선으로 계산 금지.** ⓐ 전 생성 경로가 **owner 직속 2단**(`:1226-1227` 주석 *"항상 최상위 owner 에 종속"* · `EnterpriseAuth.php:500` · `UserAuth.php:1574/1581`) — **3단 생성 경로가 존재하지 않는다** ⓑ 순회 = **단일 홉**(`:200-217`) ⓒ 용도 = **tenant 상속**(`:197`,`:214`). 🔴 **이 컬럼을 다단 보고선으로 재해석하면 `resolveTenantId` 가 깨진다**(소비처 6곳: `Rollup.php:56`·`ChannelSync.php:72`·`ChannelCreds.php:85`·`BillingMethod.php:88`·`AgencyPortal.php:478`·`PlanLimits.php:36-37`) — **테넌트 해석 붕괴 = 286차 전 메뉴 공백 사고와 동형**.
- 🔴 **`ORG_PRESET`(`TeamPermissions.php:706-722`)을 "조직 계층 있음"의 근거로 쓰지 마라 — 그러나 `ABSENT` 로 밀어도 오판이다.** 정확한 표현 = ★**"구조가 아니라 열거"**. 15단위 이름은 실재하고 `seedOrg`(`:725-753`)가 멱등 생성하나, `team` DDL(`:145-151`)에 **`parent_team_id` 가 없어** "마케팅 글로벌팀 ⊂ 마케팅팀" **구조 링크가 0**이다.
- 🔴 **IdP/HRIS 커넥터 신설 금지 — `EnterpriseAuth` 확장 강제(두 번째 엔진 = 헌법 위반).** `EnterpriseAuth` 는 **REAL** 이다(OIDC Authorization Code + id_token RS256/JWKS · SAML ds:Signature C14N+RSA-SHA256 · 어설션 리플레이 방어 `:56` · SCIM 2.0 Users CRUD · KEK 회전 · `routes.php:915-932` + `$register` `:2383-2400` **양쪽 배선**).
  - ★**단 SCIM Groups 는 GET 전용**(`scimListGroups` `:417-423` · `routes.php:932` — Groups GET 1개 vs Users CRUD 5개): 내부 `team` 을 **투영해 내보낼 뿐 IdP→내부 인입 경로가 없다.** Position 을 IdP 에서 받으려면 **Groups 인입이 신규 작업**이다.
  - ★**`sso_group_role_map`(`:70`,`:72`) 의 그룹은 엔티티가 아니라 평문 문자열** — 어설션 `groups` 수신(`:374`) → `group_name IN (?)` 룩업(`:84`) → **롤 1개로 즉시 소모 · 저장 안 함 · 부모-자식/중첩그룹/그룹ID 없음**. 🔴 **IdP 그룹 계층을 조직 계층으로 계산 = 역산.**
  - `EnterpriseAuth.php:500` 의 `parent_user_id = (int)$owner['id']` **고정**을 임의로 바꾸지 마라 — SCIM 프로비저닝이 owner 직속 2단을 유지하는 **의도적 봉인**이다.
- **`ORG_PRESET`/`team` 재사용 전략**: Position Unit 은 **`team.id` 를 `organization unit` 후보로 참조**하되, **팀 계층(`parent_team_id`)은 §21/§43 소관 신설**이며 §39 에서 임의 추가하지 마라.
- 🔴 **`valid_from`/`valid_to` 도입 = 폐구간 모델 전체 신규** — as-of 조회 술어(`WHERE effective_from <= :as_of`)가 **전역 0건**이다.
- **원문 지시 준수**: *"이번 단계에서는 Position과 Organization의 관계 기반만 구축한다"*(`SPEC…:1649`) · *"구체적인 Manager·Acting Manager·Skip-level Resolution은 다음 블록에서 구현한다"*(`:1672`) → 🔴 **§39 에서 Manager 해석 로직·Skip-level 순회를 구현하지 마라. 관계 기반(필드·참조)까지다.**
- **회귀 테스트 공백 직시**: `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`)에 `organization|hierarchy|org_unit|sso|scim` grep **0** → **조직·SSO 회귀 커버리지 0**. Position 도입 시 **E2E 신설이 동반 필수**(266차 `npm run e2e` 규약).
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무.
- 🔴 14축 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
