# DSAR — Approval Amount Scope (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Amount Scope · 스펙 §25)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Simulation 무변경 · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §25 Amount Scope는 Currency · Maximum · Minimum 축으로 구성되며 "Approval에서 중요"하다고 원문이 명시한다. GeniegoROI에는 이미 금액 기반 승인 게이트가 **실재**한다 — `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1036`) 단일 임계치가 카탈로그 가격변경 정책평가(`Catalog.php:1104-1169`)를 거쳐 서버측 강제(`Catalog.php:395,597,860`)로 실행된다. 본 문서는 이 substrate를 Canonical Amount Scope Type으로 승격하는 설계이며, 현재는 **단일 정적 임계치 하나뿐**이고 역할/팀/테넌트별 차등, 다중 통화, 다단계 approver는 부재하다는 점을 정직하게 판정한다.

## 2. Canonical 필드

스펙 §25는 축 목록만 정의(필드 섹션 없음). 설계 제안: Amount Scope ID · Scope Type(=AMOUNT) · Currency · Maximum · Minimum · Applies-To Role/Tenant · Effective Version.

## 3. 열거형 / 타입

스펙 §25 원문 — **Amount Scope 축**: Currency · Maximum · Minimum.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

| Canonical | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| Maximum(임계치) | `HIGH_VALUE_KRW=5000000.0` | `Catalog.php:1036` | **PRESENT** — 단일 정적 임계치 |
| Approval 트리거(정책평가) | `evaluatePolicy`($price>=임계→high_value) | `Catalog.php:1104-1148` | **PRESENT** |
| 서버측 강제 | `requiresHighValueApproval`(실행 지점) | `Catalog.php:1159-1169`·`:395,597,860` | **PRESENT** — 289차 클라 우회 봉인 |
| 다중 Amount Scope 축(중복감사 관점) | high_value ₩5M 승인(카탈로그 국한) | `Catalog.php:857,1104-1169` | **PRESENT(카탈로그 단일 도메인 국한)** |
| Currency 축(다중 통화 임계) | — | — | **ABSENT** — 통화별 차등 grep 0 |
| Minimum 축 | — | — | **ABSENT** — 하한 임계 grep 0 |
| 역할/팀/테넌트별 차등 임계 | — | — | **ABSENT** — 단일 정적 상수뿐 |
| 다단계(multi-tier) approver | — | — | **ABSENT** — 단일 단계 승인만 |

## 5. 설계 원칙

- Golden Rule — `HIGH_VALUE_KRW` 단일 임계치를 폐기·재발명하지 않고 Amount Scope Type의 정본 substrate로 승격·확장한다(ADR D-1 `AMOUNT_SCOPE(확장)`).
- Currency 축과 다단계 approver는 카탈로그 도메인 국한을 벗어나는 순신규 확장이며, 기존 `evaluatePolicy`/`requiresHighValueApproval` 강제 경로를 대체하지 않고 그 위에 계층을 얹는다(무후퇴).
- Default Intersection 원칙 준수 — Amount Scope가 다른 Scope 축(예: Tenant·Resource)과 동시 지정되면 합집합이 아닌 교집합으로 제한한다.
- 289차 서버측 강제(클라 우회 봉인) 성과는 재플래그하지 않고 그대로 보존한다.

## 6. Gap / BLOCKED_PREREQUISITE

- **Gap**: Currency·Minimum 축, 역할/팀/테넌트별 차등 임계, 다단계 approver 전부 순신규 설계 필요(현행 substrate는 단일 정적 임계치·단일 단계뿐).
- **BLOCKED_PREREQUISITE(RP-002)**: 다단계 approver는 Role Assignment(Part 3-3)·Decision Core의 승인자 해석 계층이 선행되어야 함.
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
