# DSAR — Organization Hierarchy (§12)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §12 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_HIERARCHY` 엔티티 | `organization_hierarchy`·`org_unit`·`hierarch` **backend/src grep 0** · `git log --all -S "org_unit"` **0** | `ABSENT`(이름·능력 양쪽) |
| 부모-자식 간선 (레포 유일) | `app_user.parent_user_id` — 정의 `UserAuth.php:156-167`(주석 :156 *"하위(팀원) 계정의 상위 owner id. owner=NULL"*) · DDL **nullable** | `PARTIAL` — **2단 봉인**(§17 참조) |
| 조직 단위 열거 | `TeamPermissions::ORG_PRESET` 15단위(`TeamPermissions.php:706-722`) · `seedOrg` `:725-753` · 실배선(`routes.php:1589`·`:2570`·`teamApi.js:261`) | `PARTIAL` — **구조가 아니라 열거** |
| 조직 단위 구조 링크 | `team` DDL(`TeamPermissions.php:145-151` MySQL / `:168` SQLite) = `id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at` — **`parent_team_id` 없음** | `ABSENT` |
| 트리 선례 (조직 아님) | `menu_tree.parent_id`(`AdminMenu.php:108-117`) · `wouldCycle` 반복 walk + `$depth<100`(`:540-555`) — **`tenant_id` 컬럼 없음(전역 단일 트리)** | `KEEP_SEPARATE_WITH_REASON` |
| `hierarchy_type` 축 | 현행 전무 — `TEAM_TYPES` 17종(`TeamPermissions.php:44-49`)은 **평면 문자열 카탈로그** | `NAME_ONLY` |
| `legal entity scope` | `legal_entity`·`biz_no`/`brn`/`corp_reg`/`tax_id` **grep 0** · 사업자정보 = `app_user` 프로필 평문 필드(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| `workspace scope` | 테넌트 = 구독 단위 · **테넌트 엔티티 테이블 부재**(`api_key.tenant_id VARCHAR(100)` `Db.php:944` **FK 없음**) | `PARTIAL` |
| `country scope` | `Geo`(`Geo.php:23-53`) = IP→ISO alpha-2 **언어** 탐지 · **Country→Region 매핑 코드 0건** | `NAME_ONLY` |
| `environment scope` | 물리 DB 분리 REAL(`Db::pdoFor` `Db.php:35-38`·`:81-84`) · ★**`Db::envLabel()` 은 게이트 아님** — `Db.php:51-54` 코드가 스스로 금지 | `KEEP_SEPARATE_WITH_REASON` |
| `active version`·`valid_from`/`valid_to` | `kr_fee_rule.effective_from`(`Db.php:898`) = 전 코드베이스 **유일** effective date · `effective_to` **grep 0** · 엔티티 `version` = `menu_defaults.version` **단 1건** | `PARTIAL` |
| `owner` | `team.manager_user_id`(`TeamPermissions.php:145-151`) · `app_user.parent_user_id IS NULL` = owner(`PlanLimits.php:36-37`) | `LEGACY_ADAPTER` |
| `evidence` | 감사 3계층 — `menu_audit_log.hash_chain CHAR(64)`(`AdminMenu.php:128`) SHA-256 prev-chain 실구현 · `pm_audit_log`(migration `20260526_168_008`) · 전역 `audit_log` 4컬럼(`Db.php:540-545`) | `LEGACY_ADAPTER` |

**★축 주의 — 형태 유사 ≠ 의미 동일.**
- 🔴 **`ORG_PRESET` 15단위를 "Organization Registry 실재"로 계산하면 오판이고, "ABSENT"로 밀어도 오판이다.** 정확한 표현 = **"구조가 아니라 열거"**. "마케팅 글로벌팀"이 "마케팅팀"의 자식이라는 **구조 링크가 0**이다 → `PARTIAL`.
- 🔴 **`DATA_SCOPES` 의 `'company'` 는 Legal Entity Scope 가 아니다.** `effectiveScope():258` — `if ($st === 'company') return null; // 전사 = 무제한`. **법인 경계를 긋는 게 아니라 지운다.** 이름만 보고 `legal entity scope` 커버로 계산하면 **의미가 정반대**가 된다.
- 🔴 **`business_unit` 유일 히트는 Trustpilot 리뷰 API 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — 무관. `company_id` 2건 = Adobe Analytics 커넥터 자격증명(`Connectors.php:3880`) — 법인 아님.
- 🔴 **`crm_customers.identity_id`(`CRM.php:109`) 를 계층으로 계산 금지** — **union-find 등가류**(`resolveIdentitiesForTenant:597-643`). 등가관계(대칭·추이적) ≠ 계층(반대칭 부분순서).

## 1. 원문 전사 + 판정 — **원문 23종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_hierarchy_id | 부재 — 엔티티 자체 grep 0 | `NOT_APPLICABLE` |
| 2 | organization_registry_id | 부재 — Registry 는 `ORG_PRESET` **열거**(`TeamPermissions.php:706-722`)이지 레지스트리 테이블 아님 | `PARTIAL` |
| 3 | tenant_id | 전 도메인 표준 컬럼(`app_user.tenant_id` `UserAuth.php:166`) · 격리 강제 REAL(`index.php:600` 무조건 덮어쓰기·`:585` fail-closed) | `VALIDATED_LEGACY`(컬럼 관례) |
| 4 | hierarchy_code | 부재 | `NOT_APPLICABLE` |
| 5 | hierarchy_name | 부재 | `NOT_APPLICABLE` |
| 6 | hierarchy_type | 부재 — [Hierarchy Type 축 문서](DSAR_ORGANIZATION_HIERARCHY_TYPE.md) 참조 | `NOT_APPLICABLE` |
| 7 | hierarchy purpose | 부재 | `NOT_APPLICABLE` |
| 8 | root organization unit | 부재 · 인접 = `parent_user_id IS NULL` owner(`PlanLimits.php:36-37`) — **사용자 트리 루트이지 조직 루트 아님** | `LEGACY_ADAPTER` |
| 9 | legal entity scope | **부재**(이름·능력 양쪽) · 🔴 `DATA_SCOPES` `'company'` 는 **무제한 센티넬**(`TeamPermissions.php:258`) — 정반대 | `ABSENT` |
| 10 | workspace scope | 테넌트가 유일 근사 — **마스터 테이블 없음** · 발급 = `'acct_'.$id` 문자열 생성(`UserAuth.php:220-224`) · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론** | `PARTIAL` |
| 11 | country scope | `Geo` = 국가→**언어** 매핑(`Geo.php:23-53`) · `region` 3축 병존(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA` grep 0 | `NAME_ONLY` |
| 12 | environment scope | 물리 분리 REAL · **정책 부재** · ★`isDemo` 술어 **12핸들러 각자 정의·이름 3종**(`Pnl.php:39-42` vs `Rollup.php:70` vs `AdPerformance.php:31-33` `return false`) = **술어 SSOT 부재** | `PARTIAL` |
| 13 | primary hierarchy 여부 | 부재 — 계층이 1개도 없으므로 primary 개념 성립 불가 | `NOT_APPLICABLE` |
| 14 | matrix enabled 여부 | `matrix_` **grep 0** | `ABSENT` |
| 15 | multiple roots allowed 여부 | 부재 | `NOT_APPLICABLE` |
| 16 | maximum depth | 부재(조직) · 선례 3건 = `Dependencies::validateDependency` **최대깊이 10000**(`PM/Dependencies.php:79-100`) · `AdminMenu::wouldCycle` `$depth<100`(`:545`) · 11번가 카테고리 `guard<10`(`ChannelSync.php:954-963`) | `LEGACY_ADAPTER` |
| 17 | authoritative source | 부재 · 커넥터 축에 **ERP/HRIS 값 자체가 없다** — `ChannelRegistry.php:12`,`:79` `group_type` = sales/marketing/logistics/pg/messaging + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`) | `ABSENT` |
| 18 | owner | `team.manager_user_id`(`TeamPermissions.php:145-151`) · `created_by` 관례 | `LEGACY_ADAPTER` |
| 19 | active version | ★**엔티티 `version` = `menu_defaults.version` 단 1건**(`AdminMenu.php:120`) · optimistic lock `version` **grep 0** · `crm_segments` version/snapshot 전무(`CRM.php:64-70`) | `PARTIAL` |
| 20 | valid_from | `kr_fee_rule.effective_from`(`Db.php:898`)가 **전 코드베이스 유일** · 🔴 **`WHERE effective_from <= :as_of` 술어 backend/src 전역 0건** — 컬럼은 있으나 **as-of 조회 능력 없음** | `KV_ONLY` |
| 21 | valid_to | `valid_to`\|`effective_to` **grep 0** → **폐구간 모델은 신규** | `ABSENT` |
| 22 | status | `team.status`·`agency_client_link.status`(pending/approved/revoked `AgencyPortal.php:64-72`) 등 도메인별 개별 | `LEGACY_ADAPTER` |
| 23 | evidence | `menu_audit_log.hash_chain`(`AdminMenu.php:128`·생성 `:182-197`·`lastHash()` `:214-219`) = 해시체인 **쓰기** 실선례 · 🔴 쓰기 체인만 실재·`verify()` 0·preimage `ts`(`:195`) 소실(INSERT 컬럼 `:199-203` 부재→`created_at` DB DEFAULT가 덮음) → **tamper-evident 아님**; 검증형 정본 = `SecurityAudit::verify():56-68` · 🔴 **"해시체인 없음"은 전역 `audit_log` 에 한해서만 참** | `LEGACY_ADAPTER` |

**실측 개수: 23 / 23 전사.** 커버리지 = `VALIDATED_LEGACY` **1**(tenant_id) · `PARTIAL` 4 · `LEGACY_ADAPTER` 5 · `NAME_ONLY` 1 · `KV_ONLY` 1 · `ABSENT` 4 · `NOT_APPLICABLE` 7.

> 🔴 **커버 = `VALIDATED_LEGACY` 뿐.** 23종 중 실제 커버 = **1종(tenant_id 컬럼 관례)**. `LEGACY_ADAPTER`·`KEEP_SEPARATE_WITH_REASON` 을 커버로 합산하면 역산이다.

## 2. 규칙

- 🔴 **`ORG_PRESET` 15단위를 Organization Registry 커버로 계산 금지.** 구조가 아니라 **열거**다. 단 **재구현도 금지** — 신설 시 `ORG_PRESET`·`seedOrg`(`TeamPermissions.php:725-753`, 동명 skip 멱등·트랜잭션·감사 `:747`) **확장**이 정본이다.
- 🔴 **`DATA_SCOPES` `'company'` 를 `legal entity scope` 에 매핑 금지.** `TeamPermissions.php:258` 이 `null`(무제한)을 반환한다 — 경계를 **지운다**.
- 🔴 **`Db::envLabel()` 을 `environment scope` 로 계산 금지.** `Db.php:51-54` 가 *"게이트 로직(env())은 절대 이걸 쓰지 말 것"* 이라 **코드가 스스로 금지**한다. 27개 호출처 전부 응답 메타(`'_env' =>`) — 인가 결정 사용 0.
- 🔴 **"테넌트 = 법인" 가정 금지.** 테넌트 = **1 owner 계정의 구독 스코프**(`PlanLimits.php:36-37`). 한 법인이 다수 테넌트를 갖거나 그 반대를 **막는 것도 표현하는 것도 없다**. `pnl_vat_summary` tenant 키(`Pnl.php:402-423`)는 법인 회계가 아니라 **구독자별 리포트**다.
- 🔴 **`agency_client_link`(`AgencyPortal.php:64-72`) 를 조직 계층 근거로 쓰지 마라.** ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님.
- `maximum depth` 는 **신규 상수를 만들지 말고** `Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) 의 깊이캡 패턴(반복 DFS + 명시적 `$visited` + tenant 필터 + **쓰기 전 차단** `:32-34` → 422 `cycle_detected`)을 **확장**하라. 레포 최고 품질 선례다.
- 신설 스키마는 **MySQL/SQLite 두 방언 동시 수기 작성 의무**(`CRM.php:48` vs `:77` 패턴). 마이그레이션 파일 경로는 **죽었다**(§14 참조) → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}`(`Db.php:1123-1127`) 필수.
- `evidence` 는 **"선례 없음→신설"이 아니다.** `menu_audit_log.hash_chain`(SHA-256 prev-chain) / `pm_audit_log`(tenant+entity+diff_json+3인덱스) **패턴 확장**이 정본. 🔴 단 `menu_audit_log.hash_chain` 은 **쓰기 체인만 실재**하고 검증기(`verify()`)가 0이며 preimage `ts`(`:195`)가 INSERT 컬럼에서 소실돼 재계산 불가 → **tamper-evident 아님**(`:18` "tamper-evident" 는 주석일 뿐 근거 아님). 검증형 정본은 `SecurityAudit::verify():56-68`(preimage $now→`created_at` 저장→hash_equals+prev_hash 교차 재계산)이다.
- 🔴 23종 **"있다고 가정"하고 배선 금지.**
