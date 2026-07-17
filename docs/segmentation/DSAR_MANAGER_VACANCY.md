# DSAR — Manager Vacancy (§42)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §42 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 전면 `ABSENT` — **공석을 표현할 Position 조차 없다**

| 계층 | 실측 | 결론 |
|---|---|---|
| **Vacancy 개념** | 🔴 **`vacan` grep 0** · **git 삭제 이력 0**(`vacancy` 삭제 이력 0) | **존재한 적이 없다** — 팬텀도 유물도 아니다 |
| **Position(직무)** | 🔴 **전역 0** — `position_id`·`position_ref`·`job_title`·`job_code` **grep 0**. `position_idx`(`PM/Milestones.php:28`·`Gantt.php:42`·`Tasks.php:167`)는 **PM 태스크 정렬순서** = **이름 함정** | 🔴 ★**공석이 될 자리 자체가 없다** |
| **Organization** | §3.1 **18/18 `CONTRACT_ONLY`** — `ORGANIZATION_*` **backend/src grep 0** · `parent_team_id` **grep 0**(팀 트리 없음) | `CONTRACT_ONLY` |
| **Manager 관계** | `manager_id`·`reports_to`·`supervisor_id`·`department_head_id`·`head_id` **전부 grep 0** | `ABSENT` |
| **Interim / Acting** | 🔴 **`acting` 0** · **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) · `deputy`/`substitute`/`stand_in` **0** | `ABSENT` |
| **Fallback 정책** | 🔴 **`fallback_policy`·`fallback_sequence` grep 0**(§43) | `ABSENT` |

> 🔴 ★**핵심 — §42 는 "공석 처리가 미흡하다"가 아니라 "공석이라는 개념이 성립할 구조가 없다"**이다.
> 공석 = **자리(Position)는 있는데 사람이 없는 상태**다. **현행에 자리가 없으므로 공석도 정의 불가.**

### 🔴 §76 실재 사례 — **"Vacant Position 을 Active Manager 로 처리"**

ⓑ 전수조사에서 **§76 항목 중 실재 확인된 3건 중 하나가 정확히 §42 도메인**이다:

- `promoteManager:768-776` = `app_user.team_role='manager'`+`team_id` UPDATE(`:774`) · owner 강등 차단(`:773`)
- 🔴 **강등 경로 0** → `team.manager_user_id=NULL` 로 바꿔도(= **공석화**) **전임자 `team_role='manager'` 잔존**
- → **위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) 계속 보유**

📌 **즉 현행에서 "공석"을 만드는 유일한 조작(`manager_user_id=NULL`)은 권한을 회수하지 않는다.** `manager_user_id INT NULL`(DDL `TeamPermissions.php:148` MySQL / `:168` SQLite)이 **nullable** 이라는 것이 **공석 지원처럼 보이나**, NULL 은 **"공석"이 아니라 "미설정"** 이며 **둘을 구분할 수단이 없다**.

> ★**규칙 10 적중** — `ORG_PRESET` **시드 15팀 전부 manager NULL**(🔴 `seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` **부재**). **이것을 "공석 15건"으로 계산하면 오판**이다 — **미설정이지 공석이 아니다**. 구분할 축이 없다.

### 대조 축 실측

| §42 요구 축 | 인접 후보 | 실체 | 판정 |
|---|---|---|---|
| `risk level` | `risk_level`(`CustomerAI.php:78-82`,`:179`) | 🔴 **고객 이탈 위험**(high/medium/low) — **고객 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| `affected approval tasks` | — | 🔴 **Task/배정/클레임 개념 전무** · 승인은 노드가 아니라 **핸들러 메서드**(`Mapping::approve:238-294`) | `ABSENT` |
| `previous manager` | `TeamPermissions.php:492-501` | 🔴 **교체 시 전임자 기록 0** | `ABSENT` |
| `expected fill date` | — | 🔴 **미래 일자 컬럼 0**(§39) | `ABSENT` |
| `evidence` | `pm_audit_log` | `tenant_id NOT NULL`(migration `20260526_168_008:7`)+`diff_json`(`:13`)+append-only(`:2-3`) | `LEGACY_ADAPTER`(참조) |

## 1. 원문 전사 + 판정 — **원문 24종** (Vacancy Type 9 + 필수 필드 15)

### 1-1. Vacancy Type — **9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | POSITION_VACANT | 🔴 **Position 전역 0** — 공석이 될 자리가 없다 · `position_idx` = PM 태스크 정렬(함정) | `ABSENT` |
| 2 | MANAGER_TERMINATED | 🔴 **`terminated`·`deleted_at` grep 0** · `is_active=0` 은 **3경로 혼재**(`UserAuth.php:1380`·`EnterpriseAuth.php:412`·`UserAdmin.php:361`)로 종료와 구분 불가 · ★SCIM `scimDeleteUser:412` 가 유일 확장 지점 | `ABSENT`(확장지점 有) |
| 3 | MANAGER_TRANSFERRED | 🔴 **이동(Transfer) 개념 0** · 조직 축 `CONTRACT_ONLY` | `ABSENT` |
| 4 | MANAGER_ON_EXTENDED_LEAVE | 🔴 **`on_leave` grep 0** · Leave Status 전역 0(§41) | `ABSENT` |
| 5 | ORGANIZATION_HEAD_MISSING | 🔴 `department_head_id`·`head_id` **grep 0** · 조직 축 **18/18 `CONTRACT_ONLY`** | `CONTRACT_ONLY` |
| 6 | SOURCE_DATA_MISSING | 🔴 **§3.4 외부 소스 42항목 전부 부재** — HRIS/ERP/Directory 히트 0 · **manager 를 싣는 소스 0개** → **누락을 탐지할 소스 자체가 없다** | `ABSENT` |
| 7 | INTERIM_PENDING | 🔴 **`interim` 1건 = 지오리프트**(`AttributionEngine.php:672`) — 이름 함정 | `ABSENT` |
| 8 | REORGANIZATION | 🔴 조직 재편 개념 0 · `ORG_PRESET` = **열거+시딩**(계층 링크 0) | `ABSENT` |
| 9 | UNKNOWN | 🔴 **미지 상태 표현 전례 0** — §41 `is_active NOT NULL DEFAULT 1` 이 **미지를 자동 "가용"으로 만드는 fail-open** 과 동형 위험 | `ABSENT` |

> ★ **Vacancy Type 목록은 `evidence` 로 끝나지 않는다**(`UNKNOWN` 이 마지막 · `:1572`). **추가하지 않았다.**

### 1-2. 필수 필드 — **15종**

`MANAGER_VACANCY`:

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 10 | manager_vacancy_id | 부재 — Vacancy 엔티티 0 | `ABSENT` |
| 11 | position reference | 🔴 **Position 전역 0** — 참조할 대상 없음 | `ABSENT` |
| 12 | organization reference | §3.1 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend grep 0) | `CONTRACT_ONLY` |
| 13 | expected relationship type | 🔴 **관계 Type 축 0**(§4.6 · `team.manager_user_id` = **단일 칸** → Direct/Functional/Project 병존 표현 불가) | `ABSENT` |
| 14 | previous manager | 🔴 **교체 시 전임자 기록 0**(`TeamPermissions.php:492-501`) — 게다가 **강등도 0** → 전임자는 **기록되지 않은 채 권한만 잔존** | `ABSENT` |
| 15 | vacancy type | 부재(위 9종 전부) | `ABSENT` |
| 16 | vacancy start | 🔴 **시점 컬럼 0** — `manager_user_id=NULL` 전이 시각 미기록 | `ABSENT` |
| 17 | expected fill date | 🔴 **미래 일자 컬럼 0**(§39) · `kr_fee_rule.effective_from` 은 **미래 행 배제 술어 없음**(`WHERE effective_from <= NOW()` **전역 0**) | `ABSENT` |
| 18 | interim manager reference | 🔴 `interim`·`acting`·`deputy`·`substitute` **전부 0/무관** | `ABSENT` |
| 19 | fallback policy | 🔴 **`fallback_policy`·`fallback_sequence` grep 0**(§43 전면 `ABSENT`) | `ABSENT` |
| 20 | affected subjects | 부재 — 영향 계산기 0 | `ABSENT` |
| 21 | affected approval tasks | 🔴 **Task 개념 전무** · 🔴 승인자 후보 계산기 0(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0**) | `ABSENT` |
| 22 | risk level | 🔴 `risk_level`(`CustomerAI.php:78-82`,`:179`) = **고객 이탈 위험** — **도메인 상이** | `KEEP_SEPARATE_WITH_REASON` |
| 23 | status | 부재 · 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`TeamPermissions.php:148`) = **팀 상태** | `ABSENT` |
| 24 | evidence | 부재 · 인접 = `pm_audit_log`(`tenant_id NOT NULL` + `diff_json` + append-only) | `LEGACY_ADAPTER`(참조) |

**실측 개수: 24 / 24 전사** (9 + 15). (측정기 24 · 원문 대조 24 · 전사 24 — **3자 일치**.)
커버리지 = **`ABSENT` 20 · `CONTRACT_ONLY` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · `LEGACY_ADAPTER` 1 · 커버 0**.

## 2. 규칙

- ★ **§42 전면 판정 = `ABSENT`.** `vacan` **grep 0** · **git 삭제 이력 0** → **존재한 적이 없다**(팬텀도 유물도 아니다).
- 🔴 **★공석은 Position 의 속성이다. Position 이 없으면 §42 는 정의 불가.** `position_idx`(`PM/Milestones.php:28`·`Gantt.php:42`·`Tasks.php:167`)는 **PM 태스크 정렬순서**이며 직무가 아니다 — **`position reference` 근거로 계산하면 이름 함정에 걸린다**(규칙 7). **§42 는 Position 엔티티 신설에 선행 종속**한다.
- 🔴 **★`manager_user_id = NULL` 을 공석으로 읽지 마라.** `INT NULL`(`TeamPermissions.php:148`)이 nullable 인 것은 **공석 지원이 아니라 미설정 허용**이다. **NULL 하나로 "공석"·"미설정"·"아직 안 정함"·"조직 재편 중"을 구분할 수 없다**(규칙 10 — 현행이 단일 상태인 것은 **여러 상태를 표현할 수단이 없어서**). 🔴 `ORG_PRESET` **시드 15팀 전부 manager NULL**(`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` **부재**)을 **"공석 15건"으로 계산 금지 — 미설정이다.**
- 🔴 **★§76 실재 결함을 설계에 반영하라 — "Vacant Position 을 Active Manager 로 처리"**: `promoteManager:768-776` 이 **승격만 하고 강등 경로가 0** 이라, `manager_user_id=NULL` 로 공석화해도 **전임자 `team_role='manager'` 가 잔존**해 **위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`)을 계속 보유**한다. 📌 **공석 선언은 반드시 권한 회수를 같은 트랜잭션에 포함**해야 한다. 그러지 않으면 **공석 테이블만 늘고 권한은 그대로** = 가짜 녹색.
- 🔴 **`risk_level` 을 재사용하지 마라** — `CustomerAI.php:78-82`,`:179` 의 것은 **고객 이탈 위험**이다. **도메인 상이 → `KEEP_SEPARATE_WITH_REASON`.** 형태 유사를 커버로 계산하면 역산.
- 🔴 **`SOURCE_DATA_MISSING` 은 소스가 있어야 성립한다** — 현행 **manager 를 싣는 소스 0개**(§3.4 42항목 전부 부재 · SCIM `manager` **전역 0** · `sso_config` DDL `EnterpriseAuth.php:45-54` = `email_attr`·`name_attr` **2슬롯뿐 · `manager_attr` 없음**). **누락 탐지 이전에 무대상**(§62 와 동형).
- 🔴 **`UNKNOWN` 을 fail-open 기본값으로 두지 마라** — §41 `is_active TINYINT(1) NOT NULL DEFAULT 1`(`Db.php:1106`)이 **미지를 자동으로 "가용"** 으로 만드는 것과 동형 위험. **Vacancy 미지는 `BLOCK_APPROVAL` 쪽으로 fail-closed.**
- **`fallback policy` 는 §43 에 종속** — §43 전면 `ABSENT`(`fallback_policy` grep 0). **§43 선행 없이 §42 의 이 필드를 채우면 역산.**
- 🔴 **24종 "있다고 가정"하고 배선 금지.**
