# DSAR — Organization Lifecycle Event (§47)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §47 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_LIFECYCLE_EVENT` | **grep 0** · `lifecycle_event`·`reparent`·`org_merge`·`org_split` **backend/src grep 0**(PM 재검증) | `ABSENT` |
| ★**최근접 선례 = `agency_client_link`** | **상태전이 컬럼별 타임스탬프** — `status`(pending/approved/revoked) + `invited_at`/`approved_at`/`revoked_at`(`AgencyPortal.php:64-71` MySQL · `:80` SQLite) | `PARTIAL` |
| 🔴 **그러나 이벤트 테이블이 아니다** | **전이 이력 누적 불가 · 덮어쓰기** — 하드 증거 아래 | **결정적 한계** |
| 이벤트 소싱 | 도메인 이벤트 스트림 개념 **전무** | `ABSENT` |
| 인접 로그 자산 | `menu_audit_log`(hash_chain `AdminMenu.php:128`) · `pm_audit_log`(diff_json, migration `20260526_168_008`) · `journey_node_logs`(**tenant_id 보유** `JourneyBuilder.php:69` · 조회 술어 실배선 `:248`) | `LEGACY_ADAPTER` |
| Version 축 | **엔티티 version = `menu_defaults.version` 단 1건**(`AdminMenu.php:120`) · **optimistic lock grep 0** | `ABSENT` |

### ★`agency_client_link` 의 결정적 한계 — **PM 직접 확인한 하드 증거**

ⓑ 는 *"이벤트 테이블 아님 — 전이 이력 누적 불가·덮어쓰기"* 라 했다. **정의부 실독으로 이보다 강한 증거를 확보했다**:

```
AgencyPortal.php:304  UPDATE agency_client_link SET status='pending', invited_at=?, revoked_at=NULL, updated_at=? WHERE id=?   (재초대)
AgencyPortal.php:381  UPDATE agency_client_link SET status='approved', scope_json=?, approved_at=?, revoked_at=NULL, … WHERE id=?  (승인)
AgencyPortal.php:400  UPDATE agency_client_link SET status='revoked', revoked_at=?, updated_at=? WHERE id=?  (해지)
```

★**`:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 명시적으로 지운다.** → **해지 → 재초대 → 승인 사이클을 돌면 "이 대행사가 과거에 해지된 적이 있다"는 사실이 물리적으로 소멸한다.** 행당 상태 슬롯이 **1개씩**뿐이므로 **N회 전이 중 마지막 1회만 남는다.**

→ **§47 이 요구하는 것과 정확히 반대**: §47 은 `previous version`/`new version` 을 가진 **불변 이벤트 누적**이고, 현행은 **현재 상태 1행 덮어쓰기**다. 🔴 **"타임스탬프가 3개나 있으니 이력 선례"로 계산하면 역산이다**(규율 9 — 능력 존재 ≠ 요구 충족).

### ⚠️ `agency_client_link` 인용 시 추가 금지선 (ⓑ §14)

ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ **조직↔조직 엣지 아님** ⓓ **동의 기반 접근 허가**이지 소유·포함 관계 아님. → **§21 근거로 쓰면 역산.** **§47 에서는 "상태전이 타임스탬프 패턴" 선례로만 인용한다.**

## 1. 원문 전사 + 판정 — Lifecycle Event **원문 21종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ORGANIZATION_CREATED | 인접 = `seedOrg`(`TeamPermissions.php:725-753`) `team` 행 생성 + **감사 기록**(`:747`) — 조직 이벤트 아님(팀 생성) | `LEGACY_ADAPTER` |
| 2 | ORGANIZATION_ACTIVATED | 인접 = `team.status`(`TeamPermissions.php:145-151`) — **상태 컬럼 덮어쓰기 · 이벤트 아님** | `PARTIAL` |
| 3 | ORGANIZATION_RENAMED | `team.name` UPDATE = **이전 이름 소실** · rename 이벤트 grep 0 | `ABSENT` |
| 4 | ORGANIZATION_REPARENTED | ★**부모 컬럼 자체가 없다** — `team` DDL 에 `parent_team_id` **없음** · `reparent` grep 0. ⚠️인접 = `menu_tree` 이동(`AdminMenu.php:487-503`, `wouldCycle:540-555` 검사 후 UPDATE) — **전역 단일 트리(tenant_id 없음 `:108-117`) · 조직 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | ORGANIZATION_TRANSFERRED | 부재 | `ABSENT` |
| 6 | ORGANIZATION_MERGED | 부재. 🔴`crm_identity_merge_link`(`CRM.php:708-712`) **인용 금지** — union-find 등가류(ⓑ §19) | `ABSENT` |
| 7 | ORGANIZATION_SPLIT | 부재 | `ABSENT` |
| 8 | ORGANIZATION_SUSPENDED | 인접 = `agency_client_link.status='revoked'`(`AgencyPortal.php:400`) · `team.status` — **덮어쓰기** | `PARTIAL` |
| 9 | ORGANIZATION_RESTORED | ★인접 = `AgencyPortal.php:304` 재초대(`revoked_at=NULL`) — **복원이 이전 해지 증적을 파괴** | `PARTIAL`(파괴적) |
| 10 | ORGANIZATION_RETIRED | 부재(조직) · `team.status` 로 근사 가능하나 은퇴 이벤트 없음 | `ABSENT` |
| 11 | ORGANIZATION_ARCHIVED | 부재 | `ABSENT` |
| 12 | LEGAL_ENTITY_CHANGED | 법인 엔티티 부재 — `biz_no`/`brn`/`corp_reg`/`tax_id` **0건** · 사업자정보 = `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| 13 | REGION_CHANGED | `region` **3축 전부 비조직**(광고 인구통계 `Db.php:681`,`690` / Amazon Ads na·eu·fe `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA` grep 0 · parent region 0 | `KEEP_SEPARATE_WITH_REASON` |
| 14 | COUNTRY_CHANGED | `Geo` = IP→ISO alpha-2 → **언어** 매핑(`Geo.php:23-53`) · **Country→Region 매핑 코드 0건** | `KEEP_SEPARATE_WITH_REASON` |
| 15 | OWNER_CHANGED | 인접 = `team.manager_user_id` UPDATE(`TeamPermissions.php:145-151`) — **덮어쓰기 · 이전 소유자 소실** | `PARTIAL` |
| 16 | COST_CENTER_CHANGED | `cost_center` **grep 0** | `ABSENT` |
| 17 | PROFIT_CENTER_CHANGED | `profit_center` **grep 0** | `ABSENT` |
| 18 | MATRIX_RELATION_CREATED | `matrix_` **grep 0** · 매트릭스 조직 개념 전무 | `ABSENT` |
| 19 | MATRIX_RELATION_ENDED | 부재 | `ABSENT` |
| 20 | MEMBERSHIP_CHANGED | ★인접 = `app_user.parent_user_id`(`UserAuth.php:156-167`) 변경 · 팀원 추가(`:1226-1227`) — **UPDATE 덮어쓰기 · 이벤트 없음** · ⚠️**용도는 owner→member tenant 상속이지 보고선 아님** | `PARTIAL` |
| 21 | CORRECTION_RECORDED | 부재 — 정정 개념 전무(§46) | `ABSENT` |

**실측 개수: 21 / 21 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 6 · `LEGACY_ADAPTER` 1 · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 11.

## 1-2. 원문 전사 + 판정 — 필수 필드 **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | lifecycle event id | 부재 — **이벤트가 엔티티가 아님**(상태 컬럼 덮어쓰기) | `ABSENT` |
| 2 | organization unit | 조직 엔티티 부재(`org_unit` grep 0) | `ABSENT` |
| 3 | event type | 부재 · 인접 = `menu_audit_log.action VARCHAR(32)`(`AdminMenu.php:125`) · `pm_audit_log.entity_type` **MySQL ENUM**(`PM/Enterprise.php:65-67` 주석 — **ENUM 제한값이라 신규 엔터티 추가 시 INSERT 예외**) | `LEGACY_ADAPTER` |
| 4 | previous version | ★**부재 — 엔티티 version 이 `menu_defaults.version` 단 1건**이고 그마저 리터럴 `'baseline'` 고정(`AdminMenu.php:308`) | `ABSENT` |
| 5 | new version | 부재 — 동일 | `ABSENT` |
| 6 | effective date | `kr_fee_rule.effective_from`(`Db.php:898`) **유일** · **as-of 술어 0건** · 조직 도메인 아님(§44) | `KEEP_SEPARATE_WITH_REASON` |
| 7 | recorded date | 인접 = `menu_audit_log.created_at`(`AdminMenu.php:129`) · `agency_client_link` 전이 타임스탬프(`:68-69`) — **기록 시각 자체는 존재** | `PARTIAL` |
| 8 | actor | ★인접 = `menu_audit_log.changed_by`+`changed_by_role`(`AdminMenu.php:126`) · `pm_audit_log` actor(`PM/Enterprise.php:365` `safeAudit` actor_user_id/actor_api_key) — **행위자 기록 선례 양호** | `LEGACY_ADAPTER` |
| 9 | source | 부재 — 변경 원천 축 없음 · **ERP/HRIS 커넥터 0**(`ChannelRegistry.php:12`,`:79` `group_type` 열거에 `erp`·`finance`·`hr` 없음) | `ABSENT` |
| 10 | reason | 인접 = `menu_audit_log.reason TEXT`(`AdminMenu.php:127`) — **선례 존재**(단 강제성 미확인) | `LEGACY_ADAPTER` |
| 11 | approval reference | 부재 — 승인 엔티티 부재(5-3-2 확정) | `ABSENT` |
| 12 | affected objects | 부재 — 영향분석 축 전무 | `ABSENT` |
| 13 | status | 부재(이벤트 상태) · `agency_client_link.status`(`AgencyPortal.php:67`)는 **링크의 현재 상태**이지 이벤트 상태 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 14 | evidence | 부재 · ⚠️인접 = `menu_audit_log` 의 `ip_address`/`user_agent`/`request_id`(`AdminMenu.php:127-128`) = **증적 필드군 선례**(단 원문 `evidence` 의미와 동일성 미확인) | `PARTIAL` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 3 · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 3 · `ABSENT` 5.

## 2. 규칙

- ★**§47 판정 = `PARTIAL`.** 근거: **이벤트 타입 21종은 전무**하나 **이벤트 로그의 구성요소(actor·reason·recorded date·hash chain)는 실선례가 있다**(`menu_audit_log`). ⚠️ 단 `hash_chain` 은 **쓰기 체인만 실재** — `verify()` 0 · preimage ts(`AdminMenu.php:195`) 소실로 **tamper-evident 는 아니다**(검증형 정본 = `SecurityAudit::verify():56-68`). 🔴 **"감사로그가 있으니 라이프사이클 커버"로 밀면 역산** — 감사로그는 **부수 기록**이고 §47 이벤트는 **조직 상태의 정본(SoT)** 이다. **역할이 다르다.**
- 🔴 **★`agency_client_link` 를 이력 모델 선례로 삼지 마라.** `:304`·`:381` 의 **`revoked_at=NULL`** 이 결정적 증거다 — **상태 슬롯 덮어쓰기 = 전이 이력 소멸**. **인용은 "상태전이 타임스탬프 패턴이 존재한다"까지만.**
- ★**신설은 이벤트 테이블(append-only)로.** 컬럼 슬롯(`approved_at`/`revoked_at`) 방식은 **N회 전이를 표현할 수 없다** — 21종 × 반복 발생이 전제인 §47 에는 **구조적으로 부적합**. **1행 = 1이벤트 · UPDATE 금지 · DELETE 금지.**
- ★**감사 패턴은 `menu_audit_log` 확장**(ⓑ §8): `action`·`changed_by`·`changed_by_role`·`reason`·`ip_address`·`user_agent`·`request_id`·**`hash_chain CHAR(64)`**(`AdminMenu.php:123-131`). 🔴 **전역 `audit_log`(`Db.php:540-545`, 4컬럼·tenant 없음·해시체인 없음) 확장 금지** — **테넌트 격리 위반**(헌법 절대).
  - ⚠️ **단 `menu_audit_log` 도 그대로 복제하면 안 된다** — **`tenant_id` 컬럼이 없다**(`AdminMenu.php:123-131` 전 컬럼 확인 · 전역 단일 메뉴 트리 전용이라 불필요했음). **조직 이벤트는 `tenant_id` 필수 추가.** 스키마 선례 최적 = **`journey_node_logs`**(`JourneyBuilder.php:69` tenant_id 보유 + 조회 술어 실배선 `:248`) — **단 마케팅 도메인이므로 커버 계산 금지 · 스키마 형태만 인용.**
- 🔴 **`pm_audit_log.entity_type` 의 MySQL ENUM 트랩을 반복하지 마라.** `PM/Enterprise.php:65-67` 이 자인한다: *"pm_audit_log.entity_type 는 MySQL ENUM(제한값)이라 신규 엔터티 기록 시 enum 위반→INSERT 예외"* → 168차 이후 값 추가 ALTER 로 땜질. **§47 은 이벤트 타입이 21종이고 증설이 전제**이므로 **ENUM 금지 · `VARCHAR` + 애플리케이션 검증**.
- ★**`previous version`/`new version` 은 §44·§48 선행 의존.** Version 축이 순수 신규(`menu_defaults.version` 1건 · 리터럴 고정)이므로 **§47 단독 착수 불가.** **의존 순서 = §44(Effective Period) → §48(Snapshot/Version) → §47(Lifecycle Event).**
- 🔴 **`ORGANIZATION_MERGED` 에 `crm_identity_merge_link` 인용 금지**(union-find 등가류 · ⓑ §19 최대 함정). 🔴 **`REGION_CHANGED`/`COUNTRY_CHANGED` 에 `region` 3축·`Geo` 인용 금지**(전부 비조직).
- **스키마 도입 = `ensureTables` 경로 + MySQL/SQLite 양 방언 동시 작성**(ⓑ §20 제약 1·3).
