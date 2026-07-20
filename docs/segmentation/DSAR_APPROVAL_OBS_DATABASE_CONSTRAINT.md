# DSAR — Authorization Observability & Forensics: 데이터베이스 제약 (Part 3-14 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §33은 관측성·포렌식 데이터에 6종 DB 제약을 요구한다: **Immutable Event · Immutable Evidence · Hash Chain Integrity · Snapshot Integrity · Tenant Isolation · Time-order Validation**. 즉 이벤트/증거는 append-only·불변이며, 해시체인 무결성이 강제되고, 스냅샷·테넌트 격리·시간순서가 DB 계약으로 보장되어야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §33 제약 | 판정 | 근거(파일:라인) |
|---|---|---|
| Immutable Event | **PRESENT(SecurityAudit) / PARTIAL(auth·menu)** | `SecurityAudit.php:14-33`(append-only INSERT·UPDATE/DELETE 코드경로 전무). auth_audit_log는 flat append(`UserAuth.php:4190`)·해시 없음, menu_audit_log는 체인만 |
| Immutable Evidence | **PRESENT(부분)** | `AccessReview.php:62-81`(ensureTable 추가전용)·`:225`(SecurityAudit 이중기록 참조). 통합 Evidence 불변제약은 순신규 |
| Hash Chain Integrity | **PRESENT(SecurityAudit) / ABSENT(통합)** | `SecurityAudit.php:25-27`(prev_hash→sha256)·`:35-41`(GENESIS 시드)·`:56-68`(verify·`:64` broken_at). menu_audit_log verify 부재(`AdminMenu.php:169-212`) |
| Snapshot Integrity | **ABSENT** | SPEC §25 Snapshot 저장 substrate 부재. 무결성 제약 대상 자체 없음 |
| Tenant Isolation | **PRESENT(재사용)** | `SecurityAudit.php:43-53`(tenant 컬럼)·`Compliance.php:176`(테넌트 fail-closed 배제). 관측 계층 격리는 이 패턴 확장 |
| Time-order Validation | **PARTIAL** | `SecurityAudit.php:56-68`(prev 연속성 재계산=암묵 시간순서). 명시적 timestamp 단조성 제약은 순신규(auth_audit_log at 컬럼 `UserAuth.php:4159-4168`은 검증 없음) |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 항목 | 계약 기준 (SPEC) |
|---|---|
| Immutable Event(§33·§18) | Event Store는 Append Only·Immutable·Versioned·Cryptographic Integrity. UPDATE/DELETE DB 트리거 차단 |
| Immutable Evidence(§26) | Evidence=Hash·Signature·Timestamp·Chain Position·Integrity Status 불변 저장 |
| Hash Chain Integrity(§9·§26) | 모든 Evidence를 Hash Chain 연결·prev→sha256 연속성 DB 제약. verify(`SecurityAudit.php:56-68` 패턴) 재계산 |
| Snapshot Integrity(§25) | Timeline/Decision/Context/Policy/Replay Result 스냅샷 해시 봉인 |
| Tenant Isolation(§33) | 테넌트별 이벤트/증거 격리 fail-closed(`Compliance.php:176` 재사용) |
| Time-order Validation(§33·§6) | Decision Timeline은 Immutable·시간순서 단조 강제 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: Walmart `WM_QOS.CORRELATION_ID`(`ChannelSync.php:1705`)·마케팅 attribution touch(`Attribution.php`)·인프라 헬스(`SystemMetrics.php:1-60`)·ML lineage(`DataPlatform.php`)의 timestamp/저장 제약은 authz 이벤트 제약 아님. 운영 `audit_log`(`Compliance.php:177`)는 명시 배제.
- **선행의존**: DB 제약 실 구현은 SecurityAudit→Immutable Event Store 승격(ADR D-1)·감사행 trace/correlation 컬럼 확장(ADR D-2) 완료 후. Snapshot Integrity·통합 Hash Chain은 그린필드.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

**판정 = PRESENT-hashchain(`SecurityAudit.php:14-68`) / PARTIAL-audit(auth·menu 무결성 격차) / ABSENT-snapshot·통합evidence.** 코드 변경 0·NOT_CERTIFIED. DB Constraint(Immutable Event/Evidence·Hash Chain Integrity·Time-order)는 **SecurityAudit 해시체인(`SecurityAudit.php:14-68`) 재활용·확장**으로 실현하되, auth/menu audit 무결성 격차 보완과 Snapshot Integrity 신설은 RP-track 실 구현(선행 Part 1~3-13 인증) 조건이다. Extend-only·흡수 금지.
