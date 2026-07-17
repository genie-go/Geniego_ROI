# DSAR — Organization Partner Profile (§36)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §36 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `partner_account` DDL | `PartnerPortal.php:52-59` — `id·tenant_id·partner_type·partner_id·partner_name·login_id·password_hash·name·active·last_login·created_at·updated_at` · `UNIQUE KEY uq_partner_login (login_id)` · `KEY idx_partner_tenant` | `PARTIAL` |
| ★**`TYPES`** | `PartnerPortal.php:29` — **`['supplier', 'logistics', 'warehouse']` 3종** | ★§36 과 **교집합 0** |
| 전용 세션 | `partner_session`(`PartnerPortal.php:60-62`) — `token·partner_account_id·tenant_id·expires_at` · **별도 인증 realm** | 실배선 |
| 스코프 필수 검증 | `PartnerPortal.php:95-100` — 주석 *"[257차 보안 하드닝] 스코프 필수 검증 — 빈 스코프 계정은 … 무주(unassigned) 행을 과열람"* → supplier/logistics 는 `partner_name` 필수 422 · warehouse 는 `partner_id` 필수 422 | 실배선(fail-closed) |
| 플랜 한도 | `PartnerPortal.php:104-110` — `$dimMap = ['supplier'=>'suppliers','logistics'=>'logistics','warehouse'=>'warehouses']` → `PlanLimits::exceeded` 초과 시 **402** | 실배선 |
| `partnership_type` / STRATEGIC·RESELLER·… | **grep 0** | `ABSENT` |
| `agency_client_link` | `AgencyPortal.php:64-72` — **크로스테넌트 위임 엣지**(`agency_id ↔ client_tenant_id`·`status`·`scope_json`·`UNIQUE`) | **§43 소관**(§36 아님) |
| `organization_unit`/`legal_entity`/`cost_center`/`profit_center` | **PM 재확인 grep = 0건** | `ABSENT` |
| 계약(contract) 엔티티 | **grep 0** | `ABSENT` |

**★축 주의 1 — `TYPES` 3종 ↔ §36 `PARTNERSHIP_TYPE` 12종의 교집합은 0이다.**
`PartnerPortal::TYPES = ['supplier','logistics','warehouse']`(`:29`) 는 **누가 로그인해서 무엇을 볼 수 있는가**(공급처 포털·물류처 포털·창고처 포털)의 분류다. §36 의 12종(STRATEGIC/RESELLER/DISTRIBUTOR/DEALER/AGENCY/TECHNOLOGY/PAYMENT/LOGISTICS/AUDIT/CONSULTING/JOINT_VENTURE/OTHER)은 **사업 관계의 성격** 분류다. **`LOGISTICS` 만 문자열이 유사하나 의미축이 다르다**(전자=물류처 계정 유형, 후자=물류 제휴 관계). → **`partner_account` 는 외부 party 로그인 계정이지 partnership profile 이 아니다** → `KEEP_SEPARATE_WITH_REASON`.

**★축 주의 2 — `agency_client_link` 는 §36 이 아니라 §43 소관이다.**
`AgencyPortal.php:64-72` 의 위임 엣지는 **크로스테넌트 접근 허가**(동의 기반·N:M·1홉·READ_ONLY effect `:89`→`index.php:92-96`)다. **조직↔조직 엣지가 아니며 소유·포함 관계도 아니다.** §36 근거로 인용하면 **역산**(ⓑ §14).

## 1. 원문 전사 + 판정 — **원문 16종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | partner profile id | 부재 — `partner_account.id`(`PartnerPortal.php:53`)는 **로그인 계정 id**이지 관계 프로필 id 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 2 | organization unit or external party reference | **`organization_unit` 전역 0** · 외부 party 축은 `partner_account.partner_type`+`partner_id`+`partner_name`(`:54-55`)로 **부분 표현**(단 참조 무결성은 문자열 매칭 `:97-100`) | `PARTIAL` |
| 3 | partner id | `partner_account.partner_id INT`(`:54`) **실재** — 단 의미 = **창고 id 또는 거래처 지정값**(`:99-100`), partnership 식별자 아님 | `PARTIAL` |
| 4 | partnership type | ★**`TYPES=['supplier','logistics','warehouse']`(`:29`) ↔ §36 12종 교집합 0** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | tenant relationship | `partner_account.tenant_id`(`:53`) **실재** · 단 테넌트 마스터 테이블 부재(`Db.php:944` FK 없음) → 관계가 아니라 **격리 키** | `PARTIAL` |
| 6 | legal entity relationships | **`legal_entity` 전역 0** | `ABSENT` |
| 7 | joint program references | **program 축 grep 0** | `ABSENT` |
| 8 | contract references | **계약 엔티티 grep 0** | `ABSENT` |
| 9 | operating countries | `Geo` = 국가→**언어**(`Geo.php:23-53`) · 파트너↔국가 링크 0 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | operating regions | `region` 3축 전부 무관 · parent region 0 | `NAME_ONLY` |
| 11 | internal owner organization | 부재 — 내부 소유 조직 축 0 | `ABSENT` |
| 12 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 13 | valid_from | 부재 — `created_at`(`:57`)은 계정 생성시각 · `last_login`(`:57`)도 유효기간 아님 | `ABSENT` |
| 14 | valid_to | **`valid_to`/`effective_to` grep 0** · `partner_session.expires_at`(`:61`)은 **세션 만료**이지 관계 종료 아님 | `ABSENT` |
| 15 | status | `partner_account.active TINYINT(1) DEFAULT 1`(`:56`) — **불리언 활성 플래그**이지 상태 전이 모델 아님 | `PARTIAL` |
| 16 | evidence | 부재 | `ABSENT` |

**실측 개수: 16 / 16 전사.** 커버리지 = `PARTIAL` 4(external party ref·partner id·tenant·status) · `KEEP_SEPARATE_WITH_REASON` 4 · `NAME_ONLY` 1 · `ABSENT` 7. **`VALIDATED_LEGACY` = 0.**

### Partnership Type — **원문 12종**

| # | 원문 값 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | STRATEGIC | grep 0 | `ABSENT` |
| 2 | RESELLER | grep 0 | `ABSENT` |
| 3 | DISTRIBUTOR | grep 0 · ⚠️ `ORG_PRESET`(`TeamPermissions.php:706-722`)에 **"유통/총판영업팀"** 이 있으나 이는 **내부 영업팀 이름**이지 파트너 유형 아님 | `ABSENT` |
| 4 | DEALER | grep 0 | `ABSENT` |
| 5 | AGENCY | grep 0(파트너 유형으로서) · ⚠️ 인접 = `agency_account`/`agency_client_link`(`AgencyPortal.php:56-72`) — **별도 인증 realm + 위임 엣지**(§43 소관) | `KEEP_SEPARATE_WITH_REASON` |
| 6 | TECHNOLOGY | grep 0 | `ABSENT` |
| 7 | PAYMENT | grep 0(파트너 유형으로서) · ⚠️ 인접 = `ChannelRegistry` `group_type` 의 **`pg`**(`:12`,`:79`) — **채널 플랫폼 분류**이지 제휴 관계 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | LOGISTICS | ★**`TYPES` 에 `'logistics'` 존재**(`PartnerPortal.php:29`) — 단 의미 = **물류처 포털 계정 유형**이지 물류 제휴 관계 아님. 문자열만 일치 | `KEEP_SEPARATE_WITH_REASON` |
| 9 | AUDIT | grep 0(파트너 유형으로서) · ⚠️ `audit_log`/`menu_audit_log`/`pm_audit_log` 는 **감사 로그**이지 감사법인 아님(이름 함정) | `ABSENT` |
| 10 | CONSULTING | grep 0 | `ABSENT` |
| 11 | JOINT_VENTURE | grep 0 | `ABSENT` |
| 12 | OTHER | grep 0 | `ABSENT` |

**실측 개수: 12 / 12 전사.** ★**교집합 0** — `TYPES` 의 `supplier`·`warehouse` 는 12종 **어디에도 대응하지 않고**, `logistics` 는 **문자열만 겹친다**.

## 2. 규칙

- 🔴 **`partner_account` 를 Partner Profile 로 확장하지 마라.** 이것은 **외부 party 의 로그인 계정 + 전용 세션 realm**(`PartnerPortal.php:52-62`)이다. `TYPES`(`:29`) 3종과 §36 `PARTNERSHIP_TYPE` 12종은 **교집합 0** — 도메인이 다르다 → `KEEP_SEPARATE_WITH_REASON`. 형태 유사를 커버로 계산 = 규율 9 위반.
- 🔴 **`TYPES`(`PartnerPortal.php:29`)에 §36 의 12종을 추가하지 마라.** `TYPES` 는 **플랜 한도 `$dimMap`**(`:106` — supplier→suppliers/logistics→logistics/warehouse→warehouses)과 **스코프 필수 검증 분기**(`:99-100`)에 **직결**돼 있다. `STRATEGIC` 등을 끼워넣으면 `$dimMap` 미정의 키 → **한도 검사 붕괴** + 빈 스코프 계정 발급 → **257차 하드닝이 막은 무주 행 과열람이 재발**한다.
- **Partner Profile 은 별도 레이어로 신설하고 `partner_account` 를 참조만 하라** — `(tenant_id, partner_type, partner_id)` 로 느슨히 연결. 기존 포털 로그인/세션/한도 경로는 **무변경**(비파괴).
- 🔴 **`agency_client_link`(`AgencyPortal.php:64-72`)를 §36 근거로 인용 금지.** ⓐ **이분(bipartite)** — `agency_account`(`:56-63`)는 테넌트가 아니라 **별도 인증 realm** ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ **조직↔조직 엣지 아님** ⓓ **동의 기반 접근 허가**이지 소유·제휴 관계 아님 → **§43 소관**.
  - 단 **선례 가치는 인정**: `READ_ONLY` effect 실구현(`:89` `['write'=>false,…]` → `index.php:92-96` 403)은 **`data_scope` 에 없는 능력**이며 **매 요청 fail-closed 재검증**(`:414-432`)은 §36 `status`(active/suspended) 설계 시 **참조할 유일한 실 패턴**이다.
- 🔴 **`ORG_PRESET` 의 "유통/총판영업팀"·"파트너 4종"(`TeamPermissions.php:706-722`)을 Partnership Type 으로 계산 금지** — **내부 팀 이름 열거**이며 `team` DDL 에 **`parent_team_id` 조차 없다**(`:145-151`). "구조가 아니라 열거".
- 🔴 **`ChannelRegistry` 의 `pg`(`:12`,`:79`)를 `PAYMENT` 파트너로 계산 금지** — **채널 플랫폼 분류**이고 `channel_registry` 는 **tenant 컬럼조차 없는 전역 카탈로그**(`ChannelRegistry.php:32-49`·주석 `:11`)다.
- 🔴 **`audit_log` 계열을 `AUDIT` 파트너로 계산 금지** — 감사 **로그**이지 감사 **법인**이 아니다.
- **`status` 확장 시 `active`(`:56`) 보존** · **`valid_to` 와 `partner_session.expires_at`(`:61`) 혼동 금지**(세션 만료 ≠ 관계 종료).
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무(`PartnerPortal.php:51` 분기가 그 선례).
- 🔴 7축 + Type 9종 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
