# DSAR — Approval Delegation Conflict Resolution 원칙 (§35)

> EPIC 06-A-01 Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §35(1599-1616) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · §34=[DSAR_APPROVAL_DELEGATION_CONFLICT_TYPE.md](DSAR_APPROVAL_DELEGATION_CONFLICT_TYPE.md)·[DSAR_APPROVAL_DELEGATION_CONFLICT.md](DSAR_APPROVAL_DELEGATION_CONFLICT.md)
> 측정기 분모: `… --sec=35` → §35 합계 **14**(번호목록 — 불릿만 세면 0). 본편 분모 = **14 / 14**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| 충돌 해소 **우선순위 엔진** | Delegation conflict resolution/precedence 코드 grep **0** — 위임 충돌 자체가 없어 해소 순서도 부재(§34 문서 커버 0) | `NOT_APPLICABLE`(부재→신설) |
| Explicit Delegation **Deny** | 🔴 `acl_permission`=**allow-only**(deny 표현 없음·`__deny__`는 data_scope fail-closed 센티넬·ⓑ §3.4) | `ABSENT` |
| Mandatory Financial/Security Control | 🔴 금액 게이트=HIGH_VALUE_KRW 상수(boolean)·SoD/CoI/Break-glass grep **0**(ⓑ §3.4·§3.2) | `ABSENT` |
| 🔴 오탐 — RuleEngine precedence | `Handlers/RuleEngine.php:250` "★M1 디컨플릭트/precedence"는 마케팅 세그 룰 소유 우선 — **위임 충돌 해소 순서 아님** | 오탐 |

★**해소 우선순위 엔진 전체가 부재.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 근거/신설 필요성"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 14종**(권장 기본 순서)

| # | 원문 권장 순서 (§35) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Explicit Delegation Deny | 🔴 explicit deny 표현 0 — `acl_permission` **allow-only**(ⓑ §3.4·`__deny__`=data_scope 센티넬) | `ABSENT` |
| 2 | Mandatory Platform Security Control | 🔴 Break-glass/Security Suspension(권한정지) 0 · login 스로틀은 인증지연이지 권한정지 아님(ⓑ §3.4) | `ABSENT` |
| 3 | Mandatory Financial Control | 🔴 금액축 부재 — Finance Approval Matrix 0·HIGH_VALUE_KRW 상수만(ⓑ §3.2) | `ABSENT` |
| 4 | Emergency Delegation with Valid Approval | Emergency Delegation·§3.1 Approval 경로 둘 다 부재(ⓑ §3.1·§3.4) | `NOT_APPLICABLE` |
| 5 | Task-specific Delegation | 위임-태스크 배정 0 · PM 태스크는 승인위임 무관(ⓑ §2.4) | `NOT_APPLICABLE` |
| 6 | Chain Level-specific Delegation | §36 Delegation Chain·Chain Level 엔티티 0(ⓑ §3.1 Chain/Stage/Level 0) | `NOT_APPLICABLE` |
| 7 | Authority-specific Delegation | 🔴 §3.2 Authority ABSENT(`authority_matrix` grep 0) → 권한별 우선 산출 불가 | `NOT_APPLICABLE` |
| 8 | Resource-specific Delegation | 위임 리소스 스코프 0 · acl scopeSql=데이터행 필터(장식·ⓑ §2.1) | `NOT_APPLICABLE` |
| 9 | Legal Entity-specific Delegation | Legal Entity 엔티티 0·회사프로필 단일 문자열(ⓑ §3.3) | `NOT_APPLICABLE` |
| 10 | Organization-specific Delegation | Org Unit/Hierarchy 0·Resolver ABSENT(ⓑ §3.3) | `NOT_APPLICABLE` |
| 11 | Scheduled Temporary Delegation | 위임 유효기간/스케줄 컬럼 0(ⓑ §2.1 expiry 부재) | `NOT_APPLICABLE` |
| 12 | Backup Delegation | backup/alternate/acting approver grep **0**(ⓑ §1) | `NOT_APPLICABLE` |
| 13 | Manual Review | 해소 우선순위 미구현 → 최종 수동검토 훅 부재 | `NOT_APPLICABLE` |
| 14 | Block | 충돌 미탐지 → 차단 종결단계 부재 | `NOT_APPLICABLE` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 3(Explicit Deny·Platform Security·Financial Control) · `NOT_APPLICABLE` 11.

> 🔴 **커버 0.** 권장 14단계 어느 하나도 실 해소 로직으로 존재하지 않는다. 상위 3단계(Deny·Security·Financial)는 **표현/게이트 자체가 부재**(`ABSENT`: acl allow-only·SoD/CoI/Break-glass 0·금액축 0)이고, 나머지 11단계는 **위임 충돌이 발생하지 않으므로 우선순위 판정 대상이 없다**(`NOT_APPLICABLE`).

## 2. 원문 verbatim (SPEC §35 · 1601-1616)

```
권장 기본 순서:
1. Explicit Delegation Deny
2. Mandatory Platform Security Control
3. Mandatory Financial Control
4. Emergency Delegation with Valid Approval
5. Task-specific Delegation
6. Chain Level-specific Delegation
7. Authority-specific Delegation
8. Resource-specific Delegation
9. Legal Entity-specific Delegation
10. Organization-specific Delegation
11. Scheduled Temporary Delegation
12. Backup Delegation
13. Manual Review
14. Block
```

## 3. 규칙

- 🔴 **`Explicit Delegation Deny`를 allow-only 위에 얹지 마라** — `acl_permission`은 deny를 표현할 수 없다(ⓑ §3.4). Deny-우선 해소를 하려면 explicit deny 표현계층을 **선행 신설**해야 한다. `__deny__` 센티넬은 data_scope fail-closed용이지 권한 deny가 아니다.
- 🔴 **`Mandatory Financial/Security Control`을 boolean 게이트로 위장 금지** — HIGH_VALUE_KRW 상수(승인 필요여부 boolean)와 login 스로틀은 mandatory control이 아니다. 금액축·SoD/CoI/Break-glass(ⓑ §3.4)가 선행 신설돼야 상위 2~3단계가 성립한다.
- 🔴 **14단계를 하드코딩 순서로 고정하지 마라** — 우선순위는 정책(§34 resolution policy 필드)으로 구성 가능해야 하며, `winning delegation` 산출은 §28 후보 + §36 Chain 신설 후에만 유효하다.
- 🔴 **RuleEngine precedence를 재사용하지 마라** — `RuleEngine.php:250`은 마케팅 세그 룰 소유 우선이지 위임 승인 충돌 해소가 아니다. 도메인 혼입 시 중복 엔진이 된다(§59 중복 아니라 부재이므로, 신설이 정당).
