# DSAR — Approval Delegation Static Lint (§52)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §52(2128-2162) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §1·§2 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=52` → **§1 항목 28**(불릿 28·번호 0). 육안 금지·측정기 산출.

## 0. 판정 원리 — "lint 대상 Delegation 엔티티가 없다"

§52는 "이번 블록에서 차단하라"는 **최소 정적 검사(static lint)** 목록이다. lint는 **Delegation Definition/Version/Scope/Binding을 저장·커밋하는 시점**에 그 정의의 결손을 잡는다. 그러나 이 레포에는 **Delegation Definition·Version·Scope·Binding 엔티티가 통째로 부재**하다(ⓑ §1 — §4 전수조사 전량 ABSENT). → **lint가 겨눌 저장 대상 자체가 없으므로 대부분 `NOT_APPLICABLE`**(엔티티 신설 시 함께 켤 규칙).

예외 판정:
- **Cross-Tenant Binding**(#14) → `LEGACY_ADAPTER` — 정적 Binding 저장 대상은 없으나 **런타임 tenant 격리 가드는 실재**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기·단 strict 기본 OFF `:585`·ⓑ §3.4·§5). "완전 무방비"로 오표기 금지.
- **Delegated Ceiling > Original Ceiling**(#13) → `BLOCKED_PREREQUISITE` — Original Authority Ceiling(§3.2 Authority Foundation)이 부재해 비교 기준 자체가 없음. Amount Band 신설이 선행(ⓑ §3.2).
- **Delegator/Delegate 부재·Self 동일·Role Name/Email 문자열 Delegate**(#2·3·4·21·22) → `ABSENT` — Delegation 관계(Delegator→Delegate edge)는 부재하나, **Subject identity(user)는 acl_permission member 매트릭스에 실재**하므로 이 lint들이 겨눌 실 데이터축(주체/문자열 식별자)이 존재한다. 안티패턴(문자열 기반 Delegate)이 신설 시 재유입될 실 위험이라 `NOT_APPLICABLE`이 아니라 `ABSENT`.

★**`VALIDATED_LEGACY` 미사용**(cover 0). 어떤 lint도 "기존 구현이 이미 위반을 막는다"가 아니다.

## 1. 원문 전사 + 판정 — **원문 28종**(§52 2132-2159)

| # | 원문 lint 규칙(verbatim) | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Delegation | Delegation Definition 엔티티 부재(ⓑ §1) — 검사할 정의 없음 | `NOT_APPLICABLE` |
| 2 | Delegator 없는 Delegation | Delegator→Delegate edge 부재이나 Subject(user) identity는 `acl_permission` member로 실재(ⓑ §2.1) → delegator 결손 검사가 겨눌 주체 존재 | `ABSENT` |
| 3 | Delegate 없는 Delegation | 동상 · Delegate binding 부재이나 대상 주체 실재(ⓑ §2.1) | `ABSENT` |
| 4 | Delegator와 Delegate 동일 | Self-delegation 차단 대상 · 위임 관계 부재로 무발동이나 동일주체 비교는 user id로 판정 가능(§5.9 신설 필수·ⓑ §5) | `ABSENT` |
| 5 | Delegation Type 없음 | Delegation Type(§8) 엔티티 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 6 | Active Version 없음 | Delegation Version 엔티티 부재 · 불변 버전체인 선례 0(ⓑ §2.1) | `NOT_APPLICABLE` |
| 7 | Start Time 없음 | Delegation Period(§20) 부재 · `valid_from` Delegation 엔티티엔 없음(ⓑ §3.2) | `NOT_APPLICABLE` |
| 8 | Temporary Delegation End Time 없음 | Delegation Period 부재 · `valid_to`/`effective_to` grep 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 9 | Permanent Delegation Review Date 없음 | Review Date/`PERMANENT_WITH_REVIEW` 유형 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 10 | Scope 없음 | Delegation Scope(§11) 엔티티 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 11 | Authority Binding 없음 | Delegation Authority Binding(§12)·Approval Authority 둘 다 부재(ⓑ §1·§3.2) | `NOT_APPLICABLE` |
| 12 | Monetary Delegation Currency 없음 | Monetary/Currency Binding 부재 · `currency_scope` 0(ⓑ §3.2) | `NOT_APPLICABLE` |
| 13 | Delegated Ceiling > Original Ceiling | Original Authority Ceiling·Amount Band 부재(HIGH_VALUE_KRW boolean만·`Catalog.php:1016`·ⓑ §3.2) → 비교 기준 미정의, Authority Foundation 선행 필요 | `BLOCKED_PREREQUISITE` |
| 14 | Cross-Tenant Binding | 정적 Binding 부재이나 **런타임 격리 가드 REAL**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 · 단 strict 기본 OFF `:585`·SPA/세션 미도달·ⓑ §3.4·§5) | `LEGACY_ADAPTER` |
| 15 | Cross-Legal-Entity 허용 근거 없음 | Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·`business_number`=회사프로필 단일문자열·ⓑ §3.3) — 법인 경계 lint 대상 부재 | `NOT_APPLICABLE` |
| 16 | Acceptance Required인데 Acceptance Policy 없음 | Delegation Acceptance(§23) 엔티티 부재(ⓑ §2.1 — acl 위임상한은 수락 개념 없음) | `NOT_APPLICABLE` |
| 17 | Approval Required인데 Approval Policy 없음 | Delegation Approval(§24) 엔티티 부재(ⓑ §3.1) | `NOT_APPLICABLE` |
| 18 | Re-delegation 허용인데 Maximum Depth 없음 | 재위임(re-delegation) 경로 grep 0(ⓑ §2.1) · Delegation Depth Governance 부재 | `NOT_APPLICABLE` |
| 19 | Delegation Cycle | 위임 간선 부재 → 정적 순환 검사 대상 없음(ⓑ §5·§2.4). 인접 순환검출은 PM/메뉴 도메인(KEEP_SEPARATE) | `NOT_APPLICABLE` |
| 20 | Overlapping Delegation Conflict 미처리 | Delegation Conflict(§34)·복수 Delegation 부재 → 중첩 판정 무발동(ⓑ §1) | `NOT_APPLICABLE` |
| 21 | Role Name 문자열 기반 Delegate | Delegate binding 부재이나 현행 `team_role`=flat enum 3값·`$roleRank` 문자열 등급 비교(`index.php:554`)가 **이 lint가 겨눌 안티패턴 실재**(ⓑ §3.3·§3.4) — 신설 시 재유입 위험 | `ABSENT` |
| 22 | Email 문자열 기반 Delegate | Delegate binding 부재이나 이메일 문자열 식별자 관행 실재 → 문자열 기반 Delegate 안티패턴이 겨눌 데이터 존재(ⓑ §3.3) | `ABSENT` |
| 23 | Active Version 직접 수정 | Delegation Active Version 엔티티 부재 → immutable 보호 대상 없음(ⓑ §2.1) | `NOT_APPLICABLE` |
| 24 | Snapshot 직접 수정 | Delegation Snapshot 엔티티 부재(ⓑ §2.5) · 불변 정본=`SecurityAudit::verify():56-68`은 확장 대상 인접자산이나 delegation snapshot 미존재 → 보호할 스냅샷 없음 · 🔴`menu_audit_log.hash_chain` 인용 금지 | `NOT_APPLICABLE` |
| 25 | Expired Original Authority 참조 | Approval Authority·`valid_to` 부재(ⓑ §3.2) → 참조할 Original Authority 만료 상태 없음, Authority Foundation 선행 필요 | `NOT_APPLICABLE` |
| 26 | Terminated Delegate 참조 | Delegate 엔티티·Employment/종료 상태 0(`position_idx`=Gantt 오탐·ⓑ §3.3) | `NOT_APPLICABLE` |
| 27 | Mandatory Financial Control 제거 | Mandatory Financial Control 개념 0 → 제거를 막을 lock 대상 부재(ⓑ §3.2) | `NOT_APPLICABLE` |
| 28 | 기존 Delegation Entity 중복 생성 | Delegation Entity 0 → **중복이 아니라 부재**(ⓑ §4·§59 "중복 아니라 부재") · 유일 인접=acl 위임상한(KEEP_SEPARATE·Delegation 아님) | `NOT_APPLICABLE` |

**실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#14) · `BLOCKED_PREREQUISITE` 1(#13) · `ABSENT` 5(#2·3·4·21·22) · `NOT_APPLICABLE` 21.

> 🔴 **커버 0.** lint 21건이 `NOT_APPLICABLE`인 것은 "이미 준수"가 아니라 **검사할 저장 대상(Delegation Definition/Version/Scope/Binding/Period/Acceptance/Approval)이 통째로 없다**는 뜻이다. 엔티티 신설과 **동시에** 이 21개 lint를 켜지 않으면 §51 gap이 그대로 재유입된다. `ABSENT` 5건(#2·3·4·21·22)은 위임 관계는 없으나 **주체(user)/문자열 식별자 데이터축이 실재**해 lint가 겨눌 대상이 있는 경우다. `LEGACY_ADAPTER` 1건(#14 Cross-Tenant)은 런타임 가드일 뿐 정적 Binding 검사가 아니다.

## 2. 규칙

- 🔴 **엔티티 신설 = lint 21개 동시 발동이 완료조건** — Delegation Definition/Version/Scope/Binding/Period/Acceptance/Approval DDL 신설 커밋에 §52 21개 static lint를 **같은 PR로** 붙여라. lint 없는 스키마 신설은 §51 gap을 구조적으로 재초대한다.
- 🔴 **Delegator/Delegate/Self(#2·3·4)를 문자열이 아닌 Subject FK로** — 위임 관계 신설 시 Delegator/Delegate를 Canonical Identity/Subject FK로 바인딩하고, 정적 검사에서 `delegator_subject_id == delegate_subject_id`(Self·§5.9)를 **저장 시점에** 차단하라.
- 🔴 **Role Name/Email 문자열 Delegate(#21·22)를 Subject Binding으로 승격하되 `$roleRank`/`team_role`을 재구현하지 마라** — 기존 `index.php:554` 등급·`team_role` enum을 Delegate 바인딩의 **입력**으로 참조(두 축 직교 유지). 문자열 role/email을 Delegate 식별자로 직접 저장하면 이 lint가 정확히 그 안티패턴을 잡아야 한다.
- 🔴 **Cross-Tenant Binding(#14)은 strict 기본 ON으로 신설** — 기존 `index.php:600` 런타임 가드를 신뢰하되 strict fail-closed(`:585` opt-in)를 Delegation 경로에서 **기본 ON**으로. Delegation의 `tenant_id`를 느슨한 VARCHAR로 두면 §5.4(Cross-Tenant Delegation 금지)가 무력화된다(ⓑ §3.4).
- 🔴 **Delegated Ceiling > Original(#13)은 Authority Foundation 선행 후에만 lint 가능** — Original Authority Ceiling·Amount Band(§3.2)가 신설되기 전에는 이 lint를 "통과"로 계산 금지(우연한 부재를 준수로 오계상 금지). 그 전엔 `BLOCKED_PREREQUISITE`.
- 🔴 **"중복 생성 금지"(#28) 전건 재확인** — Delegation Entity가 0이므로 중복 방지 lint는 **엔티티 신설 이후에야 의미**를 가진다. 지금 신설을 "중복"으로 오판해 착수를 미루지 마라(ⓑ §59 "중복 아니라 부재"). 유일 인접 acl 위임상한은 RBAC monotonicity이지 Delegation이 아니므로 통합 대상도 아니다(KEEP_SEPARATE).
