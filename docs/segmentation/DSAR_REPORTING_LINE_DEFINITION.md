# DSAR — Reporting Line Definition (§7)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §7 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 대전제 — **`REPORTING_LINE_DEFINITION` 은 `ABSENT`. 상위 `REPORTING_LINE_REGISTRY` 도 `ABSENT`**

Definition 은 `reporting_line_registry_id` 를 FK 로 갖는 **하위 엔티티**다. 상위가 없으므로 **정의상 존재할 수 없다**. `reporting_line` **backend/src grep 0** · git 삭제 이력 0 → **존재한 적 없음**.

### ★§7 이 요구하는 "정책" 9종 — **현행에 정책 표현 계층 자체가 없다**

§7 필수 필드 25 중 **9개가 `* policy`** 이다(primary manager · multiple manager · cross legal entity · cross tenant · vacancy · missing manager · historical resolution + 상위 2). 현행에서 이들에 해당하는 것은 **정책이 아니라 스키마 우연**이다:

| §7 정책 | 현행이 그렇게 보이는 이유 | ★규칙 10 |
|---|---|---|
| primary manager policy | `team.manager_user_id` 가 **1칸이라서** 자동으로 "primary 1명" | 정책이 아니라 **여러 개를 표현할 수단이 없음** |
| multiple manager policy | 다중 매니저가 0건 | 동일 — **표현 불가라서 0** |
| cross tenant policy | 테넌트 교차 관계가 0건 | `createTeam:464` 가 **소속 검증 422** 를 하나, 이는 **팀 매니저 지정 검증**이지 보고선 정책 아님 |
| — | `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) | ★**단일행이 스키마(UNIQUE)로 강제** — 정책이 아니라 제약이 여러 개를 금지 |

**★규칙 10 전면 적중**: 현행이 §7 정책을 "준수"하는 것처럼 보이는 모든 지점은 **위반할 능력이 없어서 위반이 0**인 것이다. 이를 커버로 계산하면 **갭이 정의상 소멸하는 역산**이다.

### ★§4.1(Manager ≠ Approver) 실측 — **양쪽 개념이 다 없다**

🔴 *"Manager 를 Approver 로 오용 중"* 이라 적으면 **허구**다. 승인 경로 4개 전량이 **"호출자가 곧 승인자"**:

| 경로 | 승인자 결정 | 자격 판정 축 |
|---|---|---|
| `Mapping::approve:238-294` | `actorId($request)`(`:246`) = **요청자 본인** | **정족수(숫자)뿐** — 적격 술어 **0** |
| `Catalog::approveQueue:2341-2365` | 🔴**행위자를 읽지도 않는다** · `:2343` `requirePro` | **구독 플랜** |
| `AgencyPortal::approveAgency:365-385` | `:370` `isTenantOwner` | 고정 역할(가장 근접하나 **해석 아님**) |
| `FeedTemplate::approveDraft:271` | 라우트 게이트 | — |

★**`Existing Approval Manager Resolver` = `ABSENT`** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`·`approval_chain`·`routeApproval` **0** · `approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`).
★**규칙 10**: `Mapping::approve` 가 Manager 권한 자동상속을 **안 하는 것은 §29 준수가 아니라 상속할 Manager 관계가 없어서**다.

### 인접 자산의 결격 (§7 직결)

- `team.manager_user_id`(`TeamPermissions.php:148`) — **쓰기경로는 REAL**(`createTeam:463-469` → 소속검증 `:464` → INSERT `:466` → `promoteManager:469`) 이나 **Type/Priority/Responsibility Scope 표현 불가 · nullable · effective date 0 · 이력 0**
- `promoteManager:768-776` — 부작용으로 `app_user.team_role='manager'`+`team_id` UPDATE(`:774`) · owner 강등 차단(`:773`). 🔴**역방향(강등) 경로 0** → vacancy policy(#17)의 **정면 결함 근거**
- `app_user.team_id` **단일 컬럼 = 1인 1팀**(이력·유효기간 0) · `team` 에 `parent_team_id` **없음 = 팀 트리 자체가 없다**

## 1. 원문 전사 + 판정 — **원문 25종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | reporting_line_definition_id | 엔티티 부재 — `reporting_line` grep 0 · git 삭제이력 0 | `ABSENT` |
| 2 | reporting_line_registry_id | **상위 레지스트리도 `ABSENT`**([DSAR_REPORTING_LINE_REGISTRY.md](DSAR_REPORTING_LINE_REGISTRY.md)) → FK 대상 없음 | `ABSENT` |
| 3 | tenant_id | 인접 REAL 선례 = `team.tenant_id NOT NULL`(`TeamPermissions.php:146`)·`pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`). 🔴**반례 복제 금지**: `menu_audit_log`·`menu_defaults`·`admin_growth_approval`(`AdminGrowth.php:142-149`) tenant_id 없음 | `LEGACY_ADAPTER` |
| 4 | definition_code | 부재 | `ABSENT` |
| 5 | definition_name | 부재 | `ABSENT` |
| 6 | reporting line type | 부재 — 축 전사 = [DSAR_REPORTING_LINE_TYPE.md](DSAR_REPORTING_LINE_TYPE.md) | `ABSENT` |
| 7 | subject type | Subject 축 0 — 직원 아이덴티티 = `app_user` 뿐 · **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`). 🔴**함정**: `data_scope.subject_type VARCHAR(10)`(`TeamPermissions.php:162`)은 **ACL 주체 타입**(user/team)이지 보고선 Subject 아님 | `ABSENT` |
| 8 | organization scope | `ORGANIZATION_*` **backend 전역 grep 0** · `org_unit` 0 · §3.1 **18/18 `CONTRACT_ONLY`**(문서 70편 · ADR §2 가 *"실 코드·테이블·노드 = 0건"* 자인). 🔴**문서 존재를 구현 존재로 계산하면 역산** | `CONTRACT_ONLY` |
| 9 | legal entity scope | `legal_entity` **backend/src grep 0**(289차 실측). 🔴**함정**: `DATA_SCOPES` `'company'` = **무제한 센티넬**(`effectiveScope():258`)이지 법인 아님 · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`,`:499`,`:1720`) · FK·감독관계·승인라우팅·시점 **전무** | `ABSENT` |
| 10 | country scope | `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축 전부 도메인 상이(광고 인구통계 `Db.php:681`,`:690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` 0. **탐지·라우팅이지 스코프 아님** | `ABSENT` |
| 11 | environment scope | 🔴**함정**: `Db::envLabel()` 은 **게이트가 아니다** — `Db.php:51-54` 가 **코드로 스스로 금지**를 자인. 운영/데모 분리는 **배포 축**(별도 docroot·fpm pool)이지 정의 스코프 아님 | `ABSENT` |
| 12 | supported manager relationship types | §11 Manager Type 27종 표현 수단 0 · `team.manager_user_id` **타입 컬럼 없음** | `ABSENT` |
| 13 | primary manager policy | ★**규칙 10 적중** — `manager_user_id` **1칸이라서** 자동 primary. **정책이 아니라 표현 불가** | `ABSENT` |
| 14 | multiple manager policy | ★동일 — 다중 매니저 0건은 **수단 부재의 결과**. `data_scope UNIQUE(tenant_id,subject_type,subject_id)`(`:164`) 도 **정책이 아니라 UNIQUE 가 여러 개를 금지** | `ABSENT` |
| 15 | cross legal entity policy | 법인 축(#9) 자체가 0 → 교차를 정의할 양변 없음 | `ABSENT` |
| 16 | cross tenant policy | 인접 = `createTeam:464` **소속 검증 422**(매니저가 테넌트 소속인지) · `promoteManager:774` `WHERE … AND tenant_id=?`. 🔴 **팀 매니저 지정 검증이지 보고선 정책 아님** · **`BLOCKED_CROSS_TENANT` 판정을 낼 대상 자체가 없다** | `ABSENT` |
| 17 | vacancy policy | `vacan` **grep 0**. 🔴**§76 실재 결함 2** — `promoteManager:768-776` 에 **강등 경로 0** → `manager_user_id=NULL` 로 바꿔도 **전임자 `team_role='manager'` 잔존** → 위임 권한(`isManagerAdmin:136`·`putMemberPermissions:618`) **계속 보유** = **Vacant Position 을 Active Manager 로 처리** | `ABSENT`(활성 결함 동반) |
| 18 | missing manager policy | manager NULL 이 **기본 상태**다 — `seedOrg:739` INSERT 8컬럼에 `manager_user_id` 부재 → **`ORG_PRESET` 시드 15팀 전부 manager NULL**. 🔴 그럼에도 **NULL 처리 분기 0** → **fail-open**(§41 `is_active NOT NULL DEFAULT 1` 이 미지를 "가용"으로 만드는 것과 동형) | `ABSENT` |
| 19 | historical resolution policy | 이력 0 · as-of 질의 0(`as_of` 2건 = **응답 타임스탬프** `PgSettlement.php:279`·`AttributionEngine.php:666`). 🔴**정면 반례**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이력을 물리적으로 소멸**(§55 위반) | `ABSENT` |
| 20 | owner | 인접 = `pm_projects.owner_user_id` — **판독 술어 0**(`WHERE owner_user_id` grep 0) → **저장된 라벨** · 무검증 자유문자열(`Projects.php:112-117` · `PMSettings.jsx:166-167` 맨 `<input>` · `app_user` FK 없음) · 기본값이 생성자(`:66`). 🔴`pm_raid.owner`(`Enterprise.php:42`,`:60`)·`admin_growth_lead.owner`(`AdminGrowth.php:909`) = **자유문자열 담당자**(함정) | `NAME_ONLY` |
| 21 | active version | `menu_defaults.version`(`AdminMenu.php:120`) 유일 생산자 `:308-309` **리터럴 `'baseline'` 고정 = 라벨**(규칙 7) · 판독 `:584` = `ORDER BY created_at DESC LIMIT 1` **최신승**. ★§8:578 *"Active Version을 직접 수정하지 마라"* 강제 수단 0 | `NAME_ONLY` |
| 22 | valid_from | **grep 0** · `kr_fee_rule.effective_from`(`Db.php:898`)은 **컬럼 有·질의 無** | `ABSENT` |
| 23 | valid_to | **`valid_to`·`effective_to` grep 0** | `ABSENT` |
| 24 | status | 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`:148`) = **무검증 자유문자열**(ENUM/CHECK/`in_array` 0) · 팀 상태이지 정의 상태 아님 | `ABSENT` |
| 25 | evidence | 인접 REAL = `menu_audit_log.hash_chain`(`AdminMenu.php:128` · `lastHash():214-219`) · `pm_audit_log`(`tenant_id NOT NULL` + `diff_json` + append-only). 🔴**`menu_audit_log` tenant_id 없음 → 스키마 복제 금지·알고리즘만 이식** | `LEGACY_ADAPTER` |

**측정기 분모: 40(§7 전체) / 원문 대조: 필수 필드 25 + Reporting Line Type 15 = 40 / 본 편 전사: 25.** 잔여 15는 [DSAR_REPORTING_LINE_TYPE.md](DSAR_REPORTING_LINE_TYPE.md) 에서 전사. **불일치 없음.**

커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 20 · `NAME_ONLY` 2 · `LEGACY_ADAPTER` 2 · `CONTRACT_ONLY` 1.

## 2. 규칙

- 🔴 **정책 9종(#13~#19 외)이 "현행에서 지켜지고 있다"고 계산 금지(규칙 10).** 현행은 **위반할 능력이 없어서 위반이 0**이다. `manager_user_id` 1칸을 primary manager policy 준수로 읽으면 **§7 전체가 정의상 충족**되어 갭이 소멸한다 — 전형적 역산.
- 🔴 **`vacancy policy`(#17)·`missing manager policy`(#18)는 문서상 `ABSENT` 이나 활성 결함을 동반한다.** `promoteManager:768-776` 에 **강등 경로가 없어** 매니저를 비워도 전임자가 `team_role='manager'` 로 남아 **위임 권한을 계속 행사**한다(`isManagerAdmin:136`·`putMemberPermissions:618`). **보고선 설계 이전에 이 강등 경로가 선결**이며, 이는 **코드 변경 → 별도 승인세션 소관**이다.
- 🔴 **`missing manager` 를 fail-open 으로 설계 금지.** 현행의 `is_active NOT NULL DEFAULT 1`(`Db.php:1106`)이 **미지를 자동으로 "가용"** 으로 만든 것과 같은 실수다. **Unknown ≠ Eligible · Fail-closed**(Part3-2 Eligibility Engine 원칙 계승).
- 🔴 **`cross tenant policy`(#16)를 `createTeam:464` 로 커버 계산 금지.** 그것은 **팀 매니저 지정 시 소속 검증**이며, 보고선 교차 정책과 **도메인이 다르다**(규칙 9 — 미달을 중복이라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).
- 🔴 **`REPORTING_LINE_DEFINITION` 을 승인 도메인에 직접 결합 금지.** §4.1(Manager ≠ Approver)의 전제상 **Definition 은 Approver 를 결정하지 않는다** — `APPROVAL_REFERENCE` 타입([DSAR_REPORTING_LINE_TYPE.md](DSAR_REPORTING_LINE_TYPE.md) #14)을 통해 **참조만** 하라. 현행 승인 4경로가 전부 "호출자가 곧 승인자"이므로, **Definition 을 붙이는 순간 없던 자동 권한 상속이 생긴다.**
- 🔴 **`pm_task_dependencies` 스키마 복제 금지** — `Dependencies.php:90-91` 이 `dep_type` 을 술어에 안 넣어 **전 타입 무차별 순회**한다. 이 결함을 물려받으면 **§11 Manager Type 27종별 정책이 설계 시점에 이미 불가능**해진다.
- ★**경로 접두 주의**: `backend/src/Handlers/PM/…` — **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편에 오표기 전파).
