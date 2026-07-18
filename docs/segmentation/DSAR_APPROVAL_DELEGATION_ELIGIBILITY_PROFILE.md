# DSAR — Approval Delegation Eligibility Profile (§25 + §26 + §27)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §25·§26·§27 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 정의: [DSAR_APPROVAL_DELEGATION_DEFINITION.md](DSAR_APPROVAL_DELEGATION_DEFINITION.md) · 수락: [DSAR_APPROVAL_DELEGATION_ACCEPTANCE.md](DSAR_APPROVAL_DELEGATION_ACCEPTANCE.md) · 승인: [DSAR_APPROVAL_DELEGATION_APPROVAL.md](DSAR_APPROVAL_DELEGATION_APPROVAL.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지) — 3섹션 병합·분할 분모 명기**:
> - `... --sec=25` → **§25 Eligibility Profile = 28**(줄범위 1214-1250 · 불릿 28 · 번호 0)
> - `... --sec=26` → **§26 기본 Delegator Eligibility = 17**(줄범위 1251-1274 · 불릿 17 · 번호 0)
> - `... --sec=27` → **§27 기본 Delegate Eligibility = 15**(줄범위 1275-1296 · 불릿 15 · 번호 0)
> - **본 문서 합계 = §25(28) + §26(17) + §27(15) = 60** (각 섹션 `--sec=N` 개별 측정의 합·통합형 아님).

## 0. 현행 실측 (file:line) — ★자격 판독 정본 축 부재

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_ELIGIBILITY_PROFILE` 엔티티 | `delegation_eligibility`·`delegate_eligibility` grep **0** — 위임 자격 프로파일 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 🔴 자격 판독 **정본 축** | 🔴 위임 자격을 판독할 정본 축이 없다 — `roleRank`=**쓰기게이트**(`team_role` owner>manager>member·`acl_permission` 부여상한 `actionsCover:194`)·`requirePro`=**플랜 게이트**·`acl`=**장식**(allow-only data-row 필터). 셋 다 위임 대상자 자격 판독이 아님 | `LEGACY_ADAPTER`(인접·자격 축 아님) |
| Manager/Reporting-Line Resolver | 🔴 **ABSENT** — `parent_user_id` 판독자 전량 owner/tenant로 붕괴(`UserAuth.php:156-157,1225-1227`)·상급자 반환 0(§3.3) | `ABSENT` |
| SoD Hook / Conflict-of-interest Hook | 🔴 grep **0**(§3.4) — 이해충돌·직무분리 게이트 부재 | `ABSENT` |
| Position / Employment / Job Level / Certification | 🔴 Position Registry·Employment Record·Job Level·Certification 엔티티 **0**(`position_idx`=Gantt 정렬 오탐·§3.3) | `ABSENT` |
| Self-delegation 정책 | 🔴 위임 개념 부재 → self-delegation 차단 정책 **신설 대상**(§5.9) | `ABSENT` |
| Security Suspension(권한정지) | 🔴 권한정지 아님 — 유일 인접 = **로그인 스로틀**(`login_attempt.locked_until`·ⓑ §3.4) | `LEGACY_ADAPTER` |
| Tenant policy | Tenant Isolation Guard REAL(`index.php:600` 무조건 덮어쓰기·단 strict 기본 OFF `:585`·ⓑ §3.4) | `LEGACY_ADAPTER` |
| Active Original Authority | 🔴 Approval Authority 전면 부재(5-3-3-4·§3.2) | `BLOCKED_PREREQUISITE` |

★**위임 자격 판독 정본 축이 전면 부재하므로 필드/요건 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/인접 자산·선행조건 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정

### §25 Eligibility Profile — 필수 필드 (28)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_eligibility_profile_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | allowed delegator subject types | 🔴 Subject Registry 부재(§3.3) — 위임자 주체 유형 열거 대상 없음 | `ABSENT` |
| 3 | allowed delegate subject types | 🔴 Subject Registry 부재 — 수임자 주체 유형 열거 대상 없음 | `ABSENT` |
| 4 | required identity state | 🔴 Canonical Identity 엔티티 부재(§3.3) — Identity 상태 판독 계층 0 | `ABSENT` |
| 5 | required employment state | 🔴 Employment Record 부재(§3.3) — 재직 상태 판독 계층 0 | `ABSENT` |
| 6 | required role state | `team_role` flat enum(owner>manager>member)·`roleRank`=**쓰기게이트**(인접이나 active/inactive 상태 없음·자격 판독 정본 아님) | `LEGACY_ADAPTER` |
| 7 | required position state | 🔴 Position Registry/Incumbency 부재(`position_idx`=Gantt 정렬 오탐·§3.3) | `ABSENT` |
| 8 | tenant policy | Tenant Isolation Guard REAL(`index.php:600`·strict 기본 OFF `:585`·ⓑ §3.4) — 자격 tenant 정책은 이 게이트를 참조·확장 | `LEGACY_ADAPTER` |
| 9 | legal entity policy | 🔴 Legal Entity 부재(`biz_no`/`corp_reg`/`tax_id` grep 0·§3.3) | `ABSENT` |
| 10 | organization policy | 🔴 Organization Unit/Hierarchy 부재(§3.3) | `ABSENT` |
| 11 | geographic policy | 인접 = `Geo`(IP→ISO→언어)·TikTok country_code 차원 — 자격 지리 정책 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | minimum job level | 🔴 Job Level/직급 개념 0(`position_idx`=Gantt 정렬 오탐) | `ABSENT` |
| 13 | maximum reporting distance | 🔴 **Manager/Reporting-Line Resolver ABSENT**(`parent_user_id` owner 붕괴·`UserAuth.php:156-157`·§3.3) — 보고선 거리 산출 불가 | `ABSENT` |
| 14 | same manager requirement | 🔴 **Manager Resolver ABSENT** — "동일 관리자" 판정 대상 없음(§3.3·원문 §26/§27 관계 요건) | `ABSENT` |
| 15 | same function requirement | 🔴 Function/부서 엔티티 0 — 동일 직무 판정 대상 없음 | `ABSENT` |
| 16 | certification requirement | 🔴 Certification 엔티티 0 | `ABSENT` |
| 17 | training requirement | 🔴 Training 이수 기록 0 | `ABSENT` |
| 18 | security suspension policy | 인접 = 로그인 스로틀(`login_attempt.locked_until`·ⓑ §3.4) — **권한정지 아님**(로그인 잠금) | `LEGACY_ADAPTER` |
| 19 | leave policy | 🔴 Leave/HRIS 엔티티 0(`hris`=`hig`hRis`k` 오탐·ⓑ 헤더) | `ABSENT` |
| 20 | termination policy | 🔴 Employment/Termination 상태 0(§3.3) | `ABSENT` |
| 21 | self delegation policy | 🔴 위임 개념 부재 → self-delegation 차단 정책 **신설**(§5.9) | `ABSENT` |
| 22 | conflict-of-interest hook | 🔴 CoI Hook grep **0**(§3.4) | `ABSENT` |
| 23 | SoD hook | 🔴 SoD Hook grep **0**(§3.4) | `ABSENT` |
| 24 | re-delegation eligibility | 🔴 재위임 개념 0(§5.7·`redelegation` grep 0) | `ABSENT` |
| 25 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 도메인·open-interval·ⓑ §3) — Eligibility Profile 엔티티엔 없음 | `LEGACY_ADAPTER` |
| 26 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 27 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인) | `LEGACY_ADAPTER` |
| 28 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**§25 소계: 28 / 28.** `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 6 · `KEEP_SEPARATE_WITH_REASON` 1 · `ABSENT` 20 · `NOT_APPLICABLE` 1.

### §26 기본 Delegator Eligibility — 요건 (17)

| # | 원문 요건 | 현행 대조 | 판정 |
|---|---|---|---|
| 29 | Active Canonical Identity | 🔴 Canonical Identity 엔티티 부재(§3.3) | `ABSENT` |
| 30 | Active Employment 또는 허용된 External Actor | 🔴 Employment Record 부재(§3.3) | `ABSENT` |
| 31 | Active Role 또는 Position | `team_role` flat enum(인접·active 상태·Position 없음·roleRank=쓰기게이트) | `LEGACY_ADAPTER` |
| 32 | Active Original Authority | 🔴 Approval Authority 전면 부재(5-3-3-4·§3.2) — 이양할 원본 권한 미정의 | `BLOCKED_PREREQUISITE` |
| 33 | 동일 Tenant | Tenant Isolation Guard REAL(`index.php:600`·strict 기본 OFF·ⓑ §3.4) | `LEGACY_ADAPTER` |
| 34 | 허용된 Legal Entity | 🔴 Legal Entity 부재(`biz_no`/`corp_reg`/`tax_id` grep 0·§3.3) | `ABSENT` |
| 35 | 허용된 Organization | 🔴 Organization Unit 부재(§3.3) | `ABSENT` |
| 36 | 허용된 Delegation Type | 🔴 Delegation Type(§8) 엔티티 부재 | `ABSENT` |
| 37 | Delegation 대상 Action 보유 | 인접 = `acl_permission` menu×action + `actionsCover:194` monotonicity(`TeamPermissions:639`) — 위임 action 자격 아님(부여상한 검증) | `LEGACY_ADAPTER` |
| 38 | Delegation 대상 Resource Scope 보유 | 인접 = `acl` `data_scope` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — 위임 리소스 스코프 아님(장식) | `LEGACY_ADAPTER` |
| 39 | Delegation 대상 Monetary Authority 보유 | 🔴 금액축 부재(HIGH_VALUE_KRW 상수만·ⓑ §3.2) | `ABSENT` |
| 40 | Security Suspension 아님 | 인접 = 로그인 스로틀(`login_attempt.locked_until`) — 권한정지 아님(ⓑ §3.4) | `LEGACY_ADAPTER` |
| 41 | Terminated 아님 | 🔴 Employment/Termination 상태 0(§3.3) | `ABSENT` |
| 42 | Delegation 금지 정책 없음 | 🔴 위임 금지 정책 계층 0(위임 개념 부재) | `ABSENT` |
| 43 | SoD Hook 통과 | 🔴 SoD Hook grep 0(§3.4) | `ABSENT` |
| 44 | Conflict-of-interest Hook 통과 | 🔴 CoI Hook grep 0(§3.4) | `ABSENT` |
| 45 | Runtime Authorization 통과 | 인접 = `index.php` RBAC 미들웨어(auth_role·acl·scope) — Runtime authz 인접이나 위임 검증 아님 | `LEGACY_ADAPTER` |

**§26 소계: 17 / 17.** `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 6 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 10.

### §27 기본 Delegate Eligibility — 요건 (15)

| # | 원문 요건 | 현행 대조 | 판정 |
|---|---|---|---|
| 46 | Active Canonical Identity | 🔴 Canonical Identity 부재(§3.3) | `ABSENT` |
| 47 | Active Employment 또는 허용된 External Actor | 🔴 Employment Record 부재(§3.3) | `ABSENT` |
| 48 | 동일 Tenant | Tenant Isolation Guard REAL(`index.php:600`·strict 기본 OFF·ⓑ §3.4) | `LEGACY_ADAPTER` |
| 49 | Active Role 또는 Position | `team_role` flat enum(인접·Position 부재·roleRank=쓰기게이트) | `LEGACY_ADAPTER` |
| 50 | 허용된 Legal Entity | 🔴 Legal Entity 부재(§3.3) | `ABSENT` |
| 51 | 허용된 Organization 또는 Function | 🔴 Organization Unit/Function 부재(§3.3) | `ABSENT` |
| 52 | 최소 Job Level 충족 | 🔴 Job Level/직급 개념 0(`position_idx`=Gantt 정렬 오탐) | `ABSENT` |
| 53 | 필수 Certification 충족 | 🔴 Certification 엔티티 0 | `ABSENT` |
| 54 | Security Suspension 아님 | 인접 = 로그인 스로틀(`login_attempt.locked_until`) — 권한정지 아님(ⓑ §3.4) | `LEGACY_ADAPTER` |
| 55 | Terminated 아님 | 🔴 Employment/Termination 상태 0(§3.3) | `ABSENT` |
| 56 | Delegation 수락 완료 | 🔴 위임 수락 절차 부재(§23·`acl` 위임상한=manager 일방 치환·ⓑ §2.1) | `ABSENT` |
| 57 | Self-delegation 아님 | 🔴 self-delegation 차단 정책 신설(§5.9·위임 개념 부재) | `ABSENT` |
| 58 | SoD Hook 통과 | 🔴 SoD Hook grep 0(§3.4) | `ABSENT` |
| 59 | Conflict-of-interest Hook 통과 | 🔴 CoI Hook grep 0(§3.4) | `ABSENT` |
| 60 | Runtime Authorization 통과 | 인접 = `index.php` RBAC 미들웨어 — Runtime authz 인접이나 위임 검증 아님 | `LEGACY_ADAPTER` |

**§27 소계: 15 / 15.** `VALIDATED_LEGACY` 0 · `LEGACY_ADAPTER` 4 · `ABSENT` 11.

## 종합 커버리지 — 60 / 60 전사

**실측 개수: §25(28) + §26(17) + §27(15) = 60 / 60 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 16 · `KEEP_SEPARATE_WITH_REASON` 1 · `BLOCKED_PREREQUISITE` 1 · `ABSENT` 41 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.** 위임 자격 판독의 **정본 축이 전면 부재**하므로 어떤 필드/요건도 `VALIDATED_LEGACY` 가 아니다. 현행에서 자격처럼 보이는 세 축(`roleRank`=쓰기게이트·`requirePro`=플랜 게이트·`acl`=장식)은 위임 대상자 판독이 아니다. `LEGACY_ADAPTER` 16건(tenant/role/security suspension/valid_from/status/evidence·acl action·acl scope·Runtime authz)은 **확장/참조 대상 인접 자산**이지 커버가 아니다 — 로그인 스로틀은 권한정지가 아니고, `acl` monotonicity 는 부여상한 검증이지 위임 자격이 아니다. `Active Original Authority`(#32)는 `BLOCKED_PREREQUISITE`(Authority 5-3-3-4 선행). 나머지 자격 요건 41종은 Manager Resolver·SoD/CoI Hook·Position/Employment/Job Level·Legal Entity·Delegation Acceptance 신설이 **선행**돼야 존재한다.

## 2. 규칙

- 🔴 **`same manager requirement`·`maximum reporting distance` 를 "요건 없음=통과"로 처리 금지** — **Manager/Reporting-Line Resolver 가 ABSENT**(`parent_user_id` owner 붕괴·`UserAuth.php:156-157`)이므로 "동일 관리자·보고선 거리" 를 산출할 대상 자체가 없다. 원문 §26/§27 의 조직 관계 요건은 Reporting Line·Manager Resolution(5-3-3-1/5-3-3-2) 이 선행 신설돼야 집행된다. 부재를 "관계 제약 없음"으로 오독하지 마라(우연한 부재≠준수·§58 ⑦).
- 🔴 **`SoD hook`·`conflict-of-interest hook` 를 acl allow-only 로 대체하지 마라** — SoD/CoI Hook 은 grep **0**(§3.4)이고 `acl_permission`=allow-only(deny 표현 없음·`__deny__`=data_scope fail-closed 센티넬)다. 위임 자격은 §5.9 self-delegation 금지·이해충돌 차단을 fail-closed 로 두어야 하며, allow-only 매트릭스는 이 게이트를 표현할 수 없다.
- 🔴 **`security suspension policy` 를 로그인 스로틀로 대체하지 마라** — `login_attempt.locked_until` 은 **로그인 시도 잠금**이지 권한정지(authority suspension)가 아니다(ⓑ §3.4). 정지된 Actor 의 위임 자격 박탈은 별도 Security Suspension 계층(§3.4)이 신설돼야 성립한다.
- 🔴 **`required role state`·"Active Role 또는 Position" 을 `roleRank` 로 충족 처리 금지** — `team_role`(owner>manager>member)·`roleRank` 은 **쓰기 게이트**(`actionsCover:194` 부여상한)이지 위임 대상자의 active/inactive 자격 상태가 아니다. Position Registry/Incumbency(§3.3)가 부재하므로 직위 기반 자격은 신설이 선행이다.
- 🔴 **`Active Original Authority`(§26)는 `BLOCKED_PREREQUISITE`** — Delegator 가 실제 보유한 원본 Authority 를 검증하려면 Approval Authority Foundation(Registry/Matrix/Resolution·5-3-3-4·§3.2)이 선행 신설돼야 한다(원문 §5.2 "Delegate 는 Delegator 원본 범위 안에서만"·§12 Authority Binding "Delegator Active Authority Resolution 으로 검증"). Authority 부재 상태에서 자격 통과 처리는 §5.2 위반을 구조적으로 유발한다.
- 🔴 **`evidence` 는 `SecurityAudit::verify()` 확장, `valid_to` 는 폐구간 신규** — evidence 정본은 `SecurityAudit::verify():56-68`이며 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]). `valid_to`/`effective_to` grep 0 → 폐구간 신규. `valid_from` 은 `kr_fee_rule.effective_from` 질의계층을 참조하되 수수료 도메인과 혼용 금지(중복 엔진 금지).
