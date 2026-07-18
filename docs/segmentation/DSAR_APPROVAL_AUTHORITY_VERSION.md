# DSAR — Approval Authority Version (§10 필수필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §10(762-833) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

> **★분할 분모: 28+15+14=57 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 57 · 필수필드 **28**[본 문서] + Version Type 15[[VERSION_TYPE](DSAR_APPROVAL_AUTHORITY_VERSION_TYPE.md)] + status 14[[VERSION_STATUS](DSAR_APPROVAL_AUTHORITY_VERSION_STATUS.md)]). 본 문서 = 필수필드 **28종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_VERSION` 엔티티 | `authority_version`·`approval_authority_version` grep **0** — Authority 버전 엔티티 부재(ⓑ §5) | `NOT_APPLICABLE`(부재→신설) |
| 불변 버전체인 선례 | version 컬럼 6개(`menu_defaults.version`='baseline' 리터럴·`normalizer_version`·`ml_models.version`·`agent_version`·`risk_prediction.model_version`·`risk_model_registry.model_version`) **전부 하드코딩/서술 태그**(ⓑ §5) — `risk_model_registry`가 append+is_deployed로 근접하나 **UPDATE-mutable** | `ABSENT`(불변 prev-링크 버전체인 선례 0) |
| immutable_hash 정본 | `SecurityAudit::verify():56-68`(`:27` tenant 포함 해시·`:29-31` prev_hash·created_at 명시 저장·`:63` 재계산·`:64` `hash_equals`+prev 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지(preimage ts 소실·verify() 0·[[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |
| Actor Auth Snapshot | 🔴 **ABSENT** — 3경로 다 승인시점 권한/역할/플랜 미보존(`Mapping:285`{user,ts}·`Alerting:591`{actor,decision,ts}·`admin_growth` decided_by/decided_at 2컬럼·ⓑ §5) → as-of 재구성 불가 | `ABSENT` |

★**버전 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 판정은 사용 금지(커버 0).

## 1. 원문 전사 + 판정 — **필수필드 28종**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_version_id | 버전 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_authority_definition_id | 상위 Definition 엔티티(§5) 부재 → FK 대상 없음(ⓑ §0) | `NOT_APPLICABLE` |
| 3 | version_number | version 6컬럼 전부 하드코딩/서술 태그(`menu_defaults.version`='baseline' 등·ⓑ §5) — 단조 증가 버전 번호 실체 없음 | `ABSENT` |
| 4 | previous_version_id | 🔴 **불변 prev-링크 버전체인 선례 0**(ⓑ §5) · `risk_model_registry`가 근접하나 UPDATE-mutable(prev 링크 아님) | `ABSENT` |
| 5 | version_type | 아래 Version Type 15종 전부 미시드(→[VERSION_TYPE](DSAR_APPROVAL_AUTHORITY_VERSION_TYPE.md)) · 버전 엔티티 부재 | `NOT_APPLICABLE` |
| 6 | change_summary | 버전 엔티티 서술 필드 → 부재 | `NOT_APPLICABLE` |
| 7 | matrix_reference | 참조 대상 `APPROVAL_AUTHORITY_MATRIX`(§12) 자체 부재(ⓑ §0) | `NOT_APPLICABLE` |
| 8 | scope_snapshot | 🔴 Actor Authorization Snapshot ABSENT — 3경로 승인시점 스코프 미보존(`Mapping:285`·`Alerting:591`·`admin_growth` decided_by·ⓑ §5) | `ABSENT` |
| 9 | threshold_snapshot | 🔴 금액축 부재 — 유일 임계 = `Catalog.php:1016` `HIGH_VALUE_KRW` **PHP 상수**(테넌트 설정·버전·effective dating 원천 불가·ⓑ §4) · snapshot 저장 0 | `ABSENT` |
| 10 | currency_snapshot | 🔴 통화 스코프 0 · 환율 저장계층 부재(`Connectors.php:1790` KV 덮어쓰기·rate_date 없음·ⓑ §4) → 통화 스냅샷 원천 불가 | `ABSENT` |
| 11 | period_snapshot | 기간 스냅샷 부재 · `AutoCampaign:855` `periodSpentToDate`는 예산 페이싱(마케팅 도메인·승인 스냅샷 아님·ⓑ §4) | `ABSENT` |
| 12 | deny_rule_snapshot | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §6) → deny 스냅샷 원천 불가 | `ABSENT` |
| 13 | delegation_eligibility_snapshot | 위임 자격 스냅샷 부재 · 인접 = `TeamPermissions.php:639` `DELEGATION_EXCEEDED` 자기정합 상한(승인시점 자격 보존 아님·ⓑ §3) | `ABSENT` |
| 14 | affected chains | 참조 대상 Approval Chain(5-3-3-3) 엔티티 부재 → 영향 집합 열거 불가 | `NOT_APPLICABLE` |
| 15 | affected levels | Approval Level 엔티티 부재(§4.1 Manager Resolver ABSENT·다홉 사람계층 walk 0·ⓑ §3) | `NOT_APPLICABLE` |
| 16 | affected roles | 권한축 2벌 분열(`index.php:554` roleRank vs `team_role`·양방향 매핑 0·ⓑ §3) — 권위 역할축 없음 → 영향 역할 열거 불가 | `NOT_APPLICABLE` |
| 17 | affected subjects | Authority Subject 엔티티 부재 → 영향 주체 열거 불가 | `NOT_APPLICABLE` |
| 18 | affected active tasks | 버전→진행 결재 태스크 연결 없음 · action_request 생산자 0(죽은 파이프라인·ⓑ §2) | `NOT_APPLICABLE` |
| 19 | effective_from | 인접 = `kr_fee_rule.effective_from VARCHAR(32) NOT NULL`(`Db.php:898`·`KrChannel.php:128,140` INSERT) 실 open-interval valid-from dating(수수료/VAT 도메인·ⓑ §5 표) — Authority 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 20 | effective_to | 🔴 `effective_to`·`valid_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 21 | created_by | 인접 = `created_by` 관례 컬럼 다수 핸들러 실재(`AdminGrowth`·`AgencyPortal`·`TeamPermissions`·`PM\Tasks` 등) — 작성자 기록 관례는 있으나 Authority 버전 작성자 아님 | `LEGACY_ADAPTER` |
| 22 | reviewed_by | 🔴 Review 단계 미분화 **ABSENT** — 승인 4경로에 검토자(reviewer) 컬럼·단계 0(승인=진입 게이트 통과 1~2인·ⓑ §2) | `ABSENT` |
| 23 | approved_by_reference | 🔴 승인자 **후보 도출 0**(§47 Candidate ABSENT·ⓑ §6) · 인접 raw 승인자 id(`Mapping` approvals_json.user·`admin_growth.decided_by`)는 있으나 Authority-candidate 참조 아님 | `ABSENT` |
| 24 | activated_at | 버전 활성화 이벤트 부재(버전 상태머신 부재·→[VERSION_STATUS](DSAR_APPROVAL_AUTHORITY_VERSION_STATUS.md)) → 활성화 시각 원천 없음 | `NOT_APPLICABLE` |
| 25 | immutable_hash | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지(검증 불가능한 장식) | `LEGACY_ADAPTER` |
| 26 | migration_policy | 참조 대상 §11 Migration Policy 11종 전부 NOT_APPLICABLE(→[MIGRATION_POLICY](DSAR_APPROVAL_AUTHORITY_MIGRATION_POLICY.md)) · 이행 집행수단 부재(migrations 172정지·`ensureTables` 백필 0·ⓑ §5) | `NOT_APPLICABLE` |
| 27 | status | 참조 대상 버전 상태 14종 전부 NOT_APPLICABLE(→[VERSION_STATUS](DSAR_APPROVAL_AUTHORITY_VERSION_STATUS.md)) · 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `NOT_APPLICABLE` |
| 28 | evidence | 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·tenant 해시 검증) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4(19 effective_from·21 created_by·25 immutable_hash·28 evidence) · `ABSENT` 11(3·4·8·9·10·11·12·13·20·22·23) · `NOT_APPLICABLE` 13(1·2·5·6·7·14·15·16·17·18·24·26·27).

> 🔴 **커버 0.** 버전 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건은 **확장 대상 인접 자산**(immutable_hash/evidence=`SecurityAudit::verify()` · effective_from=`kr_fee_rule` 질의계층 · created_by=관례 컬럼)이지 커버가 아니다. `ABSENT` 11건 중 6개 스냅샷 계열(scope/threshold/currency/period/deny_rule/delegation)은 **Actor Authorization Snapshot 부재**(ⓑ §5)의 직접 귀결이다.

## 2. 규칙

- 🔴 **버전은 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — immutable_hash/evidence=`SecurityAudit::verify()` 확장 · effective_from=`kr_fee_rule.effective_from` 질의계층(`WHERE effective_from<=:as_of`) 확장 · created_by=관례 컬럼 참조. **중복 해시엔진·중복 dating 계층 금지.**
- 🔴 **`previous_version_id` 를 UPDATE-mutable 컬럼으로 두지 마라** — `risk_model_registry`가 근접하나 in-place 변경 가능(ⓑ §5). 불변 prev-링크 append-only 체인으로 신설하고, `SecurityAudit` prev_hash 교차검증 패턴을 상속하라.
- 🔴 **6개 `*_snapshot` 을 "있음"으로 표기 금지** — Actor Authorization Snapshot 이 3경로 전부 부재다(ⓑ §5). 스냅샷 없이 버전만 매기면 §55 "as-of 재구성 불가" gap 을 구조적으로 상속한다. 스냅샷은 승인시점 권한/역할/플랜/스코프/임계/통화/기간/deny/위임자격 전량을 불변 저장해야 한다.
- 🔴 **`effective_to` 는 저장계층부터 신규다**(grep 0·ⓑ §5) — `effective_from`(kr_fee_rule)은 open-interval 로 실재하나 폐구간(effective_to)은 컬럼 자체가 없다. 폐구간 dating 추가 시 `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거 반례를 복제하지 마라**(as-of 재구성 붕괴·`BLOCKED_HISTORICAL_INTEGRITY_RISK`).
- 🔴 **`reviewed_by`/`approved_by_reference` 를 진입 게이트 통과자로 채우지 마라** — 현행 "승인자"는 전부 게이트 통과자(analyst+ / requirePro / requirePlan('admin'))이지 자격자 후보가 아니다(ⓑ §3). 검토자·승인자는 §47 Candidate 도출(신설) 결과를 참조해야 한다.
