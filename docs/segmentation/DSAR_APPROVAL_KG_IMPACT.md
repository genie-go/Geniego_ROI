# DSAR — Authorization Knowledge Graph Impact Analysis (Part 3-21 §13)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §13)

APPROVAL_GRAPH_IMPACT는 인가 지식그래프에서 **제안된 변경(change proposal)이 그래프 하류로 파급하는 영향 범위를 사전 산출**하는 읽기전용 영향분석 엔진이다. 계약 대상 5개 impact 축:

- **Policy Change Impact** — 정책 노드 수정 시 영향받는 하류 권한·역할·사용자 집합.
- **Permission Removal Impact** — 특정 권한 제거 시 접근이 끊기는 주체·기능 집합.
- **Role Merge Impact** — 역할 병합 시 유효 권한 확대/축소의 델타.
- **Compliance Impact** — 변경이 컴플라이언스 상태에 미치는 전이 위험.
- **Runtime Impact** — 변경이 런타임 인가 판정 경로에 미치는 파급.

Impact 엔진은 **가정적(what-if) 평가만 수행**하며 실제 인가 상태를 변경하지 않는다(dry-run only). 출력은 영향 노드 집합과 델타이며, 모든 영향 주장은 그래프 역방향 순회(reverse traversal)로 도출되어야 한다.

## 2. Substrate 매핑 표

| Impact 축 | 현행 substrate(영향 판정 근거) | file:line | 영향분석 엔진 존재? |
|---|---|---|---|
| 유효권한 해석(역방향 SOURCE) | effectiveForUser 유효권한 계산 | `TeamPermissions.php:393-421` | ABSENT |
| 유효권한 병합/집계 | 권한 집합 결합 경로 | `TeamPermissions.php:423-429` | ABSENT |
| 위임 상한 clamp | clampActions 액션 상한 | `TeamPermissions.php:194-198` | ABSENT |
| 위계 파생 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| 영향 그래프 순회(what-if) | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **역방향 순회 SOURCE**: Policy/Permission/Role 영향은 `TeamPermissions.php:393-421` effectiveForUser의 **역방향** — 즉 "이 권한/역할이 사라지면 누구의 유효권한이 바뀌는가"를 역추적하여 도출한다. effectiveForUser는 정방향 해석기이므로 역방향 영향 그래프는 순신설이다.
2. **Dry-run 불변식**: Impact 평가는 어떤 실제 부여·회수도 유발하지 않는다. `TeamPermissions.php:194-198` clampActions의 상한 로직을 what-if 상한 계산에 참조하되, 실제 clamp를 실행하지 않는다.
3. **델타 정합**: Role Merge Impact의 유효권한 델타는 `TeamPermissions.php:423-429` 병합 경로 의미론과 일치해야 하며, 병합 결과가 기존 유효권한을 후퇴시키지 않는지 사전 검출한다.
4. **Explainable impact**: 각 영향 주장은 영향받는 주체·근거 엣지를 인용해야 하며 근거 없는 파급 추정을 금지한다.

## 4. KEEP_SEPARATE

- **PM DAG(`PM/Gantt.php:20`)** — 일정 의존 파급과 인가 영향은 별개 도메인. 간트 임계경로 영향을 authz impact로 재사용 금지.
- **마케팅 attribution(`AttributionEngine.php:242`)** — 채널 기여 영향과 무관.
- **데이터 lineage(`DataPlatform.php:313-345`)**·**GraphScore(`GraphScore.php:12-30`)** — 데이터/그래프 스코어 영향 도메인으로 분리 유지.

## 5. 판정

**ABSENT (impact analysis grep 0)**. 인가 변경의 하류 파급을 what-if로 산출하는 영향분석 엔진은 존재하지 않는다. SOURCE는 정방향 유효권한 해석기 effectiveForUser(`TeamPermissions.php:393-421`)이며, 이를 역방향 영향 순회로 전환하는 계층은 **순신설**이다. clampActions(`TeamPermissions.php:194-198`)는 상한 근거로만 참조. PM DAG(`PM/Gantt.php:20`)와 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
