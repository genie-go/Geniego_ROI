# DSAR — 기본 Authority Eligibility (§46)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §46(1915-1938) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §2·§3·§4·§8 · Profile: [DSAR_APPROVAL_AUTHORITY_ELIGIBILITY_PROFILE.md](DSAR_APPROVAL_AUTHORITY_ELIGIBILITY_PROFILE.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

★**§46 은 "기본적으로 승인 자격이 성립하려면 무엇을 요구하는가"의 정본 목록이다.** §45 Eligibility Profile 이 부재하므로 이 요건들을 판독할 자리 자체가 없다(ⓑ §3 결론). 현행 승인 4경로는 **진입 게이트만 통과**하면 성립한다 — 아래 대조는 그 게이트가 §46 요건의 어느 축을 우연히/부분적으로 만지는지, 어느 축이 통째로 부재인지를 기록한다.

| 축 | 현행 게이트 실측 | §46 대비 |
|---|---|---|
| Runtime Authorization | 미들웨어 진입 게이트 REAL — `roleRank`(analyst+ `index.php:568`) · `requirePro`(catalog) · `requirePlan('admin')`(admin_growth) · 2인 정족수(Mapping only ⓑ §2) | 통과하나 **authority 판정 아님** |
| 동일 Tenant | `index.php:600` `X-Tenant-Id` 강제 · strict 기본 OFF(`:585`·ⓑ §7) | 부분 강제 |
| Self-approval | `Mapping.php:268` 차단(유일·나머지 3경로 미방어·ⓑ §8) | 부분 |
| Amount/Currency/Period Match | 🔴 금액축=`HIGH_VALUE_KRW` 상수(필요여부 boolean만·ⓑ §4) · 통화 스코프 0 · Period=마케팅 예산만(ⓑ §4 FLIP) | 축 부재 |
| Authority Version/Matrix Entry | 🔴 Authority/Matrix 엔티티 통째 부재 — `required_approvals` 유일 생산자=리터럴 `2`(`Mapping.php:209`·`Db.php:634`·ⓑ §1) | 선행 부재 |

★**§65 실재 gap 정합**: "Actor에게 Authority 없는데 승인 성공"·"Amount가 Limit 초과인데 승인 성공"이 현행에 **실재**한다(ⓑ §8) — 아무 analyst+/유료/admin 1~2인이 통과하고 high_value 는 필요여부만 켜고 한도 미집행.

## 1. 원문 전사 + 판정 — **원문 19종**(§46 기본 요구 · 측정기 `--sec=46` = 19불릿)

> ⚠️ 헤더는 "기본 자격 18요건"으로 세었으나 **측정기 실측 = 19불릿**(`Active Role·Position Assignment`·`허용된 Organization·Geography` 가 각각 복합 1불릿). 분모는 **측정기(19)** 를 정본으로 한다(육안 카운트 금지·ⓒ 규율).

| # | 원문 요건 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Active Canonical Identity | 인접 = `is_active TINYINT DEFAULT 1`(`Db.php:1106`) 계정 상태 · 🔴 canonical identity 개념 부재·authority 판독 미소비(5-3-3-2 §36) | `LEGACY_ADAPTER` |
| 2 | Active Employment 또는 허용된 External Actor | 🔴 `employment_state` grep **0**(고용 축 전역 0) · External Actor 인접=`api_key` 기계신원(`index.php:554`)이나 employment 대체 아님(ⓑ §3) | `ABSENT` |
| 3 | Active Role·Position Assignment | 🔴 role 자격 판독 정본 축 부재(`roleRank`↔`team_role` 매핑 0·완전 직교·ⓑ §3) · `position_state` grep **0** | `BLOCKED_PREREQUISITE` |
| 4 | 유효한 Authority Version | 🔴 Authority Version 엔티티 부재 — 불변 prev-링크 버전체인 선례 0(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `BLOCKED_PREREQUISITE` |
| 5 | 유효한 Matrix Entry | 🔴 Authority Matrix 부재 — `required_approvals` 유일 생산자=리터럴 `2`(`Mapping.php:209`·`Db.php:634`)·"DOA Matrix/ERP Authority Table 없다"(ⓑ §1) | `BLOCKED_PREREQUISITE` |
| 6 | 동일 Tenant | `index.php:600` `X-Tenant-Id` 강제 덮어쓰기 REAL · 🔴 strict fail-closed 기본 OFF(`:585` 옵트인·ⓑ §7) | `LEGACY_ADAPTER` |
| 7 | 허용된 Legal Entity | 🔴 Legal Entity 엔티티 0 — `biz_no`/`corp_reg`/`tax_id` grep 0(ⓑ Registry §12) | `ABSENT` |
| 8 | 허용된 Organization·Geography | 🔴 Organization 엔티티 실코드 0(스코프=tenant뿐) · Geography=`Geo`(IP→ISO)·country_code 는 **별개 스코프**(authority 지리 아님·ⓑ Registry §13) | `ABSENT` |
| 9 | Action Match | 🔴 Authority Action 스코프 부재 — 승인 대상 action 을 authority 범위와 대조하는 축 0(ⓑ §1·§6) | `ABSENT` |
| 10 | Resource Match | 인접 = `acl_permission` `scopeSql` 데이터-행 필터(`TeamPermissions.php:286`) — 🔴 authority 리소스 스코프 아님(장식·ⓑ Registry §14) | `LEGACY_ADAPTER` |
| 11 | Currency Match | 🔴 통화 스코프 0 — `currency_scope`/`allowed_currency` grep 0 · 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 12 | Amount Match | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW=5000000.0` 상수(승인 필요여부 boolean만·한도 미집행·`Catalog.php:1016`,`:1103-1105`·ⓑ §4) | `ABSENT` |
| 13 | Period Match | 인접 = `AutoCampaign.php:843-889` 기간 내 누적 지출 상한(`periodSpentToDate:855`) — 🔴 마케팅 예산 도메인·승인 워크플로 아님(ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 14 | Security Suspension 아님 | 인접 = `login_attempt.locked_until`(브루트포스 로그인 스로틀 잠금·`UserAuth.php:3335`,`:3370`) — 🔴 접속 스로틀이지 authority security-suspension 상태 아님(5-3-3-2 §36 "Suspension 개념 전역 0") | `LEGACY_ADAPTER` |
| 15 | Terminated 아님 | 🔴 `terminated`/`termination_policy` grep **0** — 종료 사유·시각·이력 컬럼 0(5-3-3-2 §36) | `ABSENT` |
| 16 | SoD Hook 통과 | 🔴 Segregation-of-Duties Hook 부재 — 직무분리 축 grep 0(ⓑ §6) | `ABSENT` |
| 17 | Conflict-of-interest Hook 통과 | 🔴 `conflict_of_interest` grep **0**("conflict" 60+ 히트는 전부 SQL `ON CONFLICT`/ad_schedule precedence·ⓑ §6) | `ABSENT` |
| 18 | Self-approval Policy 통과 | `Mapping.php:268` 자기승인 차단 — 🔴 **유일 방어**(catalog/action_request/admin_growth 3경로 미방어·ⓑ §2·§8) | `LEGACY_ADAPTER` |
| 19 | Runtime Authorization 통과 | 미들웨어 진입 게이트 REAL(`roleRank` analyst+ `index.php:568`·`requirePro`·`requirePlan('admin')`) — 🔴 **진입 통과이지 authority 자격 판정 아님**(ⓑ §2·§3) | `LEGACY_ADAPTER` |

**실측 개수: 19 / 19 전사** (측정기 `--sec=46` = 19).
커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7 · `BLOCKED_PREREQUISITE` 3 · `ABSENT` 9 · `NOT_APPLICABLE` 0 · `KEEP_SEPARATE_WITH_REASON` 0.

> 🔴 **커버 0.** 19요건 중 어느 것도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 7건은 현행 진입 게이트가 **부분적으로/우연히** 만지는 축(tenant 강제·self-approval 1경로·runtime 미들웨어 등)이지 §46 요건 충족이 아니다. `Active Role·Position`·`Authority Version`·`Matrix Entry` 3건은 자격 판독 정본 축(§45 `required role state`)·Authority/Matrix 엔티티 선행 부재로 `BLOCKED_PREREQUISITE`.

## 2. 원문 "기본 자격 19요건" 명기 + 현행 = 진입게이트만 통과

**원문(§46, verbatim)**: 기본적으로 다음을 요구한다 —
Active Canonical Identity · Active Employment 또는 허용된 External Actor · Active Role·Position Assignment · 유효한 Authority Version · 유효한 Matrix Entry · 동일 Tenant · 허용된 Legal Entity · 허용된 Organization·Geography · Action Match · Resource Match · Currency Match · Amount Match · Period Match · Security Suspension 아님 · Terminated 아님 · SoD Hook 통과 · Conflict-of-interest Hook 통과 · Self-approval Policy 통과 · Runtime Authorization 통과.

🔴 **현행 승인은 이 19요건 중 Runtime Authorization(진입 게이트)·동일 Tenant(부분)·Self-approval(1경로)만 만지고 나머지 16축은 판독조차 안 한다.** 승인 4경로의 "승인자" = **진입 게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))이며 Identity/Employment/Role·Position/Authority Version/Matrix/Legal Entity/Organization·Geography/Action/Resource/Currency/Amount/Period/Suspension/Terminated/SoD/Conflict 축은 **저장계층부터 부재**다(§45 Profile 실증). 따라서 §46 기본 자격은 **성립 자체가 BLOCKED_PREREQUISITE** — §45 자격 판독 축(`required role state`)과 Authority Version·Matrix Entry 를 선결해야 한다.

## 3. 규칙

- 🔴 **§46 을 "Runtime Authorization 통과로 충족"이라 오표기 금지** — 미들웨어 진입 게이트는 `LEGACY_ADAPTER`(REAL하나 authority 판정 아님)일 뿐, 나머지 16축을 대체하지 않는다. 이 오표기가 §65 "Actor에게 Authority 없는데 승인 성공" gap 의 근원이다(ⓑ §8, 실재 확인).
- 🔴 **Amount/Currency Match 를 `HIGH_VALUE_KRW` 상수로 충족했다고 표기 금지**(`ABSENT`) — high_value 는 필요여부 boolean 만 켜고 한도를 집행하지 않으며 통화 스코프는 0이다(ⓑ §4). §24 Amount Band 로 승격·상수 은퇴하되 신규 임계상수 추가 금지.
- 🔴 **`Active Role·Position`·`Authority Version`·`Matrix Entry`(BLOCKED_PREREQUISITE)를 신설 시 리터럴 상수로 재현하지 마라** — `required_approvals` 유일 생산자가 리터럴 `2`인 선례(ⓑ §1)를 반복하면 "요건 모델이 아니라 상수"가 된다. §45 Eligibility Profile 의 자격 판독 축을 선결로 배선하라.
- 🔴 **Security Suspension·Terminated·Period Match 의 인접(`login_attempt.locked_until`·`AutoCampaign` 예산)을 authority 축으로 승격 오용 금지** — 접속 스로틀·마케팅 예산 도메인은 별개다. Suspension/Termination 상태축·Authority Period 는 신설(중복 엔진 금지·기존 패턴 참조).
