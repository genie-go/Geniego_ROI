# DSAR — Permission Effective-Set Cache 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 실 캐시는 선행 Permission Registry/Definition/Version + Part 1 Decision Core 신설 후 별도 승인세션)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서의 GROUND_TRUTH에 한함.

---

## ① 목적

Permission Resolution 결과(Effective Allow Set·Effective Deny Set·Scope AST)를 **version-aware Cache Key**로 캐싱하여, per-request authz 결정을 반복 재계산 없이 재사용한다. 단 캐시는 **정확성이 성능에 우선**한다 — Cache Key에 tenant·모든 version 축이 포함되지 않으면 stale grant/deny를 서빙해 권한 확장(Privilege Escalation)이 되므로, 본 명세의 Key 구성은 필수 불변 통제(§6.16 Mandatory Control)다.

**순신규 근거**: 현재 `TeamPermissions::effectiveForUser`(`:366`)·`effectiveScope`(`:236-265`)는 **온디맨드 계산·미영속·미캐시**(EXISTS(계산·미영속)). 캐시 계층 자체가 ABSENT.

## ② Canonical 필드 (Cache Entry)

| 필드 | 설명 |
|---|---|
| `cache_key` | 아래 ③ 모든 축의 정규화·정렬·해시 다이제스트(SHA-256) |
| `tenant_id` | 캐시 파티션 최상위 키 (Cross-tenant 격리 절대·index.php:619 tenant 강제주입과 정합) |
| `effective_allow_set` | 결정된 Canonical Permission 집합(코드·scope·version) |
| `effective_deny_set` | Explicit Deny 우선 집합(Allow보다 우선) |
| `scope_ast_digest` | Row/Data Scope AST 정규화 다이제스트 |
| `resolution_result_id` | 산출한 Resolution Result FK (Revalidation 시 새 Result로 재연결) |
| `snapshot_digest` | 결정 시점 Permission Snapshot 다이제스트(Drift 대사 기준) |
| `computed_at` / `expires_at` | 생성·소프트 만료 시각(TTL은 보조; Invalidation Trigger가 정본) |
| `generation` | 무효화 세대 카운터(대량 무효화 시 O(1) 전체 폐기) |
| `state` | FRESH / STALE / INVALIDATED |

## ③ 열거형 — Cache Key 구성 축 (전 축 필수)

★**tenant + 모든 version + resource version 은 필수**. 하나라도 누락 시 stale 서빙 → 권한 확장.

1. `tenant_id`
2. `subject_id`
3. `effective_actor_id` (impersonation/delegation 시 실효 주체)
4. `actor_type` (user / team / member / service_account / api_client)
5. `identity_version` (Actor Identity 03-03 바인딩 버전)
6. `session_generation` (세션 무효화 세대 — P5 세션 at-rest 해시/replay 차단과 정합)
7. `registry_version` (Authorization Registry 버전)
8. `permission_id`
9. `permission_version`
10. `resource_type` / `resource_id` / `resource_version`
11. `action`
12. `legal_entity_id`
13. `org_hierarchy_version`
14. `group_version` / `bundle_version` / `hierarchy_version`
15. `grant_digest` / `deny_digest` (해당 주체 유효 grant/deny 집합 다이제스트)
16. `client_id`
17. `channel`
18. `amount_bucket` / `currency`
19. `time_bucket`
20. `context_digest` (그 외 ABAC 컨텍스트 정규화 다이제스트)

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

| Cache 축/필드 | substrate | §92 태그 | 근거 |
|---|---|---|---|
| `tenant_id` 파티션 | index.php tenant 강제주입 | CANONICAL(PEP) | `index.php:619` |
| `subject_id`/`actor_type` | acl_permission subject_type(user/team/member) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions:152-171` |
| effective set 계산원 | effectiveForUser·effectiveScope | EXISTS(계산·미영속) | `:366`·`:236-265` |
| `scope_ast_digest` | data_scope scopeSql/scopeSqlNamed | ROW/DATA_SCOPE_CANDIDATE | `:286-307` |
| `session_generation` | 세션 토큰 at-rest 해시(P5) | CANONICAL(Actor Identity) | ADR §D-2 부수 P5 |
| `permission_version`·`registry_version` | — | **ABSENT** (순신규·버전화 없음) | Version=ABSENT |
| `resource_version` | — | **ABSENT** (Resource Version Registry 부재) | ABSENT |
| `group_version`/`bundle_version`/`hierarchy_version` | — | **ABSENT** (Hierarchy/Group/Bundle 부재) | ABSENT |
| `grant_digest`/`deny_digest` | acl_permission INSERT(replacePerms) / `1=0` 센티넬 | Grant EXISTS / Deny PARTIAL | `:325` / `:290,303` |
| `snapshot_digest` | — | **ABSENT** (Permission Snapshot 부재) | Snapshot=ABSENT |
| `cache_key` 계층 전체 | — | **ABSENT** (캐시 미존재) | 순신규 |

## ⑤ 설계 원칙

- **Version-aware or nothing**: version 축 부재 시 캐싱 금지(fail-safe로 재계산). Version substrate가 ABSENT인 현 단계에서는 캐시 활성화 불가 → BLOCKED_PREREQUISITE.
- **Default Deny 유지**: 캐시 miss·불명확은 Deny로 재해석(캐시가 Allow를 발명하지 않음).
- **Explicit Deny 우선**: `effective_deny_set`은 `effective_allow_set`을 무조건 override.
- **Tenant Isolation 절대**: 캐시 파티션 키 = `tenant_id` 최상위(§6.16 Mandatory·비활성 불가).
- **UI ≠ Server**: 본 캐시는 서버측 Resolution 결과만 캐시. FE writeGuard/menu 가시성 캐시와 혼동 금지(UI_HINT_ONLY).
- **Permission ≠ Role ≠ Authority**: 캐시는 Permission Resolution 결과만 저장. Role 부여·Authority(금액/한도) 판정은 별도 축(캐시 키에 참조만).

## ⑥ Gap

- Cache 계층 전체 순신규 — Permission Registry/Definition/**Version**·Resource Version·Group/Bundle/Hierarchy Version·Snapshot Digest substrate가 모두 ABSENT이라 정확한 Cache Key를 지금 구성 불가(BLOCKED_PREREQUISITE).
- 현행 effectiveForUser는 미영속·미캐시 — 캐시 도입 전 Resolution Result 영속화(Result Entity)가 선행.
- Invalidation은 별도 문서([`DSAR_APPROVAL_PERMISSION_CACHE_INVALIDATION`](DSAR_APPROVAL_PERMISSION_CACHE_INVALIDATION.md)) — 즉시 무효화 없이 캐시 활성화 금지.
- 실 구현 = 선행 Registry/Version/Snapshot 신설 + Part 1 Decision Core + 별도 승인세션(RP-002).
