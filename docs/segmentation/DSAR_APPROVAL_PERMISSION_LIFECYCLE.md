# DSAR — Permission Lifecycle (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission Definition/Registry의 **상태 전이와 각 상태의 런타임 효력**을 정형화. 어떤 상태가 Resolution/Grant에서 유효한지, 어떤 상태가 즉시 효력을 잃는지, 어떤 이력이 삭제 금지인지를 강제한다. Lifecycle은 Definition·Registry가 공유하는 상태 축이다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `status` | 현재 Lifecycle 상태(§3) |
| `runtime_resolvable` | Resolution에서 유효 여부 |
| `grant_allowed` | 신규 Grant 허용 여부 |
| `immediate_effect_removal` | 상태 진입 시 Effective set 즉시 제거 여부 |
| `snapshot_retained` | Historical Snapshot 보존 여부(삭제 금지) |
| `transition_from` / `transition_to` | 허용 전이 |

## 3. 열거형 / 타입 + 상태별 원칙

**status**: `DRAFT` · `REVIEW` · `APPROVED` · `ACTIVE` · `SUSPENDED` · `DEPRECATED` · `RETIRED` · `ARCHIVED`.

| 상태 | 원칙 |
|---|---|
| `DRAFT` / `REVIEW` | **런타임 Resolution·Grant 금지**(미승인 정의는 효력 없음) |
| `APPROVED` | Grant 준비 완료(아직 미활성) |
| `ACTIVE` | Resolution·Grant 정상 |
| `SUSPENDED` | **즉시 Effective set에서 제거**(운영 중단·복구 가능) |
| `DEPRECATED` | **신규 Grant 금지**(기존 grant 만료까지 유효·마이그레이션 유도) |
| `RETIRED` | **Resolution 무효**(어떤 판정에도 permit 불가) |
| `ARCHIVED` | 이력 보존 종단 |
| 전 상태 | **Historical Snapshot 삭제 금지** |

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| grant 존재/제거(부분) | `acl_permission` INSERT/replace | EXISTS(상태 축 없음) | `TeamPermissions.php:325-336` |
| 폐기 사례(DEPRECATED/RETIRED 실증) | admin_roles/user_roles 289차 P3 폐기 | DEPRECATED(재플래그 금지) | GROUND_TRUTH §2 |
| 변경 이력(부분) | `auth_audit_log`(변경 기록) | Evidence PARTIAL | GROUND_TRUTH §1.1 |

★**정직**: acl_permission에는 **Lifecycle status 축이 없음**(grant 존재/부재만·즉시 반영). DRAFT/REVIEW/SUSPENDED/DEPRECATED/RETIRED/ARCHIVED 상태·`runtime_resolvable`·`immediate_effect_removal`·`snapshot_retained`·전이 규칙 = **순신규 ABSENT**. 289차 P3의 admin_roles/user_roles 폐기는 Lifecycle DEPRECATE→RETIRE의 **실제 사례**(테이블은 고아 보존)지만 정형 상태머신은 없음.

## 5. 설계 원칙 / 결정

- DRAFT/REVIEW는 런타임·Grant 절대 금지(미승인 정의 효력 차단).
- SUSPENDED는 즉시 Effective 제거(캐시 무효화 동반·Risk Control 연동).
- DEPRECATED는 신규 Grant 금지·기존 유효(마이그레이션 창), RETIRED는 Resolution 완전 무효.
- **Historical Snapshot 삭제 금지** — RETIRED/ARCHIVED여도 [`DSAR_APPROVAL_PERMISSION_DEFINITION_VERSION`](DSAR_APPROVAL_PERMISSION_DEFINITION_VERSION.md) 스냅샷 보존.
- Golden Rule: acl_permission grant 존재/부재를 상태머신으로 확장(중복 상태 store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Lifecycle 상태 축·전이 규칙·즉시 제거·스냅샷 보존 = 순신규.
- **BLOCKED_PREREQUISITE**: 즉시 Effective 제거는 version-aware Cache/Invalidation(순신규) 필요·상태 전이 이력은 Part 1 Snapshot/Evidence 실 저장체 필요 — Decision Core 신설 후 RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
