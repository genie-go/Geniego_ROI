# DSAR — Approval Delegation Candidate (§28)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §28 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · Exclusion enum: [DSAR_APPROVAL_DELEGATION_CANDIDATE_EXCLUSION_REASON.md](DSAR_APPROVAL_DELEGATION_CANDIDATE_EXCLUSION_REASON.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=28` → **§28 = 39**(줄범위 1297-1344 · 불릿 39 · 번호 0). 분할 = **필수필드 39**(하위 ENUM 없음 · Exclusion enum 은 §29 별도 문서2).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_CANDIDATE` 엔티티 | `delegation_candidate`·`delegate_candidate` grep **0** — 위임 후보(Approval 참여자를 Delegate 로 치환할 후보) 도출 개념 부재(ⓑ §1·§4) | `NOT_APPLICABLE`(부재→신설) |
| 🔴 후보 도출 파이프라인 | Delegation 자체가 없어 **후보 산출기 전무** — 승인자=진입게이트 통과자 본인(mapping `:238-291`·catalog `:2341-2364`·admin_growth `:1330`)이며 "원 참여자→위임 후보" 치환 로직 0(ⓑ §2.2) | `ABSENT` |
| 후보 상단 참조(Approval Request/Case/Item/Requirement/Chain Resolution/Level) | 🔴 범용 Approval 테이블·핸들러 **0**(5-3-2/5-3-3-3 커버 0.00%·`docs/approval/` 16편=계약 명세뿐·ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 후보 중단 참조(Authority Definition/Version/Matrix Entry) | 🔴 **Approval Authority 개념 전면 부재**(5-3-3-4·`authority_matrix`·`approval_authority`·`amount_band` grep 0·ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| Subject 참조(Delegator/Delegate/Original Participant) | 인접 = `app_user`(`UserAuth.php:41,156` tenant/`parent_user_id`) — Subject Registry 아님·Manager/Reporting-Line Resolver ABSENT(`UserAuth.php:156-157,1225-1227` owner 붕괴·ⓑ §3.3) | `LEGACY_ADAPTER`(app_user 인접) |

★**엔티티 전체가 부재하고 그 상단(Approval)·중단(Authority) 선행조건마저 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이/선행 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 39종**(필수 필드 39 · 하위 ENUM 없음)

### 필수 필드 (39)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_candidate_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_request_id | 🔴 Approval Request 범용 테이블 **0**(5-3-2 커버 0·단발 플래그 3종만·ⓑ §3.1) → FK 대상 부재 | `BLOCKED_PREREQUISITE` |
| 3 | approval_case_id | 🔴 Approval Case 부재(5-3-2 커버 0·ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 4 | approval_item_id | 🔴 Approval Item 부재 | `BLOCKED_PREREQUISITE` |
| 5 | approval_requirement_id | 🔴 Approval Requirement 부재 | `BLOCKED_PREREQUISITE` |
| 6 | approval_chain_resolution_id | 🔴 Approval Chain Resolution 부재(5-3-3-3 커버 0.00%·ⓑ §3.1) | `BLOCKED_PREREQUISITE` |
| 7 | approval_chain_resolution_level_id | 🔴 Chain Resolution Level 부재 → 후보가 어느 승인 레벨을 치환하는지 앵커 없음 | `BLOCKED_PREREQUISITE` |
| 8 | original participant subject id | 인접 = `app_user`(`UserAuth.php:41`) — 원 승인 참여자=진입게이트 통과 actor 본인(mapping `:238-291`·catalog `:2341-2364`·admin_growth `:1330`·ⓑ §2.2)·Subject Registry 아님 | `LEGACY_ADAPTER` |
| 9 | delegator subject id | 인접 = `app_user`(`UserAuth.php:41,156`) — 🔴 Manager/Reporting-Line Resolver ABSENT(`UserAuth.php:156-157,1225-1227` parent_user_id owner 붕괴·ⓑ §3.3)·"원 권한자→위임자" 관계 산출 불가 | `LEGACY_ADAPTER` |
| 10 | delegate subject id | 인접 = `app_user`(`UserAuth.php:41`) — 위임 대상 Subject 참조 저장계층 = 느슨한 user row·관계 엔티티 부재(ⓑ §2.1) | `LEGACY_ADAPTER` |
| 11 | delegation definition id | Delegation Definition(§9) 엔티티 부재(문서 [DSAR_APPROVAL_DELEGATION_DEFINITION.md]) → FK 대상 없음 | `NOT_APPLICABLE` |
| 12 | delegation version id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 13 | delegation type | Delegation Type(§8) 엔티티 부재 → 타입 카탈로그 미시드 | `NOT_APPLICABLE` |
| 14 | authority definition id | 🔴 Approval Authority Definition 부재(5-3-3-4·`approval_authority` grep 0·ⓑ §3.2) → 참조 대상 없음 | `BLOCKED_PREREQUISITE` |
| 15 | authority version id | 🔴 Authority Version 부재(불변 prev-링크 버전체인 0) | `BLOCKED_PREREQUISITE` |
| 16 | matrix entry id | 🔴 Approval Authority Matrix Entry 부재(`authority_matrix` grep 0·5-3-3-4) | `BLOCKED_PREREQUISITE` |
| 17 | action | Delegation Action Binding(§14) 부재·Authority Action 축 부재 → 후보 액션 차원 저장계층 0 | `ABSENT` |
| 18 | resource | Delegation Resource Binding(§13) 부재 → 리소스 스코프 후보 차원 0 | `ABSENT` |
| 19 | organization | 🔴 Organization Unit/Hierarchy 엔티티 **부재**(5-3-3-1 확정·ⓑ §3.3) → 조직 차원 0 | `ABSENT` |
| 20 | legal entity | 🔴 Legal Entity 전면 void(`biz_no`·`corp_reg`·`tax_id` grep 0·회사프로필 단일 문자열·ⓑ §3.3) | `ABSENT` |
| 21 | geography | 인접 = `Geo`(`Geo.php` IP→ISO→언어)·TikTok country_code — **Authority 지리 스코프 아님**(장식·ⓑ §3.3) | `KEEP_SEPARATE_WITH_REASON` |
| 22 | original amount | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW = 5000000.0` 상수(`Catalog.php:1016`·boolean 게이트 `:1103`)·금액 밴드 저장계층 0(ⓑ §3.2) | `LEGACY_ADAPTER` |
| 23 | original currency | 🔴 통화 스코프 0 · 환율 저장계층 부재(다중통화 위임 축 없음·ⓑ §3.2) | `ABSENT` |
| 24 | delegated amount ceiling | 🔴 Original Authority Ceiling 부재(Authority 선행 부재) → 위임 상한 산출·검증 불가·§65 "Amount>Limit 인데 승인 성공" 유발 | `BLOCKED_PREREQUISITE` |
| 25 | delegated currency scope | 🔴 통화 스코프 0 → 위임 통화 범위 미표현 | `ABSENT` |
| 26 | period match | 🔴 Effective dating 부재(`valid_to`/`effective_to` grep 0)·Delegation Period(§20) 엔티티 부재 → 기간 일치 판정 계층 0 | `ABSENT` |
| 27 | scope match | Delegation Scope(§11) 엔티티 부재 → 스코프 일치 판정 계층 0 | `ABSENT` |
| 28 | authority match | 🔴 Authority Resolution 부재(5-3-3-4·ⓑ §3.2) → 권한 일치 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 29 | eligibility result | 🔴 Delegation Eligibility Profile(§25) 부재·SoD/CoI Hook grep 0(ⓑ §3.4) → 적격 판정 무발동 | `ABSENT` |
| 30 | acceptance result | 🔴 Delegate 수락 개념 0(승인 4경로 전부 수락 단계 없음·ⓑ §2.2) → 수락 결과 무발동 | `ABSENT` |
| 31 | approval result | 🔴 위임 승인 정책 0(`admin_growth_approval`=단일결정·`catalog_writeback_approval`=고아·ⓑ §3.1) | `ABSENT` |
| 32 | conflict result | 🔴 Delegation Conflict(§34) 부재 — 복수 위임 동시성 검출 로직 0 | `ABSENT` |
| 33 | cycle result | 🔴 Delegation Cycle 검출 부재(`PM/Dependencies:79-100`·`AdminMenu::wouldCycle:540-555`=PM/메뉴 도메인·Delegation Chain 아님·ⓑ §2.4) | `ABSENT` |
| 34 | depth result | 🔴 재위임 깊이 거버넌스 부재(`redelegation`/`delegated_ceiling` 복합어 grep 0·ⓑ §2.1) | `ABSENT` |
| 35 | priority | 🔴 Delegation Priority(§32) 부재 — 복수 후보 우선순위 해석기 0 | `ABSENT` |
| 36 | exclusion reasons | §29 Exclusion enum 36종 미시드(문서2 [DSAR_APPROVAL_DELEGATION_CANDIDATE_EXCLUSION_REASON.md]) → 제외 사유 계층 0 | `ABSENT` |
| 37 | proposed 여부 | 후보 제안(proposed) 상태 개념 0 — 후보 도출 파이프라인 자체 부재 | `ABSENT` |
| 38 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 39 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 39 / 39 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `BLOCKED_PREREQUISITE` 11 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 17 · `NOT_APPLICABLE` 4.

> 🔴 **커버 0.** Candidate 엔티티가 통째로 부재하고 그 상단(Approval)·중단(Authority) 선행조건마저 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건(original participant/delegator/delegate subject=app_user·original amount=HIGH_VALUE_KRW·status=상태전이·evidence=SecurityAudit)은 **확장 대상 인접 자산**이지 커버가 아니다 — subject 3필드가 가리키는 실체는 관계 엔티티가 아니라 **느슨한 `app_user` row**이며 Manager Resolver ABSENT 로 "원 참여자→위임자→위임대상" 관계를 산출할 수 없다. `BLOCKED_PREREQUISITE` 11건은 **선행 Approval(§3.1)·Authority(§3.2) 신설 전 판정 자체 불가**다.

## 2. 규칙

- 🔴 **Candidate 는 후보 "도출 파이프라인"이지 후보 테이블 하나가 아니다** — 원문 §28 는 Approval Request/Case/Item/Requirement/Chain Resolution/Level(2~7) 을 앵커로 원 참여자(8)를 Delegate(10)로 치환할 **후보를 산출**한다. 이 앵커 6종이 전부 `BLOCKED_PREREQUISITE`(Approval 커버 0.00%·5-3-2/5-3-3-3)이므로 **후보 도출은 선행 Approval Foundation 신설 후에만 성립**한다. 앵커 없이 후보를 채우면 "치환 대상 승인 참여자"가 없는 허공 후보가 된다.
- 🔴 **`delegator/delegate/original participant subject id` 를 `app_user`/`parent_user_id` 로 직결하지 마라** — `app_user`(`UserAuth.php:41`)는 느슨한 user row 이고 `parent_user_id` 는 owner/tenant 로 붕괴(Manager Resolver ABSENT·`UserAuth.php:156-157,1225-1227`). Subject Registry·Reporting-Line Resolution(§3.3) 신설이 **선행**돼야 3주체 관계가 산출된다. LEGACY_ADAPTER 는 "app_user 를 확장 참조"라는 뜻이지 subject 관계가 존재한다는 뜻이 아니다.
- 🔴 **`authority definition/version id`·`matrix entry id`·`authority match`·`delegated amount ceiling` 를 "구현됨"으로 표기 금지** — 이양·비교할 Approval Authority 자체가 부재다(5-3-3-4·`authority_matrix`/`amount_band` grep 0). Authority Foundation(§3.2) 선설 전에는 5종 전부 `BLOCKED_PREREQUISITE` 이며, 임의로 채우면 §5.2 "Delegate 가 Original Authority 를 초과" 무게이트 위임·§65 "Amount>Delegated Limit 인데 승인 성공" 을 구조적으로 유발한다.
- 🔴 **result 6필드(eligibility/acceptance/approval/conflict/cycle/depth)·`priority`·`proposed`·`exclusion reasons` 를 채우지 마라** — 적격/수락/승인/충돌/순환/깊이 판정 계층이 저장·훅부터 부재(SoD/CoI Hook grep 0·수락 개념 0·Cycle 검출은 PM/메뉴 도메인·ⓑ §2.4·§3.4)이므로 전부 `ABSENT`. 우연한 부재를 "제외 사유 없음(적격)"으로 오독하지 마라(우연한 부재≠준수·§58 ⑦).
- 🔴 **`geography` 를 `Geo`(IP→ISO) 로 매핑하지 마라** — `Geo.php` 는 접속 지역/언어 판별이지 Authority 지리 스코프가 아니다(KEEP_SEPARATE_WITH_REASON·중복 엔진 금지). `evidence` 는 `SecurityAudit::verify()` 확장이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]).
