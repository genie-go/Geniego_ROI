# DSAR — Approval Authority Specificity Policy (§52 · 권장 순서 11)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> 분모: **권장 순서 11 = §52 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=52` → **번호목록 11** · 🔴 불릿만 세면 0).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §52(2143-2162) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · Result: [DSAR_APPROVAL_AUTHORITY_RESOLUTION_RESULT.md](DSAR_APPROVAL_AUTHORITY_RESOLUTION_RESULT.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Specificity 해소 로직 | 🔴 "구체 binding > 일반" 비교 코드 grep **0** — 여러 Authority 일치 시 특이성 순위 평가 부재(ⓑ §6·§47~§54 전 ABSENT) | `ABSENT` |
| binding 개념 | 🔴 Authority Binding(Subject/Resource/Role/Position/Org/LegalEntity) 엔티티 자체 없음(ⓑ §1·§3.4 44항목 전부 0) | `ABSENT` |
| explicit DENY 우선 | 🔴 §52 마지막 문장 "Explicit DENY 는 더 낮은 Specificity 라도 우선 가능" = **현행 deny 표현 자체가 없음**(`acl_permission` allow-only·ⓑ §6·§4.9) → 우선 규칙이 gap 이 아니라 **미구현** | `ABSENT` |

★**Specificity 축이 통째로 부재하므로 11종 전량 신설.** 애초에 복수 Authority 후보가 없어 §4.8 "임의 최대한도 선택 금지"·특이성 tie-break 이 무발동이다(ⓑ §6). 아래는 원문 전사이며 현행 대조는 "부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **권장 순서 11**

| # | 원문 Specificity (구체→일반) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Exact Subject + Exact Resource | Subject 판독 정본축(§4.1/§4.2) + Resource binding 부재 — `acl_permission` scopeSql 는 데이터-행 필터·Authority resource binding 아님(ⓑ §3 §6) | `ABSENT` |
| 2 | Exact Subject + Exact Legal Entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 3 | Exact Position + Exact Resource | 🔴 Position 축 부재(`position_threshold`·`job_grade_threshold` grep 0·ⓑ §1) | `ABSENT` |
| 4 | Exact Role + Exact Legal Entity + Exact Action | Role 축 2벌 분열(machine api-key `$roleRank` vs `team_role` 매핑 0·ⓑ §3) + Legal Entity 0 → 3중 특이성 구성 불가 | `ABSENT` |
| 5 | Exact Organization + Exact Resource | org 마스터 부재 — `seedOrg`(`TeamPermissions.php:708-717`)는 acl 스코프 시드·조직 계층 마스터 아님(ⓑ §3) | `ABSENT` |
| 6 | Exact Cost Center·Profit Center | 🔴 `cost_center_limit` grep 0 · Profit Center 개념 0(ⓑ §1) | `ABSENT` |
| 7 | Exact Program·Project | 🔴 `program_limit` grep 0 · Project authority binding 0(ⓑ §1) | `ABSENT` |
| 8 | Exact Country | `country_limit` grep 0 · country 축 = TikTok `country_code` 차원(Authority 스코프 아님·ⓑ §4) | `ABSENT` |
| 9 | Exact Region | region 축 = `Geo`(IP→ISO→언어) — Authority 지리 스코프 아님(ⓑ §4·Resolution 필드19) | `ABSENT` |
| 10 | Tenant-wide | Cross-tenant 격리는 REAL(`index.php:600`)이나 **격리(isolation)**일 뿐 tenant-wide Authority binding·특이성 순위 개념 없음(ⓑ §7) | `ABSENT` |
| 11 | Platform-wide | 인접 = `admin_growth_approval`(플랫폼 전역 큐·tenant_id 없음·ⓑ §2) 이나 specificity 최하위 순위 fallback 아님 | `ABSENT` |

## 2. Explicit DENY 우선 (§52 마지막 문장)

> 원문: *"다만 Explicit DENY 는 더 낮은 Specificity 라도 Policy 에 따라 우선할 수 있게 하라."*

🔴 **현행 deny 표현 자체가 없다.** `acl_permission` 은 **allow-only** 로 deny 비트/행을 표현하는 스키마가 아니다(ⓑ §6·[DSAR_APPROVAL_AUTHORITY_EFFECT.md](DSAR_APPROVAL_AUTHORITY_EFFECT.md) Effect2=DENY `ABSENT`). 따라서 "낮은 Specificity 의 DENY 가 높은 Specificity 의 ALLOW 를 이긴다"는 정책은 **판정 자체가 없음**(gap 이 아니라 미구현)이다. Specificity Policy 신설 시 effect=DENY(§9) + priority result(§51 필드23)를 선결해야 이 우선 규칙이 표현 가능하다.

**실측 개수: 11 / 11 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 11 (전량).

> 🔴 **커버 0.** 특이성 해소 로직·binding 개념이 통째로 부재하므로 11종 전부 `ABSENT`다. Tenant-wide(10)·Platform-wide(11)의 인접 자산(격리 집행·admin_growth 전역 큐)은 **특이성 순위 요소가 아니라 격리/스코프 장식**이므로 `LEGACY_ADAPTER` 로도 격상하지 않는다.

## 3. 규칙

- 🔴 **Specificity 를 도입하기 전에 binding 을 먼저 만들어라** — 특이성 순위는 Subject/Resource/Position/Role/Org/LegalEntity **binding 이 존재해야 비교 대상이 생긴다**. 레포에 binding 이 0(ⓑ §1)이므로 §52 는 §5~§49 binding 엔티티 신설에 종속된다(선행 없이 순위만 구현하면 빈 비교기).
- 🔴 **Explicit DENY 우선을 "나중" 으로 미루지 마라** — deny 부재는 `acl_permission` allow-only 라는 저장계층 결함이다(ⓑ §6). effect=DENY 를 최초 스키마에 포함하지 않으면 §52 마지막 문장(낮은 특이성 DENY 우선)이 원천 표현 불가해져 §65 "Explicit Deny 우선 위반" 이 구조화된다.
- 🔴 **Country/Region 을 Geo/TikTok 차원으로 재사용 금지** — 현행 country/region 은 IP 지오·채널 차원이지 Authority 지리 스코프가 아니다(ⓑ §4). Specificity 8·9 를 위해 별도 Authority geographic binding(§18 대역)을 두되 Geo 유틸을 승인 축으로 오배선하지 마라.
- 🔴 **Cost Center·Profit Center·Program·Project 를 "있음" 으로 표기 금지** — 전부 grep 0(ⓑ §1)이며 재무/조직 마스터 자체가 부재다. Specificity 6·7 은 해당 마스터 엔티티 신설 없이 순위표에만 넣으면 영구 미도달 분기가 된다.
