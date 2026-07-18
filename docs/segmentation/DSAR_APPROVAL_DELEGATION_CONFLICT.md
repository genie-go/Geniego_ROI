# DSAR — Approval Delegation Conflict 필수필드 (§34)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §34(1570-1595) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · Conflict Type=[DSAR_APPROVAL_DELEGATION_CONFLICT_TYPE.md](DSAR_APPROVAL_DELEGATION_CONFLICT_TYPE.md)
> 측정기 분모: `… --sec=34` → §34 합계 **46**(= Conflict Type 22 + 본편 필수필드 **24**). 본편 분모 = **24 / 24**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_CONFLICT` 엔티티 | grep **0** — Delegation Conflict 레코드 저장계층 부재(ⓑ §0) | `NOT_APPLICABLE`(부재→신설) |
| delegation candidates 소스 | §28 `Delegation Candidate`(SPEC 1297-1344) 산출기 부재 → 후보 목록 자체 없음(ⓑ §3.3 Resolver ABSENT) | `BLOCKED_PREREQUISITE` |
| resolved_by / evidence 관례 | resolved_by=actor 관례(승인 4경로 decided_by=호출자·ⓑ §2.2)·evidence 정본=`SecurityAudit::verify():56-68`(ⓑ §2.5) | `LEGACY_ADAPTER` |

★**엔티티 부재로 필드 단위 커버 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 관례 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 24종**(필수 필드)

원문 verbatim (SPEC §34 · 1572-1595):

```
필수 필드:
approval_delegation_conflict_id · approval_request_id · approval_case_id · approval_item_id
delegator subject id · delegate subject ids · delegation candidates · conflict type
conflicting delegation versions · authority · resource · action · organization · legal entity
amount · currency · period · severity · resolution policy · winning delegation
resolved_by · resolved_at · status · evidence
```

| # | 원문 필드 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | approval_delegation_conflict_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | approval_request_id | 🔴 §3.1 Approval Request 범용 테이블·핸들러 **0**(ⓑ §3.1) — 단발 플래그 3종만 | `ABSENT` |
| 3 | approval_case_id | Approval Case 엔티티 0(ⓑ §3.1 5-3-2 커버 0) | `ABSENT` |
| 4 | approval_item_id | Approval Item 엔티티 0(ⓑ §3.1) | `ABSENT` |
| 5 | delegator subject id | 🔴 위임자 subject 해석 = §3.3 Reporting-Line Resolver **ABSENT**(`UserAuth.php:156-157,1225-1227` parent_user_id 최상위 붕괴) + §28 후보 부재 | `BLOCKED_PREREQUISITE` |
| 6 | delegate subject ids | 수임자 후보 = §28 Delegation Candidate 산출기 부재(ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 7 | delegation candidates | 🔴 §28 후보 부재 — 충돌 판정 대상 집합 자체가 없음 | `BLOCKED_PREREQUISITE` |
| 8 | conflict type | 충돌 유형 산출 로직 0(Conflict Type 문서 커버 0) | `ABSENT` |
| 9 | conflicting delegation versions | 🔴 §28 후보 + 불변 버전체인(ⓑ §2.5 Snapshot 0) 둘 다 부재 | `BLOCKED_PREREQUISITE` |
| 10 | authority | 🔴 §3.2 Authority Registry/Matrix ABSENT(`authority_matrix` grep 0·ⓑ §3.2) | `ABSENT` |
| 11 | resource | 위임 리소스 스코프 0 · acl scopeSql=데이터행 필터(장식·ⓑ §2.1) | `ABSENT` |
| 12 | action | 위임 action 축 0 · acl action=부여상한만(ⓑ §2.1) | `ABSENT` |
| 13 | organization | Org Unit/Hierarchy 0·Resolver ABSENT(ⓑ §3.3) | `ABSENT` |
| 14 | legal entity | 🔴 Legal Entity 엔티티 0·회사프로필 단일 문자열(ⓑ §3.3) | `ABSENT` |
| 15 | amount | 🔴 금액축 부재 — HIGH_VALUE_KRW 상수(boolean·ⓑ §3.2) | `ABSENT` |
| 16 | currency | 통화 스코프 0·환율 저장계층 부재(ⓑ Authority §4) | `ABSENT` |
| 17 | period | 위임 유효기간 컬럼 0(ⓑ §2.1 expiry 부재) | `ABSENT` |
| 18 | severity | 충돌 severity 축 0 | `ABSENT` |
| 19 | resolution policy | §35 해소 우선순위 미구현(Conflict Resolution 문서 커버 0) | `ABSENT` |
| 20 | winning delegation | 우선순위 산출 결과 = resolution policy 부재로 불가 | `ABSENT` |
| 21 | resolved_by | 인접 관례 = 승인 4경로 decided_by=호출자(catalog `:2341-2364` identity 미기록·admin_growth `:1330`·ⓑ §2.2) — actor 관례 존재하나 위임충돌 해소자 아님 | `LEGACY_ADAPTER` |
| 22 | resolved_at | 인접 관례 = decided_at 타임스탬프 관용구(전 도메인) — 충돌 해소 시각 아님 | `LEGACY_ADAPTER` |
| 23 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §2.1 라이프사이클 부재) | `LEGACY_ADAPTER` |
| 24 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage·hash_equals+prev_hash·ⓑ §2.5) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 24 / 24 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 1 · `BLOCKED_PREREQUISITE` 4 · `ABSENT` 15 · `LEGACY_ADAPTER` 4.

> 🔴 **커버 0.** 필드 24종 중 어느 하나도 Delegation Conflict 레코드로 저장·판정되지 않는다. `BLOCKED_PREREQUISITE` 4건(candidates·delegate/delegator subject·conflicting versions)은 **§28 후보 산출기 + §3.3 Resolver 신설이 선행**돼야 판정 가능하고, `LEGACY_ADAPTER` 4건(resolved_by/at·status·evidence)은 **확장 대상 인접 관례**(actor decided_by·SecurityAudit)이지 커버가 아니다.

## 2. 규칙

- 🔴 **`delegation candidates`/`conflicting delegation versions`를 후보 없이 채우지 마라** — §28 Delegation Candidate 산출기와 §3.3 Reporting-Line Resolver가 **선행**(BLOCKED_PREREQUISITE). 후보 부재 상태에서 충돌 레코드를 만들면 빈 집합에 대한 위장 판정이 된다.
- 🔴 **`evidence`를 재구현하지 마라** — `SecurityAudit::verify()` 검증형 정본을 확장하라. `menu_audit_log.hash_chain`은 검증 불가능한 장식이므로 인용 금지.
- 🔴 **`resolved_by`/`resolved_at`을 actor 관례로 방치하지 마라** — 승인 4경로 decided_by=호출자 관례(catalog는 identity조차 미기록)를 그대로 상속하면 충돌 해소자 책임추적이 소실된다. 신설 시 Actor Auth Snapshot(§3.4 ABSENT)과 결합하라.
- 🔴 **`amount`/`currency`/`legal entity`를 "있음"으로 표기 금지** — 금액축·통화 이력·법인 엔티티가 저장계층부터 부재다(ⓑ §3.2·§3.3). Conflict 필드가 실제 능력을 초과 선언하면 무권한 위임을 통과시킨다.
