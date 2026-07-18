# DSAR — Approval Authority Binding (§15 · 필수필드 13)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 · 문서만**
> ★분할 분모: **Binding Type 15 + 필수필드 13 = 28 = §15 측정기 정합**
>   (`node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=15` → **불릿 28**). 본 문서는 그 중 **필수필드 13**을 전사한다. Binding Type 15 = [DSAR_APPROVAL_AUTHORITY_BINDING_TYPE.md](DSAR_APPROVAL_AUTHORITY_BINDING_TYPE.md).
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §15(966-1005) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5·§6 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_BINDING` 엔티티 | 🔴 grep **0** — 결속 엔티티 통째 부재(ⓑ §0) · `authority_matrix_entry_id` 참조 대상 = Authority Matrix 자체가 ABSENT(§72) | `ABSENT`(엔티티 전체 부재) |
| explicit deny 표현 | 🔴 `acl_permission`=**allow-only** — deny 비트/우선순위 표현 자체 없음(ⓑ §3.4·§6) | `ABSENT`(binding_effect DENY 부재) |
| 계층 상속 깊이 캡 선례 | 인접 실재 = `PM/Dependencies.php:83-97` cycle 검출 DFS `$depth < 10000` 깊이캡 — **그래프 walk 깊이 제한 패턴은 실재**(단 PM 의존성 도메인·승인 상속 아님) | `LEGACY_ADAPTER` |
| evidence 정본 | `SecurityAudit::verify():56-68`(tenant 포함 해시·prev_hash 교차·`hash_equals`·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**결속 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **필수필드 13**

| # | 원문 항목명 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_authority_binding_id | 결속 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | 🔴 참조 대상 Authority Matrix 엔티티 부재(§72 `CANONICAL_APPROVAL_AUTHORITY_*` 전량 ABSENT·ⓑ §0) — FK 걸 상대가 없음 | `NOT_APPLICABLE` |
| 3 | binding_type | Binding Type 15종 열거는 [BINDING_TYPE](DSAR_APPROVAL_AUTHORITY_BINDING_TYPE.md) 참조 · 결속 엔티티 부재로 타입 판별기 미시드 | `NOT_APPLICABLE` |
| 4 | binding_effect | 🔴 **DENY 없음** — `acl_permission`=allow-only(ⓑ §3.4·§6) · explicit deny > allow(§4.9) 구조 자체 부재 → GRANT/DENY 2값 결속 효과 표현 불가 | `ABSENT` |
| 5 | source_reference | 결속 근거 소스(role/org/position 출처) 참조 부재 — 결속 자체가 없어 source 추적 대상 없음 | `NOT_APPLICABLE` |
| 6 | scope_reference | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`)이나 **Authority 결속 스코프 아님**(장식) — 결속 엔티티 부재로 참조 대상 없음 | `NOT_APPLICABLE` |
| 7 | inherited 여부 | 결속 상속 플래그 부재 — 상속되는 결속 개념 자체 없음(승인=진입 게이트·상속 아님·ⓑ §3) | `NOT_APPLICABLE` |
| 8 | inheritance_depth | 인접 = `PM/Dependencies.php:83-97` DFS `$depth < 10000` 깊이캡(cycle 검출) — **그래프 walk 깊이 제한 패턴 실재**이나 PM 의존성 도메인·승인 상속 깊이 아님 | `LEGACY_ADAPTER` |
| 9 | priority | 인접 = `RuleEngine.php:250` ad_schedule precedence(마케팅 세그·승인 결속 우선순위 아님·ⓑ §6) — 결속 간 우선순위 선언 0 | `NOT_APPLICABLE` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료/VAT open-interval·`Db.php:898`·ⓑ §5) — **수수료 도메인 한정**이고 결속 엔티티엔 없음 | `NOT_APPLICABLE` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 · 결속 만료 표현 불가 | `ABSENT` |
| 12 | status | 결속 엔티티 부재 → 합법 상태전이집합 선언 0(전 도메인·ⓑ §5) · 판별할 status 컬럼 없음 | `NOT_APPLICABLE` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash 교차·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(8·13) · `KEEP_SEPARATE_WITH_REASON` 0 · `BLOCKED_CROSS_TENANT` 0 · `ABSENT` 2(4·11) · `NOT_APPLICABLE` 9(1·2·3·5·6·7·9·10·12).

> 🔴 **커버 0.** 결속 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. inheritance_depth·evidence 의 `LEGACY_ADAPTER` 는 **PM 의존성 DFS 깊이캡 / SecurityAudit 해시체인** 인접일 뿐 결속 커버가 아니다. binding_effect(DENY 부재)·valid_to(grep 0) 2건은 🔴 표현/저장계층부터 부재해 `ABSENT`.

## 2. 규칙

- 🔴 **`binding_effect` 를 GRANT-only 로 설계 금지** — `acl_permission` allow-only(ⓑ §3.4·§6)를 상속하면 §4.9 explicit-deny>allow 를 표현할 수 없고, §65 "Explicit Deny 우선 위반" gap 을 구조적으로 유발한다. GRANT/DENY 2값 + 우선순위 해소를 결속 신설 시 선결하라.
- 🔴 **`inheritance_depth` 를 `PM/Dependencies` DFS 로 재구현 금지** — `PM/Dependencies.php:83-97`은 PM 의존성 그래프 cycle 검출용 깊이캡(`$depth < 10000`)으로 도메인이 상이하다. 상속 깊이 제한 **패턴은 참조**하되(무한 상속·순환 결속 방지) 승인 결속 상속은 별도 계층으로 두라(중복 엔진 금지).
- 🔴 **`evidence` 를 `menu_audit_log.hash_chain` 으로 채우지 마라** — verify() 0·preimage ts 소실 = 검증 불가능한 장식([[reference_menu_audit_log_not_tamper_evident]]). 정본 = `SecurityAudit::verify():56-68` 확장(tenant 해시·prev_hash 교차·`hash_equals`).
- 🔴 **`valid_to` 를 "있음"으로 표기 금지** — 폐구간 만료(`valid_to`/`effective_to`)는 grep 0 이다(ⓑ §5). `effective_from` 은 수수료 도메인에 실재하나 open-interval(valid-from만)이라 만료 축이 없다 → 결속 만료·Review Date 는 신규 저장계층 신설이 필요하다.
