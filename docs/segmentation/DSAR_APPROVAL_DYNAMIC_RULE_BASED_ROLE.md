# DSAR — Approval Dynamic Rule-based Role (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Rule-based Role)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Rule-based Role은 스펙 §1 구현범위 9번(Rule-based Role)이 정의하는, IF-THEN 규칙 평가 결과로 role을 활성화하는 Dynamic Role 유형이다(예: 스펙 §7 "IF Department=Finance AND MFA=TRUE AND BusinessHours=TRUE THEN Activate Finance Approver Role"). ground-truth §2·§10과 DUPLICATE_AUDIT D-1은 **RBAC용 Rule-based Role이 완전 순신규(ABSENT)**이며, 명명이 유사한 마케팅 automation(`RuleEngine.php` 등 4곳)을 RBAC Rule Engine으로 오인해서는 안 된다고 명시적으로 경고한다(**KEEP_SEPARATE**). 본 엔티티는 이 경계를 명문화한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `rule_role_id` | Rule-based Role 식별자(PK) |
| `rule_ref` | 평가 규칙 참조(별도 엔티티 — Rule Engine/Rule Expression) |
| `evaluation_result` | `TRUE`/`FALSE`/`UNKNOWN`/`ERROR`(스펙 §9·UNKNOWN Permit 금지) |
| `target_role_ref` | Part 3-1 Role Registry 참조 |
| `domain_boundary` | `RBAC`(본 엔티티 대상) vs `MARKETING_AUTOMATION`(KEEP_SEPARATE·오흡수 금지 표식) |

## 3. 열거형 / 타입

- **`evaluation_result`**(스펙 §9 verbatim): `TRUE` · `FALSE` · `UNKNOWN` · `ERROR`. ★UNKNOWN은 Permit하지 않는다.
- **`domain_boundary`**(설계 판정 축, ADR D-4 반영): `RBAC`(role/permission 활성화 목적) · `MARKETING_AUTOMATION`(광고/재고/ML 자동화 — KEEP_SEPARATE).

## 4. 실 substrate 매핑 (ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| RBAC용 Rule Engine(IF-THEN → role 활성화) | **ABSENT** | "IF department=X AND MFA=TRUE THEN role" 형태 grep 0(EXISTING_IMPLEMENTATION §2·§10) |
| `RuleEngine.php`(명명 유사·오인 대상 1) | **KEEP_SEPARATE(마케팅/재고)** | `:12,24` 범용 IF-THEN·조건=channel_roas/sku_stock/conversions(`:32`)·액션=alert/webhook/pause_channel/reorder(`:34`)·`evaluateTenant`(`:194-220`)에 role/permission 문자열 전무 |
| `Alerting.php`(오인 대상 2) | **KEEP_SEPARATE(알림 규칙)** | `:12` |
| `AutoCampaign.php`(오인 대상 3) | **KEEP_SEPARATE(광고 가드레일)** | `:14-15,222-226`(RuleEngine와 디컨플릭트·소유권 분리) |
| `Decisioning.php`(오인 대상 4) | **KEEP_SEPARATE(마케팅 decision)** | `:12` |
| FE `PolicyTreeEditor.jsx`(오인 대상 5) | **KEEP_SEPARATE(roas 조건트리·미배선)** | `:1-24` |

★DUPLICATE_AUDIT D-1 재확인: "명명(rule/drift/simulate)만 유사·대상 도메인(광고·재고·ML)이 전혀 다름. Canonical Dynamic Role Engine은 이들을 **흡수하지 않음**(별개 유지)." RBAC Rule-based Role은 위 4개 시스템과 코드 재사용·데이터 모델 공유 없이 순신설되어야 한다.

## 5. 설계 원칙

1. **마케팅 automation 오흡수 절대 금지(D-4·최우선 불변)** — `RuleEngine.php`를 RBAC Rule Engine으로 재사용하는 시도는 ADR 대안 B로 명시 기각됨("대상 도메인 전혀 다름·RBAC role/permission 미취급(오흡수=가짜 녹색)").
2. **UNKNOWN/ERROR는 Permit 금지(fail-closed)** — Rule-based Role 평가가 UNKNOWN/ERROR를 반환하면 target role은 비활성 유지.
3. **`domain_boundary` 필드를 코드 레벨 게이트로 강제** — RBAC Rule-based Role 저장소는 marketing automation 테이블/클래스와 물리적으로 분리(스키마 공유 금지).
4. **Golden Rule** — 중복 Rule Engine 신설 금지 원칙은 "마케팅 RuleEngine 재사용 금지"와 "동일 RBAC Rule Engine을 두 번 만들지 않음" 양쪽에 적용.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Rule-based Role이 Part 3-1 Role Registry·Part 2 Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(전면 ABSENT)**: RBAC IF-THEN → role 활성화 로직 자체가 순신규 — 재사용 가능한 근접 substrate 없음(마케팅 4곳은 재사용 대상이 아니라 경계 대상).
- **Gap-2(오인 리스크)**: `RuleEngine`/`Rule`/`Policy` 명명이 마케팅·RBAC 양쪽에 존재해 향후 신규 개발자가 혼동할 위험 — 본 문서·ADR D-4가 명문 경계.
- **정직 부재**: 마케팅 automation 4곳을 "RBAC Rule Engine 이미 존재"로 과신 금지 — 도메인이 다름. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
