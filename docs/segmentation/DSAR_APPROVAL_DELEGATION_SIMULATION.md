# DSAR — Approval Delegation Simulation (§48 필수 필드 32)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §48(1937-1999 필수 필드 1943-1974) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §1·§2·§3 · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)
> Simulation Type 축(§48 17종) = [DSAR_APPROVAL_DELEGATION_SIMULATION_TYPE.md](DSAR_APPROVAL_DELEGATION_SIMULATION_TYPE.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Delegation Simulation Engine` = **`ABSENT`**(엔티티 전무)

**위임을 실 집행 없이 평가하는 what-if 시뮬레이터가 0건이다.** `APPROVAL_DELEGATION_SIMULATION` grep 0. 시뮬레이터의 입력(delegation/authority definition·version)·판정(original authority / eligibility / acceptance / approval / cycle / depth / conflict result)·출력(simulated resolution / affected tasks / decisions) **3면 모두 대상 엔티티가 부재**하다(ⓑ §1·§3). Delegation 개념 자체가 없고(ⓑ §1), §3 선행조건 4축(Approval·Authority·Reporting-Line Resolver·Authorization Safety)이 전부 ABSENT(ⓑ §3)이므로 시뮬레이션이 재현할 실 로직 자체가 존재하지 않는다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_SIMULATION` 엔티티 | grep **0** | `ABSENT` |
| delegation/authority definition·version | 🔴 Delegation Definition/Version(ⓑ §1)·Authority(`authority_matrix`/`approval_authority` grep 0·5-3-3-4·ⓑ §3.2) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| original authority / eligibility / acceptance / approval / cycle / depth / conflict result | 🔴 위임 판정 산출 로직 전무 — 승인 4경로는 실 상태전이이며 대리승인자·수락·재위임 Cycle 개념 ABSENT(ⓑ §2.2·§2.4) | `ABSENT` |
| simulation_hash / evidence | ★정본 선례 = `SecurityAudit::verify():56-68`(`:27` tenant 해시·`:31` preimage 저장·`:63` 재계산·`hash_equals`+prev·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**시뮬레이션 엔진 자체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **원문 필수 필드 32**

> ★분모 주의: **측정기 `--sec=48` 총 = 49**(불릿 49) = 필수 필드 **32**(1943-1974) + Simulation Type **17**(1978-1994). 본 편은 **필수 필드 32** 담당 · Type 17 은 [별편](DSAR_APPROVAL_DELEGATION_SIMULATION_TYPE.md). **32 + 17 = 49 로 측정기와 정합.**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_simulation_id | 엔티티 부재 → PK 없음 | `ABSENT` |
| 2 | simulation_type | [별편](DSAR_APPROVAL_DELEGATION_SIMULATION_TYPE.md) 17종 전량 미시드(HISTORICAL_REPLAY `ABSENT`·나머지 16 `NOT_APPLICABLE`) | `ABSENT` |
| 3 | delegation definition id | 🔴 Delegation Definition 엔티티 0(ⓑ §1) — 관계 엔티티 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 4 | delegation version id | 🔴 불변 prev-링크 버전체인 선례 0(version 하드코딩 태그·ⓑ §2.1) — Delegation Version 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 5 | delegator subject id | ★**인접** — `app_user.id`(승인자 신원 실재)이나 **Delegator→Delegate 관계 엔티티 부재**·시점 미동결 | `LEGACY_ADAPTER` |
| 6 | delegate subject id | ★**인접** — `app_user.id` 실재이나 Delegate 관계·수락(§23) 부재(ⓑ §2.1 표) | `LEGACY_ADAPTER` |
| 7 | authority definition id | 🔴 Authority Definition 엔티티 0(`authority_matrix`/`approval_authority` grep 0·5-3-3-4·ⓑ §3.2) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 8 | authority version id | 🔴 Authority Version 선행 미구축(version 6컬럼 하드코딩 태그·ⓑ §2.1) | `BLOCKED_PREREQUISITE` |
| 9 | approval request id | 🔴 범용 승인 Request 테이블·핸들러 0(§3.1 Approval ABSENT·5-3-2/5-3-3-3 커버 0·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 10 | approval case id | 🔴 Approval Case 엔티티 0(§3.1·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 11 | chain level id | 🔴 Chain/level 개념 0(`approval_chain` grep 0·ⓑ §3) 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 12 | resource | 승인 리소스 축 미보존 · 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 아님(장식) | `ABSENT` |
| 13 | action | 승인 action 축 미보존 · 인접 `action_json`(`Alerting`)=집행 파라미터(pause/updateBudget)이지 authority action 아님 | `ABSENT` |
| 14 | organization | 🔴 `ORGANIZATION_*` backend grep 0 · Org 엔티티 0(ⓑ §3.3) | `ABSENT` |
| 15 | legal entity | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·회사프로필 단일 문자열·ⓑ §3.3) | `ABSENT` |
| 16 | geography | 인접 = `Geo`(IP→ISO→언어)·TikTok `country_code` — **위임 지리 스코프 아님** | `ABSENT` |
| 17 | amount | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW=5000000.0` 상수(`Catalog.php:1016`·boolean 만·ⓑ §3.2) | `ABSENT` |
| 18 | currency | 🔴 통화 스코프 0(`currency_scope`/`allowed_currency` 0)·환율 저장계층 부재(ⓑ §3.2) | `ABSENT` |
| 19 | period | 🔴 Delegation Period(시작·종료·유효기간) 0(ⓑ §2.1 표) · 인접 `kr_fee_rule.effective_from`=수수료 도메인(위임 아님) | `ABSENT` |
| 20 | original authority result | 🔴 위임 전 원 권한 판정 산출 0 — Authority Resolution(§3.2) 부재 | `ABSENT` |
| 21 | delegate eligibility result | 🔴 Delegate 자격 판정 0 — Eligibility Profile(§26) 부재 | `ABSENT` |
| 22 | acceptance result | 🔴 Delegate 수락(§23) 개념 부재 — 승인 4경로는 manager 일방 치환(`Mapping.php:652`·ⓑ §2.1) | `ABSENT` |
| 23 | approval result | 🔴 위임 승인(§24) 판정 산출 0(§3.1 Approval ABSENT·ⓑ §3) | `ABSENT` |
| 24 | cycle result | 🔴 Delegator→Delegate 재위임 Cycle 검출 0 — 인접 PM/메뉴 cycle 은 위임 도메인 아님(ⓑ §2.4) | `ABSENT` |
| 25 | depth result | 🔴 재위임 깊이(§37/§38) 판정 0 — Delegation 전용 depth 코드 grep 0(ⓑ §2.4) | `ABSENT` |
| 26 | conflict result | 🔴 위임 충돌 탐지 0 — Conflict 도출 로직 부재 | `ABSENT` |
| 27 | simulated resolution | 🔴 시뮬레이션 판정 결과 축 0(엔진 부재) — Resolution(§43) 부재 | `ABSENT` |
| 28 | affected active tasks | 🔴 Task 모델 부재 · 위임 변경-영향 재계산 부재 | `ABSENT` |
| 29 | affected pending decisions | 🔴 Decision 모델 부재 · 대기 결정 영향 재계산 부재 | `ABSENT` |
| 30 | simulation hash | ★**정본 선례 = `SecurityAudit::verify():56-68`**(`:27` 해시·`:63` 재계산·`hash_equals`+prev·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지(§0) | `LEGACY_ADAPTER` |
| 31 | status | 🔴 시뮬레이션 상태 축 0(엔진 부재) | `ABSENT` |
| 32 | evidence | ★정본 = `SecurityAudit::verify():56-68` · 인접 `pm_audit_log.diff_json` append-only 근거저장 패턴 — 🔴`menu_audit_log` 인용 금지(§0) | `LEGACY_ADAPTER` |

**실측 개수: 32 / 32 전사.** (측정기 §48 총 49 = 필드 32 + Type 17 · 본 편 필드 **32** · 전사 **32** — 분해 후 정합)
원문 필수 필드가 `evidence` 로 **끝난다**(`:1974`) → "목록 끝 항목 누락" 편향 회피 확인.

커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4(5·6·30·32) · `BLOCKED_PREREQUISITE` 7(3·4·7·8·9·10·11) · `ABSENT` 21.

> 🔴 **커버 0.** Simulation 엔진이 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 4건은 **확장 대상 인접 자산**(delegator/delegate subject=`app_user`·simulation_hash/evidence=`SecurityAudit`)이지 커버가 아니다 — 전부 **시뮬레이션 맥락에 미배선**. `BLOCKED_PREREQUISITE` 7건은 **Delegation/Authority Definition·Version(§48 #3·4·7·8)·Approval Request/Case/Chain(§3.1·#9·10·11) 선행 구축이 전제**.

## 2. 규칙

- 🔴 **§2 부작용 금지 — Simulation 은 실제 Delegation Activation, Task Assignment 또는 Decision 을 생성하지 않아야 한다**(원문 `:1996` verbatim). 시뮬레이터는 승인 4경로의 실 상태전이(`Mapping::approve:238-291`·`Catalog` catalog_writeback·`AdminGrowth:1330`·action_request)를 **호출해서는 안 되며**, 순수 계산 경로로 분리해야 한다. `acl_permission` 일방 치환(`Mapping.php:652`)처럼 부작용 있는 코드를 재사용하면 §2 위반.
- 🔴 **`cycle result`/`depth result`/`conflict result`(#24·25·26)를 PM/메뉴 cycle 검출(`PM/Dependencies.php:79-100`·`AdminMenu::wouldCycle:540-555`)로 대체하지 마라** — 이들은 PM 태스크 의존성·메뉴트리 조상 walk 로 **Delegator→Delegate 재위임 체인이 아니다**(ⓑ §2.4). 알고리즘 패턴 참조는 가하나 위임 전용 신설이 필요.
- ★**`simulation_hash`(#30)·`evidence`(#32) → `SecurityAudit::verify():56-68` 를 정본 선례로 삼으라**(`hash_equals`+prev 연결). 🔴 **`menu_audit_log` 를 선례로 삼지 마라**(tenant_id 없음·검증기 없음·preimage 재구성 불가 = 검증 불가능한 장식·가짜 녹색 상속·[[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **`delegator/delegate subject`(#5·6)를 "구현됨"으로 오표기 금지** — `app_user.id` 는 신원일 뿐 **Delegator→Delegate 관계 엔티티·수락(§23)·기간(§20)이 전무**하다(ⓑ §2.1). 시뮬레이션 입력 자격축은 관계 엔티티 신설이 선행.
- 🔴 **금액/통화/기간 축(#17·18·19)은 저장계층부터 부재**(ⓑ §3.2). 시뮬레이션이 이 축들을 검증하려면 Monetary/Currency/Period Binding 이 선행 구축돼야 한다 — 플래그가 능력을 초과 선언하면 §51 "Original Authority 보다 높은 Amount Ceiling 위임" gap 을 시뮬레이션이 **재현하지 못한다**.
- 🔴 **코드 변경 0 유지** — 시뮬레이션 엔진 신설은 Delegation Definition/Version·Authority·Approval Chain·Conflict 선행 구축 후 **별도 승인세션**(Golden Rule + verify + 배포승인).
