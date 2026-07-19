# DSAR — Permission Migration Record 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — 목표 Canonical Code/Version/Namespace 부재로 실 이관 불가·기록 스키마만)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행**: [`DSAR_APPROVAL_PERMISSION_MIGRATION_FOUNDATION`](DSAR_APPROVAL_PERMISSION_MIGRATION_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

[`Migration Foundation`](DSAR_APPROVAL_PERMISSION_MIGRATION_FOUNDATION.md)의 원천 분류를 근거로, 개별 Legacy 권한 → Canonical Permission 이관을 **1건씩 감사가능하게 기록**하는 Migration Record 스키마와 `menu_key → {DOMAIN}:{RESOURCE}:{ACTION}` 매핑표 예시를 정의한다. 각 record는 의미등가·범위차·리스크차·확장/축소·confidence·수동검토 여부·증거를 담아, 이관이 권한을 소리 없이 확장하지 않았음을 증명한다.

## ② Canonical 필드 (Migration Record)

| 필드 | 설명 |
|---|---|
| `migration_id` | 이관 레코드 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `source_system` | 원천 시스템(TeamPermissions/api_key/…) |
| `source_type` | Foundation ③ 열거형 |
| `source_code` | 원본 권한 코드(예: menu_key 값) |
| `source_description` | 원본 의미 설명 |
| `source_scope` | 원본 범위(row/tenant/menu) |
| `source_effect` | ALLOW / DENY / row-filter |
| `source_grantees` | 원본 부여 대상(subject/role/client) |
| `target_permission` | 목표 Canonical Code `{DOMAIN}:{RESOURCE}:{ACTION}` |
| `target_version` | 목표 Permission Version |
| `target_namespace` | 목표 Namespace |
| `target_scope` | 목표 Canonical Scope AST |
| `semantic_equivalence` | EQUIVALENT / SUBSET / SUPERSET / PARTIAL / UNRESOLVED |
| `scope_difference` | 범위 차 서술 |
| `risk_difference` | 리스크 점수 전후 차 |
| `expansion` | 권한 확장분(있으면 수동검토 강제) |
| `reduction` | 권한 축소분 |
| `mapping_confidence` | HIGH / MEDIUM / LOW / UNRESOLVED |
| `manual_review_required` | 수동검토 필요 여부(bool) |
| `status` | PROPOSED / REVIEWED / APPLIED / REJECTED / HELD |
| `evidence` | 근거(원천 file:line·사용처·대사 결과) |

## ③ 열거형 — status / semantic_equivalence

- **status**: `PROPOSED` → `REVIEWED` → `APPLIED` / `REJECTED` / `HELD`
- **semantic_equivalence**: `EQUIVALENT` / `SUBSET` / `SUPERSET`(★수동검토 강제) / `PARTIAL` / `UNRESOLVED`

## ④ substrate 매핑 + `menu_key → {DOMAIN}:{RESOURCE}:{ACTION}` 매핑표 예시

원천 substrate: `acl_permission.menu_key` + `actions`(CSV 8종 `TeamPermissions:39`) · MENU_CATALOG 26메뉴 SSOT(`:55-82`). action → ACTION 정규화 예시:

| 원본 action(`:39`) | Canonical ACTION |
|---|---|
| view | READ |
| create | CREATE |
| update | UPDATE |
| delete | DELETE |
| approve | APPROVE |
| export | EXPORT |
| execute | EXECUTE |
| manage | MANAGE(superset·분해검토) |

**menu_key → Canonical Code 예시**(★모두 PROPOSED·confidence 기록·자동적용 아님):

| source_code (menu_key) | action | target_permission (예시) | semantic_equivalence | manual_review |
|---|---|---|---|---|
| `catalog` | view | `CATALOG:PRODUCT:READ` | EQUIVALENT | no |
| `catalog` | update | `CATALOG:PRODUCT:UPDATE` | EQUIVALENT | no |
| `catalog` | manage | `CATALOG:PRODUCT:MANAGE` | SUPERSET(분해) | **yes** |
| `orderhub` | view | `ORDER:ORDER:READ` | EQUIVALENT | no |
| `orderhub` | approve | `ORDER:ORDER:APPROVE` | EQUIVALENT | no |
| `wms` | update | `INVENTORY:STOCK:UPDATE` | EQUIVALENT | no |
| `adperformance` | export | `MARKETING:AD_PERFORMANCE:EXPORT` | EQUIVALENT | no |

**분해 필수(Golden Rule)** 예시:

| source_code | source_type | disposition |
|---|---|---|
| `is_admin`(resolveAdminByToken `:2998`) | IS_ADMIN | **DECOMPOSE** — 전권 자동 Permit 금지·실제 admin 소비 게이트별 최소 Permission 재구성 |
| `write:*`(api_key `Keys.php:191,204`) | API_SCOPE | **DECOMPOSE** — 실제 소비 write 엔드포인트 기준 분해 |
| `admin_roles`/`user_roles` | ROLE_PERMISSION_TABLE | **EXCLUDE** — 289차 P3 폐기·이관 대상 아님(재플래그 금지) |
| `FEATURE_MIN_PLAN`(PlanPolicy `:27`) | FEATURE_FLAG | **EXCLUDE** — plan≠Permission·직교 축 유지 |

data_scope(행필터 `:286-307`)는 target_scope(Canonical Scope AST)로 이관 — Code가 아니라 Scope 축.

목표측(`target_permission`/`target_version`/`target_namespace`)은 현재 전부 **ABSENT**(Canonical Registry 미신설) → status는 설계상 PROPOSED에서 진행 불가(BLOCKED_PREREQUISITE).

## ⑤ 설계 원칙

- **SUPERSET·expansion은 수동검토 강제**: 목표가 원본보다 넓으면(`SUPERSET`·`expansion` 존재) `manual_review_required=true`·자동 APPLIED 금지(권한 확장 봉인).
- **Golden Rule**: ADMIN/ALL/*/FULL_ACCESS·manage(superset)는 분해 후에만 record 생성. 자동 등가 이관 금지.
- **Evidence 필수**: 모든 record는 원천 file:line·실사용처·대사 근거 첨부. 근거 없는 이관 금지(반날조).
- **폐기분·직교축 제외**: admin_roles/user_roles·plan feature flag·connector OAuth는 record 생성 대상 아님.
- **Confidence·status 게이트**: LOW/UNRESOLVED confidence는 HELD. REVIEWED 없이 APPLIED 금지.
- **무후퇴**: 이관 후 원 권한 대비 접근 상실 없음을 Reconciliation(LEGACY_VS_CANONICAL)로 검증.
- **Permission ≠ Role ≠ Authority**: Role 테이블 record는 Role→Permission Adapter(Part 3) 참조로, Authority는 Part 5로 분리.

## ⑥ Gap

- 목표 Canonical Code/Version/Namespace가 전부 ABSENT — Migration Record의 target측을 채울 수 없어 실 이관 착수 불가(BLOCKED_PREREQUISITE).
- menu_key→Code 매핑표는 예시(PROPOSED)일 뿐 — 26메뉴 전수·8 action 조합 확정은 Canonical Registry 신설 후.
- SUPERSET/manage 분해·is_admin/wildcard 분해는 실사용 표면 전수조사 선행.
- 실 구현 = 선행 Canonical Registry 신설 + Reconciliation 검증 + 별도 승인세션(RP-002).
