# DSAR — Manager Conflict Type (§45)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §45 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

**본 문서 = §45 `MANAGER_CONFLICT` 의 Conflict Type 축(19).** 필수 필드 축(15)은 [DSAR_MANAGER_CONFLICT.md](DSAR_MANAGER_CONFLICT.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Conflict Type 열거 | **19종 전부 backend/src grep 0** | `ABSENT` |
| **순환 탐지 선례** | ✅ **DFS** `backend/src/Handlers/PM/Dependencies.php:79-100` · ✅ **Kahn** `backend/src/Handlers/PM/Gantt.php:104-125` | `LEGACY_ADAPTER`(**알고리즘만** — §57 재사용 강제) |
| self-loop 차단 선례 | `Dependencies.php:29-31`(`$pred === $succ` → 422 `self_dependency`) | `LEGACY_ADAPTER` |
| Acting/Vacant/Interim | `acting` **0** · `vacan` **0** · `interim` 1건 무관(`AttributionEngine.php:672` 지오리프트 중간결과) | `ABSENT` |

### ★축 주의 — **19종 전부 `ABSENT` 의 의미**(규율 규칙 10)

🔴 **충돌할 복수 관계 자체가 없다.** 현행에서 `MULTIPLE_PRIMARY_DIRECT_MANAGER` 가 0건인 것은 **`team.manager_user_id` 가 컬럼 1개라 두 번째 primary 를 담을 자리가 없어서**다. **우연한 일치를 준수로 계산 금지.**

### 🔴 §57 순환탐지 — **선례 재사용 강제 · 그러나 스키마 복제 금지**

`CIRCULAR_REPORTING`·`SELF_REPORTING` 은 **레포에 이미 정석 구현이 있다**(재구현 금지):

| 요소 | 증거 | 상태 |
|---|---|---|
| 반복형 DFS + `$visited` | `Handlers/PM/Dependencies.php:81-87` | ✅ 정석 |
| **tenant 필터 매 홉** | `:90-91` `WHERE tenant_id = ? AND predecessor_id = ?` | ✅ **필수 이식** |
| **쓰기 전 차단** | `:32-34` → 422 `cycle_detected` | ✅ **§58 관계 활성화 차단의 유일 선례** |
| self-loop 차단 | `:29-31` | ✅ |
| Topological Sort | `Handlers/PM/Gantt.php:104-118` · **`:119` `count($topo)!==count($taskMap)` 정석 판정** | ✅ (⚠️ `:120-125` **부분결과+경고 degrade** — 읽기 경로라 차단 안 함) |
| Recursive CTE / Closure Table / Graph Query / Path Prefix | — | ❌ **전부 0** |

- 🔴 **★경로 접두 필수 — `backend/src/PM/` 는 존재하지 않는다**(`ls` 실측: `No such file or directory`). 정확한 경로 = **`backend/src/Handlers/PM/`**. 5-3-3-1 문서 25편에 오표기가 전파됐다.
- 🔴 **`:84` `$depth < 10000` 은 깊이 캡이 아니라 방문 노드 예산**이다 — `:97` `$depth++` 가 **pop 마다** 실행된다. §57 "Maximum Depth"로 계산하면 오판.
- 🔴 **`:90-91` 이 `dep_type` 을 술어에 넣지 않아 전 타입 무차별 순회** → **§11 Manager Type 27종별 순환정책 표현 불가**. **`pm_task_dependencies` 스키마를 복제하면 이 결함을 설계 시점에 상속한다.**
- 🔴 **`ChannelSync.php:954-964` 는 순환 검출기가 아니다** — 주석 `:954` 가 *"순환/과도한 깊이 방어"* 를 자칭하나 **코드에 `$visited` 가 없고 `:959` 가 `$guard < 10` 으로 깊이만 자른다** → 순환 시 **탐지 없이 조용히 절단**. **§45/§57 후보 계산 금지**(규칙 8 — 주석이 아니라 정의부를 읽어라).

## 1. 원문 전사 + 판정 — **원문 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | MULTIPLE_PRIMARY_DIRECT_MANAGER | 🔴 `team.manager_user_id` **컬럼 1개** → 발생 불가(규칙 10) | `ABSENT` |
| 2 | MULTIPLE_PRIMARY_POSITION_SUPERVISOR | Position 축 0(§3.1 18/18 `CONTRACT_ONLY`) | `ABSENT` |
| 3 | SUBJECT_POSITION_MANAGER_MISMATCH | Subject·Position 양축 부재 → 비교쌍 0 | `ABSENT` |
| 4 | ADMINISTRATIVE_FUNCTIONAL_CONFLICT | `app_user.team_id` **단일 컬럼(1인 1팀)** → 병존 표현 불가 | `ABSENT` |
| 5 | ACTING_ORIGINAL_CONFLICT | `acting` grep 0 · 🔴 `UserAdmin::impersonate:466-525` 는 **신원 위장 열람**이지 직무대리 아님 | `ABSENT` |
| 6 | TEMPORARY_PERMANENT_CONFLICT | 기간부 Assignment 축 0(effective date 0) | `ABSENT` |
| 7 | INTERIM_INCUMBENT_CONFLICT | `interim` 1건 = 지오리프트 중간결과(`AttributionEngine.php:672`) — **무관** | `ABSENT` |
| 8 | CO_MANAGER_POLICY_MISSING | 복수 manager 표현 수단 0 | `ABSENT` |
| 9 | CROSS_TENANT_CONFLICT | ⚠️ **인접 위험 실재** — `resolveTenantId:200-217` **단일 홉 가정** · 286차 하이재킹 전례 | `ABSENT`(**단 아래 규칙 ★**) |
| 10 | CROSS_LEGAL_ENTITY_CONFLICT | Legal Entity 축 0 · `ceo_name` = **프로필 평문 문자열**(`UserAuth.php:306-307`) | `ABSENT` |
| 11 | EFFECTIVE_PERIOD_OVERLAP | **`valid_from`/`valid_to`/`effective_to` grep 0** → 겹칠 구간 자체가 없다 | `ABSENT` |
| 12 | SOURCE_PRIORITY_CONFLICT | **manager 보유 소스 = 0개**(ⓑ §7) → §62 와 동일하게 **무대상** | `ABSENT` |
| 13 | MANAGER_INELIGIBLE | 🔴 적격 술어 **0** — `Mapping::approve:287` 은 **정족수(숫자)뿐** | `ABSENT` |
| 14 | MANAGER_TERMINATED | 🔴 **`is_active` = 계정 상태이지 고용 상태가 아니다**(base DDL `Db.php:1106`) · `terminated` grep 0 | `ABSENT` |
| 15 | MANAGER_POSITION_VACANT | `vacan` grep 0 · ⚠️ **§76 실재 결함 2**: `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 전임자 `team_role='manager'` 잔존 | `ABSENT`(**잠복 결함 — 아래 규칙**) |
| 16 | SELF_REPORTING | ✅ **선례 有** — `Dependencies.php:29-31` self-loop 422(도메인만 다름) | `LEGACY_ADAPTER`(패턴 이식) |
| 17 | CIRCULAR_REPORTING | ✅ **선례 有** — `Dependencies.php:79-100` DFS+`$visited`+tenant 필터+**쓰기 전 차단** | `LEGACY_ADAPTER`(**알고리즘만** · 스키마 복제 금지) |
| 18 | HIERARCHY_PATH_MISSING | Path 축 **순수 신규**(§49 · Closure/CTE/Materialized Path **전례 0**) | `ABSENT` |
| 19 | CUSTOM | — | `ABSENT` |

**실측 개수: 19 / 19 전사.** 커버리지 = `ABSENT` 17 · `LEGACY_ADAPTER` 2(#16·#17 — **알고리즘 선례만**, 커버 아님).

## 2. 규칙

- 🔴 **`LEGACY_ADAPTER` 2건은 커버가 아니다.** `Dependencies`/`Gantt` 는 **PM 태스크 선후행 도메인**이며 Manager 관계가 아니다. **알고리즘만 이식하고 스키마는 복제하지 마라**(`dep_type` 무차별 순회 결함 상속 금지).
- 🔴 **재구현 금지 · 확장 우선**(Golden Rule). `CIRCULAR_REPORTING` 탐지기를 새로 쓰지 말고 `Dependencies::validateDependency:79-100` 의 **반복형 DFS + `$visited` + 매 홉 tenant 술어 + 쓰기 전 422 차단** 4요소를 그대로 따르라.
- ★ **차단 지점은 쓰기 경로여야 한다.** `Gantt.php:120-125` 의 **부분결과 degrade** 를 Manager 관계 쓰기에 적용하면 **순환 보고선이 저장된다**. 읽기(§49 Path 계산)에서만 degrade 허용.
- ★ **#9 `CROSS_TENANT_CONFLICT`**: 현행 `ABSENT` 이나 **위험은 실재**한다 — `app_user.parent_user_id` 3단 허용 시 `resolveTenantId:200-217` **단일 홉 가정이 붕괴**(286차 `platform_growth` 하이재킹과 동형). **Manager 관계 도입 전 tenant 해석 일반화가 선결.**
- ★ **#15 `MANAGER_POSITION_VACANT` 는 "없다"로 닫지 마라** — ⓑ §76 이 확인한 **실재 결함**이다: 공석 전환 시 전임자가 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`)을 **계속 보유**한다. §45 신설과 **무관하게 현행에 존재하는 결함**이며 별도 승인세션 대상.
- 🔴 **#13 `MANAGER_INELIGIBLE` 관련 규칙 10 적중**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다. "이미 적격 분리돼 있다"로 계산 금지.
</content>
