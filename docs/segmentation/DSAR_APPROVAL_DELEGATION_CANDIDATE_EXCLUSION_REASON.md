# DSAR — Approval Delegation Candidate Exclusion Reason (§29)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §29 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 후보: [DSAR_APPROVAL_DELEGATION_CANDIDATE.md](DSAR_APPROVAL_DELEGATION_CANDIDATE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=29` → **§29 = 36**(줄범위 1345-1387 · 불릿 36 · 번호 0). 분할 = **Exclusion Reason enum 36종**(필수필드 없음 · 이 문서는 §28 Candidate 의 `exclusion reasons` 필드가 가리키는 enum 카탈로그).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Exclusion Reason enum 시드 | `delegation_candidate`·`exclusion_reason` grep **0** — 위임 후보 제외 사유 enum 미시드(§28 Candidate 엔티티 부재의 종속·ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 🔴 제외 사유 발동 전제 | Delegation Candidate 도출 파이프라인 자체가 없어(§28) **어떤 제외 사유도 무발동** — 위임이 없으므로 Self/Cycle/Depth/Redelegation/Not-started/Expired/Suspended/Revoked 판정이 애초에 실행되지 않음(ⓑ §5) | `ABSENT` |
| WRONG_TENANT 발동 근거 | 🔴 **Tenant Guard REAL**(`index.php:600` 무조건 덮어쓰기) — 단 strict 기본 OFF(`:585`)·Delegation 대상 크로스테넌트 검사 아님(ⓑ §3.4) | `LEGACY_ADAPTER`(Tenant Guard 인접) |
| DELEGATOR_AUTHORITY_* 발동 근거 | 🔴 **Approval Authority 전면 부재**(5-3-3-4·`approval_authority`·`authority_matrix` grep 0·ⓑ §3.2) → "권한 없음/만료" 판정 기준 부재 | `BLOCKED_PREREQUISITE` |
| SoD/CoI 발동 근거 | 🔴 SoD Hook·Conflict-of-interest Hook grep **0**(ⓑ §3.4) → 직무분리/이해충돌 제외 무발동 | `ABSENT`(Hook 부재) |

★**§28 Candidate 엔티티가 부재하여 이 enum 은 발동 지점 자체가 없다.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "발동 전제 부재/인접 자산/선행 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 36종**(Exclusion Reason enum 36 · 하위 필드 없음)

### Candidate Exclusion Reason (36)

| # | 원문 Exclusion | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DELEGATOR_INACTIVE | 🔴 Delegator 개념·위임 후보 파이프라인 부재(§28) → 위임자 비활성 제외 무발동(ⓑ §5) | `ABSENT` |
| 2 | DELEGATE_INACTIVE | 🔴 Delegate 개념 부재 → 수임자 비활성 제외 무발동 | `ABSENT` |
| 3 | DELEGATOR_AUTHORITY_MISSING | 🔴 Approval Authority 전면 부재(5-3-3-4·`approval_authority` grep 0·ⓑ §3.2) → "원 권한 없음" 판정 기준 부재 | `BLOCKED_PREREQUISITE` |
| 4 | DELEGATOR_AUTHORITY_EXPIRED | 🔴 Authority Version/Effective dating 부재 → "권한 만료" 판정 불가 | `BLOCKED_PREREQUISITE` |
| 5 | DELEGATE_NOT_ELIGIBLE | 🔴 Delegation Eligibility Profile(§25) 부재·적격 판정 계층 0(ⓑ §3.4) | `ABSENT` |
| 6 | ACCEPTANCE_PENDING | 🔴 Delegate 수락 개념 0(승인 4경로 수락 단계 없음·ⓑ §2.2) → 수락 대기 상태 부재 | `ABSENT` |
| 7 | ACCEPTANCE_DECLINED | 🔴 수락/거절 라이프사이클 0 → 거절 제외 무발동 | `ABSENT` |
| 8 | APPROVAL_PENDING | 🔴 위임 승인 정책 0(`admin_growth_approval`=단일결정·ⓑ §3.1) → 승인 대기 상태 부재 | `ABSENT` |
| 9 | APPROVAL_REJECTED | 🔴 위임 승인/반려 라이프사이클 0 | `ABSENT` |
| 10 | DELEGATION_NOT_STARTED | 🔴 Delegation·Effective dating 부재(`valid_to`/`effective_to` grep 0) → 미개시 제외 무발동(ⓑ §5) | `ABSENT` |
| 11 | DELEGATION_EXPIRED | 🔴 Delegation 만료 개념 0 → 무발동 | `ABSENT` |
| 12 | DELEGATION_SUSPENDED | 🔴 Delegation 정지 라이프사이클 0(로그인 스로틀은 권한정지 아님·ⓑ §3.4) → 무발동 | `ABSENT` |
| 13 | DELEGATION_REVOKED | 🔴 `revoke`=토큰/자격 폐기 오탐(`AgencyPortal.revoked_at`·API키)·Delegation revocation 0(ⓑ §2.3) → 무발동 | `ABSENT` |
| 14 | WRONG_TENANT | 🔴 **Tenant Guard REAL**(`index.php:600` 무조건 덮어쓰기·strict 기본 OFF `:585`·ⓑ §3.4) — 단 Delegation 크로스테넌트 검사 아님·요청 tenant 격리 일반가드 | `LEGACY_ADAPTER` |
| 15 | WRONG_LEGAL_ENTITY | 🔴 Legal Entity 전면 void(`biz_no`·`corp_reg`·`tax_id` grep 0·회사프로필 단일 문자열·ⓑ §3.3) → 법인 경계 제외 무발동 | `ABSENT` |
| 16 | WRONG_ORGANIZATION | 🔴 Organization Unit/Hierarchy 엔티티 부재(5-3-3-1·ⓑ §3.3) → 조직 경계 제외 무발동 | `ABSENT` |
| 17 | WRONG_GEOGRAPHY | 인접 = `Geo`(`Geo.php` IP→ISO)·country_code 차원 — **위임 지리 스코프 부재**(Delegation Geographic Binding 미시드·ⓑ §3.3) → 지리 제외 무발동 | `ABSENT` |
| 18 | WRONG_RESOURCE | 🔴 Delegation Resource Binding(§13) 부재 → 리소스 경계 제외 무발동 | `ABSENT` |
| 19 | WRONG_ACTION | 🔴 Delegation Action Binding(§14) 부재·Authority Action 축 부재 → 액션 경계 제외 무발동 | `ABSENT` |
| 20 | WRONG_AUTHORITY_DOMAIN | 🔴 Approval Authority Domain 부재(5-3-3-4·ⓑ §3.2) → 권한 도메인 불일치 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 21 | WRONG_AUTHORITY_TYPE | 🔴 Approval Authority Type 부재 → 권한 유형 불일치 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 22 | WRONG_CURRENCY | 🔴 통화 스코프 0·환율 저장계층 부재(다중통화 위임 축 없음·ⓑ §3.2) → 통화 제외 무발동 | `ABSENT` |
| 23 | AMOUNT_ABOVE_DELEGATED_LIMIT | 🔴 Delegated Ceiling·Original Authority Ceiling 부재(Authority 선행 부재·`HIGH_VALUE_KRW` 단일 boolean 상수뿐 `Catalog.php:1016`·ⓑ §3.2) → 한도 초과 판정 불가 | `BLOCKED_PREREQUISITE` |
| 24 | PERIOD_LIMIT_EXHAUSTED | 🔴 기간별 금액 한도·Delegation Period(§20) 부재 → 기간 한도 소진 판정 불가 | `ABSENT` |
| 25 | SELF_DELEGATION | 🔴 §5.9 Self-delegation 금지 규정이나 Delegation 없어 **무발동**(Delegator=Delegate 비교 지점 자체 부재·ⓑ §5) → 신설 시 필수 | `ABSENT` |
| 26 | REDELEGATION_NOT_ALLOWED | 🔴 §5.7 재위임 기본 금지 규정이나 재위임 경로 0(`redelegation` 복합어 grep 0·ⓑ §2.1) → 무발동 | `ABSENT` |
| 27 | MAXIMUM_DEPTH_EXCEEDED | 🔴 위임 깊이 거버넌스 부재(인접 depth 캡=PM/메뉴 도메인·`PM/Dependencies:79-100`·`AdminMenu::wouldCycle:540-555`·Delegation Chain 아님·ⓑ §2.4) → 무발동 | `ABSENT` |
| 28 | DELEGATION_CYCLE | 🔴 §5.8 Cycle 금지 규정이나 Delegation Chain 순환검출 0(PM/메뉴 DFS 는 별 도메인·ⓑ §2.4) → 무발동 | `ABSENT` |
| 29 | SECURITY_BLOCKED | 인접 = Security Suspension=로그인 스로틀(`login_attempt.locked_until`·ⓑ §3.4) — **권한정지 아님**·Break-glass grep 0 → 보안 차단 제외는 로그인 throttle 오인 소지 | `LEGACY_ADAPTER` |
| 30 | SOD_FAILED | 🔴 Segregation of Duties Hook grep **0**(ⓑ §3.4) → 직무분리 위반 제외 무발동 | `ABSENT` |
| 31 | CONFLICT_OF_INTEREST | 🔴 Conflict-of-interest Hook grep **0**(ⓑ §3.4) → 이해충돌 제외 무발동 | `ABSENT` |
| 32 | TASK_SPECIFIC_MISMATCH | 🔴 Approval Task 도메인 미구현(본 블록 비대상·EPIC 06-A-02·SPEC §128) → Task 특정 불일치 무발동 | `ABSENT` |
| 33 | CHAIN_SPECIFIC_MISMATCH | 🔴 Approval Chain 부재(5-3-3-3 커버 0.00%·ⓑ §3.1) → 체인 특정 불일치 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 34 | LEVEL_SPECIFIC_MISMATCH | 🔴 Approval Chain Level 부재 → 레벨 특정 불일치 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 35 | MANUAL_EXCLUSION | 🔴 후보 수동 제외 개념 0(Candidate 엔티티 부재·§28) → 수동 제외 계층 없음 | `ABSENT` |
| 36 | OTHER | 폴백 enum — 값 자체는 도메인 무관하나 시드할 Exclusion 카탈로그 부재 | `NOT_APPLICABLE` |

**실측 개수: 36 / 36 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2 · `BLOCKED_PREREQUISITE` 7 · `ABSENT` 26 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** Exclusion Reason 은 §28 Candidate 의 종속 enum 이며 Candidate 도출 파이프라인 자체가 부재하므로 어떤 값도 `VALIDATED_LEGACY` 가 아니다. `ABSENT` 26건은 **Delegation 이 없어 제외 사유가 무발동**(Self/Cycle/Depth/Redelegation/Not-started/Expired/Suspended/Revoked/수락/승인/SoD/CoI 등)이라는 뜻이지 "제외 없음=적격"이 아니다(우연한 부재≠준수·§58 ⑦). `BLOCKED_PREREQUISITE` 7건(DELEGATOR_AUTHORITY_MISSING/EXPIRED·WRONG_AUTHORITY_DOMAIN/TYPE·AMOUNT_ABOVE_DELEGATED_LIMIT·CHAIN/LEVEL_SPECIFIC_MISMATCH)은 **선행 Authority(§3.2)·Approval Chain(§3.1) 신설 전 판정 자체 불가**다. `LEGACY_ADAPTER` 2건(WRONG_TENANT=Tenant Guard·SECURITY_BLOCKED=로그인 스로틀)은 인접 자산이 있으나 위임 제외 도메인이 아니다.

## 2. 규칙

- 🔴 **`ABSENT` 26건을 "제외 사유 없음(위임 적격)"으로 오독하지 마라** — Self-delegation(§5.9)·Delegation Cycle(§5.8)·Maximum Depth(§5.7)·Redelegation(§5.7) 은 원문이 **명시적으로 금지**하는 무결성 게이트지만 현행에선 Delegation 자체가 없어 **비교 지점이 부재**할 뿐이다. Delegation 엔진 신설 시 이 8종(25~28·10~13)은 **fail-closed 필수 게이트**로 신설돼야 하며, 부재를 준수로 계산하면 무게이트 위임을 구조적으로 허용한다(§58 ⑦ 우연한 부재≠준수).
- 🔴 **`BLOCKED_PREREQUISITE` 7건을 임의로 채우지 마라** — DELEGATOR_AUTHORITY_MISSING/EXPIRED·WRONG_AUTHORITY_DOMAIN/TYPE·AMOUNT_ABOVE_DELEGATED_LIMIT 는 이양·비교할 Approval Authority 자체가 부재(5-3-3-4·`authority_matrix`/`amount_band` grep 0)하여 판정 기준이 없다. CHAIN/LEVEL_SPECIFIC_MISMATCH 는 Approval Chain(5-3-3-3 커버 0.00%) 신설이 선행이다. Authority/Chain Foundation(§3.1·§3.2) 선설 전에는 이 7종을 "통과"로도 "실패"로도 판정할 수 없다.
- 🔴 **WRONG_TENANT 를 "구현된 크로스테넌트 위임 차단"으로 오기 금지** — `index.php:600` Tenant Guard 는 요청 tenant 를 무조건 덮어쓰는 **일반 격리 가드**(REAL·strict 기본 OFF `:585`)이지 Delegator/Delegate 동일 테넌트(§5.4) 검증이 아니다. `LEGACY_ADAPTER` 는 "이 가드를 확장 참조하라"는 뜻이며, Delegation 크로스테넌트 차단은 Delegator↔Delegate subject 관계 신설 후에만 성립한다.
- 🔴 **SOD_FAILED·CONFLICT_OF_INTEREST 를 채우지 마라** — SoD Hook·CoI Hook 이 grep 0(ⓑ §3.4)으로 직무분리/이해충돌 판정 훅 자체가 없다. SECURITY_BLOCKED 도 `login_attempt.locked_until`(로그인 스로틀·권한정지 아님)을 오인 매핑하지 말 것 — 위임 보안 차단은 Security Suspension·Break-glass 신설(§3.4)이 선행이다.
