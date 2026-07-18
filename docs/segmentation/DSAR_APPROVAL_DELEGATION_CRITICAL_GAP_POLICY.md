# DSAR — Approval Delegation Critical Gap Policy (§51)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §51(2089-2127) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> **분모 측정기 실측**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=51` → **§1 항목 32**(불릿 32·번호 0). 육안 금지·측정기 산출.

## 0. 판정 원리 — "gap"이 두 종류다

§51은 "High/Critical로 처리하라"는 **후보 목록**이다. 그러나 이 레포에는 **Approval Delegation(승인 권한/업무를 다른 Actor에게 기간 이양) 개념 자체가 없다**(ⓑ §0·§1 — §4 전수조사 44+항목 능력기준 전량 ABSENT, 유일 이름히트 `DELEGATION_EXCEEDED`는 RBAC 부여상한 오탐). 게다가 Delegation이 올라앉을 §3 선행조건 4축(Approval·Authority·Reporting-Line Resolver·Authorization Safety)이 모두 부재다(ⓑ §3). 따라서 각 gap 후보는 두 부류로 갈린다.

| 부류 | 의미 | 판정 어휘 |
|---|---|---|
| 🔴 **실재(현행 잔여위험)** | 현행 통제가 부분적으로만 방어 중이라 **지금 존재하는 위험** | `LEGACY_ADAPTER`(런타임 가드 실재·단 완전차단 아님) |
| ⚪ **미구현(선행 부재)** | Delegation 엔티티·간선(edge) 또는 §3 선행 Foundation이 없어 **"판정 자체가 없다"** → gap이 아니라 미착수 | `ABSENT`(Delegation 통제가 통째로 부재·신설) / `BLOCKED_PREREQUISITE`(Authority Foundation §3.2 선행 필요) |

★**`VALIDATED_LEGACY`는 사용하지 않는다**(cover 0). Delegation 도메인이 통째로 부재하므로 어떤 gap도 "기존 구현으로 이미 커버됨"이 아니다.

★🔴 **실재 잔여위험 = 1건**(#4 Cross-Tenant Delegation): Tenant Isolation Guard는 REAL이나(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기) **strict fail-closed 기본 OFF**(`:585`)라 잔여(ⓑ §3.4·§5). 나머지 31건은 미구현 — Delegation 없어 무발동(Self/Cycle/Depth/재위임·ⓑ §5)이거나 SoD/CoI Hook 부재(ⓑ §3.4)이거나 Authority Foundation 선행 부재(BLOCKED_PREREQUISITE·ⓑ §3.2).

★**Authority 블록(5-3-3-4)과의 차이**: Authority §65는 현행 코드가 **이미 안티패턴을 수행 중**인 🔴실재 gap이 6건(Actor Authority 없이 승인·Amount>Limit 승인 등)이었으나, Delegation은 **위임 메커니즘 자체가 없어** 안티패턴을 수행할 코드조차 없다. 유일 잔여는 Cross-Tenant(런타임 가드가 부분방어) 1건이다.

## 1. 원문 전사 + 판정 — **원문 32종**(§51 2093-2124)

| # | 원문 gap 후보(verbatim) | 부류 | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|---|
| 1 | Delegation Version 없이 활성화 | ⚪미구현 | Delegation Version 엔티티 부재(ⓑ §2.1) — 활성화할 버전 없음 | `ABSENT` |
| 2 | Delegator Authority 검증 없이 위임 | ⚪미구현 | Approval Authority 개념 부재 → 검증할 Original Authority Resolution 미정의(ⓑ §3.2). 인접=`acl_permission` 위임상한 monotonicity(`TeamPermissions:645` `DELEGATION_EXCEEDED`)이나 RBAC 부여상한이지 Authority 검증 아님(KEEP_SEPARATE·ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 3 | Original Authority보다 높은 Amount Ceiling 위임 | ⚪미구현 | Original Authority ceiling·Amount Band 부재 · 유일 금액조건=`Catalog.php:1016` HIGH_VALUE_KRW 상수(boolean·ⓑ §3.2) — 초과 판정 기준 없음 | `BLOCKED_PREREQUISITE` |
| 4 | Cross-Tenant Delegation | 🔴실재(잔여) | Tenant Isolation Guard **REAL**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기) · 단 strict fail-closed 기본 OFF(`:585` opt-in)·SPA/세션 경로 미도달(ⓑ §3.4·§5) → Delegator/Delegate 동일 tenant 강제는 부분방어 | `LEGACY_ADAPTER` |
| 5 | 승인 없는 Emergency Delegation | ⚪미구현 | Emergency Delegation 유형·Delegation Approval(§24) 경로 부재(ⓑ §1·§3.1) — 승인 게이트 대상 없음 | `ABSENT` |
| 6 | Acceptance 없는 Active Delegation | ⚪미구현 | Delegation Acceptance(§23)·활성상태 엔티티 부재(ⓑ §2.1 — acl 위임상한은 수락 개념 없음 일방치환) | `ABSENT` |
| 7 | Self-delegation | ⚪미구현 | Delegator→Delegate 관계 부재 → 자기위임 무발동(ⓑ §5). 신설 시 필수 차단(§5.9) | `ABSENT` |
| 8 | Delegation Cycle | ⚪미구현 | 위임 간선(edge) 부재 → 순환 무발동(ⓑ §5·§2.4). 인접 순환검출 `PM/Dependencies:79-100`·`AdminMenu::wouldCycle:540-555`는 PM/메뉴 도메인(KEEP_SEPARATE) | `ABSENT` |
| 9 | Maximum Depth 초과 | ⚪미구현 | 재위임 체인 부재 → 깊이 무발동(ⓑ §5). acl 위임상한은 재위임 경로 0(ⓑ §2.1) | `ABSENT` |
| 10 | Re-delegation 금지 상태에서 재위임 | ⚪미구현 | 재위임(member 재부여) 경로 grep 0(ⓑ §2.1) — 재위임 자체 부재 | `ABSENT` |
| 11 | Expired Delegation으로 승인 | ⚪미구현 | Delegation Period·만료 상태 부재 · `valid_to`/`effective_to` grep 0(ⓑ §3.2) — 만료 판정 대상 없음 | `ABSENT` |
| 12 | Revoked Delegation으로 승인 | ⚪미구현 | Delegation revoke 부재 · `revoke`=토큰/자격 폐기 오탐(`AgencyPortal revoked_at`·API키·ⓑ §0 grep 오염) — Delegation revoke 아님 | `ABSENT` |
| 13 | Suspended Delegation으로 승인 | ⚪미구현 | Delegation Suspension(§30) 엔티티 부재(ⓑ §1) | `ABSENT` |
| 14 | Wrong Legal Entity Delegation | ⚪미구현 | Legal Entity 엔티티 전면 void(`biz_no`/`corp_reg`/`tax_id` grep 0)·`business_number`=회사프로필 단일문자열(법인 아님·ⓑ §3.3) — 법인 경계 판정 대상 없음 | `ABSENT` |
| 15 | Wrong Resource Delegation | ⚪미구현 | Delegation Resource Scope 부재 · 인접 `acl_permission` scopeSql은 데이터-행 필터(장식·별 도메인·ⓑ §2.1) | `ABSENT` |
| 16 | Wrong Action Delegation | ⚪미구현 | Delegation Action Scope 부재 · 인접=HTTP 메서드 축(`index.php:568`)이지 승인 action 위임 아님 | `ABSENT` |
| 17 | Wrong Currency Delegation | ⚪미구현 | `currency_scope`/`allowed_currency` 0 · 통화는 변환 전용(ⓑ §3.2) | `ABSENT` |
| 18 | Amount Limit 초과 승인 | ⚪미구현 | Authority monetary limit·한도 집행 부재(HIGH_VALUE_KRW=boolean만·ⓑ §3.2) — 초과 판정할 한도 미정의 | `BLOCKED_PREREQUISITE` |
| 19 | Terminated Delegate 승인 | ⚪미구현 | Delegate 엔티티·Employment/종료 상태판정 0(`position_idx`=Gantt 오탐·ⓑ §3.3) | `ABSENT` |
| 20 | Security Suspended Delegate 승인 | ⚪미구현 | Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4) — 권한정지 개념 부재 | `ABSENT` |
| 21 | SoD Conflict 무시 | ⚪미구현 | Segregation-of-Duties Hook grep 0(ⓑ §3.4) — 무결성 게이트 부재 | `ABSENT` |
| 22 | Conflict-of-interest 무시 | ⚪미구현 | Conflict-of-interest Hook grep 0(ⓑ §3.4) | `ABSENT` |
| 23 | Delegation Snapshot 누락 | ⚪미구현 | Delegation Snapshot 엔티티 grep 0(ⓑ §2.5) · 인접 불변정본=`SecurityAudit::verify():56-68`(확장 대상이나 delegation 미적용) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `ABSENT` |
| 24 | 현재 Delegation으로 과거 Decision 재해석 | ⚪미구현 | Delegation Version·effective dating 부재(ⓑ §2.1) → as-of 재구성 대상 없음. 정면 반례 `AgencyPortal.php` `revoked_at=NULL` in-place 소거(ⓑ §2.3) | `ABSENT` |
| 25 | Delegator Authority 상실 후 Delegation 유지 | ⚪미구현 | Approval Authority 축 부재 → Authority 변경/상실 감지 훅 0(ⓑ §3.2) — 상실을 감지할 Authority Resolution 선행 필요 | `BLOCKED_PREREQUISITE` |
| 26 | Delegate State 변경 후 미재검증 | ⚪미구현 | Delegate 엔티티·상태 변경 이벤트 부재(ⓑ §3.3) — 재검증 대상 없음 | `ABSENT` |
| 27 | Task Assignee와 Winning Delegation 불일치 | ⚪미구현 | Delegation Candidate(§28)/Resolution(§30) 전 ABSENT(ⓑ §4) · Task Assignment은 EPIC 06-A-02 범위 — 대조 대상 없음 | `ABSENT` |
| 28 | Decision Actor와 Delegation Snapshot 불일치 | ⚪미구현 | Delegation Snapshot 부재(#23) → 대조 무발동(ⓑ §2.5) | `ABSENT` |
| 29 | 고객 설정으로 Mandatory Delegation Control 제거 | ⚪미구현 | Mandatory Delegation Control 개념 0 → 제거를 막을 lock 대상 부재(ⓑ §1) | `ABSENT` |
| 30 | 종료일 없는 Temporary Delegation | ⚪미구현 | Delegation Period 부재 · `valid_to`/`effective_to` grep 0(ⓑ §3.2) → 종료일 검사 대상 없음 | `ABSENT` |
| 31 | 직접 DB 수정으로 Active Delegation 변경 | ⚪미구현 | Active Delegation 엔티티 부재(ⓑ §1) — 무결성 보호할 레코드 없음 | `ABSENT` |
| 32 | Calendar Out-of-office를 검증 없이 Authority로 사용 | ⚪미구현 | Calendar OOO 소스 존재조차 안 함 · `calendar`=콘텐츠 캘린더(`sharedCalendarEvents`/`DEMO_CALENDAR_EVENTS`) OOO 아님(ⓑ §1 grep 오염) | `ABSENT` |

**실측 개수: 32 / 32 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 1(#4) · `BLOCKED_PREREQUISITE` 4(#2·3·18·25) · `ABSENT` 27 · `NOT_APPLICABLE` 0.

> 🔴 **커버 0.** 🔴실재 잔여위험 1건(#4 Cross-Tenant)은 **"기존 구현이 gap을 이미 막는다"가 아니라 부분방어(strict OFF)로 인한 현행 잔여위험**이다. `LEGACY_ADAPTER`는 런타임 tenant 가드가 실재하나 완전차단이 아니라는 표시일 뿐 커버가 아니다. 미구현 31건은 Delegation 간선·엔티티(27) 또는 Authority Foundation(4·BLOCKED_PREREQUISITE)이 부재해 "판정 자체가 없다".

## 2. "실재 gap vs 미구현" 구분 (§2 명기)

| 구분 | 정의 | 이 목록에서 | 조치 |
|---|---|---|---|
| **실재 gap(현행 잔여위험)** | 현행 코드가 이미 실행 중이며 통제가 부분적/누락된 상태 | **1건** — #4 Cross-Tenant Delegation(Tenant Guard strict OFF·ⓑ §5) | strict fail-closed 기본 ON 검토는 **별도 승인세션**(본 세션 코드변경 0). 단 Delegation 신설 전에도 존재하는 위험이므로 잔여로 등재 |
| **미구현(Delegation 부재로 무발동)** | Delegation 간선·엔티티가 없어 안티패턴을 수행할 코드조차 없음 | **27건** — Version/Acceptance/Self/Cycle/Depth/재위임/Expired/Revoked/Suspended/Legal Entity/Resource/Action/Currency/Terminated/Security/SoD/CoI/Snapshot 등 | Delegation Foundation 신설 시 각 gap을 §52 Static Lint·§53 Runtime Guard로 **동시 봉쇄**해야 gap 재유입 방지 |
| **미구현(Authority Foundation 선행 부재)** | Approval Authority(§3.2)가 없어 위임할 권한 단위·한도가 미정의 | **4건** — #2 Delegator Authority 검증·#3 Amount Ceiling·#18 Amount Limit·#25 Authority 상실 | Authority Registry/Matrix/Resolution 신설이 **선행**. 그 전엔 "통과"로 계산 금지(우연한 부재를 준수로 오계상 금지) |

## 3. 규칙

- 🔴 **Cross-Tenant(#4) 잔여위험만 "현행 실재"로 등재하라** — Delegation은 위임 메커니즘 자체가 없어 Authority 블록(5-3-3-4)의 6건 같은 "이미 안티패턴 수행 중" 코드가 없다. #4를 제외한 31건을 "현행 결함"으로 오등재하지 마라(부재≠결함).
- 🔴 **BLOCKED_PREREQUISITE 4건(#2·3·18·25)을 ABSENT로 낮춰쓰지 마라** — 이들은 Approval Authority Foundation(§3.2)이 선행돼야 판정 가능하다. Authority Resolution/Amount Band 없이 "위임 초과"를 검사하는 척하면 §5.2("Delegation은 Original Authority를 초과할 수 없다")를 형식만 흉내 낸다.
- 🔴 **Self/Cycle/Depth/재위임(#7·8·9·10)은 신설 시 필수 차단으로 승격** — 지금은 위임 간선 부재로 무발동이나, Delegation Definition 신설 즉시 §5.7~§5.9(재위임 기본금지·Cycle 금지·Self 금지)를 활성화 게이트에서 선차단(`BLOCKED_CYCLE_RISK`). 순환검출은 `PM/Dependencies:79-100` 골격 **참조만**하고 재구현 금지(중복 엔진 금지).
- 🔴 **SoD/CoI(#21·22)는 Hook 부재가 근본원인** — Delegation Eligibility(§25)에 SoD/CoI Hook을 1급으로 신설하되, 인접 방어 부재(ⓑ §3.4)를 "부분 있음"으로 오표기 금지.
- 🔴 **Snapshot(#23·28)은 `SecurityAudit::verify()` 확장** — 새 해시체인 엔진을 만들지 말고 tenant 포함 해시+prev 교차검증 정본을 Delegation Snapshot에 연결. `menu_audit_log.hash_chain`은 검증 불가능한 장식 → **인용 금지**([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **Calendar OOO(#32)를 "있음"으로 오판 금지** — `sharedCalendarEvents`는 콘텐츠 캘린더이지 Out-of-office 소스가 아니다(ⓑ §1 grep 오염). OOO 소스는 존재조차 안 하며(§49 대사 대상 없음) 검증 없이 Authority로 사용할 위험은 소스 신설 후에야 발생한다.
