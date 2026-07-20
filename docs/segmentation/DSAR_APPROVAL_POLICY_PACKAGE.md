# DSAR — PDP/PEP Governance: 도메인 정책 패키지 (APPROVAL_POLICY_PACKAGE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

- **APPROVAL_POLICY_PACKAGE** = 인가 정책을 **비즈니스 도메인 단위로 묶은 게시 패키지**. Finance/HR/ERP/SCM/CRM/Security 도메인별 정책 집합을 하나의 무결성 단위(§30 Package Integrity)로 게시·관리.
- SPEC §11(Policy Package — Finance/HR/ERP/SCM/CRM/**Security** Package), §2(Canonical Entity `APPROVAL_POLICY_PACKAGE`), §30(Database Constraint — **Package Integrity**·Tenant Isolation)이 근거.
- 목적: 도메인 경계별로 정책본(APPROVAL_POLICY)·버전(APPROVAL_POLICY_VERSION)을 응집 게시하여 도메인 단위 일괄 배포·검증 가능화. 순신규(ADR D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Policy Package 구조 | **ABSENT (grep 0)** | `PolicyPackage` authz 매치 0건 — 도메인 정책 패키지 전무 (GT② §1·§2) |
| 도메인 authz substrate — 창고(SCM 인접) | **PARTIAL** | `guardWarehouse`(`Wms.php:557`·`:565`·`:569`·`:598`·`:603`) = 창고 ABAC PEP·화이트리스트 (GT① §B). 패키지 아닌 단일 핸들러 국소 강제 |
| 도메인 authz substrate — 보안/소유자(Security 인접) | **PARTIAL** | `requireTeamWrite`·`requireTenantSecurityWrite`(`UserAuth.php:1134`·`:1204`) = billing/api_keys/security_policy owner-only (GT① §B) |
| 도메인 authz substrate — 상용(Finance 인접) | **PARTIAL(직교)** | `requirePlan`·PlanPolicy(`UserAuth.php:364`·`:347`) = entitlement 게이트(authz와 직교) (GT① §B·GT② §C-4) |
| 패키지 무결성/색인 | **ABSENT** | §30 Package Integrity·§31 색인 전무 (GT② §2) |

★현행 도메인별 authz는 **핸들러에 산재한 국소 PEP**일 뿐, 도메인 패키지로 응집·게시되지 않는다. 패키지 계층은 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(안)**: `package_id`·`domain{finance|hr|erp|scm|crm|security}`(§11)·`policy_version_refs[]`(→APPROVAL_POLICY_VERSION)·`integrity_hash`·`status{draft|published|deprecated}`·`published_at`·`tenant_id`.
- **상태**: 패키지는 포함 버전들이 모두 봉인(불변)된 뒤 게시. 게시 후 구성 변경은 신규 패키지 버전으로만.
- **제약**: §30 **Package Integrity** — `integrity_hash`로 구성 정책버전 집합 무결성 검증(SecurityAudit `SecurityAudit.php:12-68` 재활용·ADR D-5). §30 Tenant Isolation(`index.php:619` 재활용). Security Package는 SoD(3-10)·JIT(3-9) 정책 포함(ADR D-6 읽기입력).
- **소비**: PDP(§4)는 요청 도메인에 해당하는 활성 패키지의 정책버전을 로드. PAP(§7)가 패키지 단위 게시.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

도메인명(CRM/Finance/SCM)이 겹치나 아래는 authz 패키지 아님(GT② §5).

| 분리대상 | 근거(파일:라인) | 사유 |
|---|---|---|
| 상품(커머스) 정책 | `Catalog.php:1104`·`:1159` | 리스팅 컴플라이언스(CRM/커머스 도메인이나 authz 아님) (GT② §C-1) |
| 정산 reconcil | `routes.php:655`(PgSettlement)·`Connectors.php:902` | Finance 도메인이나 authz Reconciliation 아님 (GT② §C-3) |
| WMS/채널 recon | `Wms.php:2160`·`KrChannel.php:419` | SCM 도메인이나 재고/채널 대사(authz 아님) (GT② §C-3) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(도메인 패키지 순신규)**. 재활용: 도메인 국소 PEP(`guardWarehouse` `Wms.php:557`·`requireTeamWrite` `UserAuth.php:1134`)를 PDP 소비로 수렴(ADR D-2)·패키지 무결성은 SecurityAudit 확장(ADR D-5).
- **NOT_CERTIFIED · 코드 변경 0**: 계약 설계물.
- **선행의존**: APPROVAL_POLICY_VERSION(불변 버전)·APPROVAL_POLICY 확정 후 패키지 응집 가능. SoD(3-10)·JIT(3-9) 산출 입력 전제. Part 1~3-11 인증(BLOCKED_PREREQUISITE).
