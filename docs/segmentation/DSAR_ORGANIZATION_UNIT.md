# DSAR — Organization Unit (§7)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §7 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **최근접 실자산 = `team`** | DDL(TeamPermissions.php:145-151 MySQL / :168 SQLite) = `id·tenant_id·name·description·team_type·manager_user_id·status·created_by·created_at·updated_at` — **10컬럼** | `PARTIAL`(원문 26필드 중 6 대응) |
| `organization_unit` 테이블 | `organization_unit`/`org_unit` **grep 0**(스펙 커밋 제외) · `git log --all -S "org_unit"` **0** | `NOT_APPLICABLE` |
| **`parent reference`** | ★**`team` DDL 에 `parent_team_id` 없음** — 원문이 "compatibility only"로 격하한 그 필드조차 **부재** | **구조 링크 0** |
| 레포 유일 부모-자식 간선 | `app_user.parent_user_id`(UserAuth.php:156-167 · 주석 :156 "하위(팀원) 계정의 상위 owner id. owner=NULL" · ALTER :167) — ★**DDL nullable** | `KEEP_SEPARATE_WITH_REASON` |
| ↑ **2단 봉인 실증** | ★PM 전수 검증 — **전 생성 경로가 owner 직속 2단**: `UserAuth.php:1226-1227`(팀원 추가 — manager 의 parent(=owner) 또는 `$ownerId` · 주석 :1225 *"항상 최상위 owner 에 종속"*) · `EnterpriseAuth.php:500`(SSO/SCIM 프로비저닝 — `(int)$owner['id']` 고정) · `UserAuth.php:1574/1581`(하위 관리자 — `$masterId`) · `UserAuth.php:670`(owner 자신 — `null`). **3단을 만드는 경로가 존재하지 않는다** | **깊이 2 고정** |
| ↑ 순회 | **단일 홉** — `resolveTenantId`(UserAuth.php:200-217) `$pid` 로 `LIMIT 1` 1회 조회 후 즉시 return · **재귀 없음** · 소비처 1홉: Rollup.php:56 · ChannelSync.php:72 · ChannelCreds.php:85 · BillingMethod.php:88 · AgencyPortal.php:478 · PlanLimits.php:36-37 | **비재귀** |
| 조직단위 시딩 | `ORG_PRESET` 15단위(TeamPermissions.php:706-722) → `seedOrg`(:725-753) `INSERT INTO team`(:739) | `PARTIAL` |

**★규율 8·19 동시 적중 — `app_user.parent_user_id` 를 Organization Unit 의 parent 로 계산하면 역산이다.** 용도는 **한 테넌트 안의 사용자 트리 + owner→member tenant 상속**(UserAuth.php:197·:214 동일값 UPDATE)이다. **보고선이 아니고 · 테넌트 간 부모-자식도 아니며 · 조직↔조직 간선은 더더욱 아니다**(주체가 조직이 아니라 **사용자 계정**). 게다가 **깊이 2로 봉인**되어 있어 계층을 표현할 능력 자체가 없다.

**★대칭 오류 경계** — `team` 이 6필드를 대응한다고 Organization Unit 이 커버된 게 아니다. 대응하는 6필드는 전부 **어느 엔티티에나 있는 공통 필드**(id/tenant/name/type/status/timestamps)이고, **조직을 조직으로 만드는 필드**(registry·category·legal entity·region·version·valid_from/to·evidence)는 **전부 부재**다.

## 1. 원문 전사 + 판정 — **원문 26종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_unit_id | `team.id INT AUTO_INCREMENT PRIMARY KEY`(:146) — **surrogate PK 실재** | `PARTIAL`(대상이 team) |
| 2 | organization_registry_id | 부재 — 레지스트리 엔티티 자체 없음([§6](DSAR_ORGANIZATION_REGISTRY.md)) | `NOT_APPLICABLE` |
| 3 | tenant_id | `team.tenant_id VARCHAR(100) NOT NULL DEFAULT 'demo'`(:146) · `KEY idx_team_tenant`(:150) · 전 조회 술어 실배선 | `VALIDATED_LEGACY`(테넌트 격리 축만) |
| 4 | organization_code | 부재 — **코드 컬럼 없음** · 멱등키가 **이름 문자열**(`seedOrg:738` `in_array($p['name'], $have)`) → 이름 변경 시 중복 생성 | `NOT_APPLICABLE` |
| 5 | organization_name | `team.name VARCHAR(160) NOT NULL`(:147) — ★**UNIQUE 제약 없음**(DDL :150-151 인덱스는 tenant/status뿐) | `PARTIAL` |
| 6 | display_name | 부재 — name 단일 · 다국어 조직명 없음 | `NOT_APPLICABLE` |
| 7 | organization_type_id | 부재(FK) · `team.team_type VARCHAR(48) DEFAULT 'custom'`(:147)은 **평면 문자열**(`TEAM_TYPES` 17종 :44-49 · 주석 :43 "자유 입력도 허용") → 타입 레지스트리 FK 아님([§10](DSAR_ORGANIZATION_TYPE.md)) | `KV_ONLY` |
| 8 | organization_category | 부재 — 35 Category 열거 0([§8](DSAR_ORGANIZATION_CATEGORY.md)) | `NOT_APPLICABLE` |
| 9 | description | `team.description TEXT`(:147) · `seedOrg` 는 `''` 기입(:739-740) | `PARTIAL` |
| 10 | primary legal entity id | 부재 — `legal_entity` grep 0 · 사업자정보는 `app_user` **프로필 평문 필드**(`business_number`·`ceo_name` UserAuth.php:499·:1720) · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** → 법인 엔티티 아님 | `NOT_APPLICABLE` |
| 11 | primary business unit id | 부재 — ★`business_unit` **유일 히트 = Trustpilot 리뷰 API 자격증명 `business_unit_id`**(ChannelSync.php:2573-2580 · ChannelRegistry.php:126) — **무관** | `NOT_APPLICABLE` |
| 12 | primary region id | 부재 — `region` **3축 병존**(광고 인구통계 Db.php:681,690 / Amazon Ads 엔드포인트 na·eu·fe Connectors.php:2704-2710 / WMS 창고 시·도 Wms.php:129·`regionOf()` :284-286) · **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0** · **parent region 컬럼 0** | `NOT_APPLICABLE` |
| 13 | primary country code | 부재(조직) · 인접 `app_user.country`(UserAuth.php:499) = 프로필 문자열 · `Geo`(Geo.php:23-53 `lang()` · 클라이언트 IP :56-60 · `SUPPORTED` 15언어 :21) = **IP→ISO alpha-2→언어** 매핑 → ★**Country→Region 매핑 코드 0건** | `KEEP_SEPARATE_WITH_REASON` |
| 14 | primary workspace id | 부재 — 조직↔workspace 바인딩 없음 · 인접 `WorkspaceState`(:50)는 **UI 상태 저장**이지 조직 귀속 아님 | `NOT_APPLICABLE` |
| 15 | parent reference for compatibility only | ★**부재 — `team` DDL 에 `parent_team_id` 없음**(:145-151/:168). 레포 유일 부모-자식 간선 `app_user.parent_user_id` 는 **사용자 계정 축·깊이 2 봉인·비재귀** → 조직 아님 | `NOT_APPLICABLE` |
| 16 | authoritative source | 부재 — 컬럼 grep 0([§6 Authoritative Source](DSAR_ORGANIZATION_AUTHORITATIVE_SOURCE.md)) · 유일 유입 `seedOrg` 도 출처 미기록 | `NOT_APPLICABLE` |
| 17 | external source id | 부재 · 인접 = SCIM Users CRUD(routes.php:915-932) — **Groups 는 GET 전용**(EnterpriseAuth.php:417-423)이라 조직 외부ID 인입 0 | `LEGACY_ADAPTER` |
| 18 | source version | 부재 | `NOT_APPLICABLE` |
| 19 | owner subject | 부재(소유 주체) · 인접 `team.manager_user_id INT NULL`(:148) = **팀 관리자 1인** — ★**`ORG_PRESET` 시딩은 이 값을 채우지 않는다**(`seedOrg:739` INSERT 컬럼 목록에 `manager_user_id` 없음) → 시드 조직 15개는 **전부 manager NULL** | `PARTIAL` |
| 20 | active version | 부재 — ★엔티티 `version` 은 **`menu_defaults.version` 단 1건**(AdminMenu.php:120). `\bversion\b` 40건 전부 API/DB/벤더 헤더 · **optimistic lock `version` grep 0** | `NOT_APPLICABLE` |
| 21 | valid_from | 부재 — `kr_fee_rule.effective_from`(Db.php:898)이 유일 effective date이나 **채널 수수료 도메인** | `NOT_APPLICABLE` |
| 22 | valid_to | 부재 — `valid_to\|effective_to` grep 0 → **폐구간 모델은 신규** | `NOT_APPLICABLE` |
| 23 | created_at | `team.created_at VARCHAR(32)`(:149) — ★**DATETIME 아닌 문자열**(`self::now()` :740 기입) | `PARTIAL` |
| 24 | updated_at | `team.updated_at VARCHAR(32)`(:149) — **덮어쓰기 · 이력 없음** | `PARTIAL` |
| 25 | status | `team.status VARCHAR(20) DEFAULT 'active'`(:148) · `KEY idx_team_status (tenant_id, status)`(:150) · `seedOrg` 가 `'active'` 고정 기입(:739) | `PARTIAL` |
| 26 | evidence | 부재 — 전 도메인 0 | `NOT_APPLICABLE` |

**실측 개수: 26 / 26 전사.** 커버리지 = **`VALIDATED_LEGACY` 1**(`tenant_id`) · 부분 8 · 어댑터 1 · 도메인 상이 1 · KV 1 · 부재 14.

## 2. 규칙

- 🔴 **`parent reference for compatibility only` 를 Canonical Graph Source of Truth 로 사용하지 마라**(원문 :587 명령). 본 레포에서는 **애초에 그 컬럼조차 없어** 오용 위험은 낮으나, 신설 시 **호환 필드로만 두고 정본 간선은 §11 관계 테이블**에 둔다.
- 🔴 **`app_user.parent_user_id` 를 조직 parent 로 승격 금지 — 3중 역산이다.** ⓐ 주체가 **사용자 계정**이지 조직이 아니다 ⓑ **깊이 2 봉인**(전 생성 경로가 owner 직속 — UserAuth.php:1226-1227·EnterpriseAuth.php:500·UserAuth.php:1574/1581·:670) ⓒ 순회가 **단일 홉·비재귀**(:200-217). 용도는 **tenant 상속**(:197·:214)이며 **보고선이 아니다.**
- 🔴 **`team` 재구현 금지 — 확장만.** Organization Unit 을 새 테이블로 만들면 `ORG_PRESET` 시드 15행·`acl_permission`·`data_scope` 의 `subject_type='team'` 배선(:742-743)이 **전부 고아**가 된다. **`team` 확장(ALTER)이 무후퇴 경로.**
- 🔴 **필드 6개 대응을 "커버"로 계산 금지.** 대응분은 전부 **범용 공통 필드**다. 조직 정체성 필드(registry/category/legal entity/region/version/valid_from·to/evidence)는 **14건 전부 부재**.
- ★**`organization_code` 신설이 사활적** — 현행 멱등키가 **이름 문자열**(`seedOrg:738`)이라 **이름을 바꾸면 시드가 중복 생성**된다. `team.name` 에 **UNIQUE 제약도 없다**(:150-151). 코드 도입 시 `UNIQUE(tenant_id, organization_code)` 를 **`data_scope` 의 `uq_scope`(:164) 관례**대로 부여하라.
- ⚠️ **`manager_user_id` 미기입 관찰 사실** — `seedOrg:739` INSERT 컬럼 목록에 `manager_user_id` 가 없어 **시드 조직 15개는 전부 manager NULL** 로 생성된다. `owner subject` 설계 시 **NULL 선행 데이터를 전제**하라. **등급 미부여 · 관찰 사실로만 등재**(의도된 설계일 수 있음 — 시딩 시점에 담당자 미정).
- 타임스탬프는 **`VARCHAR(32)` 문자열 관례**(:149 · `self::now()`)다. 조직 확장 필드도 **동일 관례를 따르라** — DATETIME 혼입 시 정렬·비교 술어가 2벌이 된다(5-3-2 "타임존 3벌"과 동형).
- 스키마 확장은 **MySQL/SQLite 두 방언 동시 작성 의무**(:145-151 vs :168) · `try{ALTER}catch{}` 멱등(Db.php:1123-1127·CRM.php:109 패턴) — `backend/migrations/` 는 **172차 정지**로 경로가 죽어 있다.
