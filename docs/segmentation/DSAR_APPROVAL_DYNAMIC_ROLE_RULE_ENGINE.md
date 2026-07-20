# DSAR — Approval Dynamic Role Rule Engine (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Rule Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지 · Dynamic Role ≠ 정적 role(Context가 role 결정) · 마케팅 Rule Engine(RuleEngine.php/Alerting/AutoCampaign/Decisioning/PolicyTreeEditor) 오흡수 금지(KEEP_SEPARATE) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Rule Engine은 스펙 §6이 정의하는, Rule-based Role·Conditional Role 평가를 수행하는 **평가 엔진 자체**다(Boolean Expression·DSL Rule·JSON Rule·Policy Reference·Rule Composition·Nested Rule·Rule Group·Rule Priority). ADR D-1·D-4와 ground-truth §2·§10, DUPLICATE_AUDIT D-1은 이 항목에 대해 가장 명시적이고 반복적인 경고를 담고 있다: **RBAC용 Rule Engine은 ABSENT이며, 이름이 유사한 `RuleEngine.php`(마케팅/재고 자동화)를 재사용·오흡수해서는 절대 안 된다(KEEP_SEPARATE)**. 본 엔티티는 이 경계와 신설 대상 자체를 정의한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `rule_engine_id` | Rule Engine 인스턴스 식별자 |
| `rule_syntax` | §6 문법(Boolean/DSL/JSON) |
| `composition_mode` | Rule Composition/Nested Rule/Rule Group 여부 |
| `priority` | Rule Priority(다중 규칙 충돌 시 우선순위) |
| `policy_reference` | Policy Reference(별도 Runtime Policy 엔티티 연동) |
| `owning_domain` | `RBAC`(본 엔티티) — `MARKETING_AUTOMATION`은 별도 도메인(비-Canonical) |

## 3. 열거형 / 타입

- **`rule_syntax`**(스펙 §6 verbatim): `Boolean Expression` · `DSL Rule` · `JSON Rule` · `Policy Reference` · `Rule Composition` · `Nested Rule` · `Rule Group` · `Rule Priority`.
- **`evaluation_output`**(스펙 §9 verbatim, 재사용): `TRUE` · `FALSE` · `UNKNOWN` · `ERROR`(UNKNOWN Permit 금지).

## 4. 실 substrate 매핑 (ABSENT/KEEP_SEPARATE·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| RBAC 맥락 Rule Engine(role/permission 문자열 취급) | **ABSENT** | `RuleEngine.php` `evaluateTenant`(`:194-220`)에 role/permission 문자열 전무(EXISTING_IMPLEMENTATION §2) |
| `RuleEngine.php`(마케팅/재고, 오인 대상 1) | **KEEP_SEPARATE** | `:12,24`(범용 IF-THEN)·조건 channel_roas/sku_stock/conversions(`:32`)·액션 alert/webhook/pause_channel/reorder(`:34`) |
| `Alerting.php`(오인 대상 2) | **KEEP_SEPARATE** | `:12`(알림 규칙) |
| `AutoCampaign.php`(오인 대상 3) | **KEEP_SEPARATE** | `:14-15,222-226`(RuleEngine 디컨플릭트·소유권 분리) |
| `Decisioning.php`(오인 대상 4) | **KEEP_SEPARATE** | `:12`(마케팅 decision) |
| `AnomalyDetection`(오인 대상 5, 명명만 언급) | **KEEP_SEPARATE** | ADR §3 D-1 표 — grep/file:line 미인용, 도메인만 열거(ML 이상탐지) |
| FE `PolicyTreeEditor.jsx`(오인 대상 6) | **KEEP_SEPARATE(미배선)** | `:1-24`(roas metric 조건트리) |

★DUPLICATE_AUDIT D-1: "명명(rule/drift/simulate)만 유사·대상 도메인(광고·재고·ML)이 전혀 다름. Canonical Dynamic Role Engine은 이들을 **흡수하지 않음**." ADR 대안 B("마케팅 `RuleEngine.php`를 RBAC Rule Engine으로 재사용")는 **기각**됨 — "대상 도메인 전혀 다름·RBAC role/permission 미취급(오흡수=가짜 녹색)".

## 5. 설계 원칙

1. **RBAC Rule Engine은 물리적으로 별개 신설(D-4 최우선 불변)** — `RuleEngine.php`와 클래스/테이블/네임스페이스 완전 분리. 공유 코드는 순수 유틸(예: JSON 파서) 수준으로 제한.
2. **UNKNOWN/ERROR Permit 금지를 평가 엔진 레벨에서 강제(§9·D-2)** — 개별 Rule 평가가 아니라 엔진의 반환 계약 자체에 이 안전장치를 내장.
3. **Rule Priority/Rule Group/Nested Rule은 평가 순서 결정론적 보장** — 다중 규칙 충돌 시 우선순위 미정의 상태를 UNKNOWN으로 처리(암묵적 TRUE/마지막-매치-승리 방지).
4. **Golden Rule** — 정적 rank 4곳(TeamPermissions/index.php RBAC/PlanPolicy/AdminMenu, DUPLICATE_AUDIT D-2)을 결정 입력으로 조립하되 Rule Engine 자체는 이들을 재구현하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Rule Engine이 Part 3-1 Role Registry·Part 2 Permission Engine과 결합되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(전면 ABSENT)**: RBAC 맥락 Rule Engine 자체가 순신규 — 재사용 가능한 코드 자산 없음.
- **Gap-2(오인 리스크·최우선 경계)**: 6개 마케팅/운영 시스템이 명명 유사성으로 혼동될 위험 — 신규 개발 착수 시 본 문서·ADR D-4를 최우선 참조.
- **정직 부재**: `RuleEngine.php` 등을 "RBAC Rule Engine이 이미 존재"로 과신 금지 — 도메인이 전혀 다름. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실 구현 + 별도 승인세션(RP-002).
