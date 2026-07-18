# DSAR — Approval Delegation 중복 구현 감사 (§59)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 감사 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §59(2435-2474) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md)(§1·§2·§4) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_DUPLICATE_IMPLEMENTATION_AUDIT.md](DSAR_APPROVAL_AUTHORITY_DUPLICATE_IMPLEMENTATION_AUDIT.md)
>
> **측정기 분모**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=59` → **불릿 33 / 합계 33**(줄범위 2435-2474). 육안 금지·측정기 확정.

## 0. 한 문장 결론

🔴 **§59는 "중복 구현 감사"이나 실측은 "중복이 아니라 부재"다.** ★**여러 Delegation Table / Substitute Approver Table / Acting Manager Model / Vacation Delegate Setting 전부 0 = 통합 대상 없음.** 원문 33개 탐지항목이 겨냥하는 "여러/이중 Delegation 자산"은 하나도 실재하지 않는다 — 통합할 동일 목적 Delegation 구현이 **존재하지 않는다**(ⓑ §1 능력 기반 grep 전수·§4 §59). "Approval Delegation"(승인 권한/업무를 다른 Actor에게 시간제한 이양) 개념 자체가 레포에 없으므로(ⓑ §0), 위반 조건(Cross-Tenant/Self/Cycle/Expired 승인 등)은 delegation 엔티티 부재로 **무발동**(NOT_APPLICABLE)이고, delegation이 갖춰야 할 축(Acceptance/Approval/Version/Snapshot)과 외부 위임 소스(HRIS/Calendar/ERP)는 코드에 **부재**(ABSENT)다. 유일 인접 실자산 = `acl_permission` 위임상한(RBAC monotonicity·`DELEGATION_EXCEEDED`) — delegation이 아니라 **부여 단조성 검증**이며 KEEP_SEPARATE.

## 1. 현행 실측 (file:line)

| 축 | 실측 | 판정 |
|---|---|---|
| 여러 Delegation / Substitute / Acting / Vacation Table | `\breassign`·`\bsubstitute`·`\bvacation\b`·`\bacting_manager\b`·`backup_approver`·`alternate_approver`·`out_of_office`·`delegated_authority`·`\bdoa\b` **grep 0**(`backend/src` 전수·단어경계 재실증) — 복수는커녕 **단수 테이블도 0**(ⓑ §1) | `NOT_APPLICABLE`(통합 대상 부재) |
| 유일 이름 히트 = RBAC 위임상한 | `TeamPermissions.php:194` `actionsCover()`·`:639` 위반수집·`:645` `DELEGATION_EXCEEDED` 403 — manager가 자기 assignable 밖 action을 하위 부여 시 차단(**단조성**). 기간·수락·재위임·Cycle 전무(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON`(delegation 아님) |
| 승인 4경로 = 상태머신(대리자 없음) | `Mapping::approve:238-291`(정족수 2·자기승인차단 `:268`)·catalog `:2341-2364`(승인자 identity 미기록)·admin_growth `:1330`(decided_by=호출자) — **승인자=진입게이트 통과 actor 본인**, backup/acting/on-behalf 해석 **없음**(ⓑ §2.2) | `LEGACY_ADAPTER`(상태전이·delegation 아님) |
| 외부 위임 소스(HRIS/Calendar/ERP/OOO) | 5개 전부 소스 0(`calendar`=콘텐츠 캘린더 오탐·`hris`=`hig`hRis`k` 오탐·`presence`=LiveCommerce 하트비트·ⓑ §1) — 이중 위임·자동 승계 발생 불가 | `ABSENT`(소스 0) |

★**Delegation 엔티티 전체가 부재하므로 "중복 제거" 커버는 원천 불가.** 아래 33항목 전사는 각 탐지대상의 **부재 깊이 / 무발동 근거 / 인접 자산**을 기록한다. `VALIDATED_LEGACY` = **0**(cover 0).

## 2. 원문 전사 + 판정 — **원문 33종**(측정기 확정)

| # | 원문 탐지항목(verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | 여러 Delegation Table | Delegation Table grep 0(ⓑ §1) — 단수도 0 → 복수 중복 무발동 · **통합 대상 없음** | `NOT_APPLICABLE` |
| 2 | 여러 Substitute Approver Table | `\bsubstitute` 실히트 = `Migrate.php:203`("substitution" 타입매핑 주석·도메인 무관 오탐·ⓑ §1) → Substitute Table 0 | `NOT_APPLICABLE` |
| 3 | 여러 Acting Manager Model | `\bacting\b`·`acting_manager` grep 0(부분문자열 실히트 0·ⓑ §1) — Acting Manager 모델 0 | `NOT_APPLICABLE` |
| 4 | 여러 Vacation Delegate Setting | `vacation`·`out_of_office`/`ooo` grep 0(ⓑ §1) — Vacation Delegate 설정 0 | `NOT_APPLICABLE` |
| 5 | HRIS와 Workflow 이중 Delegation | HRIS Leave 소스 0(`hris`=`hig`hRis`k` 오탐)·Workflow 엔진 부재(승인=상태전이 UPDATE·ⓑ §1·§2.2) → 이중 정의 무발동 | `ABSENT`(소스 0) |
| 6 | Calendar와 Platform 이중 Delegation | Calendar OOO 소스 0(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) → 이중 무발동 | `ABSENT`(소스 0) |
| 7 | Tenant별 JSON Delegate | tenant별 delegate JSON 저장 0 · `approvals_json`={user,ts}뿐(`Mapping.php:285`·delegate 아님·ⓑ §2.2) | `ABSENT` |
| 8 | Email 기반 Proxy Approver | `proxy` 실히트 = `Connectors.php:3875,3911`(Adobe `x-proxy-*` 헤더)·`AdminMenu.php:21`(reverse-proxy 주석) — 네트워크/자격증명 오탐(ⓑ §1) · email→proxy approver 매핑 0 | `ABSENT` |
| 9 | User Preference 기반 Delegate | 사용자 설정 기반 위임 대상 저장 0(ⓑ §1) | `ABSENT` |
| 10 | 하드코딩 Backup Approver | `backup_approver`·`alternate_approver` grep 0(ⓑ §1) — 하드코딩 백업 승인자 0 | `ABSENT` |
| 11 | Task Reassignment를 Delegation으로 사용 | `\breassign` grep 0(`backend/src` 전수) — Task Reassignment 경로 자체 부재 → delegation 오용 무발동(ⓑ §1) | `ABSENT` |
| 12 | Role Assignment를 Delegation으로 사용 | 🔴 인접 실자산 = `acl_permission` RBAC 권한/역할 부여(`TeamPermissions::putMemberPermissions:615-647`)이나 **위임 아님** — member 절대 권한 매트릭스 일방 치환(`:652`)·기간/수락/재위임 전무(ⓑ §2.1). Role Assignment를 Delegation으로 **오용하지 않음** | `KEEP_SEPARATE_WITH_REASON` |
| 13 | Delegation Version 없음 | 불변 prev-링크 Delegation 버전체인 선례 0(ⓑ §2.1 재위임/버전 없음) — 버전 축 부재 | `ABSENT` |
| 14 | Delegation Snapshot 없음 | Delegation Snapshot 엔티티 grep 0(ⓑ §2.5) · 인접 정본 = `SecurityAudit::verify():56-68`(검증형 해시·확장 대상)이나 delegation 스냅샷 아님 · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `ABSENT` |
| 15 | 종료일 없는 Temporary Delegation | Temporary Delegation 개념 0(delegation 엔티티 부재) → 종료일 유무 판정 무발동. `acl_permission`=영구·expiry 컬럼 없음이나 delegation 아님(ⓑ §2.1) | `NOT_APPLICABLE`(무발동) |
| 16 | Acceptance 없음 | Delegate 수락 축 부재 — 승인 4경로 공통 수락 단계 0(manager 일방 치환·ⓑ §2.1·§2.2) | `ABSENT` |
| 17 | Approval 없음 | 위임 승인 축 부재 — "원 승인자 부재 시 대리인 승인권 이양" 로직 0(ⓑ §2.2) | `ABSENT` |
| 18 | Cross-Tenant Delegate | delegate 엔티티 부재 → 교차테넌트 위임 무발동. 🔴잔여위험 = Tenant Guard REAL(`index.php:600` 무조건 덮어쓰기)이나 strict 기본 OFF(`:585`·ⓑ §3.4·§5) → 신설 시 fail-closed 선결 | `NOT_APPLICABLE`(무발동) |
| 19 | Cross-Legal-Entity Delegate | Legal Entity 엔티티 0(회사프로필 단일 문자열 `business_number`·법인 아님·ⓑ §3.3) + delegate 부재 → 교차법인 위임 무발동 | `NOT_APPLICABLE`(무발동) |
| 20 | Self-delegation | delegate 부재 → 자기위임 무발동(신설 시 필수 가드·ⓑ §5) | `NOT_APPLICABLE`(무발동) |
| 21 | Re-delegation Cycle | 재위임 경로 0(member 재부여 경로 0·ⓑ §2.1) · Delegation 전용 cycle/depth 코드 grep 0(PM/메뉴 cycle은 도메인 상이·ⓑ §2.4) → Cycle 무발동 | `NOT_APPLICABLE`(무발동) |
| 22 | Original Authority보다 넓은 Scope | Authority Foundation ABSENT(`authority_matrix`·`approval_authority` grep 0·ⓑ §3.2) + delegation 부재 → 초과 Scope 비교 무발동. acl 단조성(`DELEGATION_EXCEEDED`)은 부여상한이지 위임 scope 아님(ⓑ §2.1) | `NOT_APPLICABLE`(무발동) |
| 23 | Original Authority보다 큰 Amount | 금액축 부재(유일 = `Catalog.php` HIGH_VALUE_KRW 상수·boolean·ⓑ §3.2) + delegation 부재 → 초과 Amount 비교 무발동 | `NOT_APPLICABLE`(무발동) |
| 24 | Decision 시 재검증 없음 | Delegation Decision 경로 부재 → 결정시점 재검증 무발동. 4경로 "승인자"=진입게이트 통과자뿐(ⓑ §2.2) | `NOT_APPLICABLE`(무발동) |
| 25 | Expired Delegation 승인 | 만료 delegation 부재 → 만료본 승인 무발동. 만료축(`valid_to`/`effective_to`)도 승인엔티티에 0(ⓑ §2.1) | `NOT_APPLICABLE`(무발동) |
| 26 | Revoked Delegation 승인 | 철회 delegation 부재 → 철회본 승인 무발동(`revoked_at` in-place 소거는 AgencyPortal 접근권·delegation 아님·ⓑ §2.3) | `NOT_APPLICABLE`(무발동) |
| 27 | Suspended Delegation 승인 | 정지 delegation 부재 → 정지본 승인 무발동. Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE`(무발동) |
| 28 | Current Delegation으로 과거 Decision 재해석 | Delegation·Snapshot 부재 → as-of 재해석 무발동(ⓑ §2.5 Snapshot 0) | `NOT_APPLICABLE`(무발동) |
| 29 | Calendar Out-of-office를 자동 Authority로 사용 | Calendar OOO 소스 0(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) → OOO 자동 권한 부여 로직 부재 | `ABSENT`(소스 0) |
| 30 | Manager 변경 시 Delegate 자동 승계 | 🔴 Manager **Resolver ABSENT**(`parent_user_id`가 최상위 owner로 붕괴·`UserAuth.php:156-157,1225-1227`·ⓑ §3.3) → 상급자 변경 자동 승계 로직 부재 | `ABSENT` |
| 31 | Position Vacancy에서 Delegate 자동 생성 | Position/incumbency(직위 재직) 개념 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) → 공석 자동 위임 생성 부재 | `ABSENT` |
| 32 | Role Name 문자열 Join | Delegation resolver가 role 이름 문자열로 위임대상을 조인하는 코드 0. 인접 `roleRank`(`index.php:554` api_key 등급)·`team_role`(사람 계층 flat enum)은 RBAC 2축이며 **delegation 조인 아님**(ⓑ §3.3) | `ABSENT` |
| 33 | Email 문자열 Join | email→delegate 문자열 조인 grep 0(ⓑ §1) — 이메일 기반 위임 매핑 부재 | `ABSENT` |

**실측 개수: 33 / 33 전사(측정기 확정).** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 0 · `KEEP_SEPARATE_WITH_REASON` 1(#12) · `ABSENT` 16(#5·6·7·8·9·10·11·13·14·16·17·29·30·31·32·33) · `NOT_APPLICABLE` 16(#1·2·3·4·15·18·19·20·21·22·23·24·25·26·27·28).

> 🔴 **커버 0.** §59 "중복 감사"의 결론은 **"통합할 중복이 없다 = 부재"**. ★**여러 Delegation / DOA / Substitute / Acting / Vacation Table 전부 0 = 통합 대상 없음**(#1~#4). 나머지 위반 조건(#15·18~28)은 delegation 엔티티 부재로 **무발동(NOT_APPLICABLE)**이며, delegation이 갖춰야 할 축·외부 소스(#5~11·13·14·16·17·29~33)는 코드에 **ABSENT**다. 유일 `KEEP_SEPARATE_WITH_REASON`(#12 acl 위임상한)은 RBAC 부여 단조성이지 §59가 겨냥한 "Role Assignment를 Delegation으로 오용"이 **아니다**. 어느 항목도 `VALIDATED_LEGACY`가 아니다.

## 3. 규칙

- 🔴 **"중복 제거"로 오독하지 마라** — §59 탐지항목 전부가 `NOT_APPLICABLE`(무발동) 또는 `ABSENT`(부재)다. 통합할 Delegation 자산이 없으므로 이 감사는 통합 명세가 아니라 **신설의 전제**가 된다. "기존 여러 Delegation Table을 하나로 통합" = **전건 거짓**(단수 테이블조차 0·ⓑ §1). 신규 Canonical Delegation은 §59 "중복 생성" 위반이 아니다(ⓑ §4 §59).
- 🔴 **acl 위임상한(#12)을 Delegation으로 승격/재구현하지 마라** — `DELEGATION_EXCEEDED`(`TeamPermissions.php:645`)는 부여자가 자기가 안 가진 권한을 못 주는 **monotonicity**일 뿐, Delegator→Delegate 관계 엔티티가 아니다(기간/수락/재위임/Cycle 전무·ⓑ §2.1). Delegation 신설 시 이 검증 **패턴만 참조**(중복 엔진 금지).
- 🔴 **외부 위임 소스(HRIS/Calendar/ERP/OOO·#5·6·29~31)를 "있음"으로 표기 금지** — 5개 소스 전부 grep 0 오탐이다(ⓑ §1). Manager 자동 승계(#30)·Position 공석 자동 생성(#31)은 **Manager/Reporting-Line Resolver·Position/Incumbency 신설이 선행**돼야 가능(§3 선행조건·별도 승인세션).
- 🔴 **Snapshot(#14)을 신규 해시체인 엔진으로 만들지 마라** — 인접 정본 = `SecurityAudit::verify():56-68`(검증형) 확장이다. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식).
- 🔴 **Cross-Tenant Delegate(#18) 잔여위험 상속 금지** — Tenant Guard REAL이나 strict 기본 OFF(`index.php:585`·ⓑ §3.4). Delegation 신설 시 fail-closed 기본 ON을 선결하라.
- 🔴 **코드 변경 0 유지** — 실 Delegation 엔진은 §3 선행조건(Approval·Authority·Reporting-Line Resolver·Authorization Safety) 신설 후 **별도 승인세션**(Golden+verify+배포승인).
