# DSAR — Approval Authority Static Lint (§66)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §66(2647-2678) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=66` → **§1 항목 28**(불릿 28·번호 0). 육안 금지.

## 0. 판정 원리 — "lint 대상 엔티티가 없다"

§66은 "이번 블록에서 차단하라"는 **최소 정적 검사(static lint)** 목록이다. lint는 **정의(Definition)를 저장·커밋하는 시점**에 그 정의의 결손을 잡는다. 그러나 이 레포에는 **Authority Definition / Matrix / Threshold / Subject Binding 엔티티가 통째로 부재**하다(ⓑ §0·§1). → **lint가 겨눌 저장 대상 자체가 없으므로 대부분 `NOT_APPLICABLE`**(엔티티 신설 시 함께 켤 규칙).

예외 판정:
- **Cross-Tenant Binding** → `LEGACY_ADAPTER` — 정적검사 대상 Binding은 없으나, 런타임 tenant 격리 가드는 실재(`index.php:600`). "완전 무방비"로 오표기 금지.
- **Snapshot 직접 수정 / Explicit Deny Effect 누락 / Missing FX Policy** → `ABSENT` — 인접 저장자산(SecurityAudit·acl_permission·FX 변환기)은 있으나 **해당 통제가 의미 있게 빠져 있음**.

★**`VALIDATED_LEGACY` 미사용**(cover 0). 어떤 lint도 "기존 구현이 이미 위반을 막는다"가 아니다.

## 1. 원문 전사 + 판정 — **원문 28종**(§66 2651-2678)

| # | 원문 lint 규칙(verbatim) | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Tenant 없는 Authority Definition | Authority Definition 엔티티 부재(ⓑ §1) — 검사할 정의 없음 | `NOT_APPLICABLE` |
| 2 | Authority Type 없는 Definition | Authority Type(§7) 자체 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | Authority Domain 없는 Definition | Authority Domain(§8) 자체 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 4 | Effect 없는 Authority | Authority·Effect(allow/deny) 개념 부재 · `acl_permission`=allow-only(ⓑ §6) | `NOT_APPLICABLE` |
| 5 | Active Version 없는 Active Authority | 불변 버전체인 선례 0 · version 컬럼 6개 하드코딩 태그(ⓑ §5) | `NOT_APPLICABLE` |
| 6 | Matrix 없는 Monetary Authority | Authority Matrix·Monetary Authority 둘 다 0(ⓑ §1·§4) | `NOT_APPLICABLE` |
| 7 | Matrix Version 없는 Active Matrix | Matrix 엔티티 부재 → 버전 검사 대상 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | Amount Band 없는 Monetary Entry | Amount Band 0 · 유일 금액=HIGH_VALUE_KRW 상수(ⓑ §4) | `NOT_APPLICABLE` |
| 9 | Currency Scope 없는 Monetary Entry | `currency_scope`/`allowed_currency` 0(ⓑ §4 §26) | `NOT_APPLICABLE` |
| 10 | Lower Bound > Upper Bound | Amount Band 경계 컬럼 부재 → 경계 대소 검사 무대상(ⓑ §4) | `NOT_APPLICABLE` |
| 11 | Overlapping Threshold | `amount_threshold`/`approval_threshold` 0(ⓑ §4) | `NOT_APPLICABLE` |
| 12 | Threshold Gap | threshold 엔티티 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 13 | Inclusive Boundary 충돌 | 경계 포함/배제 표현 부재(threshold 0) | `NOT_APPLICABLE` |
| 14 | Legal Entity Scope 없는 Financial Authority | Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `NOT_APPLICABLE` |
| 15 | Action Scope 없는 Approval Authority | Approval Authority 엔티티 0 · action scope는 HTTP 메서드 축(index.php:568)뿐(ⓑ §4.2) | `NOT_APPLICABLE` |
| 16 | Subject Authority 사유 누락 | Subject Authority 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 17 | Subject Authority 종료일·Review Date 누락 | 동상 · `valid_to`/review date 저장 0(ⓑ §5) | `NOT_APPLICABLE` |
| 18 | Role Name 문자열 기반 Binding | Authority Binding 엔티티 부재 → 검사 무대상 · 단 현행 `$roleRank` 문자열 판정(`index.php:554`)이 **이 lint가 겨눌 안티패턴**(ⓑ §4.2·§65-#27과 대응) | `NOT_APPLICABLE` |
| 19 | Position Vacancy Policy 누락 | Position/공석 정책 엔티티 0(ⓑ §3) | `NOT_APPLICABLE` |
| 20 | Cross-Tenant Binding | 정적 Binding 부재이나 **런타임 격리 가드 실재**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 REAL · 단 strict 기본 OFF `:585`·ⓑ §7) | `LEGACY_ADAPTER` |
| 21 | Active Version 직접 수정 | Active Version 엔티티 부재 → immutable 대상 없음(ⓑ §5) | `NOT_APPLICABLE` |
| 22 | Snapshot 직접 수정 | Actor Auth Snapshot 부재이나 **불변 정본=`SecurityAudit::verify():56-68`**(재계산+prev 교차 · ⓑ §5) — 확장 대상 인접자산 실재 · 🔴`menu_audit_log.hash_chain` 인용 금지 | `ABSENT` |
| 23 | Explicit Deny Effect 누락 | `acl_permission`=**allow-only** · deny effect 표현 자체가 없음(ⓑ §3·§6) | `ABSENT` |
| 24 | Limit Period 없는 Cumulative Authority | 승인 Cumulative Authority 0 · `AutoCampaign:843-889` 예산 한도+기간은 **마케팅 도메인**(승인 아님·ⓑ §4 §30/§31 FLIP) | `NOT_APPLICABLE` |
| 25 | Utilization Source 없는 Period Limit | Period Limit(승인축) 0 · utilization source 미결(ⓑ §4 §31) | `NOT_APPLICABLE` |
| 26 | Missing FX Policy | FX 변환기+24h TTL 가드 실재(`Connectors.php:1749`·`:1794`)이나 **FX Policy 저장계층 부재**(rate_date·as-of 컬럼 0·ⓑ §4 §27) | `ABSENT` |
| 27 | Mandatory Financial Control 제거 | Mandatory Financial Control 개념 0 → 제거를 막을 lock 대상 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 28 | 기존 Authority Matrix 중복 생성 | Authority Matrix 0 → **중복이 아니라 부재**(ⓑ §73·§3.4 마지막 문장 전건 거짓) · 유일 중복후보=HIGH_VALUE_KRW 단건 | `NOT_APPLICABLE` |

**실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#20) · `ABSENT` 3(#22·23·26) · `NOT_APPLICABLE` 24.

> 🔴 **커버 0.** lint 24건이 `NOT_APPLICABLE`인 것은 "이미 준수"가 아니라 **검사할 저장 대상(Authority Definition/Matrix/Threshold/Subject Binding)이 통째로 없다**는 뜻이다. 엔티티 신설과 **동시에** 이 24개 lint를 켜지 않으면 §65 gap이 그대로 재유입된다. `LEGACY_ADAPTER` 1건(Cross-Tenant)은 런타임 가드일 뿐 정적 Binding 검사가 아니다.

## 2. 규칙

- 🔴 **엔티티 신설 = lint 24개 동시 발동이 완료조건** — Definition/Matrix/Threshold/Subject Binding DDL 신설 커밋에 §66 24개 static lint를 **같은 PR로** 붙여라. lint 없는 스키마 신설은 §65 gap을 구조적으로 재초대한다.
- 🔴 **Cross-Tenant Binding(#20)은 strict 기본 ON으로 신설** — 기존 `index.php:600` 런타임 가드를 신뢰하되 **strict fail-closed(`:585` opt-in)를 Authority 경로에서는 기본 ON**으로. Registry의 `tenant_id`를 느슨한 VARCHAR로 두면 가드가 무력화된다(ⓑ §7).
- 🔴 **Explicit Deny Effect(#23)를 1급 컬럼으로** — allow-only 위에 나중에 deny를 얹지 말고 Effect(allow/deny)를 스키마 신설 시점부터. lint는 "Effect 없는 Authority"(#4)와 "Deny Effect 누락"(#23)을 함께 잡아야 한다.
- 🔴 **Snapshot immutable(#22)은 `SecurityAudit::verify()` 확장** — 새 해시체인 엔진을 만들지 말고 tenant 포함 해시+prev 교차검증 정본을 재사용(중복 엔진 금지). `menu_audit_log.hash_chain`은 verify() 0·preimage ts 소실로 검증 불가능한 장식 → **인용 금지**([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **Missing FX Policy(#26)는 저장계층부터** — 24h TTL "있음"을 근거로 FX Policy를 "부분 구현"으로 오표기 금지. rate_date/as-of 컬럼 신설이 선행이며, 그 전엔 고액 승인 확정환율 lint를 켤 수 없다(ⓑ §4 §27).
- 🔴 **"중복 생성 금지"(#28) 전건 재확인** — Authority Matrix가 0이므로 중복 방지 lint는 **엔티티 신설 이후에야 의미**를 가진다. 지금 신설을 "중복"으로 오판해 착수를 미루지 마라(ⓑ §73 "중복 아니라 부재").
