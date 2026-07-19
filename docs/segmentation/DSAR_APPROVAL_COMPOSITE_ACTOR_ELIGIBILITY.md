# DSAR — Composite Actor Eligibility (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_HIERARCHY_COMPOSITE_GOVERNANCE.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_HIERARCHY_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_HIERARCHY_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002(선행 Permission Engine(Part 2)·Decision Core 실구현 후 별도 승인세션)
- **불변**: Role Hierarchy ≠ Organization Hierarchy ≠ Permission Hierarchy ≠ Permission Group(§6.1~6.3) · Golden Rule(Extend not Replace·중복 신설 금지) · 반날조(코드 인용은 상위 ADR·GROUND_TRUTH 2편에 실제 등장하는 것만·직접 grep 금지·없으면 ABSENT)

---

## 1. 목적

Composite Role 구성 시 각 Component의 Actor Eligibility(부여 가능 actor 종류)를 **교집합**으로 결합하는 규칙(§6.9·§27). Human-only Role과 Machine-only Role 등 상호 배타적 Actor Type 조합을 원천 차단한다.

## 2. Canonical 필드

Composite Role(§21)·Composite Role Version(§22)·Composite Role Component(§23, Component 단위)·Effective Composite Role Set(§35)의 Actor Eligibility 관련 필드로 구현한다.

| 필드 | 출처 | 설명 |
|---|---|---|
| `actor_eligibility_policy` | §21 Composite Role | Composite 전체 정책 |
| `actor_eligibility_snapshot` | §22 Composite Role Version | 버전별 스냅샷 |
| `actor_eligibility_policy`(component 단위) | §23 Composite Role Component | Component별 정책 |
| `effective_actor_eligibility` | §35 Effective Composite Role Set | 실 교집합 결과 |

## 3. 열거형 / 타입

전용 열거형 없음(§27은 규칙 목록으로 서술). 규칙: Human-only+Human-only 허용 가능 · Machine-only+Machine-only(동일 Actor Type일 때) 허용 · Human-only+Machine-only 기본 차단 · Service Account+System Actor 기본 차단 · API Client+Human Role 기본 차단 · Employee-only+External User Allowed → 더 제한적 Eligibility 채택 · Authentication Assurance → 최대 요구 수준 · Tenant Membership → 모두 충족 · Legal Entity → 교집합/명시적 매핑 · Organization → 교집합/Assignment Scope 검증.

## 4. 실 substrate 매핑 (§5.2)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Composite Actor Eligibility(교집합 로직) | (해당 없음) | **ABSENT(순신규)** | 백엔드 PHP grep 0건(composite 등) |
| 근접(혼동 금지) — 선형 rank 3종(미통합·상호 비변환) | api_key role(4단 정수) / team_role(3단 enum) / plan(6단) | §6.2 "선형 rank≠상속" 오변환 금지·별도 Registry(Actor/Category 축) | `index.php:573` · `TeamPermissions.php:120-131` · `PlanPolicy.php:19-22` · `AdminMenu.php:74,338`(중복) |

★**정직**: Composite Actor Eligibility 교집합 로직·Legal Entity/Organization 교집합 = 순신규 ABSENT. api_key role(프로그래매틱 축)·team_role(사람 축)·plan(구독 축) 3계열은 **서로 다른 값공간의 rank**이며(중복감사 D-2·D-6), Composite Actor Eligibility가 요구하는 "actor type 교집합"으로 직접 전환할 수 없다.

## 5. 설계 원칙

- 기본=교집합(§6.9 필수 통제·§6.16 고객 설정으로 비활성화 불가).
- Human-only Role↔Machine-only Role(SERVICE_ACCOUNT/SYSTEM_ACTOR/API_CLIENT)의 Composite 결합을 금지한다(§27).
- api_key role(API_CLIENT 축)·team_role(HUMAN 축)·plan(구독 축) 3계열은 값공간이 달라 Composite Actor Eligibility의 단일 축으로 임의 병합하지 않는다(D-2·D-6) — Category/Actor 축을 분리 유지한다.
- Employee-only+External User Allowed 조합 시 항상 더 제한적인 쪽을 채택한다(자동 완화 금지).
- Authentication Assurance는 구성 Component 중 최대 요구 수준을 채택한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Composite Actor Eligibility 교집합 로직·Legal Entity/Organization 교집합 = 순신규.
- **BLOCKED_PREREQUISITE(RP-002)**: Actor Identity Assurance(선행 Governance)·Tenant/Legal Entity/Organization Membership 실구현이 선행되지 않아 공회전.
- roleRank/team_role/plan 3계열 rank를 Composite Actor Eligibility Registry로 임의 통합 금지(D-2·D-6 오용 경계). 289차 P1~P4 수정분·폐기 admin_roles/user_roles 재플래그 금지.
