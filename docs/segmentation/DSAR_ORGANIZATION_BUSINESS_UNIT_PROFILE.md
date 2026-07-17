# DSAR — Business Unit Profile (§25)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §25 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_BUSINESS_UNIT_PROFILE` | **grep 0** | `ABSENT` |
| `business_unit` 문자열 | **유일 히트 = Trustpilot 리뷰 API 자격증명 `business_unit_id`** — `ChannelSync.php:2573`(주석 "Trustpilot Business API — 비즈니스 유닛 리뷰")·`:2576-2577`(creds 추출·공백검사)·`:2580`(api_error) · 등록 `ChannelRegistry.php:126`(`review` group·필드 `business_unit_id`, required=false) | **무관** |
| 조직 단위 엔티티 | `organization`/`org_unit`/`business_unit`(조직) **backend/src 전역 0** · `git log --all -S "org_unit"` **0** | `ABSENT`(이름·능력 양쪽) |
| cost center / profit center | `cost_center`·`profit_center` **전역 0** | `ABSENT` |
| legal entity | `legal_entity` **전역 0** · 사업자정보는 `app_user` 프로필 **평문 필드**(`UserAuth.php:499` `business_number`·`ceo_name`·`country`) — 법인 엔티티 아님 | `ABSENT` |

**★축 주의 — 이름 일치 ≠ 도메인 일치.** `business_unit_id` 는 **Trustpilot 리뷰 사이트의 리뷰 대상 식별자**(외부 SaaS 자격증명 KV 값)이지 사내 조직 단위가 아니다. 이름이 정확히 일치한다는 이유로 §25 커버로 계산하면 **갭이 정의상 소멸하는 역산**이다 → `ABSENT` 를 유지한다.

**★능력축 부재증명(규율 8).** 이름뿐 아니라 능력도 없다: BU 가 존재하려면 ⓐ 단위 엔티티 테이블 ⓑ 하위 조직으로의 부모-자식 간선 ⓒ 법인/지역/국가/브랜드 바인딩 중 최소 하나가 필요하나 **셋 다 0**이다. 레포 유일 부모-자식 간선은 `app_user.parent_user_id`(`UserAuth.php:156-167`)이며 이는 **한 테넌트 안의 사용자 트리 + owner→member tenant 상속**이고 **전 생성 경로가 owner 직속 2단으로 봉인**(`UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670`)되어 조직 단위를 표현할 수 없다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | business unit profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | business unit code | 부재 · `business_unit_id`(Trustpilot creds) 는 무관 | `ABSENT` |
| 4 | business unit name | 부재 | `ABSENT` |
| 5 | executive owner reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — **팀 관리자**이지 BU 임원 아님 | `ABSENT` |
| 6 | legal entities | 부재 — `legal_entity` grep 0 | `ABSENT` |
| 7 | regions | 부재(조직 Region) · `region` 3축 병존은 전부 무관(§30 참조) | `ABSENT` |
| 8 | countries | 부재(조직 Country) · `app_user.country`(`UserAuth.php:499`) 는 회사주소 문자열 | `ABSENT` |
| 9 | brands | 부재(BU 바인딩) · 인접 = `catalog_brand`(`Catalog.php:151-169` `tenant_id·name·code`) — **11번가 상품등록 필수 브랜드코드**(`BRAND_REQUIRED_CHANNELS` `:415`)용 **상품속성**이며 BU 소속 관계 없음 | `KEEP_SEPARATE_WITH_REASON` |
| 10 | cost centers | 부재 — `cost_center` grep 0 | `ABSENT` |
| 11 | profit centers | 부재 — `profit_center` grep 0 · ⚠️ `po_*` 는 **Price Optimization**(`PriceOpt.php:38-146`)이지 회계 아님 | `ABSENT` |
| 12 | default approval hierarchy | 부재 — 승인 계층 엔티티 전무 | `ABSENT` |
| 13 | default workflow catalog | 부재 — 워크플로 카탈로그 전무 | `ABSENT` |
| 14 | valid_from | 부재 · **전 코드베이스 유일 effective date = `kr_fee_rule.effective_from`**(`Db.php:898`, 쓰기 `KrChannel.php:128-140`) — 채널 수수료 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 15 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** → **폐구간 모델은 순수 신규** | `ABSENT` |
| 16 | status | 부재(BU) · 형태 인접 = `team.status`(`TeamPermissions.php:148` default `'active'`) — 팀 활성 플래그 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 14 · `KEEP_SEPARATE_WITH_REASON` 3.

## 2. 규칙

- 🔴 **`business_unit_id`(Trustpilot)를 §25 로 매핑 금지.** 이름 완전일치이나 **외부 리뷰 SaaS 자격증명 KV**다. 이름 grep 히트를 커버로 계산하는 것이 규율 8("부재증명은 이름이 아니라 능력으로")이 겨냥한 정확한 오류다.
- 🔴 **`catalog_brand` 를 `brands` 필드 커버로 계산 금지.** 상품 등록 필수값이지 BU↔Brand 소속 관계가 아니다 → 확장 시 **`catalog_brand` 재구현 금지**, BU↔Brand **바인딩 테이블 신설**로 연결하라(§32 와 중복 정의 금지).
- 🔴 **`team.manager_user_id` 를 `executive owner reference` 로 승격 금지.** 주체(팀 ↔ BU)와 계층(팀에 부모 없음 — `parent_team_id` 컬럼 부재, `TeamPermissions.php:145-151`)이 모두 다르다.
- `valid_from`/`valid_to` 는 **폐구간(closed interval) 신규 모델**이다. 유일 선례 `kr_fee_rule.effective_from` 은 **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1` 최신승**(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`)이고 **`WHERE effective_from <= :as_of` 술어는 backend/src 전역 0건** → **as-of 조회 능력 자체가 없다.** 선례 인용은 "컬럼 형태"까지만, "as-of 조회 선례"로 인용하면 오염이다.
- 스키마 도입 시 **마이그레이션 파일 경로는 죽었다**(`backend/migrations/` 최신 = `20260527_172_002`, 172차 정지). `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 패턴(`Db.php:1123-1127`·`CRM.php:109`)을 쓰고 **MySQL/SQLite 두 방언을 동시 작성**하라(`CRM.php:48` vs `:77`).
- 🔴 17종 **"있다고 가정"하고 배선 금지.**
