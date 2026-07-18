# DSAR — Approval Delegation Version (§10 필수필드)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §10(733-813) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · ADR: `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(ⓓ 후속)

> **★분할 분모: 필수필드 31 + Version Type 19 + 상태 16 = 66 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 66 · 필수필드 **31**[본 문서] + Version Type 19[[VERSION_TYPE](DSAR_APPROVAL_DELEGATION_VERSION_TYPE.md)] + status 16[[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)]). 본 문서 = 필수필드 **31종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_VERSION` 엔티티 | `delegation_version`·`approval_delegation_version` grep **0** — Delegation 개념 자체 부재(ⓑ §0·§1) → 버전 엔티티 통째 부재 | `NOT_APPLICABLE`(부재→신설) |
| 불변 버전체인 선례 | 🔴 version 6컬럼 전부 하드코딩/서술 태그·불변 prev-링크 append-only 버전체인 선례 **0**(ⓑ §2.5 대비·5-3-3-4 §5) — `risk_model_registry`가 근접하나 UPDATE-mutable | `ABSENT`(불변 prev-링크 버전체인 선례 0) |
| immutable_hash/evidence 정본 | `SecurityAudit::verify():56-68`(`:27` tenant 포함 해시·`:31` preimage ts 저장·`:63` 재계산·`:64` `hash_equals`+prev 교차·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지(preimage ts 소실·verify() 0·[[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |
| Delegator/Delegate/Authority/Legal Entity 스냅샷 전제 | 🔴 Delegation·Authority·Legal Entity 엔티티 전부 부재(ⓑ §3.2 Authority ABSENT·§3.3 Org/Legal Entity void·Manager Resolver ABSENT) → 승인시점 스냅샷 저장 대상 자체 없음 | `ABSENT` |

★**버전 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 판정은 사용 금지(커버 0).

## 1. 원문 전사 + 판정 — **필수필드 31종**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_delegation_version_id | 버전 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_definition_id | 상위 Delegation Definition 엔티티(§9) 부재 → FK 대상 없음(ⓑ §0·§1) | `NOT_APPLICABLE` |
| 3 | version_number | version 6컬럼 전부 하드코딩/서술 태그 — 단조 증가 버전 번호 실체 없음(ⓑ §2.5 대비) | `ABSENT` |
| 4 | previous_version_id | 🔴 **불변 prev-링크 버전체인 선례 0** · `risk_model_registry`가 근접하나 UPDATE-mutable(prev 링크 아님) | `ABSENT` |
| 5 | version_type | 아래 Version Type 19종 전부 NOT_APPLICABLE(→[VERSION_TYPE](DSAR_APPROVAL_DELEGATION_VERSION_TYPE.md)) · 버전 엔티티 부재 | `NOT_APPLICABLE` |
| 6 | change_summary | 버전 엔티티 서술 필드 → 부재 | `NOT_APPLICABLE` |
| 7 | delegator_snapshot | 🔴 Delegator 엔티티 부재(§21 Delegator Binding ABSENT) · Manager Resolver ABSENT(`parent_user_id` 최상위 owner 붕괴 `UserAuth.php:156-157,1225-1227`·ⓑ §3.3) → 위임자 스냅샷 저장 대상 없음 | `ABSENT` |
| 8 | delegate_snapshot | 🔴 Delegate 엔티티 부재(§22 Delegate Binding ABSENT·ⓑ §3.3) → 수임자 스냅샷 저장 대상 없음 | `ABSENT` |
| 9 | authority scope snapshot | 🔴 Authority 개념 부재(`authority_matrix`·`approval_authority` grep 0·유일 금액조건 `Catalog.php:1016` HIGH_VALUE_KRW 상수·ⓑ §3.2) → 권한 스코프 스냅샷 원천 불가 | `ABSENT` |
| 10 | organization scope snapshot | 🔴 Organization Unit/Hierarchy 엔티티 0(ⓑ §3.3) → 조직 스코프 스냅샷 원천 불가 | `ABSENT` |
| 11 | legal entity scope snapshot | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0 · `business_number`=회사프로필 단일 문자열·법인 아님·ⓑ §3.3) → 법인 스코프 스냅샷 원천 불가 | `ABSENT` |
| 12 | resource scope snapshot | Resource Registry 엔티티 부재(§3.3 선행조건 미충족) · Authority Resource Scope 없음(ⓑ §3.2) → 리소스 스코프 스냅샷 원천 불가 | `ABSENT` |
| 13 | action scope snapshot | Action Scope 엔티티 부재(승인 4경로에 액션 위임 분해 0·ⓑ §2.2) → 액션 스코프 스냅샷 원천 불가 | `ABSENT` |
| 14 | monetary scope snapshot | 🔴 금액축 부재 — 유일 금액조건 = `Catalog.php:1016` HIGH_VALUE_KRW **PHP 상수**(테넌트 설정·버전·effective dating 원천 불가·ⓑ §3.2) · snapshot 저장 0 | `ABSENT` |
| 15 | currency scope snapshot | 🔴 통화 스코프 0 · 환율 저장계층 부재(ⓑ §3.2 monetary 부재의 귀결) → 통화 스코프 스냅샷 원천 불가 | `ABSENT` |
| 16 | period snapshot | 🔴 Delegation Period(§20) 부재 · effective dating 저장 없음 · `acl_permission` 위임상한은 **기간 컬럼 부재**(영구·ⓑ §2.1 표) → 기간 스냅샷 원천 불가 | `ABSENT` |
| 17 | re-delegation snapshot | 🔴 재위임 개념 0(`redelegation`/`delegated_ceiling` 복합어 grep 0·`acl_permission`에 member 재부여 경로 0·ⓑ §2.1 표) → 재위임 스냅샷 저장 대상 없음 | `ABSENT` |
| 18 | acceptance snapshot | 🔴 Delegate 수락(§23) 개념 0 — 승인 4경로에 수락 단계 없음(manager 일방 치환 `TeamPermissions:652`·ⓑ §2.1 표·§2.2) → 수락 스냅샷 원천 불가 | `ABSENT` |
| 19 | approval snapshot | 🔴 Delegation 승인(§24) 라이프사이클 부재 — 승인자=진입 게이트 통과 actor 본인(대리/on-behalf 미기록·ⓑ §2.2) → 승인 스냅샷 원천 불가 | `ABSENT` |
| 20 | affected active cases | 참조 대상 Approval Case(§3.1) 엔티티 부재(범용 승인 테이블·핸들러 0·ⓑ §3.1) → 영향 케이스 집합 열거 불가 | `NOT_APPLICABLE` |
| 21 | affected active tasks | 버전→진행 결재 태스크 연결 없음 · `action_request` 생산자 0(죽은 파이프라인) · Task Assignment 미구현(§0 상세제외·ⓑ §2.2) | `NOT_APPLICABLE` |
| 22 | effective_from | 🔴 Delegation Period(§20) 부재 → 위임 시작시각 저장 대상 없음 · 인접 `kr_fee_rule.effective_from`(수수료 open-interval·`Db.php:898`)은 **도메인 상이**(위임 엔티티엔 없음·ⓑ §2 대비) | `ABSENT` |
| 23 | effective_to | 🔴 `effective_to`·`valid_to` grep **0**(오탐 제외) · 위임 종료 폐구간 저장 대상 없음 → 신규 | `ABSENT` |
| 24 | created_by | 인접 = `created_by` 관례 컬럼 다수 핸들러 실재(`AdminGrowth`·`AgencyPortal`·`TeamPermissions`·`PM\Tasks` 등) — 작성자 기록 관례는 있으나 Delegation 버전 작성자 아님 | `LEGACY_ADAPTER` |
| 25 | reviewed_by | 🔴 Review 단계 미분화 **ABSENT** — 승인 4경로에 검토자(reviewer) 컬럼·단계 0 · Delegation 승인 라이프사이클 자체 부재(ⓑ §2.2·§3.1) | `ABSENT` |
| 26 | approved_by | 🔴 Delegation Approval(§24) 라이프사이클 부재 · 인접 raw 승인자 id(`Mapping` approvals_json.user·`admin_growth.decided_by`)는 진입 게이트 통과자이지 위임 승인자 아님(ⓑ §2.2) | `ABSENT` |
| 27 | activated_at | 버전 활성화 이벤트 부재(버전 상태머신 부재·→[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)) → 활성화 시각 원천 없음 | `NOT_APPLICABLE` |
| 28 | immutable_hash | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·preimage ts 저장·검증기·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지(검증 불가능한 장식·[[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 29 | migration policy | 🔴 이행 집행수단 부재 — `backend/migrations/` 172정지 · `ensureTables` 자가치유는 백필 없음 · 버전 엔티티 부재로 이행 대상 없음(ⓑ §3 선행조건 미충족) | `ABSENT` |
| 30 | status | 참조 대상 버전 상태 16종 전부 NOT_APPLICABLE(→[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)) · 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2·§3) | `NOT_APPLICABLE` |
| 31 | evidence | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·tenant 해시 검증·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 31 / 31 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3(24 created_by·28 immutable_hash·31 evidence) · `ABSENT` 20(3·4·7·8·9·10·11·12·13·14·15·16·17·18·19·22·23·25·26·29) · `NOT_APPLICABLE` 8(1·2·5·6·20·21·27·30).

> 🔴 **커버 0.** 버전 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건은 **확장 대상 인접 자산**(immutable_hash/evidence=`SecurityAudit::verify()` · created_by=관례 컬럼)이지 커버가 아니다. `ABSENT` 20건 중 13개 스냅샷/스코프 계열(delegator/delegate/authority/org/legal entity/resource/action/monetary/currency/period/re-delegation/acceptance/approval)은 **Delegation·Authority·Legal Entity 엔티티 부재**(ⓑ §3.2·§3.3)의 직접 귀결이며, effective_from/to·reviewed_by/approved_by 는 **Delegation Period·승인 라이프사이클 부재**(ⓑ §2.2)의 귀결이다.

## 2. 규칙

- 🔴 **버전은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — immutable_hash/evidence=`SecurityAudit::verify()` 확장 · created_by=관례 컬럼 참조 · effective 축은 `kr_fee_rule.effective_from` 질의계층(`WHERE effective_from<=:as_of`) 패턴 참조. **중복 해시엔진·중복 dating 계층 금지.**
- 🔴 **`previous_version_id` 를 UPDATE-mutable 컬럼으로 두지 마라** — `risk_model_registry`가 근접하나 in-place 변경 가능. 불변 prev-링크 append-only 체인으로 신설하고, `SecurityAudit` prev_hash 교차검증 패턴을 상속하라.
- 🔴 **13개 스냅샷/스코프 필드를 "있음"으로 표기 금지** — Delegator/Delegate/Authority/Legal Entity/Monetary/Currency/Period 스냅샷은 **저장 대상 엔티티부터 부재**다(ⓑ §3.2·§3.3). 스냅샷 없이 버전만 매기면 §55 "Decision 당시 Delegation Version 재현 불가"(스펙 §5.12) gap 을 구조적으로 상속한다. 실 스냅샷은 §3 선행조건(Authority/Chain/Org/Legal Entity/Position) 신설이 **선행**돼야 가능하다.
- 🔴 **`effective_from`/`effective_to` 는 저장계층부터 신규다**(effective_to grep 0·Delegation Period 부재) — `kr_fee_rule.effective_from`(수수료 open-interval)은 **도메인 상이**이며 위임 엔티티엔 없다. 폐구간 dating 추가 시 `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거 반례를 복제하지 마라**(as-of 재구성 붕괴·`BLOCKED_HISTORICAL_INTEGRITY_RISK`).
- 🔴 **`reviewed_by`/`approved_by` 를 진입 게이트 통과자로 채우지 마라** — 현행 "승인자"는 전부 진입 게이트 통과자(승인=actor 본인)이지 위임 승인자가 아니다(ⓑ §2.2). Delegation 승인은 §24 Delegation Approval(신설) 라이프사이클을 선행해야 한다.
