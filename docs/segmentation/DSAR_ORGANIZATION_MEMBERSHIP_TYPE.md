# DSAR — Organization Membership Type (§42)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §42 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `membership_type` 컬럼/enum | **backend/src grep 0** — 멤버십 타입 축 자체가 없다 | `NOT_APPLICABLE`(부재 → 신설) |
| 소속의 실체 | `app_user.team_id INTEGER NULL`(`UserAuth.php:178`) **컬럼 1개** — 타입을 붙일 자리가 없다 | `KV_ONLY`(§42 본문) |
| `PartnerPortal::TYPES` 3종 | `['supplier','logistics','warehouse']`(`PartnerPortal.php:29`) — **외부 party 로그인 계정 타입** | `KEEP_SEPARATE_WITH_REASON` |
| `TEAM_TYPES` 17종 | `TeamPermissions.php:44-49` — **팀 종류**(파트너 4종 포함) · 평면 문자열 | `KEEP_SEPARATE_WITH_REASON` |
| `team_role` 3종 | `owner`>`manager`>`member`(`TeamPermissions.php:17`) — **등급** | `KEEP_SEPARATE_WITH_REASON` |
| 고용/HR 축 | `hris`·`workday`·`payroll`·`contractor` **backend/src 전역 0 또는 무관** | `NOT_APPLICABLE` |
| ERP/HR 커넥터 | **0** — `ChannelRegistry.php:12`·`:79` `group_type` = sales/marketing/logistics/pg/messaging · `sync_kind` = commerce/ad/messaging/none + analytics(`:112`)·cs(`:116`)·esp(`:121`)·review(`:125`). **`erp`·`finance`·`hr` 값이 열거에 없다** | `NOT_APPLICABLE` |

**★축 주의 1 — `PartnerPortal::TYPES` ↔ 원문 12종 교집합 0.** `['supplier','logistics','warehouse']`(`:29`)는 **외부 party 의 로그인 계정 종류**(전용세션 `:60` · 스코프 필수검증 `:97-100` · 플랜한도 `:104-110`)다. 원문의 `PARTNER`/`VENDOR` 는 **사람 Subject 의 조직 소속 형태**다. **주체가 다르다**(계정 realm vs 사람) → 매핑은 역산.

**★축 주의 2 — `TEAM_TYPES` 의 파트너 4종은 팀 종류다.** `partner_agency`·`partner_live`·`partner_supplier`·`partner_distribution`(`:48`) = **팀이 무엇을 하는 팀인가**. 원문 `PARTNER` = **이 사람이 어떤 자격으로 소속되었는가**. **조직단위 속성 ↔ 멤버십 속성**은 다른 축이다.

**★축 주의 3 — ERP/HRIS 부재는 이름이 아니라 능력으로 증명된다.** 헌법 Vol2(`docs/DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md:71`)가 ERP 를 12분류로 **정의하나 이름만 있고 커넥터·수집·정규화 어느 층도 없다.** `ChannelRegistry` 의 `group_type`/`sync_kind` **열거에 `erp`·`hr` 값이 존재하지 않는다** = 구조적 부재. `backend/migrations/` 전량 grep 0 · git log 전 이력 히트는 **289차 스펙 문서 자신뿐**. → `EMPLOYEE`/`CONTRACTOR`/`CONSULTANT` 를 채울 **권위 소스가 없다**.

**★축 주의 4 — `SYSTEM_OWNER` 를 `roleRank` 의 `connector`(`index.php:554`)로 매핑하지 마라.** `connector` 는 **기계 신원의 API 등급**(ingest 쓰기 허용 `:571-574` · 주체가 사람이 아니라 **키** · 판정 축이 **HTTP 메서드** `:568`)이다. 원문 `SYSTEM_OWNER` 는 **조직 멤버십 타입**이다.

## 1. 원문 전사 + 판정 — **원문 12종**(Membership Type)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | EMPLOYEE | 부재 — 고용형태 축 grep 0 · HRIS 커넥터 0(`ChannelRegistry` 열거에 `hr` 없음). `app_user` 행 존재 ≠ 고용 관계 | `NOT_APPLICABLE` |
| 2 | CONTRACTOR | 부재 — `contractor` **backend/src 0** | `NOT_APPLICABLE` |
| 3 | CONSULTANT | 부재 — grep 0 | `NOT_APPLICABLE` |
| 4 | PARTNER | 부재(멤버십 타입으로서) — 인접 `TEAM_TYPES` 파트너 4종(`:48`)은 **팀 종류** · `partner_account`(`PartnerPortal.php:52-59`)는 **외부 로그인 realm** · `DATA_SCOPES` 의 `partner`(`:41`)는 **필터 차원** | `KEEP_SEPARATE_WITH_REASON` |
| 5 | VENDOR | 부재(멤버십 타입으로서) — 인접 `wms_suppliers`(`Wms.php:105` · SSOT 선언 `SupplyChain.php:243` · `sc_suppliers.wms_id` 링크 `:88`)는 **외부 거래처 마스터**(tenant_id·name·contact·active) · **평면·parent 없음** · 사람 소속 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 6 | TEMPORARY | 부재 — 임시 소속 축 grep 0. **유효기간 컬럼 자체가 없어**(`valid_to` grep 0) 임시성을 표현할 수단이 없다 | `NOT_APPLICABLE` |
| 7 | PROJECT_MEMBER | 부재 — 인접 `PM` 도메인(`pm_task_dependencies` 등 8테이블)에 **프로젝트 멤버십 축 없음** · `DATA_SCOPES` 의 `campaign`(`:41`)은 필터 차원 | `NOT_APPLICABLE` |
| 8 | COMMITTEE_MEMBER_REFERENCE | 부재 — committee 엔티티 grep 0. **`_REFERENCE` 접미 = 참조 유형**(해당 정의를 참조만 하고 중복 정의 금지) | `NOT_APPLICABLE` |
| 9 | SHARED_SERVICE_MEMBER | 부재 — `SHARED_SERVICE` 축 grep 0(§40 Matrix Relationship 과 짝) | `NOT_APPLICABLE` |
| 10 | EXTERNAL_AUDITOR | 부재 — 외부 감사자 축 grep 0. 인접 = **`agency_client_link` 의 `READ_ONLY` 위임**(`AgencyPortal.php:89` `write=false` → `index.php:92-96` 403) = **읽기전용 외부 접근의 유일 실 선례**(단 별도 인증 realm · 멤버십 아님) | `LEGACY_ADAPTER` |
| 11 | SYSTEM_OWNER | 부재 — `roleRank` 의 `connector`(`index.php:554`)는 **기계 신원 API 등급**(주체=키 · 판정축=HTTP 메서드 `:568`)이지 멤버십 타입 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | CUSTOM | 부재 — 확장 슬롯. 인접 관례 = `team_type VARCHAR(48) DEFAULT 'custom'`(`:147` · `TEAM_TYPES` 말미 `:48`) | `LEGACY_ADAPTER`(패턴 선례) |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 7 · `KEEP_SEPARATE_WITH_REASON` 3 · `LEGACY_ADAPTER` 2.

**종합 판정: `NOT_APPLICABLE`(부재 → 신설).** 12종 중 **실 대응 0** — 소속 자체가 컬럼 1개(`KV_ONLY`)이므로 타입 축이 **붙을 자리조차 없다**.

## 2. 규칙

- 🔴 **`PartnerPortal::TYPES` 3종·`TEAM_TYPES` 파트너 4종을 `PARTNER`/`VENDOR` 에 매핑 금지.** 전자는 **외부 party 계정 realm**·후자는 **팀 종류**이며, 원문은 **사람 Subject 의 소속 자격**이다. **교집합 0**(281차 확정) — 매핑은 역산이다.
- 🔴 **`wms_suppliers`/`sc_suppliers` 를 `VENDOR` 멤버십으로 계산 금지.** 외부 거래처 마스터(평면·parent 없음)이며 **사람 소속이 아니다.**
- 🔴 **ERP/HRIS 커넥터를 "곧 붙일 것"으로 가정하고 `EMPLOYEE`/`CONTRACTOR` 를 배선하지 마라.** `ChannelRegistry` `group_type`/`sync_kind` **열거에 `erp`·`hr` 값이 없다** = 인입 경로 구조적 부재. **"있다고 가정하고 배선" 금지**(규율 7).
- **타입은 멤버십 **행**의 속성이다 — `app_user` 컬럼으로 내리지 마라.** 한 사람이 `EMPLOYEE`(본직)+`PROJECT_MEMBER`(겸직)를 **동시에** 가질 수 있다. `app_user.team_id`(컬럼 1개 = 최대 1소속)로는 표현 불가 → §42 본문의 **별도 멤버십 테이블** 위에서만 성립한다.
- **`EXTERNAL_AUDITOR` 설계 시 `READ_ONLY` 실 선례를 재사용하라.** `agency_client_link` 의 `defaultScope():89` `['write'=>false]` → `index.php:92-96` 쓰기 403 = **레포 유일의 effect 실구현**. 🔴 단 **두 번째 위임 모델을 만들지 마라**(§43 참조) — 그리고 **`agency_client_link` 를 멤버십으로 계산하지도 마라**(별도 인증 realm · N:M 동의 기반 접근 허가).
- **타입 카탈로그는 `public const <NAME> = [...]` 평면 배열 관례**(`DATA_SCOPES:41`·`TEAM_TYPES:44-49`·`PartnerPortal::TYPES:29`). DB CHECK 제약 금지(MySQL/SQLite 양방언 이식성).
- **`_REFERENCE` 접미(`COMMITTEE_MEMBER_REFERENCE`)는 참조 유형** — 해당 정의를 **참조만 하고 중복 정의 금지**.
- ⚠️ **12종 전부 부재이나 삭제된 조직 코드 0** — `git log --all -S "org_unit"` **0** · 팬텀도 유물도 아닌 **순수 미도입**이다.
