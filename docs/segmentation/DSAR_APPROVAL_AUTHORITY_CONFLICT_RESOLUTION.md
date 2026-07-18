# DSAR — Approval Authority Conflict Resolution 원칙 (§54 · 권장 기본 순서)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §54(2217-2236) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6·§3·§2 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **분모**: §54 측정기 합계 = **13**(권장 기본 순서 13종·번호목록). 원문 §53 Conflict Type 20 + 필수 필드 20(합 40)은 각각 [DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md](DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md)·[DSAR_APPROVAL_AUTHORITY_CONFLICT.md](DSAR_APPROVAL_AUTHORITY_CONFLICT.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Conflict Resolution 우선순위 | 🔴 충돌 탐지/해소 코드 **0** — 승인은 단일 게이트 통과/거부만(ⓑ §6) · 해소 순서(§54) 자체 부재 | `NOT_APPLICABLE`(부재→신설) |
| 🔴 explicit DENY 표현 | `acl_permission` = **allow-only**(deny 비트 없음·ⓑ §6) → §54 1순위 "Explicit DENY"가 **표현 수단 자체 부재** | `ABSENT` |
| RuleEngine precedence 오탐 | `RuleEngine.php:250` `ad_schedule` precedence 는 **마케팅 세그 규칙 우선순위**(Authority 해소 아님·ⓑ §6) | `KEEP_SEPARATE_WITH_REASON` |
| Manual Review 인접 | `Mapping::approve:238-294` maker-checker 정족수 실집행 · `admin_growth` 수동 결재(ⓑ §2) — 단 **충돌 해소 트리거 아님** | `LEGACY_ADAPTER` |

★**충돌 해소 우선순위가 통째 부재**하므로 13종은 **원문 신설 카탈로그**다. 애초에 복수 Authority 후보가 없어(§47 후보 도출 0·ⓑ §6) 해소 순서가 무발동이며, 아래는 각 순서 단계의 "발동 대상 부재/인접 자산"을 기록한다.

## 1. 원문 전사 + 판정 — **권장 기본 순서 13**(§54 번호목록 · 측정기 13)

| # | 원문 순서 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Explicit DENY | 🔴 explicit deny 표현 부재 — `acl_permission`=allow-only(ⓑ §6) · 1순위 규칙을 표현할 deny 축이 없음 | `ABSENT` |
| 2 | Mandatory Platform Financial Control | 플랫폼 강제 금융통제 우선 부재 — 금액 한도축 0·`HIGH_VALUE_KRW` boolean 상수만(ⓑ §4) → 강제 통제 규칙 없음 | `NOT_APPLICABLE` |
| 3 | Explicit Approved Subject Restriction | 승인 subject 제한 부재 — Subject Binding·자격 판독 축 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 4 | Exact Legal Entity Rule | Legal Entity 정확일치 규칙 부재 — Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ Registry §12) | `NOT_APPLICABLE` |
| 5 | Exact Resource Rule | 리소스 정확일치 규칙 부재 — `acl_permission` scopeSql은 데이터-행 필터(장식)·Authority 리소스 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 6 | Exact Position Rule | 직위 정확일치 규칙 부재 — Position binding 개념 0·사람 계층 walk 0(ⓑ §3) | `NOT_APPLICABLE` |
| 7 | Exact Role Rule | 역할 정확일치 규칙 부재 — 권한 축 2벌 분열(api_key `$roleRank` ⟂ `team_role`)·승인 판정축 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 8 | Exact Organization Rule | 조직 정확일치 규칙 부재 — 조직 Authority binding 없음(ⓑ §3) | `NOT_APPLICABLE` |
| 9 | Country·Region Rule | 국가·지역 규칙 부재 — `Geo`(IP→ISO→언어)는 Authority 지리 스코프 아님(ⓑ Registry §13) | `NOT_APPLICABLE` |
| 10 | Tenant Default | 테넌트 기본 Authority 부재 — 🔴Tenant 마스터 테이블 부재(`api_key.tenant_id`=FK 없는 VARCHAR·`Db.php:944`·ⓑ §7) | `NOT_APPLICABLE` |
| 11 | Platform Default | 플랫폼 기본 Authority 부재 — 기본 해소 규칙 0(ⓑ §6) | `NOT_APPLICABLE` |
| 12 | Manual Review | 인접 = `Mapping::approve:238-294` maker-checker 정족수 실집행·`admin_growth` 수동 결재(ⓑ §2) — 단 **충돌 해소 fallback 트리거 아님**·임계/충돌 연동 없음 | `LEGACY_ADAPTER` |
| 13 | Block | 최종 차단(fail-closed) 단계 부재 — 충돌 미해소 시 안전 차단 로직 0(ⓑ §6)·Eligibility Fail-closed(Unknown≠Eligible)는 Part3-2 설계명세일 뿐 코드 아님 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 1(#1) · `LEGACY_ADAPTER` 1(#12) · `NOT_APPLICABLE` 11(#2~11·13).

> 🔴 **커버 0.** 충돌 해소 우선순위가 통째 부재하므로 어떤 단계도 `VALIDATED_LEGACY` 가 아니다. Manual Review(#12) 1건만 인접 자산(`Mapping` maker-checker)이 있으나 **충돌 해소 fallback 이 아니라 독립 승인 경로**이며, Explicit DENY(#1)는 표현 수단(deny 축)조차 없어 `ABSENT` 다.
> 🔴 **오탐 명기 (재플래그 금지)**: `RuleEngine.php:250` `ad_schedule` precedence 는 마케팅 세그 규칙 우선순위이지 Authority 해소 우선순위가 아니다(ⓑ §6). 이를 §54 구현 존재로 오판하지 마라.

## 2. 규칙

- 🔴 **원문 §54 말미(2235) 강제 원칙 — "더 높은 Allow Limit을 임의로 선택하지 마라"**(ⓑ §6 = §4.8 "임의 최대한도 선택 금지"): 현재는 복수 Authority가 없어 이 규칙이 **무발동**이나, 해소 엔진 신설 시 **필수로 명기·집행**하라. 복수 allow 한도가 충돌할 때 "더 관대한 한도"를 자동 선택하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 재생산한다. 해소는 §54 순서(1 Explicit DENY … 13 Block)를 따르며, 동률/무규칙 시 **더 낮은 한도·더 엄격한 결과**로 fail-closed 하라.
- 🔴 **Explicit DENY(#1)를 표현하려면 deny 축 신설이 선행**이다 — `acl_permission` 은 allow-only 다(ⓑ §6). §54 1순위(그리고 §52 "낮은 Specificity라도 Policy에 따라 DENY 우선 가능")를 집행하려면 명시적 거부 표현을 먼저 만들어야 한다. allow 부재를 deny 로 오해석하지 마라(Unknown≠Deny 도 아님).
- 🔴 **Manual Review(#12)를 `Mapping` maker-checker 재구현으로 채우지 마라** — `Mapping::approve` 정족수(`required_approvals` 리터럴 2·`:209`)는 레포 유일 실 정족수이나 **충돌 해소 fallback 이 아니라 독립 승인 경로**다(ⓑ §2). 해소 실패 시 Manual Review 로 라우팅하는 로직은 그 패턴을 **참조**하되 승인 도메인으로 분리 신설하라(중복 엔진 금지).
- 🔴 **13종을 정적 우선순위 배열로 하드코딩하지 마라** — Policy 에 따라 Explicit DENY 가 더 낮은 Specificity 라도 우선할 수 있어야 한다(§52·2161). Tenant Default(#10)는 Tenant 마스터 부재(ⓑ §7)를 상속하지 말고 권위 tenant 참조를 선결하라.
