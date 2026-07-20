# DSAR — Authorization Knowledge Graph Simulation (Part 3-21 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §22)

APPROVAL_GRAPH_SIMULATION은 인가 지식그래프 위에서 **가상 변경(what-if)을 적용해도 실제 인가 상태를 변경하지 않고 예상 효과를 산출**하는 읽기전용 시뮬레이션 계약이다. 계약 대상 4개 시뮬레이션 시나리오:

- **Role Merge Simulation** — 두 역할 병합 시 유효권한 합집합/충돌 예측.
- **Policy Change Simulation** — 정책 규칙 변경이 파생 결정에 미칠 파급 예측.
- **Permission Removal Simulation** — 권한 회수 시 고아 결정·접근 단절 예측.
- **Trust Relationship Update Simulation** — 신뢰 관계(위임/위계) 갱신의 전파 효과 예측.

각 시나리오는 4개 예상 지표를 산출한다: **Connectivity**(그래프 연결성 변화)·**Compliance**(컴플라이언스 상태 전이)·**Runtime**(런타임 판정 경로 영향)·**Decision Accuracy**(결정 정확도 편차). 시뮬레이션은 **side-effect 0**이며 어떤 인가/저장 상태도 커밋하지 않는다(SPEC §22 격리 계약).

## 2. Substrate 매핑 표

| 시뮬레이션 요소 | 현행 substrate(판정 SOURCE) | file:line | 시뮬 엔진 존재? |
|---|---|---|---|
| 유효권한 what-if 원천 | effectiveForUser 유효권한 해석 | `TeamPermissions.php:393-421` | ABSENT |
| 위계/신뢰 전파 원천 | 역할 위계 해석 | `UserAuth.php:186-188` | ABSENT |
| 정책 변경 감사 앵커 | 권한 변경 판정 경로 | `TeamPermissions.php:599-621` | ABSENT |
| 격리 실행 앵커(무커밋) | append-only 해시체인(참조만) | `SecurityAudit.php:25-31` | ABSENT |
| 그래프 시뮬레이션화 | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **격리(무커밋) 실행**: Role Merge/Policy Change/Permission Removal/Trust Update 시뮬레이션은 `TeamPermissions.php:393-421` 유효권한 해석을 **읽기 복제본**으로 실행하며, 실제 권한 테이블·감사 체인에 어떤 쓰기도 발생시키지 않는다(side-effect 0).
2. **SOURCE 재사용(중복 엔진 금지)**: what-if 판정은 유효권한 SOURCE(`TeamPermissions.php:393-421`)와 위계 파생(`UserAuth.php:186-188`)을 재사용하여 산출하며, 병렬 판정 엔진을 신설하지 않는다. 시뮬레이션 계층만 순신설이다.
3. **예상 지표 근거화**: Connectivity/Compliance/Runtime/Decision Accuracy 4지표는 각각 근거 노드·근거 판정 경로를 인용해야 하며(V4 Explainable), 근거 없는 예측 수치를 금지한다.
4. **무후퇴**: 시뮬레이션 결과는 권고(advisory)일 뿐 자동 집행하지 않으며, 실제 변경은 별도 승인 정책(사용자 승인)을 경유한다.

## 4. KEEP_SEPARATE

- **authz 시뮬레이션 ≠ 마케팅 시나리오 시뮬레이션**: 마케팅 귀속 시나리오(`AttributionEngine.php:242`)·마케팅 그래프 스코어(`GraphScore.php:12-30`)는 예산·전환 what-if 도메인으로 인가 권한 시뮬레이션과 무관 — 재사용·병합 금지.
- 데이터 파이프라인 시뮬레이션(`DataPlatform.php:313-345`)은 데이터셋 도메인이며 authz 시뮬 계층과 통합하지 않는다.

## 5. 판정

**ABSENT (authz graph 시뮬레이션 전무)**. 역할 병합·정책 변경·권한 회수·신뢰 갱신을 격리 실행해 예상 효과를 산출하는 그래프 시뮬레이션 엔진은 존재하지 않는다. what-if의 SOURCE는 유효권한 해석(`TeamPermissions.php:393-421`)·위계(`UserAuth.php:186-188`)뿐이며, 이를 무커밋 격리 시뮬레이션으로 감싸는 계층은 **순신설**이다. 마케팅(`AttributionEngine.php:242`·`GraphScore.php:12-30`)·데이터(`DataPlatform.php:313-345`)와 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 KG substrate 부재).
