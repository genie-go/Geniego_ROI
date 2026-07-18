# DSAR — Approval Delegation Acceptance (§23)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §23 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · Delegate: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=23` → **§23 = 21**(줄범위 1154-1188 · 불릿 21 · 번호 0). 분할 = **필수필드 15 + Acceptance Status ENUM 6**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_ACCEPTANCE` 엔티티 | `delegation_acceptance`·`delegate_accept` grep **0** — 위임 수락 엔티티 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 위임 수락 절차(Delegate 동의) | 🔴 **위임 수락 개념 자체가 없다** — 유일 인접 `acl_permission` 위임상한은 **manager 일방 치환**(`TeamPermissions.php:652`·Delegate 동의 경로 0·ⓑ §2.1) | `ABSENT` |
| 승인 4경로 수락 단계 | 🔴 mapping/catalog/action_request/admin_growth **어디에도 대상자 수락 단계 없음**(승인자=진입게이트 통과 actor 본인·ⓑ §2.2) | `ABSENT` |
| immutable hash / evidence(인접 정본) | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·hash_equals+prev_hash·ⓑ §2.5) — 위임 수락 도메인 아님 | `LEGACY_ADAPTER` |
| terms/약관 버전 acknowledge | 🔴 위임 조건 열람·서명·terms version 계층 0 | `ABSENT` |

★**위임 수락 절차 자체가 전면 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산"을 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 21종**(필수 필드 15 + Acceptance Status ENUM 6)

### 필수 필드 (15)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_acceptance_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_delegation_version_id | Delegation Version(§10) 엔티티 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | delegate_subject_id | 🔴 Delegate/Subject Registry 부재(§3.3)·`parent_user_id` owner 붕괴(`UserAuth.php:156-157`) — 수락 주체 참조 대상 미정의 | `ABSENT` |
| 4 | acceptance status | 🔴 위임 수락 절차 부재 — 수락/거절 상태를 기록할 대상 자체가 없음(ⓑ §2.1 "수락=없음·manager 일방 치환") | `ABSENT` |
| 5 | accepted_at | 수락 시각 기록 계층 0 | `ABSENT` |
| 6 | declined_at | 거절 시각 기록 계층 0 | `ABSENT` |
| 7 | reason | 수락/거절 사유 기록 0 | `ABSENT` |
| 8 | scope acknowledged | 🔴 위임 Scope 열람·동의(acknowledge) 절차 0 | `ABSENT` |
| 9 | monetary limit acknowledged | 🔴 금액축 자체 부재(HIGH_VALUE_KRW 상수만·ⓑ §3.2) — 한도 열람·동의 대상 없음 | `ABSENT` |
| 10 | legal entity acknowledged | 🔴 Legal Entity 부재(`biz_no`/`corp_reg`/`tax_id` grep 0·§3.3) — 법인 열람·동의 대상 없음 | `ABSENT` |
| 11 | re-delegation policy acknowledged | 🔴 재위임 개념 0(§5.7) — 재위임 정책 열람·동의 대상 없음 | `ABSENT` |
| 12 | terms version | 위임 조건(terms) 버전 관리 계층 0 | `ABSENT` |
| 13 | immutable hash | 정본 = `SecurityAudit::verify():56-68`(preimage ts·hash_equals+prev_hash·tenant·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| 14 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 15 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

### Acceptance Status (6)

| # | 원문 Status | 현행 대조 | 판정 |
|---|---|---|---|
| 16 | NOT_REQUIRED | 수락 절차 부재 → 상태 열거 미시드 | `NOT_APPLICABLE` |
| 17 | PENDING | 수락 대기 상태 없음 | `NOT_APPLICABLE` |
| 18 | ACCEPTED | 수락 완료 상태 없음 | `NOT_APPLICABLE` |
| 19 | DECLINED | 거절 상태 없음 | `NOT_APPLICABLE` |
| 20 | EXPIRED | 수락 만료 상태 없음 | `NOT_APPLICABLE` |
| 21 | REVOKED | 수락 철회 상태 없음 | `NOT_APPLICABLE` |

**실측 개수: 21 / 21 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 3 · `ABSENT` 10 · `NOT_APPLICABLE` 8.

> 🔴 **커버 0.** 위임 수락 절차(Delegate 동의)가 전면 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 3건(immutable hash·status·evidence)은 **확장 대상 인접 자산**(evidence=`SecurityAudit::verify()`)이지 커버가 아니다. Acceptance Status 6종은 수락 상태머신 신설이 **선행**돼야 존재하며, 나머지 수락 관련 필드 10종은 위임 수락 절차 자체가 부재다.

## 2. 규칙

- 🔴 **원문 §23 "Delegate 가 Decline 한 Delegation 을 활성화하지 마라" — 그러나 현행엔 수락/거절 개념이 없다.** 스펙은 Delegate 의 명시적 수락(ACCEPTED)을 활성화 전제로 두고 Decline 된 위임 활성화를 차단하지만, 현행 레포에는 **위임 수락 절차가 전면 부재**(유일 인접 `acl_permission` 위임상한은 `TeamPermissions.php:652` manager 일방 치환·Delegate 동의 경로 0)하여 이 게이트를 집행할 대상이 없다. 따라서 `acceptance status`=`ABSENT` — **Delegation Acceptance 신설이 선행**돼야 "Decline 위임 활성화 차단" 규칙이 성립한다. manager 일방 치환을 "수락 완료"로 오독하지 마라(우연한 부재≠준수·§58 ⑦).
- 🔴 **`*acknowledged`(scope/monetary limit/legal entity/re-delegation policy) 4필드를 "동의 불필요=자동 통과"로 처리 금지** — Scope/금액한도/법인/재위임 정책의 열람·동의 계층이 부재(`ABSENT`)한 것이지 "동의가 필요 없다"가 아니다. 특히 `monetary limit acknowledged`·`legal entity acknowledged` 는 금액축(ⓑ §3.2)·Legal Entity(§3.3)가 선행 신설돼야 열람 대상 자체가 성립한다.
- 🔴 **`immutable hash`·`evidence` 는 `SecurityAudit::verify()` 확장** — 정본은 `SecurityAudit::verify():56-68`(preimage ts 저장·hash_equals·prev_hash·tenant)이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식). 수락 증거는 새 엔진을 만들지 말고 SecurityAudit 검증형 체인을 확장하라(중복 엔진 금지).
