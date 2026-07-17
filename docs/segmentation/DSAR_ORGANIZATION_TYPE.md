# DSAR — Organization Type Registry (§10)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §10 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_TYPE` 테이블 | `organization_type` **grep 0** — **타입이 엔티티가 아니다** | `NOT_APPLICABLE`(부재 → 신설) |
| **최근접 = `TEAM_TYPES`** | 17종 **PHP const 평면 문자열**(TeamPermissions.php:44-49) · ★주석 :43 *"팀 유형(스펙 조직/파트너 구조). **자유 입력도 허용하되** 카탈로그로 안내"* → **검증 없는 자유문자열** | `KV_ONLY` |
| 저장 | `team.team_type VARCHAR(48) DEFAULT 'custom'`(:147) — **FK 없음 · CHECK 없음 · 타입 테이블 없음** | `KV_ONLY` |
| ★**타입에 붙은 유일한 메타** | `ORG_PRESET`(:706-722) 각 항목의 `scope`·`perms` — **타입별 기본 권한·데이터범위**(주석 :703-704 *"각 팀은 의미 있는 기본 권한과 데이터 접근 범위를 함께 부여(빈 팀 방지)"*). 단 **시딩 시점 1회 복사**(`seedOrg:742-743` `replacePerms`/`replaceScope`)이지 **런타임 타입 속성 아님** | `PARTIAL` |
| 계층 제약 | `parent type constraints`/`child type constraints` **grep 0** — ★**계층 자체가 없으므로**(`team` DDL 에 `parent_team_id` 없음 :145-151/:168) 제약이 성립할 여지 0 | `NOT_APPLICABLE` |
| 관계 타입 허용목록 | `allowed relationship types` **grep 0** — §11 관계 타입 열거 자체가 부재 | `NOT_APPLICABLE` |
| 승인 계층 | `approval hierarchy` **grep 0** · ★인접 `perms` 의 `'approve'` 액션(`ORG_PRESET` :708·:711·:716·:717)은 **메뉴별 액션 플래그**이지 승인 라우팅 계층 아님 | `KV_ONLY` |

**★"타입이 엔티티가 아니다"가 이 축의 전부.** 원문 §10 은 타입을 **레지스트리 행**으로 놓고 17개 속성(hierarchical 여부·parent/child 제약·allowed relationship types·4개 eligible 플래그…)을 매단다. 현행은 **`VARCHAR(48)` 자유문자열 1개**(:147)다. 따라서 **16/17 필드가 걸릴 곳이 없다** — 개수가 아니라 **축의 부재**다.

**★대칭 오류 경계** — `ORG_PRESET` 의 `scope`/`perms` 가 "타입별 기본값"처럼 보이지만 **타입 속성이 아니다**. ⓐ `seedOrg` **시딩 시점에 `acl_permission`/`data_scope` 행으로 1회 복사**될 뿐(:742-743) ⓑ 이후 타입을 바꿔도 **아무것도 재적용되지 않는다** ⓒ **`ORG_PRESET` 15항목 ≠ `TEAM_TYPES` 17종** — `internal_super`·`custom` 2종은 프리셋이 없다. **"타입에 기본권한이 달려 있다"고 계산하면 역산.**

## 1. 원문 전사 + 판정 — 필수 필드 **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_type_id | 부재 — **타입이 행이 아니라 문자열**(`team.team_type VARCHAR(48)` :147) · ID 없음 | `NOT_APPLICABLE` |
| 2 | type_code | 부재(컬럼) · ★사실상 대응 = `TEAM_TYPES` 17 값(:44-49 `internal_super`…`custom`) — **const 배열이지 코드 컬럼 아님** · **검증 없음**(주석 :43 "자유 입력도 허용") | `KV_ONLY` |
| 3 | type_name | 부재 — 표시명 0 · ★`ORG_PRESET` 의 `name`(:707-721 '브랜드팀'·'마케팅팀'…)은 **팀 인스턴스 이름**이지 타입 이름 아님 · **다국어 0** | `NOT_APPLICABLE` |
| 4 | category | 부재 — Category 축 자체가 없음([§8](DSAR_ORGANIZATION_CATEGORY.md) 35종 중 실재 `TEAM` 1종) | `NOT_APPLICABLE` |
| 5 | tenant configurable 여부 | 부재(플래그) · ★실상 = **전역 const 고정**(`TEAM_TYPES` PHP 상수 :44)이라 **테넌트가 설정할 수 없다** · 동시에 `team_type` 은 **자유입력 허용**(:43·:147 CHECK 없음) → **거버넌스 없는 무제한 확장**(플래그로 통제되는 것이 아니라 통제 자체가 없음) | `NOT_APPLICABLE` |
| 6 | hierarchical 여부 | 부재 — ★**계층이 없으므로 무의미**(`team` DDL `parent_team_id` 없음 :145-151/:168) | `NOT_APPLICABLE` |
| 7 | legal entity required 여부 | 부재 — **법인 엔티티 자체가 없다**(`legal_entity` grep 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** · 사업자정보는 `app_user` 프로필 평문 UserAuth.php:499·:1720) | `NOT_APPLICABLE` |
| 8 | country required 여부 | 부재 · 인접 `app_user.country`(:499)는 **프로필 문자열** · `Geo`(Geo.php:23-53)는 IP→ISO alpha-2→**언어** 매핑 · **Country→Region 매핑 코드 0건** | `NOT_APPLICABLE` |
| 9 | parent type constraints | 부재 — grep 0 · 계층 부재로 성립 여지 0 | `NOT_APPLICABLE` |
| 10 | child type constraints | 부재 — grep 0 | `NOT_APPLICABLE` |
| 11 | allowed relationship types | 부재 — §11 관계 타입 열거 자체가 없음([§11](DSAR_ORGANIZATION_RELATIONSHIP_TYPE.md)) · ★인접 `pm_task_dependencies.dep_type ENUM('FS','SS','FF','SF')`(migration `20260526_168_004:9`)는 **작업 일정 의존**이지 조직 관계 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | approval hierarchy eligible 여부 | 부재 — 승인 라우팅 0 · ★인접 `perms` `'approve'` 액션(`ORG_PRESET` :708 marketing·:711 sales_pipeline·:716 returns·:717 finance/settlement)은 **메뉴별 액션 플래그**(`acl_permission.actions VARCHAR(255)` :155)이지 **계층 라우팅 아님**(누구에게 올라가는지 0) | `KV_ONLY` |
| 13 | manager hierarchy eligible 여부 | 부재 — ★`reports_to` **grep 0** · `manager_id` **grep 0** · `team.manager_user_id INT NULL`(:148)은 **팀 관리자 1인 포인터**이지 보고선 아님 · ★`seedOrg:739` 는 이 컬럼을 **기입조차 하지 않는다**(시드 15행 전부 NULL) | `NOT_APPLICABLE` |
| 14 | authority matrix eligible 여부 | 부재 — `matrix_` **grep 0** · ★인접 = `acl_permission`(:152-159 `subject_type·subject_id·menu_key·actions` · `UNIQUE uq_acl` :157) = **주체×메뉴×액션 매트릭스 실재**. 단 **주체가 조직 타입이 아니라 team/user 인스턴스**이고 **타입 eligible 개념 0** | `LEGACY_ADAPTER` |
| 15 | financial scope eligible 여부 | 부재(플래그) · ★인접 `DATA_SCOPES` 9종(:41)에 `company`·`settlement` 관련 존재하나 — 🔴**`'company'` 는 무제한 센티넬**(`effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한`) → **재무 경계를 긋는 게 아니라 지운다** | `NOT_APPLICABLE` |
| 16 | status | 부재(타입) · `team.status`(:148)는 **인스턴스 상태**이지 타입 상태 아님 → 타입 폐기(deprecate) 불가 | `NOT_APPLICABLE` |
| 17 | evidence | 부재 — 전 도메인 0 | `NOT_APPLICABLE` |

**실측 개수: 17 / 17 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · KV 3 · 어댑터 1 · 도메인 상이 1 · 부재 12.

## 2. 규칙

- 🔴 **`TEAM_TYPES` 17종을 Organization Type Registry 로 계산 금지 — 축이 다르다.** ⓐ **엔티티가 아니라 PHP const**(:44) ⓑ **속성 0**(hierarchical·제약·eligible 플래그 어느 것도 없음) ⓒ **강제되지 않음**(`team.team_type` :147 에 FK·CHECK 없음 · 주석 :43 "자유 입력도 허용"). **17개 값이 존재한다는 것과 타입 레지스트리가 있다는 것은 다르다**(규율 3 — 개수는 분모가 아니다).
- 🔴 **`ORG_PRESET` 의 `scope`/`perms` 를 "타입 속성"으로 계산 금지.** **시딩 시점 1회 복사**(`seedOrg:742-743`)이며 타입 변경 시 **재적용되지 않는다**. 게다가 **`ORG_PRESET` 15 ≠ `TEAM_TYPES` 17**(`internal_super`·`custom` 은 프리셋 없음) → 타입↔기본값이 **전사(全射)도 아니다**.
- 🔴 **`TEAM_TYPES` 재구현 금지 — 확장만.** 타입 레지스트리 신설 시 17 값을 **시드로 이관**하고 `team.team_type` 을 **문자열 그대로 유지**하라(FK 를 강제하면 자유입력된 기존 값이 **전부 무효**가 되어 후퇴한다). 정합은 **신규 행 검증 + 기존 값 `custom` 흡수**로 점진 확보.
- 🔴 **`hierarchical`/`parent type constraints`/`child type constraints` 는 §7 `parent reference` 와 §11 관계 테이블 신설에 종속** — 계층이 없는 상태에서 제약만 만들면 **집행되지 않는 계약**(`CONTRACT_ONLY`)이 된다.
- 🔴 **`authority matrix eligible` 을 `acl_permission` 으로 커버 계산 금지.** 매트릭스는 실재하나(:152-159) **주체가 조직 타입이 아니라 인스턴스**다. 다만 **재구현은 절대 금지** — 권한 매트릭스는 `acl_permission` 이 정본이며(`MENU_CATALOG` 26키 :55-82 가 서버 SSOT), 조직 타입 eligible 플래그는 **그 위에 얹는 게이트**로만 설계한다.
- 🔴 **`financial scope eligible` 설계 시 `DATA_SCOPES` `'company'` 의미 반전 필독.** `effectiveScope():258` 이 **`null`(무제한)을 반환**한다. `'company'` eligible 을 재무 경계로 읽으면 **정반대 결과**가 나온다.
- 🔴 **권한 "상속"이 조직 전파가 아님을 전제하라.** `clampActions`(:382-389·:396-402)는 **하향 클램프** — 팀 권한을 **상한**으로 멤버 권한을 교집합 축소한다. **조직 계층 전파 아님.** 또한 :230 주석의 "팀 스코프 상속"은 **상속이 아니라 폴백**(:253-254 — user 에 없으면 team **1회** 조회 · 단일 홉 · 비재귀 · **부모 팀 컬럼 자체가 없어 구조적 불가**). **주석을 근거로 삼지 마라**(규율 10).
- `manager hierarchy eligible` 은 `reports_to`·`manager_id` **양쪽 grep 0** 이므로 **순수 신규**다. `team.manager_user_id`(:148)를 보고선으로 승격하려면 **시드 15행 NULL 문제**(`seedOrg:739` 미기입)를 먼저 해결해야 한다 — ⚠️단 이는 **관찰 사실 · 등급 미부여**(시딩 시점 담당자 미정은 합리적 설계일 수 있음).
- ⚠️ **`data_scope` 런타임 행 수 미확인** — `effectiveScope():255-256` **"미설정=무제한"** 이므로 행이 0이면 `scopeSql*` 배선 5곳(AdPerformance.php:26 · Wms.php:1291 · Catalog.php:981,:982,:983 · + 래퍼 `scopeChannelProduct` OrderHub.php:261)이 **전부 no-op** 이다. 라이브 `SELECT COUNT(*) FROM data_scope` 권장. **"실사용 중인 ABAC"으로 단정 금지.**
