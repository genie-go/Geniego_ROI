# DSAR — Approval Delegation Registry (§7)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §7 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · ADR(예정): `ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md`(ⓓ)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_REGISTRY` 엔티티 | `delegation_registry`·`approval_delegation` grep **0** — 레포에 Approval Delegation 개념 부재(ⓑ §0·§1) | `NOT_APPLICABLE`(부재→신설) |
| Delegation 인접 유일 실재 | `TeamPermissions::putMemberPermissions:615-647`의 `actionsCover:194-198` = **RBAC 부여 상한 monotonicity**(`DELEGATION_EXCEEDED` 403 `:645`) — 위임 상한 검증일 뿐 Delegator→Delegate 관계·기간·수락·재위임 전무(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON` |
| evidence 정본 | `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·`hash_equals`+`prev_hash`) — 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |
| tenant 격리 | Tenant Isolation Guard **REAL**(`index.php:600` 무조건 덮어쓰기)·단 strict 기본 OFF(`:585`)·`api_key.tenant_id`=FK 없는 VARCHAR(ⓑ §3.4·§5) | `LEGACY_ADAPTER`(격리 실재·권위 tenant 마스터 부재) |
| 외부 소스(HRIS/ERP/Calendar OOO) | §4 대사 대상 **5종 전부 소스 존재조차 안 함**(`hris`=`hig`hRis`k` 오탐·`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |

★**Registry 엔티티가 통째로 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **판정 근거는 전부 ⓑ file:line.**

## 1. 원문 전사 + 판정 — **원문 37종**(필수 필드 23 + Registry Type 14)

### 필수 필드 (23)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_delegation_registry_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | tenant_id | Tenant Guard REAL(`index.php:600` 무조건 덮어쓰기)·strict 기본 OFF(`:585`)·`api_key.tenant_id`=느슨한 VARCHAR(FK 0) — 격리는 실재하나 권위 tenant 마스터 부재(ⓑ §3.4) | `LEGACY_ADAPTER` |
| 3 | registry_code | 부재 | `NOT_APPLICABLE` |
| 4 | registry_name | 부재 | `NOT_APPLICABLE` |
| 5 | registry_type | 부재 · 아래 Type 14종 열거도 전부 미시드 | `NOT_APPLICABLE` |
| 6 | authoritative_source | 부재 — Delegation SoT 미결정(ⓓ ADR 대상) | `NOT_APPLICABLE` |
| 7 | supported delegation types | 부재 — Delegation Type(§8) 엔티티 자체 없음 | `NOT_APPLICABLE` |
| 8 | authority delegation support | 🔴 **Authority 개념 자체 부재**(5-3-3-4 결론·`authority_matrix`/`approval_authority` grep 0·ⓑ §3.2) → 이양할 권한 단위 미정의 | `ABSENT` |
| 9 | task responsibility delegation support | 🔴 Approval Task Assignment/Reassign 개념 부재(§4 Task Reassignment=별 도메인·이번 블록 미구현·ⓑ §1) → 이양할 책임 단위 없음 | `ABSENT` |
| 10 | monetary delegation support | 🔴 금액축 부재 — 유일 금액조건=`Catalog.php:1016` `HIGH_VALUE_KRW` 상수(승인 필요여부 boolean만·ⓑ §3.2) | `ABSENT` |
| 11 | re-delegation support | 🔴 재위임 표현 0 — member 재부여 경로 없음(acl 위임상한도 재위임 축 전무·ⓑ §2.1) | `ABSENT` |
| 12 | emergency delegation support | 🔴 Emergency/Break-glass grep **0**(ⓑ §3.4) | `ABSENT` |
| 13 | out-of-office integration support | 🔴 OOO/HRIS Leave/Calendar 소스 **존재조차 안 함**(`calendar`=콘텐츠 캘린더 오탐·ⓑ §1) | `ABSENT` |
| 14 | legal entity restriction support | 🔴 Legal Entity 전면 void — `biz_no`/`corp_reg`/`tax_id` grep 0·회사프로필 `business_number` 단일 문자열(법인 아님·ⓑ §3.3) | `ABSENT` |
| 15 | multi-currency support | 🔴 통화 스코프 0 · 환율 저장계층 부재(ⓑ §3.2 금액축과 동반 부재) | `ABSENT` |
| 16 | acceptance required default | 부재 — Delegate 수락 개념 없음(승인 4경로 승인자=진입게이트 통과자 본인·ⓑ §2.2) | `NOT_APPLICABLE` |
| 17 | approval required default | 부재 — Delegation 승인 라이프사이클 없음(ⓑ §2.2·§3.1 Approval Foundation 커버 0) | `NOT_APPLICABLE` |
| 18 | owner | 인접 = `parent_user_id IS NULL` owner 판별(`UserAuth.php`·ⓑ §3.3) — 소유자 개념은 있으나 registry owner 아님 | `LEGACY_ADAPTER` |
| 19 | active_version | 🔴 불변 prev-링크 버전체인 선례 0 — Delegation Version(§10) 엔티티 부재·상태전이 태그 하드코딩(ⓑ §2.5) | `ABSENT` |
| 20 | valid_from | 🔴 Delegation 엔티티에 effective-dating 없음 — 인접 `kr_fee_rule.effective_from`은 수수료 도메인·질의계층만(위임 도메인 아님·ⓑ §5 Period) | `ABSENT` |
| 21 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(폐구간 부재·ⓑ §5) → 종료일 신규 | `ABSENT` |
| 22 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인)·Delegation 상태머신 부재 | `LEGACY_ADAPTER` |
| 23 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts 저장·검증기·ⓑ §2.5) · 🔴`menu_audit_log.hash_chain` 인용 금지 | `LEGACY_ADAPTER` |

### Registry Type (14)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 24 | PLATFORM | 인접 = `admin_growth_approval`(플랫폼 전역 승인 큐·`decided_by`=호출자 `:1330`·tenant 없음·ⓑ §2.2) — Delegation Registry 아님 | `LEGACY_ADAPTER` |
| 25 | TENANT | 인접 = Tenant Guard(`index.php:600`)·mapping/catalog 테넌트 스코프 경로 — Delegation Registry 아님 | `LEGACY_ADAPTER` |
| 26 | LEGAL_ENTITY | 부재 — Legal Entity 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 27 | ORGANIZATION | 부재 — Organization Unit/Hierarchy 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 28 | FINANCE | 부재 — Finance Delegation Authority 0 | `NOT_APPLICABLE` |
| 29 | REBATE | 부재 — rebate delegation 0 | `NOT_APPLICABLE` |
| 30 | CLAIM | 부재 | `NOT_APPLICABLE` |
| 31 | SETTLEMENT | 부재 — settlement delegation 0(정산 파이프라인은 있으나 위임 권한 아님) | `NOT_APPLICABLE` |
| 32 | PAYMENT | 부재 — payment delegation 0 | `NOT_APPLICABLE` |
| 33 | CONTRACT | 부재 | `NOT_APPLICABLE` |
| 34 | HRIS | 🔴 HRIS 위임 소스 **존재조차 안 함**(`hris`=`hig`hRis`k` 오탐·§4 대사 대상 0·ⓑ §1) | `ABSENT` |
| 35 | ERP | 🔴 ERP Delegate Mapping 소스 **존재조차 안 함**(§4 대사 대상 0·ⓑ §1) | `ABSENT` |
| 36 | WORKFLOW | 🔴 Workflow-specific/BPMN Delegate 소스 **존재조차 안 함**(§4 대사 대상 0·ⓑ §1) | `ABSENT` |
| 37 | CUSTOM | 부재 | `NOT_APPLICABLE` |

**실측 개수: 37 / 37 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6 · `KEEP_SEPARATE_WITH_REASON` 0 · `ABSENT` 14 · `NOT_APPLICABLE` 17.

> 🔴 **커버 0.** Registry 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건(tenant_id·owner·status·evidence·PLATFORM·TENANT)은 **확장 대상 인접 자산**(evidence=SecurityAudit·tenant=Tenant Guard·PLATFORM=admin_growth 큐)이지 커버가 아니다. `ABSENT` 14건은 저장계층부터 부재한 능력축(authority/monetary/currency/legal entity/re-delegation/emergency/OOO/version/period 및 HRIS/ERP/WORKFLOW 소스).

## 2. 규칙

- 🔴 **Registry 는 신설이나, 하위 필드의 인접 선례를 재구현하지 마라** — evidence=`SecurityAudit::verify()` 확장 · tenant=Tenant Guard(`index.php:600`) 확장 · owner=`parent_user_id` 소유자 판별 재사용. **중복 엔진 금지**(§59 "중복이 아니라 부재"·ⓑ §4).
- 🔴 **`tenant_id` 를 느슨한 VARCHAR 로 두지 마라**(§5.4 Cross-Tenant 금지) — Registry 신설 시 권위 tenant 마스터 부재(ⓑ §3.4)를 상속하지 말고 strict fail-closed 기본 ON 권장. Delegator·Delegate 동일 Tenant 강제는 Registry가 아니라 Eligibility(§25)에서도 재검증.
- 🔴 **`authority delegation support`/`monetary delegation support`/`multi-currency support` 를 "있음"으로 표기 금지** — Authority 개념·금액축·통화 이력이 **선행조건(§3.2)부터 부재**다(ⓑ §3.2). Registry 플래그가 실제 능력을 초과 선언하면 §5.2 "Delegate가 Delegator Authority 초과" gap 을 구조적으로 유발한다. Monetary/Legal Entity delegation은 Authority Foundation(5-3-3-4) 신설이 **선행**.
- 🔴 **Registry Type 14종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로. HRIS/ERP/WORKFLOW 는 **소스 존재조차 안 하므로**(ⓑ §1) 커넥터 신설이 선행이며 Registry Type 존재가 소스 존재를 의미하지 않게 하라.
- 🔴 **실 Registry 구현은 별도 승인세션** — Delegation은 §3 선행조건(Authority/Approval Chain/Org/Legal Entity/Position) 신설 후에만 가능(ⓑ §7). 본 문서는 비파괴 설계 명세이며 `backend/src` 코드 변경 0.
