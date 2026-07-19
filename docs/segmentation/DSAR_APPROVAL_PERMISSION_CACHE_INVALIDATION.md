# DSAR — Permission Cache Invalidation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 캐시 계층 자체가 순신규·선행 Registry/Version/Snapshot 필요)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

[`Permission Cache`](DSAR_APPROVAL_PERMISSION_CACHE.md) 엔트리를 **관련 상태 변경 즉시** 무효화하여, Revocation·Deny·Suspension이 캐시로 인해 지연 반영되지 않도록 한다. ★**Revocation 즉시반영은 이번 289차 세션 P5 세션 무효화 패턴(세션 at-rest 해시·replay 차단·session_generation)과 정합** — 권한 취소가 TTL 만료를 기다리지 않고 다음 요청부터 유효.

**원칙**: TTL은 보조 안전망일 뿐이며, 아래 Trigger 중 하나라도 발생하면 관련 Cache Key(또는 세대 전체)를 **즉시** INVALIDATED 처리한다. 지연 무효화는 stale Allow를 서빙하므로 금지.

## ② Canonical 필드 (Invalidation Event)

| 필드 | 설명 |
|---|---|
| `event_id` | 무효화 이벤트 식별자 |
| `tenant_id` | 대상 테넌트(격리 파티션) |
| `trigger_type` | 아래 ③ 열거형 |
| `scope_selector` | 무효화 범위(single key / subject / permission / group / tenant-wide) |
| `affected_key_digest` | 대상 Cache Key 다이제스트(또는 세대 지시자) |
| `bump_generation` | true 시 `generation` 카운터 증분(O(1) 대량 무효화) |
| `source_change_id` | 유발한 Grant/Deny/Definition 변경 레코드 FK |
| `occurred_at` | 발생 시각 |
| `propagation_state` | PENDING / PROPAGATED (다중 노드 전파 완료) |

## ③ 열거형 — 즉시 Invalidation Trigger

**Permission Definition 축**
- `PERMISSION_DEFINITION_CHANGED`
- `PERMISSION_SUSPENDED`
- `PERMISSION_DEPRECATED`
- `PERMISSION_RETIRED`

**Grant 축**
- `GRANT_CREATED` / `GRANT_CHANGED` / `GRANT_SUSPENDED` / `GRANT_REVOKED` / `GRANT_EXPIRED`

**Deny 축**
- `DENY_CREATED` / `DENY_CHANGED` / `DENY_REMOVED`

**구조 버전 축**
- `GROUP_VERSION_CHANGED` / `BUNDLE_VERSION_CHANGED` / `HIERARCHY_VERSION_CHANGED`
- `DEPENDENCY_CHANGED` / `EXCLUSION_CHANGED` / `IMPLICATION_CHANGED` / `SCOPE_CHANGED`

**주체/역할 축**
- `ROLE_ASSIGNMENT_CHANGED` / `DELEGATION_CHANGED`
- `SUBJECT_DISABLED`
- `SESSION_REVOKED` (★P5 세션 무효화와 직접 정합)
- `CLIENT_DISABLED`

**리소스/조직 축**
- `RESOURCE_VERSION_CHANGED`
- `ORG_HIERARCHY_CHANGED`

**긴급 축**
- `KILL_SWITCH` (전 테넌트/전역 즉시 폐기)
- `TAMPER` (해시체인 tamper 탐지 시 방어적 전량 무효화)

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Trigger | substrate | §92 태그 | 근거 |
|---|---|---|---|
| `GRANT_CREATED/CHANGED` | acl_permission INSERT(replacePerms) | Grant EXISTS | `TeamPermissions:325` |
| `GRANT_REVOKED` | putMemberPermissions 재기록/clamp | 위임상한 fail-closed | `:628-647`·`:396-402` |
| `DENY_CREATED/CHANGED/REMOVED` | `1=0` 센티넬(first-class deny 부재) | Deny PARTIAL | `:290,303` |
| `SESSION_REVOKED` | 세션 at-rest 해시·replay 차단 | CANONICAL(Actor Identity P5) | ADR §D-2 부수 P5 |
| `SUBJECT_DISABLED` | app_user 상태 / team_role | roleOf fail-closed | `:120-131` |
| `ROLE_ASSIGNMENT_CHANGED` | reclampTeamMembers | 위임 재클램프 | `:779-800` |
| `PERMISSION_*` / `GROUP/BUNDLE/HIERARCHY_VERSION` | — | **ABSENT** (Definition/Version/Group/Bundle 부재) | Version=ABSENT |
| `RESOURCE_VERSION_CHANGED` | — | **ABSENT** (Resource Version Registry 부재) | ABSENT |
| `ORG_HIERARCHY_CHANGED` | — | **ABSENT** (Org Hierarchy 정형모델 부재) | ABSENT |
| `KILL_SWITCH`/`TAMPER` | (개념) 해시체인 tamper 탐지 03-02 | 연계점 | ADR 선행블록 03-02 |
| Invalidation 파이프라인 전체 | — | **ABSENT** (캐시 미존재) | 순신규 |

## ⑤ 설계 원칙

- **즉시 우선(Immediate over Lazy)**: 상태 변경 트랜잭션 커밋과 무효화를 동일 경계에서 처리(변경은 되고 캐시는 남는 창 금지).
- **Fail-closed on doubt**: 무효화 전파 실패·불확실 시 해당 세대 전체 폐기(과무효화가 stale Allow보다 안전).
- **Revocation 즉시반영**: `GRANT_REVOKED`·`SESSION_REVOKED`·`DENY_CREATED`는 다음 요청부터 유효(P5 세션 무효화 패턴 재사용).
- **Generation bump 우선순위**: 광범위 변경(Definition/Registry/Hierarchy/Kill Switch)은 개별 키 스캔 대신 `generation` 증분으로 O(1) 무효화.
- **Tenant 격리**: 무효화는 항상 `tenant_id` 파티션 내에서(Kill Switch 전역은 명시적 관리자 통제).
- **Permission ≠ Role ≠ Authority**: Role 부여 변경(`ROLE_ASSIGNMENT_CHANGED`)과 Permission 정의 변경(`PERMISSION_DEFINITION_CHANGED`)은 별개 Trigger로 분리(합치지 않음).

## ⑥ Gap

- 무효화 파이프라인 순신규 — 캐시 계층([`CACHE`](DSAR_APPROVAL_PERMISSION_CACHE.md))이 ABSENT이므로 무효화도 착지점 없음(BLOCKED_PREREQUISITE).
- Definition/Version/Group/Bundle/Hierarchy/Resource-Version 트리거의 substrate가 ABSENT — 이 트리거들은 선행 Registry/Version 신설 후에만 발화 가능.
- Deny는 현재 `1=0` 센티넬(PARTIAL) — first-class Deny Entity 신설 전까지 `DENY_*` 트리거는 근사치.
- 다중 노드/프로세스 전파(propagation_state)는 인프라 결정 필요 — 별도 승인세션(RP-002).
