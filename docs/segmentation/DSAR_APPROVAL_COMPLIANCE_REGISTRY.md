# DSAR — Authorization Compliance Registry (Part 3-17 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_COMPLIANCE_REGISTRY`(SPEC §1·§2)는 규제(Regulation)·통제(Control)·증적(Evidence)을 테넌트별로 등록·조회·버전관리하는 **중앙 레지스트리**다. 규제 프레임워크 전 엔티티(Regulatory Catalog §3·Control Library §4·Control Mapping §5)가 참조하는 단일 진실원(SoT). 등록 축 3종:

| # | 등록 축 | 의미 |
|---|---|---|
| 1 | Regulation | 규제 항목 식별·버전·발효/만료(§3 위임) |
| 2 | Control | authz/보안 통제 유형·구현상태(§4 위임) |
| 3 | Evidence | 통제 이행 증적·불변 참조(§20) |

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 등록 축 | 판정 | 실존 substrate (GT ①②/ADR 인용) |
|---|---|---|
| 규제/control/증적 중앙 레지스트리 테이블 | **ABSENT(grep 0)** | `compliance_*`/`regulation`/`control_map` 테이블 부재(GT① §F·신규 대상). self-healing ensureTables 패턴(`Db.php:116-166`·`:308-321`)만 재사용 |
| Control 등록부 | **PARTIAL(레지스트리 아님)** | `Compliance.php:90-113` `$add()` 하드코딩 14 control 리터럴·in-memory·영속/조회 불가(GT② §2). ★레지스트리 아님·EXTEND 대상 |
| Regulation 등록부 | **ABSENT** | `Compliance.php:93`·`:102`·`:104` SOC2 TSC/ISO Annex A는 정적 문자열 태그이지 등록 규제 아님 |
| Evidence 등록·조회 | **PRESENT-generic** | `SecurityAudit.php:14-68`(append-only 해시체인)·`:71-153`(tenant-scoped 조회). regulation/control-scoped 아님(GT① §B) |
| 테넌트 격리 등록 | **PRESENT** | `Compliance.php:198-209`·`:200-206` auditScope(admin=global/enterprise=own)·`index.php:600-619` 서버도출 강제 |

★핵심: `Compliance.php:90-113` control 배열은 요청마다 재구성되는 **정적 in-memory 리스트**이지 등록·조회·버전관리되는 레지스트리가 아니다. 중앙 레지스트리는 순신설.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드**(§1·§2): `registry_id`·`tenant_id`·`entity_kind`(regulation|control|evidence)·`entity_ref`·`version`·`status`(active|superseded|retired)·`registered_by`·`registered_at`·`evidence_hash`(§20 불변 참조).
- **영속 substrate**(ADR): `Db.php:116-166` PDO 싱글톤·MySQL→SQLite 폴백·`Db.php:308-321`·`:330-358` self-healing ensureTables 패턴으로 `compliance_registry` 신규 DDL. `Compliance.php:90-113` 하드코딩 14 control을 시드 등록분으로 **승격**(EXTEND).
- **증적 불변성**(§20): 등록 이벤트는 `SecurityAudit::log`(`SecurityAudit.php:14-33`·prev_hash→hash_chain) 확장으로 tamper-evident 기록·`verify()`(`:56-68`) 검증.
- **네임스페이스**(정본): `/v424/compliance/*`(`routes.php:1108-1118`·`:3518-3523`) 하위 등록 라우트로 EXTEND. 신규 핸들러 금지·`Compliance.php` 확장.
- **제약**: Tenant Isolation(`Compliance.php:198-209`)·등록 쓰기는 enterprise+tenantSecurityWrite(`:269-300` 패턴 준용).

## 4. KEEP_SEPARATE (데이터 거버넌스·ops 레지스트리 흡수금지)

★Compliance Registry는 **authz/보안 통제 레지스트리**이며, 데이터 거버넌스 레지스트리와 병합 금지(GT② §B-1). `DataPlatform.php:282-287`·`:288-291`·`:297-302`·`:305`(데이터품질 compliance flag→reliability_score)·`Dsar.php`·`GdprConsent.php`·`PreferenceCenter.php`·`LegalDoc.php`(프라이버시)는 별개 레지스트리·흡수·개명 금지. ops `audit_log`(`Compliance.php:177-187`·tenant_id 없음)·마케팅 `RuleEngine.php:10-12`도 레지스트리 대상 아님.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: 중앙 규제/control/증적 레지스트리 = **ABSENT(레지스트리 테이블 grep 0·순신설)**. `Compliance.php:90-113` 하드코딩 control 배열=레지스트리 아님·EXTEND 시드 대상.
- **재활용(흡수 아님·확장)**: `Compliance.php`(정본 EXTEND)·`Db.php:116-166`·`:308-321` ensureTables 패턴·SecurityAudit 해시체인(`SecurityAudit.php:14-68`) 증적 등록.
- **KEEP_SEPARATE**: DataPlatform/Dsar/GdprConsent/PreferenceCenter/LegalDoc·ops audit_log·RuleEngine 흡수 금지.
- **선행의존**: Part 1~3-16 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0.
