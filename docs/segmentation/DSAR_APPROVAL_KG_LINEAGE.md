# DSAR — Authorization Knowledge Graph Lineage Engine (Part 3-21 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §12)

APPROVAL_GRAPH_LINEAGE는 인가 지식그래프(Authorization Knowledge Graph) 위에서 **정책·권한·역할·결정·컴플라이언스 노드의 시간축 변천(evolution)을 방향성 있는 계보(lineage)로 추적**하는 읽기전용 계보 엔진이다. 계약 대상 5개 lineage 축:

- **Policy Evolution Lineage** — 정책 노드의 생성·개정·폐기 체인을 앞선 버전 → 후속 버전으로 연결.
- **Permission Evolution Lineage** — 권한 부여/축소 이벤트를 원인 결정에 역참조.
- **Role Evolution Lineage** — 역할 정의·합성·상속 변경의 세대 추적.
- **Decision Evolution Lineage** — 승인/거부 결정 노드가 어느 정책 세대에서 파생됐는지 계보화.
- **Compliance Evolution Lineage** — 컴플라이언스 상태 전이(certified↔not_certified)의 근거 사슬.

Lineage 엔진은 **어떤 인가 상태도 변경하지 않는다**(read-only, side-effect 0). 출력은 노드-엣지 계보 그래프이며, 모든 엣지는 감사 원천 이벤트에 앵커링되어야 한다(SPEC §12 앵커링 계약).

## 2. Substrate 매핑 표

| Lineage 축 | 현행 substrate(변경이력 원천) | file:line | 계보 엔진 존재? |
|---|---|---|---|
| 변경이력 원천(공통) | SecurityAudit append-only 해시체인 기록 | `SecurityAudit.php:25-31` | ABSENT |
| 팀 권한 변경 감사 | teamAudit 변경 로그 적재 | `TeamPermissions.php:714-731` | ABSENT |
| 위임 체인 상태 | 위임 부여/축소 판정 경로 | `TeamPermissions.php:356-373` | ABSENT |
| 위계 파생 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| 계보 그래프화(evolution) | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **Read-only 앵커링**: 모든 lineage 엣지는 `SecurityAudit.php:25-31`의 append-only 기록 또는 `TeamPermissions.php:714-731` teamAudit 항목을 원천 앵커로 참조하며, 신규 쓰기 경로를 만들지 않는다. Lineage 엔진은 감사 원천을 **소비만** 한다.
2. **세대 순서 보존**: Policy/Role/Permission 세대 엣지는 감사 원천의 순서·해시체인 순서를 위반하지 않는다(무후퇴 — 기존 감사 기록을 재해석하되 개작하지 않음).
3. **위임/위계 계보화**: 위임 체인(`TeamPermissions.php:356-373`)과 위계 파생(`UserAuth.php:186-188`)을 SOURCE로 하여 Role/Permission Evolution 엣지를 도출하되, 두 substrate는 계보를 **생산**하지 않으므로 계보 노드 구성은 순신설이다.
4. **Explainable lineage**: 각 계보 경로는 근거 감사 이벤트를 인용해야 하며, 근거 없는 세대 연결을 금지한다(V4 Explainable AI 원칙 정합).

## 4. KEEP_SEPARATE

- **데이터 lineage ≠ authz policy lineage**: 데이터 파이프라인 계보(`DataPlatform.php:313-345`, 진입점 `DataPlatform.php:281`)는 데이터셋·자산 변천을 추적하는 별도 도메인이다. 본 §12 엔진은 인가 정책 계보이며, 두 계보 그래프를 통합·혼용하지 않는다(중복 엔진 금지 원칙과 별개로 도메인 분리 유지).
- 마케팅 attribution(`AttributionEngine.php:242`)·PM DAG(`PM/Gantt.php:20`)·GraphScore(`GraphScore.php:12-30`)는 각각 귀속/일정/그래프 스코어 도메인으로 authz lineage와 무관 — 재사용·병합 금지.

## 5. 판정

**ABSENT (authz lineage grep 0)**. 인가 정책·권한·역할·결정·컴플라이언스 변천을 계보 그래프로 추적하는 엔진은 코드베이스에 존재하지 않는다. 변경이력 원천 substrate만 실재하며(`SecurityAudit.php:25-31`·`TeamPermissions.php:714-731`), 이를 세대 계보로 그래프화하는 계층은 **순신설**이다. 데이터 lineage(`DataPlatform.php:313-345`)와 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 KG substrate 부재).
