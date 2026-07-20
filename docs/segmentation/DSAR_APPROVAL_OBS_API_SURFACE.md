# DSAR — Authorization Observability & Forensics: API 표면 (Part 3-14 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32는 Observability/Forensics 플랫폼이 노출하는 **최소 API 표면 8종**을 규정한다: Query Timeline · Query Trace · Replay Decision · Build Digital Twin · Open Investigation · Export Evidence · Query Metrics · Verify Integrity. 이 API들은 "왜 이 요청이 허용/거부되었는가"를 사후 조회·재현·검증·반출하는 포렌식 정문이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| API(§32) | 판정 | substrate / 근거(GT) |
|---|---|---|
| Verify Integrity | **PARTIAL 재활용** | `SecurityAudit.php:56-68` verify(broken_at)·admin 노출(`AdminGrowth.php:1429`). 유일 실재 무결성 API |
| Query Timeline / Query Trace | **PARTIAL 재활용** | `SecurityAudit.php:71-83` recent·`:93-110` recentByType(테넌트 스코프 조회)·auth `auditLogs` GET(`UserAuth.php:4209-4226`)·menu `auditLog`(`AdminMenu.php:660-702`). 단 flat append(`UserAuth.php:4190`)·trace/span 없음→timeline 재구성 미비 |
| Export Evidence | **PARTIAL 근거·custody 갭** | `Compliance.php:463-510` siemPush(반출 logAudit `:508`)는 기록. 그러나 `auditExport`(`Compliance.php:265-300`)는 자기 반출 미기록→custody 단절(GT②§4) |
| Query Metrics | **ABSENT** | authz P95/P99 decision 지표 미수집(GT②§2). SystemMetrics=인프라 KEEP_SEPARATE |
| Replay Decision | **ABSENT** | read-only 재현 경로 없음(GT②§2) |
| Build Digital Twin | **ABSENT** | time-travel 복원 없음. `TeamPermissions.php:236` effectiveScope·effective route(`routes.php:1605`)는 현재상태만(GT②§2) |
| Open Investigation | **ABSENT** | forensic case/workspace grep 0(GT②§2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **A-1 Verify Integrity**: `SecurityAudit.php:56-68` verify 재활용, 응답에 broken_at·chain position(§26) 포함. menu/auth 체인은 ADR D-2 verify 확산 후 동일 API 편입.
- **A-2 Query Timeline / Query Trace**: 테넌트 스코프 조회(`SecurityAudit.php:71-83`·`:93-110`) 위에 Decision Timeline(§6 Request→PDP→PEP→Decision→Enforcement→Audit)·Correlation ID(§5) 재구성 신설. flat append(`UserAuth.php:4190`)를 trace/correlation 확장(ADR D-2).
- **A-3 Replay Decision**: read-only simulation(§8)만. 실 리소스 접근 금지. 이벤트 스토어로부터 정책·컨텍스트 재구성.
- **A-4 Build Digital Twin**: time-travel(§7) 시점 effective permission을 이벤트 스토어로부터 복원(순신규·현행 effectiveScope는 현재상태만).
- **A-5 Open Investigation**: Forensic Case(§16~17 Open/Investigating/Closed) 순신규. Evidence 연결은 흡수 아닌 참조(`AccessReview.php:225` 선례).
- **A-6 Export Evidence**: 반출을 Chain of Custody(§10)에 불변 기록. custody 단절(`Compliance.php:265-300` auditExport 미기록)을 설계로 해소(ADR D-4·siemPush `Compliance.php:508` 기록패턴 일반화).
- **A-7 Query Metrics**: Authz Telemetry(§19)·Metrics(§20 P95/P99) 순신규. Log Aggregation(`Compliance.php:143-190`) 재사용(ADR D-5).
- **A-8 테넌트 격리·인가**: 전 API `Compliance.php:176` fail-closed 재사용, admin 전용 노출(`AdminGrowth.php:1429` 선례) 준수.

## 4. KEEP_SEPARATE (마케팅/인프라 관측 흡수금지)

- **Query Metrics**는 인프라 `SystemMetrics.php:1-60`(latency_ms/uptime)·ML `ModelMonitor.php`·데이터 lineage `DataPlatform.php`를 흡수하지 않는다(GT②§5 B-3).
- **Query Trace**는 Walmart correlation_id(`ChannelSync.php:1705`·`:1709`·`:2874`·`:2878`·`:3467`·`:3471`)·마케팅 attribution touch(`Attribution.php`·`AttributionEngine.php:1522`)를 대상에서 배제(GT②§5 B-1/B-2).
- **Export Evidence**는 ops audit_log(`Compliance.php:176-187` 명시 배제)를 authz 증거로 혼입하지 않는다(GT②§5 B-4). 개명 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용**: Verify Integrity(`SecurityAudit.php:56-68`·`AdminGrowth.php:1429`)·Query Timeline/Trace(`SecurityAudit.php:71-83`·`:93-110`·`UserAuth.php:4209-4226`·`AdminMenu.php:660-702`)·Export 기록패턴(`Compliance.php:508`)은 실재 substrate 확장.
- **ABSENT(순신규)**: Replay Decision·Build Digital Twin·Open Investigation·Query Metrics substrate 전무(그린필드).
- **갭≠결함**: Export Evidence custody 단절(`Compliance.php:265-300`)은 A-6 설계 갭 근거·수정 아님·재플래그 금지(GT②§4).
- **선행의존**: Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
