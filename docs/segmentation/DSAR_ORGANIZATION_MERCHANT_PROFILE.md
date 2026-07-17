# DSAR — Organization Merchant Profile (§34)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §34 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| ★`merchant_promotion` DDL | `Promotion.php:51-60` — `id·tenant_id·name·ptype·value·code·max_use·used·channels_json·budget·start_date·end_date·status·created_at·updated_at`. **`merchant_id` 컬럼이 존재하지 않는다** | `NAME_ONLY`(접두어일 뿐) |
| ★Merchant of Record | **Paddle 응답의 note 문자열로만 존재** — `Pnl.php:533-536` `'note' => 'Paddle acts as Merchant of Record; VAT is collected and remitted by Paddle.'` · 인접 키 `vat_collected_by_mor`/`remitted_by_mor`(`:533-534`) | `NAME_ONLY`(문자열 리터럴) |
| 채널별 판매자 식별자 | `shop_id`(`ChannelSync.php:1799`) · `seller_id`(`:1956`,`:1922`,`:2298`) · `vendor_id`(`Connectors.php:1263`,`ChannelSync.php:631`) = **`channel_credential` KV 값**(`Db.php:976-982`) | `KV_ONLY` |
| `merchant_type` / internal·external 구분 | **grep 0** | `ABSENT` |
| `organization_unit`/`legal_entity`/`cost_center`/`profit_center` | **PM 재확인 grep = 0건** | `ABSENT` |
| 테넌트 마스터 테이블 | ★**존재하지 않는다** — `api_key.tenant_id VARCHAR(100)`(`Db.php:944`, **FK 없음**) · 발급 = `'acct_'.$id` 문자열 생성(`UserAuth.php:220-224`) · 열거 = `SELECT DISTINCT tenant_id` **19개소 역추론** | `ABSENT`(엔티티로서) |

**★축 주의 1 — `merchant_promotion` 은 Merchant 가 아니다.**
DDL 실측(`Promotion.php:51-60`) 결과 **`merchant_id` 컬럼조차 없다.** `merchant_` 는 **테이블명 접두어**일 뿐이고 그 내용은 **프로모션(할인 코드·예산·기간)**이다. 귀속축은 `tenant_id` 하나다. 이름 grep 히트를 커버로 계산 = **규율 8(부재증명은 이름이 아니라 능력으로) 위반**.

**★축 주의 2 — `Merchant of Record` 는 코드가 아니라 문장이다.**
`Pnl.php:536` 의 MoR 언급은 **API 응답에 실려 나가는 영문 설명 문자열**이다. Paddle 이 MoR 이라는 **사실을 서술**할 뿐, Merchant 엔티티·유형·계약·관계 **어느 것도 표현하지 않는다.** 🔴 **규율 10(주석·문서를 근거로 삼지 마라)의 변종** — 응답 note 문자열도 근거가 아니다.

## 1. 원문 전사 + 판정 — **원문 17종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | merchant profile id | 부재 — merchant 마스터 행 자체가 없음 | `ABSENT` |
| 2 | organization unit id | **`organization_unit` 전역 0** | `ABSENT` |
| 3 | merchant id | ★**`merchant_promotion` 에 `merchant_id` 컬럼 없음**(`Promotion.php:51-60`) · 인접 = `channel_credential` KV `seller_id`/`vendor_id`/`shop_id` | `NAME_ONLY` |
| 4 | merchant type | **grep 0** — 유형 열거 전무 | `ABSENT` |
| 5 | tenant relationship | ★**테넌트 마스터 테이블 부재**(`api_key.tenant_id` FK 없음 `Db.php:944`) · 테넌트 = **1 owner 계정의 구독 스코프**(`PlanLimits.php:36-37`) | `NAME_ONLY` |
| 6 | legal entity relationship | **`legal_entity` 전역 0** · 🔴 **테넌트 ≠ 법인**(ⓑ §12) | `ABSENT` |
| 7 | brand relationships | `catalog_brand`(`Catalog.php:151-169`) 실재하나 **merchant↔brand 링크 0** | `PARTIAL` |
| 8 | store relationships | `store_id` = 자유문자열(`Insights.php:114`) · **merchant↔store 링크 0** | `KV_ONLY` |
| 9 | contract references | **계약 엔티티 grep 0** | `ABSENT` |
| 10 | country scope | `Geo` = 국가→**언어**(`Geo.php:23-53`) · merchant↔국가 링크 0 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | region scope | `region` 3축 전부 무관 · parent region 0 | `NAME_ONLY` |
| 12 | merchant owner organization | 부재 | `ABSENT` |
| 13 | approval hierarchy reference | 부재 — 승인 계층 전역 0 | `ABSENT` |
| 14 | valid_from | 부재 — `merchant_promotion.start_date`(`Promotion.php:57`)는 **프로모션 행사기간**이지 프로필 유효기간 아님 | `ABSENT` |
| 15 | valid_to | **`valid_to`/`effective_to` grep 0** · `end_date`(`:57`)도 행사기간 | `ABSENT` |
| 16 | status | `merchant_promotion.status VARCHAR(20) DEFAULT 'draft'`(`Promotion.php:58`) — **프로모션 상태**이지 프로필 상태 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 17 | evidence | 부재 | `ABSENT` |

**실측 개수: 17 / 17 전사.** 커버리지 = `PARTIAL` 1 · `KV_ONLY` 1 · `NAME_ONLY` 3 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 10. **`VALIDATED_LEGACY` = 0.**

## 2. 규칙

- 🔴 **`merchant_promotion` 을 Merchant Profile 로 확장하지 마라.** DDL 에 **`merchant_id` 가 없다**(`Promotion.php:51-60`). 이 테이블은 프로모션(할인·예산·행사기간) 전용이며 §34 의 17축 중 **0축을 충족**한다. 접두어 일치로 배선하면 **프로모션 스키마가 오염**되고 갭은 정의상 소멸한다(역산).
- 🔴 **`start_date`/`end_date`/`status`(`Promotion.php:57-58`)를 `valid_from`/`valid_to`/`status` 로 매핑 금지.** 전자는 **프로모션 행사기간·초안상태**다. 의미축이 다르다(규율 9).
- 🔴 **`Pnl.php:536` 의 MoR 문자열을 Merchant 근거로 인용 금지.** 응답 note 이지 구현이 아니다. MoR 이 필요하면 **`merchant type` 의 값으로 신규 정의**하되, `Pnl` 의 Paddle VAT 대납 산출(`:533-534`)은 **건드리지 마라**(288차 VAT 정합 회귀 위험).
- **원문 지시 준수**: *"Merchant는 고객사의 내부 Organization 또는 외부 Party일 수 있으므로 `internal/external`을 명확히 구분하라"*(`SPEC…:1518`) → **현행에 이 구분축이 전무**하므로 신설 시 **처음부터 `internal/external` 판별 필드를 필수**로 둔다. ⚠️ 인접 선례 = `partner_account`(`PartnerPortal.php:52-59`)가 **외부 party 를 별도 인증 realm 으로 분리**한 방식(§36 참조) — **패턴 참고는 가능하나 커버 아님**.
- 🔴 **`tenant relationship` 을 "테넌트=법인"으로 해석 금지.** ★테넌트 **마스터 테이블이 존재하지 않는다**(`api_key.tenant_id` FK 없음 `Db.php:944` · 발급 = `'acct_'.$id` 문자열 `UserAuth.php:220-224` · 열거 = `SELECT DISTINCT` 19개소 역추론). 테넌트 = **1 owner 계정의 구독 스코프**(`PlanLimits.php:36-37`)이며 **한 법인이 다수 테넌트를 갖는 것도 그 반대도 표현되지 않는다.** "테넌트=법인" 가정 = **역산**(ⓑ §12).
- **테넌트 격리는 REAL 이므로 준수**: 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · strict fail-closed(`:585`) → Merchant Profile 도 **`tenant_id` 필수 + 전 조회 술어에 포함**.
- **스키마 도입 제약**: 마이그레이션 경로 정지(172차) → `ensureTables` 멱등 패턴 + MySQL/SQLite 두 방언 동시 작성 의무.
- 🔴 10축 `ABSENT` 를 **"있다고 가정"하고 배선 금지**(규율 7).
