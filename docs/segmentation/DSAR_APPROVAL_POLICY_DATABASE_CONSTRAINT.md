# DSAR — PDP/PEP Governance: 데이터베이스 제약 (Immutable Policy Version·Decision Snapshot·Bundle/Package Integrity·Tenant Isolation) (Part 3-12 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §30은 5개 DB 제약을 요구한다: **Immutable Policy Version**·**Immutable Decision Snapshot**·**Bundle Integrity**·**Package Integrity**·**Tenant Isolation**. 즉 게시된 정책 버전(§3 Policy Version)과 결정 스냅샷(§22)은 write-once·수정불가여야 하고, Bundle(§12)·Package(§11)은 무결성 봉인, 모든 정책·결정 행은 테넌트 격리되어야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 제약 | 판정 | 근거(파일:라인) |
|---|---|---|
| Immutable Policy Version 전용 테이블 | **ABSENT** | authz 정책 선언·버전 구조 전무(GT②§2). 정책은 코드 if 분기·DB 권한행에 암묵 내장. de-facto PAP는 **파괴적 전체교체·버전 없음**(`TeamPermissions.php:598-692`·`:598-621`·`:642-692`, GT①§H) |
| Immutable Decision Snapshot 전용 테이블 | **ABSENT** | authz decision snapshot 전용 immutable 테이블 부재. 근접=SecurityAudit append-only 해시체인(`SecurityAudit.php:12-53`·`:56-68`, GT①§G)이나 rule/scope trace 미기록·결정 스냅샷 아님 |
| Bundle Integrity / Package Integrity | **ABSENT** | Policy Package/Bundle 구조 자체 grep 0(GT②§2). 무결성 봉인 대상 부재 |
| Tenant Isolation | **PRESENT(재활용)** | X-Tenant-Id 강제 주입(`index.php:619`·`:608-619`, GT①§A). authz 행 격리 substrate. ADR §D-7 재활용 |
| tamper-evident digest substrate | **PARTIAL** | SecurityAudit 해시체인(`SecurityAudit.php:12-68`, GT②§2·ADR§D-5) — 문자열 detail만, 구조화 결정증거 아님 |
| RBAC/ABAC 권한행 스키마(암묵 정책 저장소) | **PRESENT** | `acl_permission`(`TeamPermissions.php:152-166`·`:152-159`)·`data_scope`(`:160-166`) — 선언적 정책 아님·행 기반 암묵 내장(GT②§2) |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

- **Immutable Policy Version(§30)**: `APPROVAL_POLICY_VERSION`(§2)은 게시 후 UPDATE/DELETE 금지(append-only). 버전 supersede는 신규 행. 현행 파괴적 교체(`TeamPermissions.php:598-692`)에 버전/게시 계층 추가(ADR §D-3).
- **Immutable Decision Snapshot(§30·§22)**: `APPROVAL_POLICY_SNAPSHOT`(request/decision/context/policy version/timestamp·§22)은 write-once. SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 기반 봉인(ADR §D-5).
- **Bundle/Package Integrity(§30·§11·§12)**: Bundle(RBAC/ABAC/SoD/JIT/Risk/Compliance policy)·Package(Finance/HR/…) 해시 무결성 컬럼·게시 시 봉인.
- **Tenant Isolation(§30)**: 전 정책·결정·스냅샷 행에 tenant_id NOT NULL·X-Tenant-Id(`index.php:619`)와 일치 강제.

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE(GT②§5)**: `action_request.policy_id`(`Db.php:576`·`:592-594`) = Alerting `alert_policies` 참조로 authz policy 아님. Catalog evaluatePolicy(`Catalog.php:1104`)·RuleEngine·Decisioning·ModelMonitor drift 모두 흡수 금지. authz 전용 정책/스냅샷 테이블만 대상.
- **선행의존**: Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR§4). Policy Registry/Version 스키마는 Part 3-1 Role Registry·3-7 ERRE 계보 위에 신설.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**authz 전용 Immutable Policy Version/Decision Snapshot 테이블·Bundle/Package Integrity = ABSENT(순신규).** Tenant Isolation(`index.php:619`)·SecurityAudit 해시체인(`SecurityAudit.php:12-68`)·acl_permission 스키마(`TeamPermissions.php:152-166`)만 재활용 substrate. DB Constraint 실 정의·마이그레이션·immutability trigger는 **RP-track 실구현 조건**(현 단계 코드0·NOT_CERTIFIED). 마케팅 policy 테이블 흡수 금지·선행 Part 1~3-11 인증 의존.
