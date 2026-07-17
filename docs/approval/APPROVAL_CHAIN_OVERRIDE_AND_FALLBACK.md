# Approval Chain Conflict · Override · Fallback

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §40, §41, §42, §43, §44, §45 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

## 1. 원문 전사

### §40. Approval Chain Conflict (원문 줄 1929-1988 · 분모 48)

`APPROVAL_CHAIN_CONFLICT`

#### Conflict Type (29)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | MULTIPLE_APPLICABLE_CHAIN | 🔴`JourneyBuilder::nextNode:799` **첫 일치 즉시 return** → 다중 적용 **무탐지·무기록**(§72-11 위반이 마케팅 도메인에 실재) | ABSENT |
| 2 | SAME_PRIORITY_CHAIN | Priority 축 0 (`source_priority` = `DataPlatform.php:65`,`:184` 데이터소스 Trust 우선순위 FP) | ABSENT |
| 3 | SAME_SPECIFICITY_CHAIN | Specificity 축 0 | ABSENT |
| 4 | OVERLAPPING_EFFECTIVE_PERIOD | `kr_fee_rule.effective_from`(`Db.php:898`) 컬럼 有·질의 無 · `effective_to`/`valid_from`/`valid_to` grep **0** → 구간 개념 자체 부재 | ABSENT |
| 5 | DUPLICATE_CHAIN_CODE | Chain 이름 축 0 | ABSENT |
| 6 | DUPLICATE_STAGE_CODE | Stage 개념 0 (`stage`/`sc_stages` = `SupplyChain.php:50-54` 물류 마일스톤 FP) | ABSENT |
| 7 | DUPLICATE_LEVEL_CODE | `approval_level` grep 0 | ABSENT |
| 8 | MULTIPLE_START_NODE | 🔴`JourneyBuilder:198` `$nodes[0]['id'] ?? 'trigger_1'` = 위치 기반 채택 → **복수 START 를 탐지하지 않고 조용히 첫 원소를 고른다** | ABSENT |
| 9 | NO_START_NODE | 동상 — `?? 'trigger_1'` 리터럴 폴백이 부재를 은폐 | ABSENT |
| 10 | NO_TERMINAL_NODE | Terminal 선언·검증 0 | ABSENT |
| 11 | UNREACHABLE_NODE | 도달성 검증기 0 (★`Gantt:119` Kahn 잔여는 순환 전용 — §3.3 정정) | ABSENT |
| 12 | DEAD_END_NODE | `nextNode:790` `if(!$cand) return ''` = **런타임 무음 종료**(Conflict 생성 아님) | ABSENT |
| 13 | SELF_LOOP | ★`PM/Dependencies.php:29-31` `if ($pred === $succ)` → **422 `self_dependency` 쓰기 전 차단** 실동작 · Conflict **레코드**는 미생성 | LEGACY_ADAPTER |
| 14 | ROUTE_CYCLE | ★`PM/Dependencies.php:32-34` → `validateDependency:79-100`(DFS·`$visited`·tenant 매 홉 `:91`) **422 `cycle_detected`** · 🔴`:32-34` 조기반환이 `:48` `auditLog` 미도달 → **탐지해도 기록이 없다** | LEGACY_ADAPTER |
| 15 | DEFAULT_EDGE_CONFLICT | 🔴`nextNode:799` 첫 일치 즉시 return · `:811-812` 무라벨 위치 폴백 → 충돌 개념 부재 | ABSENT |
| 16 | BRANCH_POLICY_CONFLICT | 분기 정책 선언 0 (`condition:600`·`split:610` 하드코딩 2종) | ABSENT |
| 17 | MERGE_POLICY_MISSING | Merge 노드 개념 0 — 분기는 배타 택일만 | ABSENT |
| 18 | STAGE_LEVEL_MISMATCH | Stage·Level 양축 0 | ABSENT |
| 19 | ACTOR_SOURCE_CONFLICT | Actor Resolver 0 → 소스 충돌 대상 없음. 4경로 전량 "호출자가 곧 승인자" | ABSENT |
| 20 | AUTHORITY_REFERENCE_CONFLICT | 🔴🔴**권한 축 2벌 분열이 이미 미해소 충돌** — `$roleRank`(`backend/public/index.php:554`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**. 충돌이 탐지되지 않는 것이 아니라 **충돌을 물을 축이 없다** | ABSENT |
| 21 | TEMPLATE_VERSION_CONFLICT | Template 버전 0 (`JourneyBuilder:120-126` 리터럴 시드) | ABSENT |
| 22 | WORKFLOW_REFERENCE_CONFLICT | `workflow_*`/`flow_*`/`wf_*` grep 0 | ABSENT |
| 23 | TENANT_SCOPE_CONFLICT | 테넌트 경계 강제 선례 `Dependencies:91` 는 스코프 제한이지 충돌 탐지 아님. 🔴 반례 = `Catalog::approveQueue:2350` ids 미지정 시 **테넌트 전체 일괄 승인** · `AdminGrowth:1324` `WHERE id=?` **tenant 술어 없음** | ABSENT |
| 24 | LEGAL_ENTITY_SCOPE_CONFLICT | Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` 데모 문자열) | BLOCKED_PREREQUISITE |
| 25 | ORGANIZATION_SCOPE_CONFLICT | `ORGANIZATION_*` 전량 CONTRACT_ONLY | BLOCKED_PREREQUISITE |
| 26 | FALLBACK_CYCLE | Fallback 축 0 → 순환 대상 없음 | ABSENT |
| 27 | OVERRIDE_CONFLICT | Override 축 0 (`override` grep = `Mmm.php:381-382`·`OrderHub.php:1274` **스칼라 선행순위** FP) | ABSENT |
| 28 | VERSION_CONFLICT | version 축 0 · optimistic lock `version` 0 | ABSENT |
| 29 | CUSTOM | 확장 지점 0 | ABSENT |

#### 필수 필드 (19)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 30 | approval_chain_conflict_id | `approval_chain_conflict` 이름 grep 0 | ABSENT |
| 31 | tenant | 🔴 Tenant 마스터 테이블 없음(`api_key.tenant_id` FK 없는 VARCHAR `Db.php:944`) | ABSENT |
| 32 | approval domain | 승인 도메인 축 0 — 4경로 스키마 전부 상이 | ABSENT |
| 33 | chain definitions | Chain 정의 0 | ABSENT |
| 34 | chain versions | version 축 0 | ABSENT |
| 35 | stage references | Stage 0 | ABSENT |
| 36 | level references | Level 0 | ABSENT |
| 37 | route references | `approval_route`/`route_id` grep 0 (`route` 단독 = SPA URL FP) | ABSENT |
| 38 | conflict type | 위 29종 전량 미구현 | ABSENT |
| 39 | effective period | `effective_to`/`valid_from`/`valid_to` grep 0 | ABSENT |
| 40 | affected requests | 영향 요청 추적 0 | ABSENT |
| 41 | affected cases | 영향 건 추적 0 | ABSENT |
| 42 | severity | Conflict severity 0 (`RuleEngine`/`Alerting` severity 는 타 도메인) | ABSENT |
| 43 | resolution policy | §41 전항 부재 | ABSENT |
| 44 | resolved chain reference | 동상 | ABSENT |
| 45 | resolved_by | 해소 행위자 기록 0 | ABSENT |
| 46 | resolved_at | 해소 시각 기록 0 | ABSENT |
| 47 | status | Conflict 엔티티 부재 | ABSENT |
| 48 | evidence | Evidence 축 0 | ABSENT |

---

### §41. Conflict Resolution 기본 순서 (원문 줄 1989-2008 · 분모 9)

권장 기본 순서(원문 번호목록):

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Approved Governance Override | Governance Override 축 0 · 승인된 Override 개념 0 | ABSENT |
| 2 | Explicit Request-Type Binding | Request Type 축 0 — 4경로는 테이블별 하드바인딩(`mapping_change_request`·`catalog_writeback_job`·`action_request`·`admin_growth_approval`) | ABSENT |
| 3 | Tenant-specific Chain | 테넌트별 Chain 0 | ABSENT |
| 4 | Higher Priority | Priority 축 0 (`source_priority` = 데이터소스 Trust FP) | ABSENT |
| 5 | Higher Specificity | Specificity 축 0 | ABSENT |
| 6 | Newer Approved Effective Version | 🔴 "최신승" 패턴은 실재하나 **승인·유효기간 무관** — `ORDER BY effective_from DESC`(`Pnl.php:454`·`KrChannel.php:151`,`:459`) 는 as-of 질의가 아닌 단순 최신 1행 | ABSENT |
| 7 | Domain Default | 도메인 기본 Chain 0 | ABSENT |
| 8 | Manual Review | 수동검토 큐 0 (`mapping_change_request` 는 승인 큐이지 Conflict 검토 큐 아님) | ABSENT |
| 9 | Block | 🔴`nextNode:809` `if($hasLabeled) return ''` 는 **No-Match 차단**이지 Conflict 해소 아님. 다중 일치는 `:799` 에서 **차단 없이 첫 일치 채택** | ABSENT |

> 원문 산문 2건 — *"Material Conflict는 자동으로 숨기지 마라"*(2003) · *"자동 Resolution을 수행한 경우 선택 근거를 Evidence로 저장하라"*(2005) — 분모 외. §2 계약(C-2)에 반영.

---

### §42. Approval Chain Override (원문 줄 2009-2068 · 분모 43)

`APPROVAL_CHAIN_OVERRIDE`

#### Override Type (14)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | TENANT_OVERRIDE | 영속 오버레이 0. ★**오탐 주의**: `override` grep 히트는 **스칼라 선행순위 해석** — `Mmm.php:381-382`(`if ($override !== null) return $override;` = 요청 단위 인메모리 클로저) · `OrderHub.php:1274`(HTTP>테넌트설정>정적) | ABSENT |
| 2 | LEGAL_ENTITY_OVERRIDE | 🔴**선행조건 0%** — Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` 데모 문자열) · `'company'` scope 는 법인이 아니라 **무제한 센티넬**(`TeamPermissions::effectiveScope:258` `return null`) | BLOCKED_PREREQUISITE |
| 3 | ORGANIZATION_OVERRIDE | 🔴 Organization 전량 CONTRACT_ONLY · `ORG_PRESET`(`TeamPermissions.php:706-722`) = PHP 상수 15줄 · `team:143-151` `parent_team_id` **없음** | BLOCKED_PREREQUISITE |
| 4 | COUNTRY_OVERRIDE | Country scope 0 (`country_code` grep = `Connectors:2044`,`:2071` **TikTok 리포트 차원** · `Geo.php:106` **IP Geo** FP) | ABSENT |
| 5 | PROGRAM_OVERRIDE | Program 축 0 | ABSENT |
| 6 | PRODUCT_OVERRIDE | `DATA_SCOPES` 에 `product` 실재 · `scopeChannelProduct:319` 이 SKU 컬럼에 매핑(정상 차원) — 그러나 **Override 기제 자체 0** | ABSENT |
| 7 | BRAND_OVERRIDE | 🔴`scopeChannelProduct:319-320` 이 `product`·`brand` **둘 다 동일 `$skuCol` 에 매핑**(`:312` 자인 "브랜드=상품집합") → **brand 는 독립 차원이 아니다** | BLOCKED_PREREQUISITE |
| 8 | PARTNER_OVERRIDE | Partner 축 0. `agency_client_link`(`AgencyPortal.php:20`) 는 **테넌트↔테넌트** 단위 · Override 아님 | ABSENT |
| 9 | REQUEST_TYPE_OVERRIDE | Request Type 축 0 | ABSENT |
| 10 | TEMPORARY_OVERRIDE | 한시 오버레이 0. 인접 = `UserAdmin::impersonate:472` 플랫폼 admin 2h 대행열람(`:499` 감사) — **테넌트 내 승인 오버라이드 아님** | ABSENT |
| 11 | EMERGENCY_REFERENCE | 긴급 경로 0 | ABSENT |
| 12 | CASE_SPECIFIC_OVERRIDE | 건별 오버라이드 0 | ABSENT |
| 13 | GOVERNANCE_CORRECTION | 거버넌스 정정 축 0 | ABSENT |
| 14 | CUSTOM | 확장 지점 0 | ABSENT |

#### 필수 필드 (22)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 15 | approval_chain_override_id | `approval_chain_override` 이름 grep 0 | ABSENT |
| 16 | tenant | 🔴 Tenant 마스터 테이블 없음(`Db.php:944`) | ABSENT |
| 17 | base chain definition | Chain 정의 0 | ABSENT |
| 18 | base chain version | version 축 0 | ABSENT |
| 19 | override type | 위 14종 전량 미구현 | ABSENT |
| 20 | target scope | Scope 모델 = `TeamPermissions::DATA_SCOPES`(메뉴·채널·SKU 축) — Chain 대상 스코프 아님 | ABSENT |
| 21 | replacement chain reference | 치환 대상 0 | ABSENT |
| 22 | stage modification reference | Stage 0 | ABSENT |
| 23 | level modification reference | Level 0 | ABSENT |
| 24 | route modification reference | Route 0 | ABSENT |
| 25 | condition modification reference | 조건은 노드 config 인라인 · 참조 불가 | ABSENT |
| 26 | fallback modification reference | Fallback 0 | ABSENT |
| 27 | reason | 사유 기록 0 (4경로 어디에도 override reason 없음) | ABSENT |
| 28 | requested_by | 🔴`action_request` 에 `requested_by` **컬럼 자체 없음**(`Db.php:592-600`) → 자기승인 차단 구조적 불가. `admin_growth_approval` 은 `requested_by`·`decided_by` **양쪽 있으나 비교 코드 0**(`AdminGrowth:1324-1331`) | ABSENT |
| 29 | approved_by reference | 승인자 참조 0 | ABSENT |
| 30 | approval evidence | Evidence 축 0. `approvals_json`(`Mapping.php:285`) = `["user"=>$actor,"ts"=>gmdate('c')]` **정확히 2키** — 승인시점 권한/역할/플랜 미보존 | ABSENT |
| 31 | valid_from | `valid_from` grep **0** | ABSENT |
| 32 | valid_to | `valid_to` grep **0**(`Onsite.php:396` `invalid_token` FP 유일) | ABSENT |
| 33 | maximum duration | 최대 기간 0 | ABSENT |
| 34 | renewal count | 갱신 횟수 0 | ABSENT |
| 35 | status | Override 엔티티 부재 | ABSENT |
| 36 | evidence | Evidence 축 0 | ABSENT |

#### Case-specific Override 요구 (7)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 37 | Explicit Approval Reference | 명시 승인 참조 0 | ABSENT |
| 38 | Reason | 사유 0 | ABSENT |
| 39 | Expiration | 만료 0. 인접 = `UserAdmin::impersonate:472` 2h(대행열람) | ABSENT |
| 40 | Audit | ★정본 선례 = `SecurityAudit.php:27`(tenant 포함 sha256) + `:45-52` DDL(`prev_hash`/`hash_chain`) + `verify():56-68` `hash_equals` **검증기 실재**. 🔴`menu_audit_log.hash_chain` 은 **재구성 불가한 장식** — 선례 인용 금지. 막히는 축은 **`ts` 하나**로 preimage 의 `date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 미저장**(`:129` DB DEFAULT)이다(★근거 정정 — `prev` 는 `lastHash():216` 으로 재구성 가능) | LEGACY_ADAPTER |
| 41 | Snapshot | 스냅샷 선례 = `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`) · `pm_baseline.snapshot_json`(`PM/Enterprise.php:360` — ★`captured_at` 은 DB 컬럼 아니라 **JSON 키**) · **Chain 도메인 0** | ABSENT |
| 42 | Authorization Check | 🔴🔴 권한 축 2벌 분열(`index.php:554` `$roleRank` ↔ `team_role`) **매핑 0** · 🔴`acl_permission.approve` 는 `ACTIONS:39` 실재·`seedOrg:711` 시드되나 **승인 가부 판독자 0** = 완전한 장식 | ABSENT |
| 43 | Separation of Duties Reference | ★`Mapping.php:268-271` **자기승인 403** + `:278-283` 승인자 dedup = **레포 유일 SoD 실집행**. ⚠️`apply:296-299` 는 `actorId` 아닌 `actor()` 사용 → **집행단계 승인자=집행자 차단 없음** · 4경로 중 1곳뿐(`AdminGrowth:1292` 는 **요청 dedup**이지 승인자 dedup 아님) | LEGACY_ADAPTER |

> 원문 산문 1건 — *"Override는 Base Chain Version을 직접 수정하지 않는다"*(2055) — 분모 외. §2 계약(C-3)에 반영.

---

### §43. Override Overlay 원칙 (원문 줄 2069-2089 · 분모 0 — ★특례)

★**이 섹션은 분모 측정기가 0 을 반환한다**(불릿 0 · 산문 + 코드블록). 그러나 **요구는 실재**하므로 코드블록 8단계 + 산문 2건 = **10행 전사**한다. **행 수가 분모(0)를 초과하는 것이 정상이다** — §3.2 참조.

#### Override 적용 순서 (원문 코드블록 2073-2082)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Base Chain Version | Chain 정의·version 축 0 → 기준선 없음 | ABSENT |
| 2 | → Tenant Override | 영속 테넌트 오버레이 0. `Mmm.php:381-382`·`OrderHub.php:1274` 는 **요청 단위 인메모리 스칼라 선행순위**(FP) | ABSENT |
| 3 | → Domain Override | 승인 도메인 축 0 — 4경로 스키마·의미론 전부 상이 | ABSENT |
| 4 | → Legal Entity·Organization Override | 🔴 양쪽 선행조건 0% — Legal Entity 이름·능력 0(`MarketingDataHub.php:181` 데모 문자열) · Organization 전량 CONTRACT_ONLY · `'company'` = 무제한 센티넬(`TeamPermissions:258`) | BLOCKED_PREREQUISITE |
| 5 | → Program·Product·Brand Override | 🔴 Program 축 0 · Brand 는 독립 차원 아님(`scopeChannelProduct:319-320` 이 product·brand **둘 다 `$skuCol`** 에 매핑 · `:312` 자인) | BLOCKED_PREREQUISITE |
| 6 | → Approved Case-specific Override | 건별 오버라이드 0 · 승인 참조 0 | ABSENT |
| 7 | → Validation | §39 전항 부재(별편 `APPROVAL_CHAIN_COMPILATION.md` 참조) | ABSENT |
| 8 | → Compilation | §38 전항 부재 · 컴파일 산출물 저장처 전무 | ABSENT |

#### 산문 요구 (원문 2084-2086)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 9 | 적용 순서는 Versioned Policy로 관리하라 | 🔴 선행순위가 **코드에 하드코딩**된 것이 현행 유일 패턴 — `Mmm.php:381-382`(클로저 리터럴) · `OrderHub.php:1274`(주석으로만 순위 기술) · `DataPlatform.php:65`,`:184` `source_priority` 는 **데이터소스 Trust 순위**이지 라우트 순위 아님. Policy 버전 축 0 | ABSENT |
| 10 | 동일 Scope에 상충하는 Override가 있으면 Conflict를 생성하라 | 🔴 반례 실재 — `JourneyBuilder::nextNode:799` **첫 일치 즉시 return** → 다중 일치 **무탐지·무기록**(§72-11 위반이 마케팅 도메인에 실재). Conflict 생성기 0 | ABSENT |

---

### §44. Approval Chain Fallback (원문 줄 2090-2127 · 분모 24)

`APPROVAL_CHAIN_FALLBACK`

#### 지원 Fallback (9)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | USE_DOMAIN_DEFAULT_CHAIN | 도메인 기본 Chain 0 | ABSENT |
| 2 | USE_TENANT_DEFAULT_CHAIN | 테넌트 기본 Chain 0 | ABSENT |
| 3 | USE_PARENT_ORGANIZATION_CHAIN | 🔴🔴 **다단 상향 순회 = 사람·조직 축 선례 0**. `parent_user_id` 판독자 12+ 전량 **1홉**(`UserAuth::resolveTenantId:207-215` 등)·목적은 tenant 해석 · `pm_tasks.parent_task_id`(`20260526_168_002_create_pm_tasks.sql:8`)는 **순회기 0**(이름은 트리, 능력은 평면) · `team:143-151` `parent_team_id` 없음 | BLOCKED_PREREQUISITE |
| 4 | USE_LEGAL_ENTITY_DEFAULT_CHAIN | Legal Entity 이름·능력 0 | BLOCKED_PREREQUISITE |
| 5 | USE_GLOBAL_DEFAULT_CHAIN_REFERENCE | 전역 기본 Chain 0 | ABSENT |
| 6 | CREATE_MANUAL_REVIEW | 수동검토 큐 0 | ABSENT |
| 7 | ESCALATE_REFERENCE | 🔴 `escalat` grep = `Reviews.php:173-187` **부정리뷰 Slack 통지** FP · 승인 에스컬레이션 0 | ABSENT |
| 8 | BLOCK_REQUEST | 🔴🔴 `nextNode:809` `if($hasLabeled) return ''` = **라벨 그래프에만** 차단 · `:811-812` 무라벨 레거시에 **위치 폴백 존치**(주석 `:810` 자인) · `:814` 분기 없으면 첫 후보. 286차 실장애(주석 `:801-803`) | PARTIAL |
| 9 | CUSTOM | 확장 지점 0 | ABSENT |

#### 필수 필드 (15)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 10 | approval_chain_fallback_id | `approval_chain_fallback` 이름 grep 0 | ABSENT |
| 11 | tenant | 🔴 Tenant 마스터 테이블 없음(`Db.php:944`) | ABSENT |
| 12 | approval domain | 도메인 축 0 | ABSENT |
| 13 | request type | Request Type 축 0 | ABSENT |
| 14 | organization type | Organization 전량 CONTRACT_ONLY | BLOCKED_PREREQUISITE |
| 15 | legal entity scope | Legal Entity 이름·능력 0 | BLOCKED_PREREQUISITE |
| 16 | country scope | `country_code` = TikTok 리포트 차원(`Connectors:2044`)·IP Geo(`Geo.php:106`) FP | ABSENT |
| 17 | fallback sequence | 순서 모델 0 | ABSENT |
| 18 | maximum fallback depth | 깊이 상한 0 (`Dependencies:84` `$depth<10000`·`AdminMenu:541` `$depth<100` = 폭주 가드 FP) | ABSENT |
| 19 | cross legal entity allowed 여부 | Legal Entity 부재 → 교차 허용 여부 대상 없음 | BLOCKED_PREREQUISITE |
| 20 | evidence requirement | Evidence 축 0 | ABSENT |
| 21 | manual review threshold | 임계 유일 선례 = `Catalog.php:1016` `HIGH_VALUE_KRW`(→`:1103-1105`) — 수동검토 임계 아님 | ABSENT |
| 22 | terminal policy | 종료 정책 0 | ABSENT |
| 23 | status | Fallback 엔티티 부재 | ABSENT |
| 24 | evidence | Evidence 축 0 | ABSENT |

> 원문 산문 1건 — *"Fallback Chain 자체가 다시 원본 Chain을 참조하여 Cycle을 만들지 않게 하라"*(2124) — 분모 외. §2 계약(C-4)에 반영.

---

### §45. Missing Approval Chain Policy (원문 줄 2128-2163 · 분모 22)

`MISSING_APPROVAL_CHAIN_POLICY`

#### 지원 Policy (8)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | USE_EXPLICIT_DEFAULT | 명시 기본 0 | ABSENT |
| 2 | USE_DOMAIN_DEFAULT | 도메인 기본 0 | ABSENT |
| 3 | USE_TENANT_DEFAULT | 테넌트 기본 0 | ABSENT |
| 4 | USE_PARENT_ORGANIZATION_DEFAULT | 상향 순회 선례 0 · `parent_user_id` 4 생성경로 owner 하드고정 | BLOCKED_PREREQUISITE |
| 5 | CREATE_MANUAL_REVIEW | 수동검토 큐 0 | ABSENT |
| 6 | BLOCK_APPROVAL_CASE | 🔴🔴 `nextNode:809` BLOCK_ON_NO_MATCH 는 **라벨 그래프 조건부로만 확립** · `:811-812` 무라벨 폴백 존치 · `:814` 첫 후보 | PARTIAL |
| 7 | RETURN_CONFIGURATION_ERROR | 설정오류 반환 0 — 🔴 반례 = `TeamPermissions:342` `in_array($stype, self::DATA_SCOPES)` **무음 강등 폴백(`'own'`)** | ABSENT |
| 8 | CUSTOM | 확장 지점 0 | ABSENT |

#### 필수 필드 (14)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 9 | missing_approval_chain_policy_id | `missing_approval_chain` 이름 grep 0 | ABSENT |
| 10 | tenant | 🔴 Tenant 마스터 테이블 없음(`Db.php:944`) | ABSENT |
| 11 | approval domain | 도메인 축 0 | ABSENT |
| 12 | request type | Request Type 축 0 | ABSENT |
| 13 | resource type | 자원 레지스트리 = `TeamPermissions:55-82` `MENU_CATALOG`(26개) + `validMenu:180` 강제 — **메뉴 한정** · 리베이트/승인건은 자원이 아님 | ABSENT |
| 14 | organization scope | Organization 전량 CONTRACT_ONLY | BLOCKED_PREREQUISITE |
| 15 | legal entity scope | Legal Entity 이름·능력 0 | BLOCKED_PREREQUISITE |
| 16 | policy | 위 8종 전량 미구현. 🔴 `MISSING_MANAGER_POLICY` 형태 유사물 = `UserAuth:1226-1227`(정책 아니라 **평면화 하드코딩**) | ABSENT |
| 17 | fallback references | §44 전항 부재 | ABSENT |
| 18 | maximum attempts | 시도 상한 0 | ABSENT |
| 19 | evidence requirement | Evidence 축 0 | ABSENT |
| 20 | severity | severity 축 0 | ABSENT |
| 21 | status | Policy 엔티티 부재 | ABSENT |
| 22 | evidence | Evidence 축 0 | ABSENT |

> 원문 산문 1건 — *"No Match 상태에서 임의의 첫 번째 Chain을 선택하지 마라"*(2160) — 분모 외. 🔴 **이 금지의 위반이 레포에 살아 있다** — §3.4 참조.

---

## 2. 설계 계약

후속 구현(별도 승인세션)이 지켜야 할 계약. 본 문서는 코드가 아니다.

### C-1. 🔴🔴 무라벨 폴백 절대 복제 금지 (§45·§72-10 정면)
`JourneyBuilder::nextNode` 는 **부분적으로만** BLOCK_ON_NO_MATCH 다:

```
:809  if ($hasLabeled) return '';                      ← 라벨 그래프에만 차단
:811  $idx = in_array($bl,['true','a','yes','1']) ? 0
             : (count($cand) > 1 ? 1 : 0);             ← 🔴 무라벨 레거시 위치 폴백 존치
:814  return (string)($cand[0]['to'] ?? '');           ← 🔴 분기 없으면 첫 후보
```

286차 실장애 기록(주석 `:801-803`): 위치 폴백이 *"조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송"*.

**Approval 이식 시**: ① `:809` 의 **차단 의도만** 가져오고 ② `:811-812`·`:814` 는 **가져오지 않는다** ③ No-Match 는 **무조건** `BLOCK_APPROVAL_CASE` 또는 `RETURN_CONFIGURATION_ERROR` 로 fail-closed 한다. 동일 패턴 금지 대상: `pickWeighted:729` `if($total<=0) return $keys[0]` · `JourneyBuilder:198` `$nodes[0]['id'] ?? 'trigger_1'` · `TeamPermissions:342` 무음 강등(`'own'`).

### C-2. Conflict 는 탐지·기록·비은폐 (§40·§41 산문)
- **첫 일치 즉시 return 금지** — `nextNode:799` 패턴 복제 금지. 적용 가능 Chain 을 **전수 수집한 뒤** 개수 판정한다.
- 다중 일치 → `MULTIPLE_APPLICABLE_CHAIN` **Conflict 레코드 생성**. *"Material Conflict는 자동으로 숨기지 마라"*(2003).
- 자동 Resolution 수행 시 **선택 근거를 Evidence 로 저장**(2005). §41 순서를 코드 하드코딩이 아니라 **Versioned Policy**(§43-9)로 관리한다.
- 🔴 **감사 누락 결함 복제 금지**: `Dependencies:32-34` 는 422 조기반환하여 `:48` `auditLog` 에 미도달한다 → **순환 탐지 시 감사 이벤트 없음**. Conflict 는 **탐지 자체가 기록 대상**이다.

### C-3. Override 는 Base 를 수정하지 않는다 (원문 2055)
Overlay 는 **별도 레코드**로 적재하고 Base Chain Version 은 불변 유지. 현행 반례:
- `TeamPermissions:495` **덮어쓰기**(이전 manager 값 소멸)
- 🔴🔴`AgencyPortal:304`,`:381` 이 `revoked_at=NULL` 로 **이전 해지시각을 소거** → 위임 이력 물리 소멸 → **as-of 승인권 재구성 불가**(§48 정면 반례)
- `Connectors::fxToKrw:1749` → `app_setting` KV **단일행 덮어쓰기**(`:1804-1805`)

### C-4. Fallback Cycle 방지 (원문 2124)
Fallback sequence 자체가 DAG 여야 한다. `PM/Dependencies.php:79-100` 의 **DFS + `$visited` + tenant 매 홉(`:91`)** 알고리즘을 추출해 Fallback 참조 그래프에 적용하고, **쓰기 전 차단**(`:32-34` 패턴)한다. 🔴 스키마는 복제하지 마라(`:90-91` `dep_type` 술어 부재 결함).

**경로 표기 주의**: `backend/src/Handlers/PM/…`. **`backend/src/PM/` 는 존재하지 않는다**(5-3-3-1 문서 25편 오표기).

### C-5. 확장 가능한 유일 선례 2건
| 요구 | 확장 원본 | 한계 |
|---|---|---|
| §42-43 SoD | `Mapping.php:246-250`(신원 fail-closed)·`:268-271`(자기승인 403)·`:278-283`(dedup)·`:287`(정족수 — 레포 유일 실집행) | ⚠️ `apply:296-299` 가 `actorId` 아닌 `actor()` → **집행단계 신원 fail-closed 아님** · 승인자=집행자 차단 없음. 이식 시 **집행단계까지 확장**하라 |
| §42-40 Audit | `SecurityAudit.php:27`·`:45-52`·`verify():56-68` | 감사 로그 도메인. `hash_equals` 검증기까지 갖춘 **정본 선례** |

### C-6. 위임(Delegation)은 신설 금지·확장
`TeamPermissions::putMemberPermissions:614-661` = 레포 최상급 위임 선례(`assignableMap:354` 상한 → `:639` 초과 시 403 `DELEGATION_EXCEEDED` `:645-646` · `clampActions:396` · `reclampTeamMembers:586`). 🔴 **그러나 정적 grant 이지 "특정 건 승인권 한시 이양"이 아니다**(대상·기간·회수 축 0) → §42 `TEMPORARY_OVERRIDE`/`CASE_SPECIFIC_OVERRIDE` 는 **이 기반의 확장**으로 설계하라. **`agency_client_link` 는 위임 기반으로 쓸 수 없다**(단위=테넌트↔테넌트 · write=단일 불리언 · 해지 이력 소거).

---

## 3. 미결·선행조건

### 3.1 행 수 vs 분모
| 섹션 | 원문 줄 | 분모 | 표 행 수 | 상태 |
|---|---|---|---|---|
| §40 Approval Chain Conflict | 1929-1988 | 48 | 29(Type) + 19(필드) = **48** | ✅ 일치 |
| §41 Conflict Resolution 기본 순서 | 1989-2008 | 9 | **9**(번호목록) | ✅ 일치 |
| §42 Approval Chain Override | 2009-2068 | 43 | 14(Type) + 22(필드) + 7(Case-specific) = **43** | ✅ 일치 |
| §43 Override Overlay 원칙 | 2069-2089 | **0** | **10** | ★특례 — §3.2 |
| §44 Approval Chain Fallback | 2090-2127 | 24 | 9(Fallback) + 15(필드) = **24** | ✅ 일치 |
| §45 Missing Approval Chain Policy | 2128-2163 | 22 | 8(Policy) + 14(필드) = **22** | ✅ 일치 |
| **합계(§43 제외)** | — | **146** | **146** | ✅ 일치 |

### 3.2 ★§43 특례 — 행 수가 분모(0)를 초과하는 것이 정상이다
§43 은 **불릿이 0개**다(산문 + `text` 코드블록). 분모 측정기는 불릿/번호목록을 세므로 **0** 을 반환한다. 그러나 **요구는 실재**하므로 규율 §63(§23·§43 특례 항)에 따라 전부 전사했다:
- 코드블록(2073-2082) **8단계** → 8행
- 산문(2084) *"적용 순서는 Versioned Policy로 관리하라"* → 1행
- 산문(2086) *"동일 Scope에 상충하는 Override가 있으면 Conflict를 생성하라"* → 1행
- **합계 10행 > 분모 0** — **이는 정상이며 날조가 아니다.**

★**배정 지시와의 차이(보고)**: 배정 지시·규율 66행은 이 코드블록을 *"**7**단계 순서"* 라 기술했으나, 원문 2074-2081 실측 결과 항목은 **8개**다(Base Chain Version · Tenant Override · Domain Override · Legal Entity·Organization Override · Program·Product·Brand Override · Approved Case-specific Override · Validation · Compilation). 지시가 열거한 항목명 자체는 8개로 원문과 일치하므로 **"7단계"는 개수 표기 오류**로 판단하고, **원문대로 8행** 전사했다(규율 1·3 — 원문이 정본).

§41 은 **번호목록 9항**(불릿 0)이므로 분모 9 가 유효하다. 산문 2건(2003·2005)은 분모 외로 §2 계약(C-2)에 옮겼다.

### 3.3 ★기지 실측 재확인 결과 — 전건 확인, 정정 0
아래 앵커를 정의부 Read 로 재실증했고 **전부 브리핑과 일치**했다:
- `JourneyBuilder:799`(첫 일치 return) · `:809`(`if($hasLabeled) return ''`) · `:811-812`(무라벨 위치 폴백) · `:814`(첫 후보) · 주석 `:801-803` 286차 장애 · `:810` 자인 — **전건 확인**
- `pickWeighted:729` `if ($total <= 0) return (string)($keys[0] ?? 'a');` · `:730` `((($seed*2654435761)+1)%100000)` 결정론 — **확인**
- `Mmm.php:381-382` `if ($override !== null) return $override;`(주석 `:380` "override > 채널 > 전사") · `OrderHub.php:1274`(주석 "①HTTP 일괄 override ②테넌트 admin 설정 ③채널별 정적") · `DataPlatform.php:65`(`source_priority INT NOT NULL DEFAULT 100`),`:184`(`ORDER BY source_type, source_priority DESC`) — **전부 오탐 확정(영속 라우트 오버레이 아님)**
- `TeamPermissions::effectiveScope:258` `if ($st === 'company') return null;` · `:256` `if (!$sc) return null;` · `:246` owner/admin → null — **확인**
- `scopeChannelProduct:319-320` product·brand **둘 다 `$skuCol`** · `:312` 자인 주석 — **확인**
- `Catalog.php:1016` `private const HIGH_VALUE_KRW = 5000000.0;` · `:1103-1105` — **확인**
- `valid_from`/`valid_to`/`effective_to` grep = `Onsite.php:396` `invalid_token` **FP 1건뿐** — **확인**
- `SecurityAudit.php:27` tenant 포함 sha256 · `verify():56-68` — **확인**
- `approval_chain_*`/`missing_approval_chain`/`compiled_artifact`/`structure_hash`/`MULTIPLE_APPLICABLE`/`BLOCK_REQUEST`/`USE_DOMAIN_DEFAULT` grep = **backend/src 전수 0**(`topological` 유일 히트 = `PM/Gantt.php:14`,`:104`,`:153`) — **확인**

★**신규 발견 1건**: `JourneyBuilder::enroll:198` `$startNode = $nodes[0]['id'] ?? 'trigger_1';` — **entry/START 노드를 배열 위치로 채택**한다. §40-8(`MULTIPLE_START_NODE`)·§40-9(`NO_START_NODE`) 는 "탐지되지 않는" 정도가 아니라 **부재가 리터럴 폴백으로 은폐**된다. C-1 의 금지 목록에 추가했다.

### 3.4 🔴🔴 §45 위반이 레포에 살아 있다 (배정 브리핑 재증명 완료)
원문 2160 *"No Match 상태에서 임의의 첫 번째 Chain을 선택하지 마라"* 의 위반이 **마케팅 도메인에 3건** 실재한다:

| 위치 | 코드 | 성격 |
|---|---|---|
| `JourneyBuilder:811-812` | 무라벨 그래프 위치 폴백 | 286차 실장애 원인(주석 `:801-803`) |
| `JourneyBuilder:814` | `return (string)($cand[0]['to'] ?? '')` | 분기 미지정 시 첫 후보 |
| `JourneyBuilder:729` | `if($total<=0) return $keys[0]` | 가중 합 0 → 첫 키 |
| `JourneyBuilder:198` | `$nodes[0]['id'] ?? 'trigger_1'` | START 를 위치로 채택(신규 발견) |

→ **§22 `BLOCK_ON_NO_MATCH` 는 "확립된 의미론"이 아니라 조건부로만 확립**되어 있다. §44-8·§45-6 을 `PARTIAL` 로 판정한 근거다(`REAL`/`VALIDATED_LEGACY` 아님).
⚠️ 본 세션은 전사(ⓒ)이므로 **코드 변경 0**. 위 4건의 수정은 **별도 승인세션**(Golden Rule + verify + 배포승인) 대상이다.

### 3.5 §42 Legal Entity·Organization·Brand 는 선행조건 0%
| 축 | 선행조건 상태 |
|---|---|
| Legal Entity | 🔴 **이름·능력 양쪽 0**. 유일 grep 히트 `MarketingDataHub.php:181` "한국 법인 철수" = **데모 문자열**. `'company'` scope 는 법인이 아니라 **무제한 센티넬**(`TeamPermissions:258` `return null`) — 법인 축으로 오인 금지 |
| Organization | 🔴 `ORGANIZATION_*` **전량 CONTRACT_ONLY**. 5-3-3-1 70편은 **문서상 계약뿐**(ADR 자인 `ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md:163` *"실 코드·테이블 0건"*) — **문서 존재를 구현 존재로 계산하면 역산**(규칙 2) |
| Brand | 🔴 `DATA_SCOPES` 에 `brand` 실재하나 `scopeChannelProduct:319-320` 이 **product·brand 를 동일 `$skuCol` 에 매핑**(`:312` 자인 "브랜드=상품집합") → **brand 는 독립 차원이 아니다**. `BRAND_OVERRIDE` 는 차원 분리가 선결 |
| Program | 축 자체 0 |

→ §42 Override Type 14종 중 **4종이 BLOCKED_PREREQUISITE**(LEGAL_ENTITY·ORGANIZATION·BRAND) — 나머지 ABSENT 와 성격이 다르다. **ABSENT 는 만들면 되지만 BLOCKED_PREREQUISITE 는 만들 대상이 아직 정의되지 않았다.**

### 3.6 §40 Conflict 는 "탐지 실패"가 아니라 "물을 축이 없음"
§40-20 `AUTHORITY_REFERENCE_CONFLICT` 는 특히 주의를 요한다. 권한 축이 **2벌로 분열**되어 있고(`backend/public/index.php:554` `$roleRank` viewer0<connector1<analyst2<admin3 ↔ `team_role` owner>manager>member) **매핑 코드가 전수 0**(50+ 히트 확인 · 역방향도 0)이다. `$roleRank` 의 판정 축은 **HTTP 메서드**(`:568`)이므로 *"무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다*. → Conflict 탐지기를 만들기 전에 **권한 축 통일이 선결**이다. (`acl_permission.approve` 는 `ACTIONS:39` 실재·`normActions:186` 강제·`seedOrg:711` 시드까지 되지만 **판독자 0** = 완전한 장식 — 이것을 Authority Policy 로 승격하려면 판독 경로부터 신설해야 한다.)

### 3.7 저장·이행 수단 부재 (§40·§42·§44·§45 공통)
- `backend/migrations/` = **21파일 · `20260527_172_002` 정지** · approval/chain/route/workflow 마이그레이션 **0**(히트 5건 전량 `menu_tree`)
- 이후 스키마는 핸들러별 `ensureTables` 자가치유가 담당하나 ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다**
- → §40 Conflict·§42 Override·§44 Fallback·§45 Policy 전 엔티티가 **마이그레이션 경로 없이** 신설돼야 한다. 신규 스키마 설계 시 이행 수단을 함께 결정하라. (`Migrate` 이름 겹침 주의 — DDL 적용기이지 도메인 이행기 아님 · `PM/Shared.php:37-53` 도 예외 아님.)

### 3.8 UNVERIFIED / 자진 신고
- 본 문서 판정은 전부 **정적 실측**이다. 운영 서버 로그 미접근(ⓑ #45) — 런타임 override/fallback 유사 동작 존재 가능성은 배제하지 못하나, 이름·정의부 grep 0 이므로 무시할 수준으로 본다.
- §42-40 `Audit`·§42-43 `Separation of Duties Reference` 를 `LEGACY_ADAPTER` 로 판정했다. 두 항목 모두 **Chain Override 도메인에는 0** 이며, 판정 근거는 "동일 요구를 충족하는 추출 가능한 검증된 선례가 타 도메인에 실재"함이다. 보수적으로 `ABSENT` 를 택할 여지도 있으나, 그 경우 후속 세션이 §63 중복 신설로 갈 위험이 커 `LEGACY_ADAPTER` 를 택했다. 실측 file:line 은 표에 명기했다.
- §44-8 `BLOCK_REQUEST`·§45-6 `BLOCK_APPROVAL_CASE` 의 `PARTIAL` 은 `nextNode:809` 가 **라벨 그래프 한정**으로만 차단하는 실측에 근거한다. 무조건 차단이었다면 `VALIDATED_LEGACY` 였을 것이나, `:811-812`·`:814` 폴백 존치로 **cover 아님**.
- §40-13 `SELF_LOOP`·§40-14 `ROUTE_CYCLE` 의 `LEGACY_ADAPTER` 는 "탐지·차단 능력"에 대한 판정이다. §40 이 요구하는 **Conflict 레코드 생성**(필드 30-48)은 별개로 전량 `ABSENT` 다 — 규칙 6(*"중복 없음 ≠ 기능 충족"*) 적용.
