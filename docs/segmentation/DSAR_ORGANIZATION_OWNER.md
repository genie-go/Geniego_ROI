# DSAR — Organization Owner (§41)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §41 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_OWNER` 엔티티 | **grep 0** — owner 바인딩 테이블 부재 | `NOT_APPLICABLE`(부재 → 신설) |
| `team.manager_user_id` | `TeamPermissions.php:148`(MySQL DDL, **NULL 허용**) / `:168`(SQLite) · 쓰기 `createTeam:462-465`(테넌트 내 계정 존재 검증 `:463`) · 읽기 `:444-445`(`manager_name` 표시용 1홉 조회) | `KEEP_SEPARATE_WITH_REASON` — **Manager이지 Owner가 아니다**(§41 말미 명령) |
| `app_user.parent_user_id` | 정의 `UserAuth.php:167`(ALTER) · 주석 `:156` *"하위(팀원) 계정의 상위 owner id. owner=NULL"* · **nullable** | `KEEP_SEPARATE_WITH_REASON` — 테넌트 상속용 계정 트리(2단 봉인) |
| `admin_growth_lead.owner` | `AdminGrowth.php:909`(UPDATE)·`:912`(INSERT) — `(string)($b['owner'] ?? '')` **자유문자열** | `NOT_APPLICABLE` — **GeniegoROI 자체 B2B 리드 담당자**(무관·함정) |
| owner type 15종 | **backend/src grep 0** | `NOT_APPLICABLE` |
| `valid_from`/`valid_to` | 전 코드베이스 유일 effective date = `kr_fee_rule.effective_from`(`Db.php:898`) · `effective_to` **grep 0** | `NOT_APPLICABLE` |

**★축 주의 1 — 원문이 직접 금지한다.** §41 말미: **"Owner와 Manager를 동일시하지 마라."** `team.manager_user_id` 는 이름·형태 모두 근접하나 **원문이 명시적으로 분리를 요구한 축**이다. 이를 `organization_owner_id`·`owner subject` 의 커버로 계산하면 **갭이 정의상 소멸하는 역산**이며, **원문 명령 위반**이다.

**★축 주의 2 — `parent_user_id` 는 owner 포인터이나 조직 owner 가 아니다.** 이름에 `owner` 가 있고(`:156` 주석) 값도 owner 계정 id 이지만, 용도는 **한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(`UserAuth.php:197`·`:214` 동일값 UPDATE)이다. 전 생성 경로가 **owner 직속 2단으로 봉인**되어 있고(`UserAuth.php:1226-1227` / `EnterpriseAuth.php:500` / `UserAuth.php:1574`·`:1581` / owner 자신 `:670`=null), **3단을 만드는 경로가 존재하지 않는다.** 순회도 단일 홉(`resolveTenantId:200-217`, `LIMIT 1` 1회 후 return·재귀 없음). **보고선(reporting line)도 조직 소유권도 아니다.**

**★축 주의 3 — `admin_growth_lead.owner` 는 최대 함정.** 컬럼명이 정확히 `owner` 이나 **GeniegoROI 가 자사 B2B 리드를 관리하는 영업 담당자 문자열**이다. 고객 테넌트의 조직 구조와 **무관**하며 FK·주체 타입·유효기간 어느 것도 없다. 이름 grep 만으로 §41 후보에 넣으면 **규율 8(부재증명은 이름이 아니라 능력으로) 위반**이다.

## 1. 원문 전사 + 판정 — **원문 13종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_owner_id | 부재 — owner 바인딩이 **엔티티가 아니다**. 가장 가까운 `team.manager_user_id`(`:148`)는 **team 행의 컬럼 1개**(별도 식별자·다중 owner 불가) | `NOT_APPLICABLE` |
| 2 | organization unit | 부재 — 조직단위 엔티티 없음. `team`(`:145-151`)은 **구조가 아니라 열거**(`parent_team_id` 없음 · `ORG_PRESET` 15단위 `:706-722`는 평면 이름) | `NOT_APPLICABLE` |
| 3 | owner type | 부재 — 15종 grep 0(별도 축 문서 참조) | `NOT_APPLICABLE` |
| 4 | owner subject | 인접 = `team.manager_user_id`(`:148`) 사용자 참조 1홉 · 실사용 `:444-445` · 존재검증 `:463`. **단 Manager ≠ Owner**(원문 명령) · 주체 타입 축 없음(사용자 고정, 팀·시스템·외부 주체 불가) | `KEEP_SEPARATE_WITH_REASON` |
| 5 | owner position | 부재 — position/직위 축 **grep 0**(`position_unit` 0) | `NOT_APPLICABLE` |
| 6 | owner organization | 부재 — `app_user.company` 는 **문자열 1개**(`UserAuth.php:499`·`:1720` 프로필 평문) · 법인 엔티티 아님 | `NOT_APPLICABLE` |
| 7 | responsibility scope | 부재 — 인접 `data_scope`(`TeamPermissions.php:160-166`)는 **주체(user/team)의 행 필터**이지 owner 책임범위 아님 · effect 축 없음(§43) | `LEGACY_ADAPTER`(인접 자산) |
| 8 | approval eligible 여부 | 부재 — `APPROVAL_ELIGIBLE` 축 grep 0 · 승인 자격 판정 지점 없음 | `NOT_APPLICABLE` |
| 9 | resource owner eligible 여부 | 부재 — 리소스 소유 자격 축 없음. `DATA_OWNER`/데이터 소유자 지정 경로 0 | `NOT_APPLICABLE` |
| 10 | valid_from | 부재 — 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`)이며 **as-of 조회 능력 없음**(`WHERE effective_from <= :as_of` **backend/src 전역 0건** · 읽기 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승) | `NOT_APPLICABLE` |
| 11 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** → **폐구간 모델은 순수 신규** | `NOT_APPLICABLE` |
| 12 | status | 부재 — `team.status`(`:148` `'active'`)는 **팀 자체의 상태**이지 owner **바인딩**의 상태가 아님(바인딩이 엔티티가 아니므로 상태를 가질 자리가 없다) | `NOT_APPLICABLE` |
| 13 | evidence | 부재 — owner 지정 근거·출처 기록 없음. `createTeam` 은 감사로그 없이 INSERT | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 11 · `KEEP_SEPARATE_WITH_REASON` 1 · `LEGACY_ADAPTER` 1.

**종합 판정: `NOT_APPLICABLE`(부재 → 신설).** 13필드 중 **실 대응 0** — `owner subject` 는 원문이 동일시를 금지한 Manager 이고, `responsibility scope` 는 도메인이 다른 인접 자산이다. 🔴 **`LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON` 은 커버가 아니다.**

## 2. 규칙

- 🔴 **`team.manager_user_id` 를 `organization_owner_id`/`owner subject` 로 승격 금지.** 원문 §41 말미가 **"Owner와 Manager를 동일시하지 마라"** 로 직접 금지한다. Manager = 팀 운영 책임자(1홉 표시·`:444-445`), Owner = **책임범위·승인자격·리소스소유자격·유효기간을 가진 별도 바인딩**. 두 축은 **다대다**여야 한다(한 조직단위에 `FINANCIAL_OWNER`·`DATA_OWNER`·`SECURITY_OWNER` 가 동시 존재 가능 — 컬럼 1개로 표현 불가).
- 🔴 **`admin_growth_lead.owner`(`AdminGrowth.php:909`)를 §41 근거로 인용 금지.** GeniegoROI 자체 B2B 리드 담당자 문자열이다. **이름 일치가 능력 일치가 아니다**(규율 8).
- 🔴 **`app_user.parent_user_id` 를 조직 소유권·보고선으로 인용 금지.** 용도 = 테넌트 상속(2단 봉인·단일 홉). §41 로 계산하면 역산이다.
- **Owner 는 `data_scope` 확장이 아니라 신규 바인딩이다.** `data_scope` 는 `UNIQUE(tenant_id, subject_type, subject_id)`(`:164`) — **주체당 1행**이라 다중 owner type 을 구조적으로 담을 수 없다. §43 Scope Binding 과 **분리해 설계**하되, Owner 의 `responsibility scope` 는 §43 바인딩을 **참조**하고 중복 정의하지 마라.
- **`valid_from`/`valid_to` 는 신규 능력이다.** 레포 유일 effective date(`kr_fee_rule.effective_from`)조차 **as-of 조회 술어가 0건**이다. Owner 이력 조회를 설계하면 **레포 최초의 시점 질의**가 된다 — `ORDER BY ... DESC LIMIT 1`(최신승) 관례를 그대로 복제하면 §41 요구를 충족하지 못한다.
- **저장 = `ensureTables` 멱등 패턴 강제.** `backend/migrations/` 는 **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) — 마이그레이션 파일 경로는 죽었다. `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`(`Db.php:1123-1127`·`CRM.php:109` 패턴) · **MySQL/SQLite 두 방언 동시 작성 의무**(`TeamPermissions.php:145-151` vs `:168`).
- **`evidence` 는 `menu_audit_log` 패턴 확장이다.** 🔴 *"해시체인 선례 없음"* 은 **전역 `audit_log`(`Db.php:540-545`, 4컬럼·tenant 없음)에 한해 참**이다. `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128` · 생성 `:182-197` · `lastHash()` `:214-219`) = SHA-256 prev-chain **실구현** · `pm_audit_log` = tenant+entity+diff_json+3인덱스. **신설이 아니라 확장.**
- ⚠️ **`team.manager_user_id` 런타임 실사용 밀도 미확인.** DDL nullable · `createTeam:464` 에서 **선택 입력**(`isset($b['manager_user_id'])`) — 다수 팀이 manager 미지정일 수 있다. **라이브 `SELECT COUNT(*) FROM team WHERE manager_user_id IS NOT NULL` 권장.**
