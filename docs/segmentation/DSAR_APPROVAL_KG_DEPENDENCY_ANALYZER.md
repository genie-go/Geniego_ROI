# DSAR — Authorization Knowledge Graph Dependency Analyzer (Part 3-21 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11)

Dependency Analyzer는 인가 지식그래프에서 **노드 간 의존(dependency) 엣지를 정적으로 해석하고 순환(cycle)·고아·미해결 참조를 탐지**하는 읽기전용 의존성 분석 엔진이다. 계약 대상 5개 dependency 축:

- **Policy Dependency** — 정책이 참조하는 하위 정책·조건 노드 의존.
- **Role Dependency** — 역할 합성/상속이 유발하는 역할 간 의존.
- **Permission Dependency** — 권한이 전제하는 선행 권한 의존.
- **Scope Dependency** — 스코프 제약이 참조하는 데이터/테넌트 차원 의존.
- **Service Dependency** — 서비스/시스템 identity가 요구하는 자격 의존.

의존성 그래프는 **DAG여야 하며**, 순환 의존은 인가 결정 불능(deadlock)을 유발하므로 반드시 탐지·차단되어야 한다(SPEC §11 acyclicity 계약).

## 2. Substrate 매핑 표

| Dependency 축 | 현행 substrate | file:line | authz 의존 분석 존재? |
|---|---|---|---|
| 순환 탐지 알고리즘(참고) | menu wouldCycle — **메뉴 트리 전용** | `AdminMenu.php:551-566` | ABSENT(authz 아님) |
| 메뉴 required_role 게이트 | 메뉴 노드 역할 요구 | `AdminMenu.php:107-117` | ABSENT |
| 위임 체인 의존 | 위임 부여 경로 | `TeamPermissions.php:356-373` | ABSENT |
| 위계 파생 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| authz 의존 그래프 순회 | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **순환탐지 알고리즘 재사용 ≠ 도메인 재사용**: `AdminMenu.php:551-566` wouldCycle는 **메뉴 트리**의 순환만 탐지하는 알고리즘이며 authz 의존 그래프가 아니다. §11 엔진은 동종 acyclicity 판정 *기법*을 참조할 수 있으나, 대상 그래프(정책·역할·권한·스코프·서비스 의존)는 전혀 다르므로 authz 의존 순회는 순신설이다.
2. **정적 무부작용**: 의존성 분석은 인가 상태를 변경하지 않으며, 위임 체인(`TeamPermissions.php:356-373`)·위계(`UserAuth.php:186-188`)를 SOURCE로 읽어 Role/Permission Dependency 엣지를 도출한다.
3. **미해결 참조 검출**: 메뉴 required_role 게이트(`AdminMenu.php:107-117`)에서 관측된 required_role↔rank 정합 이슈(289차 부수발견)와 유사한 미해결 의존을 authz 그래프 전반에서 사전 검출한다.
4. **Explainable dependency**: 순환·고아 판정은 관여 노드 경로를 인용해야 한다.

## 4. KEEP_SEPARATE

- **PM DAG(`PM/Gantt.php:20`)** — 작업 선후행 의존과 인가 의존은 별개. 간트 위상정렬을 authz 의존 분석으로 재사용 금지.
- **menu tree 순환(`AdminMenu.php:551-566`)** — 알고리즘만 동종이며 도메인(메뉴 계층)은 별개로 유지.
- **데이터 lineage(`DataPlatform.php:313-345`)**·**attribution(`AttributionEngine.php:242`)**·**GraphScore(`GraphScore.php:12-30`)** — 각기 별도 도메인.

## 5. 판정

**ABSENT (authz dependency grep 0)**. 정책·역할·권한·스코프·서비스 의존을 해석·순환탐지하는 authz 의존성 분석 엔진은 존재하지 않는다. 실재하는 순환탐지는 menu wouldCycle(`AdminMenu.php:551-566`)로 **메뉴 트리 전용**이며 authz 의존이 아니다. PM DAG(`PM/Gantt.php:20`)와 KEEP_SEPARATE. authz 의존 그래프 순회 계층은 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
