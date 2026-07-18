# DSAR — Supervisory Hierarchy (§9)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §9 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

본 문서는 §9 의 **필수 필드 23개** 축을 전사한다. §9 의 **Hierarchy Type 13종**은 별도 문서 [DSAR_SUPERVISORY_HIERARCHY_TYPE.md](DSAR_SUPERVISORY_HIERARCHY_TYPE.md) 로 분리한다(측정기 §9 합계 36 = 23 + 13).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `SUPERVISORY_HIERARCHY` 엔터티 | **`backend/src` 전역 `hierarchy` grep 0** | `ABSENT` |
| 감독 트리 자체 | `team` 에 **`parent_team_id` 없음**(DDL `TeamPermissions.php:148`/`:168`) → **팀 트리가 없다** | `ABSENT` |
| 유일 실재 트리 | `menu_tree`(`AdminMenu.php`) — **관리자 메뉴 트리** · 🔴**`tenant_id` 없음** | `KEEP_SEPARATE_WITH_REASON` |
| 유사 계층 포인터 | `app_user.parent_user_id`(`UserAuth.php:156-167`) = **테넌트 소속 포인터** · owner 직속 2단 봉인 · 순회 = **단일 홉**(`resolveTenantId:200-217`) | `KEEP_SEPARATE_WITH_REASON` |
| 그래프 스토어 | `graph_node`/`graph_edge`(`Db.php:816-839`) **실재** | `KEEP_SEPARATE_WITH_REASON` |

**★대전제(ⓑ 실측)** — Manager Relationship 축이 레포에 **존재한 적이 없다**: `manager_id`·`reports_to`·`supervisor_id`·`department_head_id` **각 0** · **git 삭제 이력도 0** → **팬텀도 유물도 아니다.**

**★규칙 10 주의** — 현행에 감독 계층이 "1개"이거나 "단순"한 것이 **정합의 증거가 아니다.** 계층을 **여러 개 표현할 수단 자체가 없다**(루트도 타입도 버전도 스키마에 없음).

**★규칙 9 주의** — `graph_node`/`graph_edge` 는 **스키마 쌍둥이**다. 신설 시 **두 번째 그래프 스토어 = 헌법 위반**. 그러나 재사용도 즉시 불가 — **`GraphScore.php:57-59` 화이트리스트 `['influencer','creative','sku','order']` 가 422 로 조직/Subject 노드 저장을 차단**한다(게이트 사실). ⚠️`graph_node` **인덱스·UNIQUE 0**(`Db.php:816-824` = id PK 뿐) · 내부 생산자 0 → **VACUOUS 미배제.**

### ★`maximum depth` 선례 — **두 상수의 성격이 다르다(오판 금지)**

| 코드 | 실측 | 성격 |
|---|---|---|
| `AdminMenu::wouldCycle` **`:545` `$depth < 100`** | **단일 부모 조상 체인 상향 순회**(`:547` `SELECT parent_id`) · 1회전 = 1홉 | ✅ **진짜 깊이 캡** — 단 **하드코딩 리터럴**이며 **저장된 필드가 아니다** · 🔴`:547` 질의에 **`tenant_id` 술어 없음** · **`$visited` 없음** |
| `Dependencies::validateDependency` **`:84` `$depth < 10000`** | `:85` `array_pop` **매 pop 마다 `:97` `$depth++`** | 🔴 **깊이 캡이 아니라 방문 노드 예산** — §9 `maximum depth` 선례로 계산하면 **오판** |

## 1. 원문 전사 + 판정 — **원문 23종**(필수 필드)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | supervisory_hierarchy_id | 엔터티 부재(`hierarchy` grep 0) | `ABSENT` |
| 2 | reporting_line_definition_id | Reporting Line 도메인 전역 0 · `rebate` 전역 0 | `ABSENT` |
| 3 | tenant_id | 엔터티 부재 → 필드 부재. **패턴 선례는 REAL**: `pm_audit_log.tenant_id NOT NULL`(migration `20260526_168_008:7`) | `ABSENT`(패턴 = `LEGACY_ADAPTER`) |
| 4 | hierarchy_code | 부재 | `ABSENT` |
| 5 | hierarchy_name | 부재 | `ABSENT` |
| 6 | hierarchy type | 부재 → [DSAR_SUPERVISORY_HIERARCHY_TYPE.md](DSAR_SUPERVISORY_HIERARCHY_TYPE.md) | `ABSENT` |
| 7 | root subject or position reference | **Position 개념 0** · 🔴트랩 `position_idx` = **PM 태스크 정렬순서** · 🔴트랩 DSAR "Data Subject" = **고객**(직원 아님) | `ABSENT` |
| 8 | root organization reference | `ORGANIZATION_*` **backend 전역 grep 0** · §3.1 = **18/18 `CONTRACT_ONLY`**(문서만) | `CONTRACT_ONLY` |
| 9 | legal entity scope | `legal_entity` **grep 0** · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · FK·감독관계 전무 | `ABSENT` |
| 10 | workspace scope | 스코프 축 부재 · 인접 `data_scope` **`UNIQUE(tenant_id,subject_type,subject_id)`(`TeamPermissions.php:164`) = 단일행이 스키마로 강제**(규칙 10) | `ABSENT` |
| 11 | country scope | 🔴트랩 `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축 전부 무관 · `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 12 | environment scope | 🔴트랩 `Db::envLabel()` = **게이트가 아니다** — **코드가 스스로 금지**(`Db.php:51-54`) | `ABSENT` |
| 13 | position based 여부 | 🔴**최우선 오염원** — `position_based`(`AttributionEngine.php:32`·`:1324`·`:1405-1422`) = **U자형 기여도 배분 모델**. §9 로 계산하면 심각한 오판 | `ABSENT` |
| 14 | subject based 여부 | 부재 · 직원 아이덴티티 = `app_user` 뿐 · **병합/정규화 계층 0**(union-find 는 **고객 전용** `CRM.php:597-643`) | `ABSENT` |
| 15 | matrix enabled 여부 | 🔴트랩 `matrix` 히트 전부 무관 — `Rollup::productChannelMatrix:378`(SKU×채널 순이익) · `Mmm::buildControlMatrix:476`(계절성 통제행렬) | `ABSENT` |
| 16 | multiple roots allowed 여부 | 부재. ★**규칙 10** — 단일 루트를 강제해서 1개가 아니라 **루트 개념이 없어서** 0 | `ABSENT` |
| 17 | maximum depth | **설정 가능한 필드 = 부재.** 선례 = `AdminMenu::wouldCycle:545` **하드코딩 100**(테넌트 술어·`$visited` 없음) · 🔴`Dependencies:84` **10000 은 노드 예산**(깊이 아님) | `ABSENT`(알고리즘 = `LEGACY_ADAPTER`) |
| 18 | owner | `pm_projects.owner_user_id` — 🔴**4결격**: ①**`WHERE owner_user_id` grep 0 = 판독 술어 0**(저장된 라벨) ②무검증 자유문자열(`Projects.php:112-117`) ③기본값이 생성자(`:66`)→미설정 행과 구분 불가 ④단일값 | `PARTIAL` |
| 19 | active version | 부재 → [DSAR_SUPERVISORY_HIERARCHY_VERSION.md](DSAR_SUPERVISORY_HIERARCHY_VERSION.md) · 🔴`menu_defaults.version` = **유일 생산자 `AdminMenu.php:309` 이 리터럴 `'baseline'` 고정 = 버전이 아니라 라벨** | `ABSENT` |
| 20 | valid_from | **`valid_from` grep 0** · 인접 `kr_fee_rule.effective_from`(`Db.php:898`) = **컬럼 有·질의 無**(`WHERE effective_from <= :as_of` 전역 0) | `ABSENT` |
| 21 | valid_to | **`valid_to`/`effective_to` grep 0** | `ABSENT` |
| 22 | status | 부재. 🔴트랩 **`is_active` = 계정 상태이지 고용/계층 상태가 아니다**(base DDL `Db.php:1106` · 소비처 전부 인증 게이트) · **`NOT NULL DEFAULT 1` → 미지가 자동 "가용" = fail-open** | `ABSENT` |
| 23 | evidence | 감사 선례는 있으나 계층 축 부재 — `menu_audit_log.hash_chain`(`AdminMenu.php:128` · 🔴 쓰기 체인만 실재 · `verify()` 0 · preimage ts(`:195`) 소실 → tamper-evident 아님 · 검증형 정본 = `SecurityAudit::verify():56-68`) · `pm_audit_log`(`…168_008:7`) | `ABSENT`(선례 = `LEGACY_ADAPTER`) |

**실측 개수: 23 / 23 전사.** 측정기 §9 합계 **36** = 본 문서 **23** + Hierarchy Type **13**(별도 문서) — **불일치 없음.**
★원문이 `evidence` 로 **끝난다**(`:610`) → 규칙 4 에 따라 전사에 포함(추가 아님).

## 2. 규칙

1. 🔴 **`menu_tree` 스키마 복제 금지.** `tenant_id` 가 없고 `wouldCycle:540-555` 에 `$visited` 가 없다. **깊이 캡 알고리즘만 이식하고, 질의에 `WHERE tenant_id=?` 를 필수화**하라.
2. 🔴 **`maximum depth` 를 `Dependencies:84`(10000)에서 이식 금지** — 그것은 **방문 노드 예산**이다. 두 상수를 같은 축으로 계산하면 §9 요구가 정의상 충족된 것처럼 위장된다.
3. 🔴 **`maximum depth` 는 저장 필드다.** 하드코딩 리터럴(100)로 대체하면 5-3-3-1 D-13(`menu_defaults.version = 리터럴 'baseline'`)·`Mapping.php:210`(`required_approvals` 리터럴 `2`)과 **동형 결함** — "컬럼이 있다 → 모델이 있다"는 규칙 7 위반.
4. 🔴 **두 번째 그래프 스토어 신설 금지**(`graph_node`/`graph_edge` 존재). 단 재사용은 `GraphScore.php:57-59` 화이트리스트 422 게이트 해소가 선결이며, **`graph_node` 인덱스·UNIQUE 0 · 생산자 0(VACUOUS 미배제)** 을 근거로 **`KEEP_SEPARATE_WITH_REASON` 을 택할 경우 그 사유를 "다른 도메인"이 아니라 게이트 사실로 적어라.**
5. 🔴 **`app_user.parent_user_id` 3단 확장 금지(선결 조건 없이).** `resolveTenantId:200-217` 이 **단일 홉**을 가정한다 → 3단 허용 시 **286차 platform_growth 하이재킹과 동형 사고**. 일반화가 선결.
6. 🔴 **이름 함정 4종을 커버로 계산 금지**: `position_based`(U자형 기여도) · `matrix`(SKU×채널·MMM 통제행렬) · `Geo.region`(언어/광고/WMS 시·도) · `envLabel`(코드가 스스로 금지).
7. **`root organization reference` 는 §3.1 Canonical 선언에 종속**한다. 문서 70편은 **`CONTRACT_ONLY`** 이며 **문서 존재를 구현 존재로 계산하면 역산**이다(ADR §2 자인).
8. **`valid_from`/`valid_to` 신설 시 질의 계층을 함께 만들어라.** `kr_fee_rule.effective_from` 은 **컬럼만 있고 읽기 4개소 전부 최신승**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) — **컬럼 추가만으로는 §9 가 닫히지 않는다.**
9. **`status` 를 `is_active` 로 대체 금지.** 2값(1/0)이라 **`UNKNOWN` 조차 표현 불가**이며 기본값이 fail-open 이다.
