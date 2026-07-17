# CANONICAL — DSAR Rebate Role, Organization, Tenant, Workspace & Scope Governance

> **EPIC 06-A · Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · Spec Version 1.0 수령분**
> 289차 · **비파괴 설계 명세 — 코드변경 0**
> ADR: [`ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md`](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md)
> 요구 분모(스펙 영속): [`REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md`](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> §53 세부: **57편**(`DSAR_REBATE_ROLE_*` 외)
>
> ## ⚠️ 자율 설계본의 양보
> 289차 초반 **스펙 미수령 상태**에서 자율 판단으로 작성한
> `CANONICAL_DSAR_AUTHORIZATION_ORGANIZATION_TENANT_SCOPE.md` · `CANONICAL_DSAR_AUTHORIZATION_ROLE_GOVERNANCE.md` ·
> `ADR_DSAR_REBATE_AUTHORIZATION_ORG_ROLE_SCOPE.md` 는 각 문서에 **"스펙 수령 시 본 문서가 양보한다"**를 명시했다.
> **스펙이 수령됐으므로 본 문서가 5-2 정본이며, 자율 설계본은 참고 이력으로만 보존한다**(무후퇴 · 삭제하지 않음).

---

## §0. 최상위 판정 — 이 도메인은 **부재가 아니라 존재·분산**이다

**5-1의 판정이 5-2에서 더 강해졌다.** 스펙 §3이 요구한 전수 조사 결과,
**요구 항목의 상당수가 이미 REAL**이다.

| 스펙 요구 | 실측 | 근거 |
|---|---|---|
| **IdP Group Mapping** | ✅ **REAL** | `sso_group_role_map`(tenant_id·group_name·role·UNIQUE uq_sgrm) `EnterpriseAuth.php:70/72` · `roleForGroups()` :78 |
| **SCIM** | ✅ **REAL** | `sso_config`(scim_enabled·scim_token_hash·auto_provision·default_role) :59 · `scimJson()` :35 |
| **Automatic Deprovisioning** | ✅ **REAL** | `EnterpriseAuth.php:400` — `active===0 → DELETE FROM user_session` **// 즉시 deprovision** |
| **Brand Registry** | ✅ **REAL** | `catalog_brand`(tenant_id·name·code·UNIQUE) `Catalog.php:151/161/353` · **285차** |
| **Team Registry** | ✅ **REAL** | `team`(tenant_id·name·team_type·manager_user_id·status) `TeamPermissions.php:145/168` |
| **Action 8 / Scope 9 / Permission 매트릭스** | ✅ **REAL** | `TeamPermissions.php:39/41/15` |
| **Assignment Validity·Usage** | ✅ **부분 REAL** | `api_key.expires_at`·`last_used_at`·`use_count` `Db.php:942-955` |
| **External User 체계** | ✅ **REAL** | AgencyPortal(**매 요청 approved 재검증 fail-closed**·272차) · PartnerPortal · SupplyChain |
| **Tenant Isolation** | ✅ **REAL(강력)** | `auth_tenant` RLS · agency 토큰 **서버바인딩 위조불가** `index.php:97-100` · **192차 `/api` 별칭 차단** :562-575 |
| Workspace · Organization · Department · Legal Entity · Store · Cost Center · Country · Region Registry | ❌ **부재(grep 0)** | — |
| Role Catalog · Version · Hierarchy · Composition · Custom Role · Request/Grant/Revocation 원장 · Scope Inheritance/Override/Exclusion/Conflict · Usage 원장 · Orphan/Dormant 탐지 · Reconciliation · HRIS | ❌ **부재** | — |

**→ 결론: 신설이 아니라 통합이다.** 스펙 §5 단서와 일치 —
*"공통 IAM Entity가 이미 있으면 Rebate 전용으로 복제하지 말고 Resource Domain·Role Profile만 확장하라."*

### 0-1. 오탐 2건 (grep 히트했으나 실체가 다름)

| 히트 | 실체 | 판정 |
|---|---|---|
| `workspace` (4파일) | **`WorkspaceState` = `tenant_kv` 키-값 저장소**(279차 감사 E-P1 — localStorage 운영데이터 서버 영속) | ⚠️ **오탐** — 조직 Workspace Registry 아님 |
| `business_unit` (2) | **Trustpilot Business API 자격증명 필드**(`ChannelSync.php:2573-2577`) | ⚠️ **오탐** — 조직 단위 아님 |

> **1-6에서 grep REAL 히트 4건 중 3건이 오탐**이었다. **이름이 같다고 같은 것이 아니다.**

---

## §1. Canonical Entity (스펙 §5 · 29종) — 매핑

| Entity | 판정 |
|---|---|
| `REBATE_ROLE_CATALOG` · `REBATE_ROLE_VERSION` · `REBATE_STANDARD_ROLE` · `REBATE_CUSTOM_ROLE` · `REBATE_ROLE_HIERARCHY` · `REBATE_ROLE_COMPOSITION` · `REBATE_ORGANIZATION_ROLE_PROFILE` · `REBATE_ROLE_ASSIGNMENT_CONDITION` · `REBATE_ROLE_REQUEST` · `REBATE_ROLE_GRANT` · `REBATE_ROLE_REVOCATION` · `REBATE_ROLE_SCOPE_INHERITANCE` · `REBATE_ROLE_SCOPE_OVERRIDE` · `REBATE_ROLE_SCOPE_EXCLUSION` · `REBATE_ROLE_SCOPE_CONFLICT` · `REBATE_EXTERNAL_USER_ROLE_PROFILE` · `REBATE_ROLE_USAGE` · `REBATE_ORPHAN_ROLE` · `REBATE_DORMANT_ROLE` · `REBATE_ROLE_CANDIDATE` · `REBATE_ROLE_RECONCILIATION` · `REBATE_ROLE_EVIDENCE` | **NOT_APPLICABLE → 신설** |
| **`REBATE_ROLE`** | **CONSOLIDATION_REQUIRED** — 3계통(team_role · api_key roleRank · admin master/sub) |
| **`REBATE_ROLE_PERMISSION_PROFILE`** | 🔴 **VALIDATED_LEGACY** — `acl_permission` 매트릭스 + ACTIONS 8 |
| **`REBATE_ROLE_ASSIGNMENT`** | **CONSOLIDATION_REQUIRED** — 3 Assignment Table |
| **`REBATE_ROLE_ASSIGNMENT_SCOPE`** | **VALIDATED_LEGACY** — DATA_SCOPES 9(**의미 변경 금지**) |
| **`REBATE_ROLE_DEPROVISIONING`** | 🔴 **VALIDATED_LEGACY** — `EnterpriseAuth.php:400` **패턴 정본** |
| **`REBATE_SERVICE_ACCOUNT_ROLE_PROFILE`** | **VALIDATED_LEGACY + CONSOLIDATION_REQUIRED** — `api_key`(Type 승격 필요) |
| **`REBATE_ROLE_AUDIT_EVENT`** | **VALIDATED_LEGACY** — `menu_audit_log` **필드 축**(old_value/new_value/changed_by_role/reason/ip/ua/request_id) 표준 승격(🔴`tenant_id` 부재 보강 조건부) · ⚠️**`hash_chain` 은 제외 = `PARTIAL`**(preimage `ts`(`AdminMenu.php:195`) 미저장 → 검증 영구 불가 · 검증기 0). 해시체인 정본 = `SecurityAudit::verify():56-68` |

---

## §2. 🔴 핵심 설계 판단

### 2-1. Scope Dimension = 계약 24 ∪ 현행 고유 4 = **28** (합집합·무후퇴)

현행 `DATA_SCOPES` 9 중 **`campaign`·`product`·`warehouse`·`own`은 스펙 24에 없다.**

> **스펙에 없다는 이유로 기존 축을 버리면 1-9 최우선 명령 위반이다** —
> *"기존 정상 사용자 접근을 유지하면서 과도한 권한만 제거"*.
> **삭제 시 즉시 회귀**한다. 5-1 §51 판정 **"통합(기존 9종 의미 변경 금지)"**을 계승한다.

### 2-2. Composite Role 기본값 = **INTERSECTION** (스펙 §13 준수)

> **UNION 이 기본이면 Composite Role 이 조용히 권한을 확대한다.**
> **사용자는 "역할을 합쳤다"고 생각하지 "권한을 늘렸다"고 생각하지 않는다 — 그래서 위험하다.**

### 2-3. Standard Role 결합 금지 (스펙 §8 말미 구체화)

- **Program Manager 가 Finance·Payout 을 자동 획득하지 않는다**(§0 질문 직답).
- **Operator 와 Approver 를 같은 Role 에 넣지 않는다** — 넣으면 **Maker-Checker 전제가 설계 단계에서 파괴**된다(→5-4).
- **Access Admin + Finance 결합 금지** — **권한 부여자가 스스로에게 지급 권한을 줄 수 있게 된다.**

**기반 REAL**: ACTIONS 8에 **approve·execute 가 이미 분리**(`TeamPermissions.php:39`) → **Approver/Operator 분리의 토대가 존재**.

### 2-4. Role 3계통 통합은 **`EquivalenceProof` 선행 필수** (1-9 계승)

**증명 없는 통합 = 286차 rank 맵 붕괴 재현.** 가설이 아니라 **실측 이력**이다.
**Golden 확보 → 동일 입력·동일 출력 증명 → 그 후 교체.**

### 2-5. Critical Gap 대응 = **"Runtime Guard 차단(1차) + Access Review 등재(2차)"**

**5-7이 발견한 설계 순환 참조 정정을 계승한다** — 5-1~5-6이 대응을 "Access Review 차단"으로 적었으나
**Access Review 는 부재(grep 0)**였다. **존재하지 않는 기능에 의존하지 않는다.**

### 2-6. `VALIDATED_LEGACY` 에 **`is_effective` 를 요구**한다 (1-9 계승)

1-9 LEGACY-GAP-01: `guard_headerless_getjson.mjs` 가 **`VALIDATED_LEGACY`(재사용 강제)로 분류됐으나 호출처 0** —
**"VALIDATED"가 거짓**이었다.
→ **본 블록의 모든 `VALIDATED_LEGACY` 는 `file:line` + 동작 경로 확인 근거**를 가진다.
**실 운영 데이터·라이브 동작 미확인 항목은 `UNVERIFIED` 로 표기**했다.

---

## §3. 🔴 미확정 관찰 (본 세션 미수정 · `UNVERIFIED`)

**FP 레지스트리 — PM 코드 재증명 전 P0 단정 금지.**

| # | 관찰 | 근거 | 왜 단정하지 않는가 |
|---|---|---|---|
| **O-1** | **Group 제거 시 Role 유지 가능성** | `sso_group_role_map` 에 **removal behavior 부재** · IdP 그룹 삭제 시 매핑 행 잔존 | **실 동작·재로그인 경로 미검증** |
| **O-2** | **Service Account 에 Human Role 부여 가능성** | `api_key.role='admin'` 을 막는 장치 없음(`index.php:554` roleRank) | **그런 키가 실제 발급됐는지 미조회** |
| **O-3** | **Orphan Group Role** | `sso_group_role_map` 은 group_name **문자열** 저장 — IdP 삭제 시 고아 | **실 데이터 미조회** |
| **O-4** | **1-1의 "Brand Registry 부재" 기재 오류** | `catalog_brand` REAL(285차) | **1-1 문서 미수정**(남의 블록 산출물 · 1-8 D-10 준수) |

**본 세션은 어느 것도 수정하지 않았다.**

---

## §4. 정직 표기 — 구현 수준

**스펙 §65는 41항목 전부 "구축되었다"를 요구한다.**
**본 블록 산출은 계약 명세(문서)까지이며 실 코드·테이블·Lint·Guard 는 0건이다.**

선행 Part 1-1~1-4·5-1 선례 + 비파괴·코드변경 0 원칙 준수.
**"구축 완료"가 아니라 "계약 명세 확정"으로 읽어야 한다.**

**1-6 4축**: Design **충족** · Implementation **0%** · Data **0%** · Verification **0%**.
**회귀 0**(코드 변경 자체가 0).

실 구현 = **고객 Rebate 기능 도입 시 후속 승인 세션**.

---

## §5. 다음

**Part 4-5-3-1-5-3 — Rebate Approval Workflow, Multi-Level Approval & Risk-Based Decision Governance.**

**입력**: 본 블록 Role·Scope 기반 + **`action_request` 승인워크플로 REAL**(재사용 강제·중복 승인엔진 금지) +
🔴 **1-6 Gap 원장 G-01**(`Mapping.php:212` 승인 중복 미제거 → **1인 2회로 정족수 충족 = Maker-Checker 무효** · `UNVERIFIED` · **PM 재증명 선행 권고**).
