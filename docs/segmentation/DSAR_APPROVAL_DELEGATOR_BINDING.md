# DSAR — Approval Delegator Binding (§21 필수필드)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §21(1108-1129) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(ⓓ 후속)

> **★분모: 필수필드 13 = §21 측정기 정합** (`measure_spec_denominator.mjs --sec=21` = 13 · 불릿 13 + 번호 0). 본 문서 = 필수필드 **13종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATOR_BINDING` 엔티티 | `delegator_binding`·`approval_delegator` grep **0** — Delegation 개념 자체 부재(ⓑ §0·§1) → Delegator Binding 엔티티 통째 부재 | `NOT_APPLICABLE`(부재→신설) |
| 🔴 Delegator→Delegate 관계 엔티티 | **자체 부재** — `TeamPermissions` 위임상한은 member 절대 권한 매트릭스(menu×action)이지 위임자→수임자 **관계 엔티티가 아님**(ⓑ §2.1 표) · `parent_user_id`=최상위 owner로 붕괴(`UserAuth.php:156-157,1225-1227`·**Manager Resolver ABSENT**·ⓑ §3.3) | `ABSENT`(관계 엔티티·Manager Resolver 부재) |
| delegator subject 인접 | `app_user`(로그인 주체 테이블) = 유일 subject 저장소 · Canonical Identity/Subject Registry 엔티티 부재(ⓑ §3.3 선행조건 미충족) | `LEGACY_ADAPTER`(app_user·확장 대상) |
| evidence 정본 | `SecurityAudit::verify():56-68`(`:27` tenant 포함 해시·`:31` preimage ts 저장·`:63` 재계산·`:64` `hash_equals`+prev 교차·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지(preimage ts 소실·verify() 0·[[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |

★**Delegator Binding 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 판정은 사용 금지(커버 0).

## 1. 원문 전사 + 판정 — **필수필드 13종**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_delegator_binding_id | Delegator Binding 엔티티 부재 → PK 없음(ⓑ §0·§1) | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | 상위 Delegation Version 엔티티(§10) 부재 → FK 대상 없음(ⓑ §0·§1·§4 `CANONICAL_APPROVAL_DELEGATION_*` 18종 전량 ABSENT) | `NOT_APPLICABLE` |
| 3 | delegator_subject_id | 인접 = `app_user`(로그인 주체 테이블) — 유일 subject 저장소이나 Canonical Identity/Subject Registry 엔티티 부재(ⓑ §3.3) · 위임자 역할의 subject 참조는 아님 | `LEGACY_ADAPTER` |
| 4 | employment reference | 🔴 **Employment Record 엔티티 0**(재직 상태·고용형태 판독 축 부재·ⓑ §3.3) → 위임자 고용 참조 대상 없음 | `ABSENT` |
| 5 | role assignment reference | 🔴 Role Assignment 엔티티 0 — 역할은 `team_role` **flat enum 3값**(owner>manager>member)뿐(할당 이력·다중 역할·발효기간 없음·ⓑ §3.3) → 역할 할당 참조 대상 없음 | `ABSENT` |
| 6 | position reference | 🔴 Position Registry/Incumbency 엔티티 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) → 직위 참조 대상 없음 | `ABSENT` |
| 7 | organization reference | 🔴 Organization Unit/Hierarchy 엔티티 0(ⓑ §3.3) → 조직 참조 대상 없음 | `ABSENT` |
| 8 | legal entity reference | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0 · `business_number`=회사프로필 단일 문자열·법인 아님·ⓑ §3.3) → 법인 참조 대상 없음 | `ABSENT` |
| 9 | original authority references | 🔴 Authority 개념 부재(`authority_matrix`·`approval_authority`·`amount_band` grep 0·유일 금액조건 `Catalog.php:1016` HIGH_VALUE_KRW 상수·ⓑ §3.2) → 이양할 원본 권한 단위 미정의 | `BLOCKED_PREREQUISITE` |
| 10 | original authority resolution references | 🔴 **Authority Resolution 부재**(5-3-3-4 "레포에 Approval Authority 개념 없음"·§72 Canonical Entity 전량 ABSENT·ⓑ §3.2) → 위임 시점 원본 권한 해석 참조 산출 불가 | `BLOCKED_PREREQUISITE` |
| 11 | delegator eligibility result | 🔴 §26 Delegator Eligibility 판독 축(Active Employment·Active Role/Position·Active Original Authority·SoD/CoI Hook) **전부 부재**(ⓑ §3.2 Authority ABSENT·§3.3 Org/Position/Employment 0·§3.4 SoD/CoI grep 0) → 자격 결과 산출 원천 불가 | `BLOCKED_PREREQUISITE` |
| 12 | status | 상태전이 관례는 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2·§3) · Delegator Binding 상태머신 부재 | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·tenant 해시 검증·prev_hash 교차·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지(검증 불가능한 장식·[[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3(3 delegator_subject_id·12 status·13 evidence) · `ABSENT` 5(4·5·6·7·8) · `BLOCKED_PREREQUISITE` 3(9·10·11) · `NOT_APPLICABLE` 2(1·2).

> 🔴 **커버 0.** Delegator Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건은 **확장 대상 인접 자산**(delegator_subject_id=`app_user` · evidence=`SecurityAudit::verify()`)이지 커버가 아니다. `ABSENT` 5건(employment/role assignment/position/organization/legal entity reference)은 **Employment Record·Role Assignment·Position·Org Unit·Legal Entity 엔티티 부재**(ⓑ §3.3)의 직접 귀결이며, `BLOCKED_PREREQUISITE` 3건(original authority references/resolution references·delegator eligibility result)은 **Approval Authority 개념·Authority Resolution 부재**(ⓑ §3.2)의 선행조건 미충족이다. 🔴**Delegator→Delegate 관계 엔티티 자체가 부재**하며, `parent_user_id`는 최상위 owner로 붕괴하여 **Manager Resolver 가 ABSENT**(ⓑ §3.3)이다.

## 2. 규칙

- 🔴 **Delegator Binding 은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — delegator_subject_id 는 `app_user` 를 확장(별도 subject 테이블 난립 금지) · evidence=`SecurityAudit::verify()` 확장(중복 해시엔진 금지).
- 🔴 **employment/role assignment/position/organization/legal entity reference 를 "있음"으로 표기 금지** — 판독 대상 엔티티(Employment Record·Role Assignment·Position·Org Unit·Legal Entity)가 **저장계층부터 부재**다(ⓑ §3.3). 이 5개 참조를 채우려면 §3.3 Identity·Organization Foundation 신설이 **선행**돼야 하며, 우연히 `team_role` flat enum 을 role assignment 로 오매핑하지 마라(할당 이력·발효기간 없음).
- 🔴 **original authority references/resolution references 를 임의 값으로 채우지 마라** — 이양할 원본 권한 단위 자체가 미정의(Authority 개념·Resolution 부재·ⓑ §3.2). §3.2 Authority Foundation(Registry/Matrix/Binding/Resolution/Snapshot) 신설이 **선행**돼야 위임 대상 권한을 참조할 수 있다. 근거 없는 권한 참조는 §5.2 "Delegate 는 Delegator 실보유 Scope 안에서만" 원칙을 구조적으로 위반한다.
- 🔴 **delegator eligibility result 를 통과(true)로 기본값 두지 마라** — §26 Delegator Eligibility 판독 축(Active Original Authority·SoD/CoI Hook·Security Suspension)이 전부 부재(ⓑ §3.2·§3.4). 판독 불가 상태를 "적격"으로 붕괴시키면 무자격 위임자를 통과시킨다 — Fail-closed(판독 불가=부적격) 원칙을 상속하라.
- 🔴 **`parent_user_id` 를 Manager/Reporting-Line 근거로 오용하지 마라** — 25개 판독자 전량이 최상위 owner/tenant 로 붕괴(상급자 반환 0·`UserAuth.php:156-157,1225-1227`·ⓑ §3.3). Delegator→Delegate 관계는 §3.3 Reporting Line·Manager Relationship 신설을 선행해야 한다.
