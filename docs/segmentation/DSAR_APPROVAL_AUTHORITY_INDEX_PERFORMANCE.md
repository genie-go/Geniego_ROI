# DSAR — Approval Authority Index·Performance (§75)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §75(3098~3123) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §7 · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=75` → **21**(불릿 21·번호 0). 육안 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Authority 인덱스 대상 엔티티 | 🔴 **Authority 테이블 자체 부재**(ⓑ §1·§7) — 인덱싱할 Active Authority / Matrix Entry / Utilization 행이 존재하지 않음 | `NOT_APPLICABLE`(인덱스 대상 부재) |
| 인접 인덱스 선례 ① | `pm_task_dependencies` **UNIQUE `uq_pm_dep(tenant_id, predecessor_id, successor_id, dep_type)`** + `KEY idx_pm_dep_pred`·`idx_pm_dep_succ`(`backend/migrations/20260526_168_004_create_pm_task_dependencies.sql:12-14`) — tenant 선두 복합 UNIQUE + 보조 인덱스의 **패턴 선례**(PM 의존성 도메인 · Authority 아님) | `LEGACY_ADAPTER`(패턴 참조 · 도메인 상이) |
| 인접 인덱스 선례 ② | `api_key` **복합 인덱스** `CREATE INDEX idx_api_key_tenant ON api_key(tenant_id,is_active)`(`Db.php:956`) — "Tenant별 Active" 필터의 실 인덱스 선례이나 **권한 저장 테이블(api_key)이지 Authority 레지스트리 아님** | `LEGACY_ADAPTER`(패턴 참조 · 도메인 상이) |
| tenant 열거 기준 | 🔴 **Tenant 마스터 테이블 부재** — `api_key.tenant_id`=FK 없는 `VARCHAR(100)`(`Db.php:944`) · 열거는 `SELECT DISTINCT` 역추론(ⓑ §7) → "Tenant별 Active Authority" 인덱스의 **권위 tenant 목록 자체가 없음** | `BLOCKED_CROSS_TENANT` |

★**Authority 엔티티가 통째로 부재하므로 인덱스는 신설 대상이며, 21개 조회 요구의 대부분은 "인덱싱할 행이 없음"으로 `NOT_APPLICABLE`이다.** 아래 전사는 원문 요구 verbatim + 인접 선례/부재 깊이 기록이다.

## 1. 원문 전사 + 판정 — **원문 21종**(최적화 대상 조회 21)

원문(3100): *"최소 다음 조회를 최적화하라."*

| # | 원문 조회 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Tenant별 Active Authority | 🔴 Active Authority 행 부재 · 인접 = `api_key(tenant_id,is_active)` 복합 인덱스(`Db.php:956`)가 "tenant+active" 필터의 유일 실 선례(도메인 상이) | `LEGACY_ADAPTER` |
| 2 | Domain별 Authority | Authority Domain(§8) 축 자체 없음(ⓑ §3 결론) | `NOT_APPLICABLE` |
| 3 | Type별 Authority | Authority Type(§7) 축 자체 없음 | `NOT_APPLICABLE` |
| 4 | Subject별 Authority | Subject(actor) authority binding 없음 — 승인자는 진입 게이트 통과자(ⓑ §3) | `NOT_APPLICABLE` |
| 5 | Role별 Authority | `roleRank`(api_key 등급)·`team_role`(조직 역할) 존재하나 **Authority 부여 행이 없어 인덱싱 대상 아님**(양축 직교·ⓑ §3.2) | `NOT_APPLICABLE` |
| 6 | Position별 Authority | 🔴 Position(직위) 개념 부재 — 다홉 사람계층 walk 0(ⓑ §3.1) | `ABSENT` |
| 7 | Organization별 Authority | `seedOrg`(TeamPermissions)는 ACL 시드일 뿐 Authority 부여 아님 → 인덱싱 대상 없음 | `NOT_APPLICABLE` |
| 8 | Legal Entity별 Authority | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 9 | Country·Region별 Authority | `Geo`(IP→ISO→언어)·TikTok country_code 차원 존재하나 **Authority 지리 스코프 아님**(ⓑ 레지스트리 §13) | `KEEP_SEPARATE_WITH_REASON` |
| 10 | Resource별 Authority | resource-scope authority 없음 · `acl_permission.scopeSql`=데이터-행 필터(장식·ⓑ §3) | `NOT_APPLICABLE` |
| 11 | Action별 Authority | action authority 부여 행 없음(`acl_permission.approve`=미소비 장식·ⓑ §3) | `NOT_APPLICABLE` |
| 12 | Currency별 Authority | 🔴 통화 스코프 0 — 통화는 변환 전용(`fxToKrw`·`krwToCurrency`·ⓑ §4) | `ABSENT` |
| 13 | Amount Band별 Entry | 🔴 Amount Band 없음 — 유일 금액조건 = `HIGH_VALUE_KRW` PHP 상수(승인 필요여부 boolean만·ⓑ §4) | `ABSENT` |
| 14 | Effective Date 기준 Authority | 🔴 승인/권한 엔티티에 effective dating 0(`valid_from`/`valid_to` grep 0) · `effective_from`은 수수료/VAT 도메인만(ⓑ §5) | `ABSENT` |
| 15 | Limit Period별 Utilization | 인접 실재 = `AutoCampaign.php:843-889` `periodSpentToDate:855`(기간 내 누적 지출)→상한 비교→`budget_cap_pause`(마케팅 도메인·승인 아님·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 16 | Approval Case별 Resolution | 🔴 Resolution(§50~§54) 개념 전무(ⓑ §6) | `ABSENT` |
| 17 | Subject별 Remaining Authority | Remaining Authority = 누적한도 잔량 개념 부재(도메인 한도+누적차감은 AutoCampaign 예산만·ⓑ §4) | `ABSENT` |
| 18 | Conflict 상태 | 🔴 Conflict 탐지/해소(§53/§54) 전무 · "conflict" 히트는 전부 SQL `ON CONFLICT` upsert(ⓑ §6) | `ABSENT` |
| 19 | Future Authority Version | 🔴 Future-Dated(§58) 로컬 예약 0(ⓑ §5) | `ABSENT` |
| 20 | Authority Snapshot | 🔴 Actor Authorization Snapshot(§55) 부재 — 승인시점 권한/역할/플랜 미보존(ⓑ §5) | `ABSENT` |
| 21 | Reconciliation Mismatch | 🔴 Reconciliation(§63) 부재 — Authority 정의 vs 실제 부여 대사 0 · 대사 기준(Tenant 마스터) 자체 부재(ⓑ §7) | `ABSENT` |

**실측 개수: 21 / 21 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(#1·#15) · `KEEP_SEPARATE_WITH_REASON` 1(#9) · `ABSENT` 11 · `NOT_APPLICABLE` 7.

> 🔴 **커버 0.00%.** 인덱싱할 Authority 행이 하나도 없으므로 21개 조회 중 어느 것도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 2건(#1 `api_key` 복합 인덱스 · #15 AutoCampaign Utilization)은 **인덱스 패턴을 참조할 인접 자산**이지 커버가 아니다.

## 2. 규칙

- 🔴 **인덱스는 신설이나 인접 선례의 패턴을 재구현하지 마라** — tenant 선두 복합 UNIQUE(`pm_task_dependencies:12`)·tenant+active 복합 인덱스(`api_key` `Db.php:956`) 패턴을 **참조**하되 별도 인덱스 엔진을 만들지 마라. Authority 테이블 신설 시 이 패턴 위에 `(tenant_id, domain, type, effective_date)` 계열 복합 인덱스를 얹어라.
- 🔴 **"Tenant별 Active Authority" 인덱스를 느슨한 `VARCHAR` tenant 위에 올리지 마라** — Tenant 마스터 부재(ⓑ §7)를 상속하면 인덱스가 유령 tenant 를 색인한다. 권위 tenant 참조 선결(§66 Cross-Tenant Binding).
- 🔴 **인덱스 대상 부재를 "성능 양호"로 계산 금지** — 21개 조회 중 `ABSENT`/`NOT_APPLICABLE` 18건은 엔티티가 없어 느릴 대상 자체가 없는 것이지 최적화가 완료된 것이 아니다(우연한 준수 금지).
- 🔴 **Amount Band별 Entry·Effective Date 기준 조회는 저장계층 신설이 인덱스보다 선행한다** — Amount Band·effective dating 컬럼이 승인 엔티티에 부재(ⓑ §4·§5)하므로 인덱스 설계 전 §24 Amount Band 승격·폐구간 dating 스키마가 선결이다.
