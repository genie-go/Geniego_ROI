# DSAR — Authorization Observability & Forensics: 증거 연계체인 (APPROVAL_EVIDENCE_CHAIN)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_EVIDENCE_CHAIN`(SPEC §2 Canonical Entity)은 인가 결정을 구성한 **모든 증거를 Hash Chain으로 연결**하는 엔티티다. SPEC §9는 Evidence 연결 대상을 **Assignment·Approval·Policy·Decision·Session·Runtime Event·Audit·Snapshot** 8종으로 규정하고 "모든 Evidence는 Hash Chain으로 연결한다"를 불변조건으로 명시한다. SPEC §26 Evidence는 각 증거 단위가 보관해야 할 필드를 **Hash·Signature·Timestamp·Chain Position·Integrity Status**로 정의한다. 목적은 "왜 이 요청이 허용/거부되었는가"(SPEC §0)를 증거의 위·변조 불가능한 연쇄로 사후 증명하는 것이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 실존 근거(GT ①②/ADR) |
|---|---|---|
| Hash Chain 앵커(§9·§26 Hash/Chain Position/Integrity) | **PRESENT(유일 tamper-evident)** | `SecurityAudit.php:14-33`(append-only INSERT)·`:25-27`(prev_hash→sha256 hash_chain)·`:35-41`(lastHash·GENESIS 시드) — GT①§2A·GT②§2·ADR D-1 |
| Integrity Status / verify(broken_at) (§26·§32 Verify Integrity) | **PRESENT** | `SecurityAudit.php:56-68`·`:64`(hash_equals+prev 연속성 재계산·broken_at) · admin 노출 `AdminGrowth.php:1429` — GT①§2A |
| Audit 증거 소스(§9 Audit) | **PARTIAL** | auth_audit_log(`UserAuth.php:4174-4197`·해시체인 없음·평문 detail `:4165`)·menu_audit_log(`AdminMenu.php:169-212`·체인 append 있으나 verify 부재 GT①§2C) |
| 증거 참조 선례(§9 흡수 아닌 연결) | **PRESENT** | `AccessReview.php:225`(SecurityAudit 이중기록)·`:225-233`·`:245-257`(history) — GT①§2D·ADR D-1 "참조로 연결" |
| 통합 Evidence Chain(Assignment/Approval/Policy/Decision/Session/Runtime/Snapshot 연결) | **ABSENT(순신규)** | GT②§2 "통합 Evidence Chain은 순신규"·ADR D-1. Decision/Policy 시점 재구성 경로 없음(`TeamPermissions.php:236` effectiveScope는 현재상태만) |
| Signature(§26) | **ABSENT** | SecurityAudit은 hash_chain만·서명(§26 Signature) 필드 부재(GT①§2A 스키마 `:43-53` tenant/actor/action/details_json/ip/ua) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/해시체인/테넌트격리)

- **증거 단위 필드**(SPEC §26): `hash`·`signature`·`timestamp`(UTC)·`chain_position`·`integrity_status`. 각 증거는 상위 Authorization Event Model(§3)의 Event/Correlation/Trace ID를 참조 키로 보유.
- **연결 대상**(SPEC §9): Assignment→Approval→Policy→Decision→Session→Runtime Event→Audit→Snapshot을 동일 인가 결정 스코프에서 Hash Chain 노드로 편입. 통합 체인은 `SecurityAudit.php:14-68` 해시체인 위에 **참조**(AccessReview `:225` 선례)로 신설(ADR D-1·흡수 금지).
- **불변 제약**(SPEC §33): Immutable Evidence·Hash Chain Integrity·Snapshot Integrity·Tenant Isolation·Time-order Validation. UPDATE/DELETE 코드경로 부재(`SecurityAudit.php:14-33` append-only)를 승격 기반으로 유지.
- **무결성 확산**(ADR D-2): auth_audit_log/menu_audit_log 무결성 격차를 `SecurityAudit.php:56-68` verify 패턴으로 확산(menu_audit_log verify 부재 GT①§2C 보완).
- **테넌트 격리**: `SecurityAudit.php:71-83`·`:93-110`(recent/recentByType 테넌트 스코프 조회) 재사용.

## 4. KEEP_SEPARATE / 부수갭 (custody 단절·수정 아님)

- **KEEP_SEPARATE**(GT②§5): Walmart `WM_QOS.CORRELATION_ID`(`ChannelSync.php:1705`·`:1709`)는 외부 API 헤더이지 Evidence Chain correlation 아님. 마케팅 attribution touch·percentile(`AttributionEngine.php:1522`·`:1546`·`:1553`)·인프라 `SystemMetrics.php:1-60`은 authz 증거 아님. 흡수·개명 금지.
- **부수갭(custody 단절)**: `Compliance.php:265-300`(auditExport)이 자기 export를 감사 기록하지 않아 증거 반출의 연쇄가 끊김(대조: `siemPush` `Compliance.php:508`은 반출 logAudit). 이는 Evidence Chain 무결성에 인접한 신설 갭 근거이며 **수정 대상 아님**(GT②§4·ADR D-8 갭≠결함·재플래그 금지).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **PRESENT-hashchain(앵커) / PARTIAL-audit(연결소스) / ABSENT-통합체인**. Hash Chain·verify·Integrity Status는 `SecurityAudit.php:14-68`에 실존(유일 tamper-evident)하나, Assignment/Approval/Policy/Decision을 잇는 통합 Evidence Chain과 Signature는 순신규(GT②§2·ADR D-1).
- **재활용(Extend·흡수 아님)**: SecurityAudit 해시체인 앵커 승격 + AccessReview `:225` 참조 선례 + verify 패턴 확산.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-13 인증 후 RP-track 실구현(ADR §4). PDP(3-12) Decision Evidence·Zero Trust(3-13) Trust Evidence가 연결 대상. 코드 변경 0 · NOT_CERTIFIED.
