# DSAR — Permission Revalidation Foundation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — Resolution Result 영속체·Version substrate 부재)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

원 결정([`DRIFT`](DSAR_APPROVAL_PERMISSION_DRIFT_FOUNDATION.md)로 stale 판정된 것 포함)을 **커밋/집행 직전·상태변경 시점에 재평가**하여 현재 유효한 Permission Resolution 결과를 다시 산출한다. ★**기존 Resolution Result는 수정하지 않고, 새 Result를 생성한 뒤 원 결정에 연결**한다(감사 추적 불변·append-only). 재검증 결과가 원 결정보다 권한이 축소·거부되면 집행을 막는다.

**순신규 근거**: effectiveForUser(`:366`)는 온디맨드 재계산은 하나 **결과를 영속화하지 않음**(EXISTS(계산·미영속)) — "원 Result 보존 + 새 Result 연결" 체계 부재.

## ② Canonical 필드 (Revalidation Record)

| 필드 | 설명 |
|---|---|
| `revalidation_id` | 재검증 레코드 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `decision_id` | 재검증 대상 원 결정 FK |
| `original_result_id` | 원 Resolution Result FK(불변·수정 금지) |
| `new_result_id` | **신규 생성** Resolution Result FK |
| `trigger` | 아래 ③ 열거형 |
| `outcome` | UNCHANGED / NARROWED / DENIED / EXPANDED_FLAGGED |
| `commit_allowed` | 재검증 후 집행 허용 여부(bool) |
| `diff_digest` | 원↔신 결과 차이 다이제스트 |
| `revalidated_at` | 재검증 시각 |
| `linked_by` | 연결 주체(actor/system) |

## ③ 열거형 — Revalidation Trigger

- `COMMIT` (집행/커밋 직전 강제 재검증)
- `PERMISSION_EXPIRED`
- `PERMISSION_VERSION_CHANGED`
- `GRANT_CHANGED` / `DENY_CHANGED`
- `GROUP_CHANGED` / `BUNDLE_CHANGED` / `HIERARCHY_CHANGED`
- `RESOURCE_VERSION_CHANGED`
- `ACTOR_CHANGED` / `SESSION_CHANGED` / `CLIENT_CHANGED`
- `ORG_HIERARCHY_CHANGED`
- `MANUAL` (관리자 수동 재검증)
- `INCIDENT` (보안 사고 대응 일괄 재검증)
- `KILL_SWITCH`

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Trigger/필드 | substrate | §92 태그 | 근거 |
|---|---|---|---|
| 재평가 계산 엔진 | effectiveForUser·effectiveScope | EXISTS(계산·미영속) | `:366`·`:236-265` |
| `COMMIT` 게이트(PEP) | index.php 중앙 RBAC write 게이트 | CANONICAL(PEP) | `index.php:590-596` |
| `GRANT_CHANGED` | acl_permission replacePerms | Grant EXISTS | `:325` |
| `DENY_CHANGED` | `1=0` 센티넬 | Deny PARTIAL | `:290,303` |
| `ACTOR_CHANGED`/`SESSION_CHANGED` | 세션 at-rest 해시(P5)·roleOf | CANONICAL(Actor Identity) | `:120-131`·ADR §D-2 P5 |
| `CLIENT_CHANGED` | api_key scopes | CANONICAL(프로그래매틱) | `Keys.php:191,204` |
| `original_result_id`/`new_result_id` 영속 | — | **ABSENT** (Result 영속체 부재) | 순신규 |
| `PERMISSION_VERSION_CHANGED`/`GROUP/BUNDLE/HIERARCHY_CHANGED` | — | **ABSENT** (Version/Group/Bundle/Hierarchy 부재) | ABSENT |
| `RESOURCE_VERSION_CHANGED`/`ORG_HIERARCHY_CHANGED` | — | **ABSENT** | ABSENT |
| `PERMISSION_EXPIRED` | — | **ABSENT** (만료 필드 부재) | ABSENT |

## ⑤ 설계 원칙

- **원 Result 불변 · 새 Result 생성**: 재검증은 절대 원 Resolution Result를 in-place 수정하지 않음. 새 Result를 만들고 `new_result_id`로 연결(감사 추적·시점 재구성 가능).
- **Commit-time 강제**: 모든 상태변경 집행은 `COMMIT` 트리거로 직전 재검증 통과 필수(Drift 있으면 차단).
- **축소·거부 방향 우선 반영**: 재검증에서 권한이 줄면 즉시 `commit_allowed=false`. 확장 방향은 `EXPANDED_FLAGGED`로 수동검토(자동 권한 확장 금지).
- **Fail-closed**: 재검증 불가·불확실 시 Deny로 귀결.
- **Revocation 즉시반영**: Grant/Session 취소는 다음 `COMMIT` 재검증에서 즉시 DENIED(캐시 무효화와 정합).
- **Permission ≠ Role ≠ Authority**: 재검증은 Permission Resolution만 재산출. Authority(금액/한도) 재검증은 Part 5 연결 Contract.

## ⑥ Gap

- Resolution Result 영속체가 ABSENT — "원 보존 + 새 생성 연결"의 저장 대상이 없음(BLOCKED_PREREQUISITE).
- Version/Group/Bundle/Hierarchy/Resource-Version/Expiration 트리거는 순신규 substrate 위에서만 발화.
- `COMMIT` 재검증은 Part 1 Authorization Decision/Snapshot 실 저장체 + Decision Core 결합이 선행.
- 실 구현 = 선행 신설 후 별도 승인세션(RP-002).
