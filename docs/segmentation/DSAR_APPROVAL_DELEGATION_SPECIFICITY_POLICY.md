# DSAR — Approval Delegation Specificity Policy (§33)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §33 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 해소: [DSAR_APPROVAL_DELEGATION_RESOLUTION.md](DSAR_APPROVAL_DELEGATION_RESOLUTION.md) · 결과: [DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md](DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md) · 우선순위: [DSAR_APPROVAL_DELEGATION_PRIORITY.md](DSAR_APPROVAL_DELEGATION_PRIORITY.md) · 스코프: [DSAR_APPROVAL_DELEGATION_SCOPE.md](DSAR_APPROVAL_DELEGATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=33` → **§33 = 14**(줄범위 1518-1540 · 불릿 0 · **번호 14** ← 번호목록·불릿만 세면 0). 분할 = **권장 Specificity 평가 14단**(Exact Task ~ Tenant-wide). 하위 ENUM/필드 없음(특이성 평가 순서 목록).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 특이성(Specificity) 해소 로직 | `delegation_scope`·`specificity`·`redelegation` 복합어 grep **0** — 동일 Actor 다중 위임 적용 시 특이성 평가 개념 부재(ⓑ §0·§1) | `ABSENT`(특이성 해소 로직 부재) |
| binding(스코프 결속) 개념 | 🔴 Delegation Authority/Resource/Action/Organization/Legal Entity/Geographic/Monetary/Currency Binding(§12~§19) **전량 신설 대상·엔티티 0** → 특이성을 산정할 결속 축 자체가 없음 | `ABSENT`(binding 개념 없음) |
| 인접 스코프 선례 | `acl_permission` scopeSql·`data_scope` ABAC(`TeamPermissions.php:286`)=**RBAC 데이터-행 필터** — 위임 특이성 축이 아님(장식·ⓑ §2.1) | `LEGACY_ADAPTER`(RBAC 스코프·특이성 아님) |

★**특이성은 동일 Actor 에 여러 위임이 걸릴 때 가장 구체적인 것을 고르는 규칙인데, Delegation 엔티티·Binding 축·해소 엔진이 통째로 부재하므로 평가 단계 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/binding 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 14종**(권장 Specificity 평가 14단 · 번호목록)

### 권장 Specificity 평가 (14) — 구체→광범 순

| 순위 | 원문 Specificity 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Exact Task | 🔴 특이성 해소 로직 부재 · Task 별 위임 결속 개념 0(Task Reassignment 은 §5.10 별 도메인·미구현) | `ABSENT` |
| 2 | Exact Approval Case | 특이성 해소 부재 · Approval Case(§3.1) 엔티티 부재 → 결속 대상 없음 | `ABSENT` |
| 3 | Exact Chain Level | 특이성 해소 부재 · Approval Chain Level(5-3-3-3) 부재 | `ABSENT` |
| 4 | Exact Authority Version | 특이성 해소 부재 · Approval Authority Version(5-3-3-4) 전면 부재 | `ABSENT` |
| 5 | Exact Resource | 특이성 해소 부재 · Resource Binding(§13) 엔티티 0 | `ABSENT` |
| 6 | Exact Legal Entity | 특이성 해소 부재 · Legal Entity 전면 void(`biz_no`/`corp_reg` grep 0) | `ABSENT` |
| 7 | Exact Organization | 특이성 해소 부재 · Organization Unit/Hierarchy 엔티티 부재(5-3-3-1) | `ABSENT` |
| 8 | Exact Action | 특이성 해소 부재 · Action Binding(§14) 엔티티 0(`acl_permission` action=RBAC·위임 결속 아님) | `ABSENT` |
| 9 | Exact Amount Band | 특이성 해소 부재 · 금액 밴드 저장계층 0(유일 `HIGH_VALUE_KRW` 단일 상수·boolean 게이트·ⓑ §18) | `ABSENT` |
| 10 | Exact Currency | 특이성 해소 부재 · Currency Binding(§19) 도메인 부재 | `ABSENT` |
| 11 | Exact Country | 특이성 해소 부재 · 위임 지리 결속(§17) 0(`Geo` IP→ISO 는 위임 스코프 아님) | `ABSENT` |
| 12 | Exact Region | 특이성 해소 부재 · Region 결속 축 0 | `ABSENT` |
| 13 | General Domain | 특이성 해소 부재 · Authority Domain(5-3-3-4) 자체 부재 | `ABSENT` |
| 14 | Tenant-wide | 특이성 해소 부재 · 테넌트 광역 위임 결속 개념 0(Tenant 마스터 부재·ⓑ §3.4) | `ABSENT` |

**실측 개수: 14 / 14 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 14.

> 🔴 **커버 0.** 특이성은 동일 Actor 에 복수 위임이 적용될 때 가장 구체적인 결속을 선택하는 규칙인데, Delegation 엔티티·Binding 축(§12~§19)·해소 엔진이 통째로 부재하므로 어떤 평가 단계도 `VALIDATED_LEGACY` 가 아니다. 14단 전량 `ABSENT` — **특이성을 산정할 binding(결속) 개념 자체가 없다**. Exact Task~Tenant-wide 각 층은 대응 Binding(Resource/Legal Entity/Organization/Action/Monetary/Currency/Geographic) 신설이 선행돼야 평가 대상으로 존재한다.

## 2. 규칙

- 🔴 **원문 §33 "가장 넓은 Full Delegation 을 무조건 선택하지 마라."** — 특이성 신설의 **핵심 안전 규칙**이다. 복수 위임이 동일 Actor 에 걸릴 때 광범한 Full Delegation(§26 FULL)을 무조건 채택하면 최소 권한 원칙(§5.6 "기본값은 Full 이 아니라 Partial")을 정면 위반한다. 반드시 Exact Task→…→Tenant-wide 순으로 **가장 구체적인 결속**을 선택하고, 동순위 충돌은 §34 Conflict(`FULL_PARTIAL_CONFLICT`)로 라우팅하라.
- 🔴 **특이성 14단을 §32 우선순위와 혼동/대체하지 마라** — 원문은 우선순위(§32·타입 기반 순서)와 특이성(§33·결속 범위 구체성)을 **별 축**으로 규정한다. Emergency(우선순위 1위)라도 Tenant-wide(특이성 최하)일 수 있고, Exact Task(특이성 최상)가 Backup Approver(우선순위 하위)일 수 있다. Resolution Result(§31) `winning delegation` 은 두 축의 합성 결과여야 하며, 어느 한 축만으로 승자를 정하면 오채택된다.
- 🔴 **특이성을 `acl_permission` scopeSql 로 재구현하지 마라** — `data_scope` ABAC(`TeamPermissions.php:286`)은 RBAC 데이터-행 필터이지 위임 결속 축이 아니다(LEGACY_ADAPTER·중복 엔진 금지). 특이성은 §12~§19 Binding 축이 신설된 뒤 그 결속의 범위 구체성을 비교하는 것이며, 각 Exact 층은 해당 Binding 의 include/exclusion 정책 위에서만 성립한다.
- 🔴 **14단 전량 `ABSENT` 를 "특이성 위반 없음(준수)"으로 오독 금지** — 위반이 없는 게 아니라 **선택 로직이 없어 어떤 위임도 무검증 통과**할 수 있는 상태다. 우연한 부재를 준수로 계산 금지(§58 ⑦). 특이성 해소 신설 전에는 복수 위임 시 Fail-closed(수동 검토·§31 `MANUAL_REVIEW_REQUIRED`)가 안전 기본값이다.
