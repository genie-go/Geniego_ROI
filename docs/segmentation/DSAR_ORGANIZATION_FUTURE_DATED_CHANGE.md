# DSAR — Future-Dated Organization Change (§45)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §45 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Future-dated 변경 개념 | `future_dated`·`scheduled_effective` **backend/src grep 0** | `ABSENT`(이름·능력 양쪽) |
| 예약 실행 인프라 | **SMS 예약 워커**(286차) — 발송 도메인 · 조직 변경 예약 아님 | `KEEP_SEPARATE_WITH_REASON` |
| effective date 축 | `kr_fee_rule.effective_from`(`Db.php:898`) — **쓰기 시 미지정이면 `date('Y-m-d')`(오늘)**(`KrChannel.php:140`) | **미래일자 표현 불가** |
| 변경 집행 수단 | ★**`ensureTables` 는 테이블 생성만 · 데이터 변환/백필 없음**(ⓑ §20 제약 2) | **집행 수단 부재** |
| 마이그레이션 경로 | `backend/migrations/` **21파일 · `20260527_172_002_coupon_tables.sql` 에서 172차 정지** | **경로 사망** |
| 조직 엔티티 자체 | `org_unit`·`organization_unit`·`hierarch` **grep 0** — **애초에 존재한 적 없음**(`git log --all -S` 0) | `ABSENT` |

### ★§45 는 **대상도 수단도 없다**

§45 는 *"조직 구조를 미래 시점부터 바꾼다"* 를 요구한다. 이 요구가 성립하려면 ① **바꿀 조직 엔티티**와 ② **예약된 변경을 시점 도래 시 집행할 수단**이 있어야 한다. **현행은 둘 다 없다.**

- ①**대상 부재**: 조직 계층은 **애초에 존재한 적이 없다**(ⓑ 대전제 — 삭제된 조직 코드 0 = 팬텀도 유물도 아님).
- ②**수단 부재**: 스키마 진화 경로가 `ensureTables` 뿐인데 **`ensureTables` 는 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` 로 구조만 만들고 기존 데이터를 옮기지 않는다.** → 예약 변경이 도래해도 **행을 실제로 바꿀 집행기가 없다.**

→ 정직한 판정 = **`CONTRACT_ONLY`**(계약만 정의 · 실코드 0).

### ⚠️ `effective_from` 이 있는데 왜 future-dated 가 아닌가

`KrChannel.php:140` 은 `$body['effective_from'] ?? date('Y-m-d')` 로 **미래 날짜 문자열을 받는 것 자체는 막지 않는다.** 그러나:

1. 읽기가 **전부 `ORDER BY effective_from DESC LIMIT 1`**(`Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) = **최신승** → **미래 날짜 행을 넣으면 그 즉시 "현재" 값이 된다.**
2. `effective_from *<=` 술어 **0건**(PM 재검증) → **"오늘 기준 유효한 행"을 고르는 코드가 없다.**

→ ★**미래일자를 저장할 수는 있으나, 저장하면 즉시 발효된다** = future-dated 의 **정반대**. 🔴 **"effective_from 이 미래를 받으니 future-dated 선례"로 계산하면 역산이다**(규율 9 — 능력 존재 ≠ 요구 충족. 여기선 능력이 **역방향**으로 존재).

## 1. 원문 전사 + 판정 — 지원 변경 **원문 14종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | New Organization | 조직 엔티티 부재 · 인접 = `seedOrg`(`TeamPermissions.php:725-753`)가 `ORG_PRESET` 15단위를 `team` 행으로 **즉시 생성**(예약 없음·멱등 skip) | `LEGACY_ADAPTER`(즉시 생성만) |
| 2 | Organization Rename | 부재 · `team.name` UPDATE 는 **덮어쓰기**(이전 이름 소실 · 이력 테이블 없음) | `NOT_APPLICABLE` |
| 3 | Parent Change | ★**부모 컬럼 자체가 없다** — `team` DDL(`TeamPermissions.php:145-151`/`:168`)에 **`parent_team_id` 없음** → 구조적 불가 | `ABSENT` |
| 4 | Legal Entity Change | 법인 엔티티 부재 · `biz_no`/`brn`/`corp_reg`/`tax_id` **0건** · 사업자정보는 `app_user` 평문 필드(`UserAuth.php:499`·`:1720`) | `ABSENT` |
| 5 | Business Unit Transfer | `business_unit` 유일 히트 = **Trustpilot 자격증명 `business_unit_id`**(`ChannelSync.php:2573-2580`) — 무관 | `ABSENT` |
| 6 | Department Transfer | `department`·`division` **grep 0** | `ABSENT` |
| 7 | Region Transfer | `region` **3축 병존**(광고 인구통계 `Db.php:681`,`690` / Amazon Ads 엔드포인트 na·eu·fe `Connectors.php:2704-2710` / WMS 창고 시·도 `Wms.php:129`·`regionOf():284-286`) — **조직 리전 아님** · `parent region` 컬럼 0 | `KEEP_SEPARATE_WITH_REASON` |
| 8 | Country Transfer | `Geo` = **IP→ISO alpha-2 → 언어 매핑**(`Geo.php:23-53` · `COUNTRY_LANG_MAP`) — 국가→**조직** 매핑 아님 · **Country→Region 매핑 코드 0건** | `KEEP_SEPARATE_WITH_REASON` |
| 9 | Owner Change | 인접 = `team.manager_user_id`(`TeamPermissions.php:145-151`) UPDATE · **덮어쓰기 · 발효일 없음 · 이력 없음** | `PARTIAL`(즉시·무이력) |
| 10 | Cost Center Change | `cost_center` **grep 0** | `ABSENT` |
| 11 | Profit Center Change | `profit_center` **grep 0** | `ABSENT` |
| 12 | Merge | 조직 병합 부재. ⚠️**`crm_identity_merge_link`(`CRM.php:708-712`)를 인용하지 마라** — **union-find 등가류**(`resolveIdentitiesForTenant:597-643`)이지 조직 병합 아님(ⓑ §19 최대 함정) | `ABSENT` |
| 13 | Split | 부재 · 분할 개념 전무 | `ABSENT` |
| 14 | Retirement | 인접 = `team.status`(`TeamPermissions.php:145-151`) · `agency_client_link.status='revoked'`(`AgencyPortal.php:400`) — **즉시 · 발효일 없음** | `PARTIAL`(즉시·무발효일) |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `PARTIAL` 2 · `LEGACY_ADAPTER` 1 · `KEEP_SEPARATE_WITH_REASON` 2 · `ABSENT` 9.

## 1-2. 원문 전사 + 판정 — Future-dated 기록 필드 **원문 12종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | scheduled effective date | `scheduled_effective` grep 0 · `effective_from`(`Db.php:898`)은 **저장 즉시 발효**(최신승) = 예약 아님 | `ABSENT` |
| 2 | source | 부재 — 변경 원천 축 없음(ERP/HRIS 커넥터 0 · `ChannelRegistry.php:12`,`:79` `group_type` 열거에 `erp`·`finance`·`hr` **없음**) | `ABSENT` |
| 3 | change set | 부재 — 변경 묶음(트랜잭션 단위) 개념 없음. 인접 = `pm_audit_log.diff_json`(migration `20260526_168_008`) **단건 diff** | `LEGACY_ADAPTER`(diff 선례) |
| 4 | affected nodes | 부재 — 영향분석 축 전무 | `ABSENT` |
| 5 | affected edges | 부재 · 인접 자산 = `graph_edge`(`Db.php:816-839`) — **마케팅 귀속 도메인** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | affected members | 부재 — 멤버십 영향 계산 없음 | `ABSENT` |
| 7 | affected roles | 부재 — `team_role`(`TeamPermissions.php:17`) 존재하나 변경 영향 추적 없음 | `ABSENT` |
| 8 | affected approval chains | 부재 — 승인 체인 자체가 부재(5-3-2 확정) | `ABSENT` |
| 9 | affected active approvals | 부재 — 진행 중 승인 개념 없음 | `ABSENT` |
| 10 | validation result | 부재(조직) · ★**인접 선례 최상급** = `PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) **쓰기 전 검증 → 422 `cycle_detected`**(`:32-34`) | `LEGACY_ADAPTER`(검증 패턴 정본) |
| 11 | status | 부재 — 예약 변경의 상태(scheduled/applied/cancelled) 축 없음 | `ABSENT` |
| 12 | evidence | 부재 | `ABSENT` |

**실측 개수: 12 / 12 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 9.

## 2. 규칙

- ★**§45 판정 = `CONTRACT_ONLY`.** 계약(14 변경 × 12 필드)은 정의되나 **실코드 0**. 🔴 **"부분 구현"으로 포장 금지** — `effective_from` 은 대상 도메인이 다르고(채널 요율), 동작이 **정반대**(저장 즉시 발효)다.
- 🔴 **★집행 수단이 없다는 사실을 설계에 반영하라.** `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다**(ⓑ §20 제약 2). → **예약 변경 집행기는 순수 신규**이며, **스키마 도입과 별개의 런타임 워커가 필요**하다. 🔴 **"마이그레이션으로 처리하면 된다"는 경로는 죽었다**(172차 정지).
- ★**예약 집행기 신설 시 기존 워커 패턴을 확장하라 — 두 번째 스케줄러 엔진 금지**(헌법). 인접 실선례 = **SMS 예약 워커**(286차). **단 도메인이 발송이므로 커버로 계산하지 말고 패턴만 인용.**
- ★**쓰기 전 검증 강제 — 정본 = `PM/Dependencies::validateDependency`**(`PM/Dependencies.php:79-100`): **반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + 쓰기 전 차단**(`:32-34` → 422 `cycle_detected`) + self-loop 차단(`:29-31`). §45 `validation result` 는 **이 패턴의 확장**이다. 🔴 **새 검증기 신설 금지.**
  - ⚠️ **단 future-dated 는 난이도가 다르다** — 검증 대상이 **"현재 그래프"가 아니라 "발효일 시점의 미래 그래프"** 다. **예약 변경 2건이 같은 날 발효되면 개별 검증은 통과하고 합성 결과가 순환일 수 있다.** → **발효일 단위로 변경집합을 합성한 뒤 검증**해야 한다. **단건 검증만으로 안전하다고 가정하지 마라.**
- 🔴 **`crm_identity_merge_link`(`CRM.php:708-712`)를 `Merge` 선례로 인용 금지.** **union-find 등가류**(대칭·추이적)이지 **조직 병합**(반대칭 부분순서)이 아니다 — ⓑ §19 가 지목한 **최대 함정**.
- 🔴 **`region`/`country` 를 조직 축으로 오인 금지.** `region` 3축 전부 비조직(광고 인구통계·Amazon 엔드포인트·WMS 시도) · `Geo` 는 국가→**언어**. **`APAC`/`EMEA`/`AMERICAS`/`LATAM` grep 0 · parent region 0 · Country↔Region binding 0.**
- ★**Parent Change 는 `team` 확장으로 성립하지 않는다** — `team` DDL 에 **`parent_team_id` 가 없다**. `ORG_PRESET` 15단위(`TeamPermissions.php:706-722`)의 계층은 **이름에만 있다**("마케팅 글로벌팀"↔"마케팅팀" 구조 링크 0). 🔴 **"Organization Registry ABSENT"도 오판** — 정확한 표현 = **"구조가 아니라 열거"**(`PARTIAL`).
- **MySQL/SQLite 양 방언 동시 작성 의무**(ⓑ §20 제약 3 — `CRM.php:48` vs `:77` 패턴).
