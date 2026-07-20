# DSAR — Authorization Rollback Manager (Part 3-19 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20 — APPROVAL_ROLLBACK)

Authorization Rollback Manager는 **인가 구성 변경분을 이전의 알려진-양호 상태로 되돌리는** 제어면 구성요소다. 대상은 authz 정책/룰/롤 정의의 런타임 config다. 계약 표면:

- **Automatic Rollback** — Rollout(§19) 단계 guard 위반 시 자동 되돌림(자기집행은 승인정책 범위 내).
- **Manual Rollback** — 운영자 명시 지시에 의한 되돌림.
- **Snapshot Rollback** — 특정 시점 authz 스냅샷으로 복원.
- **Version Rollback** — authz config 버전 N→N-1 되돌림(선형 이력 기반).

## 2. Substrate 매핑

| SPEC 계약 | 현행 substrate | 상태 |
|---|---|---|
| authz config version/snapshot rollback | (grep 0 — 부재) | **ABSENT** |
| schema 마이그레이션 rollback | `backend/bin/migrate.php:9-15` | PRESENT(스키마 계층) |
| DB 접속·부트스트랩(rollback 대상 아님) | `backend/src/Db.php:157-162` · `:159` | PRESENT(무관 계층) |
| 감사 체인(되돌림 기록 substrate) | `backend/src/SecurityAudit.php:14-64` · `:56` | PRESENT(재사용) |

현행 유일한 되돌림 능력은 **스키마 마이그레이션 rollback**(`migrate.php:9-15`)이다. 이는 DB DDL 이력을 되감는 것이지 **인가 구성(정책/룰/롤)의 되돌림이 아니다**. `Db.php:157-162`는 접속/부트스트랩 경로로 rollback substrate가 아니다. 따라서 authz Rollback 관점에서 현행은 **PARTIAL** — 인접(schema) 능력은 있으나 authz config 차원은 부재.

## 3. 설계 계약 (PARTIAL → authz 확장)

1. **AuthzSnapshot** — {version, capturedAt, policyDigest, roleGraphDigest}. append-only·불변. Rollout 각 단계 진입 전 자동 캡처.
2. **RollbackPlan** — {targetVersion|targetSnapshot, mode(automatic|manual|snapshot|version), reason, initiator}.
3. **Automatic 경로** — §19 guardMetrics 위반 시 직전 AuthzSnapshot으로 자동 복원. **자기집행은 승인정책 존중**(무단 전면 되돌림 금지).
4. **선형 이력** — Version Rollback은 스키마 rollback(`migrate.php:9-15`)과 **동일한 선형-이력 규율**을 authz config 차원으로 확장(별도 구현·중복 아님).
5. **감사 필수** — 모든 되돌림은 `SecurityAudit.php:14-64` 체인에 기록, `verify()`(`:56`)로 사후 검증. 물리 삭제 금지.

## 4. KEEP_SEPARATE (경계·중복 금지)

- **schema rollback ≠ authz rollback** — `migrate.php:9-15`는 DDL 되감기. authz config 되돌림을 **여기서 재구현하지 않음**(계층 분리). 규율만 차용.
- `Db.php:157-162`·`:159` — 접속/부트스트랩. rollback substrate 아님·인용 시 계층 혼동 금지.
- 죽은 terraform blue-green(`infra/aws/terraform/codedeploy_bluegreen.tf`) — 라이브 무연결·authz rollback substrate 아님. PRESENT 인용 금지.

## 5. 판정

**PARTIAL** — 현행 되돌림은 schema 차원(`migrate.php:9-15`)만 존재하며 authz config(automatic/manual/snapshot/version) rollback은 부재. `Db.php:157-162`는 무관 계층. 본 DSAR은 기존 schema-rollback 규율을 **authz config 차원으로 확장**(별도 구현·무후퇴)하는 순신설 설계. 코드 변경 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE(선행 Snapshot/Version 이력 foundation 부재).
