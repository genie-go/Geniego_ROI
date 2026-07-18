# DSAR — Approval Delegation ⓑ 전수조사 (§4·§58·§59·§3 선행조건)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 전수조사 — 코드변경 0**
> 스펙 원문: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md)
> 방법: 3 클러스터 병렬 **능력 기반 재실증**(정의부 Read·주석/인계서 불신·단어경계 grep). 헤더 실측을 CONFIRM/FLIP.

---

## 0. 한 문장 결론

**레포에 "Approval Delegation"(승인 권한/업무를 다른 Actor에게 시간제한 이양) 개념이 없다.** §4 기존 구현 전수조사 44+항목이 **능력 기준 전량 ABSENT**(유일 이름 히트 `DELEGATION_EXCEEDED`는 RBAC 부여상한 오탐). 게다가 Delegation이 올라앉을 **§3 선행조건 4축(Approval·Authority·Reporting-Line Resolver·Authorization Safety)이 모두 부재** → §72 Canonical Entity 28종 대부분 **ABSENT/BLOCKED_PREREQUISITE**. 통합할 "동일 목적 Delegation"이 없다(§59 중복 아니라 부재).

---

## 1. §4 기존 Delegation 구현 전수조사 (능력 기반·단어경계)

| §4 이름 | grep | 정의부 능력 판정 | 판정 |
|---|---|---|---|
| delegation / delegate | `TeamPermissions.php:16`(docblock)·`:645`(`DELEGATION_EXCEEDED`) | **RBAC 부여 상한 자기정합**(아래 §2). 승인 대리 아님 | KEEP_SEPARATE(오탐) |
| substitute | `Migrate.php:203` "substitution"(타입 매핑 주석) | 도메인 무관 | ABSENT(오탐) |
| proxy | `Connectors.php:3875,3911`(Adobe `x-proxy-*`)·`AdminMenu.php:21`(reverse-proxy 주석) | 네트워크/자격증명 헤더 | ABSENT(오탐) |
| backup_approver·alternate_approver·acting_manager·`\bacting\b`·vacation·out_of_office/ooo·forward_approval·reassign·delegated_authority·doa·proxy_authorization·temporary_role·substitute_position·standin | **grep 0**(단어경계·`acting` 부분문자열 실히트 0) | — | **ABSENT** |
| agent_mode='approval'(`UserAdmin.php:524`) | AI 에이전트 권한모드 | 승인 대리 무관 | NOT_APPLICABLE(오탐) |

**결론**: §4 전 항목이 "진짜 승인 대리/위임 개념"으로는 **부재**. 외부 소스(HRIS Leave·Calendar OOO·ERP Delegate·M365/Google OOO·Slack/Teams status)도 **5개 전부 ABSENT**(§49 대사 대상 자체 없음 · `calendar`=콘텐츠 캘린더 오탐·`hris`=`hig`hRis`k` 오탐·`presence`=LiveCommerce 하트비트).

---

## 2. 인접 자산 (KEEP_SEPARATE / LEGACY_ADAPTER) — Delegation 도메인 아님

### 2.1 acl_permission 위임상한 = RBAC 부여 monotonicity (KEEP_SEPARATE)
`TeamPermissions::putMemberPermissions`(`:615-647`)가 `actionsCover`(`:194-198`)로 **manager가 자기 assignable에 없는 action을 하위에 부여 시도 시 `DELEGATION_EXCEEDED` 403**. 즉 "부여자가 자기가 안 가진 권한을 남에게 줄 수 없다"는 **단조성(monotonicity) 검증**. 🔴**Delegation Definition과의 차이(능력)**:

| 축 | acl_permission 위임상한(실재) | Rebate Delegation Definition(스펙 기대) |
|---|---|---|
| 저장 대상 | member 절대 권한 매트릭스(menu×action `acl_permission`) | Delegator→Delegate **관계 엔티티** |
| 기간 | **없음**(영구·expiry 컬럼 부재) | 시작·종료·유효기간 필수(§20) |
| 수락 | **없음**(manager 일방 치환 `:652`) | Delegate 수락(§23) |
| 재위임 | **없음**(member 재부여 경로 0) | 재위임 허용/차단·깊이·Cycle(§37/§38) |
| 승인/라이프사이클 | 상한 초과만 403 | 위임 승인·Schedule/Activate/Revoke(§24/§41) |

### 2.2 Maker-Checker 정족수 (Mapping/Alerting) — 대리자 없음
`Mapping::approve`(`:238-291`) 정족수 2인·자기승인 차단(`:268`)·dedup(`:278-283`). 🔴 **승인자=진입게이트 통과 actor 본인**. "원 승인자 부재 시 대리인 승인권 이양"·backup/acting/on-behalf 해석 **ABSENT**(4경로 공통: catalog `:2341-2364`는 승인자 identity조차 미기록·admin_growth `:1330` decided_by=호출자).

### 2.3 AgencyPortal = 접근권 승인(access delegation), 승인권 위임 아님 (KEEP_SEPARATE)
`agency_client_link`(`AgencyPortal.php:20`)는 대행사↔클라이언트 테넌트 접근 N:N. `approveAgency:364-384`=**클라이언트가 대행사의 테넌트 접근을 승인**(scope_json=메뉴/write 범위)·매 요청 `status='approved'` 재검증 fail-closed(`:411-427`). 🔴승인 authority를 대행사에 이양하는 게 아니며 기간/expiry 없음(`revoked_at`=수동 철회만).

### 2.4 Cycle/Depth 검출 인접 — PM/메뉴 도메인 (KEEP_SEPARATE)
`PM/Dependencies.php:79-100`(DFS·tenant 매홉·depth<10000·PM 태스크 의존성)·`AdminMenu::wouldCycle:540-555`(메뉴트리 조상 walk·depth<100)·`PM/Gantt` Kahn. 🔴**Delegator→Delegate 재위임 체인이 아님** — Delegation 전용 cycle/depth/redelegation 코드 grep 0.

### 2.5 Evidence/immutable_hash/Snapshot 정본 = SecurityAudit (LEGACY_ADAPTER)
`SecurityAudit::verify():56-68`(`:27` tenant 해시·`:31` preimage 저장·`:63` 재계산·hash_equals+prev_hash) = 검증형 정본. 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식). Delegation Snapshot 엔티티 grep 0.

---

## 3. §3 선행조건 재검증 → BLOCKED_PREREQUISITE 4축 (전부 CONFIRM ABSENT·FLIP 0)

| 축 | 선행조건 | 실측 | 판정 |
|---|---|---|---|
| **§3.1 Approval** | Request/Case/Chain/Stage/Level/Resolution | 범용 테이블·핸들러 **0**. 단발 승인 플래그 3종(`catalog_writeback_approval` 고아·`admin_growth_approval` 단일결정·`required_approvals=2` 값매핑)만. 5-3-2/5-3-3-3 커버 0 | 🔴**ABSENT** → 위임할 승인 경로 없음 |
| **§3.2 Authority** | Registry/Matrix/Binding/amount_band/Resolution/Snapshot | `authority_matrix`·`approval_authority`·`amount_band` grep **0**. 유일 금액조건=`Catalog.php:1016` HIGH_VALUE_KRW 상수. 5-3-3-4 "Authority 개념 부재" | 🔴**ABSENT** → 이양할 권한 단위 미정의 |
| **§3.3 Identity·Org** | Org Unit/Hierarchy·**Manager/Reporting-Line Resolver**·Legal Entity·Position/Incumbency·Employment | Org 엔티티 0·**Resolver ABSENT**(`parent_user_id`가 최상위 owner로 붕괴 `UserAuth.php:156-157,1225-1227`)·Legal Entity=회사프로필 단일 문자열(`business_number`·법인 아님)·Position/Employment 0(`position_idx`=Gantt 정렬 오탐)·Role=`team_role` flat enum 3값 | 🔴**Resolver ABSENT** → "관리자→위임대상" 관계 산출 불가 |
| **§3.4 Auth·Security** | SoD Hook·CoI Hook·Break-glass·Security Suspension·Actor Auth Snapshot·Tenant Guard | SoD/CoI/Break-glass grep **0**·Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님)·Actor Auth Snapshot ABSENT·`acl_permission`=**allow-only**(deny 표현 없음·`__deny__`는 data_scope fail-closed 센티넬)·**Tenant Guard REAL**(`index.php:600` 무조건 덮어쓰기·strict 기본 OFF `:585`) | 🔴 SoD/CoI/Break-glass/Snapshot **ABSENT**(위임 무결성 게이트 부재) |

**★유일 실 토대(REAL)** = 플랫 RBAC(`team_role` owner>manager>member + `acl_permission` allow-only + `data_scope` ABAC) + Tenant Isolation Guard. 위임의 *기반*은 되나 승인/권한/조직/안전 4축을 충족하지 못함.

---

## 4. §58 분류 · §59 중복 감사

- **§58 분류**: `CANONICAL_APPROVAL_DELEGATION_*` 18종 = **전량 ABSENT**(신설). 외부 소스 어댑터(HRIS/Calendar/ERP) = ABSENT. `VALIDATED_HRIS_DELEGATION_SOURCE`/`VALIDATED_CALENDAR_SOURCE`/`VALIDATED_ERP_DELEGATION_SOURCE` = **소스 존재조차 안 함**. 인접=acl 위임상한/AgencyPortal(KEEP_SEPARATE)·SecurityAudit(LEGACY_ADAPTER).
- **§59 중복 감사 = "중복이 아니라 부재"**: 여러 Delegation Table / Substitute Approver Table / Acting Manager Model / Vacation Delegate Setting = **전부 0**. HRIS·Calendar·ERP 이중 위임 = 소스 0이라 발생 불가. 🔴통합할 대상이 없다 → 신규 Canonical이 §59 "중복 생성" 위반 아님.

---

## 5. §51 Critical Gap 실재 매핑

Delegation 개념 자체가 부재하므로 §51 gap 대부분은 "**gap이 아니라 미구현**"(선행 엔티티 신설 선행 필요). 단 **현행에서 실재 위험**:
- **Cross-Tenant Delegation 차단**: Tenant Guard REAL(`index.php:600`)이나 strict 기본 OFF → 잔여.
- **Self-delegation / Cycle / Depth**: Delegation 없어 무발동(신설 시 필수).
- **acl 위임상한이 유일 monotonicity 방어** — 이것마저 기간/재위임 없음.
- 나머지(Emergency 승인·Acceptance·Expired/Revoked/Suspended 승인·Actor Snapshot 불일치)는 선행 엔티티 부재로 판정 자체 없음.

---

## 6. ⓑ 재실증 정리 (헤더 대비)

1. **acl_permission 위임상한 = RBAC monotonicity CONFIRM** — Delegation Definition 아님(기간/수락/재위임/Cycle 전무).
2. **§4 전 항목 ABSINT CONFIRM** — 유일 이름히트 오탐.
3. **승인 4경로 대리승인자 ABSENT CONFIRM** — 승인자=actor 본인.
4. **AgencyPortal FLIP(방향 정리)** — 승인권 위임 아니라 테넌트 접근권 승인(KEEP_SEPARATE).
5. **§3 선행조건 4축 전부 ABSENT CONFIRM(FLIP 0)** — Delegation 실구현은 Authority/Chain/Org/Legal Entity/Position/SoD 신설이 **선행**돼야 가능.

---

## 7. 다음 단계

- **ⓒ 전사** — §65 = **per-entity `DSAR_APPROVAL_DELEGATION_*` 약 60편** + ADR `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`. §6~§57 Canonical Entity 각 원문 항목 전사 + 현행 대조 + 판정. 분모=측정기(`measure_spec_denominator.mjs --sec=N`·육안 금지). 커버 0 예상(VALIDATED_LEGACY 금지).
- **ⓓ ADR** — Delegation SoT=신설(중복 아니라 부재)·선행 4축 신설 선행·확장자산(SecurityAudit evidence·acl monotonicity 패턴 참조·PM cycle 검출 알고리즘 참조).
- 🔴**코드 변경 0 유지** — 실 Delegation 엔진은 §3 선행조건(Authority/Chain/Org/Legal Entity/Position) 신설 후 **별도 승인세션**.
