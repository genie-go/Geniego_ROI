# DSAR — Approval Delegation Change Impact (§46 Original Authority Change + §47 Delegate State Change 병합)

> EPIC 06-A-01 Delegation Foundation · 289차 13회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §46 Original Authority Change Impact(1895-1914)·§47 Delegate State Change Impact(1918-1934) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
>
> **★분할 분모 명기 = §46 + §47 측정기 합**:
> - §46 `Original Authority Change Impact` = **14**(`measure_spec_denominator.mjs --sec=46`: 불릿14).
> - §47 `Delegate State Change Impact` = **12**(`--sec=47`: 불릿12).
> - **합계 분모 = 14 + 12 = 26.** (닫는 문장 "Delegation은 원본 Authority보다 넓게 유지될 수 없다"는 §46 불릿 아님 → 분모 밖·§3 verbatim 명기)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Change Impact 재검증 훅 | 🔴 Delegation 재검증 개념 **전무**(ⓑ §1) — Authority/Delegate 변경 시 Delegation 을 다시 평가하는 트리거·핸들러 0 | `ABSENT`(신설) |
| §46 상위 선행 = Approval Authority | 🔴 **레포에 Approval Authority 개념 없음**(5-3-3-4 결론·ⓑ §3.2)·`authority_matrix`/`approval_authority`/`amount_band` grep 0 — 변경을 감지할 Authority 단위·버전 자체 부재 | `BLOCKED_PREREQUISITE` |
| §47 상위 선행 = Identity·Org·Employment | 🔴 Canonical Identity/Subject Registry·Employment Record·Position 엔티티 **0**(ⓑ §3.3)·Legal Entity 전면 void·Org Unit 0·`team_role` flat enum 3값 | `ABSENT`(엔티티0) |
| Security Suspension 인접 | `login_attempt.locked_until` 로그인 스로틀(ⓑ §3.4) — 🔴**권한 정지 아님**(로그인 실패 잠금) | `LEGACY_ADAPTER` |
| Explicit Deny 인접 | `acl_permission` = **allow-only**(deny 표현 없음·`__deny__`는 data_scope fail-closed 센티넬·ⓑ §3.4) | `BLOCKED_PREREQUISITE` |

★**§46 는 Authority 개념, §47 은 Identity/Org/Employment 엔티티가 통째로 부재**하므로 변경-영향 항목 단위 커버는 원천 불가. 아래는 원문 전사(신설 명세)이며 현행 대조는 "선행부재/엔티티부재/인접"을 기록한다. `VALIDATED_LEGACY` 0 (cover 0).

## 1. §46 원문 전사 + 판정 — **Original Authority Change 14종**

Delegator 의 Authority 가 아래처럼 변경되면 Delegation 을 재검증해야 한다. 🔴**Approval Authority 개념 자체가 부재**(ⓑ §3.2)하여 변경을 감지할 대상·버전이 없으므로 대부분 `BLOCKED_PREREQUISITE`(선행 Authority Foundation 신설 후로 유예).

| # | 원문 변경 사유 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Authority Revoked | 🔴 Approval Authority(§3.2) 개념 부재 — 철회할 권한 단위 미정의(`approval_authority` grep 0) | `BLOCKED_PREREQUISITE` |
| 2 | Authority Suspended | 🔴 Authority 정지 상태 부재 — Authority 엔티티 0 | `BLOCKED_PREREQUISITE` |
| 3 | Amount Limit 감소 | 🔴 금액축 저장계층 부재 — 유일 조건 `HIGH_VALUE_KRW` 상수(boolean·ⓑ §3.2)·amount_band 0 | `BLOCKED_PREREQUISITE` |
| 4 | Currency Scope 감소 | 🔴 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2) — 감소 판정 기준선 없음 | `BLOCKED_PREREQUISITE` |
| 5 | Legal Entity 제거 | 🔴 Authority Legal Entity binding 부재·Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 6 | Organization Scope 변경 | 🔴 Authority Organization scope 부재·Org Unit 엔티티 0(ⓑ §3.3) | `BLOCKED_PREREQUISITE` |
| 7 | Resource Scope 변경 | 🔴 Authority Resource scope 부재 — 인접 `acl_permission` scopeSql 는 데이터-행 필터(Authority 아님·ⓑ §3.4) | `BLOCKED_PREREQUISITE` |
| 8 | Action 제거 | 🔴 Authority Action 단위 부재 — `acl_permission` 위임상한(monotonicity)은 Authority 변경 감지 아님(ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 9 | Period Limit 소진 | 🔴 Authority Period Limit 부재·`valid_to`/`effective_to` grep 0(ⓑ §3.2) — 소진 판정 대상 없음 | `BLOCKED_PREREQUISITE` |
| 10 | Explicit Deny 추가 | 🔴 `acl_permission` = **allow-only**(deny 표현 없음·ⓑ §3.4) + Authority 부재 — deny 추가 감지 대상 미정의 | `BLOCKED_PREREQUISITE` |
| 11 | Authority Version 교체 | 🔴 Approval Authority Version(§3.2) 불변 체인 부재 — 교체 감지할 버전 없음 | `BLOCKED_PREREQUISITE` |
| 12 | Security Suspension | 🔴 Delegator 권한 정지 대상 부재(Authority 부재) — 인접 `login_attempt.locked_until` 은 로그인 스로틀(권한정지 아님·ⓑ §3.4). Authority revalidation 대상 미정의 | `BLOCKED_PREREQUISITE` |
| 13 | Employment 종료 | 🔴 Employment Record 엔티티 **0**(ⓑ §3.3)·`position_idx`=Gantt 정렬 오탐 — 종료 감지 대상 없음 | `ABSENT` |
| 14 | Position 변경 | 🔴 Position/Position Incumbency 엔티티 **0**(ⓑ §3.3) — 변경 감지 대상 없음 | `ABSENT` |

**§46 소계: 14 / 14 전사** · `VALIDATED_LEGACY` 0 · `BLOCKED_PREREQUISITE` 12 · `ABSENT` 2(Employment 종료·Position 변경).

## 2. §47 원문 전사 + 판정 — **Delegate State Change 12종**

Delegate 에게 아래 변화가 발생하면 재검증해야 한다. 🔴**Identity/Employment/Position/Certification/SoD 엔티티가 통째로 부재**(ⓑ §3.3·§3.4)하여 전량 `ABSENT`, 단 Security Suspension 만 로그인 스로틀 인접(`LEGACY_ADAPTER`).

| # | 원문 변경 사유 | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 15 | Employment 종료 | 🔴 Employment Record 엔티티 0(ⓑ §3.3) — 종료 감지 훅 부재 | `ABSENT` |
| 16 | Identity 비활성 | 🔴 Canonical Identity/Subject Registry 부재(ⓑ §3.3) — user 활성 플래그는 있으나 Delegate Identity 도메인 아님 | `ABSENT` |
| 17 | Role 제거 | 🔴 `team_role` flat enum 3값·Role Assignment 버전/제거 감지 훅 부재(ⓑ §3.3) | `ABSENT` |
| 18 | Position 변경 | 🔴 Position/Position Incumbency 엔티티 0(ⓑ §3.3) | `ABSENT` |
| 19 | Legal Entity 변경 | 🔴 Legal Entity 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §3.3) | `ABSENT` |
| 20 | Organization 변경 | 🔴 Org Unit/Organization Hierarchy 엔티티 0(ⓑ §3.3) | `ABSENT` |
| 21 | Security Suspension | 🔴 인접 = `login_attempt.locked_until` 로그인 스로틀(ⓑ §3.4) — **권한 정지 아님**(로그인 실패 잠금). Delegate 자격 정지 훅으로 확장 대상 | `LEGACY_ADAPTER` |
| 22 | Certification 만료 | 🔴 Certification 엔티티 0(§25 certification requirement 대상 미구축) | `ABSENT` |
| 23 | SoD Conflict 발생 | 🔴 Segregation of Duties Hook grep **0**(ⓑ §3.4) — 충돌 감지 훅 부재 | `ABSENT` |
| 24 | Leave 상태 | 🔴 HRIS Leave 엔티티 0·`vacation` grep 0(ⓑ §1·§0 grep 오염)·`calendar`=콘텐츠 캘린더 오탐 | `ABSENT` |
| 25 | Acceptance Revoked | 🔴 Delegation Acceptance(§23) 엔티티 부재 — 수락/철회 상태 0 | `ABSENT` |
| 26 | Conflict-of-interest 발생 | 🔴 Conflict-of-interest Hook grep **0**(ⓑ §3.4) — CoI 감지 훅 부재 | `ABSENT` |

**§47 소계: 12 / 12 전사** · `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 1(Security Suspension=로그인 스로틀) · `ABSENT` 11.

## 3. 병합 커버리지 (분모 26 = §46 14 + §47 12)

**실측 개수: 26 / 26 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_PREREQUISITE` 12(§46 Authority 변경 12) · `LEGACY_ADAPTER` 1(§47 Security Suspension) · `ABSENT` 13(§46 Employment/Position 2 + §47 11).

> 🔴 **커버 0.** 변경-영향 항목 어느 것도 `VALIDATED_LEGACY` 가 아니다.
> - `BLOCKED_PREREQUISITE` 12건은 §3.2 Approval Authority Foundation(Registry/Version/Matrix/Amount Band) **선행 신설 후로 판정 유예** — "위임할 Authority" 자체가 없으므로 그 변경도 감지 불가.
> - `LEGACY_ADAPTER` 1건(Security Suspension=`login_attempt.locked_until`)은 **로그인 스로틀 인접**이며 권한 정지가 아니다 — Delegate 자격 정지 훅으로 확장 대상이지 커버가 아니다.
> - `ABSENT` 13건은 Identity/Employment/Position/Legal Entity/Org/Certification/SoD/CoI 엔티티·훅이 통째로 부재.

### 원문 verbatim 명기 (무수정)

> **§46 Original Authority Change Impact** — Delegator 의 Authority 가 다음처럼 변경되면 Delegation 을 재검증하라: Authority Revoked / Authority Suspended / Amount Limit 감소 / Currency Scope 감소 / Legal Entity 제거 / Organization Scope 변경 / Resource Scope 변경 / Action 제거 / Period Limit 소진 / Explicit Deny 추가 / Authority Version 교체 / Security Suspension / Employment 종료 / Position 변경
> **Delegation 은 원본 Authority 보다 넓게 유지될 수 없다.**
>
> **§47 Delegate State Change Impact** — Delegate 에게 다음 변화가 발생하면 재검증하라: Employment 종료 / Identity 비활성 / Role 제거 / Position 변경 / Legal Entity 변경 / Organization 변경 / Security Suspension / Certification 만료 / SoD Conflict 발생 / Leave 상태 / Acceptance Revoked / Conflict-of-interest 발생

## 4. 규칙

- 🔴 **"Delegation 은 원본 Authority 보다 넓게 유지될 수 없다"(§46) 를 재검증 훅으로 강제하라** — 단, 이 재검증은 §3.2 Approval Authority Foundation(Registry/Definition/Version/Matrix/Amount Band) **신설이 선행**돼야 구현 가능(BLOCKED_PREREQUISITE 12건). Authority 변경 이벤트를 Delegation Version 재평가로 연결(SUSPENSION/REVOCATION Version Type·§10).
- 🔴 **§47 재검증은 Identity·Employment·Position·SoD·CoI 신설 선행** — 현재 엔티티/훅 0(ABSENT 11). Delegate 상태 변경(퇴사/정지/자격만료/SoD) 감지는 §3.3 Identity·Org + §3.4 SoD/CoI Hook 신설 후 별도 승인세션.
- 🔴 **Security Suspension 을 로그인 스로틀로 대체 금지** — `login_attempt.locked_until` 은 로그인 실패 잠금이지 **권한/자격 정지가 아니다**(ⓑ §3.4·`LEGACY_ADAPTER`). Delegate 자격 정지는 별도 상태로 신설하되 로그인 스로틀 인프라를 재구현하지 말고 참조.
- 🔴 **Explicit Deny 를 `acl_permission` allow-only 위에 얹지 마라** — 현행은 deny 표현이 없다(ⓑ §3.4). Authority/Delegation deny 는 explicit deny 표현이 있는 신설 Authority Foundation 위에서만 감지 가능.
