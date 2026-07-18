# DSAR — Approval Delegation Activation (§42)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §42(줄 1810-1835) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=42` → **19**(불릿 19·번호 0) = Activation 검증 항목 19

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 활성화 처리기 | 🔴 Activation 진입점 통째 부재 — `APPROVAL_DELEGATION_*` 엔티티 0(ⓑ §1·§4) · SCHEDULED→ACTIVE 전이 코드 0(§41 doc) | `ABSENT` |
| 선행조건 §3 4축 | 🔴 Approval·Authority·Reporting-Line Resolver·Authorization Safety **전부 ABSENT**(ⓑ §3 CONFIRM·FLIP 0) → Activation 검증 대상 자체가 미결정 | `BLOCKED_PREREQUISITE` |
| 유일 실 토대(REAL) | 플랫 RBAC(`team_role` owner>manager>member + `acl_permission` allow-only) + Tenant Isolation Guard(`index.php:600` 무조건 덮어쓰기·strict 기본 OFF `:585`) — 활성화의 *기반*은 되나 검증 19항 충족 못함(ⓑ §3 결론) | `LEGACY_ADAPTER` |

★**Activation 처리기 전체가 부재하므로 검증항목 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "선행 엔티티 부재 깊이·인접 게이트"를 기록한다. `BLOCKED_PREREQUISITE`=선행 엔티티(Authority/Resolution/Legal Entity 등) 신설 전 판정 불가, `ABSENT`=검증 자산 자체 없음.

## 1. 원문 전사 + 판정 — **원문 19종**(Activation 검증 항목)

| # | 원문 검증 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Delegator Active | 🔴 "위임자 활성" 을 판정하려면 Active Original Authority(§26)가 선결인데 Authority Registry/Resolution 부재(ⓑ §3.2 ABSENT) · Identity active 는 `UserAuth` 로 근사 가능하나 Delegator 관계 엔티티(§21) 부재 | `BLOCKED_PREREQUISITE` |
| 2 | Delegate Active | 🔴 Delegate 관계 엔티티(§22) 부재 · Delegate eligibility(§27) 판정 선행 필요 · Identity 근사만 REAL | `BLOCKED_PREREQUISITE` |
| 3 | Original Authority Active | 🔴 **이양할 권한 단위 미정의** — `authority_matrix`·`approval_authority`·`amount_band` grep 0 · Authority Resolution(§30 선행) 부재(ⓑ §3.2·5-3-3-4 "Authority 개념 없음") | `BLOCKED_PREREQUISITE` |
| 4 | Delegation Version Approved | 🔴 `APPROVAL_DELEGATION_VERSION`(§10) 엔티티 0 · 버전 승인 상태 미존재 | `ABSENT` |
| 5 | Acceptance 완료 | 🔴 Delegate 수락(§23) 개념 0(ⓑ §2.1 "수락 없음 — manager 일방 치환 `TeamPermissions:652`") | `ABSENT` |
| 6 | Approval 완료 | 🔴 Delegation 승인(§24) 경로 0 · 승인 4경로는 항목 승인이지 Delegation 승인 아님(ⓑ §2.2·승인자=진입게이트 통과 actor 본인) | `ABSENT` |
| 7 | Start Time 도달 | 🔴 Delegation Period(§20) 엔티티 0 · `start_at`/`end_at` 저장계층 부재(effective-dating 없음·ⓑ §2.1 "기간 없음") | `ABSENT` |
| 8 | End Time 미도달 | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·Authority Registry §0) · Delegation 폐구간 미존재 | `ABSENT` |
| 9 | Tenant 일치 | 인접 실재 = Tenant Isolation Guard REAL(`index.php:600` 무조건 X-Tenant 덮어쓰기) — 단 strict fail-closed 기본 OFF(`:585`)·`api_key.tenant_id`=FK 없는 VARCHAR(ⓑ §3.4·§5 잔여위험) | `LEGACY_ADAPTER` |
| 10 | Legal Entity 일치 | 🔴 **Legal Entity 전면 void** — `biz_no`/`corp_reg`/`tax_id` grep 0 · 회사프로필 `business_number` 단일 문자열은 법인 아님(ⓑ §3.3) → 법인 경계 검증 불가 | `ABSENT` |
| 11 | Scope 유효 | 🔴 Delegation Scope(§11) 엔티티 0 · 인접 `acl_permission`/`data_scope` 는 절대권한 매트릭스이지 위임 scope 아님(ⓑ §2.1 표) | `ABSENT` |
| 12 | Monetary Limit 유효 | 🔴 금액축 부재 — 유일 금액조건=`Catalog.php:1016` HIGH_VALUE_KRW 상수(승인필요 boolean·`amount_band` 0·ⓑ §3.2) | `ABSENT` |
| 13 | Currency Scope 유효 | 🔴 통화 스코프 0 · 위임 통화 바인딩(§19) 미존재 | `ABSENT` |
| 14 | Re-delegation 유효 | 🔴 재위임(§40) 표현 0 — `redelegation`/`delegate_id` 복합어 grep 0 · `acl_permission` 재부여 경로 0(ⓑ §2.1 "재위임 없음") | `ABSENT` |
| 15 | Cycle 없음 | 🔴 Delegation 전용 cycle 검출 0 · 인접 `PM/Dependencies.php:79-100`(DFS·tenant 매홉)·`AdminMenu::wouldCycle:540-555`(조상 walk) = **PM 태스크/메뉴 도메인**(Delegator→Delegate 체인 아님·ⓑ §2.4 KEEP_SEPARATE) | `ABSENT` |
| 16 | Depth 초과 없음 | 🔴 재위임 깊이 governance(§39) 0 · `depth<100`(AdminMenu)/`depth<10000`(Dependencies)는 그래프 깊이캡이지 위임 깊이 아님 | `ABSENT` |
| 17 | SoD 통과 | 🔴 Segregation of Duties Hook grep 0(ⓑ §3.4 ABSENT) — 위임 무결성 게이트 부재 | `ABSENT` |
| 18 | Conflict-of-interest 통과 | 🔴 CoI Hook grep 0(ⓑ §3.4 ABSENT) | `ABSENT` |
| 19 | Critical Conflict 없음 | 🔴 Delegation Conflict(§34) 엔티티 0 · 충돌 유형 22종 미평가 | `ABSENT` |

**실측 개수: 19 / 19 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_PREREQUISITE` 3 · `LEGACY_ADAPTER` 1 · `ABSENT` 15.

> 🔴 **커버 0.** Activation 검증 19항 중 어느 것도 `VALIDATED_LEGACY` 가 아니다. `BLOCKED_PREREQUISITE` 3건(Delegator/Delegate/Original Authority Active)은 §3 선행 엔티티(Authority Registry/Resolution·Delegator/Delegate Binding·Legal Entity·Position) **신설 후에만** 판정 가능하다. `LEGACY_ADAPTER` 1건(Tenant 일치)은 확장 대상 인접 자산(Tenant Guard)이지 커버가 아니다.

## 2. 규칙

- 🔴 **Activation 은 §3 선행 4축 신설을 절대 선행조건으로 한다** — Delegator/Delegate/Original Authority Active(1~3번)는 Authority Registry·Authority Resolution·Delegator/Delegate Binding·Legal Entity·Position 이 존재해야 판정 가능하다. 선행 엔티티 없이 Activation 처리기부터 만들면 §65 "Amount 가 Limit 초과인데 승인 성공" 류 gap 을 구조적으로 유발한다.
- 🔴 **Tenant 일치(9번)를 느슨한 VARCHAR 비교로 두지 마라**(§5.4 Cross-Tenant Delegation 금지) — Tenant Guard 는 REAL 이나 strict 기본 OFF(`index.php:585`)다. Delegation 활성화 경로에서는 strict fail-closed 를 강제하고 `api_key.tenant_id` 느슨한 참조를 상속하지 마라(ⓑ §5 잔여위험).
- 🔴 **Acceptance/Approval 완료(5·6번)를 "manager 일방 치환" 으로 대체 구현 금지** — `TeamPermissions:652` 는 수락 없이 일방 대입한다. 원문은 Delegate 수락(§23)·별도 Approval(§24)을 요구하며 Decline 한 Delegation 활성화를 금지한다. RBAC 치환 패턴을 Delegation 승인으로 오용하지 마라.
- 🔴 **SoD/CoI 통과(17·18번)를 통과-표기하지 마라** — Hook 자체가 부재(ⓑ §3.4)다. Activation 이 이 검증을 "있음" 으로 선언하면 실제로는 무검증 활성이 된다. Hook 신설 전에는 fail-closed(활성 차단·경고) 로 두어라.
- 🔴 **Cycle/Depth(15·16번)에 PM/메뉴 순환검출을 재사용하되 재구현하지 마라** — `PM/Dependencies.php:79-100`(DFS)·`AdminMenu::wouldCycle:540-555` 알고리즘은 참조 대상이나 도메인이 다르다(태스크/메뉴). Delegation Chain 전용 cycle/depth 검출을 별도로 두되 **중복 엔진 금지**(알고리즘 패턴만 차용).
