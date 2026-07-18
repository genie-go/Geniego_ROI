# DSAR — Reporting Line Registry (§6)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §6 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 대전제 — **`REPORTING_LINE_REGISTRY` 는 `ABSENT`. 팬텀도 유물도 아니다 — 존재한 적이 없다**

| 축 | 실측 | 판정 |
|---|---|---|
| `reporting_line` | **backend/src grep 0** (재확인 · 289차) | `ABSENT` |
| `manager_id`·`reports_to`·`supervisor_id`·`team_lead_id`·`department_head_id`·`head_id` | **전부 0** | `ABSENT` |
| `acting`·`vacan`·`deputy`·`substitute`·`stand_in`·`matrix_manager` | **전부 0** (`interim` 1건 = 지오리프트 중간결과 `AttributionEngine.php:672`) | `ABSENT` |
| `rebate` | **전역 0** — 스펙 표제 도메인 자체가 없다 | `ABSENT` |
| **git 삭제 이력** | `manager_id`·`reports_to`·`acting_manager`·`supervisor_id`·`vacancy`·`deputy` **삭제 커밋 0** | **존재한 적 없음**(5-3-3-1 조직 축과 동형) |

**★규칙 6 준수** — 이름(grep 0)과 **능력**(레지스트리를 판독·정렬·동기화하는 코드 0) 양쪽을 확인했으므로 `ABSENT`. `CONTRACT_ONLY`(계약 명세만 존재)와 구분: §3.1 조직 축은 문서 70편이 있어 `CONTRACT_ONLY` 이나, **Reporting Line 은 계약 문서조차 본 차수가 처음**이다.

### 인접 자산 3종 — **어느 것도 레지스트리가 아니다**

| 자산 | 실측 | 결격 |
|---|---|---|
| `app_user.parent_user_id` | 정의 `UserAuth.php:156-167` · nullable · 전 생성경로 **owner 직속 2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670`) · 순회 = **단일 홉**(`resolveTenantId:200-217`) | **테넌트 소속 포인터이지 보고선 아님.** 🔴 3단 허용 시 `resolveTenantId` 단일 홉 가정 붕괴 → 286차 하이재킹과 동형 사고 |
| `team.manager_user_id` | DDL `TeamPermissions.php:148`(MySQL)/`:168`(SQLite) · **쓰기경로 REAL**(`createTeam:463-469` · 소속 검증 `:464` 422 · `promoteManager:768-776`) · **`seedOrg:739` INSERT 8컬럼에 부재 → `ORG_PRESET` 15팀 전부 manager NULL** | **팀당 1칸** · `parent_team_id` 없음(팀 트리 자체가 없다) · Type/Priority/Responsibility Scope 표현 불가 · **effective date 0 · 이력 0** |
| `team_role='manager'` | `app_user.team_role`(owner\|manager\|member `UserAuth.php:168`) | **롤 라벨이지 관계 아님.** 🔴 이 문자열 하나에 승인 권한이 걸려 있다(`UserAuth.php:1064`·`TeamPermissions.php:136`) |

### ★`team` DDL 전문 실측 (`TeamPermissions.php:146-150`) — **§6 필수 22필드 중 교집합 2**

```
id · tenant_id · name · description · team_type VARCHAR(48) · manager_user_id INT NULL
· status VARCHAR(20) DEFAULT 'active' · created_by · created_at · updated_at
```

**`registry_type`·`authoritative_source`·`source priority`·`active version`·`valid_from`·`valid_to`·`evidence` 전부 부재.** `tenant_id`·`status` 만 이름이 겹치나 **의미가 다르다**(팀 상태이지 레지스트리 상태 아님).

## 1. 원문 전사 + 판정 — **원문 22종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | reporting_line_registry_id | 레지스트리 엔티티 부재 — `reporting_line` grep 0 · git 삭제이력 0 | `ABSENT` |
| 2 | tenant_id | ✅ **인접 REAL 선례**: `team.tenant_id NOT NULL`(`TeamPermissions.php:146`) · `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`:164`). 🔴 **반례 복제 금지**: `menu_defaults`(`AdminMenu.php:119-121`)·`menu_audit_log`(`:124-130`)·`risk_model_registry`(`Db.php:448-455`)·`admin_growth_approval`(`AdminGrowth.php:142-149`) **전부 tenant_id 없음** | `LEGACY_ADAPTER` |
| 3 | registry_code | 부재 · 인접 코드 축 없음 | `ABSENT` |
| 4 | registry_name | 부재 | `ABSENT` |
| 5 | registry_type | 부재 — 축 전사 = [DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md](DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md) | `ABSENT` |
| 6 | authoritative_source | 🔴**핵심** — **manager 를 싣는 소스가 0개**(ⓑ §7). HRIS/ERP/Directory 소스 히트 0 · 커넥터 카탈로그 행 0 · fetcher 0 · 정규화 테이블 0 · **SCIM `manager` = 침묵 no-op**(`EnterpriseAuth.php:391-396`) · `sso_config` DDL(`:45-54`) = `email_attr`·`name_attr` **2슬롯뿐, `manager_attr` 없음** | `ABSENT` |
| 7 | source priority | ★**§62 정합** — "우선순위 미구현"이 아니라 **정렬할 대상이 0개**. authoritative source(#6)가 0개이므로 **`VACUOUS` 이전에 무대상** | `ABSENT` |
| 8 | supported manager types | §11 Manager Type 27종 표현 수단 0 — `team.manager_user_id` 는 **팀당 1칸**(`:148`) · 타입 컬럼 없음 | `ABSENT` |
| 9 | position based support | Position 개념 0. 🔴**함정**: `position_idx` = **PM 태스크 정렬순서**이지 직위 아님 | `ABSENT` |
| 10 | subject based support | 직원 아이덴티티 = `app_user` 뿐(`id`+`email`+외부상관자 3컬럼 `EnterpriseAuth.php:64-65`) · **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`). 🔴**함정**: DSAR "Data Subject" = **고객**이지 직원 아님 | `ABSENT` |
| 11 | organization based support | `ORGANIZATION_*` **backend 전역 grep 0** · `org_unit` 0 · `DSAR_ORGANIZATION_*` 70편은 **문서**이며 ADR §2 가 *"실 코드·테이블·노드 = 0건"* 자인 · `team` 에 `parent_team_id` 없음 | `CONTRACT_ONLY` |
| 12 | matrix support | Direct/Functional 병존 표현 불가 — `manager_user_id` **단일 칸**. ★**규칙 10**: "1개"인 것은 **여러 개를 표현할 수단이 없어서**이지 정책이 아니다 | `ABSENT` |
| 13 | acting manager support | `acting` grep 0. ★§76 실재 결함 2건: ① `TeamPermissions.php:492-501` 매니저 교체 시 **전임자 강등 없음** ② `promoteManager:768-776` **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 전임자 `team_role='manager'` 잔존. 🔴**함정**: `UserAdmin::impersonate:466-525` 는 주석이 "대행" 6회지만 **신원 위장 열람**이지 직무대리 아님 | `ABSENT` |
| 14 | historical support | 이력 테이블 0. 🔴**정면 반례**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이전 해지 시각을 소거** → 이력 물리적 소멸(§55 "과거 Snapshot 대체 금지" 위반) | `ABSENT` |
| 15 | effective dating support | `effective_to`·`valid_to`·`valid_from` **grep 0**(재확인). 유일 인접 = `kr_fee_rule.effective_from`(`Db.php:898`) — **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0 · 읽기 4개소 전부 최신승 `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) | `NAME_ONLY` |
| 16 | synchronization mode | **동기화할 소스가 0개**(#6) → 모드를 고를 대상 없음. §66 Reconciliation = **이중 공허**(좌변 source·우변 canonical 양쪽 부재 → **자동 MATCH = 가짜녹색** = 288차 `ok=>true` 위장과 동형) | `ABSENT` |
| 17 | owner | 인접 = `pm_projects.owner_user_id`(migration `20260526_168_001:13` · 쓰기 `Projects.php:58`,`:66`,`:113`). 🔴**4결격**: ① **`WHERE owner_user_id` grep 0 = 판독 술어 0 → 저장된 라벨** ② 무검증 자유문자열(`:112-117`) ③ 기본값이 생성자(`:66` `?? $g['user_id']`) → 미설정 행과 구분 불가 ④ 단일값 | `NAME_ONLY` |
| 18 | active version | 엔티티 `version` = `menu_defaults.version VARCHAR(32)`(`AdminMenu.php:120`) 뿐이며 ★**유일 생산자 `:308-309` 가 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨**(규칙 7). 판독 `:584` 도 `ORDER BY created_at DESC LIMIT 1` = **최신승**이지 active 선택 아님. ★§8:578 *"Active Version을 직접 수정하지 마라"* 를 **강제할 수단 0** | `NAME_ONLY` |
| 19 | valid_from | **grep 0** | `ABSENT` |
| 20 | valid_to | **grep 0** | `ABSENT` |
| 21 | status | 인접 = `team.status VARCHAR(20) DEFAULT 'active'`(`:148`) — **무검증 자유문자열**(ENUM/CHECK/`in_array` 0) · **팀 상태이지 레지스트리 상태 아님** | `ABSENT` |
| 22 | evidence | 인접 선례 = `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128` · SHA-256 prev-chain 생성 `:182-197` · `lastHash():214-219`) 🔴**단 쓰기 체인만 실재·검증 불가 장식** — `verify()` 검증기 0(AdminMenu `hash_equals` 0) · preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼(`:199-203`)에 없어 `created_at` DB DEFAULT(`:129`)가 덮음 → 재계산 불가 → **tamper-evident 아님**(`:18` "tamper-evident"는 주석≠근거) · **검증형 정본 = `SecurityAudit::verify():56-68`**(`:64` hash_equals+prev_hash 교차 · `:31` preimage $now 를 created_at 에 저장) · `schema_migrations.checksum`(`Migrate.php:50`) · `pm_audit_log`(`tenant_id NOT NULL` migration `20260526_168_008:7` + `diff_json:13` + 3인덱스 `:17-19` + append-only). 🔴**`menu_audit_log` 에 `tenant_id` 없음 · `lastHash():216` 에 tenant 술어 없음 → 스키마 복제 금지·알고리즘만 이식** | `LEGACY_ADAPTER` |

**측정기 분모: 32(§6 전체) / 원문 대조: 필수 필드 22 + Registry Type 10 = 32 / 본 편 전사: 22.** 잔여 10(Registry Type)은 [DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md](DSAR_REPORTING_LINE_AUTHORITATIVE_SOURCE.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 16 · `NAME_ONLY` 3 · `LEGACY_ADAPTER` 2 · `CONTRACT_ONLY` 1.

## 2. 규칙

- 🔴 **`team` 을 `REPORTING_LINE_REGISTRY` 로 승격 금지.** `manager_user_id` 는 팀당 1칸이며 `parent_team_id` 가 없어 **트리 자체가 없다**. 승격하면 §6 필수 22필드 중 20을 `team` 에 덧붙이는 것이 되고, 팀 도메인과 보고선 도메인이 **한 테이블에서 영구 결합**된다.
- 🔴 **`app_user.parent_user_id` 를 보고선으로 재해석 금지.** `resolveTenantId:200-217` 이 **단일 홉·`LIMIT 1`** 을 가정한다 — 3단을 허용하는 순간 테넌트 해석이 깨지고 **286차 `platform_growth` 하이재킹과 동형 사고**가 난다. 일반화가 선결이며, 그것은 본 명세의 범위가 아니다.
- 🔴 **`authoritative_source`(#6) 없이 `source priority`(#7)·`synchronization mode`(#16)를 설계 금지** — 정렬·동기화 대상이 0개인 상태에서 우선순위 로직을 먼저 짜면 **영원히 도달 불가한 VACUOUS 코드**가 된다. §62 판정과 동일: **무대상**이 먼저다.
- 🔴 **`evidence`(#22)는 `menu_audit_log` 을 검증형 해시체인 선례로 삼지 마라.** 그것은 **쓰기 체인만 실재**하고 `verify()` 검증기가 없으며(AdminMenu `hash_equals` 0), preimage `'ts'=date('c')`(`:195`)가 INSERT 컬럼에서 소실돼 `created_at` DB DEFAULT 가 덮으므로 **재계산이 불가능한 장식** = **tamper-evident 아님**. 이식 대상은 오직 알고리즘(SHA-256 prev-chain)이며, **검증형 정본은 `SecurityAudit::verify():56-68`**(preimage 시각을 저장하고 재계산·`hash_equals`·prev_hash 교차)이다. 또한 원본은 `tenant_id` 가 없어 테넌트 교차 오염을 물려받으므로 테넌트별 체인은 `lastHash()` 에 `WHERE tenant_id=?` 가 **필수**.
- 🔴 **`active version`(#18)을 `menu_defaults` 선례로 계산 금지.** 리터럴 `'baseline'` 고정은 **버전 모델이 아니라 라벨**이다(규칙 7 — 컬럼이 있다 ≠ 모델이 있다).
- ★**신규 스키마는 마이그레이션 파일 경로가 없다** — `backend/migrations/` 는 **172차 정지**(21파일 · 최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` · **MySQL/SQLite 두 방언 수기 중복 작성 의무**. 🔴 `ensureTables` 는 **테이블 생성만 하고 백필을 하지 않는다**.
- ★**회귀 커버리지 0** — `tools/e2e/render.mjs:37` 이 `/team`·`/team-members`·`/user-management` 를 포함하나 **마운트 크래시만 검사**(`:17` 스스로 한계 자인). `smoke.mjs:84` `keys:['team','roas']` 는 **Meta Ads 캠페인 계약키**(조직 team 아님 — 이름 함정).
