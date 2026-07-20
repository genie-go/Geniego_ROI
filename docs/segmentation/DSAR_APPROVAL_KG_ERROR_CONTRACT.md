# DSAR — Authorization Knowledge Graph Error Contract (Part 3-21 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §27)

권한 지식 그래프 연산이 실패했을 때 반환하는 **표준 에러코드 7종**이다. 각 코드는 발생원(호출 지점)·복구 지침·비-2xx HTTP 상태를 갖는다. 침묵 실패(가짜녹색) 금지 — 실패는 명시적 에러코드로만 표면화한다.

| # | 에러코드 | 발생 조건 | 복구 지침 |
|---|---|---|---|
| E1 | `GRAPH_BUILD_FAILED` | 그래프 구축(노드/엣지 적재) 중 무결성 실패 | 부분 커밋 롤백·재빌드 |
| E2 | `GRAPH_SCHEMA_INVALID` | 온톨로지 스키마 위반 노드/엣지 | 스키마 대조 후 정정 |
| E3 | `RELATIONSHIP_NOT_FOUND` | 조회한 (source,type,target) 관계 부재 | 존재 여부 재확인·404 계열 |
| E4 | `ONTOLOGY_CONFLICT` | 온톨로지 정의 충돌(중복 타입·모순 cardinality) | 온톨로지 SSOT 조정 |
| E5 | `GRAPH_REASONING_FAILED` | 추론 엔진 실행 실패(근거 부재·타임아웃) | 근거 경로 재확인·재시도 |
| E6 | `IMPACT_ANALYSIS_FAILED` | 영향도 분석(변경 파급) 산출 실패 | 대상 노드 범위 축소·재실행 |
| E7 | `LINEAGE_NOT_AVAILABLE` | 계보(lineage) 추적 데이터 미확보 | 감사 이력 백필 후 재조회 |

## 2. Substrate 매핑 (현행 실측)

| 에러코드 | 현행 발생원 | 등급 |
|---|---|---|
| E1~E7 (7종 전부) | 권한 KG 연산 자체가 부재 → 발생원 0 | `ABSENT` |
| (참고) 무결성 실패 표면화 관례 | append-only 검증 실패 신호 원천 `SecurityAudit.php:63-64`(verify) — E3/E7이 참조할 이력 원천 | `PARTIAL`(원천 존재·KG 미연결) |
| (참고) 스키마 위반 거부 관례 | `putTeamPermissions` 쓰기 게이트(`TeamPermissions.php:599-621`)의 거부 경로 = E2/E4 표면화 선례 | `PARTIAL` |

## 3. 설계 계약 (신설)

- **7종 에러코드 전부 순신규**다. 각 코드의 **발생원(§29 API 핸들러)**이 함께 신설되기 전에는 코드만 정의되고 던지는 지점이 없다 → BLOCKED_PREREQUISITE.
- E2/E4: 온톨로지 위반은 `putTeamPermissions`(`:599-621`)가 확립한 "게이트 거부 = 명시적 실패" 규약을 따른다 — 조용히 통과(가짜녹색) 금지.
- E3/E7: 관계·계보 부재는 `SecurityAudit`(`:63-64`) 해시체인을 lineage 원천으로 참조. 체인이 장식(verify 0)이면 E7이 상시 발생하므로, lineage는 verify 가능한 실 체인 위에서만 available 처리.
- E5/E6: 추론·영향도 실패는 근거 경로(evidence path) 부재를 최우선 사유로 코드화 — 근거 없는 성공 반환(가짜 추론) 절대 금지(Explainable AI, Volume 4).
- 모든 코드는 비-2xx로 반환. `/api` 접두 라우트에 핸들러 `$register` 배선(§29와 동반).

## 4. 판정

- **KG Error Contract = ABSENT** (7종 에러코드·발생원 grep 0).
- E2/E4·E3/E7이 참조할 거부/이력 규약(`:599-621`·`:63-64`)만 `PARTIAL`로 존재 — 에러코드가 정의된 것이 아니라 표면화 **관례**만 있다.
- 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§29 API 핸들러 = 발생원 선행 부재).
- ★가짜녹색(침묵 실패) 반복 금지 — 발생원 부재를 "에러가 안 난다"로 읽지 마라(연산 자체가 없음).
