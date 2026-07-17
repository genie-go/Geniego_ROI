# DSAR — Position Manager Binding (§16)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §16(863-893) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★대전제 — **§16 은 전면 `ABSENT`. Position 엔티티 자체가 존재하지 않는다.**

§13·§14·§15·§17 은 최소한 형태 유사 대체물이라도 있으나, **§16 은 좌변·우변·바인딩 전부 부재**다.

| 검증 축 | 실측 | 결론 |
|---|---|---|
| Position 엔티티 | `position_unit` **0** · Position/Job/Post 명부 테이블 **0** | **부재** |
| 재직자 | `incumb` **0** | **부재** |
| 공석 | `vacan` **0** · `vacancy` **git 삭제 이력 0** | **부재** |
| 대리·직무대행 | `acting` **0** · `deputy`/`substitute`/`stand_in` **0** · `interim` 1건 무관 | **부재** |

★**부재증명은 이름이 아니라 능력으로**(규칙 7): 이름 grep 0 에 더해 **명부·재직 배정·공석 전환·계층 레벨 어느 능력도 코드에 없다.**
★**git 이력 확인**: `vacancy`·`acting_manager`·`deputy` **삭제 이력 0** → **팬텀도 유물도 아니다 — 존재한 적이 없다.**

### 🔴 ★`position_idx` 함정 — **최우선 오염원**

`position` grep 의 **전 히트가 `position_idx`** 이며 **PM 태스크·마일스톤 정렬순서**다:
- `Handlers/PM/Milestones.php:28`(`ORDER BY target_date, position_idx, id`)·`:77`(갱신 화이트리스트)
- `Handlers/PM/Gantt.php:42`(`ORDER BY position_idx, id`)
- `Handlers/PM/Tasks.php:167`(`ORDER BY COALESCE(parent_task_id, ""), position_idx, id`)

🔴 **`position_idx` 를 §16 Position 으로 계산하면 축 자체를 날조하는 것이다.** 정렬 정수이지 조직 직위가 아니다.

### 🔴 ★원문 요구와 현행 현상이 **정반대**다 — §17 설계 시 반드시 반영

원문 890: *"Position이 공석이더라도 관계 자체를 삭제하지 마라."*
**현행은 그 반대 사고를 일으킨다** — Position 이 없으므로 §16 자체는 `ABSENT` 이나, **최근접 자산인 `team.manager_user_id` 의 공석 전환에서 정확히 반대 현상이 실재**한다:

| 단계 | 코드 | 현상 |
|---|---|---|
| 공석 전환 | `TeamPermissions.php:492-495`(`$newMgr = null`) → UPDATE `:500` | `team.manager_user_id = NULL` 로 **관계 슬롯만 비워짐** |
| 강등 | 🔴**`:501` 이 `if ($newMgr !== null)` 일 때만 `promoteManager` 호출** → **강등 경로 0** | 🔴**전임자 `app_user.team_role='manager'` 잔존** |
| 결과 | `isManagerAdmin:136` · `putMemberPermissions:618` | 🔴**전임자가 위임 권한을 계속 보유** |

★**§76 실사례 2 "Vacant Position 을 Active Manager 로 처리" 가 현행에 실재한다.**
→ **원문은 "관계를 지우지 마라"를 요구하나, 현행은 "관계를 지워도 권한이 남는다".** 문제의 방향이 다르다 — 🔴**"현행이 이미 관계를 보존하고 있다"로 계산하면 정반대 오판**이다(잔존은 보존이 아니라 **누수**다).
★**본 사실은 §17 문서 §0 축 주의에도 명시했다**(최근접 자산이 §17 축이므로).

### 그 외 인접 자산도 §16 축이 아니다

| 자산 | 실제 축 | 증거 |
|---|---|---|
| `team.manager_user_id` | **조직당 1칸** → **§17 축**(Position 아님) | DDL `TeamPermissions.php:148` |
| `team_role='manager'` | **롤 라벨** | `UserAuth.php:168` |
| `pm_task_assignees(role ENUM('owner','contributor','reviewer','observer'))` | **태스크 역할**(migration `…168_005`) | 매니저·직위 아님 |
| `pm_raid.owner` | RAID 담당자 **자유문자열** | `Handlers/PM/Enterprise.php:42`,`:60` |
| `wms_warehouses.manager VARCHAR(120)` | **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** | `Wms.php:62`/`:112` · 쓰기 `:290`,`:299`,`:313` → `NAME_ONLY` |

### 계층 레벨·시점 축

- `hierarchy_level`·`org_level`·`depth`(조직) **0**. 🔴**`ChannelSync.php:955-962` 의 depth 는 순환 검출기가 아니다** — `$visited` 없이 **깊이만 자름** → 순환 시 **탐지 없이 조용히 절단**. **§57 후보 계산 금지.**
- `valid_from`·`valid_to`·`effective_to` **grep 0**. ★**`valid_to` 유일 히트 `Onsite.php:396` 은 `'invalid_token'` 부분일치 = 위양성.**

## 1. 원문 전사 + 판정 — **원문 18종**

**전면 `ABSENT`** — Position 엔티티가 없으므로 18종 전부 좌변이 성립하지 않는다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | position_manager_binding_id | 바인딩 엔티티 부재 · Position 엔티티 부재 | `ABSENT` |
| 2 | subordinate position id | 🔴**Position 엔티티 0** — `position_unit` 0 · ★**`position_idx` = PM 태스크 정렬순서**(`Handlers/PM/Gantt.php:42` 등) → 매핑 금지 | `ABSENT` |
| 3 | manager position id | 동상 — Position 엔티티 0 | `ABSENT` |
| 4 | relationship type | §11 Manager Type 27종 표현 수단 0 · `team_role='manager'` 는 **롤 라벨의 값** | `ABSENT` |
| 5 | tenant_id | 바인딩 엔티티가 없어 적용 대상 없음(패턴 자체는 `app_user`/`team` 에 실재 `UserAuth.php:155`·`TeamPermissions.php:146`) | `ABSENT` |
| 6 | subordinate organization | Position↔조직 링크 0 · **`parent_team_id` 없음 → 팀 트리 자체가 없다**(`:146-150`) | `ABSENT` |
| 7 | manager organization | 동상 | `ABSENT` |
| 8 | legal entity scope | **Legal Entity Officer `ABSENT`** — `ceo_name` = `app_user` 프로필 **평문 문자열**(`UserAuth.php:306-307`) · FK·감독관계 전무 · 🔴**`DATA_SCOPES` `'company'` = 무제한 센티넬**(`effectiveScope():258`)이지 법인 아님 | `ABSENT` |
| 9 | hierarchy level | 조직 계층 레벨 축 0 · 🔴**`ChannelSync.php:955-962` depth 를 계층으로 계산 금지**(`$visited` 없는 무음 절단) | `ABSENT` |
| 10 | primary 여부 | Position 이 없어 복수/단일 판정 자체가 무의미(규칙 10 — 우연한 일치조차 성립 안 함) | `ABSENT` |
| 11 | incumbent required 여부 | 🔴**`incumb` grep 0** — 재직자 개념 전무 · 배정 축 0 | `ABSENT` |
| 12 | vacancy handling policy | 🔴**`vacan` grep 0** — 공석 정책 전무. ★**최근접 자산에서는 정반대 현상**(§0 — 공석 전환 시 전임자 `team_role='manager'` **잔존** · `TeamPermissions.php:501` 강등 경로 0 = **§76 실사례 2**) | `ABSENT` |
| 13 | approval routing eligible 여부 | 🔴**승인자 후보를 계산하는 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **0**(`approver` 2건은 에러 메시지 문자열 `Mapping.php:248`,`:280`) | `ABSENT` |
| 14 | valid_from | `valid_from` grep **0** | `ABSENT` |
| 15 | valid_to | `valid_to` grep **0** (★`Onsite.php:396` `'invalid_token'` = 부분일치 위양성) | `ABSENT` |
| 16 | source | 🔴**Position 을 싣는 소스 0개** — SCIM `manager` **전역 0** · `employeeNumber` **0** · `sso_config` DDL(`EnterpriseAuth.php:45-54`) = `email_attr`·`name_attr` **2슬롯뿐** · HRIS/ERP/Directory 커넥터 카탈로그 행 0 · fetcher 0 | `ABSENT` |
| 17 | status | 바인딩 엔티티가 없어 적용 대상 없음(패턴 자체는 `team.status` `:148` 에 실재) | `ABSENT` |
| 18 | evidence | 증거 첨부 축 0 · §66 Reconciliation 은 **좌·우변 이중 부재** | `ABSENT` |

**실측 개수: 18 / 18 전사** (측정기 18 · 원문 대조 18 · 전사 18 — **3자 일치**).
커버리지 = `ABSENT` 18. **전면 부재 — `VALIDATED_LEGACY`·`LEGACY_ADAPTER`·`PARTIAL` 0종.**

## 2. 원문 지시 전사

| # | 원문 지시 | 현행 판정 |
|---|---|---|
| 1 | **"Position 기반 Reporting Line은 현재 Incumbent를 Resolution 단계에서 연결하도록 하라."** (원문 888) | 🔴**전제 미성립** — Position·Incumbent **양쪽 부재**(`position_unit` 0 · `incumb` 0) · Resolution 단계 자체가 없다(승인자 후보 계산 코드 0) |
| 2 | **"Position이 공석이더라도 관계 자체를 삭제하지 마라."** (원문 890) | 🔴**현행은 정반대 현상** — Position 이 없어 §16 은 `ABSENT` 이나, 최근접 자산(`team.manager_user_id`)의 공석 전환은 **관계 슬롯을 비우면서 권한은 남긴다**(`TeamPermissions.php:501` 강등 경로 0 → 전임자 `team_role='manager'` 잔존 → `isManagerAdmin:136`·`putMemberPermissions:618` 계속 보유) = **§76 실사례 2**. 🔴**"관계가 보존되고 있다"로 읽으면 정반대 오판 — 잔존은 보존이 아니라 누수다** |

## 3. 규칙

- 🔴 **§16 은 18/18 `ABSENT` 다.** Position 엔티티가 **존재한 적이 없다**(이름 0 + 능력 0 + git 삭제 이력 0). **부분 커버·어댑터 후보 0종.**
- 🔴 **`position_idx` 를 §16 Position 으로 계산 절대 금지** — **PM 태스크·마일스톤 정렬순서**다(`Handlers/PM/Milestones.php:28`·`Gantt.php:42`·`Tasks.php:167`). `position` grep 의 **전 히트가 이것**이며, §16 검색 시 **최우선 오염원**이다.
- 🔴 **`team.manager_user_id` 를 §16 으로 매핑 금지** — **조직당 1칸 = §17 축**이다. Position 은 **조직과 사람 사이의 별도 계층**이며, 현행에는 그 계층이 통째로 없다. §17 로 §16 을 대체하면 **§16 의 요구(incumbent required·vacancy handling·hierarchy level)가 정의상 소멸하는 역산**이다(규칙 9).
- 🔴 **원문 지시 2("공석이어도 관계 삭제 금지")를 "현행 준수"로 계산 금지.** 현행의 공석 전환은 **관계는 비우고 권한은 남긴다** — 원문이 요구한 것과 **문제의 방향이 반대**다. 🔴**§17 설계 시 `promoteManager` 의 짝(강등 경로)을 반드시 함께 설계**하라(`TeamPermissions.php:501` 이 `$newMgr !== null` 일 때만 호출 → 공석·교체 양쪽에서 전임자 권한 누수).
- 🔴 **Position 신설 시 `pm_task_dependencies` 스키마 복제 금지** — `Handlers/PM/Dependencies.php:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회**. 이 결함을 물려받으면 **§11 Manager Type 27종별 순환정책이 설계 시점에 이미 불가능**해진다.
  - 이식할 것은 **알고리즘뿐** — 반복형 DFS + `$visited` + **tenant 필터 `:91` 매 홉** + **쓰기 전 차단 `:32-34`**(422 `cycle_detected`) + self-loop `:29-31`. ★**`:84` `$depth<10000` 은 깊이 캡이 아니라 방문 노드 예산**(`:97` `$depth++` 가 **pop 마다**) → **`hierarchy level` 로 계산하면 오판.**
  - 🔴 **★경로 접두**: `backend/src/Handlers/PM/…` (**`backend/src/PM/` 는 존재하지 않는다** — 5-3-3-1 문서 25편에 오표기 전파).
- 🔴 **`source` 를 "IdP/SCIM 이 Position 을 준다"로 역산 금지** — SCIM `manager` **전역 0** · `employeeNumber` **0** · `scimCreateUser:364-375` 는 userName·name·externalId·groups **5종만** 파싱 · **`/Schemas`·`/ResourceTypes` 디스커버리 부재**. ★**PATCH 는 침묵 no-op(가짜 녹색)**(`scimUpdateUser:391-396` 이 `'active'` 경로만 분기 → `PATCH {"path":"manager"}` 에 **200 + 정상 User 반환 · 저장된 것은 없음**. **현재 소비자 0 → 관찰 사실·등급 미부여**).
- 🔴 **`ORGANIZATION_GRAPH_NODE`/`_EDGE` 로 Position 계층을 저장하려는 시도 주의** — `graph_node`/`graph_edge`(`Db.php:816-839`)가 **스키마 쌍둥이** → 신설 시 **두 번째 그래프 스토어 = 헌법 위반**. 단 재사용도 막혀 있다: **`GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` → 422 가 조직/Subject 노드 저장을 차단**한다(게이트 사실). ⚠️`graph_node` **인덱스·UNIQUE 0**(`:816-824` = id PK 뿐 · `:838-839` 는 **edge 전용**) · **내부 생산자 0 → VACUOUS 미배제.**
- 🔴 **`wms_warehouses.manager`(`Wms.php:62`/`:112`)를 Position 담당자로 오독 금지** — **`region`·`country` 와 같은 테이블에 공존**해 오독하기 쉽다. **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** → `NAME_ONLY`.
- 🔴 18종 **"있다고 가정"하고 배선 금지.**
