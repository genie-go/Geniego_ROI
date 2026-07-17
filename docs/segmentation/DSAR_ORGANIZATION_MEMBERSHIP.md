# DSAR — Organization Membership (§42)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §42 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_MEMBERSHIP` 엔티티 | **grep 0** — 멤버십 테이블 부재 | `NOT_APPLICABLE` |
| **`app_user.team_id`** | ALTER `UserAuth.php:178`(주석 `:177` *"멤버가 소속된 팀 엔터티(team.id) 참조. NULL=미배정(레거시 무후퇴)"*) · 안전망 재-ALTER `TeamPermissions.php:175` · **nullable** | **`KV_ONLY`** |
| 멤버 수 집계 | `TeamPermissions.php:442` `SELECT COUNT(*) FROM app_user WHERE tenant_id=? AND team_id=? AND is_active=1` | (소비 실배선) |
| 스코프 폴백 소비 | `TeamPermissions.php:254` `if (!$sc && !empty($u['team_id'])) $sc = self::subjectScope(..., 'team', (int)$u['team_id']);` | (소비 실배선) |
| 유효기간·부여자·이력 | **전무** — `valid_from`/`valid_to`/`granted_by`/멤버십 이력 테이블 **grep 0** | `NOT_APPLICABLE` |
| membership type 12종 | **backend/src grep 0** | `NOT_APPLICABLE` |
| SCIM 프로비저닝 | `EnterpriseAuth.php:500` `parent_user_id = (int)$owner['id']` — **테넌트 owner 고정** · **`team_id` 미배정** | `LEGACY_ADAPTER` |
| SCIM Groups | **GET 전용**(`scimListGroups` `EnterpriseAuth.php:417-423` · `routes.php:932` — Groups GET 1개 / Users CRUD 5개) | `LEGACY_ADAPTER` |

**★핵심 실측 — 멤버십이 엔티티가 아니라 컬럼 1개다.** `app_user.team_id INTEGER NULL`(`UserAuth.php:178`) **단일 nullable FK 포인터**. 이 형상이 §42 전체를 결정한다:

| 원문이 요구하는 능력 | 컬럼 1개로 가능한가 |
|---|---|
| 한 Subject의 **다중 Membership** | **불가** — 컬럼 1개 = **최대 1소속** |
| **Primary 여부** 관리 | **무의미** — 항상 1개이므로 primary 를 구분할 대상이 없다 |
| 매트릭스 소속(Solid/Dotted line) | **불가** |
| **유효기간별** Primary 관리(§42 말미 명령) | **불가** — 유효기간 컬럼 자체가 없다 |
| 소속 **이력** | **불가** — UPDATE 덮어쓰기(과거 소속 소실) |

**★축 주의 — `app_user.parent_user_id` 를 Membership 으로 계산하지 마라.** 이름상 "소속"처럼 보이나 **테넌트 상속용 계정 트리**다(`UserAuth.php:167` · 주석 `:156`). 전 생성 경로가 **owner 직속 2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574`/`:1581`·owner 자신 `:670`=null) · 순회 단일 홉(`resolveTenantId:200-217`). **조직 소속이 아니라 구독 스코프 상속**이다.

**★축 주의 — SCIM 이 있다고 Membership 인입이 있는 것이 아니다.** `EnterpriseAuth` 는 **실 SSO/SCIM 스택 REAL**(OIDC Authorization Code + id_token RS256/JWKS · SAML ds:Signature C14N+RSA-SHA256 · 어설션 리플레이 방어 `:56` · SCIM 2.0 Users CRUD · KEK 회전 · 라우트 `routes.php:915-932` + `$register` `:2383-2400` **양쪽 배선**). **그러나 그룹 축이 봉인돼 있다**: SCIM Groups 는 **GET 1개뿐**(`:417-423`) — 내부 `team` 을 SCIM Group 으로 **투영해 내보낼 뿐 IdP→내부 인입 경로가 없다**. `sso_group_role_map(tenant_id, group_name, role)`(`:70`·`:72`)은 어설션 `groups`(`:374`)를 받아 `group_name IN (?)` **단순 룩업**(`roleForGroups:78-85`)으로 **롤 1개로 즉시 소모**한다 — 그룹이 **엔티티가 아니라 평문 문자열**이고 저장되지 않는다. **부모-자식·중첩그룹·그룹ID 없음.**

## 1. 원문 전사 + 판정 — **원문 15종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_membership_id | 부재 — 멤버십이 **행이 아니라 컬럼**(`app_user.team_id` `:178`). 식별자를 가질 자리가 없다 | `NOT_APPLICABLE` |
| 2 | subject id | 인접 = `app_user.id`(**암묵** — 멤버십 행이 아니라 사용자 행 자신이 주체). 주체 타입 축 없음(사용자 고정 · 서비스계정·외부 주체 표현 불가) | `KV_ONLY` |
| 3 | organization unit | 인접 = `app_user.team_id → team.id`(`:178` · 소비 `TeamPermissions.php:442`·`:254`). **단 `team` 은 구조가 아니라 열거**(`parent_team_id` 없음 `:145-151`) | `KV_ONLY` |
| 4 | membership type | 부재 — 12종 grep 0(별도 축 문서 참조) | `NOT_APPLICABLE` |
| 5 | primary 여부 | 부재 — **컬럼 1개 = 항상 최대 1소속**이므로 primary 개념이 **성립하지 않는다**(구분 대상 없음) | `NOT_APPLICABLE` |
| 6 | employment type | 부재 — 고용형태 축 grep 0(`hris`/`workday`/`payroll` **backend/src 0**) | `NOT_APPLICABLE` |
| 7 | position reference | 부재 — position/직위 엔티티 grep 0(`position_unit` 0) | `NOT_APPLICABLE` |
| 8 | legal entity reference | 부재 — `legal_entity` **grep 0**. 사업자정보는 `app_user` **프로필 평문 필드**(`business_number`·`ceo_name` `UserAuth.php:499`·`:1720`) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** → 법인 엔티티 아님 | `NOT_APPLICABLE` |
| 9 | workspace reference | 부재 — workspace 엔티티 grep 0. 인접 `WorkspaceState`(`:50`)는 **UI 상태 저장**이지 조직 workspace 아님 | `NOT_APPLICABLE` |
| 10 | source system | 부재 — 멤버십 출처 기록 없음. 인접 = SCIM 프로비저닝(`EnterpriseAuth.php:500`)이 계정을 만들되 **`team_id` 를 배정하지 않고 출처도 남기지 않는다** | `LEGACY_ADAPTER` |
| 11 | source membership id | 부재 — **IdP→내부 그룹 인입 경로 자체가 없다**(SCIM Groups GET 전용 `:417-423` · `sso_group_role_map` 은 `group_name` **문자열**만 · 그룹ID 없음) | `LEGACY_ADAPTER` |
| 12 | valid_from | 부재 — 유일 effective date 선례 `kr_fee_rule.effective_from`(`Db.php:898`)이며 **as-of 술어 backend/src 전역 0건** | `NOT_APPLICABLE` |
| 13 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** → 폐구간 모델 순수 신규 | `NOT_APPLICABLE` |
| 14 | status | 부재 — `app_user.is_active`(`TeamPermissions.php:442` 술어)는 **계정 활성 상태**이지 **멤버십 상태**가 아님(멤버십이 엔티티가 아니므로 상태를 가질 자리가 없다) | `NOT_APPLICABLE` |
| 15 | evidence | 부재 — 소속 부여 근거·부여자·시각 **전무**(UPDATE 덮어쓰기) | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 11 · `KV_ONLY` 2 · `LEGACY_ADAPTER` 2.

**종합 판정: `KV_ONLY`.** 소속이라는 **값**은 실재하고 소비도 실배선(`:442`·`:254`)이나, 멤버십을 **엔티티로 다룰 능력이 전무**하다(타입·유효기간·부여자·이력·다중소속·출처 = 15필드 중 13 부재).

## 2. 규칙

- 🔴 **`app_user.team_id` 확장(컬럼 추가)으로 §42 를 충족하려 하지 마라.** 원문 말미가 **"한 Subject가 여러 Organization Membership을 가질 수 있으나 Primary Employment Membership은 유효기간별로 명시적으로 관리하라"** 를 요구한다 — **1:N + 시점**이다. `app_user` 에 컬럼을 더해도 **카디널리티가 1:1로 고정**되어 구조적으로 불가능하다 → **별도 멤버십 테이블 필수**.
- 🔴 **무후퇴 필수 — `app_user.team_id` 를 제거·전환하지 마라.** 소비처가 실배선이다: 멤버 수 집계(`TeamPermissions.php:442`) · **스코프 폴백**(`:254` — user 스코프 부재 시 team 스코프 1회 조회). 신규 멤버십 테이블 도입 시 `team_id` 는 **Primary Membership 의 비정규화 캐시로 병존**시키고, **두 값이 갈라지지 않도록 단일 쓰기 경로**를 강제하라(헌법: 한 값 변경 = 관련 전부 동시 동기화).
- 🔴 **IdP 커넥터 신설 = 두 번째 엔진 = 헌법 위반.** `EnterpriseAuth` 확장 강제. `source system`/`source membership id` 는 **SCIM Groups 를 GET 전용에서 인입 가능으로 확장**(`scimListGroups:417-423` 지점)하고 `sso_group_role_map`(`:70`) 옆에 **그룹 엔티티**를 두는 방향이다 — 새 SSO 스택을 만들지 마라.
- 🔴 **`parent_user_id` 를 Membership 으로 계산 금지**(테넌트 상속·2단 봉인·단일 홉).
- **`primary 여부` 는 부분 UNIQUE 로 강제할 수 없다.** MySQL/SQLite 양방언 수기 중복 작성(`CRM.php:48` vs `:77`) 제약 하에서 filtered unique index 는 이식성이 없다 → **애플리케이션 계층 불변식 + 쓰기 전 검사**(`PM/Dependencies::validateDependency:79-100` 의 *쓰기 전 차단* 패턴 `:32-34`)를 따르라.
- **저장 = `ensureTables` 멱등 패턴 강제**(마이그레이션 경로는 **172차 정지**). ⚠️ **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → 기존 `app_user.team_id` 값을 멤버십 행으로 **이행할 수단이 현재 없다**. 백필 경로를 **명시적으로 설계**하지 않으면 신규 테이블은 **0행 = VACUOUS** 로 출발한다.
- ⚠️ **`app_user.team_id` 런타임 배정률 미확인**(nullable · 주석 `:177` *"NULL=미배정(레거시 무후퇴)"*). **라이브 `SELECT COUNT(*) FROM app_user WHERE team_id IS NOT NULL` 권장** — 0 이면 `:254` 폴백과 `:442` 집계는 전부 no-op 이며, **"실사용 중인 팀 소속"으로 단정 금지**.
- ⚠️ **조직·SSO 회귀 커버리지 0** — `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`) `organization|hierarchy|org_unit|sso|scim` **grep 0**. 멤버십 도입 시 회귀 테스트는 **동반 신규**다.
