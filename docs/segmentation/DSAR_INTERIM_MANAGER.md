# DSAR — Interim Manager (§31)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §31 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★핵심 — **Vacancy Reference 를 강제하려면 Vacancy 가 있어야 하는데, Position 조차 없다**

원문(`:1205`·`:1209`)은 **vacant position reference** 를 필수로 요구한다. 현행 실측 — **부재가 2겹이다**:

| 계층 | 실측 | 귀결 |
|---|---|---|
| **Vacancy 개념** | `vacan`(vacancy/vacant) **backend/src 0건** | 공석을 **표현할 수 없다** |
| **Position 개념** | 🔴 **Position 엔티티 0** — 직원 아이덴티티는 `app_user` **뿐**이고 직무 축이 없다 | **공석이 될 대상 자체가 없다** |

★**§30 보다 한 겹 더 깊다.** §30 은 *"종료일 컬럼이 없다"*(값의 부재)지만, §31 은 *"공석을 표현할 Position 조차 없다"*(**대상의 부재**)다. **Position 이 없으면 Vacancy 는 정의상 성립 불가** — 사람이 비운 자리를 가리킬 대상이 없기 때문이다.

🔴 **`position` grep 오염 확인**: `position_idx` = **PM 태스크 정렬순서**(직무 Position 아님). §31 검색 시 오염원.

### ★`interim` grep = **1건 · 무관**

**`AttributionEngine.php:672`** — `$rj['interim'] = $geoResults;` = **지오리프트 실험 중간결과**(`$conclude` 시 `final`/`verdict` 확정). **직무 대리와 무관한 통계 용어.** 🔴 이 1건을 §31 근거로 인용하면 **규칙 7 위반**(이름 히트를 능력으로 오독).

### ★자리를 비우는 축 = **현행엔 "비우기"가 없다**(§29 §2 ②와 동일 근원)

원문의 Interim 은 *"Position 이 공석"*(`:1224`)을 전제한다. 현행에서 공석에 가장 근접한 조작은 `manager_user_id=NULL` 이다 — 실측:

- `updateTeam:492-495` 가 `manager_user_id` 를 **NULL 로 설정하는 것을 허용**한다(`:493` — `null` 또는 빈 문자열 → `$newMgr=null` → `:495` `manager_user_id=?` 에 NULL 대입).
- 🔴 **그러나 이것은 공석이 아니다.** `:501` `if ($newMgr !== null) promoteManager(...)` → **NULL 일 때 아무 후속 처리도 하지 않는다**. 전임자의 `app_user.team_role='manager'` 는 **그대로 잔존**.
- 실측 확인: **`team_role='manager'` 쓰기 사이트 = `promoteManager:774` 단 1곳** · **`team_role` 을 `'member'` 로 되돌리는 UPDATE 전역 0** → **강등 경로 없음**.

→ 🔴 **★§76 *"Vacant Position을 Active Manager로 처리"*(원문 `:2685`) = 실재.** `manager_user_id=NULL` 로 "공석"을 만들어도 **전임자는 여전히 Active Manager 로서 위임 권한을 행사한다**: `isManagerAdmin:136`(`in_array(roleOf($c),['owner','manager'])`) → `putMemberPermissions:618`.
★**즉 현행에서 "공석"은 관계 테이블에만 존재하는 표면 상태이고, 권한 축에서는 공석이 발생하지 않는다.** Interim 을 이 위에 얹으면 **전임자와 Interim 이 동시에 manager 권한을 갖는다**(§32 Co-Manager 를 **의도치 않게** 만들어내되, 조율 정책은 없는 최악의 형태).

### ★판정 근거 — **이름·능력 양쪽 부재**(규칙 6·7)

`vacan` 0 · `interim` 1건 무관 · `acting` 0 · `deputy`/`substitute`/`stand_in` 0 · Position 엔티티 0 · **git 삭제 이력 0**(`vacancy`) → **존재한 적이 없다**. → **§31 전 11항목 `ABSENT`.**

## 1. 원문 전사 + 판정 — **원문 11종**

원문(`:1205`): *"Interim Manager는 공석 Position이나 조직 개편 중 임시 책임을 수행한다."*

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | vacant position reference | 🔴 **2겹 부재** — `vacan` 0 **그리고** Position 엔티티 0(가리킬 대상 없음) | `ABSENT` |
| 2 | interim manager | 임시 책임자 축 0 · `interim` 1건은 **지오리프트 중간결과**(`AttributionEngine.php:672`) | `ABSENT` |
| 3 | interim start | 0 · `valid_from` **전역 0** | `ABSENT` |
| 4 | expected end | 0 · `valid_to` **전역 0** — 예상 종료를 담을 칸 없음 | `ABSENT` |
| 5 | vacancy reason | 0 — 공석 개념이 없으므로 사유도 없다 | `ABSENT` |
| 6 | incumbent search state | 0 — 🔴 후임 탐색 상태는 **워크플로 축**인데, 승인 워크플로 엔진 자체가 없다(노드/상태기계 0) | `ABSENT` |
| 7 | covered responsibilities | 0 · `data_scope` 는 **`UNIQUE(tenant_id,subject_type,subject_id)`**(`TeamPermissions.php:164`) = 주체당 단일행 강제 → 한시적 책임범위 **병존 불가** | `ABSENT` |
| 8 | approval routing eligibility | 승인자 후보 계산 코드 0(`resolveApprover`/`approval_chain`/`routeApproval` **전역 0**) | `ABSENT` |
| 9 | authority reference | Authority Matrix 0 | `ABSENT` |
| 10 | status | 0 · `team.status`(`:148`)는 **팀 상태**(active/disabled/archived) | `ABSENT` |
| 11 | evidence | 0 | `ABSENT` |

**실측 개수: 11 / 11 전사.**
> 🔴 **측정기 분모 13 · 원문 필수필드 11 · 전사 11 — 불일치를 사실대로 적는다**(규칙 3). 측정기가 센 13은 **필수 필드 11(`:1209-1219`) + Acting/Interim 구분 불릿 2(`:1223-1224`)** 다. 구분 불릿은 **필수 필드가 아니라 규범 서술**이므로 표에 전사하지 않고 아래 §2 규칙으로 이관했다. **측정기는 개수만 센다** — 항목명 대조 결과 **분모는 11**이다.
> 원문이 `evidence` 로 **끝난다**(`:1219`) → 규칙 4에 따라 포함.

## 2. 규칙

- 🔴 **원문 `:1221-1224` — Acting 과 Interim 을 구분하라**(측정기가 필드로 오산한 2불릿의 정체):
  * **Acting**: 기존 Manager가 존재하지만 **일시 부재**(`:1223`) → §29
  * **Interim**: **Position 또는 역할이 공석**(`:1224`) → §31
  ★ **구분의 기준은 기간이 아니라 "원래 Manager 가 존재하는가"** 다. 이 축을 잃으면 §29 의 `original manager reference` 와 §31 의 `vacant position reference` 가 **동일 필드로 붕괴**한다 — 전자는 **사람을 가리키고** 후자는 **빈자리를 가리킨다**.
- 🔴 **`interim` grep 1건(`AttributionEngine.php:672`)을 §31 근거로 인용 금지.** 지오리프트 통계 중간결과다.
- 🔴 **`position_idx`(PM 태스크 정렬순서)를 Position 으로 오독 금지.**
- 🔴 **★Vacancy 는 Position 에 선행 불가 — 순서를 지켜라.** `vacant position reference` 를 설계하려면 **Position 엔티티가 먼저 존재해야 한다**. Position 없이 `vacancy_id` 를 만들면 **가리키는 대상이 없는 참조** = 팬텀이다. **§31 은 Position 축(§3.1 계열) 확정 이후**에만 착수 가능하다.
- 🔴 **★"공석"은 권한 축에서 실제로 비워져야 한다(§76 실재 항목).** 현행 `manager_user_id=NULL`(`updateTeam:493`)은 **표면 공석**일 뿐 — `:501` 이 NULL 일 때 후속 처리를 하지 않고 **강등 경로가 레포에 없어**(`team_role='manager'` 쓰기 `:774` 1곳 · `'member'` 복귀 UPDATE 0) 전임자가 **Active Manager 로 잔존**한다(`isManagerAdmin:136`→`putMemberPermissions:618`). **Interim 을 이 위에 얹으면 전임자와 Interim 이 동시에 manager 권한을 갖는다.** 공석 선언 = **전임자 권한 회수**가 동일 트랜잭션에서 강제돼야 한다.
- 🔴 **`team.manager_user_id` 를 Interim 슬롯으로 재사용 금지.** **1칸뿐**이라 Interim 을 넣는 순간 **공석 사실 자체가 소멸**한다(`updateTeam:495` 가 값을 덮어쓴다 → §76 *"Current Manager만 저장하는 구현"* `:2680` 적중). **공석은 "값이 없음"이 아니라 명시적 상태**여야 하며, NULL 로는 *"공석"* 과 *"미설정"* 을 **구분할 수 없다**(★`ORG_PRESET` 시드 15팀이 **전부 manager NULL** — `seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재 → **NULL=공석으로 읽으면 시드 15팀이 전부 공석으로 오인된다**).
- 🔴 **11종 "있다고 가정"하고 배선 금지.** 전 항목 `ABSENT`(이름·능력 양쪽) · **git 삭제 이력 0 = 존재한 적 없음**.
