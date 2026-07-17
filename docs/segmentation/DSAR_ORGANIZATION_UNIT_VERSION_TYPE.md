# DSAR — Organization Unit Version Type (§9)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §9(Version Type) · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Version Type 열거** | `version_type`/`change_type` **backend/src grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| **전제 — 버전 엔티티 부재** | 조직 버전 테이블 0 · ★엔티티 `version` 은 **`menu_defaults.version`(AdminMenu.php:120) 단 1건** · `\bversion\b` 40건 전부 API/DB/벤더 헤더 | **축이 걸릴 곳 없음** |
| 최근접 = 감사 액션 라벨 | `UserAuth::logAudit`(호출 예 TeamPermissions.php:747 `'team_seed_org'`) → 전역 `audit_log.action`(Db.php:540-545) — **4컬럼 · tenant 없음 · 해시체인 없음 · 자유문자열** | `KV_ONLY` |
| 감사 3계층 | ① `menu_audit_log`(**hash_chain** AdminMenu.php:128) ② `pm_audit_log`(`tenant_id`+`entity`+**`diff_json`**+3인덱스 · migration `20260526_168_008`) ③ 전역 `audit_log`(4컬럼·tenant 없음) | `LEGACY_ADAPTER`(패턴만) |
| MERGE/SPLIT 능력 | 조직 병합·분할 코드 **0** · ★인접 `crm_identity_merge_link`(CRM.php:708-712)는 **아이덴티티 등가류**이지 조직 아님 | `NOT_APPLICABLE` |
| 이행/백필 능력 | ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) | **집행 수단 없음** |

**★대칭 오류 경계 — `audit_log.action` 문자열을 Version Type 으로 계산 금지.** `'team_seed_org'`(TeamPermissions.php:747) 같은 라벨은 **행위 로그**이지 **버전 전이 유형**이 아니다. ⓐ 대상이 버전 행이 아니라 요청이고 ⓑ **열거가 아니라 자유문자열**이며 ⓒ 전역 `audit_log` 에는 **tenant 조차 없다**. 형태 유사를 커버로 계산하면 역산이다.

**★규율 19 재적중 — `MERGE`/`SPLIT` 의 유일한 유사물이 계층이 아니다.** `crm_customers.identity_id`(CRM.php:109)의 union-find 병합(`resolveIdentitiesForTenant:597-643`)은 **등가류 클러스터링**(대칭·추이적)이고, 조직 `MERGE`/`SPLIT` 는 **버전 전이**(반대칭·시점 부여)다. **동일성 해소 ≠ 조직 병합.**

## 1. 원문 전사 + 판정 — **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INITIAL | 부재 — 버전 v1 개념 0 · ★인접 `menu_defaults` 최초 스냅샷(AdminMenu.php:308)이 유일한 "초기 상태 봉인" 행위이나 **전역 1행 · tenant 없음 · immutable_hash 없음** | `LEGACY_ADAPTER`(패턴만) |
| 2 | NAME_CHANGE | 부재 — `team.name`(TeamPermissions.php:147)은 **덮어쓰기** · 이력 0. ★게다가 **멱등키가 이름 문자열**(`seedOrg:738`)이라 개명 시 시드가 **중복 생성**된다 | `NOT_APPLICABLE` |
| 3 | TYPE_CHANGE | 부재 — `team.team_type`(:147) 덮어쓰기 · 이력 0 | `NOT_APPLICABLE` |
| 4 | OWNERSHIP_CHANGE | 부재 — `team.manager_user_id`(:148) 덮어쓰기 · 이력 0 · ★`seedOrg:739` 는 이 컬럼을 기입조차 하지 않음(시드 15행 전부 NULL) | `NOT_APPLICABLE` |
| 5 | LEGAL_ENTITY_CHANGE | 부재 — **법인 엔티티 자체가 없다**(`legal_entity` grep 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** · 사업자정보는 `app_user` 프로필 평문 필드 UserAuth.php:499·:1720) → 변경할 대상이 없음 | `NOT_APPLICABLE` |
| 6 | REGIONAL_CHANGE | 부재 — `region` **3축 병존**(Db.php:681,690 / Connectors.php:2704-2710 / Wms.php:129) 중 **조직 지역축은 없다** · parent region 0 · Country↔Region binding 0 | `NOT_APPLICABLE` |
| 7 | ORGANIZATION_TRANSFER | 부재 — **이관할 부모가 없다**(`team` DDL 에 `parent_team_id` 없음 :145-151/:168) · ★인접 `menu_tree` 이동(AdminMenu.php:487-503 — `wouldCycle` 검사 후 UPDATE)이 **레포 유일 "부모 재지정" 실선례**이나 **`tenant_id` 컬럼 없는 전역 단일 트리** → 조직 아님 | `LEGACY_ADAPTER`(패턴만) |
| 8 | MERGE | 부재 — 조직 병합 코드 0 · ★`crm_identity_merge_link`(CRM.php:708-712 · `UNIQUE(tenant_id,a_id,b_id)`)는 **무방향 등가 엣지**(union-find :597-643)이지 조직 버전 전이 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | SPLIT | 부재 — 분할 코드 0 · 등가류에는 split 연산 자체가 없음(union-find 는 union 전용) | `NOT_APPLICABLE` |
| 10 | REORGANIZATION | 부재 — 조직 재편 개념 0 · ★`seedOrg`(:725-753)는 **최초 시딩 전용**(동명 skip :738) — 재편이 아니라 멱등 생성 | `NOT_APPLICABLE` |
| 11 | CORRECTION | 부재 — 정정 vs 변경의 구분 0 · 현행은 전부 **무구분 덮어쓰기**(`updated_at` VARCHAR(32) :149) | `NOT_APPLICABLE` |
| 12 | MIGRATION | 부재 — ★**제약 2 직격**: `ensureTables` 는 **데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지** → 이행 집행 수단이 **현재 없다** · ⚠️변종 = `PM\Shared::ensurePmTables:37-53` 이 부재 시 `Migrate::applyFiles` 로 **168차 SQL 을 런타임 적용**(마이그레이션+자가치유 병행) — **유일한 런타임 이행 선례** | `LEGACY_ADAPTER`(패턴만) |
| 13 | RESTORATION | 부재(조직) · ★**인접 실선례 = `menu_defaults` 복원**(AdminMenu.php:584-590 — 스냅샷 JSON 을 되돌림) — **레포 유일 "스냅샷 복원" 실구현**. 단 **전역 1행 · 최신 1건만 조회 · immutable_hash 없음**(복원 대상의 무결성 검증 불가) | `LEGACY_ADAPTER`(패턴만) |
| 14 | RETIREMENT | 부재(버전 전이) · 인접 `team.status VARCHAR(20) DEFAULT 'active'`(:148) + `KEY idx_team_status (tenant_id, status)`(:150) = **현재상태 플래그**이지 **시점 부여된 은퇴 버전 아님**(언제·왜·누가 은퇴시켰는지 0) | `PARTIAL` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부분 1(`RETIREMENT`) · 어댑터 5(패턴 선례) · 도메인 상이 1 · 부재 7.

## 2. 규칙

- 🔴 **14종 "있다고 가정"하고 배선 금지.** 조직 버전 엔티티가 **없으므로** 전이 유형이 걸릴 행 자체가 없다. 버전 테이블([§9 필드](DSAR_ORGANIZATION_UNIT_VERSION.md)) 선행 없이 Version Type 만 만들면 **고아 열거**가 된다.
- 🔴 **`audit_log.action` 자유문자열을 Version Type 으로 재사용 금지.** 행위 로그 축이지 버전 전이 축이 아니며, 전역 `audit_log` 는 **tenant 조차 없다**(Db.php:540-545 · AdminGrowth.php:157-159 4컬럼). 감사와 버전은 **직교 축**이다 — 버전 전이는 `pm_audit_log` 패턴(**tenant+entity+diff_json**)으로 감사에 **별도 기록**한다.
- 🔴 **`crm_identity_merge_link` 를 `MERGE` 선례로 쓰지 마라 — 역산이다.** union-find **등가류**(대칭·추이적 · CRM.php:597-643)와 조직 병합(**반대칭·시점 부여·버전 전이**)은 대수적으로 다른 관계다. 그리고 등가류에는 **`SPLIT` 연산이 존재하지 않는다**(union 전용) → `SPLIT` 는 어떤 각도로도 선례가 없다.
- 🔴 **`LEGAL_ENTITY_CHANGE`/`REGIONAL_CHANGE` 를 "곧 되는 것"으로 계획 금지.** **변경할 대상 엔티티 자체가 부재**다(법인 0 · 조직 지역축 0). 두 전이는 §7 의 `primary legal entity id`/`primary region id` **신설에 종속**이며 그 전에는 정의 불가다.
- ★**`RESTORATION` 은 `menu_defaults` 복원 패턴(AdminMenu.php:584-590)의 확장**이다 — **재구현 금지 · 패턴 차용**. 단 그 선례의 3결함(전역 1행·최신 1건 조회·immutable_hash 없음)을 **함께 복제하지 마라**: 조직 버전 복원은 **tenant 스코프 + 버전 지정 조회 + 해시 검증**이 전제다.
- ★**`ORGANIZATION_TRANSFER` 의 순환 방어는 `menu_tree` 가 아니라 `PM/Dependencies` 패턴을 따르라.** `menu_tree` 는 **반복 조회 + `$depth<100` 하드캡**(`wouldCycle` AdminMenu.php:540-555 · :545)이나, `Dependencies::validateDependency`(PM/Dependencies.php:79-100)가 **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + 쓰기 전 차단**(:32-34 → 422 `cycle_detected` · self-loop :29-31)으로 **레포 최상급**이다.
- ⚠️ **`MIGRATION` 전이는 런타임 이행 선례가 1건뿐**(`PM\Shared::ensurePmTables:37-53` → `Migrate::applyFiles`). 조직 버전 이행을 마이그레이션 파일에 의존하도록 설계하면 **경로가 죽어 있어 집행되지 않는다**(172차 정지). 이행은 **핸들러 런타임 멱등 코드**로만 성립한다.
- ⚠️ `RETIREMENT` 판정 `PARTIAL` 을 **커버로 환산 금지** — `team.status`(:148)는 **현재상태 플래그**일 뿐 시점·사유·행위자가 **전부 없다**.
