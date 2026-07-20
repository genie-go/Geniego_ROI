# DSAR — Authorization Observability & Forensics: 에러 계약 (Part 3-14 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_14_AUTHORIZATION_OBSERVABILITY_FORENSICS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OBSERVABILITY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OBS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OBS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §30은 Observability/Forensics API가 실패 시 반환하는 **7종 표준 에러 코드**를 규정한다: TRACE_NOT_FOUND · REPLAY_FAILED · EVENT_CORRUPTED · EVIDENCE_CHAIN_BROKEN · CASE_NOT_FOUND · FORENSIC_ACCESS_DENIED · DIGITAL_TWIN_BUILD_FAILED. 각 코드는 실패를 은닉하지 않고 fail-secure(fail-closed)로 노출하여, 포렌식 무결성 위반을 조용히 통과시키지 않는다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 에러 코드(§30) | 판정 | substrate / 근거(GT) |
|---|---|---|
| EVIDENCE_CHAIN_BROKEN | **PARTIAL 재활용** | `SecurityAudit.php:56-68` verify가 broken_at 반환(`:64`). 체인 단절 탐지 실재→에러 표면화 확장 |
| EVENT_CORRUPTED | **PARTIAL 재활용** | hash_equals 재계산(`SecurityAudit.php:56-68`)으로 손상 판정 가능. menu 체인은 verify 부재(`AdminMenu.php` 무매치)→탐지 불가 격차 |
| FORENSIC_ACCESS_DENIED | **PARTIAL 근거** | 테넌트 fail-closed(`Compliance.php:176`)·verify admin 전용 노출(`AdminGrowth.php:1429`). ★custody 단절(`Compliance.php:265-300` 미기록·GT②§4)이 접근통제 갭 |
| TRACE_NOT_FOUND | **ABSENT** | trace substrate 없음(GT②§2)→조회 실패 코드 순신규 |
| REPLAY_FAILED | **ABSENT** | Decision Replay 경로 없음(GT②§2) |
| CASE_NOT_FOUND | **ABSENT** | forensic case 관리 grep 0(GT②§2) |
| DIGITAL_TWIN_BUILD_FAILED | **ABSENT** | time-travel Digital Twin 없음. `TeamPermissions.php:236` effectiveScope는 현재상태만(GT②§2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **E-1 EVIDENCE_CHAIN_BROKEN**: Verify Integrity(§32) 수행 중 prev_hash 불연속 발견 시 반환. 판정 로직 = `SecurityAudit.php:56-68`(broken_at). menu_audit_log 등 verify 부재 체인은 ADR D-2로 verify 확산 후 동일 코드 반환.
- **E-2 EVENT_CORRUPTED**: 개별 이벤트 hash_equals 불일치 시 반환(`SecurityAudit.php:56-68` 패턴). Immutable Event Store(§18) 무결성 위반.
- **E-3 TRACE_NOT_FOUND / CASE_NOT_FOUND**: Query Trace/Open Investigation(§32) 대상 부재 시. 테넌트 스코프 조회(`SecurityAudit.php:71-83`·`:93-110`) 격리 준수.
- **E-4 REPLAY_FAILED / DIGITAL_TWIN_BUILD_FAILED**: read-only 재구성(§8)·time-travel 복원(§7) 실패 시. 이벤트 부족·정합 실패를 은닉 없이 노출.
- **E-5 FORENSIC_ACCESS_DENIED**: 포렌식 워크스페이스 무단 접근 시. Chain of Custody(§10) 미기록 접근 차단. custody 단절(`Compliance.php:265-300`)을 설계로 해소(ADR D-4·siemPush `Compliance.php:508` 기록패턴 일반화).
- **E-6 Fail-secure 원칙**: 모든 코드는 무결성 불확실 시 통과(allow)가 아니라 차단(deny)으로 귀결.

## 4. KEEP_SEPARATE (마케팅/인프라 관측 흡수금지)

- 마케팅 "decision" 실패(`Decisioning.php:12`·`:36` ingestAdInsights)는 authz REPLAY_FAILED와 무관(GT②§5 B-2). 인프라 error_rate(`SystemMetrics.php:1-60`)는 EVENT_CORRUPTED 아님(B-3).
- Walmart correlation_id(`ChannelSync.php:1705` 등)·ops audit_log(`Compliance.php:176-187`·명시 배제) 실패는 본 에러 계약 범위 밖(GT②§5 B-1/B-4). 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용**: EVIDENCE_CHAIN_BROKEN·EVENT_CORRUPTED는 `SecurityAudit.php:56-68` verify(broken_at) 표면화. FORENSIC_ACCESS_DENIED는 `Compliance.php:176` fail-closed 재사용.
- **ABSENT(순신규)**: TRACE_NOT_FOUND·REPLAY_FAILED·CASE_NOT_FOUND·DIGITAL_TWIN_BUILD_FAILED substrate 전무.
- **격차**: menu_audit_log verify 부재로 EVENT_CORRUPTED 탐지 불가(ADR D-2 확산 대상)·custody 단절은 FORENSIC_ACCESS_DENIED 갭 근거(수정 아님·재플래그 금지·GT②§4).
- **선행의존**: Part 1~3-13 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
