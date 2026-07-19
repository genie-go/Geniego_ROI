# DSAR — Permission Tenant Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

모든 Permission Grant·Scope·Resolution·Cache가 **정확히 하나의 테넌트에 귀속**됨을 강제하는 최상위 격리 축. Cross-Tenant Grant·Cross-Tenant Effective Set·Cross-Tenant Cache 재사용을 원천 차단하고, Platform Scope(테넌트 경계를 넘는 권한)는 **제한된 Platform Actor에게만** 허용한다. 이 축은 멀티테넌트 SaaS의 절대 불변식(Mandatory Control·비활성 불가)이다. 신설이 아니라 실존 **`index.php` tenant 강제주입**(격리 정본)과 `acl_permission.tenant_id`를 Permission Scope 어휘로 정규화한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `tenant_id` | 귀속 테넌트(모든 Grant/Scope/Cache 필수·NULL 금지) |
| `is_platform_scope` | Boolean(테넌트 경계 초월 권한·기본 false) |
| `platform_actor_ref` | Platform Scope 허용 시 검증된 Platform Actor 참조 |
| `cross_tenant_prohibited` | Boolean(항상 true·비활성 불가·Mandatory Control) |
| `cache_key_tenant_bound` | Boolean(Cache Key에 tenant 포함 강제·항상 true) |
| `resolved_tenant_source` | 테넌트 해석 출처(요청 컨텍스트 강제주입/토큰/act-as) |
| `digest` | Tenant Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**tenant scope kind**: `SINGLE_TENANT`(기본·거의 전부) · `PLATFORM`(제한 Platform Actor 전용) · `PROHIBITED_CROSS_TENANT`(명시 차단 표식).
**resolved_tenant_source**: `REQUEST_INJECTED` · `TOKEN_CLAIM` · `ACT_AS_DELEGATED`(승인된 대행만).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Cross-tenant 격리 정본(PEP) | index.php 중앙 RBAC tenant **강제주입** | CANONICAL(격리 정본) | `index.php:619` |
| Grant tenant 귀속 | `acl_permission.tenant_id`(테이블 컬럼) | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions.php:152-159`(MySQL)·`:169-170`(SQLite) |
| data_scope tenant 경계 | `data_scope` 행필터가 tenant 컨텍스트 하에서 산출 | 부분 substrate | `TeamPermissions.php:160-166`·`:236-265` |
| Team membership tenant 귀속 | `team`·`app_user.team_id` | 부분 substrate | `TeamPermissions.php:145-151`·`:175` |
| `is_platform_scope`·`platform_actor_ref`·`cache_key_tenant_bound`·명시 Cross-Tenant 차단 표식·`digest` | — | **ABSENT(순신규)** | Platform Scope 정형 엔티티·tenant-bound cache 강제 부재 |

★핵심: **격리는 이미 실 enforce**된다(`index.php:619` tenant 강제주입 = 정본). 부재는 (a) Platform Scope를 first-class 엔티티로 선언·제한, (b) Cache Key에 tenant 포함을 스키마로 강제, (c) Cross-Tenant 차단을 명시 표식화하는 부분이다.

## 5. 설계 원칙 / 결정

- **Default Single-Tenant**: 모든 Grant는 기본적으로 자기 테넌트에만 유효. Platform Scope는 예외이며 검증된 Platform Actor로만 발급.
- **Cache는 tenant-bound**: Effective Permission Set/Deny Set 캐시 키에 `tenant_id`를 반드시 포함 — 서로 다른 테넌트가 캐시를 공유할 수 없다(비활성 불가).
- **act-as는 승인 경로만**: `ACT_AS_DELEGATED` 테넌트 해석은 승인된 대행 컨텍스트에서만 허용(무단 tenant 하이재킹 금지 — platform_growth act-as 트랩 교훈).
- **정직**: 하드코딩 email/user-id 기반 tenant 우회는 레포 전무(GROUND_TRUTH §4) — 결함으로 날조 금지.
- Golden Rule: 중복 tenant 해석기 신설 금지 — `index.php:619` 강제주입 확장.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: `is_platform_scope`/`platform_actor_ref`/`cache_key_tenant_bound`/명시 Cross-Tenant 차단 표식/`digest` = 순신규 ABSENT.
- **PARTIAL 강점**: tenant 강제주입·`acl_permission.tenant_id` 실재 → 격리 자체는 정본 존재(재확인).
- **BLOCKED_PREREQUISITE**: tenant-bound Effective/Cache 강제는 Effective Set 영속·Cache 계층 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
