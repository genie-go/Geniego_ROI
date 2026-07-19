# DSAR — Permission Reconciliation Foundation 설계 명세 (EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **판정**: BLOCKED_PREREQUISITE (RP-002 — Canonical Registry/Definition/Snapshot 부재로 대사 기준 미확립)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **반날조**: 모든 file:line 인용은 상위 ADR·[`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) 두 문서에 한함.

---

## ① 목적

여러 계층에 흩어진 Permission 표현(Registry·Definition·Code·Group/Bundle·Hierarchy·Grant·Deny·Effective Set·Cache·UI·Gateway·ERP·Legacy·Snapshot)을 **주기적·이벤트 기반으로 상호 대사**하여 불일치(누락·과다·drift·orphan)를 탐지한다. 특히 이 플랫폼의 ★**3개 분리 rank/vocab 체계**(plan `PlanPolicy::RANK` `:19` · api_key `roleRank` `index.php:573` · team_role owner/manager/member)가 통합 resolver 없이 공존하므로, 이 3 스케일이 서로·Canonical과 정합하는지 대사가 핵심.

## ② Canonical 필드 (Reconciliation Finding)

| 필드 | 설명 |
|---|---|
| `finding_id` | 대사 결과 식별자 |
| `tenant_id` | 대상 테넌트(격리) |
| `comparison_type` | 아래 ③ 열거형 |
| `left_ref` / `right_ref` | 대사 양측 참조(테이블/계층/다이제스트) |
| `mismatch_type` | MISSING_LEFT / MISSING_RIGHT / VALUE_DIFF / VERSION_DIFF / ORPHAN / DIGEST_MISMATCH |
| `left_digest` / `right_digest` | 양측 정규화 다이제스트 |
| `severity` | INFO / LOW / MEDIUM / HIGH / CRITICAL |
| `remediation` | 권고 조치(no auto-remediate — 검토 후) |
| `detected_at` | 탐지 시각 |

## ③ 열거형 — Comparison(대사 축)

- `REGISTRY_VS_DEFINITIONS`
- `DEFINITION_VS_ACTIVE_VERSION`
- `CODE_VS_NAMESPACE`
- `GROUP_VS_MEMBERSHIP` / `BUNDLE_VS_MEMBERSHIP`
- `HIERARCHY_VS_EDGES`
- `GRANT_VS_SUBJECT` / `GRANT_VS_ROLE_REF` / `GRANT_VS_SERVICE_ACCOUNT` / `GRANT_VS_API_CLIENT` / `GRANT_VS_SCOPE`
- `DENY_VS_SCOPE`
- `EFFECTIVE_SET_VS_CANONICAL`
- `CACHE_VS_CANONICAL`
- `UI_VS_SERVER`
- `API_GATEWAY_VS_APP`
- `ERP_VS_PLATFORM`
- `LEGACY_VS_CANONICAL`
- `SNAPSHOT_DIGEST_VS_STORED`

## ④ substrate 매핑 (§92 · file:line 없으면 ABSENT)

★**3 분리 rank 대사 대상**: plan / api_key / team_role — 통합 resolver 부재라 대사가 정합 확보의 유일 수단.

| Comparison | substrate | §92 태그 | 근거 |
|---|---|---|---|
| `GRANT_VS_SUBJECT` | acl_permission subject_type/subject_id | CANONICAL_PERMISSION_SCOPE_CANDIDATE | `TeamPermissions:152-171` |
| `GRANT_VS_SCOPE` (api_key) | api_key scopes_json (roleRank/scope) | CANONICAL(PEP·프로그래매틱) | `index.php:573-596`·`577` |
| `GRANT_VS_ROLE_REF` (team_role) | team_role owner/manager/member | roleOf | `:120-131` |
| `EFFECTIVE_SET_VS_CANONICAL` | effectiveForUser | EXISTS(계산·미영속) | `:366` |
| `DENY_VS_SCOPE` | `1=0` 센티넬·data_scope | Deny PARTIAL·ROW SCOPE | `:290,303`·`:236-265` |
| `UI_VS_SERVER` | writeGuard/planMenuPolicy vs guardTeamWrite | UI_HINT_ONLY(서버 미러) | `index.php:82`·UserAuth`:1167` |
| `LEGACY_VS_CANONICAL` | acl_permission menu_key(레거시 식별자) | 정규화 필요 | `:152-171` |
| plan rank 축 | PlanPolicy::RANK | KEEP_SEPARATE_WITH_REASON | `PlanPolicy:19` |
| `REGISTRY_VS_DEFINITIONS`/`DEFINITION_VS_ACTIVE_VERSION`/`CODE_VS_NAMESPACE` | — | **ABSENT** (Registry/Version/Namespace 부재) | ABSENT |
| `GROUP/BUNDLE_VS_MEMBERSHIP`/`HIERARCHY_VS_EDGES` | — | **ABSENT** (Group/Bundle/Hierarchy 부재) | ABSENT |
| `CACHE_VS_CANONICAL` | — | **ABSENT** (캐시 부재) | ABSENT |
| `API_GATEWAY_VS_APP`/`ERP_VS_PLATFORM` | — | **ABSENT** (외부 계층 정형연동 부재) | ABSENT |
| `SNAPSHOT_DIGEST_VS_STORED` | — | **ABSENT** (Snapshot 부재) | ABSENT |
| `GRANT_VS_SERVICE_ACCOUNT` | — | **ABSENT** (service account 모델 부재) | ABSENT |

## ⑤ 설계 원칙

- **No auto-remediate**: 대사는 탐지·권고까지. 불일치 자동 수정 금지(권한 자동 부여/삭제는 사고 유발) — 검토 후 명시적 조치.
- **3-rank 정합 대사 필수**: plan/api_key/team_role 3 스케일은 무관 축이므로, 통합 resolver 신설 전까지 대사로 상호 모순(예: plan 상 접근 가능 ↔ team_role read-only) 상시 감시.
- **Canonical이 진실 기준**: 대사 시 Canonical Effective Set이 정본. Cache/UI/Gateway/Legacy는 Canonical에 수렴해야 함.
- **Fail-closed 해석**: 불일치는 넓은 쪽(Allow)이 아니라 좁은 쪽(Deny)으로 임시 해석 후 조치.
- **Tenant 격리**: 대사는 항상 `tenant_id` 파티션 내.
- **Permission ≠ Role ≠ Authority**: `GRANT_VS_ROLE_REF`(Role 참조)와 Permission Definition 대사를 분리. plan(상용 게이트)은 Permission 대사에 섞지 않고 `KEEP_SEPARATE` 축으로만 참조.

## ⑥ Gap

- Canonical Registry/Definition/Version/Namespace/Group/Bundle/Hierarchy/Cache/Snapshot 다수가 ABSENT — 대사 양측 중 한쪽이 없어 성립 불가한 축이 다수(BLOCKED_PREREQUISITE).
- 3 분리 rank 통합 resolver 부재가 근본 원인 — 대사는 임시 정합 확보일 뿐, 근본 해소는 Canonical Resolution 단일화(§93·별도 세션).
- 외부 계층(API Gateway/ERP/File ACL) 정형 연동 부재로 해당 대사는 인프라 결정 선행.
