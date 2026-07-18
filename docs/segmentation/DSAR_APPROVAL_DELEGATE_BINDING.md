# DSAR — Approval Delegate Binding (§22 필수필드)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §22(1130-1153) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 짝 문서: [DSAR_APPROVAL_DELEGATOR_BINDING.md](DSAR_APPROVAL_DELEGATOR_BINDING.md)(§21) · ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(ⓓ 후속)

> **★분모: 필수필드 15 = §22 측정기 정합** (`measure_spec_denominator.mjs --sec=22` = 15 · 불릿 15 + 번호 0). 본 문서 = 필수필드 **15종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATE_BINDING` 엔티티 | `delegate_binding`·`approval_delegate` grep **0** — Delegation 개념 자체 부재(ⓑ §0·§1) → Delegate Binding 엔티티 통째 부재 | `NOT_APPLICABLE`(부재→신설) |
| 🔴 Delegator→Delegate 관계 엔티티 | **자체 부재(Manager Resolver ABSENT)** — 위임자→수임자 관계를 담을 엔티티가 없음(`TeamPermissions` 위임상한=member 절대 권한 매트릭스이지 관계 아님·ⓑ §2.1 표) · `parent_user_id`=최상위 owner로 붕괴(`UserAuth.php:156-157,1225-1227`·ⓑ §3.3) | `ABSENT`(관계 엔티티·Manager Resolver 부재) |
| Delegate 수락 절차 | 🔴 **수락(Acceptance) 개념 0** — 승인 4경로(mapping/catalog/action_request/admin_growth)에 수임자 수락 단계 없음 · `TeamPermissions:652` **manager 일방 치환**(수임자 동의 미수집·ⓑ §2.1 표·§2.2) | `ABSENT`(수락 절차 부재) |
| delegate subject 인접 | `app_user`(로그인 주체 테이블) = 유일 subject 저장소 · Canonical Identity/Subject Registry 엔티티 부재(ⓑ §3.3) | `LEGACY_ADAPTER`(app_user·확장 대상) |
| evidence 정본 | `SecurityAudit::verify():56-68`(tenant 포함 해시·preimage ts 저장·`hash_equals`+prev 교차·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |

★**Delegate Binding 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 판정은 사용 금지(커버 0).

## 1. 원문 전사 + 판정 — **필수필드 15종**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_delegate_binding_id | Delegate Binding 엔티티 부재 → PK 없음(ⓑ §0·§1) | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | 상위 Delegation Version 엔티티(§10) 부재 → FK 대상 없음(ⓑ §0·§1·§4 `CANONICAL_APPROVAL_DELEGATION_*` 18종 전량 ABSENT) | `NOT_APPLICABLE` |
| 3 | delegate_subject_id | 인접 = `app_user`(로그인 주체 테이블) — 유일 subject 저장소이나 Canonical Identity/Subject Registry 엔티티 부재(ⓑ §3.3) · 수임자 역할의 subject 참조는 아님 | `LEGACY_ADAPTER` |
| 4 | employment reference | 🔴 **Employment Record 엔티티 0**(재직 상태·고용형태 판독 축 부재·ⓑ §3.3) → 수임자 고용 참조 대상 없음 | `ABSENT` |
| 5 | role assignment reference | 🔴 Role Assignment 엔티티 0 — 역할은 `team_role` **flat enum 3값**(owner>manager>member)뿐(할당 이력·다중 역할·발효기간 없음·ⓑ §3.3) → 역할 할당 참조 대상 없음 | `ABSENT` |
| 6 | position reference | 🔴 Position Registry/Incumbency 엔티티 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) → 직위 참조 대상 없음 | `ABSENT` |
| 7 | organization reference | 🔴 Organization Unit/Hierarchy 엔티티 0(ⓑ §3.3) → 조직 참조 대상 없음 | `ABSENT` |
| 8 | legal entity reference | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0 · `business_number`=회사프로필 단일 문자열·법인 아님·ⓑ §3.3) → 법인 참조 대상 없음 | `ABSENT` |
| 9 | delegate eligibility profile | 🔴 §27 Delegate Eligibility 판독 축(Active Employment·Active Role/Position·최소 Job Level·Certification·SoD/CoI Hook) **전부 부재**(ⓑ §3.2·§3.3 Employment/Position/Job Level/Certification 0·§3.4 SoD/CoI grep 0) → 수임자 자격 프로파일 판독 원천 불가 | `BLOCKED_PREREQUISITE` |
| 10 | acceptance required 여부 | 🔴 Delegate 수락(§23) 개념 0 — 승인 4경로에 수락 단계 없음(ⓑ §2.1 표·§2.2) → 수락 필수 여부 저장 대상 없음 | `ABSENT` |
| 11 | accepted 여부 | 🔴 수락 절차 부재 — `TeamPermissions:652` manager 일방 치환(수임자 동의 미수집·ⓑ §2.1 표) → 수락 완료 플래그 저장 대상 없음 | `ABSENT` |
| 12 | acceptance reference | 🔴 §23 Delegation Acceptance 엔티티 부재(수락 이력·terms version·immutable hash 저장소 0·ⓑ §2.1·§4) → 수락 근거 참조 대상 없음 | `ABSENT` |
| 13 | conflict result | 🔴 §34 Delegation Conflict 엔티티 부재 · Conflict-of-interest Hook **grep 0**(ⓑ §3.4) · Delegate 자기권한↔위임권한 충돌 판독 축 없음 → 충돌 결과 산출 원천 불가 | `ABSENT` |
| 14 | status | 상태전이 관례는 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2·§3) · Delegate Binding 상태머신 부재 | `LEGACY_ADAPTER` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·tenant 해시 검증·prev_hash 교차·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3(3 delegate_subject_id·14 status·15 evidence) · `ABSENT` 9(4·5·6·7·8·10·11·12·13) · `BLOCKED_PREREQUISITE` 1(9) · `NOT_APPLICABLE` 2(1·2).

> 🔴 **커버 0.** Delegate Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건은 **확장 대상 인접 자산**(delegate_subject_id=`app_user` · evidence=`SecurityAudit::verify()`)이지 커버가 아니다. `ABSENT` 9건 중 5개(employment/role assignment/position/organization/legal entity reference)는 **§3.3 Identity·Organization Foundation 엔티티 부재**의 직접 귀결이고, 3개(acceptance required/accepted/acceptance reference)는 **Delegate 수락 절차 자체 부재**(승인 4경로에 수락 단계 0·manager 일방 치환·ⓑ §2.1·§2.2)의 귀결이며, conflict result 는 **§34 Delegation Conflict 엔티티·CoI Hook 부재**(ⓑ §3.4)의 귀결이다. delegate eligibility profile 1건은 §27 판독 축 부재로 `BLOCKED_PREREQUISITE`. 🔴**Delegator→Delegate 관계 엔티티 자체가 부재(Manager Resolver ABSENT·`parent_user_id` owner 붕괴·ⓑ §3.3)**하여 수임자를 위임자에 결속할 관계 저장소가 원천 없다.

## 2. 규칙

- 🔴 **Delegate Binding 은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — delegate_subject_id 는 `app_user` 를 확장(별도 subject 테이블 난립 금지) · evidence=`SecurityAudit::verify()` 확장(중복 해시엔진 금지).
- 🔴 **acceptance required/accepted/acceptance reference 를 기본 true·NULL 로 붕괴시키지 마라** — 현행은 수락 절차가 **아예 없어** manager 가 일방 치환(`TeamPermissions:652`)한다. §23 Delegation Acceptance(신설·수락 상태·terms version·immutable hash) 라이프사이클을 선행해야 하며, "수락 미수집=수락됨"으로 처리하면 §5.11 Decision 재검증·Decline 미활성화 원칙(스펙 §23 "Decline 한 Delegation 활성화 금지")을 구조적으로 위반한다.
- 🔴 **conflict result 를 "충돌 없음"으로 기본값 두지 마라** — §34 Delegation Conflict 엔티티·CoI Hook 이 부재(grep 0·ⓑ §3.4)하여 Delegate 자기권한↔위임권한 충돌(§5.5 Cross-Legal-Entity·§27 Self-delegation 금지)을 판독할 축이 없다. 판독 불가를 "무충돌"로 붕괴시키면 이해충돌 위임을 통과시킨다 — Fail-closed 를 상속하라.
- 🔴 **delegate eligibility profile 을 통과(적격)로 기본값 두지 마라** — §27 판독 축(Active Employment·최소 Job Level·Certification·SoD/CoI Hook·Terminated 아님)이 전부 부재(ⓑ §3.2·§3.3·§3.4). 판독 불가 상태를 "적격"으로 붕괴시키면 무자격 수임자를 통과시킨다.
- 🔴 **employment/role assignment/position/organization/legal entity reference 를 "있음"으로 표기 금지** — §3.3 Identity·Organization Foundation(Employment Record·Role Assignment·Position·Org Unit·Legal Entity) 신설이 **선행**돼야 채울 수 있으며, `team_role` flat enum 을 role assignment 로 오매핑하지 마라(§21 Delegator Binding 규칙과 동일 함정).
