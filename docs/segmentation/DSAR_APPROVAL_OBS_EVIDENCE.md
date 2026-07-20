# DSAR — Authorization Observability & Forensics: 관측성 증거 (APPROVAL_OBSERVABILITY_EVIDENCE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_OBSERVABILITY_EVIDENCE`(SPEC §2·§26)는 인가 관측 사건(Snapshot/Trace/Decision)에 **법정 수준 무결성**을 부여하는 증거 엔티티다. SPEC §26은 증거가 다음 5축을 저장하도록 규정한다.

| 축 | SPEC 근거 | 의미 |
|---|---|---|
| Hash | §26·§9(모든 Evidence는 Hash Chain으로 연결) | 증거 내용 해시 |
| Signature | §26 | 증거 서명 |
| Timestamp | §26·§3(UTC) | 증거 시각 |
| Chain Position | §26·§9 | 해시체인 내 위치 |
| Integrity Status | §26·§32(Verify Integrity) | 무결성 상태(정상/broken) |

SPEC §9는 Evidence 연결 대상을 Assignment/Approval/Policy/Decision/Session/Runtime Event/Audit/Snapshot으로 규정하고 §33은 Immutable Evidence·Hash Chain Integrity를 DB 제약으로 요구한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 증거 축 | 판정 | 근거(파일:라인) |
|---|---|---|
| Hash(해시체인) | **PRESENT** | `SecurityAudit.php:25-27`(prev_hash→sha256 hash_chain)·`:14-33`(append-only)=유일 tamper-evident(GT① §2A·GT② §2) |
| Chain Position | **PRESENT** | `SecurityAudit.php:35-41`·`:39`(lastHash·GENESIS 시드 앵커)(GT① §2A) |
| Integrity Status | **PRESENT** | `SecurityAudit.php:56-68`·`:64`(verify hash_equals+prev 연속성 재계산·broken_at)·노출 `AdminGrowth.php:1429`(GT① §2A) |
| Timestamp | **PRESENT** | 감사 스키마 시각 기록(`SecurityAudit.php:43-53`·`:48-52`)·auth 스키마 `at`(`UserAuth.php:4159-4168`) |
| Signature | **ABSENT** | 서명 substrate 무매치(GT② §2·해시체인만 존재). 순신규 |
| 증거 참조 선례 | **PRESENT** | access_review_item(`AccessReview.php:62-81`)·justification 필수 fail-secure(`:192-194`·`:219-222`)·SecurityAudit 이중기록(`:225-233`)=흡수 아닌 참조 선례(GT① §2D) |

★**격차**: auth_audit_log 해시체인 없음(`UserAuth.php:4174-4197`·평문 detail)·menu_audit_log verify 부재(`AdminMenu.php:169-212`·verify 무매치 GT① §2C). Signature·통합 Evidence Chain은 순신규.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/Digest 무결성/테넌트격리)

- **필드(§26)**: `evidence_id` · `tenant`(§33 격리) · `subject_ref`(Assignment/Approval/Policy/Decision/Session/Snapshot·§9) · `content_hash`(§9 sha256) · `signature` · `timestamp`(UTC·§3) · `chain_position`(prev_hash→hash·§9) · `integrity_status`(§32 verify 결과).
- **불변성**: Immutable Evidence(§33) — `SecurityAudit`(`SecurityAudit.php:14-33`) UPDATE/DELETE 부재 패턴 승격(ADR §D-1). 증거는 흡수 아닌 **참조**로 원사건에 연결(AccessReview `:225` 선례·ADR §D-1).
- **Hash Chain Integrity(§33)**: prev→sha256 연쇄(`SecurityAudit.php:25-27`)·재계산 verify(`:56-68`) 패턴을 auth/menu 격차 체인에 확산(ADR §D-2). Chain break·Evidence modification 차단은 Runtime Guard(§28)로.
- **테넌트 격리**: `Compliance.php:176`(fail-closed) 재사용(ADR §D-7).
- **Verify Integrity(§32)**: `SecurityAudit.php:56-68`(broken_at) 정본 재사용. Signature 검증은 순신규.

## 4. KEEP_SEPARATE (마케팅 drift 흡수금지)

- **Walmart correlation_id**(`ChannelSync.php:3467`·`:3471`) = 외부 API 헤더, 증거 chain position 아님(GT② §5 B-1).
- **마케팅 attribution/percentile**(`AttributionEngine.php:1522`) = 신뢰구간 통계, authz 증거 아님(GT② §5 B-2).
- **인프라 SystemMetrics**(`SystemMetrics.php:1-60`)·ops audit_log(`Compliance.php:176-187`) = 인프라 헬스·운영 감사, authz Evidence Chain 아님(GT② §5 B-3·B-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PRESENT(Hash/Chain Position/Integrity Status/Timestamp=SecurityAudit) · ABSENT(Signature·통합 Evidence Chain).** 증거의 무결성 핵심 4축은 SecurityAudit 해시체인으로 실존.
- **재활용(흡수 아님·확장/참조)**: `SecurityAudit.php:14-68`(해시체인+verify)→Evidence 앵커 정본 · `AccessReview.php:62-81`·`:225-233`→증거 참조 선례 · verify 패턴(`SecurityAudit.php:56-68`)→auth/menu 격차 체인 확산.
- **선행 의존**: Signature·§9 통합 연결(Assignment/Approval/Policy/Decision)·Evidence Preservation lifecycle은 순신규. Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE).
- **코드 변경 0 · NOT_CERTIFIED.** ★유일 tamper-evident 앵커=SecurityAudit — auth_audit_log/menu_audit_log는 격차(과신 금지).
