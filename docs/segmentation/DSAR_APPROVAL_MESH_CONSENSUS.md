# DSAR — Approval Mesh Consensus (Part 3-24 §2·§15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §15 Consensus Engine)

`APPROVAL_MESH_CONSENSUS`는 Universal Governance Mesh의 **합의 엔진(Consensus Engine)** 이다. 계약상 역할:

- 복수 authz 노드가 동일 authz 상태(정책 epoch·membership·결정 로그)에 대해 **분산 합의**에 도달하도록 한다: Majority / Weighted / Quorum 투표와, 노드 장애·비잔틴 오류를 견디는 **BFT(Byzantine Fault Tolerant)** 합의.
- 노드 간 결정 충돌 시 **Conflict Arbitration**(중재)으로 단일 정본 상태를 확정한다.
- 목표는 "노드가 여럿이어도 authz 상태는 하나"라는 **replicated state machine** 불변식이다.

★ 여기서 계약상 consensus는 **기계 노드 간 분산 합의**이며, 인간 승인자 사이의 maker-checker 정족수와는 층위가 다르다(아래 §2 판정 유의).

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 인간 maker-checker 승인 정족수(M-of-N) | 존재 | **PARTIAL** | `Alerting.php:644-650`(승인 정족수 게이트)·`:642` |
| 승인 임계값(required_approvals=2) | 존재 | **PARTIAL** | `Db.php:634`(required_approvals 기본 2) |
| 자기승인 차단(self-approval 방지) | 존재 | **PARTIAL** | `Mapping.php:269`·`:267`·`:287`(승인 기록·중복 차단) |
| 분산 노드 투표(Majority/Weighted/Quorum) | 없음 | **ABSENT** | grep 0 — 단일프로세스 승인 |
| BFT / leader election / replicated SM | 없음 | **ABSENT** | 분산 합의 프로토콜·복수 노드 부재 |
| 노드 간 Conflict Arbitration | 없음 | **ABSENT** | 노드 충돌 대상 자체 부재 |

라이브에 실재하는 "합의 유사물"은 **인간 승인자 정족수**뿐이다. `Alerting.php:644-650`은 M-of-N 승인 게이트를 강제하고, `Db.php:634`는 `required_approvals=2` 임계값을, `Mapping.php:269`·`:287`은 승인 기록·자기승인 차단을 담당한다. 이는 **단일 서버 안의 워크플로 승인**이며, 노드 장애를 견디는 분산 합의(BFT)·leader election·replicated state machine이 아니다. approval quorum과 distributed consensus는 **명백히 다른 층위**다.

## 3. 설계 계약 (규칙)

- **R1 (정족수 무결)**: 승인 정족수는 서로 다른 주체 M명을 요구하며, 자기승인·중복승인은 무효. 기존 maker-checker 계약(`Alerting.php:644-650`·`Mapping.php:269`·`:287`)을 확장하며 병렬 승인엔진 신설 금지.
- **R2 (분산 합의 불변식)**: 복수 노드 도입 시 authz 상태는 replicated state machine 하나로 수렴해야 하며, 노드가 자체 epoch를 확정할 수 없다(§Registry R1과 정합).
- **R3 (Fail-closed 중재)**: 합의 미달·중재 실패 시 deny-by-default. 미합의 상태를 "승인"으로 승격 금지.
- **R4 (테넌트 격리)**: 정족수·합의 계산은 테넌트 경계 내에서 수행되며, 공용 스코프는 `__shared__` 명시 표기로만 읽는다.
- **R5 (중복 엔진 금지)**: 인간 정족수는 기존 승인 게이트를 확장하고, 분산 합의는 별도 신설하되 승인 워크플로와 개념 분리를 유지한다.

## 4. KEEP_SEPARATE

- **ML ensemble 동의도**: `AttributionEngine.php:1560`·`:1575`의 앙상블/모델 동의는 **예측 모델 간 합의도(ensemble agreement)** 이지 분산 authz consensus가 아니다 — 별개 도메인, 절대 병합 금지.
- **모델 모니터링**: `ModelMonitor.php:18-19`·`:42`의 모델 상태 합의/드리프트 판정 역시 데이터·ML 층위이며 authz consensus와 무관 — KEEP_SEPARATE.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_CONSENSUS`는 **PARTIAL** — 인간 maker-checker approval quorum(`Alerting.php:644-650`·`Db.php:634`·`Mapping.php:269`·`:287`)은 실재하나 이는 **단일 서버 워크플로 승인**이다. 분산 BFT·replicated state machine·leader election·노드 간 Conflict Arbitration은 **순신설(greenfield)** 대상이며, approval quorum을 distributed consensus로 오판 금지. ML consensus(`AttributionEngine.php:1560`)는 KEEP_SEPARATE. 코드 변경 0 · 선행(복수 노드 substrate) 부재로 **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
