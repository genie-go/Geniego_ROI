# DSAR — Authorization Observability & Forensics: 불변 이벤트 스토어 (APPROVAL_EVENT_STORE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_EVENT_STORE`는 SPEC §18(Immutable Event Store)이 규정하는 **불변 이벤트 저장소**다. 요구사항: Append Only·Immutable·Versioned·Cryptographic Integrity·Compression·Long-term Retention(SPEC §18 열거). 모든 Authorization Event(`APPROVAL_AUTH_EVENT`)·Evidence(SPEC §9·§26)의 영속 앵커이며 Evidence Chain의 물리 기반이다.

- SPEC §1(구현 목표 20번 "Immutable Event Store").
- SPEC §33(Database Constraint): Immutable Event·Immutable Evidence·Hash Chain Integrity·Time-order Validation.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §18 요구 | 판정 | 근거(파일:라인) |
|---|---|---|
| Append Only + Immutable | **PRESENT** | `SecurityAudit.php:14-33`(append-only INSERT·UPDATE/DELETE 코드경로 전무)·`:25`·`:27` — GT① §2.A |
| Cryptographic Integrity(Hash Chain) | **PRESENT** | `SecurityAudit.php:25-27`(prev_hash→hash_chain sha256)·`:35-41`·`:39`(lastHash·GENESIS 시드) — GT① §2.A |
| 무결성 검증(verify broken_at) | **PRESENT** | `SecurityAudit.php:56-68`·`:64`(hash_equals+prev 연속성 재계산) · 노출 `AdminGrowth.php:1429` — GT① §2.A |
| 스키마(tenant/actor/action/details_json/ip/ua) | **PRESENT** | `SecurityAudit.php:43-53`·`:48-52`(ensure security_audit_log) — GT① §2.A |
| auth_audit_log(보조 소스·해시체인 없음) | **PARTIAL** | `UserAuth.php:4174-4197`·`:4193-4195`("해시체인 없음→tamper-evident 아님") — GT① §2.B |
| menu_audit_log(체인 컬럼 있으나 verify 부재) | **PARTIAL** | `AdminMenu.php:123-131`·`:169-212`·`:194`·`:197`(appendAudit prev→sha256) · ★verify 부재(GT① §2.C `:55`) |
| Versioned·Compression·Long-term Retention | **ABSENT** | GT② §2·§4 retention/purge/legal-hold grep 0(`Compliance.php`) |

★핵심: **SecurityAudit 해시체인이 Immutable Event Store + Evidence Chain의 유일 완비 substrate이자 유일 tamper-evident 앵커**(`SecurityAudit.php:14-68`·GT① §1). auth_audit_log는 해시체인 없음, menu_audit_log는 체인은 있으나 verify 부재(SecurityAudit 미달).

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **승격(Extend, 대체 아님)**(ADR D-1): `SecurityAudit`(`SecurityAudit.php:14-68`)의 append-only 해시체인·verify를 Authorization Event Store(SPEC §18)로 승격. 신규 forensics 증거는 **흡수 아닌 참조**로 연결 — `AccessReview.php:225`(SecurityAudit 이중기록·`:245-257`) 선례.
- **verify 확산**: menu_audit_log 등 verify 부재 체인에 `SecurityAudit.php:56-68` 패턴 확산(ADR D-2·GT② §3).
- **불변 제약**(SPEC §33): Immutable Event·Immutable Evidence·Hash Chain Integrity·Snapshot Integrity·Tenant Isolation·Time-order Validation. Event Deletion/Chain Break 차단(SPEC §28)은 append-only+verify 위에 신설(ADR D-7).
- **신규 요구**: Versioned·Compression·Long-term Retention(SPEC §18)은 순신규. Retention/Legal-hold(ADR D-4)와 결합.
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용.
- **Error**: `EVENT_CORRUPTED`·`EVIDENCE_CHAIN_BROKEN`(SPEC §30)·`Chain Integrity Warning`(§31).

## 4. KEEP_SEPARATE (흡수 금지)

- **Walmart correlation_id**: `ChannelSync.php:1705`(외 5개소) — 이벤트 스토어 상관키 아님(GT② §5 B-1).
- **ops audit_log**: `Compliance.php:176-187`(운영 액션) — collectAuditEvents가 통합하나 테넌트 스코프 명시 배제(`:176`). Immutable Event Store 정본 아님(GT② §5 B-4).
- **인프라/ML/데이터**: `SystemMetrics.php:1-60`·`ModelMonitor.php`·`DataPlatform.php`(데이터 lineage) — authz 이벤트 스토어 아님(GT② §5 B-3).

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Immutable Event Store = **PRESENT(SecurityAudit) / PARTIAL(auth·menu)**. 핵심 앵커는 실존하되 Versioned/Compression/Long-term Retention은 ABSENT(순신규).
- **재활용/ABSENT**: 승격 대상=`SecurityAudit.php:14-68`(유일 완비)·참조 선례=`AccessReview.php:225`·verify 확산=`SecurityAudit.php:56-68`. Versioned/Compression/Retention/Legal-hold는 순신규.
- **선행 의존**: Evidence Chain(assignment/approval/policy/decision 연결)은 Part 1~3-13 엔티티 실존 후. custody 단절(`Compliance.php:265-300` auditExport 미기록)은 신설 갭 근거·수정 아님(GT② §4·ADR D-8·재플래그 금지).
