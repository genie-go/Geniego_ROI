# DSAR — Approval Authority 중복 구현 감사 (§73)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 감사 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §73(2965-3000) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md)(§1·§2·§3·§4·§5) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
>
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=73` → **불릿 31 / 합계 31**(줄범위 2965-3002). 육안 금지·측정기 확정.

## 0. 한 문장 결론

🔴 **§73은 "중복 감사"이나 실측은 "중복이 아니라 부재"다.** 원문 31개 탐지항목이 겨냥하는 "여러 Authority Matrix / DOA Table / Approval Limit Table / Financial Threshold Table"는 **전부 0건**(ⓑ §1 grep 전수) — **통합할 동일 목적 Authority 자산이 존재하지 않는다.** 승인 4경로(mapping/catalog/action_request/admin_growth)는 스키마 4종이 전부 상이한 **상태머신**이지 중복된 Authority 구현이 아니다(ⓑ §2 마지막). 유일한 중복 후보 = 하드코딩 금액 상수 `HIGH_VALUE_KRW` **단 1건**(§73 "API Handler Amount 조건").

## 1. 현행 실측 (file:line)

| 축 | 실측 | 판정 |
|---|---|---|
| 여러 Authority Matrix / DOA / Limit / Threshold Table | `authority_matrix`·`doa_matrix`·`approval_limit`·`delegation_of_authority`·`manager_limit`·`job_grade` grep **0**(재실증 완료) · `required_approvals` 유일 생산자 = `Mapping.php:209`(INSERT 리터럴 `2`)+`Db.php:634`(`DEFAULT 2`) — **요건 모델이 아니라 상수**(ⓑ §1) | `NOT_APPLICABLE`(중복 대상 부재) |
| 유일 하드코딩 금액 조건 | `Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0`(PHP `const`) → `:1103` `$price>=self::HIGH_VALUE_KRW`→`requires_approval=true`. **승인 필요여부 boolean만 켠다**(=§73 "API Handler Amount 조건" 유일 실물) | `LEGACY_ADAPTER`(§24 Amount Band 승격 대상·재구현 금지) |
| 승인 4경로 스키마 상이 | `required_approvals`는 Mapping에만·`requested_by`는 action_request에 없음·`tenant_id`는 admin_growth에 없음(ⓑ §2) — **동일 목적 중복이 아님** | `KEEP_SEPARATE_WITH_REASON` |
| Deny / Manager Resolver / Email Mapping | explicit deny 표현 0(`acl_permission`=allow-only·ⓑ §6) · 상급자(사람) 반환 함수 0(`parent_user_id` 25개소 전량 owner/tenant 상속·ⓑ §3) · `email→authority` grep 0 | `ABSENT` |

★**엔티티 전체가 부재하므로 "중복 제거" 커버는 원천 불가.** 아래 31항목 전사는 각 탐지대상의 **부재 깊이 / 인접 자산**을 기록한다. `VALIDATED_LEGACY` = **0**(cover 0).

## 2. 원문 전사 + 판정 — **원문 31종**(측정기 확정)

| # | 원문 탐지항목(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | 여러 Authority Matrix | `authority_matrix` grep 0 — 존재 자체 0(ⓑ §1) → 복수 중복 무발동 | `NOT_APPLICABLE` |
| 2 | 여러 DOA Table | `doa_matrix`·`delegation_of_authority` grep 0(ⓑ §1) — DOA Table 0 | `NOT_APPLICABLE` |
| 3 | 여러 Approval Limit Table | `approval_limit`·`spending_limit` 등 한도 식별자 전량 0(ⓑ §1) | `NOT_APPLICABLE` |
| 4 | 여러 Financial Threshold Table | `amount_threshold`·`approval_threshold`·`amount_band` 0(ⓑ §4) | `NOT_APPLICABLE` |
| 5 | Role별 하드코딩 Limit | Role/등급별 Limit 식별자 0 · 인접 실물 = `HIGH_VALUE_KRW`(`Catalog.php:1016`)이나 **Role축 아님 = 가격 임계**(`:1103`·ⓑ §1·§4) | `LEGACY_ADAPTER` |
| 6 | Job Grade별 하드코딩 Limit | `job_grade_threshold`·`position_threshold` grep 0(ⓑ §1) — 등급축 자체 부재 | `NOT_APPLICABLE` |
| 7 | API Handler Amount 조건 | 🔴 유일 중복 후보 = `Catalog.php:1103` `$price>=HIGH_VALUE_KRW`→boolean(ⓑ §1 예외·§4). 테넌트 설정·버전·effective dating 원천 불가 | `LEGACY_ADAPTER` |
| 8 | Workflow 내부 Amount Branch | `required_approvals` = 고정상수 2(금액·건종류 무관·`Mapping.php:209`·`Db.php:634`) — 금액 분기 0(ⓑ §1) | `NOT_APPLICABLE` |
| 9 | BPMN 내부 Threshold | BPMN/워크플로 엔진 부재 · 승인=상태전이 UPDATE만(ⓑ §2) | `NOT_APPLICABLE` |
| 10 | Tenant별 JSON Limit | tenant별 JSON 한도 저장 0 · `approvals_json`={user,ts}뿐(`Mapping.php:285`·ⓑ §2) | `NOT_APPLICABLE` |
| 11 | Spreadsheet 전용 Authority | 스프레드시트 Authority 소스 0 | `NOT_APPLICABLE` |
| 12 | ERP와 Platform 이중 Authority | ERP Authority Table 0(ⓑ §1) — 이중 정의 무발동 | `NOT_APPLICABLE` |
| 13 | Subject별 직접 Authority 남용 | Subject Authority 개념 0 · "이 행위자가 승인할 권한" 판정 정본 축 부재(ⓑ §3 결론) | `NOT_APPLICABLE` |
| 14 | Current Authority만 저장 | 🔴 인접 실재 = **상태머신 패턴**: `app_user.agent_mode` 현재값만(`AdAdapters.php:45`) · `status` 전이(mapping/catalog/admin_growth) — **as-of 재구성 불가**(ⓑ §2·§5 Actor Snapshot ABSENT) | `LEGACY_ADAPTER` |
| 15 | Authority Version 없음 | 불변 prev-링크 버전체인 선례 0 · version 6컬럼 전부 하드코딩 태그(ⓑ §5) | `ABSENT` |
| 16 | Authority Snapshot 없음 | §55 Actor Authorization Snapshot ABSENT — 승인시점 권한/역할/플랜 미보존 3경로(ⓑ §5) | `ABSENT` |
| 17 | Currency Conversion 근거 없음 | 🔴 환율 저장계층 부재(`app_setting` KV 덮어쓰기·`rate_date` 컬럼 없음·`Connectors.php:1790`·ⓑ §4 §27) → 과거환율 근거 불가 | `ABSENT` |
| 18 | Legal Entity Scope 없음 | Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·Registry §1 #12) | `ABSENT` |
| 19 | Period Limit 없음 | ★FLIP 인접 실재 = `AutoCampaign.php:843-889` 기간 예산 상한(`periodSpentToDate:855`)이나 **마케팅 도메인·승인 아님**(ⓑ §4 §30) | `LEGACY_ADAPTER` |
| 20 | Utilization 계산 중복 | 🔴 중복 아님 — 누적차감 계산은 `AutoCampaign.php:855-856` **단일소스**(승인권한 축 아님·ⓑ §4 §31). 나머지 도메인 Utilization = 부재 | `LEGACY_ADAPTER` |
| 21 | Manager에게 자동 Authority | 🔴 Manager **Resolver ABSENT**(CONFIRM) — 상급자(사람) 반환 함수 0 · `parent_user_id` = owner/tenant 상속 전용(ⓑ §3) | `ABSENT` |
| 22 | Position Vacancy Actor 승인 | Position/incumbency(직위 재직) 개념 0 · 공석 대체 승인 로직 부재 | `ABSENT` |
| 23 | Expired Authority 승인 | 🔴 만료축 부재 — `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) → 만료 판정 불가 | `ABSENT` |
| 24 | Deny보다 Allow 우선 | 🔴 explicit deny 표현 자체가 없음 — `acl_permission`=allow-only(ⓑ §6·Registry §1 #15) → deny>allow 위반 무발동 | `ABSENT` |
| 25 | Threshold Gap | Threshold 밴드 복수 부재(고정상수 2·§4 밴드 0) → Gap은 미구현(gap 아님·ⓑ §8) | `NOT_APPLICABLE` |
| 26 | Threshold Overlap | 동일 — 복수 Threshold 0 → Overlap 무발동(ⓑ §8) | `NOT_APPLICABLE` |
| 27 | 동일 Decision에서 다른 Matrix 사용 | Matrix 0 · 복수 Matrix 없음 → 동일 결정 다중 Matrix 무발동 | `NOT_APPLICABLE` |
| 28 | Task Assignment 시 Authority 미검증 | Authority 검증 축 자체 부재(ⓑ §3) · Task Assignment 단계 승인권한 검증 0 | `ABSENT` |
| 29 | Decision 시 Authority 재검증 없음 | 결정 시점 재검증 축 부재 · 4경로 "승인자"=진입 게이트 통과자뿐(analyst+/requirePro/requirePlan·ⓑ §3 결론) | `ABSENT` |
| 30 | Role Name 문자열 Join | 🔴 실재 anti-pattern = `$roleRank` 문자열 등급(`index.php:554` viewer<connector<analyst<admin·판정축 HTTP메서드 `:568`) + `team_role` 문자열(owner>manager>member) **2축 분열·매핑 0**(ⓑ §3) | `LEGACY_ADAPTER` |
| 31 | Email 기반 Authority Mapping | `email→authority` grep 0 — 이메일 기반 권한 매핑 부재 | `ABSENT` |

**실측 개수: 31 / 31 전사(측정기 확정).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(#5·#7·#14·#19·#20·#30) · `KEEP_SEPARATE_WITH_REASON` 0 · `ABSENT` 11(#15·16·17·18·21·22·23·24·28·29·31) · `NOT_APPLICABLE` 14(#1·2·3·4·6·8·9·10·11·12·13·25·26·27).

> 🔴 **커버 0.** §73 "중복 감사"의 결론은 **"통합할 중복이 없다 = 부재"**. "여러 DOA / Matrix / Limit / Threshold Table" 전부 0(#1~#4·#6·#12) = **통합 대상 없음**. `LEGACY_ADAPTER` 6건은 확장 참조용 인접 자산(HIGH_VALUE_KRW·상태머신·AutoCampaign 페이싱·roleRank)이지 커버가 아니며, 어느 것도 §73이 겨냥한 "중복된 Authority 구현"이 아니다.

## 3. 규칙

- 🔴 **"중복 제거"로 오독하지 마라** — §73 탐지항목 대부분은 `NOT_APPLICABLE`(부재)다. 통합할 Authority 자산이 없으므로 5-3-3-3(§71 통합 16편)과 정반대로 **신설 명세**가 된다. "기존 4경로를 하나로 통합" = **전건 거짓**(스키마 4종 상이·ⓑ §2).
- 🔴 **유일 중복 후보 `HIGH_VALUE_KRW`를 새 임계상수로 복제하지 마라**(#5·#7) — `Catalog.php:1016` 상수를 §24 Amount Band(테넌트·버전·effective dating)로 **승격**하라. 신규 하드코딩 임계 추가 금지(§65 "Amount가 Limit 초과인데 승인 성공" gap 구조적 유발).
- 🔴 **상태머신을 Authority Version/Snapshot으로 착각하지 마라**(#14·#15·#16) — `agent_mode`/`status`는 **현재값만** 저장하는 상태 전이다. as-of 재구성이 필요하면 `SecurityAudit::verify()`(ⓑ §5) 확장이지 신규 해시체인 엔진 신설이 아니다. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **`AutoCampaign` 예산 페이싱(#19·#20)을 승인 Authority 한도로 재구현하지 마라** — 마케팅 도메인 실 로직(`:843-889`)이며 승인 워크플로가 아니다. Period Limit/Utilization 신설 시 계산 패턴만 참조(중복 엔진 금지).
- 🔴 **Role Name 문자열 판정(#30)을 확산하지 마라** — `roleRank`(api_key 기계 신원)와 `team_role`(사람 계층)이 이미 2축 분열(ⓑ §3)이다. Authority Binding 신설 시 문자열 Join을 추가하지 말고 권위 축을 선결하라.
