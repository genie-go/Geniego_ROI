# DSAR — Authorization Observability & Forensics: 포렌식 케이스 (APPROVAL_FORENSIC_CASE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_FORENSIC_CASE`(SPEC §2)는 인가 사건을 조사하는 **Forensic Investigation Workspace + Case Management** 엔티티다. SPEC §16은 워크스페이스 기능을 **Case 생성·Timeline 조회·Evidence 연결·Replay 실행·Correlation 검색·Export** 6종으로 규정한다. SPEC §17은 케이스 상태 머신을 **Open·Investigating·Waiting Evidence·Escalated·Closed·Archived** 6단계로 정의한다. 조사자는 하나의 케이스 안에서 증거체인(§9)·타임라인·재현(§8)을 결합해 "누가 어떤 정책을 변경했는가·특정 시점 Effective Permission은 무엇이었는가"(SPEC §0)에 답한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §16/§17 요소 | 판정 | 실존 근거(GT ①②/ADR) |
|---|---|---|
| Forensic Case Management(케이스·상태 머신) | **ABSENT(grep 0)** | GT②§2 "forensic/hotspot/case.manage 무매치"·GT①§3 "Forensic Case Management 순신규" |
| Evidence 연결(§16) | **PARTIAL(참조 substrate만)** | `AccessReview.php:62-81`(ensureTable)·`:177-242`(decision) 증거 저장 패턴·`SecurityAudit.php:14-68` 해시체인 — 케이스 단위 연결은 부재 |
| Timeline 조회(§16) | **PARTIAL** | `SecurityAudit.php:71-83`·`:93-110`(recent/recentByType 테넌트 조회)로 부분 조회 가능하나 Decision Timeline 재구성 ABSENT(GT①§3) |
| Replay 실행(§16) | **ABSENT** | Decision Replay/Digital Twin 부재(`TeamPermissions.php:236` effectiveScope 현재상태만) — GT②§2·ADR D-3 |
| Correlation 검색(§16) | **ABSENT** | Correlation Engine grep 0(authz)·`auth_audit_log`(`UserAuth.php:4165`) trace/correlation 컬럼 없음 — GT②§2 |
| Export(§16) | **PARTIAL(단절)** | `Compliance.php:265-300`(auditExport)·`:508`(siemPush)에 반출 substrate 있으나 케이스 스코프·custody 단절 — GT②§4 |
| 증거 없는 조치 차단 선례 | **PRESENT** | `AccessReview.php:192-194`(justification 필수 fail-secure)·`:219-222` — ADR D-4 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변/해시체인/테넌트격리)

- **케이스 필드**(SPEC §17·§34 Index): `case_id`·`status`∈{Open, Investigating, Waiting Evidence, Escalated, Closed, Archived}·조사자(subject)·연결 증거(§9 Evidence Chain 참조)·연결 Trace/Correlation ID(§3)·생성/전이 timestamp.
- **워크스페이스 기능**(SPEC §16): Case 생성 → Timeline 조회(§6) → Evidence 연결(§9 참조) → Replay 실행(§8 read-only) → Correlation 검색(§5) → Export(§10 custody 기록 필수). 각 기능은 기존 substrate 참조로 구성(ADR D-1·흡수 아님).
- **불변 기록**(SPEC §17·§33): 케이스 상태 전이·증거 연결·조사 조치는 `SecurityAudit.php:14-33` append-only 해시체인에 기록·`:56-68` verify(ADR D-1·D-7). 케이스 접근은 `AccessReview.php:192-194` justification 강제 선례로 fail-secure.
- **Forensic Access 통제**(SPEC §28 Unauthorized Forensic Access·§30 FORENSIC_ACCESS_DENIED): 포렌식 접근 권한 통제·부정접근 차단은 Runtime Guard(§28)로 신설(ADR D-7). 테넌트 격리 `Compliance.php:176` fail-closed 재사용.
- **Export custody**(SPEC §10): 케이스 Export는 Chain of Custody 기록 후에만(auditExport 단절 `Compliance.php:265-300` 해소 대상·siemPush `:508` 패턴).

## 4. KEEP_SEPARATE / 부수갭 (custody 단절·수정 아님)

- **KEEP_SEPARATE**(GT②§5): "decision" 동음이의 — `Decisioning.php:12`·`:36`(ingestAdInsights 마케팅 결정)은 authz forensic case 아님. 마케팅 attribution touch·percentile(`AttributionEngine.php:1522`·`:1546`·`:1553`)·인프라 `SystemMetrics.php:1-60`·Walmart correlation_id(`ChannelSync.php:1705`)는 포렌식 케이스 범위 밖. 흡수·개명 금지.
- **부수갭(custody 단절)**: 케이스 Export가 재사용할 `Compliance.php:265-300`(auditExport)이 자기 반출을 미기록하는 단절은 신설 갭 근거이며 **수정 아님**(GT②§4·ADR D-8 갭≠결함·재플래그 금지).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT(순신규 골격) / PARTIAL(증거·조회·Export substrate)**. Forensic Case Management·Case 상태 머신·Correlation 검색·Replay 실행은 그린필드(GT①§3·GT②§2). 증거 저장(`AccessReview.php:62-81`)·해시체인 조회(`SecurityAudit.php:71-110`)·반출(`Compliance.php:265-300`·`:508`)은 참조 가능한 부분 substrate.
- **재활용(Extend·흡수 아님)**: SecurityAudit 해시체인 + AccessReview 증거/justification 선례 + Compliance 집계/반출 재사용. 케이스·상태 머신·Replay·Correlation은 그 위 신설.
- **선행의존**: BLOCKED_PREREQUISITE — 케이스는 Evidence Chain(§9)·Decision Timeline(§6)·Replay(§8) 신설을 전제하며, 이는 Part 1~3-13 인증 후 RP-track 실구현(ADR §4). 코드 변경 0 · NOT_CERTIFIED.
