# DSAR — Approval Authority Conflict (§53 · 필수 필드)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §53(2165-2213) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6·§3·§4·§5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **분모 분할**: §53 측정기 합계 = **40**(필수 필드 20 + Conflict Type 20). 본 문서는 **분할 1/2 = 필수 필드 20**을 다룬다. Conflict Type 20종은 [DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md](DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md)(분할 2/2). §54 Conflict Resolution 권장 순서 13종은 [DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md](DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_CONFLICT` 엔티티 | `authority_conflict`·`approval_conflict` grep **0** — 충돌 탐지/해소 엔티티 통째 부재(ⓑ §6) | `NOT_APPLICABLE`(부재→신설) |
| Authority 후보(candidates) | 🔴 후보 도출(§47) 코드 0 · binding/authority 복수성 자체 없음(ⓑ §3·§6) → 충돌할 후보 집합이 없음 | `BLOCKED_PREREQUISITE` |
| 금액·통화축 | 🔴 금액 한도 저장 0(`HIGH_VALUE_KRW` 상수만) · 통화 스코프 0(변환 전용·`Connectors.php:1749`·ⓑ §4) | `ABSENT` |
| Legal Entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ Registry §12) | `ABSENT` |
| 해소 actor 관례 | 인접 = `Alerting::decideAction` `self::actor` · `admin_growth` `decided_by`/`decided_at` 2컬럼(ⓑ §2·§5) — 단 **충돌 해소 actor 아님** | `LEGACY_ADAPTER` |
| evidence 정본 | `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**충돌 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이/선행 미충족"을 기록한다.

## 1. 원문 전사 + 판정 — **필수 필드 20**(§53 분할 1/2 · 측정기 40 중 20)

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_conflict_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_request_id | 🔴 통합 승인 요청 엔티티 부재 — 4경로(mapping/catalog/action_request/admin_growth)가 서로 다른 스키마의 상태머신(ⓑ §2)·권위 request id 없음 | `BLOCKED_PREREQUISITE` |
| 3 | approval_case_id | 🔴 Approval Case 엔티티 부재 — 참조 대상 없음(ⓑ §2) | `BLOCKED_PREREQUISITE` |
| 4 | subject_id | 🔴 Subject Binding 부재 — 승인 자격 판독 축(§4.1/§4.2) 없음(ⓑ §3 "정본 축 부재") | `BLOCKED_PREREQUISITE` |
| 5 | authority_candidates | 🔴 후보 도출(§47) 코드 0 · 충돌할 복수 Authority 후보 집합 자체 부재(ⓑ §6) | `BLOCKED_PREREQUISITE` |
| 6 | conflict_type | 충돌 유형 분류 부재 — Type 20종 전사는 [분할 2/2](DSAR_APPROVAL_AUTHORITY_CONFLICT_TYPE.md) | `NOT_APPLICABLE` |
| 7 | conflicting entries | 충돌 항목 배열 부재 — 복수 Authority entry 없음(ⓑ §6) | `NOT_APPLICABLE` |
| 8 | amount | 🔴 금액축 부재 — 유일 금액조건 = `HIGH_VALUE_KRW` 상수(승인 필요여부 boolean만·`Catalog.php:1016`·ⓑ §4) | `ABSENT` |
| 9 | currency | 🔴 통화 스코프 0 · 통화는 변환 전용(`Connectors.php:1749`·환율 저장계층 부재·ⓑ §4) | `ABSENT` |
| 10 | resource | Authority 리소스 스코프 부재 — `acl_permission` scopeSql은 데이터-행 필터(장식)·Authority 리소스 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 11 | legal entity | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ Registry §12) | `ABSENT` |
| 12 | effective period | 🔴 유효기간 부재 — `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) | `ABSENT` |
| 13 | severity | 충돌 심각도 개념 부재 — 충돌 탐지 자체가 없어 severity 산정 대상 없음 | `NOT_APPLICABLE` |
| 14 | resolution policy | 해소 정책 부재 — §54 권장 순서 전사=[Resolution 문서](DSAR_APPROVAL_AUTHORITY_CONFLICT_RESOLUTION.md)·코드 0(ⓑ §6) | `NOT_APPLICABLE` |
| 15 | resolved authority | 해소 결과 Authority 부재 — 선택할 후보가 없음(#5 선행 미충족) | `NOT_APPLICABLE` |
| 16 | resolved result | 해소 결과값 부재 — 해소 로직 0(ⓑ §6) | `NOT_APPLICABLE` |
| 17 | resolved_by | 인접 = 결재자 actor 관례(`Alerting` `self::actor`·`admin_growth.decided_by`·ⓑ §2·§5) — 단 **충돌 해소 actor 아님**·승인시점 권한 스냅샷 미보존(§55 ABSENT) | `LEGACY_ADAPTER` |
| 18 | resolved_at | 인접 = 결재 시각 관례(`admin_growth.decided_at`·`Mapping` approvals_json `ts`·ⓑ §2·§5) — 충돌 해소 시각 아님 | `LEGACY_ADAPTER` |
| 19 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) — Conflict 상태 개념 없음 | `LEGACY_ADAPTER` |
| 20 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 20 / 20 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4(#17·18·19·20) · `BLOCKED_PREREQUISITE` 4(#2·3·4·5) · `ABSENT` 4(#8·9·11·12) · `NOT_APPLICABLE` 8(#1·6·7·10·13·14·15·16).

> 🔴 **커버 0.** Conflict 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건은 **확장 대상 인접 자산**(resolved_by/at=결재 actor·ts 관례 · status=상태전이 · evidence=SecurityAudit)이지 커버가 아니다.
> 🔴 **`BLOCKED_PREREQUISITE` 4건(#2~5)**: request/case/subject/candidates 는 전부 **부모 엔티티(승인요청·케이스·Subject Binding·Authority 후보)가 선행 부재**다. 충돌 필드는 그 부모들이 생긴 뒤에야 채워질 수 있으며, 지금은 참조 대상 자체가 없다(ⓑ §2·§3·§6).

## 2. 규칙

- 🔴 **`resolved_by`/`resolved_at`/`evidence` 의 인접 관례를 재구현하지 마라** — resolved_by/at 은 결재 actor·ts 관례(`Alerting`/`admin_growth`) 확장 · evidence 는 `SecurityAudit::verify()` 확장이지 **새 감사 엔진 신설이 아니다**(중복 엔진 금지·ⓑ §5). 🔴 evidence 를 `menu_audit_log.hash_chain` 으로 채우지 마라(verify() 0·preimage ts 소실·검증 불가 장식).
- 🔴 **`amount`/`currency`/`legal entity` 를 "있음"으로 표기 금지** — 금액축·통화 스코프·Legal Entity 는 저장계층부터 부재다(ⓑ §4). Conflict 레코드가 실제 능력을 초과 선언하면 §65 "Amount가 Limit 초과인데 승인 성공" gap 을 문서 차원에서 은폐한다.
- 🔴 **`authority_candidates`/`resolved authority` 를 채우려면 §47 후보 도출이 선행**이다 — 충돌은 **복수 Authority 후보**를 전제하는데 현재 후보 도출·binding 복수성이 전무하다(ⓑ §6). 후보 없이 충돌 레코드는 공허하다(`BLOCKED_PREREQUISITE`).
- 🔴 **승인시점 권한 스냅샷(§55) 없이 `resolved_by` 를 신뢰 금지** — 3경로 다 승인시점 역할/플랜을 미보존한다(ⓑ §5 §55 ABSENT). resolved_by 를 채우려면 Actor Authorization Snapshot 이 선행이며, as-of 재구성 없이는 "누가 어떤 권한으로 해소했는가"가 검증 불가다.
