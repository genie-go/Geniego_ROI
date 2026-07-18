# DSAR — Threshold Action (§29)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §29(1464-1478) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §2·§4·§6 · 임계: [DSAR_APPROVAL_AUTHORITY_THRESHOLD.md](DSAR_APPROVAL_AUTHORITY_THRESHOLD.md)
>
> **분모**: §29 측정기 합계 = **9**(지원 Action 9). 본 문서가 전량을 다룬다.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Threshold Action 개념 | 임계 초과 시 액션 분기 부재 — `HIGH_VALUE_KRW`(`Catalog.php:1016·1103-1105`)는 `requires_approval=true` **boolean 만** 켜고 액션 유형 분기 없음(ⓑ §4) | `NOT_APPLICABLE` |
| 상위 레벨 요구 | 🔴 승인 체인 레벨 자체 부재 — 5-3-3-3 Approval Chain 커버 **0** · "상위 Authority Level 요구" 참조 대상 없음 | `BLOCKED_PREREQUISITE` |
| explicit deny | 🔴 `acl_permission` = allow-only(ⓑ §3·§6) — explicit deny 표현 자체가 없음 | `ABSENT` |
| manual review 인접 | `Mapping::approve:238-294` maker-checker 정족수(`required_approvals` 리터럴 2·`:209`·서로 다른 2인·자기승인 차단 `:268`) — 임계 연동 아님·부분(ⓑ §2) | `LEGACY_ADAPTER` |

★임계 초과 후 **분기 액션** 개념이 레포에 없다. 유일 금액조건은 boolean 게이트 한 갈래뿐이며, 상위 레벨 승격·재무/임원 리뷰·명시 거부 경로가 전무하다.

## 1. 원문 전사 + 판정 — **지원 Action 9**

| # | 원문 Action | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | AUTHORITY_SATISFIED | 🔴 "권한 충족→통과" 판정 부재 — 현행은 임계-Authority 만족 개념 없이 boolean requires_approval 만(ⓑ §4) | `NOT_APPLICABLE` |
| 2 | REQUIRE_NEXT_LEVEL | 🔴 다음 승인 레벨 요구 = 승인 체인 레벨 부재(5-3-3-3 커버 0) | `BLOCKED_PREREQUISITE` |
| 3 | REQUIRE_ADDITIONAL_LEVEL | 🔴 추가 레벨 요구 = 체인 레벨 부재(동일) | `BLOCKED_PREREQUISITE` |
| 4 | REQUIRE_FINANCE_REVIEW | 🔴 Finance Approval Matrix 부재(ⓑ §1 부재목록) — 재무 리뷰 경로 없음 | `NOT_APPLICABLE` |
| 5 | REQUIRE_EXECUTIVE_REVIEW | 🔴 임원 리뷰 경로 부재 — 상급자(사람) 반환 함수 0·다홉 사람계층 walk 0(ⓑ §3 §4.1) | `NOT_APPLICABLE` |
| 6 | REQUIRE_MANUAL_REVIEW | 인접 = `Mapping::approve:238-294` 정족수 maker-checker 실집행(부분·단 임계 연동 아님·ⓑ §2) | `LEGACY_ADAPTER` |
| 7 | DENY | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §3·§6) | `ABSENT` |
| 8 | BLOCK | 임계 초과 차단 액션 개념 부재 — high_value 는 boolean 게이트일 뿐 block 분기 아님(ⓑ §4) | `NOT_APPLICABLE` |
| 9 | CUSTOM | 사용자 정의 액션 부재 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#6) · `BLOCKED_PREREQUISITE` 2(#2·3) · `ABSENT` 1(#7) · `NOT_APPLICABLE` 5(#1·4·5·8·9).

> 🔴 **커버 0.** 임계 액션 9종 중 어느 것도 승인/금액 Authority 도메인에 실재하지 않는다. `LEGACY_ADAPTER` 1건(REQUIRE_MANUAL_REVIEW≈Mapping 정족수)은 **임계값 연동 없는 부분 인접**이며 커버가 아니다.
> 🔴 **원문 §29 규칙 미충족**: 원문은 *"Amount가 한도를 초과했을 때 자동 Reject 하지 말고 Chain Policy에 따라 상위 Authority Level을 요구할 수 있게 하라"*(`:1478`)를 요구하나, 현행 `HIGH_VALUE_KRW`(₩5M)는 **boolean 만** 켜며 상위 레벨(REQUIRE_NEXT_LEVEL/ADDITIONAL_LEVEL)이 존재하지 않는다 — 상위 레벨 요구는 5-3-3-3 승인 체인 부재로 `BLOCKED_PREREQUISITE` 다.

## 2. 규칙

- 🔴 **원문 §29 핵심 규칙 명기** — *"한도 초과 시 자동 Reject 말고 상위 Authority Level 요구"*: 현행 `HIGH_VALUE_KRW`(`Catalog.php:1016`)는 상위 레벨 없이 `requires_approval` boolean 한 갈래만 켠다(상위레벨 없음). REQUIRE_NEXT_LEVEL/ADDITIONAL_LEVEL 은 5-3-3-3 Approval Chain 레벨을 선행 신설해야 표현 가능하다 — 그 전엔 `BLOCKED_PREREQUISITE`.
- 🔴 **`DENY` 를 "있음"으로 표기 금지** — `acl_permission` 은 allow-only 로 explicit deny 표현이 없다(ⓑ §6). deny>allow 우선(§4.9) 구조를 만들려면 deny 표현 자체를 신설해야 한다(ABSENT).
- 🔴 **`REQUIRE_MANUAL_REVIEW` 를 Mapping 정족수 재구현으로 채우지 마라** — `Mapping::approve` maker-checker(서로 다른 2인·자기승인 차단·`:238-294`)는 레포 유일 실 정족수이나 임계값 연동이 없다. Manual review 정책은 그 패턴을 **참조**하되 Threshold 연동으로 확장하라. **중복 엔진 금지.**
- 🔴 **Action 9종을 ENUM 하드코딩하지 마라** — 상당수(FINANCE/EXECUTIVE REVIEW·NEXT_LEVEL)가 선행 엔티티(Finance Matrix·승인 체인) 부재로 현재 미표현이다. 확장 가능 카탈로그로 두어 선행 신설 시 무예외 확장되게 하라(5-3-3-1 §8 ENUM INSERT 예외 선례 반복 금지).
