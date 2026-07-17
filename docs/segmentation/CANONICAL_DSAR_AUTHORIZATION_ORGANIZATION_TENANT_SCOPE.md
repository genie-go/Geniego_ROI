# CANONICAL DSAR — Authorization Organization·Tenant·Workspace & Scope Governance (Organization/Tenant/Workspace/Team/Brand/Legal Entity Registry · Scope Hierarchy · Inheritance · Resolution)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> **★★스펙 미수령 — 설계 자율 판단(사용자 승인)**: 본 파트의 상세 스펙(§5~§60 요구·Entity 필드·분류 체계·산출 문서 목록·완료 보고 형식)은 **제공되지 않았다**. 파트 번호·파트명만 선행 스펙(5-1 §1)에 명시. **본 문서의 구조·Entity·분류는 실측 + 5-1 산출 + 도메인 판단으로 자율 설계**했으며, **정본 스펙 수령 시 그에 맞춰 재정합**한다(RP-001 정합: 번호/이름 추정 없음·세부는 자율 판단임을 명시).
> 정본 쌍: 본 문서(Organization/Tenant/Workspace/Team/Brand/Legal Entity/Scope Hierarchy) + [`CANONICAL_DSAR_AUTHORIZATION_ROLE_GOVERNANCE.md`](CANONICAL_DSAR_AUTHORIZATION_ROLE_GOVERNANCE.md)(Role Registry 통합·Custom Role·Lifecycle·Assignment·Privilege Escalation 방지).
> ADR: [`../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_TENANT_SCOPE_GOVERNANCE.md`](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_TENANT_SCOPE_GOVERNANCE.md).
> 선행: **5-1 Authorization Foundation**(Subject/Binding·Scope Dimension 24·DATA_SCOPES 9·Role 3계통 통합 과제 위임 수령).
> **범위**: 조직·범위 축만 — Approval=5-3 · Maker-Checker/Delegation=5-4 · Break Glass/JIT=5-5 · Runtime PDP=5-6 · Audit/Access Review=5-7 · Lint/Golden/Certification=5-8. **중복 구현 금지.**

---

## 0. 실측 요약 — ★오탐 3건을 잡았다

| 조직 축 | 1차 grep | **정밀 확인(정본)** | 분류 |
|---|---|---|---|
| **Tenant** | REAL | ✅ **REAL** — `auth_tenant` 전역 주입 + **`tenant_business_profile`**(tenant_id PK · **company_name · biz_reg_no · industry · company_size · country · website · brand_name · brand_positioning · brand_tone**·[DataPlatform.php:53](../../backend/src/Handlers/DataPlatform.php)/72) + `tenant_product_addon`([ProductAddon.php:49](../../backend/src/Handlers/ProductAddon.php)) | **VALIDATED_LEGACY → Tenant Registry 정본(재사용)** |
| **Team** | REAL | ✅ **REAL** — **`team` 테이블**([TeamPermissions.php:145](../../backend/src/Handlers/TeamPermissions.php)) · **team_role(owner>manager>member)**·manager_user_id(:17) · `team_channel_mapping`(tenant_id·team·channel·account·[Db.php:712-717](../../backend/src/Db.php)) · `TEAM_TYPES`(:44) | **VALIDATED_LEGACY → Team Registry 정본(재사용)** |
| **Brand** | REAL | ✅ **REAL** — `catalog_brand` 테이블 + `catalog_listing.brand`(285차 브랜드 관리 신설) · tenant_business_profile.**brand_name** · DATA_SCOPES 의 `brand` | **VALIDATED_LEGACY(재사용)** |
| **Workspace** | REAL | ❌ **★오탐 — 부재**. `WorkspaceState` 는 **`tenant_kv`(테넌트 KV 저장소)**이며 주석이 명시: "테넌트 격리 전용 tenant_kv 신설(중복 아님)"·"클라 범용 쓰기로 재사용하면 시스템 키 오염 위험"([WorkspaceState.php:10](../../backend/src/Handlers/WorkspaceState.php)/59-61). **UI 상태 저장소이지 조직 Workspace Registry 가 아니다** | **NOT_APPLICABLE → 신설** |
| **Organization** | REAL | ❌ **★오탐 — 부재**(`organization_id` grep 0) | **NOT_APPLICABLE → 신설** |
| **Store** | REAL | ❌ **★오탐 — 부재**. `influencer_store`([Influencer.php:38](../../backend/src/Handlers/Influencer.php)) = **인플루언서 스토어**·조직 Store 아님 | **NOT_APPLICABLE → 신설** |
| **Country / Region** | REAL | ❌ **★오탐 — Registry 부재**. `country` 는 **tenant_business_profile 컬럼**(DataPlatform.php:72)·**pixel_events 컬럼**(PixelTracking.php:99)일 뿐 **Registry 아님** | **NOT_APPLICABLE → 신설**(Attribute 로는 REAL) |
| **Department** | 부재 | ❌ **부재(grep 0)** | **NOT_APPLICABLE → 신설** |
| **Legal Entity** | 부재 | ❌ **부재(grep 0)** — 1-1·1-3 과 일관 | **NOT_APPLICABLE → 신설** |
| **Scope Dimension** | REAL | ✅ **REAL** — `TeamPermissions::DATA_SCOPES = ['company','brand','team','campaign','product','channel','warehouse','partner','own']`(**9종**·[TeamPermissions.php:41](../../backend/src/Handlers/TeamPermissions.php)) | **VALIDATED_LEGACY → Scope 정본(의미 변경 금지·확장만)** |
| **Environment** | △ | △ GENIE_ENV/IS_DEMO · **`Db::envLabel()`**(278차 트랩: `Db::env()` 는 데모에서도 production 반환) | **재사용(데이터 격리) + 권한 축은 부재(신설)** |
| **Agency ↔ Client 조직 관계** | — | ✅ **REAL** — `agency_client_link`(272차 대행사 콘솔) · **매 요청 approved 재검증 fail-closed** · agency 토큰 **서버바인딩 tenant 주입**(index.php:97-100) | **VALIDATED_LEGACY → 조직 관계 정본(재사용)** |

**★결론(정직)**: 조직 축은 **Tenant · Team · Brand · Agency-Client 관계만 REAL**이고, **Organization · Workspace · Department · Store · Country/Region Registry · Legal Entity 는 전부 부재**다. **★1차 grep 의 REAL 4건 중 3건(Workspace·Store·Country)이 오탐**이었다 — 이름이 같다고 조직 Registry 가 아니다(`WorkspaceState`=UI 상태 KV · `influencer_store`=인플루언서 · `country`=컬럼). **VALIDATED_LEGACY 재사용 강제 · 부재는 신설 · 오탐을 REAL 로 표기 금지**.

### ★인접 관찰 (본 세션 코드변경 0·근거 기록만)
- **[관찰] `tenant_business_profile` 이 사실상 Tenant Registry 다** — company_name·biz_reg_no(사업자등록번호)·industry·country·brand_name 을 이미 보유(DataPlatform.php:53/72·272차). **별도 Tenant Registry 신설 금지 → 이 테이블 확장**(Golden Rule=Extend). **단 `biz_reg_no`·country 가 있어도 Legal Entity 는 아니다**(법인 단위 회계/책임 주체 ≠ 테넌트 프로필·1-3 §Accounting 정합).
- **[관찰·미확정] Scope 축 불일치**: 5-1 Canonical Scope Dimension **24** vs 현행 `DATA_SCOPES` **9**. 현행 9종은 **`campaign`·`product`·`channel`·`warehouse`·`own`** 같은 **업무 데이터 축**이 섞여 있어, Canonical 의 **조직 축**(tenant/workspace/legal_entity)과 **차원이 다르다**. → **§3 에서 2계층으로 분리 설계**(조직 Scope ≠ 데이터 Scope) · 기존 9종 **의미 변경 금지**.
- **[관찰] `team` 은 tenant 하위** — team_channel_mapping 이 `tenant_id + team` 복합(Db.php:712-717) → **Team 은 Tenant 종속**이 실측. Workspace 계층이 없으므로 현행 조직 트리는 **Tenant → Team → (User)** 2단.

---

## 1. Canonical Entity (16) — 자율 설계

ORGANIZATION · TENANT_REGISTRY · WORKSPACE · DEPARTMENT · TEAM_REGISTRY · BRAND_REGISTRY · STORE_REGISTRY · LEGAL_ENTITY · COUNTRY_REGION_REGISTRY · ORGANIZATION_RELATIONSHIP · SCOPE_HIERARCHY · SCOPE_INHERITANCE_POLICY · SCOPE_RESOLUTION · SCOPE_CONFLICT · ORGANIZATION_EVIDENCE · ORGANIZATION_AUDIT_EVENT.
**현행 실체**: Tenant(tenant_business_profile) · Team(team·team_role·team_channel_mapping) · Brand(catalog_brand) · Agency-Client(agency_client_link) = **REAL 재사용**. 나머지 = **신설**.

## 2. Tenant (§1) · Team (§2) · Brand (§3) — REAL 재사용

- **Tenant Registry(§1)**: **★기존 `tenant_business_profile` 확장**(신설 금지) — tenant_id(PK) · company_name · **biz_reg_no** · industry · company_size · country · website · brand_name · brand_positioning · brand_tone · brand_json · profile_json · updated_by · created_at/updated_at(DataPlatform.php:53/72). **추가 필요(신설)**: parent_tenant · tenant_type · **legal_entity_id**(부재) · **environment 권한 축** · status · valid_from/to · evidence. **★`auth_tenant` 는 위조불가 서버 주입**(index.php:97-100)이므로 **Tenant 판정 정본은 요청 시점 서버 해석**(286차 platform_growth act-as 하이재킹 교훈: **요청시점 tenant 해석 오류 = 전 메뉴 공백**).
- **Team Registry(§2)**: **★기존 `team` 테이블 확장**(TeamPermissions.php:145) — team · **team_role(owner>manager>member)** · manager_user_id · `TEAM_TYPES`(:44) · `team_channel_mapping`(tenant_id+team+channel+account·Db.php:712-717). **현행 트리 = Tenant → Team → User(2단)**. **추가 필요**: parent_team · department_id · workspace_id · valid_from/to.
- **Brand Registry(§3)**: **★기존 `catalog_brand` + `catalog_listing.brand` 재사용**(285차) · tenant_business_profile.brand_name · DATA_SCOPES 의 `brand`. **추가 필요**: brand↔legal_entity · brand↔country 매핑.

## 3. ★Scope 2계층 분리 (§4) — 조직 Scope ≠ 데이터 Scope

**실측 근거(§0 관찰)**: 현행 `DATA_SCOPES` 9종은 조직 축(`company`·`team`·`partner`)과 **업무 데이터 축**(`campaign`·`product`·`channel`·`warehouse`·`own`)이 **혼재**한다. 5-1 Canonical Scope Dimension 24 와 **차원이 다르므로** 강제 병합 시 의미 손상.

| 계층 | 축 | 현행 | 조치 |
|---|---|---|---|
| **① 조직 Scope**(Authorization 주체 범위) | TENANT · **ORGANIZATION**(부재) · **WORKSPACE**(부재) · **DEPARTMENT**(부재) · TEAM · **LEGAL_ENTITY**(부재) · **COUNTRY/REGION**(Registry 부재) · **ENVIRONMENT**(권한 축 부재) | `company` · `team` · `partner` | 기존 3종 매핑 + **6종 신설** |
| **② 데이터 Scope**(Resource 범위) | BRAND · STORE(부재) · MERCHANT · VENDOR · **PRODUCT** · **CHANNEL** · **CAMPAIGN** · **WAREHOUSE** · **OWN**(본인) · PROGRAM(부재) · PROVIDER_ACCOUNT(부재) · FINANCIAL_THRESHOLD(부재) · FIELD | `brand`·`campaign`·`product`·`channel`·`warehouse`·`own` **6종 REAL** | **의미 변경 금지·재사용** |

**★규칙**: **기존 9종의 의미·값을 변경하지 말 것**(Golden Rule=Extend · 351개 호출부를 가진 plan gate 처럼 **광범위 회귀 위험**). 신규 축은 **추가만**. `own`(본인 데이터만)은 **가장 좁은 Scope** 로 특별 취급.

## 4. Scope Hierarchy (§5) · Inheritance (§6) · Resolution (§7)

- **Hierarchy(§5)**: scope_hierarchy_id · **parent_scope · child_scope · hierarchy_type · depth · path** · valid_from/to · evidence. **현행 실측 트리 = Tenant → Team → User**(2단·Workspace/Department 부재). **목표 트리(신설 포함)**: Legal Entity → Organization → Tenant → Workspace → Department → Team → User. **★순환 참조 차단 · depth 상한**.
- **Inheritance Policy(§6, 6)**: **NONE**(상속 없음) · PARENT_INHERITED · PARENT_WITH_OVERRIDE · **EXPLICIT_ONLY** · CONDITIONAL · CUSTOM. **★§4.3 Least Privilege 정합: 기본 = EXPLICIT_ONLY**(부모 Scope 를 자동으로 자식에 부여 금지). **현행 반례 관찰**: `team_role` **fail-open**(미설정=owner·AdminMenu.php:52-54·5-1 §0-3) = **암묵적 최고권한 부여** → **5-2 판정 대상**(아래 §9).
- **Resolution(§7)**: scope_resolution_id · request · subject · **적용 Scope 집합 · 유효 Scope(교집합) · 결정 경로 · 상속 출처 · override 내역** · evidence. **★Subject Scope ∩ Resource Scope 가 비면 DENY**(5-1 §32 평가 순서 ⑨⑩). **★결정 경로 기록 필수**(왜 이 범위인지 재현 가능·Vol4 Explainable).
- **Conflict(§8)**: 동일 Subject 에 상충 Scope(포함/배제) 부여 시 — **RESTRICTIVE_WINS**(더 좁은 범위 우선·기본) · MOST_SPECIFIC · EXPLICIT_EXCLUDE_WINS · MANUAL_REVIEW. **★5-1 §4.2 Explicit Deny 우선 원칙 정합**.

## 5. Organization Relationship (§9) — Agency 정본

- **Relationship(§9)**: relationship_id · **from_organization · to_organization · relationship_type · approved · approval_reference · valid_from/to · scope_limitation** · status · evidence. **Type(8)**: PARENT_CHILD · **AGENCY_CLIENT**(REAL) · PARTNER · VENDOR · MERCHANT · RESELLER · SUBSIDIARY(Legal Entity·부재) · CUSTOM.
- **★현행 정본 재사용**: **`agency_client_link`**(272차 대행사 멀티클라이언트 콘솔) · **매 요청 approved 재검증 fail-closed** · agency 토큰이 **서버바인딩 tenant 주입 + 최소권한 role**(`write` 없으면 viewer·index.php:97-100) = **Cross-Organization 접근의 실 정본**. **★대행사가 클라이언트 테넌트에 접근하는 유일한 승인 경로** → **중복 Cross-Tenant 경로 신설 금지**.
- **★§4.5 Tenant Isolation 예외는 이 관계뿐** — 그 외 Cross-Tenant 접근은 **Critical Gap**(5-1 §43).

## 6. Legal Entity (§10) · Environment 권한 축 (§11) — 부재→신설

- **Legal Entity(§10)**: legal_entity_id · **legal_name · registration_number · country · tax_jurisdiction · parent_legal_entity · accounting_system_reference · currency · status** · valid_from/to · evidence. **★부재 확정**(1-1·1-3·5-1·5-2 일관) — **Rebate Funding/Liability/Accounting 의 최종 귀속 주체**(1-3 §Accounting)이므로 **Rebate 실 도입의 선결 조건**. **★`tenant_business_profile.biz_reg_no` 가 있어도 Legal Entity 가 아니다**(테넌트 프로필 ≠ 법인 회계 주체·§0 관찰).
- **Environment 권한 축(§11)**: **현행 GENIE_ENV/IS_DEMO 는 데이터 격리용**(DB 물리 분리·267차 교훈: roidemo 가 GENIE_ENV 미설정→`Db::env()`=production 이나 DB=geniego_roi_demo 라 실격리 정상). **권한 축으로는 부재** → **신설**. **★`Db::envLabel()` 사용**(278차 트랩: `Db::env()` 는 데모에서도 production 반환 → **환경 오판 = 권한 오판**).

## 7. Organization Matrix — 현행

| 조직 축 | 현행 실체 | Registry | Scope 축 | 근거 |
|---|---|---|---|---|
| **Tenant** | ✅ auth_tenant(위조불가 주입) + **tenant_business_profile** | **REAL(확장)** | `company` | DataPlatform.php:53/72 · index.php:97-100 |
| **Team** | ✅ **`team` 테이블** + team_role(owner/manager/member) + team_channel_mapping | **REAL(확장)** | `team` | TeamPermissions.php:145/17 · Db.php:712-717 |
| **Brand** | ✅ catalog_brand + catalog_listing.brand | **REAL** | `brand` | 285차 |
| **Agency↔Client** | ✅ agency_client_link(**매 요청 approved 재검증 fail-closed**) | **REAL** | (tenant 주입) | 272차 · index.php:97-100 |
| **Organization** | ❌ **오탐**(organization_id grep 0) | **부재→신설** | — | — |
| **Workspace** | ❌ **오탐**(WorkspaceState=tenant_kv UI 상태) | **부재→신설** | — | WorkspaceState.php:10/59 |
| **Store** | ❌ **오탐**(influencer_store=인플루언서) | **부재→신설** | — | Influencer.php:38 |
| **Country/Region** | ❌ **오탐**(컬럼일 뿐) | **부재→신설** | — | DataPlatform.php:72 · PixelTracking.php:99 |
| **Department** | ❌ 부재 | **부재→신설** | — | — |
| **Legal Entity** | ❌ 부재 | **부재→신설** | — | 1-1·1-3 일관 |
| **Environment(권한)** | △ 데이터 격리만 | **권한 축 신설** | — | GENIE_ENV · envLabel(278차) |
