# DSAR — Authorization Mesh Revalidation (Part 3-24 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_MESH_REVALIDATION(§23)은 메시 위상·정책이 변할 때 영향 받는 노드/리전의 유효 권한을 **재검증(revalidate)** 하여 이탈을 조기 차단하는 계약이다. 재검증은 상태 변화 트리거에 의해 촉발된다.

- **Node Join** — 신규 노드 가입 시 해당 노드의 정책 스냅샷을 baseline 대비 검증.
- **Node Leave** — 노드 탈퇴 시 잔여 메시의 유효 권한 재계산.
- **Policy Update** — 정책 규칙 변경 시 영향 노드 전수 재검증.
- **Region Update** — 리전 구성 변경 시 리전 집계 상태 재검증.
- **Federation Update** — 페더레이션 신뢰 관계 변경 시 상호 신뢰 경계 재검증.

재검증 결과는 통과/경고/차단(Fail-closed)으로 분류하며, 미확정(Unknown) 상태는 통과로 간주하지 않는다.

## 2. Substrate 매핑

| 트리거 | 요구 substrate | 현행 실재 | 판정 |
|---|---|---|---|
| Node Join/Leave/Region Update | 노드 레지스트리·위상 이벤트 | 부재(grep 0) | ABSENT-greenfield |
| Policy Update 이벤트 | 정책 변경 이벤트/미러 저장 | AdminPlans 플랜 미러 저장 `AdminPlans.php:157`·`:180`·`:209` = 변경 이벤트 proto **참고만** | proto 참고 |
| Federation Update | 페더레이션 신뢰 관계 | 부재 | ABSENT-greenfield |

## 3. 설계 계약 (greenfield)

- 재검증 엔진은 트리거 이벤트를 수신해 영향 노드 집합을 산출하고 각 노드의 유효 권한을 baseline 대비 순수 비교하는 것으로 설계한다. 실 배선은 후속 승인 세션.
- Policy Update 트리거의 이벤트 형상은 `AdminPlans.php:157`·`:180`·`:209`의 플랜 변경 미러 저장 흐름을 **개념 참고**로만 삼는다 — 해당 코드는 플랜 도메인 저장이지 메시 재검증이 아니므로 재사용·확장 대상이 아니다.
- Fail-closed 원칙: 재검증이 Unknown/미확정이면 통과 아님. 유효 권한을 축소(deny) 방향으로 처리한다.

## 4. KEEP_SEPARATE

- `AdminPlans.php:157`·`:180`·`:209`의 플랜 미러 저장은 구독/플랜 도메인이다. 변경 이벤트 형상 참고를 넘어 재검증 로직을 이 핸들러에 얹지 않는다 — 도메인 혼입 금지.
- 정책 변경 감사 기록이 필요하면 별도 감사 해시체인을 확장하되, 플랜 저장 경로와는 분리 유지.

## 5. 판정

**ABSENT-greenfield.** Mesh revalidation 코드·트리거·노드 레지스트리 전무(grep 0). 순신설이며 코드 변경 0·NOT_CERTIFIED. Policy Update 이벤트만 `AdminPlans.php:157`·`:180`·`:209`를 형상 proto로 참고(재사용 아님). §22 Drift 감지 결과를 소비하고 §24 Reconciliation에 선행. 실 구현은 선행 Mesh Foundation 이후 별도 승인 세션.
