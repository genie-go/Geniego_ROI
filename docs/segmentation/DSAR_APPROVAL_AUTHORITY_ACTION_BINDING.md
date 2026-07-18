# DSAR — Action Authority Binding · 필수필드 (§23 분할2)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §23(1209-1263) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§23 측정기 정합)**: `measure_spec_denominator.mjs --sec=23` 실측 **41**(불릿 41·번호 0). §23 = **지원 Action 28 + 필수필드 13 = 41**. 본 문서(분할2)는 **필수필드 13**을 전사한다. 지원 Action 28 = [DSAR_APPROVAL_AUTHORITY_ACTION_TYPE.md](DSAR_APPROVAL_AUTHORITY_ACTION_TYPE.md)(분할1).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_ACTION_BINDING` 엔티티 | 🔴 Registry(§6)·Matrix(§12)·Entry(§14) 전량 부재 → Action Binding(액션↔Matrix Entry 결속 행) 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| before/after state·prohibited state transitions | 상태전이 다수·전이 가드 8곳·`SET status` 128건이나 **합법 전이집합 선언 0**(전 도메인·ⓑ 5-3-3-3 앵커 · [DSAR_APPROVAL_ALLOWED_TRANSITIONS.md](DSAR_APPROVAL_ALLOWED_TRANSITIONS.md)) · 직접 덮어쓰기 예 `Alerting.php:653` | `LEGACY_ADAPTER` |
| additional approval requirement | 인접 = `required_approvals` — 유일 생산자 = `Mapping.php:209-210` 리터럴 `2` + `Db.php:634` `DEFAULT 2` · **금액·건종류 무관 고정**(요건 모델 아니라 상수·ⓑ §1) | `LEGACY_ADAPTER` |
| evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |
| valid_to | 🔴 `valid_to`/`effective_to` grep **0**(오탐 `Onsite.php:396` invalid_token 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |

★**Action Binding 엔티티 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§23 필수필드 13**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | action_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | Matrix Entry(§14) 부재 → FK 참조 대상 없음(ⓑ §1·§72 전량 신설) | `NOT_APPLICABLE` |
| 3 | action_type | 인접 = 지원 Action 28(분할1) — APPROVE=`acl_permission.approve` 장식(`TeamPermissions.php:39`·seed `:708`~`:717`)·상태전이·도메인 파이프라인 인접이나 **authority action taxonomy 선언 0**(승인 판정축=HTTP 메서드 `index.php:568`·ⓑ §3·§4.2) | `LEGACY_ADAPTER` |
| 4 | decision type reference | 🔴 decision type 분류 축 부재 — Approve/Override/Activate/Pay **미분리**(단일 게이트·ⓑ §2·§3) · 결정은 approve/reject 이진 상태값(`Mapping:285`{user,ts})뿐 | `ABSENT` |
| 5 | resource state requirements | 인접 = 리소스 status 컬럼·전이 가드 8곳 실재이나 **사전조건(요건) 선언 0**(ⓑ §2·5-3-3-3) — 상태 컬럼 有·요건 술어 無 | `LEGACY_ADAPTER` |
| 6 | before state | 상태전이 실재(`SET status` 128건)이나 **합법 before-state 집합 선언 0**(ⓑ §2·5-3-3-3) — 전이 가드 8곳 인접 | `LEGACY_ADAPTER` |
| 7 | after state | 상태전이 실재이나 **합법 after-state 집합 선언 0** · `Alerting.php:653` 직접 덮어쓰기가 2단계 전이 위반(ⓑ 5-3-3-3) | `LEGACY_ADAPTER` |
| 8 | additional approval requirement | 인접 = `required_approvals`(유일 생산자 `Mapping.php:209-210` 리터럴 `2`·`Db.php:634` `DEFAULT 2`) — **금액·건종류 무관 고정 상수**(요건 모델 아님·ⓑ §1) · Alerting `required_approvals=2`는 응답 표시용·미집행(fake-looks-real·ⓑ §2) | `LEGACY_ADAPTER` |
| 9 | prohibited state transitions | 🔴 상태전이 다수이나 **금지(prohibited) 전이집합 선언 0**(전 도메인·전이 가드 8곳·`SET status` 128건·ⓑ 5-3-3-3 앵커) — 합법/금지 전이 명세 부재 | `LEGACY_ADAPTER` |
| 10 | valid_from | 인접 = `kr_fee_rule.effective_from`(open-interval·수수료/VAT 도메인·`Db.php:898`·ⓑ §5) — 승인/권한 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 11 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) → 폐구간 신규 | `ABSENT` |
| 12 | status | 인접 = 상태전이 다수이나 합법 전이집합 선언 0(ⓑ §2) | `LEGACY_ADAPTER` |
| 13 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 13 / 13 전사** (§23 필수필드). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 9 · `ABSENT` 2 · `NOT_APPLICABLE` 2.

> 🔴 **커버 0.** Action Binding 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 9건(action_type·resource state requirements·before/after state·additional approval requirement·prohibited state transitions·valid_from·status·evidence)은 **확장 대상 인접 자산**이지 커버가 아니다 — 특히 before/after/prohibited 3필드는 **상태전이가 실재해도 합법 전이집합이 선언되지 않아** 실 능력이 아니다. `valid_to`·`decision type reference`는 상위 축(폐구간 dating·decision type 분류)이 구조적으로 부재하여 `ABSENT`.

## 2. 규칙

- 🔴 **§23 마지막 문장 "Approve·Override·Activate·Pay 권한을 분리하라" 를 `action_type`/`decision type reference` 에 명기하라** — 현행은 승인 4경로 전부 단일 진입 게이트로 **미분리**(SoD gap §65). Action Binding은 APPROVE / OVERRIDE_REFERENCE / ACTIVATE / PAY 를 **서로 다른 decision type + authority action** 으로 결속하여 직무분리(SoD)를 강제해야 한다. `acl_permission.approve` 비트(승인 판독 0·ⓑ §3)를 승인 게이트로 재사용하지 마라.
- 🔴 **`before state`/`after state`/`prohibited state transitions` 를 스텁으로 두지 마라** — 상태전이가 다수 실재(전이 가드 8곳·`SET status` 128건)해도 **합법/금지 전이집합 선언이 0**이라 `Alerting.php:653` 같은 직접 덮어쓰기가 2단계 전이를 원천 위반한다(ⓑ 5-3-3-3). Action별 허용 before→after 집합과 금지 전이를 1급 명세로 선언하라 — 정렬/표시 컬럼만 만들면 §65 무단 전이를 조용히 통과시킨다.
- 🔴 **`additional approval requirement` 를 `required_approvals` 고정 상수 `2` 로 재구현하지 마라**(`LEGACY_ADAPTER`) — 현행은 금액·건종류 무관 리터럴 2(`Mapping.php:209-210`·`Db.php:634`)이고 Alerting의 `=2`는 표시용·미집행(fake-looks-real·ⓑ §2). 추가승인 요건은 §24 Amount Band·decision type과 결속된 **요건 모델**로 세우되 신규 임계상수 추가는 금지한다.
- 🔴 **`evidence` 를 `SecurityAudit::verify()` 로 확장하고 `menu_audit_log.hash_chain` 은 인용 금지** — menu_audit_log는 `verify()` 0·preimage ts 소실로 검증 불가능한 장식이다([[reference_menu_audit_log_not_tamper_evident]]). Action Binding 증거는 tenant 포함 해시·prev_hash 교차검증(`SecurityAudit.php:56-68`)을 확장하라.
- 🔴 **`valid_to` 를 in-place 소거로 대체하지 마라**(`ABSENT`→폐구간 신규) — `AgencyPortal.php:304`,`:381` `revoked_at=NULL` in-place 소거(ⓑ §5) 선례를 복제하면 as-of 재구성이 불가해진다. valid_from/valid_to 폐구간 dating을 신설하라.
