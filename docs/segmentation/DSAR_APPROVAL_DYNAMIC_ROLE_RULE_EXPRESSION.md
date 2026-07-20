# DSAR — Approval Dynamic Role Rule Expression (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Rule Expression)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Rule Expression은 스펙 §7이 정의하는, Rule Engine이 평가하는 **개별 규칙의 구체적 표현식**이다(예시 verbatim: "IF Department=Finance AND MFA=TRUE AND BusinessHours=TRUE THEN Activate Finance Approver Role"). Rule Engine(§6, 별도 엔티티)이 "평가 엔진"이라면 Rule Expression은 "평가 대상 문장" 자체다. ground-truth §2·§9는 이런 형태의 표현식이 RBAC 맥락에서 **grep 0(완전 부재)**임을 확정하며, 유사 형태(roas 조건트리)를 가진 FE `PolicyTreeEditor.jsx`는 마케팅 도메인으로 **KEEP_SEPARATE** 대상임을 명시한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `rule_expression_id` | 표현식 식별자(PK) |
| `condition_clause` | IF 절(Attribute Source·Runtime Context 참조 조합) |
| `logical_operator` | AND/OR/NOT 등 논리 연산자 |
| `action_clause` | THEN 절(Activate Role/Deactivate Role) |
| `rule_version_ref` | 불변 버전 참조(별도 Rule Version 엔티티) |

## 3. 열거형 / 타입

- **`condition_clause` 구성요소**(스펙 §7 예시 verbatim에서 파생): `Department=Finance` 형태(Attribute Source 비교) · `MFA=TRUE` 형태(Attribute Source 불리언) · `BusinessHours=TRUE` 형태(Runtime Context 파생값).
- **`action_clause`**(스펙 §7 예시 verbatim): `Activate <Role Name> Role`(예: Finance Approver Role). 대칭 개념 `Deactivate <Role Name> Role`은 스펙 §11 Expiration과 연동(본 문서는 정의만, 별도 엔티티 범위).
- **`logical_operator`**: `AND` · `OR` · `NOT`(스펙 §6 Boolean Expression 문법 재사용).

## 4. 실 substrate 매핑 (ABSENT/KEEP_SEPARATE·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| RBAC Rule Expression("IF department=X AND MFA=TRUE THEN role" 형태) | **ABSENT** | grep 0 완전 부재(EXISTING_IMPLEMENTATION §2 — "RBAC용 Rule Engine=grep 0 완전 부재") |
| `RuleEngine.php` 조건식(근접이나 RBAC 아님) | **KEEP_SEPARATE** | 조건=channel_roas/sku_stock/conversions(`RuleEngine.php:32`)·`evaluateTenant`(`:194-220`)에 role/permission 문자열 전무 |
| FE `PolicyTreeEditor.jsx`(roas 조건트리, 표현식 형태 근접) | **KEEP_SEPARATE(미배선)** | `:1-24` — roas metric 조건트리이나 마케팅 도메인, RBAC role 활성화 표현식 아님 |
| `Department`/`MFA`/`BusinessHours` 개별 Attribute 실재 여부 | **부분 실재(role expression 결합 지점은 ABSENT)** | MFA 여부(`UserAuth.php:3525,946,960`)는 실재하나 role expression으로 조합되는 지점 없음(EXISTING_IMPLEMENTATION §4) — Department는 컬럼 자체 grep 0(EXISTING_IMPLEMENTATION §4 표) |

★ground-truth §2 원문 재확인: "'IF department=X AND MFA=TRUE THEN role' 형태 RBAC Rule Engine=grep 0 완전 부재." 스펙 §7 예시가 사용하는 `Department`·`MFA`·`BusinessHours` 3개 구성요소 중 MFA만 컬럼 실재(role 미연결)이고, Department·BusinessHours(Time 조건)는 컬럼/로직 자체가 부재하다.

## 5. 설계 원칙

1. **표현식 문법은 Rule Engine(§6)의 Boolean/DSL/JSON 문법을 그대로 상속** — 별도 파서 신설 금지, Rule Engine 엔티티와 1:N 관계로 설계.
2. **`PolicyTreeEditor.jsx`는 UI 패턴 참고만 허용, 코드/데이터 재사용 금지(KEEP_SEPARATE)** — roas 조건트리 UI 컴포넌트 구조는 참고 가능하나 마케팅 스키마·API와 결합 금지.
3. **Attribute Source 부재 항목(Department 등)은 Rule Expression 설계보다 선행** — 표현식이 참조할 Attribute 자체가 없으면 표현식은 항상 ERROR/UNKNOWN(§9)로 귀결 → Attribute Source 엔티티(별도 문서) Gap과 연쇄.
4. **`action_clause`는 Runtime Policy(§17: Allow/Deny/Require MFA/Require Approval/Require Re-authentication)와 구분** — Rule Expression의 THEN절은 "role 활성/비활성"만 다루고, 세부 정책 강도는 Runtime Policy 엔티티가 별도 관장.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Rule Expression이 실제 Rule Engine에 로드·평가되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped 실 구현 이후. 본 차수 코드 0.
- **Gap-1(전면 ABSENT)**: RBAC 맥락 Rule Expression 자체가 순신규 — grep 0.
- **Gap-2(Attribute 선행 결여)**: 스펙 §7 예시가 요구하는 `Department` Attribute Source가 부재(컬럼 grep 0) — Rule Expression 설계보다 Attribute Source 스키마 신설이 선행되어야 실제 평가 가능.
- **Gap-3(오인 리스크)**: `PolicyTreeEditor.jsx`가 "이미 조건식 UI가 있다"는 과신을 유발할 수 있음 — 마케팅 roas 트리이며 RBAC 표현식과 무관(KEEP_SEPARATE 명문화).
- **정직 부재**: 예시 표현식("IF Department=Finance AND MFA=TRUE...")을 평가할 수 있는 코드가 시스템에 없음을 결함이 아닌 순신규 설계 대상으로 등재. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
