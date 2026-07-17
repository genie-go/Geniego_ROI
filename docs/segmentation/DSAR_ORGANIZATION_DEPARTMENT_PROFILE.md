# DSAR — Department Profile (§27)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §27 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_DEPARTMENT_PROFILE` | **grep 0** | `ABSENT` |
| `department` · `dept_` (대소문자 무시) | **backend/src 전역 0 히트** (289차 재실측) | `ABSENT`(이름축) |
| Department 능력(Division 하위·Team 상위 조직 계층) | 조직 단위 엔티티 0 · 조직 간 부모-자식 간선 0 · `hierarch` grep 0 | `ABSENT`(능력축) |
| `division reference`/`business unit reference` 의 대상 | Division **0**(§26) · BU **0**(§25) | `ABSENT` |
| workspace | 조직 Workspace 엔티티 부재 — 인접 = `WorkspaceState.php`(사용자 UI 상태 저장) | `KEEP_SEPARATE_WITH_REASON` |

**★능력축 부재증명(규율 8).** Department 는 §27 이 `division reference` + `business unit reference` + 하위 Team 을 동시에 요구하는 **다단 조직 체인의 중간 마디**다. 레포에는 ⓐ 조직 단위 엔티티가 없고 ⓑ 조직 간 부모-자식 간선이 없으며 ⓒ 유일 부모-자식 간선 `app_user.parent_user_id` 는 **owner 직속 2단으로 봉인**(3단 생성 경로 부재)이고 ⓓ `team` 에 `parent_team_id` 가 없다(`TeamPermissions.php:145-151`). **중간 마디를 걸 곳 자체가 없다.**

**★반대 방향 함정 주의.** `TeamPermissions::ORG_PRESET`(`:706-722`)의 "마케팅팀"·"영업팀"·"물류팀"·"재무팀"은 **한국 기업의 통상 '부서'명**이라 §27 로 읽고 싶어진다. 그러나 이는 `team` 행이고 **부모가 없어 Department↔Team 의 2단 관계를 표현하지 못한다** → §28 로 대조하되 거기서도 커버가 아니다(§28 문서 참조). §27 에 매핑하면 **역산**이다.

## 1. 원문 전사 + 판정 — **원문 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | department profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | department code | 부재 — `department`/`dept_` grep 0 | `ABSENT` |
| 4 | division reference | 부재 — 참조 대상(Division)이 없음(§26) | `ABSENT` |
| 5 | business unit reference | 부재 — 참조 대상(BU)이 없음(§25) | `ABSENT` |
| 6 | department owner reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — 팀 관리자, Department 아님 | `ABSENT` |
| 7 | administrative owner reference | 부재 — **행정/기능 오너 이원화 개념 전무**(단일 `manager_user_id` 뿐) | `ABSENT` |
| 8 | functional owner reference | 부재 — 상동 | `ABSENT` |
| 9 | cost center references | 부재 — `cost_center` grep 0 | `ABSENT` |
| 10 | profit center references | 부재 — `profit_center` grep 0 | `ABSENT` |
| 11 | legal entity references | 부재 — `legal_entity` grep 0 | `ABSENT` |
| 12 | region references | 부재(조직 Region) — §30 참조 | `ABSENT` |
| 13 | country references | 부재(조직 Country) — §31 참조 | `ABSENT` |
| 14 | default workspace | 부재(조직 워크스페이스) · 인접 = `WorkspaceState`(사용자별 UI 상태) — 조직 귀속 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 15 | approval hierarchy eligibility | 부재 — 승인 계층 엔티티 전무 | `ABSENT` |
| 16 | valid_from | 부재 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`) — 채널 수수료 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 18 | status | 부재(Department) · 형태 인접 = `team.status`(`TeamPermissions.php:148`) | `KEEP_SEPARATE_WITH_REASON` |
| 19 | evidence | 부재 | `ABSENT` |

**실측 개수: 19 / 19 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 16 · `KEEP_SEPARATE_WITH_REASON` 3.

## 2. 규칙

- 🔴 **`ORG_PRESET` 의 "마케팅팀/영업팀/물류팀/재무팀"을 Department 로 매핑 금지.** 이들은 `team` 행이며(생성 `seedOrg` `:737-745`) **부모 컬럼이 없어 Department↔Team 2단을 표현하지 못한다.** 한국어 통칭이 '부서'라는 이유로 §27 에 매핑하면 역산이다.
- 🔴 **`administrative owner` / `functional owner` 이원화를 "있다고 가정" 금지.** 현행은 `manager_user_id` **단일 컬럼**이므로 매트릭스 조직(행정선 ≠ 기능선)을 표현할 수 없다. `matrix_` grep **0** 이 이를 뒷받침한다.
- 🔴 **`WorkspaceState` 를 `default workspace` 커버로 계산 금지** — 사용자 UI 상태 저장이지 조직 귀속 워크스페이스가 아니다. ⚠️ 단 `WorkspaceState.php:50` 의 `isDemo` 술어는 **substring 방식**(`strncmp($t,'demo',4)===0`)으로 다른 핸들러와 불일치하며, 이는 §27 과 무관한 **별건 관찰 사실**이다.
- `cost center`/`profit center`(#9·#10)는 §25 와 **동일 대상의 참조**다 — Department 문서에서 **중복 정의 금지**, BU 정의를 참조하라.
- 신설 시 **하나의 조직 단위 테이블 + 하나의 조직 간선 테이블**로 §25~§31 을 표현하라. Department 전용 테이블을 따로 파면 **§25/§26/§28 과 4중 엔진**이 되어 헌법 위반(단일 엔진 원칙)이다.
- 🔴 19종 **"있다고 가정"하고 배선 금지.**
