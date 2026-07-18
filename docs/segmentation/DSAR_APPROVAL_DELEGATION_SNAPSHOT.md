# DSAR — Approval Delegation Snapshot (§39 필수필드 + §40 원칙 병합)

> EPIC 06-A-01 Delegation Foundation · 289차 13회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §39 필수필드(1685-1724)·§40 Snapshot 원칙(1748-1764) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
>
> **★분할 분모 명기**: 본 문서 = **§39 필수필드 38 + §40 원칙 14 = 52** 병합.
> - §39 `Delegation Snapshot` 측정기 합계 = **55**(`measure_spec_denominator.mjs --sec=39`: 불릿55). 그 中 **필수필드 38**(본 문서) + **Snapshot Type 17**(별도 [DSAR_APPROVAL_DELEGATION_SNAPSHOT_TYPE.md](DSAR_APPROVAL_DELEGATION_SNAPSHOT_TYPE.md)) = 55 ✓.
> - §40 `Snapshot 원칙` 측정기 합계 = **14**(`--sec=40`: 불릿14). 전량 본 문서 병합.
> - **합계 분모 = 38 + 14 = 52.** (SNAPSHOT_TYPE=§39 type 17은 본 문서 분모 아님)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_SNAPSHOT` 엔티티 | 🔴 **Delegation Snapshot 엔티티 전무**(ⓑ §2.5·§0)·**Actor Authorization Snapshot ABSENT**(ⓑ §3.4 — 승인 3경로가 user/ts만 기록·권한 동결 없음) | `ABSENT`(엔티티 부재) |
| `immutable_hash` 정본 | `SecurityAudit::verify():56-68`(`:27` preimage 에 tenant·actor·action·details·ts 저장 · `:63` 재계산 · `:64` `hash_equals`+`prev_hash` 체인) — **검증형 정본**. 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER`(확장 대상) |
| `captured_at` 인접 | `PM/Enterprise.php:360` `$snapshot=['captured_at'=>self::now(), ...]` — **JSON 키(snapshot_json 내부)이지 DB 컬럼 아님**·PM 프로젝트 baseline 도메인 | `LEGACY_ADAPTER`(JSON키 인접·DB컬럼 부재) |
| "과거 Snapshot 대체 금지"(§40) 정면 반례 | 🔴 `AgencyPortal.php:304,381` — 재요청/승인 시 `revoked_at=NULL` **in-place 소거**(과거 철회 상태를 현재 상태로 덮어씀·이력 보존 없음) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |

★**Snapshot 엔티티가 통째로 부재**하므로 필드/원칙 단위 커버는 원천 불가. 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `VALIDATED_LEGACY` 0 (cover 0).

## 1. §39 원문 전사 + 판정 — **필수필드 38종**

| # | 원문 필드명 | 현행 대조 (능력) | 판정 |
|---|---|---|---|
| 1 | approval_delegation_snapshot_id | Snapshot 엔티티 부재 → PK 없음 | `ABSENT` |
| 2 | snapshot_type | Type 열거 = 별도 [SNAPSHOT_TYPE.md](DSAR_APPROVAL_DELEGATION_SNAPSHOT_TYPE.md)(전량 NOT_APPLICABLE/ABSENT)·저장 컬럼 부재 | `ABSENT` |
| 3 | approval_request_id | Approval Request(§3.1) 부재 → 참조 대상 없음 | `ABSENT` |
| 4 | approval_request_version_id | Approval Request Version 부재 | `ABSENT` |
| 5 | approval_case_id | Approval Case(§3.1) 부재 | `ABSENT` |
| 6 | approval_case_version_id | Approval Case Version 부재 | `ABSENT` |
| 7 | approval_item_id | Approval Item(§3.1) 부재 | `ABSENT` |
| 8 | approval_requirement_id | Approval Requirement(§3.1) 부재 | `ABSENT` |
| 9 | approval_chain_resolution_id | Approval Chain Resolution(§3.1) 부재 | `ABSENT` |
| 10 | approval_chain_resolution_level_id | Chain Resolution Level 부재 | `ABSENT` |
| 11 | original participant subject id | Chain Resolved Participant(§3.1) 부재·Manager Resolver ABSENT(ⓑ §3.3) | `ABSENT` |
| 12 | delegator subject id | Delegator Binding(§21) 부재 | `ABSENT` |
| 13 | delegate subject id | Delegate Binding(§22) 부재 | `ABSENT` |
| 14 | delegation definition id | 🔴 Delegation Definition(§9) 부재 → 선행 Delegation Foundation 미구축 | `BLOCKED_PREREQUISITE` |
| 15 | delegation version id | 🔴 Delegation Version(§10) 불변 체인 부재 → 동결할 버전 없음 | `BLOCKED_PREREQUISITE` |
| 16 | delegation type | 🔴 Delegation Type(§8) 부재 | `BLOCKED_PREREQUISITE` |
| 17 | scope snapshot | Delegation Scope(§11) 부재 → 동결 대상 없음 | `ABSENT` |
| 18 | authority snapshot | 🔴 Approval Authority(§3.2) 개념 부재 — 동결할 권한 단위 미정의(ⓑ §3.2) | `BLOCKED_PREREQUISITE` |
| 19 | original authority resolution | 🔴 Approval Authority Resolution(§3.2) 부재 → 원본 권한 해석 스냅샷 불가 | `BLOCKED_PREREQUISITE` |
| 20 | delegate own authority resolution | 🔴 Delegate 자신 Authority Resolution(§3.2) 부재 | `BLOCKED_PREREQUISITE` |
| 21 | resource snapshot | Delegation Resource Binding(§13) 부재 | `ABSENT` |
| 22 | action snapshot | Delegation Action Binding(§14) 부재 | `ABSENT` |
| 23 | organization snapshot | Delegation Organization Binding(§15) 부재·Org Unit 엔티티 0(ⓑ §3.3) | `ABSENT` |
| 24 | legal entity snapshot | Legal Entity Binding(§16) 부재·Legal Entity 전면 void(ⓑ §3.3) | `ABSENT` |
| 25 | geography snapshot | Geographic Binding(§17) 부재 | `ABSENT` |
| 26 | monetary snapshot | Monetary Binding(§18) 부재·금액축 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 27 | currency snapshot | Currency Binding(§19) 부재·통화 스코프 0 | `ABSENT` |
| 28 | period snapshot | Delegation Period(§20) 부재·`valid_to` grep 0 | `ABSENT` |
| 29 | acceptance snapshot | Delegation Acceptance(§23) 부재 | `ABSENT` |
| 30 | approval snapshot | Delegation Approval(§24) 부재 | `ABSENT` |
| 31 | re-delegation chain snapshot | 재위임 체인(§40) 부재·`redelegation` grep 0 | `ABSENT` |
| 32 | conflict result | Delegation Conflict(§34) 부재 | `ABSENT` |
| 33 | resolution result | Delegation Resolution(§30) 부재 | `ABSENT` |
| 34 | effective_at | 유효 시점 동결 컬럼 부재(`effective_*` = `kr_fee_rule` 수수료 도메인 오탐·ⓑ) | `ABSENT` |
| 35 | captured_at | 🔴 인접 = `PM/Enterprise.php:360` **JSON 키**(snapshot_json 내부)·**DB 컬럼 아님**·PM baseline 도메인 | `LEGACY_ADAPTER` |
| 36 | immutable_hash | 🔴 정본 = `SecurityAudit::verify():56-68`(preimage ts 저장·`hash_equals`·`prev_hash` 체인·tenant) — 확장 대상. `menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| 37 | status | 합법 전이집합 선언 0(전 도메인)·Snapshot 상태 컬럼 부재 | `ABSENT` |
| 38 | evidence | 🔴 정본 = `SecurityAudit::verify()`(검증형 근거)·`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**§39 필수필드 소계: 38 / 38 전사** · `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 3(captured_at·immutable_hash·evidence) · `BLOCKED_PREREQUISITE` 6(delegation definition/version/type·authority snapshot·original authority resolution·delegate own authority resolution) · `ABSENT` 29.

## 2. §40 원문 전사 + 판정 — **Snapshot 원칙 14종**

| # | 원문 원칙 | 현행 대조 (능력) | 판정 |
|---|---|---|---|
| 39 | Snapshot 직접 수정 금지 | 🔴 정본 = `SecurityAudit::verify():56-68` 해시체인(변조 시 `broken_at` 반환·`hash_equals`) — 직접수정 방지 능력 실재·Delegation 도메인엔 미적용 | `LEGACY_ADAPTER` |
| 40 | Current Delegation으로 과거 Snapshot 대체 금지 | 🔴 **정면 반례** = `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(현재 상태로 과거 철회 이력 덮어씀) — 원칙 위반 안티패턴 실재 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 41 | Delegation Version 저장 | Delegation Version(§10) 엔티티 부재 → 저장 대상 없음 | `ABSENT` |
| 42 | Delegator Identity·Role·Position Version 저장 | Position/Employment 엔티티 0·`team_role` flat enum·버전 개념 없음(ⓑ §3.3) | `ABSENT` |
| 43 | Delegate Identity·Role·Position Version 저장 | 동상(Delegate 측)·Position Incumbency 부재 | `ABSENT` |
| 44 | Original Authority Version 저장 | Approval Authority Version(§3.2) 부재 | `ABSENT` |
| 45 | Scope 저장 | Delegation Scope(§11) 부재 | `ABSENT` |
| 46 | Amount·Currency 저장 | Monetary/Currency Binding(§18/§19) 부재·금액/통화 저장계층 0 | `ABSENT` |
| 47 | Period 저장 | Delegation Period(§20) 부재 | `ABSENT` |
| 48 | Acceptance 저장 | Delegation Acceptance(§23) 부재 | `ABSENT` |
| 49 | Approval 저장 | Delegation Approval(§24) 부재·승인 4경로는 위임 승인 아님 | `ABSENT` |
| 50 | Re-delegation Chain 저장 | 재위임 체인 부재 | `ABSENT` |
| 51 | Conflict Resolution 저장 | Delegation Conflict(§34)/Resolution(§30) 부재 | `ABSENT` |
| 52 | Immutable Hash 검증 | 🔴 정본 = `SecurityAudit::verify():56-68`(재계산·`hash_equals`·`prev_hash`) — 검증 능력 실재·확장 대상 | `LEGACY_ADAPTER` |

**§40 원칙 소계: 14 / 14 전사** · `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 2(직접수정 금지·Immutable Hash 검증) · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1(과거 Snapshot 대체 금지) · `ABSENT` 11.

## 3. 병합 커버리지 (분모 52)

**실측 개수: 52 / 52 전사**(§39 필드 38 + §40 원칙 14). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `BLOCKED_PREREQUISITE` 6 · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1 · `ABSENT` 40.

> 🔴 **커버 0.** Snapshot 엔티티가 통째로 부재하므로 어떤 필드/원칙도 `VALIDATED_LEGACY` 가 아니다.
> - `LEGACY_ADAPTER` 5건(captured_at·immutable_hash·evidence·"직접수정 금지"·"Immutable Hash 검증")은 **확장 대상 인접 자산**(SecurityAudit·PM baseline JSON키)이지 커버가 아니다.
> - `BLOCKED_PREREQUISITE` 6건은 §3.2 Authority Foundation·Delegation Definition/Version 선행 부재로 **판정 자체가 선행 신설 후로 유예**된다.
> - `BLOCKED_HISTORICAL_INTEGRITY_RISK` 1건(`AgencyPortal revoked_at` in-place 소거)은 §40 원칙의 **정면 반례** — 신설 Snapshot 이 이 안티패턴을 상속하면 안 된다.

## 4. 규칙

- 🔴 **Snapshot 인접 선례를 재구현하지 마라** — `immutable_hash`/`evidence`/"직접수정 금지"/"Immutable Hash 검증" = `SecurityAudit::verify()` **확장**(중복 엔진 금지·`menu_audit_log.hash_chain` 인용 금지).
- 🔴 **`captured_at` 을 JSON 키로만 두지 마라** — `PM/Enterprise.php:360` 는 snapshot_json 내부 키다. Delegation Snapshot 은 as-of 질의 가능한 **DB 컬럼(+인덱스)** 로 신설하라(§41 SNAPSHOT_TYPE `AUDIT_RECONSTRUCTION` ABSENT 와 정합).
- 🔴 **"과거 Snapshot 대체 금지"(§40) 위반 안티패턴 상속 금지** — `AgencyPortal.php:304,381` `revoked_at=NULL` in-place 소거를 **모범이 아니라 반례**로 기록하라. 철회/만료/변경은 불변 append(이력 보존)로 동결.
- 🔴 **BLOCKED_PREREQUISITE 6필드는 §3.2 Authority·Delegation Definition/Version 신설이 선행** — Snapshot 은 "결재 당시 원본 Authority·Delegation Version 동결"(5.11·5.12)이 목적이므로 동결할 대상(Authority Resolution·Delegation Version)이 먼저 존재해야 구현 가능. 별도 승인세션.
