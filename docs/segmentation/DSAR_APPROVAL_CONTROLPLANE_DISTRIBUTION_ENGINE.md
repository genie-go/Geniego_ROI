# DSAR — Configuration Distribution Engine (Part 3-19 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §6)
`Configuration Distribution Engine`은 승인 정책 설정(authz config)을 결정 노드로 **안전 전파**하는 계층으로 다음을 계약한다.
- **Versioned Config**: 정책 설정은 단조 증가 버전으로만 갱신되고 롤백 가능.
- **Canary Rollout**: 신 버전은 일부 대상(canary)에 먼저 적용 후 확대.
- **Staged Propagation**: 단계별(ring) 확산으로 폭발반경 제한.
- **Ack & Convergence**: 각 노드의 수신 확인(ack) 집계 후에만 완결(converged) 선언.
- **Rollback on Regression**: 회귀 감지 시 직전 버전으로 자동 복귀.

## 2. Substrate 매핑 (현행 → 계약)
| SPEC 능력 | 현행 substrate | 상태 |
|---|---|---|
| config 분배 proto | `AdminPlans.php:53-72` product config 미러 | ABSENT-authz |
| 조회/발행 경로 | `AdminPlans.php:157`·`:180`·`:209`(product plan CRUD) | product only |
| 발행 게이트 | `AdminPlans.php:539`·`:717`(관리 경로) | authz canary 아님 |
| 공개 경로 | `index.php:69-88` 공개 bypass 목록(정적 라우팅) | 버전 분배 아님 |
| 변경 근거 | `SecurityAudit.php:14-64` append-only(수동 이벤트) | version/ack 없음 |

## 3. 설계 계약 (신설, 코드 0)
- **Config Version Ledger**: `{config_id, version, checksum, author, published_epoch}` 논리 테이블. `AdminPlans.php:53-72` 미러 패턴을 **참조 원형**으로만 삼되 authz 스키마로 순신설.
- **Canary Ring**: `{ring_0(canary)…ring_N}` 대상 집합. version은 ring 순서로만 확산 — ring skip 금지.
- **Ack Convergence**: 각 노드 ack를 `SecurityAudit.php:14-64` 이벤트로 집계, 정족수 ack 전에는 CONVERGED 미선언(fail-closed).
- **Regression Auto-Rollback**: canary ring에서 결정 오류율 상회 시 직전 version으로 자동 복귀·감사 기록.
- **Immutability**: 발행된 version은 불변 — in-place 수정 금지, 새 version만 허용.

## 4. KEEP_SEPARATE (혼입 금지)
- `AdminPlans.php:53-72`·`:157`·`:180`·`:209`·`:539`·`:717` = **product plan config**. authz 정책 분배와 명명·스키마 분리 — canary/staged/ack/version 부재이므로 그대로 재사용 금지(참조 원형만).
- `index.php:69-88` 공개 bypass 목록 = 정적 라우팅 정책이지 버전 분배 substrate 아님.
- product config 미러를 authz 분배로 승격하면 중복 엔진 — 금지.

## 5. 판정
**ABSENT-authz (순신설)**. 현행 config 분배 원형은 `AdminPlans.php:53-72`(조회 `:157`·발행 `:180`·`:209`·관리 `:539`·`:717`)의 **product plan 미러**뿐으로, canary·staged·ack·version·rollback이 전무하다. `index.php:69-88`은 정적 bypass 목록이며 버전 분배가 아니다. 본 엔진은 Config Version Ledger·Canary Ring·Ack Convergence·Auto-Rollback을 **순신설**하되, AdminPlans 미러는 참조 원형으로만 삼고 authz 스키마로 분리한다. 변경은 `SecurityAudit.php:14-64` append-only로 감사한다. BLOCKED_PREREQUISITE — Cluster Coordinator(노드 ack)·Scheduler(staged tick) 부재로 착수 불가. NOT_CERTIFIED.
