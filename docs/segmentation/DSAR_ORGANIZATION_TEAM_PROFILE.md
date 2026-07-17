# DSAR — Team Profile (§28)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §28 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

> ★**이 그룹(§25~§31) 최대 함정.** `TeamPermissions.team` 은 이름이 정확히 `team` 이고 `team_type` 에 `marketing_global` 같은 **조직스러운 값**이 있으며(`TeamPermissions.php:44-49`) `ORG_PRESET` 은 스스로를 **"표준 조직 구조 프리셋"**(주석 `:703`)이라 **자칭**한다. 그럼에도 **§28 의 조직 Team 이 아니다.** 🔴 **`VALIDATED_LEGACY`("REAL")로 계산하면 역산이다.**

### `team` DDL 전 컬럼 (실측 전수)

`TeamPermissions.php:145-151`(MySQL) / `:168`(SQLite) — **두 방언 동일**:

```
id · tenant_id · name · description · team_type · manager_user_id · status · created_by · created_at · updated_at
```

**끝이다. `parent_team_id` 없음.** 인덱스도 `idx_team_tenant(tenant_id)`·`idx_team_status(tenant_id,status)` 둘뿐(`:150`) — 부모 인덱스 없음.

### ★3축 대조 — 왜 조직 Team 이 아닌가

| 축 | `TeamPermissions.team` | §28 조직 Team | 판정 |
|---|---|---|---|
| **주체** | **사용자 그룹**(권한·스코프를 매달 대상. `acl_permission.subject_type`·`data_scope.subject_type` 의 값 `'team'` — `:152-166`) | **조직 단위**(Department 하위 마디) | 상이 |
| **목적** | **권한 스코프 부여**(`replacePerms`/`replaceScope` `:742-743`) | **조직 구조 표현** | 상이 |
| **계층** | ★**`parent_team_id` 컬럼 없음 = 부모 없음** | Department→Team→Squad 체인의 마디 | **구조적 불가** |

★**"구조가 아니라 열거"다.** `ORG_PRESET`(`:706-722`) 15개는 이름에만 계층이 있다 — **"마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 구조 링크가 0**이다. `seedOrg`(`:725-753`)는 15개를 **평면 `team` 행으로 일괄 INSERT**(`:739-740` — INSERT 컬럼에 부모 없음)한다. `TEAM_TYPES` 17종(`:44-49`)도 **평면 문자열 카탈로그**다.

🔴 **단, "Team ABSENT" 로 밀어도 오판이다.** 배선은 REAL(`routes.php:1589`·`:2570` `$register` · 프론트 `teamApi.js:261`)이고 멱등·트랜잭션·감사(`:747`)까지 갖췄다. 정확한 표현 = **`PARTIAL` — 능력은 실재하나 §28 이 요구하는 축이 아니다.**

## 1. 원문 전사 + 판정 — **원문 16종**

> ⚠️ **개수 정정(규율 4).** 착수 브리핑은 "§28 필수 15필드"라 했으나 **원문 실측은 16개**(스펙 `:1330-1345`). 조용히 맞추지 않고 사실대로 적는다. 근사치 2개라는 브리핑의 결론은 재실측 후에도 **유지**된다(분모만 15→16).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | team profile id | 부재(조직) · 형태 인접 = `team.id`(`:146` AUTO_INCREMENT) — **사용자 그룹 PK** | `KEEP_SEPARATE_WITH_REASON` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | team code | ★**근사치 1/2** — `team.name`(`:147` VARCHAR(160)) · 동명 skip 으로 사실상 유일키 역할(`seedOrg:734-738`). 단 **DB UNIQUE 제약 없음**(`:150` 인덱스에 name 부재) · code 축 별도 부재 | `PARTIAL` |
| 4 | department reference | 부재 — ★**참조 대상(Department)도 없고 `parent_team_id` 컬럼도 없다.** 양쪽 모두 부재 | `ABSENT` |
| 5 | team owner reference | ★**근사치 2/2** — `team.manager_user_id`(`:148` INT NULL). 단 ⓐ **nullable** ⓑ `seedOrg` INSERT 가 **manager 를 넣지 않는다**(`:739` 컬럼 목록에 부재) → **프리셋 15팀은 전부 manager NULL 로 생성** | `PARTIAL` |
| 6 | functional owner reference | 부재 — 오너 이원화 개념 전무(단일 `manager_user_id`) · `matrix_` grep 0 | `ABSENT` |
| 7 | project references | 부재(팀↔프로젝트 바인딩) · 인접 = PM 도메인(`PM/*`) — 팀 참조 없음 | `ABSENT` |
| 8 | program references | 부재 — Program 개념 전무 | `ABSENT` |
| 9 | cost center reference | 부재 — `cost_center` grep 0 | `ABSENT` |
| 10 | legal entity scope | 부재 · ★**`data_scope` 의 `'company'` 를 법인 스코프로 읽지 마라** — `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` = **경계를 지우는 센티넬** | `KEEP_SEPARATE_WITH_REASON` |
| 11 | workspace scope | 부재(조직 워크스페이스) · `DATA_SCOPES` 9종(`:41`)에 workspace 없음 | `ABSENT` |
| 12 | approval hierarchy eligibility | 부재 — 승인 계층 엔티티 전무 · ⚠️ `ORG_PRESET` perms 의 `'approve'` 액션(`:708`·`:711`·`:717` 등)은 **메뉴 권한 문자열**이지 승인 계층 자격이 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 13 | valid_from | 부재 · `team.created_at`(`:149`)은 생성시각이지 유효시작 아님 | `ABSENT` |
| 14 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 15 | status | 부재(조직 유효성) · 형태 인접 = `team.status`(`:148` default `'active'`) — **활성 플래그**이지 §28 의 시점 폐구간과 짝이 되는 status 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 16 | evidence | 부재 | `ABSENT` |

**실측 개수: 16 / 16 전사.** (브리핑 표기 15 ≠ 실측 16 — 위 정정 참조.)
커버리지 = `VALIDATED_LEGACY` **0** · `PARTIAL` 2(`team code`≈name · `team owner reference`≈manager_user_id) · `KEEP_SEPARATE_WITH_REASON` 4 · `ABSENT` 10.

## 2. 규칙

- 🔴 **`team` 을 §28 커버(`VALIDATED_LEGACY`)로 계산 절대 금지.** 3축(주체·목적·계층) 전부 다르고 특히 **`parent_team_id` 부재 = 계층 표현 구조적 불가**다. 16필드 중 근사치는 **2개뿐**(#3 name · #5 manager_user_id)이며 그 2개도 `PARTIAL`이다.
- 🔴 **`ORG_PRESET` 의 자칭을 근거로 삼지 마라(규율 10 — 주석·문서를 근거로 삼지 말고 정의부를 Read 하라).** 주석 `:703` 이 "표준 조직 구조 프리셋"이라 말하고 `team_type` 에 `marketing_global`/`sales_enterprise` 같은 조직스러운 값이 있어도, **DDL 에 부모가 없으면 구조가 아니라 열거다.**
- 🔴 **`team_type` 값의 이름 계층을 구조로 승격 금지.** `marketing` / `marketing_global` / `marketing_domestic` 은 **접두어가 같을 뿐 평면 문자열**이다. 문자열 prefix 로 부모를 추론하면 §30 이 금하는 "이름으로 포함관계 추론"과 동형의 오류이며, 레포에는 **경계 가드 없는 prefix 매칭 오답 선례**(`AuthContext.jsx:834` — `menuKey.startsWith(k)`, 구분자 가드 없음)가 이미 있다. 정답 패턴은 `planMenuPolicy.js:293-295`(`pathname === p || pathname.startsWith(p + "/")`).
- ✅ **확장 강제·재구현 금지(헌법 Golden Rule).** `team` 은 **사용자 그룹 축으로 보존**하고, 조직 Team 은 **별도 조직 단위 축**으로 신설한 뒤 **명시적 바인딩**(조직 Team ↔ `team.id`)으로 연결하라. `team` 에 `parent_team_id` 를 덧붙여 조직 계층을 겸하게 만들면 **한 테이블이 두 도메인을 겸직**하게 되어 권한 스코프 축이 오염된다.
- ⚠️ **`seedOrg` 는 manager 를 채우지 않는다**(`:739`) → 프리셋 15팀 전부 `manager_user_id` NULL. **"team owner 가 실사용 중"으로 인용 금지.**
- 🔴 16종 **"있다고 가정"하고 배선 금지.**
